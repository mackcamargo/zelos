import React, { useState, useEffect } from 'react';
import { dbService } from '../lib/supabase';
import { Exercicio, Treino, TreinoExercicioDetailed, Categoria, TemplateTreino, TemplateExercicioDetailed } from '../types';
import { 
  ArrowLeft, Trash2, ChevronUp, ChevronDown, Plus, Check, Sparkles, 
  Save, Send, Calendar, Search, Dumbbell, Play, RefreshCw, FolderHeart, Info
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
  const [titulo, setTitulo] = useState(isTemplateMode ? 'Novo Modelo' : 'Treino A');
  const [descricao, setDescricao] = useState('');
  const [dataTreino, setDataTreino] = useState(new Date().toISOString().split('T')[0]);
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
            showToast('Erro ao carregar treino existente');
          } else if (data) {
            setTitulo(data.titulo);
            setDataTreino(data.data_treino);
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

  // Load saved templates from DB
  const fetchTemplates = async () => {
    try {
      const { data } = await dbService.getTemplates(personalId);
      if (data) setAvailableTemplates(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Add exercise to list
  const handleAddExercise = (exercicio: Exercicio) => {
    // Check if already in workout (allowing duplicate is fine, but warning can be cool. Let's allow duplicates)
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
          showToast('Erro ao salvar modelo de treino');
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
          showToast('Erro ao salvar ficha de treino');
        } else {
          setStatus(targetStatus);
          showToast(targetStatus === 'publicado' ? 'Treino publicado!' : 'Rascunho salvo!');
          onBack();
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Ocorreu um erro ao salvar.');
    } finally {
      setSaving(false);
      setShowPublishConfirm(false);
    }
  };

  // Template logic
  const handleSaveAsTemplate = async () => {
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
      if (error) throw error;

      showToast(`Modelo "${templateName.trim()}" salvo com sucesso!`);
      setTemplateName('');
      setTemplateDesc('');
      fetchTemplates();
      setShowTemplatesModal(false);
    } catch (e) {
      console.error(e);
      showToast('Erro ao salvar modelo.');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadTemplate = (template: TemplateTreino) => {
    if (template.exercicios) {
      setSelectedExercises(template.exercicios.map(te => ({
        exercicio_id: te.exercicio_id,
        series: te.series,
        repeticoes: te.repeticoes,
        carga_kg: te.carga_kg,
        exercicio: te.exercicio
      })));
      setTitulo(template.titulo);
      showToast(`Modelo "${template.titulo}" aplicado.`);
      setShowTemplatesModal(false);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-2 p-5 rounded-2xl border border-white/5">
        <div className="flex items-center gap-3">
          <button
            id="btn-back-from-creator"
            type="button"
            onClick={onBack}
            className="p-2.5 rounded-xl bg-void border border-white/5 text-ink-2 hover:text-ink transition-all hover:border-white/10"
          >
            <ArrowLeft className="w-5 h-5 text-flame" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono bg-flame/10 text-flame px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                Montando Treino
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                isTemplateMode ? 'bg-violet/10 text-violet' :
                status === 'publicado' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
              }`}>
                {isTemplateMode ? 'Modo Template' : (status === 'publicado' ? 'Publicado' : 'Rascunho')}
              </span>
            </div>
            <h2 className="font-display font-bold text-lg text-ink leading-tight mt-1">
              {isTemplateMode ? 'Criando Modelo de Treino' : `Para: ${aluno?.profile?.nome || 'Aluno'}`}
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
              className="py-2.5 px-4 rounded-xl border border-white/5 hover:bg-surface-3 bg-void text-xs font-mono text-ink-2 hover:text-ink flex items-center gap-2 transition-all"
            >
              <FolderHeart className="w-4 h-4 text-violet" />
              <span>Usar Modelo</span>
            </button>
          )}

          <button
            id="btn-save-draft"
            type="button"
            disabled={saving || loading}
            onClick={() => handleSave('rascunho')}
            className="py-2.5 px-4 rounded-xl border border-white/5 hover:border-white/10 bg-surface-3 hover:bg-surface-2 text-xs font-mono font-bold text-ink transition-all disabled:opacity-40"
          >
            <Save className="w-4 h-4 text-ink-3 inline mr-1.5" />
            {isTemplateMode ? 'Salvar Modelo' : 'Salvar Rascunho'}
          </button>

          {!isTemplateMode && (
            <button
              id="btn-publish-workout"
              type="button"
              disabled={saving || loading}
              onClick={() => setShowPublishConfirm(true)}
              className="py-2.5 px-5 rounded-xl brand-gradient-bg font-display font-bold text-void text-xs flex items-center gap-2 transition-all shadow-[0_4px_15px_rgba(245,51,79,0.2)] hover:opacity-95 disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
              <span>PUBLICAR TREINO</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <span className="w-8 h-8 border-2 border-flame border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COL: WORKOUT DETAILS (8cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Form Settings */}
            <div className="bg-surface border border-white/5 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-wider text-ink-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-flame" />
                <span>Configurações Gerais</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-ink-2 block mb-1.5">
                    {isTemplateMode ? 'Título do Modelo' : 'Título do Treino'}
                  </label>
                  <input
                    id="input-workout-title"
                    type="text"
                    required
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex: Treino A, Pernas Foco Glúteo"
                    className="w-full bg-void border border-white/5 focus:border-white/10 rounded-xl p-3 text-xs text-ink outline-none"
                  />
                </div>
                {!isTemplateMode ? (
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-ink-2 block mb-1.5">
                      Data do Treino
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 pointer-events-none" />
                      <input
                        id="input-workout-date"
                        type="date"
                        value={dataTreino}
                        onChange={(e) => setDataTreino(e.target.value)}
                        className="w-full bg-void border border-white/5 focus:border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs text-ink outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-ink-2 block mb-1.5">
                      Descrição do Modelo (opcional)
                    </label>
                    <input
                      type="text"
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      placeholder="Ex: Foco em hipertrofia de membros inferiores"
                      className="w-full bg-void border border-white/5 focus:border-white/10 rounded-xl p-3 text-xs text-ink outline-none"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Exercises List Area */}
            <div className="bg-surface border border-white/5 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono uppercase tracking-wider text-ink-3 flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-flame animate-pulse" />
                  <span>Exercícios Adicionados ({selectedExercises.length})</span>
                </h3>
                {selectedExercises.length > 0 && (
                  <div className="flex gap-4">
                    {!isTemplateMode && (
                      <button
                        id="btn-save-as-template-prompt"
                        type="button"
                        onClick={() => setShowTemplatesModal(true)}
                        className="text-[10px] font-mono text-violet hover:text-violet-300 uppercase tracking-wider flex items-center gap-1"
                      >
                        <FolderHeart className="w-3 h-3" />
                        Salvar como Modelo
                      </button>
                    )}
                    <button
                      id="btn-clear-workout-list"
                      type="button"
                      onClick={() => {
                        if (confirm('Limpar todos os exercícios?')) setSelectedExercises([]);
                      }}
                      className="text-[10px] font-mono text-rose-400 hover:text-rose-300 uppercase tracking-wider"
                    >
                      Limpar Tudo
                    </button>
                  </div>
                )}
              </div>

              {selectedExercises.length === 0 ? (
                <div className="p-12 border border-dashed border-white/5 rounded-xl text-center space-y-3">
                  <Dumbbell className="w-10 h-10 text-ink-3 mx-auto stroke-1" />
                  <p className="text-xs text-ink-2">Nenhum exercício ainda neste treino.</p>
                  <p className="text-[10px] text-ink-3 max-w-[280px] mx-auto leading-relaxed">
                    Pesquise e selecione exercícios na biblioteca à direita para montar a planilha.
                  </p>
                  <button
                    id="btn-focus-library"
                    type="button"
                    onClick={() => setShowLibrary(true)}
                    className="lg:hidden py-1.5 px-3 bg-white/5 rounded-lg text-[10px] text-ink font-mono hover:bg-white/10"
                  >
                    Ver Biblioteca abaixo
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
                        className="bg-void border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/10 transition-colors group relative overflow-hidden"
                      >
                        {/* Compact metadata column */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          
                          {/* Mini Looping Video or Icon */}
                          <div className="w-12 h-12 rounded-lg bg-surface-2 border border-white/5 flex items-center justify-center shrink-0 overflow-hidden">
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

                          <div className="min-w-0">
                            <span className="text-[9px] font-mono bg-white/5 text-ink-3 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              {primario}
                            </span>
                            <h4 className="font-display font-semibold text-xs text-ink mt-1 truncate">
                              {index + 1}. {name}
                            </h4>
                          </div>
                        </div>

                        {/* Right side parameters and controls */}
                        <div className="flex flex-row sm:flex-row items-center gap-4 justify-between sm:justify-end shrink-0 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5">
                          {/* Editable Plan Parameters (Series, Reps, Load) */}
                          <div className="grid grid-cols-3 gap-2 shrink-0">
                            <div className="w-16 sm:w-20">
                              <label className="text-[8px] font-mono uppercase text-ink-3 block mb-1 text-center font-semibold">SÉRIES</label>
                              <input
                                type="number"
                                min="1"
                                value={item.series}
                                onChange={(e) => updateExerciseField(index, 'series', e.target.value)}
                                className="w-full bg-surface border border-white/5 focus:border-white/10 rounded-lg p-2 text-center text-xs font-mono text-ink"
                              />
                            </div>
                            <div className="w-16 sm:w-20">
                              <label className="text-[8px] font-mono uppercase text-ink-3 block mb-1 text-center font-semibold">REPS</label>
                              <input
                                type="text"
                                value={item.repeticoes}
                                placeholder="ex: 10"
                                onChange={(e) => updateExerciseField(index, 'repeticoes', e.target.value)}
                                className="w-full bg-surface border border-white/5 focus:border-white/10 rounded-lg p-2 text-center text-xs font-mono text-ink"
                              />
                            </div>
                            <div className="w-16 sm:w-20">
                              <label className="text-[8px] font-mono uppercase text-ink-3 block mb-1 text-center font-semibold">CARGA (KG)</label>
                              <input
                                type="number"
                                step="any"
                                placeholder="-"
                                value={item.carga_kg ?? ''}
                                onChange={(e) => updateExerciseField(index, 'carga_kg', e.target.value)}
                                className="w-full bg-surface border border-white/5 focus:border-white/10 rounded-lg p-2 text-center text-xs font-mono text-ink"
                              />
                            </div>
                          </div>

                          {/* Order & Remove Controls */}
                          <div className="flex items-center gap-1 shrink-0">
                            <div className="flex sm:flex-col gap-1">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => moveUp(index)}
                                className="p-1 bg-surface hover:bg-surface-2 border border-white/5 rounded text-ink-2 hover:text-ink disabled:opacity-20 transition-all cursor-pointer"
                                title="Subir"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={index === selectedExercises.length - 1}
                                onClick={() => moveDown(index)}
                                className="p-1 bg-surface hover:bg-surface-2 border border-white/5 rounded text-ink-2 hover:text-ink disabled:opacity-20 transition-all cursor-pointer"
                                title="Descer"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveExercise(index)}
                              className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
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
            
            <div className="bg-surface border border-white/5 rounded-2xl p-5 space-y-4 lg:sticky lg:top-6">
              <div>
                <h3 className="font-display font-bold text-sm text-ink flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-violet" />
                  <span>Biblioteca de Exercícios</span>
                </h3>
                <p className="text-xs text-ink-2 mt-1">
                  Selecione os exercícios para incluir no treino do aluno.
                </p>
              </div>

              {/* Library search and filter */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
                  <input
                    id="search-library-input"
                    type="text"
                    value={searchLibrary}
                    onChange={(e) => setSearchLibrary(e.target.value)}
                    placeholder="Pesquisar exercício ou músculo..."
                    className="w-full bg-void border border-white/5 focus:border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-xs text-ink placeholder-ink-3 outline-none"
                  />
                </div>

                {/* Categories selector horizontal list */}
                <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoriaId('all')}
                    className={`py-1 px-3 rounded-full text-[10px] font-mono shrink-0 transition-all ${
                      selectedCategoriaId === 'all' 
                        ? 'bg-violet text-white font-bold' 
                        : 'bg-void border border-white/5 text-ink-2 hover:border-white/10'
                    }`}
                  >
                    Todos
                  </button>
                  {categorias.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoriaId(cat.id)}
                      className={`py-1 px-3 rounded-full text-[10px] font-mono shrink-0 transition-all ${
                        selectedCategoriaId === cat.id 
                          ? 'bg-violet text-white font-bold' 
                          : 'bg-void border border-white/5 text-ink-2 hover:border-white/10'
                      }`}
                    >
                      {cat.nome}
                    </button>
                  ))}
                </div>
              </div>

              {/* Library List with quick Add buttons */}
              {loadingLibrary ? (
                <div className="flex justify-center py-10">
                  <span className="w-6 h-6 border border-flame border-t-transparent rounded-full animate-spin" />
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
                        className="flex items-center justify-between p-2.5 bg-void rounded-xl border border-white/5 hover:border-white/10 hover:bg-surface-2 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Small Media thumbnail preview */}
                          <div className="w-10 h-10 rounded-lg bg-surface-2 border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
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
                            <h4 className="font-display font-medium text-xs text-ink group-hover:text-white transition-colors truncate">
                              {ex.nome}
                            </h4>
                            <span className="text-[9px] font-mono text-ink-3 uppercase block mt-0.5">
                              {ex.musculo_primario?.[0]}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="p-1.5 rounded-lg bg-white/5 text-ink-2 hover:text-void hover:bg-flame transition-colors shrink-0"
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
          <div id="publish-confirm-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-white/5 rounded-2xl max-w-sm w-full p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-4"
            >
              <div className="flex items-center gap-2 text-flame">
                <Sparkles className="w-5 h-5 animate-pulse" />
                <h3 className="font-display font-bold text-base text-ink">Publicar Treino?</h3>
              </div>
              <p className="text-xs text-ink-2 leading-relaxed">
                Tem certeza que deseja publicar o treino <strong className="text-white">"{titulo}"</strong> para o aluno <strong className="text-white">{aluno?.profile?.nome}</strong>?
              </p>
              <p className="text-[10px] text-ink-3 leading-relaxed">
                Ao publicar, ele será notificado e terá acesso instantâneo a essa planilha em sua área de aluno.
              </p>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  id="btn-cancel-publish"
                  type="button"
                  onClick={() => setShowPublishConfirm(false)}
                  className="px-4 py-2 rounded-xl text-xs text-ink-2 hover:text-ink"
                >
                  Cancelar
                </button>
                <button
                  id="btn-execute-publish"
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave('publicado')}
                  className="px-4 py-2 rounded-xl bg-flame hover:bg-flame/90 text-void font-display font-bold text-xs"
                >
                  {saving ? 'Publicando...' : 'Sim, Publicar!'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TEMPLATES DIALOG (Save/Load) */}
      <AnimatePresence>
        {showTemplatesModal && (
          <div id="templates-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-white/5 rounded-2xl max-w-md w-full p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-5"
            >
              <div className="flex justify-between items-start pb-2 border-b border-white/5">
                <div>
                  <h3 className="font-display font-bold text-base text-ink">Gerenciar Modelos de Treino</h3>
                  <p className="text-[10px] text-ink-2">Reutilize estruturas prontas de treinos em diferentes alunos.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTemplatesModal(false)}
                  className="text-ink-3 hover:text-ink text-xs font-mono"
                >
                  Fechar ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase text-ink-2 block">Nome do Modelo:</label>
                  <input
                    id="input-template-name"
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Ex: Treino A - Peito e Tríceps"
                    className="w-full bg-void border border-white/5 focus:border-white/10 rounded-xl p-3 text-xs text-ink outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase text-ink-2 block">Descrição (opcional):</label>
                  <input
                    id="input-template-desc"
                    type="text"
                    value={templateDesc}
                    onChange={(e) => setTemplateDesc(e.target.value)}
                    placeholder="Ex: Foco em força máxima"
                    className="w-full bg-void border border-white/5 focus:border-white/10 rounded-xl p-3 text-xs text-ink outline-none"
                  />
                </div>
                <button
                  id="btn-save-template-submit"
                  type="button"
                  onClick={handleSaveAsTemplate}
                  disabled={saving}
                  className="w-full py-3 rounded-xl bg-violet hover:bg-violet/90 text-white font-semibold text-xs transition-all disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar como Modelo'}
                </button>
              </div>

              {/* List of saved templates */}
              <div className="space-y-2.5 pt-2 border-t border-white/5">
                <span className="text-[10px] font-mono uppercase text-ink-3 block">Modelos Disponíveis ({availableTemplates.length}):</span>
                {availableTemplates.length === 0 ? (
                  <p className="text-xs text-ink-3 italic py-4 text-center">Nenhum modelo salvo ainda.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {availableTemplates.map(template => (
                      <div
                        key={template.id}
                        onClick={() => handleLoadTemplate(template)}
                        className="flex items-center justify-between p-2.5 bg-void rounded-xl border border-white/5 hover:border-white/10 hover:bg-surface-2 transition-all cursor-pointer group text-xs text-ink font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <FolderHeart className="w-4 h-4 text-violet shrink-0" />
                          <div className="min-w-0">
                            <span className="truncate block max-w-[200px]">{template.titulo}</span>
                            {template.descricao && (
                              <span className="text-[9px] text-ink-3 truncate block max-w-[200px]">{template.descricao}</span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteTemplate(template.id, e)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-colors"
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

    </div>
  );
}
