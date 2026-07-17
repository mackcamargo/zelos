import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Save, Loader2, Utensils, 
  Clock, Flame, Apple, Wheat, Droplets, ChevronDown, ChevronUp, Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService } from '../lib/supabase';
import { PlanoAlimentar, RefeicaoPlano, AlimentoRefeicao } from '../types';

interface GerenciarNutricaoProps {
  alunoId: string;
  personalId: string;
  isReadOnly?: boolean;
}

export default function GerenciarNutricao({ alunoId, personalId, isReadOnly = false }: GerenciarNutricaoProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plano, setPlano] = useState<Partial<PlanoAlimentar>>({
    aluno_id: alunoId,
    personal_id: personalId,
    meta_calorias: 2000,
    meta_proteina: 150,
    meta_carboidrato: 200,
    meta_gordura: 60,
    refeicoes: []
  });

  useEffect(() => {
    loadPlano();
  }, [alunoId]);

  const loadPlano = async () => {
    setLoading(true);
    try {
      const { data } = await dbService.getPlanoAlimentarAtivo(alunoId);
      if (data) {
        setPlano(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddRefeicao = () => {
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
    setPlano(prev => ({
      ...prev,
      refeicoes: prev.refeicoes?.filter(r => r.id !== id)
    }));
  };

  const handleAddAlimento = (refeicaoId: number) => {
    setPlano(prev => ({
      ...prev,
      refeicoes: prev.refeicoes?.map(r => {
        if (r.id === refeicaoId) {
          const newAli: AlimentoRefeicao = {
            id: Math.random(),
            refeicao_id: r.id,
            nome: 'Novo Alimento',
            quantidade: '100g',
            calorias: 0,
            proteina: 0,
            carboidrato: 0,
            gordura: 0
          };
          return { ...r, alimentos: [...(r.alimentos || []), newAli] };
        }
        return r;
      })
    }));
  };

  const handleUpdateAlimento = (refeicaoId: number, alimentoId: number, field: keyof AlimentoRefeicao, value: any) => {
    setPlano(prev => ({
      ...prev,
      refeicoes: prev.refeicoes?.map(r => {
        if (r.id === refeicaoId) {
          return {
            ...r,
            alimentos: r.alimentos?.map(a => a.id === alimentoId ? { ...a, [field]: value } : a)
          };
        }
        return r;
      })
    }));
  };

  const handleRemoveAlimento = (refeicaoId: number, alimentoId: number) => {
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

  const calculateTotals = () => {
    let cal = 0, prot = 0, carb = 0, fat = 0;
    plano.refeicoes?.forEach(r => {
      r.alimentos?.forEach(a => {
        cal += Number(a.calorias) || 0;
        prot += Number(a.proteina) || 0;
        carb += Number(a.carboidrato) || 0;
        fat += Number(a.gordura) || 0;
      });
    });
    return { cal, prot, carb, fat };
  };

  const totals = calculateTotals();

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await dbService.savePlanoAlimentar(plano);
      alert('Plano alimentar salvo com sucesso!');
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
    <div className="space-y-8 pb-12">
      {/* METAS DIÁRIAS */}
      <div className="bg-surface-2 border border-line rounded-3xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h4 className="font-display font-medium text-base text-ink flex items-center gap-2">
            <Target className="w-5 h-5 text-flame" />
            Metas diárias
          </h4>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-[12px] text-ink-3">Calorias (kcal)</label>
            <input 
              type="number"
              value={plano.meta_calorias}
              disabled={isReadOnly}
              onChange={(e) => setPlano(prev => ({ ...prev, meta_calorias: Number(e.target.value) }))}
              className="z-input !h-12 !text-sm num"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] text-ink-3">Proteína (g)</label>
            <input 
              type="number"
              value={plano.meta_proteina}
              disabled={isReadOnly}
              onChange={(e) => setPlano(prev => ({ ...prev, meta_proteina: Number(e.target.value) }))}
              className="z-input !h-12 !text-sm num"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] text-ink-3">Carbo (g)</label>
            <input 
              type="number"
              value={plano.meta_carboidrato}
              disabled={isReadOnly}
              onChange={(e) => setPlano(prev => ({ ...prev, meta_carboidrato: Number(e.target.value) }))}
              className="z-input !h-12 !text-sm num"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] text-ink-3">Gordura (g)</label>
            <input 
              type="number"
              value={plano.meta_gordura}
              disabled={isReadOnly}
              onChange={(e) => setPlano(prev => ({ ...prev, meta_gordura: Number(e.target.value) }))}
              className="z-input !h-12 !text-sm num"
            />
          </div>
        </div>

        {/* COMPARATIVO META VS SOMA */}
        <div className="p-4 bg-void/50 rounded-2xl border border-line grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-[12px] text-ink-3">Total plano</div>
            <div className={`text-[16px] font-semibold num ${totals.cal > (plano.meta_calorias || 0) ? 'text-flame' : 'text-ink'}`}>
              {totals.cal} / {plano.meta_calorias}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[12px] text-ink-3">Prot</div>
            <div className="text-[16px] font-semibold text-violet num">{totals.prot}g</div>
          </div>
          <div className="text-center">
            <div className="text-[12px] text-ink-3">Carb</div>
            <div className="text-[16px] font-semibold text-amber num">{totals.carb}g</div>
          </div>
          <div className="text-center">
            <div className="text-[12px] text-ink-3">Gord</div>
            <div className="text-[16px] font-semibold text-orange-500 num">{totals.fat}g</div>
          </div>
        </div>
      </div>

      {/* REFEIÇÕES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-display font-medium text-base text-ink">Refeições</h4>
          {!isReadOnly && (
            <button
              onClick={handleAddRefeicao}
              className="flex items-center gap-2 px-4 py-2 bg-flame text-void rounded-xl text-xs font-semibold hover:scale-105 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar refeição
            </button>
          )}
        </div>

        <div className="space-y-4">
          <AnimatePresence>
            {plano.refeicoes?.map((ref) => (
              <motion.div
                key={ref.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface-2 border border-line rounded-3xl overflow-hidden"
              >
                <div className="p-4 bg-white/5 flex items-center gap-4">
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <input 
                      value={ref.nome}
                      disabled={isReadOnly}
                      onChange={(e) => setPlano(prev => ({
                        ...prev,
                        refeicoes: prev.refeicoes?.map(r => r.id === ref.id ? { ...r, nome: e.target.value } : r)
                      }))}
                      className="bg-transparent font-display font-semibold text-ink outline-none border-b border-line focus:border-flame disabled:opacity-50"
                    />
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-ink-3" />
                      <input 
                        type="time"
                        value={ref.horario}
                        disabled={isReadOnly}
                        onChange={(e) => setPlano(prev => ({
                          ...prev,
                          refeicoes: prev.refeicoes?.map(r => r.id === ref.id ? { ...r, horario: e.target.value } : r)
                        }))}
                        className="bg-transparent text-[12px] text-ink outline-none border-b border-line focus:border-flame disabled:opacity-50 num"
                      />
                    </div>
                  </div>
                  {!isReadOnly && (
                    <button 
                      onClick={() => handleRemoveRefeicao(ref.id)}
                      className="p-2 text-ink-3 hover:text-flame transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    {ref.alimentos?.map((ali) => (
                      <div key={ali.id} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-4">
                          <input 
                            value={ali.nome}
                            placeholder="Alimento"
                            onChange={(e) => handleUpdateAlimento(ref.id, ali.id, 'nome', e.target.value)}
                            className="z-input !h-9 !px-3 !text-[12px]"
                          />
                        </div>
                        <div className="col-span-2">
                          <input 
                            value={ali.quantidade}
                            placeholder="Qtd"
                            onChange={(e) => handleUpdateAlimento(ref.id, ali.id, 'quantidade', e.target.value)}
                            className="z-input !h-9 !px-2 !text-[12px] num"
                          />
                        </div>
                        <div className="col-span-1">
                          <input 
                            type="number"
                            value={ali.calorias}
                            placeholder="Kcal"
                            onChange={(e) => handleUpdateAlimento(ref.id, ali.id, 'calorias', Number(e.target.value))}
                            className="z-input !h-9 !px-1 !text-[12px] text-center num"
                          />
                        </div>
                        <div className="col-span-1">
                          <input 
                            type="number"
                            value={ali.proteina}
                            placeholder="P"
                            onChange={(e) => handleUpdateAlimento(ref.id, ali.id, 'proteina', Number(e.target.value))}
                            className="z-input !h-9 !px-1 !text-[12px] text-violet text-center num"
                          />
                        </div>
                        <div className="col-span-1">
                          <input 
                            type="number"
                            value={ali.carboidrato}
                            placeholder="C"
                            onChange={(e) => handleUpdateAlimento(ref.id, ali.id, 'carboidrato', Number(e.target.value))}
                            className="z-input !h-9 !px-1 !text-[12px] text-amber text-center num"
                          />
                        </div>
                        <div className="col-span-1">
                          <input 
                            type="number"
                            value={ali.gordura}
                            placeholder="G"
                            onChange={(e) => handleUpdateAlimento(ref.id, ali.id, 'gordura', Number(e.target.value))}
                            className="z-input !h-9 !px-1 !text-[12px] text-orange-500 text-center num"
                          />
                        </div>
                        <div className="col-span-1 flex justify-center">
                          {!isReadOnly && (
                            <button onClick={() => handleRemoveAlimento(ref.id, ali.id)} className="text-ink-3 hover:text-flame">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {!isReadOnly && (
                    <button
                      onClick={() => handleAddAlimento(ref.id)}
                      className="w-full py-2 bg-void border border-dashed border-white/10 rounded-xl text-xs font-semibold text-ink-3 hover:text-ink hover:border-white/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-3 h-3" /> Adicionar alimento
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="pt-6 mt-8">
        {!isReadOnly && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 brand-gradient-bg rounded-2xl font-display font-semibold text-void flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Salvar plano alimentar
          </button>
        )}
      </div>
    </div>
  );
}
