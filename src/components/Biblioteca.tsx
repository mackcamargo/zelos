import React, { useState, useEffect } from 'react';
import { dbService } from '../lib/supabase';
import { Categoria, Exercicio } from '../types';
import { BookOpen, Play, ChevronLeft, Award, Sparkles, Flame, Search, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BibliotecaProps {
  personalId: string | null;
  avatarTipo?: 'masculino' | 'feminino';
  isReadOnly?: boolean;
}

export default function Biblioteca({ personalId, avatarTipo = 'masculino', isReadOnly = false }: BibliotecaProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [selectedCategoria, setSelectedCategoria] = useState<Categoria | null>(null);
  const [selectedExercicio, setSelectedExercicio] = useState<Exercicio | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [loadingExercicios, setLoadingExercicios] = useState(false);
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});

  // Extended Filter States
  const [publicoAlvoFilter, setPublicoAlvoFilter] = useState('');
  const [semContraindicacaoFilter, setSemContraindicacaoFilter] = useState('');
  const [impactoFilter, setImpactoFilter] = useState<'' | 'baixo' | 'medio' | 'alto'>('');
  const [equipamentoFilter, setEquipamentoFilter] = useState('');

  // Fetch Categories on Mount
  useEffect(() => {
    async function fetchCats() {
      setLoadingCategorias(true);
      try {
        const { data, error } = await dbService.getCategorias();
        if (data && data.length > 0) {
          setCategorias(data);
          setSelectedCategoria(data[0]); // Default to first category
        }
      } catch (err) {
        console.error('Erro ao carregar categorias:', err);
      } finally {
        setLoadingCategorias(false);
      }
    }
    fetchCats();
  }, []);

  // Fetch Exercises whenever the selected category or filters change
  useEffect(() => {
    if (!selectedCategoria) return;

    async function fetchExs() {
      setLoadingExercicios(true);
      try {
        const filters = {
          publicoAlvo: publicoAlvoFilter || undefined,
          semContraindicacao: semContraindicacaoFilter || undefined,
          impacto: impactoFilter || undefined,
          equipamento: equipamentoFilter || undefined,
        };
        const { data, error } = await dbService.getExercicios(selectedCategoria!.id, personalId, filters);
        if (data) {
          setExercicios(data);
          
          // Request signed URLs for all exercises in parallel
          const isFemale = avatarTipo === 'feminino';
          const urlPromises = data.map(async (ex) => {
            const urlPath = isFemale
              ? (ex.video_url_fem || ex.video_url_masc)
              : (ex.video_url_masc || ex.video_url_fem);
            if (urlPath) {
              const resolved = await dbService.getSignedUrl(urlPath);
              return { id: ex.id, url: resolved };
            }
            return { id: ex.id, url: null };
          });

          const resolvedUrls = await Promise.all(urlPromises);
          const urlMap: Record<string, string> = {};
          resolvedUrls.forEach(({ id, url }) => {
            if (url) urlMap[id] = url;
          });
          setVideoUrls(urlMap);
        } else {
          setExercicios([]);
        }
      } catch (err) {
        console.error('Erro ao buscar exercícios:', err);
      } finally {
        setLoadingExercicios(false);
      }
    }

    fetchExs();
  }, [selectedCategoria, personalId, publicoAlvoFilter, semContraindicacaoFilter, impactoFilter, equipamentoFilter]);

  // Handle video autoplay fail-safes (especially for browsers restricting base64/signed media autoplay)
  const handleVideoRef = (el: HTMLVideoElement | null) => {
    if (el) {
      el.muted = true;
      el.play().catch((err) => {
        // Autoplay was prevented or video source not fully loaded yet.
        // This is safe to ignore as user interactions will wake up media.
      });
    }
  };

  // Filter exercises by search input
  const filteredExercicios = exercicios.filter((ex) =>
    ex.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.musculo_primario.some((m) => m.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div id="biblioteca-root" className="space-y-6">
      <AnimatePresence mode="wait">
        {!selectedExercicio ? (
          /* TELA 1 — LISTA DE EXERCÍCIOS */
          <motion.div
            key="list-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Top Info */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-[12px] font-medium text-violet bg-violet/10 border border-violet/20 px-2.5 py-1 rounded-full">
                  Biblioteca
                </span>
                <h1 className="font-semibold text-[28px] text-ink mt-2">Exercícios</h1>
                <p className="text-[14px] text-ink-2 mt-1">Busque movimentos e visualize a execução perfeita para os treinos.</p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
                <input
                  id="search-exercicios"
                  type="text"
                  placeholder="Buscar exercício..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="z-input !pl-9"
                />
              </div>
            </div>

            {/* Horizontal Scrollable Categories */}
            {loadingCategorias ? (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {[1, 2, 3, 4, 5].map((idx) => (
                  <div key={idx} className="h-9 w-24 bg-surface-2 rounded-full animate-pulse shrink-0" />
                ))}
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-6 px-6 sm:mx-0 sm:px-0">
                {categorias.map((cat) => {
                  const isSelected = selectedCategoria?.id === cat.id;
                  return (
                    <button
                      key={cat.id}
                      id={`cat-chip-${cat.slug}`}
                      type="button"
                      onClick={() => {
                        setSelectedCategoria(cat);
                        setSearchTerm('');
                      }}
                      className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wide whitespace-nowrap transition-all ${
                        isSelected
                          ? 'brand-gradient-bg text-void shadow-[0_4px_15px_rgba(245,51,79,0.3)]'
                          : 'bg-surface border border-white/5 text-ink-2 hover:text-ink hover:border-white/10'
                      }`}
                    >
                      {cat.nome}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Advanced Filters */}
            <div className="bg-surface border border-white/5 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              {/* Público-alvo */}
              <div className="space-y-1">
                <label className="text-[11px] text-ink-3 block font-medium">Público-alvo</label>
                <input
                  id="filter-publico-alvo"
                  type="text"
                  placeholder="Ex: Gestantes, Idosos..."
                  value={publicoAlvoFilter}
                  onChange={(e) => setPublicoAlvoFilter(e.target.value)}
                  className="z-input !h-9 !rounded-lg !p-2 !text-[11px]"
                />
              </div>

              {/* Sem Contraindicação para */}
              <div className="space-y-1">
                <label className="text-[11px] text-ink-3 block font-medium">Sem contraindicação para</label>
                <input
                  id="filter-contraindicacao"
                  type="text"
                  placeholder="Ex: Lombalgia, Condromalácia..."
                  value={semContraindicacaoFilter}
                  onChange={(e) => setSemContraindicacaoFilter(e.target.value)}
                  className="z-input !h-9 !rounded-lg !p-2 !text-[11px]"
                />
              </div>

              {/* Impacto Articular */}
              <div className="space-y-1">
                <label className="text-[11px] text-ink-3 block font-medium">Impacto articular</label>
                <select
                  id="filter-impacto"
                  value={impactoFilter}
                  onChange={(e) => setImpactoFilter(e.target.value as any)}
                  className="z-input cursor-pointer !h-9 !rounded-lg !p-2 !text-[11px]"
                >
                  <option value="">Todos</option>
                  <option value="baixo">Baixo impacto</option>
                  <option value="medio">Médio impacto</option>
                  <option value="alto">Alto impacto</option>
                </select>
              </div>

              {/* Equipamento */}
              <div className="space-y-1">
                <label className="text-[11px] text-ink-3 block font-medium">Equipamento</label>
                <input
                  id="filter-equipamento"
                  type="text"
                  placeholder="Ex: Halteres, Barra, Smith..."
                  value={equipamentoFilter}
                  onChange={(e) => setEquipamentoFilter(e.target.value)}
                  className="z-input !h-9 !rounded-lg !p-2 !text-[11px]"
                />
              </div>
            </div>

            {/* Exercises Grid */}
            {loadingExercicios ? (
              <div className="flex justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <span className="w-8 h-8 border-2 border-flame border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-ink-3">Buscando movimentos...</span>
                </div>
              </div>
            ) : filteredExercicios.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <BookOpen className="w-8 h-8 text-ink-3 stroke-[1.2] mb-3" />
                <p className="text-sm text-ink-2 max-w-md">
                  {searchTerm
                    ? 'Nenhum exercício encontrado. Experimente alterar o termo de busca ou escolha outra categoria.'
                    : 'Nenhum exercício cadastrado nesta categoria ainda.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredExercicios.map((ex, index) => {
                  const videoUrl = videoUrls[ex.id];
                  return (
                    <motion.div
                      key={ex.id}
                      id={`exercicio-card-${ex.id}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      onClick={() => setSelectedExercicio(ex)}
                      className="bg-surface border border-white/5 rounded-2xl p-4 hover:border-white/15 hover:bg-surface-2 transition-all cursor-pointer group flex flex-col gap-4 overflow-hidden clicavel"
                    >
                      {/* Video loop preview */}
                      <div className="aspect-video w-full rounded-xl bg-void overflow-hidden relative border border-white/5 flex items-center justify-center">
                        {videoUrl ? (
                          <video
                            ref={handleVideoRef}
                            src={videoUrl}
                            loop
                            muted
                            playsInline
                            autoPlay
                            className="w-full h-full object-cover brightness-90 group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-ink-3">
                            <Play className="w-8 h-8 text-ink-3 stroke-1" />
                            <span className="text-[10px]">Prévia em breve</span>
                          </div>
                        )}
                        <div className="absolute top-3 right-3 bg-void/80 backdrop-blur-md border border-white/5 rounded-lg px-2 py-1 flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-flame" />
                          <span className="text-[10px] text-ink-2 font-medium">Preview</span>
                        </div>
                      </div>

                      {/* Content block */}
                      <div className="space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-semibold text-base text-ink group-hover:text-flame transition-colors">
                            {ex.nome}
                          </h3>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {ex.musculo_primario.map((musc) => (
                              <span
                                key={musc}
                                className="text-[10px] font-medium px-2 py-0.5 rounded bg-violet/10 border border-violet/20 text-violet"
                              >
                                {musc}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                          <span className="text-[10px] text-ink-3 group-hover:text-ink transition-colors flex items-center gap-1">
                            Ver execução perfeita →
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          /* TELA 2 — DETALHE DO EXERCÍCIO */
          <motion.div
            key="detail-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="max-w-[480px] mx-auto w-full space-y-6"
          >
            {/* Back Header & Title */}
            <div className="space-y-4">
              <button
                id="btn-back-to-library"
                type="button"
                onClick={() => setSelectedExercicio(null)}
                className="py-2.5 px-4 rounded-xl border border-white/5 hover:border-white/10 bg-surface-2 hover:bg-surface-3 text-xs font-semibold flex items-center gap-2 text-ink-2 hover:text-ink transition-all cursor-pointer self-start"
              >
                <ChevronLeft className="w-4 h-4 text-flame" />
                <span>Voltar para lista</span>
              </button>

              <div className="space-y-2">
                <span className="text-[12px] font-medium text-violet bg-violet/10 border border-violet/20 px-2.5 py-1 rounded-full inline-block">
                  {selectedCategoria?.nome || 'Exercício'}
                </span>
                <h2 className="font-semibold text-[28px] text-ink tracking-tight pt-1">
                  {selectedExercicio.nome}
                </h2>
              </div>
            </div>

            {/* Video Container (9:16 vertical format, max-width 380px, centered) */}
            <div className="aspect-[9/16] w-full max-w-[380px] mx-auto rounded-3xl bg-surface border border-white/5 overflow-hidden relative shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex items-center justify-center">
              {videoUrls[selectedExercicio.id] ? (
                <video
                  ref={handleVideoRef}
                  src={videoUrls[selectedExercicio.id]}
                  loop
                  muted
                  playsInline
                  autoPlay
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-8 space-y-2">
                  <Play className="w-12 h-12 text-ink-3 stroke-1 mx-auto" />
                  <p className="text-[14px] text-ink-2">Prévia em breve</p>
                </div>
              )}
              <div className="absolute top-4 left-4 bg-void/80 backdrop-blur-md border border-white/10 rounded-full px-3.5 py-1.5 flex items-center gap-1.5 text-xs text-ink">
                <Sparkles className="w-4 h-4 text-flame animate-pulse" />
                <span>Movimento perfeito</span>
              </div>
            </div>

            {/* Muscle target card */}
            <div className="bg-surface border border-white/5 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Award className="w-5 h-5 text-flame" />
                <h4 className="font-semibold text-sm text-ink">Músculos alvos</h4>
              </div>
              
              <div className="space-y-4">
                <div>
                  <span className="text-[12px] text-ink-3 block mb-1.5">Foco primário</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedExercicio.musculo_primario.map((musc) => (
                      <span
                        key={musc}
                        className="text-xs font-semibold px-3 py-1 rounded-full bg-flame/10 border border-flame/20 text-flame"
                      >
                        {musc}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedExercicio.musculo_secundario.length > 0 && (
                  <div>
                    <span className="text-[12px] text-ink-3 block mb-1.5">Músculos auxiliares</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedExercicio.musculo_secundario.map((musc) => (
                        <span
                          key={musc}
                          className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10 text-ink-2"
                        >
                          {musc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Informações adicionais card */}
            {(selectedExercicio.equipamento || selectedExercicio.impacto || (selectedExercicio.publico_alvo && selectedExercicio.publico_alvo.length > 0) || (selectedExercicio.contraindicacoes && selectedExercicio.contraindicacoes.length > 0)) && (
              <div className="bg-surface border border-white/5 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <Info className="w-5 h-5 text-violet" />
                  <h4 className="font-semibold text-sm text-ink">Informações complementares</h4>
                </div>

                <div className="space-y-3 text-xs text-ink-2">
                  {selectedExercicio.equipamento && (
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-ink-3">Equipamento:</span>
                      <span className="font-medium text-ink">{selectedExercicio.equipamento}</span>
                    </div>
                  )}

                  {selectedExercicio.impacto && (
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-ink-3">Impacto articular:</span>
                      <span className={`font-semibold capitalize ${
                        selectedExercicio.impacto === 'alto' ? 'text-amber-400' :
                        selectedExercicio.impacto === 'medio' ? 'text-amber-200' : 'text-emerald-400'
                      }`}>{selectedExercicio.impacto}</span>
                    </div>
                  )}

                  {selectedExercicio.publico_alvo && selectedExercicio.publico_alvo.length > 0 && (
                    <div className="space-y-1.5 border-b border-white/5 pb-2">
                      <span className="text-ink-3 block">Indicado para:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedExercicio.publico_alvo.map((p) => (
                          <span key={p} className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedExercicio.contraindicacoes && selectedExercicio.contraindicacoes.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-ink-3 block">Contraindicado para:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedExercicio.contraindicacoes.map((c) => (
                          <span key={c} className="text-[10px] bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full font-medium">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Numbered tips block */}
            <div className="bg-surface border border-white/5 rounded-3xl p-6 space-y-4">
              <h3 className="font-semibold text-sm text-ink border-b border-white/5 pb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet" />
                Dicas de execução
              </h3>

              {selectedExercicio.dicas && selectedExercicio.dicas.length > 0 ? (
                <ol className="space-y-4">
                  {selectedExercicio.dicas.map((dica, idx) => (
                    <li key={idx} className="flex gap-3 items-start">
                      <span className="w-6 h-6 rounded-lg bg-surface-3 border border-white/5 flex items-center justify-center text-[12px] font-semibold text-flame shrink-0 mt-0.5 num">
                        {idx + 1}
                      </span>
                      <p className="text-xs text-ink-2 leading-relaxed pt-0.5">
                        {dica}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-ink-3 italic">Nenhuma dica cadastrada para este exercício.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
