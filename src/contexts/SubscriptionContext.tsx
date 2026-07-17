import React, { createContext, useContext, useState, useEffect } from 'react';
import { dbService } from '../lib/supabase';
import { Assinatura } from '../types';

interface SubscriptionContextType {
  assinatura: Assinatura | null;
  loading: boolean;
  isReadOnly: boolean;
  studentCount: number;
  refreshSubscription: () => Promise<void>;
  daysRemaining: number;
  handleSubscriptionError: (error: any) => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ personalId: string; children: React.ReactNode }> = ({ personalId, children }) => {
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentCount, setStudentCount] = useState(0);
  const [errorModal, setErrorModal] = useState<{ title: string; message: string; type: 'upgrade' | 'reactivate' } | null>(null);

  const fetchSubscription = async () => {
    try {
      const [subRes, countRes] = await Promise.all([
        dbService.getAssinatura(personalId),
        dbService.getContagemAlunos(personalId)
      ]);
      
      setAssinatura(subRes.data);
      setStudentCount(countRes.data || 0);
    } catch (error) {
      console.error('Erro ao carregar assinatura:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (personalId) {
      fetchSubscription();
    }
  }, [personalId]);

  const isReadOnly = !assinatura || 
    assinatura.status === 'cancelada' || 
    assinatura.status === 'expirada' || 
    new Date(assinatura.expira_em) < new Date();

  const getDaysRemaining = () => {
    if (!assinatura?.expira_em) return 0;
    const diffTime = new Date(assinatura.expira_em).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const handleSubscriptionError = (error: any) => {
    if (!error) return false;
    
    const message = error.message || '';
    
    if (message.includes("ASSINATURA_INATIVA")) {
      setErrorModal({
        title: "Sua assinatura não está ativa",
        message: "Para continuar criando e editando, você precisa reativar seu plano.",
        type: 'reactivate'
      });
      return true;
    }
    
    if (message.includes("LIMITE_ATINGIDO")) {
      setErrorModal({
        title: "Você atingiu o limite do seu plano",
        message: message.replace("LIMITE_ATINGIDO: ", ""),
        type: 'upgrade'
      });
      return true;
    }
    
    return false;
  };

  return (
    <SubscriptionContext.Provider value={{ 
      assinatura, 
      loading, 
      isReadOnly, 
      studentCount, 
      refreshSubscription: fetchSubscription,
      daysRemaining: getDaysRemaining(),
      handleSubscriptionError
    }}>
      {children}

      {/* Error Modal */}
      {errorModal && (
        <div className="fixed inset-0 bg-void/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-display font-black text-ink uppercase italic tracking-tighter mb-4">
              {errorModal.title}
            </h2>
            <p className="text-sm text-ink-2 leading-relaxed mb-8">
              {errorModal.message}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setErrorModal(null);
                  // Em uma implementação real, poderíamos disparar uma navegação aqui
                  // Mas como o estado está no PersonalAreaContent, o ideal é que ele escute isso
                  // Ou simplesmente feche o modal e o usuário clica em "Assinatura" no menu.
                  window.dispatchEvent(new CustomEvent('changeTab', { detail: 'planos' }));
                }}
                className="w-full py-4 bg-flame text-white rounded-2xl font-display font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-flame/20"
              >
                {errorModal.type === 'upgrade' ? 'Fazer Upgrade' : 'Reativar Plano'}
              </button>
              <button
                onClick={() => setErrorModal(null)}
                className="w-full py-4 bg-white/5 text-ink-3 rounded-2xl font-display font-black uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
