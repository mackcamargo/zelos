import React, { useState, useEffect } from 'react';
import { dbService } from '../lib/supabase';
import { Checkin } from '../types';
import { 
  Zap, Moon, Flame, AlertCircle, Scale, 
  MessageSquare, CheckCircle2, X, Loader2
} from 'lucide-react';
import { motion } from 'motion/react';

interface CheckinFormProps {
  alunoId: string;
  personalId: string;
  semana: string;
  onSuccess: () => void;
  onClose: () => void;
}

export default function CheckinForm({ alunoId, personalId, semana, onSuccess, onClose }: CheckinFormProps) {
  const [energia, setEnergia] = useState(3);
  const [sono, setSono] = useState(3);
  const [estresse, setEstresse] = useState(3);
  const [dores, setDores] = useState('');
  const [senteDor, setSenteDor] = useState(false);
  const [peso, setPeso] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadExistingCheckin();
  }, [alunoId, semana]);

  const loadExistingCheckin = async () => {
    setLoading(true);
    try {
      const { data, error } = await dbService.getCheckinDaSemana(alunoId, semana);
      
      if (error) {
        console.error('Erro ao carregar check-in existente:', error);
      }

      if (data) {
        setEnergia(data.energia || 3);
        setSono(data.qualidade_sono || 3);
        setEstresse(data.nivel_estresse || 3);
        setPeso(data.peso_kg?.toString() || '');
        setObservacoes(data.observacoes || '');
        
        if (data.dores && data.dores.trim() !== '') {
          setSenteDor(true);
          setDores(data.dores);
        } else {
          setSenteDor(false);
          setDores('');
        }
      }
    } catch (err) {
      console.error('Falha crítica ao carregar check-in:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || success) return;
    
    setSaving(true);
    try {
      const payload = {
        aluno_id: alunoId,
        personal_id: personalId,
        semana,
        energia,
        qualidade_sono: sono,
        nivel_estresse: estresse,
        dores: senteDor ? (dores.trim() || null) : null,
        peso_kg: peso ? parseFloat(peso) : null,
        observacoes: observacoes.trim() || null
      };

      const { error } = await dbService.salvarCheckin(payload);
      if (error) {
        console.error('Erro ao salvar check-in:', error);
        alert(`Erro ao salvar check-in: ${error.message || 'Tente novamente.'}`);
      } else {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } finally {
      setSaving(false);
    }
  };

  const RatingField = ({ 
    label, 
    subtitle,
    value, 
    onChange, 
    icon: Icon, 
    colorClass 
  }: { 
    label: string, 
    subtitle?: string,
    value: number, 
    onChange: (v: number) => void, 
    icon: any,
    colorClass: string
  }) => (
    <div className="space-y-3">
      <div className="flex flex-col gap-0.5">
        <label className="text-[12px] font-medium text-ink-2 block">
          {label}
        </label>
        {subtitle && (
          <span className="text-[12px] text-ink-3 italic">{subtitle}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {[1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onChange(num)}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${
              value === num 
                ? `${colorClass} border-transparent shadow-lg scale-110` 
                : 'bg-raise border-line text-ink-3 hover:border-line-strong'
            }`}
          >
            <Icon className={`w-5 h-5 ${value === num ? 'text-white' : ''}`} />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-void/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-lg bg-surface border border-line rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-line flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-xl text-ink">Check-in semanal</h2>
            <p className="text-xs text-ink-2 mt-1">Como foi sua semana de treinos?</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-raise rounded-full text-ink-3 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 text-flame animate-spin" />
              <p className="text-xs text-ink-3">Carregando dados da semana...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 gap-8">
            <RatingField 
              label="Nível de Energia" 
              subtitle="1 = sem energia / 5 = muita energia"
              value={energia} 
              onChange={setEnergia} 
              icon={Zap}
              colorClass="bg-amber-500"
            />
            <RatingField 
              label="Qualidade do Sono" 
              subtitle="1 = dormi mal / 5 = dormi muito bem"
              value={sono} 
              onChange={setSono} 
              icon={Moon}
              colorClass="bg-amber-500"
            />
            <RatingField 
              label="Nível de Estresse" 
              subtitle="1 = tranquilo / 5 = muito estressado"
              value={estresse} 
              onChange={setEstresse} 
              icon={Flame}
              colorClass="bg-amber-500"
            />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[12px] font-medium text-ink-2 block">
                      Peso Atual (kg)
                    </label>
                    <div className="relative">
                      <Scale className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
                      <input
                        type="number"
                        step="0.1"
                        value={peso}
                        onChange={(e) => setPeso(e.target.value)}
                        placeholder="75.5"
                        className="z-input w-full !pl-10 text-xs num"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[12px] font-medium text-ink-2 block">
                        Sente alguma dor ou lesão?
                      </label>
                      <div className="flex bg-raise rounded-xl p-1 border border-line">
                        <button
                          type="button"
                          onClick={() => {
                            setSenteDor(false);
                            setDores('');
                          }}
                          className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                            !senteDor ? 'bg-surface border border-line text-ink shadow-sm' : 'text-ink-3'
                          }`}
                        >
                          Não
                        </button>
                        <button
                          type="button"
                          onClick={() => setSenteDor(true)}
                          className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                            senteDor ? 'bg-rose-500/20 text-rose-400 shadow-sm border border-rose-500/20' : 'text-ink-3'
                          }`}
                        >
                          Sim
                        </button>
                      </div>
                    </div>

                    {senteDor && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="relative"
                      >
                        <AlertCircle className="absolute left-3.5 top-4 w-4 h-4 text-rose-400" />
                        <textarea
                          value={dores}
                          onChange={(e) => setDores(e.target.value)}
                          placeholder="Onde? Descreva a dor ou desconforto..."
                          required={senteDor}
                          rows={2}
                          className="z-input w-full !pl-10 py-3 text-xs resize-none"
                        />
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-medium text-ink-2 block">
                    Observações adicionais
                  </label>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Conte algo mais sobre sua semana..."
                    rows={3}
                    className="z-input w-full p-4 text-xs resize-none"
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-line bg-raise">
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={saving || loading || success}
            className={`w-full py-4 rounded-2xl font-display font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 ${
              success ? 'bg-emerald-500 text-white' : 'brand-gradient-bg text-white hover:opacity-95'
            }`}
          >
            {saving ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : success ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>SALVO COM SUCESSO!</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>ENVIAR CHECK-IN</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
