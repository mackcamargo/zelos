import React, { useState, useEffect } from 'react';
import { dbService } from '../lib/supabase';
import { Exercicio, Treino, TreinoExercicioDetailed, Categoria, TemplateTreino, TemplateExercicioDetailed } from '../types';
import { 
  ArrowLeft, Trash2, ChevronUp, ChevronDown, Plus, Check, Sparkles, 
  Save, Send, Calendar, Clock, Search, Dumbbell, Play, RefreshCw, FolderHeart, Info, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MontarTreinoProps {
  aluno: any | null; // Aluno profile, null if creating/editing a template
  personalId: string;
  treinoId: string | null; // null if creating new workout
  templateId?: number | null; // if editing an existing template
  onBack: () => void;
  showToast: (msg: string) => void;
}

export default function MontarTreino({ aluno, personalId, treinoId, templateId, onBack, showToast }: MontarTreinoProps) {
  const isTemplateMode = !aluno || !!templateId;

  // Workout header states
  const [titulo, setTitulo] = useState(isTemplateMode ? 'Novo Modelo' : '');
  const [tituloEditadoManualmente, setTituloEditadoManualmente] = useState(!!treinoId);
  const [descricao, setDescricao] = useState('');
  
  // Default values for date and time
  const agora = new Date();
  const dataHoje = agora.toISOString().split('T')[0];
  const horaAtual = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
  
  const [dataTreino, setDataTreino] = useState(dataHoje);
  const [horaTreino, setHoraTreino] = useState(horaAtual);
  const [status, setStatus] = useState<'rascunho' | 'publicado' | 'concluido'>('rascunho');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Selected exercises for this workout
  const [selectedExercises, setSelectedExercises] = useState<any[]>([]);
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});

  // Library / Add exercise states
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [allExercicios, setAllExercicios] = useState<Exercicio[]>([]);
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<string>('all');
  const [searchLibrary, setSearchLibrary] = useState('');
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  // Template states
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [availableTemplates, setAvailableTemplates] = useState<TemplateTreino[]>([]);

  // Confirmation modals
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Student Anamnese for warning notices
  const [studentAnamnese, setStudentAnamnese] = useState<any | null>(null);

  // Orthopedic conditions and rules for safety check
  const [alunoCondicoes, setAlunoCondicoes] = useState<any[]>([]);
  const [condicaoRegras, setCondicaoRegras] = useState<any[]>([]);
  const [orthopedicSafetyModal, setOrthopedicSafetyModal] = useState<{
    show: boolean;
    exercicio: Exercicio | null;
    regra: any | null;
    onConfirm: () => void;
  }>({
    show: false,
    exercicio: null,
    regra: null,
    onConfirm: () => {}
  });

  useEffect(() => {
    if (aluno?.id) {
      dbService.getAnamnese(aluno.id).then(({ data }) => {
        if (data) {
          setStudentAnamnese(data);
        }
      });

      // Load orthopedic conditions and rules
      dbService.getAlunoCondicoes(aluno.id).then(async ({ data: conds }) => {
        if (conds && conds.length > 0) {
          setAlunoCondicoes(conds);
          // Fetch rules for these active conditions
          const activeCondIds = conds.map(c => c.condicao_id);
          const { data: rules } = await dbService.getCondicaoRegras(activeCondIds);
          if (rules) {
            // Decorate rules with condition names
            const decoratedRules = rules.map(r => {
              const condName = conds.find(c => String(c.condicao_id) === String(r.condicao_id))?.condicoes_ortopedicas?.nome || 'Condição Ortopédica';
              return { ...r, condicaoName: condName };
            });
            setCondicaoRegras(decoratedRules);
          }
        }
      });
    }
  }, [aluno]);

  // Load Categories & Exercises
  useEffect(() => {
    const fetchLibraryData = async () => {
      setLoadingLibrary(true);
      try {
        const { data: cats } = await dbService.getCategorias();
        if (cats) setCategorias(cats);

        const { data: exs } = await dbService.getAllExercicios();
        if (exs) setAllExercicios(exs);
      } catch (err) {
        console.error('Erro ao carregar biblioteca:', err);
      } finally {
        setLoadingLibrary(false);
      }
    };

    fetchLibraryData();
    fetchTemplates();
  }, [personalId]);

  // Fetch signed URLs for library and selected exercises videos
  useEffect(() => {
    const fetchSignedUrls = async () => {
      const pathsToFetch: string[] = [];

      allExercicios.forEach((ex) => {
        const path = ex.video_url_masc || ex.video_url_fem;
        if (path && !pathsToFetch.includes(path) && !videoUrls[path]) {
          pathsToFetch.push(path);
        }
      });

      selectedExercises.forEach((item) => {
        if (item.exercicio) {
          const path = item.exercicio.video_url_masc || item.exercicio.video_url_fem;
          if (path && !pathsToFetch.includes(path) && !videoUrls[path]) {
            pathsToFetch.push(path);
          }
        }
      });

      if (pathsToFetch.length === 0) return;

      try {
        const promises = pathsToFetch.map(async (path) => {
          const signedUrl = await dbService.getSignedUrl(path);
          return { path, url: signedUrl };
        });

        const results = await Promise.all(promises);
        setVideoUrls((prev) => {
          const newMap = { ...prev };
          results.forEach(({ path, url }) => {
            if (url) {
              newMap[path] = url;
            }
          });
          return newMap;
        });
      } catch (err) {
        console.error('Erro ao buscar signed URLs em MontarTreino:', err);
      }
    };

    fetchSignedUrls();
  }, [allExercicios, selectedExercises]);

  // Load existing workout or template if editing
  useEffect(() => {
    const fetchData = async () => {
      if (treinoId) {
        setLoading(true);
        try {
          const { data, error } = await dbService.getTreinoCompleto(treinoId);
          if (error) {
            console.error('Erro ao carregar treino:', error);
            showToast(`Erro ao carregar treino: ${error.message}`);
          } else if (data) {
            setTitulo(data.titulo);
            setDataTreino(data.data_treino);
            setHoraTreino(data.hora_treino || '');
            setStatus(data.status);
            
            const mapped = data.exercicios.map((item: any) => ({
              exercicio_id: item.exercicio_id,
              series: item.series,
              repeticoes: item.repeticoes,
              carga_kg: item.carga_kg,
              exercicio: item.exercicio
            }));
            setSelectedExercises(mapped);
          }
        } finally {
          setLoading(false);
        }
      } else if (templateId) {
        setLoading(true);
        try {
          const { data, error } = await dbService.getTemplates(personalId);
          const current = data?.find(t => t.id === templateId);
          if (current) {
            setTitulo(current.titulo);
            setDescricao(current.descricao || '');
            const mapped = current.exercicios?.map((item: any) => ({
              exercicio_id: item.exercicio_id,
              series: item.series,
              repeticoes: item.repeticoes,
              carga_kg: item.carga_kg,
              exercicio: item.exercicio
            })) || [];
            setSelectedExercises(mapped);
          }
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [treinoId, templateId]);

  // Título automático sequencial por aluno + por dia
  useEffect(() => {
    if (!isTemplateMode && !treinoId && !tituloEditadoManualmente && aluno?.id && dataTreino) {
      const updateAutoTitle = async () => {
        try {
          const { data: treinosExistentes } = await dbService.getTreinosParaAluno(aluno.id);
          // Filtra treinos do mesmo dia (incluindo rascunhos e publicados)
          const treinosNoDia = treinosExistentes?.filter(t => t.data_treino === dataTreino) || [];
          
          const [year, month, day] = dataTreino.split('-');
          const dataBR = `${day}/${month}/${year}`;
          
          // Letra sequencial: 0 treinos -> A, 1 -> B, etc (65 é 'A' em ASCII)
          const proximaLetra = String.fromCharCode(65 + (treinosNoDia.length % 26));
          setTitulo(`${dataBR} - Treino ${proximaLetra}`);
        } catch (err) {
          console.error('Erro ao gerar título automático:', err);
        }
      };
      
      updateAutoTitle();
    }
  }, [dataTreino, aluno?.id, treinoId, isTemplateMode, tituloEditadoManualmente]);

  // Load saved templates from DB
  const fetchTemplates = async () => {
    try {
      const { data } = await dbService.getTemplates(personalId);
      if (data) setAvailableTemplates(data);
    } catch (e) {
      console.error(e);
    }
  };

  const checkOrthopedicConflict = (exercicio: Exercicio): any | null => {
    if (!aluno || condicaoRegras.length === 0) return null;
    
    const conflictRules = condicaoRegras.filter(regra => {
      if (regra.tipo !== 'evitar' && regra.tipo !== 'atencao') return false;
      
      const matchId = regra.exercicio_id && String(regra.exercicio_id) === String(exercicio.id);
      const matchName = regra.padrao_nome && exercicio.nome.toLowerCase().includes(regra.padrao_nome.toLowerCase());
      
      return matchId || matchName;
    });

    return conflictRules.length > 0 ? conflictRules[0] : null;
  };

  // Add exercise to list
  const handleAddExercise = (exercicio: Exercicio) => {
    const conflict = checkOrthopedicConflict(exercicio);
    
    if (conflict) {
      setOrthopedicSafetyModal({
        show: true,
        exercicio,
        regra: conflict,
        onConfirm: () => {
          const newEx = {
            exercicio_id: exercicio.id,
            series: 3,
            repeticoes: '10',
            carga_kg: null,
            exercicio: exercicio
          };
          setSelectedExercises([...selectedExercises, newEx]);
          showToast(`"${exercicio.nome}" adicionado mesmo assim!`);
          setOrthopedicSafetyModal({ show: false, exercicio: null, regra: null, onConfirm: () => {} });
        }
      });
      return;
    }

    const newEx = {
      exercicio_id: exercicio.id,
      series: 3,
      repeticoes: '10',
      carga_kg: null,
      exercicio: exercicio
    };
    setSelectedExercises([...selectedExercises, newEx]);
    showToast(`"${exercicio.nome}" adicionado!`);
  };

  // Remove exercise from list
  const handleRemoveExercise = (index: number) => {
    const list = [...selectedExercises];
    list.splice(index, 1);
    setSelectedExercises(list);
  };

  // Reordering exercises
  const moveUp = (index: number) => {
    if (index === 0) return;
    const list = [...selectedExercises];
    const temp = list[index];
    list[index] = list[index - 1];
    list[index - 1] = temp;
    setSelectedExercises(list);
  };

  const moveDown = (index: number) => {
    if (index === selectedExercises.length - 1) return;
    const list = [...selectedExercises];
    const temp = list[index];
    list[index] = list[index + 1];
    list[index + 1] = temp;
    setSelectedExercises(list);
  };

  // Input bindings
  const updateExerciseField = (index: number, field: string, value: any) => {
    const list = [...selectedExercises];
    list[index] = {
      ...list[index],
      [field]: value
    };
    setSelectedExercises(list);
  };

  // Save Workout or Template
  const handleSave = async (targetStatus: 'rascunho' | 'publicado') => {
    if (saving) return;
    if (!titulo.trim()) {
      showToast('O título é obrigatório.');
      return;
    }

    setSaving(true);
    try {
      if (isTemplateMode) {
        // Saving as a Template
        const templatePayload = {
          id: templateId || undefined,
          personal_id: personalId,
          titulo: titulo.trim(),
          descricao: descricao.trim() || null
        };
        const exercisesPayload = selectedExercises.map((item, idx) => ({
          exercicio_id: item.exercicio_id,
          ordem: idx,
          series: Number(item.series) || 3,
          repeticoes: item.repeticoes || '10',
          carga_kg: item.carga_kg !== '' && item.carga_kg !== null ? Number(item.carga_kg) : null
        }));

        const { error } = await dbService.saveTemplate(templatePayload, exercisesPayload);
        if (error) {
          console.error('Erro ao salvar modelo de treino:', error);
          showToast(`Erro ao salvar modelo: ${error.message}`);
        } else {
          showToast('Modelo de treino salvo com sucesso!');
          onBack();
        }
      } else {
        // Saving as a standard Workout
        const treinoPayload = {
          id: treinoId || undefined,
          aluno_id: aluno.id,
          personal_id: personalId,
          titulo: titulo.trim(),
          data_treino: dataTreino,
          hora_treino: horaTreino || null,
          status: targetStatus
        };

        const exercisesPayload = selectedExercises.map((item, idx) => ({
          exercicio_id: item.exercicio_id,
          ordem: idx + 1,
          series: Number(item.series) || 3,
          repeticoes: item.repeticoes || '10',
          carga_kg: item.carga_kg !== '' && item.carga_kg !== null ? Number(item.carga_kg) : null
        }));

        const { error } = await dbService.saveTreino(treinoPayload, exercisesPayload);
        if (error) {
          console.error('Erro ao salvar ficha de treino:', error);
          showToast(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`);
        } else {
          setStatus(targetStatus);
          showToast(targetStatus === 'publicado' ? 'Treino publicado!' : 'Rascunho salvo!');
          onBack();
        }
      }
    } catch (err: any) {
      console.error('Erro geral ao salvar:', err);
      showToast(`Ocorreu um erro: ${err.message || 'Erro inesperado'}`);
    } finally {
      setSaving(false);
      setShowPublishConfirm(false);
    }
  };

  // Template logic
  const handleSaveAsTemplate = async () => {
    if (saving) return;
    if (!templateName.trim()) {
      showToast('Digite um nome para o modelo.');
      return;
    }
    if (selectedExercises.length === 0) {
      showToast('Adicione pelo menos um exercício ao treino.');
      return;
    }

    setSaving(true);
    try {
      const templatePayload = {
        personal_id: personalId,
        titulo: templateName.trim(),
        descricao: templateDesc.trim() || null
      };

      const exercisesPayload = selectedExercises.map((item, idx) => ({
        exercicio_id: item.exercicio_id,
        ordem: idx,
        series: Number(item.series) || 3,
        repeticoes: item.repeticoes || '10',
        carga_kg: item.carga_kg !== '' && item.carga_kg !== null ? Number(item.carga_kg) : null
      }));

      const { error } = await dbService.saveTemplate(templatePayload, exercisesPayload);
      if (error) {
        console.error('Erro ao salvar modelo:', error);
        showToast(`Erro ao salvar modelo: ${error.message || 'Erro desconhecido'}`);
        return;
      }

      showToast(`Modelo "${templateName.trim()}" salvo com sucesso!`);
      setTemplateName('');
      setTemplateDesc('');
      fetchTemplates();
      setShowTemplatesModal(false);
    } catch (e: any) {
      console.error('Erro geral ao salvar modelo:', e);
      showToast(`Erro ao salvar modelo: ${e.message || 'Erro inesperado'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLoadTemplate = async (template: TemplateTreino) => {
    try {
      const { data: full, error } = await dbService.getTemplateCompleto(template.id);
      if (error || !full) {
        console.error('Erro ao carregar o modelo:', error);
        showToast(`Erro ao carregar o modelo: ${error?.message || 'Dados não encontrados'}`);
        return;
      }
      const exs = full.exercicios || [];
      setSelectedExercises(exs.map((te: any) => ({
        exercicio_id: te.exercicio_id,
        series: te.series,
        repeticoes: te.repeticoes,
        carga_kg: te.carga_kg,
        exercicio: te.exercicio
      })));
      setTitulo(full.titulo || template.titulo);
      showToast(`Modelo "${full.titulo || template.titulo}" aplicado.`);
      setShowTemplatesModal(false);
    } catch (e: any) {
      console.error('Erro ao carregar o modelo:', e);
      showToast(`Erro ao carregar o modelo: ${e.message || 'Erro inesperado'}`);
    }
  };

  const handleDeleteTemplate = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Excluir este modelo permanentemente?')) return;
    try {
      const { error } = await dbService.deleteTemplate(id);
      if (error) throw error;
      showToast(`Modelo excluído.`);
      fetchTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  // Filtering Library Exercises
  const filteredLibrary = allExercicios.filter(ex => {
    const categoryMatch = selectedCategoriaId === 'all' || ex.categoria_id === selectedCategoriaId;
    const nameMatch = ex.nome.toLowerCase().includes(searchLibrary.toLowerCase()) || 
                      ex.musculo_primario.some(m => m.toLowerCase().includes(searchLibrary.toLowerCase()));
    return categoryMatch && nameMatch;
  });

  return (
    <div id="workout-creator-root" className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-bg-sub p-5 rounded-2xl border border-line">
        <div className="flex items-center gap-3">
          <button
            id="btn-back-from-creator"
            type="button"
            onClick={onBack}
            className="z-btn z-btn--ghost z-btn--icon"
          >
            <ArrowLeft className="w-5 h-5 text-accent" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="z-badge z-badge--accent">
                Montando treino
              </span>
              <span className={`text-[12px] px-2 py-0.5 rounded-full font-semibold ${
                isTemplateMode ? 'bg-indigo-500/10 text-indigo-400' :
                status === 'publicado' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
              }`}>
                {isTemplateMode ? 'Modo template' : (status === 'publicado' ? 'Publicado' : 'Rascunho')}
              </span>
            </div>
            <h2 className="z-h2 mt-1">
              {isTemplateMode ? 'Criando modelo de treino' : `Para: ${aluno?.profile?.nome || 'Aluno'}`}
            </h2>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Templates Button - Only show in Workout mode */}
          {!isTemplateMode && (
            <button
              id="btn-templates-workout"
              type="button"
              onClick={() => setShowTemplatesModal(true)}
              className="z-btn z-btn--ghost z-btn--sm flex items-center gap-1.5"
            >
              <FolderHeart className="w-4 h-4 text-accent" />
              <span>Usar Modelo</span>
            </button>
          )}

          <button
            id="btn-save-draft"
            type="button"
            disabled={saving || loading}
            onClick={() => handleSave('rascunho')}
            className="z-btn z-btn--ghost z-btn--sm flex items-center gap-1.5"
          >
            <Save className="w-4 h-4 text-accent" />
            {isTemplateMode ? 'Salvar modelo' : 'Salvar rascunho'}
          </button>

          {!isTemplateMode && (
            <button
              id="btn-publish-workout"
              type="button"
              disabled={saving || loading}
              onClick={() => setShowPublishConfirm(true)}
              className="z-btn z-btn--primary z-btn--sm flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span>Publicar treino</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <span className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COL: WORKOUT DETAILS (8cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Form Settings */}
            <div className="z-card space-y-4">
              <h3 className="z-eyebrow flex items-center gap-2">
                <Info className="w-4 h-4 text-accent" />
                <span>Configurações gerais</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="z-label block mb-1.5">
                    {isTemplateMode ? 'Título do modelo' : 'Título do treino'}
                  </label>
                  <input
                    id="input-workout-title"
                    type="text"
                    required
                    value={titulo}
                    onChange={(e) => {
                      setTitulo(e.target.value);
                      setTituloEditadoManualmente(true);
                    }}
                    placeholder="Ex: Treino A, Pernas Foco Glúteo"
                    className="flex-1 h-12 px-4 text-base rounded-xl border border-ink/20 bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-[#F26A1B] focus:border-[#F26A1B] transition-all w-full"
                  />
                </div>
                {!isTemplateMode ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="z-label block mb-1.5">
                        Data
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none" />
                        <input
                          id="input-workout-date"
                          type="date"
                          value={dataTreino}
                          onChange={(e) => setDataTreino(e.target.value)}
                          className="h-12 w-full px-4 pl-10 text-base rounded-xl border border-ink/20 bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-[#F26A1B] focus:border-[#F26A1B] transition-all z-num"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="z-label block mb-1.5">
                        Hora
                      </label>
                      <div className="relative">
                        <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none" />
                        <input
                          id="input-workout-time"
                          type="time"
                          value={horaTreino}
                          onChange={(e) => setHoraTreino(e.target.value)}
                          className="h-12 w-full px-4 pl-10 text-base rounded-xl border border-ink/20 bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-[#F26A1B] focus:border-[#F26A1B] transition-all z-num"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="z-label block mb-1.5">
                      Descrição do modelo (opcional)
                    </label>
                    <input
                      type="text"
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      placeholder="Ex: Foco em hipertrofia de membros inferiores"
                      className="h-12 w-full px-4 text-base rounded-xl border border-ink/20 bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-[#F26A1B] focus:border-[#F26A1B] transition-all"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Exercises List Area */}
            <div className="z-card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="z-eyebrow flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-accent animate-pulse" />
                  <span>Exercícios adicionados ({selectedExercises.length})</span>
                </h3>
                {selectedExercises.length > 0 && (
                  <div className="flex items-center gap-4">
                    {!isTemplateMode && (
                      <button
                        id="btn-save-as-template-prompt"
                        type="button"
                        onClick={() => setShowTemplatesModal(true)}
                        className="text-[12px] text-accent hover:underline flex items-center gap-1 font-semibold"
                      >
                        <FolderHeart className="w-3 h-3" />
                        Salvar como modelo
                      </button>
                    )}
                    <button
                      id="btn-clear-workout-list"
                      type="button"
                      onClick={() => {
                        if (showClearConfirm) {
                          setSelectedExercises([]);
                          setShowClearConfirm(false);
                        } else {
                          setShowClearConfirm(true);
                          setTimeout(() => setShowClearConfirm(false), 3000);
                        }
                      }}
                      className={`text-[12px] font-semibold transition-colors ${
                        showClearConfirm 
                          ? 'text-white bg-danger hover:bg-danger/95 px-2 py-0.5 rounded' 
                          : 'text-danger hover:underline'
                      }`}
                    >
                      {showClearConfirm ? 'Tem certeza?' : 'Limpar tudo'}
                    </button>
                  </div>
                )}
              </div>

              {selectedExercises.length === 0 ? (
                <div className="p-12 border border-dashed border-line rounded-xl text-center space-y-3 bg-bg-sub">
                  <Dumbbell className="w-10 h-10 text-ink-3 mx-auto stroke-1" />
                  <p className="text-xs text-ink-2 font-semibold">Nenhum exercício ainda neste treino.</p>
                  <p className="text-[11px] text-ink-3 max-w-[280px] mx-auto leading-relaxed">
                    Pesquise e selecione exercícios na biblioteca à direita para montar a planilha.
                  </p>
                  <button
                    id="btn-focus-library"
                    type="button"
                    onClick={() => setShowLibrary(true)}
                    className="lg:hidden z-btn z-btn--ghost z-btn--sm"
                  >
                    Ver biblioteca abaixo
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedExercises.map((item, index) => {
                    const ex = item.exercicio;
                    const name = ex?.nome || 'Exercício Sem Nome';
                    const primario = ex?.musculo_primario?.[0] || 'Geral';
                    const videoPath = ex ? (ex.video_url_masc || ex.video_url_fem) : null;
                    const resolvedVideoUrl = videoPath ? videoUrls[videoPath] : null;

                    return (
                      <div
                        key={index}
                        className="bg-bg-sub border border-line rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-line-strong transition-all group relative overflow-hidden shadow-sm"
                      >
                        {/* Compact metadata column */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          
                          {/* Mini Looping Video or Icon */}
                          <div className="w-12 h-12 rounded-lg bg-surface border border-line flex items-center justify-center shrink-0 overflow-hidden">
                            {resolvedVideoUrl ? (
                              <video
                                src={resolvedVideoUrl}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Dumbbell className="w-5 h-5 text-ink-3" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-sm sm:text-base text-ink mb-1 truncate">
                              {index + 1}. {name}
                            </h4>
                            <span className="z-badge z-badge--accent text-[9.5px] h-5 px-2.5">
                              {primario}
                            </span>
                          </div>
                        </div>

                        {/* Right side parameters and controls */}
                        <div className="flex flex-row sm:flex-row items-center gap-4 justify-between sm:justify-end shrink-0 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-line">
                          {/* Editable Plan Parameters (Series, Reps, Load) */}
                          <div className="grid grid-cols-3 gap-2 shrink-0">
                            <div className="w-16 sm:w-20">
                              <label className="text-[10px] text-ink-3 block mb-1 text-center font-bold uppercase tracking-wider">Séries</label>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={item.series}
                                onChange={(e) => updateExerciseField(index, 'series', e.target.value.replace(/[^0-9]/g, ''))}
                                className="z-input !h-9 !px-1 text-center text-xs font-semibold z-num"
                              />
                            </div>
                            <div className="w-16 sm:w-20">
                              <label className="text-[10px] text-ink-3 block mb-1 text-center font-bold uppercase tracking-wider">Reps</label>
                              <input
                                type="text"
                                value={item.repeticoes}
                                placeholder="ex: 10"
                                onChange={(e) => updateExerciseField(index, 'repeticoes', e.target.value)}
                                className="z-input !h-9 !px-1 text-center text-xs font-semibold z-num"
                              />
                            </div>
                            <div className="w-16 sm:w-20">
                              <label className="text-[10px] text-ink-3 block mb-1 text-center font-bold uppercase tracking-wider">Carga (kg)</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="-"
                                value={item.carga_kg ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                                  updateExerciseField(index, 'carga_kg', val);
                                }}
                                className="z-input !h-9 !px-1 text-center text-xs font-semibold z-num"
                              />
                            </div>
                          </div>

                          {/* Order & Remove Controls */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="flex sm:flex-col gap-1">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => moveUp(index)}
                                className="p-1 bg-surface hover:bg-raise border border-line rounded text-ink-2 hover:text-ink disabled:opacity-20 transition-all cursor-pointer"
                                title="Subir"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={index === selectedExercises.length - 1}
                                onClick={() => moveDown(index)}
                                className="p-1 bg-surface hover:bg-raise border border-line rounded text-ink-2 hover:text-ink disabled:opacity-20 transition-all cursor-pointer"
                                title="Descer"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveExercise(index)}
                              className="p-1.5 text-danger hover:bg-danger-soft rounded transition-colors cursor-pointer"
                              title="Remover"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COL: EXERCISE LIBRARY (5cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="z-card space-y-4 lg:sticky lg:top-6">
              <div>
                <h3 className="z-eyebrow flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-accent" />
                  <span>Biblioteca de exercícios</span>
                </h3>
                <p className="text-xs text-ink-2 mt-1">
                  Selecione os exercícios para incluir no treino do aluno.
                </p>
              </div>

              {studentAnamnese?.possui_lesao && (
                <div className="bg-danger-soft border border-danger/20 rounded-xl p-3 flex gap-2 text-[11px] text-danger">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Atenção:</span>
                    <p className="mt-0.5 leading-relaxed">Este aluno relatou: <span className="font-semibold text-ink">{studentAnamnese.lesoes}</span></p>
                  </div>
                </div>
              )}

              {/* Library search and filter */}
              <div className="space-y-3">
                <div className="z-search">
                  <span className="z-search__icon">
                    <Search className="w-4 h-4 text-ink-3" />
                  </span>
                  <input
                    id="search-library-input"
                    type="text"
                    value={searchLibrary}
                    onChange={(e) => setSearchLibrary(e.target.value)}
                    placeholder="Pesquisar exercício ou músculo..."
                    className="z-input"
                  />
                </div>

                {/* Categories selector horizontal list */}
                <div className="z-chips">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoriaId('all')}
                    aria-selected={selectedCategoriaId === 'all'}
                    className="z-chip"
                  >
                    Todos
                  </button>
                  {categorias.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoriaId(cat.id)}
                      aria-selected={selectedCategoriaId === cat.id}
                      className="z-chip"
                    >
                      {cat.nome}
                    </button>
                  ))}
                </div>
              </div>

              {/* Library List with quick Add buttons */}
              {loadingLibrary ? (
                <div className="flex justify-center py-10">
                  <span className="w-6 h-6 border border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredLibrary.length === 0 ? (
                <p className="text-xs text-ink-3 italic text-center py-8">Nenhum exercício correspondente encontrado.</p>
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {filteredLibrary.map(ex => {
                    const isMascVideo = ex.video_url_masc;
                    const isFemVideo = ex.video_url_fem;
                    const videoPath = isMascVideo || isFemVideo;
                    const resolvedVideoUrl = videoPath ? videoUrls[videoPath] : null;
                    
                    return (
                      <div
                        id={`lib-exercise-item-${ex.id}`}
                        key={ex.id}
                        onClick={() => handleAddExercise(ex)}
                        className="flex items-center justify-between p-2.5 bg-bg-sub rounded-xl border border-line hover:border-line-strong hover:bg-raise transition-all cursor-pointer group clicavel"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Small Media thumbnail preview */}
                          <div className="w-10 h-10 rounded-lg bg-surface border border-line flex items-center justify-center overflow-hidden shrink-0">
                            {resolvedVideoUrl ? (
                              <video
                                src={resolvedVideoUrl}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Dumbbell className="w-4 h-4 text-ink-3" />
                            )}
                          </div>
                          
                          <div className="min-w-0">
                            <h4 className="font-semibold text-xs text-ink group-hover:text-accent transition-colors truncate">
                              {ex.nome}
                            </h4>
                            <span className="text-[11px] text-ink-3 block mt-0.5">
                              {ex.musculo_primario?.[0]}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="p-1.5 rounded-lg bg-raise text-ink-2 hover:text-white hover:bg-accent transition-colors shrink-0 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

         </div>
       )}

      {/* PUBLISH CONFIRMATION DIALOG */}
      <AnimatePresence>
        {showPublishConfirm && (
          <div id="publish-confirm-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-line rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-2 text-accent">
                <Sparkles className="w-5 h-5 animate-pulse" />
                <h3 className="z-h2">Publicar treino?</h3>
              </div>
              <p className="text-[12.5px] text-ink-2 leading-relaxed">
                Tem certeza que deseja publicar o treino <strong className="text-ink">"{titulo}"</strong> para o aluno <strong className="text-ink">{aluno?.profile?.nome}</strong>?
              </p>
              <p className="text-[11.5px] text-ink-3 leading-relaxed">
                Ao publicar, ele será notificado e terá acesso instantâneo a essa planilha em sua área de aluno.
              </p>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  id="btn-cancel-publish"
                  type="button"
                  onClick={() => setShowPublishConfirm(false)}
                  className="z-btn z-btn--ghost z-btn--sm"
                >
                  Cancelar
                </button>
                <button
                  id="btn-execute-publish"
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave('publicado')}
                  className="z-btn z-btn--primary z-btn--sm"
                >
                  {saving ? 'Publicando...' : 'Sim, publicar!'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TEMPLATES DIALOG (Save/Load) */}
      <AnimatePresence>
        {showTemplatesModal && (
          <div id="templates-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-line rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-start pb-2 border-b border-line">
                <div>
                  <h3 className="z-h2">Modelos de treino</h3>
                  <p className="text-[12px] text-ink-2 mt-0.5">Reutilize estruturas prontas de treinos em diferentes alunos.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTemplatesModal(false)}
                  className="text-ink-3 hover:text-ink text-sm font-semibold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="z-label block">Nome do modelo:</label>
                  <input
                    id="input-template-name"
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Ex: Treino A - Peito e Tríceps"
                    className="z-input !h-10 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="z-label block">Descrição (opcional):</label>
                  <input
                    id="input-template-desc"
                    type="text"
                    value={templateDesc}
                    onChange={(e) => setTemplateDesc(e.target.value)}
                    placeholder="Ex: Foco em força máxima"
                    className="z-input !h-10 text-xs"
                  />
                </div>
                <button
                  id="btn-save-template-submit"
                  type="button"
                  onClick={handleSaveAsTemplate}
                  disabled={saving}
                  className="z-btn z-btn--primary w-full"
                >
                  {saving ? 'Salvando...' : 'Salvar como modelo'}
                </button>
              </div>

              {/* List of saved templates */}
              <div className="space-y-2.5 pt-4 border-t border-line">
                <span className="text-[12px] text-ink-3 block font-bold uppercase tracking-wider">Modelos salvos ({availableTemplates.length}):</span>
                {availableTemplates.length === 0 ? (
                  <p className="text-xs text-ink-3 italic py-4 text-center">Nenhum modelo salvo ainda.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {availableTemplates.map(template => (
                      <div
                        key={template.id}
                        onClick={() => handleLoadTemplate(template)}
                        className="flex items-center justify-between p-2.5 bg-bg-sub rounded-xl border border-line hover:border-line-strong hover:bg-raise transition-all cursor-pointer group text-xs text-ink"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FolderHeart className="w-4 h-4 text-accent shrink-0" />
                          <div className="min-w-0">
                            <span className="font-semibold truncate block max-w-[200px]">{template.titulo}</span>
                            {template.descricao && (
                              <span className="text-[11px] text-ink-3 truncate block max-w-[200px] z-num">{template.descricao}</span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteTemplate(template.id, e)}
                          className="p-1.5 text-danger hover:bg-danger-soft rounded transition-colors cursor-pointer"
                          title="Excluir modelo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE ALERTAS ORTOPÉDICOS */}
      <AnimatePresence>
        {orthopedicSafetyModal.show && orthopedicSafetyModal.exercicio && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOrthopedicSafetyModal({ show: false, exercicio: null, regra: null, onConfirm: () => {} })}
              className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.18)] z-10 flex flex-col"
            >
              {/* Header */}
              <div className="p-6 pb-4 border-b border-line flex items-center gap-3 bg-rose-500/5">
                <AlertCircle className="w-6 h-6 text-[#F26A1B] shrink-0 animate-pulse" />
                <div>
                  <h3 className="font-display font-bold text-base text-rose-600">⚠️ Atenção Ortopédica</h3>
                  <p className="text-[11px] text-ink-3">Aviso de segurança de prescrição</p>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div className="text-xs text-ink-2 leading-relaxed space-y-2">
                  <p>
                    O exercício <strong className="text-ink font-semibold">"{orthopedicSafetyModal.exercicio.nome}"</strong> entra em conflito com as recomendações clínicas registradas para este aluno.
                  </p>
                  
                  <div className="p-3.5 rounded-2xl bg-[#F26A1B]/10 border border-[#F26A1B]/20 space-y-2.5">
                    <div className="flex items-center gap-1.5 justify-between">
                      <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
                        {orthopedicSafetyModal.regra.condicaoName || 'Restrição Ativa'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        orthopedicSafetyModal.regra.tipo === 'evitar' 
                          ? 'bg-rose-500 text-white' 
                          : 'bg-[#F26A1B] text-white'
                      }`}>
                        {orthopedicSafetyModal.regra.tipo === 'evitar' ? 'Evitar Totalmente' : 'Atenção Especial'}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div>
                        <span className="font-semibold text-ink-3 text-[10px] block uppercase">Motivo / Patologia:</span>
                        <p className="text-ink-2 italic">"{orthopedicSafetyModal.regra.motivo}"</p>
                      </div>
                      {orthopedicSafetyModal.regra.sugestao && (
                        <div>
                          <span className="font-semibold text-ink-3 text-[10px] block uppercase text-emerald-600">Sugestão de substituição:</span>
                          <p className="text-emerald-700 font-medium">"{orthopedicSafetyModal.regra.sugestao}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-ink-3 italic text-center leading-relaxed">
                  Deseja ignorar o alerta e adicionar este exercício mesmo assim?
                </p>
              </div>

              {/* Footer Actions */}
              <div className="p-4 bg-raise/5 border-t border-line flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setOrthopedicSafetyModal({ show: false, exercicio: null, regra: null, onConfirm: () => {} })}
                  className="h-10 px-4 rounded-xl border border-line hover:bg-raise transition-colors text-xs font-bold text-ink-2 cursor-pointer"
                >
                  Escolher outro exercício
                </button>
                <button
                  type="button"
                  onClick={orthopedicSafetyModal.onConfirm}
                  className="h-10 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors text-xs font-bold cursor-pointer"
                >
                  Adicionar mesmo assim
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
