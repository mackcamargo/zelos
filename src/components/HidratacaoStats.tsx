import React, { useState, useEffect } from 'react';
import { Droplets, Loader2 } from 'lucide-react';
import { dbService } from '../lib/supabase';

interface HidratacaoStatsProps {
  alunoId: string;
}

export default function HidratacaoStats({ alunoId }: HidratacaoStatsProps) {
  const [loading, setLoading] = useState(true);
  const [average, setAverage] = useState(0);

  useEffect(() => {
    loadStats();
  }, [alunoId]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data } = await dbService.getHistoricoHidratacao(alunoId);
      if (data && data.length > 0) {
        const sum = data.reduce((acc, curr) => acc + curr.total, 0);
        setAverage(Math.round(sum / data.length));
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader2 className="w-4 h-4 text-violet animate-spin" />;

  return (
    <div className="flex items-center gap-4 bg-void/50 p-4 rounded-2xl border border-white/5">
      <div className="p-3 bg-violet/10 rounded-xl">
        <Droplets className="w-5 h-5 text-violet" />
      </div>
      <div>
        <p className="text-[10px] font-mono text-ink-3 uppercase tracking-widest">Média Semanal</p>
        <p className="text-lg font-mono font-black text-ink tracking-tighter">
          {average.toLocaleString()} <span className="text-xs font-normal">ml/dia</span>
        </p>
      </div>
    </div>
  );
}
