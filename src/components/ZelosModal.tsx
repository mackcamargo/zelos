import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';

interface ZelosModalProps {
  show: boolean;
  type: 'confirm' | 'alert';
  variant?: 'danger' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const ZelosModal: React.FC<ZelosModalProps> = ({
  show,
  type,
  variant = 'warning',
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel
}) => {
  if (!show) return null;

  const getIcon = () => {
    switch (variant) {
      case 'danger': return <AlertTriangle className="w-6 h-6 text-rose-500" />;
      case 'warning': return <AlertTriangle className="w-6 h-6 text-amber-500" />;
      case 'success': return <CheckCircle2 className="w-6 h-6 text-emerald-500" />;
      default: return <Info className="w-6 h-6 text-blue-500" />;
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger': return 'bg-rose-500/10 border-rose-500/20';
      case 'warning': return 'bg-amber-500/10 border-amber-500/20';
      case 'success': return 'bg-emerald-500/10 border-emerald-500/20';
      default: return 'bg-blue-500/10 border-blue-500/20';
    }
  };

  const getButtonStyles = () => {
    switch (variant) {
      case 'danger': return 'bg-rose-600 hover:bg-rose-700 text-white';
      case 'warning': return 'bg-amber-600 hover:bg-amber-700 text-white';
      case 'success': return 'bg-emerald-600 hover:bg-emerald-700 text-white';
      default: return 'bg-blue-600 hover:bg-blue-700 text-white';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel || onConfirm}
          className="absolute inset-0 bg-void/80 backdrop-blur-sm"
        />
        
        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-sm bg-surface border border-line rounded-3xl p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Animated background glow */}
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 blur-[80px] rounded-full animate-pulse pointer-events-none opacity-20 ${
            variant === 'danger' ? 'bg-rose-500' : 
            variant === 'warning' ? 'bg-amber-500' : 
            variant === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
          }`} />

          <button 
            onClick={onCancel || onConfirm}
            className="absolute top-6 right-6 p-2 hover:bg-raise rounded-full text-ink-3 transition-colors z-20 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="space-y-6 relative z-10">
            <div className="flex justify-center">
              <div className={`p-4 rounded-2xl border ${getVariantStyles()}`}>
                {getIcon()}
              </div>
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-display font-bold text-ink leading-tight">{title}</h3>
              <p className="text-sm text-ink-3 leading-relaxed px-4">{message}</p>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onConfirm();
                }}
                className={`w-full py-4 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-lg active:scale-[0.98] ${getButtonStyles()}`}
              >
                {confirmLabel}
              </button>
              {type === 'confirm' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancel?.();
                  }}
                  className="w-full py-4 bg-raise hover:bg-raise/80 border border-line text-ink rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  {cancelLabel}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
