import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, TrendingUp, Search, 
  ChevronRight, ArrowUpRight, Bell, User
} from 'lucide-react';
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
      <div className="z-page pb-20 space-y-8">
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="z-card h-28 z-skeleton" />
          <div className="z-card h-28 z-skeleton" />
        </section>
        <section className="space-y-4">
          <div className="h-6 w-32 z-skeleton rounded-md" />
          <div className="z-card z-card--flush">
            <div className="p-4 space-y-4">
              <div className="flex gap-4 items-center">
                <div className="w-10 h-10 rounded-full z-skeleton" />
                <div className="flex-1 space-y-2">
                   <div className="h-4 w-1/3 z-skeleton rounded" />
                   <div className="h-3 w-1/2 z-skeleton rounded" />
                </div>
              </div>
              <div className="flex gap-4 items-center">
                <div className="w-10 h-10 rounded-full z-skeleton" />
                <div className="flex-1 space-y-2">
                   <div className="h-4 w-1/4 z-skeleton rounded" />
                   <div className="h-3 w-1/3 z-skeleton rounded" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="z-page pb-20 space-y-8">
      {/* Overview Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI: Média Geral */}
        <div className="z-card z-card--rail z-rail-ok">
          <div className="z-eyebrow mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-ok" strokeWidth={1.75} />
            Média geral
          </div>
          <div className="z-stat">
            <div className="z-stat__value text-ink z-num">
              {alunostats.length > 0 
                ? Math.round(alunostats.reduce((acc, a) => acc + (a.resumo?.indiceGeral || 0), 0) / alunostats.length) 
                : 0}%
            </div>
            <span className="z-stat__delta z-stat__delta--up mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" /> +4% vs semana passada
            </span>
          </div>
        </div>

        {/* KPI: Sob Atenção */}
        <div className="z-card z-card--rail z-rail-alert">
          <div className="z-eyebrow mb-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-danger" strokeWidth={1.75} />
            Sob atenção
          </div>
          <div className="z-stat">
            <div className="z-stat__value text-ink z-num">
              {alunosAtencao.length}
            </div>
            <span className="z-sub mt-1">
              Alunos com índice baixo
            </span>
          </div>
        </div>
      </section>

      {/* Attention Required List */}
      {alunosAtencao.length > 0 && (
        <section className="space-y-4">
          <div className="z-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-danger" strokeWidth={1.75} />
              <h4 className="z-h2 text-ink">Atenção prioritária</h4>
            </div>
            <span className="z-badge z-badge--danger z-num">
              {alunosAtencao.length} {alunosAtencao.length === 1 ? 'aluno' : 'alunos'}
            </span>
          </div>
          
          <div className="z-card z-card--flush">
            <div className="z-list">
              {alunosAtencao.map(aluno => (
                <div
                  key={aluno.alunoId}
                  onClick={() => onSelectAluno(aluno.alunoId)}
                  className="z-row group"
                >
                  <div className="z-avatar">
                    {aluno.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="z-row__main">
                    <div className="z-row__name text-ink">{aluno.nome}</div>
                    <div className="z-row__meta">
                      Índice: <span className="z-num text-danger font-semibold">{aluno.resumo?.indiceGeral}%</span> • Treino: <span className="z-num">{aluno.resumo?.detalhes.treino.valor}%</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-ink-3 group-hover:text-accent transition-colors" strokeWidth={1.75} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Main List */}
      <section className="space-y-4">
        <div className="z-between">
          <h4 className="z-h2 text-ink">Todos os alunos</h4>
          <div className="z-search max-w-xs w-full sm:w-48">
            <span className="z-search__icon">
              <Search className="w-4 h-4 text-ink-3" strokeWidth={1.75} />
            </span>
            <input 
              type="text" 
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="z-input !h-9 !text-xs !pl-9"
            />
          </div>
        </div>

        <div className="z-card z-card--flush">
          <div className="z-list">
            {filteredAlunos.length === 0 ? (
              <div className="z-empty">
                <span className="z-empty__title">Nenhum aluno encontrado</span>
                <p className="z-empty__hint">Não encontramos nenhum aluno correspondente à sua busca.</p>
              </div>
            ) : (
              filteredAlunos.map(aluno => (
                <div
                  key={aluno.alunoId}
                  onClick={() => onSelectAluno(aluno.alunoId)}
                  className="z-row group"
                >
                  <div className="z-avatar">
                    {aluno.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="z-row__main">
                    <div className="z-row__name text-ink">{aluno.nome}</div>
                    <div className="z-row__meta mt-0.5 flex items-center gap-2">
                      <div className="w-16 h-1 bg-line rounded-full overflow-hidden animate-none">
                        <div 
                          className={`h-full ${
                            (aluno.resumo?.indiceGeral || 0) >= 85 ? 'bg-ok' : 
                            (aluno.resumo?.indiceGeral || 0) >= 60 ? 'bg-warn' : 
                            'bg-danger'
                          }`}
                          style={{ width: `${aluno.resumo?.indiceGeral || 0}%` }}
                        />
                      </div>
                      <span className="z-num text-[12px]">
                        {aluno.resumo?.indiceGeral || 0}%
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-ink-3 group-hover:text-accent transition-colors" strokeWidth={1.75} />
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
