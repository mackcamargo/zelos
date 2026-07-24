import React, { useState } from 'react';
import { useInstalarPWA } from '../hooks/useInstalarPWA';
import { X, Download, Share, PlusSquare, ExternalLink, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { tocar } from '../lib/som';

export default function CardInstalarPWA() {
  const { deferredPrompt, pwaInstalado, dispensado, instalar, dispensar } = useInstalarPWA();
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [copied, setCopied] = useState(false);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
  const isSafari = /^((?!chrome|crios|fxios|edgios).)*safari/i.test(navigator.userAgent);

  const handleInstallClick = () => {
    tocar('tap');
    if (isIOS) {
      if (isSafari) {
        setShowIOSInstructions(true);
      }
    } else {
      instalar();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopied(true);
    tocar('celebracao');
    setTimeout(() => setCopied(false), 2000);
  };

  if (pwaInstalado || dispensado || isStandalone) return null;

  // Só mostrar no Android se houver prompt, ou sempre no iOS se não for standalone
  if (!deferredPrompt && !isIOS) return null;

  return (
    <>
      <div className="fixed bottom-24 left-4 right-4 z-[50] md:bottom-8 md:left-8 md:right-auto md:max-w-xs">
        <div className="bg-surface border border-line rounded-2xl p-4 shadow-2xl space-y-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-flame/5 blur-3xl pointer-events-none rounded-full" />
          
          <button 
            onClick={dispensar}
            className="absolute top-2 right-2 p-1.5 text-ink-3 hover:text-ink transition-all z-10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-flame rounded-2xl flex items-center justify-center shadow-lg shadow-flame/20 shrink-0">
              <img src="/icons/icon-192.png" alt="Zelos" className="w-8 h-8 object-contain" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-ink">Instale o Zelos</h3>
              <p className="text-[11px] text-ink-3 leading-tight">Acesso rápido, tela cheia e performance superior.</p>
            </div>
          </div>

          <div className="space-y-2 relative z-10">
            {isIOS && !isSafari ? (
              <div className="p-3 bg-raise rounded-xl border border-line space-y-2">
                <p className="text-[10px] text-ink-2">Para instalar no iPhone, abra o link no Safari:</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-surface border border-line px-2 py-1.5 rounded text-[10px] text-ink-3 truncate">
                    {window.location.host}
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="p-1.5 bg-flame/10 text-flame rounded hover:bg-flame/20 transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleInstallClick}
                className="w-full py-3 bg-flame text-white text-xs font-bold rounded-xl shadow-lg shadow-flame/20 hover:bg-flame/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                Instalar Agora
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showIOSInstructions && (
          <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIOSInstructions(false)}
              className="absolute inset-0 bg-void/80 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-sm bg-surface border border-line rounded-t-[32px] sm:rounded-[32px] p-6 space-y-6 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-flame/5 blur-3xl pointer-events-none rounded-full" />
              
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-flame/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-flame/20">
                  <img src="/icons/icon-192.png" alt="Zelos" className="w-8 h-8 object-contain" />
                </div>
                <h3 className="text-xl font-display font-bold text-ink">Adicionar à Tela de Início</h3>
                <p className="text-sm text-ink-2">Siga estes passos para instalar o Zelos no seu iPhone:</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-raise rounded-2xl border border-line">
                  <div className="w-8 h-8 bg-surface rounded-lg flex items-center justify-center border border-line">
                    <Share className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-xs text-ink">1. Toque no ícone <b>Compartilhar</b> na barra inferior do Safari.</p>
                </div>
                
                <div className="flex items-center gap-4 p-4 bg-raise rounded-2xl border border-line">
                  <div className="w-8 h-8 bg-surface rounded-lg flex items-center justify-center border border-line">
                    <PlusSquare className="w-4 h-4 text-ink" />
                  </div>
                  <p className="text-xs text-ink">2. Role para baixo e toque em <b>Adicionar à Tela de Início</b>.</p>
                </div>

                <div className="flex items-center gap-4 p-4 bg-raise rounded-2xl border border-line">
                  <div className="w-8 h-8 bg-surface rounded-lg flex items-center justify-center border border-line font-bold text-blue-500 text-[10px]">
                    ADD
                  </div>
                  <p className="text-xs text-ink">3. Toque em <b>Adicionar</b> no canto superior direito.</p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSInstructions(false)}
                className="w-full py-4 bg-raise border border-line text-ink font-bold rounded-2xl hover:bg-surface transition-all active:scale-[0.98]"
              >
                Entendi
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
