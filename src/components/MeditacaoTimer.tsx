import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Moon, X, Play, Loader2, Pause, RotateCcw } from 'lucide-react';
import { dbService } from '../lib/supabase';
import { playMeditationChime } from '../lib/audio';

interface MeditacaoTimerProps {
  alunoId: string;
  onClose: () => void;
  onComplete: () => void;
}

export default function MeditacaoTimer({ alunoId, onClose, onComplete }: MeditacaoTimerProps) {
  const [duration, setDuration] = useState(5); // minutes
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isActive && !isPaused && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      handleComplete();
    }
    return () => clearInterval(timer);
  }, [isActive, isPaused, timeLeft]);

  const handleStart = () => {
    setTimeLeft(duration * 60);
    setIsActive(true);
    setIsPaused(false);
  };

  const handleComplete = async () => {
    setIsActive(false);
    playMeditationChime();
    setSaving(true);
    try {
      await dbService.saveSessaoBemEstar({
        aluno_id: alunoId,
        tipo: 'meditacao',
        duracao_minutos: duration,
        data: new Date().toISOString().split('T')[0]
      });
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = isActive ? (1 - timeLeft / (duration * 60)) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-void flex flex-col items-center justify-center p-6">
      <button 
        onClick={onClose}
        className="absolute top-8 right-8 p-3 bg-white/5 rounded-full text-ink-3 hover:text-ink transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      <AnimatePresence mode="wait">
        {!isActive ? (
          <motion.div 
            key="setup"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="w-full max-w-sm space-y-12 text-center"
          >
            <div className="space-y-4">
              <div className="w-20 h-20 bg-violet/10 rounded-full flex items-center justify-center mx-auto">
                <Moon className="w-10 h-10 text-violet" />
              </div>
              <h2 className="text-3xl font-display font-black text-ink uppercase italic tracking-tighter">
                Medita<span className="text-violet">ção</span>
              </h2>
              <p className="text-ink-3 text-sm font-mono uppercase tracking-widest leading-relaxed">
                Escolha o tempo ideal para sua jornada de silêncio e presença.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex justify-center gap-4">
                {[5, 10, 15].map(m => (
                  <button
                    key={m}
                    onClick={() => setDuration(m)}
                    className={`w-16 h-16 rounded-2xl font-mono font-bold text-sm transition-all border ${
                      duration === m 
                        ? 'bg-violet border-violet text-void shadow-[0_0_20px_rgba(139,92,246,0.3)]' 
                        : 'bg-surface-2 border-white/5 text-ink-3 hover:border-white/20'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>

              <button
                onClick={handleStart}
                className="w-full py-5 bg-violet rounded-[24px] font-display font-bold text-void uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all"
              >
                Iniciar Sessão
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center space-y-16"
          >
            <div className="relative w-64 h-64">
              {/* Progress Ring */}
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-white/5"
                />
                <motion.circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  stroke="#8B5CF6"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray="753.98"
                  initial={{ strokeDashoffset: 753.98 }}
                  animate={{ strokeDashoffset: 753.98 - (753.98 * progress) / 100 }}
                  transition={{ duration: 1, ease: "linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-5xl font-black text-ink tracking-tighter">
                  {formatTime(timeLeft)}
                </span>
                <span className="text-[10px] font-mono text-ink-3 uppercase tracking-widest mt-2">restantes</span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-ink hover:bg-white/10 transition-all"
              >
                {isPaused ? <Play className="w-8 h-8 ml-1" /> : <Pause className="w-8 h-8" />}
              </button>
              <button
                onClick={() => setIsActive(false)}
                className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-ink-3 hover:text-flame transition-all"
              >
                <RotateCcw className="w-6 h-6" />
              </button>
            </div>

            <p className="text-ink-3 text-[10px] font-mono uppercase tracking-[0.3em] animate-pulse">Esteja presente no agora</p>
          </motion.div>
        )}
      </AnimatePresence>

      {saving && (
        <div className="fixed inset-0 z-[60] bg-void/80 backdrop-blur-sm flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-violet animate-spin" />
        </div>
      )}
    </div>
  );
}
