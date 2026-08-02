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
  Sparkles,
  ClipboardList,
  Filter,
  Calendar,
  UserPlus,
  X,
  MessageSquare,
  Phone
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
  email: string;
  telefone: string | null;
  plano: string;
  plano_nome: string;
  assinatura_status: string;
  e_cortesia: boolean;
  expira_em: string | null;
  dias_restantes: number | null;
  trial_expirado: boolean | null;
  mensalidade_centavos: number;
  receita_mes_centavos: number;
  alunos_ativos: number;
  alunos_total: number;
  limite_alunos: number;
  criado_em: string;
  whatsapp_link: string | null;
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

interface PersonalCadastrado {
  personal_id: string;
  nome: string;
  email: string;
  cadastrado_em: string;
  plano: string;
  status_assinatura: string;
  limite_alunos: number;
  expira_em: string;
  codigo_cortesia: string;
  situacao: 'em_trial' | 'trial_expirado' | 'assinante_pagante' | 'cancelou';
  qtd_alunos_cadastrados: number;
  dias_desde_cadastro: number;
}

interface AdminTrial {
  assinatura_id: string;
  personal_id: string;
  personal_nome: string;
  telefone: string | null;
  status: string;
  plano: string;
  expira_em: string;
  dias_restantes: number;
  ja_expirado: boolean;
  whatsapp_link: string | null;
}

