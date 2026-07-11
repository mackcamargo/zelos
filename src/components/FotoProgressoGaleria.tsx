import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../lib/supabase';
import { FotoProgresso, AnguloFoto } from '../types';
import { 
  ChevronLeft, ChevronRight, Maximize2, 
  Calendar, Info, Loader2, Image as ImageIcon,
  MessageSquare, Save, Camera, Trash2, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import FotoProgressoUpload from './FotoProgressoUpload';

interface FotoProgressoGaleriaProps {
  alunoId: string;
  isPersonalView?: boolean;
}

export default function FotoProgressoGaleria({ alunoId, isPersonalView = false }: FotoProgressoGaleriaProps) {
  const [fotos, setFotos] = useState<FotoProgresso[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAngle, setActiveAngle] = useState<AnguloFoto>('frontal');
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // For Personal to edit observation
  const [editingId, setEditingId] = useState<number | null>(null);
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
  const oldest = filteredFotos[filteredFotos.length - 1];
  const newest = filteredFotos[0];

  const handleSaveObs = async (id: number) => {
    await dbService.updateFotoObservacao(id, tempObs);
    setEditingId(null);
    loadFotos();
  };

  const handleDeleteFoto = async (id: number) => {
    await dbService.deleteFotoProgresso(id);
    setDeletingId(null);
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
    <div className="space-y-8">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        {/* Angle Selector */}
        <div className="flex p-1 bg-void rounded-2xl border border-white/5 w-full sm:w-auto">
          {(['frontal', 'lateral', 'costas'] as AnguloFoto[]).map((a) => (
            <button
              key={a}
              onClick={() => setActiveAngle(a)}
              className={`flex-1 sm:px-6 py-3 rounded-xl font-display font-bold text-[10px] uppercase tracking-widest transition-all ${
                activeAngle === a 
                  ? 'bg-surface-3 text-flame shadow-lg' 
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowUpload(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-void border border-dashed border-white/10 rounded-xl text-[10px] font-bold text-ink hover:text-white hover:border-white/20 transition-all"
        >
          <Camera className="w-3.5 h-3.5 text-flame" />
          <span>ADICIONAR FOTO</span>
        </button>
      </div>

      <AnimatePresence>
        {showUpload && (
          <FotoProgressoUpload
            alunoId={alunoId}
            personalId={null} // or pass personalId if needed
            onSuccess={() => {
              setShowUpload(false);
              loadFotos();
            }}
            onClose={() => setShowUpload(false)}
          />
        )}
      </AnimatePresence>

      {filteredFotos.length >= 2 ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="font-display font-bold text-sm text-ink">Comparativo Antes e Depois</h4>
            <div className="flex items-center gap-4 text-[10px] font-mono text-ink-3">
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-ink-3" />
                {new Date(oldest.registrado_em).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-flame" />
                {new Date(newest.registrado_em).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Slider Comparison */}
          <div 
            ref={sliderRef}
            className="relative aspect-[3/4] bg-void rounded-[40px] overflow-hidden border border-white/10 cursor-col-resize select-none"
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onMouseMove={handleMove}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => setIsDragging(false)}
            onTouchMove={handleMove}
          >
            {/* Oldest (Background) */}
            <img 
              src={oldest.signed_url} 
              alt="Mais antiga"
              className="absolute inset-0 w-full h-full object-cover"
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
              />
            </div>

            {/* Handle */}
            <div 
              className="absolute inset-y-0 w-1 brand-gradient-bg shadow-[0_0_20px_rgba(245,51,79,0.5)] z-20"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-2xl">
                <div className="flex gap-0.5">
                  <div className="w-0.5 h-3 bg-void/20 rounded-full" />
                  <div className="w-0.5 h-3 bg-void/20 rounded-full" />
                </div>
              </div>
            </div>

            {/* Labels */}
            <div className="absolute top-6 left-6 px-3 py-1 bg-void/60 backdrop-blur-md rounded-full text-[8px] font-mono font-bold text-white uppercase tracking-widest border border-white/10">
              Início
            </div>
            <div className="absolute top-6 right-6 px-3 py-1 bg-flame/80 backdrop-blur-md rounded-full text-[8px] font-mono font-bold text-white uppercase tracking-widest border border-flame/20">
              Atual
            </div>
          </div>
        </div>
      ) : filteredFotos.length === 1 ? (
        <div className="space-y-4">
          <div className="aspect-[3/4] bg-void rounded-[40px] overflow-hidden border border-white/10">
            <img 
              src={filteredFotos[0].signed_url} 
              alt="Foto registrada"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-xs text-ink-3 text-center italic">
            Registre mais fotos neste ângulo para habilitar o comparativo.
          </p>
        </div>
      ) : (
        <div className="aspect-[3/4] bg-void/30 rounded-[40px] border border-dashed border-white/5 flex flex-col items-center justify-center p-8 text-center">
          <ImageIcon className="w-12 h-12 text-ink-3 opacity-20 mb-4" />
          <p className="text-xs text-ink-3 font-medium">Nenhuma foto registrada para o ângulo <span className="text-flame font-bold">{activeAngle}</span>.</p>
        </div>
      )}

      {/* Timeline List */}
      <div className="space-y-4">
        <h4 className="font-display font-bold text-sm text-ink">Histórico de Fotos</h4>
        <div className="grid grid-cols-1 gap-4">
          {filteredFotos.map((foto) => (
            <div key={foto.id} className="bg-surface-2 border border-white/5 rounded-3xl p-4 flex gap-4 transition-all hover:border-white/10">
              <div className="w-24 h-32 bg-void rounded-2xl overflow-hidden shrink-0 border border-white/5">
                <img src={foto.signed_url} alt="Progresso" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-ink-3">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-xs font-mono">{new Date(foto.registrado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-flame uppercase tracking-widest">{foto.angulo}</span>
                    {isPersonalView && (
                      <button onClick={() => setDeletingId(foto.id)} className="text-ink-3 hover:text-rose-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                
                {editingId === foto.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={tempObs}
                      onChange={(e) => setTempObs(e.target.value)}
                      placeholder="Adicione uma observação..."
                      className="w-full bg-void border border-white/5 rounded-xl p-3 text-xs text-ink outline-none focus:border-flame/30"
                      rows={2}
                    />
                    <button 
                      onClick={() => handleSaveObs(foto.id)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-flame text-white rounded-lg text-[10px] font-bold"
                    >
                      <Save className="w-3.5 h-3.5" /> SALVAR
                    </button>
                  </div>
                ) : (
                  <div 
                    className="group relative cursor-pointer"
                    onClick={() => {
                      if (isPersonalView) {
                        setEditingId(foto.id);
                        setTempObs(foto.observacao || '');
                      }
                    }}
                  >
                    <p className={`text-xs leading-relaxed ${foto.observacao ? 'text-ink-2' : 'text-ink-3 italic'}`}>
                      {foto.observacao || (isPersonalView ? "Toque para adicionar observação..." : "Sem observações do personal.")}
                    </p>
                    {isPersonalView && (
                      <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MessageSquare className="w-3 h-3 text-flame" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-void/80 backdrop-blur-sm"
              onClick={() => setDeletingId(null)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-surface border border-white/10 rounded-[32px] p-6 shadow-2xl"
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
                  className="py-3 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-ink-2 text-xs font-bold transition-all"
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
