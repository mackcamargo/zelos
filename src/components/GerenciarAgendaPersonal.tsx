import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Clock, MapPin, 
  Video, Check, X, Loader2, User, 
  Info, Sparkles, Filter, ChevronRight,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService } from '../lib/supabase';
import { Agendamento, StatusAgendamento, TipoSessao, Aluno } from '../types';
import CriarSessaoModal from './CriarSessaoModal';

interface GerenciarAgendaPersonalProps {
  personalId: string;
}

const STATUS_CONFIG: Record<StatusAgendamento, { label: string, color: string, ring: string }> = {
  solicitado: { label: 'Solicitado', color: 'text-amber bg-amber/10 border-amber/20', ring: 'ring-amber/20' },
  confirmado: { label: 'Confirmado', color: 'text-green-500 bg-green-500/10 border-green-500/20', ring: 'ring-green-500/20' },
  cancelado: { label: 'Cancelado', color: 'text-ink-3 bg-white/5 border-white/10', ring: 'ring-white/10' }
};

export default function GerenciarAgendaPersonal({ personalId }: GerenciarAgendaPersonalProps) {
  const [loading, setLoading] = useState(true);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<StatusAgendamento | 'todos'>('todos');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    loadAgendamentos();
  }, [personalId]);

  const loadAgendamentos = async () => {
    setLoading(true);
    try {
      const { data } = await dbService.getAgendamentosPersonal(personalId);
      setAgendamentos(data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (agendamento: Agendamento, newStatus: StatusAgendamento) => {
    setProcessingId(agendamento.id);
    try {
      await dbService.updateStatusAgendamento(agendamento.id, newStatus, agendamento.aluno_id, personalId);
      loadAgendamentos();
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = agendamentos.filter(a => selectedFilter === 'todos' || a.status === selectedFilter);
  
  const solicitacoesPendentes = agendamentos.filter(a => a.status === 'solicitado');
  const proximasSessoes = agendamentos
    .filter(a => a.status === 'confirmado' && new Date(`${a.data}T${a.horario}`) >= new Date())
    .sort((a, b) => new Date(`${a.data}T${a.horario}`).getTime() - new Date(`${b.data}T${b.horario}`).getTime());

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-flame animate-spin" /></div>;
  }

  return (
    <div className="space-y-12 pb-24">
      {/* PENDING REQUESTS WIDGET */}
      {solicitacoesPendentes.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber/5 border border-amber/20 rounded-[40px] p-8 space-y-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber" />
              </div>
              <div>
                <h3 className="text-xl font-display font-black text-amber uppercase italic tracking-tighter">Solicitações <span className="text-ink">Pendentes</span></h3>
                <p className="text-[10px] font-mono text-amber/60 uppercase tracking-widest">{solicitacoesPendentes.length} novas solicitações</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {solicitacoesPendentes.map(req => (
              <div key={req.id} className="bg-void border border-white/5 rounded-3xl p-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center border border-white/10">
                    <User className="w-6 h-6 text-ink-3" />
                  </div>
                  <div>
                    <h4 className="font-bold text-ink leading-none">{req.aluno?.profile?.nome || 'Aluno'}</h4>
                    <p className="text-[10px] font-mono text-ink-3 uppercase mt-1">
                      {new Date(req.data).toLocaleDateString()} • {req.horario}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    disabled={processingId === req.id}
                    onClick={() => handleUpdateStatus(req, 'confirmado')}
                    className="w-10 h-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center hover:bg-green-500/20 transition-all border border-green-500/20"
                  >
                    {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-5 h-5" />}
                  </button>
                  <button 
                    disabled={processingId === req.id}
                    onClick={() => handleUpdateStatus(req, 'cancelado')}
                    className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-all border border-red-500/20"
                  >
                    {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* TODAY'S SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* FILTER TABS */}
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-display font-black text-ink uppercase italic tracking-tighter">Gestão da <span className="text-flame">Agenda</span></h3>
            <div className="flex gap-1 bg-white/5 p-1 rounded-2xl border border-white/5">
              {(['todos', 'confirmado', 'solicitado', 'cancelado'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setSelectedFilter(f)}
                  className={`px-4 py-2 rounded-xl text-[8px] font-bold uppercase tracking-widest transition-all ${
                    selectedFilter === f ? 'bg-flame text-void' : 'text-ink-3 hover:text-ink hover:bg-white/5'
                  }`}
                >
                  {f === 'todos' ? 'Ver Tudo' : f}
                </button>
              ))}
            </div>
          </div>

          {/* MAIN LIST */}
          <div className="space-y-4">
            {filtered.length > 0 ? (
              filtered.map((agenda, index) => {
                const config = STATUS_CONFIG[agenda.status];
                return (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={agenda.id}
                    className="group bg-surface-2 border border-white/5 rounded-3xl p-6 hover:bg-surface-3 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="flex items-center gap-6">
                      <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-bold ${
                        agenda.status === 'confirmado' ? 'bg-flame text-void' : 'bg-white/5 text-ink-3'
                      }`}>
                        <span className="text-[10px] uppercase opacity-70">
                          {new Date(agenda.data).toLocaleDateString('pt-BR', { month: 'short' })}
                        </span>
                        <span className="text-xl leading-none">
                          {new Date(agenda.data).getDate()}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-bold text-ink">{agenda.horario}</h4>
                          <span className={`text-[10px] font-mono text-flame uppercase tracking-widest`}>• {agenda.aluno?.profile?.nome || 'Aluno'}</span>
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
                      {agenda.status === 'solicitado' ? (
                        <>
                          <button 
                            onClick={() => handleUpdateStatus(agenda, 'confirmado')}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-green-500/20 hover:bg-green-500/20"
                          >
                            <Check className="w-4 h-4" /> Confirmar
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(agenda, 'cancelado')}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-red-500/20 hover:bg-red-500/20"
                          >
                            <X className="w-4 h-4" /> Recusar
                          </button>
                        </>
                      ) : (
                         <div className="flex gap-2">
                           {agenda.status !== 'cancelado' && (
                             <button 
                               onClick={() => handleUpdateStatus(agenda, 'cancelado')}
                               className="p-2 bg-white/5 text-ink-3 hover:text-red-500 rounded-xl transition-colors"
                             >
                               <X className="w-4 h-4" />
                             </button>
                           )}
                           {agenda.status === 'cancelado' && (
                              <button 
                                onClick={() => handleUpdateStatus(agenda, 'confirmado')}
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
              })
            ) : (
              <div className="py-20 text-center space-y-4 border-2 border-dashed border-white/5 rounded-[40px]">
                <CalendarIcon className="w-8 h-8 text-ink-3 mx-auto" />
                <p className="text-xs font-mono text-ink-3 uppercase tracking-widest">Nenhuma sessão encontrada.</p>
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR WIDGETS */}
        <div className="space-y-8">
          <div className="bg-surface-2 border border-white/5 rounded-[40px] p-8 space-y-6">
            <h4 className="text-sm font-display font-black text-ink uppercase italic tracking-widest">Próximas <span className="text-flame">Sessões</span></h4>
            
            <div className="space-y-4">
              {proximasSessoes.slice(0, 3).map(s => (
                <div key={s.id} className="flex items-start gap-4 p-4 bg-void border border-white/5 rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-flame/10 flex items-center justify-center text-flame shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-ink leading-tight">{s.aluno?.profile?.nome}</h5>
                    <p className="text-[10px] font-mono text-ink-3 uppercase tracking-widest mt-1">
                      {new Date(s.data).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} • {s.horario}
                    </p>
                  </div>
                </div>
              ))}
              {proximasSessoes.length === 0 && (
                <p className="text-[10px] font-mono text-ink-3 uppercase text-center py-4">Sem sessões agendadas</p>
              )}
            </div>
            
            <button 
              onClick={() => setModalAberto(true)} 
              className="w-full py-4 bg-white/5 text-ink-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Criar p/ Aluno
            </button>
          </div>

          <div className="bg-gradient-to-br from-violet to-indigo rounded-[40px] p-8 text-white space-y-4">
            <Info className="w-8 h-8 opacity-40" />
            <h4 className="text-xl font-display font-black uppercase italic tracking-tighter">Lembrete de <span className="text-ink">Gestão</span></h4>
            <p className="text-xs opacity-80 leading-relaxed uppercase font-mono tracking-widest">Mantenha sua agenda atualizada para que seus alunos vejam seus horários reais.</p>
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