function TrialCard({ 
  trial, 
  onSavePhone 
}: { 
  trial: AdminTrial; 
  onSavePhone: (personalId: string, phone: string) => Promise<void>; 
}) {
  const formatPhoneMask = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : '';
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const [phoneInput, setPhoneInput] = useState(formatPhoneMask(trial.telefone || ''));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPhoneInput(formatPhoneMask(trial.telefone || ''));
  }, [trial.telefone]);

  const handleSave = async () => {
    const digits = phoneInput.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 11) {
      alert('Digite um telefone válido com DDD (10 ou 11 dígitos).');
      return;
    }
    const ddd = parseInt(digits.slice(0, 2));
    if (ddd < 11 || ddd > 99) {
      alert('DDD inválido.');
      return;
    }
    setSaving(true);
    await onSavePhone(trial.personal_id, digits);
    setSaving(false);
  };

  const formattedDate = trial.expira_em 
    ? new Date(trial.expira_em).toLocaleDateString('pt-BR')
    : 'N/A';

  const isExpired = trial.ja_expirado || trial.dias_restantes < 0;
  const isExpiringSoon = !isExpired && trial.dias_restantes <= 3;

  const daysText = isExpired 
    ? `Venceu há ${Math.abs(trial.dias_restantes)} dia(s)`
    : trial.dias_restantes === 0 
      ? 'Vence hoje' 
      : `Vence em ${trial.dias_restantes} dia(s)`;

  const badgeColor = isExpired 
    ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' 
    : isExpiringSoon 
      ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
      : 'bg-void text-ink-2 border-line';

  const phoneDigits = trial.telefone ? trial.telefone.replace(/\D/g, '') : '';
  const waUrl = trial.whatsapp_link || (phoneDigits ? `https://wa.me/55${phoneDigits}` : null);

  return (
    <div className="p-4 bg-void border border-line rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-sm text-ink truncate">{trial.personal_nome}</span>
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
            {daysText}
          </span>
        </div>
        <p className="text-xs text-ink-3">
          Trial de {trial.personal_nome} encerrou em <span className="font-mono text-ink-2 font-semibold">{formattedDate}</span>
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {waUrl ? (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Oferta via WhatsApp</span>
          </a>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="(11) 99999-9999"
              value={phoneInput}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '');
                if (digits.length <= 11) setPhoneInput(formatPhoneMask(digits));
              }}
              className="w-36 px-3 py-1.5 bg-surface border border-line rounded-xl text-xs text-ink focus:border-accent"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 bg-accent hover:bg-accent/90 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? '...' : 'Salvar'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PersonalDetailsModal({
  personal,
  onClose,
  onSavePhone,
  onVerAlunos
}: {
  personal: AdminPersonal;
  onClose: () => void;
  onSavePhone: (personalId: string, phoneDigits: string) => Promise<void>;
  onVerAlunos: (personalId: string) => void;
}) {
  const formatPhoneMask = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : '';
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const [phoneInput, setPhoneInput] = useState(formatPhoneMask(personal.telefone || ''));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    setPhoneInput(formatPhoneMask(personal.telefone || ''));
  }, [personal.telefone]);

  const handleSavePhone = async () => {
    const digits = phoneInput.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 11) {
      alert('Digite um telefone válido com DDD (10 ou 11 dígitos).');
      return;
    }
    const ddd = parseInt(digits.slice(0, 2));
    if (ddd < 11 || ddd > 99) {
      alert('DDD inválido.');
      return;
    }
    setSaving(true);
    await onSavePhone(personal.personal_id, digits);
    setSaving(false);
  };

  const formatCurrency = (centavos: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((centavos || 0) / 100);
  };

  const phoneDigits = personal.telefone ? personal.telefone.replace(/\D/g, '') : '';
  const waUrl = personal.whatsapp_link || (phoneDigits ? `https://wa.me/55${phoneDigits}` : null);

  const createdDate = personal.criado_em 
    ? new Date(personal.criado_em).toLocaleDateString('pt-BR')
    : 'N/A';

  const expiraDate = personal.expira_em 
    ? new Date(personal.expira_em).toLocaleDateString('pt-BR')
    : null;

  const isExpired = personal.trial_expirado || (personal.dias_restantes !== null && personal.dias_restantes !== undefined && personal.dias_restantes < 0);
  const isExpiringSoon = !isExpired && personal.dias_restantes !== null && personal.dias_restantes !== undefined && personal.dias_restantes <= 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-line rounded-3xl p-6 sm:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl relative"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-bold text-lg shrink-0">
              {personal.personal_nome ? personal.personal_nome.charAt(0).toUpperCase() : 'P'}
            </div>
            <div>
              <h2 className="font-display font-bold text-lg sm:text-xl text-ink leading-snug">
                {personal.personal_nome}
              </h2>
              <p className="text-xs text-ink-3">{personal.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-ink-3 hover:text-ink hover:bg-raise transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Details Grid */}
        <div className="space-y-4">
          {/* Telefone / WhatsApp */}
          <div className="p-4 bg-void border border-line rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-3 font-semibold flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-accent" />
                Telefone / WhatsApp
              </span>
              {waUrl && (
                <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold border border-emerald-500/20">
                  Cadastrado
                </span>
              )}
            </div>

            {waUrl ? (
              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-sm font-mono text-ink font-semibold">
                  {formatPhoneMask(personal.telefone || '')}
                </span>
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Abrir no WhatsApp</span>
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="(11) 99999-9999"
                  value={phoneInput}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    if (digits.length <= 11) setPhoneInput(formatPhoneMask(digits));
                  }}
                  className="flex-1 px-3 py-2 bg-surface border border-line rounded-xl text-xs text-ink focus:border-accent"
                />
                <button
                  type="button"
                  onClick={handleSavePhone}
                  disabled={saving}
                  className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {saving ? '...' : 'Salvar telefone'}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Cadastro */}
            <div className="p-4 bg-void border border-line rounded-2xl space-y-1">
              <span className="text-[11px] text-ink-3 uppercase font-mono tracking-wider block">Data de Cadastro</span>
              <p className="text-sm font-semibold text-ink flex items-center gap-2 pt-0.5">
                <Calendar className="w-3.5 h-3.5 text-ink-3" />
                {createdDate}
              </p>
            </div>

            {/* Plano + Cortesia */}
            <div className="p-4 bg-void border border-line rounded-2xl space-y-1">
              <span className="text-[11px] text-ink-3 uppercase font-mono tracking-wider block">Plano Atual</span>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-sm font-bold text-ink">{personal.plano_nome || personal.plano || 'N/A'}</span>
                {personal.e_cortesia && (
                  <span className="bg-emerald-500/10 text-emerald-500 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-emerald-500/20">
                    Cortesia
                  </span>
                )}
              </div>
            </div>

            {/* Status da Assinatura & Expiração */}
            <div className="p-4 bg-void border border-line rounded-2xl space-y-1 sm:col-span-2">
              <span className="text-[11px] text-ink-3 uppercase font-mono tracking-wider block">Status da Assinatura</span>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <span className={`text-xs uppercase font-bold px-3 py-1 rounded-full ${
                  personal.assinatura_status === 'ativa' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                  personal.assinatura_status === 'trial' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                  'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                }`}>
                  {personal.assinatura_status || 'desconhecido'}
                </span>

                {expiraDate && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ink-3">Expira em <span className="font-mono text-ink-2 font-semibold">{expiraDate}</span></span>
                    {personal.dias_restantes !== null && personal.dias_restantes !== undefined && (
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        isExpired
                          ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                          : isExpiringSoon
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : 'bg-surface text-ink-2 border-line'
                      }`}>
                        {isExpired
                          ? `Venceu há ${Math.abs(personal.dias_restantes)}d`
                          : `Vence em ${personal.dias_restantes}d`}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Mensalidade */}
            <div className="p-4 bg-void border border-line rounded-2xl space-y-1">
              <span className="text-[11px] text-ink-3 uppercase font-mono tracking-wider block">Mensalidade</span>
              <p className="text-sm font-bold text-ink num">
                {formatCurrency(personal.mensalidade_centavos)}
              </p>
            </div>

            {/* Receita Mes */}
            <div className="p-4 bg-void border border-line rounded-2xl space-y-1">
              <span className="text-[11px] text-ink-3 uppercase font-mono tracking-wider block">Receita Mensal</span>
              <p className="text-sm font-bold text-emerald-500 num">
                {formatCurrency(personal.receita_mes_centavos)}
              </p>
            </div>

            {/* Alunos Info */}
            <div className="p-4 bg-void border border-line rounded-2xl space-y-1 sm:col-span-2">
              <span className="text-[11px] text-ink-3 uppercase font-mono tracking-wider block">Alunos Cadastrados</span>
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-semibold text-ink">
                  <span className="text-emerald-500 font-bold">{personal.alunos_ativos}</span> ativos de <span className="font-bold">{personal.alunos_total}</span> no total
                </span>
                <span className="text-xs font-mono text-ink-3">
                  Limite: {personal.limite_alunos} alunos
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-line">
          <button
            type="button"
            onClick={() => onVerAlunos(personal.personal_id)}
            className="w-full sm:w-auto px-5 py-2.5 bg-accent hover:bg-accent/90 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <Users className="w-4 h-4" />
            <span>Ver alunos deste personal</span>
          </button>
          
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-raise hover:bg-raise/80 text-ink font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminArea() {
  const [kpis, setKpis] = useState<AdminKPIs | null>(null);
  const [personais, setPersonais] = useState<AdminPersonal[]>([]);
  const [personaisCompletos, setPersonaisCompletos] = useState<PersonalCadastrado[]>([]);
  const [alunos, setAlunos] = useState<AdminAluno[]>([]);
  const [planos, setPlanos] = useState<AdminPlano[]>([]);
  const [acessosResumo, setAcessosResumo] = useState<AdminAcessoResumo[]>([]);
  const [ultimosAcessos, setUltimosAcessos] = useState<AdminUltimoAcesso[]>([]);
  const [trials, setTrials] = useState<AdminTrial[]>([]);
  const [expiredTrialsModal, setExpiredTrialsModal] = useState<AdminTrial[] | null>(null);
  const [selectedPersonalForModal, setSelectedPersonalForModal] = useState<AdminPersonal | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPersonalId, setSelectedPersonalId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [situacaoFilter, setSituacaoFilter] = useState<string>('Todos');
  const [activeSection, setActiveSection] = useState<'personais' | 'alunos' | 'planos' | 'acessos' | 'lista_personais'>('personais');

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
      const [kpiRes, personaisRes, alunosRes, planosRes, acessosRes, ultimosRes, personaisCompletosRes, trialsRes] = await Promise.all([
        supabase.from('v_admin_kpis').select('*').single(),
        supabase.from('v_admin_personais').select('*').order('receita_mes_centavos', { ascending: false }),
        supabase.from('v_admin_alunos').select('*').order('aluno_nome'),
        supabase.from('v_admin_por_plano').select('*').order('receita_mes_centavos', { ascending: false }),
        supabase.from('v_admin_acessos_resumo').select('*').order('ultimo_acesso', { ascending: false }),
        supabase.from('v_admin_ultimos_acessos').select('*').limit(50),
        supabase.rpc('admin_listar_personais'),
        supabase.from('v_admin_trials').select('*')
      ]);

      if (kpiRes.data) setKpis(kpiRes.data);
      if (personaisRes.data) {
        setPersonais(personaisRes.data);
        if (selectedPersonalForModal) {
          const updated = personaisRes.data.find((item: AdminPersonal) => item.personal_id === selectedPersonalForModal.personal_id);
          if (updated) setSelectedPersonalForModal(updated);
        }
      }
      if (alunosRes.data) setAlunos(alunosRes.data);
      if (planosRes.data) setPlanos(planosRes.data);
      if (acessosRes.data) setAcessosResumo(acessosRes.data);
      if (ultimosRes.data) setUltimosAcessos(ultimosRes.data);
      if (personaisCompletosRes.data) setPersonaisCompletos(personaisCompletosRes.data);

      if (trialsRes.data) {
        setTrials(trialsRes.data);
        const expired = trialsRes.data.filter((t: AdminTrial) => t.ja_expirado === true || t.dias_restantes < 0);
        if (expired.length > 0) {
          setExpiredTrialsModal(expired);
        } else {
          setExpiredTrialsModal(null);
        }
      }

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

  const handleSavePhoneFromTrial = async (personalId: string, phoneDigits: string) => {
    try {
      const { error } = await supabase.from('profiles').update({ telefone: phoneDigits }).eq('id', personalId);
      if (error) {
        console.error('Erro ao salvar telefone:', error);
        alert('Erro ao salvar telefone.');
        return;
      }
      await fetchData();
    } catch (err) {
      console.error('Erro ao atualizar telefone:', err);
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
            label="Dashboard"
          />
          <TabButton 
            active={activeSection === 'lista_personais'} 
            onClick={() => { setActiveSection('lista_personais'); setSelectedPersonalId(null); setHighlightedPersonalId(null); }}
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

        {activeSection === 'lista_personais' && (
          <div className="space-y-6">
            {/* Resumo Situacao */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard 
                title="Em Trial" 
                value={personaisCompletos.filter(p => p.situacao === 'em_trial').length.toString()} 
                icon={Activity} 
                color="text-amber-500" 
                bgColor="bg-amber-500/10"
              />
              <KPICard 
                title="Assinantes Pagantes" 
                value={personaisCompletos.filter(p => p.situacao === 'assinante_pagante').length.toString()} 
                icon={CheckCircle2} 
                color="text-emerald-500" 
                bgColor="bg-emerald-500/10"
              />
              <KPICard 
                title="Trial Expirado" 
                value={personaisCompletos.filter(p => p.situacao === 'trial_expirado').length.toString()} 
                icon={AlertCircle} 
                color="text-rose-500" 
                bgColor="bg-rose-500/10"
              />
              <KPICard 
                title="Cancelaram" 
                value={personaisCompletos.filter(p => p.situacao === 'cancelou').length.toString()} 
                icon={X} 
                color="text-ink-3" 
                bgColor="bg-void"
              />
            </div>

            {/* trials section */}
            {trials.length > 0 && (
              <div className="bg-surface border border-line rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <h3 className="font-display font-bold text-sm sm:text-base text-ink">Personais em Trial & Contato via WhatsApp</h3>
                  </div>
                  <span className="text-xs text-ink-3 font-mono">{trials.length} personal(is) em trial</span>
                </div>
                <div className="space-y-3">
                  {trials.map((trial) => (
                    <TrialCard 
                      key={trial.assinatura_id || trial.personal_id}
                      trial={trial}
                      onSavePhone={handleSavePhoneFromTrial}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Filtros */}
            <div className="bg-surface border border-line p-6 rounded-3xl space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] font-mono text-ink-3 uppercase tracking-wider block ml-1">Buscar por Nome ou E-mail</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
                    <input 
                      type="text"
                      placeholder="Nome ou e-mail..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-void border border-line rounded-xl text-sm focus:border-accent transition-colors"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-64 space-y-1.5">
                  <label className="text-[10px] font-mono text-ink-3 uppercase tracking-wider block ml-1">Filtrar por Situação</label>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
                    <select 
                      value={situacaoFilter}
                      onChange={(e) => setSituacaoFilter(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-void border border-line rounded-xl text-sm focus:border-accent appearance-none transition-colors cursor-pointer"
                    >
                      <option value="Todos">Todas as situações</option>
                      <option value="em_trial">Em Trial</option>
                      <option value="assinante_pagante">Assinante Pagante</option>
                      <option value="trial_expirado">Trial Expirado</option>
                      <option value="cancelou">Cancelou</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabela de Personais */}
            <div className="bg-surface border border-line rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-void/50 border-b border-line">
                      <th className="px-6 py-4 text-xs font-mono text-ink-3 uppercase tracking-wider">Personal</th>
                      <th className="px-6 py-4 text-xs font-mono text-ink-3 uppercase tracking-wider">Cadastro</th>
                      <th className="px-6 py-4 text-xs font-mono text-ink-3 uppercase tracking-wider">Situação</th>
                      <th className="px-6 py-4 text-xs font-mono text-ink-3 uppercase tracking-wider">Expiração / Contato</th>
                      <th className="px-6 py-4 text-xs font-mono text-ink-3 uppercase tracking-wider text-center">Alunos</th>
                      <th className="px-6 py-4 text-xs font-mono text-ink-3 uppercase tracking-wider text-right">Dias</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {personaisCompletos
                      .filter(p => {
                        const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || p.email.toLowerCase().includes(searchTerm.toLowerCase());
                        const matchesSituacao = situacaoFilter === 'Todos' || p.situacao === situacaoFilter;
                        return matchesSearch && matchesSituacao;
                      })
                      .map(p => {
                        const trial = trials.find(t => t.personal_id === p.personal_id);
                        const fullPersonal = personais.find(item => item.personal_id === p.personal_id);

                        const handleRowClick = () => {
                          if (fullPersonal) {
                            setSelectedPersonalForModal(fullPersonal);
                          } else {
                            setSelectedPersonalForModal({
                              personal_id: p.personal_id,
                              personal_nome: p.nome,
                              email: p.email,
                              telefone: trial?.telefone || null,
                              plano: p.plano,
                              plano_nome: p.plano,
                              assinatura_status: p.situacao,
                              e_cortesia: false,
                              expira_em: p.expira_em,
                              dias_restantes: trial?.dias_restantes ?? null,
                              trial_expirado: p.situacao === 'trial_expirado' || (trial?.ja_expirado ?? false),
                              mensalidade_centavos: 0,
                              receita_mes_centavos: 0,
                              alunos_ativos: p.qtd_alunos_cadastrados,
                              alunos_total: p.qtd_alunos_cadastrados,
                              limite_alunos: p.limite_alunos,
                              criado_em: p.cadastrado_em,
                              whatsapp_link: trial?.whatsapp_link || null
                            });
                          }
                        };

                        return (
                          <tr 
                            key={p.personal_id} 
                            onClick={handleRowClick}
                            className="hover:bg-accent/5 transition-colors cursor-pointer"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-ink group-hover:text-accent">{p.nome}</span>
                                <span className="text-[11px] text-ink-3">{p.email}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2 text-xs text-ink-2">
                                <Calendar className="w-3 h-3 text-ink-3" />
                                {new Date(p.cadastrado_em).toLocaleDateString('pt-BR')}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                p.situacao === 'assinante_pagante' ? 'bg-emerald-500/10 text-emerald-500' : 
                                p.situacao === 'em_trial' ? 'bg-amber-500/10 text-amber-500' : 
                                p.situacao === 'trial_expirado' ? 'bg-rose-500/10 text-rose-500' : 
                                'bg-ink-3/10 text-ink-3'
                              }`}>
                                {p.situacao.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {trial ? (
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    trial.ja_expirado || trial.dias_restantes < 0
                                      ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                      : trial.dias_restantes <= 3
                                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                        : 'bg-void text-ink-2 border-line'
                                  }`}>
                                    {trial.ja_expirado || trial.dias_restantes < 0
                                      ? `Venceu há ${Math.abs(trial.dias_restantes)}d`
                                      : `Vence em ${trial.dias_restantes}d`}
                                  </span>
                                  {trial.whatsapp_link || trial.telefone ? (
                                    <a
                                      href={trial.whatsapp_link || `https://wa.me/55${trial.telefone?.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-1.5 bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors cursor-pointer"
                                      title="Abrir WhatsApp"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                    </a>
                                  ) : (
                                    <span className="text-[10px] text-amber-500 font-semibold italic">Sem telefone</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-ink-3 font-mono">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className="text-sm font-mono text-ink font-bold">
                                {p.qtd_alunos_cadastrados}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <span className="text-xs text-ink-3 font-mono">
                                {p.dias_desde_cadastro}d
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
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
      {selectedPersonalForModal && (
        <PersonalDetailsModal
          personal={selectedPersonalForModal}
          onClose={() => setSelectedPersonalForModal(null)}
          onSavePhone={handleSavePhoneFromTrial}
          onVerAlunos={(personalId) => {
            setSelectedPersonalForModal(null);
            setSelectedPersonalId(personalId);
            setActiveSection('alunos');
          }}
        />
      )}

      {expiredTrialsModal && expiredTrialsModal.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-surface border border-line rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-6 shadow-2xl relative"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-lg sm:text-xl text-ink">
                    Alertas de Trial Expirado
                  </h2>
                  <p className="text-xs text-ink-3 mt-0.5">
                    {expiredTrialsModal.length} {expiredTrialsModal.length === 1 ? 'personal teve' : 'personais tiveram'} o período de avaliação encerrado.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExpiredTrialsModal(null)}
                className="p-2 rounded-xl text-ink-3 hover:text-ink hover:bg-raise transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {expiredTrialsModal.map((trial) => (
                <TrialCard 
                  key={trial.assinatura_id || trial.personal_id}
                  trial={trial}
                  onSavePhone={handleSavePhoneFromTrial}
                />
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setExpiredTrialsModal(null)}
                className="px-5 py-2.5 bg-raise hover:bg-raise/80 text-ink font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Entendido, fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
