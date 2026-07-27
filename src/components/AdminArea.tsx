import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  User, 
  CreditCard, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  TrendingDown,
  Activity,
  DollarSign,
  ArrowRight,
  Search,
  LayoutDashboard,
  Sparkles
} from 'lucide-react';
import { ZelosModal } from './ZelosModal';

interface AdminKPIs {
  total_personais: number;
  total_alunos: number;
  alunos_ativos: number;
  assinaturas_ativas: number;
  cortesias: number;
  em_avaliacao: number;
  receita_mes_centavos: number;
}

interface AdminPersonal {
  personal_id: string;
  personal_nome: string;
  plano_nome: string;
  assinatura_status: string;
  e_cortesia: boolean;
  alunos_ativos: number;
  alunos_total: number;
  limite_alunos: number;
  receita_mes_centavos: number;
}

interface AdminAluno {
  aluno_id: string;
  aluno_nome: string;
  aluno_ativo: boolean;
  personal_nome: string;
  personal_plano_nome: string;
  personal_cortesia: boolean;
  personal_id: string;
}

interface AdminPlano {
  plano_nome: string;
  preco_centavos: number;
  personais: number;
  personais_ativos: number;
  receita_mes_centavos: number;
}

interface NovoCadastro {
  id: number;
  usuario_id: string;
  papel: string;
  nome: string;
  criado_em: string;
}

interface AdminAcessoResumo {
  nome: string;
  papel: string;
  acessos_24h: number;
  acessos_7d: number;
  ultimo_acesso: string;
}

interface AdminUltimoAcesso {
  nome: string;
  papel: string;
  acessado_em: string;
}

