import React, { useState, useEffect } from 'react';
import { Droplets, Loader2, Target, Check } from 'lucide-react';
import { dbService } from '../lib/supabase';

interface HidratacaoStatsProps {
  alunoId: string;
}

export default function HidratacaoStats({ alunoId }: HidratacaoStatsProps) {
  const [loading, setLoading] = useState(true);
  const [average, setAverage] = useState(0);
  const [meta, setMeta] = useState<number>(2000);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    loadStats();
  }, [alunoId]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data } = await dbService.getHistoricoHidratacao(alunoId);
      if (data && data.length > 0) {
        const sum = data.reduce((acc: number, curr: any) => acc + (Number(curr.ml) || 0), 0);
        setAverage(Math.round(sum / data.length));
      } else {
        setAverage(0);
      }
      const { data: metaData } = await dbService.getMetaHidratacao(alunoId);
      setMeta(Number(metaData) || 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarMeta = async () => {
    setSalvando(true);
    setSalvo(false);
    try {
      const valor = Number(meta) || 2000;
      const { error } = await dbService.setMetaHidratacao(alunoId, valor);
      if (!error) {
        setSalvo(true);
        setTimeout(() => setSalvo(false), 2000);
      }
    } finally {
      setSalvando(false);
    }
  };

  if (loading) return <Loader2 className="w-4 h-4 text-violet animate-spin" />;

  return (
    <div className="space-y-4">
      {/* Média semanal */}
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

      {/* Prescrição da meta diária */}
      <div className="bg-void/50 p-4 rounded-2xl border border-white/5 space-y-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-flame" />
          <p className="text-[10px] font-mono text-ink-3 uppercase tracking-widest">Meta Diária Prescrita</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={meta}
            onChange={(e) => setMeta(Number(e.target.value))}
            step={250}
            min={0}
            className="flex-1 bg-void border border-white/10 rounded-xl px-4 py-2.5 text-ink font-mono text-sm focus:outline-none focus:border-flame/50"
            placeholder="Ex: 3000"
          />
          <span className="text-xs text-ink-3 font-mono mr-2">ml</span>
          <button
            onClick={handleSalvarMeta}
            disabled={salvando}
            className="p-2.5 bg-violet hover:bg-violet/80 disabled:opacity-50 text-white rounded-xl transition-colors flex items-center justify-center min-w-[40px]"
            title="Salvar Meta"
          >
            {salvando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : salvo ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Check className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
