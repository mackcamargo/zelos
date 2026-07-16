import React, { useState, useEffect, useRef } from 'react';
import { dbService, isSupabaseConfigured, supabase } from '../lib/supabase';
import { Mensagem } from '../types';
import { Send, MessageSquare, Clock } from 'lucide-react';

interface ChatAlunoProps {
  userId: string;
}

export default function ChatAluno({ userId }: ChatAlunoProps) {
  const [messages, setMessages] = useState<Mensagem[]>([]);
  const [inputText, setInputText] = useState('');
  const [personalId, setPersonalId] = useState<string | null>(null);
  const [personalProfile, setPersonalProfile] = useState<{ nome: string; avatar_tipo: string } | null>(null);
  const [loading, setLoading] = useState(true);
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
          { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `aluno_id=eq.${userId}` },
          (payload) => {
            const newMsg = payload.new as Mensagem;
            setMessages((prev) => {
              // Avoid duplicate messages
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            // Mark as read if not authored by this user
            if (newMsg.autor_id !== userId) {
              dbService.marcarMensagensLidas(userId, userId);
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

    return () => {
      if (canal) {
        supabase.removeChannel(canal);
      }
      window.removeEventListener('zenite_mensagem_enviada', handleMockMsg);
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

    const targetPersonalId = personalId || '00000000-0000-0000-0000-000000000000'; // fallback
    const { data: newMsg } = await dbService.enviarMensagem(targetPersonalId, userId, userId, currentText);
    
    if (newMsg) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
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
    <div id="chat-aluno-container" className="flex flex-col h-[calc(100vh-14rem)] md:h-[600px] bg-surface-2 rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-surface-3 px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-2xl bg-surface-2 shadow-inner">
            {isFemale ? '👩' : '👨'}
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-ink leading-tight">{personalName}</h3>
            <p className="text-[10px] text-ink-3 font-mono uppercase tracking-wider mt-0.5">Seu Personal Trainer</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-[#F26A1B]/10 text-[#F26A1B] border border-[#F26A1B]/10 rounded-full text-[10px] font-mono font-bold uppercase">
          <span className="w-1.5 h-1.5 bg-[#F26A1B] rounded-full animate-ping" />
          Realtime Ativo
        </div>
      </div>

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
            
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div className={`max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                  {showSenderName && (
                    <span className="text-[11px] font-bold text-[#F26A1B] mb-1 font-mono uppercase tracking-wider">
                      {personalFirstName}
                    </span>
                  )}
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      isOwn
                        ? 'bg-[#F26A1B] text-white rounded-tr-none shadow-[0_4px_12px_rgba(242,106,27,0.2)]'
                        : 'bg-surface-3 text-ink-2 rounded-tl-none border border-white/5'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.conteudo}</p>
                  </div>
                  <span className="text-[10px] text-ink-3 font-mono mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(msg.criado_em)}
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
      <form onSubmit={handleSend} className="p-4 bg-surface-3 border-t border-white/5 flex gap-2">
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
