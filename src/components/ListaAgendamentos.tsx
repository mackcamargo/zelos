import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar as CalendarIcon, Clock, MapPin, 
  Video, Check, X, Loader2, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService, isSupabaseConfigured, supabase } from '../lib/supabase';
import { Agendamento, StatusAgendamento } from '../types';
import DetalheSessaoModal from './DetalheSessaoModal';

interface ListaAgendamentosProps {
  agendamentos: Agendamento[];
  carregando?: boolean;
  erro?: string | null;
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

export function useAgendamentos(personalId?: string) {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const loadAgendamentos = useCallback(async () => {
    let targetId = personalId;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setErro("Faça login para ver seus agendamentos");
          setCarregando(false);
          return;
        }
        targetId = user.id;
      } catch (err) {
        setErro("Erro de autenticação");
        setCarregando(false);
        return;
      }
    } else {
      if (!targetId) {
        const sessionStr = localStorage.getItem('zenite_mock_session');
        if (sessionStr) {
          try {
            const parsed = JSON.parse(sessionStr);
            targetId = parsed?.user?.id;
          } catch (e) {
            // ignore
          }
        }
      }
    }

    if (!targetId) {
      setCarregando(false);
      return;
    }

    setCarregando(true);
    setErro(null);
    try {
      const { data, error } = await dbService.getAgendamentosPersonal(targetId);
      if (error) {
        console.error('Erro ao carregar agendamentos:', error);
        setErro(error.message || 'Erro ao carregar agendamentos');
      } else {
        setAgendamentos(data || []);
      }
    } catch (err: any) {
      console.error('Falha na comunicação com o servidor:', err);
      setErro(`Falha na comunicação: ${err.message || 'Erro inesperado'}`);
    } finally {
      setCarregando(false);
    }
  }, [personalId]);

  useEffect(() => {
    loadAgendamentos();
  }, [loadAgendamentos]);

  useEffect(() => {
    const handleUpdate = () => {
      loadAgendamentos();
    };
    window.addEventListener('agendamentos-changed', handleUpdate);
    return () => {
      window.removeEventListener('agendamentos-changed', handleUpdate);
    };
  }, [loadAgendamentos]);

  return { agendamentos, carregando, erro, loadAgendamentos };
}

export default function ListaAgendamentos({ agendamentos, carregando, erro }: ListaAgendamentosProps) {
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);

  const handleUpdateStatus = async (agenda: Agendamento, newStatus: StatusAgendamento) => {
    setProcessingId(agenda.id);
    try {
      await dbService.updateStatusAgendamento(agenda.id, newStatus);
      window.dispatchEvent(new CustomEvent('agendamentos-changed'));
    } catch (err) {
      console.error('Erro ao atualizar status do agendamento:', err);
    } finally {
      setProcessingId(null);
    }
  };

  if (carregando) {
    return (
      <div className="flex justify-center py-20" id="lista-agendamentos-loading">
        <Loader2 className="w-8 h-8 text-flame animate-spin" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-[40px] flex items-center gap-4 text-xs font-mono uppercase" id="lista-agendamentos-error">
        <AlertCircle className="w-6 h-6 shrink-0" />
        <div>
          <p className="font-bold text-ink">Erro ao carregar a agenda</p>
          <p className="text-[10px] opacity-70 mt-1">{erro}</p>
        </div>
      </div>
    );
  }

  if (agendamentos.length === 0) {
    return (
      <div className="py-20 text-center space-y-4 border-2 border-dashed border-white/5 rounded-[40px]" id="lista-agendamentos-empty">
        <CalendarIcon className="w-8 h-8 text-ink-3 mx-auto" />
        <p className="text-xs font-mono text-ink-3 uppercase tracking-widest">Nenhuma sessão encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" id="lista-agendamentos-container">
      <AnimatePresence mode="popLayout">
        {agendamentos.map((agenda, index) => {
          const config = STATUS_CONFIG[agenda.status] || { label: agenda.status, color: 'text-ink-3 bg-white/5 border-white/10' };
          const d = new Date(agenda.data_hora);
          const dataFmt = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", weekday: "short" });
          const horaFmt = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

          return (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
              key={agenda.id}
              onClick={() => setSelectedAgendamento(agenda)}
              className="group bg-surface-2 border border-white/5 rounded-3xl p-6 hover:bg-surface-3 hover:border-white/20 cursor-pointer transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 clicavel"
            >
              <div className="flex items-center gap-6">
                <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-bold shrink-0 ${
                  agenda.status === 'confirmado' ? 'bg-flame text-void' : 'bg-white/5 text-ink-3'
                }`}>
                  <span className="text-[10px] uppercase opacity-70">
                    {isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR', { month: 'short' })}
                  </span>
                  <span className="text-xl leading-none">
                    {isNaN(d.getTime()) ? '-' : d.getDate()}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-bold text-ink">{isNaN(d.getTime()) ? 'Horário' : horaFmt}</h4>
                    <span className="text-[10px] font-mono text-ink-3 uppercase">({isNaN(d.getTime()) ? 'Data' : dataFmt})</span>
                    {agenda.aluno_nome && !isUUID(agenda.aluno_nome) && (
                      <span className="text-[10px] font-mono text-flame uppercase tracking-widest">• {agenda.aluno_nome}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-ink-3 font-mono uppercase tracking-widest">
                     <span className="flex items-center gap-1">
                       {agenda.tipo === 'presencial' ? <MapPin className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                       {agenda.tipo}
                     </span>
                     <span className={`px-2 py-0.5 rounded-full border ${config.color} text-[8px] font-black`}>
                       {config.label}
                     </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {processingId === agenda.id ? (
                  <Loader2 className="w-5 h-5 text-flame animate-spin" />
                ) : agenda.status === 'solicitado' ? (
                  <>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleUpdateStatus(agenda, 'confirmado'); }}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-green-500/20 hover:bg-green-500/20 transition-all"
                    >
                      <Check className="w-4 h-4" /> Confirmar
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleUpdateStatus(agenda, 'cancelado'); }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-red-500/20 hover:bg-red-500/20 transition-all"
                    >
                      <X className="w-4 h-4" /> Recusar
                    </button>
                  </>
                ) : (
                   <div className="flex gap-2">
                     {agenda.status !== 'cancelado' && (
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleUpdateStatus(agenda, 'cancelado'); }}
                         className="p-2 bg-white/5 text-ink-3 hover:text-red-500 rounded-xl transition-colors"
                       >
                         <X className="w-4 h-4" />
                       </button>
                     )}
                     {agenda.status === 'cancelado' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleUpdateStatus(agenda, 'confirmado'); }}
                          className="p-2 bg-white/5 text-ink-3 hover:text-green-500 rounded-xl transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                     )}
                   </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <DetalheSessaoModal
        agendamento={selectedAgendamento}
        onClose={() => setSelectedAgendamento(null)}
        isProfessor={true}
        onCancelar={() => window.dispatchEvent(new CustomEvent('agendamentos-changed'))}
        onRemarcar={() => window.dispatchEvent(new CustomEvent('agendamentos-changed'))}
      />
    </div>
  );
}

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
