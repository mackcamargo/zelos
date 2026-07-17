import React, { useState, useEffect, useRef } from 'react';
import { dbService, supabase, isSupabaseConfigured } from '../lib/supabase';
import { Categoria, Exercicio } from '../types';
import { 
  ChevronLeft, Plus, Search, Check, X, Film, UploadCloud, 
  Trash2, Save, Info, Sparkles, Loader, AlertCircle, Dumbbell 
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
      const [catsRes, exsRes] = await Promise.all([
        dbService.getCategorias(),
        dbService.getAllExercicios()
      ]);
      
      if (catsRes.data) setCategorias(catsRes.data);
      if (exsRes.data) setExercicios(exsRes.data);
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch signed urls for previewing existing videos
  useEffect(() => {
    async function loadPreviews() {
      if (!selectedExercicio) {
        setVideoPreviewMasc(null);
        setVideoPreviewFem(null);
        return;
      }

      if (selectedExercicio.video_url_masc) {
        const resolved = await dbService.getSignedUrl(selectedExercicio.video_url_masc);
        setVideoPreviewMasc(resolved);
      } else {
        setVideoPreviewMasc(null);
      }

      if (selectedExercicio.video_url_fem) {
        const resolved = await dbService.getSignedUrl(selectedExercicio.video_url_fem);
        setVideoPreviewFem(resolved);
      } else {
        setVideoPreviewFem(null);
      }
    }
    loadPreviews();
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

  // Handle "+ Novo exercício" click
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
              nome: nome.trim() || 'Novo Exercício',
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
              nome: nome.trim() || 'Novo Exercício',
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
          setVideoPreviewMasc(await dbService.getSignedUrl(selectData.video_url_masc));
        }
        if (selectData.video_url_fem) {
          setVideoPreviewFem(await dbService.getSignedUrl(selectData.video_url_fem));
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
    const matchesSearch = ex.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.musculo_primario.some((m) => m.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategoryFilter === 'todos' || ex.categoria_id === selectedCategoryFilter;
    
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
                  className="p-2.5 rounded-xl border border-white/5 bg-surface-2 hover:bg-surface-3 text-ink-2 hover:text-ink transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5 text-flame" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] bg-flame/15 text-flame px-2.5 py-0.5 rounded-full border border-flame/20 font-semibold">
                      Admin
                    </span>
                    <h1 className="font-display font-semibold text-[20px] text-ink tracking-tight">Gestão de exercícios</h1>
                  </div>
                  <p className="text-xs text-ink-2 mt-0.5">Cadastre, edite dicas de execução e envie os vídeos das execuções.</p>
                </div>
              </div>

              {!isReadOnly && (
                <button
                  id="btn-new-exercise"
                  type="button"
                  onClick={handleNew}
                  className="py-2.5 px-4 rounded-xl brand-gradient-bg text-void text-xs font-semibold flex items-center justify-center gap-1.5 self-start sm:self-auto transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_4px_15px_rgba(245,51,79,0.3)]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo exercício</span>
                </button>
              )}
            </div>

            {feedback && (
              <div id="success-feedback-banner" className="p-4 bg-emerald-500/15 border border-emerald-500/20 rounded-2xl flex gap-3 text-xs text-emerald-400">
                <Check className="w-5 h-5 shrink-0 text-emerald-400" />
                <span>{feedback}</span>
              </div>
            )}

            {/* Quick stats & Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Search Bar */}
              <div className="relative sm:col-span-2">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
                <input
                  id="admin-search-ex"
                  type="text"
                  placeholder="Buscar por nome ou músculo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-surface border border-white/5 focus:border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-ink outline-none transition-all placeholder:text-ink-3"
                />
              </div>

              {/* Category Filter */}
              <select
                id="admin-filter-category"
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="w-full bg-surface border border-white/5 focus:border-white/10 rounded-xl px-3 py-3 text-xs text-ink-2 outline-none transition-all cursor-pointer"
              >
                <option value="todos">Todas as Categorias</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Exercises Admin Grid */}
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <span className="w-8 h-8 border-2 border-flame border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-mono text-ink-3">Carregando acervo de movimentos...</span>
                </div>
              </div>
            ) : filteredExercicios.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <Dumbbell className="w-8 h-8 text-ink-3 stroke-[1.2] mb-3" />
                <p className="text-sm text-ink-2 max-w-md">
                  Nenhum exercício encontrado. Crie um novo exercício ou altere as opções de busca para começar a popular seu catálogo.
                </p>
              </div>
            ) : (
              <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-surface-2 text-ink-3 text-[12px] h-14">
                        <th className="px-6 font-semibold align-middle">Nome</th>
                        <th className="px-6 font-semibold align-middle">Categoria</th>
                        <th className="px-6 text-center font-semibold align-middle">Vídeo masc</th>
                        <th className="px-6 text-center font-semibold align-middle">Vídeo fem</th>
                        <th className="px-6 text-right font-semibold align-middle">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredExercicios.map((ex) => {
                        const cat = categorias.find((c) => c.id === ex.categoria_id);
                        return (
                          <tr
                            key={ex.id}
                            className="h-14 hover:bg-surface-hover border-b border-white/5 transition-colors group cursor-pointer"
                            onClick={() => handleEdit(ex)}
                          >
                            <td className="py-4 px-6">
                              <div>
                                <span className="font-display font-semibold text-sm text-ink group-hover:text-flame transition-colors block">
                                  {ex.nome}
                                </span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {ex.musculo_primario.slice(0, 2).map((m) => (
                                    <span
                                      key={m}
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-violet/10 text-violet"
                                    >
                                      {m}
                                    </span>
                                  ))}
                                  {ex.musculo_primario.length > 2 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-ink-3">
                                      +{ex.musculo_primario.length - 2}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-xs text-ink-2 font-medium">
                                {cat ? cat.nome : 'Sem categoria'}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <div className="inline-flex items-center justify-center">
                                {ex.video_url_masc ? (
                                  <span className="text-[12px] font-medium flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                                    <Check className="w-3 h-3" />
                                    <span>Enviado</span>
                                  </span>
                                ) : (
                                  <span className="text-[12px] font-medium flex items-center gap-1 bg-white/5 text-ink-3 px-2 py-0.5 rounded-full border border-white/5">
                                    <X className="w-3 h-3 text-ember" />
                                    <span>Pendente</span>
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <div className="inline-flex items-center justify-center">
                                {ex.video_url_fem ? (
                                  <span className="text-[12px] font-medium flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                                    <Check className="w-3 h-3" />
                                    <span>Enviado</span>
                                  </span>
                                ) : (
                                  <span className="text-[12px] font-medium flex items-center gap-1 bg-white/5 text-ink-3 px-2 py-0.5 rounded-full border border-white/5">
                                    <X className="w-3 h-3 text-ember" />
                                    <span>Pendente</span>
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <span className="text-xs font-mono text-ink-3 group-hover:text-flame transition-colors font-medium">
                                Editar →
                              </span>
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
                {selectedExercicio.id && !String(selectedExercicio.id).startsWith('ex-') ? 'Editando exercício' : 'Novo exercício'}
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
                      className="w-full bg-void border border-white/5 focus:border-white/10 rounded-xl p-3 text-xs text-ink outline-none"
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
                      className="w-full bg-void border border-white/5 focus:border-white/10 rounded-xl p-3 text-xs text-ink outline-none cursor-pointer"
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
                      className="w-full bg-void border border-white/5 focus:border-white/10 rounded-xl p-3 text-xs text-ink outline-none"
                    />
                  </div>

                  {/* Impacto */}
                  <div className="space-y-1">
                    <label className="text-[12px] text-ink-3 block">Impacto articular</label>
                    <select
                      id="form-ex-impact"
                      value={impacto || ''}
                      onChange={(e) => setImpacto(e.target.value ? (e.target.value as 'baixo' | 'medio' | 'alto') : null)}
                      className="w-full bg-void border border-white/5 focus:border-white/10 rounded-xl p-3 text-xs text-ink outline-none cursor-pointer"
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
                        className="flex-1 bg-void border border-white/5 focus:border-white/10 rounded-xl px-3 py-2 text-xs text-ink outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => addPublicoTag(newPublico)}
                        className="py-2 px-4 rounded-xl border border-white/5 bg-surface-2 text-xs font-semibold text-ink hover:bg-surface-3 hover:border-white/10 transition-colors"
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
                        className="flex-1 bg-void border border-white/5 focus:border-white/10 rounded-xl px-3 py-2 text-xs text-ink outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => addContraindicacaoTag(newContraindicacao)}
                        className="py-2 px-4 rounded-xl border border-white/5 bg-surface-2 text-xs font-semibold text-ink hover:bg-surface-3 hover:border-white/10 transition-colors"
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
                        className="flex-1 bg-void border border-white/5 focus:border-white/10 rounded-xl px-3 py-2 text-xs text-ink outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => addMuscleTag('primario', newPrimario)}
                        className="py-2 px-4 rounded-xl border border-white/5 bg-surface-2 text-xs font-semibold text-ink hover:bg-surface-3 hover:border-white/10 transition-colors"
                      >
                        +
                      </button>
                    </div>
                    {newPrimario.trim() && (
                      <span className="text-[12px] text-[#F26A1B] animate-pulse block mt-1">
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
                        className="flex-1 bg-void border border-white/5 focus:border-white/10 rounded-xl px-3 py-2 text-xs text-ink outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => addMuscleTag('secundario', newSecundario)}
                        className="py-2 px-4 rounded-xl border border-white/5 bg-surface-2 text-xs font-semibold text-ink hover:bg-surface-3 hover:border-white/10 transition-colors"
                      >
                        +
                      </button>
                    </div>
                    {newSecundario.trim() && (
                      <span className="text-[12px] text-[#F26A1B] animate-pulse block mt-1">
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
                      className="flex-1 bg-void border border-white/5 focus:border-white/10 rounded-xl px-3 py-3 text-xs text-ink outline-none"
                    />
                    <button
                      type="button"
                      onClick={addDica}
                      className="py-3 px-4 rounded-xl border border-white/5 bg-surface-2 text-xs font-bold text-ink hover:bg-surface-3 hover:border-white/10 transition-colors"
                    >
                      + Dica
                    </button>
                  </div>
                  {newDica.trim() && (
                    <span className="text-[10px] text-[#F26A1B] font-mono animate-pulse block mt-1">
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
                      <video
                        src={videoPreviewMasc}
                        loop
                        muted
                        playsInline
                        autoPlay
                        className="w-full h-full object-cover brightness-95"
                      />
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
                      <video
                        src={videoPreviewFem}
                        loop
                        muted
                        playsInline
                        autoPlay
                        className="w-full h-full object-cover brightness-95"
                      />
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
                      <span>Ao salvar, os vídeos serão vinculados permanentemente à biblioteca centralizada. Todos os alunos terão acesso à execução imediata.</span>
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
                          <span>Salvar exercício</span>
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
    </div>
  );
}
