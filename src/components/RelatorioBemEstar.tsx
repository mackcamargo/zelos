import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Dumbbell, Utensils, Droplets, 
  Moon, Heart, CheckCircle2, AlertCircle,
  Sparkles, ChevronRight, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService } from '../lib/supabase';
import { ResumoBemEstar } from '../types';

interface RelatorioBemEstarProps {
  alunoId: string;
}

export const RelatorioBemEstar: React.FC<RelatorioBemEstarProps> = ({ alunoId }) => {
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState<ResumoBemEstar | null>(null);

  useEffect(() => {
    loadResumo();
  }, [alunoId]);

  const loadResumo = async () => {
    setLoading(true);
    const { data } = await dbService.getResumoBemEstarAluno(alunoId);
    if (data) setResumo(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-flame/20 border-t-flame animate-spin" />
        <p className="text-[10px] font-mono text-ink-3 uppercase tracking-[0.2em]">Sincronizando Bem-estar...</p>
      </div>
    );
  }

  if (!resumo) return null;

  const { indiceGeral, nivel, detalhes, frase } = resumo;

  return (
    <div className="space-y-8">
      {/* Hero Section: General Index Ring */}
      <section className="relative flex flex-col items-center py-10 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-flame/10 blur-[100px] rounded-full" />
        
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* SVG Ring */}
          <svg className="w-full h-full -rotate-90 drop-shadow-[0_0_20px_rgba(245,51,79,0.3)]">
            <circle
              cx="128"
              cy="128"
              r="110"
              stroke="currentColor"
              strokeWidth="12"
              fill="transparent"
              className="text-white/5"
            />
            <motion.circle
              cx="128"
              cy="128"
              r="110"
              stroke="url(#gradient-brasa)"
              strokeWidth="12"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 110}
              initial={{ strokeDashoffset: 2 * Math.PI * 110 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 110 * (1 - indiceGeral / 100) }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="gradient-brasa" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f5334f" /> {/* ember */}
                <stop offset="50%" stopColor="#ff4d00" /> {/* flame */}
                <stop offset="100%" stopColor="#ffb800" /> {/* amber */}
              </linearGradient>
            </defs>
          </svg>

          {/* Central Score */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <motion.span 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-7xl font-black text-ink tracking-tighter"
            >
              {indiceGeral}
            </motion.span>
            <div className="flex flex-col items-center gap-1">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                nivel === 'Excelente' ? 'bg-emerald/10 text-emerald' :
                nivel === 'Bom' ? 'bg-amber/10 text-amber' :
                'bg-flame/10 text-flame'
              }`}>
                {nivel}
              </span>
              <p className="text-[10px] font-mono text-ink-3 uppercase mt-1 tracking-widest">Wellness Index</p>
            </div>
          </div>
        </div>

        {/* Motivational Phrase */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 max-w-sm text-center px-4"
        >
          <p className="text-sm text-ink-2 italic font-medium leading-relaxed">
            "{frase}"
          </p>
        </motion.div>
      </section>

      {/* Metrics Grid */}
      <section className="grid grid-cols-2 gap-4 px-4 pb-10">
        {/* Treino Card */}
        <MetricCard 
          icon={<Dumbbell className="w-4 h-4" />}
          label="Treino"
          value={`${detalhes.treino.valor}%`}
          subValue={`Streak: ${detalhes.treino.streak} dias`}
          color="text-flame"
          progress={detalhes.treino.valor}
        />

        {/* Nutrição Card */}
        <MetricCard 
          icon={<Utensils className="w-4 h-4" />}
          label="Nutrição"
          value={`${detalhes.nutricao.consumido}`}
          subValue={`Meta: ${detalhes.nutricao.meta} kcal`}
          color="text-amber"
          progress={detalhes.nutricao.meta > 0 ? (detalhes.nutricao.consumido / detalhes.nutricao.meta) * 100 : 0}
        />

        {/* Hidratação Card */}
        <MetricCard 
          icon={<Droplets className="w-4 h-4" />}
          label="Hidratação"
          value={`${detalhes.hidratacao.consumido}ml`}
          subValue={`Meta: ${detalhes.hidratacao.meta}ml`}
          color="text-sky-400"
          progress={(detalhes.hidratacao.consumido / detalhes.hidratacao.meta) * 100}
        />

        {/* Sono Card */}
        <MetricCard 
          icon={<Moon className="w-4 h-4" />}
          label="Sono"
          value={`${detalhes.sono.nota}/10`}
          subValue="Último check-in"
          color="text-violet"
          progress={detalhes.sono.nota * 10}
        />

        {/* Mente Card */}
        <MetricCard 
          icon={<Heart className="w-4 h-4" />}
          label="Mental"
          value={`${detalhes.mente.minutos} min`}
          subValue="Esta semana"
          color="text-rose-400"
          progress={Math.min((detalhes.mente.minutos / 60) * 100, 100)}
        />

        {/* Hábitos Card */}
        <MetricCard 
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Hábitos"
          value={`${detalhes.habitos.concluidos}/${detalhes.habitos.total}`}
          subValue="Concluídos hoje"
          color="text-emerald"
          progress={detalhes.habitos.total > 0 ? (detalhes.habitos.concluidos / detalhes.habitos.total) * 100 : 0}
        />
      </section>
    </div>
  );
};

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue: string;
  color: string;
  progress: number;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, subValue, color, progress }) => {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-surface border border-white/5 rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden group shadow-lg"
    >
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg bg-surface-2 ${color} border border-white/5`}>
          {icon}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-mono text-ink-3 uppercase tracking-widest">{label}</p>
          <h4 className="text-lg font-black text-ink">{value}</h4>
        </div>
      </div>
      
      <div>
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full bg-current ${color}`}
          />
        </div>
        <p className="text-[9px] text-ink-3 mt-2 font-medium">{subValue}</p>
      </div>

      {/* Decorative accent */}
      <div className={`absolute top-0 right-0 w-12 h-12 bg-current opacity-[0.02] blur-xl rounded-full -mr-6 -mt-6 ${color}`} />
    </motion.div>
  );
};
