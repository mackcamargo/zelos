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
    return <div className="flex items-center justify-center h-64">Carregando planos...</div>;
  }

  const getIcon = (slug: string) => {
    switch (slug) {
      case 'basico': return <Zap className="w-6 h-6 text-blue-400" />;
      case 'pro': return <Rocket className="w-6 h-6 text-flame" />;
      case 'ilimitado': return <Sparkles className="w-6 h-6 text-amber" />;
      default: return <Shield className="w-6 h-6 text-ink-3" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-[28px] font-semibold text-ink">
          Escolha o seu <span className="text-flame">plano</span>
        </h2>
        <p className="text-ink-3 text-[12px] font-medium">
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
              className={`relative bg-surface border-2 rounded-3xl p-8 flex flex-col transition-all duration-300 hover:scale-[1.02] ${
                isCurrent ? 'border-flame shadow-2xl shadow-flame/10' : 'border-white/5 hover:border-white/10'
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-flame text-white text-[12px] font-semibold px-4 py-1.5 rounded-full shadow-lg">
                  Seu plano
                </div>
              )}

              <div className="flex items-center justify-between mb-6">
                <div className="p-3 bg-white/5 rounded-2xl">
                  {getIcon(plano.id.toLowerCase())}
                </div>
                <div className="text-right">
                  <div className="text-[20px] font-semibold text-ink">
                    {plano.nome}
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-semibold text-ink-3">R$</span>
                  <span className="text-[28px] font-semibold text-ink num">
                    {(plano.preco_centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[12px] text-ink-3 font-medium">/mês</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-sm text-ink-2">
                  <div className="shrink-0 w-5 h-5 rounded-full bg-flame/10 flex items-center justify-center">
                    <Check className="w-3 h-3 text-flame" />
                  </div>
                  <span>
                    {plano.limite_alunos >= 999999 ? 'Alunos ilimitados' : `Até ${plano.limite_alunos} alunos`}
                  </span>
                </li>
                {plano.recursos?.map((recurso, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-ink-2">
                    <div className="shrink-0 w-5 h-5 rounded-full bg-flame/10 flex items-center justify-center">
                      <Check className="w-3 h-3 text-flame" />
                    </div>
                    <span>{recurso}</span>
                  </li>
                ))}
              </ul>

              <button
                disabled={isCurrent || !isAvailable}
                onClick={() => handleAssinar(plano.id.toLowerCase())}
                className={`w-full py-4 rounded-2xl font-semibold text-xs transition-all duration-300 ${
                  isCurrent 
                    ? 'bg-white/5 text-ink-3 cursor-not-allowed'
                    : isAvailable
                      ? 'bg-flame text-white hover:bg-orange-600 shadow-xl shadow-flame/20 hover:shadow-flame/30'
                      : 'bg-white/5 text-ink-3 cursor-not-allowed'
                }`}
              >
                {isCurrent ? 'Plano atual' : isAvailable ? 'Assinar agora' : 'Em breve'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="bg-white/5 rounded-3xl p-6 border border-white/5 max-w-2xl mx-auto text-center">
        <p className="text-xs text-ink-3 font-medium leading-relaxed">
          As assinaturas são processadas com segurança pela Kiwify. 
          Após o pagamento, seu acesso será atualizado automaticamente.
          Dúvidas? Entre em contato com nosso suporte.
        </p>
      </div>
    </div>
  );
}
