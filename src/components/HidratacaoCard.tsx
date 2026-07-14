import React, { useState, useEffect } from 'react';
import { 
  Droplets, Plus, Settings, Bell, 
  CheckCircle2, TrendingUp, Loader2,
  Trash2, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService } from '../lib/supabase';
import { RegistroHidratacao } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface HidratacaoCardProps {
  alunoId: string;
}

export default function HidratacaoCard({ alunoId }: HidratacaoCardProps) {
  const [loading, setLoading] = useState(true);
  const [consumido, setConsumido] = useState(0);
  const [historico, setHistorico] = useState<{ data: string; total: number }[]>([]);
  const [meta, setMeta] = useState(2000); // Meta padrão
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  useEffect(() => {
    loadData();
  }, [alunoId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [regsRes, histRes, metaRes] = await Promise.all([
        dbService.getHidratacaoHoje(alunoId, today),
        dbService.getHistoricoHidratacao(alunoId),
        dbService.getMetaHidratacao(alunoId)
      ]);
      
      const con = Number(regsRes.data?.ml) || 0;
      setConsumido(con);
      
      const formattedHistory = (histRes.data || []).map((row: any) => ({
        data: row.data,
        total: Number(row.ml) || 0
      }));
      setHistorico(formattedHistory);
      
      // Meta prescrita pelo personal (vem do banco ou default 2000)
      setMeta(Number(metaRes.data) || 2000);
    } catch (err) {
      console.error("Erro ao carregar dados de hidratação:", err);
    } finally {
      setLoading(false);
    }
  };

  const percent = meta > 0 ? Math.min(100, Math.round((consumido / meta) * 100)) : 0;

  const handleAddWater = async (incremento: number) => {
    setSaving(true);
    try {
      const novoTotal = consumido + incremento;
      const { error } = await dbService.saveRegistroHidratacao({
        aluno_id: alunoId,
        ml: novoTotal,
        data: today
      });
      
      if (!error) {
        setConsumido(novoTotal);
        if (novoTotal >= meta && consumido < meta) {
          setCelebrate(true);
          setTimeout(() => setCelebrate(false), 3000);
        }
        
        // Recarregar histórico
        const histRes = await dbService.getHistoricoHidratacao(alunoId);
        const formattedHistory = (histRes.data || []).map((row: any) => ({
          data: row.data,
          total: Number(row.ml) || 0
        }));
        setHistorico(formattedHistory);
      }
    } catch (err) {
      console.error("Erro ao salvar registro de hidratação:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMeta = async () => {
    setSaving(true);
    try {
      const valor = Number(meta) || 2000;
      await dbService.setMetaHidratacao(alunoId, valor);
      setShowSettings(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      alert("Este navegador não suporta notificações.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      alert("Notificações ativadas! Lembrete simulado a cada 2 horas.");
    }
  };

  if (loading) {
    return (
      <div className="bg-surface-2 border border-white/5 rounded-[32px] p-8 flex justify-center">
        <Loader2 className="w-6 h-6 text-violet animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-surface-2 border border-white/5 rounded-[40px] p-8 relative overflow-hidden shadow-2xl">
        {/* Background glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-violet/5 blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-display font-bold text-lg text-ink flex items-center gap-2">
                <Droplets className="w-5 h-5 text-violet" />
                Hidratação
              </h3>
              <p className="text-[10px] font-mono text-ink-3 uppercase tracking-widest">Acompanhamento Diário</p>
            </div>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-ink-3 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-12">
            {/* VIRTUAL BOTTLE / CUP */}
            <div className="relative w-32 h-56 bg-void/50 border-4 border-white/10 rounded-[32px] overflow-hidden group">
              {/* Water Layer */}
              <motion.div 
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-violet via-blue-500 to-blue-400"
                initial={{ height: 0 }}
                animate={{ height: `${percent}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              >
                {/* Wave animation effect */}
                <div className="absolute -top-4 left-0 right-0 h-4 bg-white/20 animate-pulse blur-sm" />
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/10" />
              </motion.div>

              {/* Progress Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-mono font-black text-ink drop-shadow-lg">
                  {Math.round(percent)}%
                </span>
              </div>
            </div>

            <div className="flex-1 w-full space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-3xl font-mono font-black text-ink tracking-tighter">
                    {consumido} <span className="text-sm font-normal text-ink-3">/ {meta} ml</span>
                  </span>
                  <span className="text-sm font-mono text-ink-3">{percent}%</span>
                </div>
                <div className="h-1.5 bg-void rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    className="h-full bg-gradient-to-r from-violet to-blue-500 rounded-full"
                  />
                </div>
              </div>

              {/* QUICK ACTIONS */}
              <div className="grid grid-cols-3 gap-3">
                {[250, 500, 750].map((ml) => (
                  <button
                    key={ml}
                    onClick={() => handleAddWater(ml)}
                    disabled={saving}
                    className="group relative bg-surface-3 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-violet/10 hover:border-violet/30 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4 text-violet group-hover:scale-125 transition-transform" />
                    <span className="text-[10px] font-mono font-bold text-ink">{ml}ml</span>
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-violet rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>

              <button
                onClick={requestNotificationPermission}
                className="w-full py-3 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-bold text-ink-3 hover:text-violet hover:bg-violet/5 transition-all flex items-center justify-center gap-2"
              >
                <Bell className="w-3.5 h-3.5" /> LEMBRETES DE HIDRATAÇÃO
              </button>
            </div>
          </div>
        </div>

        {/* Celebration Overlay */}
        <AnimatePresence>
          {celebrate && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 bg-violet/20 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 bg-ink rounded-full flex items-center justify-center mb-4"
              >
                <CheckCircle2 className="w-12 h-12 text-violet" />
              </motion.div>
              <h4 className="text-2xl font-display font-black text-ink italic uppercase tracking-tighter">Meta Atingida!</h4>
              <p className="text-xs text-ink-2 font-mono mt-1 uppercase tracking-widest">Seu corpo agradece o cuidado</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SETTINGS DRAWER-LIKE */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-8 pt-8 border-t border-white/5 overflow-hidden"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-display font-bold text-ink uppercase tracking-widest">Ajustar Meta Diária</span>
                  <button onClick={() => setShowSettings(false)} className="text-ink-3 hover:text-ink">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-4">
                  <input 
                    type="range"
                    min="1000"
                    max="5000"
                    step="100"
                    value={meta}
                    onChange={(e) => setMeta(Number(e.target.value))}
                    className="flex-1 accent-violet"
                  />
                  <span className="text-sm font-mono font-bold text-ink w-20 text-right">{meta}ml</span>
                </div>
                <button 
                  onClick={handleSaveMeta}
                  className="w-full py-3 bg-violet text-void rounded-2xl font-bold text-[10px] uppercase tracking-widest"
                >
                  Confirmar Nova Meta
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* WEEKLY TREND */}
      <div className="bg-surface-2 border border-white/5 rounded-[32px] p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h4 className="font-display font-bold text-ink text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet" />
            Consumo Últimos 7 dias
          </h4>
        </div>

        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={historico}>
              <XAxis 
                dataKey="data" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#666', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                tickFormatter={(val) => val.split('-')[2]}
              />
              <YAxis hide />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }}
                itemStyle={{ color: '#8B5CF6', fontSize: '10px', fontFamily: 'JetBrains Mono' }}
                labelStyle={{ display: 'none' }}
                formatter={(val: number) => [`${val} ml`, 'Água']}
              />
              <Bar 
                dataKey="total" 
                radius={[6, 6, 0, 0]}
                barSize={20}
              >
                {historico.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.total >= meta ? '#8B5CF6' : '#222'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
