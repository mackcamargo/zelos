import React, { useState, useEffect } from 'react';
import { dbService } from '../lib/supabase';
import { Conquista, AlunoConquista, RecordePessoal } from '../types';
import { 
  Trophy, Award, Star, Flame, 
  Target, Dumbbell, History, Lock,
  ChevronRight, Sparkles, Loader2
} from 'lucide-react';
import { motion } from 'motion/react';

interface GamificationDisplayProps {
  alunoId: string;
  isPersonalView?: boolean;
}

export default function GamificationDisplay({ alunoId, isPersonalView = false }: GamificationDisplayProps) {
  const [conquistas, setConquistas] = useState<Conquista[]>([]);
  const [alunoConquistas, setAlunoConquistas] = useState<AlunoConquista[]>([]);
  const [prs, setPrs] = useState<RecordePessoal[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 text-flame animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* SEÇÃO: RECORDES PESSOAIS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 rounded-xl">
              <Dumbbell className="w-4 h-4 text-amber-500" />
            </div>
            <h3 className="font-display font-bold text-lg text-ink">Meus Recordes (PRs)</h3>
          </div>
          <span className="text-[10px] font-mono text-ink-3 uppercase">{prs.length} registrados</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {prs.map((pr) => (
            <div 
              key={pr.id}
              className="bg-surface-2 border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:border-amber-500/20 transition-all"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-mono text-ink-3 uppercase mb-0.5">Exercício</p>
                <h4 className="font-display font-bold text-sm text-ink truncate">{pr.exercicio_nome}</h4>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] font-mono text-ink-3 uppercase mb-0.5">Carga</p>
                <p className="text-lg font-mono font-black text-amber-500">{pr.carga_kg} kg</p>
              </div>
            </div>
          ))}
          {prs.length === 0 && (
            <div className="col-span-full py-8 text-center bg-void/30 rounded-2xl border border-dashed border-white/5">
              <p className="text-xs text-ink-3 italic">Nenhum recorde registrado ainda. Supere seus limites!</p>
            </div>
          )}
        </div>
      </section>

      {/* SEÇÃO: CONQUISTAS */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-flame/10 rounded-xl">
              <Award className="w-4 h-4 text-flame" />
            </div>
            <h3 className="font-display font-bold text-lg text-ink">Conquistas & Badges</h3>
          </div>
          <span className="text-[10px] font-mono text-ink-3 uppercase">
            {alunoConquistas.length} / {conquistas.length} completas
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {conquistas.map((conquista) => {
            const isUnlocked = alunoConquistas.some(ac => ac.conquista_id === conquista.id);
            
            return (
              <div 
                key={conquista.id}
                className={`relative flex flex-col items-center text-center p-6 rounded-[32px] border transition-all duration-500 group ${
                  isUnlocked 
                    ? 'bg-surface-2 border-white/10 hover:border-flame/30 hover:scale-105' 
                    : 'bg-void border-white/5 opacity-50 grayscale'
                }`}
              >
                {!isUnlocked && (
                  <div className="absolute top-4 right-4">
                    <Lock className="w-3 h-3 text-ink-3" />
                  </div>
                )}
                
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl mb-4 transition-all duration-500 ${
                  isUnlocked ? 'brand-gradient-bg shadow-xl scale-110' : 'bg-surface-3'
                }`}>
                  {conquista.icone}
                </div>

                <div className="space-y-1">
                  <h4 className={`text-xs font-bold leading-tight ${isUnlocked ? 'text-ink' : 'text-ink-3'}`}>
                    {conquista.nome}
                  </h4>
                  <p className="text-[9px] text-ink-3 leading-snug line-clamp-2 px-2">
                    {conquista.descricao}
                  </p>
                </div>

                {isUnlocked && (
                  <div className="absolute -bottom-1 -right-1 p-1 bg-white rounded-full text-void shadow-lg scale-0 group-hover:scale-100 transition-transform">
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
