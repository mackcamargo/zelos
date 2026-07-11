import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, User, Tag, Play, FileText, ChevronLeft } from 'lucide-react';
import { ConteudoEducativo } from '../types';
import Markdown from 'react-markdown';

interface ConteudoViewerProps {
  conteudo: ConteudoEducativo;
  onClose: () => void;
}

export default function ConteudoViewer({ conteudo, onClose }: ConteudoViewerProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-void flex flex-col md:p-8 overflow-y-auto"
    >
      {/* HEADER NAV */}
      <div className="sticky top-0 z-20 bg-void/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-white/5">
        <button 
          onClick={onClose}
          className="flex items-center gap-2 text-ink-3 hover:text-ink transition-colors group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Voltar</span>
        </button>
        <div className="flex items-center gap-2">
           <span className={`px-2 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest ${
             conteudo.tipo === 'video' ? 'bg-amber/10 text-amber' : 'bg-violet/10 text-violet'
           }`}>
             {conteudo.tipo === 'video' ? 'Vídeo' : 'Artigo'}
           </span>
           <span className="px-2 py-1 bg-white/5 rounded-full text-[8px] font-bold uppercase tracking-widest text-ink-3">
             {conteudo.categoria}
           </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full space-y-12 pb-24 px-6 md:px-0 mt-8">
        {/* HERO / CAPA */}
        <div className="space-y-8">
          <h1 className="text-4xl md:text-6xl font-display font-black text-ink tracking-tighter leading-tight">
            {conteudo.titulo}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-[10px] font-mono text-ink-3 uppercase tracking-[0.2em]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-violet" />
              {new Date(conteudo.criado_em).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-violet" />
              {conteudo.personal_id ? 'Seu Personal' : 'Zênite Global'}
            </div>
          </div>
        </div>

        {/* MEDIA CONTENT */}
        <div className="rounded-[40px] overflow-hidden bg-surface-2 border border-white/5 shadow-2xl relative aspect-video">
          {conteudo.tipo === 'video' ? (
            <div className="w-full h-full">
              {conteudo.video_url?.includes('youtube.com') || conteudo.video_url?.includes('youtu.be') ? (
                <iframe 
                  src={conteudo.video_url.replace('watch?v=', 'embed/')} 
                  className="w-full h-full"
                  allowFullScreen
                />
              ) : (
                <video 
                  src={conteudo.video_url || ''} 
                  controls 
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          ) : (
            <img 
              src={conteudo.capa_url || 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80'} 
              className="w-full h-full object-cover opacity-60"
              alt={conteudo.titulo}
            />
          )}
        </div>

        {/* TEXT CONTENT */}
        <div className="max-w-3xl mx-auto space-y-8">
          {conteudo.descricao && (
             <p className="text-xl text-ink-2 font-medium leading-relaxed italic border-l-4 border-violet pl-6 py-2">
               {conteudo.descricao}
             </p>
          )}

          {conteudo.tipo === 'artigo' && (
            <div className="markdown-body prose prose-invert prose-violet max-w-none">
              <Markdown>{conteudo.corpo_texto || ''}</Markdown>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
