import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, Bell, Clock, MessageSquare, TrendingDown, 
  TrendingUp, RefreshCw, AlertCircle, ArrowRight, Sparkles, User, Loader2,
  X, MapPin, Video, FileText, CheckCircle2, XCircle
} from 'lucide-react';
import { dbService, supabase } from '../lib/supabase';
import { motion } from 'motion/react';

interface DashPersonalBemEstarProps {
  personalId: string;
  onSelectAluno: (alunoId: string) => void;
  onSelectAlunoAndChat: (alunoId: string) => void;
  onNavigateToTab?: (tab: any) => void;
  onUnauthorized?: () => void;
}

export const DashPersonalBemEstar: React.FC<DashPersonalBemEstarProps> = ({ 
  personalId, 
  onSelectAluno,
  onSelectAlunoAndChat,
  onNavigateToTab,
  onUnauthorized
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);

  const [selectedAgendamento, setSelectedAgendamento] = useState<any | null>(null);
  const [loadingAgendamento, setLoadingAgendamento] = useState<boolean>(false);
  const [cancelLoading, setCancelLoading] = useState<boolean>(false);
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const isTodayInBrazil = (dataHoraStr: string) => {
    try {
      const dateObj = new Date(dataHoraStr);
      if (isNaN(dateObj.getTime())) return false;
      
      const dateInSP = dateObj.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const todayInSP = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      
      return dateInSP === todayInSP;
    } catch (e) {
      return false;
    }
  };

  const formatTimeInBrazil = (dataHoraStr: string) => {
    try {
      const d = new Date(dataHoraStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit', 
        timeZone: 'America/Sao_Paulo' 
      });
    } catch (e) {
      return '';
    }
  };

  const formatDateInBrazil = (dataHoraStr: string) => {
    try {
      const d = new Date(dataHoraStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        timeZone: 'America/Sao_Paulo' 
      });
    } catch (e) {
      return '';
    }
  };

  const handleOpenSessao = async (id: number | string, initialData: any) => {
    setSelectedAgendamento(initialData);
    setLoadingAgendamento(true);
    setShowCancelConfirm(false);
    try {
      if (supabase) {
        const { data, error: dbErr } = await supabase
          .from('agendamentos')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (data && !dbErr) {
          setSelectedAgendamento({
            ...initialData,
            ...data
          });
        }
      }
    } catch (err) {
      console.error('Erro ao buscar detalhes da sessão:', err);
    } finally {
      setLoadingAgendamento(false);
    }
  };

  const handleCancelarSessao = async (id: number | string) => {
    setCancelLoading(true);
    try {
      if (supabase) {
        const { data, error: dbErr } = await supabase
          .from('agendamentos')
          .update({ status: 'cancelado' })
          .eq('id', id)
          .select();
          
        if (dbErr) throw dbErr;
        
        if (!data || data.length === 0) {
          showToast('Nenhuma sessão encontrada para cancelar ou você não tem permissão.');
          return;
        }

        showToast('Sessão cancelada com sucesso!');
        await loadDashboardData(false);
        setSelectedAgendamento(null);
        setShowCancelConfirm(false);
      } else {
        showToast('Supabase não configurado.');
      }
    } catch (err: any) {
      console.error('Erro ao cancelar sessão:', err);
      showToast(`Erro ao cancelar: ${err.message || err}`);
    } finally {
      setCancelLoading(false);
    }
  };

  const handleConfirmarSessao = async (id: number | string) => {
    setConfirmLoading(true);
    try {
      if (supabase) {
        const { data, error: dbErr } = await supabase
          .from('agendamentos')
          .update({ status: 'confirmado' })
          .eq('id', id)
          .select();
          
        if (dbErr) throw dbErr;
        
        if (!data || data.length === 0) {
          showToast('Nenhuma sessão encontrada para confirmar ou você não tem permissão.');
          return;
        }

        showToast('Sessão confirmada com sucesso!');
        await loadDashboardData(false);
        setSelectedAgendamento(null);
      } else {
        showToast('Supabase não configurado.');
      }
    } catch (err: any) {
      console.error('Erro ao confirmar sessão:', err);
      showToast(`Erro ao confirmar: ${err.message || err}`);
    } finally {
      setConfirmLoading(false);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'confirmado') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (s === 'cancelado') return 'text-red-400 bg-red-500/10 border-red-500/20';
    return 'text-amber bg-amber/10 border-amber/20';
  };

  const getStatusLabel = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'confirmado') return 'Confirmado';
    if (s === 'cancelado') return 'Cancelado';
    return 'Solicitado';
  };

  const formatSessaoDataHora = (dataHoraStr: string) => {
    try {
      const dateObj = new Date(dataHoraStr);
      if (isNaN(dateObj.getTime())) return dataHoraStr;
      
      const isToday = isTodayInBrazil(dataHoraStr);
      const timeStr = formatTimeInBrazil(dataHoraStr);
      
      if (isToday) {
        return `Hoje, ${timeStr}`;
      } else {
        const dayStr = formatDateInBrazil(dataHoraStr);
        return `${dayStr}, ${timeStr}`;
      }
    } catch (e) {
      return dataHoraStr;
    }
  };

  const loadDashboardData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const { data, error: dbErr } = await dbService.getDashboardPersonal(personalId);
      if (dbErr) {
        if (dbErr.code === 'UNAUTHORIZED' && onUnauthorized) {
          onUnauthorized();
          return;
        }
        throw dbErr;
      }
      setDashboardData(data);
    } catch (err: any) {
      console.error('Erro ao buscar dados do dashboard:', err);
      setError(err.message || 'Não foi possível carregar os dados do painel. Verifique sua conexão e tente novamente.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    if (!supabase) return;

    let debounceTimer: NodeJS.Timeout | null = null;

    const onChange = (payload: any) => {
      console.log('Realtime change received:', payload);
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadDashboardData(false);
      }, 800);
    };

    const canal = supabase.channel('dashboard-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'treinos', filter: `personal_id=eq.${personalId}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checkins', filter: `personal_id=eq.${personalId}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agendamentos', filter: `personal_id=eq.${personalId}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alunos', filter: `personal_id=eq.${personalId}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'aluno_condicoes' }, onChange)
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(canal);
    };
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
  const sessoesHojeList = agenda.filter((item: any) => isTodayInBrazil(item.data_hora));
  const sessoesProximasList = agenda.filter((item: any) => !isTodayInBrazil(item.data_hora));

  return (
    <div className="space-y-4 md:space-y-6">
      {/* 1) TOP KPIS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        {/* KPI 1: Alunos Ativos */}
        <div className="bg-surface border border-line hover:border-line-strong transition-all rounded-2xl md:rounded-3xl p-3 md:p-5 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] md:text-xs font-semibold text-ink-2">Alunos ativos</span>
            <div className="p-1.5 bg-accent/10 rounded-lg md:rounded-xl">
              <Users className="w-3.5 h-3.5 md:w-4 md:h-4 text-accent" />
            </div>
          </div>
          <div className="mt-2 md:mt-4">
            <h3 className="text-xl md:text-3xl font-display font-bold text-ink tracking-tight num">
              {kpis.alunos_ativos}
            </h3>
            <p className="text-[9px] md:text-[10px] text-ink-3 mt-0.5 md:mt-1">Na sua base</p>
          </div>
        </div>

        {/* KPI 2: Adesão da Semana */}
        <div className="bg-surface border border-line hover:border-line-strong transition-all rounded-2xl md:rounded-3xl p-3 md:p-5 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] md:text-xs font-semibold text-ink-2">Adesão da semana</span>
            <div className="p-1.5 bg-[#F26A1B]/10 rounded-lg md:rounded-xl">
              <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#F26A1B]" />
            </div>
          </div>
          <div className="mt-2 md:mt-4 space-y-1 md:space-y-1.5">
            <div className="flex items-baseline gap-1 md:gap-1.5 flex-wrap">
              <h3 className="text-xl md:text-3xl font-display font-bold text-ink tracking-tight num">
                {percentAdesao !== null ? `${percentAdesao}%` : '—'}
              </h3>
              <span className="text-[9px] md:text-[11px] font-medium text-ink-2 num">
                ({concluidosTreinos}/{totalTreinos})
              </span>
            </div>
            {percentAdesao !== null ? (
              <div className="w-full h-1 bg-line rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#F26A1B]" 
                  style={{ width: `${percentAdesao}%` }}
                />
              </div>
            ) : (
              <p className="text-[9px] md:text-[10px] text-ink-3">Sem treinos prescritos</p>
            )}
          </div>
        </div>

        {/* KPI 3: Check-ins Pendentes */}
        <button 
          onClick={() => onNavigateToTab?.('checkins')}
          className="bg-surface border border-line hover:border-[#F26A1B]/50 hover:shadow-lg hover:shadow-[#F26A1B]/5 transition-all rounded-2xl md:rounded-3xl p-3 md:p-5 flex flex-col justify-between relative overflow-hidden group text-left cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] md:text-xs font-semibold text-ink-2">Check-ins pendentes</span>
            <div className={`p-1.5 rounded-lg md:rounded-xl transition-colors ${kpis.checkins_pendentes > 0 ? 'bg-[#F26A1B]/20 text-[#F26A1B]' : 'bg-surface border border-line text-ink-3'}`}>
              <Bell className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </div>
          </div>
          <div className="mt-2 md:mt-4">
            <h3 className={`text-xl md:text-3xl font-display font-bold tracking-tight num ${kpis.checkins_pendentes > 0 ? 'text-[#F26A1B]' : 'text-ink'}`}>
              {kpis.checkins_pendentes}
            </h3>
            <p className="text-[9px] md:text-[10px] text-ink-3 mt-0.5 md:mt-1 flex items-center gap-0.5 md:gap-1 group-hover:text-accent transition-colors">
              <span>Ver respostas</span>
              <ArrowRight className="w-2.5 h-2.5 md:w-3 md:h-3" />
            </p>
          </div>
        </button>

        {/* KPI 4: Sessões Hoje */}
        <button 
          onClick={() => onNavigateToTab?.('agenda')}
          className="bg-surface border border-line hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5 transition-all rounded-2xl md:rounded-3xl p-3 md:p-5 flex flex-col justify-between relative overflow-hidden group text-left cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] md:text-xs font-semibold text-ink-2">Sessões hoje</span>
            <div className="p-1.5 bg-accent/10 rounded-lg md:rounded-xl">
              <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-accent" />
            </div>
          </div>
          <div className="mt-2 md:mt-4">
            <h3 className="text-xl md:text-3xl font-display font-bold text-ink tracking-tight num">
              {kpis.sessoes_hoje}
            </h3>
            <p className="text-[9px] md:text-[10px] text-ink-3 mt-0.5 md:mt-1 flex items-center gap-0.5 md:gap-1 group-hover:text-accent transition-colors">
              <span>Ver agenda</span>
              <ArrowRight className="w-2.5 h-2.5 md:w-3 md:h-3" />
            </p>
          </div>
        </button>
      </div>

      {/* Main Grid: Atencao & Agenda/Termometro */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        
        {/* 2) PRECISAM DA SUA ATENÇÃO (Col Span 2) */}
        <div className="lg:col-span-2 space-y-3 md:space-y-4">
          <div className="flex items-center gap-1.5 px-0.5">
            <AlertCircle className="w-4 md:w-4.5 md:h-4.5 text-[#F26A1B]" />
            <h2 className="font-display font-bold text-sm md:text-lg text-ink">Precisam da sua atenção</h2>
            <span className="bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold tracking-wider num">
              {atencao.length} ALUNOS
            </span>
          </div>

          <div className="bg-surface border border-line rounded-2xl md:rounded-3xl p-3 md:p-6 relative overflow-hidden">
            {atencao.length === 0 ? (
              <div className="py-8 md:py-12 flex flex-col items-center text-center gap-2 md:gap-3">
                <span className="text-3xl md:text-4xl">🎉</span>
                <p className="font-display font-bold text-sm md:text-base text-ink">Tudo excelente por aqui!</p>
                <p className="text-[11px] md:text-xs text-ink-2 max-w-sm">Nenhum aluno precisando de atenção especial agora. Bom trabalho!</p>
              </div>
            ) : (
              <div className="divide-y divide-line/40 -my-2 md:-my-3">
                {atencao.map((aluno: any) => (
                  <div key={aluno.aluno_id} className="py-1.5 md:py-2.5 flex flex-row items-center justify-between gap-2 md:gap-4 transition-colors group">
                    <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                      {/* Aluno Avatar */}
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full brand-gradient-bg p-[1px] shrink-0">
                        <div className="w-full h-full rounded-full bg-raise flex items-center justify-center font-display font-bold text-ink text-xs md:text-sm overflow-hidden">
                          {aluno.avatar_url ? (
                            <img 
                              src={aluno.avatar_url} 
                              alt={aluno.nome} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            aluno.nome?.charAt(0).toUpperCase() || <User className="w-3.5 h-3.5 text-ink-3" />
                          )}
                        </div>
                      </div>

                      {/* Aluno Nome & Motivos */}
                      <div className="min-w-0 space-y-0.5 flex-1">
                        <h4 className="font-semibold text-xs md:text-sm text-ink truncate">
                          {aluno.nome}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1 text-[11px] md:text-xs italic leading-tight">
                          {aluno.motivos?.map((motivo: string, idx: number) => {
                            const isUrgent = motivo.toLowerCase().includes('7+') || motivo.toLowerCase().includes('atencão') || motivo.toLowerCase().includes('atenção');
                            const textColor = isUrgent ? 'text-[#E07A6E]' : 'text-[#9A9A9A]';
                            return (
                              <React.Fragment key={idx}>
                                {idx > 0 && <span className="text-[#9A9A9A] not-italic px-0.5">·</span>}
                                <span className={`${textColor} lowercase`}>
                                  {motivo}
                                </span>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onSelectAluno(aluno.aluno_id)}
                        className="py-1 px-2 md:py-2 md:px-3.5 rounded-lg md:rounded-xl bg-raise hover:bg-raise-strong border border-line text-ink text-[10px] md:text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
                      >
                        Ver ficha
                      </button>
                      <button
                        onClick={() => onSelectAlunoAndChat(aluno.aluno_id)}
                        className="p-1.5 md:p-2 rounded-lg md:rounded-xl bg-accent hover:bg-accent/95 text-white transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1 text-[10px] md:text-xs font-bold"
                        title="Enviar mensagem"
                      >
                        <MessageSquare className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        <span className="md:inline hidden px-0.5">Mensagem</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Agenda & Termometro */}
        <div className="space-y-4 md:space-y-6">
          
          {/* 3) AGENDA (HOJE / PRÓXIMAS) */}
          <div className="space-y-3 md:space-y-4">
            <button 
              onClick={() => onNavigateToTab?.('agenda')}
              className="flex items-center justify-between w-full px-1 text-left group cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 md:w-4.5 md:h-4.5 text-[#F26A1B]" />
                <h2 className="font-display font-bold text-sm md:text-lg text-ink">Agenda das sessões</h2>
              </div>
              <span className="text-[10px] md:text-xs text-ink-3 group-hover:text-accent transition-colors flex items-center gap-0.5 font-semibold">
                Ver tudo <ArrowRight className="w-2.5 h-2.5 md:w-3 md:h-3" />
              </span>
            </button>

            <div className="bg-surface border border-line rounded-2xl md:rounded-3xl p-3 md:p-6 space-y-3 md:space-y-4 relative overflow-hidden">
              {agenda.length === 0 ? (
                <div className="py-4 md:py-6 text-center text-xs text-ink-3">
                  Sem sessões agendadas.
                </div>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  {/* Sessões de Hoje */}
                  {sessoesHojeList.length > 0 && (
                    <div className="space-y-1.5 md:space-y-2">
                      <span className="text-[9px] md:text-[10px] font-mono uppercase tracking-wider text-accent font-bold">Hoje</span>
                      <div className="space-y-1.5 md:space-y-2">
                        {sessoesHojeList.map((item: any) => (
                          <button 
                            key={item.id} 
                            onClick={() => handleOpenSessao(item.id, item)}
                            className="w-full text-left flex items-center justify-between gap-2 md:gap-3 p-2 md:p-2.5 bg-raise/50 border border-line/40 hover:border-accent/40 rounded-xl cursor-pointer hover:bg-raise/80 transition-all duration-200 active:scale-[0.99]"
                          >
                            <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
                              <span className="text-[10px] md:text-xs font-bold text-accent font-mono num">
                                {formatTimeInBrazil(item.data_hora)}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-ink truncate">{item.aluno_nome}</p>
                                <p className="text-[9px] md:text-[10px] text-ink-3">{item.tipo}</p>
                              </div>
                            </div>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Próximas Sessões */}
                  {sessoesProximasList.length > 0 && (
                    <div className="space-y-1.5 md:space-y-2">
                      <span className="text-[9px] md:text-[10px] font-mono uppercase tracking-wider text-ink-3 font-bold">Próximas</span>
                      <div className="space-y-1.5 md:space-y-2">
                        {sessoesProximasList.map((item: any) => (
                          <button 
                            key={item.id} 
                            onClick={() => handleOpenSessao(item.id, item)}
                            className="w-full text-left flex items-center justify-between gap-2 md:gap-3 p-2 md:p-2.5 bg-raise/20 border border-line/20 hover:border-accent/30 rounded-xl cursor-pointer hover:bg-raise/40 transition-all duration-200 active:scale-[0.99]"
                          >
                            <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
                              <span className="text-[10px] md:text-xs font-bold text-ink-3 font-mono num">
                                {formatDateInBrazil(item.data_hora)} {formatTimeInBrazil(item.data_hora)}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-ink truncate">{item.aluno_nome}</p>
                                <p className="text-[9px] md:text-[10px] text-ink-3">{item.tipo}</p>
                              </div>
                            </div>
                            <span className="w-1.5 h-1.5 rounded-full bg-ink-3 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>



        </div>

      </div>

      {/* POP-UP (modal) de Detalhes do Agendamento */}
      {selectedAgendamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay escuro rgba(0,0,0,0.6) */}
          <div 
            className="absolute inset-0 bg-black/60 transition-opacity" 
            onClick={() => setSelectedAgendamento(null)} 
          />
          
          {/* Card sólido opaco com borda 1px rgba(255,255,255,0.08) e radius 20px */}
          <motion.div 
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0 
            }}
            initial={{ 
              opacity: 0, 
              scale: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 0.95, 
              y: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 12 
            }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{ 
              border: '1px solid rgba(255,255,255,0.08)' 
            }}
            className="bg-surface rounded-[20px] shadow-2xl relative w-full max-w-md overflow-hidden z-10 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-line/40">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#F26A1B]">Detalhes da Sessão</span>
              <button 
                onClick={() => setSelectedAgendamento(null)}
                className="p-1.5 rounded-full hover:bg-raise border border-line text-ink-3 hover:text-ink transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {loadingAgendamento ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-ink-3">
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
                  <span className="text-xs">Carregando detalhes...</span>
                </div>
              ) : (
                <>
                  {/* Student Avatar + Name */}
                  <div className="flex items-center gap-3 bg-raise/20 p-3 rounded-xl border border-line/20">
                    <div className="w-12 h-12 rounded-full brand-gradient-bg p-[1px] shrink-0">
                      <div className="w-full h-full rounded-full bg-raise flex items-center justify-center font-display font-bold text-ink text-sm overflow-hidden">
                        {selectedAgendamento.aluno_avatar ? (
                          <img 
                            src={selectedAgendamento.aluno_avatar} 
                            alt={selectedAgendamento.aluno_nome}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          selectedAgendamento.aluno_nome?.charAt(0).toUpperCase() || <User className="w-5 h-5 text-ink-3" />
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-bold text-ink-3 uppercase tracking-wider block">Aluno(a)</span>
                      <h4 className="font-bold text-sm md:text-base text-ink truncate">
                        {selectedAgendamento.aluno_nome}
                      </h4>
                    </div>
                    
                    {/* Status Badge */}
                    <div className={`px-2.5 py-1 rounded-full border text-[9px] font-bold uppercase tracking-wider shrink-0 ${getStatusBadgeStyle(selectedAgendamento.status)}`}>
                      {getStatusLabel(selectedAgendamento.status)}
                    </div>
                  </div>

                  {/* Date & Duration Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-raise/40 border border-line/30 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-ink-3 uppercase tracking-wider block">Data e Hora</span>
                      <span className="text-xs md:text-sm font-semibold text-ink num">
                        {formatSessaoDataHora(selectedAgendamento.data_hora)}
                      </span>
                    </div>
                    <div className="p-3 bg-raise/40 border border-line/30 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-ink-3 uppercase tracking-wider block">Duração</span>
                      <span className="text-xs md:text-sm font-semibold text-ink num">
                        {selectedAgendamento.duracao_min || 60} min
                      </span>
                    </div>
                  </div>

                  {/* Type of Session */}
                  <div className="p-3 bg-raise/40 border border-line/30 rounded-xl flex items-center gap-2.5">
                    {selectedAgendamento.tipo === 'presencial' ? (
                      <>
                        <MapPin className="w-4 h-4 text-accent shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[9px] font-bold text-ink-3 uppercase tracking-wider block">Formato</span>
                          <span className="text-xs font-semibold text-ink">Presencial</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Video className="w-4 h-4 text-accent shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[9px] font-bold text-ink-3 uppercase tracking-wider block">Formato</span>
                          <span className="text-xs font-semibold text-ink">Online / Remoto</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Observação / Notas */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-ink-3 uppercase tracking-wider block">Observações</span>
                    <div className="p-3 bg-raise/20 border border-line/20 rounded-xl min-h-[60px] text-xs text-ink-2">
                      {selectedAgendamento.observacao && selectedAgendamento.observacao.trim() !== '' ? (
                        <p className="whitespace-pre-wrap">{selectedAgendamento.observacao}</p>
                      ) : (
                        <p className="italic text-ink-3">Sem observações ou recados para esta sessão.</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer / Actions */}
            <div className="p-4 border-t border-line/40 bg-raise/20 flex flex-col gap-2">
              {!loadingAgendamento && selectedAgendamento && (
                <>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        if (selectedAgendamento.aluno_id) {
                          onSelectAluno(selectedAgendamento.aluno_id);
                          setSelectedAgendamento(null);
                        }
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-raise hover:bg-raise-strong border border-line text-ink text-xs font-bold transition-all active:scale-[0.98] cursor-pointer text-center"
                    >
                      Ver ficha do aluno
                    </button>
                    <button 
                      onClick={() => {
                        if (selectedAgendamento.aluno_id) {
                          onSelectAlunoAndChat(selectedAgendamento.aluno_id);
                          setSelectedAgendamento(null);
                        }
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-accent hover:bg-accent/95 text-white text-xs font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Mensagem</span>
                    </button>
                  </div>
                  
                  {selectedAgendamento.status !== 'cancelado' && (
                    <div className="border-t border-line/20 pt-2 flex flex-col gap-2">
                      <div className="flex gap-2">
                        {selectedAgendamento.status !== 'confirmado' && (
                          <button 
                            disabled={confirmLoading}
                            onClick={() => handleConfirmarSessao(selectedAgendamento.id)}
                            className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                          >
                            {confirmLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>Confirmar sessão</span>
                          </button>
                        )}
                        
                        <button 
                          onClick={() => {
                            onNavigateToTab?.('agenda');
                            setSelectedAgendamento(null);
                          }}
                          className="flex-1 py-2 px-3 rounded-xl bg-raise/60 hover:bg-raise border border-line/60 text-ink-2 text-xs font-bold transition-all cursor-pointer text-center"
                        >
                          Editar na Agenda
                        </button>
                      </div>
                      
                      <div className="flex gap-2">
                        {showCancelConfirm ? (
                          <div className="flex-1 flex gap-1">
                            <button 
                              disabled={cancelLoading}
                              onClick={() => handleCancelarSessao(selectedAgendamento.id)}
                              className="flex-1 py-2 px-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 text-xs font-bold transition-all cursor-pointer text-center"
                            >
                              {cancelLoading ? 'Cancelando...' : 'Confirmar'}
                            </button>
                            <button 
                              onClick={() => setShowCancelConfirm(false)}
                              className="py-2 px-3 rounded-xl bg-raise border border-line text-ink-2 text-xs font-bold transition-all cursor-pointer text-center"
                            >
                              Voltar
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setShowCancelConfirm(true)}
                            className="w-full py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-bold transition-all cursor-pointer text-center"
                          >
                            Cancelar sessão
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
              
              <button 
                onClick={() => setSelectedAgendamento(null)}
                className="w-full py-2 px-3 rounded-xl bg-raise hover:bg-raise-strong border border-line text-ink-2 hover:text-ink text-xs font-bold transition-all cursor-pointer text-center mt-1"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Floating Toast notification */}
      {toastMessage && (
        <div 
          id="toast-notification"
          className="fixed bottom-6 right-6 z-50 bg-surface border border-line px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-fade-in"
        >
          <Sparkles className="w-4 h-4 text-accent animate-pulse" />
          <span className="text-xs font-medium text-ink">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
