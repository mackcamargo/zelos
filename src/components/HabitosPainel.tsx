import React, { useState, useEffect } from 'react';
import { dbService, isSupabaseConfigured, supabase } from '../lib/supabase';
import { Habito } from '../types';
import { 
  CheckCircle2, Circle, Flame, 
  Trophy, Loader2, Sparkles,
  Zap, Droplet, Utensils, Moon, Footprints, Activity, PhoneOff, Sun
} from 'lucide-react';
import { motion } from 'motion/react';

interface HabitosPainelProps {
  alunoId: string;
  onHabitComplete?: () => Promise<void>;
}

const renderHabitoIcon = (icone: string, colorClass: string = "text-ink-2") => {
  const iconProps = { className: `w-5 h-5 ${colorClass} stroke-[1.5]` };
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
          // Demo fallback
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
    
    // Check current day
    const currentStr = current.toISOString().slice(0, 10);
    if (dates.has(currentStr)) {
      streak++;
    }
    
    // Check previous days
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
        // Fallback for demo mode
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
      // Revert on error
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
      <div className="flex justify-center py-12 bg-surface border border-line rounded-xl p-6">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full bg-surface border border-line rounded-xl p-4 sm:p-6 space-y-6 overflow-hidden relative group">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />

      <div className="flex items-center justify-between relative z-10">
        <div>
          <h3 className="font-semibold text-lg text-ink">Hábitos de hoje</h3>
          <p className="text-[12px] text-ink-3 mt-0.5">
            Mantenha sua disciplina diária
          </p>
        </div>
      </div>

      {totalHabitos === 0 ? (
        <div className="py-6 flex flex-col items-center justify-center text-center">
          <Sparkles className="w-8 h-8 text-ink-3 opacity-20 mb-2" />
          <p className="text-sm text-ink-3">Seu personal ainda não definiu hábitos.</p>
        </div>
      ) : (
        <>
          {/* Progress Bar */}
          <div className="space-y-2 relative z-10">
            <div className="flex justify-between text-[12px] text-ink-3 num">
              <span>Progresso diário</span>
              <span>{concluidoHoje} de {totalHabitos} concluídos hoje</span>
            </div>
            <div className="h-2 bg-bg rounded-full overflow-hidden border border-line">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                className="h-full bg-accent"
              />
            </div>
          </div>

          {/* Habits List */}
          <div className="grid grid-cols-1 gap-2 relative z-10">
            {habitos.map((h) => {
              const registros = h.habitos_registros || h.registros || [];
              const isDone = registros.some(r => r.data === hoje && r.concluido);
              const streak = getHabitStreak(h, hoje);
              
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => handleToggleHabito(h, !!isDone)}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-all duration-300 text-left cursor-pointer ${
                    isDone 
                      ? 'bg-green-500/5 border-green-500/10' 
                      : 'bg-raise border-line hover:border-line-strong'
                  }`}
                >
                  <div className="shrink-0 bg-surface w-9 h-9 rounded-lg border border-line flex items-center justify-center">
                    {renderHabitoIcon(h.icone || '⚡', isDone ? 'text-green-500' : 'text-accent')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <p className={`text-sm font-semibold truncate ${isDone ? 'line-through text-ink-3' : 'text-ink'}`}>
                        {h.nome}
                      </p>
                      {streak >= 2 && (
                        <span className="text-[10px] font-semibold text-accent ml-2 bg-accent/10 px-1.5 py-0.5 rounded flex items-center shrink-0 num gap-0.5">
                          <Flame className="w-3 h-3 text-accent" /> {streak} dias
                        </span>
                      )}
                    </div>
                    {h.meta_diaria && (
                      <p className="text-[12px] text-ink-3 truncate mt-0.5 num">{h.meta_diaria}</p>
                    )}
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${
                    isDone 
                      ? 'bg-green-500 text-white shadow-sm shadow-green-500/20' 
                      : 'bg-bg border border-line text-ink-3'
                  }`}>
                    {isDone ? <CheckCircle2 className="w-5 h-5 text-white" /> : <Circle className="w-5 h-5" />}
                  </div>
                </button>
              );
            })}
          </div>

          {concluidoHoje === totalHabitos && totalHabitos > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-500/5 border border-green-500/10 p-4 rounded-lg flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4 text-void" />
              </div>
              <p className="text-xs text-green-500 font-semibold">
                Sensacional! Você completou todos os hábitos de hoje.
              </p>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
