import React, { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export default function AtualizacaoDisponivel() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const [visivel, setVisivel] = useState(false);
  const [estaEmTreino, setEstaEmTreino] = useState(false);

  useEffect(() => {
    if (needRefresh) {
      // Verificar se o modo treino guiado está ativo
      const checkTreino = () => {
        const rootTreino = document.getElementById('modo-treino-guiado-root');
        setEstaEmTreino(!!rootTreino);
      };

      checkTreino();
      const interval = setInterval(checkTreino, 5000);
      return () => clearInterval(interval);
    }
  }, [needRefresh]);

  useEffect(() => {
    if (needRefresh && !estaEmTreino) {
      setVisivel(true);
    } else {
      setVisivel(false);
    }
  }, [needRefresh, estaEmTreino]);

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
    setVisivel(false);
  };

  if (!visivel) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[100] md:bottom-6 md:left-auto md:right-6 md:w-80">
      <div className="bg-surface border border-line rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-flame/10 flex items-center justify-center shrink-0">
            <RefreshCw className="w-5 h-5 text-flame animate-spin-slow" />
          </div>
          <div>
            <p className="text-sm font-bold text-ink">Nova versão disponível</p>
            <p className="text-[11px] text-ink-3">Atualize para as melhorias mais recentes.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateServiceWorker(true)}
            className="px-3 py-1.5 bg-flame text-white text-xs font-bold rounded-lg hover:bg-flame/90 transition-all active:scale-95"
          >
            Atualizar
          </button>
          <button
            onClick={close}
            className="p-1.5 text-ink-3 hover:text-ink transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
