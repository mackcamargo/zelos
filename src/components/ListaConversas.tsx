import React, { useState, useEffect } from 'react';
import { dbService } from '../lib/supabase';
import { ConversaSumario } from '../types';
import { Search, MessageSquare, Clock, ImageIcon, Mic, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface ListaConversasProps {
  personalId: string;
  onSelectChat: (aluno: ConversaSumario) => void;
}

export default function ListaConversas({ personalId, onSelectChat }: ListaConversasProps) {
  const [conversas, setConversas] = useState<ConversaSumario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadConversas();
    
    // Refresh periodically or could use realtime for sumary updates
    const interval = setInterval(loadConversas, 30000);
    return () => clearInterval(interval);
  }, [personalId]);

  const loadConversas = async () => {
    try {
      const { data } = await dbService.getConversasSumario(personalId);
      if (data) setConversas(data);
    } finally {
      setLoading(false);
    }
  };

  const filtered = conversas.filter(c => 
    c.aluno_nome.toLowerCase().includes(search.toLowerCase())
  );

  const formatLastMsgTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    if (date.toLocaleDateString() === now.toLocaleDateString()) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const renderPreview = (msg: any) => {
    if (!msg) return 'Nenhuma mensagem ainda';
    if (msg.tipo === 'foto') return <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Foto</span>;
    if (msg.tipo === 'audio') return <span className="flex items-center gap-1"><Mic className="w-3 h-3" /> Áudio</span>;
    return msg.conteudo;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-xl text-ink">Minhas Conversas</h2>
        <div className="text-[10px] font-mono bg-flame/10 text-flame px-2 py-0.5 rounded-full border border-flame/20">
          Realtime
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar aluno..."
          className="w-full bg-surface-2 border border-white/5 focus:border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs text-ink outline-none transition-all"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 text-flame animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-surface-2 rounded-3xl border border-white/5 border-dashed">
          <MessageSquare className="w-8 h-8 text-ink-3 mx-auto mb-3 opacity-20" />
          <p className="text-xs text-ink-3 font-mono">Nenhuma conversa encontrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((chat) => (
            <motion.button
              key={chat.aluno_id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelectChat(chat)}
              className="w-full bg-surface-2 hover:bg-surface-3 border border-white/5 rounded-2xl p-4 flex items-center gap-4 transition-all group relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-full bg-surface-3 border border-white/10 overflow-hidden shrink-0">
                {chat.aluno_avatar ? (
                  <img src={chat.aluno_avatar} alt={chat.aluno_nome} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ink-3">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="font-display font-bold text-sm text-ink truncate group-hover:text-white transition-colors">
                    {chat.aluno_nome}
                  </h3>
                  {chat.ultima_mensagem && (
                    <span className="text-[10px] font-mono text-ink-3">
                      {formatLastMsgTime(chat.ultima_mensagem.criado_em)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-ink-3 truncate leading-tight flex-1 pr-4">
                    {renderPreview(chat.ultima_mensagem)}
                  </p>
                  {chat.nao_lidas > 0 && (
                    <span className="bg-flame text-void text-[10px] font-bold h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center animate-pulse">
                      {chat.nao_lidas}
                    </span>
                  )}
                </div>
              </div>

              {/* Status Dot */}
              <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
