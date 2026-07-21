import React, { useState, useEffect } from 'react';
import { dbService } from '../lib/supabase';
import { Plano } from '../types';
import { useSubscription } from '../contexts/SubscriptionContext';
import { CHECKOUT_KIWIFY } from '../lib/checkout';
import { Check, Sparkles, Zap, Shield, Rocket, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

export default function PlanosArea({ userEmail }: { userEmail: string }) {
  const { assinatura, refreshSubscription } = useSubscription();
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [planoParaTrocar, setPlanoParaTrocar] = useState<string | null>(null);
  const [planoParaConfirmar, setPlanoParaConfirmar] = useState<Plano | null>(null);

  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const fetchPlanos = async () => {
      const { data } = await dbService.getPlanosAtivos();
      if (data) setPlanos(data);
      setLoading(false);
    };
    fetchPlanos();
  }, []);

  const abrirCheckout = (planoSlug: string) => {
    const checkoutLink = CHECKOUT_KIWIFY[planoSlug];
    if (!checkoutLink) return;

    const url = `${checkoutLink}?email=${encodeURIComponent(userEmail)}`;
    window.open(url, "_blank");
  };

  const handleAssinar = (planoSlug: string) => {
    // Se já existe uma assinatura paga ativa e o personal está tentando
    // assinar um plano diferente, avisamos antes: a Kiwify não cancela a
    // assinatura antiga sozinha, então isso geraria uma cobrança dupla.
    const jaTemPlanoPagoDiferente =
      assinatura?.status === 'ativa' &&
      ['basico', 'pro', 'ilimitado'].includes(assinatura.plano) &&
      assinatura.plano !== planoSlug;

    if (jaTemPlanoPagoDiferente) {
      setPlanoParaTrocar(planoSlug);
      return;
    }

    abrirCheckout(planoSlug);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const getPlanoDetails = (planoId: string) => {
    switch (planoId.toLowerCase()) {
      case 'basico':
        return {
          subtitle: "Ideal para começar",
          capacity: "Até 10 alunos",
          isPopular: false,
          icon: <Zap className="w-6 h-6 text-[#F26A1B]" strokeWidth={1.75} />,
        };
      case 'pro':
        return {
          subtitle: "Para quem está crescendo",
          capacity: "Até 30 alunos",
          isPopular: true,
          icon: <Rocket className="w-6 h-6 text-[#F26A1B]" strokeWidth={1.75} />,
        };
      case 'ilimitado':
        return {
          subtitle: "Sem limites",
          capacity: "Alunos ilimitados",
          isPopular: false,
          icon: <Sparkles className="w-6 h-6 text-[#F26A1B]" strokeWidth={1.75} />,
        };
      default:
        return {
          subtitle: "Acesso completo",
          capacity: "Alunos",
          isPopular: false,
          icon: <Shield className="w-6 h-6 text-ink-3" strokeWidth={1.75} />,
        };
    }
  };

  const vantagensComuns = [
    "Fichas de treino ilimitadas",
    "Biblioteca com +200 exercícios",
    "Perfil ortopédico e alertas de segurança no treino",
    "Nutrição com base TACO (calorias e macros automáticos)",
    "Hidratação, hábitos e check-ins",
    "Progresso, fotos e gamificação",
    "Chat com o aluno"
  ];

  // Cancelamento agendado: o cliente já pagou o ciclo atual, então o acesso
  // continua liberado até `expira_em` mesmo com a assinatura cancelada na Kiwify.
  const emPeriodoDeGraca = !!assinatura?.cancelado_em && assinatura.status === 'ativa';

  const modalVariants = {
    hidden: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 15 },
    visible: shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 },
    exit: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 15 },
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h2 className="z-display text-ink text-[28px] leading-tight">
          Escolha o seu <span className="text-accent">plano</span>
        </h2>
        <p className="z-eyebrow mt-1 text-sm text-ink-3">
          Comece hoje. Cancele quando quiser.
        </p>
      </div>

      {emPeriodoDeGraca && (
        <div className="max-w-6xl mx-auto bg-warn/10 border border-warn/20 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warn shrink-0 mt-0.5" strokeWidth={1.75} />
          <p className="text-sm text-ink-2">
            Sua assinatura foi cancelada e não será renovada automaticamente.
            {assinatura?.expira_em && (
              <>
                {' '}Você continua com acesso completo até{' '}
                <strong className="text-ink">
                  {new Date(assinatura.expira_em).toLocaleDateString('pt-BR')}
                </strong>.
              </>
            )}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch pt-6">
        {planos.map((plano) => {
          const isCurrent = assinatura?.plano === plano.id.toLowerCase() && !emPeriodoDeGraca;
          const checkoutLink = CHECKOUT_KIWIFY[plano.id.toLowerCase()];
          const isAvailable = !!checkoutLink;
          const details = getPlanoDetails(plano.id);

          return (
            <div
              key={plano.id}
              className={`z-card relative flex flex-col justify-between transition-all duration-300 ${
                details.isPopular 
                  ? 'md:scale-[1.03] border-2 border-accent shadow-[0_12px_40px_rgba(242,106,27,0.1)] bg-surface z-10' 
                  : 'border border-line bg-surface shadow-md'
              } rounded-[20px] p-6`}
            >
              {details.isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-lg z-10">
                  MAIS POPULAR
                </div>
              )}

              {isCurrent && !details.isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-accent/20 border border-accent/40 text-accent text-[10px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md z-10">
                  Plano Atual
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 bg-accent/5 rounded-2xl border border-line">
                    {details.icon}
                  </div>
                  <div className="text-right">
                    <div className="text-[20px] font-bold font-display text-ink">
                      {plano.nome}
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-semibold text-ink-3">R$</span>
                    <span className="text-4xl font-black text-ink leading-none">
                      {Math.floor(plano.preco_centavos / 100)}
                    </span>
                    <span className="text-[12px] text-ink-3 font-semibold">/mês</span>
                  </div>
                </div>

                {/* Destaque do Diferencial e Capacidade */}
                <div className="bg-[#F26A1B]/5 border border-[#F26A1B]/15 rounded-xl p-4 mb-6 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-accent tracking-wider">Destaque do Plano</p>
                  <p className="text-sm font-bold text-ink">{details.capacity}</p>
                  <p className="text-xs text-ink-3">{details.subtitle}</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {vantagensComuns.map((vantagem, index) => (
                    <li key={index} className="flex items-start gap-3 text-xs text-ink-2 font-medium">
                      <div className="shrink-0 w-4.5 h-4.5 rounded-full bg-[#F26A1B]/10 border border-[#F26A1B]/20 flex items-center justify-center mt-0.5">
                        <Check className="w-3 h-3 text-[#F26A1B]" strokeWidth={2.5} />
                      </div>
                      <span className="leading-tight">{vantagem}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                disabled={isCurrent || !isAvailable}
                onClick={() => {
                  if (isAvailable && !isCurrent) {
                    setPlanoParaConfirmar(plano);
                  }
                }}
                className={`w-full h-12 rounded-xl transition-all duration-200 text-xs font-bold uppercase tracking-wider flex items-center justify-center cursor-pointer ${
                  isCurrent
                    ? 'bg-raise text-ink-3 border border-line cursor-not-allowed'
                    : !isAvailable
                      ? 'bg-raise/50 text-ink-3 border border-line/30 cursor-not-allowed'
                      : details.isPopular
                        ? 'bg-[#F26A1B] hover:bg-[#D45914] text-white shadow-lg active:scale-[0.99]'
                        : 'border border-[#F26A1B] text-[#F26A1B] hover:bg-[#F26A1B]/10 active:scale-[0.99]'
                }`}
              >
                {isCurrent ? 'Plano atual' : isAvailable ? 'Assinar agora' : 'Em breve'}
              </button>
            </div>
          );
        })}
      </div>

      {/* MODAL INTERATIVO DE CONFIRMAÇÃO DE INSCRIÇÃO */}
      <AnimatePresence>
        {planoParaConfirmar && (() => {
          const details = getPlanoDetails(planoParaConfirmar.id);
          return (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              {/* Backdrop overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => setPlanoParaConfirmar(null)}
                className="fixed inset-0 bg-black/50 backdrop-blur-[2px] cursor-pointer"
              />

              {/* Modal Box */}
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.2, ease: "easeOut" }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-lg bg-surface rounded-[20px] overflow-hidden border border-line shadow-[0_10px_30px_rgba(0,0,0,0.18)] z-10 flex flex-col max-h-[90vh]"
              >
                {/* Header */}
                <div className="p-6 pb-4 border-b border-line flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {details.icon}
                    <h3 className="font-display font-bold text-lg text-ink">Confirmar Assinatura</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPlanoParaConfirmar(null)}
                    className="text-ink-3 hover:text-ink transition-colors p-1 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto">
                  <div className="text-center space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-accent bg-[#F26A1B14] px-3 py-1 rounded-full">
                      {planoParaConfirmar.nome}
                    </span>
                    
                    <div className="pt-3 flex items-baseline justify-center gap-1">
                      <span className="text-sm font-semibold text-ink-3">R$</span>
                      <span className="text-4xl font-black text-ink z-num">
                        {(planoParaConfirmar.preco_centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-ink-3 font-semibold">/mês</span>
                    </div>

                    <p className="text-xs text-ink-2 font-medium pt-2 italic">
                      "Tudo o que você precisa para profissionalizar sua consultoria."
                    </p>
                  </div>

                  {/* Destaque Capacidade */}
                  <div className="p-4 bg-[#FFF4ED] border border-[#F26A1B14] rounded-xl text-center">
                    <p className="text-xs font-semibold text-ink-2 uppercase tracking-wider mb-1">Capacidade de Alunos</p>
                    <p className="text-base font-bold text-accent">{details.capacity}</p>
                  </div>

                  {/* Vantagens List */}
                  <div className="space-y-3">
                    <p className="text-[11px] uppercase font-bold text-ink-2 tracking-wider">Benefícios Inclusos:</p>
                    <ul className="grid grid-cols-1 gap-2">
                      {vantagensComuns.map((vantagem, index) => (
                        <li key={index} className="flex items-start gap-2.5 text-xs text-ink-2 font-medium">
                          <div className="shrink-0 w-4.5 h-4.5 rounded-full bg-[#F26A1B14] border border-[#F26A1B14] flex items-center justify-center mt-0.5">
                            <Check className="w-3 h-3 text-accent" strokeWidth={2.5} />
                          </div>
                          <span className="leading-tight">{vantagem}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-bg border-t border-line flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setPlanoParaConfirmar(null)}
                    className="flex-1 h-12 rounded-xl bg-raise hover:bg-line-soft text-ink-2 transition-colors text-xs font-bold cursor-pointer border border-line"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const slug = planoParaConfirmar.id.toLowerCase();
                      setPlanoParaConfirmar(null);
                      handleAssinar(slug);
                    }}
                    className="flex-1 h-12 rounded-xl bg-accent hover:opacity-90 text-white transition-colors text-xs font-bold cursor-pointer shadow-lg"
                  >
                    Ir para o pagamento
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {planoParaTrocar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
          <div className="bg-surface border border-line rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-warn/10 border border-warn/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-warn" strokeWidth={1.75} />
              </div>
              <h2 className="text-xl font-semibold text-ink">
                Atenção antes de trocar de plano
              </h2>
            </div>
            <p className="text-sm text-ink-2 leading-relaxed mb-4">
              Você já tem uma assinatura ativa. Assinar um novo plano agora vai gerar uma
              cobrança separada na Kiwify — sua assinatura atual não é cancelada automaticamente.
            </p>
            <p className="text-sm text-ink-2 leading-relaxed mb-8">
              Para não pagar os dois planos ao mesmo tempo, cancele antes a assinatura atual
              pelo botão "gerenciar assinatura" no e-mail de "Pagamento de assinatura aprovado"
              que a Kiwify te enviou.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  const alvo = planoParaTrocar;
                  setPlanoParaTrocar(null);
                  if (alvo) abrirCheckout(alvo);
                }}
                className="w-full py-4 bg-accent text-white rounded-2xl font-semibold hover:opacity-90 transition-all shadow-lg"
              >
                Entendi, continuar mesmo assim
              </button>
              <button
                onClick={() => setPlanoParaTrocar(null)}
                className="w-full py-4 bg-bg text-ink-2 border border-line rounded-2xl font-semibold hover:bg-raise transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
