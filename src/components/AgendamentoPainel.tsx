import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Clock, MapPin, 
  Video, Plus, Loader2, ChevronRight, 
  AlertCircle, CheckCircle2, XCircle, Info, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService, supabase } from '../lib/supabase';
import { Agendamento, StatusAgendamento, TipoSessao } from '../types';

interface AgendamentoPainelProps {
  alunoId: string;
  personalId: string | null;
}

const parseDataHora = (dataHoraStr: string): Date => {
  if (!dataHoraStr) return new Date();
  let str = dataHoraStr;
  if (typeof str === 'string') {
    str = str.trim();
    if (!str.endsWith('Z') && !str.includes('+') && !/-\d{2}:\d{2}$/.test(str)) {
      if (str.includes('T') || str.includes(' ')) {
        str = str.replace(' ', 'T');
        if (!str.endsWith('Z')) {
          str += 'Z';
        }
      }
    }
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date(dataHoraStr) : d;
};

const STATUS_CONFIG: Record<StatusAgendamento, { label: string, color: string, icon: any }> = {
  solicitado: { label: 'Solicitado', color: 'text-amber bg-amber/10 border-amber/20', icon: AlertCircle },
  confirmado: { label: 'Confirmado', color: 'text-green-500 bg-green-500/10 border-green-500/20', icon: CheckCircle2 },
  cancelado: { label: 'Cancelado', color: 'text-ink-3 bg-white/5 border-white/10', icon: XCircle }
};

export default function AgendamentoPainel({ alunoId, personalId }: AgendamentoPainelProps) {
  const [loading, setLoading] = useState(true);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    horario: '10:00',
    tipo: 'presencial' as TipoSessao,
    observacao: ''
  });

  useEffect(() => {
    loadAgendamentos();
  }, [alunoId]);

  const loadAgendamentos = async () => {
    setLoading(true);
    try {
      const { data } = await dbService.getAgendamentosAluno(alunoId);
      setAgendamentos(data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleSolicitar = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSaving(true);
    try {
      if (!personalId) {
        setErrorMsg("Erro ao buscar seu treinador (Personal Trainer). Certifique-se de estar vinculado a um personal.");
        return;
      }

      // Constrói data_hora de forma robusta no fuso local antes de enviar
      const [year, month, day] = formData.data.split('-').map(Number);
      const [hour, minute] = formData.horario.split(':').map(Number);
      const localDate = new Date(year, month - 1, day, hour, minute);

      const { error } = await dbService.saveAgendamento({
        personal_id: personalId,
        aluno_id: alunoId,
        data_hora: localDate.toISOString(),
        duracao_min: 60,
        tipo: formData.tipo,
        status: "solicitado",
        observacao: formData.observacao?.trim() || null,
      });

      if (error) {
        setErrorMsg(error.message || "Erro ao salvar solicitação.");
      } else {
        setSuccessMsg("Solicitação enviada!");
        setShowModal(false);
        loadAgendamentos();
        // Reset form
        setFormData({
          data: new Date().toISOString().split('T')[0],
          horario: '10:00',
          tipo: 'presencial',
          observacao: ''
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Ocorreu um erro ao enviar a solicitação.");
    } finally {
      setSaving(false);
    }
  };

  const proximaSessao = agendamentos
    .filter(a => a.status === 'confirmado' && parseDataHora(a.data_hora) >= new Date())
    .sort((a, b) => parseDataHora(a.data_hora).getTime() - parseDataHora(b.data_hora).getTime())[0];

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-flame animate-spin" /></div>;
  }

  return (
    <div className="space-y-8 pb-24">
      {/* HEADER / NEXT SESSION */}
      {proximaSessao && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[40px] p-8 bg-gradient-to-br from-ember via-flame to-amber text-void shadow-2xl"
        >
          <div className="absolute top-0 right-0 p-8 opacity-20">
            <CalendarIcon className="w-32 h-32" />
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-2 px-3 py-1 bg-void/20 rounded-full w-fit">
              <Sparkles className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sua Próxima Sessão</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-4xl md:text-5xl font-display font-black tracking-tighter leading-none text-void">
                {parseDataHora(proximaSessao.data_hora).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>
              <div className="flex flex-wrap items-center gap-6 text-xl font-bold opacity-90 italic">
                <div className="flex items-center gap-2">
                  <Clock className="w-6 h-6" />
                  {parseDataHora(proximaSessao.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="flex items-center gap-2">
                  {proximaSessao.tipo === 'presencial' ? <MapPin className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                  {proximaSessao.tipo === 'presencial' ? 'Presencial' : 'Online'}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {successMsg && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-3xl text-xs font-mono uppercase flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ACTION BAR */}
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-display font-black text-ink uppercase italic tracking-tighter">Sua <span className="text-flame">Agenda</span></h3>
        <button 
          onClick={() => {
            setErrorMsg(null);
            setSuccessMsg(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-ink text-void rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Solicitar Sessão
        </button>
      </div>

      {/* AGENDAMENTOS LIST */}
      <div className="space-y-4">
        {agendamentos.length > 0 ? (
          agendamentos.map((agendamento, index) => {
            const config = STATUS_CONFIG[agendamento.status];
            const StatusIcon = config.icon;
            
            return (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                key={agendamento.id}
                className="group relative bg-surface-2 border border-white/5 rounded-3xl p-6 hover:bg-surface-3 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex items-center gap-6">
                  <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-bold ${
                    agendamento.status === 'confirmado' ? 'bg-flame text-void' : 'bg-white/5 text-ink-3'
                  }`}>
                    <span className="text-[10px] uppercase opacity-70">
                      {parseDataHora(agendamento.data_hora).toLocaleDateString('pt-BR', { month: 'short' })}
                    </span>
                    <span className="text-2xl leading-none">
                      {parseDataHora(agendamento.data_hora).getDate()}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-lg font-bold text-ink leading-none">
                        {parseDataHora(agendamento.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </h4>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest ${config.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-ink-3 font-mono uppercase tracking-widest">
                      <span className="flex items-center gap-1.5">
                        {agendamento.tipo === 'presencial' ? <MapPin className="w-3.5 h-3.5 text-flame" /> : <Video className="w-3.5 h-3.5 text-flame" />}
                        {agendamento.tipo}
                      </span>
                      {agendamento.observacao && (
                        <span className="flex items-center gap-1.5 italic text-[10px] opacity-60">
                           <Info className="w-3.5 h-3.5" /> {agendamento.observacao}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                   {agendamento.status === 'confirmado' && (
                     <div className="px-4 py-2 bg-green-500/5 text-green-500 rounded-xl text-[10px] font-bold uppercase tracking-widest">
                       Sessão Confirmada
                     </div>
                   )}
                   {agendamento.status === 'solicitado' && (
                     <div className="px-4 py-2 bg-amber/5 text-amber rounded-xl text-[10px] font-bold uppercase tracking-widest italic animate-pulse">
                       Aguardando Personal...
                     </div>
                   )}
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
              <CalendarIcon className="w-8 h-8 text-ink-3" />
            </div>
            <p className="text-sm font-mono text-ink-3 uppercase tracking-widest">Você ainda não tem sessões marcadas.</p>
          </div>
        )}
      </div>

      {/* MODAL SOLICITAR */}
      <AnimatePresence>
        {showModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-void/90 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-surface border border-white/10 rounded-[40px] w-full max-w-md overflow-hidden"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-2xl font-display font-black text-ink uppercase italic">Solicitar <span className="text-flame">Sessão</span></h3>
                <button onClick={() => setShowModal(false)} className="text-ink-3 hover:text-ink">
                   <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                {errorMsg && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs font-mono uppercase flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-ink-3 uppercase tracking-widest">Data</label>
                  <input 
                    type="date"
                    required
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    className="w-full bg-void border border-white/5 rounded-2xl p-4 text-ink outline-none focus:border-flame/50 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-ink-3 uppercase tracking-widest">Horário</label>
                  <input 
                    type="time"
                    required
                    value={formData.horario}
                    onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                    className="w-full bg-void border border-white/5 rounded-2xl p-4 text-ink outline-none focus:border-flame/50 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-ink-3 uppercase tracking-widest">Tipo de Sessão</label>
                  <div className="flex gap-2">
                    {(['presencial', 'online'] as TipoSessao[]).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormData({ ...formData, tipo: t })}
                        className={`flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 border transition-all ${
                          formData.tipo === t ? 'bg-flame border-flame text-void' : 'bg-void border-white/5 text-ink-3'
                        }`}
                      >
                        {t === 'presencial' ? <MapPin className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                        <span className="text-[10px] font-bold uppercase">{t}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-ink-3 uppercase tracking-widest">Observações (Opcional)</label>
                  <textarea 
                    value={formData.observacao}
                    onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                    placeholder="Ex: Focar em agachamentos..."
                    className="w-full bg-void border border-white/5 rounded-2xl p-4 text-ink outline-none focus:border-flame/50 transition-all resize-none h-24"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSolicitar}
                  disabled={saving}
                  className="w-full py-4 bg-ink text-void rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Confirmar Solicitação
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
