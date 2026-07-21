import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Checkin } from '../types';
import { 
  X, Scale, Flame, Moon, Zap, AlertCircle, 
  MessageSquare, Loader2, Calendar, TrendingUp, BarChart3
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { motion } from 'motion/react';

interface HistoricoCheckinModalProps {
  alunoId: string;
  alunoNome: string;
  onClose: () => void;
}

export default function HistoricoCheckinModal({ alunoId, alunoNome, onClose }: HistoricoCheckinModalProps) {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistorico() {
      setLoading(true);
      try {
        let data: Checkin[] = [];
        if (isSupabaseConfigured && supabase) {
          const { data: resData, error } = await supabase
            .from('checkins')
            .select('*')
            .eq('aluno_id', alunoId)
            .order('semana', { ascending: true });
          
          if (!error && resData) {
            data = resData as Checkin[];
          }
        } else {
          // Demo/Mock fallback
          const localCheckins = localStorage.getItem('zenite_checkins');
          const parsed = localCheckins ? JSON.parse(localCheckins) : [];
          data = parsed
            .filter((c: any) => c.aluno_id === alunoId)
            .sort((a: any, b: any) => a.semana.localeCompare(b.semana)) as Checkin[];
        }
        setCheckins(data);
      } catch (err) {
        console.error('Erro ao buscar histórico:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchHistorico();
  }, [alunoId]);

  // Helpers de formatação e cor
  const formatSemanaToDDMM = (semanaStr: string) => {
    if (!semanaStr) return '';
    const [a, m, d] = semanaStr.split('-').map(Number);
    const date = new Date(a, m - 1, d);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  };

  const formatSemanaFull = (semanaStr: string) => {
    if (!semanaStr) return '';
    const [a, m, d] = semanaStr.split('-').map(Number);
    const date = new Date(a, m - 1, d);
    return date.toLocaleDateString('pt-BR');
  };

  const getIndicatorColor = (val: number, type: 'normal' | 'inverted') => {
    const value = Number(val) || 0;
    if (type === 'normal') {
      if (value >= 4) return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
      if (value === 3) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
      return { text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
    } else {
      // Estresse (Invertido): 1-2 Verde, 3 Amarelo, 4-5 Vermelho
      if (value <= 2) return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
      if (value === 3) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
      return { text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
    }
  };

  // Processar dados dos gráficos
  const pesoData = checkins
    .filter(c => c.peso_kg !== null && c.peso_kg !== undefined && String(c.peso_kg).trim() !== '')
    .map(c => ({
      semana: formatSemanaToDDMM(c.semana),
      Peso: Number(c.peso_kg) || 0
    }));

  const indicatorData = checkins.map(c => ({
    semana: formatSemanaToDDMM(c.semana),
    Energia: Number(c.energia) || 0,
    Sono: Number(c.qualidade_sono) || 0,
    Estresse: Number(c.nivel_estresse) || 0
  }));

  const hasTwoWeightEntries = pesoData.length >= 2;
  const hasTwoCheckins = checkins.length >= 2;

  // Lista invertida para mostrar o mais recente primeiro na timeline
  const timelineCheckins = [...checkins].reverse();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md" 
        onClick={onClose}
      />

      {/* Modal Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-3xl bg-surface border border-line rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-line flex items-start justify-between bg-bg-sub">
          <div>
            <h3 className="z-h2">
              Histórico de <span className="text-accent">check-ins</span>
            </h3>
            <p className="text-xs text-ink-3 mt-1">
              Aluno: <span className="text-ink font-semibold">{alunoNome}</span> • <span className="z-num">{checkins.length}</span> {checkins.length === 1 ? 'check-in enviado' : 'check-ins enviados'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg bg-raise hover:bg-surface border border-line text-ink-3 hover:text-ink transition-colors outline-none cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-8 flex-1 scrollbar-thin bg-surface">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <p className="text-xs text-ink-3">Carregando histórico...</p>
            </div>
          ) : checkins.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-ink-3 text-sm">Sem check-ins ainda</p>
            </div>
          ) : (
            <>
              {/* Peso Evolution Chart */}
              <div className="bg-bg-sub border border-line rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Scale className="w-4 h-4 text-accent" />
                  <h4 className="font-semibold text-xs text-ink tracking-wide uppercase">Evolução do peso</h4>
                </div>
                {hasTwoWeightEntries ? (
                  <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={pesoData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--z-line)" opacity={0.3} />
                        <XAxis dataKey="semana" stroke="var(--z-text-3)" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--z-text-3)" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'var(--z-surface)', 
                            border: '1px solid var(--z-line)', 
                            borderRadius: '12px',
                            boxShadow: '0 4px 12px rgba(20,20,20,0.08)' 
                          }}
                          labelStyle={{ color: 'var(--z-text)', fontSize: '11px', fontWeight: 'bold' }}
                          itemStyle={{ fontSize: '11px', fontWeight: '500' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="Peso" 
                          stroke="var(--z-accent)" 
                          strokeWidth={2} 
                          dot={{ r: 4, strokeWidth: 1, fill: 'var(--z-surface)' }} 
                          activeDot={{ r: 6 }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-28 flex items-center justify-center bg-bg-sub/50 border border-dashed border-line rounded-xl">
                    <p className="text-xs text-ink-3 font-mono uppercase italic">Sem histórico de peso ainda</p>
                  </div>
                )}
              </div>

              {/* Indicators Chart */}
              <div className="bg-bg-sub border border-line rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <h4 className="font-semibold text-xs text-ink tracking-wide uppercase">Indicadores de Bem-Estar</h4>
                </div>
                {hasTwoCheckins ? (
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={indicatorData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--z-line)" opacity={0.3} />
                        <XAxis dataKey="semana" stroke="var(--z-text-3)" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--z-text-3)" fontSize={10} tickLine={false} axisLine={false} domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'var(--z-surface)', 
                            border: '1px solid var(--z-line)', 
                            borderRadius: '12px',
                            boxShadow: '0 4px 12px rgba(20,20,20,0.08)' 
                          }}
                          labelStyle={{ color: 'var(--z-text)', fontSize: '11px', fontWeight: 'bold' }}
                          itemStyle={{ fontSize: '11px', fontWeight: '500' }}
                        />
                        <Legend 
                          verticalAlign="top" 
                          height={36} 
                          iconType="circle" 
                          wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} 
                        />
                        <Line type="monotone" dataKey="Energia" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="Sono" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="Estresse" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-28 flex items-center justify-center bg-bg-sub/50 border border-dashed border-line rounded-xl">
                    <p className="text-xs text-ink-3 font-mono uppercase italic">Sem histórico de bem-estar suficiente para gráfico</p>
                  </div>
                )}
              </div>

              {/* Timeline Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-accent" />
                  <h4 className="font-semibold text-xs text-ink tracking-wide uppercase">Linha do Tempo</h4>
                </div>
                
                <div className="relative border-l border-line pl-4 ml-2 space-y-6">
                  {timelineCheckins.map((c, index) => {
                    const energiaStyle = getIndicatorColor(c.energia, 'normal');
                    const sonoStyle = getIndicatorColor(c.qualidade_sono, 'normal');
                    const estresseStyle = getIndicatorColor(c.nivel_estresse, 'inverted');

                    return (
                      <div key={c.id} className="relative">
                        {/* Timeline node dot */}
                        <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-accent border border-surface" />

                        <div className="bg-bg-sub border border-line rounded-xl p-4 space-y-3 shadow-sm hover:border-line-strong transition-all">
                          {/* Date and optional weight */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs text-ink-2 font-semibold">
                              <Calendar className="w-3.5 h-3.5 text-ink-3" />
                              <span>Semana de {formatSemanaFull(c.semana)}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {c.peso_kg && (
                                <div className="z-badge z-badge--accent z-num">
                                  <Scale className="w-3 h-3" />
                                  <span>{c.peso_kg} kg</span>
                                </div>
                              )}
                              <span className="text-[11px] text-ink-3 z-num font-medium">
                                Enviado em {new Date(c.criado_em).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </div>

                          {/* 3 Indicators with ZÊNITE custom styling */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold z-num ${energiaStyle.bg} ${energiaStyle.border} ${energiaStyle.text}`}>
                              <Zap className="w-3.5 h-3.5 shrink-0" />
                              <span>Energia: {c.energia}/5</span>
                            </div>
                            <div className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold z-num ${sonoStyle.bg} ${sonoStyle.border} ${sonoStyle.text}`}>
                              <Moon className="w-3.5 h-3.5 shrink-0" />
                              <span>Sono: {c.qualidade_sono}/5</span>
                            </div>
                            <div className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold z-num ${estresseStyle.bg} ${estresseStyle.border} ${estresseStyle.text}`}>
                              <Flame className="w-3.5 h-3.5 shrink-0" />
                              <span>Estresse: {c.nivel_estresse}/5</span>
                            </div>
                          </div>

                          {/* Dores */}
                          {c.dores && String(c.dores).trim() !== '' && (
                            <div className="bg-danger-soft border border-danger/20 p-3 rounded-xl">
                              <p className="text-[12px] text-danger font-bold mb-1 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" /> Dor relatada
                              </p>
                              <p className="text-xs text-ink leading-relaxed italic font-medium">"{c.dores}"</p>
                            </div>
                          )}

                          {/* Observações */}
                          {c.observacoes && String(c.observacoes).trim() !== '' && (
                            <div className="bg-surface p-3 rounded-xl border border-line">
                              <div className="flex items-center gap-2 mb-1">
                                <MessageSquare className="w-3.5 h-3.5 text-ink-3" />
                                <span className="text-[12px] text-ink-3 font-semibold">Observações:</span>
                              </div>
                              <p className="text-xs text-ink-2 italic leading-relaxed">"{c.observacoes}"</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-bg-sub border-t border-line flex justify-end">
          <button 
            onClick={onClose}
            className="z-btn z-btn--ghost z-btn--sm px-6"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
