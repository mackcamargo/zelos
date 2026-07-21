import React, { useState, useEffect } from 'react';
import { dbService } from '../lib/supabase';
import { Checkin, Aluno, Profile } from '../types';
import { 
  Zap, Moon, Flame, AlertCircle, Scale, 
  MessageSquare, Calendar, Loader2, Search,
  ChevronRight, Filter, SortAsc, LayoutGrid, List
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import HistoricoCheckinModal from './HistoricoCheckinModal';

interface AlunoComCheckin extends Aluno {
  profile: Profile;
  ultimoCheckin?: Checkin;
}

export default function GerenciarCheckins({ personalId }: { personalId: string }) {
  const [alunos, setAlunos] = useState<AlunoComCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAluno, setSelectedAluno] = useState<{ id: string; nome: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [personalId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Busca todos os alunos do personal
      const { data: alunosData } = await dbService.getAlunos(personalId);
      if (!alunosData) return;

      // 2. Para cada aluno, busca o último check-in
      const alunosComCheckin = await Promise.all(
        alunosData.map(async (aluno) => {
          const { data: checkins } = await dbService.getCheckins(aluno.id);
          return {
            ...aluno,
            ultimoCheckin: checkins && checkins.length > 0 ? checkins[0] : undefined
          };
        })
      );

      // 3. Ordenação inicial (os que precisam de atenção primeiro)
      const sorted = sortAlunos(alunosComCheckin as AlunoComCheckin[]);
      setAlunos(sorted);
    } finally {
      setLoading(false);
    }
  };

  const sortAlunos = (list: AlunoComCheckin[]) => {
    return [...list].sort((a, b) => {
      const checkA = a.ultimoCheckin;
      const checkB = b.ultimoCheckin;

      // Se um não tem checkin, fica por último
      if (checkA && !checkB) return -1;
      if (!checkA && checkB) return 1;
      if (!checkA && !checkB) return 0;

      // Alunos que precisam de atenção (energia 1-2, sono 1-2, estresse 4-5 OU com dor)
      const isAttentionNeeded = (c: Checkin) => 
        (c.dores && c.dores.trim() !== '') || c.energia <= 2 || c.qualidade_sono <= 2 || c.nivel_estresse >= 4;

      const attA = isAttentionNeeded(checkA!);
      const attB = isAttentionNeeded(checkB!);

      if (attA && !attB) return -1;
      if (!attA && attB) return 1;

      // Ordenação secundária por data (mais recente primeiro)
      const [yA, mA, dA] = checkA!.semana.split("-").map(Number);
      const dateA = new Date(yA, mA - 1, dA).getTime();
      const [yB, mB, dB] = checkB!.semana.split("-").map(Number);
      const dateB = new Date(yB, mB - 1, dB).getTime();
      return dateB - dateA;
    });
  };

  const getIndicatorColor = (val: number, type: 'normal' | 'inverted') => {
    if (type === 'normal') {
      if (val >= 4) return 'text-ok';
      if (val >= 3) return 'text-warn';
      return 'text-danger';
    } else {
      // Estresse (Invertido): 1-2 Verde, 3 Amarelo, 4-5 Vermelho
      if (val <= 2) return 'text-ok';
      if (val === 3) return 'text-warn';
      return 'text-danger';
    }
  };

  const alunosFiltrados = alunos.filter(a => 
    a.profile.nome.toLowerCase().includes(busca.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
        <p className="z-eyebrow">Sincronizando check-ins...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="z-display text-ink">
            Check<span className="text-accent">ins</span>
          </h2>
          <p className="z-eyebrow mt-1">Acompanhamento Semanal</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="z-search max-w-xs w-full sm:w-48">
            <span className="z-search__icon">
              <Search className="w-4 h-4 text-ink-3" strokeWidth={1.75} />
            </span>
            <input 
              type="text"
              placeholder="Buscar aluno..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="z-input !h-9 !text-xs !pl-9"
            />
          </div>
          <div className="flex bg-raise border border-line rounded-xl p-1 gap-1">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-accent/10 text-accent' : 'text-ink-3 hover:text-ink'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-accent/10 text-accent' : 'text-ink-3 hover:text-ink'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-start" : "space-y-2"}>
        <AnimatePresence mode="popLayout">
          {alunosFiltrados.map((aluno) => {
            const hasCheckin = !!aluno.ultimoCheckin;
            const hasDor = hasCheckin && aluno.ultimoCheckin!.dores && aluno.ultimoCheckin!.dores.trim() !== '';
            
            if (viewMode === 'list') {
              return (
                <motion.div
                  layout
                  key={aluno.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  onClick={() => {
                    if (hasCheckin) {
                      setSelectedAluno({ id: aluno.id, nome: aluno.profile.nome });
                    }
                  }}
                  className={`bg-surface border ${hasDor ? 'border-red-400/40' : 'border-line'} hover:border-line-strong transition-all rounded-xl px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer shadow-sm hover:shadow-md ${
                    !hasCheckin ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-bg border border-line flex items-center justify-center font-display font-bold text-accent text-[10px] overflow-hidden shrink-0">
                      {aluno.profile.avatar_url ? (
                        <img src={aluno.profile.avatar_url} alt={aluno.profile.nome} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        aluno.profile.nome.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-display font-semibold text-[11px] text-ink truncate leading-tight">{aluno.profile.nome}</h4>
                      {hasCheckin ? (
                        <p className="text-[8px] text-ink-3">
                          Semana: {(() => {
                            const [ano, mes, dia] = aluno.ultimoCheckin!.semana.split("-").map(Number);
                            return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR');
                          })()}
                        </p>
                      ) : (
                        <p className="text-[8px] font-mono text-red-500/70 font-bold uppercase tracking-wider">Aguardando check-in</p>
                      )}
                    </div>
                  </div>

                  {hasCheckin ? (
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono ml-9 sm:ml-0">
                      <div className="flex items-center gap-1">
                        <span className="flex items-center gap-1 text-[9px] text-ink-2 bg-bg px-1.5 py-0.5 rounded-lg border border-line/40">
                          <Zap className={`w-2.5 h-2.5 ${getIndicatorColor(aluno.ultimoCheckin!.energia, 'normal')}`} />
                          <span className="font-bold text-ink num">{aluno.ultimoCheckin!.energia}</span>
                        </span>
                        <span className="flex items-center gap-1 text-[9px] text-ink-2 bg-bg px-1.5 py-0.5 rounded-lg border border-line/40">
                          <Moon className={`w-2.5 h-2.5 ${getIndicatorColor(aluno.ultimoCheckin!.qualidade_sono, 'normal')}`} />
                          <span className="font-bold text-ink num">{aluno.ultimoCheckin!.qualidade_sono}</span>
                        </span>
                        <span className="flex items-center gap-1 text-[9px] text-ink-2 bg-bg px-1.5 py-0.5 rounded-lg border border-line/40">
                          <Flame className={`w-2.5 h-2.5 ${getIndicatorColor(aluno.ultimoCheckin!.nivel_estresse, 'inverted')}`} />
                          <span className="font-bold text-ink num">{aluno.ultimoCheckin!.nivel_estresse}</span>
                        </span>
                      </div>

                      {aluno.ultimoCheckin!.peso_kg && (
                        <span className="text-[9px] text-ink-2 flex items-center gap-1 bg-bg px-1.5 py-0.5 rounded-lg border border-line/40">
                          <Scale className="w-2.5 h-2.5 text-ink-3" />
                          <span className="font-bold text-ink num">{aluno.ultimoCheckin!.peso_kg}kg</span>
                        </span>
                      )}

                      <div className="flex items-center gap-1">
                        {hasDor && (
                          <span className="bg-red-500/10 text-red-500 px-1 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider border border-red-500/20">DOR</span>
                        )}
                        {aluno.ultimoCheckin!.observacoes && aluno.ultimoCheckin!.observacoes.trim() !== '' && (
                          <span className="bg-accent/10 text-accent px-1 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider border border-accent/20">OBS</span>
                        )}
                      </div>
                      <span className="text-[8px] text-ink-3 italic">
                        {new Date(aluno.ultimoCheckin!.criado_em).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  ) : null}

                </motion.div>
              );
            }

            return (
              <motion.div
                layout
                key={aluno.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => {
                  if (hasCheckin) {
                    setSelectedAluno({ id: aluno.id, nome: aluno.profile.nome });
                  }
                }}
                className={`bg-surface border ${hasDor ? 'border-red-400/40' : 'border-line'} hover:border-line-strong transition-all rounded-2xl p-3 cursor-pointer shadow-sm hover:shadow-md relative overflow-hidden flex flex-col ${
                  !hasCheckin ? 'opacity-70' : ''
                }`}
              >
                {/* Lateral alert band for pain */}
                {hasDor && <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-red-500" />}

                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-bg border border-line flex items-center justify-center font-display font-bold text-accent text-xs overflow-hidden shrink-0">
                      {aluno.profile.avatar_url ? (
                        <img src={aluno.profile.avatar_url} alt={aluno.profile.nome} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        aluno.profile.nome.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-display font-semibold text-xs text-ink leading-tight truncate">
                        {aluno.profile.nome}
                      </h4>
                      {hasCheckin ? (
                        <div className="flex items-center gap-1 mt-0.5 text-[8px] font-mono text-ink-3">
                          <Calendar className="w-2.5 h-2.5" />
                          <span>{(() => {
                            const [ano, mes, dia] = aluno.ultimoCheckin!.semana.split("-").map(Number);
                            return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR');
                          })()}</span>
                        </div>
                      ) : (
                        <p className="text-[8px] font-mono text-red-500/70 font-bold uppercase tracking-wider mt-0.5">Sem check-in</p>
                      )}
                    </div>
                  </div>

                  {hasDor && (
                    <div className="flex items-center gap-0.5 bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider border border-red-500/20">
                      <AlertCircle className="w-2 h-2" /> Dor
                    </div>
                  )}
                </div>

                {hasCheckin ? (
                  <div className="mt-3 space-y-2.5">
                    <div className="grid grid-cols-3 gap-1">
                      <div className="bg-bg py-1.5 rounded-lg flex flex-col items-center justify-center border border-line/30">
                        <div className="flex items-center gap-1">
                          <Zap className={`w-2.5 h-2.5 ${getIndicatorColor(aluno.ultimoCheckin!.energia, 'normal')}`} />
                          <span className="text-[10px] font-mono font-bold text-ink num">{aluno.ultimoCheckin!.energia}</span>
                        </div>
                        <span className="text-[7px] uppercase tracking-wider text-ink-3 font-semibold mt-0.5">Energia</span>
                      </div>
                      <div className="bg-bg py-1.5 rounded-lg flex flex-col items-center justify-center border border-line/30">
                        <div className="flex items-center gap-1">
                          <Moon className={`w-2.5 h-2.5 ${getIndicatorColor(aluno.ultimoCheckin!.qualidade_sono, 'normal')}`} />
                          <span className="text-[10px] font-mono font-bold text-ink num">{aluno.ultimoCheckin!.qualidade_sono}</span>
                        </div>
                        <span className="text-[7px] uppercase tracking-wider text-ink-3 font-semibold mt-0.5">Sono</span>
                      </div>
                      <div className="bg-bg py-1.5 rounded-lg flex flex-col items-center justify-center border border-line/30">
                        <div className="flex items-center gap-1">
                          <Flame className={`w-2.5 h-2.5 ${getIndicatorColor(aluno.ultimoCheckin!.nivel_estresse, 'inverted')}`} />
                          <span className="text-[10px] font-mono font-bold text-ink num">{aluno.ultimoCheckin!.nivel_estresse}</span>
                        </div>
                        <span className="text-[7px] uppercase tracking-wider text-ink-3 font-semibold mt-0.5">Stress</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[8px] font-mono text-ink-3 border-t border-line/10 pt-2">
                        {aluno.ultimoCheckin!.peso_kg ? (
                          <div className="flex items-center gap-1">
                            <Scale className="w-2 h-2 text-ink-3" />
                            <span>Peso: <span className="text-ink font-bold num">{aluno.ultimoCheckin!.peso_kg}kg</span></span>
                          </div>
                        ) : (
                          <span />
                        )}
                        <span className="">{new Date(aluno.ultimoCheckin!.criado_em).toLocaleDateString('pt-BR')}</span>
                      </div>

                      {hasDor && (
                        <div className="bg-red-500/5 border border-red-500/10 p-2 rounded-lg">
                          <p className="text-[7px] text-red-500 font-bold uppercase mb-1 flex items-center gap-1">
                            <AlertCircle className="w-2 w-2" /> Relato de Dor
                          </p>
                          <p className="text-[10px] text-ink leading-tight italic">"{aluno.ultimoCheckin!.dores}"</p>
                        </div>
                      )}

                      {aluno.ultimoCheckin!.observacoes && aluno.ultimoCheckin!.observacoes.trim() !== '' && (
                        <div className="bg-bg p-2 rounded-lg border border-line/40">
                          <div className="flex items-center gap-1 mb-1">
                            <MessageSquare className="w-2 w-2 text-ink-3" />
                            <span className="text-[7px] font-mono text-ink-3 uppercase font-bold">Observações</span>
                          </div>
                          <p className="text-[10px] text-ink-2 italic leading-tight">"{aluno.ultimoCheckin!.observacoes}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 py-3 flex items-center justify-center bg-bg rounded-lg border border-dashed border-line">
                    <p className="text-[8px] font-mono text-ink-3 uppercase tracking-widest font-bold">Aguardando...</p>
                  </div>
                )}

              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {selectedAluno && (
        <HistoricoCheckinModal 
          alunoId={selectedAluno.id}
          alunoNome={selectedAluno.nome}
          onClose={() => setSelectedAluno(null)}
        />
      )}

      {alunosFiltrados.length === 0 && (
        <div className="z-card text-center p-12">
          <p className="text-ink-3 text-sm">Nenhum aluno encontrado para "{busca}"</p>
        </div>
      )}
    </div>
  );
}
