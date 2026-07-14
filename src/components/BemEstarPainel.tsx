import React, { useState, useEffect } from 'react';
import { 
  Heart, Wind, Moon, History, Sparkles, 
  Loader2, ChevronRight, TrendingUp, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService } from '../lib/supabase';
import { SessaoBemEstar } from '../types';
import RespiracaoGuiada from './RespiracaoGuiada';
import MeditacaoTimer from './MeditacaoTimer';

interface BemEstarPainelProps {
  alunoId: string;
}

export default function BemEstarPainel({ alunoId }: BemEstarPainelProps) {
  const [loading, setLoading] = useState(true);
  const [sessoes, setSessoes] = useState<SessaoBemEstar[]>([]);
  const [activeExercise, setActiveExercise] = useState<'respiracao' | 'meditacao' | null>(null);

  useEffect(() => {
    loadData();
  }, [alunoId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await dbService.getSessoesBemEstar(alunoId);
      setSessoes(data || []);
    } finally {
      setLoading(false);
    }
  };

  const calculateStreak = () => {
    if (sessoes.length === 0) return 0;
    
    const dates = [...new Set(sessoes.map(s => s.data as string))].sort().reverse();
    let streak = 0;
    let current = new Date();
    current.setHours(0, 0, 0, 0);

    for (const dateStr of dates) {
      const [y, m, d] = (dateStr as string).split("-").map(Number);
      const date = new Date(y, m - 1, d);
      date.setHours(24, 0, 0, 0); // Normalize to end of day to match current comparison logic
      const diff = Math.floor((current.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diff <= 1) {
        streak++;
        const [cy, cm, cd] = (dateStr as string).split("-").map(Number);
        current = new Date(cy, cm - 1, cd);
        current.setHours(0, 0, 0, 0);
      } else {
        break;
      }
    }
    return streak;
  };

  const totalMinutes = sessoes.reduce((acc, curr) => acc + curr.duracao_minutos, 0);
  const streak = calculateStreak();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 text-flame animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
      {/* STATS HEADER */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface-2 border border-white/5 rounded-3xl p-6 flex flex-col items-center text-center space-y-2">
          <div className="p-3 bg-flame/10 rounded-2xl">
            <TrendingUp className="w-5 h-5 text-flame" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-ink-3 uppercase tracking-widest">Tempo Total</p>
            <p className="text-2xl font-mono font-black text-ink">{totalMinutes}<span className="text-xs font-normal"> min</span></p>
          </div>
        </div>
        <div className="bg-surface-2 border border-white/5 rounded-3xl p-6 flex flex-col items-center text-center space-y-2">
          <div className="p-3 bg-violet/10 rounded-2xl">
            <Award className="w-5 h-5 text-violet" />
          </div>
          <div>
            <p className="text-[10px] font-mono text-ink-3 uppercase tracking-widest">Streak Atual</p>
            <p className="text-2xl font-mono font-black text-ink">{streak}<span className="text-xs font-normal"> dias</span></p>
          </div>
        </div>
      </div>

      {/* EXERCISES */}
      <div className="space-y-6">
        <h3 className="font-display font-bold text-ink flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-flame" />
          Sessões Sugeridas
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
            onClick={() => setActiveExercise('respiracao')}
            className="group relative bg-surface-2 border border-white/5 rounded-[40px] p-8 text-left overflow-hidden transition-all hover:bg-surface-3 hover:border-flame/30"
          >
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-flame/5 blur-[60px] group-hover:bg-flame/10 transition-all" />
            <div className="relative z-10 space-y-4">
              <div className="w-16 h-16 bg-flame/10 rounded-3xl flex items-center justify-center">
                <Wind className="w-8 h-8 text-flame" />
              </div>
              <div>
                <h4 className="text-xl font-display font-bold text-ink">Respiração Guiada</h4>
                <p className="text-xs text-ink-3 font-mono mt-1 uppercase tracking-widest">Técnica de Box Breathing</p>
              </div>
              <div className="flex items-center gap-2 text-flame text-[10px] font-bold uppercase tracking-widest">
                Praticar agora <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </button>

          <button 
            onClick={() => setActiveExercise('meditacao')}
            className="group relative bg-surface-2 border border-white/5 rounded-[40px] p-8 text-left overflow-hidden transition-all hover:bg-surface-3 hover:border-violet/30"
          >
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-violet/5 blur-[60px] group-hover:bg-violet/10 transition-all" />
            <div className="relative z-10 space-y-4">
              <div className="w-16 h-16 bg-violet/10 rounded-3xl flex items-center justify-center">
                <Moon className="w-8 h-8 text-violet" />
              </div>
              <div>
                <h4 className="text-xl font-display font-bold text-ink">Meditação Livre</h4>
                <p className="text-xs text-ink-3 font-mono mt-1 uppercase tracking-widest">Timer com Sinos Virtuais</p>
              </div>
              <div className="flex items-center gap-2 text-violet text-[10px] font-bold uppercase tracking-widest">
                Iniciar sessão <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* RECENT HISTORY */}
      <div className="space-y-6">
        <h3 className="font-display font-bold text-ink flex items-center gap-2">
          <History className="w-5 h-5 text-ink-3" />
          Atividade Recente
        </h3>

        <div className="space-y-3">
          {sessoes.slice().reverse().map((sessao) => (
            <div key={sessao.id} className="bg-surface-2 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl ${sessao.tipo === 'respiracao' ? 'bg-flame/10' : 'bg-violet/10'}`}>
                  {sessao.tipo === 'respiracao' ? <Wind className="w-4 h-4 text-flame" /> : <Moon className="w-4 h-4 text-violet" />}
                </div>
                <div>
                  <p className="text-xs text-ink font-bold uppercase tracking-widest">
                    {sessao.tipo === 'respiracao' ? 'Respiração' : 'Meditação'}
                  </p>
                  <p className="text-[10px] font-mono text-ink-3">{(() => {
                    const [y, m, d] = (sessao.data as string).split("-").map(Number);
                    return new Date(y, m - 1, d).toLocaleDateString();
                  })()}</p>
                </div>
              </div>
              <div className="text-sm font-mono font-bold text-ink">
                {sessao.duracao_minutos} min
              </div>
            </div>
          ))}
          {sessoes.length === 0 && (
            <p className="text-xs text-ink-3 text-center py-8">Nenhuma atividade registrada esta semana.</p>
          )}
        </div>
      </div>

      {/* EXERCISE MODALS */}
      <AnimatePresence>
        {activeExercise === 'respiracao' && (
          <RespiracaoGuiada 
            alunoId={alunoId}
            onClose={() => setActiveExercise(null)}
            onComplete={() => {
              setActiveExercise(null);
              loadData();
            }}
          />
        )}
        {activeExercise === 'meditacao' && (
          <MeditacaoTimer 
            alunoId={alunoId}
            onClose={() => setActiveExercise(null)}
            onComplete={() => {
              setActiveExercise(null);
              loadData();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
