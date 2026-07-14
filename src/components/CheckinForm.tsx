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
        // Não lançamos erro aqui para não travar o formulário; 
        // se não houver dados, o formulário abrirá com os valores padrão (3)
      }

      if (data) {
        setEnergia(data.energia || 3);
        setSono(data.qualidade_sono || 3);
        setEstresse(data.nivel_estresse || 3);
        setDores(data.dores || '');
        setPeso(data.peso_kg?.toString() || '');
        setObservacoes(data.observacoes || '');
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
        dores: dores.trim() || null,
        peso_kg: peso ? parseFloat(peso) : null,
        observacoes: observacoes.trim() || null
      };

      const { error } = await dbService.salvarCheckin(payload);
      if (error) {
        alert('Erro ao salvar check-in. Tente novamente.');
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
        <label className="text-[10px] font-mono uppercase tracking-wider text-ink-2 block">
          {label}
        </label>
        {subtitle && (
          <span className="text-[9px] font-mono text-ink-3 italic">{subtitle}</span>
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
                : 'bg-void border-white/5 text-ink-3 hover:border-white/10'
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
        className="w-full max-w-lg bg-surface border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-xl text-ink">Check-in Semanal</h2>
            <p className="text-xs text-ink-2 mt-1">Como foi sua semana de treinos?</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full text-ink-3 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 text-flame animate-spin" />
              <p className="text-xs text-ink-3 font-mono">Carregando dados da semana...</p>
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
              colorClass="bg-violet"
            />
            <RatingField 
              label="Nível de Estresse" 
              subtitle="1 = tranquilo / 5 = muito estressado"
              value={estresse} 
              onChange={setEstresse} 
              icon={Flame}
              colorClass="bg-flame"
            />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-ink-2 block">
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
                        className="w-full bg-void border border-white/5 focus:border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs text-ink outline-none"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-ink-2 block">
                      Sentiu Dores?
                    </label>
                    <div className="relative">
                      <AlertCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
                      <input
                        type="text"
                        value={dores}
                        onChange={(e) => setDores(e.target.value)}
                        placeholder="Sente alguma dor? Onde?"
                        className="w-full bg-void border border-white/5 focus:border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs text-ink outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-ink-2 block">
                    Observações Adicionais
                  </label>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Conte algo mais sobre sua semana..."
                    rows={3}
                    className="w-full bg-void border border-white/5 focus:border-white/10 rounded-xl p-4 text-xs text-ink outline-none resize-none"
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-void/50">
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={saving || loading || success}
            className={`w-full py-4 rounded-2xl font-display font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 ${
              success ? 'bg-emerald-500 text-white' : 'brand-gradient-bg text-void hover:opacity-95'
            }`}
          >
            {saving ? (
              <span className="w-5 h-5 border-2 border-void border-t-transparent rounded-full animate-spin" />
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
