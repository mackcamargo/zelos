import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, Loader2, AlertCircle } from 'lucide-react';
import { dbService } from '../lib/supabase';

type TipoSessao = 'presencial' | 'online' | 'avaliacao';

interface CriarSessaoModalProps {
  aberto: boolean;
  onFechar: () => void;
  onCriado: () => void;
  personalId: string;
}

interface AlunoCombo {
  id: string;
  profile?: {
    nome: string;
  } | null;
  nome?: string;
}

export default function CriarSessaoModal({ aberto, onFechar, onCriado, personalId }: CriarSessaoModalProps) {
  const [alunos, setAlunos] = useState<AlunoCombo[]>([]);
  const [loadingAlunos, setLoadingAlunos] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    aluno_id: '',
    data: '',
    horario: '',
    tipo: 'presencial' as TipoSessao,
    duracao_min: 60,
    observacao: ''
  });

  useEffect(() => {
    if (aberto) {
      loadAlunos();
      // Initialize with today's date
      const hoje = new Date().toISOString().split('T')[0];
      setFormData({
        aluno_id: '',
        data: hoje,
        horario: '08:00',
        tipo: 'presencial',
        duracao_min: 60,
        observacao: ''
      });
      setErro(null);
    }
  }, [aberto]);

  const loadAlunos = async () => {
    try {
      setLoadingAlunos(true);
      const { data } = await dbService.getAlunos(personalId);
      const mapped: AlunoCombo[] = (data || []).map((aluno: any) => ({
        id: aluno.id,
        profile: aluno.profile,
        nome: aluno.profile?.nome || aluno.nome || 'Aluno Sem Nome'
      }));
      setAlunos(mapped);
      if (mapped.length > 0) {
        setFormData(prev => ({ ...prev, aluno_id: mapped[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAlunos(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!formData.aluno_id) {
      setErro('Por favor, selecione um aluno.');
      return;
    }

    try {
      setSaving(true);
      const dataHoraStr = `${formData.data}T${formData.horario}:00`;

      // Correção 1: Envia tipo 'avaliacao' direto ao banco sem concatenação
      const payload = {
        personal_id: personalId,
        aluno_id: formData.aluno_id,
        data_hora: dataHoraStr,
        tipo: formData.tipo,
        duracao_min: formData.duracao_min,
        observacao: formData.observacao ? formData.observacao.trim() : ''
      };

      const { error } = await dbService.saveAgendamento(payload);
      if (error) {
        throw error;
      }

      onCriado();
      onFechar();
    } catch (err: any) {
      console.error(err);
      setErro(err?.message || 'Falha ao agendar a sessão no banco de dados.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {aberto && (
        <div className="z-overlay">
          {/* BACKGROUND CLICK TO CLOSE */}
          <div className="absolute inset-0" onClick={onFechar} />

          {/* MODAL CONTENT */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="z-modal relative p-8 z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-semibold text-ink">
                  Agendar nova sessão
                </h3>
                <p className="text-[12px] text-ink-3 mt-1">
                  Criação direta na agenda do aluno
                </p>
              </div>
              <button
                type="button"
                onClick={onFechar}
                className="p-2 bg-bg hover:bg-raise border border-line text-ink-3 hover:text-ink rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error message */}
            {erro && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg flex items-center gap-3 text-xs mb-6">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Aluno Selection */}
              <div className="space-y-2">
                <label className="text-[12px] font-medium text-ink-3 block">
                  Selecione o Aluno
                </label>
                {loadingAlunos ? (
                  <div className="flex items-center gap-2 p-4 bg-bg border border-line rounded-lg text-xs text-ink-3">
                    <Loader2 className="w-4 h-4 animate-spin text-accent" />
                    Carregando alunos...
                  </div>
                ) : alunos.length === 0 ? (
                  <div className="p-4 bg-bg border border-line rounded-lg text-xs text-ink-3 text-center">
                    Nenhum aluno ativo vinculado.
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={formData.aluno_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, aluno_id: e.target.value }))}
                      className="z-input !h-14 !pr-10 appearance-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='%238c8c8c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 16px center',
                        backgroundSize: '16px'
                      }}
                    >
                      {alunos.map(al => (
                        <option key={al.id} value={al.id} className="bg-surface text-ink">
                          {al.profile?.nome || al.nome || 'Sem Nome'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[12px] font-medium text-ink-3 block">
                    Data
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none" />
                    <input
                      type="date"
                      required
                      value={formData.data}
                      onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
                      className="z-input !h-14 !pl-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-medium text-ink-3 block">
                    Horário
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none" />
                    <input
                      type="time"
                      required
                      value={formData.horario}
                      onChange={(e) => setFormData(prev => ({ ...prev, horario: e.target.value }))}
                      className="z-input !h-14 !pl-12"
                    />
                  </div>
                </div>
              </div>

              {/* Type & Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[12px] font-medium text-ink-3 block">
                    Tipo de Sessão
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value as TipoSessao }))}
                    className="z-input !h-14 !pr-10 appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='%238c8c8c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 16px center',
                      backgroundSize: '16px'
                    }}
                  >
                    <option value="presencial" className="bg-surface text-ink">Presencial</option>
                    <option value="online" className="bg-surface text-ink">Online / Chamada</option>
                    <option value="avaliacao" className="bg-surface text-ink">Avaliação Física</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-medium text-ink-3 block">
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
                    className="z-input !h-14"
                  />
                </div>
              </div>

              {/* Observation */}
              <div className="space-y-2">
                <label className="text-[12px] font-medium text-ink-3 block">
                  Observações / Notas
                </label>
                <textarea
                  value={formData.observacao}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
                  placeholder="Foco em pernas, trazer toalha, etc."
                  rows={3}
                  className="z-input h-auto py-4 min-h-[100px] resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={onFechar}
                  className="flex-1 py-4 bg-bg hover:bg-raise border border-line text-ink-2 hover:text-ink rounded-lg text-xs font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.aluno_id}
                  className="flex-1 py-4 bg-accent hover:opacity-90 text-white font-semibold rounded-lg text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-line"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
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