export default function AdminArea() {
  const [kpis, setKpis] = useState<AdminKPIs | null>(null);
  const [personais, setPersonais] = useState<AdminPersonal[]>([]);
  const [alunos, setAlunos] = useState<AdminAluno[]>([]);
  const [planos, setPlanos] = useState<AdminPlano[]>([]);
  const [acessosResumo, setAcessosResumo] = useState<AdminAcessoResumo[]>([]);
  const [ultimosAcessos, setUltimosAcessos] = useState<AdminUltimoAcesso[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPersonalId, setSelectedPersonalId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState<'personais' | 'alunos' | 'planos' | 'acessos'>('personais');

  const [modalConfig, setModalConfig] = useState<{
    show: boolean;
    type: 'confirm' | 'alert';
    variant?: 'danger' | 'warning' | 'success' | 'info';
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  const [novosCadastrosModal, setNovosCadastrosModal] = useState<NovoCadastro[] | null>(null);

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [kpiRes, personaisRes, alunosRes, planosRes, acessosRes, ultimosRes] = await Promise.all([
        supabase.from('v_admin_kpis').select('*').single(),
        supabase.from('v_admin_personais').select('*').order('receita_mes_centavos', { ascending: false }),
        supabase.from('v_admin_alunos').select('*').order('aluno_nome'),
        supabase.from('v_admin_por_plano').select('*').order('receita_mes_centavos', { ascending: false }),
        supabase.from('v_admin_acessos_resumo').select('*').order('ultimo_acesso', { ascending: false }),
        supabase.from('v_admin_ultimos_acessos').select('*').limit(50)
      ]);

      if (kpiRes.data) setKpis(kpiRes.data);
      if (personaisRes.data) setPersonais(personaisRes.data);
      if (alunosRes.data) setAlunos(alunosRes.data);
      if (planosRes.data) setPlanos(planosRes.data);
      if (acessosRes.data) setAcessosResumo(acessosRes.data);
      if (ultimosRes.data) setUltimosAcessos(ultimosRes.data);

      // Check for new notifications
      const { data: novos } = await supabase.from('v_admin_novos_nao_avisados').select('*');
      if (novos && novos.length > 0) {
        setNovosCadastrosModal(novos);
      }
    } catch (err) {
      console.error('Erro ao carregar dados admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCloseNovos = async () => {
    if (novosCadastrosModal) {
      const ids = novosCadastrosModal.map(n => n.id);
      await supabase.from('admin_novos_cadastros').update({ avisado: true }).in('id', ids);
      setNovosCadastrosModal(null);
    }
  };

  const filteredPersonais = personais.filter(p => 
    p.personal_nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAlunos = alunos.filter(a => 
    a.aluno_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.personal_nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAlunosDoPersonal = selectedPersonalId 
    ? alunos.filter(a => a.personal_id === selectedPersonalId)
    : [];

  const [highlightedPersonalId, setHighlightedPersonalId] = useState<string | null>(null);

  const usuariosUnicos24h = acessosResumo.filter(a => a.acessos_24h > 0).length;

  return (
    <div className="space-y-8 pb-12">
      {/* 1. KPIs DASHBOARD */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard 
            title="Receita Mensal" 
            value={formatCurrency(kpis.receita_mes_centavos)} 
            icon={DollarSign} 
            color="text-emerald-500" 
            bgColor="bg-emerald-500/10"
          />
          <KPICard 
            title="Personais" 
            value={kpis.total_personais.toString()} 
            icon={User} 
            color="text-accent" 
            bgColor="bg-accent/10"
          />
          <KPICard 
            title="Alunos" 
            value={kpis.total_alunos.toString()} 
            icon={Users} 
            color="text-violet" 
            bgColor="bg-violet/10"
          />
          <KPICard 
            title="Assinaturas Ativas" 
            value={kpis.assinaturas_ativas.toString()} 
            icon={CheckCircle2} 
            color="text-blue-500" 
            bgColor="bg-blue-500/10"
          />
          <KPICard 
            title="Cortesia/Avaliação" 
            value={`${kpis.cortesias + kpis.em_avaliacao}`} 
            icon={Activity} 
            color="text-amber-500" 
            bgColor="bg-amber-500/10"
          />
          <KPICard 
            title="Alunos Ativos" 
            value={kpis.alunos_ativos.toString()} 
            icon={TrendingUp} 
            color="text-emerald-500" 
            bgColor="bg-emerald-500/10"
          />
        </div>
      )}

      {/* 2. NAVIGATION & SEARCH */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface border border-line p-4 rounded-3xl">
        <div className="flex items-center gap-2 bg-void p-1 rounded-2xl w-full sm:w-auto">
          <TabButton 
            active={activeSection === 'personais'} 
            onClick={() => { setActiveSection('personais'); setSelectedPersonalId(null); setHighlightedPersonalId(null); }}
            label="Personais"
          />
          <TabButton 
            active={activeSection === 'alunos'} 
            onClick={() => { setActiveSection('alunos'); setSelectedPersonalId(null); setHighlightedPersonalId(null); }}
            label="Alunos"
          />
          <TabButton 
            active={activeSection === 'planos'} 
            onClick={() => { setActiveSection('planos'); setSelectedPersonalId(null); setHighlightedPersonalId(null); }}
            label="Planos"
          />
          <TabButton 
            active={activeSection === 'acessos'} 
            onClick={() => { setActiveSection('acessos'); setSelectedPersonalId(null); setHighlightedPersonalId(null); }}
            label="Acessos"
          />
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
          <input 
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-void border border-line rounded-xl text-sm focus:border-accent transition-colors"
          />
        </div>
      </div>

      {/* 3. SECTION CONTENT */}
      <div className="space-y-6">
        {activeSection === 'personais' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className={`${selectedPersonalId ? 'lg:col-span-8' : 'lg:col-span-12'} transition-all`}>
              <div className="bg-surface border border-line rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-void/50 border-b border-line">
                        <th className="px-6 py-4 text-xs font-mono text-ink-3 uppercase tracking-wider">Personal</th>
                        <th className="px-6 py-4 text-xs font-mono text-ink-3 uppercase tracking-wider">Plano</th>
                        <th className="px-6 py-4 text-xs font-mono text-ink-3 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-mono text-ink-3 uppercase tracking-wider text-center">Alunos (A/T)</th>
                        <th className="px-6 py-4 text-xs font-mono text-ink-3 uppercase tracking-wider text-right">Receita/Mês</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {filteredPersonais.map(p => (
                        <tr 
                          key={p.personal_id}
                          onClick={() => setSelectedPersonalId(selectedPersonalId === p.personal_id ? null : p.personal_id)}
                          className={`hover:bg-accent/5 transition-colors cursor-pointer ${selectedPersonalId === p.personal_id ? 'bg-accent/10' : ''}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xs shrink-0">
                                {p.personal_nome.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-semibold text-ink">{p.personal_nome}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-ink-2">{p.plano_nome}</span>
                              {p.e_cortesia && (
                                <span className="bg-emerald-500/10 text-emerald-500 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-emerald-500/20">
                                  Cortesia
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                              p.assinatura_status === 'ativa' ? 'bg-emerald-500/10 text-emerald-500' : 
                              p.assinatura_status === 'trial' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'
                            }`}>
                              {p.assinatura_status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="text-sm font-mono text-ink">
                              {p.alunos_ativos} / {p.alunos_total}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-emerald-500 num">
                            {formatCurrency(p.receita_mes_centavos)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {selectedPersonalId && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:col-span-4"
              >
                <div className="bg-surface border border-line rounded-3xl p-6 sticky top-24">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-display font-bold text-ink leading-tight">Alunos do Personal</h3>
                      <p className="text-xs text-ink-3 mt-0.5">{personais.find(p => p.personal_id === selectedPersonalId)?.personal_nome}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedPersonalId(null)}
                      className="p-1.5 rounded-lg hover:bg-raise text-ink-3 transition-colors"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredAlunosDoPersonal.map(a => (
                      <div key={a.aluno_id} className="flex items-center justify-between p-3 bg-void rounded-2xl border border-line group">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${a.aluno_ativo ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span className="text-xs font-semibold text-ink group-hover:text-accent transition-colors">{a.aluno_nome}</span>
                        </div>
                      </div>
                    ))}
                    {filteredAlunosDoPersonal.length === 0 && (
                      <div className="text-center py-12 space-y-3">
                        <Users className="w-8 h-8 text-ink-3 mx-auto opacity-20" />
                        <p className="text-xs text-ink-3 italic px-4">Este personal ainda não possui alunos vinculados.</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {activeSection === 'alunos' && (
          <div className="bg-surface border border-line rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-void/50 border-b border-line">
                    <th className="px-6 py-4 text-xs font-mono text-ink-3 uppercase tracking-wider">Aluno</th>
                    <th className="px-6 py-4 text-xs font-mono text-ink-3 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-mono text-ink-3 uppercase tracking-wider">Personal</th>
                    <th className="px-6 py-4 text-xs font-mono text-ink-3 uppercase tracking-wider">Plano Personal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredAlunos.map(a => (
                    <tr 
                      key={a.aluno_id}
                      onClick={() => setHighlightedPersonalId(highlightedPersonalId === a.personal_id ? null : a.personal_id)}
                      className={`hover:bg-accent/5 transition-colors cursor-pointer ${highlightedPersonalId === a.personal_id ? 'bg-accent/10' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-ink">{a.aluno_nome}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          a.aluno_ativo ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          {a.aluno_ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium transition-colors ${highlightedPersonalId === a.personal_id ? 'text-accent font-bold' : 'text-ink-2'}`}>
                            {a.personal_nome}
                          </span>
                          {highlightedPersonalId === a.personal_id && <Sparkles className="w-3 h-3 text-accent animate-pulse" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-ink-3">{a.personal_plano_nome}</span>
                          {a.personal_cortesia && (
                            <span className="bg-emerald-500/10 text-emerald-500 text-[9px] px-1.5 py-0.5 rounded-full font-bold">C</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === 'planos' && (
          <div className="space-y-8">
            {/* Planos Pagos */}
            <div className="bg-surface border border-line rounded-3xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-line bg-void/30">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-accent" />
                  Planos por Assinatura
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-void/50 border-b border-line">
                      <th className="px-6 py-4 text-xs font-mono text-ink-3 uppercase tracking-wider">Plano</th>
                      <th className="px-6 py-4 text-xs font-mono text-ink-3 uppercase tracking-wider">Preço</th>
                      <th className="px-6 py-4 text-xs font-mono text-ink-3 uppercase tracking-wider text-center">Personais (A/T)</th>
                      <th className="px-6 py-4 text-xs font-mono text-ink-3 uppercase tracking-wider text-right">Receita/Mês</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {planos.filter(p => p.receita_mes_centavos > 0).map(p => (
                      <tr key={p.plano_nome} className="hover:bg-accent/5 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-bold text-ink">{p.plano_nome}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-ink-2 num">{formatCurrency(p.preco_centavos)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm font-mono text-ink font-bold">
                            {p.personais_ativos} / {p.personais}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-bold text-emerald-500 num">
                            {formatCurrency(p.receita_mes_centavos)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Planos Gratuitos / Cortesia */}
            <div className="bg-surface border border-line rounded-3xl overflow-hidden opacity-90 grayscale-[0.5]">
              <div className="px-6 py-4 border-b border-line bg-void/30">
                <h3 className="text-sm font-bold text-ink-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Cortesia & Avaliação (Receita Zero)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-void/50 border-b border-line">
                      <th className="px-6 py-4 text-xs font-mono text-ink-3 uppercase tracking-wider">Tipo</th>
                      <th className="px-6 py-4 text-xs font-mono text-ink-3 uppercase tracking-wider">Custo</th>
                      <th className="px-6 py-4 text-xs font-mono text-ink-3 uppercase tracking-wider text-center">Usuários</th>
                      <th className="px-6 py-4 text-xs font-mono text-ink-3 uppercase tracking-wider text-right">Impacto Financeiro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {planos.filter(p => p.receita_mes_centavos === 0).map(p => (
                      <tr key={p.plano_nome} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-ink-2">{p.plano_nome}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xs text-ink-3 italic">Gratuito</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm font-mono text-ink-2">
                            {p.personais}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-xs text-ink-3 italic">
                          - {formatCurrency(p.preco_centavos * p.personais)} (Teórico)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'acessos' && (
          <div className="space-y-8">
            {/* Resumo Acessos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <KPICard 
                title="Usuários Ativos (24h)" 
                value={usuariosUnicos24h.toString()} 
                icon={Activity} 
                color="text-accent" 
                bgColor="bg-accent/10"
              />
              <KPICard 
                title="Total Logs (Feed)" 
                value={ultimosAcessos.length.toString()} 
                icon={Search} 
                color="text-ink-3" 
                bgColor="bg-void"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Tabela de Resumo por Usuário */}
              <div className="lg:col-span-8">
                <div className="bg-surface border border-line rounded-3xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-line bg-void/30">
                    <h3 className="text-sm font-bold text-ink">Estatísticas de Acesso</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-void/50 border-b border-line">
                          <th className="px-6 py-4 text-xs font-mono text-ink-3 uppercase tracking-wider">Usuário</th>
                          <th className="px-6 py-4 text-xs font-mono text-ink-3 uppercase tracking-wider text-center">24h</th>
                          <th className="px-6 py-4 text-xs font-mono text-ink-3 uppercase tracking-wider text-center">7d</th>
                          <th className="px-6 py-4 text-xs font-mono text-ink-3 uppercase tracking-wider text-right">Último</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {acessosResumo.map((a, idx) => (
                          <tr key={idx} className="hover:bg-accent/5 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-ink">{a.nome}</span>
                                <span className="text-[10px] text-ink-3 uppercase font-bold tracking-wider">{a.papel}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-mono text-ink">
                              {a.acessos_24h}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-mono text-ink">
                              {a.acessos_7d}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-[11px] font-mono text-ink-3">
                              {new Date(a.ultimo_acesso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Feed de Últimos Acessos */}
              <div className="lg:col-span-4">
                <div className="bg-surface border border-line rounded-3xl p-6 sticky top-24">
                  <h3 className="font-display font-bold text-ink mb-6">Feed de Atividade</h3>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {ultimosAcessos.map((a, idx) => {
                      const data = new Date(a.acessado_em);
                      const isHoje = new Date().toDateString() === data.toDateString();
                      
                      return (
                        <div key={idx} className="flex gap-3 items-start group">
                          <div className="w-1 bg-line group-hover:bg-accent rounded-full self-stretch transition-colors" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-ink-2 leading-snug">
                              <span className="font-bold text-ink">{a.nome}</span> 
                              <span className="text-[10px] text-ink-3 uppercase font-bold ml-1">({a.papel})</span>
                            </p>
                            <p className="text-[10px] text-ink-3 mt-0.5">
                              Entrou às {data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} 
                              {isHoje ? ' de hoje' : ` em ${data.toLocaleDateString('pt-BR')}`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. MODALS */}
      {novosCadastrosModal && (
        <ZelosModal
          show={true}
          type="alert"
          variant="info"
          title="Novos Cadastros"
          message={
            <div className="space-y-4 text-left">
              <p className="text-xs text-ink-2">Os seguintes usuários se cadastraram recentemente:</p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {novosCadastrosModal.map(n => (
                  <div key={n.id} className="flex items-center justify-between p-2.5 bg-void rounded-xl border border-line">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-ink">{n.nome}</span>
                      <span className="text-[10px] text-ink-3 uppercase font-bold tracking-wider">{n.papel === 'personal' ? 'Personal Trainer' : 'Aluno'}</span>
                    </div>
                    <span className="text-[10px] font-mono text-ink-3">
                      {new Date(n.criado_em).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          }
          confirmLabel="Entendido"
          onConfirm={handleCloseNovos}
        />
      )}

      {modalConfig && (
        <ZelosModal
          show={modalConfig.show}
          type={modalConfig.type}
          variant={modalConfig.variant}
          title={modalConfig.title}
          message={modalConfig.message}
          confirmLabel={modalConfig.confirmLabel}
          onConfirm={modalConfig.onConfirm}
          onCancel={() => setModalConfig(null)}
        />
      )}
    </div>
  );
}

function KPICard({ title, value, icon: Icon, color, bgColor }: { title: string, value: string, icon: any, color: string, bgColor: string }) {
  return (
    <div className="bg-surface border border-line p-5 rounded-3xl relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-24 h-24 ${bgColor}/20 blur-3xl rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-500`} />
      <div className="flex items-center justify-between relative z-10">
        <div className="space-y-1">
          <p className="text-xs font-mono text-ink-3 uppercase tracking-wider">{title}</p>
          <p className={`text-2xl font-display font-black ${color} num`}>{value}</p>
        </div>
        <div className={`${bgColor} ${color} p-3 rounded-2xl`}>
          <Icon className="w-5 h-5" strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
        active 
          ? 'bg-accent text-white shadow-lg shadow-accent/20' 
          : 'text-ink-3 hover:text-ink hover:bg-white/5'
      }`}
    >
      {label}
    </button>
  );
}
