import React, { useState, useEffect } from 'react';
import { dbService } from '../lib/supabase';
import { Habito, HabitoRegistro } from '../types';
import { 
  Plus, Trash2, TrendingUp, Calendar, 
  Loader2, CheckCircle2, XCircle, ChevronRight,
  Droplets, Moon, Footprints, Pill, Salad, Sparkles, Smile
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GerenciarHabitosProps {
  alunoId: string;
  personalId: string;
}

const PRESETS = [
  { nome: 'Beber 2L de água', icone: '💧', meta: 'Hidratação diária' },
  { nome: 'Dormir 8h', icone: '😴', meta: 'Descanso e recuperação' },
  { nome: '10.000 passos', icone: '🚶', meta: 'Movimento diário' },
  { nome: 'Tomar suplementos', icone: '💊', meta: 'Consistência nutricional' },
  { nome: 'Seguir a dieta', icone: '🥗', meta: 'Adesão ao plano alimentar' },
  { nome: 'Meditar 10 min', icone: '🧘', meta: 'Saúde mental' },
];

export default function GerenciarHabitos({ alunoId, personalId }: GerenciarHabitosProps) {
  const [habitos, setHabitos] = useState<Habito[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // New habit form
  const [newNome, setNewNome] = useState('');
  const [newIcone, setNewIcone] = useState('⚡');
  const [newMeta, setNewMeta] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadHabitos();
  }, [alunoId]);

  const loadHabitos = async () => {
    setLoading(true);
    try {
      const { data } = await dbService.getHabitos(alunoId);
      if (data) setHabitos(data);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHabito = async (preset?: typeof PRESETS[0]) => {
    setSaving(true);
    try {
      const payload: Partial<Habito> = {
        aluno_id: alunoId,
        personal_id: personalId,
        nome: preset ? preset.nome : newNome,
        icone: preset ? preset.icone : newIcone,
        meta_diaria: preset ? preset.meta : newMeta,
        ativo: true
      };
      
      const { error } = await dbService.salvarHabito(payload);
      if (!error) {
        await loadHabitos();
        setShowAddForm(false);
        setNewNome('');
        setNewMeta('');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDesativar = async (id: number) => {
    if (!confirm('Deseja realmente remover este hábito do aluno?')) return;
    
    const { error } = await dbService.desativarHabito(id);
    if (!error) {
      setHabitos(prev => prev.filter(h => h.id !== id));
    }
  };

  const AdherenceMiniChart = ({ registros }: { registros: HabitoRegistro[] }) => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    return (
      <div className="flex gap-1">
        {last7Days.map(date => {
          const isDone = registros.some(r => r.data === date && r.concluido);
          return (
            <div 
              key={date}
              title={new Date(date).toLocaleDateString()}
              className={`w-3 h-3 rounded-[4px] border border-white/5 transition-colors ${
                isDone ? 'bg-flame' : 'bg-void'
              }`}
            />
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 text-flame animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-flame/10 rounded-xl">
            <TrendingUp className="w-5 h-5 text-flame" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-ink">Hábitos do Aluno</h3>
            <p className="text-xs text-ink-3">Adesão nos últimos 7 dias</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white text-void rounded-xl font-display font-bold text-xs hover:scale-105 active:scale-95 transition-all shadow-lg"
        >
          <Plus className="w-4 h-4" />
          ATRIBUIR HÁBITO
        </button>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-surface-2 border border-white/10 rounded-3xl p-6 space-y-6"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-sm text-ink">Atribuir Novo Hábito</h4>
              <button onClick={() => setShowAddForm(false)} className="text-ink-3 hover:text-ink">
                <ChevronRight className="w-5 h-5 rotate-90" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAddHabito(p)}
                  disabled={saving}
                  className="p-3 bg-surface-3 border border-white/5 rounded-2xl hover:border-flame/30 hover:bg-surface-3 transition-all text-left flex items-start gap-3 group"
                >
                  <span className="text-xl shrink-0">{p.icone}</span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-ink group-hover:text-flame truncate">{p.nome}</p>
                    <p className="text-[8px] text-ink-3 truncate">{p.meta}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="relative flex items-center gap-4 py-2">
              <div className="flex-1 h-[1px] bg-white/5" />
              <span className="text-[8px] font-mono text-ink-3 uppercase tracking-widest">Ou personalizado</span>
              <div className="flex-1 h-[1px] bg-white/5" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-ink-3">Nome</label>
                <input
                  value={newNome}
                  onChange={(e) => setNewNome(e.target.value)}
                  placeholder="Ex: Ler 10 páginas"
                  className="w-full bg-void border border-white/5 rounded-xl px-4 py-2.5 text-xs text-ink outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-ink-3">Ícone/Emoji</label>
                <input
                  value={newIcone}
                  onChange={(e) => setNewIcone(e.target.value)}
                  placeholder="Ex: 📖"
                  className="w-full bg-void border border-white/5 rounded-xl px-4 py-2.5 text-xs text-ink outline-none"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => handleAddHabito()}
                  disabled={saving || !newNome}
                  className="w-full py-2.5 brand-gradient-bg rounded-xl font-display font-bold text-void text-xs disabled:opacity-50"
                >
                  SALVAR PERSONALIZADO
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {habitos.map((h) => {
          const registros = h.registros || [];
          const count = registros.filter(r => r.concluido).length;
          
          return (
            <div key={h.id} className="bg-surface-2 border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:border-white/10 transition-all">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-surface-3 flex items-center justify-center text-2xl shrink-0">
                  {h.icone}
                </div>
                <div className="min-w-0">
                  <h4 className="font-display font-bold text-sm text-ink truncate">{h.nome}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <AdherenceMiniChart registros={registros} />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDesativar(h.id)}
                  className="p-2 text-ink-3 hover:text-flame hover:bg-flame/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {habitos.length === 0 && !showAddForm && (
          <div className="col-span-full py-12 bg-void/30 rounded-3xl border border-dashed border-white/5 flex flex-col items-center justify-center">
            <Smile className="w-10 h-10 text-ink-3 opacity-20 mb-3" />
            <p className="text-xs text-ink-3">Nenhum hábito atribuído a este aluno.</p>
          </div>
        )}
      </div>
    </div>
  );
}
