import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../lib/supabase';
import { Mensagem, Profile } from '../types';
import { 
  Send, Camera, Mic, Square, Play, Pause, 
  CheckCheck, ChevronLeft, Image as ImageIcon, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatProps {
  personalId: string;
  alunoId: string;
  currentUserId: string;
  otherParticipantName: string;
  otherParticipantAvatar: string | null;
  onBack?: () => void;
}

export default function Chat({ 
  personalId, 
  alunoId, 
  currentUserId, 
  otherParticipantName,
  otherParticipantAvatar,
  onBack 
}: ChatProps) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novoTexto, setNovoTexto] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    loadMensagens();
    
    // Subscribe to new messages
    const channel = dbService.subscribeMensagens(personalId, alunoId, (newMsg) => {
      setMensagens(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      
      // If the message is from the other person, mark as read
      if (newMsg.autor_id !== currentUserId) {
        dbService.marcarMensagensLidas(personalId, alunoId, currentUserId);
      }
    });

    // Mark existing as read
    dbService.marcarMensagensLidas(personalId, alunoId, currentUserId);

    return () => {
      if (channel) channel.unsubscribe();
    };
  }, [personalId, alunoId, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  const loadMensagens = async () => {
    setLoading(true);
    try {
      const { data } = await dbService.getMensagens(personalId, alunoId);
      if (data) setMensagens(data);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSendText = async () => {
    if (!novoTexto.trim() || sending) return;

    setSending(true);
    const payload: Partial<Mensagem> = {
      personal_id: personalId,
      aluno_id: alunoId,
      autor_id: currentUserId,
      tipo: 'texto',
      conteudo: novoTexto.trim()
    };

    const { data, error } = await dbService.enviarMensagem(payload);
    if (!error && data) {
      setMensagens(prev => [...prev, data]);
      setNovoTexto('');
    }
    setSending(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || sending) return;

    setSending(true);
    try {
      const path = `chat/${personalId}/${alunoId}/${Date.now()}_${file.name}`;
      const { url, error } = await dbService.uploadArquivoMensagem(file, path);
      
      if (url) {
        const payload: Partial<Mensagem> = {
          personal_id: personalId,
          aluno_id: alunoId,
          autor_id: currentUserId,
          tipo: 'foto',
          arquivo_url: url
        };
        const { data } = await dbService.enviarMensagem(payload);
        if (data) setMensagens(prev => [...prev, data]);
      }
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        sendAudio(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const sendAudio = async (blob: Blob) => {
    setSending(true);
    try {
      const file = new File([blob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
      const path = `chat/${personalId}/${alunoId}/${file.name}`;
      const { url } = await dbService.uploadArquivoMensagem(file, path);
      
      if (url) {
        const payload: Partial<Mensagem> = {
          personal_id: personalId,
          aluno_id: alunoId,
          autor_id: currentUserId,
          tipo: 'audio',
          arquivo_url: url
        };
        const { data } = await dbService.enviarMensagem(payload);
        if (data) setMensagens(prev => [...prev, data]);
      }
    } finally {
      setSending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-[600px] bg-void rounded-3xl border border-white/5 overflow-hidden shadow-2xl relative">
      {/* Header */}
      <div className="bg-surface-2 border-b border-white/5 p-4 flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="p-2 -ml-2 text-ink-3 hover:text-ink">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div className="w-10 h-10 rounded-full bg-surface-3 border border-white/10 overflow-hidden shrink-0">
          {otherParticipantAvatar ? (
            <img src={otherParticipantAvatar} alt={otherParticipantName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-ink-3">
              <ImageIcon className="w-5 h-5" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-sm text-ink truncate">{otherParticipantName}</h3>
          <span className="text-[10px] text-emerald-400 font-mono">Online</span>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth custom-scrollbar"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-flame animate-spin" />
          </div>
        ) : mensagens.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-30 text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
              <Send className="w-8 h-8" />
            </div>
            <p className="text-xs font-mono">Comece uma conversa agora!</p>
          </div>
        ) : (
          mensagens.map((msg, idx) => {
            const isMe = msg.autor_id === currentUserId;
            const showDate = idx === 0 || 
              new Date(msg.criado_em).toLocaleDateString() !== new Date(mensagens[idx-1].criado_em).toLocaleDateString();

            return (
              <React.Fragment key={msg.id}>
                {showDate && (
                  <div className="flex justify-center my-4">
                    <span className="bg-surface-2 px-3 py-1 rounded-full text-[9px] font-mono text-ink-3 border border-white/5">
                      {new Date(msg.criado_em).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                    </span>
                  </div>
                )}
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 relative shadow-sm ${
                    isMe ? 'bg-flame text-white rounded-tr-none' : 'bg-surface-2 text-ink rounded-tl-none border border-white/5'
                  }`}>
                    {msg.tipo === 'texto' && (
                      <p className="text-sm leading-relaxed">{msg.conteudo}</p>
                    )}
                    
                    {msg.tipo === 'foto' && (
                      <div className="rounded-xl overflow-hidden mb-1 -mx-1">
                        <img src={msg.arquivo_url!} alt="Foto" className="max-w-full h-auto" />
                      </div>
                    )}

                    {msg.tipo === 'audio' && (
                      <div className="flex items-center gap-2 min-w-[150px]">
                        <button className={`p-2 rounded-full ${isMe ? 'bg-white/20' : 'bg-surface-3'}`}>
                          <Play className="w-4 h-4" />
                        </button>
                        <div className={`flex-1 h-1 rounded-full ${isMe ? 'bg-white/30' : 'bg-surface-3'}`} />
                        <span className="text-[10px] font-mono opacity-60">Audio</span>
                      </div>
                    )}

                    <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-white/60' : 'text-ink-3'}`}>
                      <span className="text-[9px] font-mono">
                        {new Date(msg.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMe && (
                        <CheckCheck className={`w-3 h-3 ${msg.lida ? 'text-emerald-300' : ''}`} />
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-surface-2 border-t border-white/5">
        {isRecording ? (
          <div className="flex items-center justify-between bg-surface-3 rounded-2xl p-2 animate-pulse">
            <div className="flex items-center gap-3 px-2">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-mono text-rose-500">{formatTime(recordingTime)}</span>
            </div>
            <button 
              onClick={stopRecording}
              className="p-3 bg-rose-500 text-white rounded-xl shadow-lg"
            >
              <Square className="w-5 h-5 fill-current" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={sending}
              />
              <button className="p-3 bg-surface-3 text-ink-3 hover:text-ink rounded-xl border border-white/5 transition-all">
                <Camera className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 relative">
              <input
                type="text"
                value={novoTexto}
                onChange={(e) => setNovoTexto(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                placeholder="Mensagem..."
                className="w-full bg-surface-3 border border-white/5 focus:border-flame/30 rounded-xl py-3 px-4 text-sm text-ink placeholder-ink-3 outline-none transition-all"
                disabled={sending}
              />
              {sending && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 text-flame animate-spin" />
                </div>
              )}
            </div>

            {novoTexto.trim() ? (
              <button 
                onClick={handleSendText}
                disabled={sending}
                className="p-3 bg-flame text-white rounded-xl shadow-lg hover:opacity-90 active:scale-95 transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button 
                onClick={startRecording}
                disabled={sending}
                className="p-3 bg-surface-3 text-ink-3 hover:text-flame rounded-xl border border-white/5 transition-all"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
