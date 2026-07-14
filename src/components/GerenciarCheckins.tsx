import React, { useState, useEffect } from 'react';
import { dbService } from '../lib/supabase';
import { Checkin, Aluno, Profile } from '../types';
import { 
  Zap, Moon, Flame, AlertCircle, Scale, 
  MessageSquare, Calendar, Loader2, Search,
  ChevronRight, Filter, SortAsc, LayoutGrid, List
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AlunoComCheckin extends Aluno {
  profile: Profile;
  ultimoCheckin?: Checkin;
}

export default function GerenciarCheckins({ personalId }: { personalId: string }) {
  const [alunos, setAlunos] = useState<AlunoComCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
      // Prioridade 1: Tem dor relatada no último check-in
      if (a.ultimoCheckin?.dores && !b.ultimoCheckin?.dores) return -1;
      if (!a.ultimoCheckin?.dores && b.ultimoCheckin?.dores) return 1;

      // Prioridade 2: Indicadores baixos (média de energia, sono, estresse < 3)
      const mediaA = a.ultimoCheckin ? (a.ultimoCheckin.energia + a.ultimoCheckin.qualidade_sono + (6 - a.ultimoCheckin.nivel_estresse)) / 3 : 0;
      const mediaB = b.ultimoCheckin ? (b.ultimoCheckin.energia + b.ultimoCheckin.qualidade_sono + (6 - b.ultimoCheckin.nivel_estresse)) / 3 : 0;
      
      if (a.ultimoCheckin && b.ultimoCheckin) {
        return mediaA - mediaB;
      }
      
      // Se um não tem checkin, fica por último
      if (a.ultimoCheckin && !b.ultimoCheckin) return -1;
      if (!a.ultimoCheckin && b.ultimoCheckin) return 1;
      
      return 0;
    });
  };

  const getIndicatorColor = (val: number, inverse = false) => {
    const score = inverse ? 6 - val : val;
    if (score >= 4) return 'text-emerald-400';
    if (score >= 3) return 'text-amber-400';
    return 'text-rose-400';
  };

  const alunosFiltrados = alunos.filter(a => 
    a.profile.nome.toLowerCase().includes(busca.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-flame animate-spin" />
        <p className="text-xs text-ink-3 font-mono uppercase tracking-widest">Sincronizando check-ins...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-black text-3xl text-ink tracking-tighter uppercase italic">
            Check<span className="text-flame">-ins</span>
          </h2>
          <p className="text-ink-3 text-xs font-mono uppercase tracking-widest mt-1">Acompanhamento Semanal</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
            <input 
              type="text"
              placeholder="Buscar aluno..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="bg-surface border border-white/5 rounded-xl py-2 pl-10 pr-4 text-xs text-ink focus:border-flame/30 outline-none w-48 transition-all"
            />
          </div>
          <div className="flex bg-surface border border-white/5 rounded-xl p-1">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/10 text-flame' : 'text-ink-3 hover:text-ink'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/10 text-flame' : 'text-ink-3 hover:text-ink'}`}
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
              className={`bg-surface border border-white/5 rounded-3xl p-5 space-y-4 hover:border-white/10 transition-all ${!aluno.ultimoCheckin ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-void border border-white/5 flex items-center justify-center font-display font-bold text-flame overflow-hidden">
                    {aluno.profile.avatar_url ? (
                      <img src={aluno.profile.avatar_url} alt={aluno.profile.nome} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      aluno.profile.nome.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-ink leading-none">{aluno.profile.nome}</h4>
                    {aluno.ultimoCheckin ? (
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-ink-3">
                        <Calendar className="w-3 h-3" />
                        <span>Semana: {new Date(aluno.ultimoCheckin.semana).toLocaleDateString('pt-BR')}</span>
                      </div>
                    ) : (
                      <p className="text-[10px] font-mono text-rose-400/70 mt-1 uppercase">Sem check-in ainda</p>
                    )}
                  </div>
                </div>

                {aluno.ultimoCheckin?.dores && (
                  <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2 py-1 rounded-lg animate-pulse">
                    <AlertCircle className="w-3 h-3" />
                    <span className="text-[9px] font-mono font-bold uppercase">Dor relatada</span>
                  </div>
                )}
              </div>

              {aluno.ultimoCheckin ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-void/50 p-2.5 rounded-2xl flex flex-col items-center gap-1 border border-white/5">
                      <Zap className={`w-3.5 h-3.5 ${getIndicatorColor(aluno.ultimoCheckin.energia)}`} />
                      <span className="text-sm font-mono font-black text-ink">{aluno.ultimoCheckin.energia}/5</span>
                      <span className="text-[7px] font-mono uppercase text-ink-3">Energia</span>
                    </div>
                    <div className="bg-void/50 p-2.5 rounded-2xl flex flex-col items-center gap-1 border border-white/5">
                      <Moon className={`w-3.5 h-3.5 ${getIndicatorColor(aluno.ultimoCheckin.qualidade_sono)}`} />
                      <span className="text-sm font-mono font-black text-ink">{aluno.ultimoCheckin.qualidade_sono}/5</span>
                      <span className="text-[7px] font-mono uppercase text-ink-3">Sono</span>
                    </div>
                    <div className="bg-void/50 p-2.5 rounded-2xl flex flex-col items-center gap-1 border border-white/5">
                      <Flame className={`w-3.5 h-3.5 ${getIndicatorColor(aluno.ultimoCheckin.nivel_estresse, true)}`} />
                      <span className="text-sm font-mono font-black text-ink">{aluno.ultimoCheckin.nivel_estresse}/5</span>
                      <span className="text-[7px] font-mono uppercase text-ink-3">Estresse</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      {aluno.ultimoCheckin.peso_kg && (
                        <div className="flex items-center gap-2 text-ink-2">
                          <Scale className="w-3.5 h-3.5" />
                          <span>Peso: {aluno.ultimoCheckin.peso_kg} kg</span>
                        </div>
                      )}
                      <span className="text-ink-3 ml-auto italic">
                        Enviado {new Date(aluno.ultimoCheckin.criado_em).toLocaleDateString()}
                      </span>
                    </div>

                    {aluno.ultimoCheckin.dores && (
                      <div className="bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl">
                        <p className="text-[10px] text-rose-400 font-bold uppercase mb-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Relato de Dor
                        </p>
                        <p className="text-xs text-rose-200/80 leading-relaxed italic">"{aluno.ultimoCheckin.dores}"</p>
                      </div>
                    )}

                    {aluno.ultimoCheckin.observacoes && (
                      <div className="bg-void/30 p-3 rounded-xl border border-white/5">
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
                <div className="py-6 flex flex-col items-center justify-center bg-void/20 rounded-2xl border border-dashed border-white/5">
                  <p className="text-[10px] font-mono text-ink-3 uppercase tracking-wider">Aguardando primeiro envio</p>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {alunosFiltrados.length === 0 && (
        <div className="bg-surface border border-white/5 rounded-3xl p-12 text-center">
          <p className="text-ink-3 text-sm">Nenhum aluno encontrado para "{busca}"</p>
        </div>
      )}
    </div>
  );
}
