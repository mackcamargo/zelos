import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Play, Flame, Timer, Dumbbell, ChevronDown, ChevronRight, 
  MoreVertical, Plus, CheckCircle2, Clock, Award, Check, RefreshCw, 
  Trash2, Edit3, Sparkles, Filter, ChevronUp, Layers, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService, supabase, isSupabaseConfigured } from '../lib/supabase';
import { Treino, TreinoExercicioDetailed, Exercicio } from '../types';
import ModoTreinoGuiado from './ModoTreinoGuiado';

interface ProgramaGuiadoAlunoProps {
  alunoId: string;
  onIniciarTreinoGuiado?: (treino: Treino) => void;
}

interface Fase {
  id: string;
  programa_id: string;
  nome: string;
  ordem: number;
  duracao_semanas: number;
  descricao?: string;
}

interface Programa {
  id: string;
  titulo: string;
  subtitulo: string;
  ativo: boolean;
}

const DIAS_SEMANA_MAP: Record<number, string> = {
  1: 'Domingo',
  2: 'Segunda-feira',
  3: 'Terça-feira',
  4: 'Quarta-feira',
  5: 'Quinta-feira',
  6: 'Sexta-feira',
  7: 'Sábado'
};

export default function ProgramaGuiadoAluno({ alunoId, onIniciarTreinoGuiado }: ProgramaGuiadoAlunoProps) {
  const [loading, setLoading] = useState(true);
  const [programa, setPrograma] = useState<Programa | null>(null);
  const [fases, setFases] = useState<Fase[]>([]);
  const [faseSelecionadaId, setFaseSelecionadaId] = useState<string | null>(null);
  const [treinos, setTreinos] = useState<Treino[]>([]);
  
  // Navigation State
  const [treinoDetalheId, setTreinoDetalheId] = useState<string | null>(null);
  const [openWeeks, setOpenWeeks] = useState<Record<number, boolean>>({});

  // Exercise Management Modal State
  const [modalExercicioAberto, setModalExercicioAberto] = useState(false);
  const [exerciciosBiblioteca, setExerciciosBiblioteca] = useState<Exercicio[]>([]);
  const [buscaExercicio, setBuscaExercicio] = useState('');
  const [menuExercicioAberto, setMenuExercicioAberto] = useState<string | null>(null);
  const [exercicioParaEditar, setExercicioParaEditar] = useState<TreinoExercicioDetailed | null>(null);
  
  // Form Edit Exercicio
  const [editSeries, setEditSeries] = useState(3);
  const [editReps, setEditReps] = useState('12');
  const [editCarga, setEditCarga] = useState<number | ''>(20);

  useEffect(() => {
    carregarPrograma();
    carregarBibliotecaExercicios();
  }, [alunoId]);

  async function carregarPrograma() {
    setLoading(true);
    try {
      const res = await dbService.getProgramaGuiadoParaAluno(alunoId);
      if (res.data) {
        const prog = res.data.programa || {
          id: 'prog-1',
          titulo: 'Treino Personalizado',
          subtitulo: 'Hipertrofia - Balanceado',
          ativo: true
        };

        let fasesArr: Fase[] = res.data.fases || [];
        if (fasesArr.length === 0) {
          fasesArr = [
            { id: 'fase-1', programa_id: prog.id, nome: '1: Resistência', ordem: 1, duracao_semanas: 4, descricao: 'Fase de adaptação muscular' },
            { id: 'fase-2', programa_id: prog.id, nome: '2: Força', ordem: 2, duracao_semanas: 4, descricao: 'Ganho de força e hipertrofia' }
          ];
        }

        let treinosArr: Treino[] = res.data.treinos || [];
        
        // Se os treinos não tiverem fase_id / semana / dia_semana atribuídos, atriubuir dinamicamente
        treinosArr = treinosArr.map((t, idx) => {
          const fasePadrao = fasesArr[0]?.id || 'fase-1';
          const semanaCalculada = t.semana || Math.floor(idx / 3) + 1;
          const diaCalculado = t.dia_semana || ((idx % 3) * 2 + 2); // 2=Seg, 4=Qua, 6=Sex
          
          return {
            ...t,
            fase_id: t.fase_id || fasePadrao,
            semana: semanaCalculada,
            dia_semana: diaCalculado,
            dificuldade: t.dificuldade || (idx % 2 === 0 ? 'Média' : 'Alta'),
            duracao_min: t.duracao_min || 50 + (idx % 3) * 5,
            calorias_kcal: t.calorias_kcal || 450 + (idx % 4) * 60
          };
        });

        setPrograma(prog);
        setFases(fasesArr);
        setTreinos(treinosArr);

        const primeiraFaseId = fasesArr[0]?.id || null;
        setFaseSelecionadaId(primeiraFaseId);

        // Identificar a semana do próximo treino pendente para já abrir essa semana por padrão
        const proxPendente = treinosArr.find(t => t.status !== 'concluido');
        const semanaAberta = proxPendente?.semana || 1;
        setOpenWeeks({ [semanaAberta]: true });
      }
    } catch (err) {
      console.error('Erro ao carregar programa do aluno:', err);
    } finally {
      setLoading(false);
    }
  }

  async function carregarBibliotecaExercicios() {
    try {
      const res = await dbService.getAllExercicios();
      if (res.data) {
        setExerciciosBiblioteca(res.data);
      }
    } catch (e) {
      console.error('Erro ao carregar biblioteca de exercícios:', e);
    }
  }

  // Métricas Globais do Programa
  const totalTreinosPrograma = treinos.length;
  const treinosConcluidosPrograma = treinos.filter(t => t.status === 'concluido').length;
  const pctConcluidoPrograma = totalTreinosPrograma > 0 
    ? Math.round((treinosConcluidosPrograma / totalTreinosPrograma) * 100) 
    : 0;

  // Fase Selecionada
  const faseAtual = useMemo(() => {
    return fases.find(f => f.id === faseSelecionadaId) || fases[0] || null;
  }, [fases, faseSelecionadaId]);

  // Treinos da Fase Selecionada
  const treinosFase = useMemo(() => {
    if (!faseAtual) return treinos;
    return treinos.filter(t => t.fase_id === faseAtual.id || !t.fase_id);
  }, [treinos, faseAtual]);

  // Próximo treino pendente no programa inteiro (para badge "A seguir" e Play circular)
  const proximoTreinoPendenteId = useMemo(() => {
    const pendente = treinos.find(t => t.status !== 'concluido');
    return pendente?.id || null;
  }, [treinos]);

  // Agrupar treinos por semana dentro da fase
  const semanasMapeadas = useMemo(() => {
    const duracao = faseAtual?.duracao_semanas || 4;
    const map: Record<number, Treino[]> = {};
    for (let s = 1; s <= duracao; s++) {
      map[s] = [];
    }

    treinosFase.forEach((t) => {
      const sem = t.semana || 1;
      if (!map[sem]) map[sem] = [];
      map[sem].push(t);
    });

    return map;
  }, [treinosFase, faseAtual]);

  // Cálculo de progresso da Fase
  const totalTreinosFase = treinosFase.length;
  const concluidosFase = treinosFase.filter(t => t.status === 'concluido').length;
  const semanaAtualFase = useMemo(() => {
    const prox = treinosFase.find(t => t.status !== 'concluido');
    return prox?.semana || 1;
  }, [treinosFase]);

  // Alternar acordeão de semanas
  const toggleSemana = (numSemana: number) => {
    setOpenWeeks(prev => ({ ...prev, [numSemana]: !prev[numSemana] }));
  };

  // Detalhe do treino selecionado (TELA 2)
  const treinoDetalhe = useMemo(() => {
    if (!treinoDetalheId) return null;
    return treinos.find(t => t.id === treinoDetalheId) || null;
  }, [treinoDetalheId, treinos]);

  // Estimativa de carga total do treino
  const cargaTotalEstimada = useMemo(() => {
    if (!treinoDetalhe?.exercicios) return 41;
    let soma = 0;
    treinoDetalhe.exercicios.forEach(ex => {
      soma += (ex.carga_kg || 15) * (ex.series || 3);
    });
    return soma > 0 ? Math.round(soma / 10) : 41; // Carga em KG equivalente/média
  }, [treinoDetalhe]);

  // Adicionar Exercício ao Treino Atual
  async function handleAdicionarExercicio(exercicio: Exercicio) {
    if (!treinoDetalhe) return;
    
    const novoExercicio: TreinoExercicioDetailed = {
      id: 'te-' + Math.random().toString(36).substring(2, 9),
      treino_id: treinoDetalhe.id,
      exercicio_id: exercicio.id,
      ordem: (treinoDetalhe.exercicios?.length || 0) + 1,
      series: 3,
      repeticoes: '12',
      carga_kg: 20,
      exercicio: exercicio
    };

    const exAtualizados = [...(treinoDetalhe.exercicios || []), novoExercicio];
    const treinoAtualizado = { ...treinoDetalhe, exercicios: exAtualizados };

    setTreinos(prev => prev.map(t => t.id === treinoDetalhe.id ? treinoAtualizado : t));
    setModalExercicioAberto(false);

    // Persistir no Supabase se configurado
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('treino_exercicios').insert({
          treino_id: treinoDetalhe.id,
          exercicio_id: exercicio.id,
          ordem: novoExercicio.ordem,
          series: 3,
          repeticoes: '12',
          carga_kg: 20
        });
      } catch (err) {
        console.error('Erro ao salvar exercício no banco:', err);
      }
    }
  }

  // Salvar Edição de Exercício
  function handleSalvarEdicaoExercicio() {
    if (!treinoDetalhe || !exercicioParaEditar) return;

    const exAtualizados = (treinoDetalhe.exercicios || []).map(ex => {
      if (ex.id === exercicioParaEditar.id) {
        return {
          ...ex,
          series: editSeries,
          repeticoes: editReps,
          carga_kg: editCarga === '' ? null : Number(editCarga)
        };
      }
      return ex;
    });

    const treinoAtualizado = { ...treinoDetalhe, exercicios: exAtualizados };
    setTreinos(prev => prev.map(t => t.id === treinoDetalhe.id ? treinoAtualizado : t));
    setExercicioParaEditar(null);
  }

  // Remover Exercício do Treino
  async function handleRemoverExercicio(exercicioId: string) {
    if (!treinoDetalhe) return;

    const exAtualizados = (treinoDetalhe.exercicios || []).filter(ex => ex.id !== exercicioId);
    const treinoAtualizado = { ...treinoDetalhe, exercicios: exAtualizados };

    setTreinos(prev => prev.map(t => t.id === treinoDetalhe.id ? treinoAtualizado : t));
    setMenuExercicioAberto(null);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('treino_exercicios').delete().eq('id', exercicioId);
      } catch (e) {
        console.error('Erro ao remover exercício:', e);
      }
    }
  }

  // Modo Treino Guiado Ativo State
  // Removido: agora é controlado pelo AlunoArea.tsx para evitar unmount indesejado.

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-10 h-10 border-3 border-[#F26A1B] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-ink-3 uppercase tracking-wider">Carregando Programa de Treino...</p>
      </div>
    );
  }

  // =========================================================================
  // TELA 2 — DETALHE DO DIA
  // =========================================================================
  if (treinoDetalhe) {
    const diaSemanaTexto = DIAS_SEMANA_MAP[treinoDetalhe.dia_semana || 2] || 'Segunda-feira';

    return (
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="space-y-6 pb-12"
      >
        {/* Header Detalhe */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setTreinoDetalheId(null)}
            className="p-2.5 bg-surface border border-line rounded-xl text-ink-2 hover:text-ink hover:border-line-strong transition-all flex items-center justify-center shrink-0 active:scale-95 shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-[#F26A1B]" />
          </button>
          
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-sans font-bold text-[#F26A1B] uppercase tracking-wider block">
              Semana {treinoDetalhe.semana || 1} · {diaSemanaTexto}
            </span>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-ink truncate leading-tight mt-0.5">
              {treinoDetalhe.titulo}
            </h1>
          </div>
        </div>

        {/* Três Métricas do Topo */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Card Duração */}
          <div className="bg-surface border border-line/60 rounded-xl p-3.5 flex flex-col items-center text-center justify-center shadow-sm relative overflow-hidden group">
            <div className="p-2 rounded-lg bg-[#F26A1B]/10 text-[#F26A1B] mb-2 group-hover:scale-110 transition-transform">
              <Timer className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono uppercase text-ink-3 tracking-wider font-bold">Duração</span>
            <span className="font-display font-bold text-sm sm:text-base text-ink mt-0.5">
              {treinoDetalhe.duracao_min ? `${treinoDetalhe.duracao_min - 5}-${treinoDetalhe.duracao_min + 5} min` : '50-60 min'}
            </span>
          </div>

          {/* Card Calorias */}
          <div className="bg-surface border border-line/60 rounded-xl p-3.5 flex flex-col items-center text-center justify-center shadow-sm relative overflow-hidden group">
            <div className="p-2 rounded-lg bg-[#F26A1B]/10 text-[#F26A1B] mb-2 group-hover:scale-110 transition-transform">
              <Flame className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono uppercase text-ink-3 tracking-wider font-bold">Calorias</span>
            <span className="font-display font-bold text-sm sm:text-base text-ink mt-0.5">
              {treinoDetalhe.calorias_kcal || 663} kcal
            </span>
          </div>

          {/* Card Carga */}
          <div className="bg-surface border border-line/60 rounded-xl p-3.5 flex flex-col items-center text-center justify-center shadow-sm relative overflow-hidden group">
            <div className="p-2 rounded-lg bg-[#F26A1B]/10 text-[#F26A1B] mb-2 group-hover:scale-110 transition-transform">
              <Dumbbell className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono uppercase text-ink-3 tracking-wider font-bold">Carga Total</span>
            <span className="font-display font-bold text-sm sm:text-base text-ink mt-0.5">
              ~{cargaTotalEstimada} kg
            </span>
          </div>
        </div>

        {/* Botão Grande Laranja "Iniciar Treino" */}
        <button
          type="button"
          onClick={() => {
            if (onIniciarTreinoGuiado) {
              onIniciarTreinoGuiado(treinoDetalhe);
            }
          }}
          className="w-full bg-[#F26A1B] hover:bg-[#ff8a3d] text-white font-display font-extrabold py-4 px-6 rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-[#F26A1B]/20 transition-all cursor-pointer active:scale-[0.98] group uppercase tracking-wider text-base"
        >
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </div>
          <span>Iniciar Treino</span>
        </button>

        {/* Lista de Exercícios */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-display font-bold text-base text-ink">Lista de exercícios</h3>
            <span className="text-xs text-ink-3 font-mono font-bold">
              {treinoDetalhe.exercicios?.length || 0} exercícios
            </span>
          </div>

          <div className="space-y-2">
            {(!treinoDetalhe.exercicios || treinoDetalhe.exercicios.length === 0) ? (
              <div className="bg-surface border border-line/50 rounded-xl p-6 text-center text-ink-3 text-xs">
                Nenhum exercício cadastrado neste treino ainda. Clique em "+ Adicionar" abaixo.
              </div>
            ) : (
              treinoDetalhe.exercicios.map((item, idx) => {
                const exObj = item.exercicio;
                const thumbUrl = exObj?.video_url_masc || exObj?.video_url_fem;
                const musculo = exObj?.musculo_primario?.[0] || 'Geral';

                return (
                  <div
                    key={item.id || idx}
                    className="bg-surface border border-line/50 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-line-strong transition-all relative group"
                  >
                    {/* Miniatura */}
                    <div className="w-12 h-12 rounded-lg bg-surface-2 border border-line flex items-center justify-center shrink-0 overflow-hidden relative">
                      {thumbUrl ? (
                        <img 
                          src={thumbUrl} 
                          alt={exObj?.nome || 'Exercício'} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Dumbbell className="w-5 h-5 text-[#F26A1B]/70" />
                      )}
                    </div>

                    {/* Nome & Infos */}
                    <div className="flex-1 min-w-0">
                      <span className="font-muscle-tag text-[10px] text-[#F26A1B] block font-normal">
                        {musculo}
                      </span>
                      <h4 className="font-display font-bold text-sm text-ink truncate leading-tight">
                        {exObj?.nome || `Exercício ${idx + 1}`}
                      </h4>
                      <p className="text-xs text-ink-2 font-mono mt-0.5">
                        {item.series} séries • {item.repeticoes} reps {item.carga_kg ? `• ${item.carga_kg} kg` : ''}
                      </p>
                    </div>

                    {/* Menu ⋮ */}
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuExercicioAberto(menuExercicioAberto === item.id ? null : item.id || `${idx}`);
                        }}
                        className="p-2 text-ink-3 hover:text-ink hover:bg-raise rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      <AnimatePresence>
                        {menuExercicioAberto === (item.id || `${idx}`) && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute right-0 top-10 w-36 bg-surface border border-line-strong rounded-xl shadow-xl z-30 py-1 overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setMenuExercicioAberto(null);
                                setExercicioParaEditar(item);
                                setEditSeries(item.series || 3);
                                setEditReps(item.repeticoes || '12');
                                setEditCarga(item.carga_kg ?? 20);
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-ink hover:bg-raise flex items-center gap-2"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-ink-2" />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMenuExercicioAberto(null);
                                setModalExercicioAberto(true);
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-ink hover:bg-raise flex items-center gap-2"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-ink-2" />
                              <span>Substituir</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoverExercicio(item.id || '')}
                              className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              <span>Remover</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Botão + Adicionar no Fim */}
          <button
            type="button"
            onClick={() => setModalExercicioAberto(true)}
            className="w-full border-2 border-dashed border-line hover:border-[#F26A1B]/50 hover:bg-[#F26A1B]/5 rounded-xl py-3.5 text-xs font-display font-bold text-ink-2 hover:text-[#F26A1B] flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer mt-3"
          >
            <Plus className="w-4 h-4 text-[#F26A1B]" />
            <span>Adicionar Exercício</span>
          </button>
        </div>

        {/* Modal Selecionar Exercício */}
        <AnimatePresence>
          {modalExercicioAberto && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface border border-line rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh] shadow-2xl"
              >
                <div className="p-4 border-b border-line flex items-center justify-between">
                  <h3 className="font-display font-bold text-base text-ink">Adicionar Exercício</h3>
                  <button 
                    onClick={() => setModalExercicioAberto(false)}
                    className="p-1 rounded-lg text-ink-3 hover:text-ink hover:bg-raise"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-3 border-b border-line">
                  <input
                    type="text"
                    value={buscaExercicio}
                    onChange={(e) => setBuscaExercicio(e.target.value)}
                    placeholder="Buscar por nome ou músculo..."
                    className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2 text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-[#F26A1B]"
                  />
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-1.5 divide-y divide-line/20">
                  {exerciciosBiblioteca
                    .filter(ex => ex.nome.toLowerCase().includes(buscaExercicio.toLowerCase()) || ex.musculo_primario?.some(m => m.toLowerCase().includes(buscaExercicio.toLowerCase())))
                    .map(ex => (
                      <div 
                        key={ex.id}
                        onClick={() => handleAdicionarExercicio(ex)}
                        className="py-2.5 px-3 rounded-xl hover:bg-raise transition-colors flex items-center justify-between cursor-pointer group"
                      >
                        <div>
                          <span className="font-muscle-tag text-[10px] text-[#F26A1B] block">
                            {ex.musculo_primario?.[0] || 'Geral'}
                          </span>
                          <h4 className="text-xs font-bold text-ink group-hover:text-[#F26A1B] transition-colors">
                            {ex.nome}
                          </h4>
                        </div>
                        <Plus className="w-4 h-4 text-[#F26A1B] shrink-0" />
                      </div>
                    ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal Editar Séries/Reps/Carga */}
        <AnimatePresence>
          {exercicioParaEditar && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface border border-line rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <h3 className="font-display font-bold text-sm text-ink">Editar Exercício</h3>
                  <button onClick={() => setExercicioParaEditar(null)} className="text-xs text-ink-3">✕</button>
                </div>

                <p className="text-xs font-bold text-[#F26A1B]">
                  {exercicioParaEditar.exercicio?.nome || 'Exercício'}
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-mono text-ink-3 block mb-1">Séries</label>
                    <input 
                      type="number" 
                      value={editSeries}
                      onChange={(e) => setEditSeries(Number(e.target.value))}
                      className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-xs text-ink focus:border-[#F26A1B] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-ink-3 block mb-1">Repetições</label>
                    <input 
                      type="text" 
                      value={editReps}
                      onChange={(e) => setEditReps(e.target.value)}
                      className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-xs text-ink focus:border-[#F26A1B] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-ink-3 block mb-1">Carga (kg)</label>
                    <input 
                      type="number" 
                      value={editCarga}
                      onChange={(e) => setEditCarga(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-xs text-ink focus:border-[#F26A1B] outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    onClick={() => setExercicioParaEditar(null)}
                    className="px-3 py-1.5 text-xs text-ink-2 hover:text-ink"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSalvarEdicaoExercicio}
                    className="px-4 py-1.5 bg-[#F26A1B] text-white text-xs font-bold rounded-lg"
                  >
                    Salvar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // =========================================================================
  // TELA 1 — PROGRAMA (FASES, SEMANAS E DIAS)
  // =========================================================================
  return (
    <div className="space-y-6 pb-12">
      {/* 1. CABEÇALHO DO PROGRAMA */}
      <div className="bg-surface border border-line/60 rounded-2xl p-5 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#F26A1B]/5 blur-3xl pointer-events-none rounded-full" />
        
        <div className="flex items-center justify-between gap-4 relative z-10">
          <div className="space-y-1 min-w-0 flex-1">
            <h1 className="font-display font-extrabold text-xl sm:text-2xl text-ink leading-snug truncate">
              {programa?.titulo || 'Treino Personalizado'}
            </h1>
            <p className="text-sm font-semibold text-[#F26A1B] truncate">
              {programa?.subtitulo || 'Hipertrofia - Balanceado'}
            </p>
          </div>

          {/* Anel de Progresso % */}
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-line"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-[#F26A1B] transition-all duration-700 ease-out"
                strokeDasharray={`${pctConcluidoPrograma}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="font-display font-bold text-xs text-ink leading-none">
                {pctConcluidoPrograma}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FASES DO TREINO (Chips Roláveis) */}
      <div className="space-y-2">
        <h3 className="text-xs font-mono font-bold text-ink-3 uppercase tracking-wider px-1">
          Fases do treino
        </h3>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          {fases.map((fase) => {
            const isSelected = fase.id === faseSelecionadaId;

            return (
              <button
                key={fase.id}
                type="button"
                onClick={() => setFaseSelecionadaId(fase.id)}
                className={`px-4 py-3 rounded-xl border text-xs font-display font-bold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-2 shrink-0 ${
                  isSelected
                    ? 'bg-[#F26A1B]/10 border-[#F26A1B] text-ink shadow-md shadow-[#F26A1B]/10'
                    : 'bg-surface border-line/60 text-ink-2 hover:border-line-strong hover:text-ink'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#F26A1B]' : 'bg-ink-3/40'}`} />
                <span>{fase.nome}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  isSelected ? 'bg-[#F26A1B] text-white' : 'bg-raise text-ink-3'
                }`}>
                  {fase.duracao_semanas} semanas
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. RESUMO DA FASE SELECIONADA */}
      {faseAtual && (
        <div className="bg-surface border border-line/40 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-display font-bold text-ink">
              {faseAtual.nome}
            </span>
            <span className="text-ink-2 font-mono">
              Semana {semanaAtualFase} de {faseAtual.duracao_semanas} semanas
            </span>
          </div>

          {/* Barra de Progresso da Fase */}
          <div className="w-full bg-raise rounded-full h-2 overflow-hidden border border-line/30">
            <div 
              className="bg-[#F26A1B] h-full transition-all duration-500 rounded-full"
              style={{
                width: `${totalTreinosFase > 0 ? (concluidosFase / totalTreinosFase) * 100 : 0}%`
              }}
            />
          </div>
        </div>
      )}

      {/* 4. SEMANAS E DIAS (Accordion & Vertical Timeline) */}
      <div className="space-y-4">
        {Object.entries(semanasMapeadas).map(([numSemanaStr, treinosDaSemana]) => {
          const numSemana = Number(numSemanaStr);
          const isOpen = !!openWeeks[numSemana];

          return (
            <div 
              key={numSemana}
              className="bg-surface border border-line/60 rounded-xl overflow-hidden transition-all shadow-sm"
            >
              {/* Botão Acordeão da Semana */}
              <button
                type="button"
                onClick={() => toggleSemana(numSemana)}
                className="w-full p-4 flex items-center justify-between bg-surface hover:bg-raise transition-colors text-left cursor-pointer select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F26A1B]/10 text-[#F26A1B] font-display font-bold text-sm flex items-center justify-center shrink-0">
                    S{numSemana}
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm sm:text-base text-ink">
                      Semana {numSemana}
                    </h4>
                    <p className="text-[11px] text-ink-3 font-mono">
                      {treinosDaSemana.length} {treinosDaSemana.length === 1 ? 'treino programado' : 'treinos programados'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] font-mono text-ink-3 uppercase block">
                      {treinosDaSemana.filter(t => t.status === 'concluido').length}/{treinosDaSemana.length} concluídos
                    </span>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-ink-3" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-ink-3" />
                  )}
                </div>
              </button>

              {/* Conteúdo Expansível da Semana (Timeline de Dias) */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-line/40 p-4 space-y-4 bg-surface-2/40"
                  >
                    {treinosDaSemana.length === 0 ? (
                      <p className="text-xs text-ink-3 text-center py-4">
                        Nenhum treino cadastrado para esta semana.
                      </p>
                    ) : (
                      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#F26A1B]/30">
                        {treinosDaSemana.map((treino) => {
                          const diaSemanaTexto = DIAS_SEMANA_MAP[treino.dia_semana || 2] || 'Segunda-feira';
                          const isProximoPendente = treino.id === proximoTreinoPendenteId;
                          const isConcluido = treino.status === 'concluido';

                          return (
                            <div 
                              key={treino.id}
                              className="relative"
                            >
                              {/* Bolinha da Timeline */}
                              <div className={`absolute -left-[23px] top-4 w-3.5 h-3.5 rounded-full border-2 bg-surface transition-transform ${
                                isConcluido 
                                  ? 'border-ok bg-ok/20' 
                                  : isProximoPendente 
                                  ? 'border-[#F26A1B] bg-[#F26A1B] scale-125 shadow-sm shadow-[#F26A1B]/50' 
                                  : 'border-line-strong bg-raise'
                              }`} />

                              {/* Card do Dia */}
                              <div
                                onClick={() => setTreinoDetalheId(treino.id)}
                                className={`bg-surface border rounded-xl p-3.5 cursor-pointer hover:border-line-strong transition-all flex items-center justify-between gap-3 shadow-sm group active:scale-[0.99] ${
                                  isProximoPendente 
                                    ? 'border-[#F26A1B] bg-[#F26A1B]/5 shadow-md shadow-[#F26A1B]/5' 
                                    : 'border-line/60'
                                }`}
                              >
                                <div className="space-y-1 min-w-0 flex-1">
                                  {/* Dia da Semana em Laranja + Selo "A seguir" */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-sans font-bold text-[#F26A1B] uppercase tracking-wide">
                                      {diaSemanaTexto}
                                    </span>

                                    {isProximoPendente && (
                                      <span className="bg-[#F26A1B] text-white text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                        A SEGUIR
                                      </span>
                                    )}

                                    {isConcluido && (
                                      <span className="bg-ok/10 text-ok text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded border border-ok/20 flex items-center gap-1">
                                        <Check className="w-2.5 h-2.5 stroke-[3]" /> CONCLUÍDO
                                      </span>
                                    )}
                                  </div>

                                  {/* Título do Treino */}
                                  <h4 className="font-display font-bold text-sm sm:text-base text-ink group-hover:text-[#F26A1B] transition-colors truncate">
                                    {treino.titulo}
                                  </h4>

                                  {/* Linha de Infos (dificuldade · duração · nº exercícios) */}
                                  <div className="flex items-center gap-2.5 text-[11px] text-ink-3 font-mono pt-0.5 flex-wrap">
                                    <span className="flex items-center gap-1">
                                      <Dumbbell className="w-3 h-3 text-[#F26A1B]" />
                                      {treino.dificuldade || 'Média'}
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <Timer className="w-3 h-3 text-[#F26A1B]" />
                                      {treino.duracao_min || 50} min
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {treino.exercicios?.length || 8} exercícios
                                    </span>
                                  </div>
                                </div>

                                {/* Lado Direito: Botão Play Laranja Circular no próximo treino */}
                                <div className="shrink-0 flex items-center gap-2">
                                  {isProximoPendente ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onIniciarTreinoGuiado) onIniciarTreinoGuiado(treino);
                                      }}
                                      className="w-10 h-10 rounded-full bg-[#F26A1B] hover:bg-[#ff8a3d] text-white flex items-center justify-center shadow-md shadow-[#F26A1B]/30 hover:scale-105 active:scale-95 transition-transform"
                                      title="Iniciar treino guiado"
                                    >
                                      <Play className="w-4 h-4 fill-current ml-0.5" />
                                    </button>
                                  ) : (
                                    <ChevronRight className="w-5 h-5 text-ink-3 group-hover:translate-x-0.5 transition-transform" />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
