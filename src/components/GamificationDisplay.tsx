import React, { useState, useEffect } from 'react';
import { dbService } from '../lib/supabase';
import { Conquista, AlunoConquista, RecordePessoal } from '../types';
import { 
  Trophy, Award, Star, Flame, 
  Target, Dumbbell, History, Lock,
  ChevronRight, Sparkles, Loader2,
  ChevronDown, ChevronUp, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GamificationDisplayProps {
  alunoId: string;
  isPersonalView?: boolean;
}

export default function GamificationDisplay({ alunoId, isPersonalView = false }: GamificationDisplayProps) {
  const [conquistas, setConquistas] = useState<Conquista[]>([]);
  const [alunoConquistas, setAlunoConquistas] = useState<AlunoConquista[]>([]);
  const [prs, setPrs] = useState<RecordePessoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPrIds, setExpandedPrIds] = useState<number[]>([]);

  useEffect(() => {
    loadData();
  }, [alunoId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allC, alunoC, allPrs] = await Promise.all([
        dbService.getConquistas(),
        dbService.getAlunoConquistas(alunoId),
        dbService.getRecordesPessoais(alunoId)
      ]);
      
      if (allC.data) setConquistas(allC.data);
      if (alunoC.data) setAlunoConquistas(alunoC.data);
      if (allPrs.data) setPrs(allPrs.data);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandPr = (id: number) => {
    setExpandedPrIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* SEÇÃO: RECORDES PESSOAIS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <Dumbbell className="w-4 h-4 text-amber-500" />
            </div>
            <h3 className="font-display font-bold text-lg text-ink">Meus Recordes (PRs)</h3>
          </div>
          <span className="text-[10px] font-mono font-bold text-ink-3 uppercase bg-bg border border-line px-2.5 py-1 rounded-full">
            {prs.length} registrados
          </span>
        </div>

        {/* Lista de PRs Compacta / Expansível */}
        <div className="space-y-2.5">
          {prs.map((pr, index) => {
            const prId = pr.id || (index + 1);
            const isExpanded = expandedPrIds.includes(prId);
            const formattedDate = pr.data ? new Date(pr.data).toLocaleDateString('pt-BR') : 'Sem data';

            return (
              <div 
                key={prId}
                className="bg-surface border border-line rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(20,20,20,0.04)] hover:border-line-strong transition-all"
              >
                {/* Linha da Lista - Clicável para abrir/fechar */}
                <div 
                  onClick={() => toggleExpandPr(prId)}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none bg-surface hover:bg-bg/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-display font-bold text-sm text-ink truncate leading-snug">
                        {pr.exercicio_nome || 'Exercício'}
                      </h4>
                      <p className="text-[11px] text-ink-3 font-mono truncate mt-0.5">
                        Recorde de Carga
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="px-3 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 font-mono font-bold text-xs sm:text-sm rounded-xl">
                      {pr.carga_kg} kg
                    </span>

                    <div className="p-1 text-ink-3 rounded-lg">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-ink-2" /> : <ChevronDown className="w-4 h-4 text-ink-3" />}
                    </div>
                  </div>
                </div>

                {/* Detalhes Expansíveis */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-line-soft bg-bg/40"
                    >
                      <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                        <div className="flex items-center gap-2 text-ink-2">
                          <Calendar className="w-3.5 h-3.5 text-amber-500" />
                          <span>Data do recorde: <strong className="text-ink">{formattedDate}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-amber-600 font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg w-fit">
                          <Flame className="w-3.5 h-3.5" />
                          <span>Recorde Pessoal Confirmado</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {prs.length === 0 && (
            <div className="py-8 text-center bg-surface rounded-2xl border border-dashed border-line p-6">
              <p className="text-xs text-ink-3 italic">Nenhum recorde registrado ainda. Supere seus limites!</p>
            </div>
          )}
        </div>
      </section>

      {/* SEÇÃO: CONQUISTAS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#F26A1B]/10 rounded-xl border border-[#F26A1B]/20">
              <Award className="w-4 h-4 text-[#F26A1B]" />
            </div>
            <h3 className="font-display font-bold text-lg text-ink">Conquistas & Badges</h3>
          </div>
          <span className="text-[10px] font-mono font-bold text-ink-3 uppercase bg-bg border border-line px-2.5 py-1 rounded-full">
            {alunoConquistas.length} / {conquistas.length} completas
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {conquistas.map((conquista) => {
            const isUnlocked = alunoConquistas.some(ac => ac.conquista_id === conquista.id);
            
            return (
              <div 
                key={conquista.id}
                className={`relative flex flex-col items-center text-center p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 group ${
                  isUnlocked 
                    ? 'bg-surface border-line hover:border-[#F26A1B]/30 hover:scale-[1.02] shadow-[0_1px_2px_rgba(20,20,20,0.04)]' 
                    : 'bg-bg/50 border-line/50 opacity-50 grayscale'
                }`}
              >
                {!isUnlocked && (
                  <div className="absolute top-2.5 right-2.5">
                    <Lock className="w-3 h-3 text-ink-3" />
                  </div>
                )}
                
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-2xl mb-2.5 transition-all ${
                  isUnlocked ? 'bg-[#F26A1B]/10 border border-[#F26A1B]/20 shadow-xs' : 'bg-surface border border-line'
                }`}>
                  {conquista.icone}
                </div>

                <div className="space-y-1 w-full">
                  <h4 className={`text-xs font-bold leading-tight truncate ${isUnlocked ? 'text-ink' : 'text-ink-3'}`}>
                    {conquista.nome}
                  </h4>
                  <p className="text-[10px] text-ink-3 leading-snug line-clamp-2">
                    {conquista.descricao}
                  </p>
                </div>

                {isUnlocked && (
                  <div className="absolute -bottom-1 -right-1 p-1 bg-white rounded-full text-[#F26A1B] shadow-md scale-0 group-hover:scale-100 transition-transform">
                    <Sparkles className="w-3 h-3" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
