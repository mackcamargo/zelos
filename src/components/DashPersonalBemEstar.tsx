import React, { useState, useEffect } from 'react';
import { 
  Users, AlertCircle, TrendingUp, Search, 
  ChevronRight, ArrowUpRight, ArrowDownRight,
  Filter, Bell, Sparkles, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService } from '../lib/supabase';

interface DashPersonalBemEstarProps {
  personalId: string;
  onSelectAluno: (alunoId: string) => void;
}

export const DashPersonalBemEstar: React.FC<DashPersonalBemEstarProps> = ({ personalId, onSelectAluno }) => {
  const [loading, setLoading] = useState(true);
  const [alunostats, setAlunoStats] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadStats();
  }, [personalId]);

  const loadStats = async () => {
    setLoading(true);
    const { data } = await dbService.getResumoAlunosPersonal(personalId);
    if (data) setAlunoStats(data);
    setLoading(false);
  };

  const filteredAlunos = alunostats.filter(a => 
    a.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const alunosAtencao = alunostats.filter(a => 
    a.resumo && (a.resumo.indiceGeral < 60 || a.resumo.detalhes.treino.valor < 70)
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-flame/20 border-t-flame animate-spin" />
        <p className="text-[10px] font-mono text-ink-3 uppercase tracking-[0.2em]">Processando dados dos alunos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Overview Stats */}
      <section className="grid grid-cols-2 gap-4">
        <div className="bg-surface border border-white/5 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-3 mb-4 text-emerald">
            <div className="p-2 rounded-lg bg-emerald/10 border border-emerald/20">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-ink-3">Média Geral</span>
          </div>
          <h3 className="text-3xl font-black text-ink">
            {alunostats.length > 0 
              ? Math.round(alunostats.reduce((acc, a) => acc + (a.resumo?.indiceGeral || 0), 0) / alunostats.length) 
              : 0}
          </h3>
          <p className="text-[10px] text-emerald font-bold mt-1 uppercase tracking-tighter flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> +4% vs semana passada
          </p>
        </div>

        <div className="bg-surface border border-white/5 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-3 mb-4 text-flame">
            <div className="p-2 rounded-lg bg-flame/10 border border-flame/20">
              <AlertCircle className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-ink-3">Sob Atenção</span>
          </div>
          <h3 className="text-3xl font-black text-ink">{alunosAtencao.length}</h3>
          <p className="text-[10px] text-flame font-bold mt-1 uppercase tracking-tighter">
            Alunos com índice baixo
          </p>
        </div>
      </section>

      {/* Attention Required List */}
      {alunosAtencao.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-flame" />
              <h4 className="text-sm font-bold text-ink uppercase tracking-wider">Atenção Prioritária</h4>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-flame/10 text-flame text-[10px] font-bold">
              {alunosAtencao.length} ALUNOS
            </span>
          </div>
          
          <div className="space-y-3">
            {alunosAtencao.map(aluno => (
              <motion.button
                key={aluno.alunoId}
                onClick={() => onSelectAluno(aluno.alunoId)}
                whileHover={{ x: 4 }}
                className="w-full bg-flame/5 border border-flame/10 rounded-2xl p-4 flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {aluno.avatar ? (
                      <img src={aluno.avatar} className="w-12 h-12 rounded-full border-2 border-flame/20 object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center border-2 border-flame/20">
                        <User className="w-6 h-6 text-ink-3" />
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-flame rounded-full border-2 border-black flex items-center justify-center">
                      <AlertCircle className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <div className="text-left">
                    <h5 className="font-bold text-ink leading-tight">{aluno.nome}</h5>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-mono text-flame uppercase font-bold tracking-widest">
                        Índice: {aluno.resumo?.indiceGeral}%
                      </span>
                      <span className="text-[9px] text-ink-3">•</span>
                      <span className="text-[9px] font-mono text-ink-3 uppercase tracking-widest">
                        Treino: {aluno.resumo?.detalhes.treino.valor}%
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-ink-3 group-hover:text-flame transition-colors" />
              </motion.button>
            ))}
          </div>
        </section>
      )}

      {/* Main List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-ink uppercase tracking-wider">Todos os Alunos</h4>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-3" />
            <input 
              type="text" 
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-surface border border-white/5 rounded-full py-1.5 pl-8 pr-4 text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-flame/30 w-32 md:w-48 transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredAlunos.map(aluno => (
            <button
              key={aluno.alunoId}
              onClick={() => onSelectAluno(aluno.alunoId)}
              className="bg-surface border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:border-white/10 transition-colors group"
            >
              <div className="flex items-center gap-4">
                {aluno.avatar ? (
                  <img src={aluno.avatar} className="w-10 h-10 rounded-full border border-white/10 object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center border border-white/10">
                    <User className="w-5 h-5 text-ink-3" />
                  </div>
                )}
                <div className="text-left">
                  <h5 className="font-bold text-ink text-sm">{aluno.nome}</h5>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          (aluno.resumo?.indiceGeral || 0) >= 85 ? 'bg-emerald' : 
                          (aluno.resumo?.indiceGeral || 0) >= 60 ? 'bg-amber' : 
                          'bg-flame'
                        }`}
                        style={{ width: `${aluno.resumo?.indiceGeral || 0}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-ink-3 uppercase">
                      {aluno.resumo?.indiceGeral || 0}%
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-3 group-hover:text-flame transition-colors" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
