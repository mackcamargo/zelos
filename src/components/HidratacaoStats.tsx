import React, { useState, useEffect } from 'react';
import { Droplets, Loader2, Target, Check } from 'lucide-react';
import { dbService } from '../lib/supabase';

interface HidratacaoStatsProps {
  alunoId: string;
}

export default function HidratacaoStats({ alunoId }: HidratacaoStatsProps) {
  const [loading, setLoading] = useState(true);
  const [average, setAverage] = useState(0);
  const [meta, setMeta] = useState<number | string>(2000);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, [alunoId]);

  const loadStats = async () => {
    setLoading(true);
    setErro(null);
    try {
      const { data } = await dbService.getHistoricoHidratacao(alunoId);
      if (data && data.length > 0) {
        const sum = data.reduce((acc: number, curr: any) => acc + (Number(curr.ml) || 0), 0);
        setAverage(Math.round(sum / data.length));
      } else {
        setAverage(0);
      }
      const { data: metaData } = await dbService.getMetaHidratacao(alunoId);
      setMeta(Number(metaData) || 2000);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarMeta = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setErro(null);
    
    const parsedValue = Number(meta);
    const valor = Math.floor(parsedValue);
    
    if (isNaN(valor) || valor < 500 || valor > 8000) {
      setErro("A meta deve ser entre 500 e 8000 ml.");
      return;
    }
    
    setMeta(valor); // Limpa zeros à esquerda e decimais na tela
    setSalvando(true);
    setSalvo(false);
    
    try {
      const { error } = await dbService.setMetaHidratacao(alunoId, valor);
      if (!error) {
        setSalvo(true);
        setTimeout(() => setSalvo(false), 3000);
      } else {
        console.error('Erro ao salvar meta de hidratação:', error);
        setErro(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`);
      }
    } catch (err: any) {
      console.error('Erro inesperado ao salvar meta:', err);
      setErro(`Erro: ${err?.message || 'Erro de conexão ao salvar'}`);
    } finally {
      setSalvando(false);
    }
  };

  if (loading) return <Loader2 className="w-4 h-4 text-violet animate-spin" />;

  return (
    <div className="space-y-4">
      {/* Média semanal */}
      <div className="flex items-center gap-4 bg-void/50 p-4 rounded-2xl border border-white/5">
        <div className="p-3 bg-violet/10 rounded-xl">
          <Droplets className="w-5 h-5 text-violet" />
        </div>
        <div>
          <p className="text-[12px] text-ink-3">Média semanal</p>
          <p className="text-[20px] font-semibold text-ink num">
            {average.toLocaleString()} <span className="text-[14px] font-normal">ml/dia</span>
          </p>
        </div>
      </div>

      {/* Prescrição da meta diária */}
      <div className="bg-void/50 p-4 rounded-2xl border border-white/5 space-y-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-flame" />
          <p className="text-[12px] text-ink-3">Meta diária prescrita</p>
        </div>
        <form onSubmit={handleSalvarMeta} className="flex items-center gap-2">
          <input
            type="number"
            value={meta}
            onChange={(e) => {
              setErro(null);
              const val = e.target.value;
              setMeta(val === '' ? '' : Number(val));
            }}
            step={250}
            min={500}
            max={8000}
            className="flex-1 bg-void border border-white/10 rounded-xl px-4 py-2.5 text-ink text-sm focus:outline-none focus:border-flame/50 num"
            placeholder="Ex: 3000"
          />
          <span className="text-xs text-ink-3 mr-2 num">ml</span>
          <button
            type="submit"
            onClick={handleSalvarMeta}
            disabled={salvando}
            className={`p-2.5 text-white rounded-xl transition-colors flex items-center justify-center min-w-[40px] ${
              salvo 
                ? 'bg-emerald-600 hover:bg-emerald-700' 
                : 'bg-violet hover:bg-violet/80'
            } disabled:opacity-50`}
            title="Salvar Meta"
          >
            {salvando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : salvo ? (
              <Check className="w-4 h-4 text-white" />
            ) : (
              <Check className="w-4 h-4" />
            )}
          </button>
        </form>
        {erro && (
          <p className="text-[12px] text-red-500 mt-1">{erro}</p>
        )}
        {salvo && (
          <p className="text-[12px] text-emerald-400 mt-1">✓ Meta salva com sucesso!</p>
        )}
      </div>
    </div>
  );
}
