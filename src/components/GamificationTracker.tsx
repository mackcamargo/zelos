import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { dbService, isSupabaseConfigured, supabase } from '../lib/supabase';
import { Conquista, AlunoConquista, RecordePessoal } from '../types';
import CelebrationModal from './CelebrationModal';
import { AnimatePresence } from 'motion/react';

interface GamificationContextType {
  checkPR: (exercicioId: number, exercicioNome: string, cargaKg: number) => Promise<boolean>;
  checkAchievements: (context: 'workout' | 'checkin' | 'habit') => Promise<void>;
  streak: number;
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export function useGamification() {
  const context = useContext(GamificationContext);
  if (!context) throw new Error('useGamification must be used within a GamificationProvider');
  return context;
}

export default function GamificationProvider({ alunoId, children }: { alunoId: string, children: React.ReactNode }) {
  const [celebration, setCelebration] = useState<{
    type: 'pr' | 'conquista';
    title: string;
    subtitle: string;
    icon?: string;
  } | null>(null);

  const [streak, setStreak] = useState(0);

  useEffect(() => {
    loadStreak();
  }, [alunoId]);

  const loadStreak = async () => {
    try {
      let habits: any[] = [];
      let registrations: any[] = [];

      if (isSupabaseConfigured && supabase) {
        const { data: hData } = await supabase.from("habitos").select("id").eq("aluno_id", alunoId).eq("ativo", true);
        const { data: rData } = await supabase.from("habitos_registros").select("data, habito_id, concluido").eq("aluno_id", alunoId);
        habits = hData || [];
        registrations = rData || [];
      } else {
        const hMock = JSON.parse(localStorage.getItem('zenite_mock_habitos') || '[]');
        habits = hMock.filter((h: any) => h.aluno_id === alunoId && h.ativo);
        registrations = JSON.parse(localStorage.getItem('zenite_habitos_registros') || '[]');
        registrations = registrations.filter((r: any) => r.aluno_id === alunoId);
      }

      if (habits.length === 0) {
        setStreak(0);
        return;
      }

      const activeHabitIds = habits.map(h => h.id);
      
      const isDayComplete = (dateStr: string) => {
        const dayRegs = registrations.filter(r => r.data === dateStr && r.concluido);
        const completedIds = dayRegs.map(r => r.habito_id);
        return activeHabitIds.every(id => completedIds.includes(id));
      };

      const today = new Date().toISOString().slice(0, 10);
      let currentStreak = 0;
      let checkDate = new Date();
      
      // Start checking from today
      const todayStr = checkDate.toISOString().slice(0, 10);
      const isTodayComplete = isDayComplete(todayStr);
      
      if (isTodayComplete) {
        currentStreak++;
        // Go back from yesterday
        checkDate.setDate(checkDate.getDate() - 1);
        while (true) {
          const dStr = checkDate.toISOString().slice(0, 10);
          if (isDayComplete(dStr)) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      } else {
        // Today not complete, check if yesterday was
        checkDate.setDate(checkDate.getDate() - 1);
        const yesterdayStr = checkDate.toISOString().slice(0, 10);
        if (isDayComplete(yesterdayStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
          while (true) {
            const dStr = checkDate.toISOString().slice(0, 10);
            if (isDayComplete(dStr)) {
              currentStreak++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else {
              break;
            }
          }
        }
      }

      setStreak(currentStreak);
      localStorage.setItem(`zenite_mock_streak_${alunoId}`, currentStreak.toString());
    } catch (err) {
      console.error("Erro ao calcular streak real:", err);
    }
  };

  const checkPR = useCallback(async (exercicioId: number, exercicioNome: string, cargaKg: number) => {
    if (!cargaKg || cargaKg <= 0) return false;
    
    const { isNewPR, data } = await dbService.checkAndSavePR(alunoId, exercicioId as any, exercicioNome as any, cargaKg as any);
    
    if (isNewPR && data) {
      setCelebration({
        type: 'pr',
        title: `${exercicioNome} — ${cargaKg} kg`,
        subtitle: 'Você bateu seu recorde pessoal neste exercício! Continue superando seus limites.',
        icon: '💪'
      });

      // Check for PR-related achievements
      const { data: prs } = await dbService.getRecordesPessoais(alunoId);
      if (prs?.length === 1) {
        await unlockBadge('primeiro_pr');
      } else if (prs?.length === 5) {
        await unlockBadge('pr_5');
      }

      return true;
    }
    return false;
  }, [alunoId]);

  const unlockBadge = async (slug: string) => {
    const { data, error } = await dbService.desbloquearConquista(alunoId, slug);
    if (data && !error) {
      setCelebration({
        type: 'conquista',
        title: data.conquista?.nome || 'Nova Conquista!',
        subtitle: data.conquista?.descricao || 'Você desbloqueou um novo badge.',
        icon: data.conquista?.icone
      });
    }
  };

  const checkAchievements = useCallback(async (context: 'workout' | 'checkin' | 'habit') => {
    if (context === 'workout') {
      // Logic for workout achievements
      const workouts = JSON.parse(localStorage.getItem('zenite_mock_treinos_concluidos') || '[]');
      const alunoWorkouts = workouts.filter((w: any) => w.aluno_id === alunoId);
      
      if (alunoWorkouts.length === 1) {
        await unlockBadge('primeiro_treino');
      }

      // Streak logic
      const key = `zenite_mock_streak_${alunoId}`;
      const s = parseInt(localStorage.getItem(key) || '0') + 1;
      localStorage.setItem(key, s.toString());
      setStreak(s);

      if (s === 3) await unlockBadge('sequencia_3');
      if (s === 7) await unlockBadge('sequencia_7');

      // 100 sets logic
      const setsCount = parseInt(localStorage.getItem(`zenite_mock_sets_count_${alunoId}`) || '0');
      if (setsCount >= 100) await unlockBadge('100_series');
    }

    if (context === 'checkin') {
      const checkins = JSON.parse(localStorage.getItem('zenite_mock_checkins') || '[]');
      const alunoCheckins = checkins.filter((c: any) => c.aluno_id === alunoId);
      if (alunoCheckins.length >= 4) {
        await unlockBadge('check_in_4');
      }
    }

    if (context === 'habit') {
      // Habit streak logic
      await unlockBadge('habitos_7');
    }
  }, [alunoId]);

  return (
    <GamificationContext.Provider value={{ checkPR, checkAchievements, streak }}>
      {children}
      
      <AnimatePresence>
        {celebration && (
          <CelebrationModal
            type={celebration.type}
            title={celebration.title}
            subtitle={celebration.subtitle}
            icon={celebration.icon}
            onClose={() => setCelebration(null)}
          />
        )}
      </AnimatePresence>
    </GamificationContext.Provider>
  );
}
