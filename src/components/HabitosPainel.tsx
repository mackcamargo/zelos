import React, { useState, useEffect } from 'react';
import { dbService } from '../lib/supabase';
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
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadHabitos();
  }, [alunoId]);

  const loadHabitos = async () => {
    setLoading(true);
    try {
      const { data } = await dbService.getHabitos(alunoId);
      if (data) setHabitos(data);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleHabito = async (habitoId: number, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    // Optimistic update
    setHabitos(prev => prev.map(h => {
      if (h.id === habitoId) {
        const registros = [...(h.registros || [])];
        const idx = registros.findIndex(r => r.data === today);
        if (idx >= 0) {
          registros[idx] = { ...registros[idx], concluido: newStatus };
        } else {
          registros.push({ id: 0, habito_id: habitoId, aluno_id: alunoId, data: today, concluido: newStatus });
        }
        return { ...h, registros };
      }
      return h;
    }));

    await dbService.toggleHabitoRegistro(habitoId, alunoId, today, newStatus);
    
    if (newStatus) {
      const allDone = habitos.every(h => {
        if (h.id === habitoId) return true;
        return h.registros?.some(r => r.data === today && r.concluido);
      });
      if (allDone && onHabitComplete) {
        await onHabitComplete();
      }
    }
  };

  const concluidoHoje = habitos.filter(h => 
    h.registros?.some(r => r.data === today && r.concluido)
  ).length;
  
  const totalHabitos = habitos.length;
  const progressPercent = totalHabitos > 0 ? (concluidoHoje / totalHabitos) * 100 : 0;

  // Calculate streak (simplified)
  const calculateStreak = () => {
    if (habitos.length === 0) return 0;
    let streak = 0;
    let checkDate = new Date();
    
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      const allDone = habitos.every(h => 
        h.registros?.some(r => r.data === dateStr && r.concluido)
      );
      
      if (allDone) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const streak = calculateStreak();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 text-flame animate-spin" />
      </div>
    );
  }

  if (habitos.length === 0) return null;

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
        
        {streak > 0 && (
          <div className="flex items-center gap-2 bg-flame/10 px-3 py-1.5 rounded-xl border border-flame/20 shadow-[0_0_20px_rgba(245,51,79,0.1)]">
            <Flame className="w-4 h-4 text-flame animate-pulse" />
            <span className="text-xs font-mono font-bold text-flame">🔥 {streak} DIAS</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2 relative z-10">
        <div className="flex justify-between text-[10px] font-mono text-ink-3">
          <span>Progresso Diário</span>
          <span>{concluidoHoje} de {totalHabitos} concluídos</span>
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
          const isDone = h.registros?.some(r => r.data === today && r.concluido);
          
          return (
            <button
              key={h.id}
              onClick={() => handleToggleHabito(h.id, !!isDone)}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${
                isDone 
                  ? 'bg-flame/10 border-flame/20' 
                  : 'bg-surface-3 border-white/5 hover:border-white/10'
              }`}
            >
              <span className="text-2xl">{h.icone}</span>
              <div className="flex-1 text-left min-w-0">
                <p className={`text-sm font-bold truncate ${isDone ? 'text-flame' : 'text-ink'}`}>
                  {h.nome}
                </p>
                {h.meta_diaria && (
                  <p className="text-[10px] text-ink-3 font-mono truncate">{h.meta_diaria}</p>
                )}
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                isDone 
                  ? 'bg-flame text-white shadow-lg' 
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
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4 text-white" />
          </div>
          <p className="text-xs text-emerald-400 font-medium">
            Sensacional! Você completou todos os hábitos de hoje.
          </p>
        </motion.div>
      )}
    </div>
  );
}
