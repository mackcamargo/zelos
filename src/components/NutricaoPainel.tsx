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
  const [saving, setSaving] = useState(false);

  // States for search & autocomplete & calculations
  const [refeicao, setRefeicao] = useState('Café da manhã');
  const [buscaTermo, setBuscaTermo] = useState('');
  const [alimentosEncontrados, setAlimentosEncontrados] = useState<any[]>([]);
  const [alimentoSelecionado, setAlimentoSelecionado] = useState<any | null>(null);
  const [quantidadeG, setQuantidadeG] = useState<number>(100);
  const [loadingBusca, setLoadingBusca] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadData();
  }, [alunoId]);

  useEffect(() => {
    if (buscaTermo.trim().length < 2) {
      setAlimentosEncontrados([]);
      return;
    }
    
    setLoadingBusca(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await dbService.buscarAlimentos(buscaTermo);
        setAlimentosEncontrados(res.data || []);
      } catch (err) {
        console.error("Erro ao buscar alimentos:", err);
      } finally {
        setLoadingBusca(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [buscaTermo]);

  const resetForm = () => {
    setRefeicao('Café da manhã');
    setBuscaTermo('');
    setAlimentoSelecionado(null);
    setQuantidadeG(100);
    setAlimentosEncontrados([]);
  };

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
      
      // Group historico by date
      const groupedMap: { [key: string]: number } = {};
      (historicoRes.data || []).forEach((row: any) => {
        const d = row.data;
        groupedMap[d] = (groupedMap[d] || 0) + (Number(row.calorias) || 0);
      });
      const sortedHistory = Object.keys(groupedMap).map(d => ({
        data: d,
        calorias: groupedMap[d]
      })).sort((a, b) => a.data.localeCompare(b.data));
      setHistorico(sortedHistory);
    } finally {
      setLoading(false);
    }
  };

  const round = (val: number, decimals: number = 0) => {
    const p = Math.pow(10, decimals);
    return Math.round((val || 0) * p) / p;
  };

  const metaCalorias = plano ? Number(plano.meta_calorias) || 0 : 0;
  const consumidoCalorias = registros.reduce((acc, curr) => acc + (Number(curr.calorias) || 0), 0);
  const calPercent = metaCalorias > 0 ? Math.min(100, Math.round((consumidoCalorias / metaCalorias) * 100)) : 0;

  const consumidoProteina = round(registros.reduce((acc, curr) => acc + (Number(curr.proteina) || 0), 0), 1);
  const metaProteina = plano ? Number(plano.meta_proteina) || 0 : 0;
  const protPercent = metaProteina > 0 ? Math.min(100, Math.round((consumidoProteina / metaProteina) * 100)) : 0;

  const consumidoCarbo = round(registros.reduce((acc, curr) => acc + (Number(curr.carbo) || 0), 0), 1);
  const metaCarbo = plano ? Number(plano.meta_carboidrato ?? (plano as any).meta_carbo) || 0 : 0;
  const carboPercent = metaCarbo > 0 ? Math.min(100, Math.round((consumidoCarbo / metaCarbo) * 100)) : 0;

  const consumidoGordura = round(registros.reduce((acc, curr) => acc + (Number(curr.gordura) || 0), 0), 1);
  const metaGordura = plano ? Number(plano.meta_gordura) || 0 : 0;
  const gorduraPercent = metaGordura > 0 ? Math.min(100, Math.round((consumidoGordura / metaGordura) * 100)) : 0;

  const handleAddMeal = async () => {
    if (!alimentoSelecionado || !refeicao) return;
    setSaving(true);
    try {
      tocar('sucesso');
      
      const kcal100g = Number(alimentoSelecionado.kcal_100g) || 0;
      const prot100g = Number(alimentoSelecionado.proteina_100g) || 0;
      const carbo100g = Number(alimentoSelecionado.carbo_100g) || 0;
      const gord100g = Number(alimentoSelecionado.gordura_100g) || 0;

      const fator = quantidadeG / 100;
      const calorias = Math.round(kcal100g * fator);
      const proteina = round(prot100g * fator, 1);
      const carbo = round(carbo100g * fator, 1);
      const gordura = round(gord100g * fator, 1);

      await dbService.saveRegistroNutricao({
        aluno_id: alunoId,
        refeicao: refeicao,
        alimento: alimentoSelecionado.nome,
        alimento_id: alimentoSelecionado.id,
        quantidade_g: quantidadeG,
        calorias: calorias,
        proteina: proteina,
        carbo: carbo,
        gordura: gordura,
        data: today
      });
      setShowAddModal(false);
      resetForm();
      loadData();
    } catch (err) {
      console.error("Erro ao salvar registro de refeição:", err);
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
      <div className="bg-surface border border-line rounded-3xl p-4 sm:p-6 shadow-sm relative overflow-hidden">
        {/* Decorative background flare */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-flame/5 blur-[100px] pointer-events-none" />
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-flame animate-spin" />
          </div>
        ) : !plano ? (
          <div className="relative z-10 flex flex-col items-center justify-center text-center py-6">
            <Utensils className="w-10 h-10 text-ink-3 mb-4 opacity-50 animate-pulse" />
            <h3 className="font-semibold text-base text-ink mb-2">Sem plano ativo</h3>
            <p className="text-[12px] text-ink-3 max-w-xs">
              Seu personal ainda não prescreveu suas metas nutricionais.
            </p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            {/* Calorias Ring */}
            <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 192 192">
                <circle
                  cx="96"
                  cy="96"
                  r="84"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-line"
                />
                <motion.circle
                  cx="96"
                  cy="96"
                  r="84"
                  fill="none"
                  stroke="url(#flame-gradient)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray="527.78"
                  initial={{ strokeDashoffset: 527.78 }}
                  animate={{ strokeDashoffset: 527.78 - (527.78 * calPercent) / 100 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="flame-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--z-accent)" />
                    <stop offset="100%" stopColor="var(--z-accent-hi)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl sm:text-2xl font-bold text-ink num leading-none">
                  {consumidoCalorias}
                </span>
                <span className="text-[9px] sm:text-[10px] text-ink-3 text-center px-4 uppercase tracking-wider font-mono">
                  kcal
                </span>
                <div className="mt-1 text-[9px] sm:text-[10px] text-flame font-bold bg-flame/10 px-2 py-0.5 rounded-full border border-flame/20 num">
                  Meta: {metaCalorias}
                </div>
              </div>
            </div>

            {/* Macros Progress */}
            <div className="flex-1 w-full space-y-3">
              {/* Proteína */}
              <div className="bg-surface border border-line rounded-2xl p-3 shadow-[var(--z-shadow-1)] space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-ink flex items-center gap-1.5 uppercase tracking-tight">
                    <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_6px_rgba(139,92,246,0.4)]" /> Proteína
                  </span>
                  <span className="text-[11px] text-ink-2 font-mono font-bold">{consumidoProteina} <span className="text-ink-3 font-normal">/ {metaProteina}g</span></span>
                </div>
                <div className="h-2 bg-raise rounded-full overflow-hidden border border-line">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${protPercent}%` }}
                    className="h-full bg-violet-500 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.3)]"
                  />
                </div>
              </div>

              {/* Carboidratos */}
              <div className="bg-surface border border-line rounded-2xl p-3 shadow-[var(--z-shadow-1)] space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-ink flex items-center gap-1.5 uppercase tracking-tight">
                    <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]" /> Carboidratos
                  </span>
                  <span className="text-[11px] text-ink-2 font-mono font-bold">{consumidoCarbo} <span className="text-ink-3 font-normal">/ {metaCarbo}g</span></span>
                </div>
                <div className="h-2 bg-raise rounded-full overflow-hidden border border-line">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${carboPercent}%` }}
                    className="h-full bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                  />
                </div>
              </div>

              {/* Gorduras */}
              <div className="bg-surface border border-line rounded-2xl p-3 shadow-[var(--z-shadow-1)] space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-ink flex items-center gap-1.5 uppercase tracking-tight">
                    <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.4)]" /> Gorduras
                  </span>
                  <span className="text-[11px] text-ink-2 font-mono font-bold">{consumidoGordura} <span className="text-ink-3 font-normal">/ {metaGordura}g</span></span>
                </div>
                <div className="h-2 bg-raise rounded-full overflow-hidden border border-line">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${gorduraPercent}%` }}
                    className="h-full bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.3)]"
                  />
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div>

      {/* HIDRATAÇÃO */}
      <HidratacaoCard alunoId={alunoId} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PLANO ALIMENTAR */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-ink flex items-center gap-2">
              <Utensils className="w-5 h-5 text-flame" />
              Plano de hoje
            </h4>
          </div>

          <div className="space-y-3">
            {plano && plano.refeicoes && plano.refeicoes.length > 0 ? (
              plano.refeicoes.map((ref) => (
                <div key={ref.id} className="bg-surface border border-line rounded-2xl p-4 hover:bg-raise transition-all group shadow-[var(--z-shadow-1)]">
                  <div className="flex items-start justify-between mb-3">
                    <div className="space-y-0.5">
                      <h5 className="font-semibold text-sm text-ink group-hover:text-flame transition-colors">{ref.nome}</h5>
                      <div className="flex items-center gap-1.5 text-ink-3">
                        <Clock className="w-3 h-3" />
                        <span className="text-[11px] num">{ref.horario}</span>
                      </div>
                    </div>
                    <button className="p-1.5 bg-raise border border-line rounded-lg text-ink-3 hover:text-ok transition-colors">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="space-y-1.5">
                    {ref.alimentos?.map((ali) => (
                      <div key={ali.id} className="flex items-center justify-between py-1.5 border-t border-line/50">
                        <div className="space-y-0.5">
                          <p className="text-[11px] text-ink font-medium">{ali.nome}</p>
                          <p className="text-[9px] text-ink-3 uppercase tracking-tight">{ali.quantidade}</p>
                        </div>
                        <div className="text-[11px] text-ink-2 num">
                          {ali.calorias} kcal
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center bg-surface rounded-2xl border border-dashed border-line shadow-[var(--z-shadow-1)]">
                <p className="text-xs text-ink-3">Nenhum plano alimentar cadastrado para hoje.</p>
              </div>
            )}
          </div>
        </div>

        {/* REGISTROS & HISTÓRICO */}
        <div className="space-y-6">
          <div className="space-y-4">
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
                className="px-4 py-2 bg-flame text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer border border-white/10 shadow-lg shadow-flame/10"
              >
                <Plus className="w-3.5 h-3.5" /> Registrar
              </button>
            </div>

            <div className="space-y-3">
              {registros.length === 0 ? (
                <div className="p-8 text-center bg-surface rounded-2xl border border-dashed border-line shadow-[var(--z-shadow-1)]">
                  <p className="text-xs text-ink-3">Nenhum registro extra hoje.</p>
                </div>
              ) : (
                registros.map((reg) => (
                  <div key={reg.id} className="bg-surface border border-line rounded-2xl p-4 flex flex-col gap-2 shadow-[var(--z-shadow-1)] hover:bg-raise/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-[9px] font-bold text-flame bg-flame/10 px-2 py-0.5 rounded-full border border-flame/15 inline-block">
                          {reg.refeicao || 'Refeição'}
                        </span>
                        <p className="text-xs text-ink font-semibold mt-1 truncate">{reg.alimento || reg.nome}</p>
                        {reg.quantidade_g !== undefined && reg.quantidade_g !== null && (
                          <p className="text-[11px] text-ink-3 font-medium">Quantidade: {reg.quantidade_g}g</p>
                        )}
                        <p className="text-[10px] text-ink-3 font-mono">{new Date(reg.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="text-[14px] font-semibold text-flame num shrink-0">
                        +{reg.calorias} kcal
                      </div>
                    </div>
                    {(reg.proteina !== undefined || reg.carbo !== undefined || reg.gordura !== undefined) && (
                      <div className="flex items-center gap-3 pt-2 border-t border-line/40 text-[10px] font-mono text-ink-3">
                        <span>P: <strong className="text-ink-2 font-semibold">{reg.proteina ?? 0}g</strong></span>
                        <span>C: <strong className="text-ink-2 font-semibold">{reg.carbo ?? 0}g</strong></span>
                        <span>G: <strong className="text-ink-2 font-semibold">{reg.gordura ?? 0}g</strong></span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="font-display font-bold text-ink flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-flame" />
              Tendência Semanal
            </h4>
            <div className="h-48 bg-surface border border-line rounded-3xl p-4">
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
                    tick={{ fill: 'var(--z-text-3)', fontSize: 10, fontFamily: 'Archivo' }}
                    tickFormatter={(val) => val.split('-')[2]}
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--z-surface-raise)', border: '1px solid var(--z-line-strong)', borderRadius: '12px' }}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm bg-surface border border-line rounded-[32px] p-6 shadow-2xl space-y-6 relative"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg text-ink">Registrar refeição</h3>
                <button onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                  tocar('tap');
                }} className="p-2 hover:bg-raise rounded-full text-ink-3">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* REFEIÇÃO FIELD */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-ink-3">Refeição</label>
                  <select
                    value={refeicao}
                    onChange={(e) => setRefeicao(e.target.value)}
                    className="z-input !h-12 w-full bg-raise text-ink border border-line rounded-xl px-3 outline-none focus:border-flame cursor-pointer text-xs"
                  >
                    <option value="Café da manhã">Café da manhã</option>
                    <option value="Almoço">Almoço</option>
                    <option value="Café da tarde">Café da tarde</option>
                    <option value="Jantar">Jantar</option>
                    <option value="Lanche">Lanche</option>
                    <option value="Pré-treino">Pré-treino</option>
                    <option value="Pós-treino">Pós-treino</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                {/* ALIMENTO FIELD (BUSCA/AUTOCOMPLETE) */}
                <div className="space-y-1.5 relative">
                  <label className="text-[12px] font-medium text-ink-3">Alimento</label>
                  {alimentoSelecionado ? (
                    <div className="flex items-center justify-between bg-raise border border-line rounded-xl px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-ink truncate">{alimentoSelecionado.nome}</p>
                        <p className="text-[10px] text-ink-3 font-mono">{alimentoSelecionado.kcal_100g} kcal / 100g</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAlimentoSelecionado(null);
                          setBuscaTermo("");
                        }}
                        className="ml-2 text-ink-3 hover:text-flame p-1 rounded-md hover:bg-line/40"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <input 
                          value={buscaTermo}
                          onChange={(e) => setBuscaTermo(e.target.value)}
                          placeholder="Digite o nome do alimento..."
                          className="z-input !h-12 w-full pr-10 text-xs"
                        />
                        {loadingBusca && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-4 h-4 text-flame animate-spin" />
                          </div>
                        )}
                      </div>
                      
                      {alimentosEncontrados.length > 0 && (
                        <div className="absolute z-[60] left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-surface border border-line rounded-xl shadow-xl divide-y divide-line/40">
                          {alimentosEncontrados.map((ali) => (
                            <button
                              key={ali.id}
                              type="button"
                              onClick={() => {
                                setAlimentoSelecionado(ali);
                                setAlimentosEncontrados([]);
                                setBuscaTermo("");
                                tocar('tap');
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-raise text-xs transition-colors flex flex-col gap-0.5 cursor-pointer"
                            >
                              <span className="font-medium text-ink">{ali.nome}</span>
                              <span className="text-[10px] text-ink-3 font-mono">
                                {ali.kcal_100g} kcal · P: {ali.proteina_100g || 0}g · C: {ali.carbo_100g || 0}g · G: {ali.gordura_100g || 0}g
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* QUANTIDADE FIELD */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-ink-3">Quantidade (g)</label>
                  <input 
                    type="number"
                    value={quantidadeG === 0 ? "" : quantidadeG}
                    onChange={(e) => setQuantidadeG(Math.max(0, Number(e.target.value) || 0))}
                    className="z-input !h-12 w-full num text-xs"
                    placeholder="100"
                  />
                </div>

                {/* REAL-TIME PREVIEW CARD */}
                {alimentoSelecionado && (
                  <div className="bg-raise/50 border border-line rounded-2xl p-4 space-y-2.5">
                    <p className="text-[10px] font-bold text-ink uppercase tracking-wider text-center">Valores Nutricionais Calculados</p>
                    <div className="text-center py-1">
                      <span className="text-2xl font-black text-flame num">{Math.round((Number(alimentoSelecionado.kcal_100g) || 0) * (quantidadeG / 100))}</span>
                      <span className="text-xs text-ink-3 font-bold ml-1">kcal</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono border-t border-line/40 pt-2.5 text-ink-2">
                      <div>
                        <p className="text-ink-3 uppercase text-[9px] tracking-tight">Proteína</p>
                        <p className="font-bold text-ink">{round((Number(alimentoSelecionado.proteina_100g) || 0) * (quantidadeG / 100), 1)}g</p>
                      </div>
                      <div>
                        <p className="text-ink-3 uppercase text-[9px] tracking-tight">Carbo</p>
                        <p className="font-bold text-ink">{round((Number(alimentoSelecionado.carbo_100g) || 0) * (quantidadeG / 100), 1)}g</p>
                      </div>
                      <div>
                        <p className="text-ink-3 uppercase text-[9px] tracking-tight">Gordura</p>
                        <p className="font-bold text-ink">{round((Number(alimentoSelecionado.gordura_100g) || 0) * (quantidadeG / 100), 1)}g</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleAddMeal}
                disabled={saving || !alimentoSelecionado || quantidadeG <= 0}
                className="w-full py-4 brand-gradient-bg rounded-2xl font-semibold text-void flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
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
