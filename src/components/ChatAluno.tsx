import React, { useState, useEffect, useRef } from 'react';
import { dbService, isSupabaseConfigured, supabase } from '../lib/supabase';
import { Mensagem } from '../types';
import { Send, MessageSquare, Clock, Pencil, Trash2, X, Check, MoreVertical } from 'lucide-react';
import { tocar } from '../lib/som';

interface ChatAlunoProps {
  userId: string;
}

export default function ChatAluno({ userId }: ChatAlunoProps) {
  const [messages, setMessages] = useState<Mensagem[]>([]);
  const [inputText, setInputText] = useState('');
  const [personalId, setPersonalId] = useState<string | null>(null);
  const [personalProfile, setPersonalProfile] = useState<{ nome: string; avatar_tipo: string } | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Edit and Delete States
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const loadMessages = async () => {
    const { data } = await dbService.getMensagens(userId);
    if (data) {
      setMessages(data);
    }
  };

  useEffect(() => {
    const initChat = async () => {
      setLoading(true);
      // Fetch personal trainer profile (including 1-step and 2-step fallbacks)
      const { data: prof } = await dbService.getPersonalProfileForAluno(userId);
      if (prof) {
        setPersonalProfile(prof);
      }
      
      const { data: pId } = await dbService.getPersonalIdForAluno(userId);
      setPersonalId(pId);
      
      await loadMessages();
      await dbService.marcarMensagensLidas(userId, userId);
      setLoading(false);
      setTimeout(() => scrollToBottom('auto'), 100);
    };

    initChat();
  }, [userId]);

  // Handle Realtime updates for both Supabase and mock mode
  useEffect(() => {
    if (!userId) return;

    let canal: any = null;

    if (isSupabaseConfigured && supabase) {
      canal = supabase.channel(`mensagens-${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'mensagens', filter: `aluno_id=eq.${userId}` },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newMsg = payload.new as Mensagem;
              if (newMsg.autor_id !== userId) {
                tocar('receber');
              }
              setMessages((prev) => {
                // Avoid duplicate messages
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
              // Mark as read if not authored by this user
              if (newMsg.autor_id !== userId) {
                dbService.marcarMensagensLidas(userId, userId);
              }
            } else if (payload.eventType === 'UPDATE') {
              const updatedMsg = payload.new as Mensagem;
              setMessages((prev) =>
                prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
              );
            } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id;
              setMessages((prev) => prev.filter((m) => m.id !== deletedId));
            }
          }
        )
        .subscribe();
    }

    const handleMockMsg = (e: any) => {
      if (e.detail?.aluno_id === userId) {
        loadMessages();
        dbService.marcarMensagensLidas(userId, userId);
      }
    };

    window.addEventListener('zenite_mensagem_enviada', handleMockMsg);

    const handleMockReceive = (e: any) => {
      if (e.detail?.aluno_id === userId && e.detail?.autor_id !== userId) {
        tocar('receber');
      }
    };
    window.addEventListener('zenite_mensagem_enviada', handleMockReceive);

    return () => {
      if (canal) {
        supabase.removeChannel(canal);
      }
      window.removeEventListener('zenite_mensagem_enviada', handleMockMsg);
      window.removeEventListener('zenite_mensagem_enviada', handleMockReceive);
    };
  }, [userId]);

  // Scroll to bottom when messages list changes
  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const currentText = inputText.trim();
    setInputText('');
    tocar('enviar');

    const targetPersonalId = personalId || '00000000-0000-0000-0000-000000000000'; // fallback
    const { data: newMsg, error } = await dbService.enviarMensagem(targetPersonalId, userId, userId, currentText);
    
    if (error) {
      console.error('Erro ao enviar mensagem:', error);
      setErrorMsg(`Erro ao enviar: ${error.message || 'Erro desconhecido'}`);
    } else if (newMsg) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    }
  };

  const handleSaveEdit = async (msgId: string | number) => {
    if (!editingText.trim()) return;
    const { error } = await dbService.editarMensagem(msgId, editingText.trim());
    if (error) {
      console.error('Erro ao editar mensagem:', error);
      setErrorMsg(`Erro ao editar: ${error.message || 'Erro desconhecido'}`);
    } else {
      setEditingMsgId(null);
      setEditingText('');
      loadMessages();
    }
  };

  const handleDelete = async (msgId: string | number) => {
    const { error } = await dbService.excluirMensagem(msgId);
    if (error) {
      console.error('Erro ao excluir mensagem:', error);
      setErrorMsg(`Erro ao excluir: ${error.message || 'Erro desconhecido'}`);
    } else {
      setConfirmingDeleteId(null);
      loadMessages();
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const isUUID = (str: string) => {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
  };

  const rawName = personalProfile?.nome || '';
  const personalName = rawName && !isUUID(rawName) ? rawName : 'Seu Personal';
  const isFemale = personalProfile?.avatar_tipo === 'feminino';

  const getFirstName = (fullName: string) => {
    const trimmed = fullName.trim();
    if (!trimmed) return 'Personal';
    return trimmed.split(' ')[0];
  };

  const personalFirstName = getFirstName(personalName);

  return (
    <div id="chat-aluno-container" className="flex flex-col flex-1 min-h-0 bg-surface-2 rounded-3xl border border-white/5 overflow-hidden shadow-2xl relative">
      {/* Header */}
      <div className="bg-surface-3 px-6 py-4 border-b border-white/5 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-2xl bg-surface-2 shadow-inner">
            {isFemale ? '👩' : '👨'}
          </div>
          <div>
            <h3 className="font-semibold text-base text-ink leading-tight">{personalName}</h3>
            <p className="text-[12px] text-ink-3 mt-0.5">Seu Personal Trainer</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-[#F26A1B]/10 text-[#F26A1B] border border-[#F26A1B]/10 rounded-full text-[12px] font-semibold">
          <span className="w-1.5 h-1.5 bg-[#F26A1B] rounded-full animate-ping" />
          Realtime ativo
        </div>
      </div>

      {/* Error Alert Box */}
      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs px-4 py-3 rounded-2xl flex justify-between items-center gap-2 animate-fade-in mx-6 mt-4 shrink-0 z-10">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-300 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#F26A1B]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-ink-3">
            <MessageSquare className="w-12 h-12 text-[#F26A1B]/20 mb-3" />
            <p className="font-medium text-sm text-ink-2">Nenhuma mensagem ainda</p>
            <p className="text-xs mt-1 max-w-xs">Envie uma mensagem abaixo para iniciar sua conversa com o seu personal trainer.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.autor_id === userId;
            const showSenderName = !isOwn && (index === 0 || messages[index - 1].autor_id !== msg.autor_id);
            const isMessageExcluded = msg.excluida;
            const isEditing = editingMsgId === msg.id;
            const isConfirmingDelete = confirmingDeleteId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in group`}
              >
                <div className={`max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'} relative`}>
                  {showSenderName && (
                    <span className="text-[12px] font-semibold text-[#F26A1B] mb-1">
                      {personalFirstName}
                    </span>
                  )}
                  
                  <div className="flex items-center gap-1.5 max-w-full group-hover:translate-x-0 transition-transform">
                    {/* Menu Trigger for Own Message (Not Excluded) */}
                    {isOwn && !isMessageExcluded && !isEditing && !isConfirmingDelete && (
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === msg.id ? null : msg.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-white/10 text-ink-3 hover:text-ink transition-all cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        
                        {openMenuId === msg.id && (
                          <div className="absolute right-0 bottom-full mb-1 z-50 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl p-1 flex flex-col min-w-[100px] divide-y divide-white/5 animate-fade-in">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMsgId(msg.id);
                                setEditingText(msg.conteudo);
                                setOpenMenuId(null);
                              }}
                              className="px-3 py-1.5 text-xs text-ink hover:bg-white/5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-left w-full"
                            >
                              <Pencil className="w-3 h-3 text-[#F26A1B]" />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmingDeleteId(msg.id);
                                setOpenMenuId(null);
                              }}
                              className="px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-500/10 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-left w-full"
                            >
                              <Trash2 className="w-3 h-3" />
                              Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        isOwn
                          ? 'bg-[#F26A1B] text-white rounded-tr-none shadow-[0_4px_12px_rgba(242,106,27,0.2)]'
                          : 'bg-surface-3 text-ink-2 rounded-tl-none border border-white/5'
                      }`}
                    >
                      {isMessageExcluded ? (
                        <p className="italic text-ink-3 text-xs">Mensagem apagada</p>
                      ) : isConfirmingDelete ? (
                        <div className="flex flex-col gap-2 p-1 min-w-[150px]">
                          <p className="text-xs font-semibold text-white">Excluir esta mensagem?</p>
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setConfirmingDeleteId(null)}
                              className="px-2.5 py-1 text-[12px] font-semibold text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                            >
                              Não
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(msg.id)}
                              className="px-2.5 py-1 text-[12px] font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors cursor-pointer"
                            >
                              Sim
                            </button>
                          </div>
                        </div>
                      ) : isEditing ? (
                        <div className="flex flex-col gap-2 min-w-[200px]">
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="bg-black/35 text-white text-sm border border-[#F26A1B]/40 rounded-xl p-2 focus:outline-none focus:border-white w-full resize-none placeholder:text-white/40"
                            rows={2}
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingMsgId(null)}
                              className="px-2.5 py-1 text-[12px] font-semibold text-white/70 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(msg.id)}
                              className="px-2.5 py-1 text-[12px] font-semibold text-[#F26A1B] bg-white hover:bg-white/90 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              Salvar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.conteudo}</p>
                      )}
                    </div>
                  </div>

                  <span className="text-[12px] text-ink-3 mt-1 flex items-center gap-1 num">
                    <Clock className="w-3 h-3" />
                    {formatTime(msg.criado_em)}
                    {msg.editado_em && !isMessageExcluded && (
                      <span className="text-[12px] text-ink-3 italic ml-1">(editada)</span>
                    )}
                    {!isOwn && !msg.lida && (
                      <span className="w-1.5 h-1.5 bg-[#F26A1B] rounded-full ml-1" />
                    )}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 bg-surface-3 border-t border-white/5 flex gap-2 z-10">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Mensagem para ${personalFirstName}...`}
          className="flex-1 bg-surface-2 text-ink border border-white/5 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#F26A1B]/40 transition-colors placeholder:text-ink-3"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="w-12 h-12 rounded-2xl bg-[#F26A1B] hover:bg-[#d55814] active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center transition-all cursor-pointer text-white shadow-lg shadow-[#F26A1B]/20"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
