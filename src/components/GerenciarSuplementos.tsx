import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Save, Loader2, Search, Check, X, Sparkles, 
  AlertTriangle, ArrowUp, ArrowDown, ClipboardList, RefreshCw, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService, supabase, isSupabaseConfigured } from '../lib/supabase';
import { tocar } from '../lib/som';

interface GerenciarSuplementosProps {
  alunoId: string;
  alunoNome: string;
  personalId: string;
  isReadOnly?: boolean;
}

// Catálogo de suplementos educacionais padrão para buscar caso o banco esteja inacessível ou vazio
const CATALOGO_PADRAO = [
  { id: 'sup_creatina', nome: 'Creatina Monohidratada', categoria: 'Performance & Força', icone: '⚡' },
  { id: 'sup_whey', nome: 'Whey Protein', categoria: 'Proteínas & Recuperação', icone: '🥛' },
  { id: 'sup_beta_alanina', nome: 'Beta-Alanina', categoria: 'Resistência Muscular', icone: '🔥' },
  { id: 'sup_cafeina', nome: 'Cafeína Anidra', categoria: 'Energia & Foco', icone: '☕' },
  { id: 'sup_multivitaminico', nome: 'Multivitamínico', categoria: 'Saúde & Bem-Estar', icone: '🍎' },
  { id: 'sup_omega3', nome: 'Ômega 3', categoria: 'Saúde & Bem-Estar', icone: '🐟' },
  { id: 'sup_bcaa', nome: 'BCAA', categoria: 'Proteínas & Recuperação', icone: '🧬' },
  { id: 'sup_glutamina', nome: 'Glutamina', categoria: 'Imunidade & Intestino', icone: '🛡️' },
  { id: 'sup_hipercalorico', nome: 'Hipercalórico', categoria: 'Energia & Foco', icone: '💪' },
  { id: 'sup_albumina', nome: 'Albumina', categoria: 'Proteínas & Recuperação', icone: '🥚' },
  { id: 'sup_colageno', nome: 'Colágeno Hidrolisado', categoria: 'Saúde & Bem-Estar', icone: '🦴' }
];

interface ItemPlano {
  suplemento_id: string;
  nome: string;
  categoria: string;
  icone: string;
  orientacao: string;
  ordem: number;
}

