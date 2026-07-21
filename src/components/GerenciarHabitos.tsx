import React, { useState, useEffect, useMemo } from 'react';
import { dbService, isSupabaseConfigured, supabase } from '../lib/supabase';
import { Habito, HabitoRegistro } from '../types';
import { 
  Plus, Trash2, TrendingUp, 
  Loader2, X, Sparkles, Check,
  Zap, Droplet, Utensils, Moon, Footprints, Activity, PhoneOff, Sun,
  CheckCircle2, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GerenciarHabitosProps {
  alunoId: string;
  personalId: string;
  isReadOnly?: boolean;
}

const EMOJIS = ['⚡', '💧', '🥗', '😴', '🚶', '🧘', '📵', '☀️'];

const ICON_LABELS: Record<string, string> = {
  '⚡': 'Foco & Energia',
  '💧': 'Beber Água / Hidratação',
  '🥗': 'Alimentação / Dieta',
  '😴': 'Sono / Descanso',
  '🚶': 'Passos / Cardio',
  '🧘': 'Meditação / Bem-Estar',
  '📵': 'Desconexão / Foco',
  '☀️': 'Vitamina D / Sol'
};

const renderHabitoIcon = (icone: string, colorClass: string = "text-[#F26A1B]") => {
  const iconProps = { className: `w-5 h-5 ${colorClass} stroke-[1.75]` };
  switch (icone) {
    case '⚡': return <Zap {...iconProps} />;
    case '💧': return <Droplet {...iconProps} />;
    case '🥗': return <Utensils {...iconProps} />;
    case '😴': return <Moon {...iconProps} />;
    case '🚶': return <Footprints {...iconProps} />;
    case '🧘': return <Activity {...iconProps} />;
    case '📵': return <PhoneOff {...iconProps} />;
    case '☀️': return <Sun {...iconProps} />;
    default: return <Zap {...iconProps} />;
  }
};

export default function GerenciarHabitos({ alunoId, personalId, isReadOnly = false }: GerenciarHabitosProps) {
  const [habitos, setHabitos] = useState<Habito[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedHabitoIds, setExpandedHabitoIds] = useState<number[]>([]);
  
  // New habit form state
  const [newNome, setNewNome] = useState('');
  const [newIcone, setNewIcone] = useState('⚡');
  const [newMeta, setNewMeta] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleExpand = (id: number) => {
    setExpandedHabitoIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    loadHabitos();
  }, [alunoId]);

  const loadHabitos = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("habitos")
          .select("*")
          .eq("aluno_id", alunoId)
          .eq("ativo", true)
          .order("criado_em", { ascending: true });
        
        if (data) {
          const ids = data.map((h: any) => h.id);
          let regs: any[] = [];
          if (ids.length > 0) {
            const { data: regsData } = await supabase
              .from('habitos_registros')
              .select('*')
              .in('habito_id', ids);
            regs = regsData || [];
          }

          const mapped = data.map((h: any) => ({
            ...h,
            registros: regs.filter((r: any) => r.habito_id === h.id)
          }));
          setHabitos(mapped);
        }
      } else {
        // Fallback for demo mode
        const localHabitos = JSON.parse(localStorage.getItem('zenite_habitos') || '[]');
        const localRegistros = JSON.parse(localStorage.getItem('zenite_habitos_registros') || '[]');
        
        const filteredHabitos = localHabitos.filter((h: any) => h.aluno_id === alunoId && h.ativo !== false);
        const mapped = filteredHabitos.map((h: any) => ({
          ...h,
          registros: localRegistros.filter((r: any) => r.habito_id === h.id)
        }));
        setHabitos(mapped);
      }
    } catch (err) {
      console.error("Erro ao carregar hábitos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newNome.trim()) return;
    setSaving(true);
    try {
      const payload = {
        aluno_id: alunoId,
        personal_id: personalId,
        nome: newNome.trim(),
        icone: newIcone,
        meta_diaria: newMeta.trim() || null,
        ativo: true
      };

      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from("habitos")
          .insert(payload);
        if (error) throw error;
      } else {
        // Fallback for demo mode
        const habitosMock = JSON.parse(localStorage.getItem('zenite_habitos') || '[]');
        habitosMock.push({
          id: Math.floor(Math.random() * 1000000),
          ...payload,
          criado_em: new Date().toISOString()
        });
        localStorage.setItem('zenite_habitos', JSON.stringify(habitosMock));
      }
      await loadHabitos();
      setShowAddForm(false);
      setNewNome('');
      setNewMeta('');
      setNewIcone('⚡');
    } catch (err) {
      console.error("Erro ao salvar hábito:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDesativar = async (id: number) => {
    if (!confirm('Deseja realmente remover este hábito do aluno?')) return;
    
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('habitos')
          .update({ ativo: false })
          .eq('id', id);
        if (error) throw error;
      } else {
        // Fallback for demo mode
        const habitosMock = JSON.parse(localStorage.getItem('zenite_habitos') || '[]');
        const index = habitosMock.findIndex((h: any) => h.id === id);
        if (index >= 0) {
          habitosMock[index].ativo = false;
          localStorage.setItem('zenite_habitos', JSON.stringify(habitosMock));
        }
      }
      setHabitos(prev => prev.filter(h => h.id !== id));
    } catch (err) {
      console.error("Erro ao desativar hábito:", err);
    }
  };

  // Last 7 days helper
  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayLetter = d.toLocaleDateString('pt-BR', { weekday: 'narrow' }).toUpperCase();
      return { dateStr, dayLetter, formattedDate: `${day}/${month}` };
    });
  }, []);

  // Summary KPIs
  const overallStats = useMemo(() => {
    if (!habitos || habitos.length === 0) {
      return { total: 0, avgAdherence: 0, doneToday: 0 };
    }
    const todayStr = new Date().toISOString().split('T')[0];
    let totalCompleted7Days = 0;
    let doneTodayCount = 0;

    habitos.forEach((h) => {
      const regs = h.registros || [];
      const completedSet = new Set(regs.filter(r => r.concluido).map(r => r.data));
      
      if (completedSet.has(todayStr)) {
        doneTodayCount++;
      }

      last7Days.forEach(({ dateStr }) => {
        if (completedSet.has(dateStr)) {
          totalCompleted7Days++;
        }
      });
    });

    const maxPossible7Days = habitos.length * 7;
    const avgAdherence = maxPossible7Days > 0 ? Math.round((totalCompleted7Days / maxPossible7Days) * 100) : 0;

    return {
      total: habitos.length,
      avgAdherence,
      doneToday: doneTodayCount
    };
  }, [habitos, last7Days]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-[#F26A1B] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line-soft">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F26A1B]/10 border border-[#F26A1B]/20 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-[#F26A1B]" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-ink">Hábitos do aluno</h3>
            <p className="text-xs text-ink-3">Defina e acompanhe a disciplina diária</p>
          </div>
        </div>

        {!isReadOnly && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F26A1B] text-white hover:bg-[#E0590A] active:scale-95 rounded-xl font-display font-bold text-xs transition-all shadow-sm cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Novo hábito</span>
          </button>
        )}
      </div>

      {/* Summary KPI Bar */}
      {habitos.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          <div className="bg-surface border border-line rounded-[14px] p-3 flex flex-col items-center justify-center text-center shadow-[0_1px_2px_rgba(20,20,20,0.04)]">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-3">Hábitos</span>
            <span className="font-mono font-black text-lg sm:text-xl text-ink mt-0.5">{overallStats.total}</span>
          </div>

          <div className="bg-surface border border-line rounded-[14px] p-3 flex flex-col items-center justify-center text-center shadow-[0_1px_2px_rgba(20,20,20,0.04)]">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-3">Adesão 7d</span>
            <span className={`font-mono font-black text-lg sm:text-xl mt-0.5 ${
              overallStats.avgAdherence >= 70 ? 'text-emerald-600' : overallStats.avgAdherence >= 40 ? 'text-amber-500' : 'text-ink'
            }`}>
              {overallStats.avgAdherence}%
            </span>
          </div>

          <div className="bg-surface border border-line rounded-[14px] p-3 flex flex-col items-center justify-center text-center shadow-[0_1px_2px_rgba(20,20,20,0.04)]">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-3">Hoje</span>
            <span className="font-mono font-black text-lg sm:text-xl text-ink mt-0.5">
              {overallStats.doneToday}/{overallStats.total}
            </span>
          </div>
        </div>
      )}

      {/* Modal to add habit */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-surface border border-line rounded-[24px] p-6 w-full max-w-md space-y-6 relative shadow-2xl"
            >
              <button 
                type="button"
                onClick={() => setShowAddForm(false)} 
                className="absolute top-5 right-5 p-2 text-ink-3 hover:text-ink hover:bg-bg rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <h4 className="font-display font-bold text-lg text-ink">Atribuir novo hábito</h4>
                <p className="text-xs text-ink-3 mt-1">Insira os detalhes do hábito para acompanhamento diário.</p>
              </div>

              <div className="space-y-4">
                {/* Nome */}
                <div className="space-y-1.5">
                  <label className="text-xs text-ink-2 font-medium block">Nome do hábito</label>
                  <input
                    value={newNome}
                    onChange={(e) => setNewNome(e.target.value)}
                    placeholder="Ex: Beber 2L de água"
                    className="w-full px-3.5 py-2.5 bg-bg border border-line rounded-xl text-xs text-ink placeholder:text-ink-3/50 focus:outline-none focus:border-[#F26A1B] transition-colors"
                  />
                </div>

                {/* Emoji / Icon selector */}
                <div className="space-y-2">
                  <label className="text-xs text-ink-2 font-medium block">Selecione o ícone</label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewIcone(emoji)}
                        title={ICON_LABELS[emoji]}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                          newIcone === emoji
                            ? 'bg-[#F26A1B]/15 border-[#F26A1B] text-[#F26A1B] shadow-sm'
                            : 'bg-bg border-line hover:border-line-strong text-ink-2'
                        }`}
                      >
                        {renderHabitoIcon(emoji, newIcone === emoji ? 'text-[#F26A1B]' : 'text-ink-2')}
                      </button>
                    ))}
                  </div>
                  
                  <p className="text-[11px] text-[#F26A1B] font-mono font-medium mt-2 flex items-center gap-1.5 bg-[#F26A1B]/10 px-3 py-1.5 rounded-lg border border-[#F26A1B]/20">
                    <span>Ícone:</span>
                    <span className="font-bold">
                      {ICON_LABELS[newIcone]}
                    </span>
                  </p>
                </div>

                {/* Meta diária */}
                <div className="space-y-1.5">
                  <label className="text-xs text-ink-2 font-medium block">Meta diária (opcional)</label>
                  <input
                    value={newMeta}
                    onChange={(e) => setNewMeta(e.target.value)}
                    placeholder="Ex: Hidratação diária ou 2L"
                    className="w-full px-3.5 py-2.5 bg-bg border border-line rounded-xl text-xs text-ink placeholder:text-ink-3/50 focus:outline-none focus:border-[#F26A1B] transition-colors"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !newNome.trim()}
                  className="w-full py-3 bg-[#F26A1B] text-white rounded-xl font-display font-bold text-xs hover:bg-[#E0590A] active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Salvar hábito'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Habit List Accordion */}
      <div className="space-y-2.5">
        {habitos.map((h) => {
          const registros = h.registros || [];
          const completedDates = new Set(registros.filter(r => r.concluido).map(r => r.data));
          const isExpanded = expandedHabitoIds.includes(h.id);

          let count7 = 0;
          last7Days.forEach(({ dateStr }) => {
            if (completedDates.has(dateStr)) count7++;
          });
          const adherencePct = Math.round((count7 / 7) * 100);

          return (
            <div 
              key={h.id} 
              className="bg-surface border border-line rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(20,20,20,0.04)] hover:border-line-strong transition-all"
            >
              {/* Row Header - Clickable to expand/collapse */}
              <div 
                onClick={() => toggleExpand(h.id)}
                className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none bg-surface hover:bg-bg/60 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#F26A1B]/10 border border-[#F26A1B]/20 flex items-center justify-center shrink-0">
                    {renderHabitoIcon(h.icone || '⚡', 'text-[#F26A1B]')}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-display font-bold text-sm text-ink truncate leading-snug">{h.nome}</h4>
                    {h.meta_diaria && (
                      <p className="text-[11px] text-ink-3 font-mono truncate mt-0.5">
                        Meta: {h.meta_diaria}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${
                    adherencePct >= 70
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                      : adherencePct >= 40
                      ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      : 'bg-bg text-ink-3 border-line'
                  }`}>
                    {count7}/7 ({adherencePct}%)
                  </span>

                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDesativar(h.id);
                      }}
                      title="Remover hábito"
                      className="p-1.5 text-ink-3 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="p-1 text-ink-3 rounded-lg">
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-ink-2" /> : <ChevronDown className="w-4 h-4 text-ink-3" />}
                  </div>
                </div>
              </div>

              {/* Expanded 7-Day Adherence Details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-line-soft bg-bg/40"
                  >
                    <div className="p-3.5 sm:p-4 space-y-2.5">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-3 block">
                        Adesão nos últimos 7 dias:
                      </span>
                      
                      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 max-w-sm">
                        {last7Days.map(({ dateStr, dayLetter, formattedDate }) => {
                          const isDone = completedDates.has(dateStr);
                          return (
                            <div key={dateStr} className="flex flex-col items-center gap-1">
                              <span className="text-[10px] font-mono font-bold text-ink-3">{dayLetter}</span>
                              <div 
                                title={`${formattedDate}: ${isDone ? 'Concluído' : 'Pendente'}`}
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center border transition-all text-xs font-bold ${
                                  isDone 
                                    ? 'bg-emerald-500 border-emerald-600 text-white shadow-xs' 
                                    : 'bg-bg border-line text-ink-3/30'
                                }`}
                              >
                                {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : ''}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {habitos.length === 0 && !showAddForm && (
          <div className="py-12 bg-surface rounded-[18px] border border-dashed border-line flex flex-col items-center justify-center text-center p-6 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-bg border border-line flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-[#F26A1B] opacity-50" />
            </div>
            <span className="font-display font-medium text-sm text-ink mb-1">Nenhum hábito cadastrado</span>
            <p className="text-xs text-ink-3 max-w-sm leading-relaxed">
              Clique em "Novo hábito" acima para definir as metas diárias deste aluno.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
