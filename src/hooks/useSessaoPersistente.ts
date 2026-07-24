import { useCallback, useRef } from 'react';
import { dbService } from '../lib/supabase';

const KEYS = {
  ULTIMA_ROTA: 'zelos:ultima_rota',
  SESSAO_TREINO: 'zelos:sessao_treino',
  SESSAO_TS: 'zelos:sessao_ts',
  USER_ID: 'zelos:sessao_user_id',
};

const EXPIRATION_HOURS = 6;

export interface SessaoContexto {
  tipo: 'navegacao' | 'treino_guiado';
  activeTab?: string;
  treino_id?: string;
  aluno_id?: string;
  exercicio_index?: number;
  serie_index?: number;
  series_estado?: Array<{
    exercicio_id: string;
    serie_numero: number;
    reps: string;
    carga: number | null;
    concluida: boolean;
  }>;
  iniciado_em?: string;
  cronometro_segundos?: number;
}

export interface SessaoAtiva {
  rota: string;
  contexto: SessaoContexto;
  ts: number;
}

export function useSessaoPersistente() {
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const limparSessao = useCallback(async (userId: string) => {
    try {
      localStorage.removeItem(KEYS.ULTIMA_ROTA);
      localStorage.removeItem(KEYS.SESSAO_TREINO);
      localStorage.removeItem(KEYS.SESSAO_TS);
      localStorage.removeItem(KEYS.USER_ID);
      
      if (userId) {
        await dbService.deleteSessaoAtiva(userId);
      }
    } catch (e) {
      console.error('Erro ao limpar sessão:', e);
    }
  }, []);

  const salvarSessao = useCallback((userId: string, rota: string, contexto: SessaoContexto, imediato = false) => {
    if (!userId) return;

    const ts = Date.now();
    try {
      localStorage.setItem(KEYS.ULTIMA_ROTA, rota);
      localStorage.setItem(KEYS.SESSAO_TREINO, JSON.stringify(contexto));
      localStorage.setItem(KEYS.SESSAO_TS, ts.toString());
      localStorage.setItem(KEYS.USER_ID, userId);
    } catch (e) {
      console.error('Erro ao salvar no localStorage:', e);
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (imediato) {
      dbService.upsertSessaoAtiva(userId, rota, contexto);
    } else {
      debounceTimerRef.current = setTimeout(async () => {
        await dbService.upsertSessaoAtiva(userId, rota, contexto);
      }, 3000);
    }
  }, []);

  const carregarSessao = useCallback(async (userId: string): Promise<SessaoAtiva | null> => {
    if (!userId) return null;

    try {
      // 1. Tentar localStorage primeiro
      const savedUserId = localStorage.getItem(KEYS.USER_ID);
      const rota = localStorage.getItem(KEYS.ULTIMA_ROTA);
      const contextoStr = localStorage.getItem(KEYS.SESSAO_TREINO);
      const tsStr = localStorage.getItem(KEYS.SESSAO_TS);

      // Verificar se o usuário é o mesmo
      if (savedUserId && savedUserId !== userId) {
        await limparSessao(userId);
      } else if (rota && contextoStr && tsStr) {
        const ts = parseInt(tsStr, 10);
        const agora = Date.now();
        const horasPassadas = (agora - ts) / (1000 * 60 * 60);

        if (horasPassadas < EXPIRATION_HOURS) {
          return { rota, contexto: JSON.parse(contextoStr), ts };
        } else {
          await limparSessao(userId);
          return null;
        }
      }

      // 2. Se não houver no localStorage, tentar Supabase
      const { data, error } = await dbService.getSessaoAtiva(userId);
      if (data && !error) {
        const ts = new Date(data.atualizado_em).getTime();
        const agora = Date.now();
        const horasPassadas = (agora - ts) / (1000 * 60 * 60);

        if (horasPassadas < EXPIRATION_HOURS) {
          // Sincronizar localStorage
          localStorage.setItem(KEYS.ULTIMA_ROTA, data.rota);
          localStorage.setItem(KEYS.SESSAO_TREINO, JSON.stringify(data.contexto));
          localStorage.setItem(KEYS.SESSAO_TS, ts.toString());
          localStorage.setItem(KEYS.USER_ID, userId);
          
          return { rota: data.rota, contexto: data.contexto, ts };
        } else {
          await dbService.deleteSessaoAtiva(userId);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar sessão:', e);
    }

    return null;
  }, [limparSessao]);

  return { salvarSessao, carregarSessao, limparSessao };
}
