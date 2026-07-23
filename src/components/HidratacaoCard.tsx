import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Droplets, Plus, Settings, Trash2, Loader2, CheckCircle2, Volume2, VolumeX } from 'lucide-react';
import { dbService, getHojeString } from '../lib/supabase';
import { tocar } from '../lib/som';

interface HidratacaoCardProps {
  alunoId: string;
}

export default function HidratacaoCard({ alunoId }: HidratacaoCardProps) {
  const [consumido, setConsumido] = useState<number>(0);
  const [displayConsumido, setDisplayConsumido] = useState<number>(0);
  const [meta, setMeta] = useState<number>(2000);
  const [percent, setPercent] = useState<number>(0);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [celebrate, setCelebrate] = useState<boolean>(false);
  const [showRain, setShowRain] = useState<boolean>(false);
  const [showRipple, setShowRipple] = useState<boolean>(false);
  const [historico, setHistorico] = useState<{ data: string; total: number }[]>([]);
  const [activeBarDate, setActiveBarDate] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches);
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  // Sound preference state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('zelos_hidratacao_som') !== 'false';
    } catch {
      return true;
    }
  });

  const today = getHojeString();

  useEffect(() => {
    if (alunoId) {
      loadData();
    }
  }, [alunoId]);

  // Count-up animation with requestAnimationFrame
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setDisplayConsumido(consumido);
      return;
    }

    let startTimestamp: number | null = null;
    const startValue = displayConsumido;
    const endValue = consumido;
    const duration = 500; // 500ms transition

    if (startValue === endValue) return;

    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out quadratic
      const easeProgress = progress * (2 - progress);
      const currentValue = Math.floor(easeProgress * (endValue - startValue) + startValue);
      setDisplayConsumido(currentValue);

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        setDisplayConsumido(endValue);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);
    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [consumido]);

  const loadData = async () => {
    if (!alunoId) return;
    try {
      setLoading(true);
      const hoje = getHojeString();

      // 1. Get current meta
      const metaRes = await dbService.getMetaHidratacao(alunoId);
      const metaAtual = metaRes.data || 2000;
      setMeta(metaAtual);

      // 2. Get today's consumption
      const consumoRes = await dbService.getHidratacaoHoje(alunoId, hoje);
      const totalHoje = consumoRes.data?.ml || 0;
      setConsumido(totalHoje);

      const p = Math.min((totalHoje / metaAtual) * 100, 100);
      setPercent(p);

      // 3. Get history
      const histRes = await dbService.getHistoricoHidratacao(alunoId);
      const histRows = histRes.data || [];

      // Build 7 days array
      const array7Dias = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dataStr = getHojeString(d);
        const match = histRows.find((r: any) => r.data === dataStr);
        array7Dias.push({
          data: dataStr,
          total: match ? Number(match.ml || match.total || 0) : 0,
        });
      }
      setHistorico(array7Dias);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Synthesized water-drop bubble sound using Web Audio API as fallback/accompaniment
  const playSynthWaterDrop = () => {
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Bloop sweep up frequency
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(1050, now + 0.1);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {
      // Ignore
    }
  };

  const playWaterSound = () => {
    if (!soundEnabled) return;
    try {
      // 1. Try to play standard /sounds/water.mp3 preloaded clipe
      const audio = new Audio('/sounds/water.mp3');
      audio.volume = 0.4;
      audio.play().catch(() => {
        // Fallback to high quality synthesized drop sound
        playSynthWaterDrop();
      });
    } catch (err) {
      playSynthWaterDrop();
    }
  };

  const triggerVibrate = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(30);
      } catch (e) {
        // Safe check
      }
    }
  };

  const handleAddWater = async (ml: number) => {
    if (!alunoId) return;

    try {
      // Sound & Haptic immediate feedback
      playWaterSound();
      triggerVibrate();

      setSaving(true);
      const hoje = getHojeString();
      const novoConsumo = consumido + ml;

      // Save using dbService API
      await dbService.saveRegistroHidratacao({
        aluno_id: alunoId,
        data: hoje,
        ml: novoConsumo
      });

      setConsumido(novoConsumo);
      const p = Math.min((novoConsumo / meta) * 100, 100);
      setPercent(p);

      // Check for celebration crossing 100% (Once per day)
      if (p >= 100 && percent < 100) {
        const keyCelebrated = `zelos_hidratacao_meta_${hoje}`;
        if (localStorage.getItem(keyCelebrated) !== 'true') {
          localStorage.setItem(keyCelebrated, 'true');
          setCelebrate(true);
          setShowRain(true);
          setShowRipple(true);
          playWaterSound();
          tocar('celebracao');

          setTimeout(() => {
            setCelebrate(false);
            setShowRain(false);
            setShowRipple(false);
          }, 1500);
        }
      }

      // Update chart locally
      setHistorico(prev =>
        prev.map(item =>
          item.data === hoje ? { ...item, total: item.total + ml } : item
        )
      );
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!alunoId) return;
    if (!confirm('Deseja zerar o consumo de água de hoje?')) return;

    try {
      setSaving(true);
      const hoje = getHojeString();

      await dbService.saveRegistroHidratacao({
        aluno_id: alunoId,
        data: hoje,
        ml: 0
      });

      // Clear celebration status for today
      localStorage.removeItem(`zelos_celebrated_${alunoId}_${hoje}`);
      localStorage.removeItem(`zelos_hidratacao_meta_${hoje}`);

      setConsumido(0);
      setPercent(0);

      setHistorico(prev =>
        prev.map(item =>
          item.data === hoje ? { ...item, total: 0 } : item
        )
      );
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMeta = async () => {
    if (!alunoId) return;
    try {
      setSaving(true);
      await dbService.setMetaHidratacao(alunoId, meta);
      const p = Math.min((consumido / meta) * 100, 100);
      setPercent(p);
      setShowSettings(false);
      tocar('sucesso');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const toggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    try {
      localStorage.setItem('zelos_hidratacao_som', nextState ? 'true' : 'false');
    } catch (e) {
      // Safe check
    }
    tocar('tap');
  };

  // 3) Dynamic message per percentage range
  const getDynamicMessage = (p: number) => {
    if (p >= 100) return "Meta batida! 💧🎉";
    if (p >= 70) return "Quase lá, mais um gole!";
    if (p >= 30) return "No caminho certo!";
    return "Bora começar 💧";
  };

  // 5) Streak count from 7 days history
  const getStreak = () => {
    if (!historico || historico.length === 0) return 0;

    let streak = 0;
    const todayMet = (historico[6]?.total || 0) >= meta;
    const yesterdayMet = (historico[5]?.total || 0) >= meta;

    // Streak is alive only if met today OR yesterday
    if (!todayMet && !yesterdayMet) {
      return 0;
    }

    if (todayMet) {
      for (let i = 6; i >= 0; i--) {
        if ((historico[i]?.total || 0) >= meta) {
          streak++;
        } else {
          break;
        }
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        if ((historico[i]?.total || 0) >= meta) {
          streak++;
        } else {
          break;
        }
      }
    }

    return streak;
  };

  const streak = getStreak();

  // Helper to map weekday names
  const getWeekdayInitials = (dataStr: string) => {
    const d = new Date(dataStr + 'T00:00:00');
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return days[d.getDay()];
  };

  if (loading) {
    return (
      <div className="bg-surface border border-line rounded-xl p-8 flex justify-center items-center">
        <Loader2 className="w-6 h-6 text-[#F26A1B] animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-surface border border-line rounded-3xl p-4 sm:p-6 relative overflow-hidden flex flex-col justify-between group min-h-[300px]">
      {/* Styles inject for the customized smooth wave, droplets and ripple animations */}
      <style>{`
        @keyframes waveFlow {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-wave-flow {
          animation: waveFlow 4s linear infinite;
        }
        @keyframes dropletRain {
          0% { transform: translateY(-10px) scale(0.6); opacity: 0; }
          20% { opacity: 0.7; }
          80% { opacity: 0.7; }
          100% { transform: translateY(140px) scale(0.8); opacity: 0; }
        }
        .animate-droplet {
          animation: dropletRain 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        @keyframes ripple {
          0% { transform: scale(0.85); opacity: 0.7; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .animate-ripple {
          animation: ripple 1.6s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
        }
        
        @media (prefers-reduced-motion: reduce) {
          .animate-wave-flow {
            animation: none !important;
            transform: none !important;
          }
          .animate-droplet {
            animation: none !important;
            display: none !important;
          }
          .animate-ripple {
            animation: none !important;
            display: none !important;
          }
        }
      `}</style>

      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#F26A1B]/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />

      {/* Droplets Rain celebration effect */}
      {showRain && !prefersReducedMotion && (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          {[...Array(14)].map((_, i) => {
            const left = `${5 + (i * 6.5) + (Math.random() * 3)}%`;
            const delay = `${Math.random() * 0.3}s`;
            const size = `${Math.random() * 4 + 8}px`;
            const opacity = 0.4 + Math.random() * 0.3;
            return (
              <div
                key={i}
                className="absolute text-[#F26A1B] animate-droplet select-none font-mono pointer-events-none"
                style={{
                  left,
                  animationDelay: delay,
                  fontSize: size,
                  opacity,
                  top: '-15px'
                }}
              >
                💧
              </div>
            );
          })}
        </div>
      )}

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#F26A1B]/10 border border-[#F26A1B]/15 rounded-xl">
              <Droplets className="w-5 h-5 text-[#F26A1B]" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-ink leading-tight">Hidratação</h3>
              <p className="text-[10px] text-ink-3 uppercase tracking-wider font-mono">Consumo diário</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Toggle sound button */}
            <button
              type="button"
              onClick={toggleSound}
              className="p-1.5 bg-bg hover:bg-raise border border-line rounded-lg text-ink-3 hover:text-[#F26A1B] transition-colors cursor-pointer"
              title={soundEnabled ? "Mutar sons" : "Ativar sons"}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-ink-4" />}
            </button>

            {/* Settings button */}
            <button
              type="button"
              onClick={() => {
                setShowSettings(!showSettings);
                tocar('tap');
              }}
              className="p-1.5 bg-bg hover:bg-raise border border-line rounded-lg text-ink-3 hover:text-[#F26A1B] transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {showSettings ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-[12px] text-ink-3">Meta diária (ml)</label>
                <input
                  type="number"
                  value={meta}
                  onChange={(e) => setMeta(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-void border border-line rounded-lg p-3 text-sm text-ink outline-none focus:border-[#F26A1B]/50"
                  step="250"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSettings(false);
                    tocar('tap');
                  }}
                  className="flex-1 py-2.5 bg-bg hover:bg-raise border border-line rounded-lg text-xs font-semibold text-ink-2 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveMeta}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-[#F26A1B] text-white border border-[#F26A1B]/20 rounded-lg text-xs font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Salvar
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="main"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Progress Circle & Text */}
              <div className="flex items-center gap-6">
                
                {/* 1) ANEL COM ÁGUA ANIMADA */}
                <div className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center">
                  
                  {/* Ripple effects when 100% achieved or active */}
                  {showRipple && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                      <div className="w-24 h-24 rounded-full border-4 border-[#FF8A3D] animate-ripple absolute" />
                      <div className="w-24 h-24 rounded-full border-4 border-[#F26A1B] animate-ripple absolute" style={{ animationDelay: '0.3s' }} />
                    </div>
                  )}

                  <svg className="w-full h-full transform -rotate-90 z-10" viewBox="0 0 36 36">
                    <path
                      className="text-line"
                      strokeWidth="3.2"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-[#F26A1B] transition-all duration-500 ease-out"
                      strokeDasharray={`${percent}, 100`}
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>

                  {/* Inner container shaped as circle for water effect */}
                  <div className="absolute inset-[6px] rounded-full overflow-hidden bg-raise/50 z-10 flex items-center justify-center">
                    
                    {/* Water layer with orange gradient */}
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#F26A1B] to-[#FF8A3D] transition-all duration-700 ease-out"
                      style={{ height: `${percent}%` }}
                    >
                      {/* Horizontal moving waves at the top water level */}
                      {percent > 0 && percent < 100 && (
                        <div className="absolute top-0 left-0 w-[200%] h-3 -translate-y-[80%] pointer-events-none">
                          <svg viewBox="0 0 120 28" className="w-full h-full text-[#FF8A3D] fill-current animate-wave-flow">
                            <path d="M0 15 Q 30 0, 60 15 T 120 15 L 120 28 L 0 28 Z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Central percentage text inside the water ring */}
                    <div className="z-20 text-center flex flex-col items-center">
                      <span className={`text-[16px] font-black leading-none transition-colors duration-500 ${percent > 55 ? 'text-void font-black' : 'text-ink'}`}>
                        {Math.round(percent)}%
                      </span>
                      <span className={`text-[8px] uppercase tracking-wider font-extrabold mt-0.5 transition-colors duration-500 ${percent > 70 ? 'text-void/80' : 'text-ink-3'}`}>
                        Água
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  {/* Animating count up display */}
                  <p className="text-2xl font-extrabold text-ink num flex items-baseline gap-1">
                    {displayConsumido} <span className="text-xs font-normal text-ink-3">/ {meta}ml</span>
                  </p>
                  
                  {/* Dynamic Message for Remaining & Milestone */}
                  <p className="text-[12px] text-ink-2 font-semibold">
                    {percent >= 100 ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        Meta concluída! 🎉
                      </span>
                    ) : (
                      <span>Faltam {Math.max(0, meta - consumido)}ml</span>
                    )}
                  </p>

                  {/* 3) MENSAGEM DINÂMICA por faixa de % */}
                  <div className="text-[10px] font-bold text-[#F26A1B] uppercase tracking-wide bg-[#F26A1B]/10 px-2 py-0.5 rounded-md w-fit">
                    {getDynamicMessage(percent)}
                  </div>
                </div>
              </div>

              {/* 5) OFENSIVA (streak) */}
              {streak >= 2 && (
                <div className="flex items-center gap-1.5 bg-[#F26A1B]/10 border border-[#F26A1B]/15 text-[#F26A1B] text-[10px] font-bold px-2.5 py-1 rounded-full w-fit">
                  <span>🔥</span> {streak} dias seguidos na meta
                </div>
              )}

              {/* Water Adders */}
              <div className="flex flex-wrap gap-2 pt-1">
                {[250, 500, 1000].map(ml => (
                  <button
                    key={ml}
                    type="button"
                    onClick={() => handleAddWater(ml)}
                    disabled={saving}
                    className="px-4 py-2 bg-bg border border-line hover:border-[#F26A1B]/30 rounded-xl text-xs font-bold text-ink hover:text-[#F26A1B] hover:bg-[#F26A1B]/5 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> {ml}ml
                  </button>
                ))}
                {consumido > 0 && (
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={saving}
                    className="p-2 bg-bg border border-line hover:border-red-500/20 text-ink-3 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all cursor-pointer"
                    title="Zerar hoje"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Celebration animation badge inside the card */}
      <AnimatePresence>
        {celebrate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-35 flex items-center justify-center p-4 pointer-events-none select-none"
          >
            <motion.div
              initial={{ scale: 0.8, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: -15, opacity: 0 }}
              transition={{ type: "spring", damping: 12, stiffness: 150 }}
              className="bg-[#F26A1B] text-white border border-[#F26A1B]/20 shadow-xl px-5 py-3 rounded-2xl flex items-center gap-2 text-xs font-bold pointer-events-none"
            >
              <span className="text-sm">💧</span>
              <span>Meta batida! 🎉</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6) HISTÓRICO DE 7 DIAS mais bonito (Custom Interactive bar chart) */}
      <div className="border-t border-line pt-4 mt-5">
        <p className="text-[10px] font-mono text-ink-3 uppercase tracking-widest mb-2">Histórico de 7 dias</p>
        
        <div className="relative pt-8 pb-2">
          {/* Dashed horizontal line marking 100% meta */}
          <div className="absolute top-[46px] left-0 right-0 flex items-center gap-2 pointer-events-none z-10">
            <div className="flex-1 border-t border-dashed border-[#F26A1B]/30" />
            <span className="text-[8px] font-mono text-[#F26A1B] bg-surface border border-[#F26A1B]/20 px-1.5 py-0.5 rounded-md uppercase font-bold shadow-xs">
              Meta ({meta}ml)
            </span>
          </div>

          <div className="h-24 flex items-end justify-between gap-1 sm:gap-2">
            {historico.map((day, idx) => {
              const pct = Math.min((day.total / meta) * 100, 110); // cap at 110% of meta height
              const isToday = day.data === today;
              const isMet = day.total >= meta;
              const weekday = getWeekdayInitials(day.data);
              const isSelected = activeBarDate === day.data;

              return (
                <div 
                  key={day.data} 
                  className="flex-1 flex flex-col items-center group/bar cursor-pointer relative"
                  onClick={() => {
                    setActiveBarDate(activeBarDate === day.data ? null : day.data);
                    tocar('tap');
                  }}
                >
                  {/* Tooltip above */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.9 }}
                        className="absolute -top-7 z-20 bg-neutral-900 text-white dark:bg-neutral-800 text-[9px] font-mono px-2 py-0.5 rounded-md shadow-md whitespace-nowrap border border-neutral-700/50"
                      >
                        {day.total} ml
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Bar track and custom fill */}
                  <div className="w-full h-16 bg-raise border border-line rounded-md flex items-end overflow-hidden p-[2px] relative">
                    <motion.div 
                      className={`w-full rounded-xs transition-all duration-500 ${
                        isToday 
                          ? 'bg-gradient-to-t from-[#F26A1B] to-[#FF8A3D] shadow-[0_0_8px_rgba(242,106,27,0.4)]' 
                          : isMet 
                            ? 'bg-[#F26A1B]' 
                            : 'bg-[#F26A1B]/35'
                      }`}
                      style={{ height: `${Math.max(4, pct)}%` }}
                    />
                  </div>

                  {/* Weekday label */}
                  <span className={`text-[9px] font-bold mt-1.5 ${isToday ? 'text-[#F26A1B]' : 'text-ink-3'}`}>
                    {weekday}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
