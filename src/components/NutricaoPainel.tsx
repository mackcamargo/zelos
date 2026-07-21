import React, { useState, useEffect, useMemo } from 'react';
import { 
  Utensils, Plus, Check, Loader2, Target, 
  Flame, Apple, Wheat, Droplets, Clock,
  ChevronRight, History, TrendingUp, X, ClipboardList,
  AlertTriangle, Search, Info, Sparkles, BookOpen, Settings, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService, supabase, isSupabaseConfigured } from '../lib/supabase';
import { PlanoAlimentar, RegistroNutricao } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import HidratacaoCard from './HidratacaoCard';
import { tocar } from '../lib/som';

interface NutricaoPainelProps {
  alunoId: string;
}

// --- CONSTANTES DE DADOS EDUCATIVOS (MOCK / FALLBACK) ---
const MOCK_SUPLEMENTOS = [
  {
    id: 'sup_creatina',
    slug: 'creatina',
    nome: 'Creatina Monohidratada',
    categoria: 'Performance & Força',
    icone: '⚡',
    o_que_e: 'A creatina é um composto de aminoácidos presente principalmente nas fibras musculares e no cérebro. É um dos suplementos mais exaustivamente estudados e recomendados no mundo da nutrição esportiva.',
    para_que_serve: 'Aumenta os estoques de fosfocreatina nos músculos, permitindo uma regeneração mais rápida de ATP (a principal molécula de energia celular). Isso se traduz em ganho de força, maior capacidade de explosão e suporte direto ao ganho de massa magra.',
    evidencia: 'Altíssima (Nível de Evidência A). Recomendada por unanimidade pelas maiores diretrizes internacionais de nutrição esportiva para aumento de força e massa muscular.',
    uso_comum: 'De 3g a 5g diariamente. O efeito é cumulativo, exigindo uso contínuo mesmo nos dias sem treino. Não necessita de ciclos de interrupção.',
    timing: 'Qualquer horário do dia. Preferencialmente acompanhada de uma fonte de carboidratos para otimizar a liberação de insulina e, consequentemente, a absorção celular.',
    observacoes: 'A hidratação constante é crucial ao usar creatina. Pode ocorrer um aumento sutil de peso inicial decorrente de retenção hídrica intracelular (um processo positivo que sinaliza síntese de proteínas no músculo).',
    ordem: 1,
    ativo: true
  },
  {
    id: 'sup_whey',
    slug: 'whey-protein',
    nome: 'Whey Protein',
    categoria: 'Proteínas & Recuperação',
    icone: '🥛',
    o_que_e: 'É a proteína extraída do soro do leite durante o processo de fabricação do queijo. Possui excelente digestibilidade, rápida absorção e um perfil completo de aminoácidos essenciais.',
    para_que_serve: 'Fornece os blocos de construção (aminoácidos, em especial a Leucina) essenciais para reparar e reconstruir as fibras musculares que sofreram microlesões durante os exercícios físicos.',
    evidencia: 'Altíssima (Nível de Evidência A). Amplamente respaldada para suprir o aporte proteico diário de forma prática, segura e altamente biodisponível.',
    uso_comum: 'Geralmente de 20g a 40g por porção (ajustado de acordo com a sua meta proteica diária). Pode ser dissolvido em água, leite ou batido em frutas.',
    timing: 'Pós-treino ou em refeições intermediárias nas quais há necessidade de um aporte rápido e de fácil consumo de proteínas.',
    observacoes: 'Caso sinta desconfortos gástricos ou possua intolerância à lactose, as versões de Whey Isolado (Isolate) ou Proteínas Vegetais (como ervilha e arroz) são alternativas excelentes.',
    ordem: 2,
    ativo: true
  },
  {
    id: 'sup_beta_alanina',
    slug: 'beta-alanina',
    nome: 'Beta-Alanina',
    categoria: 'Resistência Muscular',
    icone: '🔥',
    o_que_e: 'Um aminoácido não essencial que atua como o limitante e precursor da carnosina, uma substância que age como um amortecedor ácido dentro das células musculares.',
    para_que_serve: 'Aumenta as concentrações musculares de carnosina, reduzindo a fadiga induzida pela acidez (o famoso "ardor" ou queimação muscular) em exercícios intensos de média a longa duração (séries com repetições altas, Crossfit, corridas).',
    evidencia: 'Alta. Demonstrada cientificamente como um excelente atenuante de fadiga muscular localizada.',
    uso_comum: 'De 2g a 6g ao dia. É muito recomendável fracionar a ingestão em doses menores ao longo do dia para evitar ou amenizar o efeito de formigamento.',
    timing: 'Qualquer horário do dia (uso crônico por acumulação intracelular). Muito comumente presente em formulações pré-treino.',
    observacoes: 'A ingestão de doses únicas maiores de 2g pode causar parestesia (sensação inofensiva e passageira de formigamento ou coceira na pele, principalmente no rosto, orelhas e mãos).',
    ordem: 3,
    ativo: true
  },
  {
    id: 'sup_cafeina',
    slug: 'cafeina',
    nome: 'Cafeína Anidra',
    categoria: 'Energia & Foco',
    icone: '☕',
    o_que_e: 'Um estimulante natural do sistema nervoso central, consumido globalmente para aumento da prontidão mental e da resistência física.',
    para_que_serve: 'Reduz a percepção subjetiva de esforço (você sente o treino "mais leve"), aumenta o estado de alerta, melhora o foco cognitivo e estimula a quebra de células gordurosas (lipólise) ao elevar a liberação de catecolaminas.',
    evidencia: 'Altíssima (Nível de Evidência A). Comprovada eficácia para melhora de performance tanto em exercícios aeróbicos de longa duração quanto em treinos anaeróbicos de alta intensidade.',
    uso_comum: 'De 100mg a 400mg, conforme a tolerância pessoal e o peso corporal. Recomenda-se cautela no uso contínuo para evitar habituação rápida.',
    timing: 'Aproximadamente de 30 a 60 minutos antes de iniciar o treino.',
    observacoes: 'Evite o consumo de cafeína nas 6h a 8h que antecedem o horário planejado para dormir para não afetar negativamente o sono profundo, que é quando ocorre a verdadeira recuperação hormonal.',
    ordem: 4,
    ativo: true
  },
  {
    id: 'sup_omega3',
    slug: 'omega-3',
    nome: 'Ômega 3 (Óleo de Peixe)',
    categoria: 'Saúde Geral',
    icone: '🐟',
    o_que_e: 'Uma família de ácidos graxos poli-insaturados essenciais, com alta concentração de EPA (ácido eicosapentaenoico) e DHA (ácido docosahexaenoico).',
    para_que_serve: 'Auxilia na modulação de processos inflamatórios no corpo, oferece proteção cardiovascular ao otimizar perfis lipídicos, melhora a integridade articular e pode reduzir a dor muscular tardia pós-treino.',
    evidencia: 'Altíssima para promoção de saúde, cognição e saúde das articulações em indivíduos ativos.',
    uso_comum: 'Geralmente de 1g a 3g de óleo de peixe ao dia (atente-se para consumir marcas de boa procedência que forneçam proporções adequadas de EPA/DHA por cápsula).',
    timing: 'Junto às refeições principais (almoço ou jantar) para assegurar uma digestão otimizada.',
    observacoes: 'Dê preferência a produtos que possuam selos internacionais de pureza e isenção de metais pesados (ex: selo IFOS).',
    ordem: 5,
    ativo: true
  }
];

