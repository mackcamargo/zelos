import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, BookOpen, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService } from '../lib/supabase';
import { Aluno, TipoSessao } from '../types';

interface CriarSessaoModalProps {
  aberto: boolean;
  onFechar: () => void;
  onCriado: () => void;
  personalId: string;
}

export default function CriarSessaoModal({ aberto, onFechar, onCriado, personalId }: CriarSessaoModalProps) {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loadingAlunos, setLoadingAlunos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    aluno_id: '',
    data: new Date().toISOString().split('T')[0],
    horario: '10:00',
    tipo: 'presencial' as TipoSessao,
    duracao_min: 60,
    observacao: ''
  });

  useEffect(() => {
    if (aberto) {
      carregarAlunos();
      // Reset state on open
      setFormData({
        aluno_id: '',
        data: new Date().toISOString().split('T')[0],
        horario: '10:00',
        tipo: 'presencial' as TipoSessao,
        duracao_min: 60,
        observacao: ''
      });
      setErro(null);
    }
  }, [aberto, personalId]);

  const carregarAlunos = async () => {
    setLoadingAlunos(true);
    try {
      const { data, error } = await dbService.getAlunos(personalId);
      if (error) {
        setErro('Erro ao carregar lista de alunos.');
      } else {
        setAlunos(data || []);
        if (data && data.length > 0) {
          setFormData(prev => ({ ...prev, aluno_id: data[0].id }));
        }
      }
    } catch (err) {
      setErro('Falha na comunicação com o banco.');
    } finally {
      setLoadingAlunos(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.aluno_id) {
      setErro('Selecione um aluno.');
      return;
    }

    setSaving(true);
    setErro(null);

    try {
      const { data, error } = await dbService.saveAgendamento({
        personal_id: personalId,
        aluno_id: formData.aluno_id,
        data: formData.data,
        horario: formData.horario,
        tipo: formData.tipo,
        duracao_min: Number(formData.duracao_min),
        status: 'confirmado', // Personal schedule is pre-confirmed
        observacao: formData.observacao || null
      });

      if (error) {
        setErro(error.message || 'Erro ao salvar o agendamento.');
      } else {
        onCriado();
        onFechar();
      }
    } catch (err: any) {
      setErro('Erro interno ao processar requisição.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* BACKDROP */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onFechar}
            className="absolute inset-0 bg-void/80 backdrop-blur-md"
          />

          {/* MODAL CONTENT */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-surface-2 border border-white/10 rounded-[40px] shadow-2xl p-8 overflow-hidden z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-display font-black text-ink uppercase italic tracking-tighter">
                  Agendar <span className="text-flame">Nova Sessão</span>
                </h3>
                <p className="text-[10px] font-mono text-ink-3 uppercase tracking-widest mt-1">
                  Criação direta na agenda do aluno
                </p>
              </div>
              <button
                onClick={onFechar}
                className="p-2 hover:bg-white/5 text-ink-3 hover:text-ink rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error message */}
            {erro && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-3 text-xs font-mono uppercase mb-6">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Aluno Selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-ink-3 uppercase tracking-widest block">
                  Selecione o Aluno
                </label>
                {loadingAlunos ? (
                  <div className="flex items-center gap-2 p-4 bg-void border border-white/5 rounded-2xl text-xs font-mono text-ink-3">
                    <Loader2 className="w-4 h-4 animate-spin text-flame" />
                    Carregando alunos...
                  </div>
                ) : alunos.length === 0 ? (
                  <div className="p-4 bg-void border border-white/5 rounded-2xl text-xs font-mono text-ink-3 text-center">
                    Nenhum aluno ativo vinculado.
                  </div>
                ) : (
                  <select
                    value={formData.aluno_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, aluno_id: e.target.value }))}
                    className="w-full bg-void border border-white/5 rounded-2xl p-4 text-ink outline-none focus:border-flame/50 transition-all text-sm appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='%238c8c8c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 16px center',
                      backgroundSize: '16px'
                    }}
                  >
                    {alunos.map(al => (
                      <option key={al.id} value={al.id} className="bg-surface-2 text-ink">
                        {al.profile?.nome || 'Sem Nome'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-ink-3 uppercase tracking-widest block">
                    Data
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none" />
                    <input
                      type="date"
                      required
                      value={formData.data}
                      onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
                      className="w-full bg-void border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-ink outline-none focus:border-flame/50 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-ink-3 uppercase tracking-widest block">
                    Horário
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none" />
                    <input
                      type="time"
                      required
                      value={formData.horario}
                      onChange={(e) => setFormData(prev => ({ ...prev, horario: e.target.value }))}
                      className="w-full bg-void border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-ink outline-none focus:border-flame/50 transition-all text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Type & Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-ink-3 uppercase tracking-widest block">
                    Tipo de Sessão
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value as TipoSessao }))}
                    className="w-full bg-void border border-white/5 rounded-2xl p-4 text-ink outline-none focus:border-flame/50 transition-all text-sm appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='%238c8c8c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 16px center',
                      backgroundSize: '16px'
                    }}
                  >
                    <option value="presencial" className="bg-surface-2">Presencial</option>
                    <option value="online" className="bg-surface-2">Online / Chamada</option>
                    <option value="avaliacao" className="bg-surface-2">Avaliação Física</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-ink-3 uppercase tracking-widest block">
                    Duração (min)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="240"
                    step="15"
                    required
                    value={formData.duracao_min}
                    onChange={(e) => setFormData(prev => ({ ...prev, duracao_min: Number(e.target.value) }))}
                    className="w-full bg-void border border-white/5 rounded-2xl p-4 text-ink outline-none focus:border-flame/50 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Observation */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-ink-3 uppercase tracking-widest block">
                  Observações / Notas
                </label>
                <textarea
                  value={formData.observacao}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
                  placeholder="Foco em pernas, trazer toalha, etc."
                  rows={3}
                  className="w-full bg-void border border-white/5 rounded-2xl p-4 text-ink outline-none focus:border-flame/50 transition-all text-sm resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={onFechar}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-ink-3 hover:text-ink rounded-2xl text-xs font-bold uppercase tracking-widest transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.aluno_id}
                  className="flex-1 py-4 bg-gradient-to-r from-flame to-amber hover:from-flame-hover hover:to-amber/90 text-void font-bold uppercase tracking-widest rounded-2xl text-xs transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Agendando...
                    </>
                  ) : (
                    'Agendar Sessão'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
