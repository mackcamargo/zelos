import React, { useState, useEffect } from 'react';
import { dbService, isSupabaseConfigured, supabase } from '../lib/supabase';
import { Habito } from '../types';
import { 
  CheckCircle2, Circle, Flame, 
  Trophy, Loader2, Sparkles, Check,
  Zap, Droplet, Utensils, Moon, Footprints, Activity, PhoneOff, Sun
} from 'lucide-react';
import { motion } from 'motion/react';

interface HabitosPainelProps {
  alunoId: string;
  onHabitComplete?: () => Promise<void>;
}

const renderHabitoIcon = (icone: string, colorClass: string = "text-ink-2") => {
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

export default function HabitosPainel({ alunoId, onHabitComplete }: HabitosPainelProps) {
  const [habitos, setHabitos] = useState<Habito[]>([]);
  const [loading, setLoading] = useState(true);
  const hoje = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    loadHabitos();
  }, [alunoId]);

  const loadHabitos = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data: userResponse } = await supabase.auth.getUser();
        const user = userResponse?.user;
        if (user) {
          const { data } = await dbService.getHabitos(alunoId);
          setHabitos(data || []);
        } else {
          loadDemoHabitos();
        }
      } else {
        loadDemoHabitos();
      }
    } catch (err) {
      console.error("Erro ao carregar hábitos:", err);
      loadDemoHabitos();
    } finally {
      setLoading(false);
    }
  };

  const loadDemoHabitos = () => {
    const localHabitos = JSON.parse(localStorage.getItem('zenite_habitos') || '[]');
    const localRegistros = JSON.parse(localStorage.getItem('zenite_habitos_registros') || '[]');
    
    const filteredHabitos = localHabitos.filter((h: any) => h.aluno_id === alunoId);
    const mapped = filteredHabitos.map((h: any) => ({
      ...h,
      habitos_registros: localRegistros.filter((r: any) => r.habito_id === h.id)
    }));
    setHabitos(mapped);
  };

  const getHabitStreak = (h: Habito, baseData: string): number => {
    const registros = h.habitos_registros || h.registros || [];
    const dates = new Set(registros.filter(r => r.concluido).map(r => r.data));
    let streak = 0;
    const current = new Date(baseData);
    
    const currentStr = current.toISOString().slice(0, 10);
    if (dates.has(currentStr)) {
      streak++;
    }
    
    while (true) {
      current.setDate(current.getDate() - 1);
      const prevStr = current.toISOString().slice(0, 10);
      if (dates.has(prevStr)) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const handleToggleHabito = async (h: Habito, currentlyDone: boolean) => {
    const novoValor = !currentlyDone;
    
    // Optimistic UI
    setHabitos(prev => prev.map(item => {
      if (item.id === h.id) {
        const regs = item.habitos_registros || item.registros || [];
        const existingIdx = regs.findIndex(r => r.data === hoje);
        let updatedRegs = [...regs];
        if (existingIdx >= 0) {
          updatedRegs[existingIdx] = { ...updatedRegs[existingIdx], concluido: novoValor };
        } else {
          updatedRegs.push({ id: Math.random(), habito_id: h.id, aluno_id: alunoId, data: hoje, concluido: novoValor });
        }
        return { ...item, habitos_registros: updatedRegs, registros: updatedRegs };
      }
      return item;
    }));

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('habitos_registros').upsert(
          {
            habito_id: h.id,
            aluno_id: alunoId,
            data: hoje,
            concluido: novoValor
          },
          { onConflict: "habito_id,aluno_id,data" }
        );
        if (error) throw error;
      } else {
        const registrosMock = JSON.parse(localStorage.getItem('zenite_habitos_registros') || '[]');
        const idx = registrosMock.findIndex((r: any) => r.habito_id === h.id && r.data === hoje && r.aluno_id === alunoId);
        if (idx >= 0) {
          registrosMock[idx].concluido = novoValor;
        } else {
          registrosMock.push({
            id: Math.floor(Math.random() * 1000000),
            habito_id: h.id,
            aluno_id: alunoId,
            data: hoje,
            concluido: novoValor
          });
        }
        localStorage.setItem('zenite_habitos_registros', JSON.stringify(registrosMock));
      }
      
      if (novoValor && onHabitComplete) {
        await onHabitComplete();
      }
    } catch (err) {
      console.error("Erro ao salvar registro de hábito:", err);
      loadHabitos();
    }
  };

  const totalHabitos = Number(habitos.length) || 0;
  const concluidoHoje = Number(habitos.filter(h => {
    const registros = h.habitos_registros || h.registros || [];
    return registros.some(r => r.data === hoje && r.concluido);
  }).length) || 0;
  
  const progressPercent = totalHabitos > 0 ? (concluidoHoje / totalHabitos) * 100 : 0;

  if (loading) {
    return (
      <div className="flex justify-center py-12 bg-surface border border-line rounded-[18px] p-6 shadow-xs">
        <Loader2 className="w-6 h-6 text-[#F26A1B] animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full bg-surface border border-line rounded-[18px] p-4 sm:p-6 space-y-5 overflow-hidden relative shadow-[0_1px_2px_rgba(20,20,20,0.04),0_4px_12px_rgba(20,20,20,0.06)]">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#F26A1B]/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />

      <div className="flex items-center justify-between relative z-10">
        <div>
          <h3 className="font-display font-bold text-lg text-ink">Hábitos de hoje</h3>
          <p className="text-xs text-ink-3 mt-0.5">
            Mantenha sua disciplina diária
          </p>
        </div>
      </div>

      {totalHabitos === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-bg border border-line flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6 text-[#F26A1B] opacity-50" />
          </div>
          <p className="text-xs text-ink-3">Seu personal ainda não definiu hábitos.</p>
        </div>
      ) : (
        <>
          {/* Progress Bar */}
          <div className="space-y-2 relative z-10">
            <div className="flex justify-between text-xs text-ink-3 font-mono">
              <span>Progresso diário</span>
              <span className="font-bold text-ink">{concluidoHoje} de {totalHabitos} concluídos</span>
            </div>
            <div className="h-2.5 bg-bg rounded-full overflow-hidden border border-line-soft">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                className="h-full bg-[#F26A1B] transition-all duration-300"
              />
            </div>
          </div>

          {/* Habits List */}
          <div className="grid grid-cols-1 gap-2.5 relative z-10">
            {habitos.map((h) => {
              const registros = h.habitos_registros || h.registros || [];
              const isDone = registros.some(r => r.data === hoje && r.concluido);
              const streak = getHabitStreak(h, hoje);
              
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => handleToggleHabito(h, !!isDone)}
                  className={`flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 text-left cursor-pointer group ${
                    isDone 
                      ? 'bg-emerald-500/5 border-emerald-500/20' 
                      : 'bg-bg border-line hover:border-line-strong'
                  }`}
                >
                  <div className={`shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center transition-colors ${
                    isDone ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-surface border-line'
                  }`}>
                    {renderHabitoIcon(h.icone || '⚡', isDone ? 'text-emerald-600' : 'text-[#F26A1B]')}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-xs sm:text-sm font-display font-bold truncate ${isDone ? 'line-through text-ink-3' : 'text-ink'}`}>
                        {h.nome}
                      </p>
                      {streak >= 2 && (
                        <span className="text-[10px] font-mono font-bold text-[#F26A1B] bg-[#F26A1B]/10 border border-[#F26A1B]/20 px-2 py-0.5 rounded-full flex items-center shrink-0 gap-1">
                          <Flame className="w-3 h-3 text-[#F26A1B]" /> {streak} dias
                        </span>
                      )}
                    </div>
                    {h.meta_diaria && (
                      <p className="text-[11px] font-mono text-ink-3 truncate mt-0.5">Meta: {h.meta_diaria}</p>
                    )}
                  </div>

                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                    isDone 
                      ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20' 
                      : 'bg-surface border border-line text-ink-3/40 group-hover:border-line-strong'
                  }`}>
                    {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : <Circle className="w-4 h-4" />}
                  </div>
                </button>
              );
            })}
          </div>

          {concluidoHoje === totalHabitos && totalHabitos > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 text-white shadow-sm">
                <Trophy className="w-4 h-4" />
              </div>
              <p className="text-xs text-emerald-700 font-medium">
                Sensacional! Você completou todos os hábitos do dia.
              </p>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
