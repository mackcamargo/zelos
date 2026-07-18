import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Droplets, Plus, Settings, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip } from 'recharts';
import { dbService } from '../lib/supabase';
import { tocar } from '../lib/som';

interface HidratacaoCardProps {
  alunoId: string;
}

export default function HidratacaoCard({ alunoId }: HidratacaoCardProps) {
  const [consumido, setConsumido] = useState<number>(0);
  const [meta, setMeta] = useState<number>(2000);
  const [percent, setPercent] = useState<number>(0);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [celebrate, setCelebrate] = useState<boolean>(false);
  const [historico, setHistorico] = useState<{ data: string; total: number }[]>([]);

  useEffect(() => {
    if (alunoId) {
      loadData();
    }
  }, [alunoId]);

  const loadData = async () => {
    if (!alunoId) return;
    try {
      setLoading(true);
      const hoje = new Date().toISOString().split('T')[0];

      // 1. Get current meta
      const metaRes = await dbService.getMetaHidratacao(alunoId);
      const metaAtual = metaRes.data || 2000;
      setMeta(metaAtual);

      // 2. Get today's consumption
      const consumoRes = await dbService.getHidratacaoHoje(alunoId, hoje);
      const totalHoje = consumoRes.data?.ml || 0;
      setConsumido(totalHoje);

      const p = Math.min((totalHoje / metaAtual) * 100, 100);
      setPercent(p);

      // 3. Get history
      const histRes = await dbService.getHistoricoHidratacao(alunoId);
      const histRows = histRes.data || [];

      // Build 7 days array
      const array7Dias = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dataStr = d.toISOString().split('T')[0];
        const match = histRows.find((r: any) => r.data === dataStr);
        array7Dias.push({
          data: dataStr,
          total: match ? Number(match.ml || match.total || 0) : 0,
        });
      }
      setHistorico(array7Dias);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWater = async (ml: number) => {
    if (!alunoId) return;

    try {
      tocar('toggleOn');
      setSaving(true);
      const hoje = new Date().toISOString().split('T')[0];
      const novoConsumo = consumido + ml;

      // Save using dbService API
      await dbService.saveRegistroHidratacao({
        aluno_id: alunoId,
        data: hoje,
        ml: novoConsumo
      });

      setConsumido(novoConsumo);
      const p = Math.min((novoConsumo / meta) * 100, 100);
      setPercent(p);

      if (p >= 100 && percent < 100) {
        setCelebrate(true);
        tocar('celebracao');
        setTimeout(() => setCelebrate(false), 4000);
      }

      // Update chart locally
      setHistorico(prev =>
        prev.map(item =>
          item.data === hoje ? { ...item, total: item.total + ml } : item
        )
      );
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!alunoId) return;
    if (!confirm('Deseja zerar o consumo de água de hoje?')) return;

    try {
      setSaving(true);
      const hoje = new Date().toISOString().split('T')[0];

      await dbService.saveRegistroHidratacao({
        aluno_id: alunoId,
        data: hoje,
        ml: 0
      });

      setConsumido(0);
      setPercent(0);

      setHistorico(prev =>
        prev.map(item =>
          item.data === hoje ? { ...item, total: 0 } : item
        )
      );
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMeta = async () => {
    if (!alunoId) return;
    try {
      setSaving(true);
      await dbService.setMetaHidratacao(alunoId, meta);
      const p = Math.min((consumido / meta) * 100, 100);
      setPercent(p);
      setShowSettings(false);
      tocar('sucesso');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-surface border border-line rounded-xl p-8 flex justify-center items-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-surface border border-line rounded-3xl p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between group min-h-[300px]">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 border border-line rounded-xl">
              <Droplets className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-ink leading-tight">Hidratação</h3>
              <p className="text-[10px] text-ink-3 uppercase tracking-wider font-mono">Consumo diário</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 bg-bg hover:bg-raise border border-line rounded-lg text-ink-3 hover:text-accent transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {showSettings ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-[12px] text-ink-3">Meta diária (ml)</label>
                <input
                  type="number"
                  value={meta}
                  onChange={(e) => setMeta(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-void border border-line rounded-lg p-3 text-sm text-ink outline-none focus:border-accent/50"
                  step="250"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="flex-1 py-2.5 bg-bg hover:bg-raise border border-line rounded-lg text-xs font-semibold text-ink-2 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveMeta}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-accent text-white border border-line rounded-lg text-xs font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Salvar
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="main"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Progress Circle & Text */}
              <div className="flex items-center gap-6">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-line"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-accent transition-all duration-500 ease-out"
                      strokeDasharray={`${percent}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-ink num">{Math.round(percent)}%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-2xl font-bold text-ink num flex items-baseline gap-1">
                    {consumido} <span className="text-xs font-normal text-ink-3">/ {meta}ml</span>
                  </p>
                  <p className="text-[12px] text-ink-3">
                    {percent >= 100 ? 'Meta de água batida!' : 'Mantenha-se hidratado.'}
                  </p>
                </div>
              </div>

              {/* Water Adders */}
              <div className="flex flex-wrap gap-2">
                {[250, 500, 1000].map(ml => (
                  <button
                    key={ml}
                    type="button"
                    onClick={() => handleAddWater(ml)}
                    disabled={saving}
                    className="px-4 py-2 bg-bg border border-line hover:border-accent/30 rounded-lg text-xs font-semibold text-ink hover:text-accent transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> {ml}ml
                  </button>
                ))}
                {consumido > 0 && (
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={saving}
                    className="p-2 bg-bg border border-line hover:border-red-500/20 text-ink-3 hover:text-red-500 rounded-lg transition-all cursor-pointer"
                    title="Zerar hoje"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Celebration animation overlay inside the card */}
      <AnimatePresence>
        {celebrate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-void/60 z-20 flex flex-col items-center justify-center text-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-ink text-sm">Meta de hoje batida!</h4>
                <p className="text-[11px] text-ink-3 max-w-[180px]">Hidratação completa para suas articulações e foco.</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Histograma minimalista nos últimos 7 dias */}
      <div className="border-t border-line pt-4 mt-4">
        <p className="text-[10px] font-mono text-ink-3 uppercase tracking-widest mb-3">Histórico de 7 dias</p>
        <div className="h-16 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={historico} margin={{ top: 5, bottom: 0, left: 0, right: 0 }} barSize={14}>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const dataObj = payload[0].payload;
                    return (
                      <div className="bg-surface/90 backdrop-blur-md border border-line p-2 rounded-lg text-[10px] text-ink num">
                        {dataObj.total}ml
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="total" radius={4}>
                {historico.map((entry, index) => {
                  const isDone = entry.total >= meta;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={isDone ? 'var(--z-ok)' : 'var(--z-accent)'}
                      opacity={entry.total === 0 ? 0.05 : 0.6}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
