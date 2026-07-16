import React, { useState, useEffect, useRef } from 'react';
import { dbService, isSupabaseConfigured, supabase } from '../lib/supabase';
import { Aluno, Mensagem } from '../types';
import { Send, MessageSquare, Search, ArrowLeft, Clock, Sparkles, Pencil, Trash2, X, Check, MoreVertical } from 'lucide-react';
import { tocar } from '../lib/som';

interface ChatPersonalProps {
  personalId: string;
}

interface Conversation {
  aluno: Aluno;
  lastMessage: Mensagem | null;
  unreadCount: number;
}

export default function ChatPersonal({ personalId }: ChatPersonalProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedAlunoId, setSelectedAlunoId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<Mensagem[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);

  // Edit and Delete States
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSaveEdit = async (msgId: string | number) => {
    if (!editingText.trim()) return;
    const { error } = await dbService.editarMensagem(msgId, editingText.trim());
    if (error) {
      console.error('Erro ao editar mensagem:', error);
      setErrorMsg(`Erro ao editar: ${error.message || 'Erro desconhecido'}`);
    } else {
      setEditingMsgId(null);
      setEditingText('');
      if (selectedAlunoId) {
        const { data: msgs } = await dbService.getMensagens(selectedAlunoId);
        if (msgs) setActiveMessages(msgs);
      }
    }
  };

  const handleDelete = async (msgId: string | number) => {
    const { error } = await dbService.excluirMensagem(msgId);
    if (error) {
      console.error('Erro ao excluir mensagem:', error);
      setErrorMsg(`Erro ao excluir: ${error.message || 'Erro desconhecido'}`);
    } else {
      setConfirmingDeleteId(null);
      if (selectedAlunoId) {
        const { data: msgs } = await dbService.getMensagens(selectedAlunoId);
        if (msgs) setActiveMessages(msgs);
      }
    }
  };
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
  };

  const loadConversations = async () => {
    setLoadingList(true);
    const { data: alumnos } = await dbService.getAlunos(personalId);
    if (alumnos) {
      // Fetch details for each student
      const list: Conversation[] = await Promise.all(
        alumnos.map(async (al) => {
          const { data: lastMsg } = await dbService.getUltimaMensagem(al.id);
          const { data: unread } = await dbService.getMensagensCountNaoLidas(al.id, personalId);
          return {
            aluno: al,
            lastMessage: lastMsg,
            unreadCount: unread || 0,
          };
        })
      );

      // Sort: who has unread messages first, then by latest message date
      list.sort((a, b) => {
        const aUnread = a.unreadCount > 0 ? 1 : 0;
        const bUnread = b.unreadCount > 0 ? 1 : 0;
        if (aUnread !== bUnread) {
          return bUnread - aUnread;
        }
        const aTime = a.lastMessage ? new Date(a.lastMessage.criado_em).getTime() : 0;
        const bTime = b.lastMessage ? new Date(b.lastMessage.criado_em).getTime() : 0;
        return bTime - aTime;
      });

      setConversations(list);
    }
    setLoadingList(false);
  };

  const loadActiveChat = async (alunoId: string) => {
    setLoadingChat(true);
    const { data: msgs } = await dbService.getMensagens(alunoId);
    if (msgs) {
      setActiveMessages(msgs);
    }
    await dbService.marcarMensagensLidas(alunoId, personalId);
    // Refresh conversation list to clear read state/badge
    const { data: alumnos } = await dbService.getAlunos(personalId);
    if (alumnos) {
      const list: Conversation[] = await Promise.all(
        alumnos.map(async (al) => {
          const { data: lastMsg } = await dbService.getUltimaMensagem(al.id);
          const { data: unread } = await dbService.getMensagensCountNaoLidas(al.id, personalId);
          return {
            aluno: al,
            lastMessage: lastMsg,
            unreadCount: al.id === alunoId ? 0 : (unread || 0),
          };
        })
      );
      list.sort((a, b) => {
        const aUnread = a.unreadCount > 0 ? 1 : 0;
        const bUnread = b.unreadCount > 0 ? 1 : 0;
        if (aUnread !== bUnread) {
          return bUnread - aUnread;
        }
        const aTime = a.lastMessage ? new Date(a.lastMessage.criado_em).getTime() : 0;
        const bTime = b.lastMessage ? new Date(b.lastMessage.criado_em).getTime() : 0;
        return bTime - aTime;
      });
      setConversations(list);
    }
    // Also notify other parts of the system of message updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zenite_mensagem_lida'));
    }
    setLoadingChat(false);
    setTimeout(() => scrollToBottom('auto'), 100);
  };

  useEffect(() => {
    loadConversations();
  }, [personalId]);

  // Handle Realtime updates for Personal Area
  useEffect(() => {
    if (!personalId) return;

    let canalGlobal: any = null;
    let canalChat: any = null;

    if (isSupabaseConfigured && supabase) {
      // Global channel to update unread counts and message previews
      canalGlobal = supabase.channel('mensagens-global')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'mensagens', filter: `personal_id=eq.${personalId}` },
          (payload) => {
            const newMsg = payload.new as Mensagem;
            if (!newMsg) return;

            if (newMsg.autor_id !== personalId) {
              tocar('receber');
            }

            // Update preview and unread count in conversations list
            setConversations((prev) => {
              const idx = prev.findIndex((c) => c.aluno.id === newMsg.aluno_id);
              if (idx === -1) return prev;
              
              const updated = [...prev];
              updated[idx] = {
                ...updated[idx],
                lastMessage: newMsg,
                unreadCount: payload.eventType === 'INSERT' && newMsg.autor_id !== personalId && selectedAlunoId !== newMsg.aluno_id
                  ? updated[idx].unreadCount + 1
                  : updated[idx].unreadCount
              };
              
              // Re-sort
              return updated.sort((a, b) => {
                const aUnread = a.unreadCount > 0 ? 1 : 0;
                const bUnread = b.unreadCount > 0 ? 1 : 0;
                if (aUnread !== bUnread) return bUnread - aUnread;
                const aTime = a.lastMessage ? new Date(a.lastMessage.criado_em).getTime() : 0;
                const bTime = b.lastMessage ? new Date(b.lastMessage.criado_em).getTime() : 0;
                return bTime - aTime;
              });
            });

            // Also trigger standard audio/unreads event
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('zenite_mensagem_lida'));
            }
          }
        )
        .subscribe();
    }

    // Chat specific channel
    if (selectedAlunoId) {
      if (isSupabaseConfigured && supabase) {
        canalChat = supabase.channel(`mensagens-chat-${selectedAlunoId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'mensagens', filter: `aluno_id=eq.${selectedAlunoId}` },
            (payload) => {
              if (payload.eventType === 'INSERT') {
                const newMsg = payload.new as Mensagem;
                setActiveMessages((prev) => {
                  if (prev.some((m) => m.id === newMsg.id)) return prev;
                  return [...prev, newMsg];
                });
                if (newMsg.autor_id !== personalId) {
                  dbService.marcarMensagensLidas(selectedAlunoId, personalId);
                }
              } else if (payload.eventType === 'UPDATE') {
                const updatedMsg = payload.new as Mensagem;
                setActiveMessages((prev) =>
                  prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
                );
              } else if (payload.eventType === 'DELETE') {
                const deletedId = payload.old.id;
                setActiveMessages((prev) => prev.filter((m) => m.id !== deletedId));
              }
            }
          )
          .subscribe();
      }
    }

    const handleMockMsg = (e: any) => {
      // Refresh conversations list on any new message
      loadConversations();
      // If a chat is active, refresh its messages
      if (selectedAlunoId && e.detail?.aluno_id === selectedAlunoId) {
        dbService.getMensagens(selectedAlunoId).then(({ data }) => {
          if (data) {
            setActiveMessages(data);
          }
        });
        dbService.marcarMensagensLidas(selectedAlunoId, personalId);
      }
    };

    window.addEventListener('zenite_mensagem_enviada', handleMockMsg);

    return () => {
      if (canalGlobal) supabase.removeChannel(canalGlobal);
      if (canalChat) supabase.removeChannel(canalChat);
      window.removeEventListener('zenite_mensagem_enviada', handleMockMsg);
    };
  }, [personalId, selectedAlunoId]);

  // Scroll to bottom on message list updates
  useEffect(() => {
    scrollToBottom('smooth');
  }, [activeMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlunoId || !inputText.trim()) return;

    const currentText = inputText.trim();
    setInputText('');
    tocar('enviar');

    const { data: newMsg, error } = await dbService.enviarMensagem(personalId, selectedAlunoId, personalId, currentText);
    if (error) {
      console.error('Erro ao enviar mensagem:', error);
      setErrorMsg(`Erro ao enviar: ${error.message || 'Erro desconhecido'}`);
    } else if (newMsg) {
      setActiveMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      // Update conversations list with latest message
      setConversations((prev) => {
        return prev.map((c) => {
          if (c.aluno.id === selectedAlunoId) {
            return { ...c, lastMessage: newMsg };
          }
          return c;
        });
      });
    }
  };

  const handleSelectAluno = (alunoId: string) => {
    tocar('tap');
    setSelectedAlunoId(alunoId);
    loadActiveChat(alunoId);
  };

  const getActiveStudentProfile = () => {
    const conv = conversations.find((c) => c.aluno.id === selectedAlunoId);
    return conv?.aluno.profile;
  };

  const isUUID = (str: string) => {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);
  };

  const getFirstName = (fullName: string) => {
    const trimmed = fullName.trim();
    if (!trimmed) return 'Aluno';
    return trimmed.split(' ')[0];
  };

  const getActiveStudentProfileName = () => {
    const nome = getActiveStudentProfile()?.nome;
    if (nome && !isUUID(nome)) return nome;
    return 'Aluno';
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch {
      return '';
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (c.aluno.ativo === false) return false;
    const nome = c.aluno.profile?.nome || '';
    return nome.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div id="chat-personal-container" className="grid grid-cols-1 md:grid-cols-12 bg-surface rounded-3xl border border-white/5 overflow-hidden flex-1 min-h-0 shadow-2xl">
      {/* LEFT COLUMN: Student Conversation List */}
      <div className={`md:col-span-4 border-r border-white/5 flex flex-col bg-[#141414] h-full overflow-hidden ${selectedAlunoId ? 'hidden md:flex' : 'flex'}`}>
        {/* Search Header */}
        <div className="p-4 border-b border-white/5 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-ink uppercase tracking-tight italic">Alunos Ativos</h3>
            <span className="text-[10px] bg-[#F26A1B]/15 text-[#F26A1B] px-2 py-0.5 rounded-full font-mono font-bold uppercase">Chat</span>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar aluno..."
              className="w-full bg-surface text-sm text-ink pl-9 pr-4 py-2 rounded-xl border border-white/5 focus:outline-none focus:border-[#F26A1B]/30 transition-all placeholder:text-ink-3"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-white/[0.02]">
          {loadingList ? (
            <div className="h-48 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#F26A1B]" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-ink-3 text-xs">
              <MessageSquare className="w-8 h-8 text-white/5 mx-auto mb-2" />
              Nenhum aluno encontrado.
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isSelected = c.aluno.id === selectedAlunoId;
              const hasUnread = c.unreadCount > 0;
              const isFemale = c.aluno.profile?.avatar_tipo === 'feminino';
              
              return (
                      <button
                        key={c.aluno.id}
                        type="button"
                        onClick={() => handleSelectAluno(c.aluno.id)}
                        data-sem-som
                        className={`w-full text-left p-4 flex gap-3 transition-colors cursor-pointer hover:bg-white/[0.01] ${
                          isSelected ? 'bg-white/[0.03]' : ''
                        }`}
                      >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-2xl bg-surface">
                      {isFemale ? '👩' : '👨'}
                    </div>
                    {hasUnread && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#F26A1B] border-2 border-[#141414] rounded-full" />
                    )}
                  </div>

                  {/* Text previews */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-sm truncate font-medium ${isSelected ? 'text-[#F26A1B]' : 'text-ink'}`}>
                        {c.aluno.profile?.nome || 'Aluno Sem Nome'}
                      </h4>
                      {c.lastMessage && (
                        <span className="text-[9px] text-ink-3 font-mono shrink-0">
                          {formatTime(c.lastMessage.criado_em)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className={`text-xs truncate flex-1 ${hasUnread ? 'text-ink font-semibold' : 'text-ink-3'}`}>
                        {c.lastMessage ? c.lastMessage.conteudo : 'Nenhuma mensagem ainda'}
                      </p>
                      {hasUnread && (
                        <span className="text-[9px] bg-[#F26A1B] text-white px-1.5 py-0.5 rounded-full font-mono font-bold">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Chat Frame */}
      <div className={`md:col-span-8 flex flex-col bg-surface-2 h-full overflow-hidden ${!selectedAlunoId ? 'hidden md:flex' : 'flex'}`}>
        {selectedAlunoId ? (
          <>
            {/* Active chat header */}
            <div className="bg-surface px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0 z-10">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedAlunoId(null)}
                  className="md:hidden p-1.5 rounded-lg hover:bg-white/5 text-ink-2 active:scale-95 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                
                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-2xl bg-surface-3 shadow-inner">
                  {getActiveStudentProfile()?.avatar_tipo === 'feminino' ? '👩' : '👨'}
                </div>

                <div>
                  <h3 className="font-display font-bold text-base text-ink leading-tight">
                    {getActiveStudentProfileName()}
                  </h3>
                  <p className="text-[10px] text-ink-3 font-mono uppercase tracking-wider mt-0.5">
                    Seu Aluno
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 px-3 py-1 bg-[#F26A1B]/10 text-[#F26A1B] border border-[#F26A1B]/10 rounded-full text-[10px] font-mono font-bold uppercase shrink-0">
                <span className="w-1.5 h-1.5 bg-[#F26A1B] rounded-full animate-ping" />
                Realtime Ativo
              </div>
            </div>

            {/* Error Alert Box */}
            {errorMsg && (
              <div className="bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs px-4 py-3 rounded-2xl flex justify-between items-center gap-2 animate-fade-in mx-6 mt-4 shrink-0">
                <span>{errorMsg}</span>
                <button type="button" onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-300 transition-colors cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Chat bubble list */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto min-h-0 p-6 space-y-4 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent"
            >
              {loadingChat ? (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#F26A1B]" />
                </div>
              ) : activeMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-ink-3">
                  <MessageSquare className="w-10 h-10 text-white/5 mb-2" />
                  <p className="text-sm font-medium text-ink-2">Nenhuma conversa registrada</p>
                  <p className="text-xs max-w-xs mt-1">Diga olá para iniciar o contato com este aluno.</p>
                </div>
              ) : (
                activeMessages.map((msg, index) => {
                  const isOwn = msg.autor_id === personalId;
                  const showSenderName = !isOwn && (index === 0 || activeMessages[index - 1].autor_id !== msg.autor_id);
                  const studentName = getActiveStudentProfileName();
                  const studentFirstName = getFirstName(studentName);
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
                          <span className="text-[11px] font-bold text-[#F26A1B] mb-1 font-mono uppercase tracking-wider">
                            {studentFirstName}
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
                                    className="px-2.5 py-1 text-[10px] uppercase font-bold text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                                  >
                                    Não
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(msg.id)}
                                    className="px-2.5 py-1 text-[10px] uppercase font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors cursor-pointer"
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
                                    className="px-2.5 py-1 text-[10px] uppercase font-bold text-white/70 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(msg.id)}
                                    className="px-2.5 py-1 text-[10px] uppercase font-bold text-[#F26A1B] bg-white hover:bg-white/90 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
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

                        <span className="text-[9px] text-ink-3 font-mono mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(msg.criado_em)}
                          {msg.editado_em && !isMessageExcluded && (
                            <span className="text-[8px] text-ink-3 italic ml-1">(editada)</span>
                          )}
                          {isOwn && msg.lida && !isMessageExcluded && (
                            <span className="text-emerald-400 text-[8px] font-bold ml-1 uppercase font-mono">Lida</span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Form */}
            <form onSubmit={handleSend} className="p-4 bg-surface border-t border-white/5 flex gap-2 shrink-0">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Mensagem para ${getFirstName(getActiveStudentProfileName())}...`}
                className="flex-1 bg-[#141414] text-ink border border-white/5 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#F26A1B]/40 transition-colors placeholder:text-ink-3"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-12 h-12 rounded-2xl bg-[#F26A1B] hover:bg-[#d55814] active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center transition-all cursor-pointer text-white shadow-lg shadow-[#F26A1B]/20"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-ink-3 h-full justify-center">
            <MessageSquare className="w-16 h-16 text-[#F26A1B]/15 mb-4 animate-pulse" />
            <h3 className="font-display font-bold text-lg text-ink">Centro de Mensagens</h3>
            <p className="text-sm max-w-sm mt-1">Selecione um aluno na barra lateral esquerda para visualizar o histórico de conversas e enviar mensagens em tempo real.</p>
          </div>
        )}
      </div>
    </div>
  );
}
