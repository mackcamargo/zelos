/**
 * REFACTORING CHECK-INS LIST (CheckinsPainel.tsx):
 * 
 * Assumed Checkin interface fields:
 * - id: number | string
 * - aluno_id: string
 * - semana: string (date string 'YYYY-MM-DD' or ISO)
 * - energia: number (1-5)
 * - qualidade_sono: number (1-5)
 * - nivel_estresse: number (1-5)
 * - peso_kg: number | null
 * - dores: string | null
 * - observacoes: string | null
 * - criado_em: string (ISO date string)
 * 
 * Changes applied:
 * 1. Grouped check-ins by Month/Year (e.g. "Julho 2026") sorted from newest to oldest month.
 * 2. Added discrete month section headers with pt-BR capitalized month name, pill count badge ("N check-ins"), and subtle divider line.
 * 3. Collapsible week rows with compact summary header (dd/MM date, submission date, ⚡/🌙/🔥 indicators, peso, rotating chevron).
 * 4. Expanded details view with smooth motion animation, 3 rating tiles, weight variation trend badge (▲/▼ relative to chronological predecessor), dores alert, and student notes.
 * 5. Most recent check-in expanded by default.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../lib/supabase';
import { Checkin } from '../types';
import { 
  Zap, Moon, Flame, Scale, 
  MessageSquare, Calendar, Loader2, AlertCircle, TrendingUp,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid, Legend 
} from 'recharts';

interface CheckinsPainelProps {
  alunoId: string;
}

interface MonthGroup {
  key: string;
  label: string;
  yearMonthNumber: number;
  checkins: Checkin[];
}

// Helper to parse week date string safely
function parseDateString(dateStr: string, fallbackStr?: string): Date {
  if (dateStr && typeof dateStr === 'string' && dateStr.includes('-')) {
    const cleanStr = dateStr.split('T')[0];
    const parts = cleanStr.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
  }
  if (fallbackStr) {
    const d = new Date(fallbackStr);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

// Format week date as dd/MM in pt-BR
function formatShortWeekDate(dateStr: string, criadoEmStr?: string): string {
  const d = parseDateString(dateStr, criadoEmStr);
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(d);
}

// Format submission date as dd/MM/yyyy
function formatSubmissionDate(criadoEmStr?: string): string {
  if (!criadoEmStr) return '';
  const d = new Date(criadoEmStr);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}

// Format month header info (e.g. "Julho 2026")
function getMonthYearHeader(dateStr: string, criadoEmStr?: string): { key: string; label: string; yearMonthNumber: number } {
  const d = parseDateString(dateStr, criadoEmStr);
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(d);
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const yearMonthNumber = year * 100 + month;
  const key = `${year}-${String(month).padStart(2, '0')}`;
  return {
    key,
    label: `${capitalizedMonth} ${year}`,
    yearMonthNumber
  };
}

export default function CheckinsPainel({ alunoId }: CheckinsPainelProps) {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number | string>>(new Set());

  useEffect(() => {
    loadCheckins();
  }, [alunoId]);

  const loadCheckins = async () => {
    setLoading(true);
    try {
      const { data } = await dbService.getCheckins(alunoId);
      if (data) {
        setCheckins(data);
        // Expand the most recent check-in by default
        if (data.length > 0) {
          const sortedDesc = [...data].sort((a, b) => {
            const dateA = parseDateString(a.semana, a.criado_em).getTime();
            const dateB = parseDateString(b.semana, b.criado_em).getTime();
            return dateB - dateA;
          });
          if (sortedDesc[0]) {
            setExpandedIds(new Set([sortedDesc[0].id]));
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: number | string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Chronological weight trend map (oldest to newest comparison)
  const weightTrendMap = useMemo(() => {
    const map = new Map<number | string, { diff: number; formatted: string; type: 'up' | 'down' | 'equal' } | null>();
    if (!checkins || checkins.length === 0) return map;

    const sortedChrono = [...checkins].sort((a, b) => {
      const dateA = parseDateString(a.semana, a.criado_em).getTime();
      const dateB = parseDateString(b.semana, b.criado_em).getTime();
      return dateA - dateB;
    });

    let prevWeight: number | null = null;

    sortedChrono.forEach((c) => {
      if (c.peso_kg !== null && c.peso_kg !== undefined && !isNaN(c.peso_kg)) {
        if (prevWeight !== null) {
          const diff = Number((c.peso_kg - prevWeight).toFixed(1));
          if (diff > 0) {
            map.set(c.id, { diff, formatted: `▲ +${diff}kg`, type: 'up' });
          } else if (diff < 0) {
            map.set(c.id, { diff, formatted: `▼ ${diff}kg`, type: 'down' });
          } else {
            map.set(c.id, { diff: 0, formatted: '=', type: 'equal' });
          }
        } else {
          map.set(c.id, null);
        }
        prevWeight = c.peso_kg;
      } else {
        map.set(c.id, null);
      }
    });

    return map;
  }, [checkins]);

  // Group check-ins by month/year (newest month first, newest checkin within month first)
  const monthGroups = useMemo(() => {
    if (!checkins || checkins.length === 0) return [];

    const groupsMap = new Map<string, MonthGroup>();

    checkins.forEach((c) => {
      const { key, label, yearMonthNumber } = getMonthYearHeader(c.semana, c.criado_em);
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          key,
          label,
          yearMonthNumber,
          checkins: []
        });
      }
      groupsMap.get(key)!.checkins.push(c);
    });

    const groups = Array.from(groupsMap.values()).sort((a, b) => b.yearMonthNumber - a.yearMonthNumber);

    groups.forEach((group) => {
      group.checkins.sort((a, b) => {
        const dateA = parseDateString(a.semana, a.criado_em).getTime();
        const dateB = parseDateString(b.semana, b.criado_em).getTime();
        return dateB - dateA;
      });
    });

    return groups;
  }, [checkins]);

  // Chart data sorted chronologically
  const chartData = useMemo(() => {
    return [...checkins]
      .sort((a, b) => parseDateString(a.semana, a.criado_em).getTime() - parseDateString(b.semana, b.criado_em).getTime())
      .map(c => ({
        semana: formatShortWeekDate(c.semana, c.criado_em),
        Energia: c.energia,
        Sono: c.qualidade_sono,
        Estresse: c.nivel_estresse
      }));
  }, [checkins]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (checkins.length === 0) {
    return (
      <div className="bg-surface rounded-[18px] p-12 text-center border border-line flex flex-col justify-center items-center shadow-[0_1px_2px_rgba(20,20,20,0.04)]">
        <div className="w-16 h-16 rounded-2xl bg-bg border border-line flex items-center justify-center mb-5">
          <Calendar className="w-8 h-8 text-ink-3 opacity-50" />
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
      <div className="bg-surface border border-line rounded-[18px] p-6 shadow-[0_1px_2px_rgba(20,20,20,0.04),0_4px_12px_rgba(20,20,20,0.06)]">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-5 h-5 text-accent" />
          <h3 className="font-display font-bold text-lg text-ink">Evolução do Bem-Estar</h3>
        </div>
        
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--z-line-soft)" />
              <XAxis dataKey="semana" stroke="var(--z-text-3)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--z-text-3)" fontSize={10} tickLine={false} axisLine={false} domain={[0, 5]} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--z-surface)', 
                  border: '1px solid var(--z-line)', 
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(20,20,20,0.08)' 
                }}
                labelStyle={{ color: 'var(--z-text)', fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold' }}
                itemStyle={{ fontSize: '11px', fontWeight: '500' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '500' }} />
              <Line type="monotone" dataKey="Energia" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="Sono" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="Estresse" stroke="#F43F5E" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grouped Check-ins List */}
      <div className="space-y-6">
        {monthGroups.map((group) => (
          <div key={group.key} className="space-y-3">
            {/* Cabeçalho do Mês */}
            <div className="flex items-center gap-3 pt-2 pb-1">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink-3">
                {group.label}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-accent/10 text-accent border border-accent/20">
                {group.checkins.length} {group.checkins.length === 1 ? 'check-in' : 'check-ins'}
              </span>
              <div className="flex-1 h-[1px] bg-line-soft" />
            </div>

            {/* Registros de Semana do Mês */}
            <div className="space-y-2.5">
              {group.checkins.map((c) => {
                const isOpen = expandedIds.has(c.id);
                const weightTrend = weightTrendMap.get(c.id);

                return (
                  <div
                    key={c.id}
                    className="bg-surface border border-line rounded-[18px] overflow-hidden shadow-[0_1px_2px_rgba(20,20,20,0.04),0_4px_12px_rgba(20,20,20,0.06)] hover:shadow-[0_4px_20px_rgba(20,20,20,0.08)] transition-all"
                  >
                    {/* Linha Compacta (Botão Recolhível) */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(c.id)}
                      aria-expanded={isOpen}
                      aria-controls={`checkin-detail-${c.id}`}
                      className="w-full px-4 sm:px-5 py-3.5 sm:py-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 text-left hover:bg-bg/50 transition-colors cursor-pointer group"
                    >
                      {/* Data da Semana e Data de Envio */}
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span className="font-mono font-bold text-xs sm:text-sm text-ink">
                            Semana {formatShortWeekDate(c.semana, c.criado_em)}
                          </span>
                        </div>
                        <span className="text-[11px] text-ink-3">
                          Enviado em {formatSubmissionDate(c.criado_em)}
                        </span>
                      </div>

                      {/* Mini-resumo à direita & Chevron */}
                      <div className="flex items-center gap-2.5 sm:gap-3 ml-auto sm:ml-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 bg-bg px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-line-soft text-xs">
                          <span className="flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            <span className="font-mono font-bold text-ink">{c.energia}</span>
                          </span>
                          <span className="text-ink-3/40">•</span>
                          <span className="flex items-center gap-1">
                            <Moon className="w-3.5 h-3.5 text-violet-500" />
                            <span className="font-mono font-bold text-ink">{c.qualidade_sono}</span>
                          </span>
                          <span className="text-ink-3/40">•</span>
                          <span className="flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 text-accent" />
                            <span className="font-mono font-bold text-ink">{c.nivel_estresse}</span>
                          </span>
                          {c.peso_kg !== null && c.peso_kg !== undefined && (
                            <>
                              <span className="text-ink-3/40">•</span>
                              <span className="font-mono font-bold text-ink">{c.peso_kg}kg</span>
                            </>
                          )}
                        </div>

                        <ChevronDown
                          aria-hidden="true"
                          className={`w-4 h-4 text-ink-3 transition-transform duration-300 group-hover:text-ink shrink-0 ${
                            isOpen ? 'rotate-180 text-accent' : ''
                          }`}
                        />
                      </div>
                    </button>

                    {/* Detalhes Expandidos */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          id={`checkin-detail-${c.id}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden border-t border-line-soft"
                        >
                          <div className="p-4 sm:p-5 space-y-4 bg-surface">
                            {/* Grid dos 3 Tiles */}
                            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                              <div className="bg-bg p-3 rounded-xl flex flex-col items-center gap-1 border border-line-soft">
                                <Zap className="w-4 h-4 text-amber-500" />
                                <span className="text-base sm:text-lg font-mono font-black text-ink">{c.energia}/5</span>
                                <span className="text-[8px] sm:text-[9px] font-mono uppercase text-ink-3 tracking-wider">Energia</span>
                              </div>
                              <div className="bg-bg p-3 rounded-xl flex flex-col items-center gap-1 border border-line-soft">
                                <Moon className="w-4 h-4 text-violet-500" />
                                <span className="text-base sm:text-lg font-mono font-black text-ink">{c.qualidade_sono}/5</span>
                                <span className="text-[8px] sm:text-[9px] font-mono uppercase text-ink-3 tracking-wider">Sono</span>
                              </div>
                              <div className="bg-bg p-3 rounded-xl flex flex-col items-center gap-1 border border-line-soft">
                                <Flame className="w-4 h-4 text-accent" />
                                <span className="text-base sm:text-lg font-mono font-black text-ink">{c.nivel_estresse}/5</span>
                                <span className="text-[8px] sm:text-[9px] font-mono uppercase text-ink-3 tracking-wider">Estresse</span>
                              </div>
                            </div>

                            {/* Peso e Dores */}
                            {(c.peso_kg || c.dores) && (
                              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                {c.peso_kg !== null && c.peso_kg !== undefined && (
                                  <div className="flex items-center gap-2 text-ink-2">
                                    <Scale className="w-4 h-4 text-accent" />
                                    <span className="text-xs font-mono font-bold text-ink">
                                      Peso: {c.peso_kg} kg
                                    </span>
                                    {weightTrend && weightTrend.type !== 'equal' && (
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border flex items-center gap-0.5 ${
                                          weightTrend.type === 'up'
                                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                            : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                        }`}
                                      >
                                        {weightTrend.formatted}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {c.dores && (
                                  <div className="flex items-center gap-1.5 text-rose-500 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span className="text-xs font-medium">Dores: {c.dores}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Observações */}
                            {c.observacoes && (
                              <div className="bg-bg p-3.5 rounded-xl border border-line-soft">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <MessageSquare className="w-3.5 h-3.5 text-ink-3" />
                                  <span className="text-[10px] font-mono text-ink-3 uppercase tracking-wider font-semibold">
                                    Observações do aluno:
                                  </span>
                                </div>
                                <p className="text-xs text-ink-2 italic leading-relaxed">
                                  "{c.observacoes}"
                                </p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
