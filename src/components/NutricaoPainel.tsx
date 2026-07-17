import React, { useState, useEffect } from 'react';
import { 
  Utensils, Plus, Check, Loader2, Target, 
  Flame, Apple, Wheat, Droplets, Clock,
  ChevronRight, History, TrendingUp, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService } from '../lib/supabase';
import { PlanoAlimentar, RegistroNutricao } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import HidratacaoCard from './HidratacaoCard';
import { tocar } from '../lib/som';

interface NutricaoPainelProps {
  alunoId: string;
}

export default function NutricaoPainel({ alunoId }: NutricaoPainelProps) {
  const [loading, setLoading] = useState(true);
  const [plano, setPlano] = useState<PlanoAlimentar | null>(null);
  const [registros, setRegistros] = useState<RegistroNutricao[]>([]);
  const [historico, setHistorico] = useState<{ data: string; calorias: number }[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMeal, setNewMeal] = useState({ nome: '', calorias: '' });
  const [saving, setSaving] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadData();
  }, [alunoId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [planoRes, registrosRes, historicoRes] = await Promise.all([
        dbService.getPlanoAlimentarAtivo(alunoId),
        dbService.getRegistrosNutricao(alunoId, today),
        dbService.getHistoricoCalorias(alunoId)
      ]);
      setPlano(planoRes.data);
      setRegistros(registrosRes.data || []);
      setHistorico(historicoRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  const metaCalorias = plano ? Number(plano.meta_calorias) || 0 : 0;
  const consumidoCalorias = registros.reduce((acc, curr) => acc + (Number(curr.calorias) || 0), 0);
  const calPercent = metaCalorias > 0 ? Math.min(100, Math.round((consumidoCalorias / metaCalorias) * 100)) : 0;

  const pctCal = metaCalorias > 0 ? (consumidoCalorias / metaCalorias) : 0;

  const metaProteina = plano ? Number(plano.meta_proteina) || 0 : 0;
  const consumidoProteina = plano && metaCalorias > 0 ? Math.round(pctCal * metaProteina) : 0;
  const protPercent = metaProteina > 0 ? Math.min(100, Math.round((consumidoProteina / metaProteina) * 100)) : 0;

  const metaCarbo = plano ? Number(plano.meta_carboidrato ?? (plano as any).meta_carbo) || 0 : 0;
  const consumidoCarbo = plano && metaCalorias > 0 ? Math.round(pctCal * metaCarbo) : 0;
  const carboPercent = metaCarbo > 0 ? Math.min(100, Math.round((consumidoCarbo / metaCarbo) * 100)) : 0;

  const metaGordura = plano ? Number(plano.meta_gordura) || 0 : 0;
  const consumidoGordura = plano && metaCalorias > 0 ? Math.round(pctCal * metaGordura) : 0;
  const gorduraPercent = metaGordura > 0 ? Math.min(100, Math.round((consumidoGordura / metaGordura) * 100)) : 0;

  const handleAddMeal = async () => {
    if (!newMeal.nome || !newMeal.calorias) return;
    setSaving(true);
    try {
      tocar('sucesso');
      await dbService.saveRegistroNutricao({
        aluno_id: alunoId,
        nome: newMeal.nome,
        calorias: Number(newMeal.calorias),
        data: today
      });
      setShowAddModal(false);
      setNewMeal({ nome: '', calorias: '' });
      loadData();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 text-flame animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* RESUMO DO DIA */}
      <div className="bg-surface-2 border border-white/5 rounded-[40px] p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative background flare */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-flame/5 blur-[100px] pointer-events-none" />
        
        {!plano ? (
          <div className="relative z-10 flex flex-col items-center justify-center text-center py-6">
            <Utensils className="w-12 h-12 text-ink-3 mb-4 opacity-50 animate-pulse" />
            <h3 className="font-semibold text-lg text-ink mb-2">Sem plano ativo</h3>
            <p className="text-[14px] text-ink-3 max-w-md">
              Nenhum plano alimentar ativo. Seu personal ainda não prescreveu suas metas.
            </p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
            {/* Calorias Ring */}
            <div className="relative w-48 h-48 flex-shrink-0">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-white/5"
                />
                <motion.circle
                  cx="96"
                  cy="96"
                  r="88"
                  fill="none"
                  stroke="url(#flame-gradient)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray="552.92"
                  initial={{ strokeDashoffset: 552.92 }}
                  animate={{ strokeDashoffset: 552.92 - (552.92 * calPercent) / 100 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="flame-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F5334F" />
                    <stop offset="100%" stopColor="#F57633" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[28px] font-semibold text-ink num">
                  {consumidoCalorias}
                </span>
                <span className="text-[12px] text-ink-3 text-center px-4">
                  kcal consumidas
                </span>
                <div className="mt-2 text-[12px] text-flame font-semibold bg-flame/10 px-2 py-0.5 rounded-full border border-flame/20 num">
                  Meta: {metaCalorias}
                </div>
              </div>
            </div>

            {/* Macros Progress */}
            <div className="flex-1 w-full space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-semibold text-ink flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-violet" /> Proteína
                  </span>
                  <span className="text-[12px] text-ink-3 num">{consumidoProteina} / {metaProteina}g</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${protPercent}%` }}
                    className="h-full bg-violet rounded-full shadow-[0_0_10px_rgba(139,92,246,0.3)]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-semibold text-ink flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber" /> Carboidratos
                  </span>
                  <span className="text-[12px] text-ink-3 num">{consumidoCarbo} / {metaCarbo}g</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${carboPercent}%` }}
                    className="h-full bg-amber rounded-full shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-semibold text-ink flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500" /> Gorduras
                  </span>
                  <span className="text-[12px] text-ink-3 num">{consumidoGordura} / {metaGordura}g</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${gorduraPercent}%` }}
                    className="h-full bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.3)]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* HIDRATAÇÃO */}
      <HidratacaoCard alunoId={alunoId} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* PLANO ALIMENTAR */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-ink flex items-center gap-2">
              <Utensils className="w-5 h-5 text-flame" />
              Plano de hoje
            </h4>
          </div>

          <div className="space-y-4">
            {plano?.refeicoes?.map((ref) => (
              <div key={ref.id} className="bg-surface-2 border border-white/5 rounded-3xl p-5 hover:bg-surface-3 transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1">
                    <h5 className="font-semibold text-ink group-hover:text-flame transition-colors">{ref.nome}</h5>
                    <div className="flex items-center gap-2 text-ink-3">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-[12px] num">{ref.horario}</span>
                    </div>
                  </div>
                  <button className="p-2 bg-void/50 rounded-xl text-ink-3 hover:text-green-500 transition-colors">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-2">
                  {ref.alimentos?.map((ali) => (
                    <div key={ali.id} className="flex items-center justify-between py-2 border-t border-white/5">
                      <div className="space-y-0.5">
                        <p className="text-xs text-ink font-medium">{ali.nome}</p>
                        <p className="text-[10px] text-ink-3">{ali.quantidade}</p>
                      </div>
                      <div className="text-[12px] text-ink-2 num">
                        {ali.calorias} kcal
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {!plano && (
              <div className="p-12 text-center bg-surface-2 rounded-3xl border border-dashed border-white/5">
                <p className="text-sm text-ink-3">Nenhum plano alimentar ativo.</p>
              </div>
            )}
          </div>
        </div>

        {/* REGISTROS & HISTÓRICO */}
        <div className="space-y-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-ink flex items-center gap-2">
                <History className="w-5 h-5 text-flame" />
                Registros do dia
              </h4>
              <button
                onClick={() => {
                  setShowAddModal(true);
                  tocar('tap');
                }}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-ink hover:bg-white/10 transition-all flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" /> Registrar
              </button>
            </div>

            <div className="space-y-3">
              {registros.map((reg) => (
                <div key={reg.id} className="bg-surface-2 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs text-ink font-semibold">{reg.nome}</p>
                    <p className="text-[12px] text-ink-3 num">{new Date(reg.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="text-[14px] font-semibold text-flame num">
                    +{reg.calorias} kcal
                  </div>
                </div>
              ))}
              {registros.length === 0 && (
                <p className="text-xs text-ink-3 text-center py-8">Nenhum registro extra hoje.</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="font-display font-bold text-ink flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-flame" />
              Tendência Semanal
            </h4>
            <div className="h-48 bg-surface-2 border border-white/5 rounded-3xl p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historico}>
                  <defs>
                    <linearGradient id="colorCal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F5334F" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F5334F" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="data" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#666', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    tickFormatter={(val) => val.split('-')[2]}
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }}
                    itemStyle={{ color: '#F5334F', fontSize: '10px', fontFamily: 'JetBrains Mono' }}
                    labelStyle={{ display: 'none' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="calorias" 
                    stroke="#F5334F" 
                    fillOpacity={1} 
                    fill="url(#colorCal)" 
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ADD MEAL MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm bg-surface border border-white/10 rounded-[32px] p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg text-ink">Registrar refeição</h3>
                <button onClick={() => {
                  setShowAddModal(false);
                  tocar('tap');
                }} className="p-2 hover:bg-white/5 rounded-full text-ink-3">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-ink-3">O que você comeu?</label>
                  <input 
                    value={newMeal.nome}
                    onChange={(e) => setNewMeal(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Ex: Frango com Batata"
                    className="z-input !h-12"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-ink-3">Calorias estimadas</label>
                  <input 
                    type="number"
                    value={newMeal.calorias}
                    onChange={(e) => setNewMeal(prev => ({ ...prev, calorias: e.target.value }))}
                    placeholder="400"
                    className="z-input !h-12 num"
                  />
                </div>
              </div>

              <button
                onClick={handleAddMeal}
                disabled={saving || !newMeal.nome || !newMeal.calorias}
                className="w-full py-4 brand-gradient-bg rounded-2xl font-semibold text-void flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                <span>Salvar registro</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