const MOCK_DICAS_NUTRICAO = [
  {
    id: 'tip_pre_1',
    categoria: 'pre_treino',
    titulo: 'Priorize Carboidratos de Fácil Digestão',
    texto: 'De 30 a 60 minutos antes de iniciar a sua atividade, aposte em fontes simples de carboidratos que fornecem energia imediata para o músculo sem sobrecarregar o trato gastrointestinal. Bons exemplos: banana com aveia e mel, fatias de pão com geleia de frutas, ou tapioca simples.',
    ordem: 1,
    ativo: true
  },
  {
    id: 'tip_pre_2',
    categoria: 'pre_treino',
    titulo: 'Garanta a Hidratação Prévia',
    texto: 'Treinar desidratado reduz drasticamente a sua força e pode provocar tonturas. Busque consumir de 300ml a 500ml de água nas 2 horas que antecedem seu exercício. Um corpo bem hidratado transporta oxigênio e nutrientes de forma muito mais eficiente.',
    ordem: 2,
    ativo: true
  },
  {
    id: 'tip_pos_1',
    categoria: 'pos_treino',
    titulo: 'Reposição de Glicogênio e Aminoácidos',
    texto: 'Após o término do esforço, seu corpo está ávido por reparação. Consuma uma refeição que combine carboidratos (para reabastecer os estoques de glicogênio muscular esgotados) e proteínas de alta qualidade (para ativar imediatamente a síntese e a reconstrução do tecido muscular).',
    ordem: 1,
    ativo: true
  },
  {
    id: 'tip_pos_2',
    categoria: 'pos_treino',
    titulo: 'A Importância da Leucina pós-esforço',
    texto: 'Assegurar entre 20g e 40g de proteínas ricas em aminoácidos essenciais (como ovos, carnes magras ou suplementos proteicos) garante a quantidade mínima de Leucina necessária para ativar a via biológica mTOR, responsável por ligar a sinalização hipertrófica no organismo.',
    ordem: 2,
    ativo: true
  },
  {
    id: 'tip_geral_1',
    categoria: 'geral',
    titulo: 'Sua Meta Proteica Diária é o Pilar Principal',
    texto: 'Para a hipertrofia e manutenção de massa magra, o mais crucial é bater a cota diária total de proteínas, que costuma variar de 1.6g a 2.2g por quilo de peso corporal. O timing de cada porção é secundário se comparado ao cumprimento consistente da meta diária de macronutrientes.',
    ordem: 1,
    ativo: true
  },
  {
    id: 'tip_geral_2',
    categoria: 'geral',
    titulo: 'Inclua Gorduras Saudáveis na Dieta',
    texto: 'As gorduras saudáveis (como azeite de oliva, ovos inteiros, abacate e oleaginosas) são imprescindíveis para a síntese ideal de hormônios endógenos (incluindo a testosterona) e auxiliam na absorção de micronutrientes lipossolúveis cruciais para a imunidade e metabolismo.',
    ordem: 2,
    ativo: true
  }
];

