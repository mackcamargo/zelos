import React, { useState, useEffect } from 'react';
import { dbService, supabase } from '../lib/supabase';
import { TemplateTreino } from '../types';
import { 
  ArrowLeft, Search, Plus, FolderHeart, Trash2, Edit2, 
  Sparkles, CheckCircle, Clock, Info, Dumbbell, Play,
  UserPlus, Calendar, X, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import MontarTreino from './MontarTreino';

interface GerenciarTemplatesProps {
  personalId: string;
  isReadOnly?: boolean;
}

export default function GerenciarTemplates({ personalId, isReadOnly = false }: GerenciarTemplatesProps) {
  const [templates, setTemplates] = useState<TemplateTreino[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Navigation/Editor states
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  
  // Apply Template States
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [templateToApply, setTemplateToApply] = useState<TemplateTreino | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  
  // Default values for date and time
  const agora = new Date();
  const dataHoje = agora.toISOString().split('T')[0];
  const horaAtual = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
  
  const [applyDate, setApplyDate] = useState(dataHoje);
  const [applyTime, setApplyTime] = useState(horaAtual);
  const [applying, setApplying] = useState(false);
  
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

  const loadStudents = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('alunos')
        .select('id, profiles(nome)')
        .eq('personal_id', personalId)
        .eq('ativo', true);
      
      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
      console.error('Erro ao buscar alunos:', err);
    }
  };

  const handleApplyTemplate = async () => {
    if (applying) return;
    if (!supabase || !templateToApply || !selectedStudentId) {
      if (!selectedStudentId) showToast('Selecione um aluno');
      return;
    }
    
    setApplying(true);
    try {
      const { data, error } = await supabase.rpc('aplicar_template', {
        p_template_id: templateToApply.id,
        p_aluno_id: selectedStudentId,
        p_titulo: customTitle.trim() || null,
        p_data: applyDate,
        p_hora: applyTime || null
      });

      if (error) {
        console.error('Erro ao aplicar template:', error);
        showToast(error.message || 'Erro ao aplicar template');
      } else {
        showToast('Treino aplicado com sucesso!');
        setIsApplyModalOpen(false);
        setTemplateToApply(null);
        setSelectedStudentId('');
        setCustomTitle('');
      }
    } catch (err: any) {
      console.error('Erro inesperado ao aplicar template:', err);
      showToast(err.message || 'Erro inesperado ao aplicar template');
    } finally {
      setApplying(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja excluir este modelo permanentemente?')) return;
    
    try {
      const { error } = await dbService.deleteTemplate(id);
      if (error) {
        console.error('Erro ao excluir modelo:', error);
        showToast(`Erro ao excluir: ${error.message}`);
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
          <h2 className="font-display font-semibold text-[28px] text-ink flex items-center gap-2">
            <span>Modelos de treino</span>
            <span className="text-[12px] font-medium bg-white/5 text-ink-2 px-2.5 py-1 rounded-full border border-white/5 num">
              {templates.length}
            </span>
          </h2>
          <p className="text-[14px] text-ink-2 mt-1">
            Crie bases de treino prontas para aplicar em qualquer aluno com um clique.
          </p>
        </div>

        {!isReadOnly && (
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
        )}
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
          className="z-input !pl-11"
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
              className="py-3 px-8 rounded-xl bg-violet text-white text-xs font-semibold transition-all hover:bg-violet/90 active:scale-[0.98]"
            >
              Criar primeiro modelo
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
              className="bg-surface border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all cursor-pointer group flex flex-col justify-between hover:shadow-[0_4px_25px_rgba(0,0,0,0.3)] relative overflow-hidden h-full clicavel"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet/5 blur-2xl pointer-events-none rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-violet/10 border border-violet/20 flex items-center justify-center text-violet shrink-0 group-hover:scale-105 transition-transform">
                    <FolderHeart className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      id={`btn-apply-template-${template.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTemplateToApply(template);
                        setCustomTitle(template.titulo);
                        setIsApplyModalOpen(true);
                        loadStudents();
                      }}
                      className="p-2 text-ink-3 hover:text-[#F26A1B] hover:bg-[#F26A1B]/10 rounded-lg transition-all"
                      title="Aplicar a Aluno"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
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
                  <h3 className="font-semibold text-base text-ink group-hover:text-white transition-colors truncate">
                    {template.titulo}
                  </h3>
                  {template.descricao && (
                    <p className="text-[12px] text-ink-2 mt-1 line-clamp-2 leading-relaxed">
                      {template.descricao}
                    </p>
                  )}
                </div>

                <div className="pt-2 flex flex-wrap gap-2">
                  <div className="flex items-center gap-1 text-[12px] text-ink-3 bg-void/50 px-2 py-0.5 rounded-md border border-white/5 num">
                    <Dumbbell className="w-3 h-3" />
                    <span>{template.exercicios?.length || 0} exercícios</span>
                  </div>
                  <div className="flex items-center gap-1 text-[12px] text-ink-3 bg-void/50 px-2 py-0.5 rounded-md border border-white/5 num">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(template.criado_em).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-white/5 flex justify-between items-center text-[12px]">
                <span className="text-violet-400 font-semibold">Base reutilizável</span>
                <span className="text-ink-3 group-hover:text-ink transition-colors">Abrir editor →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Aplicar Template */}
      <AnimatePresence>
        {isApplyModalOpen && (
          <div className="z-overlay">
            {/* Background click to close */}
            <div className="absolute inset-0" onClick={() => setIsApplyModalOpen(false)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="z-modal relative p-6 z-10 border border-line"
            >
              {/* Glow decorativo */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl pointer-events-none rounded-full" />
              
              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent/10 border border-line rounded-xl flex items-center justify-center text-accent">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-lg text-ink">Aplicar modelo</h3>
                      <p className="text-[12px] text-ink-3">
                        {templateToApply?.titulo}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsApplyModalOpen(false)}
                    className="p-2 hover:bg-raise border border-line rounded-full text-ink-3 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[12px] text-ink-3 block">Selecionar aluno</label>
                    <select
                      id="select-apply-aluno"
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="z-input cursor-pointer"
                    >
                      <option value="">Selecione um aluno...</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.profiles?.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[12px] text-ink-3 block">Título do treino (opcional)</label>
                    <input
                      id="input-apply-titulo"
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder={templateToApply?.titulo}
                      className="z-input"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[12px] text-ink-3 block">Data</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
                        <input
                          id="input-apply-data"
                          type="date"
                          value={applyDate}
                          onChange={(e) => setApplyDate(e.target.value)}
                          className="z-input !pl-11 num"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[12px] text-ink-3 block">Hora</label>
                      <div className="relative">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
                        <input
                          id="input-apply-hora"
                          type="time"
                          value={applyTime}
                          onChange={(e) => setApplyTime(e.target.value)}
                          className="z-input !pl-11 num"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => setIsApplyModalOpen(false)}
                    className="flex-1 py-3.5 px-4 rounded-xl bg-bg hover:bg-raise border border-line text-ink-2 hover:text-ink text-xs font-semibold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    id="btn-confirm-apply"
                    onClick={handleApplyTemplate}
                    disabled={applying || !selectedStudentId}
                    className="flex-[2] py-3.5 px-4 rounded-xl bg-accent hover:opacity-90 text-white text-xs font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                  >
                    {applying ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Aplicar treino</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
