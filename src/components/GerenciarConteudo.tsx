import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, Video, FileText, 
  Image as ImageIcon, Save, X, Loader2, 
  Eye, EyeOff, Tag, Search, Filter,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService } from '../lib/supabase';
import { ConteudoEducativo, TipoConteudo, CategoriaConteudo } from '../types';

interface GerenciarConteudoProps {
  personalId: string;
}

const CATEGORIES: CategoriaConteudo[] = ['Nutrição', 'Treino', 'Lesão', 'Motivação', 'Geral'];

export default function GerenciarConteudo({ personalId }: GerenciarConteudoProps) {
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
      const { data, error } = await dbService.saveConteudoEducativo(current);
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
    return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 text-violet animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="font-display font-bold text-lg text-ink uppercase italic tracking-tighter">Biblioteca de Conteúdo</h3>
          <p className="text-[10px] font-mono text-ink-3 uppercase tracking-widest">Publique artigos e vídeos para seus alunos</p>
        </div>
        <button
          onClick={() => {
            setCurrent({ personal_id: personalId, tipo: 'artigo', categoria: 'Geral', publicado: true });
            setIsEditing(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-violet text-void rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Novo Conteúdo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {conteudos.map((item) => (
          <div key={item.id} className="bg-surface-2 border border-white/5 rounded-3xl overflow-hidden group flex flex-col">
            <div className="relative aspect-video overflow-hidden">
              <img 
                src={item.capa_url || 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80'} 
                className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="px-2 py-1 bg-void/80 backdrop-blur-md rounded-full text-[8px] font-black uppercase tracking-widest text-ink">
                  {item.categoria}
                </span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 flex gap-2">
                {item.tipo === 'video' ? <Video className="w-4 h-4 text-amber" /> : <FileText className="w-4 h-4 text-violet" />}
              </div>
            </div>

            <div className="p-6 space-y-4 flex-1 flex flex-col">
              <div className="flex-1 space-y-2">
                <h4 className="font-display font-bold text-ink leading-tight">{item.titulo}</h4>
                <p className="text-[10px] text-ink-3 line-clamp-2">{item.descricao}</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setCurrent(item); setIsEditing(true); }}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-ink-3 hover:text-ink transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-2 bg-white/5 hover:bg-red-500/10 rounded-xl text-ink-3 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <button 
                  onClick={() => togglePublicado(item)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-widest transition-all ${
                    item.publicado ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                  }`}
                >
                  {item.publicado ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
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
            className="fixed inset-0 z-50 bg-void/90 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-surface border border-white/10 rounded-[40px] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-2xl font-display font-black text-ink uppercase italic">
                  {current.id ? 'Editar' : 'Novo'} <span className="text-violet">Conteúdo</span>
                </h3>
                <button onClick={() => setIsEditing(false)} className="text-ink-3 hover:text-ink">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <label className="text-[10px] font-mono text-ink-3 uppercase tracking-widest">Tipo</label>
                     <div className="flex gap-2">
                       {(['artigo', 'video'] as TipoConteudo[]).map(t => (
                         <button
                           key={t}
                           onClick={() => setCurrent({ ...current, tipo: t })}
                           className={`flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 border transition-all ${
                             current.tipo === t ? 'bg-violet/10 border-violet text-violet' : 'bg-void border-white/5 text-ink-3'
                           }`}
                         >
                           {t === 'video' ? <Video className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                           <span className="text-[10px] font-bold uppercase">{t}</span>
                         </button>
                       ))}
                     </div>
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-mono text-ink-3 uppercase tracking-widest">Categoria</label>
                     <select 
                       value={current.categoria}
                       onChange={(e) => setCurrent({ ...current, categoria: e.target.value as CategoriaConteudo })}
                       className="w-full bg-void border border-white/5 rounded-2xl p-3 text-ink text-sm outline-none focus:border-violet/50"
                     >
                       {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                     </select>
                   </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-ink-3 uppercase tracking-widest">Título</label>
                  <input 
                    type="text"
                    value={current.titulo || ''}
                    onChange={(e) => setCurrent({ ...current, titulo: e.target.value })}
                    placeholder="Título chamativo..."
                    className="w-full bg-void border border-white/5 rounded-2xl p-4 text-ink outline-none focus:border-violet/50 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-ink-3 uppercase tracking-widest">Descrição Curta</label>
                  <textarea 
                    value={current.descricao || ''}
                    onChange={(e) => setCurrent({ ...current, descricao: e.target.value })}
                    placeholder="Resumo do conteúdo..."
                    rows={2}
                    className="w-full bg-void border border-white/5 rounded-2xl p-4 text-ink outline-none focus:border-violet/50 transition-all resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-ink-3 uppercase tracking-widest">URL da Capa (Opcional)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={current.capa_url || ''}
                      onChange={(e) => setCurrent({ ...current, capa_url: e.target.value })}
                      placeholder="Link da imagem..."
                      className="flex-1 bg-void border border-white/5 rounded-2xl p-4 text-ink outline-none focus:border-violet/50 transition-all"
                    />
                  </div>
                </div>

                {current.tipo === 'video' ? (
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-ink-3 uppercase tracking-widest">Link do Vídeo (Youtube/Vimeo/Direct)</label>
                    <input 
                      type="text"
                      value={current.video_url || ''}
                      onChange={(e) => setCurrent({ ...current, video_url: e.target.value })}
                      placeholder="Ex: https://youtube.com/watch?v=..."
                      className="w-full bg-void border border-white/5 rounded-2xl p-4 text-ink outline-none focus:border-violet/50 transition-all"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-ink-3 uppercase tracking-widest">Conteúdo do Artigo (Markdown)</label>
                    <textarea 
                      value={current.corpo_texto || ''}
                      onChange={(e) => setCurrent({ ...current, corpo_texto: e.target.value })}
                      placeholder="Escreva seu artigo aqui... Suporta Markdown."
                      rows={8}
                      className="w-full bg-void border border-white/5 rounded-2xl p-4 text-ink font-mono text-sm outline-none focus:border-violet/50 transition-all"
                    />
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-white/5 flex gap-4">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-4 bg-white/5 text-ink-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !current.titulo}
                  className="flex-1 py-4 bg-violet text-void rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
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
