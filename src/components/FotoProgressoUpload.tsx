import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Shield, Check, Loader2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService } from '../lib/supabase';
import { AnguloFoto } from '../types';

interface FotoProgressoUploadProps {
  alunoId: string;
  personalId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export default function FotoProgressoUpload({ alunoId, personalId, onSuccess, onClose }: FotoProgressoUploadProps) {
  const [step, setStep] = useState<'angulo' | 'foto'>('angulo');
  const [angulo, setAngulo] = useState<AnguloFoto | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setStep('foto');
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!angulo || !file) return;
    setUploading(true);
    try {
      const { error } = await dbService.uploadFotoProgresso(alunoId, personalId, angulo, file as any);
      if (!error) {
        onSuccess();
        onClose();
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center p-4 bg-void/80 backdrop-blur-sm overflow-y-auto">
      <div className="flex-1 w-full flex items-center justify-center min-h-[max-content] py-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-md bg-surface border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
        >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-display font-bold text-lg text-ink">Registrar Evolução</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-ink-3 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Privacy Notice */}
          <div className="bg-flame/10 border border-flame/20 p-4 rounded-2xl flex items-start gap-3">
            <Shield className="w-5 h-5 text-flame shrink-0 mt-0.5" />
            <p className="text-xs text-ink-2 leading-relaxed">
              <span className="font-bold text-flame">Privacidade Total:</span> Sua foto é criptografada e só você e seu personal podem ver.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {step === 'angulo' ? (
              <motion.div
                key="step-angulo"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <p className="text-xs text-ink-3 font-mono uppercase tracking-widest text-center">
                  Selecione o ângulo da foto
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {(['frontal', 'lateral', 'costas'] as AnguloFoto[]).map((a) => (
                    <button
                      key={a}
                      onClick={() => {
                        setAngulo(a);
                        fileInputRef.current?.click();
                      }}
                      className="w-full p-4 bg-surface-2 border border-white/5 rounded-2xl flex items-center justify-between hover:border-flame/30 hover:bg-surface-3 transition-all group"
                    >
                      <span className="font-display font-bold text-sm text-ink uppercase tracking-widest group-hover:text-flame">
                        {a}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-void flex items-center justify-center text-ink-3">
                        <Camera className="w-4 h-4" />
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="step-foto"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="aspect-[3/4] max-h-[50vh] mx-auto bg-void rounded-3xl overflow-hidden border border-white/10 relative group">
                  {preview ? (
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-ink-3">
                      <Loader2 className="w-8 h-8 animate-spin mb-2" />
                      <p className="text-xs">Processando...</p>
                    </div>
                  )}
                  <div className="absolute top-4 left-4 px-3 py-1 bg-flame rounded-full text-[10px] font-mono font-bold text-white uppercase tracking-widest">
                    Ângulo: {angulo}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setStep('angulo');
                      setPreview(null);
                      setFile(null);
                    }}
                    className="flex-1 py-4 bg-surface-2 border border-white/5 rounded-2xl font-display font-bold text-ink text-xs hover:bg-surface-3 transition-all"
                  >
                    TROCAR ÂNGULO
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="flex-[2] py-4 brand-gradient-bg rounded-2xl font-display font-bold text-void text-xs flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        SALVAR REGISTRO
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
          capture="environment"
        />
      </motion.div>
      </div>
    </div>
  );
}
