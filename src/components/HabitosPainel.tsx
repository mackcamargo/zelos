import React, { useState, useEffect } from 'react';
import { dbService, isSupabaseConfigured, supabase } from '../lib/supabase';
import { Habito, HabitoRegistro } from '../types';
import { 
  CheckCircle2, Circle, Flame, 
  Trophy, TrendingUp, Loader2, Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';

interface HabitosPainelProps {
  alunoId: string;
  onHabitComplete?: () => Promise<void>;
}

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
          const { data, error } = await supabase.from("habitos")
            .select("*, habitos_registros(concluido, data)")
            .eq("aluno_id", user.id)
            .eq("ativo", true);
          
          if (data) {
            setHabitos(data);
          }
        }
      } else {
        const { data } = await dbService.getHabitos(alunoId);
        if (data) setHabitos(data);
      }
    } catch (err) {
      console.error("Erro ao carregar hábitos do aluno:", err);
    } finally {
      setLoading(false);
    }
  };

  const getHabitStreak = (h: any, hojeStr: string) => {
    const registros = h.habitos_registros || h.registros || [];
    const [a, m, d] = hojeStr.split("-").map(Number);
    
    const isDoneOnDate = (dateStr: string) => {
      return registros.some((r: any) => r.data === dateStr && r.concluido);
    };

    let streak = 0;
    
    const todayDone = isDoneOnDate(hojeStr);
    const yesterdayDate = new Date(a, m - 1, d - 1);
    const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);
    const yesterdayDone = isDoneOnDate(yesterdayStr);
    
    if (!todayDone && !yesterdayDone) {
      return 0;
    }
    
    let daysAgo = todayDone ? 0 : 1;
    
    while (true) {
      const checkDate = new Date(a, m - 1, d - daysAgo);
      const checkStr = checkDate.toISOString().slice(0, 10);
      if (isDoneOnDate(checkStr)) {
        streak = (Number(streak) || 0) + 1;
        daysAgo = (Number(daysAgo) || 0) + 1;
      } else {
        break;
      }
    }
    
    return Number(streak) || 0;
  };

  const handleToggleHabito = async (h: Habito, currentStatus: boolean) => {
    const novoValor = !currentStatus;
    
    // Optimistic update
    setHabitos(prev => prev.map(item => {
      if (item.id === h.id) {
        const registros = [...(item.habitos_registros || item.registros || [])];
        const idx = registros.findIndex(r => r.data === hoje);
        if (idx >= 0) {
          registros[idx] = { ...registros[idx], concluido: novoValor };
        } else {
          registros.push({ id: 0, habito_id: h.id, aluno_id: alunoId, data: hoje, concluido: novoValor });
        }
        // update both keys for safety
        return { ...item, habitos_registros: registros, registros };
      }
      return item;
    }));

    try {
      if (isSupabaseConfigured && supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from("habitos_registros").upsert(
          { habito_id: h.id, aluno_id: user.id, data: hoje, concluido: novoValor },
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
      <div className="flex justify-center py-12 bg-surface-2 border border-white/5 rounded-3xl p-6">
        <Loader2 className="w-6 h-6 text-flame animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full bg-surface-2 border border-white/5 rounded-3xl p-6 space-y-6 overflow-hidden relative group">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-flame/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />

      <div className="flex items-center justify-between relative z-10">
        <div>
          <h3 className="font-display font-bold text-lg text-ink">Hábitos de Hoje</h3>
          <p className="text-[10px] font-mono text-ink-3 uppercase tracking-wider mt-0.5">
            Mantenha sua disciplina
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
            <div className="flex justify-between text-[10px] font-mono text-ink-3">
              <span>Progresso Diário</span>
              <span>{concluidoHoje} de {totalHabitos} concluídos hoje</span>
            </div>
            <div className="h-2 bg-void rounded-full overflow-hidden border border-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                className="h-full brand-gradient-bg shadow-[0_0_15px_rgba(245,51,79,0.3)]"
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
                  onClick={() => handleToggleHabito(h, !!isDone)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 text-left cursor-pointer ${
                    isDone 
                      ? 'bg-emerald-500/5 border-emerald-500/10' 
                      : 'bg-surface-3 border-white/5 hover:border-white/10'
                  }`}
                >
                  <span className="text-2xl shrink-0">{h.icone || '⚡'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <p className={`text-sm font-bold truncate ${isDone ? 'line-through text-ink-3' : 'text-ink'}`}>
                        {h.nome}
                      </p>
                      {streak >= 2 && (
                        <span className="text-[10px] font-mono font-bold text-[#F26A1B] ml-2 bg-[#F26A1B]/10 px-1.5 py-0.5 rounded-md flex items-center shrink-0">
                          🔥 {streak} dias
                        </span>
                      )}
                    </div>
                    {h.meta_diaria && (
                      <p className="text-[10px] text-ink-3 font-mono truncate mt-0.5">{h.meta_diaria}</p>
                    )}
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${
                    isDone 
                      ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]' 
                      : 'bg-void border border-white/10 text-ink-3'
                  }`}>
                    {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                  </div>
                </button>
              );
            })}
          </div>

          {concluidoHoje === totalHabitos && totalHabitos > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg">
                <Trophy className="w-4 h-4 text-white" />
              </div>
              <p className="text-xs text-emerald-400 font-medium">
                Sensacional! Você completou todos os hábitos de hoje.
              </p>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
