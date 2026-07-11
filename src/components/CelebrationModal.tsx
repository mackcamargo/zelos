import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Star, Zap, Flame, Award, X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CelebrationModalProps {
  type: 'pr' | 'conquista';
  title: string;
  subtitle: string;
  icon?: string;
  onClose: () => void;
}

export default function CelebrationModal({ type, title, subtitle, icon, onClose }: CelebrationModalProps) {
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-void/90 backdrop-blur-xl"
    >
      <motion.div
        initial={{ scale: 0.8, y: 50, rotate: -5 }}
        animate={{ scale: 1, y: 0, rotate: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="w-full max-w-sm bg-surface border border-white/10 rounded-[40px] p-8 text-center relative overflow-hidden shadow-[0_0_50px_rgba(245,51,79,0.2)]"
      >
        {/* Animated background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 brand-gradient-bg opacity-10 blur-[80px] rounded-full animate-pulse" />

        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full text-ink-3 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative z-10 space-y-6">
          <div className="flex justify-center">
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className={`w-24 h-24 rounded-3xl flex items-center justify-center text-5xl shadow-2xl ${
                type === 'pr' ? 'bg-amber-500/20 border border-amber-500/30' : 'brand-gradient-bg'
              }`}
            >
              {icon || (type === 'pr' ? '💪' : '🏆')}
            </motion.div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <span className={`text-[10px] font-mono font-black uppercase tracking-[0.3em] ${
                type === 'pr' ? 'text-amber-400' : 'text-flame'
              }`}>
                {type === 'pr' ? 'Novo Recorde' : 'Conquista Desbloqueada'}
              </span>
            </div>
            <h2 className="text-3xl font-display font-black text-ink leading-tight">
              {title}
            </h2>
            <p className="text-sm text-ink-2 leading-relaxed max-w-[200px] mx-auto">
              {subtitle}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-4 bg-white text-void rounded-2xl font-display font-black text-sm tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
          >
            SENSACIONAL!
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
