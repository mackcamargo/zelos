import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar as CalendarIcon, Clock, MapPin, 
  Video, Check, X, Loader2, AlertCircle, FileText
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
      <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-[40px] flex items-center gap-4 text-[12px]" id="lista-agendamentos-error">
        <AlertCircle className="w-6 h-6 shrink-0" />
        <div>
          <p className="font-semibold text-ink">Erro ao carregar a agenda</p>
          <p className="text-[12px] opacity-70 mt-1">{erro}</p>
        </div>
      </div>
    );
  }

  if (agendamentos.length === 0) {
    return (
      <div className="py-20 text-center space-y-4 border border-dashed border-white/10 rounded-3xl" id="lista-agendamentos-empty">
        <CalendarIcon className="w-8 h-8 text-ink-3 mx-auto opacity-30" />
        <p className="text-[12px] text-ink-3">Nenhuma sessão encontrada.</p>
      </div>
    );
  }

  // Group agendamentos by day
  const groupedAgendamentos = agendamentos.reduce((groups: Record<string, Agendamento[]>, agenda) => {
    const date = new Date(agenda.data_hora).toISOString().split('T')[0];
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(agenda);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedAgendamentos).sort();

  return (
    <div className="space-y-6" id="lista-agendamentos-container">
      {sortedDates.map((dateStr) => {
        const date = new Date(dateStr + 'T12:00:00'); // Use mid-day to avoid TZ issues
        const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().replace('.', '');
        const dayMonth = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        const group = groupedAgendamentos[dateStr].sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());

        return (
          <div key={dateStr} className="space-y-2.5">
            <h5 className="text-[10px] font-bold text-ink-3 uppercase tracking-widest pl-2 flex items-center gap-2">
              <span className="text-accent">{weekday}</span>
              <span className="opacity-50">{dayMonth}</span>
              <div className="h-px bg-white/5 flex-1" />
            </h5>

            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {group.map((agenda, index) => {
                  const isCanceled = agenda.status === 'cancelado';
                  const config = STATUS_CONFIG[agenda.status] || { label: agenda.status, color: 'text-ink-3 bg-white/5 border-white/10' };
                  const d = new Date(agenda.data_hora);
                  const horaFmt = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.03 }}
                      key={agenda.id}
                      onClick={() => setSelectedAgendamento(agenda)}
                      className={`bg-[#17171A] border border-white/5 hover:border-white/10 transition-all rounded-xl p-2.5 px-3 flex items-center justify-between gap-4 cursor-pointer shadow-sm hover:shadow-md group ${
                        isCanceled ? 'opacity-50 grayscale-[0.5]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Compact Time Badge */}
                        <div className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center shrink-0 border transition-colors ${
                          agenda.status === 'confirmado' 
                            ? 'bg-accent/10 border-accent/20 text-accent' 
                            : 'bg-white/5 border-white/5 text-ink-2'
                        }`}>
                          <span className="text-[14px] font-bold num leading-tight">
                            {horaFmt.split(':')[0]}
                          </span>
                          <span className="text-[9px] font-medium opacity-70 num leading-none">
                            {horaFmt.split(':')[1]}
                          </span>
                        </div>
                        
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-display font-bold text-[13px] text-ink leading-tight truncate">
                              {agenda.aluno_nome && !isUUID(agenda.aluno_nome) ? agenda.aluno_nome : 'Sessão Individual'}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                             <span className="flex items-center gap-1 text-[10px] text-ink-3">
                               {agenda.tipo === 'presencial' ? (
                                 <MapPin className="w-2.5 h-2.5 text-accent/70" />
                               ) : agenda.tipo === 'online' ? (
                                 <Video className="w-2.5 h-2.5 text-accent/70" />
                               ) : (
                                 <FileText className="w-2.5 h-2.5 text-accent/70" />
                               )}
                               <span className="capitalize">{agenda.tipo}</span>
                             </span>
                             
                             <div className="w-1 h-1 rounded-full bg-white/10" />

                             <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider ${config.color} border border-current/10`}>
                               {config.label}
                             </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {processingId === agenda.id ? (
                          <Loader2 className="w-4 h-4 text-accent animate-spin" />
                        ) : agenda.status === 'solicitado' ? (
                          <div className="flex gap-1">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleUpdateStatus(agenda, 'confirmado'); }}
                              className="w-8 h-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center border border-green-500/20 hover:bg-green-500/20 transition-all"
                              title="Confirmar"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleUpdateStatus(agenda, 'cancelado'); }}
                              className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20 hover:bg-red-500/20 transition-all"
                              title="Recusar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                           <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             {!isCanceled ? (
                               <button 
                                 onClick={(e) => { e.stopPropagation(); handleUpdateStatus(agenda, 'cancelado'); }}
                                 className="w-8 h-8 rounded-lg bg-white/5 text-ink-3 hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                               >
                                 <X className="w-3.5 h-3.5" />
                               </button>
                             ) : (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleUpdateStatus(agenda, 'confirmado'); }}
                                  className="w-8 h-8 rounded-lg bg-white/5 text-ink-3 hover:text-green-500 hover:bg-green-500/10 transition-all border border-transparent hover:border-green-500/20"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                             )}
                           </div>
                        )}
                        <ChevronRight className="w-4 h-4 text-ink-3 opacity-30 group-hover:opacity-100 group-hover:text-accent transition-all" />
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        );
      })}

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

function ChevronRight(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m9 18 6-6-6-6"/></svg>
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
