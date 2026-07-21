import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { 
  Plus, Search, Check, X, Copy, Trash2, ShieldAlert, 
  Users, CheckCircle, Calendar, Ticket, Lock, Unlock, 
  Info, RefreshCw, AlertTriangle, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { tocar } from '../lib/som';

interface CourtesyCode {
  codigo: string;
  descricao: string;
  ativo: boolean;
  usos: number;
  max_usos: number;
  limite_alunos: number;
  usado_por?: string | string[]; // e-mail(s) of who used it
  criado_em?: string;
}

export default function GerenciarCortesias() {
  const [codes, setCodes] = useState<CourtesyCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  
  // Form states
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [limiteAlunos, setLimiteAlunos] = useState(99999);
  const [maxUsos, setMaxUsos] = useState(1);

  // Modal / Confirm States
  const [confirmToggleData, setConfirmToggleData] = useState<{ code: CourtesyCode; nextState: boolean } | null>(null);
  const [confirmDeleteData, setConfirmDeleteData] = useState<CourtesyCode | null>(null);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadCodes = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.rpc('admin_listar_codigos');
        if (error) {
          console.error('Erro RPC admin_listar_codigos:', error);
          setErrorMessage('Erro ao carregar códigos da base de dados. Usando dados locais como fallback.');
          loadMockData();
        } else if (data) {
          // Normalize fields if needed
          const normalized: CourtesyCode[] = data.map((item: any) => ({
            codigo: item.codigo || item.p_codigo || '',
            descricao: item.descricao || item.p_descricao || '',
            ativo: item.ativo !== false, // default true if undefined
            usos: item.usos !== undefined ? item.usos : 0,
            max_usos: item.max_usos || item.limite_usos || 1,
            limite_alunos: item.limite_alunos || 99999,
            usado_por: item.usado_por || item.email || item.emails_usados || null,
            criado_em: item.criado_em || new Date().toISOString()
          }));
          setCodes(normalized);
        } else {
          loadMockData();
        }
      } else {
        loadMockData();
      }
    } catch (err) {
      console.error('Exception loading codes:', err);
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    const local = localStorage.getItem('zelos_mock_cortesias');
    if (local) {
      try {
        setCodes(JSON.parse(local));
        return;
      } catch (e) {}
    }

    const defaultMock: CourtesyCode[] = [
      {
        codigo: 'ZELOSPRO50',
        descricao: 'Parceiro Ortopedia - Dr. Silva',
        ativo: true,
        usos: 0,
        max_usos: 1,
        limite_alunos: 99999,
        criado_em: new Date().toISOString()
      },
      {
        codigo: 'AMIGOCLIENTE',
        descricao: 'Amigo do Joao - Cortesia Pro',
        ativo: true,
        usos: 1,
        max_usos: 1,
        limite_alunos: 5,
        usado_por: 'joao.silva@gmail.com',
        criado_em: new Date(Date.now() - 86400000 * 3).toISOString()
      },
      {
        codigo: 'TESTEFALIDO',
        descricao: 'Código de Teste Expirado',
        ativo: false,
        usos: 1,
        max_usos: 1,
        limite_alunos: 1,
        usado_por: 'teste@exemplo.com',
        criado_em: new Date(Date.now() - 86400000 * 10).toISOString()
      }
    ];
    setCodes(defaultMock);
    localStorage.setItem('zelos_mock_cortesias', JSON.stringify(defaultMock));
  };

  useEffect(() => {
    loadCodes();
  }, []);

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const formattedCodigo = codigo.trim().toUpperCase();
    if (!formattedCodigo) {
      setErrorMessage('Por favor, digite um código.');
      return;
    }

    setSubmitting(true);
    tocar('tap');

    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.rpc('admin_criar_codigo', {
          p_codigo: formattedCodigo,
          p_descricao: descricao.trim(),
          p_limite_alunos: Number(limiteAlunos),
          p_max_usos: Number(maxUsos)
        });

        if (error) {
          throw error;
        }

        if (data && data.ok === true) {
          showToast(`Código ${data.codigo || formattedCodigo} criado com sucesso!`);
          setCodigo('');
          setDescricao('');
          setLimiteAlunos(99999);
          setMaxUsos(1);
          await loadCodes();
        } else {
          setErrorMessage(data?.erro || 'Erro desconhecido ao criar código.');
        }
      } else {
        // Mock Implementation
        const exists = codes.some(c => c.codigo === formattedCodigo);
        if (exists) {
          setErrorMessage('Esse código já existe. Escolha outro.');
          setSubmitting(false);
          return;
        }

        const newCode: CourtesyCode = {
          codigo: formattedCodigo,
          descricao: descricao.trim(),
          ativo: true,
          usos: 0,
          max_usos: Number(maxUsos),
          limite_alunos: Number(limiteAlunos),
          criado_em: new Date().toISOString()
        };

        const updated = [newCode, ...codes];
        setCodes(updated);
        localStorage.setItem('zelos_mock_cortesias', JSON.stringify(updated));
        
        showToast(`Código ${formattedCodigo} criado! (Modo Local)`);
        setCodigo('');
        setDescricao('');
        setLimiteAlunos(99999);
        setMaxUsos(1);
      }
    } catch (err: any) {
      console.error('Exception creating code:', err);
      setErrorMessage(err.message || 'Erro ao processar criação de código.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleState = (code: CourtesyCode) => {
    tocar('tap');
    const nextState = !code.ativo;

    // Se estiver desativando e já tiver sido usado por alguém, exige confirmação
    if (!nextState && (code.usos > 0 || code.usado_por)) {
      setConfirmToggleData({ code, nextState });
    } else {
      executeToggle(code.codigo, nextState);
    }
  };

  const executeToggle = async (codeStr: string, activeState: boolean) => {
    setToggling(true);
    setErrorMessage(null);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.rpc('admin_toggle_codigo', {
          p_codigo: codeStr,
          p_ativo: activeState
        });

        if (error) throw error;

        showToast(`Código ${codeStr} ${activeState ? 'ativado' : 'desativado'} com sucesso!`);
        await loadCodes();
      } else {
        // Mock toggling
        const updated = codes.map(c => {
          if (c.codigo === codeStr) {
            return { ...c, ativo: activeState };
          }
          return c;
        });
        setCodes(updated);
        localStorage.setItem('zelos_mock_cortesias', JSON.stringify(updated));
        showToast(`Código ${codeStr} ${activeState ? 'ativado' : 'desativado'}! (Modo Local)`);
      }
    } catch (err: any) {
      console.error('Error toggling code:', err);
      setErrorMessage(err.message || 'Erro ao alterar o estado do código.');
    } finally {
      setToggling(false);
      setConfirmToggleData(null);
    }
  };

  const handleExcluir = (code: CourtesyCode) => {
    tocar('tap');
    setConfirmDeleteData(code);
  };

  const executeExcluir = async (codeStr: string) => {
    setDeleting(true);
    setErrorMessage(null);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.rpc('admin_excluir_codigo', {
          p_codigo: codeStr
        });

        if (error) throw error;

        if (data && data.ok === true) {
          showToast(`Código ${codeStr} excluído com sucesso!`);
          await loadCodes();
        } else if (data && data.em_uso) {
          setErrorMessage(data.erro || `Este código já foi usado (${data.usos} vezes) e não pode ser excluído. Use 'Desativar' para revogar o acesso.`);
        } else {
          setErrorMessage(data?.erro || 'Erro ao excluir código.');
        }
      } else {
        // Mock delete
        const updated = codes.filter(c => c.codigo !== codeStr);
        setCodes(updated);
        localStorage.setItem('zelos_mock_cortesias', JSON.stringify(updated));
        showToast(`Código ${codeStr} excluído! (Modo Local)`);
      }
    } catch (err: any) {
      console.error('Error deleting code:', err);
      setErrorMessage(err.message || 'Erro ao excluir o código.');
    } finally {
      setDeleting(false);
      setConfirmDeleteData(null);
    }
  };

  const copyLinkToClipboard = (code: string) => {
    const link = `https://www.zelospersonal.com.br/cadastro?cortesia=${code.toUpperCase()}`;
    navigator.clipboard.writeText(link);
    tocar('tap');
    showToast('Link com código copiado! 🔗');
  };

  const copyCodeToClipboard = (code: string) => {
    navigator.clipboard.writeText(code.toUpperCase());
    tocar('tap');
    showToast('Código copiado! 📋');
  };

  const getWhatsAppUrl = (code: string) => {
    const link = `https://www.zelospersonal.com.br/cadastro?cortesia=${code.toUpperCase()}`;
    const text = `Você foi convidado(a) para testar o ZELOS Personal com acesso de CORTESIA! 🎉

No app você vai ter:
✅ Gestão completa dos seus alunos
✅ Montagem de treinos + biblioteca de exercícios
✅ Plano alimentar com calorias e macros
✅ Perfil ortopédico e segurança no treino
✅ Progresso, hábitos e muito mais

É só abrir o link, criar sua conta e o acesso já é ativado:
👉 ${link}

Qualquer dúvida, me chama. Aproveita! 💪`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const filteredCodes = codes.filter(c => 
    c.codigo.toLowerCase().includes(search.toLowerCase()) ||
    c.descricao.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            id="toast-notification-cortesia"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 py-3 px-5 bg-[#F26A1B]/10 border border-[#F26A1B]/20 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center gap-2 backdrop-blur-md"
          >
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-xs font-semibold text-ink">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmToggleData && (
          <div className="z-overlay !z-[100] fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-line rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl relative"
            >
              <div className="flex gap-4 items-start">
                <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20 text-red-500 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display font-bold text-lg text-ink">
                    Desativar código em uso?
                  </h3>
                  <p className="text-xs text-ink-2 leading-relaxed">
                    Este código já foi resgatado por pelo menos um aluno. Ao desativar, quem entrou por este código perde a cortesia imediatamente e o acesso será derrubado.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-bg rounded-2xl border border-line space-y-1 font-mono text-xs">
                <p className="flex justify-between">
                  <span className="text-ink-3">Código:</span>
                  <span className="text-accent font-bold">{confirmToggleData.code.codigo}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-ink-3">Usos:</span>
                  <span className="text-ink font-semibold">{confirmToggleData.code.usos} / {confirmToggleData.code.max_usos}</span>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  disabled={toggling}
                  onClick={() => executeToggle(confirmToggleData.code.codigo, confirmToggleData.nextState)}
                  className="w-full py-3 px-4 bg-red-500 text-white rounded-xl text-xs font-bold transition-all hover:bg-red-600 cursor-pointer text-center"
                >
                  {toggling ? 'Desativando...' : 'Sim, Desativar e Bloquear Acesso'}
                </button>
                <button
                  type="button"
                  disabled={toggling}
                  onClick={() => {
                    tocar('tap');
                    setConfirmToggleData(null);
                  }}
                  className="w-full py-3 px-4 bg-raise hover:bg-raise/80 border border-line text-ink rounded-xl text-xs font-semibold cursor-pointer text-center"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {confirmDeleteData && (
          <div className="z-overlay !z-[100] fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-line rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl relative"
            >
              <div className="flex gap-4 items-start">
                <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20 text-red-500 shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display font-bold text-lg text-ink">
                    Excluir código?
                  </h3>
                  <p className="text-xs text-ink-2 leading-relaxed">
                    Você está prestes a excluir o código <span className="font-bold text-accent">{confirmDeleteData.codigo}</span>. Esta ação é irreversível e o código deixará de existir.
                  </p>
                  <p className="text-[10px] text-red-500 font-medium">
                    Nota: Se o código já foi usado, ele não poderá ser excluído, apenas desativado.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => executeExcluir(confirmDeleteData.codigo)}
                  className="w-full py-3 px-4 bg-red-600 text-white rounded-xl text-xs font-bold transition-all hover:bg-red-700 cursor-pointer text-center flex items-center justify-center gap-2"
                >
                  {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => {
                    tocar('tap');
                    setConfirmDeleteData(null);
                  }}
                  className="w-full py-3 px-4 bg-raise hover:bg-raise/80 border border-line text-ink rounded-xl text-xs font-semibold cursor-pointer text-center"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Intro Header banner */}
      <div className="bg-surface border border-line rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#F26A1B]/5 blur-3xl pointer-events-none rounded-full" />
        <div className="space-y-2 relative z-10 max-w-xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-accent uppercase tracking-wider">
            <Ticket className="w-4 h-4" />
            <span>Ferramentas de Administração</span>
          </div>
          <h2 className="text-2xl font-black font-display text-ink tracking-tight">
            Gestão de Códigos de Cortesia
          </h2>
          <p className="text-xs text-ink-2 leading-relaxed">
            Gere códigos exclusivos para dar acesso gratuito a alunos selecionados (Planos de cortesia). Você pode controlar limites de utilizações, alunos máximos por código, e revogar o acesso a qualquer momento.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="text-xs font-medium leading-relaxed">{errorMessage}</span>
        </div>
      )}

      {/* Main Grid: Create Form & List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form Container (1 col) */}
        <div className="space-y-6">
          <div className="bg-surface border border-line rounded-3xl p-6 space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-line">
              <Plus className="w-5 h-5 text-accent" />
              <h3 className="font-display font-semibold text-base text-ink">Novo Código</h3>
            </div>

            <form onSubmit={handleCreateCode} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-ink-2 uppercase tracking-wide flex justify-between">
                  <span>Código de Acesso</span>
                  <span className="text-accent">Obrigatório</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                    placeholder="Ex: SILVA100, PARCEIROPRO"
                    className="w-full bg-raise border border-line rounded-xl px-4 py-3 text-sm text-ink font-mono tracking-wider placeholder:text-ink-3 placeholder:font-sans focus:outline-none focus:border-accent"
                  />
                  <Ticket className="absolute right-3.5 top-3.5 w-4.5 h-4.5 text-ink-3" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-ink-2 uppercase tracking-wide">
                  Descrição / Para Quem
                </label>
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: João - Amigo Academia"
                  className="w-full bg-raise border border-line rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-ink-2 uppercase tracking-wide flex items-center gap-1">
                    <span>Limite Usos</span>
                    <span title="Quantas vezes esse código pode ser resgatado no total" className="cursor-help">
                      <Info className="w-3 h-3 text-ink-3" />
                    </span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxUsos}
                    onChange={(e) => setMaxUsos(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-raise border border-line rounded-xl px-4 py-3 text-sm text-ink num focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-ink-2 uppercase tracking-wide flex items-center gap-1">
                    <span>Limite Alunos</span>
                    <span title="Máximo de alunos ativos permitidos simultaneamente neste código" className="cursor-help">
                      <Info className="w-3 h-3 text-ink-3" />
                    </span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={limiteAlunos}
                    onChange={(e) => setLimiteAlunos(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-raise border border-line rounded-xl px-4 py-3 text-sm text-ink num focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-5 bg-accent hover:bg-accent/95 text-white font-semibold rounded-xl text-xs flex justify-center items-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Gerando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Gerar Código de Cortesia</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Code List (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* List Toolbar */}
          <div className="bg-surface border border-line rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-ink-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar códigos ou descrições..."
                className="w-full bg-raise border border-line rounded-xl pl-10 pr-4 py-2 text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={loadCodes}
                className="p-2 bg-raise hover:bg-raise/80 border border-line rounded-lg text-ink-2 hover:text-ink transition-colors cursor-pointer"
                title="Atualizar lista"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono text-ink-3">
                {filteredCodes.length} {filteredCodes.length === 1 ? 'código' : 'códigos'}
              </span>
            </div>
          </div>

          {/* List Display */}
          {loading ? (
            <div className="bg-surface border border-line rounded-3xl p-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-accent animate-spin mx-auto" />
              <p className="text-xs text-ink-3">Buscando códigos de cortesia no Supabase...</p>
            </div>
          ) : filteredCodes.length === 0 ? (
            <div className="bg-surface border border-line rounded-3xl p-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-accent/5 border border-line flex items-center justify-center mx-auto text-ink-3">
                <Ticket className="w-6 h-6 text-ink-3" />
              </div>
              <h4 className="font-display font-bold text-sm text-ink">Nenhum código encontrado</h4>
              <p className="text-xs text-ink-3 max-w-xs mx-auto">
                Experimente mudar o filtro de busca ou gere o primeiro código de cortesia no formulário ao lado.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Desktop Table View */}
              <div className="hidden md:block bg-surface border border-line rounded-3xl overflow-hidden">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line bg-bg/50">
                      <th className="py-4 px-6 text-[10px] font-bold text-ink-3 uppercase tracking-wider">Código</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-ink-3 uppercase tracking-wider">Descrição / Destinatário</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-ink-3 uppercase tracking-wider text-center">Usos</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-ink-3 uppercase tracking-wider">E-mail Utilizador</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-ink-3 uppercase tracking-wider text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredCodes.map((c) => {
                      const isUsed = c.usos > 0 || !!c.usado_por;
                      const emails = Array.isArray(c.usado_por) 
                        ? c.usado_por 
                        : (c.usado_por ? [c.usado_por] : []);

                      return (
                        <tr key={c.codigo} className="hover:bg-raise/10 transition-colors">
                          <td className="py-4 px-6">
                            <div className="space-y-2.5">
                              <div>
                                <span className="font-mono font-bold text-accent text-xs bg-accent/5 px-2.5 py-1 rounded-lg border border-accent/10 select-all">
                                  {c.codigo}
                                </span>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => copyLinkToClipboard(c.codigo)}
                                  className="w-fit flex items-center gap-1 py-1 px-2 bg-[#F26A1B] text-white hover:bg-[#F26A1B]/90 rounded-lg text-[9px] font-bold transition-all cursor-pointer"
                                  title="Copiar link de cadastro com código embutido"
                                >
                                  <Copy className="w-2.5 h-2.5 shrink-0" />
                                  <span>Copiar Link</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyCodeToClipboard(c.codigo)}
                                  className="w-fit flex items-center gap-1 py-1 px-2 bg-raise hover:bg-raise/80 border border-line text-ink-2 hover:text-ink rounded-lg text-[9px] font-semibold transition-all cursor-pointer"
                                  title="Copiar apenas o texto do código"
                                >
                                  <Ticket className="w-2.5 h-2.5 shrink-0 text-ink-3" />
                                  <span>Copiar Código</span>
                                </button>
                                <a
                                  href={getWhatsAppUrl(c.codigo)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => tocar('tap')}
                                  className="w-fit flex items-center gap-1 py-1 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[9px] font-bold transition-all cursor-pointer"
                                  title="Compartilhar via WhatsApp"
                                >
                                  <span className="text-[10px] leading-none">💬</span>
                                  <span>WhatsApp</span>
                                </a>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="space-y-0.5">
                              <p className="text-xs font-semibold text-ink line-clamp-1">{c.descricao || 'Sem descrição'}</p>
                              {c.limite_alunos !== 99999 && (
                                <p className="text-[10px] text-ink-3 font-mono flex items-center gap-1">
                                  <Users className="w-3 h-3 text-ink-3" />
                                  <span>Limite Alunos: {c.limite_alunos}</span>
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className="text-xs font-semibold font-mono text-ink">
                              {c.usos} <span className="text-ink-3 font-normal">/</span> {c.max_usos === 99999 ? '∞' : c.max_usos}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            {emails.length > 0 ? (
                              <div className="space-y-1">
                                {emails.map((email, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5 text-xs text-ink font-medium font-mono bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 px-2 py-0.5 rounded-lg w-fit">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>{email}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-ink-3 font-mono">Disponível</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleState(c)}
                                className={`flex items-center gap-1.5 py-1 px-3 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                  c.ativo 
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400' 
                                    : 'bg-raise border-line text-ink-3 hover:bg-emerald-500/10 hover:border-emerald-500/20 hover:text-emerald-400'
                                }`}
                                title={c.ativo ? 'Clique para desativar (bloqueará acesso)' : 'Clique para reativar'}
                              >
                                {c.ativo ? (
                                  <>
                                    <Lock className="w-3 h-3" />
                                    <span>Ativo</span>
                                  </>
                                ) : (
                                  <>
                                    <Unlock className="w-3 h-3" />
                                    <span>Inativo</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleExcluir(c)}
                                className="p-2 bg-red-500/5 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-lg transition-all cursor-pointer"
                                title="Excluir código permanentemente"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
                {filteredCodes.map((c) => {
                  const isUsed = c.usos > 0 || !!c.usado_por;
                  const emails = Array.isArray(c.usado_por) 
                    ? c.usado_por 
                    : (c.usado_por ? [c.usado_por] : []);

                  return (
                    <div key={c.codigo} className="bg-surface border border-line rounded-2xl p-5 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-accent text-xs bg-accent/5 px-2.5 py-1 rounded-lg border border-accent/10">
                            {c.codigo}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleState(c)}
                            className={`flex items-center gap-1 py-1 px-2.5 rounded-lg text-[9px] font-bold border transition-all cursor-pointer ${
                              c.ativo 
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                : 'bg-raise border-line text-ink-3'
                            }`}
                          >
                            {c.ativo ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                            <span>{c.ativo ? 'Ativo' : 'Inativo'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleExcluir(c)}
                            className="p-1.5 bg-red-500/5 text-red-500 border border-red-500/10 rounded-lg transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-xs font-semibold text-ink leading-normal">{c.descricao || 'Sem descrição'}</h4>
                        {c.limite_alunos !== 99999 && (
                          <p className="text-[10px] text-ink-3 font-mono flex items-center gap-1">
                            <Users className="w-3 h-3 text-ink-3" />
                            <span>Limite Alunos: {c.limite_alunos}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => copyLinkToClipboard(c.codigo)}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#F26A1B] text-white hover:bg-[#F26A1B]/90 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Link Completo</span>
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => copyCodeToClipboard(c.codigo)}
                            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-raise hover:bg-raise/80 border border-line text-ink-2 hover:text-ink rounded-xl text-xs font-semibold transition-all cursor-pointer"
                          >
                            <Ticket className="w-3.5 h-3.5 text-ink-3" />
                            <span>Copiar Código</span>
                          </button>
                          <a
                            href={getWhatsAppUrl(c.codigo)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => tocar('tap')}
                            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            <span className="text-sm">💬</span>
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-line flex justify-between items-center text-[11px]">
                        <div className="space-y-0.5">
                          <span className="text-ink-3">Utilizações:</span>
                          <p className="font-mono font-bold text-ink">
                            {c.usos} / {c.max_usos === 99999 ? '∞' : c.max_usos}
                          </p>
                        </div>

                        <div className="text-right space-y-1">
                          <span className="text-ink-3 block">Quem resgatou:</span>
                          {emails.length > 0 ? (
                            <span className="font-mono font-semibold text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                              {emails[0]}
                            </span>
                          ) : (
                            <span className="text-ink-3 font-mono">Livre</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
