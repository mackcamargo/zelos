import React, { useState, useEffect } from 'react';
import { dbService } from '../lib/supabase';
import { Plano } from '../types';
import { useSubscription } from '../contexts/SubscriptionContext';
import { CHECKOUT_KIWIFY } from '../lib/checkout';
import { Check, Sparkles, Zap, Shield, Rocket } from 'lucide-react';

export default function PlanosArea({ userEmail }: { userEmail: string }) {
  const { assinatura, refreshSubscription } = useSubscription();
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlanos = async () => {
      const { data } = await dbService.getPlanosAtivos();
      if (data) setPlanos(data);
      setLoading(false);
    };
    fetchPlanos();
  }, []);

  const handleAssinar = (planoSlug: string) => {
    const checkoutLink = CHECKOUT_KIWIFY[planoSlug];
    if (!checkoutLink) return;

    const url = `${checkoutLink}?email=${encodeURIComponent(userEmail)}`;
    window.open(url, "_blank");
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {planos.map((plano) => {
          const isCurrent = assinatura?.plano === plano.id.toLowerCase();
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
    </div>
  );
}
