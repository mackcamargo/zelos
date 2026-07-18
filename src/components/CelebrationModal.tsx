import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Dumbbell, X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CelebrationModalProps {
  type: 'pr' | 'conquista';
  title: string;
  subtitle: string;
  icon?: string;
  onClose: () => void;
}

export default function CelebrationModal({ type, title, subtitle, onClose }: CelebrationModalProps) {
  useEffect(() => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-sm bg-surface border border-line rounded-xl p-8 text-center relative overflow-hidden shadow-2xl"
      >
        {/* Animated background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#F26A1B]/5 blur-[80px] rounded-full animate-pulse pointer-events-none" />

        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-raise rounded-full text-ink-3 transition-colors z-20 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative z-10 space-y-6">
          <div className="flex justify-center">
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className={`w-20 h-20 rounded-lg flex items-center justify-center border ${
                type === 'pr' ? 'bg-raise border-line-strong' : 'bg-[#F26A1B]/5 border-[#F26A1B]/10'
              }`}
            >
              {type === 'pr' ? (
                <Dumbbell className="w-10 h-10 text-[#F26A1B]" />
              ) : (
                <Trophy className="w-10 h-10 text-[#F26A1B]" />
              )}
            </motion.div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <span className={`text-[11px] font-mono font-semibold uppercase tracking-widest ${
                type === 'pr' ? 'text-[#F26A1B]' : 'text-ink-2'
              }`}>
                {type === 'pr' ? 'Novo Recorde' : 'Conquista Desbloqueada'}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-ink leading-tight">
              {title}
            </h2>
            <p className="text-sm text-ink-3 leading-relaxed max-w-[220px] mx-auto">
              {subtitle}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3.5 bg-[#F26A1B] text-ink rounded-lg font-semibold text-sm hover:opacity-90 transition-all"
          >
            SENSACIONAL
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
