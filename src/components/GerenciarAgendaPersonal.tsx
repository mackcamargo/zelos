import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Clock, MapPin, 
  Video, Check, X, Loader2, User, 
  Sparkles, Filter, ChevronRight,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService } from '../lib/supabase';
import { Agendamento, StatusAgendamento, TipoSessao, Aluno } from '../types';
import CriarSessaoModal from './CriarSessaoModal';
import ListaAgendamentos, { useAgendamentos } from './ListaAgendamentos';

interface GerenciarAgendaPersonalProps {
  personalId: string;
  isReadOnly?: boolean;
}

const STATUS_CONFIG: Record<StatusAgendamento, { label: string, color: string, ring: string }> = {
  solicitado: { label: 'Solicitado', color: 'text-amber bg-amber/10 border-amber/20', ring: 'ring-amber/20' },
  confirmado: { label: 'Confirmado', color: 'text-green-500 bg-green-500/10 border-green-500/20', ring: 'ring-green-500/20' },
  cancelado: { label: 'Cancelado', color: 'text-ink-3 bg-white/5 border-white/10', ring: 'ring-white/10' }
};

const isUUID = (val: any): boolean => {
  if (typeof val !== 'string') return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val) || (val.length > 25 && (val.includes('-') || /^[0-9a-fA-F]+$/.test(val)));
};

export default function GerenciarAgendaPersonal({ personalId, isReadOnly = false }: GerenciarAgendaPersonalProps) {
  const { agendamentos, carregando, erro, loadAgendamentos } = useAgendamentos(personalId);
  const [selectedFilter, setSelectedFilter] = useState<StatusAgendamento | 'todos'>('todos');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const handleUpdateStatus = async (agendamento: Agendamento, newStatus: StatusAgendamento) => {
    setProcessingId(agendamento.id);
    try {
      await dbService.updateStatusAgendamento(agendamento.id, newStatus);
      loadAgendamentos();
      window.dispatchEvent(new CustomEvent('zenite_agenda_updated'));
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = agendamentos.filter(a => selectedFilter === 'todos' || a.status === selectedFilter);
  
  const solicitacoesPendentes = agendamentos.filter(a => a.status === 'solicitado');
  const proximasSessoes = agendamentos
    .filter(a => a.status === 'confirmado' && new Date(a.data_hora) >= new Date())
    .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());

  if (carregando) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>;
  }

  return (
    <div className="space-y-12 pb-24">
      {/* PENDING REQUESTS WIDGET */}
      {solicitacoesPendentes.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-6 space-y-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-amber-500">Solicitações <span className="text-ink">pendentes</span></h3>
                <p className="text-[12px] text-ink-3">{solicitacoesPendentes.length} novas solicitações</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {solicitacoesPendentes.map(req => (
              <div key={req.id} className="bg-bg-sub border border-line rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="z-avatar">
                    <User className="w-5 h-5 text-ink-2" />
                  </div>
                  <div>
                    {req.aluno_nome && !isUUID(req.aluno_nome) && (
                      <h4 className="font-semibold text-ink leading-none">{req.aluno_nome}</h4>
                    )}
                    <p className="text-[12px] text-ink-3 mt-1.5 z-num font-medium">
                      {new Date(req.data_hora).toLocaleDateString('pt-BR')} • {new Date(req.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!isReadOnly && (
                    <>
                      <button 
                        disabled={processingId === req.id}
                        onClick={() => handleUpdateStatus(req, 'confirmado')}
                        className="w-9 h-9 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center hover:bg-green-500/20 transition-all border border-green-500/20 cursor-pointer"
                      >
                        {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-5 h-5" />}
                      </button>
                      <button 
                        disabled={processingId === req.id}
                        onClick={() => handleUpdateStatus(req, 'cancelado')}
                        className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-all border border-red-500/20 cursor-pointer"
                      >
                        {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-5 h-5" />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* TODAY'S SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* FILTER TABS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="z-display">Gestão da <span className="text-accent">agenda</span></h3>
            <div className="flex flex-wrap gap-1.5 p-1 bg-surface border border-line rounded-xl">
              {(['todos', 'confirmado', 'solicitado', 'cancelado'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setSelectedFilter(f)}
                  aria-selected={selectedFilter === f}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    selectedFilter === f 
                    ? 'bg-accent text-white shadow-sm' 
                    : 'text-ink-3 hover:text-ink hover:bg-white/5'
                  }`}
                >
                  {f === 'todos' ? 'Ver tudo' : f}
                </button>
              ))}
            </div>
          </div>

          {/* MAIN LIST */}
          <ListaAgendamentos agendamentos={filtered} carregando={carregando} erro={erro} />
        </div>

        {/* SIDEBAR WIDGETS */}
        <div className="space-y-6">
          <div className="bg-surface border border-line rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold text-ink-3 uppercase tracking-widest">Próximas <span className="text-accent">sessões</span></h4>
              <CalendarIcon className="w-3.5 h-3.5 text-accent opacity-50" />
            </div>
            
            <div className="space-y-2">
              {proximasSessoes.slice(0, 4).map(s => (
                <div key={s.id} className="flex items-center gap-3 p-2 bg-bg border border-line/40 rounded-xl hover:border-line transition-all group">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0 group-hover:bg-accent group-hover:text-white transition-colors">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    {s.aluno_nome && !isUUID(s.aluno_nome) && (
                      <h5 className="font-semibold text-ink text-[11px] leading-tight truncate">{s.aluno_nome}</h5>
                    )}
                    <p className="text-[9px] text-ink-3 mt-0.5 z-num font-medium">
                      {new Date(s.data_hora).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} • {new Date(s.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {proximasSessoes.length === 0 && (
                <p className="text-[10px] text-ink-3 text-center py-4 italic opacity-50 font-mono">Sem sessões agendadas</p>
              )}
            </div>
            
            {!isReadOnly && (
              <button 
                onClick={() => setModalAberto(true)} 
                className="w-full py-2.5 rounded-xl bg-accent text-white text-[11px] font-bold tracking-wider hover:bg-accent/90 transition-all shadow-sm flex items-center justify-center gap-2 mt-2 border border-accent/20"
              >
                <Plus className="w-3.5 h-3.5" /> Agendar Sessão
              </button>
            )}
          </div>
        </div>
      </div>

      <CriarSessaoModal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onCriado={loadAgendamentos}
        personalId={personalId}
      />
    </div>
  );
}

// Helper icons missing in imports
function RefreshCw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
