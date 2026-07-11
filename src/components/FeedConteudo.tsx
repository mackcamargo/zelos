import React, { useState, useEffect } from 'react';
import { 
  Library, Search, Filter, Play, FileText, 
  ChevronRight, Sparkles, Loader2, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService } from '../lib/supabase';
import { ConteudoEducativo, CategoriaConteudo } from '../types';
import ConteudoViewer from './ConteudoViewer';

interface FeedConteudoProps {
  personalId: string | null;
}

const CATEGORIES: CategoriaConteudo[] = ['Geral', 'Nutrição', 'Treino', 'Lesão', 'Motivação'];

export default function FeedConteudo({ personalId }: FeedConteudoProps) {
  const [loading, setLoading] = useState(true);
  const [conteudos, setConteudos] = useState<ConteudoEducativo[]>([]);
  const [selectedCategoria, setSelectedCategoria] = useState<CategoriaConteudo | 'Todos'>('Todos');
  const [selectedConteudo, setSelectedConteudo] = useState<ConteudoEducativo | null>(null);

  useEffect(() => {
    loadData();
  }, [personalId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await dbService.getConteudosEducativos(personalId);
      setConteudos(data || []);
    } finally {
      setLoading(false);
    }
  };

  const filtered = conteudos.filter(c => 
    selectedCategoria === 'Todos' || c.categoria === selectedCategoria
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-violet animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
      {/* CATEGORY FILTERS */}
      <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
        <button
          onClick={() => setSelectedCategoria('Todos')}
          className={`px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border ${
            selectedCategoria === 'Todos'
              ? 'bg-ink text-void border-ink'
              : 'bg-white/5 text-ink-3 border-white/5 hover:border-white/20'
          }`}
        >
          Todos
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategoria(cat)}
            className={`px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border ${
              selectedCategoria === cat
                ? 'bg-violet text-void border-violet'
                : 'bg-white/5 text-ink-3 border-white/5 hover:border-white/20'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* CONTENT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((conteudo, index) => (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            key={conteudo.id}
            onClick={() => setSelectedConteudo(conteudo)}
            className="group relative bg-surface-2 border border-white/5 rounded-[40px] overflow-hidden text-left hover:bg-surface-3 transition-all"
          >
            {/* THUMBNAIL */}
            <div className="relative aspect-[16/10] overflow-hidden">
              <img 
                src={conteudo.capa_url || 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80'} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                alt={conteudo.titulo}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-transparent" />
              
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="px-3 py-1 bg-void/80 backdrop-blur-md rounded-full text-[8px] font-black uppercase tracking-widest text-ink">
                  {conteudo.categoria}
                </span>
                {conteudo.tipo === 'video' && (
                  <span className="px-3 py-1 bg-amber/80 backdrop-blur-md rounded-full text-[8px] font-black uppercase tracking-widest text-void">
                    Vídeo
                  </span>
                )}
              </div>

              {conteudo.tipo === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/30">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>
              )}
            </div>

            {/* CONTENT INFO */}
            <div className="p-8 space-y-3">
              <h4 className="text-xl font-display font-black text-ink tracking-tight group-hover:text-violet transition-colors">
                {conteudo.titulo}
              </h4>
              <p className="text-sm text-ink-3 line-clamp-2 leading-relaxed">
                {conteudo.descricao || 'Confira este conteúdo exclusivo preparado para você.'}
              </p>
              
              <div className="pt-4 flex items-center justify-between border-t border-white/5">
                <div className="flex items-center gap-2">
                   <div className="w-6 h-6 rounded-full bg-violet/10 flex items-center justify-center">
                     {conteudo.tipo === 'video' ? <Play className="w-3 h-3 text-violet" /> : <BookOpen className="w-3 h-3 text-violet" />}
                   </div>
                   <span className="text-[10px] font-mono text-ink-3 uppercase tracking-widest">
                     {conteudo.tipo === 'video' ? 'Assistir' : 'Ler Artigo'}
                   </span>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </motion.button>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
              <Library className="w-8 h-8 text-ink-3" />
            </div>
            <p className="text-sm font-mono text-ink-3 uppercase tracking-widest">Nenhum conteúdo encontrado nesta categoria.</p>
          </div>
        )}
      </div>

      {/* VIEWER MODAL */}
      <AnimatePresence>
        {selectedConteudo && (
          <ConteudoViewer 
            conteudo={selectedConteudo} 
            onClose={() => setSelectedConteudo(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
