import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, Bell, Clock, MessageSquare, TrendingDown, 
  TrendingUp, RefreshCw, AlertCircle, ArrowRight, Sparkles, User, Loader2
} from 'lucide-react';
import { dbService } from '../lib/supabase';
import { motion } from 'motion/react';

interface DashPersonalBemEstarProps {
  personalId: string;
  onSelectAluno: (alunoId: string) => void;
  onSelectAlunoAndChat: (alunoId: string) => void;
  onNavigateToTab?: (tab: any) => void;
}

export const DashPersonalBemEstar: React.FC<DashPersonalBemEstarProps> = ({ 
  personalId, 
  onSelectAluno,
  onSelectAlunoAndChat,
  onNavigateToTab
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);

  const loadDashboardData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const { data, error: dbErr } = await dbService.getDashboardPersonal(personalId);
      if (dbErr) {
        throw dbErr;
      }
      setDashboardData(data);
    } catch (err: any) {
      console.error('Erro ao buscar dados do dashboard:', err);
      setError('Não foi possível carregar os dados do painel. Verifique sua conexão e tente novamente.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Auto refresh every 3 minutes
    const interval = setInterval(() => {
      loadDashboardData(false);
    }, 180000);

    return () => clearInterval(interval);
  }, [personalId]);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* KPI Row Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-surface/50 border border-line/40 rounded-3xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-4 w-24 bg-line/60 rounded" />
                <div className="h-8 w-8 bg-line/60 rounded-xl" />
              </div>
              <div className="h-8 w-16 bg-line/60 rounded" />
            </div>
          ))}
        </div>

        {/* Big Block Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-6 w-48 bg-line/60 rounded" />
            <div className="h-64 bg-surface/50 border border-line/40 rounded-3xl" />
          </div>
          <div className="space-y-4">
            <div className="h-6 w-32 bg-line/60 rounded" />
            <div className="h-64 bg-surface/50 border border-line/40 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-6 flex flex-col items-center text-center gap-4 max-w-lg mx-auto my-12">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <div>
          <h3 className="font-display font-semibold text-lg text-ink">Erro de carregamento</h3>
          <p className="text-sm text-ink-2 mt-1">{error}</p>
        </div>
        <button 
          onClick={() => loadDashboardData()}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent/90 active:scale-[0.98] text-white text-xs font-bold rounded-2xl transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Tentar novamente
        </button>
      </div>
    );
  }

  const kpis = dashboardData?.kpis || {
    alunos_ativos: 0,
    treinos_concluidos_semana: 0,
    treinos_total_semana: 0,
    checkins_pendentes: 0,
    sessoes_hoje: 0
  };

  const atencao = dashboardData?.atencao || [];
  const agenda = dashboardData?.agenda || [];
  const termometro = dashboardData?.termometro || {
    taxa_adesao_semana: 0,
    peso_variacao_media: null
  };

  // Math for Adesão KPI
  const totalTreinos = kpis.treinos_total_semana || 0;
  const concluidosTreinos = kpis.treinos_concluidos_semana || 0;
  const percentAdesao = totalTreinos > 0 ? Math.round((concluidosTreinos / totalTreinos) * 100) : null;

  // Split sessions into Today and Upcoming
  const todayStr = new Date().toDateString();
  const sessoesHojeList = agenda.filter((item: any) => {
    return new Date(item.data_hora).toDateString() === todayStr;
  });
  const sessoesProximasList = agenda.filter((item: any) => {
    return new Date(item.data_hora).toDateString() !== todayStr;
  });

  // Color mapper for Attention Reasons
  const getReasonBadgeStyle = (reason: string) => {
    const r = reason.toLowerCase();
    if (r.includes('7+') || r.includes('atencão') || r.includes('atenção')) {
      return "bg-red-500/10 border border-red-500/20 text-red-400";
    }
    if (r.includes('atrasado') || r.includes('pendente')) {
      return "bg-amber-500/10 border border-amber-500/20 text-amber-400";
    }
    if (r.includes('ortopédico') || r.includes('ortopedico') || r.includes('cuidado')) {
      return "bg-blue-500/10 border border-blue-500/20 text-blue-400";
    }
    return "bg-purple-500/10 border border-purple-500/20 text-purple-400";
  };

  return (
    <div className="space-y-6">
      {/* Action Header bar inside tab */}
      <div className="flex justify-between items-center bg-surface/30 border border-line/20 rounded-2xl p-3 px-4 shrink-0">
        <span className="text-xs font-medium text-ink-3">
          Resumo atualizado automaticamente a cada 3 minutos
        </span>
        <button 
          onClick={() => loadDashboardData(true)}
          className="p-2 rounded-xl bg-raise hover:bg-raise/80 hover:text-accent text-ink-2 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold border border-line/40"
          title="Recarregar dados"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Atualizar</span>
        </button>
      </div>

      {/* 1) TOP KPIS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Alunos Ativos */}
        <div className="bg-surface border border-line hover:border-line-strong transition-all rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-2">Alunos ativos</span>
            <div className="p-2 bg-accent/10 rounded-xl">
              <Users className="w-4 h-4 text-accent" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-display font-bold text-ink tracking-tight num">
              {kpis.alunos_ativos}
            </h3>
            <p className="text-[10px] text-ink-3 mt-1">Cadastrados na sua base</p>
          </div>
        </div>

        {/* KPI 2: Adesão da Semana */}
        <div className="bg-surface border border-line hover:border-line-strong transition-all rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-2">Adesão da semana</span>
            <div className="p-2 bg-[#F26A1B]/10 rounded-xl">
              <TrendingUp className="w-4 h-4 text-[#F26A1B]" />
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-3xl font-display font-bold text-ink tracking-tight num">
                {percentAdesao !== null ? `${percentAdesao}%` : '—'}
              </h3>
              <span className="text-[11px] font-medium text-ink-2 num">
                ({concluidosTreinos}/{totalTreinos})
              </span>
            </div>
            {percentAdesao !== null ? (
              <div className="w-full h-1.5 bg-line rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#F26A1B]" 
                  style={{ width: `${percentAdesao}%` }}
                />
              </div>
            ) : (
              <p className="text-[10px] text-ink-3">Sem treinos prescritos</p>
            )}
          </div>
        </div>

        {/* KPI 3: Check-ins Pendentes */}
        <button 
          onClick={() => onNavigateToTab?.('checkins')}
          className="bg-surface border border-line hover:border-[#F26A1B]/50 hover:shadow-lg hover:shadow-[#F26A1B]/5 transition-all rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden group text-left cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-ink-2">Check-ins pendentes</span>
            <div className={`p-2 rounded-xl transition-colors ${kpis.checkins_pendentes > 0 ? 'bg-[#F26A1B]/20 text-[#F26A1B]' : 'bg-surface border border-line text-ink-3'}`}>
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`text-3xl font-display font-bold tracking-tight num ${kpis.checkins_pendentes > 0 ? 'text-[#F26A1B]' : 'text-ink'}`}>
              {kpis.checkins_pendentes}
            </h3>
            <p className="text-[10px] text-ink-3 mt-1 flex items-center gap-1 group-hover:text-accent transition-colors">
              <span>Ver respostas semanais</span>
              <ArrowRight className="w-3 h-3" />
            </p>
          </div>
        </button>

        {/* KPI 4: Sessões Hoje */}
        <button 
          onClick={() => onNavigateToTab?.('agenda')}
          className="bg-surface border border-line hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5 transition-all rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden group text-left cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-ink-2">Sessões hoje</span>
            <div className="p-2 bg-accent/10 rounded-xl">
              <Calendar className="w-4 h-4 text-accent" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-display font-bold text-ink tracking-tight num">
              {kpis.sessoes_hoje}
            </h3>
            <p className="text-[10px] text-ink-3 mt-1 flex items-center gap-1 group-hover:text-accent transition-colors">
              <span>Ver agenda completa</span>
              <ArrowRight className="w-3 h-3" />
            </p>
          </div>
        </button>
      </div>

      {/* Main Grid: Atencao & Agenda/Termometro */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 2) PRECISAM DA SUA ATENÇÃO (Col Span 2) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 px-1">
            <AlertCircle className="w-4.5 h-4.5 text-[#F26A1B]" />
            <h2 className="font-display font-bold text-lg text-ink">Precisam da sua atenção</h2>
            <span className="bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider num">
              {atencao.length} ALUNOS
            </span>
          </div>

          <div className="bg-surface border border-line rounded-3xl p-6 relative overflow-hidden">
            {atencao.length === 0 ? (
              <div className="py-12 flex flex-col items-center text-center gap-3">
                <span className="text-4xl">🎉</span>
                <p className="font-display font-bold text-base text-ink">Tudo excelente por aqui!</p>
                <p className="text-xs text-ink-2 max-w-sm">Nenhum aluno precisando de atenção especial agora. Bom trabalho!</p>
              </div>
            ) : (
              <div className="divide-y divide-line/40 -my-3">
                {atencao.map((aluno: any) => (
                  <div key={aluno.aluno_id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Aluno Avatar */}
                      <div className="w-10 h-10 rounded-full brand-gradient-bg p-[1px] shrink-0">
                        <div className="w-full h-full rounded-full bg-raise flex items-center justify-center font-display font-bold text-ink text-sm overflow-hidden">
                          {aluno.avatar_url ? (
                            <img 
                              src={aluno.avatar_url} 
                              alt={aluno.nome} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            aluno.nome?.charAt(0).toUpperCase() || <User className="w-4 h-4 text-ink-3" />
                          )}
                        </div>
                      </div>

                      {/* Aluno Nome & Motivos */}
                      <div className="min-w-0 space-y-1.5">
                        <h4 className="font-semibold text-sm text-ink truncate">
                          {aluno.nome}
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {aluno.motivos?.map((motivo: string, idx: number) => (
                            <span 
                              key={idx} 
                              className={`text-[9px] font-mono px-2 py-0.5 rounded-lg font-bold tracking-wider uppercase ${getReasonBadgeStyle(motivo)}`}
                            >
                              {motivo}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0 sm:self-center self-end">
                      <button
                        onClick={() => onSelectAluno(aluno.aluno_id)}
                        className="py-2 px-3.5 rounded-xl bg-raise hover:bg-raise-strong border border-line text-ink text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                      >
                        Ver ficha
                      </button>
                      <button
                        onClick={() => onSelectAlunoAndChat(aluno.aluno_id)}
                        className="p-2 rounded-xl bg-accent hover:bg-accent/95 text-white transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1 text-xs font-bold"
                        title="Enviar mensagem"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span className="sm:inline hidden px-1">Mensagem</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Agenda & Termometro */}
        <div className="space-y-6">
          
          {/* 3) AGENDA (HOJE / PRÓXIMAS) */}
          <div className="space-y-4">
            <button 
              onClick={() => onNavigateToTab?.('agenda')}
              className="flex items-center justify-between w-full px-1 text-left group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4.5 h-4.5 text-[#F26A1B]" />
                <h2 className="font-display font-bold text-lg text-ink">Agenda das sessões</h2>
              </div>
              <span className="text-xs text-ink-3 group-hover:text-accent transition-colors flex items-center gap-0.5 font-semibold">
                Ver tudo <ArrowRight className="w-3 h-3" />
              </span>
            </button>

            <div className="bg-surface border border-line rounded-3xl p-6 space-y-4 relative overflow-hidden">
              {agenda.length === 0 ? (
                <div className="py-6 text-center text-xs text-ink-3">
                  Sem sessões agendadas.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Sessões de Hoje */}
                  {sessoesHojeList.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-accent font-bold">Hoje</span>
                      <div className="space-y-2">
                        {sessoesHojeList.map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between gap-3 p-2.5 bg-raise/50 border border-line/40 rounded-xl">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-xs font-bold text-accent font-mono num">
                                {new Date(item.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-ink truncate">{item.aluno_nome}</p>
                                <p className="text-[10px] text-ink-3">{item.tipo}</p>
                              </div>
                            </div>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Próximas Sessões */}
                  {sessoesProximasList.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-ink-3 font-bold">Próximas</span>
                      <div className="space-y-2">
                        {sessoesProximasList.map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between gap-3 p-2.5 bg-raise/20 border border-line/20 rounded-xl">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-xs font-bold text-ink-3 font-mono num">
                                {new Date(item.data_hora).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} {new Date(item.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-ink truncate">{item.aluno_nome}</p>
                                <p className="text-[10px] text-ink-3">{item.tipo}</p>
                              </div>
                            </div>
                            <span className="w-1.5 h-1.5 rounded-full bg-ink-3 shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 4) TERMÔMETRO DA BASE */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Sparkles className="w-4.5 h-4.5 text-[#F26A1B]" />
              <h2 className="font-display font-bold text-lg text-ink">Termômetro da base</h2>
            </div>

            <div className="bg-surface border border-line rounded-3xl p-5 space-y-4 relative overflow-hidden">
              {/* Taxa de adesão do termômetro */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-2">Adesão global</span>
                  <span className="text-xs font-bold text-ink num">{termometro.taxa_adesao_semana}%</span>
                </div>
                <div className="w-full h-2 bg-line rounded-full overflow-hidden flex">
                  <div 
                    className={`h-full rounded-full ${
                      termometro.taxa_adesao_semana >= 80 ? 'bg-emerald-500' :
                      termometro.taxa_adesao_semana >= 50 ? 'bg-amber-500' : 'bg-red-500'
                    }`} 
                    style={{ width: `${termometro.taxa_adesao_semana}%` }}
                  />
                </div>
                <p className="text-[10px] text-ink-3 flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    termometro.taxa_adesao_semana >= 80 ? 'bg-emerald-500' :
                    termometro.taxa_adesao_semana >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  }`} />
                  <span>
                    {termometro.taxa_adesao_semana >= 80 ? 'Engajamento excelente' :
                     termometro.taxa_adesao_semana >= 50 ? 'Atenção ao engajamento médio' : 'Engajamento crítico'}
                  </span>
                </p>
              </div>

              {/* Variação de Peso Média */}
              <div className="border-t border-line/40 pt-4 flex items-center justify-between gap-3">
                <span className="text-xs text-ink-2">Variação média de peso</span>
                {termometro.peso_variacao_media !== null && termometro.peso_variacao_media !== undefined ? (
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    {termometro.peso_variacao_media < 0 ? (
                      <>
                        <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
                          <TrendingDown className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-emerald-400 num">
                          {termometro.peso_variacao_media} kg em média
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="p-1 rounded-lg bg-[#F26A1B]/10 text-[#F26A1B]">
                          <TrendingUp className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[#F26A1B] num">
                          +{termometro.peso_variacao_media} kg em média
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-ink-3 italic">Sem dados suficientes</span>
                )}
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
