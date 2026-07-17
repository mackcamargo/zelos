import React, { useState, useEffect } from 'react';
import { dbService } from '../lib/supabase';
import { Aluno, Anamnese } from '../types';
import { AnamneseForm } from './AnamneseForm';
import { 
  ArrowLeft, Search, Plus, Target, Users, Check, Copy, 
  RefreshCw, Trash2, Mail, User, AlertTriangle, Sparkles, 
  Activity, Award, CheckCircle, ExternalLink, ShieldCheck,
  Scale, TrendingUp, Dumbbell, Calendar, BarChart3, Clock, FolderHeart, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import MontarTreino from './MontarTreino';
import CheckinsPainel from './CheckinsPainel';
import GerenciarHabitos from './GerenciarHabitos';
import GamificationDisplay from './GamificationDisplay';
import FotoProgressoGaleria from './FotoProgressoGaleria';
import GerenciarNutricao from './GerenciarNutricao';
import HidratacaoStats from './HidratacaoStats';
import { Flame, Camera, Utensils, Droplets, Heart } from 'lucide-react';
import { useSubscription } from '../contexts/SubscriptionContext';

interface GerenciarAlunosProps {
  personalId: string;
  isReadOnly?: boolean;
}

type TabForma = 'codigo' | 'cadastro';

export default function GerenciarAlunos({ personalId, isReadOnly = false }: GerenciarAlunosProps) {
  const { assinatura, studentCount, handleSubscriptionError } = useSubscription();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalTab, setModalTab] = useState<TabForma>('codigo');
  
  // Forma A: Invitation code states
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [conviteNome, setConviteNome] = useState('');
  const [conviteObjetivo, setConviteObjetivo] = useState('');
  const [convites, setConvites] = useState<any[]>([]);
  const [loadingConvites, setLoadingConvites] = useState(false);

  // Forma B: Direct sign-up states
  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novoObjetivo, setNovoObjetivo] = useState('');
  const [novoAvatar, setNovoAvatar] = useState<'masculino' | 'feminino'>('masculino');
  const [cadastrandoDireto, setCadastrandoDireto] = useState(false);
  const [cadastroError, setCadastroError] = useState<string | null>(null);

  // Student profile detailed states
  const [editObjetivo, setEditObjetivo] = useState('');
  const [salvandoObjetivo, setSalvandoObjetivo] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Anamnese states
  const [studentAnamnese, setStudentAnamnese] = useState<Anamnese | null>(null);
  const [loadingAnamnese, setLoadingAnamnese] = useState(false);
  const [isPersonalEditingAnamnese, setIsPersonalEditingAnamnese] = useState(false);

  // Workouts states
  const [isMontandoTreino, setIsMontandoTreino] = useState(false);
  const [editingTreinoId, setEditingTreinoId] = useState<string | null>(null);
  const [initialTemplateId, setInitialTemplateId] = useState<number | null>(null);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);
  const [checkinsDaSemanaMap, setCheckinsDaSemanaMap] = useState<Record<string, boolean>>({});
  const [streaksMap, setStreaksMap] = useState<Record<string, number>>({});

  // General Notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadAlunosList = async () => {
    setLoading(true);
    try {
      const { data, error } = await dbService.getAlunos(personalId);
      if (error) {
        console.error('Erro ao buscar alunos:', error);
      } else if (data) {
        setAlunos(data);
        
        // Fetch checkins for this week for all students
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(now.setDate(diff));
        start.setHours(0, 0, 0, 0);
        const semanaStr = start.toISOString().split('T')[0];
        
        const map: Record<string, boolean> = {};
        const sMap: Record<string, number> = {};
        const promises = data.map(async (aluno) => {
          const { data: checkin } = await dbService.getCheckinDaSemana(aluno.id, semanaStr);
          map[aluno.id] = !!checkin;
          
          // Mock streak fetch
          const key = `zenite_mock_streak_${aluno.id}`;
          const s = parseInt(localStorage.getItem(key) || '0');
          sMap[aluno.id] = s;
        });
        await Promise.all(promises);
        setCheckinsDaSemanaMap(map);
        setStreaksMap(sMap);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadConvitesList = async () => {
    setLoadingConvites(true);
    try {
      const { data, error } = await dbService.getConvites(personalId);
      if (error) {
        console.error('Erro ao buscar convites:', error);
      } else if (data) {
        setConvites(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingConvites(false);
    }
  };

  useEffect(() => {
    loadAlunosList();
    loadConvitesList();
  }, [personalId]);

  const [studentMetrics, setStudentMetrics] = useState<any[]>([]);
  const [studentSeries, setStudentSeries] = useState<any[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const loadWorkoutsList = async () => {
    if (!selectedAluno) return;
    setLoadingWorkouts(true);
    try {
      const { data, error } = await dbService.getTreinos(selectedAluno.id, personalId);
      if (error) {
        console.error('Erro ao carregar treinos do aluno:', error);
      } else if (data) {
        setWorkouts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingWorkouts(false);
    }
  };

  const loadStudentProgressData = async () => {
    if (!selectedAluno) return;
    setLoadingMetrics(true);
    try {
      const { data: metricsData } = await dbService.getMetricas(selectedAluno.id);
      if (metricsData) {
        setStudentMetrics(metricsData);
      } else {
        setStudentMetrics([]);
      }

      const { data: seriesData } = await dbService.getSeriesRealizadasDetalhadas(selectedAluno.id);
      if (seriesData) {
        setStudentSeries(seriesData);
      } else {
        setStudentSeries([]);
      }
    } catch (err) {
      console.error('Erro ao buscar progresso do aluno:', err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const loadStudentAnamnese = async () => {
    if (!selectedAluno) return;
    setLoadingAnamnese(true);
    try {
      const { data } = await dbService.getAnamnese(selectedAluno.id);
      setStudentAnamnese(data);
    } catch (err) {
      console.error('Erro ao carregar anamnese do aluno:', err);
    } finally {
      setLoadingAnamnese(false);
    }
  };

  useEffect(() => {
    if (selectedAluno) {
      loadWorkoutsList();
      loadStudentProgressData();
      loadStudentAnamnese();
    } else {
      setWorkouts([]);
      setStudentMetrics([]);
      setStudentSeries([]);
      setStudentAnamnese(null);
    }
  }, [selectedAluno]);

  // Handle invitation code generation
  const handleGenerateCode = async () => {
    if (!conviteNome.trim()) {
      showToast('Por favor, digite o nome do aluno.');
      return;
    }
    setGeneratingCode(true);
    try {
      const { data, error } = await dbService.createConvite(personalId, conviteNome.trim(), conviteObjetivo.trim() || null);
      if (error) {
        if (handleSubscriptionError(error)) return;
        console.error('Erro ao gerar código de convite:', error);
        showToast(`Erro ao gerar convite: ${error.message}`);
      } else if (data) {
        setGeneratedCode(data.codigo);
        showToast('Código de convite gerado!');
        loadConvitesList();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    showToast('Código copiado para a área de transferência!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = (code: string) => {
    const link = `${window.location.origin}/?convite=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    showToast('Link de cadastro copiado!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleResetConviteForm = () => {
    setGeneratedCode('');
    setConviteNome('');
    setConviteObjetivo('');
  };

  // Handle direct creation (Forma B)
  const handleDirectCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim() || !novoEmail.trim()) {
      setCadastroError('Nome e Email são obrigatórios.');
      return;
    }
    setCadastroError(null);
    setCadastrandoDireto(true);
    try {
      // Simulate/Insert direct student
      await dbService.createDemoAluno(
        personalId,
        novoNome,
        novoObjetivo || 'Hipertrofia e definição muscular',
        novoAvatar
      );
      
      // Also generate an invitation code to record the transaction
      await dbService.createConvite(personalId);

      showToast(`Aluno ${novoNome} adicionado com sucesso!`);
      setShowAddModal(false);
      
      // Reset fields
      setNovoNome('');
      setNovoEmail('');
      setNovoObjetivo('');
      
      loadAlunosList();
      loadConvitesList();
    } catch (err: any) {
      if (handleSubscriptionError(err)) return;
      setCadastroError(err?.message || 'Ocorreu um erro ao cadastrar aluno.');
    } finally {
      setCadastrandoDireto(false);
    }
  };

  // Handle edit objective in student profile
  const handleSaveObjective = async () => {
    if (!selectedAluno) return;
    setSalvandoObjetivo(true);
    try {
      const { data, error } = await dbService.updateAlunoObjetivo(selectedAluno.id, editObjetivo);
      if (error) {
        console.error('Erro ao atualizar objetivo:', error);
        showToast(`Erro ao salvar: ${error.message}`);
      } else {
        showToast('Objetivo atualizado com sucesso!');
        setSelectedAluno({
          ...selectedAluno,
          objetivo: editObjetivo
        });
        setSavedFeedback(true);
        setTimeout(() => setSavedFeedback(false), 3000);
        loadAlunosList();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSalvandoObjetivo(false);
    }
  };

  // Handle toggle active/inactive status
  const handleToggleStatus = async () => {
    if (!selectedAluno) return;
    setSavingStatus(true);
    const newStatus = !selectedAluno.ativo;
    try {
      const { data, error } = await dbService.updateAlunoAtivo(selectedAluno.id, newStatus);
      if (error) {
        console.error('Erro ao alterar status:', error);
        showToast(`Erro ao alterar status: ${error.message}`);
      } else {
        setSelectedAluno({
          ...selectedAluno,
          ativo: newStatus
        });
        showToast(newStatus ? 'Aluno reativado!' : 'Aluno marcado como inativo.');
        loadAlunosList();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingStatus(false);
    }
  };

  // Handle remove/unlink student
  const handleRemoveAluno = async () => {
    if (!selectedAluno) return;
    setRemovendo(true);
    try {
      const { error } = await dbService.removeAluno(selectedAluno.id);
      if (error) {
        console.error('Erro ao desvincular aluno:', error);
        showToast(`Erro ao desvincular: ${error.message}`);
      } else {
        showToast(`Aluno desvinculado com sucesso!`);
        setSelectedAluno(null);
        setShowRemoveConfirm(false);
        loadAlunosList();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRemovendo(false);
    }
  };

  // Filter list by search query
  const filteredAlunos = alunos.filter((aluno) => {
    const nome = aluno.profile?.nome || '';
    return nome.toLowerCase().includes(search.toLowerCase());
  });

  if (isMontandoTreino && selectedAluno) {
    return (
      <div className="space-y-6">
        <MontarTreino
          aluno={selectedAluno}
          personalId={personalId}
          treinoId={editingTreinoId}
          templateId={initialTemplateId}
          onBack={() => {
            setIsMontandoTreino(false);
            setEditingTreinoId(null);
            setInitialTemplateId(null);
            loadWorkoutsList();
          }}
          showToast={showToast}
        />
      </div>
    );
  }

  return (
    <div id="alunos-management-container" className="space-y-6">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            id="toast-notification"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 py-3 px-5 bg-surface-3 border border-white/10 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-xs font-medium text-ink">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!selectedAluno ? (
          /* =====================================================================
             TELA 1 — LISTA DE EXERCÍCIOS / MEUS ALUNOS
             ===================================================================== */
          <motion.div
            key="alunos-list-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="z-display text-ink flex items-center gap-2">
                  Meus <span className="text-accent">Alunos</span>
                </h2>
                <p className="z-eyebrow mt-1">Gestão de Carteira e Anamnese</p>
              </div>

              {/* Botão de Destaque + Adicionar aluno (Gradiente Brasa) */}
              <button
                id="btn-trigger-add-student"
                type="button"
                disabled={isReadOnly}
                onClick={() => {
                  setShowAddModal(true);
                  if (!generatedCode) {
                    handleGenerateCode();
                  }
                }}
                className="z-btn z-btn--primary"
                title={isReadOnly ? "Sua assinatura não está ativa" : "Adicionar aluno"}
              >
                <Plus className="w-4.5 h-4.5" strokeWidth={1.75} />
                <span>Adicionar aluno</span>
              </button>
            </div>

            {/* Contador de alunos com barra de progresso */}
            <div className="z-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-2">
                  Capacidade do Plano
                </span>
                <span className="z-num text-sm text-ink font-semibold">
                  {assinatura?.limite_alunos && assinatura.limite_alunos >= 999999 
                    ? 'Alunos ilimitados' 
                    : `${studentCount} de ${assinatura?.limite_alunos || 0} alunos`}
                </span>
              </div>
              {(!assinatura?.limite_alunos || assinatura.limite_alunos < 999999) && (
                <div className="h-2.5 bg-bg rounded-full overflow-hidden border border-line">
                  <div 
                    className={`h-full transition-all duration-500 rounded-full ${studentCount >= (assinatura?.limite_alunos || 0) ? 'bg-danger' : 'bg-accent'}`}
                    style={{ width: `${Math.min(100, (studentCount / (assinatura?.limite_alunos || 1)) * 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* BARRA DE PESQUISA (Search Bar) */}
            <div className="z-search relative w-full">
              <span className="z-search__icon">
                <Search className="w-4.5 h-4.5 text-ink-3" strokeWidth={1.75} />
              </span>
              <input
                id="search-alunos-input"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar aluno por nome..."
                className="z-input !pl-11"
              />
            </div>

            {/* List and empty state handler */}
            {loading ? (
              <div className="flex justify-center py-20">
                <span className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredAlunos.length === 0 ? (
              <div className="z-card py-12 flex flex-col items-center justify-center text-center">
                <Users className="w-8 h-8 text-ink-3 stroke-[1.5] mb-3" />
                <p className="text-sm text-ink-2 max-w-md mb-4 font-medium">
                  {search 
                    ? `Nenhum resultado encontrado para "${search}".`
                    : 'Seus alunos vinculados aparecerão aqui. Compartilhe o código de convite ou adicione-os manualmente.'
                  }
                </p>
                {!search && (
                  <button
                    id="btn-empty-trigger-add"
                    type="button"
                    onClick={() => {
                      setShowAddModal(true);
                      if (!generatedCode) handleGenerateCode();
                    }}
                    className="z-btn z-btn--ghost text-xs"
                  >
                    Adicionar Primeiro Aluno
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredAlunos.map((aluno) => {
                  const name = aluno.profile?.nome || 'Aluno Sem Nome';
                  const isFemale = aluno.profile?.avatar_tipo === 'feminino';
                  const isAtivo = aluno.ativo !== false;
                  const hasCheckin = checkinsDaSemanaMap[aluno.id];
                  const streak = streaksMap[aluno.id] || 0;
                  
                  return (
                    <div
                      id={`student-card-${aluno.id}`}
                      key={aluno.id}
                      onClick={() => {
                        setSelectedAluno(aluno);
                        setEditObjetivo(aluno.objetivo || '');
                      }}
                      className="z-card z-card--tap flex flex-col justify-between relative overflow-hidden"
                    >
                      <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
                        {streak > 0 && (
                          <div className="flex items-center gap-1 px-2.5 py-0.5 bg-accent/10 text-accent rounded-full border border-accent/20">
                            <Flame className="w-3 h-3 animate-pulse" />
                            <span className="text-[12px] font-semibold z-num">{streak}</span>
                          </div>
                        )}

                        {!hasCheckin && isAtivo && (
                          <div className="flex items-center gap-1 bg-danger/10 text-danger text-[11px] font-medium px-2 py-0.5 rounded-full border border-danger/20 animate-pulse">
                            <AlertCircle className="w-3 h-3" />
                            <span>Check-in pendente</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-start gap-4">
                        {/* Avatar styling using ZELOS design avatar */}
                        <div className="z-avatar z-avatar--lg bg-raise text-ink flex items-center justify-center font-display font-bold text-accent overflow-hidden shrink-0">
                          {aluno.profile?.avatar_url ? (
                            <img src={aluno.profile.avatar_url} alt={name} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                          ) : (
                            name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 pr-16">
                          <h3 className="font-display font-semibold text-sm text-ink group-hover:text-accent transition-colors truncate">
                            {name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-[12px] text-ink-3 mt-1.5">
                            <Target className="w-3.5 h-3.5 text-accent shrink-0" strokeWidth={1.75} />
                            <span className="truncate">{aluno.objetivo || 'Foco geral / condicionamento'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Row */}
                      <div className="mt-5 pt-3.5 border-t border-line/40 flex justify-between items-center text-[12px]">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isAtivo ? 'bg-ok animate-pulse' : 'bg-ink-3'}`} />
                          <span className="text-ink-2">Ativo</span>
                        </div>
                        <span className="text-ink-3 font-medium group-hover:text-accent transition-colors">Ver perfil →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          /* =====================================================================
             TELA 2 — PERFIL DO ALUNO (DETALHES DO ALUNO)
             ===================================================================== */
          <motion.div
            key="aluno-profile-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Header: Back navigation */}
            <button
              id="btn-back-to-alunos"
              type="button"
              onClick={() => setSelectedAluno(null)}
              className="flex items-center gap-2 text-xs text-ink-3 hover:text-ink transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-accent" strokeWidth={1.75} />
              <span className="font-medium">Voltar para meus alunos</span>
            </button>

            {(() => {
               const restrictions: string[] = [];
               if (studentAnamnese) {
                 if (studentAnamnese.parq_problema_cardiaco) restrictions.push("Problema cardíaco");
                 if (studentAnamnese.parq_dor_no_peito) restrictions.push("Dor no peito ao praticar atividade física");
                 if (studentAnamnese.parq_tontura_desmaio) restrictions.push("Tontura ou desmaio ao se exercitar");
                 if (studentAnamnese.parq_problema_osseo_articular) restrictions.push("Problema ósseo ou articular");
                 if (studentAnamnese.parq_medicamento_pressao) restrictions.push("Medicamento para pressão ou coração");
                 if (studentAnamnese.parq_outra_razao) {
                   restrictions.push(`Outra razão impeditiva: ${studentAnamnese.parq_outra_razao_qual || 'Sim'}`);
                 }
                 if (studentAnamnese.possui_lesao) {
                   restrictions.push(`Lesão física relatada: ${studentAnamnese.lesoes || 'Sim'}`);
                 }
               }
               if (restrictions.length > 0) {
                 return (
                   <div className="bg-danger/10 border border-danger/20 rounded-2xl p-5 space-y-2.5">
                     <div className="flex items-center gap-2.5 text-danger">
                       <AlertCircle className="w-5 h-5 shrink-0" />
                       <span className="font-display font-bold text-sm uppercase tracking-wider">Atenção: restrições de saúde relatadas</span>
                     </div>
                     <ul className="list-disc pl-5 text-xs text-ink-2 space-y-1 leading-relaxed">
                       {restrictions.map((r, idx) => (
                         <li key={idx} className="text-danger font-medium">{r}</li>
                       ))}
                     </ul>
                   </div>
                 );
               }
               return null;
            })()}

            {/* Profile Overview Card */}
            <div className="z-card relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-line/40">
                <div className="flex items-center gap-4">
                  <div className="z-avatar z-avatar--lg bg-raise text-ink flex items-center justify-center font-display font-bold text-accent overflow-hidden shrink-0">
                    {selectedAluno.profile?.avatar_url ? (
                      <img src={selectedAluno.profile.avatar_url} alt={selectedAluno.profile?.nome} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                      selectedAluno.profile?.nome?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h2 className="font-display font-semibold text-xl text-ink leading-tight">
                      {selectedAluno.profile?.nome || 'Aluno'}
                    </h2>
                  </div>
                </div>

                {/* Status Switcher: Active/Inactive */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <div className="flex items-center gap-3 bg-raise px-4 py-2 rounded-xl border border-line">
                    <span className="text-[12px] text-ink-3">Status:</span>
                    <button
                      id="btn-toggle-student-status"
                      type="button"
                      disabled={savingStatus}
                      onClick={handleToggleStatus}
                      className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                        selectedAluno.ativo !== false 
                          ? 'bg-ok/10 text-ok border border-ok/20' 
                          : 'bg-white/5 text-ink-3 border border-line'
                      }`}
                    >
                      {savingStatus ? (
                        <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span className={`w-1.5 h-1.5 rounded-full ${selectedAluno.ativo !== false ? 'bg-ok animate-pulse' : 'bg-ink-3'}`} />
                          <span>{selectedAluno.ativo !== false ? 'Ativo' : 'Inativo'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Editable Goal/Objective Field */}
              <div className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] text-ink-2 flex items-center gap-1.5 font-medium">
                    <Target className="w-3.5 h-3.5 text-accent" strokeWidth={1.75} />
                    <span>Foco e objetivo do aluno</span>
                  </label>
                  
                  {savedFeedback && (
                    <span className="text-[11px] text-ok font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Salvo!
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    id="input-edit-objective"
                    type="text"
                    value={editObjetivo}
                    onChange={(e) => setEditObjetivo(e.target.value)}
                    placeholder="Defina o objetivo do aluno (Ex: Hipertrofia de MMSS com foco em força)"
                    className="z-input flex-1"
                  />
                  <button
                    id="btn-save-objective"
                    type="button"
                    disabled={salvandoObjetivo || editObjetivo === selectedAluno.objetivo}
                    onClick={handleSaveObjective}
                    className="z-btn z-btn--primary"
                  >
                    {salvandoObjetivo ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>

            {/* ANAMNESE DO ALUNO */}
            {isPersonalEditingAnamnese ? (
              <AnamneseForm
                alunoId={selectedAluno.id}
                isPersonalEditing={true}
                onClose={() => setIsPersonalEditingAnamnese(false)}
                onSave={() => {
                  setIsPersonalEditingAnamnese(false);
                  loadStudentAnamnese();
                }}
              />
            ) : (
              <div className="z-card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line/40">
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-rose-500" />
                    <div>
                      <h3 className="font-display font-bold text-base text-ink">Anamnese do Aluno</h3>
                      {studentAnamnese && (
                        <p className="text-[11px] text-ink-3">
                          Respondida em: {new Date(studentAnamnese.criado_em).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {studentAnamnese ? (
                      <button
                        type="button"
                        onClick={() => setIsPersonalEditingAnamnese(true)}
                        className="py-2 px-4 rounded-lg bg-[#F26A1B] text-white text-xs font-semibold hover:bg-[#D45914] transition-colors"
                      >
                        Editar Anamnese
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            showToast("Solicitação de anamnese enviada ao aluno!");
                          }}
                          className="py-2 px-4 rounded-lg bg-surface-2 border border-white/10 text-ink-2 text-xs font-semibold hover:bg-white/5 transition-colors"
                        >
                          Solicitar preenchimento
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsPersonalEditingAnamnese(true)}
                          className="py-2 px-4 rounded-lg bg-[#F26A1B] text-white text-xs font-semibold hover:bg-[#D45914] transition-colors"
                        >
                          Preencher Avaliação
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {!studentAnamnese ? (
                  <div className="py-4 text-center">
                    <p className="text-sm text-rose-400 font-medium">Anamnese não respondida</p>
                    <p className="text-xs text-ink-3 mt-1">Este aluno ainda não possui ficha de anamnese registrada.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Bloco 1: Objetivo e Experiência */}
                    <div className="p-4 bg-void/30 border border-white/5 rounded-xl space-y-2">
                      <p className="font-semibold text-ink border-b border-white/5 pb-1">Objetivo & Experiência</p>
                      <div className="space-y-1 text-ink-2">
                        <p><span className="text-ink-3">Objetivo principal:</span> {studentAnamnese.objetivo_principal}</p>
                        <p>
                          <span className="text-ink-3">Experiência:</span>{' '}
                          {studentAnamnese.experiencia === 'nunca_treinou' ? 'Nunca treinou' :
                           studentAnamnese.experiencia === 'iniciante' ? 'Iniciante' :
                           studentAnamnese.experiencia === 'intermediario' ? 'Intermediário' : 'Avançado'}
                        </p>
                        <p><span className="text-ink-3">Tempo sem treinar:</span> {studentAnamnese.tempo_sem_treinar || 'N/A'}</p>
                        <p><span className="text-ink-3">Frequência semanal desejada:</span> {studentAnamnese.frequencia_semanal_desejada} dias</p>
                      </div>
                    </div>

                    {/* Bloco 2: Saúde & Lesões */}
                    <div className="p-4 bg-void/30 border border-white/5 rounded-xl space-y-2">
                      <p className="font-semibold text-ink border-b border-white/5 pb-1">Saúde & Lesões</p>
                      <div className="space-y-1 text-ink-2">
                        <p>
                          <span className="text-ink-3">Possui lesão:</span>{' '}
                          {studentAnamnese.possui_lesao ? (
                            <span className="text-rose-400 font-semibold">Sim ({studentAnamnese.lesoes})</span>
                          ) : 'Não'}
                        </p>
                        <p><span className="text-ink-3">Cirurgias:</span> {studentAnamnese.cirurgias || 'Não'}</p>
                        <p>
                          <span className="text-ink-3">Doenças crônicas:</span>{' '}
                          {studentAnamnese.doencas_cronicas && studentAnamnese.doencas_cronicas.length > 0
                            ? studentAnamnese.doencas_cronicas.join(', ')
                            : 'Nenhuma'}
                        </p>
                        <p><span className="text-ink-3">Medicamentos em uso:</span> {studentAnamnese.medicamentos || 'Nenhum'}</p>
                        <p><span className="text-ink-3">Alergias:</span> {studentAnamnese.alergias || 'Nenhuma'}</p>
                        <p>
                          <span className="text-ink-3">Liberação médica:</span>{' '}
                          {studentAnamnese.possui_liberacao_medica ? 'Sim' : 'Não'}
                        </p>
                      </div>
                    </div>

                    {/* Bloco 3: Questionário PAR-Q */}
                    <div className="p-4 bg-void/30 border border-white/5 rounded-xl space-y-2 md:col-span-2">
                      <p className="font-semibold text-ink border-b border-white/5 pb-1">Questionário de Prontidão (PAR-Q)</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-ink-2">
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-ink-3">Problema cardíaco?</span>
                          <span className={studentAnamnese.parq_problema_cardiaco ? "text-rose-400 font-bold" : "text-emerald-400 font-medium"}>
                            {studentAnamnese.parq_problema_cardiaco ? 'Sim' : 'Não'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-ink-3">Dor no peito sob esforço?</span>
                          <span className={studentAnamnese.parq_dor_no_peito ? "text-rose-400 font-bold" : "text-emerald-400 font-medium"}>
                            {studentAnamnese.parq_dor_no_peito ? 'Sim' : 'Não'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-ink-3">Tontura ou desmaio?</span>
                          <span className={studentAnamnese.parq_tontura_desmaio ? "text-rose-400 font-bold" : "text-emerald-400 font-medium"}>
                            {studentAnamnese.parq_tontura_desmaio ? 'Sim' : 'Não'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-ink-3">Problema articular/ósseo?</span>
                          <span className={studentAnamnese.parq_problema_osseo_articular ? "text-rose-400 font-bold" : "text-emerald-400 font-medium"}>
                            {studentAnamnese.parq_problema_osseo_articular ? 'Sim' : 'Não'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-ink-3">Toma remédio de pressão/coração?</span>
                          <span className={studentAnamnese.parq_medicamento_pressao ? "text-rose-400 font-bold" : "text-emerald-400 font-medium"}>
                            {studentAnamnese.parq_medicamento_pressao ? 'Sim' : 'Não'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-ink-3">Outra razão de saúde impeditiva?</span>
                          <span className={studentAnamnese.parq_outra_razao ? "text-rose-400 font-bold" : "text-emerald-400 font-medium"}>
                            {studentAnamnese.parq_outra_razao ? 'Sim' : 'Não'}
                          </span>
                        </div>
                        {studentAnamnese.parq_outra_razao && (
                          <div className="sm:col-span-2 pt-1 border-t border-white/5 mt-1">
                            <span className="text-ink-3">Detalhe da razão:</span> <span className="text-rose-300">{studentAnamnese.parq_outra_razao_qual}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bloco 4: Estilo de Vida & Observações */}
                    <div className="p-4 bg-void/30 border border-white/5 rounded-xl space-y-2 md:col-span-2">
                      <p className="font-semibold text-ink border-b border-white/5 pb-1">Estilo de Vida & Observações</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-ink-2">
                        <p><span className="text-ink-3">Fumante:</span> {studentAnamnese.fumante ? 'Sim' : 'Não'}</p>
                        <p>
                          <span className="text-ink-3">Consumo de álcool:</span>{' '}
                          {studentAnamnese.consumo_alcool === 'nao' ? 'Não consome' :
                           studentAnamnese.consumo_alcool === 'social' ? 'Socialmente' : 'Frequentemente'}
                        </p>
                        <p><span className="text-ink-3">Horas de sono:</span> {studentAnamnese.horas_sono} horas/noite</p>
                        <p>
                          <span className="text-ink-3">Atividade diária:</span>{' '}
                          {studentAnamnese.nivel_atividade_diaria === 'sedentario' ? 'Sedentário' :
                           studentAnamnese.nivel_atividade_diaria === 'leve' ? 'Leve' :
                           studentAnamnese.nivel_atividade_diaria === 'moderado' ? 'Moderado' : 'Intenso'}
                        </p>
                        {studentAnamnese.observacoes && (
                          <div className="sm:col-span-2 pt-2 border-t border-white/5 mt-2">
                            <p className="text-ink-3">Observações adicionais:</p>
                            <p className="mt-1 bg-void/50 p-2.5 rounded-lg text-ink leading-relaxed border border-white/5">{studentAnamnese.observacoes}</p>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* Three Blocks: Treinos, Progresso, Desvincular */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* BLOCK 1: TREINOS */}
              <div className="bg-surface border border-white/5 rounded-2xl p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-sm text-ink flex items-center gap-2">
                      <Activity className="w-4 h-4 text-flame animate-pulse" />
                      <span>Fichas de Treino ({workouts.length})</span>
                    </h3>
                    <div className="flex items-center gap-3">
                      {!isReadOnly && (
                        <>
                          <button
                            id="btn-apply-template"
                            type="button"
                            onClick={() => {
                              setEditingTreinoId(null);
                              setIsMontandoTreino(true);
                            }}
                            className="text-[12px] text-violet hover:text-violet/80 flex items-center gap-1"
                          >
                            <FolderHeart className="w-3 h-3" />
                            <span>Usar modelo</span>
                          </button>
                          <button
                            id="btn-add-new-workout"
                            type="button"
                            onClick={() => {
                              setEditingTreinoId(null);
                              setInitialTemplateId(null);
                              setIsMontandoTreino(true);
                            }}
                            className="text-[12px] text-flame hover:text-flame/80 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Novo treino</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {loadingWorkouts ? (
                    <div className="flex justify-center py-8">
                      <span className="w-6 h-6 border border-flame border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : workouts.length === 0 ? (
                    <div className="p-8 bg-surface-2 border border-white/5 rounded-xl text-center flex flex-col justify-center items-center">
                      <Users className="w-8 h-8 text-ink-3 mb-2 stroke-1" />
                      <p className="text-xs text-ink-2">Nenhum treino ainda para este aluno</p>
                      <p className="text-[10px] text-ink-3 mt-1 leading-relaxed max-w-[200px]">
                        Crie fichas customizadas e vincule à conta dele.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                      {workouts.map((workout) => {
                        const dateFormatted = (() => {
                          const [ano, mes, dia] = workout.data_treino.split("-").map(Number);
                          return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR');
                        })();
                        const isPublished = workout.status === 'publicado';
                        return (
                          <div
                            key={workout.id}
                            onClick={() => {
                              setEditingTreinoId(workout.id);
                              setIsMontandoTreino(true);
                            }}
                            className="p-3 bg-void border border-white/5 rounded-xl hover:border-white/10 hover:bg-surface-2 transition-all cursor-pointer flex items-center justify-between group clicavel"
                          >
                            <div className="min-w-0">
                              <h4 className="font-display font-medium text-sm text-ink group-hover:text-white transition-colors truncate">
                                {workout.titulo}
                              </h4>
                              <p className="text-[12px] text-ink-3 mt-0.5 num">
                                Data: {dateFormatted}{workout.hora_treino ? ` às ${workout.hora_treino.substring(0, 5)}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-full ${
                                workout.status === 'concluido'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : workout.status === 'publicado'
                                    ? 'bg-flame/10 text-flame border border-flame/20'
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}>
                                {workout.status === 'concluido' ? 'Concluído' : workout.status === 'publicado' ? 'A fazer' : 'Rascunho'}
                              </span>
                              <span className="text-[10px] text-ink-3 group-hover:text-ink transition-colors">→</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {!isReadOnly && (
                  <button
                    id="btn-create-workout-main"
                    type="button"
                    onClick={() => {
                      setEditingTreinoId(null);
                      setIsMontandoTreino(true);
                    }}
                    className="w-full py-3 px-4 rounded-xl brand-gradient-bg font-display font-semibold text-void text-xs transition-all shadow-[0_4px_15px_rgba(245,51,79,0.2)] hover:opacity-95 text-center flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Montar ficha de treino</span>
                  </button>
                )}
              </div>

              {/* BLOCK 2: PROGRESSO */}
              <div className="bg-surface border border-white/5 rounded-2xl p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-4 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-medium text-base text-ink flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-violet animate-pulse" />
                      <span>Progresso e biometria do aluno</span>
                    </h3>
                    {loadingMetrics && (
                      <span className="w-3 h-3 border-2 border-violet border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>

                  {loadingMetrics ? (
                    <div className="py-12 flex justify-center items-center">
                      <span className="w-6 h-6 border-2 border-violet border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Interactive summary grid */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Weight tracking */}
                        <div className="p-3.5 bg-surface-2 border border-white/5 rounded-xl space-y-1">
                          <span className="text-[12px] text-ink-3 flex items-center gap-1">
                            <Scale className="w-3.5 h-3.5 text-flame" /> Peso recente
                          </span>
                          {(() => {
                            const pesoLogs = studentMetrics.filter(m => m.tipo === 'peso').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                            if (pesoLogs.length > 0) {
                              const latest = pesoLogs[pesoLogs.length - 1];
                              return (
                                <div className="space-y-0.5">
                                  <p className="text-[20px] font-semibold text-ink num">{latest.valor.toFixed(1)} kg</p>
                                  <p className="text-[12px] text-ink-3 num">Em {latest.date}</p>
                                </div>
                              );
                            }
                            return <p className="text-sm text-ink-3 italic mt-1">Sem registro</p>;
                          })()}
                        </div>

                        {/* Body fat */}
                        <div className="p-3.5 bg-surface-2 border border-white/5 rounded-xl space-y-1">
                          <span className="text-[12px] text-ink-3 flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-violet" /> Gordura corporal
                          </span>
                          {(() => {
                            const fatLogs = studentMetrics.filter(m => m.tipo === 'gordura_pct').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                            if (fatLogs.length > 0) {
                              const latest = fatLogs[fatLogs.length - 1];
                              return (
                                <div className="space-y-0.5">
                                  <p className="text-[20px] font-semibold text-ink num">{latest.valor.toFixed(1)} %</p>
                                  <p className="text-[12px] text-ink-3 num">Em {latest.date}</p>
                                </div>
                              );
                            }
                            return <p className="text-sm text-ink-3 italic mt-1">Sem registro</p>;
                          })()}
                        </div>
                      </div>

                      {/* Best lifts summary (Carga Máxima por Exercício) */}
                      <div className="p-4 bg-void/40 border border-white/5 rounded-xl space-y-2.5">
                        <span className="text-[12px] text-ink-3 flex items-center gap-1">
                          <Dumbbell className="w-3.5 h-3.5 text-violet" /> Recordes de carga
                        </span>
                        {(() => {
                          // Calculate highest load per exercise name
                          const loadMap: Record<string, number> = {};
                          studentSeries.forEach(s => {
                            const name = s.exercicio_nome || s.exercicio?.nome || 'Exercício';
                            const load = Number(s.carga_kg) || 0;
                            if (load <= 0) return;
                            if (!loadMap[name] || load > loadMap[name]) {
                              loadMap[name] = load;
                            }
                          });

                          const topLifts = Object.entries(loadMap)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 3);

                          if (topLifts.length > 0) {
                            return (
                              <div className="space-y-1.5 pt-0.5">
                                {topLifts.map(([name, load]) => (
                                  <div key={name} className="flex justify-between items-center text-sm">
                                    <span className="text-ink-2 truncate pr-2 font-medium">{name}</span>
                                    <span className="font-semibold text-flame bg-flame/5 border border-flame/10 px-2 py-0.5 rounded-md text-[12px] num">
                                      {load} kg
                                    </span>
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          return (
                            <p className="text-sm text-ink-3 leading-relaxed pt-1">
                              Nenhum exercício executado ainda. As cargas máximas do aluno aparecerão aqui assim que ele registrar as séries.
                            </p>
                          );
                        })()}
                      </div>

                      {/* Other measures list */}
                      {(() => {
                        const otherMeasures = studentMetrics.filter(m => m.tipo !== 'peso' && m.tipo !== 'gordura_pct');
                        if (otherMeasures.length > 0) {
                          const latestMeasures: Record<string, any> = {};
                          otherMeasures.forEach(m => {
                            if (!latestMeasures[m.tipo] || new Date(m.date).getTime() > new Date(latestMeasures[m.tipo].date).getTime()) {
                              latestMeasures[m.tipo] = m;
                            }
                          });

                          return (
                            <div className="p-3.5 bg-surface-2 border border-white/5 rounded-xl space-y-2">
                              <span className="text-[12px] text-ink-3 block">Outras medidas corporais</span>
                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                {Object.entries(latestMeasures).map(([tipo, data]: [string, any]) => (
                                  <div key={tipo} className="flex justify-between items-center bg-void/30 p-1.5 rounded-lg border border-white/5">
                                    <span className="text-ink-3 capitalize">{tipo === 'gordura_pct' ? 'Gordura' : tipo}</span>
                                    <span className="font-semibold text-ink num">{data.valor.toFixed(1)} cm</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>

                <div className="text-center text-[12px] text-ink-3 border-t border-white/5 pt-3">
                  Sincronizado automaticamente com o aluno
                </div>
              </div>

              {/* BLOCK 3: CHECK-INS SEMANAIS */}
              <div className="bg-surface border border-white/5 rounded-2xl p-6 md:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-flame" />
                    <h3 className="font-display font-bold text-lg text-ink">Check-ins Semanais</h3>
                  </div>
                </div>

                <CheckinsPainel alunoId={selectedAluno.id} />
              </div>

              {/* BLOCK 4: HÁBITOS DIÁRIOS */}
              <div className="bg-surface border border-white/5 rounded-2xl p-6 md:col-span-2 space-y-6">
                <GerenciarHabitos alunoId={selectedAluno.id} personalId={personalId} isReadOnly={isReadOnly} />
              </div>

              {/* BLOCK 5: GAMIFICAÇÃO & RECORDES */}
              <div className="bg-surface border border-white/5 rounded-2xl p-6 md:col-span-2 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                  <Flame className="w-5 h-5 text-flame" />
                  <h3 className="font-display font-bold text-lg text-ink">Gamificação & Performance</h3>
                </div>
                <GamificationDisplay alunoId={selectedAluno.id} isPersonalView={true} />
              </div>

              {/* BLOCK 6: FOTOS DE EVOLUÇÃO */}
              <div className="bg-surface border border-white/5 rounded-2xl p-6 md:col-span-2 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                  <Camera className="w-5 h-5 text-flame" />
                  <h3 className="font-display font-bold text-lg text-ink">Evolução Visual</h3>
                </div>
                <FotoProgressoGaleria alunoId={selectedAluno.id} isPersonalView={true} />
              </div>

              {/* BLOCK 7: NUTRIÇÃO */}
              <div className="bg-surface border border-white/5 rounded-2xl p-6 md:col-span-2 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                  <Utensils className="w-5 h-5 text-flame" />
                  <h3 className="font-display font-bold text-lg text-ink">Plano Alimentar</h3>
                </div>
                <GerenciarNutricao alunoId={selectedAluno.id} personalId={personalId} isReadOnly={isReadOnly} />
              </div>

              {/* BLOCK 8: HIDRATAÇÃO (Personal View) */}
              <div className="bg-surface border border-white/5 rounded-2xl p-6 md:col-span-2 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                  <Droplets className="w-5 h-5 text-violet" />
                  <h3 className="font-display font-bold text-lg text-ink">Hidratação do Aluno</h3>
                </div>
                <HidratacaoStats alunoId={selectedAluno.id} />
              </div>

            </div>

            {/* BLOCK 9: DESVINCULAR ALUNO */}
            <div className="pt-6 border-t border-white/5 flex justify-end">
              {!showRemoveConfirm ? (
                <button
                  id="btn-show-unlink-confirm"
                  type="button"
                  onClick={() => setShowRemoveConfirm(true)}
                  className="py-3 px-5 rounded-xl border border-rose-500/10 hover:bg-rose-500/5 text-rose-500 text-xs font-mono flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Desvincular Aluno da Equipe</span>
                </button>
              ) : (
                <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-5 space-y-4 max-w-md w-full">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-display font-semibold text-sm text-ink">Confirmar Desvinculação?</h4>
                      <p className="text-xs text-ink-2 mt-1 leading-relaxed">
                        Ao desvincular, este aluno será removido da sua lista e não poderá mais ver os treinos montados por você. Ele precisará de um novo código para retornar.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      id="btn-cancel-unlink"
                      type="button"
                      onClick={() => setShowRemoveConfirm(false)}
                      className="px-4 py-2 rounded-xl text-xs text-ink-2 hover:text-ink transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      id="btn-execute-unlink"
                      type="button"
                      disabled={removendo}
                      onClick={handleRemoveAluno}
                      className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-mono text-xs font-bold transition-all disabled:opacity-50"
                    >
                      {removendo ? 'Desvinculando...' : 'Sim, Desvincular'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================================
         MODAL: ADICIONAR ALUNO (DUAL FLOW: FORMA A E FORMA B)
         ===================================================================== */}
      <AnimatePresence>
        {showAddModal && (
          <div id="add-student-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-white/5 rounded-2xl max-w-lg w-full p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex justify-between items-start pb-4 border-b border-white/5 mb-6">
                <div>
                  <h3 className="font-display font-bold text-lg text-ink">Adicionar Aluno à Equipe</h3>
                  <p className="text-xs text-ink-2">Escolha o método para integrar o novo aluno ao Zelos.</p>
                </div>
                <button
                  id="btn-close-add-modal"
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-ink-3 hover:text-ink p-1 rounded-lg hover:bg-white/5 transition-all text-xs font-mono"
                >
                  Fechar ✕
                </button>
              </div>

              {/* Selector Tabs: Forma A vs Forma B */}
              <div className="grid grid-cols-2 bg-void p-1 rounded-xl mb-6 border border-white/5">
                <button
                  id="tab-add-codigo"
                  type="button"
                  onClick={() => setModalTab('codigo')}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                    modalTab === 'codigo' 
                      ? 'bg-surface-3 text-ink shadow-sm' 
                      : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  Forma A: Gerar Convite
                </button>
                <button
                  id="tab-add-cadastro"
                  type="button"
                  onClick={() => setModalTab('cadastro')}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                    modalTab === 'cadastro' 
                      ? 'bg-surface-3 text-ink shadow-sm' 
                      : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  Forma B: Adicionar Direto
                </button>
              </div>

              {/* TAB CONTENT: FORMA A — INVITATION CODE */}
              {modalTab === 'codigo' && (
                <div id="modal-tab-content-codigo" className="space-y-6">
                  {!generatedCode ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-mono uppercase tracking-wider text-ink-3 block">Nome do Aluno</label>
                        <input
                          id="input-convite-nome"
                          type="text"
                          required
                          value={conviteNome}
                          onChange={(e) => setConviteNome(e.target.value)}
                          placeholder="Nome completo do aluno"
                          className="w-full bg-void border border-white/5 focus:border-white/10 rounded-xl py-3 px-4 text-sm text-ink placeholder-ink-3 outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-mono uppercase tracking-wider text-ink-3 block">Objetivo (Opcional)</label>
                        <input
                          id="input-convite-objetivo"
                          type="text"
                          value={conviteObjetivo}
                          onChange={(e) => setConviteObjetivo(e.target.value)}
                          placeholder="Ex: Hipertrofia, Emagrecimento, etc."
                          className="w-full bg-void border border-white/5 focus:border-white/10 rounded-xl py-3 px-4 text-sm text-ink placeholder-ink-3 outline-none transition-all"
                        />
                      </div>

                      <button
                        id="btn-confirmar-convite"
                        type="button"
                        disabled={generatingCode || !conviteNome.trim()}
                        onClick={handleGenerateCode}
                        className="w-full py-3.5 px-4 rounded-xl brand-gradient-bg font-display font-semibold text-void hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(245,51,79,0.2)] disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {generatingCode ? (
                          <span className="w-5 h-5 border-2 border-void border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <span>Confirmar e Gerar Convite</span>
                            <Sparkles className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-5 p-5 bg-void rounded-2xl border border-white/5">
                      <div className="text-center space-y-1">
                        <span className="text-[10px] font-mono text-ink-3 uppercase tracking-wider block">Código de Convite Gerado:</span>
                        <div className="font-mono font-black text-3xl text-flame tracking-widest py-2 select-all">
                          {generatedCode}
                        </div>
                        {conviteNome && (
                          <p className="text-xs text-ink-2">Para: <span className="text-ink font-semibold">{conviteNome}</span></p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] font-mono text-ink-3 uppercase tracking-wider block">Link de Convite:</span>
                        <div className="bg-surface-2 p-3 rounded-xl border border-white/5 text-xs text-ink-2 font-mono truncate select-all">
                          {`${window.location.origin}/?convite=${generatedCode}`}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          id="btn-copy-convite-link"
                          type="button"
                          onClick={() => handleCopyLink(generatedCode)}
                          className="py-3 px-4 bg-surface-3 hover:bg-white/10 border border-white/5 text-ink text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        >
                          {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
                        </button>

                        <a
                          id="btn-whatsapp-share"
                          href={`https://wa.me/?text=${encodeURIComponent(
                            `Olá ${conviteNome}! Aqui está o seu link exclusivo para se cadastrar no ZELOS: ${window.location.origin}/?convite=${generatedCode}\n\nCódigo de convite: ${generatedCode}`
                          )}`}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-center"
                        >
                          <span>WhatsApp</span>
                        </a>
                      </div>

                      <div className="flex justify-center pt-2">
                        <button
                          id="btn-novo-convite"
                          type="button"
                          onClick={handleResetConviteForm}
                          className="text-xs text-flame hover:underline font-mono uppercase tracking-wider flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Gerar Outro Convite</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <span className="text-xs font-mono uppercase text-ink-2 block tracking-wider">Como funciona?</span>
                    <ol className="list-decimal list-inside text-xs text-ink-2 space-y-2 pl-1 leading-relaxed">
                      <li>Preencha o nome do aluno e clique em gerar convite.</li>
                      <li>Copie o link gerado ou envie diretamente pelo WhatsApp.</li>
                      <li>Quando o aluno acessar o link, o código já virá pré-preenchido e travado para ele criar a conta.</li>
                      <li>Assim que cadastrado, o aluno será vinculado a você automaticamente.</li>
                    </ol>
                  </div>

                  {/* List of active generated invites */}
                  <div className="pt-4 border-t border-white/5 space-y-3">
                    <span className="text-[10px] font-mono uppercase text-ink-3 block tracking-wider">Histórico de Convites:</span>
                    
                    {loadingConvites ? (
                      <div className="flex justify-center py-4">
                        <span className="w-4 h-4 border border-flame border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : convites.length === 0 ? (
                      <p className="text-[10px] text-ink-3 italic">Nenhum código criado anteriormente.</p>
                    ) : (
                      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                        {convites.map((conv) => (
                          <div key={conv.id} className="flex justify-between items-center py-2 px-3 bg-void rounded-xl border border-white/5 text-xs font-mono">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-ink">{conv.codigo}</span>
                              <span className="text-[10px] text-ink-3">
                                {new Date(conv.criado_em).toLocaleDateString()}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                                conv.usado 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}>
                                {conv.usado ? 'Usado' : 'Pendente'}
                              </span>

                              {!conv.usado && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyCode(conv.codigo)}
                                  className="text-ink-3 hover:text-ink transition-colors"
                                  title="Copiar"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB CONTENT: FORMA B — DIRECT SIGN-UP */}
              {modalTab === 'cadastro' && (
                <form id="modal-tab-content-cadastro" onSubmit={handleDirectCreate} className="space-y-4">
                  
                  {cadastroError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
                      {cadastroError}
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-ink-3 block mb-1">Nome Completo</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
                      <input
                        id="direct-student-name"
                        type="text"
                        required
                        value={novoNome}
                        onChange={(e) => setNovoNome(e.target.value)}
                        placeholder="Nome do aluno"
                        className="w-full bg-void border border-white/5 focus:border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs text-ink outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-ink-3 block mb-1">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
                      <input
                        id="direct-student-email"
                        type="email"
                        required
                        value={novoEmail}
                        onChange={(e) => setNovoEmail(e.target.value)}
                        placeholder="aluno@exemplo.com"
                        className="w-full bg-void border border-white/5 focus:border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs text-ink outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-ink-3 block mb-1">Objetivo / Foco do Aluno <span className="text-ink-3 italic">(opcional)</span></label>
                    <div className="relative">
                      <Target className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
                      <input
                        id="direct-student-objective"
                        type="text"
                        value={novoObjetivo}
                        onChange={(e) => setNovoObjetivo(e.target.value)}
                        placeholder="Ex: Hipertrofia de pernas, Emagrecimento, etc"
                        className="w-full bg-void border border-white/5 focus:border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs text-ink outline-none"
                      />
                    </div>
                  </div>

                  {/* Avatar Type Selector */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-ink-3 block">Estilo de Avatar</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setNovoAvatar('masculino')}
                        className={`p-2.5 rounded-xl border text-center text-xs transition-all ${
                          novoAvatar === 'masculino'
                            ? 'bg-surface-3 border-white/15 text-ink font-semibold'
                            : 'bg-void border-white/5 text-ink-2 hover:border-white/10'
                        }`}
                      >
                        Masculino (👨)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNovoAvatar('feminino')}
                        className={`p-2.5 rounded-xl border text-center text-xs transition-all ${
                          novoAvatar === 'feminino'
                            ? 'bg-surface-3 border-white/15 text-ink font-semibold'
                            : 'bg-void border-white/5 text-ink-2 hover:border-white/10'
                        }`}
                      >
                        Feminino (👩)
                      </button>
                    </div>
                  </div>

                  <p className="text-[10px] text-ink-3 leading-relaxed mt-2 italic">
                    Nota: O método direto cria o cadastro instantaneamente em sua área. Para que o aluno possa fazer login real, ele deve se registrar usando o mesmo e-mail criado.
                  </p>

                  <div className="flex gap-2 justify-end pt-4 border-t border-white/5 mt-6">
                    <button
                      id="btn-cancel-direct-create"
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2.5 rounded-xl text-xs text-ink-2 hover:text-ink"
                    >
                      Cancelar
                    </button>
                    <button
                      id="btn-submit-direct-create"
                      type="submit"
                      disabled={cadastrandoDireto}
                      className="px-4 py-2.5 rounded-xl bg-flame hover:bg-flame/95 text-void font-display font-bold text-xs shadow-lg disabled:opacity-50 cursor-pointer"
                    >
                      {cadastrandoDireto ? 'Criando...' : 'Adicionar Aluno'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
