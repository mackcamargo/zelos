import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Save, Loader2, Utensils, 
  Clock, Flame, Apple, Wheat, Droplets, ChevronDown, ChevronUp, Target,
  Search, Scale, Check, X, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { dbService } from '../lib/supabase';
import { PlanoAlimentar, RefeicaoPlano, AlimentoRefeicao } from '../types';
import { tocar } from '../lib/som';

interface GerenciarNutricaoProps {
  alunoId: string;
  personalId: string;
  isReadOnly?: boolean;
}

export default function GerenciarNutricao({ alunoId, personalId, isReadOnly = false }: GerenciarNutricaoProps) {
  const shouldReduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [plano, setPlano] = useState<Partial<PlanoAlimentar>>({
    aluno_id: alunoId,
    personal_id: personalId,
    meta_calorias: 2000,
    meta_proteina: 150,
    meta_carboidrato: 200,
    meta_gordura: 60,
    refeicoes: []
  });

  // Autocomplete search states
  const [activeMealForSearch, setActiveMealForSearch] = useState<number | null>(null);
  const [buscaTermo, setBuscaTermo] = useState('');
  const [alimentosEncontrados, setAlimentosEncontrados] = useState<any[]>([]);
  const [alimentoSelecionado, setAlimentoSelecionado] = useState<any | null>(null);
  const [quantidadeG, setQuantidadeG] = useState<number>(100);
  const [loadingBusca, setLoadingBusca] = useState(false);

  useEffect(() => {
    loadPlano();
  }, [alunoId]);

  // Debounce search in TACO database
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

  const loadPlano = async () => {
    setLoading(true);
    try {
      const { data } = await dbService.getPlanoAlimentarAtivo(alunoId);
      if (data) {
        // Pre-calculate per-100g base values for existing food items
        const preparedRefeicoes = (data.refeicoes || []).map((r: any) => ({
          ...r,
          alimentos: (r.alimentos || []).map((a: any) => {
            const qtyNum = parseFloat(a.quantidade) || 100;
            return {
              ...a,
              kcal_100g: a.kcal_100g ?? ((Number(a.calorias) / qtyNum) * 100),
              proteina_100g: a.proteina_100g ?? ((Number(a.proteina) / qtyNum) * 100),
              carbo_100g: a.carbo_100g ?? ((Number(a.carboidrato ?? a.carbo) / qtyNum) * 100),
              gordura_100g: a.gordura_100g ?? ((Number(a.gordura) / qtyNum) * 100),
            };
          })
        }));
        setPlano({
          ...data,
          refeicoes: preparedRefeicoes
        });
      } else {
        // Fallback layout if no plan is found
        setPlano({
          aluno_id: alunoId,
          personal_id: personalId,
          meta_calorias: 2000,
          meta_proteina: 150,
          meta_carboidrato: 200,
          meta_gordura: 60,
          refeicoes: []
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const round = (val: number, decimals: number = 0) => {
    const p = Math.pow(10, decimals);
    return Math.round((val || 0) * p) / p;
  };

  const handleAddRefeicao = () => {
    tocar('abrir');
    const newRef: RefeicaoPlano = {
      id: Math.random(),
      plano_id: plano.id || 0,
      nome: 'Nova Refeição',
      horario: '08:00',
      alimentos: []
    };
    setPlano(prev => ({
      ...prev,
      refeicoes: [...(prev.refeicoes || []), newRef]
    }));
  };

  const handleRemoveRefeicao = (id: number) => {
    tocar('fechar');
    setPlano(prev => ({
      ...prev,
      refeicoes: prev.refeicoes?.filter(r => r.id !== id)
    }));
  };

  const handleRemoveAlimento = (refeicaoId: number, alimentoId: number) => {
    tocar('toggleOff');
    setPlano(prev => ({
      ...prev,
      refeicoes: prev.refeicoes?.map(r => {
        if (r.id === refeicaoId) {
          return { ...r, alimentos: r.alimentos?.filter(a => a.id !== alimentoId) };
        }
        return r;
      })
    }));
  };

  const handleQuantityChange = (refeicaoId: number, alimentoId: number, g: number) => {
    setPlano(prev => ({
      ...prev,
      refeicoes: prev.refeicoes?.map(r => {
        if (r.id === refeicaoId) {
          return {
            ...r,
            alimentos: r.alimentos?.map(a => {
              if (a.id === alimentoId) {
                const factor = g / 100;
                
                // Retrieve base values per 100g
                const k100 = (a as any).kcal_100g !== undefined ? (a as any).kcal_100g : ((Number(a.calorias) / (parseFloat(a.quantidade) || 100)) * 100);
                const p100 = (a as any).proteina_100g !== undefined ? (a as any).proteina_100g : ((Number(a.proteina) / (parseFloat(a.quantidade) || 100)) * 100);
                const c100 = (a as any).carbo_100g !== undefined ? (a as any).carbo_100g : ((Number(a.carboidrato ?? (a as any).carbo) / (parseFloat(a.quantidade) || 100)) * 100);
                const g100 = (a as any).gordura_100g !== undefined ? (a as any).gordura_100g : ((Number(a.gordura) / (parseFloat(a.quantidade) || 100)) * 100);

                const originalK100 = Number(k100) || 0;
                const originalP100 = Number(p100) || 0;
                const originalC100 = Number(c100) || 0;
                const originalG100 = Number(g100) || 0;

                return {
                  ...a,
                  quantidade: `${g}g`,
                  calorias: Math.round(originalK100 * factor),
                  proteina: round(originalP100 * factor, 1),
                  carboidrato: round(originalC100 * factor, 1),
                  gordura: round(originalG100 * factor, 1),
                  kcal_100g: originalK100,
                  proteina_100g: originalP100,
                  carbo_100g: originalC100,
                  gordura_100g: originalG100
                };
              }
              return a;
            })
          };
        }
        return r;
      })
    }));
  };

  const handleOpenSearchModal = (refeicaoId: number) => {
    tocar('abrir');
    setActiveMealForSearch(refeicaoId);
    setBuscaTermo('');
    setAlimentosEncontrados([]);
    setAlimentoSelecionado(null);
    setQuantidadeG(100);
  };

  const handleSelectFoodFromSearch = (food: any) => {
    tocar('tap');
    setAlimentoSelecionado(food);
  };

  const handleConfirmAddAlimento = () => {
    if (!alimentoSelecionado || activeMealForSearch === null) return;

    const factor = quantidadeG / 100;
    const kcal = Math.round((Number(alimentoSelecionado.kcal_100g) || 0) * factor);
    const prot = round((Number(alimentoSelecionado.proteina_100g) || 0) * factor, 1);
    const carb = round((Number(alimentoSelecionado.carbo_100g) || 0) * factor, 1);
    const gord = round((Number(alimentoSelecionado.gordura_100g) || 0) * factor, 1);

    setPlano(prev => ({
      ...prev,
      refeicoes: prev.refeicoes?.map(r => {
        if (r.id === activeMealForSearch) {
          const newAli: AlimentoRefeicao = {
            id: Math.random(),
            refeicao_id: r.id,
            nome: alimentoSelecionado.nome,
            quantidade: `${quantidadeG}g`,
            calorias: kcal,
            proteina: prot,
            carboidrato: carb,
            gordura: gord,
          };
          // Attach base values in React memory for real-time recalculations
          (newAli as any).kcal_100g = Number(alimentoSelecionado.kcal_100g) || 0;
          (newAli as any).proteina_100g = Number(alimentoSelecionado.proteina_100g) || 0;
          (newAli as any).carbo_100g = Number(alimentoSelecionado.carbo_100g) || 0;
          (newAli as any).gordura_100g = Number(alimentoSelecionado.gordura_100g) || 0;

          return { ...r, alimentos: [...(r.alimentos || []), newAli] };
        }
        return r;
      })
    }));

    // Reset search states
    setActiveMealForSearch(null);
    setBuscaTermo('');
    setAlimentosEncontrados([]);
    setAlimentoSelecionado(null);
    setQuantidadeG(100);
    tocar('sucesso');
  };

  const calculateTotals = () => {
    let cal = 0, prot = 0, carb = 0, fat = 0;
    plano.refeicoes?.forEach(r => {
      r.alimentos?.forEach(a => {
        cal += Number(a.calorias) || 0;
        prot += Number(a.proteina) || 0;
        carb += Number(a.carboidrato ?? (a as any).carbo) || 0;
        fat += Number(a.gordura) || 0;
      });
    });
    return {
      cal: Math.round(cal),
      prot: round(prot, 1),
      carb: round(carb, 1),
      fat: round(fat, 1)
    };
  };

  const getMealTotals = (alimentos: AlimentoRefeicao[] | undefined) => {
    let cal = 0, prot = 0, carb = 0, fat = 0;
    alimentos?.forEach(a => {
      cal += Number(a.calorias) || 0;
      prot += Number(a.proteina) || 0;
      carb += Number(a.carboidrato ?? (a as any).carbo) || 0;
      fat += Number(a.gordura) || 0;
    });
    return {
      cal: Math.round(cal),
      prot: round(prot, 1),
      carb: round(carb, 1),
      fat: round(fat, 1)
    };
  };

  const totals = calculateTotals();

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await dbService.savePlanoAlimentar(plano);
      tocar('sucesso');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 4000);
    } catch (err) {
      console.error(err);
      tocar('erro');
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
    <div className="space-y-8 pb-12 relative">
      
      {/* Toast de Sucesso */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 bg-ok text-void px-6 py-3 rounded-2xl shadow-xl z-50 flex items-center gap-2.5 text-sm font-semibold border border-white/20"
          >
            <Check className="w-4 h-4 bg-void/25 p-0.5 rounded-full" />
            <span>Plano alimentar salvo com sucesso!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* METAS DIÁRIAS E SOMA */}
      <div className="bg-surface-2 border border-line rounded-3xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h4 className="font-display font-medium text-base text-ink flex items-center gap-2">
            <Target className="w-5 h-5 text-flame animate-pulse" />
            Metas do Plano vs. Somatório do Dia
          </h4>
          <span className="text-[11px] text-ink-3 bg-void/50 border border-line px-2.5 py-1 rounded-full font-semibold">
            {plano.refeicoes?.length || 0} Refeições Planejadas
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Calorias */}
          <div className="bg-void/20 p-4 rounded-2xl border border-line/40 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[12px] text-ink-3 font-medium flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-flame" /> Calorias (kcal)
              </label>
            </div>
            <input 
              type="number"
              value={plano.meta_calorias}
              disabled={isReadOnly}
              onChange={(e) => setPlano(prev => ({ ...prev, meta_calorias: Number(e.target.value) }))}
              className="z-input !h-10 !text-sm num font-semibold w-full bg-transparent focus:ring-0 focus:border-flame border-b border-line"
            />
            <div className="mt-3 flex items-center justify-between text-[11px]">
              <span className="text-ink-3">Soma:</span>
              <span className={`font-semibold num ${totals.cal > (plano.meta_calorias || 0) ? 'text-danger' : 'text-flame'}`}>
                {totals.cal} / {plano.meta_calorias || 0} kcal
              </span>
            </div>
            <div className="w-full bg-void h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-flame h-full rounded-full transition-all duration-300" 
                style={{ width: `${Math.min(100, ((totals.cal) / (plano.meta_calorias || 1)) * 100)}%` }} 
              />
            </div>
          </div>

          {/* Proteina */}
          <div className="bg-void/20 p-4 rounded-2xl border border-line/40 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[12px] text-ink-3 font-medium flex items-center gap-1">
                <Apple className="w-3.5 h-3.5 text-violet" /> Proteína (g)
              </label>
            </div>
            <input 
              type="number"
              value={plano.meta_proteina}
              disabled={isReadOnly}
              onChange={(e) => setPlano(prev => ({ ...prev, meta_proteina: Number(e.target.value) }))}
              className="z-input !h-10 !text-sm num font-semibold w-full bg-transparent focus:ring-0 focus:border-flame border-b border-line"
            />
            <div className="mt-3 flex items-center justify-between text-[11px]">
              <span className="text-ink-3">Soma:</span>
              <span className="font-semibold text-violet num">
                {totals.prot}g / {plano.meta_proteina || 0}g
              </span>
            </div>
            <div className="w-full bg-void h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-violet h-full rounded-full transition-all duration-300" 
                style={{ width: `${Math.min(100, ((totals.prot) / (plano.meta_proteina || 1)) * 100)}%` }} 
              />
            </div>
          </div>

          {/* Carboidrato */}
          <div className="bg-void/20 p-4 rounded-2xl border border-line/40 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[12px] text-ink-3 font-medium flex items-center gap-1">
                <Wheat className="w-3.5 h-3.5 text-amber" /> Carboidratos (g)
              </label>
            </div>
            <input 
              type="number"
              value={plano.meta_carboidrato}
              disabled={isReadOnly}
              onChange={(e) => setPlano(prev => ({ ...prev, meta_carboidrato: Number(e.target.value) }))}
              className="z-input !h-10 !text-sm num font-semibold w-full bg-transparent focus:ring-0 focus:border-flame border-b border-line"
            />
            <div className="mt-3 flex items-center justify-between text-[11px]">
              <span className="text-ink-3">Soma:</span>
              <span className="font-semibold text-amber num">
                {totals.carb}g / {plano.meta_carboidrato || 0}g
              </span>
            </div>
            <div className="w-full bg-void h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-amber h-full rounded-full transition-all duration-300" 
                style={{ width: `${Math.min(100, ((totals.carb) / (plano.meta_carboidrato || 1)) * 100)}%` }} 
              />
            </div>
          </div>

          {/* Gordura */}
          <div className="bg-void/20 p-4 rounded-2xl border border-line/40 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[12px] text-ink-3 font-medium flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-orange-500" /> Gorduras (g)
              </label>
            </div>
            <input 
              type="number"
              value={plano.meta_gordura}
              disabled={isReadOnly}
              onChange={(e) => setPlano(prev => ({ ...prev, meta_gordura: Number(e.target.value) }))}
              className="z-input !h-10 !text-sm num font-semibold w-full bg-transparent focus:ring-0 focus:border-flame border-b border-line"
            />
            <div className="mt-3 flex items-center justify-between text-[11px]">
              <span className="text-ink-3">Soma:</span>
              <span className="font-semibold text-orange-500 num">
                {totals.fat}g / {plano.meta_gordura || 0}g
              </span>
            </div>
            <div className="w-full bg-void h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-orange-500 h-full rounded-full transition-all duration-300" 
                style={{ width: `${Math.min(100, ((totals.fat) / (plano.meta_gordura || 1)) * 100)}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* REFEIÇÕES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-display font-medium text-base text-ink">Refeições do Plano</h4>
          {!isReadOnly && (
            <button
              onClick={handleAddRefeicao}
              className="flex items-center gap-2 px-4 py-2 bg-flame hover:bg-flame-hover text-white rounded-xl text-xs font-semibold hover:scale-105 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar refeição
            </button>
          )}
        </div>

        <div className="space-y-6">
          <AnimatePresence>
            {plano.refeicoes?.map((ref) => {
              const mealTotals = getMealTotals(ref.alimentos);
              return (
                <motion.div
                  key={ref.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-surface-2 border border-line rounded-3xl overflow-hidden shadow-sm"
                >
                  <div className="p-4 bg-white/5 border-b border-line flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 flex flex-col md:flex-row md:items-center gap-4">
                      <input 
                        value={ref.nome}
                        disabled={isReadOnly}
                        onChange={(e) => setPlano(prev => ({
                          ...prev,
                          refeicoes: prev.refeicoes?.map(r => r.id === ref.id ? { ...r, nome: e.target.value } : r)
                        }))}
                        className="bg-transparent font-display font-semibold text-ink text-sm md:text-base outline-none border-b border-transparent focus:border-flame disabled:opacity-80 pb-0.5 w-full md:w-48"
                      />
                      
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1 text-[12px] text-ink-3">
                          <Clock className="w-3.5 h-3.5 text-ink-3" />
                          <input 
                            type="time"
                            value={ref.horario}
                            disabled={isReadOnly}
                            onChange={(e) => setPlano(prev => ({
                              ...prev,
                              refeicoes: prev.refeicoes?.map(r => r.id === ref.id ? { ...r, horario: e.target.value } : r)
                            }))}
                            className="bg-transparent text-[12px] text-ink outline-none border-b border-transparent focus:border-flame disabled:opacity-80 num font-medium"
                          />
                        </div>
                        
                        {/* Meal totals badges */}
                        <div className="flex flex-wrap items-center gap-2 text-[11px] bg-void/50 px-2.5 py-1 rounded-full border border-line">
                          <span className="font-semibold text-flame flex items-center gap-0.5">
                            <Flame className="w-3.5 h-3.5" /> {mealTotals.cal} kcal
                          </span>
                          <span className="text-ink-3">•</span>
                          <span className="text-violet font-medium">P: {mealTotals.prot}g</span>
                          <span className="text-ink-3">•</span>
                          <span className="text-amber font-medium">C: {mealTotals.carb}g</span>
                          <span className="text-ink-3">•</span>
                          <span className="text-orange-500 font-medium">G: {mealTotals.fat}g</span>
                        </div>
                      </div>
                    </div>
                    
                    {!isReadOnly && (
                      <button 
                        onClick={() => handleRemoveRefeicao(ref.id)}
                        className="p-2 text-ink-3 hover:text-flame hover:bg-danger/10 rounded-lg transition-all self-end md:self-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="p-4 space-y-4">
                    <div className="space-y-2">
                      {ref.alimentos && ref.alimentos.length > 0 ? (
                        ref.alimentos.map((ali) => (
                          <div key={ali.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-void/20 border border-line/40 rounded-2xl hover:border-line transition-all">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-[13px] text-ink truncate">{ali.nome}</div>
                              <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1 text-[11px] text-ink-3">
                                <span className="font-semibold text-flame">{ali.calorias} kcal</span>
                                <span>·</span>
                                <span className="text-violet">P: {ali.proteina}g</span>
                                <span>·</span>
                                <span className="text-amber">C: {ali.carboidrato ?? (ali as any).carbo}g</span>
                                <span>·</span>
                                <span className="text-orange-500">G: {ali.gordura}g</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 justify-between sm:justify-start">
                              <div className="flex items-center gap-1.5 bg-void/30 px-2 py-1 rounded-xl border border-line">
                                <span className="text-[10px] text-ink-3 font-semibold uppercase">Qtd</span>
                                <input 
                                  type="number"
                                  value={parseFloat(ali.quantidade) || 0}
                                  disabled={isReadOnly}
                                  onChange={(e) => {
                                    const g = Math.max(0, parseFloat(e.target.value) || 0);
                                    handleQuantityChange(ref.id, ali.id, g);
                                  }}
                                  className="w-14 bg-transparent text-[12px] text-ink text-center outline-none font-semibold num"
                                />
                                <span className="text-[11px] text-ink-3 font-semibold">g</span>
                              </div>

                              {!isReadOnly && (
                                <button 
                                  onClick={() => handleRemoveAlimento(ref.id, ali.id)} 
                                  className="p-1.5 text-ink-3 hover:text-flame hover:bg-danger/10 rounded-lg transition-all"
                                  title="Remover"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-[12px] text-ink-3 border border-dashed border-line/60 rounded-2xl">
                          Nenhum alimento nesta refeição. Adicione abaixo de forma rápida!
                        </div>
                      )}
                    </div>

                    {!isReadOnly && (
                      <button
                        onClick={() => handleOpenSearchModal(ref.id)}
                        className="w-full py-2.5 bg-void border border-dashed border-white/10 hover:border-flame/30 hover:bg-flame/5 rounded-2xl text-xs font-semibold text-ink-3 hover:text-flame transition-all flex items-center justify-center gap-2"
                      >
                        <Search className="w-3.5 h-3.5" /> Buscar e adicionar da base TACO
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <div className="pt-6 mt-8">
        {!isReadOnly && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-flame hover:bg-flame-hover text-white rounded-2xl font-display font-semibold flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Salvar Plano Alimentar
          </button>
        )}
      </div>

      {/* MODAL DE BUSCA/AUTOCOMPLETE TACO */}
      <AnimatePresence>
        {activeMealForSearch !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop / Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { tocar('fechar'); setActiveMealForSearch(null); }}
              className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            />

            {/* Modal Card */}
            <motion.div 
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative bg-white border border-black/[0.08] rounded-[20px] w-full max-w-xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.18)] flex flex-col max-h-[85vh] z-10"
            >
              {/* Header do Modal */}
              <div className="p-5 border-b border-black/[0.06] flex items-center justify-between bg-white">
                <div>
                  <h3 className="font-display font-bold text-lg text-ink flex items-center gap-2">
                    <Search className="w-5 h-5 text-flame" />
                    Adicionar Alimento (TACO)
                  </h3>
                  <p className="text-[11px] text-ink-3 mt-0.5">
                    Selecione um item da tabela oficial brasileira para cálculo instantâneo.
                  </p>
                </div>
                <button 
                  onClick={() => { tocar('fechar'); setActiveMealForSearch(null); }}
                  className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors text-ink-3 hover:text-ink"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Corpo do Modal */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {/* Campo de Busca */}
                <div className="relative">
                  <Search className="w-4 h-4 text-ink-3 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text"
                    value={buscaTermo}
                    onChange={(e) => setBuscaTermo(e.target.value)}
                    placeholder="Digite pelo menos 2 letras (Ex: aveia, banana, frango...)"
                    className="z-input !h-11 !pl-10 !pr-10 !text-sm w-full"
                    autoFocus
                  />
                  {buscaTermo && (
                    <button 
                      onClick={() => setBuscaTermo('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-3 hover:text-ink"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Lista de Resultados de Busca */}
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {loadingBusca ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-[12px] text-ink-3">
                      <Loader2 className="w-4 h-4 text-flame animate-spin" /> Buscando alimentos...
                    </div>
                  ) : alimentosEncontrados.length > 0 ? (
                    alimentosEncontrados.map((item) => {
                      const isSelected = alimentoSelecionado?.id === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectFoodFromSearch(item)}
                          className={`w-full p-3 rounded-2xl text-left border transition-all flex items-center justify-between gap-3 ${
                            isSelected 
                              ? 'bg-flame/10 border-flame text-ink' 
                              : 'bg-neutral-50/60 border-black/[0.04] hover:border-black/[0.08] hover:bg-neutral-100/60 text-ink-2'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-xs truncate text-ink">{item.nome}</div>
                            <div className="text-[10px] text-ink-3 mt-0.5 flex flex-wrap gap-x-1.5">
                              <span>kcal/100g: <strong className="text-flame">{Math.round(item.kcal_100g) || 0}</strong></span>
                              <span>•</span>
                              <span>P: {item.proteina_100g || 0}g</span>
                              <span>•</span>
                              <span>C: {item.carbo_100g || 0}g</span>
                              <span>•</span>
                              <span>G: {item.gordura_100g || 0}g</span>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-flame shrink-0" />}
                        </button>
                      );
                    })
                  ) : buscaTermo.trim().length >= 2 ? (
                    <div className="text-center py-8 text-xs text-ink-3">
                      Nenhum alimento encontrado para "{buscaTermo}"
                    </div>
                  ) : (
                    <div className="text-center py-8 text-xs text-ink-3">
                      Comece a digitar para ver os alimentos da base TACO.
                    </div>
                  )}
                </div>

                {/* Configuração de Quantidade e Preview de Macros */}
                {alimentoSelecionado && (
                  <motion.div 
                    initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-neutral-50 rounded-2xl border border-black/[0.06] space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-[12px] font-semibold text-ink-2">Ajuste de Quantidade</div>
                      <div className="text-[11px] text-ink-3 truncate max-w-[60%]">{alimentoSelecionado.nome}</div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border border-black/[0.08]">
                          <Scale className="w-4 h-4 text-ink-3" />
                          <input 
                            type="number"
                            value={quantidadeG}
                            onChange={(e) => setQuantidadeG(Math.max(1, parseFloat(e.target.value) || 0))}
                            placeholder="Quantidade"
                            className="bg-transparent text-sm text-ink outline-none w-full font-semibold num"
                            min="1"
                          />
                          <span className="text-xs text-ink-3 font-semibold">g</span>
                        </div>
                      </div>

                      {/* Botões rápidos para quantidade */}
                      <div className="flex gap-1">
                        {[50, 100, 150, 200].map((g) => (
                          <button
                            key={g}
                            onClick={() => { tocar('tap'); setQuantidadeG(g); }}
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                              quantidadeG === g 
                                ? 'bg-flame text-white border-flame' 
                                : 'bg-white text-ink-3 border border-black/[0.08] hover:border-black/[0.15]'
                            }`}
                          >
                            {g}g
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Preview de Macros Calculados */}
                    <div className="p-3 bg-flame/[0.04] border border-flame/15 rounded-xl">
                      <div className="text-[10px] text-flame font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 animate-bounce" />
                        Preview Nutricional do Item
                      </div>
                      <div className="flex items-center justify-between text-xs font-semibold text-ink">
                        <span>{Math.round((Number(alimentoSelecionado.kcal_100g) || 0) * (quantidadeG / 100))} kcal</span>
                        <span className="text-ink-3">•</span>
                        <span className="text-violet">P: {round((Number(alimentoSelecionado.proteina_100g) || 0) * (quantidadeG / 100), 1)}g</span>
                        <span className="text-ink-3">•</span>
                        <span className="text-amber">C: {round((Number(alimentoSelecionado.carbo_100g) || 0) * (quantidadeG / 100), 1)}g</span>
                        <span className="text-ink-3">•</span>
                        <span className="text-orange-500">G: {round((Number(alimentoSelecionado.gordura_100g) || 0) * (quantidadeG / 100), 1)}g</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Rodapé do Modal */}
              <div className="p-5 border-t border-black/[0.06] bg-white flex items-center justify-end gap-3">
                <button
                  onClick={() => { tocar('fechar'); setActiveMealForSearch(null); }}
                  className="px-4 py-2 text-ink-3 hover:text-ink text-xs font-semibold rounded-xl hover:bg-neutral-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  disabled={!alimentoSelecionado}
                  onClick={handleConfirmAddAlimento}
                  className="px-5 py-2.5 bg-flame hover:bg-flame-hover disabled:opacity-40 disabled:hover:bg-flame text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-[0_2px_6px_rgba(0,0,0,0.12)]"
                >
                  <Plus className="w-4 h-4" /> Confirmar e Adicionar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
