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

      <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-3"}>
        <AnimatePresence mode="popLayout">
          {alunosFiltrados.map((aluno) => (
            <motion.div
              layout
              key={aluno.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => {
                if (aluno.ultimoCheckin) {
                  setSelectedAluno({ id: aluno.id, nome: aluno.profile.nome });
                }
              }}
              className={`z-card z-card--tap space-y-4 ${
                !aluno.ultimoCheckin 
                  ? 'opacity-60' 
                  : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-raise border border-line flex items-center justify-center font-display font-bold text-accent overflow-hidden">
                    {aluno.profile.avatar_url ? (
                      <img src={aluno.profile.avatar_url} alt={aluno.profile.nome} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      aluno.profile.nome.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-ink leading-none">{aluno.profile.nome}</h4>
                    {aluno.ultimoCheckin ? (
                      <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-mono text-ink-3">
                        <Calendar className="w-3 h-3" />
                        <span>Semana: {(() => {
                          const [ano, mes, dia] = aluno.ultimoCheckin.semana.split("-").map(Number);
                          return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR');
                        })()}</span>
                      </div>
                    ) : (
                      <p className="z-eyebrow mt-1 text-danger">Sem check-in ainda</p>
                    )}
                  </div>
                </div>

                {aluno.ultimoCheckin?.dores && (
                  <div className="flex items-center gap-1 bg-danger/10 border border-danger/20 text-danger px-2 py-1 rounded-lg animate-pulse">
                    <AlertCircle className="w-3 h-3" />
                    <span className="text-[9px] font-mono font-bold uppercase">Dor relatada</span>
                  </div>
                )}
              </div>

              {aluno.ultimoCheckin ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-bg p-2.5 rounded-2xl flex flex-col items-center gap-1 border border-line">
                      <Zap className={`w-3.5 h-3.5 ${getIndicatorColor(aluno.ultimoCheckin.energia, 'normal')}`} />
                      <span className="text-sm font-mono font-black text-ink z-num">{aluno.ultimoCheckin.energia}/5</span>
                      <span className="text-[9px] z-eyebrow text-ink-3">Energia</span>
                    </div>
                    <div className="bg-bg p-2.5 rounded-2xl flex flex-col items-center gap-1 border border-line">
                      <Moon className={`w-3.5 h-3.5 ${getIndicatorColor(aluno.ultimoCheckin.qualidade_sono, 'normal')}`} />
                      <span className="text-sm font-mono font-black text-ink z-num">{aluno.ultimoCheckin.qualidade_sono}/5</span>
                      <span className="text-[9px] z-eyebrow text-ink-3">Sono</span>
                    </div>
                    <div className="bg-bg p-2.5 rounded-2xl flex flex-col items-center gap-1 border border-line">
                      <Flame className={`w-3.5 h-3.5 ${getIndicatorColor(aluno.ultimoCheckin.nivel_estresse, 'inverted')}`} />
                      <span className="text-sm font-mono font-black text-ink z-num">{aluno.ultimoCheckin.nivel_estresse}/5</span>
                      <span className="text-[9px] z-eyebrow text-ink-3">Estresse</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      {aluno.ultimoCheckin.peso_kg && (
                        <div className="flex items-center gap-2 text-ink-2">
                          <Scale className="w-3.5 h-3.5" />
                          <span>Peso: <span className="z-num">{aluno.ultimoCheckin.peso_kg} kg</span></span>
                        </div>
                      )}
                      <span className="text-ink-3 ml-auto italic">
                        Enviado {new Date(aluno.ultimoCheckin.criado_em).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    {aluno.ultimoCheckin.dores && (
                      <div className="bg-danger/5 border border-danger/10 p-3 rounded-xl">
                        <p className="text-[10px] text-danger font-bold uppercase mb-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Relato de Dor
                        </p>
                        <p className="text-xs text-ink-2 leading-relaxed italic">"{aluno.ultimoCheckin.dores}"</p>
                      </div>
                    )}

                    {aluno.ultimoCheckin.observacoes && (
                      <div className="bg-bg p-3 rounded-xl border border-line">
                        <div className="flex items-center gap-2 mb-1">
                          <MessageSquare className="w-3 h-3 text-ink-3" />
                          <span className="text-[10px] font-mono text-ink-3 uppercase">Obs:</span>
                        </div>
                        <p className="text-xs text-ink-2 italic leading-relaxed">"{aluno.ultimoCheckin.observacoes}"</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-6 flex flex-col items-center justify-center bg-bg rounded-2xl border border-dashed border-line">
                  <p className="z-eyebrow text-ink-3">Aguardando check-in do aluno</p>
                </div>
              )}
            </motion.div>
          ))}
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
