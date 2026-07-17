import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, Video, AlertCircle, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Agendamento, StatusAgendamento } from '../types';
import { dbService, supabase, isSupabaseConfigured } from '../lib/supabase';

interface DetalheSessaoModalProps {
  agendamento: Agendamento | null;
  onClose: () => void;
  isProfessor?: boolean;
  onCancelar?: () => void;
  onRemarcar?: () => void;
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
  cancelado: { label: 'Cancelado', color: 'text-red-500 bg-red-500/10 border-red-500/20', icon: XCircle },
};

const isUUID = (val: any): boolean => {
  if (typeof val !== 'string') return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val) || (val.length > 25 && (val.includes('-') || /^[0-9a-fA-F]+$/.test(val)));
};

export default function DetalheSessaoModal({ 
  agendamento, 
  onClose,
  isProfessor = false,
  onCancelar,
  onRemarcar
}: DetalheSessaoModalProps) {
  if (!agendamento) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [novaData, setNovaData] = useState('');
  const [novoHorario, setNovoHorario] = useState('');

  const config = STATUS_CONFIG[agendamento.status] || STATUS_CONFIG.solicitado;
  const StatusIcon = config.icon;
  const dataObj = parseDataHora(agendamento.data_hora);

  const displayDate = dataObj.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const displayTime = dataObj.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const displayObservacao = agendamento.observacao && !isUUID(agendamento.observacao)
    ? agendamento.observacao
    : null;

  const handleStartEditing = () => {
    const d = parseDataHora(agendamento.data_hora);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setNovaData(`${yyyy}-${mm}-${dd}`);
    setNovoHorario(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    setIsEditing(true);
  };

  const handleConfirmCancelar = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from("agendamentos").update({ status: "cancelado" }).eq("id", agendamento.id);
      } else {
        await dbService.updateStatusAgendamento(agendamento.id, 'cancelado');
      }
      if (onCancelar) onCancelar();
      onClose();
    } catch (err) {
      console.error('Erro ao cancelar agendamento:', err);
    } finally {
      setLoading(false);
      setConfirmCancel(false);
    }
  };

  const handleSaveRemarcar = async () => {
    if (!novaData || !novoHorario) return;
    setLoading(true);
    try {
      const novaDataHora = new Date(`${novaData}T${novoHorario}:00`).toISOString();
      if (isSupabaseConfigured && supabase) {
        await supabase.from("agendamentos").update({ data_hora: novaDataHora }).eq("id", agendamento.id);
      } else {
        await dbService.remarcarAgendamento(agendamento.id, novaDataHora);
      }
      if (onRemarcar) onRemarcar();
      onClose();
    } catch (err) {
      console.error('Erro ao remarcar agendamento:', err);
    } finally {
      setLoading(false);
      setIsEditing(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="z-overlay">
        {/* Overlay clickable bg */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Modal container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="z-modal relative w-full max-w-md bg-surface border border-line rounded-[32px] shadow-2xl overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-line">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-accent">DETALHES DA AGENDA</span>
              <h3 className="text-xl font-display font-black tracking-tight text-ink mt-0.5">Detalhes da Sessão</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-raise border border-line text-ink-3 hover:text-ink transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Status & Name */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-ink-3 uppercase tracking-wider">ALUNO(A)</span>
                <p className="text-lg font-bold text-ink">
                  {agendamento.aluno_nome && !isUUID(agendamento.aluno_nome) ? agendamento.aluno_nome : 'Aluno'}
                </p>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${config.color}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                <span>{config.label}</span>
              </div>
            </div>

            {/* Date and Time / Editing Inputs */}
            {isEditing ? (
              <div className="grid grid-cols-2 gap-4 p-4 bg-raise rounded-2xl border border-accent/30">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-accent uppercase tracking-wider block">NOVA DATA</label>
                  <input
                    type="date"
                    value={novaData}
                    onChange={(e) => setNovaData(e.target.value)}
                    className="w-full bg-bg border border-line rounded-xl px-3 py-2 text-ink text-xs font-mono focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-accent uppercase tracking-wider block">NOVO HORÁRIO</label>
                  <input
                    type="time"
                    value={novoHorario}
                    onChange={(e) => setNovoHorario(e.target.value)}
                    className="w-full bg-bg border border-line rounded-xl px-3 py-2 text-ink text-xs font-mono focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 p-4 bg-raise rounded-2xl border border-line">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-bg border border-line rounded-xl text-accent">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-ink-3 uppercase tracking-wider block">DATA</span>
                    <span className="text-sm font-semibold text-ink capitalize">{displayDate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-bg border border-line rounded-xl text-accent">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex-1 flex justify-between items-center">
                    <div>
                      <span className="text-[9px] font-bold text-ink-3 uppercase tracking-wider block">HORÁRIO</span>
                      <span className="text-sm font-semibold text-ink">{displayTime}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-ink-3 uppercase tracking-wider block">DURAÇÃO</span>
                      <span className="text-sm font-mono font-medium text-ink">{agendamento.duracao_min || 60} MIN</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Session Type */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-ink-3 uppercase tracking-wider">TIPO DE SESSÃO</span>
              <div className="flex items-center gap-2.5 p-3.5 bg-raise rounded-2xl border border-line text-ink">
                {agendamento.tipo === 'presencial' ? (
                  <>
                    <MapPin className="w-5 h-5 text-accent" />
                    <span className="text-sm font-semibold">Presencial</span>
                  </>
                ) : agendamento.tipo === 'online' ? (
                  <>
                    <Video className="w-5 h-5 text-accent" />
                    <span className="text-sm font-semibold">Online / Remoto</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5 text-accent" />
                    <span className="text-sm font-semibold">Avaliação física</span>
                  </>
                )}
              </div>
            </div>

            {/* Note / Observação */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-ink-3 uppercase tracking-wider">OBSERVAÇÕES DO AGENDAMENTO</span>
              <div className="p-4 bg-raise rounded-2xl border border-line min-h-[80px]">
                {displayObservacao ? (
                  <p className="text-sm text-ink-2 whitespace-pre-wrap">{displayObservacao}</p>
                ) : (
                  <div className="flex items-center gap-2 text-ink-3">
                    <FileText className="w-4 h-4" />
                    <span className="text-xs italic">Sem observações adicionais</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          {isEditing ? (
            <div className="p-6 border-t border-line bg-raise/20 flex justify-end gap-3">
              <button
                disabled={loading}
                onClick={() => setIsEditing(false)}
                className="px-5 py-2.5 rounded-full bg-bg hover:bg-line border border-line text-ink-2 hover:text-ink font-bold text-xs uppercase tracking-wider transition-all"
              >
                Cancelar
              </button>
              <button
                disabled={loading}
                onClick={handleSaveRemarcar}
                className="px-5 py-2.5 rounded-full bg-accent hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          ) : confirmCancel ? (
            <div className="p-6 border-t border-line bg-raise/20 flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Confirmar cancelamento?</span>
              <div className="flex gap-2">
                <button
                  disabled={loading}
                  onClick={() => setConfirmCancel(false)}
                  className="px-4 py-2 rounded-full bg-bg hover:bg-line border border-line text-ink-2 hover:text-ink font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Voltar
                </button>
                <button
                  disabled={loading}
                  onClick={handleConfirmCancelar}
                  className="px-4 py-2 rounded-full bg-red-500 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {loading ? 'Cancelando...' : 'Sim, Cancelar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 border-t border-line bg-raise/20 flex flex-wrap items-center justify-between gap-3">
              {isProfessor && agendamento.status !== 'cancelado' ? (
                <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-start flex-1">
                  <button
                    onClick={() => setConfirmCancel(true)}
                    className="px-4 py-2.5 rounded-full border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    Cancelar sessão
                  </button>
                  <button
                    onClick={handleStartEditing}
                    className="px-4 py-2.5 rounded-full bg-accent hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    Remarcar
                  </button>
                </div>
              ) : (
                <div className="flex-1" />
              )}
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-full bg-bg hover:bg-line border border-line text-ink font-bold text-xs uppercase tracking-wider transition-all w-full sm:w-auto text-center"
              >
                Fechar
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
