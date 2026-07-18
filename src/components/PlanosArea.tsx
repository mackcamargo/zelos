import React, { useState, useEffect } from 'react';
import { dbService } from '../lib/supabase';
import { Plano } from '../types';
import { useSubscription } from '../contexts/SubscriptionContext';
import { CHECKOUT_KIWIFY } from '../lib/checkout';
import { Check, Sparkles, Zap, Shield, Rocket, AlertTriangle } from 'lucide-react';

export default function PlanosArea({ userEmail }: { userEmail: string }) {
  const { assinatura, refreshSubscription } = useSubscription();
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [planoParaTrocar, setPlanoParaTrocar] = useState<string | null>(null);

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

  const getIcon = (slug: string) => {
    switch (slug) {
      case 'basico': return <Zap className="w-6 h-6 text-accent" strokeWidth={1.75} />;
      case 'pro': return <Rocket className="w-6 h-6 text-accent" strokeWidth={1.75} />;
      case 'ilimitado': return <Sparkles className="w-6 h-6 text-accent" strokeWidth={1.75} />;
      default: return <Shield className="w-6 h-6 text-ink-3" strokeWidth={1.75} />;
    }
  };

  // Cancelamento agendado: o cliente já pagou o ciclo atual, então o acesso
  // continua liberado até `expira_em` mesmo com a assinatura cancelada na Kiwify.
  const emPeriodoDeGraca = !!assinatura?.cancelado_em && assinatura.status === 'ativa';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h2 className="z-display text-ink text-[28px] leading-tight">
          Escolha o seu <span className="text-accent">plano</span>
        </h2>
        <p className="z-eyebrow mt-1">
          Potencialize sua consultoria com as melhores ferramentas
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {planos.map((plano) => {
          const isCurrent = assinatura?.plano === plano.id.toLowerCase() && !emPeriodoDeGraca;
          const checkoutLink = CHECKOUT_KIWIFY[plano.id.toLowerCase()];
          const isAvailable = !!checkoutLink;

          return (
            <div
              key={plano.id}
              className={`z-card relative flex flex-col justify-between transition-all duration-300 hover:scale-[1.01] ${
                isCurrent ? 'border-accent shadow-[0_0_20px_rgba(242,106,27,0.15)] bg-raise' : ''
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-accent text-white text-[11px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-md">
                  Seu plano
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 bg-raise rounded-2xl border border-line">
                    {getIcon(plano.id.toLowerCase())}
                  </div>
                  <div className="text-right">
                    <div className="text-[20px] font-bold font-display text-ink">
                      {plano.nome}
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-semibold text-ink-3">R$</span>
                    <span className="text-[28px] font-bold text-ink z-num">
                      {(plano.preco_centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[12px] text-ink-3 font-semibold">/mês</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3 text-sm text-ink-2 font-medium">
                    <div className="shrink-0 w-5 h-5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-accent" strokeWidth={2} />
                    </div>
                    <span>
                      {plano.limite_alunos >= 999999 ? 'Alunos ilimitados' : `Até ${plano.limite_alunos} alunos`}
                    </span>
                  </li>
                  {plano.recursos?.map((recurso, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-ink-2 font-medium">
                      <div className="shrink-0 w-5 h-5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-accent" strokeWidth={2} />
                      </div>
                      <span>{recurso}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                disabled={isCurrent || !isAvailable}
                onClick={() => handleAssinar(plano.id.toLowerCase())}
                className={`z-btn w-full ${
                  isCurrent
                    ? '!bg-raise !text-ink-3 cursor-not-allowed border-line'
                    : isAvailable
                      ? 'z-btn--primary'
                      : 'z-btn--ghost text-ink-3 cursor-not-allowed'
                }`}
              >
                {isCurrent ? 'Plano atual' : isAvailable ? 'Assinar agora' : 'Em breve'}
              </button>
            </div>
          );
        })}
      </div>

      {planoParaTrocar && (
        <div className="fixed inset-0 bg-void/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
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
                className="w-full py-4 bg-flame text-white rounded-2xl font-semibold hover:bg-orange-600 transition-all shadow-lg shadow-flame/20"
              >
                Entendi, continuar mesmo assim
              </button>
              <button
                onClick={() => setPlanoParaTrocar(null)}
                className="w-full py-4 bg-white/5 text-ink-3 rounded-2xl font-semibold hover:bg-white/10 transition-all"
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
