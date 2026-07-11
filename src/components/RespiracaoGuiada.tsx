import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wind, X, Play, Loader2 } from 'lucide-react';
import { dbService } from '../lib/supabase';

interface RespiracaoGuiadaProps {
  alunoId: string;
  onClose: () => void;
  onComplete: () => void;
}

type Phase = 'inspire' | 'segure' | 'expire';

export default function RespiracaoGuiada({ alunoId, onClose, onComplete }: RespiracaoGuiadaProps) {
  const [duration, setDuration] = useState(1); // minutes
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<Phase>('inspire');
  const [timeLeft, setTimeLeft] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
        
        // Update phase every 4 seconds for box breathing (technically 4-4-4)
        // We'll use a cycle of 12 seconds
        const elapsed = (duration * 60) - (timeLeft - 1);
        const cyclePos = elapsed % 12;
        
        if (cyclePos < 4) setPhase('inspire');
        else if (cyclePos < 8) setPhase('segure');
        else setPhase('expire');

      }, 1000);
    } else if (isActive && timeLeft === 0) {
      handleComplete();
    }
    return () => clearInterval(timer);
  }, [isActive, timeLeft]);

  const handleStart = () => {
    setTimeLeft(duration * 60);
    setIsActive(true);
    setPhase('inspire');
  };

  const handleComplete = async () => {
    setIsActive(false);
    setSaving(true);
    try {
      await dbService.saveSessaoBemEstar({
        aluno_id: alunoId,
        tipo: 'respiracao',
        duracao_minutos: duration,
        data: new Date().toISOString().split('T')[0]
      });
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const getPhaseText = () => {
    switch (phase) {
      case 'inspire': return 'Inspire profundamente...';
      case 'segure': return 'Segure o ar...';
      case 'expire': return 'Solte devagar...';
    }
  };

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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-sm space-y-12 text-center"
          >
            <div className="space-y-4">
              <div className="w-20 h-20 bg-flame/10 rounded-full flex items-center justify-center mx-auto">
                <Wind className="w-10 h-10 text-flame" />
              </div>
              <h2 className="text-3xl font-display font-black text-ink uppercase italic tracking-tighter">
                Respiração <span className="text-flame">Guiada</span>
              </h2>
              <p className="text-ink-3 text-sm font-mono uppercase tracking-widest leading-relaxed">
                Técnica de 4 segundos para acalmar a mente e reduzir o estresse.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex justify-center gap-4">
                {[1, 3, 5].map(m => (
                  <button
                    key={m}
                    onClick={() => setDuration(m)}
                    className={`w-16 h-16 rounded-2xl font-mono font-bold text-sm transition-all border ${
                      duration === m 
                        ? 'bg-flame border-flame text-void shadow-[0_0_20px_rgba(245,51,79,0.3)]' 
                        : 'bg-surface-2 border-white/5 text-ink-3 hover:border-white/20'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>

              <button
                onClick={handleStart}
                className="w-full py-5 brand-gradient-bg rounded-[24px] font-display font-bold text-void uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all"
              >
                Começar Exercício
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
            <div className="relative flex items-center justify-center">
              {/* Pulsing circle */}
              <motion.div
                animate={{
                  scale: phase === 'inspire' ? 1.5 : phase === 'segure' ? 1.5 : 1,
                  opacity: phase === 'inspire' ? 0.8 : phase === 'segure' ? 1 : 0.6,
                }}
                transition={{ duration: 4, ease: "easeInOut" }}
                className="w-48 h-48 rounded-full brand-gradient-bg blur-md opacity-50"
              />
              <motion.div
                animate={{
                  scale: phase === 'inspire' ? 1.5 : phase === 'segure' ? 1.5 : 1,
                }}
                transition={{ duration: 4, ease: "easeInOut" }}
                className="absolute w-48 h-48 rounded-full border-2 border-flame/30"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-3xl font-black text-ink">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            <div className="text-center space-y-2">
              <motion.h3 
                key={phase}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-display font-bold text-ink italic"
              >
                {getPhaseText()}
              </motion.h3>
              <p className="text-ink-3 text-[10px] font-mono uppercase tracking-[0.3em]">Mantenha o foco na sua respiração</p>
            </div>

            <button 
              onClick={() => setIsActive(false)}
              className="px-8 py-3 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-ink-3 hover:text-flame transition-colors uppercase tracking-widest"
            >
              Interromper
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {saving && (
        <div className="fixed inset-0 z-[60] bg-void/80 backdrop-blur-sm flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-flame animate-spin" />
        </div>
      )}
    </div>
  );
}
