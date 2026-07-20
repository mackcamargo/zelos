import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../lib/supabase';
import { FotoProgresso, AnguloFoto } from '../types';
import { 
  ChevronLeft, ChevronRight, Maximize2, 
  Calendar, Info, Loader2, Image as ImageIcon,
  MessageSquare, Save, Camera, Trash2, Plus, X, GitCompare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import FotoProgressoUpload from './FotoProgressoUpload';
import { tocar } from '../lib/som';

interface FotoProgressoGaleriaProps {
  alunoId: string;
  isPersonalView?: boolean;
}

export default function FotoProgressoGaleria({ alunoId, isPersonalView = false }: FotoProgressoGaleriaProps) {
  const [fotos, setFotos] = useState<FotoProgresso[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAngle, setActiveAngle] = useState<AnguloFoto>('frontal');
  const [showUpload, setShowUpload] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Lightbox / Modal states
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  // Before & After Slider states for Modal
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Personal observations
  const [editingObs, setEditingObs] = useState(false);
  const [tempObs, setTempObs] = useState('');

  useEffect(() => {
    loadFotos();
  }, [alunoId]);

  const loadFotos = async () => {
    setLoading(true);
    try {
      const { data } = await dbService.getFotosProgresso(alunoId);
      if (data) setFotos(data);
    } finally {
      setLoading(false);
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const position = ((x - rect.left) / rect.width) * 100;
    setSliderPos(Math.min(Math.max(position, 0), 100));
  };

  const filteredFotos = fotos.filter(f => f.angulo === activeAngle);
  // Mais recente primeiro
  const sortedFotos = [...filteredFotos].sort((a, b) => new Date(b.registrado_em).getTime() - new Date(a.registrado_em).getTime());

  // Mais antiga e mais recente para comparação
  const oldest = sortedFotos[sortedFotos.length - 1];
  const newest = sortedFotos[0];

  const handleSaveObs = async (id: number) => {
    await dbService.updateFotoObservacao(id, tempObs);
    setEditingObs(false);
    tocar('sucesso');
    loadFotos();
    // Atualiza a foto ativa no índice
    const updatedFotos = await dbService.getFotosProgresso(alunoId);
    if (updatedFotos.data) {
      setFotos(updatedFotos.data);
    }
  };

  const handleDeleteFoto = async (id: number) => {
    await dbService.deleteFotoProgresso(id);
    setDeletingId(null);
    setActivePhotoIndex(null);
    tocar('fechar');
    loadFotos();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 text-flame animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header controls (Sempre visível e compacto) */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Angle Selector */}
        <div className="flex p-0.5 bg-raise rounded-xl border border-line w-full sm:w-auto">
          {(['frontal', 'lateral', 'costas'] as AnguloFoto[]).map((a) => (
            <button
              key={a}
              onClick={() => {
                tocar('tap');
                setActiveAngle(a);
              }}
              className={`flex-1 sm:px-4 py-2 rounded-lg font-display font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                activeAngle === a 
                  ? 'bg-surface text-flame shadow-sm border border-line/50' 
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            tocar('abrir');
            setShowUpload(true);
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-surface hover:bg-raise border border-dashed border-line-strong rounded-xl text-[10px] font-bold text-ink transition-all cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5 text-flame" />
          <span>ADICIONAR FOTO</span>
        </button>
      </div>

      {/* Upload Modal overlay */}
      <AnimatePresence>
        {showUpload && (
          <FotoProgressoUpload
            alunoId={alunoId}
            personalId={null}
            onSuccess={() => {
              setShowUpload(false);
              loadFotos();
            }}
            onClose={() => setShowUpload(false)}
          />
        )}
      </AnimatePresence>

      {/* --- CONTEÚDO PRINCIPAL (EXIBIÇÃO SUPER COMPACTA) --- */}
      {sortedFotos.length > 0 ? (
        <div className="space-y-3">
          {/* FAIXA HORIZONTAL DE MINIATURAS */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
            {sortedFotos.map((foto, index) => (
              <button
                key={foto.id}
                onClick={() => {
                  tocar('abrir');
                  setActivePhotoIndex(index);
                  setShowComparison(false);
                  setEditingObs(false);
                  setTempObs(foto.observacao || '');
                }}
                className="group relative flex-col items-center gap-1.5 flex shrink-0 snap-start focus:outline-none cursor-pointer"
              >
                <div className="w-20 h-24 sm:w-24 sm:h-28 bg-void rounded-xl overflow-hidden border border-line group-hover:border-flame/50 transition-all relative shadow-sm">
                  <img 
                    src={foto.signed_url} 
                    alt={`Progresso ${new Date(foto.registrado_em).toLocaleDateString()}`} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                    referrerPolicy="no-referrer"
                  />
                  {index === 0 && (
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-flame text-white text-[8px] font-bold rounded-md">
                      ATUAL
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                    <Maximize2 className="w-4 h-4 text-white" />
                  </div>
                </div>
                <span className="text-[9px] font-mono text-ink-3">
                  {new Date(foto.registrado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </span>
              </button>
            ))}

            {/* CARD EXTRA DE COMPARAÇÃO RÁPIDA NA FAIXA SE HOUVER 2+ FOTOS */}
            {sortedFotos.length >= 2 && (
              <button
                onClick={() => {
                  tocar('abrir');
                  setShowComparison(true);
                  setActivePhotoIndex(null);
                }}
                className="group relative flex-col items-center gap-1.5 flex shrink-0 snap-start focus:outline-none cursor-pointer"
              >
                <div className="w-20 h-24 sm:w-24 sm:h-28 bg-flame/5 border border-dashed border-flame/30 hover:border-flame hover:bg-flame/10 rounded-xl flex flex-col items-center justify-center p-3 text-center transition-all shadow-sm">
                  <GitCompare className="w-5 h-5 text-flame mb-1" />
                  <span className="text-[9px] font-bold text-flame uppercase tracking-wider">Comparar</span>
                  <span className="text-[8px] text-ink-3">Antes/Depois</span>
                </div>
                <span className="text-[9px] font-mono text-ink-3">Slider</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ESTADO VAZIO: SUPER COMPACTO (Apenas uma linha) */
        <div className="flex items-center gap-2.5 bg-raise/20 border border-dashed border-line p-3 rounded-2xl text-xs text-ink-3">
          <ImageIcon className="w-4 h-4 text-flame shrink-0 opacity-80" />
          <span className="font-sans">Nenhuma foto <strong className="text-flame font-bold lowercase">{activeAngle}</strong> cadastrada ainda neste aluno.</span>
        </div>
      )}

      {/* --- MODAL / LIGHTBOX DE VISUALIZAÇÃO --- */}
      <AnimatePresence>
        {(activePhotoIndex !== null || showComparison) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-void/90 backdrop-blur-md"
              onClick={() => {
                tocar('fechar');
                setActivePhotoIndex(null);
                setShowComparison(false);
              }}
            />

            {/* Modal Container */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-surface border border-line rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              {/* Top Controls */}
              <div className="p-4 flex items-center justify-between border-b border-line bg-raise/10">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-flame" />
                  <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-ink-3">
                    {showComparison ? `Comparativo Antes e Depois` : `Visualização - ${activeAngle}`}
                  </span>
                </div>
                <button
                  onClick={() => {
                    tocar('fechar');
                    setActivePhotoIndex(null);
                    setShowComparison(false);
                  }}
                  className="p-1.5 rounded-full bg-raise hover:bg-line text-ink-3 hover:text-ink transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                
                {/* 1. MODO COMPARATIVO */}
                {showComparison && oldest && newest ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-ink-3">
                      <span className="flex items-center gap-1.5 bg-raise px-2.5 py-1 rounded-lg">
                        <div className="w-1.5 h-1.5 rounded-full bg-ink-3" />
                        Início: {new Date(oldest.registrado_em).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1.5 bg-flame/10 text-flame px-2.5 py-1 rounded-lg font-semibold">
                        <div className="w-1.5 h-1.5 rounded-full bg-flame" />
                        Atual: {new Date(newest.registrado_em).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Slider Comparison Area */}
                    <div 
                      ref={sliderRef} 
                      className="relative aspect-[3/4] bg-void rounded-2xl overflow-hidden border border-line cursor-col-resize select-none max-h-[50vh]"
                      onMouseDown={() => setIsDragging(true)} 
                      onMouseUp={() => setIsDragging(false)} 
                      onMouseLeave={() => setIsDragging(false)} 
                      onMouseMove={handleMove}
                      onTouchStart={() => setIsDragging(true)} 
                      onTouchEnd={() => setIsDragging(false)} 
                      onTouchMove={handleMove}
                    >
                      {/* Oldest */}
                      <img 
                        src={oldest.signed_url} 
                        alt="Mais antiga"
                        className="absolute inset-0 w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Newest (Foreground with clip) */}
                      <div 
                        className="absolute inset-0 w-full h-full overflow-hidden"
                        style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                      >
                        <img 
                          src={newest.signed_url} 
                          alt="Mais recente"
                          className="absolute inset-0 w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      {/* Slider Bar */}
                      <div 
                        className="absolute inset-y-0 w-1 brand-gradient-bg shadow-[0_0_15px_rgba(245,51,79,0.5)] z-20"
                        style={{ left: `${sliderPos}%` }}
                      >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg border border-line">
                          <div className="flex gap-0.5">
                            <div className="w-0.5 h-2.5 bg-void/30 rounded-full" />
                            <div className="w-0.5 h-2.5 bg-void/30 rounded-full" />
                          </div>
                        </div>
                      </div>

                      {/* Labels */}
                      <div className="absolute bottom-4 left-4 px-2 py-0.5 bg-void/70 backdrop-blur-sm rounded-md text-[8px] font-mono font-bold text-white uppercase tracking-wider">
                        Início
                      </div>
                      <div className="absolute bottom-4 right-4 px-2 py-0.5 bg-flame/80 backdrop-blur-sm rounded-md text-[8px] font-mono font-bold text-white uppercase tracking-wider">
                        Atual
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 2. MODO FOTO INDIVIDUAL COM DETALHES */
                  activePhotoIndex !== null && sortedFotos[activePhotoIndex] && (
                    <div className="space-y-4">
                      {/* Slider Navegação */}
                      <div className="relative aspect-[3/4] bg-void rounded-2xl overflow-hidden border border-line max-h-[50vh] flex items-center justify-center group">
                        <img 
                          src={sortedFotos[activePhotoIndex].signed_url} 
                          alt="Progresso ampliado"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />

                        {/* Navigation arrows */}
                        {activePhotoIndex < sortedFotos.length - 1 && (
                          <button
                            onClick={() => {
                              tocar('tap');
                              const nextIdx = activePhotoIndex + 1;
                              setActivePhotoIndex(nextIdx);
                              setEditingObs(false);
                              setTempObs(sortedFotos[nextIdx].observacao || '');
                            }}
                            className="absolute left-3 p-2 rounded-full bg-void/60 text-white hover:bg-void/80 cursor-pointer transition-all"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                        )}
                        {activePhotoIndex > 0 && (
                          <button
                            onClick={() => {
                              tocar('tap');
                              const prevIdx = activePhotoIndex - 1;
                              setActivePhotoIndex(prevIdx);
                              setEditingObs(false);
                              setTempObs(sortedFotos[prevIdx].observacao || '');
                            }}
                            className="absolute right-3 p-2 rounded-full bg-void/60 text-white hover:bg-void/80 cursor-pointer transition-all"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}

                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-void/60 backdrop-blur-sm rounded-full text-[9px] font-mono font-bold text-white flex items-center gap-1.5 border border-line/20">
                          <Calendar className="w-3 h-3 text-flame" />
                          {new Date(sortedFotos[activePhotoIndex].registrado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </div>
                      </div>

                      {/* Observations area */}
                      <div className="bg-raise/25 p-4 rounded-2xl border border-line space-y-2 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-ink-3 uppercase tracking-wider flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> Observações do Personal
                          </span>
                          {isPersonalView && !editingObs && (
                            <button
                              onClick={() => setEditingObs(true)}
                              className="text-[10px] text-flame hover:underline font-bold cursor-pointer"
                            >
                              Editar
                            </button>
                          )}
                        </div>

                        {editingObs ? (
                          <div className="space-y-2">
                            <textarea
                              value={tempObs}
                              onChange={(e) => setTempObs(e.target.value)}
                              placeholder="Adicione observações de evolução visual..."
                              className="w-full bg-surface border border-line focus:border-flame rounded-xl p-3 text-xs text-ink outline-none transition-all resize-none"
                              rows={3}
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditingObs(false)}
                                className="px-3 py-1.5 bg-line text-ink-2 hover:bg-line-strong rounded-lg text-[9px] font-bold cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => handleSaveObs(sortedFotos[activePhotoIndex].id)}
                                className="px-3 py-1.5 bg-flame hover:bg-flame-hover text-white rounded-lg text-[9px] font-bold cursor-pointer"
                              >
                                Salvar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className={`text-xs leading-relaxed ${sortedFotos[activePhotoIndex].observacao ? 'text-ink-2' : 'text-ink-3 italic'}`}>
                            {sortedFotos[activePhotoIndex].observacao || "Nenhuma observação cadastrada para esta data."}
                          </p>
                        )}
                      </div>

                      {/* Delete option */}
                      {isPersonalView && (
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => setDeletingId(sortedFotos[activePhotoIndex].id)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs text-rose-500 hover:text-rose-600 font-bold hover:bg-rose-500/10 rounded-xl cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Excluir Foto
                          </button>
                        </div>
                      )}
                    </div>
                  )
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation of Delete Modal inside Lightbox */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-void/85 backdrop-blur-sm"
              onClick={() => setDeletingId(null)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-surface border border-line rounded-[32px] p-6 shadow-2xl z-[61]"
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-rose-500" />
              </div>
              <h3 className="font-display font-bold text-lg text-ink text-center mb-2">Excluir Foto</h3>
              <p className="text-sm text-ink-3 text-center mb-6">
                Tem certeza que deseja excluir esta foto? Esta ação não pode ser desfeita.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setDeletingId(null)}
                  className="py-3 px-4 rounded-xl border border-line hover:bg-raise text-ink-2 text-xs font-bold transition-all cursor-pointer"
                >
                  CANCELAR
                </button>
                <button 
                  onClick={() => handleDeleteFoto(deletingId)}
                  className="py-3 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all shadow-lg shadow-rose-500/20"
                >
                  EXCLUIR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
