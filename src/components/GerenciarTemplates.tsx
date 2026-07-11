import React, { useState, useEffect } from 'react';
import { dbService } from '../lib/supabase';
import { TemplateTreino } from '../types';
import { 
  ArrowLeft, Search, Plus, FolderHeart, Trash2, Edit2, 
  Sparkles, CheckCircle, Clock, Info, Dumbbell, Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import MontarTreino from './MontarTreino';

interface GerenciarTemplatesProps {
  personalId: string;
}

export default function GerenciarTemplates({ personalId }: GerenciarTemplatesProps) {
  const [templates, setTemplates] = useState<TemplateTreino[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Navigation/Editor states
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  
  // Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await dbService.getTemplates(personalId);
      if (error) {
        console.error('Erro ao buscar templates:', error);
      } else if (data) {
        setTemplates(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [personalId]);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja excluir este modelo permanentemente?')) return;
    
    try {
      const { error } = await dbService.deleteTemplate(id);
      if (error) {
        showToast('Erro ao excluir modelo');
      } else {
        showToast('Modelo excluído com sucesso');
        loadTemplates();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTemplates = templates.filter((t) => 
    t.titulo.toLowerCase().includes(search.toLowerCase()) || 
    (t.descricao && t.descricao.toLowerCase().includes(search.toLowerCase()))
  );

  if (isEditing) {
    return (
      <div className="space-y-6">
        <MontarTreino
          aluno={null}
          personalId={personalId}
          treinoId={null}
          templateId={selectedTemplateId}
          onBack={() => {
            setIsEditing(false);
            setSelectedTemplateId(null);
            loadTemplates();
          }}
          showToast={showToast}
        />
      </div>
    );
  }

  return (
    <div id="templates-management-container" className="space-y-6 pb-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 py-3 px-5 bg-surface-3 border border-white/10 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-xs font-medium text-ink">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-ink tracking-tight flex items-center gap-2">
            <span>Modelos de Treino</span>
            <span className="text-xs font-mono font-normal bg-white/5 text-ink-2 px-2.5 py-1 rounded-full border border-white/5">
              {templates.length}
            </span>
          </h2>
          <p className="text-sm text-ink-2 mt-1">
            Crie bases de treino prontas para aplicar em qualquer aluno com um clique.
          </p>
        </div>

        <button
          id="btn-new-template"
          type="button"
          onClick={() => {
            setSelectedTemplateId(null);
            setIsEditing(true);
          }}
          className="py-3 px-5 rounded-xl brand-gradient-bg hover:opacity-95 active:scale-[0.98] font-display font-bold text-void text-xs flex items-center justify-center gap-2 transition-all shadow-[0_4px_15px_rgba(245,51,79,0.25)] shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Modelo</span>
        </button>
      </div>

      {/* BARRA DE PESQUISA */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
        <input
          id="search-templates-input"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar modelos por título ou descrição..."
          className="w-full bg-surface border border-white/5 focus:border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-xs text-ink placeholder-ink-3 outline-none transition-all"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="w-8 h-8 border-2 border-violet border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-surface rounded-3xl p-12 text-center border border-white/5 flex flex-col justify-center items-center">
          <div className="w-16 h-16 rounded-2xl bg-void flex items-center justify-center mb-4 border border-white/5">
            <FolderHeart className="w-8 h-8 text-violet/50" />
          </div>
          <span className="font-display font-medium text-lg text-ink mb-1">
            {search ? 'Nenhum modelo encontrado' : 'Nenhum modelo salvo'}
          </span>
          <p className="text-xs text-ink-2 max-w-sm mb-8 leading-relaxed">
            {search 
              ? `Não encontramos modelos com o termo "${search}".`
              : 'Comece criando modelos de treino para as rotinas mais comuns (Hipertrofia, Full Body, Iniciante, etc) e economize tempo na montagem diária.'
            }
          </p>
          {!search && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="py-3 px-8 rounded-xl bg-violet text-white text-xs font-bold transition-all hover:bg-violet/90 active:scale-[0.98]"
            >
              Criar Primeiro Modelo
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              onClick={() => {
                setSelectedTemplateId(template.id);
                setIsEditing(true);
              }}
              className="bg-surface border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all cursor-pointer group flex flex-col justify-between hover:shadow-[0_4px_25px_rgba(0,0,0,0.3)] relative overflow-hidden h-full"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet/5 blur-2xl pointer-events-none rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-violet/10 border border-violet/20 flex items-center justify-center text-violet shrink-0 group-hover:scale-105 transition-transform">
                    <FolderHeart className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleDelete(template.id, e)}
                      className="p-2 text-ink-3 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="p-2 text-ink-3 group-hover:text-violet transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-display font-bold text-base text-ink group-hover:text-white transition-colors truncate">
                    {template.titulo}
                  </h3>
                  {template.descricao && (
                    <p className="text-xs text-ink-2 mt-1 line-clamp-2 leading-relaxed">
                      {template.descricao}
                    </p>
                  )}
                </div>

                <div className="pt-2 flex flex-wrap gap-2">
                  <div className="flex items-center gap-1 text-[10px] font-mono text-ink-3 bg-void/50 px-2 py-0.5 rounded-md border border-white/5">
                    <Dumbbell className="w-3 h-3" />
                    <span>{template.exercicios?.length || 0} exercícios</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono text-ink-3 bg-void/50 px-2 py-0.5 rounded-md border border-white/5">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(template.criado_em).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-white/5 flex justify-between items-center text-[10px] font-mono">
                <span className="text-violet-400 uppercase tracking-wider font-bold">Base Reutilizável</span>
                <span className="text-ink-3 group-hover:text-ink transition-colors">Abrir Editor →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
