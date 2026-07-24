import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function useInstalarPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [pwaInstalado, setPwaInstalado] = useState(false);
  const [dispensado, setDispensado] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setPwaInstalado(true);
      localStorage.setItem('zelos:pwa_instalado', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Verificar se já foi dispensado recentemente
    const dispensadoEm = localStorage.getItem('zelos:pwa_dispensado');
    if (dispensadoEm) {
      const dataDispensado = new Date(dispensadoEm);
      const agora = new Date();
      const diffDays = Math.ceil((agora.getTime() - dataDispensado.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 14) {
        setDispensado(true);
      }
    }

    // Verificar se já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setPwaInstalado(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const instalar = useCallback(async () => {
    if (!deferredPrompt) return;
    
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const dispensar = useCallback(() => {
    setDispensado(true);
    localStorage.setItem('zelos:pwa_dispensado', new Date().toISOString());
  }, []);

  return { 
    deferredPrompt, 
    pwaInstalado, 
    dispensado, 
    instalar, 
    dispensar 
  };
}
