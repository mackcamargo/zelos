import React, { useState, useEffect, useRef } from 'react';
import { dbService, supabase, isSupabaseConfigured } from '../lib/supabase';
import { Categoria, Exercicio } from '../types';
import { 
  ChevronLeft, Plus, Search, Check, X, Film, UploadCloud, 
  Trash2, Save, Info, Sparkles, Loader, AlertCircle, Dumbbell,
  MoreVertical, EyeOff, Eye, Move, Copy, RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GerenciarExerciciosProps {
  onBack?: () => void;
  personalId?: string;
  isReadOnly?: boolean;
}

const COMMON_MUSCLES = [
  'Peitoral Maior', 'Peitoral Superior', 'Dorsais', 'Redondo Maior', 
  'Latíssimo do Dorso', 'Quadríceps', 'Glúteo Máximo', 'Posteriores de Coxa', 
  'Eretores da Espinha', 'Deltoide Anterior', 'Deltoide Lateral', 
  'Deltoide Posterior', 'Tríceps Braquial', 'Bíceps Braquial', 
  'Braquial', 'Braquiorradial', 'Reto do Abdômen', 'Transverso do Abdômen', 
  'Gastrocnêmio', 'Sóleo', 'Trapézio', 'Lombar'
];

export default function GerenciarExercicios({ onBack, personalId, isReadOnly = false }: GerenciarExerciciosProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [selectedExercicio, setSelectedExercicio] = useState<Exercicio | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('todos');
  const [mostrarOcultos, setMostrarOcultos] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [movingExId, setMovingExId] = useState<string | null>(null);

  // Form states
  const [nome, setNome] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [musculoPrimario, setMusculoPrimario] = useState<string[]>([]);
  const [musculoSecundario, setMusculoSecundario] = useState<string[]>([]);
  const [dicas, setDicas] = useState<string[]>([]);
  const [publicoAlvo, setPublicoAlvo] = useState<string[]>([]);
  const [contraindicacoes, setContraindicacoes] = useState<string[]>([]);
  const [impacto, setImpacto] = useState<'baixo' | 'medio' | 'alto' | null>(null);
  const [equipamento, setEquipamento] = useState('');
  
  const [newPrimario, setNewPrimario] = useState('');
  const [newSecundario, setNewSecundario] = useState('');
  const [newDica, setNewDica] = useState('');

  const [newPublico, setNewPublico] = useState('');
  const [newContraindicacao, setNewContraindicacao] = useState('');

  const addPublicoTag = (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !publicoAlvo.includes(trimmed)) {
      setPublicoAlvo([...publicoAlvo, trimmed]);
    }
    setNewPublico('');
  };

  const removePublicoTag = (tag: string) => {
    setPublicoAlvo(publicoAlvo.filter(t => t !== tag));
  };

  const addContraindicacaoTag = (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !contraindicacoes.includes(trimmed)) {
      setContraindicacoes([...contraindicacoes, trimmed]);
    }
    setNewContraindicacao('');
  };

  const removeContraindicacaoTag = (tag: string) => {
    setContraindicacoes(contraindicacoes.filter(t => t !== tag));
  };

  // Video Upload States
  const [uploadProgressMasc, setUploadProgressMasc] = useState<number | null>(null);
  const [uploadProgressFem, setUploadProgressFem] = useState<number | null>(null);
  const [videoUrlMasc, setVideoUrlMasc] = useState<string | null>(null);
  const [videoUrlFem, setVideoUrlFem] = useState<string | null>(null);
  const [videoPreviewMasc, setVideoPreviewMasc] = useState<string | null>(null);
  const [videoPreviewFem, setVideoPreviewFem] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fileInputMascRef = useRef<HTMLInputElement>(null);
  const fileInputFemRef = useRef<HTMLInputElement>(null);

  // Load Categories & Exercises
  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [catsRes, exsRes, adjustmentsRes] = await Promise.all([
        dbService.getCategorias(),
        supabase.from('exercicios').select('*').or(`personal_id.is.null,personal_id.eq.${user.id}`),
        supabase.from('exercicios_ajustes').select('*').eq('personal_id', user.id)
      ]);
      
      if (catsRes.data) setCategorias(catsRes.data);
      
      if (exsRes.data) {
        const adjustedExs = exsRes.data.map((ex: any) => {
          const ajuste = (adjustmentsRes.data || []).find((a: any) => a.exercicio_id === ex.id);
          return { ...ex, ajuste };
        });
        setExercicios(adjustedExs);
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpsertAjuste = async (exId: string, updates: { categoria_id?: string | null, oculto?: boolean }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('exercicios_ajustes')
        .upsert({
          exercicio_id: exId,
          personal_id: user.id,
          ...updates
        }, { onConflict: 'personal_id,exercicio_id' });

      if (error) throw error;
      
      setFeedback('Alterado apenas na sua biblioteca');
      setTimeout(() => setFeedback(null), 3000);
      loadData();
    } catch (err: any) {
      console.error('Erro ao ajustar exercício:', err);
      setUploadError(err.message);
    }
  };

  const handleDuplicarExercicio = async (ex: Exercicio) => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('exercicios')
        .insert({
          nome: `${ex.nome} (Cópia)`,
          categoria_id: ex.ajuste?.categoria_id || ex.categoria_id,
          personal_id: user.id,
          musculo_primario: ex.musculo_primario,
          musculo_secundario: ex.musculo_secundario,
          dicas: ex.dicas,
          video_url_masc: ex.video_url_masc,
          video_url_fem: ex.video_url_fem,
          equipamento: ex.equipamento,
          impacto: ex.impacto,
          publico_alvo: ex.publico_alvo,
          contraindicacoes: ex.contraindicacoes
        })
        .select()
        .single();

      if (error) throw error;
      
      setFeedback('Exercício duplicado para sua biblioteca');
      setTimeout(() => setFeedback(null), 3000);
      loadData();
    } catch (err: any) {
      console.error('Erro ao duplicar exercício:', err);
      setUploadError(err.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync previews for existing videos
  useEffect(() => {
    if (!selectedExercicio) {
      setVideoPreviewMasc(null);
      setVideoPreviewFem(null);
      return;
    }

    setVideoPreviewMasc(dbService.getExerciseVideoUrl(selectedExercicio.video_url_masc));
    setVideoPreviewFem(dbService.getExerciseVideoUrl(selectedExercicio.video_url_fem));
  }, [selectedExercicio]);

  // Handle Edit click
  const handleEdit = (ex: Exercicio) => {
    setSelectedExercicio(ex);
    setNome(ex.nome);
    setCategoriaId(ex.categoria_id);
    setMusculoPrimario(ex.musculo_primario || []);
    setMusculoSecundario(ex.musculo_secundario || []);
    setDicas(ex.dicas || []);
    setVideoUrlMasc(ex.video_url_masc || null);
    setVideoUrlFem(ex.video_url_fem || null);
    setPublicoAlvo(ex.publico_alvo || []);
    setContraindicacoes(ex.contraindicacoes || []);
    setImpacto(ex.impacto || null);
    setEquipamento(ex.equipamento || '');
    setUploadError(null);
    setUploadProgressMasc(null);
    setUploadProgressFem(null);
  };

  // Handle "+ Monte Seu Exercício" click
  const handleNew = () => {
    const newId = 'ex-' + Math.random().toString(36).substring(2, 9);
    setSelectedExercicio({
      id: newId,
      nome: '',
      categoria_id: categorias[0]?.id || '',
      personal_id: null,
      video_url_masc: null,
      video_url_fem: null,
      musculo_primario: [],
      musculo_secundario: [],
      dicas: [],
      publico_alvo: [],
      contraindicacoes: [],
      impacto: null,
      equipamento: ''
    });
    setNome('');
    setCategoriaId(categorias[0]?.id || '');
    setMusculoPrimario([]);
    setMusculoSecundario([]);
    setDicas([]);
    setVideoUrlMasc(null);
    setVideoUrlFem(null);
    setVideoPreviewMasc(null);
    setVideoPreviewFem(null);
    setPublicoAlvo([]);
    setContraindicacoes([]);
    setImpacto(null);
    setEquipamento('');
    setUploadError(null);
    setUploadProgressMasc(null);
    setUploadProgressFem(null);
  };

  // Helper to generate a clean URL/storage path slug
  const getSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Handle file select & upload
  const handleVideoUpload = async (file: File, gender: 'masc' | 'fem') => {
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('O arquivo excede o limite recomendado de 50MB. Comprima-o antes do envio.');
      return;
    }
    if (!file.type.startsWith('video/')) {
      setUploadError('Formato inválido. Por favor, envie apenas arquivos de vídeo (MP4, WEBM).');
      return;
    }

    setUploadError(null);
    const setProgress = gender === 'masc' ? setUploadProgressMasc : setUploadProgressFem;
    const setUrl = gender === 'masc' ? setVideoUrlMasc : setVideoUrlFem;
    const setPreview = gender === 'masc' ? setVideoPreviewMasc : setVideoPreviewFem;

    setProgress(10);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev === null) return null;
        if (prev >= 90) return prev;
        return prev + 15;
      });
    }, 200);

    try {
      const isNew = !selectedExercicio?.id || String(selectedExercicio.id).startsWith('ex-');
      let id_exercicio: any = isNew ? null : selectedExercicio!.id;

      if (isSupabaseConfigured && supabase) {
        // Descobre o personal logado (obrigatório: exercicios.personal_id deve ser = auth.uid())
        const { data: userData } = await supabase.auth.getUser();
        const personalId = userData?.user?.id;
        if (!personalId) {
          setUploadError('Sessão expirada. Faça login novamente para enviar vídeos.');
          setProgress(null);
          clearInterval(interval);
          return;
        }

        if (isNew) {
          const { data: inserted, error: insErr } = await supabase
            .from('exercicios')
            .insert({
              nome: nome.trim() || 'Monte Seu Exercício',
              categoria_id: Number(categoriaId),
              personal_id: personalId,
              musculo_primario: musculoPrimario || [],
              musculo_secundario: musculoSecundario || [],
              dicas: dicas || []
            })
            .select()
            .single();

          if (insErr || !inserted) {
            console.error('Erro ao criar exercício antes do upload:', insErr);
            setUploadError(`Erro ao preparar o exercício no banco: ${insErr?.message || 'Erro'}`);
            setProgress(null);
            clearInterval(interval);
            return;
          }
          id_exercicio = inserted.id;
          setSelectedExercicio(inserted);
        } else {
          await supabase
            .from('exercicios')
            .update({
              nome: nome.trim() || 'Monte Seu Exercício',
              categoria_id: Number(categoriaId),
              personal_id: personalId,
              musculo_primario: musculoPrimario || [],
              musculo_secundario: musculoSecundario || [],
              dicas: dicas || []
            })
            .eq('id', id_exercicio);
        }

        if (!id_exercicio) {
          console.error('ID do exercício inválido para persistência de vídeo.');
          setUploadError('Erro: Identificador do exercício inválido para salvar o vídeo.');
          setProgress(null);
          clearInterval(interval);
          return;
        }

        const selectedCat = categorias.find((c) => c.id === categoriaId);
        const catSlug = selectedCat ? selectedCat.slug : 'geral';
        const caminho = gender === 'masc'
          ? `${catSlug}/${id_exercicio}-masc.mp4`
          : `${catSlug}/${id_exercicio}-fem.mp4`;

        const { error: uploadErr } = await supabase.storage
          .from('exercicios')
          .upload(caminho, file, { upsert: true, cacheControl: '3600' });

        if (uploadErr) {
          console.error('Erro de upload:', uploadErr);
          setUploadError(`Erro ao enviar vídeo: ${uploadErr.message || 'Falha no servidor'}`);
          setProgress(null);
          clearInterval(interval);
          return;
        }

        const dbField = gender === 'masc' ? 'video_url_masc' : 'video_url_fem';
        const { error: updError } = await supabase
          .from('exercicios')
          .update({ [dbField]: caminho })
          .eq('id', id_exercicio)
          .select();

        if (updError) {
          console.error('Erro ao persistir caminho do vídeo:', updError);
          setUploadError(`Erro ao salvar caminho do vídeo no banco: ${updError.message || 'Erro'}`);
          setProgress(null);
          clearInterval(interval);
          return;
        }

        const { data: selectData, error: selectErr } = await supabase
          .from('exercicios')
          .select('*')
          .eq('id', id_exercicio)
          .single();

        if (selectErr || !selectData) {
          console.error('Erro ao verificar gravação:', selectErr);
          setUploadError(`Erro ao confirmar gravação do vídeo: ${selectErr?.message || 'Erro'}`);
          setProgress(null);
          clearInterval(interval);
          return;
        }

        const verifiedPath = gender === 'masc' ? selectData.video_url_masc : selectData.video_url_fem;
        if (!verifiedPath) {
          setUploadError('Erro: O campo de vídeo continua vazio após atualização no banco de dados.');
          setProgress(null);
          clearInterval(interval);
          return;
        }

        setProgress(100);
        setUrl(verifiedPath);
        setPreview(URL.createObjectURL(file));
        setSelectedExercicio(selectData);
        setVideoUrlMasc(selectData.video_url_masc || null);
        setVideoUrlFem(selectData.video_url_fem || null);

        if (selectData.video_url_masc) {
          setVideoPreviewMasc(dbService.getExerciseVideoUrl(selectData.video_url_masc));
        }
        if (selectData.video_url_fem) {
          setVideoPreviewFem(dbService.getExerciseVideoUrl(selectData.video_url_fem));
        }

        await loadData();
      } else {
        const mockId = id_exercicio || 'ex-' + Math.random().toString(36).substring(2, 9);
        const selectedCat = categorias.find((c) => c.id === categoriaId);
        const catSlug = selectedCat ? selectedCat.slug : 'geral';
        const caminho = gender === 'masc' ? `${catSlug}/${mockId}-masc.mp4` : `${catSlug}/${mockId}-fem.mp4`;
        const dbField = gender === 'masc' ? 'video_url_masc' : 'video_url_fem';

        const { error: updateErr } = await dbService.updateExercicioVideo(mockId, dbField, caminho);
        if (updateErr) {
          setUploadError(`Erro ao persistir caminho mock: ${updateErr.message}`);
          setProgress(null);
          clearInterval(interval);
          return;
        }

        setProgress(100);
        setUrl(caminho);
        setPreview(URL.createObjectURL(file));
      }

      setTimeout(() => setProgress(null), 1500);
    } catch (err: any) {
      clearInterval(interval);
      console.error('Erro no upload de vídeo:', err);
      setUploadError(`Erro no upload: ${err.message || 'Ocorreu uma exceção inesperada'}`);
      setProgress(null);
    }
  };

  // Add muscle tag
  const addMuscleTag = (type: 'primario' | 'secundario', tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    
    if (type === 'primario') {
      if (!musculoPrimario.includes(trimmed)) {
        setMusculoPrimario([...musculoPrimario, trimmed]);
      }
      setNewPrimario('');
    } else {
      if (!musculoSecundario.includes(trimmed)) {
        setMusculoSecundario([...musculoSecundario, trimmed]);
      }
      setNewSecundario('');
    }
  };

  // Remove muscle tag
  const removeMuscleTag = (type: 'primario' | 'secundario', tag: string) => {
    if (type === 'primario') {
      setMusculoPrimario(musculoPrimario.filter((m) => m !== tag));
    } else {
      setMusculoSecundario(musculoSecundario.filter((m) => m !== tag));
    }
  };

  // Add Execution Tip
  const addDica = () => {
    if (!newDica.trim()) return;
    setDicas([...dicas, newDica.trim()]);
    setNewDica('');
  };

  // Remove Execution Tip
  const removeDica = (index: number) => {
    setDicas(dicas.filter((_, idx) => idx !== index));
  };

  // Save Exercise
  const handleSave = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (saving) return;
    if (!nome.trim() || !categoriaId) {
      setUploadError("Nome e Categoria são obrigatórios.");
      return;
    }

    setSaving(true);
    setUploadError(null);
    setFeedback(null);
    try {
      // 1. Commit any pending text from inputs to the final arrays
      let finalPrimarios = [...musculoPrimario];
      if (newPrimario.trim()) {
        const val = newPrimario.trim();
        if (!finalPrimarios.includes(val)) {
          finalPrimarios.push(val);
        }
        setMusculoPrimario(prev => !prev.includes(val) ? [...prev, val] : prev);
        setNewPrimario('');
      }

      let finalAuxiliares = [...musculoSecundario];
      if (newSecundario.trim()) {
        const val = newSecundario.trim();
        if (!finalAuxiliares.includes(val)) {
          finalAuxiliares.push(val);
        }
        setMusculoSecundario(prev => !prev.includes(val) ? [...prev, val] : prev);
        setNewSecundario('');
      }

      let finalDicas = [...dicas];
      if (newDica.trim()) {
        const val = newDica.trim();
        finalDicas.push(val);
        setDicas(prev => [...prev, val]);
        setNewDica('');
      }

      if (isSupabaseConfigured && supabase) {
        const isNew = !selectedExercicio?.id || String(selectedExercicio.id).startsWith('ex-');
        
        let query;
        if (isNew) {
          const { data: userData } = await supabase.auth.getUser();
          const personalId = userData?.user?.id || null;

          query = supabase.from("exercicios").insert({
            nome: nome.trim(),
            categoria_id: Number(categoriaId),
            musculo_primario: finalPrimarios,
            musculo_secundario: finalAuxiliares,
            dicas: finalDicas,
            video_url_masc: videoUrlMasc || null,
            video_url_fem: videoUrlFem || null,
            personal_id: personalId,
            publico_alvo: publicoAlvo,
            contraindicacoes: contraindicacoes,
            impacto: impacto || null,
            equipamento: equipamento.trim() || null
          });
        } else {
          query = supabase.from("exercicios").update({
            nome: nome.trim(),
            categoria_id: Number(categoriaId),
            musculo_primario: finalPrimarios,
            musculo_secundario: finalAuxiliares,
            dicas: finalDicas,
            video_url_masc: videoUrlMasc || null,
            video_url_fem: videoUrlFem || null,
            publico_alvo: publicoAlvo,
            contraindicacoes: contraindicacoes,
            impacto: impacto || null,
            equipamento: equipamento.trim() || null
          }).eq("id", selectedExercicio.id);
        }

        const { data, error } = await query.select();

        if (error) {
          throw error;
        }

        if (!data || data.length === 0) {
          throw new Error("Nenhum registro foi alterado ou retornado.");
        }
      } else {
        // Fallback for Mock Mode
        const payload: Partial<Exercicio> = {
          id: selectedExercicio?.id || `ex-${Date.now()}`,
          nome: nome.trim(),
          categoria_id: categoriaId,
          personal_id: selectedExercicio?.personal_id || null,
          video_url_masc: videoUrlMasc,
          video_url_fem: videoUrlFem,
          musculo_primario: finalPrimarios,
          musculo_secundario: finalAuxiliares,
          dicas: finalDicas,
          publico_alvo: publicoAlvo,
          contraindicacoes: contraindicacoes,
          impacto: impacto,
          equipamento: equipamento.trim() || null
        };

        const { error } = await dbService.saveExercicio(payload);
        if (error) {
          setUploadError(`Erro ao salvar exercício localmente: ${error.message || 'Conexão indisponível'}`);
          return;
        }
      }

      // Success
      await loadData();
      setSelectedExercicio(null);
      setFeedback("Exercício salvo!");
      // Automatically clear feedback after 5 seconds
      setTimeout(() => setFeedback(null), 5000);

    } catch (err: any) {
      console.error('Erro ao salvar exercício:', err);
      setUploadError(`Erro ao salvar: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  // Filter exercises
  const filteredExercicios = exercicios.filter((ex) => {
    const categoriaEfetiva = ex.ajuste?.categoria_id ?? ex.categoria_id;
    const isOculto = ex.ajuste?.oculto === true;

    const matchesSearch = ex.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.musculo_primario.some((m) => m.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategoryFilter === 'todos' || categoriaEfetiva === selectedCategoryFilter;
    
    // Filtro de visibilidade
    if (!mostrarOcultos && isOculto) return false;

    return matchesSearch && matchesCategory;
  });

  return (
    <div id="gerenciar-exercicios-root" className="space-y-6">
      <AnimatePresence mode="wait">
        {!selectedExercicio ? (
          /* TELA 1: LISTA DE EXERCÍCIOS ADMIN */
          <motion.div
            key="admin-list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Header / Top actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  id="btn-admin-back"
                  type="button"
                  onClick={onBack}
                  className="z-btn z-btn--ghost z-btn--icon"
                >
                  <ChevronLeft className="w-5 h-5 text-accent" strokeWidth={1.75} />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] uppercase tracking-wider font-semibold font-mono bg-accent/15 text-accent px-2.5 py-0.5 rounded border border-accent/20">
                      Acervo
                    </span>
                    <h2 className="z-display text-ink"><span className="text-accent">Monte Seu Exercício</span></h2>
                  </div>
                  <p className="z-eyebrow mt-1">Biblioteca de Movimentos e Execuções</p>
                </div>
              </div>

              {!isReadOnly && (
                <button
                  id="btn-new-exercise"
                  type="button"
                  onClick={handleNew}
                  className="z-btn z-btn--primary"
                >
                  <Plus className="w-4.5 h-4.5" strokeWidth={1.75} />
                  <span>Monte Seu Exercício</span>
                </button>
              )}
            </div>

            {feedback && (
              <div id="success-feedback-banner" className="p-4 bg-ok/10 border border-ok/20 rounded-2xl flex gap-3 text-xs text-ok font-semibold">
                <Check className="w-5 h-5 shrink-0 text-ok" />
                <span>{feedback}</span>
              </div>
            )}

            {/* Quick stats & Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Search Bar */}
              <div className="z-search relative sm:col-span-2">
                <span className="z-search__icon">
                  <Search className="w-4.5 h-4.5 text-ink-3" strokeWidth={1.75} />
                </span>
                <input
                  id="admin-search-ex"
                  type="text"
                  placeholder="Buscar por nome ou músculo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="z-input !pl-11"
                />
              </div>

              {/* Category Filter */}
              <div className="flex gap-2">
                <select
                  id="admin-filter-category"
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="z-input cursor-pointer flex-1"
                >
                  <option value="todos">Todas as Categorias</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nome}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setMostrarOcultos(!mostrarOcultos)}
                  className={`z-btn z-btn--icon ${mostrarOcultos ? 'z-btn--primary' : 'z-btn--ghost'}`}
                  title={mostrarOcultos ? 'Ocultar exercícios desativados' : 'Mostrar exercícios ocultos'}
                >
                  {mostrarOcultos ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Exercises Admin Grid */}
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <span className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-mono text-ink-3">Carregando acervo de movimentos...</span>
                </div>
              </div>
            ) : filteredExercicios.length === 0 ? (
              <div className="z-card py-12 flex flex-col items-center justify-center text-center">
                <Dumbbell className="w-8 h-8 text-ink-3 stroke-[1.5] mb-3" />
                <p className="text-sm text-ink-2 max-w-md font-medium">
                  Nenhum exercício encontrado. Crie um novo exercício ou altere as opções de busca para começar a popular seu catálogo.
                </p>
              </div>
            ) : (
              <div className="z-card !p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-line bg-raise text-ink-3 text-[12px] h-14">
                        <th className="px-6 font-semibold align-middle">Nome</th>
                        <th className="px-6 font-semibold align-middle">Categoria</th>
                        <th className="px-6 text-center font-semibold align-middle">Vídeo masc</th>
                        <th className="px-6 text-center font-semibold align-middle">Vídeo fem</th>
                        <th className="px-6 text-right font-semibold align-middle">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/40">
                      {filteredExercicios.map((ex) => {
                        const categoriaEfetivaId = ex.ajuste?.categoria_id ?? ex.categoria_id;
                        const isOculto = ex.ajuste?.oculto === true;
                        const isGlobal = ex.personal_id === null;
                        const cat = categorias.find((c) => c.id === categoriaEfetivaId);
                        const originalCat = (ex.ajuste?.categoria_id && ex.ajuste.categoria_id !== ex.categoria_id) 
                          ? categorias.find(c => c.id === ex.categoria_id) 
                          : null;

                        return (
                          <tr
                            key={ex.id}
                            className={`h-14 hover:bg-raise/30 border-b border-line/40 transition-colors group ${isOculto ? 'opacity-40' : ''}`}
                          >
                            <td className="py-4 px-6 cursor-pointer" onClick={() => handleEdit(ex)}>
                              <div className="flex items-center gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-display font-semibold text-sm text-ink group-hover:text-accent transition-colors block">
                                      {ex.nome}
                                    </span>
                                    {isGlobal && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase tracking-tighter">
                                        Global
                                      </span>
                                    )}
                                    {ex.ajuste?.categoria_id && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-flame/10 text-flame border border-flame/20 font-bold uppercase tracking-tighter">
                                        Movido
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {ex.musculo_primario.slice(0, 2).map((m) => (
                                      <span
                                        key={m}
                                        className="text-[10px] px-2 py-0.5 rounded bg-accent/10 text-accent font-semibold border border-accent/20"
                                      >
                                        {m}
                                      </span>
                                    ))}
                                    {ex.musculo_primario.length > 2 && (
                                      <span className="text-[10px] px-2 py-0.5 rounded bg-raise text-ink-3 border border-line">
                                        +{ex.musculo_primario.length - 2}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex flex-col">
                                <span className="text-xs text-ink font-medium">
                                  {cat ? cat.nome : 'Sem categoria'}
                                </span>
                                {originalCat && (
                                  <span className="text-[10px] text-ink-3 line-through">
                                    Original: {originalCat.nome}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <div className="inline-flex items-center justify-center">
                                {ex.video_url_masc ? (
                                  <span className="text-[10px] font-semibold flex items-center gap-1 bg-ok/10 border border-ok/20 text-ok px-2 py-0.5 rounded-full">
                                    <Check className="w-3 h-3" strokeWidth={2.5} />
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium flex items-center gap-1 bg-white/5 text-ink-3 px-2 py-0.5 rounded-full border border-line">
                                    <X className="w-3 h-3 text-danger" />
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <div className="inline-flex items-center justify-center">
                                {ex.video_url_fem ? (
                                  <span className="text-[10px] font-semibold flex items-center gap-1 bg-ok/10 border border-ok/20 text-ok px-2 py-0.5 rounded-full">
                                    <Check className="w-3 h-3" strokeWidth={2.5} />
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium flex items-center gap-1 bg-white/5 text-ink-3 px-2 py-0.5 rounded-full border border-line">
                                    <X className="w-3 h-3 text-danger" />
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-right relative">
                              <div className="flex justify-end items-center gap-2">
                                {!isGlobal && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEdit(ex);
                                    }}
                                    className="text-[11px] font-bold text-accent hover:underline"
                                  >
                                    Editar
                                  </button>
                                )}
                                
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(openMenuId === ex.id ? null : ex.id);
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-white/10 text-ink-3 hover:text-ink transition-all"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>

                                  <AnimatePresence>
                                    {openMenuId === ex.id && (
                                      <>
                                        <div 
                                          className="fixed inset-0 z-40" 
                                          onClick={() => setOpenMenuId(null)}
                                        />
                                        <motion.div
                                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                          animate={{ opacity: 1, scale: 1, y: 0 }}
                                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                          className="absolute right-0 mt-2 w-52 bg-surface-2 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                                        >
                                          <div className="p-1.5 space-y-0.5">
                                            <button
                                              onClick={() => {
                                                setMovingExId(ex.id);
                                                setOpenMenuId(null);
                                              }}
                                              className="w-full text-left px-3 py-2 rounded-xl text-[12px] font-medium text-ink-2 hover:bg-white/5 hover:text-ink flex items-center gap-2 transition-all"
                                            >
                                              <Move className="w-4 h-4 text-accent" />
                                              <span>Mover para outra categoria</span>
                                            </button>

                                            {ex.ajuste?.categoria_id && (
                                              <button
                                                onClick={() => {
                                                  handleUpsertAjuste(ex.id, { categoria_id: null });
                                                  setOpenMenuId(null);
                                                }}
                                                className="w-full text-left px-3 py-2 rounded-xl text-[12px] font-medium text-ink-2 hover:bg-white/5 hover:text-ink flex items-center gap-2 transition-all"
                                              >
                                                <RotateCcw className="w-4 h-4 text-accent" />
                                                <span>Restaurar categoria original</span>
                                              </button>
                                            )}

                                            {isOculto ? (
                                              <button
                                                onClick={() => {
                                                  handleUpsertAjuste(ex.id, { oculto: false });
                                                  setOpenMenuId(null);
                                                }}
                                                className="w-full text-left px-3 py-2 rounded-xl text-[12px] font-medium text-ink-2 hover:bg-white/5 hover:text-ink flex items-center gap-2 transition-all"
                                              >
                                                <Eye className="w-4 h-4 text-ok" />
                                                <span>Restaurar (Mostrar)</span>
                                              </button>
                                            ) : (
                                              <button
                                                onClick={() => {
                                                  handleUpsertAjuste(ex.id, { oculto: true });
                                                  setOpenMenuId(null);
                                                }}
                                                className="w-full text-left px-3 py-2 rounded-xl text-[12px] font-medium text-ink-2 hover:bg-white/5 hover:text-ink flex items-center gap-2 transition-all"
                                              >
                                                <EyeOff className="w-4 h-4 text-danger" />
                                                <span>Ocultar da minha biblioteca</span>
                                              </button>
                                            )}

                                            {isGlobal && (
                                              <button
                                                onClick={() => {
                                                  handleDuplicarExercicio(ex);
                                                  setOpenMenuId(null);
                                                }}
                                                className="w-full text-left px-3 py-2 rounded-xl text-[12px] font-medium text-ink-2 hover:bg-white/5 hover:text-ink flex items-center gap-2 transition-all"
                                              >
                                                <Copy className="w-4 h-4 text-violet" />
                                                <span>Duplicar para minha biblioteca</span>
                                              </button>
                                            )}
                                          </div>
                                        </motion.div>
                                      </>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          /* TELA 2: FORMULÁRIO DE CRIAR / EDITAR EXERCÍCIO */
          <motion.div
            key="admin-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Form Header */}
            <div className="flex items-center justify-between">
              <button
                id="btn-form-back"
                type="button"
                onClick={() => setSelectedExercicio(null)}
                className="py-2 px-3 rounded-xl border border-white/5 hover:border-white/10 bg-surface-2 hover:bg-surface-3 text-sm font-medium flex items-center gap-1.5 text-ink-2 hover:text-ink transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-flame" />
                <span>Cancelar</span>
              </button>

              <span className="text-[12px] text-ink-3 font-medium">
                {selectedExercicio.id && !String(selectedExercicio.id).startsWith('ex-') ? 'Editando exercício' : 'Monte Seu Exercício'}
              </span>
            </div>

            {/* Error alerts */}
            {uploadError && (
              <div className="p-4 bg-ember/15 border border-ember/20 rounded-2xl flex gap-3 text-xs text-ember-hover">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-12">
              {/* LEFT FORM COLUMN: METADATA & ARRAYS (7 cols) */}
              <div className="md:col-span-7 space-y-6">
                <div className="bg-surface border border-white/5 rounded-3xl p-6 space-y-4">
                  <h3 className="font-display font-medium text-base text-ink border-b border-white/5 pb-3">
                    Informações gerais
                  </h3>

                  {/* Nome do exercício */}
                  <div className="space-y-1">
                    <label className="text-[12px] text-ink-3 block">Nome do exercício</label>
                    <input
                      id="form-ex-name"
                      type="text"
                      required
                      placeholder="Ex: Leg Press 45º, Rosca Martelo..."
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="z-input"
                    />
                  </div>

                  {/* Dropdown Categoria */}
                  <div className="space-y-1">
                    <label className="text-[12px] text-ink-3 block">Categoria</label>
                    <select
                      id="form-ex-category"
                      required
                      value={categoriaId}
                      onChange={(e) => setCategoriaId(e.target.value)}
                      className="z-input cursor-pointer"
                    >
                      {categorias.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Equipamento */}
                  <div className="space-y-1">
                    <label className="text-[12px] text-ink-3 block">Equipamento</label>
                    <input
                      id="form-ex-equipment"
                      type="text"
                      placeholder="Ex: Barra, Halteres, Máquina Smith, Peso Corporal..."
                      value={equipamento}
                      onChange={(e) => setEquipamento(e.target.value)}
                      className="z-input"
                    />
                  </div>

                  {/* Impacto */}
                  <div className="space-y-1">
                    <label className="text-[12px] text-ink-3 block">Impacto articular</label>
                    <select
                      id="form-ex-impact"
                      value={impacto || ''}
                      onChange={(e) => setImpacto(e.target.value ? (e.target.value as 'baixo' | 'medio' | 'alto') : null)}
                      className="z-input cursor-pointer"
                    >
                      <option value="">Não informado</option>
                      <option value="baixo">Baixo impacto</option>
                      <option value="medio">Médio impacto</option>
                      <option value="alto">Alto impacto</option>
                    </select>
                  </div>

                  {/* Público-alvo */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-[12px] text-ink-3 block font-medium text-ink">Público-alvo sugerido</label>
                      <p className="text-[10px] text-ink-3">Grupos recomendados para o exercício (Ex: Gestantes, Idosos, Iniciantes).</p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-void/50 rounded-xl border border-white/5">
                      {publicoAlvo.length === 0 ? (
                        <span className="text-[11px] text-ink-3 italic self-center px-1">Nenhum público-alvo adicionado</span>
                      ) : (
                        publicoAlvo.map((tag) => (
                          <span
                            key={tag}
                            className="text-[11px] font-medium pl-2.5 pr-1 py-0.5 rounded-full bg-white/5 border border-white/10 text-ink-2 flex items-center gap-1"
                          >
                            <span>{tag}</span>
                            <button
                              type="button"
                              onClick={() => removePublicoTag(tag)}
                              className="p-0.5 text-ink-3 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        id="input-new-publico"
                        type="text"
                        placeholder="Adicionar público-alvo..."
                        value={newPublico}
                        onChange={(e) => setNewPublico(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            addPublicoTag(newPublico);
                          }
                        }}
                        className="z-input flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => addPublicoTag(newPublico)}
                        className="z-btn z-btn--ghost z-btn--sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Contraindicações */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-[12px] text-ink-3 block font-medium text-ink">Contraindicações</label>
                      <p className="text-[10px] text-ink-3">Restrições ou lesões impeditivas para o exercício (Ex: Lombalgia, Condromalácia).</p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-void/50 rounded-xl border border-white/5">
                      {contraindicacoes.length === 0 ? (
                        <span className="text-[11px] text-ink-3 italic self-center px-1">Nenhuma contraindicação adicionada</span>
                      ) : (
                        contraindicacoes.map((tag) => (
                          <span
                            key={tag}
                            className="text-[11px] font-medium pl-2.5 pr-1 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-1"
                          >
                            <span>{tag}</span>
                            <button
                              type="button"
                              onClick={() => removeContraindicacaoTag(tag)}
                              className="p-0.5 text-rose-400 hover:text-white rounded-full hover:bg-rose-500/20 transition-colors cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        id="input-new-contraindicacao"
                        type="text"
                        placeholder="Adicionar contraindicação..."
                        value={newContraindicacao}
                        onChange={(e) => setNewContraindicacao(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            addContraindicacaoTag(newContraindicacao);
                          }
                        }}
                        className="z-input flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => addContraindicacaoTag(newContraindicacao)}
                        className="z-btn z-btn--ghost z-btn--sm"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tags de Músculos */}
                <div className="bg-surface border border-white/5 rounded-3xl p-6 space-y-6">
                  {/* Primários */}
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-display font-medium text-sm text-ink">Músculos primários</h4>
                      <p className="text-[12px] text-ink-3 mt-0.5">Músculos que fazem o esforço principal do movimento.</p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-void/50 rounded-xl border border-white/5">
                      {musculoPrimario.length === 0 ? (
                        <span className="text-[12px] text-ink-3 italic self-center px-1">Nenhum músculo primário adicionado</span>
                      ) : (
                        musculoPrimario.map((tag) => (
                          <span
                            key={tag}
                            className="text-[12px] font-medium pl-2.5 pr-1 py-0.5 rounded-full bg-flame/10 border border-flame/20 text-flame flex items-center gap-1"
                          >
                            <span>{tag}</span>
                            <button
                              type="button"
                              onClick={() => removeMuscleTag('primario', tag)}
                              className="p-0.5 text-flame hover:text-white rounded-full hover:bg-flame/20 transition-colors cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        id="input-new-primario"
                        type="text"
                        placeholder="Adicionar músculo primário..."
                        value={newPrimario}
                        onChange={(e) => setNewPrimario(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            addMuscleTag('primario', newPrimario);
                          }
                        }}
                        className="z-input flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => addMuscleTag('primario', newPrimario)}
                        className="z-btn z-btn--ghost z-btn--sm"
                      >
                        +
                      </button>
                    </div>
                    {newPrimario.trim() && (
                      <span className="text-[12px] text-flame animate-pulse block mt-1">
                        Pressione Enter ou + para adicionar
                      </span>
                    )}
                  </div>

                  {/* Secundários */}
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-display font-medium text-sm text-ink">Músculos auxiliares</h4>
                      <p className="text-[12px] text-ink-3 mt-0.5">Sinergistas ou estabilizadores acionados.</p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-void/50 rounded-xl border border-white/5">
                      {musculoSecundario.length === 0 ? (
                        <span className="text-[12px] text-ink-3 italic self-center px-1">Nenhum músculo auxiliar adicionado</span>
                      ) : (
                        musculoSecundario.map((tag) => (
                          <span
                            key={tag}
                            className="text-[12px] font-medium pl-2.5 pr-1 py-0.5 rounded-full bg-white/5 border border-white/10 text-ink-2 flex items-center gap-1"
                          >
                            <span>{tag}</span>
                            <button
                              type="button"
                              onClick={() => removeMuscleTag('secundario', tag)}
                              className="p-0.5 text-ink-3 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        id="input-new-secundario"
                        type="text"
                        placeholder="Adicionar músculo auxiliar..."
                        value={newSecundario}
                        onChange={(e) => setNewSecundario(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            addMuscleTag('secundario', newSecundario);
                          }
                        }}
                        className="z-input flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => addMuscleTag('secundario', newSecundario)}
                        className="z-btn z-btn--ghost z-btn--sm"
                      >
                        +
                      </button>
                    </div>
                    {newSecundario.trim() && (
                      <span className="text-[12px] text-flame animate-pulse block mt-1">
                        Pressione Enter ou + para adicionar
                      </span>
                    )}
                  </div>

                  {/* Muscle suggestions helper */}
                  <div className="pt-2 border-t border-white/5">
                    <span className="text-[12px] text-ink-3 block mb-2">Sugestões rápidas (clique para adicionar):</span>
                    <div className="flex flex-wrap gap-1">
                      {COMMON_MUSCLES.map((muscle) => {
                        const isSelected = musculoPrimario.includes(muscle) || musculoSecundario.includes(muscle);
                        if (isSelected) return null;
                        return (
                          <button
                            key={muscle}
                            type="button"
                            onClick={() => addMuscleTag('primario', muscle)}
                            className="text-[9px] font-mono px-2 py-1 rounded bg-surface-3 border border-white/5 text-ink-2 hover:border-white/10 hover:text-ink transition-all cursor-pointer"
                          >
                            {muscle}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Dicas de Execução */}
                <div className="bg-surface border border-white/5 rounded-3xl p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <h4 className="font-display font-medium text-base text-ink">Dicas de execução</h4>
                    <span className="text-[12px] text-ink-3">{dicas.length} cadastradas</span>
                  </div>

                  {dicas.length === 0 ? (
                    <p className="text-xs text-ink-3 italic">Insira instruções claras sobre o posicionamento e a postura correta.</p>
                  ) : (
                    <ol className="space-y-2.5">
                      {dicas.map((dica, idx) => (
                        <li key={idx} className="flex gap-3 items-start p-2.5 bg-void/30 rounded-xl border border-white/5">
                          <span className="w-5 h-5 rounded bg-surface-3 flex items-center justify-center text-[12px] font-semibold text-flame shrink-0 mt-0.5 num">
                            {idx + 1}
                          </span>
                          <p className="text-xs text-ink-2 leading-relaxed flex-1 pt-0.5">{dica}</p>
                          <button
                            type="button"
                            onClick={() => removeDica(idx)}
                            className="text-ink-3 hover:text-ember p-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ol>
                  )}

                  <div className="flex gap-2">
                    <input
                      id="input-new-dica"
                      type="text"
                      placeholder="Ex: Desça de forma controlada até tocar de leve o peito..."
                      value={newDica}
                      onChange={(e) => setNewDica(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          addDica();
                        }
                      }}
                      className="z-input flex-1"
                    />
                    <button
                      type="button"
                      onClick={addDica}
                      className="z-btn z-btn--ghost z-btn--sm min-w-[80px]"
                    >
                      + Dica
                    </button>
                  </div>
                  {newDica.trim() && (
                    <span className="text-[10px] text-flame font-mono animate-pulse block mt-1">
                      Pressione Enter ou + para adicionar
                    </span>
                  )}
                </div>
              </div>

              {/* RIGHT FORM COLUMN: VIDEO UPLOADS & SAVE (5 cols) */}
              <div className="md:col-span-5 space-y-6">
                
                {/* UPLOAD MASCULINO */}
                <div className="bg-surface border border-white/5 rounded-3xl p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <div className="flex items-center gap-1.5">
                      <Film className="w-4 h-4 text-violet" />
                      <h4 className="font-display font-medium text-sm text-ink">Vídeo masculino</h4>
                    </div>
                    {selectedExercicio?.video_url_masc ? (
                      <span className="text-[12px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
                        MASC ✓
                      </span>
                    ) : (
                      <span className="text-[12px] text-ink-3 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                        MASC PENDENTE
                      </span>
                    )}
                  </div>

                  {/* Video preview / upload box */}
                  <div className="aspect-[9/16] w-full max-w-[260px] mx-auto rounded-2xl bg-void overflow-hidden relative border border-white/5 flex items-center justify-center">
                    {videoPreviewMasc ? (
                      <div className="relative w-full h-full">
                        <video
                          src={videoPreviewMasc}
                          loop
                          muted
                          playsInline
                          autoPlay
                          className="w-full h-full object-cover brightness-95"
                        />
                        <div className="absolute top-4 left-4 bg-void/80 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-1 flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-bold text-ink-2 shadow-xl pointer-events-none z-10">
                          <Sparkles className="w-3 h-3 text-flame animate-pulse" />
                          <span>Movimento Ilustrativo</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-6 space-y-2 text-ink-3">
                        <UploadCloud className="w-10 h-10 mx-auto stroke-1 text-ink-3 animate-pulse" />
                        <p className="text-[11px] font-medium text-ink-2">Arraste ou clique para enviar</p>
                        <p className="text-[9px] font-mono">Formatos: MP4, WEBM (Máx 50MB)</p>
                      </div>
                    )}

                    {/* Overlay progress bar */}
                    {uploadProgressMasc !== null && (
                      <div className="absolute inset-0 bg-void/90 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                        <Loader className="w-8 h-8 text-flame animate-spin mb-2" />
                        <span className="text-xs font-mono text-ink">Enviando vídeo: {uploadProgressMasc}%</span>
                        <div className="w-32 h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                          <div 
                            className="h-full bg-flame transition-all duration-300" 
                            style={{ width: `${uploadProgressMasc}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* File selectors */}
                  <input
                    type="file"
                    ref={fileInputMascRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleVideoUpload(file, 'masc');
                    }}
                    accept="video/*"
                    className="hidden"
                  />

                  <div className="flex gap-2">
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => fileInputMascRef.current?.click()}
                        className="w-full py-2.5 rounded-xl border border-white/5 bg-surface-2 hover:bg-surface-3 hover:border-white/10 text-xs font-semibold text-ink-2 hover:text-ink transition-colors flex items-center justify-center gap-1.5"
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>{videoUrlMasc ? 'Substituir Vídeo' : 'Escolher Vídeo'}</span>
                      </button>
                    )}
                    {!isReadOnly && videoUrlMasc && (
                      <button
                        type="button"
                        onClick={() => {
                          setVideoUrlMasc(null);
                          setVideoPreviewMasc(null);
                        }}
                        className="p-2.5 rounded-xl border border-white/5 bg-void text-ink-3 hover:text-ember transition-colors"
                        title="Remover vídeo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* UPLOAD FEMININO */}
                <div className="bg-surface border border-white/5 rounded-3xl p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <div className="flex items-center gap-1.5">
                      <Film className="w-4 h-4 text-flame" />
                      <h4 className="font-display font-medium text-sm text-ink">Vídeo feminino</h4>
                    </div>
                    {selectedExercicio?.video_url_fem ? (
                      <span className="text-[12px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
                        FEM ✓
                      </span>
                    ) : (
                      <span className="text-[12px] text-ink-3 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                        FEM PENDENTE
                      </span>
                    )}
                  </div>

                  {/* Video preview / upload box */}
                  <div className="aspect-[9/16] w-full max-w-[260px] mx-auto rounded-2xl bg-void overflow-hidden relative border border-white/5 flex items-center justify-center">
                    {videoPreviewFem ? (
                      <div className="relative w-full h-full">
                        <video
                          src={videoPreviewFem}
                          loop
                          muted
                          playsInline
                          autoPlay
                          className="w-full h-full object-cover brightness-95"
                        />
                        <div className="absolute top-4 left-4 bg-void/80 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-1 flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-bold text-ink-2 shadow-xl pointer-events-none z-10">
                          <Sparkles className="w-3 h-3 text-flame animate-pulse" />
                          <span>Movimento Ilustrativo</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-6 space-y-2 text-ink-3">
                        <UploadCloud className="w-10 h-10 mx-auto stroke-1 text-ink-3 animate-pulse" />
                        <p className="text-[11px] font-medium text-ink-2">Arraste ou clique para enviar</p>
                        <p className="text-[9px] font-mono">Formatos: MP4, WEBM (Máx 50MB)</p>
                      </div>
                    )}

                    {/* Overlay progress bar */}
                    {uploadProgressFem !== null && (
                      <div className="absolute inset-0 bg-void/90 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                        <Loader className="w-8 h-8 text-flame animate-spin mb-2" />
                        <span className="text-xs font-mono text-ink">Enviando vídeo: {uploadProgressFem}%</span>
                        <div className="w-32 h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                          <div 
                            className="h-full bg-flame transition-all duration-300" 
                            style={{ width: `${uploadProgressFem}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* File selectors */}
                  <input
                    type="file"
                    ref={fileInputFemRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleVideoUpload(file, 'fem');
                    }}
                    accept="video/*"
                    className="hidden"
                  />

                  <div className="flex gap-2">
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => fileInputFemRef.current?.click()}
                        className="w-full py-2.5 rounded-xl border border-white/5 bg-surface-2 hover:bg-surface-3 hover:border-white/10 text-xs font-semibold text-ink-2 hover:text-ink transition-colors flex items-center justify-center gap-1.5"
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>{videoUrlFem ? 'Substituir Vídeo' : 'Escolher Vídeo'}</span>
                      </button>
                    )}
                    {!isReadOnly && videoUrlFem && (
                      <button
                        type="button"
                        onClick={() => {
                          setVideoUrlFem(null);
                          setVideoPreviewFem(null);
                        }}
                        className="p-2.5 rounded-xl border border-white/5 bg-void text-ink-3 hover:text-ember transition-colors"
                        title="Remover vídeo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* SAVE ACTION CARD */}
                {!isReadOnly && (
                  <div className="bg-surface border border-white/5 rounded-3xl p-6 space-y-4">
                    <div className="bg-void/50 p-4 border border-white/5 rounded-2xl flex gap-2.5 text-[11px] text-ink-2 leading-relaxed">
                      <Info className="w-4.5 h-4.5 text-flame shrink-0 mt-0.5" />
                      <span>Os vídeos enviados vão direto para a biblioteca central. Todos os personais poderão usar e os alunos verão a execução imediatamente.</span>
                    </div>

                    <button
                      id="btn-save-exercise-submit"
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="w-full py-4 rounded-2xl brand-gradient-bg text-void text-sm font-semibold flex items-center justify-center gap-2 transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none shadow-[0_4px_20px_rgba(245,51,79,0.3)]"
                    >
                      {saving ? (
                        <>
                          <Loader className="w-4.5 h-4.5 animate-spin" />
                          <span>Gravando exercício...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4.5 h-4.5" />
                          <span>{selectedExercicio?.personal_id === null ? 'Enviar vídeos' : 'Salvar exercício'}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Movimentação de Categoria */}
      <AnimatePresence>
        {movingExId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMovingExId(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-surface-1 rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/5">
                <h3 className="text-lg font-display font-bold text-ink">Mover para Categoria</h3>
                <p className="text-xs text-ink-3 mt-1">Escolha o novo destino para este exercício</p>
              </div>
              <div className="p-2 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-1 gap-1">
                  {categorias.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        handleUpsertAjuste(movingExId, { categoria_id: cat.id });
                        setMovingExId(null);
                      }}
                      className="w-full text-left px-4 py-3 rounded-2xl text-sm font-medium text-ink-2 hover:bg-white/5 hover:text-accent flex items-center justify-between transition-all group"
                    >
                      <span>{cat.nome}</span>
                      <ChevronLeft className="w-4 h-4 opacity-0 group-hover:opacity-100 rotate-180 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-raise/50 flex justify-end border-t border-white/5">
                <button
                  onClick={() => setMovingExId(null)}
                  className="z-btn z-btn--ghost text-xs"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
