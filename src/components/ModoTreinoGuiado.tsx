import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, BarChart2, Play, Pause, Plus, Check, ChevronRight, ChevronLeft, 
  RefreshCw, Edit3, Flame, Timer, Dumbbell, Maximize2, Minimize2, 
  Volume2, VolumeX, AlertTriangle, Trophy, Sparkles, CheckCircle2, 
  Clock, ArrowRight, FileText, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService, supabase, isSupabaseConfigured } from '../lib/supabase';
import { Treino, TreinoExercicioDetailed, TreinoExercicioSerie, Exercicio, Profile } from '../types';
import { tocar } from '../lib/som';

interface ModoTreinoGuiadoProps {
  treino: Treino;
  alunoId: string;
  onClose: () => void;
  onTreinoConcluido: () => void;
}

export default function ModoTreinoGuiado({
  treino,
  alunoId,
  onClose,
  onTreinoConcluido
}: ModoTreinoGuiadoProps) {
  // Exercícios do Treino
  const [exercicios, setExercicios] = useState<TreinoExercicioDetailed[]>(
    treino.exercicios || []
  );
  const [currentExIdx, setCurrentExIdx] = useState(0);

  // Mapeamento de séries por exercício (treino_exercicio_id -> TreinoExercicioSerie[])
  const [seriesMap, setSeriesMap] = useState<Record<string, TreinoExercicioSerie[]>>({});
  const [currentSetNum, setCurrentSetNum] = useState(1);

  // Estados Visuais e Aquecimento
  const [mediaExpanded, setMediaExpanded] = useState(false);
  const [aquecimentoConcluidoMap, setAquecimentoConcluidoMap] = useState<Record<string, boolean>>({});

  // Cronômetro do Treino Total
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Cronômetro de Descanso
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);
  const [restTimerActive, setRestTimerActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Modais
  const [modalConfirmarSaida, setModalConfirmarSaida] = useState(false);
  const [modalEstatisticas, setModalEstatisticas] = useState(false);
  const [modalSubstituir, setModalSubstituir] = useState(false);
  const [modalNota, setModalNota] = useState(false);
  const [modalConcluido, setModalConcluido] = useState(false);
  const [modalAviso, setModalAviso] = useState<{
    show: boolean;
    titulo: string;
    mensagem: string;
    tipo: 'alerta' | 'erro';
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    show: false,
    titulo: '',
    mensagem: '',
    tipo: 'alerta'
  });
  const [alunoProfile, setAlunoProfile] = useState<Profile | null>(null);
  const [videoError, setVideoError] = useState(false);

  const isFemale = alunoProfile?.avatar_tipo === 'feminino';

  // Auxiliares de Modais
  const [notaTexto, setNotaTexto] = useState('');
  const [buscaExercicio, setBuscaExercicio] = useState('');
  const [bibliotecaExercicios, setBibliotecaExercicios] = useState<Exercicio[]>([]);

  // Exercício Atual
  const currentEx = exercicios[currentExIdx] || null;

  // Reset video error when exercise changes
  useEffect(() => {
    setVideoError(false);
  }, [currentExIdx]);

  // Carregar/Inicializar Séries e Exercícios da Biblioteca
  useEffect(() => {
    async function inicializarTreino() {
      let currentExs = treino.exercicios || [];
      if ((!currentExs || currentExs.length === 0) && treino.id) {
        const res = await dbService.getTreinoCompleto(treino.id);
        if (res.data && res.data.exercicios && res.data.exercicios.length > 0) {
          currentExs = res.data.exercicios;
          setExercicios(currentExs);
        }
      } else {
        setExercicios(currentExs);
      }
    }
    inicializarTreino();
    carregarBiblioteca();
  }, [treino.id]);

  useEffect(() => {
    async function carregarAluno() {
      if (alunoId) {
        const { data } = await dbService.getAluno(alunoId);
        if (data?.profile) {
          setAlunoProfile(data.profile);
        }
      }
    }
    carregarAluno();
  }, [alunoId]);

  useEffect(() => {
    if (exercicios && exercicios.length > 0) {
      carregarSeriesETodos();
    }
  }, [exercicios]);

  // Cronômetro de Tempo Total do Treino
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Cronômetro de Descanso Regressivo
  useEffect(() => {
    let interval: any = null;
    if (restTimerActive && restSecondsLeft > 0) {
      interval = setInterval(() => {
        setRestSecondsLeft(prev => {
          if (prev <= 1) {
            setRestTimerActive(false);
            if (!isMuted) {
              tocar('sucesso');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (restSecondsLeft === 0) {
      setRestTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [restTimerActive, restSecondsLeft, isMuted]);

  // Modal de Aviso Escape Listener
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalAviso.show) {
        setModalAviso(prev => ({ ...prev, show: false }));
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [modalAviso.show]);

  // Carregar Séries de todos os exercícios do treino
  async function carregarSeriesETodos() {
    const newMap: Record<string, TreinoExercicioSerie[]> = {};

    for (const item of exercicios) {
      const exId = item.id || `temp-${item.exercicio_id}`;
      const res = await dbService.getSeriesDoExercicio(exId);
      
      let currentSeries = res.data || [];
      const prescribedCount = item.series || 3;

      // Se o número de séries no banco for menor que o prescrito, gerar as faltantes
      if (currentSeries.length < prescribedCount && isSupabaseConfigured && supabase && !exId.startsWith('temp-')) {
        const diff = prescribedCount - currentSeries.length;
        const toInsert = [];
        
        for (let i = 1; i <= diff; i++) {
          toInsert.push({
            treino_exercicio_id: exId,
            numero_serie: currentSeries.length + i,
            repeticoes: item.repeticoes || '12',
            carga_kg: item.carga_kg ?? 20,
            concluida: false
          });
        }

        const { data: savedSeries, error } = await supabase
          .from('treino_exercicio_series')
          .insert(toInsert)
          .select();
        
        if (savedSeries) {
          currentSeries = [...currentSeries, ...savedSeries].sort((a, b) => a.numero_serie - b.numero_serie);
        } else if (error) {
          console.error('Erro ao gerar séries faltantes:', error);
          // Fallback para temp se falhar
          const tempSeries = toInsert.map((s, idx) => ({ ...s, id: `temp-${exId}-${currentSeries.length + idx + 1}` }));
          currentSeries = [...currentSeries, ...tempSeries].sort((a, b) => a.numero_serie - b.numero_serie);
        }
      } else if (currentSeries.length === 0) {
        // Fallback para caso offline ou demo onde nada foi carregado
        const numSeries = item.series || 3;
        for (let s = 1; s <= numSeries; s++) {
          currentSeries.push({
            id: `temp-${exId}-${s}`,
            treino_exercicio_id: exId,
            numero_serie: s,
            repeticoes: item.repeticoes || '12',
            carga_kg: item.carga_kg ?? 20,
            concluida: false
          });
        }
      }
      
      newMap[exId] = currentSeries;
    }

    setSeriesMap(newMap);
  }

  // Carregar Biblioteca para Substituição
  async function carregarBiblioteca() {
    try {
      const res = await dbService.getAllExercicios();
      if (res.data) setBibliotecaExercicios(res.data);
    } catch (e) {
      console.error('Erro ao carregar biblioteca de exercícios:', e);
    }
  }

  // Séries do Exercício Atual
  const seriesCurrentEx = useMemo(() => {
    if (!currentEx) return [];
    const exId = currentEx.id || `temp-${currentEx.exercicio_id}`;
    return seriesMap[exId] || [];
  }, [currentEx, seriesMap]);

  // Alternar Status Concluído de uma Série
  async function handleToggleSerie(numeroSerie: number) {
    if (!currentEx) return;
    const exId = currentEx.id || `temp-${currentEx.exercicio_id}`;
    const seriesAtual = seriesMap[exId] || [];

    const seriesNovas = seriesAtual.map(s => {
      if (s.numero_serie === numeroSerie) {
        const proximoStatus = !s.concluida;
        const serieAtualizada = {
          ...s,
          concluida: proximoStatus,
          concluida_em: proximoStatus ? new Date().toISOString() : null
        };
        // Persistir no backend - enviamos apenas esta série
        dbService.saveSerieExecucao(serieAtualizada);
        return serieAtualizada;
      }
      return s;
    });

    setSeriesMap(prev => ({ ...prev, [exId]: seriesNovas }));

    // Se marcou como concluída
    const serieAlvo = seriesNovas.find(s => s.numero_serie === numeroSerie);
    if (serieAlvo?.concluida) {
      tocar('tap');

      // Iniciar cronômetro de descanso
      const tempoDescanso = currentEx.descanso_seg || 60;
      setRestSecondsLeft(tempoDescanso);
      setRestTimerActive(true);

      // Mudar foco para a próxima série
      if (numeroSerie < (currentEx.series || seriesNovas.length)) {
        setCurrentSetNum(numeroSerie + 1);
      }
    }
  }

  // Editar Carga ou Repetições de uma Série
  function handleEditarSerieValue(numeroSerie: number, field: 'repeticoes' | 'carga_kg', value: any) {
    if (!currentEx) return;
    const exId = currentEx.id || `temp-${currentEx.exercicio_id}`;
    const seriesAtual = seriesMap[exId] || [];

    const seriesNovas = seriesAtual.map(s => {
      if (s.numero_serie === numeroSerie) {
        const serieAtualizada = { ...s, [field]: value };
        dbService.saveSerieExecucao(serieAtualizada);
        return serieAtualizada;
      }
      return s;
    });

    setSeriesMap(prev => ({ ...prev, [exId]: seriesNovas }));
  }

  // Substituir Exercício Atual por outro da Biblioteca
  async function handleSubstituirExercicio(novoExercicio: Exercicio) {
    if (!currentEx) return;

    const oldExId = currentEx.exercicio_id;
    const exAtualizado: TreinoExercicioDetailed = {
      ...currentEx,
      exercicio_id: novoExercicio.id,
      exercicio: novoExercicio,
      substituido_de: oldExId
    };

    setExercicios(prev => prev.map((ex, idx) => idx === currentExIdx ? exAtualizado : ex));
    setModalSubstituir(false);

    // Atualizar no Supabase
    if (currentEx.id) {
      await dbService.updateTreinoExercicioDetalhe(currentEx.id, {
        exercicio_id: novoExercicio.id,
        substituido_de: oldExId
      });
    }
    tocar('sucesso');
  }

  // Salvar Nota do Exercício
  async function handleSalvarNota() {
    if (!currentEx) return;

    const exAtualizado = { ...currentEx, nota: notaTexto };
    setExercicios(prev => prev.map((ex, idx) => idx === currentExIdx ? exAtualizado : ex));
    setModalNota(false);

    if (currentEx.id) {
      await dbService.updateTreinoExercicioDetalhe(currentEx.id, {
        nota: notaTexto
      });
    }
    tocar('sucesso');
  }

  // Avançar Exercício
  function handleProximoExercicio() {
    if (currentExIdx < exercicios.length - 1) {
      setCurrentExIdx(prev => prev + 1);
      setCurrentSetNum(1);
      setRestTimerActive(false);
      tocar('tap');
    } else {
      // Se era o último exercício, finalizar treino
      handleFinalizarTreino();
    }
  }

  // Voltar Exercício / Série
  function handleVoltar() {
    if (currentSetNum > 1) {
      setCurrentSetNum(prev => prev - 1);
    } else if (currentExIdx > 0) {
      setCurrentExIdx(prev => prev - 1);
      const exAnteriorId = exercicios[currentExIdx - 1]?.id || `temp-${exercicios[currentExIdx - 1]?.exercicio_id}`;
      const seriesAnterior = seriesMap[exAnteriorId] || [];
      setCurrentSetNum(seriesAnterior.length || 1);
    }
    tocar('tap');
  }

  const [isFinalizing, setIsFinalizing] = useState(false);

  // Finalizar Treino Completo
  async function handleFinalizarTreino() {
    const totalPrescritas = exercicios.reduce((acc, curr) => acc + (curr.series || 0), 0);
    const seriesFaltantes = totalPrescritas - totalSeriesConcluidas;

    if (seriesFaltantes > 0) {
      setModalAviso({
        show: true,
        tipo: 'alerta',
        titulo: 'Séries Pendentes',
        mensagem: `Atenção: ainda ${seriesFaltantes === 1 ? 'falta 1 série' : `faltam ${seriesFaltantes} séries`} para completar o planejado. Deseja encerrar mesmo assim?`,
        confirmLabel: 'Continuar treinando',
        cancelLabel: 'Encerrar mesmo assim',
        onConfirm: () => setModalAviso(prev => ({ ...prev, show: false })),
        onCancel: () => proceedFinalize(totalPrescritas)
      });
      return;
    }

    proceedFinalize(totalPrescritas);
  }

  async function proceedFinalize(totalPrescritas: number) {
    setIsFinalizing(true);
    setModalAviso(prev => ({ ...prev, show: false }));
    
    try {
      // O status é controlado pelo gatilho do banco. 
      // Apenas verificamos se o status REALMENTE mudou após as séries serem concluídas.
      if (isSupabaseConfigured && supabase) {
        const { data: updatedTreino } = await supabase
          .from('treinos')
          .select('status')
          .eq('id', treino.id)
          .single();
        
        if (updatedTreino?.status !== 'concluido') {
          // O gatilho provavelmente bloqueou porque nem todas as séries foram concluídas
          setModalAviso({
            show: true,
            tipo: 'alerta',
            titulo: 'Treino Incompleto',
            mensagem: `O treino não pôde ser marcado como concluído no sistema. Verifique se você marcou todas as ${totalPrescritas} séries como feitas.`,
            confirmLabel: 'Ok'
          });
          setIsFinalizing(false);
          return;
        }
      }

      tocar('celebracao');
      setModalConcluido(true);
    } catch (err) {
      console.error(err);
      setModalAviso({
        show: true,
        tipo: 'erro',
        titulo: 'Erro no Sistema',
        mensagem: "Erro ao processar finalização do treino.",
        confirmLabel: 'Ok'
      });
    } finally {
      setIsFinalizing(false);
    }
  }

  // Métricas para Modal de Estatísticas / Tela de Conclusão
  const totalSeriesConcluidas = useMemo(() => {
    let count = 0;
    Object.values(seriesMap).forEach(arr => {
      arr.forEach(s => {
        if (s.concluida) count++;
      });
    });
    return count;
  }, [seriesMap]);

  const totalCargaKgElevada = useMemo(() => {
    let total = 0;
    Object.values(seriesMap).forEach(arr => {
      arr.forEach(s => {
        if (s.concluida) {
          const repsNum = parseInt(s.repeticoes) || 10;
          const carga = s.carga_kg || 0;
          total += repsNum * carga;
        }
      });
    });
    return total;
  }, [seriesMap]);

  // Formatação de Tempo (MM:SS)
  function formatTime(totalSec: number) {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <div className="fixed inset-0 z-[60] bg-bg text-ink overflow-y-auto flex flex-col font-sans select-none">
      {/* =================================================================== */}
      {/* 1. BARRA SUPERIOR FIXA */}
      {/* =================================================================== */}
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-line/60 px-4 py-3 flex items-center justify-between gap-3 shadow-md">
        {/* Botão Fechar (X) */}
        <button
          type="button"
          onClick={() => setModalConfirmarSaida(true)}
          className="p-2 rounded-xl bg-surface border border-line text-ink-2 hover:text-ink hover:border-line-strong transition-all cursor-pointer active:scale-95"
          title="Sair do Treino"
        >
          <X className="w-5 h-5 text-red-400" />
        </button>

        {/* Título & Progresso do Exercício */}
        <div className="text-center min-w-0 flex-1">
          <span className="text-[10px] font-mono text-[#F26A1B] uppercase tracking-wider font-bold block">
            Modo Treino Guiado
          </span>
          <h2 className="font-display font-bold text-sm sm:text-base text-ink truncate leading-tight">
            {treino.titulo}
          </h2>
          <span className="text-[11px] text-ink-3 font-mono">
            Exercício {currentExIdx + 1} de {exercicios.length}
          </span>
        </div>

        {/* Botão Estatísticas */}
        <button
          type="button"
          onClick={() => setModalEstatisticas(true)}
          className="px-3 py-1.5 rounded-xl bg-[#F26A1B]/10 border border-[#F26A1B]/30 text-[#F26A1B] hover:bg-[#F26A1B]/20 text-xs font-display font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
        >
          <BarChart2 className="w-4 h-4" />
          <span className="hidden sm:inline">Estatísticas</span>
        </button>
      </header>

      {/* =================================================================== */}
      {/* CONTEÚDO PRINCIPAL (SCROLLÁVEL) */}
      {/* =================================================================== */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 space-y-5 pb-36">
        {currentEx && (
          <>
            {/* 2. CARD DO EXERCÍCIO ATUAL (MÍDIA/VÍDEO + EXPANDIR) */}
            <div className="bg-surface border border-line/60 rounded-2xl overflow-hidden shadow-lg relative group">
              {/* Mídia Banner */}
              <div className={`relative bg-surface-2 transition-all duration-300 ${mediaExpanded ? 'h-80' : 'h-52'} flex items-center justify-center overflow-hidden`}>
                {(() => {
                  const videoPath = isFemale 
                    ? (currentEx.exercicio?.video_url_fem || currentEx.exercicio?.video_url_masc)
                    : (currentEx.exercicio?.video_url_masc || currentEx.exercicio?.video_url_fem);
                  const videoUrl = dbService.getExerciseVideoUrl(videoPath);

                  if (videoUrl && !videoError) {
                    return (
                      <video
                        key={videoUrl}
                        src={videoUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                        onError={() => setVideoError(true)}
                      />
                    );
                  }

                  return (
                    <div className="flex flex-col items-center justify-center text-ink-3 gap-2 p-6 text-center">
                      <div className="w-16 h-16 rounded-full bg-[#F26A1B]/10 flex items-center justify-center mb-1">
                        <Dumbbell className="w-8 h-8 text-[#F26A1B]/60" />
                      </div>
                      <span className="text-sm font-display font-bold text-ink-2">Vídeo em breve</span>
                      <span className="text-[10px] opacity-60 max-w-[200px]">
                        Estamos preparando as instruções em vídeo para este exercício.
                      </span>
                    </div>
                  );
                })()}

                <div className="absolute top-3 right-3 bg-void/80 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-1 flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-bold text-ink-2 shadow-xl pointer-events-none z-10">
                  <Sparkles className="w-3 h-3 text-flame animate-pulse" />
                  <span>Movimento Ilustrativo</span>
                </div>

                {/* Tag de Músculo Primário */}
                <span className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-[#F26A1B] text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-lg border border-[#F26A1B]/30">
                  {currentEx.exercicio?.musculo_primario?.[0] || 'Geral'}
                </span>

                {/* Botão Expandir/Recolher Mídia */}
                <button
                  type="button"
                  onClick={() => setMediaExpanded(!mediaExpanded)}
                  className="absolute top-3 right-3 p-2 bg-black/70 backdrop-blur-md rounded-lg text-white hover:bg-black/90 transition-all cursor-pointer"
                  title={mediaExpanded ? 'Recolher vídeo' : 'Expandir vídeo'}
                >
                  {mediaExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Informações do Exercício */}
              <div className="p-4 space-y-2 border-t border-line/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display font-bold text-lg text-ink leading-tight">
                      {currentEx.exercicio?.nome || `Exercício ${currentExIdx + 1}`}
                    </h3>
                    {currentEx.substituido_de && (
                      <span className="text-[10px] text-[#F26A1B] font-mono block mt-0.5">
                        🔄 Substituído durante o treino
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-mono text-ink-3 bg-raise px-2 py-1 rounded-lg border border-line shrink-0">
                    {seriesCurrentEx.length} séries
                  </span>
                </div>

                {/* Nota do Exercício (Se Houver) */}
                {currentEx.nota && (
                  <div className="bg-[#F26A1B]/10 border border-[#F26A1B]/30 rounded-xl p-2.5 text-xs text-ink flex items-start gap-2">
                    <FileText className="w-4 h-4 text-[#F26A1B] shrink-0 mt-0.5" />
                    <p className="flex-1 font-mono">{currentEx.nota}</p>
                  </div>
                )}

                {/* 3. DOIS BOTÕES: "Substituir" e "Nota" */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalSubstituir(true)}
                    className="bg-surface-2 border border-line hover:border-line-strong hover:bg-raise py-2.5 px-3 rounded-xl text-xs font-display font-bold text-ink-2 hover:text-ink flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#F26A1B]" />
                    <span>Substituir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNotaTexto(currentEx.nota || '');
                      setModalNota(true);
                    }}
                    className="bg-surface-2 border border-line hover:border-line-strong hover:bg-raise py-2.5 px-3 rounded-xl text-xs font-display font-bold text-ink-2 hover:text-ink flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#F26A1B]" />
                    <span>{currentEx.nota ? 'Editar Nota' : 'Adicionar Nota'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 4. BLOCO DE AQUECIMENTO (SE tem_aquecimento = true) */}
            {currentEx.tem_aquecimento && !aquecimentoConcluidoMap[currentEx.id || ''] && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-[#F26A1B]/15 via-[#F26A1B]/10 to-transparent border border-[#F26A1B]/40 rounded-2xl p-4 space-y-3 relative overflow-hidden shadow-sm"
              >
                <div className="flex items-center gap-2.5 text-[#F26A1B]">
                  <Flame className="w-5 h-5 animate-bounce" />
                  <h4 className="font-display font-bold text-sm uppercase tracking-wide">
                    Aquecimento — Repetições livres · Carga leve
                  </h4>
                </div>
                <p className="text-xs text-ink-2 leading-relaxed font-mono">
                  Realize de 15 a 20 repetições com cerca de 30% a 40% da carga normal para lubrificar as articulações antes de iniciar as séries valendo.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAquecimentoConcluidoMap(prev => ({ ...prev, [currentEx.id || '']: true }));
                    tocar('sucesso');
                  }}
                  className="bg-[#F26A1B] text-white text-xs font-display font-bold py-2 px-4 rounded-xl flex items-center gap-2 shadow-sm cursor-pointer hover:bg-[#ff8a3d] transition-all"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Concluir Aquecimento</span>
                </button>
              </motion.div>
            )}

            {/* 5. TIMELINE DE SÉRIES (VERTICAL COM BOLINHAS CONECTADAS) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-display font-bold text-base text-ink">
                  Séries do Exercício
                </h3>
                <span className="text-xs font-mono text-ink-3">
                  {seriesCurrentEx.filter(s => s.concluida).length} de {currentEx?.series || seriesCurrentEx.length} concluídas
                </span>
              </div>

              {/* Timeline Vertical */}
              <div className="relative pl-7 space-y-3.5 before:absolute before:left-3 before:top-4 before:bottom-4 before:w-0.5 before:bg-line/60">
                {seriesCurrentEx.map((serie) => {
                  const isCurrentSet = serie.numero_serie === currentSetNum;
                  const isCompleted = serie.concluida;

                  return (
                    <div key={serie.id || serie.numero_serie} className="relative">
                      {/* Bolinha da Timeline */}
                      <div className={`absolute -left-[27px] top-3.5 w-6 h-6 rounded-full border-2 flex items-center justify-center font-display font-bold text-xs transition-all ${
                        isCompleted
                          ? 'border-ok bg-ok text-white shadow-md shadow-ok/20'
                          : isCurrentSet
                          ? 'border-[#F26A1B] bg-[#F26A1B] text-white scale-110 shadow-md shadow-[#F26A1B]/40 ring-4 ring-[#F26A1B]/20'
                          : 'border-line-strong bg-surface-2 text-ink-3'
                      }`}>
                        {isCompleted ? (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        ) : (
                          serie.numero_serie
                        )}
                      </div>

                      {/* Card da Série */}
                      <div
                        onClick={() => setCurrentSetNum(serie.numero_serie)}
                        className={`bg-surface border rounded-xl p-3.5 transition-all flex items-center justify-between gap-3 shadow-sm cursor-pointer ${
                          isCurrentSet
                            ? 'border-[#F26A1B] bg-[#F26A1B]/5 shadow-md shadow-[#F26A1B]/10 ring-1 ring-[#F26A1B]/30'
                            : isCompleted
                            ? 'border-ok/30 bg-ok/5'
                            : 'border-line/60 hover:border-line-strong'
                        }`}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-display font-bold text-sm text-ink">
                              Série {serie.numero_serie}
                            </span>
                            {isCurrentSet && !isCompleted && (
                              <span className="text-[9px] font-mono bg-[#F26A1B] text-white uppercase px-1.5 py-0.5 rounded font-bold animate-pulse">
                                EM FOCO
                              </span>
                            )}
                          </div>

                          {/* Ajustes Rápidos de Repetições e Carga */}
                          <div className="flex items-center gap-3 pt-1">
                            {/* Repetições */}
                            <div className="flex items-center gap-1 bg-surface-2 border border-line/80 rounded-lg px-2 py-1">
                              <span className="text-[10px] font-mono text-ink-3">Reps:</span>
                              <input
                                type="text"
                                value={serie.repeticoes}
                                onChange={(e) => handleEditarSerieValue(serie.numero_serie, 'repeticoes', e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-8 text-center bg-transparent text-xs font-bold font-mono text-ink focus:outline-none"
                              />
                            </div>

                            {/* Carga (kg) */}
                            <div className="flex items-center gap-1 bg-surface-2 border border-line/80 rounded-lg px-2 py-1">
                              <span className="text-[10px] font-mono text-ink-3">Carga:</span>
                              <input
                                type="number"
                                value={serie.carga_kg ?? ''}
                                onChange={(e) => handleEditarSerieValue(serie.numero_serie, 'carga_kg', e.target.value === '' ? null : Number(e.target.value))}
                                onClick={(e) => e.stopPropagation()}
                                className="w-12 text-center bg-transparent text-xs font-bold font-mono text-ink focus:outline-none"
                              />
                              <span className="text-[10px] font-mono text-ink-3">kg</span>
                            </div>
                          </div>
                        </div>

                        {/* Botão Botão Concluir Série */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSerie(serie.numero_serie);
                          }}
                          className={`py-2 px-3.5 rounded-xl font-display font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95 ${
                            isCompleted
                              ? 'bg-ok/20 border border-ok/40 text-ok hover:bg-ok/30'
                              : 'bg-[#F26A1B] hover:bg-[#ff8a3d] text-white shadow-md shadow-[#F26A1B]/20'
                          }`}
                        >
                          <Check className={`w-4 h-4 stroke-[3] ${isCompleted ? 'text-ok' : 'text-white'}`} />
                          <span>{isCompleted ? 'Feito' : 'Concluir'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 7. LISTA DE EXERCÍCIOS COMPLETA DO TREINO (RO LÁVEL NO FIM) */}
            <div className="space-y-3 pt-4 border-t border-line/60">
              <h3 className="font-display font-bold text-base text-ink px-1">
                Lista de Exercícios do Treino
              </h3>

              <div className="space-y-2">
                {exercicios.map((item, idx) => {
                  const isCurrent = idx === currentExIdx;
                  const isNext = idx === currentExIdx + 1;
                  const isConcluido = item.status_execucao === 'concluido';

                  return (
                    <div
                      key={item.id || idx}
                      onClick={() => {
                        setCurrentExIdx(idx);
                        setCurrentSetNum(1);
                        tocar('tap');
                      }}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        isCurrent
                          ? 'border-[#F26A1B] bg-[#F26A1B]/10 shadow-sm'
                          : isConcluido
                          ? 'border-ok/30 bg-ok/5'
                          : 'border-line/60 bg-surface hover:border-line-strong'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Miniatura */}
                        <div className="w-10 h-10 rounded-lg bg-surface-2 border border-line flex items-center justify-center shrink-0 overflow-hidden relative">
                          {(() => {
                            const videoPath = isFemale 
                              ? (item.exercicio?.video_url_fem || item.exercicio?.video_url_masc) 
                              : (item.exercicio?.video_url_masc || item.exercicio?.video_url_fem);
                            const videoUrl = dbService.getExerciseVideoUrl(videoPath);
                            
                            return videoUrl ? (
                              <video
                                src={videoUrl}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                                preload="metadata"
                                onMouseOver={(e) => (e.target as HTMLVideoElement).play()}
                                onMouseOut={(e) => (e.target as HTMLVideoElement).pause()}
                              />
                            ) : (
                              <Dumbbell className="w-4 h-4 text-[#F26A1B]" />
                            );
                          })()}
                        </div>

                        <div className="min-w-0">
                          <h4 className="font-display font-bold text-xs sm:text-sm text-ink truncate leading-tight">
                            {item.exercicio?.nome || `Exercício ${idx + 1}`}
                          </h4>
                          <p className="text-[11px] font-mono text-ink-3">
                            {item.series} séries • {item.repeticoes} reps
                          </p>
                        </div>
                      </div>

                      {/* Selos de Status */}
                      <div className="shrink-0">
                        {isCurrent ? (
                          <span className="bg-[#F26A1B] text-white text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded shadow-sm">
                            EM EXECUÇÃO
                          </span>
                        ) : isConcluido ? (
                          <span className="bg-ok/10 text-ok border border-ok/20 text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded flex items-center gap-1">
                            <Check className="w-2.5 h-2.5 stroke-[3]" /> CONCLUÍDO
                          </span>
                        ) : isNext ? (
                          <span className="bg-surface-2 border border-line text-ink-2 text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded">
                            PRÓXIMO
                          </span>
                        ) : (
                          <span className="text-[10px] text-ink-3 font-mono">
                            Pendente
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>

      {/* =================================================================== */}
      {/* 6. BARRA INFERIOR FIXA (DESCANSO E NAVEGAÇÃO) */}
      {/* =================================================================== */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-lg border-t border-line/60 p-3 sm:p-4 space-y-2.5 shadow-2xl">
        <div className="max-w-2xl mx-auto space-y-2.5">
          {/* Cronômetro de Descanso (Se Ativo) */}
          {restTimerActive && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#F26A1B]/15 border border-[#F26A1B]/40 rounded-xl p-2.5 flex items-center justify-between gap-3 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-[#F26A1B] animate-spin" />
                <div>
                  <span className="text-[10px] font-mono text-[#F26A1B] uppercase font-bold block">
                    Prepare-se! Descanso
                  </span>
                  <span className="font-display font-extrabold text-base text-ink leading-none">
                    {formatTime(restSecondsLeft)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Botão +10s */}
                <button
                  type="button"
                  onClick={() => setRestSecondsLeft(prev => prev + 10)}
                  className="px-2 py-1 bg-surface border border-line rounded-lg text-xs font-mono font-bold text-ink hover:border-[#F26A1B]"
                >
                  +10s
                </button>

                {/* Pause/Play */}
                <button
                  type="button"
                  onClick={() => setRestTimerActive(!restTimerActive)}
                  className="p-1.5 bg-[#F26A1B] text-white rounded-lg hover:bg-[#ff8a3d]"
                >
                  <Pause className="w-4 h-4" />
                </button>

                {/* Mute Toggle */}
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1.5 bg-surface border border-line rounded-lg text-ink-3 hover:text-ink"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>
          )}

          {/* Botões de Navegação Principal: "Voltar" e "Próximo / Finalizar" */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleVoltar}
              disabled={currentExIdx === 0 && currentSetNum === 1}
              className="px-4 py-3 bg-surface border border-line hover:border-line-strong disabled:opacity-40 rounded-xl font-display font-bold text-xs text-ink flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>

            {currentExIdx === exercicios.length - 1 && currentSetNum === seriesCurrentEx.length ? (
              <button
                type="button"
                onClick={handleFinalizarTreino}
                disabled={isFinalizing}
                className="flex-1 bg-gradient-to-r from-[#F26A1B] to-[#ff8a3d] hover:brightness-110 disabled:opacity-70 text-white font-display font-extrabold py-3 px-5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#F26A1B]/30 transition-all cursor-pointer active:scale-[0.98] uppercase tracking-wider text-sm"
              >
                {isFinalizing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trophy className="w-4 h-4" />
                )}
                <span>{isFinalizing ? 'Finalizando...' : 'Finalizar Treino 🎉'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleProximoExercicio}
                className="flex-1 bg-[#F26A1B] hover:bg-[#ff8a3d] text-white font-display font-bold py-3 px-5 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-[#F26A1B]/20 transition-all cursor-pointer active:scale-[0.98] text-sm"
              >
                <span>Próximo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* =================================================================== */}
      {/* MODAL 1 — CONFIRMAR SAÍDA */}
      {/* =================================================================== */}
      <AnimatePresence>
        {modalConfirmarSaida && (
          <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-line rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-ink">Deseja sair do treino?</h3>
                <p className="text-xs text-ink-2 font-mono mt-1">
                  Seu progresso das séries já concluídas está salvo e poderá ser retomado.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalConfirmarSaida(false)}
                  className="flex-1 py-2.5 bg-surface-2 border border-line rounded-xl text-xs font-bold text-ink"
                >
                  Continuar Treino
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600"
                >
                  Sair
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =================================================================== */}
      {/* MODAL 2 — ESTATÍSTICAS DO TREINO */}
      {/* =================================================================== */}
      <AnimatePresence>
        {modalEstatisticas && (
          <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-line rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="font-display font-bold text-base text-ink flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-[#F26A1B]" />
                  <span>Estatísticas em Tempo Real</span>
                </h3>
                <button onClick={() => setModalEstatisticas(false)} className="text-xs text-ink-3">✕</button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-2 border border-line p-3 rounded-xl text-center">
                  <Clock className="w-4 h-4 text-[#F26A1B] mx-auto mb-1" />
                  <span className="text-[10px] font-mono text-ink-3 uppercase block">Tempo Decorrido</span>
                  <span className="font-display font-bold text-sm text-ink">{formatTime(elapsedSeconds)}</span>
                </div>

                <div className="bg-surface-2 border border-line p-3 rounded-xl text-center">
                  <CheckCircle2 className="w-4 h-4 text-ok mx-auto mb-1" />
                  <span className="text-[10px] font-mono text-ink-3 uppercase block">Séries Concluídas</span>
                  <span className="font-display font-bold text-sm text-ink">{totalSeriesConcluidas} séries</span>
                </div>

                <div className="bg-surface-2 border border-line p-3 rounded-xl text-center col-span-2">
                  <Dumbbell className="w-4 h-4 text-[#F26A1B] mx-auto mb-1" />
                  <span className="text-[10px] font-mono text-ink-3 uppercase block">Carga Total Acumulada</span>
                  <span className="font-display font-extrabold text-base text-ink">{totalCargaKgElevada} kg levantados</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalEstatisticas(false)}
                className="w-full py-2.5 bg-[#F26A1B] text-white rounded-xl text-xs font-bold"
              >
                Voltar ao Treino
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =================================================================== */}
      {/* MODAL 3 — SUBSTITUIR EXERCÍCIO */}
      {/* =================================================================== */}
      <AnimatePresence>
        {modalSubstituir && (
          <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-line rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-line flex items-center justify-between">
                <h3 className="font-display font-bold text-base text-ink">Substituir Exercício</h3>
                <button onClick={() => setModalSubstituir(false)} className="text-xs text-ink-3">✕</button>
              </div>

              <div className="p-3 border-b border-line">
                <input
                  type="text"
                  value={buscaExercicio}
                  onChange={(e) => setBuscaExercicio(e.target.value)}
                  placeholder="Buscar exercício substituto..."
                  className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2 text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-[#F26A1B]"
                />
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {bibliotecaExercicios
                  .filter(ex => ex.nome.toLowerCase().includes(buscaExercicio.toLowerCase()) || ex.musculo_primario?.some(m => m.toLowerCase().includes(buscaExercicio.toLowerCase())))
                  .map(ex => (
                    <div
                      key={ex.id}
                      onClick={() => handleSubstituirExercicio(ex)}
                      className="p-3 rounded-xl hover:bg-raise transition-colors flex items-center justify-between cursor-pointer border border-line/40 group"
                    >
                      <div>
                        <span className="text-[10px] font-mono text-[#F26A1B] block">
                          {ex.musculo_primario?.[0] || 'Geral'}
                        </span>
                        <h4 className="text-xs font-bold text-ink group-hover:text-[#F26A1B]">
                          {ex.nome}
                        </h4>
                      </div>
                      <RefreshCw className="w-4 h-4 text-[#F26A1B] shrink-0" />
                    </div>
                  ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =================================================================== */}
      {/* MODAL 4 — EDITAR/ADICIONAR NOTA */}
      {/* =================================================================== */}
      <AnimatePresence>
        {modalNota && (
          <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-line rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="font-display font-bold text-base text-ink">Nota do Exercício</h3>
                <button onClick={() => setModalNota(false)} className="text-xs text-ink-3">✕</button>
              </div>

              <textarea
                value={notaTexto}
                onChange={(e) => setNotaTexto(e.target.value)}
                placeholder="Ex: Ajustar banco na posição 2, focar na cadência..."
                rows={4}
                className="w-full bg-surface-2 border border-line rounded-xl p-3 text-xs text-ink focus:outline-none focus:border-[#F26A1B]"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setModalNota(false)} className="px-3 py-1.5 text-xs text-ink-2">Cancelar</button>
                <button onClick={handleSalvarNota} className="px-4 py-1.5 bg-[#F26A1B] text-white text-xs font-bold rounded-lg">Salvar Nota</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =================================================================== */}
      {/* MODAL 5 — TREINO CONCLUÍDO (CELEBRAÇÃO) */}
      {/* =================================================================== */}
      <AnimatePresence>
        {modalConcluido && (
          <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-surface border border-[#F26A1B]/50 rounded-3xl w-full max-w-md p-6 space-y-5 text-center shadow-2xl relative overflow-hidden"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#F26A1B] text-white flex items-center justify-center mx-auto shadow-lg shadow-[#F26A1B]/40 animate-bounce">
                <Trophy className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-mono text-[#F26A1B] uppercase font-bold tracking-wider block">
                  Excelente Trabalho!
                </span>
                <h2 className="font-display font-extrabold text-2xl text-ink mt-1">
                  Treino Concluído! 🎉
                </h2>
                <p className="text-xs text-ink-2 font-mono mt-1">
                  Sua constância é a chave para o resultado. Seu personal trainer já recebeu seu registro.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-surface-2 border border-line p-3 rounded-2xl">
                <div>
                  <span className="text-[9px] font-mono text-ink-3 uppercase block">Tempo</span>
                  <span className="font-display font-bold text-xs text-ink">{formatTime(elapsedSeconds)}</span>
                </div>
                <div>
                  <span className="text-[9px] font-mono text-ink-3 uppercase block">Séries</span>
                  <span className="font-display font-bold text-xs text-ink">{totalSeriesConcluidas}</span>
                </div>
                <div>
                  <span className="text-[9px] font-mono text-ink-3 uppercase block">Volume</span>
                  <span className="font-display font-bold text-xs text-ink">{totalCargaKgElevada} kg</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setModalConcluido(false);
                  onTreinoConcluido();
                }}
                className="w-full py-3.5 bg-[#F26A1B] hover:bg-[#ff8a3d] text-white font-display font-extrabold rounded-xl text-sm shadow-lg shadow-[#F26A1B]/30 uppercase tracking-wider cursor-pointer transition-all"
              >
                Voltar ao Início
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =================================================================== */}
      {/* MODAL 6 — AVISO / ALERTA CUSTOMIZADO */}
      {/* =================================================================== */}
      <AnimatePresence>
        {modalAviso.show && (
          <div 
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setModalAviso(prev => ({ ...prev, show: false }))}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface border border-line rounded-2xl w-full max-w-sm p-6 space-y-6 shadow-2xl text-center relative"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${
                modalAviso.tipo === 'erro' ? 'bg-red-500/10 text-red-500' : 'bg-[#F26A1B]/10 text-[#F26A1B]'
              }`}>
                {modalAviso.tipo === 'erro' ? <X className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
              </div>

              <div className="space-y-2">
                <h3 className="font-display font-extrabold text-lg text-ink">
                  {modalAviso.titulo}
                </h3>
                <p className="text-sm text-ink-3 leading-relaxed">
                  {modalAviso.mensagem}
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (modalAviso.onConfirm) {
                      modalAviso.onConfirm();
                    } else {
                      setModalAviso(prev => ({ ...prev, show: false }));
                    }
                  }}
                  className="w-full py-3.5 bg-[#F26A1B] hover:bg-[#ff8a3d] text-white font-display font-bold rounded-xl text-sm shadow-lg shadow-[#F26A1B]/20 uppercase tracking-wider transition-all active:scale-[0.98]"
                >
                  {modalAviso.confirmLabel || 'OK'}
                </button>
                {modalAviso.cancelLabel && (
                  <button
                    type="button"
                    onClick={() => {
                      if (modalAviso.onCancel) {
                        modalAviso.onCancel();
                      } else {
                        setModalAviso(prev => ({ ...prev, show: false }));
                      }
                    }}
                    className="w-full py-3 text-ink-3 hover:text-ink text-xs font-bold uppercase tracking-widest transition-all"
                  >
                    {modalAviso.cancelLabel}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
