import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, Video, FileText, 
  Save, X, Loader2, Eye, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService } from '../lib/supabase';
import { ConteudoEducativo, TipoConteudo, CategoriaConteudo } from '../types';

interface GerenciarConteudoProps {
  personalId: string;
  isReadOnly?: boolean;
}

const CATEGORIES: CategoriaConteudo[] = ['Nutrição', 'Treino', 'Lesão', 'Motivação', 'Geral'];

export default function GerenciarConteudo({ personalId, isReadOnly = false }: GerenciarConteudoProps) {
  const [loading, setLoading] = useState(true);
  const [conteudos, setConteudos] = useState<ConteudoEducativo[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [current, setCurrent] = useState<Partial<ConteudoEducativo>>({
    personal_id: personalId,
    tipo: 'artigo',
    categoria: 'Geral',
    publicado: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [personalId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await dbService.getConteudosPersonal(personalId);
      setConteudos(data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!current.titulo) return;
    setSaving(true);
    try {
      const { data } = await dbService.saveConteudoEducativo(current);
      if (data) {
        loadData();
        setIsEditing(false);
        setCurrent({
          personal_id: personalId,
          tipo: 'artigo',
          categoria: 'Geral',
          publicado: true
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este conteúdo?')) return;
    await dbService.deleteConteudoEducativo(id);
    loadData();
  };

  const togglePublicado = async (conteudo: ConteudoEducativo) => {
    await dbService.saveConteudoEducativo({ ...conteudo, publicado: !conteudo.publicado });
    loadData();
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-6 h-6 text-[#F26A1B] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="font-semibold text-lg text-ink">Biblioteca de Conteúdo</h3>
          <p className="text-[12px] text-ink-3">Publique artigos e vídeos para seus alunos</p>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => {
              setCurrent({ personal_id: personalId, tipo: 'artigo', categoria: 'Geral', publicado: true });
              setIsEditing(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-[#F26A1B] text-ink rounded-lg font-semibold text-xs transition-all"
          >
            <Plus className="w-4 h-4" /> Novo Conteúdo
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {conteudos.map((item) => (
          <div key={item.id} className="bg-surface border border-white/5 rounded-xl overflow-hidden group flex flex-col">
            <div className="relative aspect-video overflow-hidden">
              <img 
                src={item.capa_url || 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80'} 
                className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="px-2.5 py-1 bg-void/80 backdrop-blur-md rounded-full text-[10px] font-semibold text-ink">
                  {item.categoria}
                </span>
              </div>
              {/* Subtle dark solid overlay for contrast instead of a linear gradient */}
              <div className="absolute inset-0 bg-void/30" />
              <div className="absolute bottom-4 left-4 flex gap-2">
                {item.tipo === 'video' ? <Video className="w-4 h-4 text-[#F26A1B]" /> : <FileText className="w-4 h-4 text-ink-2" />}
              </div>
            </div>

            <div className="p-6 space-y-4 flex-1 flex flex-col">
              <div className="flex-1 space-y-2">
                <h4 className="font-semibold text-ink leading-tight">{item.titulo}</h4>
                <p className="text-[12px] text-ink-3 line-clamp-2">{item.descricao}</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setCurrent(item); setIsEditing(true); }}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-ink-3 hover:text-ink transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-2 bg-white/5 hover:bg-red-500/10 rounded-lg text-ink-3 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <button 
                  onClick={() => togglePublicado(item)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all ${
                    item.publicado ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                  }`}
                >
                  {item.publicado ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {item.publicado ? 'Publicado' : 'Privado'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* EDITOR MODAL */}
      <AnimatePresence>
        {isEditing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-void/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-surface border border-white/5 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-ink">
                  {current.id ? 'Editar' : 'Novo'} <span className="text-[#F26A1B]">Conteúdo</span>
                </h3>
                <button onClick={() => setIsEditing(false)} className="text-ink-3 hover:text-ink">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[12px] text-ink-3 block">Tipo</label>
                    <div className="flex gap-2">
                      {(['artigo', 'video'] as TipoConteudo[]).map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setCurrent({ ...current, tipo: t })}
                          className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 border transition-all ${
                            current.tipo === t ? 'bg-white/5 border-[#F26A1B] text-ink' : 'bg-void border-white/5 text-ink-3'
                          }`}
                        >
                          {t === 'video' ? <Video className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                          <span className="text-xs font-semibold capitalize">{t}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[12px] text-ink-3 block">Categoria</label>
                    <select 
                      value={current.categoria}
                      onChange={(e) => setCurrent({ ...current, categoria: e.target.value as CategoriaConteudo })}
                      className="w-full bg-void border border-white/5 rounded-lg p-3 text-ink text-sm outline-none focus:border-[#F26A1B]/50 appearance-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none' stroke='%238c8c8c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 12px center',
                        backgroundSize: '16px'
                      }}
                    >
                      {CATEGORIES.map(cat => <option key={cat} value={cat} className="bg-surface">{cat}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] text-ink-3 block">Título</label>
                  <input 
                    type="text"
                    value={current.titulo || ''}
                    onChange={(e) => setCurrent({ ...current, ...{ titulo: e.target.value } })}
                    placeholder="Título chamativo..."
                    className="w-full bg-void border border-white/5 rounded-lg p-4 text-ink outline-none focus:border-[#F26A1B]/50 transition-all text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] text-ink-3 block">Descrição Curta</label>
                  <textarea 
                    value={current.descricao || ''}
                    onChange={(e) => setCurrent({ ...current, ...{ descricao: e.target.value } })}
                    placeholder="Resumo do conteúdo..."
                    rows={2}
                    className="w-full bg-void border border-white/5 rounded-lg p-4 text-ink outline-none focus:border-[#F26A1B]/50 transition-all resize-none text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] text-ink-3 block">URL da Capa (Opcional)</label>
                  <input 
                    type="text"
                    value={current.capa_url || ''}
                    onChange={(e) => setCurrent({ ...current, ...{ capa_url: e.target.value } })}
                    placeholder="Link da imagem..."
                    className="w-full bg-void border border-white/5 rounded-lg p-4 text-ink outline-none focus:border-[#F26A1B]/50 transition-all text-sm"
                  />
                </div>

                {current.tipo === 'video' ? (
                  <div className="space-y-2">
                    <label className="text-[12px] text-ink-3 block">Link do Vídeo (Youtube/Vimeo/Direct)</label>
                    <input 
                      type="text"
                      value={current.video_url || ''}
                      onChange={(e) => setCurrent({ ...current, ...{ video_url: e.target.value } })}
                      placeholder="Ex: https://youtube.com/watch?v=..."
                      className="w-full bg-void border border-white/5 rounded-lg p-4 text-ink outline-none focus:border-[#F26A1B]/50 transition-all text-sm"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[12px] text-ink-3 block">Conteúdo do Artigo (Markdown)</label>
                    <textarea 
                      value={current.corpo_texto || ''}
                      onChange={(e) => setCurrent({ ...current, ...{ corpo_texto: e.target.value } })}
                      placeholder="Escreva seu artigo aqui... Suporta Markdown."
                      rows={8}
                      className="w-full bg-void border border-white/5 rounded-lg p-4 text-ink font-mono text-sm outline-none focus:border-[#F26A1B]/50 transition-all resize-none"
                    />
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-white/5 flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-4 bg-white/5 text-ink-3 rounded-lg font-semibold text-xs hover:bg-white/10 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !current.titulo}
                  className="flex-1 py-4 bg-[#F26A1B] text-ink rounded-lg font-semibold text-xs hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin text-ink" /> : <Save className="w-4 h-4" />}
                  Salvar Conteúdo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
