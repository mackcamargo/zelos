import React, { useState, useEffect } from 'react';
import { dbService, supabase, isSupabaseConfigured } from '../lib/supabase';
import { Aluno, Anamnese, AlunoCondicao, CondicaoOrtopedica } from '../types';
import { AnamneseForm } from './AnamneseForm';
import { 
  ArrowLeft, Search, Plus, Target, Users, Check, Copy, X,
  RefreshCw, Trash2, Mail, User, AlertTriangle, Sparkles, 
  Activity, Award, CheckCircle, ExternalLink, ShieldCheck,
  Scale, TrendingUp, Dumbbell, Calendar, BarChart3, Clock, FolderHeart, AlertCircle,
  Send, Link2, ClipboardList, Pencil, ChevronDown, ChevronUp, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import MontarTreino from './MontarTreino';
import CheckinsPainel from './CheckinsPainel';
import GerenciarHabitos from './GerenciarHabitos';
import GamificationDisplay from './GamificationDisplay';
import FotoProgressoGaleria from './FotoProgressoGaleria';
import GerenciarNutricao from './GerenciarNutricao';
import GerenciarSuplementos from './GerenciarSuplementos';
import HidratacaoStats from './HidratacaoStats';
import { ZelosModal } from './ZelosModal';
import { Flame, Camera, Utensils, Droplets, Heart, Upload, X as LucideX } from 'lucide-react';
import { useSubscription } from '../contexts/SubscriptionContext';

interface GerenciarAlunosProps {
  personalId: string;
  isReadOnly?: boolean;
  initialSelectedAlunoId?: string | null;
  onClearInitialSelected?: () => void;
}

type TabForma = 'codigo' | 'cadastro';

export default function GerenciarAlunos({ 
  personalId, 
  isReadOnly = false,
  initialSelectedAlunoId = null,
  onClearInitialSelected
}: GerenciarAlunosProps) {
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
  const [copiedMessage, setCopiedMessage] = useState(false);
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

  // Orthopedic Profile states
  const [alunoCondicoes, setAlunoCondicoes] = useState<AlunoCondicao[]>([]);
  const [expandedCondicoes, setExpandedCondicoes] = useState<Record<string, boolean>>({});
  const [condicoesDisponiveis, setCondicoesDisponiveis] = useState<CondicaoOrtopedica[]>([]);
  const [loadingCondicoes, setLoadingCondicoes] = useState(false);
  const [showAddCondicaoModal, setShowAddCondicaoModal] = useState(false);
  const [showActiveCondicoesModal, setShowActiveCondicoesModal] = useState(false);
  
  // Form states
  const [editingCondicao, setEditingCondicao] = useState<AlunoCondicao | null>(null);
  const [condicaoBlocks, setCondicaoBlocks] = useState<Array<{
    tempId: string;
    condicao_id: string | number;
    lado: 'esquerdo' | 'direito' | 'bilateral' | null;
    grau: string;
    observacao: string;
    file: File | null;
    searchQuery: string;
    isSearching: boolean;
    searchResults: CondicaoOrtopedica[];
    loadingSearch: boolean;
  }>>([]);
  const [salvandoCondicao, setSalvandoCondicao] = useState(false);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);

  const createEmptyBlock = () => ({
    tempId: Math.random().toString(36).substr(2, 9),
    condicao_id: '',
    lado: null,
    grau: '',
    observacao: '',
    file: null,
    searchQuery: '',
    isSearching: false,
    searchResults: [],
    loadingSearch: false
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setCondicaoBlocks(prev => prev.map(b => ({ ...b, isSearching: false })));
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // Custom Modal State
  const [modalConfig, setModalConfig] = useState<{
    show: boolean;
    type: 'confirm' | 'alert';
    variant?: 'danger' | 'warning' | 'success' | 'info';
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  const handleCondicaoSearch = async (tempId: string, query: string) => {
    setCondicaoBlocks(prev => prev.map(b => b.tempId === tempId ? { ...b, searchQuery: query, isSearching: true } : b));

    if (query.trim().length < 2) {
      setCondicaoBlocks(prev => prev.map(b => b.tempId === tempId ? { ...b, searchResults: [], loadingSearch: false } : b));
      return;
    }

    setCondicaoBlocks(prev => prev.map(b => b.tempId === tempId ? { ...b, loadingSearch: true } : b));

    try {
      const { data, error } = await supabase.rpc('buscar_condicoes_ortopedicas', { termo: query });
      
      if (error) throw error;

      setCondicaoBlocks(prev => prev.map(b => b.tempId === tempId ? { 
        ...b, 
        searchResults: data || [], 
        loadingSearch: false 
      } : b));
    } catch (err) {
      console.error('Erro na busca inteligente:', err);
      setCondicaoBlocks(prev => prev.map(b => b.tempId === tempId ? { ...b, loadingSearch: false } : b));
    }
  };

  // Debounced search logic using useEffect
  useEffect(() => {
    const searchingBlocks = condicaoBlocks.filter(b => b.isSearching && b.searchQuery.length >= 2);
    
    const timeouts = searchingBlocks.map(block => {
      return setTimeout(() => {
        handleCondicaoSearch(block.tempId, block.searchQuery);
      }, 300);
    });

    return () => timeouts.forEach(t => clearTimeout(t));
  }, [condicaoBlocks.map(b => b.searchQuery).join('|')]);

  const getFilteredCondicoes = (query: string, searchResults: CondicaoOrtopedica[] = []) => {
    if (!query.trim()) return condicoesDisponiveis.slice(0, 20);
    
    // Se temos resultados da busca inteligente (RPC), usamos eles
    if (searchResults.length > 0) return searchResults;

    // Fallback para busca local caso o RPC falhe ou não tenha retornado nada ainda
    const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return condicoesDisponiveis.filter(c => {
      const nome = c.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const cid = (c.cid || '').toLowerCase();
      const sinonimos = (c.sinonimos || []).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return nome.includes(normalizedQuery) || cid.includes(normalizedQuery) || sinonimos.includes(normalizedQuery);
    }).slice(0, 20);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  async function abrirLaudo(laudoUrl: string | null | undefined) {
    if (!laudoUrl) return;
    if (!isSupabaseConfigured || !supabase || laudoUrl.startsWith('blob:')) {
      window.open(laudoUrl, '_blank');
      return;
    }
    let path = laudoUrl || '';
    const marker = '/laudos/';
    if (path.includes(marker)) path = path.substring(path.indexOf(marker) + marker.length);
    path = path.replace(/^\/+/, '');
    const { data, error } = await supabase.storage.from('laudos').createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) {
      console.error('Erro laudo:', error, 'path:', path);
      setModalConfig({
        show: true,
        type: 'alert',
        variant: 'danger',
        title: 'Erro ao abrir',
        message: 'Não foi possível abrir o laudo.',
        onConfirm: () => setModalConfig(null)
      });
      return;
    }
    window.open(data.signedUrl, '_blank');
  }

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

  useEffect(() => {
    if (initialSelectedAlunoId && alunos.length > 0) {
      const found = alunos.find(a => a.id === initialSelectedAlunoId);
      if (found) {
        setSelectedAluno(found);
        if (onClearInitialSelected) {
          onClearInitialSelected();
        }
      }
    }
  }, [initialSelectedAlunoId, alunos, onClearInitialSelected]);

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

  const [expandedAnamnese, setExpandedAnamnese] = useState<Record<string, boolean>>({});

  const toggleAnamneseExpanded = (section: string) => {
    setExpandedAnamnese(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const loadStudentAnamnese = async () => {
    if (!selectedAluno) return;
    setLoadingAnamnese(true);
    try {
      const { data } = await dbService.getAnamnese(selectedAluno.id);
      setStudentAnamnese(data);
      if (data) {
        setEditObjetivo(selectedAluno.objetivo || data.objetivo_principal || '');
        
        // Auto-expand PAR-Q if it has any positive response
        const hasParqPositive = 
          data.parq_problema_cardiaco || 
          data.parq_dor_no_peito || 
          data.parq_tontura_desmaio || 
          data.parq_problema_osseo_articular || 
          data.parq_medicamento_pressao || 
          data.parq_outra_razao;
        
        if (hasParqPositive) {
          setExpandedAnamnese(prev => ({ ...prev, parq: true }));
        }
      }
    } catch (err) {
      console.error('Erro ao carregar anamnese do aluno:', err);
    } finally {
      setLoadingAnamnese(false);
    }
  };

  useEffect(() => {
    if (alunoCondicoes.length === 1) {
      setExpandedCondicoes({ [alunoCondicoes[0].id]: true });
    } else {
      setExpandedCondicoes({});
    }
  }, [alunoCondicoes]);

  const toggleCondicaoExpanded = (id: string) => {
    setExpandedCondicoes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const loadStudentCondicoes = async () => {
    if (!selectedAluno) return;
    setLoadingCondicoes(true);
    try {
      const { data: conds, error: err1 } = await dbService.getAlunoCondicoes(selectedAluno.id);
      if (err1) console.error('Erro ao buscar condições do aluno:', err1);
      if (conds) setAlunoCondicoes(conds);

      const { data: disponiveis, error: err2 } = await dbService.getCondicoesOrtopedicas();
      if (err2) console.error('Erro ao buscar condições disponíveis:', err2);
      if (disponiveis) setCondicoesDisponiveis(disponiveis);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCondicoes(false);
    }
  };

  useEffect(() => {
    if (selectedAluno) {
      loadWorkoutsList();
      loadStudentProgressData();
      loadStudentAnamnese();
      loadStudentCondicoes();
    } else {
      setWorkouts([]);
      setStudentMetrics([]);
      setStudentSeries([]);
      setStudentAnamnese(null);
      setAlunoCondicoes([]);
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

  const getInvitationMessage = (nome: string, code: string) => {
    const link = `https://app.zelospersonal.com.br/cadastro?convite=${code}`;
    const saudacao = nome ? `${nome.trim()}` : '';
    const part1 = saudacao ? `${saudacao}, seu treino no ZELOS Personal te espera! 🔥` : 'Seu treino no ZELOS Personal te espera! 🔥';
    return `${part1}

No app você vai ter:
✅ Seu treino personalizado, com vídeos dos exercícios
✅ Plano alimentar com calorias e macros
✅ Hidratação, hábitos e sua evolução em fotos
✅ Chat direto comigo

É só fazer seu cadastro em 1 minuto pelo link abaixo que você já cai direto na minha base de alunos e seu acompanhamento começa na hora:
👉 ${link}

Bora juntos! 💪`;
  };

  const handleCopyLink = (code: string) => {
    const link = `https://app.zelospersonal.com.br/cadastro?convite=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    showToast('Link de cadastro copiado!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyMessage = (nome: string, code: string) => {
    const message = getInvitationMessage(nome, code);
    navigator.clipboard.writeText(message);
    setCopiedMessage(true);
    showToast('Mensagem de convite copiada!');
    setTimeout(() => setCopiedMessage(false), 2000);
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
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] py-3 px-5 bg-raise border border-line rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center gap-2"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3.5">
                {filteredAlunos.map((aluno) => {
                  const name = aluno.profile?.nome || 'Aluno Sem Nome';
                  const isAtivo = aluno.ativo !== false;
                  const hasCheckin = checkinsDaSemanaMap[aluno.id];
                  const streak = streaksMap[aluno.id] || 0;
                  
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      id={`student-card-${aluno.id}`}
                      key={aluno.id}
                      onClick={() => {
                        setSelectedAluno(aluno);
                        setEditObjetivo(aluno.objetivo || '');
                      }}
                      className="bg-surface border border-line rounded-2xl p-3.5 hover:border-line-strong hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Avatar 40px */}
                            <div className="w-10 h-10 rounded-full bg-bg border border-line flex items-center justify-center font-display font-bold text-accent text-sm overflow-hidden shrink-0">
                              {aluno.profile?.avatar_url ? (
                                <img src={aluno.profile.avatar_url} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-display font-bold text-[14px] text-ink leading-tight group-hover:text-accent transition-colors truncate">
                                {name}
                              </h3>
                              <div className="flex items-center gap-1.5 text-[11px] text-ink-3 mt-1">
                                <Target className="w-3 h-3 text-accent/70" strokeWidth={2} />
                                <span className="truncate">{aluno.objetivo || 'Foco geral'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Pending Badge - Smaller and Discreet */}
                          {!hasCheckin && isAtivo && (
                            <div className="flex items-center gap-1 text-[9px] font-bold text-danger border border-danger/20 px-1.5 py-0.5 rounded-md bg-danger/5 shrink-0 uppercase tracking-tight">
                              <div className="w-1 h-1 rounded-full bg-danger animate-pulse" />
                              <span>Pendente</span>
                            </div>
                          )}
                          {streak > 0 && hasCheckin && (
                            <div className="flex items-center gap-1 text-[9px] font-bold text-accent border border-accent/20 px-1.5 py-0.5 rounded-md bg-accent/5 shrink-0">
                              <Flame className="w-3 h-3" />
                              <span className="num">{streak}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status Row - Compact Footer */}
                      <div className="mt-4 pt-3 border-t border-line/40 flex justify-between items-center text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${isAtivo ? 'bg-ok' : 'bg-ink-3'}`} />
                          <span className="text-ink-2 font-medium">{isAtivo ? 'Ativo' : 'Inativo'}</span>
                        </div>
                        <span className="text-ink-3 font-bold group-hover:text-accent transition-colors flex items-center gap-1">
                          Ver perfil <ArrowLeft className="w-3 h-3 rotate-180" />
                        </span>
                      </div>
                    </motion.div>
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

            {/* Profile Overview Card - Discreet & Compact */}
            <div className="bg-surface border border-line/60 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-raise text-ink flex items-center justify-center font-display font-bold text-xs shrink-0 overflow-hidden border border-line/50">
                  {selectedAluno.profile?.avatar_url ? (
                    <img src={selectedAluno.profile.avatar_url} alt={selectedAluno.profile?.nome} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    selectedAluno.profile?.nome?.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <h2 className="font-display font-semibold text-sm text-ink truncate">
                    {selectedAluno.profile?.nome || 'Aluno'}
                  </h2>
                  {alunoCondicoes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowActiveCondicoesModal(true)}
                      className="px-2 py-0.5 rounded-full bg-[#F26A1B]/10 border border-[#F26A1B]/30 text-[#F26A1B] text-[10px] font-bold flex items-center gap-1 hover:bg-[#F26A1B]/20 transition-all cursor-pointer shrink-0"
                      title="Ver cuidados ortopédicos"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      <span>{alunoCondicoes.length} {alunoCondicoes.length === 1 ? 'cuidado' : 'cuidados'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Status Switcher: Active/Inactive */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] text-ink-3 hidden sm:inline">Status:</span>
                <button
                  id="btn-toggle-student-status"
                  type="button"
                  disabled={savingStatus}
                  onClick={handleToggleStatus}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
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

              {/* BLOCK 5: GAMIFICAÇÃO & RECORDES */}
              <div className="bg-surface border border-white/5 rounded-2xl p-6 md:col-span-2 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                  <Flame className="w-5 h-5 text-flame" />
                  <h3 className="font-display font-bold text-lg text-ink">Gamificação & Performance</h3>
                </div>
                <GamificationDisplay alunoId={selectedAluno.id} isPersonalView={true} />
              </div>

              {/* BLOCK 6: FOTOS DE EVOLUÇÃO */}
              <div className="z-card p-6 md:col-span-2 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-line">
                  <Camera className="w-5 h-5 text-flame" />
                  <h3 className="font-display font-bold text-lg text-ink">Evolução Visual</h3>
                </div>
                <FotoProgressoGaleria alunoId={selectedAluno.id} isPersonalView={true} />
              </div>

              {/* BLOCK 7: NUTRIÇÃO */}
              <div className="z-card p-6 md:col-span-2 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-line">
                  <Utensils className="w-5 h-5 text-flame" />
                  <h3 className="font-display font-bold text-lg text-ink">Plano Alimentar</h3>
                </div>
                <GerenciarNutricao alunoId={selectedAluno.id} personalId={personalId} isReadOnly={isReadOnly} />
              </div>

              {/* BLOCK 7.5: ORIENTAÇÃO DE SUPLEMENTOS */}
              <div className="z-card z-card--destaque p-6 md:col-span-2 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-line">
                  <ClipboardList className="w-5 h-5 text-flame" />
                  <h3 className="font-display font-bold text-lg text-ink">Orientação de Suplementos</h3>
                </div>
                <GerenciarSuplementos 
                  alunoId={selectedAluno.id} 
                  alunoNome={selectedAluno.profile?.nome || 'Aluno'} 
                  personalId={personalId} 
                  isReadOnly={isReadOnly} 
                />
              </div>

              {/* BLOCK 8: HIDRATAÇÃO (Personal View) */}
              <div className="z-card p-6 md:col-span-2 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-line">
                  <Droplets className="w-5 h-5 text-violet" />
                  <h3 className="font-display font-bold text-lg text-ink">Hidratação do Aluno</h3>
                </div>
                <HidratacaoStats alunoId={selectedAluno.id} />
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
                personalId={personalId}
              />
            ) : (
              <div className="z-card z-card--destaque space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line/40">
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-rose-500" />
                    <div>
                      <h3 className="font-display font-bold text-base text-ink">Anamnese do Aluno</h3>
                      {studentAnamnese && (() => {
                        const dRespondida = studentAnamnese?.respondido_em ? new Date(studentAnamnese.respondido_em) : null;
                        const dAtualizada = studentAnamnese?.atualizado_em ? new Date(studentAnamnese.atualizado_em) : null;
                        
                        const respondidaValida = dRespondida && !isNaN(dRespondida.getTime());
                        const atualizadaValida = dAtualizada && !isNaN(dAtualizada.getTime());
                        
                        const textoRespondida = respondidaValida 
                          ? dRespondida!.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) 
                          : null;
                          
                        const textoAtualizada = atualizadaValida 
                          ? dAtualizada!.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) 
                          : null;
                        
                        return (
                          <p className="text-[11px] text-ink-3">
                            {textoRespondida && `Respondida em: ${textoRespondida}`}
                            {textoAtualizada && ` (Atualizada em: ${textoAtualizada})`}
                            {!textoRespondida && !textoAtualizada && 'Data não informada'}
                          </p>
                        );
                      })()}
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
                          className="py-2 px-4 rounded-lg bg-surface border border-line text-ink-2 text-xs font-semibold hover:bg-raise transition-colors cursor-pointer"
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

                <div className="flex flex-col gap-3">
                  {/* SEÇÃO 1: FOCO E OBJETIVO */}
                  <div className="bg-void/5 border border-line rounded-2xl overflow-hidden transition-all duration-200">
                    <div 
                      className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-raise/10 transition-colors"
                      onClick={() => toggleAnamneseExpanded('foco')}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Target className="w-4 h-4 text-accent" />
                        <div className="truncate">
                          <h4 className="font-bold text-sm text-ink truncate">Foco e objetivo do aluno</h4>
                          <p className="text-[10px] text-ink-3 uppercase font-bold tracking-tight truncate max-w-[300px]">
                            {selectedAluno.objetivo || studentAnamnese?.objetivo_principal || 'Não definido'}
                          </p>
                        </div>
                      </div>
                      <div className={`p-1.5 rounded-full bg-void transition-transform duration-300 ${expandedAnamnese['foco'] ? 'rotate-180' : ''}`}>
                        <ChevronDown className="w-4 h-4 text-ink-3" />
                      </div>
                    </div>
                    <AnimatePresence>
                      {expandedAnamnese['foco'] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-5 pt-2 space-y-3 border-t border-line/30">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] uppercase tracking-wider font-bold text-ink-3">Definir Objetivo Principal</label>
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
                                list="objetivos-detalhe"
                                value={editObjetivo}
                                onChange={(e) => setEditObjetivo(e.target.value)}
                                placeholder="Ex: Hipertrofia de MMSS com foco em força"
                                className="flex-1 h-11 px-4 py-3 text-sm rounded-xl border border-ink/20 bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-[#F26A1B] focus:border-[#F26A1B] transition-all"
                              />
                              <datalist id="objetivos-detalhe">
                                <option value="Hipertrofia (ganho de massa muscular)" />
                                <option value="Emagrecimento / perda de gordura" />
                                <option value="Definição muscular" />
                                <option value="Condicionamento físico / cardio" />
                                <option value="Força" />
                                <option value="Resistência muscular" />
                                <option value="Saúde e qualidade de vida" />
                                <option value="Reabilitação / fortalecimento" />
                                <option value="Performance esportiva" />
                                <option value="Mobilidade e flexibilidade" />
                                <option value="Ganho de peso" />
                                <option value="Preparação para prova física / concurso" />
                              </datalist>
                              <button
                                id="btn-save-objective"
                                type="button"
                                disabled={salvandoObjetivo || editObjetivo === selectedAluno.objetivo}
                                onClick={handleSaveObjective}
                                className="h-11 px-6 rounded-xl bg-[#F26A1B] text-white font-display font-bold text-xs hover:bg-[#D45914] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
                              >
                                {salvandoObjetivo ? 'Salvando...' : 'Salvar'}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {!studentAnamnese ? (
                    <div className="py-6 text-center bg-void/10 border border-line/30 rounded-2xl">
                      <p className="text-sm text-rose-400 font-medium">Anamnese não respondida</p>
                      <p className="text-xs text-ink-3 mt-1">Este aluno ainda não possui ficha de anamnese registrada.</p>
                    </div>
                  ) : (
                    <>
                      {/* SEÇÃO 2: OBJETIVO & EXPERIÊNCIA */}
                      <div className="bg-void/5 border border-line rounded-2xl overflow-hidden transition-all duration-200">
                        <div 
                          className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-raise/10 transition-colors"
                          onClick={() => toggleAnamneseExpanded('objetivo')}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Activity className="w-4 h-4 text-ink-3" />
                            <div className="truncate">
                              <h4 className="font-bold text-sm text-ink truncate">Objetivo & Experiência</h4>
                              <p className="text-[10px] text-ink-3 uppercase font-bold tracking-tight truncate max-w-[300px]">
                                {studentAnamnese.objetivo_principal}
                              </p>
                            </div>
                          </div>
                          <div className={`p-1.5 rounded-full bg-void transition-transform duration-300 ${expandedAnamnese['objetivo'] ? 'rotate-180' : ''}`}>
                            <ChevronDown className="w-4 h-4 text-ink-3" />
                          </div>
                        </div>
                        <AnimatePresence>
                          {expandedAnamnese['objetivo'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-5 pt-2 space-y-3 border-t border-line/30 text-xs">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-ink-3 mb-1">Objetivo principal</p>
                                    <p className="text-ink-2">{studentAnamnese.objetivo_principal}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-ink-3 mb-1">Experiência</p>
                                    <p className="text-ink-2">
                                      {studentAnamnese.experiencia === 'nunca_treinou' ? 'Nunca treinou' :
                                       studentAnamnese.experiencia === 'iniciante' ? 'Iniciante' :
                                       studentAnamnese.experiencia === 'intermediario' ? 'Intermediário' : 'Avançado'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-ink-3 mb-1">Tempo sem treinar</p>
                                    <p className="text-ink-2">{studentAnamnese.tempo_sem_treinar || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-ink-3 mb-1">Frequência semanal desejada</p>
                                    <p className="text-ink-2">{studentAnamnese.frequencia_semanal_desejada} dias</p>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* SEÇÃO 3: SAÚDE & LESÕES */}
                      <div className="bg-void/5 border border-line rounded-2xl overflow-hidden transition-all duration-200">
                        <div 
                          className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-raise/10 transition-colors"
                          onClick={() => toggleAnamneseExpanded('saude')}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Heart className="w-4 h-4 text-rose-500" />
                            <div className="truncate">
                              <h4 className="font-bold text-sm text-ink truncate">Saúde & Lesões</h4>
                              <p className="text-[10px] text-ink-3 uppercase font-bold tracking-tight truncate max-w-[300px]">
                                {studentAnamnese.possui_lesao ? `Possui lesão: ${studentAnamnese.lesoes}` : 'Sem lesões relatadas'}
                              </p>
                            </div>
                          </div>
                          <div className={`p-1.5 rounded-full bg-void transition-transform duration-300 ${expandedAnamnese['saude'] ? 'rotate-180' : ''}`}>
                            <ChevronDown className="w-4 h-4 text-ink-3" />
                          </div>
                        </div>
                        <AnimatePresence>
                          {expandedAnamnese['saude'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-5 pt-2 space-y-4 border-t border-line/30 text-xs">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-ink-3 mb-1">Possui lesão</p>
                                    <p className="text-ink-2">
                                      {studentAnamnese.possui_lesao ? (
                                        <span className="text-rose-400 font-semibold">Sim ({studentAnamnese.lesoes})</span>
                                      ) : 'Não'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-ink-3 mb-1">Cirurgias</p>
                                    <p className="text-ink-2">{studentAnamnese.cirurgias || 'Não'}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-ink-3 mb-1">Doenças crônicas</p>
                                    <p className="text-ink-2">
                                      {studentAnamnese.doencas_cronicas && studentAnamnese.doencas_cronicas.length > 0
                                        ? studentAnamnese.doencas_cronicas.join(', ')
                                        : 'Nenhuma'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-ink-3 mb-1">Medicamentos em uso</p>
                                    <p className="text-ink-2">{studentAnamnese.medicamentos || 'Nenhum'}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-ink-3 mb-1">Alergias</p>
                                    <p className="text-ink-2">{studentAnamnese.alergias || 'Nenhuma'}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-ink-3 mb-1">Liberação médica</p>
                                    <p className="text-ink-2">
                                      {studentAnamnese.possui_liberacao_medica ? 'Sim' : 'Não'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* SEÇÃO 4: PAR-Q */}
                      <div className="bg-void/5 border border-line rounded-2xl overflow-hidden transition-all duration-200">
                        <div 
                          className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-raise/10 transition-colors"
                          onClick={() => toggleAnamneseExpanded('parq')}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <ClipboardList className="w-4 h-4 text-ink-3" />
                            <div className="truncate">
                              <h4 className="font-bold text-sm text-ink truncate">Questionário de Prontidão (PAR-Q)</h4>
                              <p className={`text-[10px] uppercase font-bold tracking-tight truncate max-w-[300px] ${
                                (studentAnamnese.parq_problema_cardiaco || studentAnamnese.parq_dor_no_peito || studentAnamnese.parq_tontura_desmaio || studentAnamnese.parq_problema_osseo_articular || studentAnamnese.parq_medicamento_pressao || studentAnamnese.parq_outra_razao)
                                  ? 'text-rose-400'
                                  : 'text-emerald-400'
                              }`}>
                                {(studentAnamnese.parq_problema_cardiaco || studentAnamnese.parq_dor_no_peito || studentAnamnese.parq_tontura_desmaio || studentAnamnese.parq_problema_osseo_articular || studentAnamnese.parq_medicamento_pressao || studentAnamnese.parq_outra_razao)
                                  ? 'Atenção: Sinalizado(s)'
                                  : 'Sem restrições'}
                              </p>
                            </div>
                          </div>
                          <div className={`p-1.5 rounded-full bg-void transition-transform duration-300 ${expandedAnamnese['parq'] ? 'rotate-180' : ''}`}>
                            <ChevronDown className="w-4 h-4 text-ink-3" />
                          </div>
                        </div>
                        <AnimatePresence>
                          {expandedAnamnese['parq'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-5 pt-2 space-y-3 border-t border-line/30 text-xs">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
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
                                    <div className="sm:col-span-2 pt-1 border-t border-line/30 mt-1">
                                      <span className="text-[10px] uppercase tracking-wider font-bold text-ink-3 block mb-1">Detalhe da razão:</span>
                                      <span className="text-rose-300 italic">{studentAnamnese.parq_outra_razao_qual}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* SEÇÃO 5: ESTILO DE VIDA */}
                      <div className="bg-void/5 border border-line rounded-2xl overflow-hidden transition-all duration-200">
                        <div 
                          className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-raise/10 transition-colors"
                          onClick={() => toggleAnamneseExpanded('estilo')}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Info className="w-4 h-4 text-ink-3" />
                            <div className="truncate">
                              <h4 className="font-bold text-sm text-ink truncate">Estilo de Vida & Observações</h4>
                              <p className="text-[10px] text-ink-3 uppercase font-bold tracking-tight truncate max-w-[300px]">
                                {studentAnamnese.fumante ? 'Fumante' : 'Não fumante'} • {studentAnamnese.horas_sono}h Sono • {studentAnamnese.nivel_atividade_diaria}
                              </p>
                            </div>
                          </div>
                          <div className={`p-1.5 rounded-full bg-void transition-transform duration-300 ${expandedAnamnese['estilo'] ? 'rotate-180' : ''}`}>
                            <ChevronDown className="w-4 h-4 text-ink-3" />
                          </div>
                        </div>
                        <AnimatePresence>
                          {expandedAnamnese['estilo'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-5 pt-2 space-y-4 border-t border-line/30 text-xs">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-ink-3 mb-1">Fumante</p>
                                    <p className="text-ink-2">{studentAnamnese.fumante ? 'Sim' : 'Não'}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-ink-3 mb-1">Consumo de álcool</p>
                                    <p className="text-ink-2">
                                      {studentAnamnese.consumo_alcool === 'nao' ? 'Não consome' :
                                       studentAnamnese.consumo_alcool === 'social' ? 'Socialmente' : 'Frequentemente'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-ink-3 mb-1">Horas de sono</p>
                                    <p className="text-ink-2">{studentAnamnese.horas_sono} horas/noite</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-ink-3 mb-1">Atividade diária</p>
                                    <p className="text-ink-2">
                                      {studentAnamnese.nivel_atividade_diaria === 'sedentario' ? 'Sedentário' :
                                       studentAnamnese.nivel_atividade_diaria === 'leve' ? 'Leve' :
                                       studentAnamnese.nivel_atividade_diaria === 'moderado' ? 'Moderado' : 'Intenso'}
                                    </p>
                                  </div>
                                  {studentAnamnese.observacoes && (
                                    <div className="sm:col-span-2 pt-2 border-t border-line/30 mt-1">
                                      <p className="text-[10px] uppercase tracking-wider font-bold text-ink-3 block mb-1">Observações adicionais:</p>
                                      <p className="mt-1 bg-void/30 p-3 rounded-xl text-ink leading-relaxed border border-line/30 italic">
                                        {studentAnamnese.observacoes}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      {/* SEÇÃO 6: HÁBITOS DIÁRIOS */}
                      <div className="bg-void/5 border border-line rounded-2xl overflow-hidden transition-all duration-200">
                        <div 
                          className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-raise/10 transition-colors"
                          onClick={() => toggleAnamneseExpanded('habitos')}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <TrendingUp className="w-4 h-4 text-[#F26A1B]" />
                            <div className="truncate">
                              <h4 className="font-bold text-sm text-ink truncate">Hábitos Diários</h4>
                              <p className="text-[10px] text-ink-3 uppercase font-bold tracking-tight truncate max-w-[300px]">
                                Gestão de disciplina e rotina diária
                              </p>
                            </div>
                          </div>
                          <div className={`p-1.5 rounded-full bg-void transition-transform duration-300 ${expandedAnamnese['habitos'] ? 'rotate-180' : ''}`}>
                            <ChevronDown className="w-4 h-4 text-ink-3" />
                          </div>
                        </div>
                        <AnimatePresence>
                          {expandedAnamnese['habitos'] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-5 pt-2 space-y-4 border-t border-line/30">
                                <GerenciarHabitos alunoId={selectedAluno.id} personalId={personalId} isReadOnly={isReadOnly} />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* PERFIL ORTOPÉDICO / CUIDADOS ESPECIAIS */}
            <div className="z-card p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line/40">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-accent" />
                  <div>
                    <h3 className="font-display font-bold text-base text-ink">Perfil Ortopédico / Cuidados Especiais</h3>
                    <p className="text-[11px] text-ink-3">
                      Restrições articulares, desvios posturais e cuidados no treinamento do aluno
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCondicao(null);
                    setCondicaoBlocks([createEmptyBlock()]);
                    setShowAddCondicaoModal(true);
                  }}
                  className="py-2 px-4 rounded-lg bg-[#F26A1B] text-white text-xs font-semibold hover:bg-[#D45914] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Condição</span>
                </button>
              </div>

              {loadingCondicoes ? (
                <div className="py-8 text-center">
                  <div className="w-6 h-6 border-2 border-[#F26A1B] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs text-ink-3 mt-2">Carregando perfil ortopédico...</p>
                </div>
              ) : alunoCondicoes.length === 0 ? (
                <div className="py-6 text-center bg-void/10 border border-line/30 rounded-2xl">
                  <p className="text-sm text-ink-2 font-medium">Nenhum cuidado ortopédico cadastrado</p>
                  <p className="text-xs text-ink-3 mt-1">Clique em "Adicionar Condição" para registrar limitações ou patologias.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {alunoCondicoes.map((ac) => {
                    const cond = ac.condicoes_ortopedicas;
                    const isExpanded = !!expandedCondicoes[ac.id];
                    
                    return (
                      <div key={ac.id} className="bg-void/5 border border-line rounded-2xl overflow-hidden transition-all duration-200">
                        {/* Header Compacto */}
                        <div 
                          className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-raise/10 transition-colors"
                          onClick={() => toggleCondicaoExpanded(String(ac.id))}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${ac.tem_laudo ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            <div className="truncate">
                              <h4 className="font-bold text-sm text-ink truncate">{cond?.nome || 'Condição'}</h4>
                              <p className="text-[10px] text-ink-3 uppercase font-bold tracking-tight">Região: {cond?.regiao || 'Geral'}</p>
                            </div>
                            
                            <div className="hidden sm:flex items-center gap-1.5 shrink-0 ml-2">
                              {ac.lado && (
                                <span className="px-1.5 py-0.5 rounded bg-surface border border-line text-[9px] font-bold uppercase text-ink-3">
                                  {ac.lado === 'esquerdo' ? 'Esq' : ac.lado === 'direito' ? 'Dir' : 'Bilat'}
                                </span>
                              )}
                              {!ac.tem_laudo && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] font-bold uppercase text-amber-600">
                                  Pendente
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCondicao(ac);
                                setCondicaoBlocks([{
                                  tempId: 'edit',
                                  condicao_id: ac.condicao_id,
                                  lado: ac.lado,
                                  grau: ac.grau || '',
                                  observacao: ac.observacao || '',
                                  file: null,
                                  searchQuery: ac.condicoes_ortopedicas?.nome || '',
                                  isSearching: false,
                                  searchResults: [],
                                  loadingSearch: false
                                }]);
                                setShowAddCondicaoModal(true);
                              }}
                              className="text-ink-3 hover:text-accent transition-colors p-2 rounded-lg hover:bg-accent/10 cursor-pointer"
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            
                            <button
                              type="button"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setModalConfig({
                                   show: true,
                                   type: "confirm",
                                   variant: "danger",
                                   title: "Inativar Condição?",
                                   message: "Deseja inativar esta condição ortopédica para o aluno?",
                                   confirmLabel: "Inativar",
                                   onConfirm: async () => {
                                     try {
                                       await dbService.inativarAlunoCondicao(ac.id);
                                       showToast("Condição ortopédica removida.");
                                       loadStudentCondicoes();
                                     } catch (err) {
                                       console.error(err);
                                       showToast("Erro ao remover condição.");
                                     } finally {
                                       setModalConfig(null);
                                     }
                                   }
                                 });
                               }}
                              className="text-ink-3 hover:text-rose-500 transition-colors p-2 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                              title="Remover"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            <div className="w-px h-4 bg-line mx-1" />
                            
                            <div className={`p-1.5 rounded-full bg-void transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                              <ChevronDown className="w-4 h-4 text-ink-3" />
                            </div>
                          </div>
                        </div>

                        {/* Detalhes Expandidos */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-5 pt-2 space-y-4 border-t border-line/30">
                                <div className="flex flex-wrap gap-1.5 sm:hidden">
                                  {ac.lado && (
                                    <span className="px-2 py-0.5 rounded bg-surface border border-line text-[10px] font-semibold uppercase text-ink-2">
                                      Lado: {ac.lado === 'esquerdo' ? 'Esquerdo' : ac.lado === 'direito' ? 'Direito' : 'Bilateral'}
                                    </span>
                                  )}
                                  <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold uppercase ${
                                    ac.tem_laudo 
                                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' 
                                      : 'bg-amber-500/10 border-amber-500/20 text-amber-600'
                                  }`}>
                                    {ac.tem_laudo ? 'Laudo Validado' : 'Pendente de Laudo'}
                                  </span>
                                </div>

                                {ac.grau && (
                                  <div className="space-y-1">
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-ink-3">Grau / Detalhes:</p>
                                    <p className="text-xs text-ink">{ac.grau}</p>
                                  </div>
                                )}

                                {cond?.orientacao_geral && (
                                  <div className="bg-accent/5 border border-accent/10 p-3 rounded-xl text-xs text-accent leading-relaxed">
                                    <p className="font-bold text-[10px] uppercase tracking-wider mb-1 opacity-70">Recomendação Geral:</p>
                                    {cond.orientacao_geral}
                                  </div>
                                )}

                                {ac.observacao && (
                                  <div className="text-xs text-ink-2 leading-relaxed bg-surface/50 border border-line/30 p-3 rounded-xl">
                                    <span className="font-bold text-[10px] uppercase tracking-wider text-ink-3 block mb-1">Observação do Professor:</span>
                                    <p className="italic">{ac.observacao}</p>
                                  </div>
                                )}

                                {ac.tem_laudo && ac.laudo_url && (
                                  <div className="pt-3 border-t border-line/40 flex items-center justify-between text-xs">
                                    <span className="text-ink-3 flex items-center gap-1 font-medium">
                                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                      Laudo técnico anexado
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => abrirLaudo(ac.laudo_url)}
                                      className="text-accent hover:underline flex items-center gap-1 font-semibold cursor-pointer bg-transparent border-0 p-0"
                                    >
                                      <span>Ver laudo</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* MODAL ADICIONAR CONDIÇÃO ORTOPÉDICA */}
            <AnimatePresence>
              {showAddCondicaoModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => {
                      if (!salvandoCondicao) setShowAddCondicaoModal(false);
                    }}
                    className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
                  />

                  {/* Modal Box */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="relative w-full max-w-lg bg-surface rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col max-h-[90vh]"
                  >
                    {/* Header */}
                    <div className="p-6 pb-4 border-b border-line flex items-center justify-between bg-surface-2/30">
                      <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-accent" />
                        <h3 className="font-display font-bold text-lg text-ink">
                          {editingCondicao ? 'Editar Condição Ortopédica' : 'Adicionar Condição Ortopédica'}
                        </h3>
                      </div>
                      <button
                        type="button"
                        disabled={salvandoCondicao}
                        onClick={() => setShowAddCondicaoModal(false)}
                        className="text-ink-3 hover:text-ink transition-colors p-1 cursor-pointer"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Form Content */}
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        
                        const validBlocks = condicaoBlocks.filter(b => b.condicao_id);
                        if (validBlocks.length === 0) {
                          showToast('Selecione pelo menos uma condição ortopédica.');
                          return;
                        }

                        const incompleteBlocks = validBlocks.filter(b => !b.lado);
                        if (incompleteBlocks.length > 0) {
                          showToast('Selecione o lado acometido para todas as condições.');
                          return;
                        }
                        
                        setSalvandoCondicao(true);
                        try {
                          for (const block of validBlocks) {
                            const selectedCond = condicoesDisponiveis.find(c => String(c.id) === String(block.condicao_id));
                            
                            let laudoUrl: string | null = (editingCondicao && block.tempId === 'edit') ? editingCondicao.laudo_url : null;
                            if (block.file) {
                              const { url, error: uploadErr } = await dbService.uploadLaudo(selectedAluno!.id, block.file);
                              if (uploadErr) {
                                console.error('Erro ao fazer upload do laudo:', uploadErr);
                                showToast(`Erro ao enviar o laudo para ${selectedCond?.nome || 'condição'}.`);
                                continue;
                              }
                              laudoUrl = url;
                            }

                            const payload = {
                              aluno_id: selectedAluno!.id,
                              condicao_id: Number(block.condicao_id),
                              lado: block.lado,
                              grau: block.grau.trim() || null,
                              tem_laudo: !!laudoUrl,
                              laudo_url: laudoUrl,
                              observacao: block.observacao.trim() || null,
                              ativo: true
                            };

                            if (editingCondicao && block.tempId === 'edit') {
                              await dbService.updateAlunoCondicao(editingCondicao.id, payload);
                            } else {
                              await dbService.addAlunoCondicao(payload);
                            }
                          }

                          showToast(editingCondicao ? 'Condição ortopédica atualizada!' : 'Condições ortopédicas adicionadas!');
                          setShowAddCondicaoModal(false);
                          loadStudentCondicoes();
                        } catch (err) {
                          console.error(err);
                          showToast('Erro ao salvar algumas condições.');
                        } finally {
                          setSalvandoCondicao(false);
                        }
                      }}
                      className="flex flex-col h-full overflow-hidden"
                    >
                      <div className="p-6 space-y-8 overflow-y-auto flex-1 custom-scrollbar" ref={searchContainerRef}>
                        {condicaoBlocks.map((block, index) => {
                          const selectedCond = condicoesDisponiveis.find(c => String(c.id) === String(block.condicao_id));
                          
                          return (
                            <div key={block.tempId} className="relative space-y-4 p-4 rounded-2xl bg-raise/5 border border-line/30 group">
                              {/* Remove Button */}
                              {!editingCondicao && condicaoBlocks.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setCondicaoBlocks(prev => prev.filter(b => b.tempId !== block.tempId))}
                                  className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition-colors shadow-lg z-10"
                                  title="Remover este bloco"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}

                              {/* Title for Multiple Blocks */}
                              {!editingCondicao && condicaoBlocks.length > 1 && (
                                <div className="flex items-center gap-2 pb-2 border-b border-line/20">
                                  <span className="w-5 h-5 rounded-full bg-[#F26A1B]/10 text-[#F26A1B] text-[10px] font-bold flex items-center justify-center">
                                    {index + 1}
                                  </span>
                                  <span className="text-[11px] font-bold text-ink-3 uppercase tracking-wider">Nova Condição</span>
                                </div>
                              )}

                              {/* Selecionar Condição */}
                              <div className="space-y-1.5 relative">
                                <label className="text-xs font-semibold text-ink-2">Condição Ortopédica *</label>
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <Search className="w-4 h-4 text-ink-3" />
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="Busque por nome, CID ou sinônimo..."
                                    value={block.searchQuery}
                                    onFocus={() => setCondicaoBlocks(prev => prev.map(b => b.tempId === block.tempId ? { ...b, isSearching: true } : { ...b, isSearching: false }))}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setCondicaoBlocks(prev => prev.map(b => b.tempId === block.tempId ? { ...b, searchQuery: val, isSearching: true } : b));
                                    }}
                                    className="w-full h-11 pl-10 pr-3 rounded-xl border border-ink/20 bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-[#F26A1B] focus:border-[#F26A1B]"
                                  />
                                  {block.searchQuery && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCondicaoBlocks(prev => prev.map(b => b.tempId === block.tempId ? { ...b, searchQuery: '', condicao_id: '', isSearching: true, searchResults: [] } : b));
                                      }}
                                      className="absolute inset-y-0 right-3 flex items-center text-ink-3 hover:text-ink transition-colors"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>

                                {/* Search Results Dropdown */}
                                {block.isSearching && (
                                  <div className="absolute z-50 w-full mt-1 bg-surface border border-line rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
                                    {block.loadingSearch ? (
                                      <div className="px-4 py-8 text-center flex items-center justify-center gap-2">
                                        <RefreshCw className="w-4 h-4 text-accent animate-spin" />
                                        <p className="text-ink-3 text-xs">Buscando...</p>
                                      </div>
                                    ) : getFilteredCondicoes(block.searchQuery, block.searchResults).length > 0 ? (
                                      getFilteredCondicoes(block.searchQuery, block.searchResults).map((c) => (
                                        <button
                                          key={c.id}
                                          type="button"
                                          onClick={() => {
                                            setCondicaoBlocks(prev => prev.map(b => b.tempId === block.tempId ? { ...b, condicao_id: c.id, searchQuery: c.nome, isSearching: false, searchResults: [] } : b));
                                          }}
                                          className={`w-full text-left px-4 py-3 hover:bg-raise border-b border-line last:border-0 transition-colors flex flex-col gap-0.5 ${
                                            String(block.condicao_id) === String(c.id) ? 'bg-[#F26A1B]/5' : ''
                                          }`}
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="text-sm font-semibold text-ink">
                                              {c.nome} {c.cid ? `(${c.cid})` : ''}
                                            </span>
                                            {c.origem === 'personalizada' && (
                                              <span className="text-[9px] bg-[#F26A1B]/10 text-[#F26A1B] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Personalizada</span>
                                            )}
                                          </div>
                                          {c.sinonimos && c.sinonimos.length > 0 && (
                                            <span className="text-[10px] text-ink-3 italic line-clamp-1">
                                              Sinônimos: {c.sinonimos.join(', ')}
                                            </span>
                                          )}
                                        </button>
                                      ))
                                    ) : block.searchQuery.trim().length >= 2 ? (
                                      <div className="p-4 text-center">
                                        <p className="text-ink-3 text-xs mb-3">Nenhuma condição encontrada</p>
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              if (!supabase) return;
                                              const { data, error } = await supabase
                                                .from('condicoes_ortopedicas')
                                                .insert({ 
                                                  nome: block.searchQuery.trim(), 
                                                  origem: 'personalizada',
                                                  regiao: 'Geral',
                                                  orientacao_geral: 'Condição personalizada cadastrada pelo professor. Recomenda-se cautela no treino.'
                                                })
                                                .select()
                                                .single();
                                              
                                              if (error) throw error;
                                              
                                              setCondicoesDisponiveis(prev => [...prev, data]);
                                              setCondicaoBlocks(prev => prev.map(b => b.tempId === block.tempId ? { 
                                                ...b, 
                                                condicao_id: data.id, 
                                                searchQuery: data.nome, 
                                                isSearching: false, 
                                                searchResults: [] 
                                              } : b));
                                            } catch (err) {
                                              console.error('Erro ao criar condição personalizada:', err);
                                              showToast('Erro ao criar condição personalizada.');
                                            }
                                          }}
                                          className="w-full py-2 bg-accent/10 border border-accent/20 rounded-lg text-accent text-xs font-bold hover:bg-accent/20 transition-colors"
                                        >
                                          Criar "{block.searchQuery}" como personalizada
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="px-4 py-8 text-center">
                                        <p className="text-ink-3 text-xs">Digite pelo menos 2 caracteres...</p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Selected Condition Status/Warning */}
                                {block.condicao_id && !block.isSearching && selectedCond?.origem === 'personalizada' && (
                                  <div className="mt-1 flex items-center gap-1.5 text-[10px] text-[#F26A1B] font-medium bg-[#F26A1B]/5 p-2 rounded-lg border border-[#F26A1B]/10">
                                    <AlertCircle className="w-3 h-3 shrink-0" />
                                    <span>Condição personalizada: Sem regras de segurança automáticas.</span>
                                  </div>
                                )}
                              </div>

                              {/* Orientações da Condição */}
                              {selectedCond && (
                                <div className="bg-[#F26A1B]/10 border border-[#F26A1B]/20 p-4 rounded-2xl text-xs space-y-1">
                                  <p className="font-semibold text-accent flex items-center gap-1">
                                    <AlertTriangle className="w-4 h-4 shrink-0 text-[#F26A1B]" />
                                    <span>Orientações:</span>
                                  </p>
                                  <p className="text-ink-2 leading-relaxed mt-1">{selectedCond.orientacao_geral}</p>
                                  {selectedCond.requer_laudo && (
                                    <p className="text-rose-500 font-bold mt-2 flex items-center gap-1 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                                      ⚠️ Atenção: Laudo técnico recomendado para validação completa.
                                    </p>
                                  )}
                                </div>
                              )}

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Lado Acometido */}
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-ink-2">Lado Acometido</label>
                                  <div className="grid grid-cols-3 gap-2">
                                    {['esquerdo', 'direito', 'bilateral'].map(val => (
                                      <button
                                        key={val}
                                        type="button"
                                        onClick={() => setCondicaoBlocks(prev => prev.map(b => b.tempId === block.tempId ? { ...b, lado: b.lado === val ? null : val as any } : b))}
                                        className={`h-10 text-[10px] font-bold uppercase rounded-xl border transition-all cursor-pointer ${
                                          block.lado === val
                                            ? 'bg-[#F26A1B] text-white border-transparent'
                                            : 'bg-surface hover:bg-raise text-ink-2 border-line'
                                        }`}
                                      >
                                        {val}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Grau */}
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-ink-2">Grau / Nível (ex: L4-L5)</label>
                                  <input
                                    type="text"
                                    value={block.grau}
                                    onChange={(e) => setCondicaoBlocks(prev => prev.map(b => b.tempId === block.tempId ? { ...b, grau: e.target.value } : b))}
                                    placeholder="Ex: Grau II, L4-S1..."
                                    className="w-full h-10 px-3 rounded-xl border border-ink/20 bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-[#F26A1B]"
                                  />
                                </div>
                              </div>

                              {/* Observações */}
                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-ink-2">Observações / Cuidados Treino</label>
                                <textarea
                                  rows={2}
                                  value={block.observacao}
                                  onChange={(e) => setCondicaoBlocks(prev => prev.map(b => b.tempId === block.tempId ? { ...b, observacao: e.target.value } : b))}
                                  placeholder="Notas específicas para esta condição..."
                                  className="w-full p-3 rounded-xl border border-ink/20 bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-[#F26A1B]"
                                />
                              </div>

                              {/* File Upload */}
                              <div className="space-y-2">
                                <label className="text-xs font-semibold text-ink-2">
                                  Laudo Técnico {selectedCond?.requer_laudo ? '(Obrigatório *)' : '(Opcional)'}
                                </label>
                                <div className="border border-dashed border-ink/20 rounded-xl p-3 bg-surface/50 text-center hover:bg-raise/20 transition-all cursor-pointer relative">
                                  <input
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    onChange={(e) => {
                                      if (e.target.files?.[0]) {
                                        const file = e.target.files[0];
                                        setCondicaoBlocks(prev => prev.map(b => b.tempId === block.tempId ? { ...b, file } : b));
                                      }
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  />
                                  <div className="flex items-center justify-center gap-2 text-[10px] font-medium text-ink-2">
                                    <Upload className="w-4 h-4 text-ink-3" />
                                    {block.file ? (
                                      <span className="text-[#F26A1B]">{block.file.name}</span>
                                    ) : (
                                      <span>{editingCondicao ? 'Clique para substituir' : 'Anexar laudo (PDF, JPG)'}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Add Another Block Button */}
                        {!editingCondicao && (
                          <button
                            type="button"
                            onClick={() => setCondicaoBlocks(prev => [...prev, createEmptyBlock()])}
                            className="w-full py-4 rounded-2xl border-2 border-dashed border-line hover:border-[#F26A1B] hover:bg-[#F26A1B]/5 transition-all group flex flex-col items-center gap-1 cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-full bg-line group-hover:bg-[#F26A1B] flex items-center justify-center transition-colors">
                              <Plus className="w-5 h-5 text-ink group-hover:text-white" />
                            </div>
                            <span className="text-xs font-bold text-ink-2 group-hover:text-[#F26A1B]">Adicionar outra condição</span>
                          </button>
                        )}
                      </div>

                      {/* Actions Footer */}
                      <div className="p-6 border-t border-line flex gap-3 justify-end bg-surface-2/50">
                        <button
                          type="button"
                          disabled={salvandoCondicao}
                          onClick={() => setShowAddCondicaoModal(false)}
                          className="h-11 px-5 rounded-xl border border-line hover:bg-raise transition-colors text-xs font-bold text-ink-2 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={salvandoCondicao}
                          className="h-11 px-8 rounded-xl bg-[#F26A1B] hover:bg-[#D45914] text-white transition-colors text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#F26A1B]/20 cursor-pointer"
                        >
                          {salvandoCondicao ? (
                            <>
                              <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                              <span>Salvando...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              <span>{editingCondicao ? 'Salvar alterações' : condicaoBlocks.length > 1 ? `Adicionar ${condicaoBlocks.length} Condições` : 'Adicionar Condição'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* MODAL CUIDADOS ORTOPÉDICOS ATIVOS */}
            <AnimatePresence>
              {showActiveCondicoesModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowActiveCondicoesModal(false)}
                    className="fixed inset-0 bg-black/45 backdrop-blur-[2px] cursor-pointer"
                  />

                  {/* Modal Box */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-2xl bg-surface rounded-[20px] overflow-hidden border border-line shadow-2xl z-10 flex flex-col max-h-[85vh]"
                  >
                    {/* Header */}
                    <div className="p-6 pb-4 border-b border-line flex items-center justify-between bg-surface-2/30">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-[#F26A1B]" />
                        <h3 className="font-display font-bold text-lg text-ink">Cuidados ortopédicos</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowActiveCondicoesModal(false)}
                        className="text-ink-3 hover:text-ink transition-colors p-1 cursor-pointer"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4 overflow-y-auto">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {alunoCondicoes.map((ac) => {
                          const cond = ac.condicoes_ortopedicas;
                          return (
                            <div key={ac.id} className="p-5 bg-raise/5 border border-line rounded-2xl space-y-4 flex flex-col justify-between">
                              <div className="space-y-3">
                                <div>
                                  <h4 className="font-semibold text-sm text-ink">{cond?.nome || 'Condição'}</h4>
                                  <p className="text-[11px] text-ink-3 mt-0.5">Região: {cond?.regiao || 'Geral'}</p>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                  {ac.lado && (
                                    <span className="px-2 py-0.5 rounded bg-surface border border-line text-[10px] font-semibold uppercase text-ink-2">
                                      Lado: {ac.lado === 'esquerdo' ? 'Esquerdo' : ac.lado === 'direito' ? 'Direito' : 'Bilateral'}
                                    </span>
                                  )}
                                  {ac.grau && (
                                    <span className="px-2 py-0.5 rounded bg-surface border border-line text-[10px] font-semibold text-ink-2">
                                      Grau: {ac.grau}
                                    </span>
                                  )}
                                  {cond?.requer_laudo && (
                                    <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold uppercase ${
                                      ac.tem_laudo 
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' 
                                        : 'bg-amber-500/10 border-amber-500/20 text-amber-600'
                                    }`}>
                                      {ac.tem_laudo ? 'Laudo Validado' : 'Pendente de Laudo'}
                                    </span>
                                  )}
                                </div>

                                {cond?.orientacao_geral && (
                                  <div className="bg-[#F26A1B14] border border-[#F26A1B]/20 p-3 rounded-xl text-xs text-[#F26A1B] leading-relaxed font-medium">
                                    <p className="font-bold text-[10px] uppercase tracking-wider mb-1 text-[#F26A1B]">Recomendação Geral:</p>
                                    {cond.orientacao_geral}
                                  </div>
                                )}

                                {ac.observacao && (
                                  <div className="text-xs text-ink-2 leading-relaxed bg-surface/80 border border-line/40 p-2.5 rounded-xl">
                                    <span className="font-semibold text-ink-3 text-[11px]">Observação do Professor:</span>
                                    <p className="mt-0.5 italic">{ac.observacao}</p>
                                  </div>
                                )}
                              </div>

                              {ac.tem_laudo && ac.laudo_url && (
                                <div className="pt-2 border-t border-line flex items-center justify-between text-xs mt-2">
                                  <span className="text-ink-3 flex items-center gap-1 font-medium">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                    Laudo técnico
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => abrirLaudo(ac.laudo_url)}
                                    className="text-[#F26A1B] hover:underline flex items-center gap-1 font-semibold cursor-pointer bg-transparent border-0 p-0"
                                  >
                                    <span>Ver laudo</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-raise/5 border-t border-line flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShowActiveCondicoesModal(false)}
                        className="h-11 px-6 rounded-xl bg-[#F26A1B] hover:bg-[#D45914] text-white transition-colors text-xs font-bold cursor-pointer"
                      >
                        Fechar
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

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
                          className="z-input"
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
                          className="z-input"
                        />
                      </div>

                      <button
                        id="btn-confirmar-convite"
                        type="button"
                        disabled={generatingCode || !conviteNome.trim()}
                        onClick={handleGenerateCode}
                        className="w-full py-3.5 px-4 rounded-xl brand-gradient-bg font-display font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(245,51,79,0.2)] disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {generatingCode ? (
                          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
                        <span className="text-[10px] font-mono text-ink-3 uppercase tracking-wider block font-semibold">Preview da Mensagem:</span>
                        <div className="bg-surface-2 p-4 rounded-xl border border-white/5 text-xs text-ink-2 font-sans whitespace-pre-wrap leading-relaxed select-all max-h-48 overflow-y-auto">
                          {getInvitationMessage(conviteNome, generatedCode)}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] font-mono text-ink-3 uppercase tracking-wider block">Link de Convite:</span>
                        <div className="bg-surface-2 p-3 rounded-xl border border-white/5 text-xs text-ink-2 font-mono truncate select-all">
                          {`https://app.zelospersonal.com.br/cadastro?convite=${generatedCode}`}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        <a
                          id="btn-whatsapp-share"
                          href={`https://wa.me/?text=${encodeURIComponent(getInvitationMessage(conviteNome, generatedCode))}`}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="py-3.5 px-4 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-center cursor-pointer font-sans"
                        >
                          <Send className="w-4 h-4" />
                          <span>Enviar pelo WhatsApp</span>
                        </a>

                        <div className="grid grid-cols-2 gap-3">
                          <button
                            id="btn-copy-convite-link"
                            type="button"
                            onClick={() => handleCopyLink(generatedCode)}
                            className="py-3 px-4 bg-surface-3 hover:bg-white/10 border border-white/5 text-ink text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                          >
                            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4" />}
                            <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
                          </button>

                          <button
                            id="btn-copy-convite-message"
                            type="button"
                            onClick={() => handleCopyMessage(conviteNome, generatedCode)}
                            className="py-3 px-4 bg-surface-3 hover:bg-white/10 border border-white/5 text-ink text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                          >
                            {copiedMessage ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            <span>{copiedMessage ? 'Copiado!' : 'Copiar Mensagem'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-center pt-2">
                        <button
                          id="btn-novo-convite"
                          type="button"
                          onClick={handleResetConviteForm}
                          className="text-xs text-flame hover:underline font-mono uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
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
                        className="z-input !pl-10 !text-xs"
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
                        className="z-input !pl-10 !text-xs"
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
                        className="z-input !pl-10 !text-xs"
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
                            ? 'bg-surface-3 border-line-strong text-ink font-semibold'
                            : 'bg-void border-line text-ink-2 hover:border-line-strong'
                        }`}
                      >
                        Masculino (👨)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNovoAvatar('feminino')}
                        className={`p-2.5 rounded-xl border text-center text-xs transition-all ${
                          novoAvatar === 'feminino'
                            ? 'bg-surface-3 border-line-strong text-ink font-semibold'
                            : 'bg-void border-line text-ink-2 hover:border-line-strong'
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
                      className="px-4 py-2.5 rounded-xl bg-flame hover:bg-flame/95 text-white font-display font-bold text-xs shadow-lg disabled:opacity-50 cursor-pointer"
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

      {/* CUSTOM ZELOS MODAL */}
      {modalConfig && (
        <ZelosModal
          show={modalConfig.show}
          type={modalConfig.type}
          variant={modalConfig.variant}
          title={modalConfig.title}
          message={modalConfig.message}
          confirmLabel={modalConfig.confirmLabel}
          onConfirm={modalConfig.onConfirm}
          onCancel={() => setModalConfig(null)}
        />
      )}
    </div>
  );
}
