import React, { useState, useEffect } from 'react';
import { dbService } from '../lib/supabase';
import { Checkin } from '../types';
import { 
  Zap, Moon, Flame, Scale, 
  MessageSquare, Calendar, Loader2, AlertCircle, TrendingUp
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid, Legend 
} from 'recharts';

interface CheckinsPainelProps {
  alunoId: string;
}

export default function CheckinsPainel({ alunoId }: CheckinsPainelProps) {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCheckins();
  }, [alunoId]);

  const loadCheckins = async () => {
    setLoading(true);
    try {
      const { data } = await dbService.getCheckins(alunoId);
      if (data) setCheckins(data);
    } finally {
      setLoading(false);
    }
  };

  const chartData = [...checkins].reverse().map(c => ({
    semana: (() => {
      const [ano, mes, dia] = c.semana.split("-").map(Number);
      return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    })(),
    Energia: c.energia,
    Sono: c.qualidade_sono,
    Estresse: c.nivel_estresse
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-flame animate-spin" />
      </div>
    );
  }

  if (checkins.length === 0) {
    return (
      <div className="bg-surface-2 rounded-3xl p-12 text-center border border-white/5 flex flex-col justify-center items-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-3 flex items-center justify-center mb-5 border border-white/5">
          <Calendar className="w-8 h-8 text-ink-3 opacity-30" />
        </div>
        <span className="font-display font-medium text-lg text-ink mb-1">Nenhum check-in ainda</span>
        <p className="text-sm text-ink-2 max-w-md leading-relaxed">
          O aluno ainda não realizou nenhum check-in semanal.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Charts Section */}
      <div className="bg-surface-2 border border-white/5 rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-5 h-5 text-flame" />
          <h3 className="font-display font-bold text-lg text-ink">Evolução do Bem-Estar</h3>
        </div>
        
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
              <XAxis dataKey="semana" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} domain={[0, 5]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#08090C', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                labelStyle={{ color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Line type="monotone" dataKey="Energia" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="Sono" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="Estresse" stroke="#F43F5E" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* History Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {checkins.map((c) => (
          <div key={c.id} className="bg-surface-2 border border-white/5 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-ink-3" />
                <span className="text-xs font-mono font-bold text-ink-2">
                  Semana: {(() => {
                    const [ano, mes, dia] = c.semana.split("-").map(Number);
                    return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR');
                  })()}
                </span>
              </div>
              <span className="text-[10px] font-mono text-ink-3">
                Enviado em: {new Date(c.criado_em).toLocaleDateString()}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-surface-3 p-3 rounded-2xl flex flex-col items-center gap-1 border border-white/5">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-lg font-mono font-black text-ink">{c.energia}/5</span>
                <span className="text-[8px] font-mono uppercase text-ink-3">Energia</span>
              </div>
              <div className="bg-surface-3 p-3 rounded-2xl flex flex-col items-center gap-1 border border-white/5">
                <Moon className="w-4 h-4 text-violet" />
                <span className="text-lg font-mono font-black text-ink">{c.qualidade_sono}/5</span>
                <span className="text-[8px] font-mono uppercase text-ink-3">Sono</span>
              </div>
              <div className="bg-surface-3 p-3 rounded-2xl flex flex-col items-center gap-1 border border-white/5">
                <Flame className="w-4 h-4 text-flame" />
                <span className="text-lg font-mono font-black text-ink">{c.nivel_estresse}/5</span>
                <span className="text-[8px] font-mono uppercase text-ink-3">Estresse</span>
              </div>
            </div>

            {(c.peso_kg || c.dores) && (
              <div className="grid grid-cols-2 gap-3">
                {c.peso_kg && (
                  <div className="flex items-center gap-2 text-ink-2">
                    <Scale className="w-3.5 h-3.5" />
                    <span className="text-xs font-mono">{c.peso_kg} kg</span>
                  </div>
                )}
                {c.dores && (
                  <div className="flex items-center gap-2 text-rose-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="text-xs truncate">{c.dores}</span>
                  </div>
                )}
              </div>
            )}

            {c.observacoes && (
              <div className="bg-void/30 p-3 rounded-xl border border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="w-3 h-3 text-ink-3" />
                  <span className="text-[10px] font-mono text-ink-3 uppercase">Observações:</span>
                </div>
                <p className="text-xs text-ink-2 italic leading-relaxed">"{c.observacoes}"</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
