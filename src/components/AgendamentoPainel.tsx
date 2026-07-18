import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Clock, MapPin, 
  Video, Plus, Loader2, ChevronRight, 
  AlertCircle, CheckCircle2, XCircle, Info, Sparkles, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService, supabase } from '../lib/supabase';
import { Agendamento, StatusAgendamento, TipoSessao } from '../types';
import DetalheSessaoModal from './DetalheSessaoModal';

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
  solicitado: { label: 'Solicitado', color: 'text-warn bg-warn/10 border-warn/20', icon: AlertCircle },
  confirmado: { label: 'Confirmado', color: 'text-ok bg-ok/10 border-ok/20', icon: CheckCircle2 },
  cancelado: { label: 'Cancelado', color: 'text-ink-3 bg-raise/5 border-line', icon: XCircle }
};

export default function AgendamentoPainel({ alunoId, personalId }: AgendamentoPainelProps) {
  const [loading, setLoading] = useState(true);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);
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
        console.error('Erro ao salvar solicitação de agendamento:', error);
        setErrorMsg(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`);
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
          className="relative overflow-hidden z-card !p-6 sm:!p-8"
        >
          <div className="absolute top-2 right-2 opacity-[0.08] text-accent rotate-12 pointer-events-none">
            <CalendarIcon className="w-24 h-24 sm:w-32 sm:h-32" />
          </div>
          
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2 px-2.5 py-1 bg-accent/10 text-accent border border-accent/20 rounded-full w-fit">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Próxima sessão</span>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl sm:text-[28px] font-semibold tracking-tight leading-tight text-ink">
                {parseDataHora(proximaSessao.data_hora).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-base sm:text-[20px] font-semibold text-ink-2">
                <div className="flex items-center gap-1.5 num">
                  <Clock className="w-5 h-5 text-accent" />
                  {parseDataHora(proximaSessao.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="flex items-center gap-1.5">
                  {proximaSessao.tipo === 'presencial' ? (
                    <>
                      <MapPin className="w-5 h-5 text-accent" />
                      <span>Presencial</span>
                    </>
                  ) : proximaSessao.tipo === 'online' ? (
                    <>
                      <Video className="w-5 h-5 text-accent" />
                      <span>Online</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5 text-accent" />
                      <span>Avaliação</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {successMsg && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-3xl text-[12px] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ACTION BAR */}
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xl sm:text-[28px] font-semibold text-ink leading-tight">Sua <span className="text-accent">agenda</span></h3>
        <button 
          onClick={() => {
            setErrorMsg(null);
            setSuccessMsg(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 bg-accent text-white rounded-xl sm:rounded-2xl font-bold text-[10px] sm:text-xs shadow-lg hover:scale-105 active:scale-95 transition-all uppercase tracking-widest border border-line-strong/20 shrink-0"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Solicitar sessão
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
                onClick={() => setSelectedAgendamento(agendamento)}
                className="z-card z-card--tap !p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-semibold shrink-0 ${
                    agendamento.status === 'confirmado' ? 'bg-accent text-white shadow-sm shadow-accent/20' : 'bg-raise text-ink-3 border border-line'
                  }`}>
                    <span className="text-[9px] uppercase tracking-tighter opacity-80 leading-none mb-0.5">
                      {parseDataHora(agendamento.data_hora).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                    </span>
                    <span className="text-xl leading-none num font-bold">
                      {parseDataHora(agendamento.data_hora).getDate()}
                    </span>
                  </div>
                  
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-ink leading-none num">
                        {parseDataHora(agendamento.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </h4>
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${config.color}`}>
                        <StatusIcon className="w-2.5 h-2.5" />
                        {config.label}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-ink-3">
                      <span className="flex items-center gap-1">
                        {agendamento.tipo === 'presencial' ? (
                          <>
                            <MapPin className="w-3 h-3 text-accent" />
                            <span>Presencial</span>
                          </>
                        ) : agendamento.tipo === 'online' ? (
                          <>
                            <Video className="w-3 h-3 text-accent" />
                            <span>Online</span>
                          </>
                        ) : (
                          <>
                            <FileText className="w-3 h-3 text-accent" />
                            <span>Avaliação</span>
                          </>
                        )}
                      </span>
                      {agendamento.observacao && (
                        <span className="flex items-center gap-1.5 italic text-[12px] opacity-60">
                           <Info className="w-3.5 h-3.5" /> {agendamento.observacao}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                   {agendamento.status === 'confirmado' && (
                     <div className="px-4 py-2 bg-ok/5 text-ok border border-ok/10 rounded-xl text-[12px] font-semibold">
                       Sessão confirmada
                     </div>
                   )}
                   {agendamento.status === 'solicitado' && (
                     <div className="px-4 py-2 bg-warn/5 text-warn border border-warn/10 rounded-xl text-[12px] font-semibold italic animate-pulse">
                       Aguardando personal...
                     </div>
                   )}
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-raise border border-line rounded-full flex items-center justify-center mx-auto">
              <CalendarIcon className="w-8 h-8 text-ink-3" />
            </div>
            <p className="text-[14px] text-ink-3">Você ainda não tem sessões marcadas.</p>
          </div>
        )}
      </div>

      {/* MODAL SOLICITAR */}
      <AnimatePresence>
        {showModal && (
          <div className="z-overlay">
            {/* Click outside to close */}
            <div className="absolute inset-0" onClick={() => setShowModal(false)} />

            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="z-modal relative p-0 overflow-hidden z-10 border border-line"
            >
              <div className="p-8 border-b border-line flex items-center justify-between">
                <h3 className="text-[24px] font-semibold text-ink">Solicitar <span className="text-accent">sessão</span></h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-raise border border-line rounded-full text-ink-3 hover:text-ink transition-colors">
                   <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                {errorMsg && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-[12px] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[12px] text-ink-3">Data</label>
                  <input 
                    type="date"
                    required
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    className="z-input !h-14 num"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] text-ink-3">Horário</label>
                  <input 
                    type="time"
                    required
                    value={formData.horario}
                    onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                    className="z-input !h-14 num"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] text-ink-3">Tipo de sessão</label>
                  <div className="flex gap-2">
                    {(['presencial', 'online', 'avaliacao'] as TipoSessao[]).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormData({ ...formData, tipo: t })}
                        className={`flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 border transition-all ${
                          formData.tipo === t ? 'bg-accent border-line text-white font-bold' : 'bg-void border-line text-ink-3 hover:text-ink'
                        }`}
                      >
                        {t === 'presencial' ? (
                          <MapPin className="w-4 h-4" />
                        ) : t === 'online' ? (
                          <Video className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                        <span className="text-xs font-semibold">
                          {t === 'avaliacao' ? 'Avaliação' : t.charAt(0).toUpperCase() + t.slice(1)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] text-ink-3">Observações (opcional)</label>
                  <textarea 
                    value={formData.observacao}
                    onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                    placeholder="Ex: Focar em agachamentos..."
                    className="z-input h-auto py-4 min-h-[100px] resize-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSolicitar}
                  disabled={saving}
                  className="w-full py-4 bg-accent hover:opacity-90 text-white rounded-2xl font-semibold text-xs shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 border border-line"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Confirmar solicitação
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <DetalheSessaoModal
        agendamento={selectedAgendamento}
        onClose={() => setSelectedAgendamento(null)}
        isProfessor={false}
        onCancelar={loadAgendamentos}
        onRemarcar={loadAgendamentos}
      />
    </div>
  );
}