class ErrorBoundary extends React.Component<{ children: React.ReactNode; fallbackMessage?: string }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs text-center space-y-2 my-4">
          <p className="font-bold">Ops! Algo deu errado ao carregar esta seção.</p>
          <p className="text-[10px] text-ink-3">{this.props.fallbackMessage || "Tente recarregar a página."}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function NutricaoPainel({ alunoId }: NutricaoPainelProps) {
  const [loading, setLoading] = useState(true);
  const [plano, setPlano] = useState<PlanoAlimentar | null>(null);
  const [registros, setRegistros] = useState<RegistroNutricao[]>([]);
  const [historico, setHistorico] = useState<{ data: string; calorias: number }[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // States for search & autocomplete & calculations
  const [refeicao, setRefeicao] = useState('Café da manhã');
  const [buscaTermo, setBuscaTermo] = useState('');
  const [alimentosEncontrados, setAlimentosEncontrados] = useState<any[]>([]);
  const [alimentoSelecionado, setAlimentoSelecionado] = useState<any | null>(null);
  const [quantidadeG, setQuantidadeG] = useState<number>(100);
  const [loadingBusca, setLoadingBusca] = useState(false);
  
  // --- SUB-ABAS NUTRI ---
  const [subAba, setSubAba] = useState<'alimentacao' | 'suplementos' | 'timing'>('alimentacao');

  // --- NOVO SISTEMA DE SUPLEMENTAÇÃO ---
  const [suplementos, setSuplementos] = useState<any[]>([]);
  const [alunoSuplementosIds, setAlunoSuplementosIds] = useState<(string | number)[]>([]);
  const [suplementoRegistros, setSuplementoRegistros] = useState<any[]>([]);
  const [dicasNutricao, setDicasNutricao] = useState<any[]>([]);
  
  // --- ORIENTAÇÃO DE SUPLEMENTOS DO PERSONAL ---
  const [planoSuplementos, setPlanoSuplementos] = useState<any | null>(null);
  const [loadingPlanoSup, setLoadingPlanoSup] = useState(true);
  const [confirmingPlanoSup, setConfirmingPlanoSup] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const [showManageSuplementos, setShowManageSuplementos] = useState(false);
  const [selectedSuplementoModal, setSelectedSuplementoModal] = useState<any | null>(null);
  const [suplementoSearchTerm, setSuplementoSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('Todos');
  const [debouncedSuplementoSearchTerm, setDebouncedSuplementoSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSuplementoSearchTerm(suplementoSearchTerm);
    }, 200);
    return () => clearTimeout(timer);
  }, [suplementoSearchTerm]);

  const normalizarTexto = (text: string) => {
    return (text || '')
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  };
  
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadData();
  }, [alunoId]);

  const loadPlanoSuplementos = async () => {
    try {
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
          if (data.plano_suplemento_itens) {
            data.plano_suplemento_itens.sort((a: any, b: any) => (a.ordem ?? 0) - (b.ordem ?? 0));
          }
          setPlanoSuplementos(data);
        } else {
          setPlanoSuplementos(null);
        }
      } else {
        const stored = localStorage.getItem(`plano_suplementos_${alunoId}`);
        if (stored) {
          setPlanoSuplementos(JSON.parse(stored));
        } else {
          setPlanoSuplementos(null);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar orientação de suplementos:", err);
    } finally {
      setLoadingPlanoSup(false);
    }
  };

  const handleConfirmarPlanoSuplementos = async () => {
    if (!planoSuplementos || confirmingPlanoSup) return;
    setConfirmingPlanoSup(true);
    tocar('celebracao');
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.rpc('confirmar_plano_suplementos', {
          p_plano_id: planoSuplementos.id
        });
        if (error) throw error;
        setToastMessage("Confirmado! Seu personal foi avisado.");
        await loadPlanoSuplementos();
      } else {
        const updated = {
          ...planoSuplementos,
          confirmado: true,
          confirmado_versao: planoSuplementos.versao,
          confirmado_em: new Date().toISOString()
        };
        localStorage.setItem(`plano_suplementos_${alunoId}`, JSON.stringify(updated));
        setPlanoSuplementos(updated);
        setToastMessage("Confirmado! Seu personal foi avisado.");
      }
      setTimeout(() => {
        setToastMessage(null);
      }, 4000);
    } catch (err) {
      console.error("Erro ao confirmar orientação de suplementos:", err);
    } finally {
      setConfirmingPlanoSup(false);
    }
  };

  useEffect(() => {
    loadPlanoSuplementos();

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel(`plano-sup-aluno-${alunoId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'plano_suplementos',
            filter: `aluno_id=eq.${alunoId}`
          },
          (payload) => {
            loadPlanoSuplementos();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [alunoId]);

  useEffect(() => {
    if (buscaTermo.trim().length < 2) {
      setAlimentosEncontrados([]);
      return;
    }
    
    setLoadingBusca(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await dbService.buscarAlimentos(buscaTermo);
        setAlimentosEncontrados(res.data || []);
      } catch (err) {
        console.error("Erro ao buscar alimentos:", err);
      } finally {
        setLoadingBusca(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [buscaTermo]);

  const resetForm = () => {
    setRefeicao('Café da manhã');
    setBuscaTermo('');
    setAlimentoSelecionado(null);
    setQuantidadeG(100);
    setAlimentosEncontrados([]);
  };

  // Carrega e sincroniza dados gerais, incluindo os novos blocos de suplementação
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Carrega dados de nutrição clássicos
      const [planoRes, registrosRes, historicoRes] = await Promise.all([
        dbService.getPlanoAlimentarAtivo(alunoId),
        dbService.getRegistrosNutricao(alunoId, today),
        dbService.getHistoricoCalorias(alunoId)
      ]);
      setPlano(planoRes.data);
      setRegistros(registrosRes.data || []);
      
      // Agrupa histórico clássico por data
      const groupedMap: { [key: string]: number } = {};
      (historicoRes.data || []).forEach((row: any) => {
        const d = row.data;
        groupedMap[d] = (groupedMap[d] || 0) + (Number(row.calorias) || 0);
      });
      const sortedHistory = Object.keys(groupedMap).map(d => ({
        data: d,
        calorias: groupedMap[d]
      })).sort((a, b) => a.data.localeCompare(b.data));
      setHistorico(sortedHistory);

      // 2. Carrega lista de suplementos (Supabase com fallback de mock estruturado)
      let supList: any[] = [];
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('suplementos')
            .select('*')
            .eq('ativo', true)
            .order('categoria')
            .order('ordem');
          if (!error && data && data.length > 0) {
            supList = data;
          }
        } catch (e) {
          console.error("Erro ao buscar suplementos da tabela do Supabase:", e);
        }
      }
      if (supList.length === 0) {
        supList = MOCK_SUPLEMENTOS;
      }
      setSuplementos(supList);

      // 3. Carrega acompanhamentos de suplementos do aluno
      let followedIds: (string | number)[] = [];
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('aluno_suplementos')
            .select('suplemento_id')
            .eq('aluno_id', alunoId)
            .eq('ativo', true);
          if (!error && data) {
            followedIds = data.map((d: any) => d.suplemento_id);
          }
        } catch (e) {
          console.error("Erro ao buscar aluno_suplementos do Supabase:", e);
        }
      } else {
        followedIds = JSON.parse(localStorage.getItem(`aluno_suplementos_${alunoId}`) || '[]');
      }
      setAlunoSuplementosIds(followedIds);

      // 4. Carrega registros diários de suplementação do aluno
      let logs: any[] = [];
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('suplemento_registros')
            .select('*')
            .eq('aluno_id', alunoId);
          if (!error && data) {
            logs = data;
          }
        } catch (e) {
          console.error("Erro ao carregar suplemento_registros do Supabase:", e);
        }
      } else {
        logs = JSON.parse(localStorage.getItem(`suplemento_registros_${alunoId}`) || '[]');
      }
      setSuplementoRegistros(logs);

      // 5. Carrega dicas de timing/nutrição (Supabase com fallback de mock)
      let tips: any[] = [];
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('dicas_nutricao')
            .select('*')
            .eq('ativo', true)
            .order('ordem');
          if (!error && data && data.length > 0) {
            tips = data;
          }
        } catch (e) {
          console.error("Erro ao buscar dicas_nutricao do Supabase:", e);
        }
      }
      if (tips.length === 0) {
        tips = MOCK_DICAS_NUTRICAO;
      }
      setDicasNutricao(tips);

    } catch (err) {
      console.error("Erro geral ao carregar dados do painel nutricional:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- AUXILIARES E ACTIONS DE SUPLEMENTAÇÃO ---

  // Ativa/desativa acompanhamento de um suplemento
  const handleToggleAcompanhar = async (suplementoId: string | number) => {
    tocar('tap');
    const isCurrentlyFollowed = alunoSuplementosIds.includes(suplementoId);
    let newFollowed: (string | number)[] = [];

    if (isCurrentlyFollowed) {
      newFollowed = alunoSuplementosIds.filter(id => id !== suplementoId);
    } else {
      newFollowed = [...alunoSuplementosIds, suplementoId];
    }
    setAlunoSuplementosIds(newFollowed);

    // Salva a alteração
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('aluno_suplementos')
          .select('*')
          .eq('aluno_id', alunoId)
          .eq('suplemento_id', suplementoId)
          .maybeSingle();

        if (data) {
          await supabase
            .from('aluno_suplementos')
            .update({ ativo: !isCurrentlyFollowed })
            .eq('aluno_id', alunoId)
            .eq('suplemento_id', suplementoId);
        } else {
          await supabase
            .from('aluno_suplementos')
            .insert({
              aluno_id: alunoId,
              suplemento_id: suplementoId,
              ativo: !isCurrentlyFollowed
            });
        }
      } catch (err) {
        console.error("Erro ao salvar acompanhamento no Supabase:", err);
      }
    } else {
      localStorage.setItem(`aluno_suplementos_${alunoId}`, JSON.stringify(newFollowed));
    }
  };

  // Registra ou desmarca a ingestão diária de um suplemento
  const handleToggleTomadoHoje = async (suplementoId: string | number) => {
    const isTaken = suplementoRegistros.some(r => r.suplemento_id === suplementoId && r.data === today && r.tomado);
    let newLogs = [...suplementoRegistros];

    if (isTaken) {
      // Remove o registro de hoje
      newLogs = newLogs.filter(r => !(r.suplemento_id === suplementoId && r.data === today));
      setSuplementoRegistros(newLogs);
      tocar('tap');

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase
            .from('suplemento_registros')
            .delete()
            .eq('aluno_id', alunoId)
            .eq('suplemento_id', suplementoId)
            .eq('data', today);
        } catch (err) {
          console.error("Erro ao remover registro no Supabase:", err);
        }
      } else {
        localStorage.setItem(`suplemento_registros_${alunoId}`, JSON.stringify(newLogs));
      }
    } else {
      // Adiciona o registro tomado hoje
      const newReg = {
        aluno_id: alunoId,
        suplemento_id: suplementoId,
        data: today,
        tomado: true
      };
      newLogs.push(newReg);
      setSuplementoRegistros(newLogs);
      tocar('sucesso');

      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('suplemento_registros')
            .select('*')
            .eq('aluno_id', alunoId)
            .eq('suplemento_id', suplementoId)
            .eq('data', today)
            .maybeSingle();

          if (data) {
            await supabase
              .from('suplemento_registros')
              .update({ tomado: true })
              .eq('aluno_id', alunoId)
              .eq('suplemento_id', suplementoId)
              .eq('data', today);
          } else {
            await supabase
              .from('suplemento_registros')
              .insert(newReg);
          }
        } catch (err) {
          console.error("Erro ao salvar tomada no Supabase:", err);
        }
      } else {
        localStorage.setItem(`suplemento_registros_${alunoId}`, JSON.stringify(newLogs));
      }
    }
  };

  // Calcula a sequência atual de dias consecutivos de uso
  const calcularStreak = (supId: string | number) => {
    const tomados = (suplementoRegistros || [])
      .filter(r => r && r.suplemento_id === supId && r.tomado && typeof r.data === 'string')
      .map(r => r.data)
      .sort((a, b) => b.localeCompare(a)); // desc

    if (!tomados || tomados.length === 0) return 0;

    const dataOntem = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const temHoje = tomados.includes(today);
    const temOntem = tomados.includes(dataOntem);

    if (!temHoje && !temOntem) return 0;

    let streak = 0;
    let dataAtual = temHoje ? today : dataOntem;

    // Coloca um limite de segurança de 100 iterações para evitar loops infinitos catastróficos em qualquer circunstância
    let seguranca = 0;
    while (seguranca < 100) {
      seguranca++;
      if (tomados.includes(dataAtual)) {
        streak++;
        const d = new Date(dataAtual + 'T12:00:00');
        d.setDate(d.getDate() - 1);
        dataAtual = d.toISOString().split('T')[0];
      } else {
        break;
      }
    }
    return streak;
  };

  // Retorna os últimos 7 dias com histórico de ingestão
  const obterUltimos7Dias = () => {
    const dias = [];
    const nomesDias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dataStr = d.toISOString().split('T')[0];
      dias.push({
        data: dataStr,
        nomeExibicao: nomesDias[d.getDay()],
        diaMes: d.getDate()
      });
    }
    return dias;
  };

  // --- FIM DOS AUXILIARES ---

  const round = (val: number, decimals: number = 0) => {
    const p = Math.pow(10, decimals);
    return Math.round((val || 0) * p) / p;
  };

  const metaCalorias = plano ? Number(plano.meta_calorias) || 0 : 0;
  const consumidoCalorias = (registros || []).reduce((acc, curr) => acc + (Number(curr?.calorias) || 0), 0);
  const calPercent = metaCalorias > 0 ? Math.min(100, Math.round((consumidoCalorias / metaCalorias) * 100)) : 0;

  const consumidoProteina = round((registros || []).reduce((acc, curr) => acc + (Number(curr?.proteina) || 0), 0), 1);
  const metaProteina = plano ? Number(plano.meta_proteina) || 0 : 0;
  const protPercent = metaProteina > 0 ? Math.min(100, Math.round((consumidoProteina / metaProteina) * 100)) : 0;

  const consumidoCarbo = round((registros || []).reduce((acc, curr) => acc + (Number(curr?.carbo) || 0), 0), 1);
  const metaCarbo = plano ? Number(plano.meta_carboidrato ?? (plano as any).meta_carbo) || 0 : 0;
  const carboPercent = metaCarbo > 0 ? Math.min(100, Math.round((consumidoCarbo / metaCarbo) * 100)) : 0;

  const consumidoGordura = round((registros || []).reduce((acc, curr) => acc + (Number(curr?.gordura) || 0), 0), 1);
  const metaGordura = plano ? Number(plano.meta_gordura) || 0 : 0;
  const gorduraPercent = metaGordura > 0 ? Math.min(100, Math.round((consumidoGordura / metaGordura) * 100)) : 0;

  const handleAddMeal = async () => {
    if (!alimentoSelecionado || !refeicao) return;
    setSaving(true);
    try {
      tocar('sucesso');
      
      const kcal100g = Number(alimentoSelecionado.kcal_100g) || 0;
      const prot100g = Number(alimentoSelecionado.proteina_100g) || 0;
      const carbo100g = Number(alimentoSelecionado.carbo_100g) || 0;
      const gord100g = Number(alimentoSelecionado.gordura_100g) || 0;

      const fator = quantidadeG / 100;
      const calorias = Math.round(kcal100g * fator);
      const proteina = round(prot100g * fator, 1);
      const carbo = round(carbo100g * fator, 1);
      const gordura = round(gord100g * fator, 1);

      await dbService.saveRegistroNutricao({
        aluno_id: alunoId,
        refeicao: refeicao,
        alimento: alimentoSelecionado.nome,
        alimento_id: alimentoSelecionado.id,
        quantidade_g: quantidadeG,
        calorias: calorias,
        proteina: proteina,
        carbo: carbo,
        gordura: gordura,
        data: today
      });
      setShowAddModal(false);
      resetForm();
      loadData();
    } catch (err) {
      console.error("Erro ao salvar registro de refeição:", err);
    } finally {
      setSaving(false);
    }
  };

  // Filtro de categorias dinâmico
  const categoriasUnicas = useMemo(() => {
    const cats = (suplementos || []).map(s => s?.categoria).filter(Boolean);
    const unique = Array.from(new Set(cats));
    return ['Todos', ...unique];
  }, [suplementos]);

  // Filtros dos suplementos do Guia (com normalização de acentos e busca e filtro de categoria)
  const filteredSuplementosGuia = useMemo(() => {
    const term = normalizarTexto(debouncedSuplementoSearchTerm);
    
    let list = suplementos || [];
    if (term) {
      list = list.filter(s => 
        s && (
          normalizarTexto(s.nome || '').includes(term) ||
          normalizarTexto(s.categoria || '').includes(term) ||
          normalizarTexto(s.para_que_serve || '').includes(term)
        )
      );
    }
    
    if (selectedCategoria !== 'Todos') {
      list = list.filter(s => s && s.categoria === selectedCategoria);
    }
    
    return list;
  }, [suplementos, debouncedSuplementoSearchTerm, selectedCategoria]);

  // Agrupamento por categoria
  const groupedSuplementos = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    (filteredSuplementosGuia || []).forEach(s => {
      if (!s) return;
      const cat = s.categoria || 'Geral';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(s);
    });
    return groups;
  }, [filteredSuplementosGuia]);

  // Lista dos suplementos que o aluno selecionou para acompanhar diariamente
  const followedSuplementosList = useMemo(() => {
    const list = suplementos || [];
    const ids = Array.isArray(alunoSuplementosIds) ? alunoSuplementosIds : [];
    return list.filter(s => s && ids.includes(s.id));
  }, [suplementos, alunoSuplementosIds]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 text-flame animate-spin" />
      </div>
    );
  }

  // Componente de aviso legal visível e destacado
  const AvisoEducativo = () => (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-xs text-amber-500 leading-relaxed shadow-sm">
      <div className="shrink-0 w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500">
        <AlertTriangle className="w-4 h-4" />
      </div>
      <p className="font-medium font-sans">
        <strong className="block text-amber-400 font-bold mb-0.5">Aviso Importante:</strong>
        Conteúdo educativo geral. Não substitui a avaliação de um nutricionista. A quantidade ideal para você deve ser definida por um profissional habilitado.
      </p>
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      
      {/* SEGMENTED TAB SELECTOR (Alimentação | Suplementos | Timing) */}
      <div className="flex bg-raise/50 p-1.5 rounded-2xl border border-line max-w-md mx-auto relative z-10 shadow-inner">
        <button
          onClick={() => { tocar('tap'); setSubAba('alimentacao'); }}
          className={`flex-1 py-2 px-3 text-xs sm:text-[13px] font-bold rounded-xl transition-all cursor-pointer ${
            subAba === 'alimentacao'
              ? 'bg-flame text-white shadow-lg shadow-flame/15'
              : 'text-ink-3 hover:text-ink'
          }`}
        >
          Alimentação
        </button>
        <button
          onClick={() => { tocar('tap'); setSubAba('suplementos'); }}
          className={`flex-1 py-2 px-3 text-xs sm:text-[13px] font-bold rounded-xl transition-all cursor-pointer ${
            subAba === 'suplementos'
              ? 'bg-flame text-white shadow-lg shadow-flame/15'
              : 'text-ink-3 hover:text-ink'
          }`}
        >
          Suplementos
        </button>
        <button
          onClick={() => { tocar('tap'); setSubAba('timing'); }}
          className={`flex-1 py-2 px-3 text-xs sm:text-[13px] font-bold rounded-xl transition-all cursor-pointer ${
            subAba === 'timing'
              ? 'bg-flame text-white shadow-lg shadow-flame/15'
              : 'text-ink-3 hover:text-ink'
          }`}
        >
          Timing
        </button>
      </div>

      {/* --- ABA 1: ALIMENTAÇÃO (O QUE JÁ EXISTIA) --- */}
      {subAba === 'alimentacao' && (
        <ErrorBoundary fallbackMessage="Erro ao carregar os dados de alimentação.">
          <div className="space-y-8 animate-fadeIn">
          {/* RESUMO DO DIA */}
          <div className="bg-surface border border-line rounded-3xl p-4 sm:p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-flame/5 blur-[100px] pointer-events-none" />
            
            {!plano ? (
              <div className="relative z-10 flex flex-col items-center justify-center text-center py-6">
                <Utensils className="w-10 h-10 text-ink-3 mb-4 opacity-50 animate-pulse" />
                <h3 className="font-semibold text-base text-ink mb-2">Sem plano ativo</h3>
                <p className="text-[12px] text-ink-3 max-w-xs">
                  Seu personal ainda não prescreveu suas metas nutricionais.
                </p>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                {/* Calorias Ring */}
                <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex-shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 192 192">
                    <circle
                      cx="96"
                      cy="96"
                      r="84"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-line"
                    />
                    <motion.circle
                      cx="96"
                      cy="96"
                      r="84"
                      fill="none"
                      stroke="url(#flame-gradient)"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray="527.78"
                      initial={{ strokeDashoffset: 527.78 }}
                      animate={{ strokeDashoffset: 527.78 - (527.78 * calPercent) / 100 }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                    <defs>
                      <linearGradient id="flame-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--z-accent)" />
                        <stop offset="100%" stopColor="var(--z-accent-hi)" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl sm:text-2xl font-bold text-ink num leading-none">
                      {consumidoCalorias}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-ink-3 text-center px-4 uppercase tracking-wider font-mono">
                      kcal
                    </span>
                    <div className="mt-1 text-[9px] sm:text-[10px] text-flame font-bold bg-flame/10 px-2 py-0.5 rounded-full border border-flame/20 num">
                      Meta: {metaCalorias}
                    </div>
                  </div>
                </div>

                {/* Macros Progress */}
                <div className="flex-1 w-full space-y-3">
                  {/* Proteína */}
                  <div className="bg-surface border border-line rounded-2xl p-3 shadow-[var(--z-shadow-1)] space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-ink flex items-center gap-1.5 uppercase tracking-tight">
                        <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_6px_rgba(139,92,246,0.4)]" /> Proteína
                      </span>
                      <span className="text-[11px] text-ink-2 font-mono font-bold">{consumidoProteina} <span className="text-ink-3 font-normal">/ {metaProteina}g</span></span>
                    </div>
                    <div className="h-2 bg-raise rounded-full overflow-hidden border border-line">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${protPercent}%` }}
                        className="h-full bg-violet-500 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.3)]"
                      />
                    </div>
                  </div>

                  {/* Carboidratos */}
                  <div className="bg-surface border border-line rounded-2xl p-3 shadow-[var(--z-shadow-1)] space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-ink flex items-center gap-1.5 uppercase tracking-tight">
                        <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]" /> Carboidratos
                      </span>
                      <span className="text-[11px] text-ink-2 font-mono font-bold">{consumidoCarbo} <span className="text-ink-3 font-normal">/ {metaCarbo}g</span></span>
                    </div>
                    <div className="h-2 bg-raise rounded-full overflow-hidden border border-line">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${carboPercent}%` }}
                        className="h-full bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                      />
                    </div>
                  </div>

                  {/* Gorduras */}
                  <div className="bg-surface border border-line rounded-2xl p-3 shadow-[var(--z-shadow-1)] space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-ink flex items-center gap-1.5 uppercase tracking-tight">
                        <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.4)]" /> Gorduras
                      </span>
                      <span className="text-[11px] text-ink-2 font-mono font-bold">{consumidoGordura} <span className="text-ink-3 font-normal">/ {metaGordura}g</span></span>
                    </div>
                    <div className="h-2 bg-raise rounded-full overflow-hidden border border-line">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${gorduraPercent}%` }}
                        className="h-full bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.3)]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* HIDRATAÇÃO */}
          <HidratacaoCard alunoId={alunoId} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PLANO ALIMENTAR */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-ink flex items-center gap-2 text-sm sm:text-base">
                  <Utensils className="w-5 h-5 text-flame" />
                  Plano de hoje
                </h4>
              </div>

              <div className="space-y-3">
                {plano && plano.refeicoes && plano.refeicoes.length > 0 ? (
                  plano.refeicoes.map((ref) => (
                    <div key={ref.id} className="bg-surface border border-line rounded-2xl p-4 hover:bg-raise transition-all group shadow-[var(--z-shadow-1)]">
                      <div className="flex items-start justify-between mb-3">
                        <div className="space-y-0.5">
                          <h5 className="font-semibold text-sm text-ink group-hover:text-flame transition-colors">{ref.nome}</h5>
                          <div className="flex items-center gap-1.5 text-ink-3">
                            <Clock className="w-3 h-3" />
                            <span className="text-[11px] num">{ref.horario}</span>
                          </div>
                        </div>
                        <button className="p-1.5 bg-raise border border-line rounded-lg text-ink-3 hover:text-ok transition-colors">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      <div className="space-y-1.5">
                        {ref.alimentos?.map((ali) => (
                          <div key={ali.id} className="flex items-center justify-between py-1.5 border-t border-line/50">
                            <div className="space-y-0.5">
                              <p className="text-[11px] text-ink font-medium">{ali.nome}</p>
                              <p className="text-[9px] text-ink-3 uppercase tracking-tight">{ali.quantidade}</p>
                            </div>
                            <div className="text-[11px] text-ink-2 num">
                              {ali.calorias} kcal
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center bg-surface rounded-2xl border border-dashed border-line shadow-[var(--z-shadow-1)]">
                    <p className="text-xs text-ink-3">Nenhum plano alimentar cadastrado para hoje.</p>
                  </div>
                )}
              </div>
            </div>

            {/* REGISTROS & HISTÓRICO */}
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-ink flex items-center gap-2 text-sm sm:text-base">
                    <History className="w-5 h-5 text-flame" />
                    Registros do dia
                  </h4>
                  <button
                    onClick={() => {
                      setShowAddModal(true);
                      tocar('tap');
                    }}
                    className="px-4 py-2 bg-flame text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer border border-white/10 shadow-lg shadow-flame/10"
                  >
                    <Plus className="w-3.5 h-3.5" /> Registrar
                  </button>
                </div>

                <div className="space-y-3">
                  {registros.length === 0 ? (
                    <div className="p-8 text-center bg-surface rounded-2xl border border-dashed border-line shadow-[var(--z-shadow-1)]">
                      <p className="text-xs text-ink-3">Nenhum registro extra hoje.</p>
                    </div>
                  ) : (
                    registros.map((reg) => (
                      <div key={reg.id} className="bg-surface border border-line rounded-2xl p-4 flex flex-col gap-2 shadow-[var(--z-shadow-1)] hover:bg-raise/30 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="space-y-0.5 min-w-0">
                            <span className="text-[9px] font-bold text-flame bg-flame/10 px-2 py-0.5 rounded-full border border-flame/15 inline-block">
                              {reg.refeicao || 'Refeição'}
                            </span>
                            <p className="text-xs text-ink font-semibold mt-1 truncate">{reg.alimento || reg.nome}</p>
                            {reg.quantidade_g !== undefined && reg.quantidade_g !== null && (
                              <p className="text-[11px] text-ink-3 font-medium">Quantidade: {reg.quantidade_g}g</p>
                            )}
                            <p className="text-[10px] text-ink-3 font-mono">{new Date(reg.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <div className="text-[14px] font-semibold text-flame num shrink-0">
                            +{reg.calorias} kcal
                          </div>
                        </div>
                        {(reg.proteina !== undefined || reg.carbo !== undefined || reg.gordura !== undefined) && (
                          <div className="flex items-center gap-3 pt-2 border-t border-line/40 text-[10px] font-mono text-ink-3">
                            <span>P: <strong className="text-ink-2 font-semibold">{reg.proteina ?? 0}g</strong></span>
                            <span>C: <strong className="text-ink-2 font-semibold">{reg.carbo ?? 0}g</strong></span>
                            <span>G: <strong className="text-ink-2 font-semibold">{reg.gordura ?? 0}g</strong></span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-display font-bold text-ink flex items-center gap-2 text-sm sm:text-base">
                  <TrendingUp className="w-5 h-5 text-flame" />
                  Tendência Semanal
                </h4>
                <div className="h-48 bg-surface border border-line rounded-3xl p-4 shadow-[var(--z-shadow-1)]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historico}>
                      <defs>
                        <linearGradient id="colorCal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F5334F" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#F5334F" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="data" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--z-text-3)', fontSize: 10, fontFamily: 'Archivo' }}
                        tickFormatter={(val) => val.split('-')[2]}
                      />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--z-surface)', 
                          border: '1px solid var(--z-line)', 
                          borderRadius: '12px',
                          boxShadow: '0 4px 12px rgba(20,20,20,0.08)'
                        }}
                        itemStyle={{ color: '#F5334F', fontSize: '10px', fontFamily: 'JetBrains Mono' }}
                        labelStyle={{ display: 'none' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="calorias" 
                        stroke="#F5334F" 
                        fillOpacity={1} 
                        fill="url(#colorCal)" 
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
        </ErrorBoundary>
      )}

      {/* --- ABA 2: SUPLEMENTOS (NOVOS BLOCOS 1 E 2) --- */}
      {subAba === 'suplementos' && (
        <ErrorBoundary fallbackMessage="Erro ao carregar o painel de suplementação.">
          <div className="space-y-8 animate-fadeIn">
          
          {/* AVISO EDUCATIVO FIXO DE ENQUADRAMENTO LEGAL */}
          <AvisoEducativo />

          {/* Toast de Sucesso para confirmação do aluno */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -20, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, y: -20, x: '-50%' }}
                className="fixed top-4 left-1/2 bg-ok text-void px-6 py-3 rounded-2xl shadow-xl z-50 flex items-center gap-2.5 text-sm font-semibold border border-white/20"
              >
                <Check className="w-4 h-4 bg-void/25 p-0.5 rounded-full" />
                <span>{toastMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* BLOCO: ORIENTAÇÃO DO SEU TREINADOR */}
          <div className="bg-surface border border-line rounded-3xl p-4 sm:p-6 shadow-sm space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-flame/5 blur-3xl pointer-events-none rounded-full" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 border-b border-line/40 pb-4">
              <div className="space-y-0.5">
                <h4 className="font-display font-bold text-ink flex items-center gap-2 text-sm sm:text-base">
                  <ClipboardList className="w-5 h-5 text-flame" />
                  Orientação do seu Personal
                </h4>
                <p className="text-[11px] text-ink-3">Veja a orientação de suplementação educacional sugerida para você</p>
              </div>

              {/* Status de Confirmação */}
              {planoSuplementos && (
                <div>
                  {planoSuplementos.confirmado === true ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-ok/10 border border-ok/20 text-ok text-[11px] font-bold">
                      <Check className="w-3.5 h-3.5" />
                      Você está seguindo esta orientação
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] font-bold">
                      <AlertTriangle className="w-3 h-3" />
                      Aguardando Confirmação
                    </span>
                  )}
                </div>
              )}
            </div>

            {loadingPlanoSup ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 text-flame animate-spin" />
              </div>
            ) : !planoSuplementos ? (
              <div className="text-center py-10 px-4 bg-raise/20 border border-dashed border-line rounded-2xl flex flex-col items-center justify-center gap-3">
                <span className="text-3xl">🥛</span>
                <p className="text-xs text-ink-3 max-w-xs leading-relaxed">Seu personal ainda não enviou uma orientação de suplementação para você.</p>
              </div>
            ) : (
              <div className="space-y-6 relative z-10 animate-fadeIn">
                
                {/* ENQUADRAMENTO LEGAL / AVISO FIXO OBRIGATÓRIO EM CADA PLANO */}
                <div className="bg-amber-500/10 border border-amber-500/15 rounded-2xl p-4 flex gap-3 text-xs text-amber-500 leading-relaxed">
                  <div className="shrink-0 w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <p className="font-sans text-left">
                    <strong className="block text-amber-400 font-bold mb-0.5">Enquadramento Legal:</strong>
                    Orientação de acompanhamento. Não substitui a prescrição de um nutricionista. A dose adequada deve ser definida por um profissional habilitado.
                  </p>
                </div>

                {/* Itens da Orientação */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(planoSuplementos.plano_suplemento_itens || []).map((item: any) => {
                    const icone = item.suplementos?.icone || '🥛';
                    const nome = item.suplementos?.nome || 'Suplemento';
                    const categoria = item.suplementos?.categoria || 'Geral';
                    return (
                      <div key={item.id} className="bg-raise/25 border border-line rounded-2xl p-4 flex flex-col gap-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{icone}</span>
                          <div className="text-left">
                            <h5 className="font-bold text-xs sm:text-sm text-ink">{nome}</h5>
                            <span className="text-[9px] text-ink-3 uppercase font-semibold tracking-wider">{categoria}</span>
                          </div>
                        </div>
                        <p className="text-xs text-ink-2 leading-relaxed bg-void/25 p-2.5 rounded-xl border border-line/30 italic text-left">
                          {item.orientacao || 'Acompanhar conforme indicação do nutricionista.'}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Observação Geral do Plano */}
                {planoSuplementos.observacao && (
                  <div className="bg-raise/30 border border-line/50 p-4 rounded-2xl space-y-1.5 text-left">
                    <span className="text-[10px] font-bold text-ink-3 uppercase tracking-wider block">Observações do Treinador:</span>
                    <p className="text-xs text-ink-2 leading-relaxed italic">{planoSuplementos.observacao}</p>
                  </div>
                )}

                {/* BOTÃO DE CONFIRMAÇÃO DO ALUNO */}
                {!(planoSuplementos.confirmado === true) ? (
                  <div className="pt-2">
                    <button
                      onClick={handleConfirmarPlanoSuplementos}
                      disabled={confirmingPlanoSup}
                      className="w-full py-3 bg-flame hover:bg-flame-hover text-white text-xs sm:text-sm font-bold rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-flame/15 hover:shadow-lg disabled:opacity-50"
                    >
                      {confirmingPlanoSup ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processando confirmação...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 stroke-[3px]" />
                          <span>Recebido, estou seguindo ✓</span>
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-ink-3 text-center mt-2">Ao clicar, seu treinador receberá uma notificação em tempo real informando que você está seguindo esta recomendação.</p>
                  </div>
                ) : (
                  <div className="pt-2 bg-ok/10 border border-ok/20 rounded-2xl p-4 text-center space-y-1">
                    <p className="text-xs font-bold text-ok flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Você está seguindo esta orientação
                    </p>
                    <p className="text-[10px] text-ink-3">Confirmado em {new Date(planoSuplementos.confirmado_em).toLocaleDateString('pt-BR')} às {new Date(planoSuplementos.confirmado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* BLOCO 1 — GUIA DE SUPLEMENTOS (EDUCATIVO) */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h4 className="font-semibold text-ink flex items-center gap-2 text-sm sm:text-base">
                  <BookOpen className="w-5 h-5 text-flame" />
                  Guia Prático de Suplementação
                </h4>
                <p className="text-[11px] text-ink-3">Aprenda de forma científica o papel de cada suplemento</p>
              </div>
 
              {/* Barra de Busca de Suplementos */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-ink-3 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={suplementoSearchTerm}
                  onChange={(e) => setSuplementoSearchTerm(e.target.value)}
                  placeholder="Buscar suplemento..."
                  className="z-input !h-9 w-full pl-9 text-xs font-sans rounded-xl bg-raise border border-line focus:border-flame focus:ring-1 focus:ring-flame/15"
                />
                {suplementoSearchTerm && (
                  <button 
                    onClick={() => setSuplementoSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filtro de Categorias em chips dinâmicos */}
            <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
              {categoriasUnicas.map((cat) => {
                const isSelected = selectedCategoria === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      tocar('tap');
                      setSelectedCategoria(cat);
                    }}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-flame text-white shadow-md shadow-flame/15'
                        : 'bg-raise/70 text-ink-3 hover:text-ink hover:bg-raise border border-line'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Grid dos Cards de Suplementos Agrupados por Categoria */}
            <div className="space-y-8">
              {Object.keys(groupedSuplementos).map((catName) => (
                <div key={catName} className="space-y-3">
                  <h5 className="font-display font-bold text-[11px] uppercase tracking-wider text-ink-3/70 flex items-center gap-2 border-b border-line/45 pb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-flame shadow-[0_0_6px_var(--z-accent)]" />
                    {catName}
                    <span className="text-[9px] font-mono font-normal text-ink-3">({groupedSuplementos[catName].length})</span>
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupedSuplementos[catName].map((sup) => {
                      const isFollowed = alunoSuplementosIds.includes(sup.id);
                      return (
                        <div
                          key={sup.id}
                          onClick={() => { tocar('abrir'); setSelectedSuplementoModal(sup); }}
                          className="bg-surface border border-line rounded-2xl p-4 shadow-[var(--z-shadow-1)] hover:border-flame/40 hover:bg-raise/30 cursor-pointer group transition-all flex flex-col justify-between min-h-[145px]"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="w-10 h-10 rounded-xl bg-flame/10 flex items-center justify-center text-xl border border-flame/15">
                                {sup.icone}
                              </div>
                              <span className="text-[9px] font-bold text-flame bg-flame/10 border border-flame/15 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                {sup.categoria}
                              </span>
                            </div>
                            
                            <div className="space-y-1">
                              <h5 className="font-bold text-xs sm:text-sm text-ink group-hover:text-flame transition-colors">
                                {sup.nome}
                              </h5>
                              <p className="text-[11px] text-ink-3 line-clamp-1 leading-relaxed font-sans font-medium" title={sup.para_que_serve}>
                                {sup.para_que_serve}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-3 mt-2 border-t border-line/30">
                            <div className="flex items-center gap-1 text-[10px] font-bold text-flame group-hover:gap-2 transition-all">
                              <span>Ver guia completo</span>
                              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5px]" />
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleAcompanhar(sup.id);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                isFollowed
                                  ? 'bg-flame/10 text-flame border border-flame/20 hover:bg-flame hover:text-white'
                                  : 'bg-flame text-white hover:brightness-110 border-0'
                              }`}
                            >
                              {isFollowed ? 'Acompanhando' : 'Acompanhar'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {filteredSuplementosGuia.length === 0 && (
                <div className="text-center py-12 bg-raise/25 rounded-2xl border border-dashed border-line flex flex-col items-center justify-center gap-2">
                  <span className="text-2xl">🔍</span>
                  <p className="text-xs font-semibold text-ink">Nenhum suplemento encontrado</p>
                  <p className="text-[11px] text-ink-3">Tente ajustar o termo de busca ou limpar o filtro de categoria.</p>
                </div>
              )}
            </div>
          </div>
        </div>
        </ErrorBoundary>
      )}

      {/* --- ABA 3: TIMING (NOVO BLOCO 3) --- */}
      {subAba === 'timing' && (
        <ErrorBoundary fallbackMessage="Erro ao carregar as informações de timing nutricional.">
          <div className="space-y-8 animate-fadeIn">
          
          {/* AVISO EDUCATIVO FIXO DE ENQUADRAMENTO LEGAL */}
          <AvisoEducativo />

          {/* Dicas Nutricionais de Pré, Pós e Geral */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* ANTES DO TREINO */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-line">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/15">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-xs sm:text-sm text-ink uppercase tracking-wider">Antes do Treino</h4>
                  <p className="text-[9px] text-ink-3 font-mono">Energia & Força</p>
                </div>
              </div>

              <div className="space-y-3.5">
                {dicasNutricao.filter(d => d.categoria === 'pre_treino').map((dica) => (
                  <div key={dica.id} className="bg-surface border border-line rounded-2xl p-4 shadow-[var(--z-shadow-1)] space-y-2">
                    <h5 className="font-bold text-xs text-ink flex items-center gap-1.5 leading-snug">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      {dica.titulo}
                    </h5>
                    <p className="text-[11px] text-ink-3 leading-relaxed font-sans font-medium">
                      {dica.texto}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* DEPOIS DO TREINO */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-line">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500 border border-violet-500/15">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-xs sm:text-sm text-ink uppercase tracking-wider">Depois do Treino</h4>
                  <p className="text-[9px] text-ink-3 font-mono">Recuperação & Reconstrução</p>
                </div>
              </div>

              <div className="space-y-3.5">
                {dicasNutricao.filter(d => d.categoria === 'pos_treino').map((dica) => (
                  <div key={dica.id} className="bg-surface border border-line rounded-2xl p-4 shadow-[var(--z-shadow-1)] space-y-2">
                    <h5 className="font-bold text-xs text-ink flex items-center gap-1.5 leading-snug">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                      {dica.titulo}
                    </h5>
                    <p className="text-[11px] text-ink-3 leading-relaxed font-sans font-medium">
                      {dica.texto}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* DICAS GERAIS */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-line">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/15">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-xs sm:text-sm text-ink uppercase tracking-wider">Dicas Gerais</h4>
                  <p className="text-[9px] text-ink-3 font-mono">Consistência Diária</p>
                </div>
              </div>

              <div className="space-y-3.5">
                {dicasNutricao.filter(d => d.categoria === 'geral').map((dica) => (
                  <div key={dica.id} className="bg-surface border border-line rounded-2xl p-4 shadow-[var(--z-shadow-1)] space-y-2">
                    <h5 className="font-bold text-xs text-ink flex items-center gap-1.5 leading-snug">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      {dica.titulo}
                    </h5>
                    <p className="text-[11px] text-ink-3 leading-relaxed font-sans font-medium">
                      {dica.texto}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Rodapé com Aviso Educativo */}
          <div className="border-t border-line/45 pt-6">
            <AvisoEducativo />
          </div>

        </div>
        </ErrorBoundary>
      )}

      {/* --- MODAL DETALHADO DO SUPLEMENTO (GUIA EDUCATIVO) --- */}
      <AnimatePresence>
        {selectedSuplementoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/70 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-surface border border-line rounded-[32px] shadow-2xl overflow-hidden my-8"
            >
              {/* Header do Modal com Gradient / Cor do Tema */}
              <div className="p-6 pb-4 bg-raise border-b border-line flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-flame/10 flex items-center justify-center text-2xl border border-flame/20 shrink-0">
                    {selectedSuplementoModal.icone}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-flame bg-flame/10 border border-flame/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {selectedSuplementoModal.categoria}
                    </span>
                    <h3 className="font-bold text-base sm:text-lg text-ink mt-1">{selectedSuplementoModal.nome}</h3>
                  </div>
                </div>
                <button 
                  onClick={() => { tocar('tap'); setSelectedSuplementoModal(null); }} 
                  className="p-2 hover:bg-line/40 rounded-full text-ink-3 hover:text-ink transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Corpo do Modal (com scroll se necessário) */}
              <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto divide-y divide-line/30 font-sans">
                
                {/* O que é */}
                <div className="space-y-1.5 pt-0">
                  <h4 className="text-xs font-bold text-ink flex items-center gap-1.5 uppercase tracking-wide">
                    <Info className="w-4 h-4 text-flame shrink-0" /> O que é?
                  </h4>
                  <p className="text-xs text-ink-2 leading-relaxed font-medium">
                    {selectedSuplementoModal.o_que_e}
                  </p>
                </div>

                {/* Para que serve */}
                <div className="space-y-1.5 pt-4">
                  <h4 className="text-xs font-bold text-ink flex items-center gap-1.5 uppercase tracking-wide">
                    <Target className="w-4 h-4 text-flame shrink-0" /> Para que serve?
                  </h4>
                  <p className="text-xs text-ink-2 leading-relaxed font-medium">
                    {selectedSuplementoModal.para_que_serve}
                  </p>
                </div>

                {/* Evidência Científica */}
                <div className="space-y-1.5 pt-4">
                  <h4 className="text-xs font-bold text-ink flex items-center gap-1.5 uppercase tracking-wide">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> O que a ciência diz (Evidência)
                  </h4>
                  <p className="text-xs text-ink-2 leading-relaxed font-medium">
                    {selectedSuplementoModal.evidencia}
                  </p>
                </div>

                {/* Uso Comum */}
                <div className="space-y-1.5 pt-4">
                  <h4 className="text-xs font-bold text-ink flex items-center gap-1.5 uppercase tracking-wide">
                    <Utensils className="w-4 h-4 text-flame shrink-0" /> Uso comum recomendado
                  </h4>
                  <p className="text-xs text-ink-2 leading-relaxed font-medium">
                    {selectedSuplementoModal.uso_comum}
                  </p>
                </div>

                {/* Timing */}
                <div className="space-y-1.5 pt-4">
                  <h4 className="text-xs font-bold text-ink flex items-center gap-1.5 uppercase tracking-wide">
                    <Clock className="w-4 h-4 text-flame shrink-0" /> Quando costuma ser usado (Timing)
                  </h4>
                  <p className="text-xs text-ink-2 leading-relaxed font-medium">
                    {selectedSuplementoModal.timing}
                  </p>
                </div>

                {/* Observações */}
                <div className="space-y-1.5 pt-4">
                  <h4 className="text-xs font-bold text-ink flex items-center gap-1.5 uppercase tracking-wide">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" /> Atenção & Cuidados
                  </h4>
                  <p className="text-xs text-ink-2 leading-relaxed font-medium">
                    {selectedSuplementoModal.observacoes}
                  </p>
                </div>

              </div>

              {/* Rodapé com Aviso Educativo */}
              <div className="p-6 bg-raise border-t border-line space-y-4">
                <AvisoEducativo />
                <button
                  onClick={() => { tocar('tap'); setSelectedSuplementoModal(null); }}
                  className="w-full py-3 bg-flame hover:brightness-110 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-flame/15 border-0"
                >
                  Entendi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADD MEAL MODAL --- */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm bg-surface border border-line rounded-[32px] p-6 shadow-2xl space-y-6 relative"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg text-ink">Registrar refeição</h3>
                <button onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                  tocar('tap');
                }} className="p-2 hover:bg-raise rounded-full text-ink-3">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* REFEIÇÃO FIELD */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-ink-3">Refeição</label>
                  <select
                    value={refeicao}
                    onChange={(e) => setRefeicao(e.target.value)}
                    className="z-input !h-12 w-full bg-raise text-ink border border-line rounded-xl px-3 outline-none focus:border-flame cursor-pointer text-xs"
                  >
                    <option value="Café da manhã">Café da manhã</option>
                    <option value="Almoço">Almoço</option>
                    <option value="Café da tarde">Café da tarde</option>
                    <option value="Jantar">Jantar</option>
                    <option value="Lanche">Lanche</option>
                    <option value="Pré-treino">Pré-treino</option>
                    <option value="Pós-treino">Pós-treino</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                {/* ALIMENTO FIELD (BUSCA/AUTOCOMPLETE) */}
                <div className="space-y-1.5 relative">
                  <label className="text-[12px] font-medium text-ink-3">Alimento</label>
                  {alimentoSelecionado ? (
                    <div className="flex items-center justify-between bg-raise border border-line rounded-xl px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-ink truncate">{alimentoSelecionado.nome}</p>
                        <p className="text-[10px] text-ink-3 font-mono">{alimentoSelecionado.kcal_100g} kcal / 100g</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAlimentoSelecionado(null);
                          setBuscaTermo("");
                        }}
                        className="ml-2 text-ink-3 hover:text-flame p-1 rounded-md hover:bg-line/40"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <input 
                           value={buscaTermo}
                           onChange={(e) => setBuscaTermo(e.target.value)}
                           placeholder="Digite o nome do alimento..."
                           className="z-input !h-12 w-full pr-10 text-xs"
                        />
                        {loadingBusca && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-4 h-4 text-flame animate-spin" />
                          </div>
                        )}
                      </div>
                      
                      {alimentosEncontrados.length > 0 && (
                        <div className="absolute z-[60] left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-surface border border-line rounded-xl shadow-xl divide-y divide-line/40">
                          {alimentosEncontrados.map((ali) => (
                            <button
                              key={ali.id}
                              type="button"
                              onClick={() => {
                                setAlimentoSelecionado(ali);
                                setAlimentosEncontrados([]);
                                setBuscaTermo("");
                                tocar('tap');
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-raise text-xs transition-colors flex flex-col gap-0.5 cursor-pointer"
                            >
                              <span className="font-medium text-ink">{ali.nome}</span>
                              <span className="text-[10px] text-ink-3 font-mono">
                                {ali.kcal_100g} kcal · P: {ali.proteina_100g || 0}g · C: {ali.carbo_100g || 0}g · G: {ali.gordura_100g || 0}g
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* QUANTIDADE FIELD */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-ink-3">Quantidade (g)</label>
                  <input 
                    type="number"
                    value={quantidadeG === 0 ? "" : quantidadeG}
                    onChange={(e) => setQuantidadeG(Math.max(0, Number(e.target.value) || 0))}
                    className="z-input !h-12 w-full num text-xs"
                    placeholder="100"
                  />
                </div>

                {/* REAL-TIME PREVIEW CARD */}
                {alimentoSelecionado && (
                  <div className="bg-raise/50 border border-line rounded-2xl p-4 space-y-2.5">
                    <p className="text-[10px] font-bold text-ink uppercase tracking-wider text-center">Valores Nutricionais Calculados</p>
                    <div className="text-center py-1">
                      <span className="text-2xl font-black text-flame num">{Math.round((Number(alimentoSelecionado.kcal_100g) || 0) * (quantidadeG / 100))}</span>
                      <span className="text-xs text-ink-3 font-bold ml-1">kcal</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono border-t border-line/40 pt-2.5 text-ink-2">
                      <div>
                        <p className="text-ink-3 uppercase text-[9px] tracking-tight">Proteína</p>
                        <p className="font-bold text-ink">{round((Number(alimentoSelecionado.proteina_100g) || 0) * (quantidadeG / 100), 1)}g</p>
                      </div>
                      <div>
                        <p className="text-ink-3 uppercase text-[9px] tracking-tight">Carbo</p>
                        <p className="font-bold text-ink">{round((Number(alimentoSelecionado.carbo_100g) || 0) * (quantidadeG / 100), 1)}g</p>
                      </div>
                      <div>
                        <p className="text-ink-3 uppercase text-[9px] tracking-tight">Gordura</p>
                        <p className="font-bold text-ink">{round((Number(alimentoSelecionado.gordura_100g) || 0) * (quantidadeG / 100), 1)}g</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleAddMeal}
                disabled={saving || !alimentoSelecionado || quantidadeG <= 0}
                className="w-full py-4 brand-gradient-bg rounded-2xl font-semibold text-void flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 cursor-pointer border-0"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                <span>Salvar registro</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