export default function GerenciarSuplementos({ alunoId, alunoNome, personalId, isReadOnly = false }: GerenciarSuplementosProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plano, setPlano] = useState<any | null>(null);
  
  // Catálogo completo de suplementos
  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Editor States
  const [isEditing, setIsEditing] = useState(false);
  const [itensEditar, setItensEditar] = useState<ItemPlano[]>([]);
  const [observacaoEditar, setObservacaoEditar] = useState('');
  
  // Lista de todos os alunos e seus status de plano para o professor
  const [alunos, setAlunos] = useState<any[]>([]);
  const [planosStatus, setPlanosStatus] = useState<Record<string, any>>({});
  
  // Envio múltiplo states
  const [multiEnvio, setMultiEnvio] = useState(false);
  const [selectedAlunosEnvio, setSelectedAlunosEnvio] = useState<string[]>([alunoId]);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Exibir toast temporário
  const mostrarToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Carrega catálogo, alunos e planos de todos
  const carregarDados = async () => {
    try {
      // 1. Carrega catálogo de suplementos
      let list: any[] = [];
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('suplementos')
          .select('id, nome, categoria, icone')
          .eq('ativo', true)
          .order('categoria')
          .order('ordem');
        if (!error && data && data.length > 0) {
          list = data;
        }
      }
      if (list.length === 0) {
        list = CATALOGO_PADRAO;
      }
      setCatalogo(list);

      // 2. Carrega lista de alunos do personal
      let listAlunos: any[] = [];
      const { data: dataAlunos } = await dbService.getAlunos(personalId);
      if (dataAlunos) {
        listAlunos = dataAlunos;
      }
      setAlunos(listAlunos);

      // 3. Carrega plano do aluno atual
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('plano_suplementos')
          .select(`
            *,
            plano_suplemento_itens (
              id,
              plano_id,
              suplemento_id,
              orientacao,
              ordem,
              suplementos (*)
            )
          `)
          .eq('aluno_id', alunoId)
          .maybeSingle();

        if (!error && data) {
          const rawItens = data.plano_suplemento_itens || [];
          rawItens.sort((a: any, b: any) => (a.ordem ?? 0) - (b.ordem ?? 0));
          
          const mappedItens: ItemPlano[] = rawItens.map((i: any) => ({
            suplemento_id: i.suplemento_id,
            nome: i.suplementos?.nome || list.find(c => c.id === i.suplemento_id)?.nome || 'Suplemento',
            categoria: i.suplementos?.categoria || list.find(c => c.id === i.suplemento_id)?.categoria || 'Geral',
            icone: i.suplementos?.icone || list.find(c => c.id === i.suplemento_id)?.icone || '🥛',
            orientacao: i.orientacao || '',
            ordem: i.ordem ?? 0
          }));
          
          setPlano({
            ...data,
            itens: mappedItens
          });
          setItensEditar(mappedItens);
          setObservacaoEditar(data.observacao || '');
        } else {
          setPlano(null);
          setItensEditar([]);
          setObservacaoEditar('');
        }

        // 4. Carrega status de planos de todos os alunos do personal
        const { data: planosData } = await supabase
          .from('plano_suplementos')
          .select('id, aluno_id, confirmado, confirmado_em')
          .eq('personal_id', personalId);
        
        const statusMap: Record<string, any> = {};
        if (planosData) {
          planosData.forEach((p: any) => {
            statusMap[p.aluno_id] = p;
          });
        }
        setPlanosStatus(statusMap);
      } else {
        // Fallback LocalStorage para o aluno atual
        const localData = localStorage.getItem(`plano_suplementos_${alunoId}`);
        if (localData) {
          const parsed = JSON.parse(localData);
          setPlano(parsed);
          setItensEditar(parsed.itens || []);
          setObservacaoEditar(parsed.observacao || '');
        } else {
          setPlano(null);
          setItensEditar([]);
          setObservacaoEditar('');
        }

        // Fallback LocalStorage para todos os alunos
        const statusMap: Record<string, any> = {};
        listAlunos.forEach(al => {
          const stored = localStorage.getItem(`plano_suplementos_${al.id}`);
          if (stored) {
            statusMap[al.id] = JSON.parse(stored);
          }
        });
        setPlanosStatus(statusMap);
      }
    } catch (e) {
      console.error("Erro ao carregar orientação de suplementos:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();

    // 5. NOTIFICAÇÃO EM TEMPO REAL PARA O PROFESSOR (Assina mudanças em plano_suplementos)
    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('plano-sup-prof')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'plano_suplementos',
            filter: `personal_id=eq.${personalId}`
          },
          (payload) => {
            const newRecord = payload.new as any;
            if (newRecord) {
              const oldRecord = payload.old as any;
              
              // Se foi confirmado agora
              if (newRecord.confirmado && (!oldRecord || !oldRecord.confirmado)) {
                // Busca o nome do aluno no estado local de alunos
                setAlunos((currentAlunos) => {
                  const alunoObj = currentAlunos.find(a => a.id === newRecord.aluno_id);
                  const nome = alunoObj?.profile?.nome || 'Um aluno';
                  tocar('celebracao');
                  mostrarToast(`✅ ${nome} confirmou que está seguindo a orientação de suplementos!`);
                  return currentAlunos;
                });
              }
              // Atualiza a lista e status
              carregarDados();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [alunoId, personalId]);

  // Filtra itens do catálogo por busca
  const catalogoFiltrado = useMemo(() => {
    if (!searchTerm.trim()) return catalogo;
    const s = searchTerm.toLowerCase();
    return catalogo.filter(c => 
      c.nome.toLowerCase().includes(s) || 
      c.categoria.toLowerCase().includes(s)
    );
  }, [catalogo, searchTerm]);

  // Salvar orientação de suplementação (para 1 ou vários alunos)
  const handleSalvar = async () => {
    if (saving) return;
    setSaving(true);
    tocar('sucesso');

    // Montar os itens com a ordem correta
    const itensPayload = itensEditar.map((it, idx) => ({
      suplemento_id: it.suplemento_id,
      orientacao: it.orientacao,
      ordem: idx + 1
    }));

    const targets = multiEnvio ? selectedAlunosEnvio : [alunoId];

    if (targets.length === 0) {
      mostrarToast("Selecione pelo menos um aluno para enviar!");
      setSaving(false);
      return;
    }

    try {
      if (isSupabaseConfigured && supabase) {
        // Envia para todos os alunos selecionados
        await Promise.all(
          targets.map(async (targetId) => {
            const { error } = await supabase.rpc('salvar_plano_suplementos', {
              p_aluno_id: targetId,
              p_observacao: observacaoEditar,
              p_itens: itensPayload
            });
            if (error) throw error;
          })
        );
        mostrarToast(`Orientação enviada com sucesso para ${targets.length} ${targets.length === 1 ? 'aluno' : 'alunos'}!`);
      } else {
        // Fallback LocalStorage
        targets.forEach((targetId) => {
          const stored = localStorage.getItem(`plano_suplementos_${targetId}`);
          const currentPlano = stored ? JSON.parse(stored) : null;
          const planoMock = {
            id: currentPlano?.id || Date.now() + Math.random(),
            aluno_id: targetId,
            personal_id: personalId,
            observacao: observacaoEditar,
            confirmado: false,
            confirmado_em: null,
            atualizado_em: new Date().toISOString(),
            itens: itensEditar.map((it, idx) => ({ ...it, ordem: idx + 1 }))
          };

          localStorage.setItem(`plano_suplementos_${targetId}`, JSON.stringify(planoMock));
        });
        mostrarToast(`Orientação salva localmente para ${targets.length} ${targets.length === 1 ? 'aluno' : 'alunos'}! (Modo Demo)`);
      }
      
      setIsEditing(false);
      setMultiEnvio(false);
      setSelectedAlunosEnvio([alunoId]);
      await carregarDados();
    } catch (e) {
      console.error("Erro ao salvar orientação:", e);
      mostrarToast("Erro ao salvar orientação. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  // Funções para adicionar/remover itens no editor
  const adicionarItem = (sup: any) => {
    tocar('tap');
    if (itensEditar.some(i => i.suplemento_id === sup.id)) {
      mostrarToast("Este suplemento já foi adicionado!");
      return;
    }
    const novo: ItemPlano = {
      suplemento_id: sup.id,
      nome: sup.nome,
      categoria: sup.categoria,
      icone: sup.icone,
      orientacao: 'Acompanhar conforme indicação do nutricionista.',
      ordem: itensEditar.length + 1
    };
    setItensEditar([...itensEditar, novo]);
  };

  const removerItem = (id: string) => {
    tocar('fechar');
    setItensEditar(itensEditar.filter(i => i.suplemento_id !== id));
  };

  const atualizarOrientacaoItem = (id: string, texto: string) => {
    setItensEditar(itensEditar.map(i => {
      if (i.suplemento_id === id) {
        return { ...i, orientacao: texto };
      }
      return i;
    }));
  };

  const reordenarItem = (index: number, direcao: 'up' | 'down') => {
    tocar('tap');
    const novosItens = [...itensEditar];
    const targetIndex = direcao === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= novosItens.length) return;
    
    // Troca posições
    const temp = novosItens[index];
    novosItens[index] = novosItens[targetIndex];
    novosItens[targetIndex] = temp;
    setItensEditar(novosItens);
  };

  const handleToggleAlunoEnvio = (id: string) => {
    tocar('tap');
    if (selectedAlunosEnvio.includes(id)) {
      if (selectedAlunosEnvio.length === 1) {
        mostrarToast("Pelo menos um aluno deve estar selecionado!");
        return;
      }
      setSelectedAlunosEnvio(selectedAlunosEnvio.filter(x => x !== id));
    } else {
      setSelectedAlunosEnvio([...selectedAlunosEnvio, id]);
    }
  };

  const selecionarTodosAlunos = () => {
    tocar('tap');
    if (selectedAlunosEnvio.length === alunos.length) {
      setSelectedAlunosEnvio([alunoId]);
    } else {
      setSelectedAlunosEnvio(alunos.map(a => a.id));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 text-flame animate-spin" />
      </div>
    );
  }

  // Se o aluno já confirmou
  const isConfirmado = plano && plano.confirmado === true;

  return (
    <div className="space-y-6">
      
      {/* Toast flutuante de sucesso/notificação */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-4 left-1/2 bg-ok text-void px-5 py-3 rounded-2xl shadow-xl z-50 flex items-center gap-2 text-xs sm:text-sm font-semibold border border-white/10 max-w-sm text-center"
          >
            <Check className="w-4 h-4 bg-void/25 p-0.5 rounded-full shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CABEÇALHO / INFOS DE STATUS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-raise/20 border border-line rounded-3xl p-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-flame" />
            <span className="text-[11px] font-bold text-ink-3 uppercase tracking-wider">Orientação de Suplementos</span>
          </div>
          
          <div className="flex items-center gap-2">
            {plano ? (
              isConfirmado ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ok/10 border border-ok/25 text-ok text-[11px] font-bold">
                  <Check className="w-3.5 h-3.5" />
                  Aluno seguindo {plano.confirmado_em ? `desde ${new Date(plano.confirmado_em).toLocaleDateString('pt-BR')}` : ''}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 text-[11px] font-bold">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Aguardando confirmação do aluno
                </span>
              )
            ) : (
              <span className="text-xs text-ink-3">Sem orientação cadastrada</span>
            )}
          </div>
        </div>

        {!isReadOnly && (
          <button
            onClick={() => {
              tocar('abrir');
              setIsEditing(!isEditing);
              if (!isEditing) {
                setItensEditar(plano?.itens || []);
                setObservacaoEditar(plano?.observacao || '');
                setMultiEnvio(false);
                setSelectedAlunosEnvio([alunoId]);
              }
            }}
            className="px-4 py-2.5 bg-flame hover:bg-flame-hover text-white text-xs font-bold rounded-2xl flex items-center gap-1.5 shadow-md shadow-flame/15 self-start sm:self-center transition-all cursor-pointer font-sans"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isEditing ? "Visualizar Orientação" : (plano ? "Editar orientação" : "Montar orientação")}
          </button>
        )}
      </div>

      {/* COMPONENTE DE ENQUADRAMENTO LEGAL / AVISO FIXO */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-xs text-amber-500 leading-relaxed shadow-sm">
        <div className="shrink-0 w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <p className="font-sans text-left">
          <strong className="block text-amber-400 font-bold mb-0.5">Aviso de Enquadramento:</strong>
          Orientação de acompanhamento. Não substitui a prescrição de um nutricionista. A dose adequada deve ser definida por um profissional habilitado.
        </p>
      </div>

      {/* --- MODO EDIÇÃO --- */}
      {isEditing ? (
        <div className="space-y-6 border border-line p-5 rounded-3xl bg-surface/40">
          
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* COLUNA ESQUERDA: BUSCADOR DO CATÁLOGO (2 colunas) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-ink">Catálogo de Suplementos</h5>
                <p className="text-[10px] text-ink-3">Pesquise e adicione suplementos educativos gerais</p>
              </div>

              {/* Input busca */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
                <input
                  type="text"
                  placeholder="Buscar no catálogo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-raise/50 border border-line focus:border-flame hover:border-line-strong rounded-2xl py-2 px-3 pl-10 text-xs text-ink outline-none transition-all placeholder:text-ink-4"
                />
              </div>

              {/* Lista Catálogo */}
              <div className="max-h-72 overflow-y-auto border border-line/50 rounded-2xl divide-y divide-line/40 bg-surface">
                {catalogoFiltrado.length === 0 ? (
                  <div className="p-4 text-center text-[11px] text-ink-3">Nenhum suplemento encontrado.</div>
                ) : (
                  catalogoFiltrado.map((sup) => {
                    const jaAdicionado = itensEditar.some(it => it.suplemento_id === sup.id);
                    return (
                      <div key={sup.id} className="p-3 flex items-center justify-between gap-2 text-left">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-lg shrink-0">{sup.icone}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-ink truncate">{sup.nome}</p>
                            <p className="text-[9px] text-ink-3 truncate">{sup.categoria}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={jaAdicionado}
                          onClick={() => adicionarItem(sup)}
                          className={`p-1.5 rounded-xl shrink-0 border cursor-pointer transition-all ${
                            jaAdicionado
                              ? 'bg-line/20 border-line/10 text-ink-3/40'
                              : 'bg-flame/10 hover:bg-flame text-flame hover:text-white border-flame/20'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* COLUNA DIREITA: ITENS DO PLANO EM EDIÇÃO (3 colunas) */}
            <div className="lg:col-span-3 space-y-4">
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-ink">Itens Selecionados ({itensEditar.length})</h5>
                <p className="text-[10px] text-ink-3">Defina observações de acompanhamento gerais (não clínicas)</p>
              </div>

              {itensEditar.length === 0 ? (
                <div className="border border-dashed border-line rounded-2xl p-8 text-center text-xs text-ink-3">
                  Nenhum suplemento selecionado. Adicione itens do catálogo ao lado para montar a orientação.
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {itensEditar.map((item, index) => (
                    <div key={item.suplemento_id} className="bg-raise/30 border border-line p-3 rounded-2xl flex flex-col gap-2 relative">
                      
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-base shrink-0">{item.icone}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-ink truncate">{item.nome}</p>
                            <p className="text-[9px] text-ink-3 truncate uppercase tracking-wide">{item.categoria}</p>
                          </div>
                        </div>

                        {/* Controles de ordem e exclusão */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => reordenarItem(index, 'up')}
                            className="p-1 text-ink-3 hover:text-ink disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === itensEditar.length - 1}
                            onClick={() => reordenarItem(index, 'down')}
                            className="p-1 text-ink-3 hover:text-ink disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removerItem(item.suplemento_id)}
                            className="p-1 text-rose-500 hover:text-rose-600 ml-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Campo orientação geral */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-ink-3 uppercase tracking-wider">Orientação Geral / Uso</label>
                        <input
                          type="text"
                          value={item.orientacao}
                          onChange={(e) => atualizarOrientacaoItem(item.suplemento_id, e.target.value)}
                          placeholder="Ex: acompanhar conforme orientação do seu nutricionista"
                          className="w-full bg-surface border border-line focus:border-flame rounded-xl py-1.5 px-2.5 text-xs text-ink outline-none transition-all placeholder:text-ink-4"
                        />
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* OBSERVAÇÕES GERAIS */}
          <div className="space-y-2 border-t border-line/50 pt-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-ink">Observações Gerais da Orientação</label>
              <p className="text-[10px] text-ink-3">Avisos educacionais gerais, recomendações de marcas ou esclarecimentos sobre rotina</p>
            </div>
            <textarea
              rows={3}
              value={observacaoEditar}
              onChange={(e) => setObservacaoEditar(e.target.value)}
              placeholder="Ex: Lembre-se de manter o consumo de água elevado ao longo de todo o dia, especialmente ao praticar atividades de alta intensidade."
              className="w-full bg-raise/50 border border-line focus:border-flame rounded-2xl py-2.5 px-3.5 text-xs text-ink outline-none transition-all placeholder:text-ink-4 resize-none"
            />
          </div>

          {/* DISTRIBUIÇÃO MULTI-ALUNOS */}
          <div className="border-t border-line/50 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-flame" />
                <span className="text-xs font-bold text-ink">Enviar para múltiplos alunos</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  tocar('tap');
                  setMultiEnvio(!multiEnvio);
                  if(!multiEnvio) {
                    setSelectedAlunosEnvio([alunoId]); // Reseta com o aluno atual
                  }
                }}
                className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer border ${
                  multiEnvio 
                    ? 'bg-flame/15 text-flame border-flame/30' 
                    : 'bg-raise text-ink-3 border-line hover:text-ink'
                }`}
              >
                {multiEnvio ? "Habilitado ✓" : "Habilitar envio múltiplo"}
              </button>
            </div>

            {multiEnvio && (
              <div className="bg-raise/30 rounded-2xl p-4 border border-line space-y-3">
                <div className="flex items-center justify-between border-b border-line/40 pb-2">
                  <span className="text-[10px] font-bold text-ink-3 uppercase">Selecione os Alunos para Receber</span>
                  <button
                    type="button"
                    onClick={selecionarTodosAlunos}
                    className="text-[10px] text-flame hover:underline font-bold cursor-pointer"
                  >
                    {selectedAlunosEnvio.length === alunos.length ? "Desmarcar Outros" : "Selecionar Todos"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                  {alunos.map((al) => {
                    const isSelected = selectedAlunosEnvio.includes(al.id);
                    const isCurrent = al.id === alunoId;
                    return (
                      <button
                        key={al.id}
                        type="button"
                        onClick={() => handleToggleAlunoEnvio(al.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          isSelected 
                            ? 'bg-surface border-flame text-ink' 
                            : 'bg-raise/40 border-line text-ink-3 hover:border-line-strong'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold text-ink truncate">
                            {al.profile?.nome || 'Aluno'}
                            {isCurrent && <span className="text-[10px] text-flame font-normal ml-1">(Atual)</span>}
                          </p>
                        </div>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          isSelected ? 'bg-flame border-flame text-white' : 'border-line text-transparent'
                        }`}>
                          <Check className="w-3 h-3 stroke-[3px]" />
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-ink-3">A mesma orientação de suplementação montada acima será distribuída de forma independente para cada aluno marcado.</p>
              </div>
            )}
          </div>

          {/* BOTÕES SALVAR */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSalvar}
              disabled={saving}
              className="px-5 py-2.5 bg-ok hover:bg-ok/90 text-void text-xs font-bold rounded-2xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50 font-sans"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{multiEnvio ? `Enviar para ${selectedAlunosEnvio.length} alunos` : 'Enviar para o aluno'}</span>
                </>
              )}
            </button>
          </div>

        </div>
      ) : (
        /* --- MODO VISUALIZAÇÃO --- */
        <div className="space-y-6">
          {!plano ? (
            <div className="text-center py-12 px-4 border border-dashed border-line rounded-3xl bg-surface/30 flex flex-col items-center justify-center gap-3">
              <span className="text-4xl">🥛</span>
              <p className="text-xs sm:text-sm font-semibold text-ink">Nenhuma orientação cadastrada</p>
              <p className="text-[11px] text-ink-3 max-w-xs leading-relaxed">
                Você ainda não montou uma orientação de suplementos para este aluno. Clique em "Montar orientação" acima para criar.
              </p>
            </div>
          ) : (
            <div className="space-y-4 bg-surface p-5 border border-line rounded-3xl">
              
              {/* LISTA DE ITENS SALVA */}
              <div className="space-y-2.5">
                <h5 className="text-xs font-bold text-ink uppercase tracking-wider">Suplementos Orientados</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(plano.itens || []).map((item: any) => (
                    <div key={item.suplemento_id} className="bg-raise/20 border border-line/60 rounded-2xl p-3.5 flex items-start gap-3">
                      <span className="text-xl shrink-0 mt-0.5">{item.icone}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-ink truncate">{item.nome}</p>
                        <p className="text-[9px] text-ink-3 truncate uppercase font-semibold tracking-wider">{item.categoria}</p>
                        <p className="text-xs text-ink-2 mt-1.5 leading-normal italic bg-void/30 py-1.5 px-2.5 rounded-xl border border-line/30">
                          {item.orientacao || "Acompanhar conforme indicação do nutricionista."}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* OBSERVAÇÃO GERAL SALVA */}
              {plano.observacao && (
                <div className="bg-raise/30 border border-line/50 p-4 rounded-2xl mt-4 space-y-1.5 text-left">
                  <span className="text-[10px] font-bold text-ink-3 uppercase tracking-wider block">Observações do Treinador:</span>
                  <p className="text-xs text-ink-2 leading-relaxed italic">{plano.observacao}</p>
                </div>
              )}

              {/* METADADOS DA ÚLTIMA ATUALIZAÇÃO */}
              <div className="text-[10px] text-ink-3 pt-2 text-right border-t border-line/30">
                Última atualização: {new Date(plano.atualizado_em || Date.now()).toLocaleDateString('pt-BR')} às {new Date(plano.atualizado_em || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>

            </div>
          )}

          {/* PAINEL DE STATUS DE TODOS OS ALUNOS PARA O PROFESSOR */}
          <div className="bg-raise/10 border border-line rounded-3xl p-5 space-y-3 text-left">
            <div className="flex items-center gap-2 border-b border-line/45 pb-2">
              <Users className="w-4 h-4 text-flame" />
              <h5 className="text-xs font-bold text-ink uppercase tracking-wider">Status de Confirmação dos Alunos</h5>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
              {alunos.map((al) => {
                const pl = planosStatus[al.id];
                const isSeguindo = pl && pl.confirmado;
                return (
                  <div key={al.id} className="flex flex-col p-3 rounded-2xl border border-line/50 bg-surface/50 text-xs gap-1.5">
                    <div className="min-w-0">
                      <p className="font-bold text-ink truncate">{al.profile?.nome || 'Aluno'}</p>
                      <p className="text-[10px] text-ink-3 truncate leading-normal">{al.objetivo || 'Sem objetivo de treino'}</p>
                    </div>
                    <div className="shrink-0 pt-1 border-t border-line/20 flex justify-between items-center text-[10px]">
                      <span className="text-ink-3 uppercase font-semibold">Status:</span>
                      {isSeguindo ? (
                        <span className="text-ok font-bold flex items-center gap-1 bg-ok/10 border border-ok/25 px-2 py-0.5 rounded-full">
                          ✓ Seguindo {pl.confirmado_em ? `(${new Date(pl.confirmado_em).toLocaleDateString('pt-BR')})` : ''}
                        </span>
                      ) : (
                        <span className="text-ink-3 font-semibold bg-raise px-2 py-0.5 rounded-full border border-line/30">
                          Aguardando
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
