import React, { useState, useEffect } from 'react';
import { dbService, isSupabaseConfigured, supabase } from '../lib/supabase';
import { Habito, HabitoRegistro } from '../types';
import { 
  Plus, Trash2, TrendingUp, 
  Loader2, X, Sparkles,
  Zap, Droplet, Utensils, Moon, Footprints, Activity, PhoneOff, Sun
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GerenciarHabitosProps {
  alunoId: string;
  personalId: string;
  isReadOnly?: boolean;
}

const EMOJIS = ['⚡', '💧', '🥗', '😴', '🚶', '🧘', '📵', '☀️'];

const renderHabitoIcon = (icone: string) => {
  const iconProps = { className: "w-5 h-5 text-ink stroke-[1.5]" };
  switch (icone) {
    case '⚡': return <Zap {...iconProps} />;
    case '💧': return <Droplet {...iconProps} />;
    case '🥗': return <Utensils {...iconProps} />;
    case '😴': return <Moon {...iconProps} />;
    case '🚶': return <Footprints {...iconProps} />;
    case '🧘': return <Activity {...iconProps} />;
    case '📵': return <PhoneOff {...iconProps} />;
    case '☀️': return <Sun {...iconProps} />;
    default: return <Zap {...iconProps} />;
  }
};

export default function GerenciarHabitos({ alunoId, personalId, isReadOnly = false }: GerenciarHabitosProps) {
  const [habitos, setHabitos] = useState<Habito[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // New habit form state
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
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("habitos")
          .select("*")
          .eq("aluno_id", alunoId)
          .eq("ativo", true)
          .order("criado_em", { ascending: true });
        
        if (data) {
          // fetch registrations to build the detailed list
          const ids = data.map((h: any) => h.id);
          let regs: any[] = [];
          if (ids.length > 0) {
            const { data: regsData } = await supabase
              .from('habitos_registros')
              .select('*')
              .in('habito_id', ids);
            regs = regsData || [];
          }

          const mapped = data.map((h: any) => ({
            ...h,
            registros: regs.filter((r: any) => r.habito_id === h.id)
          }));
          setHabitos(mapped);
        }
      } else {
        // Fallback for demo mode
        const localHabitos = JSON.parse(localStorage.getItem('zenite_habitos') || '[]');
        const localRegistros = JSON.parse(localStorage.getItem('zenite_habitos_registros') || '[]');
        
        const filteredHabitos = localHabitos.filter((h: any) => h.aluno_id === alunoId && h.ativo !== false);
        const mapped = filteredHabitos.map((h: any) => ({
          ...h,
          registros: localRegistros.filter((r: any) => r.habito_id === h.id)
        }));
        setHabitos(mapped);
      }
    } catch (err) {
      console.error("Erro ao carregar hábitos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newNome.trim()) return;
    setSaving(true);
    try {
      const payload = {
        aluno_id: alunoId,
        personal_id: personalId,
        nome: newNome.trim(),
        icone: newIcone,
        meta_diaria: newMeta.trim() || null,
        ativo: true
      };

      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from("habitos")
          .insert(payload);
        if (error) throw error;
      } else {
        // Fallback for demo mode
        const habitosMock = JSON.parse(localStorage.getItem('zenite_habitos') || '[]');
        habitosMock.push({
          id: Math.floor(Math.random() * 1000000),
          ...payload,
          criado_em: new Date().toISOString()
        });
        localStorage.setItem('zenite_habitos', JSON.stringify(habitosMock));
      }
      await loadHabitos();
      setShowAddForm(false);
      setNewNome('');
      setNewMeta('');
      setNewIcone('⚡');
    } catch (err) {
      console.error("Erro ao salvar hábito:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDesativar = async (id: number) => {
    if (!confirm('Deseja realmente remover este hábito do aluno?')) return;
    
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('habitos')
          .update({ ativo: false })
          .eq('id', id);
        if (error) throw error;
      } else {
        // Fallback for demo mode
        const habitosMock = JSON.parse(localStorage.getItem('zenite_habitos') || '[]');
        const index = habitosMock.findIndex((h: any) => h.id === id);
        if (index >= 0) {
          habitosMock[index].ativo = false;
          localStorage.setItem('zenite_habitos', JSON.stringify(habitosMock));
        }
      }
      setHabitos(prev => prev.filter(h => h.id !== id));
    } catch (err) {
      console.error("Erro ao desativar hábito:", err);
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
              className={`w-3.5 h-3.5 rounded border border-white/5 transition-colors ${
                isDone ? 'bg-green-500' : 'bg-void'
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
        <Loader2 className="w-6 h-6 text-[#F26A1B] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#F26A1B]/10 rounded-lg">
            <TrendingUp className="w-5 h-5 text-[#F26A1B]" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-ink">Hábitos do aluno</h3>
            <p className="text-[12px] text-ink-3">Defina e acompanhe a disciplina diária</p>
          </div>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#F26A1B] text-ink rounded-lg font-semibold text-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-ink" />
            Novo hábito
          </button>
        )}
      </div>

      {/* Modal / Form to add habit */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-white/5 rounded-xl p-6 w-full max-w-md space-y-6 relative"
            >
              <button 
                onClick={() => setShowAddForm(false)} 
                className="absolute top-4 right-4 p-1.5 text-ink-3 hover:text-ink hover:bg-white/5 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <h4 className="font-semibold text-lg text-ink">Atribuir novo hábito</h4>
                <p className="text-[12px] text-ink-3">Insira os detalhes do hábito que o aluno deve cumprir diariamente.</p>
              </div>

              <div className="space-y-4">
                {/* Nome */}
                <div className="space-y-2">
                  <label className="text-[12px] text-ink-3">Nome do hábito</label>
                  <input
                    value={newNome}
                    onChange={(e) => setNewNome(e.target.value)}
                    placeholder="Ex: Beber água"
                    className="w-full bg-void border border-white/5 rounded-lg px-4 py-2.5 text-sm text-ink outline-none focus:border-[#F26A1B]/50 transition-colors"
                  />
                </div>

                {/* Emoji / Icon selector */}
                <div className="space-y-2">
                  <label className="text-[12px] text-ink-3 block">Selecione o ícone</label>
                  <div className="grid grid-cols-8 gap-2">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewIcone(emoji)}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer border ${
                          newIcone === emoji
                            ? 'bg-[#F26A1B]/10 border-[#F26A1B] text-[#F26A1B]'
                            : 'bg-[#1A1A1D] border-white/5 hover:border-white/10 text-ink-3'
                        }`}
                      >
                        {renderHabitoIcon(emoji)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Meta diária */}
                <div className="space-y-2">
                  <label className="text-[12px] text-ink-3">Meta diária (opcional)</label>
                  <input
                    value={newMeta}
                    onChange={(e) => setNewMeta(e.target.value)}
                    placeholder="Ex: 2L"
                    className="w-full bg-void border border-white/5 rounded-lg px-4 py-2.5 text-sm text-ink outline-none focus:border-[#F26A1B]/50 transition-colors"
                  />
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving || !newNome.trim()}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-[#F26A1B] text-ink rounded-lg font-semibold text-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Salvar hábito'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {habitos.map((h) => {
          const registros = h.registros || [];
          
          return (
            <div key={h.id} className="bg-surface border border-white/5 rounded-xl p-4 flex items-center justify-between group hover:border-white/10 transition-all">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-[#1A1A1D] border border-white/5 flex items-center justify-center shrink-0">
                  {renderHabitoIcon(h.icone || '⚡')}
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm text-ink truncate">{h.nome}</h4>
                  {h.meta_diaria && (
                    <p className="text-[12px] text-ink-3 mt-0.5 num">Meta: {h.meta_diaria}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <AdherenceMiniChart registros={registros} />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {!isReadOnly && (
                  <button
                    onClick={() => handleDesativar(h.id)}
                    className="p-2 text-ink-3 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {habitos.length === 0 && !showAddForm && (
          <div className="col-span-full py-12 bg-void/30 rounded-xl border border-dashed border-white/5 flex flex-col items-center justify-center">
            <Sparkles className="w-10 h-10 text-ink-3 opacity-20 mb-3" />
            <p className="text-xs text-ink-3">Nenhum hábito atribuído a este aluno.</p>
          </div>
        )}
      </div>
    </div>
  );
}
