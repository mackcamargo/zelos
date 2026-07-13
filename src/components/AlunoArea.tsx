import React, { useState, useEffect } from 'react';
import { dbService, isSupabaseConfigured } from '../lib/supabase';
import { Profile, Exercicio } from '../types';
import { 
  Dumbbell, TrendingUp, User, LogOut, Calendar, Target, 
  ShieldCheck, Heart, ArrowLeft, CheckCircle, Play, Sparkles, 
  ChevronRight, Check, Award, Flame, RefreshCw, Star,
  Scale, Plus, ChevronDown, Activity, TrendingDown, Camera, Utensils, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, 
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import CheckinForm from './CheckinForm';
import HabitosPainel from './HabitosPainel';
import GamificationProvider, { useGamification } from './GamificationTracker';
import GamificationDisplay from './GamificationDisplay';
import FotoProgressoUpload from './FotoProgressoUpload';
import FotoProgressoGaleria from './FotoProgressoGaleria';
import NutricaoPainel from './NutricaoPainel';
import BemEstarPainel from './BemEstarPainel';
import FeedConteudo from './FeedConteudo';
import AgendamentoPainel from './AgendamentoPainel';
import { RelatorioBemEstar } from './RelatorioBemEstar';
import { Checkin } from '../types';

interface AlunoAreaProps {
  userId: string;
  userEmail: string;
  profile: Profile;
  onLogout: () => void;
  isDemoMode: boolean;
}

type TabType = 'treino' | 'progresso' | 'perfil' | 'nutricao' | 'bemestar' | 'aprender' | 'agenda';

export default function AlunoArea(props: AlunoAreaProps) {
  return (
    <GamificationProvider alunoId={props.userId}>
      <AlunoAreaContent {...props} />
    </GamificationProvider>
  );
}

const getStartOfWeek = (d: Date = new Date()) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff)).toISOString().split('T')[0];
};

function AlunoAreaContent({ userId, userEmail, profile, onLogout, isDemoMode }: AlunoAreaProps) {
  const [activeTab, setActiveTab] = useState<TabType>('treino');
  const { streak, checkPR, checkAchievements } = useGamification();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingWorkoutDetails, setLoadingWorkoutDetails] = useState(false);

  // Selected state for active workout & exercise detail
  const [selectedWorkout, setSelectedWorkout] = useState<any | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<any | null>(null);

  // Series-by-series tracking states
  const [completedSeries, setCompletedSeries] = useState<Record<string, boolean>>({});
  const [customReps, setCustomReps] = useState<Record<string, number>>({});
  const [customCargas, setCustomCargas] = useState<Record<string, number>>({});
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [personalName, setPersonalName] = useState<string>('Seu Personal');
  const [personalId, setPersonalId] = useState<string | null>(null);
  const [personalAvatar, setPersonalAvatar] = useState<string | null>(null);

  const [showCelebration, setShowCelebration] = useState(false);
  const [objetivo, setObjetivo] = useState<string | null>(null);

  const [showCheckinForm, setShowCheckinForm] = useState(false);
  const [checkinDaSemana, setCheckinDaSemana] = useState<Checkin | null>(null);
  const [showFotoUpload, setShowFotoUpload] = useState(false);
  const [fotoRefreshTrigger, setFotoRefreshTrigger] = useState(0);

  const fetchCheckinDaSemana = async () => {
    const semana = getStartOfWeek();
    const { data } = await dbService.getCheckinDaSemana(userId, semana);
    setCheckinDaSemana(data);
  };

  useEffect(() => {
    fetchCheckinDaSemana();
  }, [userId]);

  // States for student progress dashboard
  const [detailedSeries, setDetailedSeries] = useState<any[]>([]);
  const [metricas, setMetricas] = useState<any[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [selectedExIdProgress, setSelectedExIdProgress] = useState<string | null>(null);
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});
  
  // Modal states for manual metrics registration
  const [showAddMetricaModal, setShowAddMetricaModal] = useState(false);
  const [newMetricaTipo, setNewMetricaTipo] = useState<string>('peso');
  const [newMetricaValor, setNewMetricaValor] = useState<string>('');
  const [newMetricaError, setNewMetricaError] = useState<string>('');
  const [savingMetrica, setSavingMetrica] = useState(false);

  // Fetch / Seed progress data
  const loadProgressData = async () => {
    setLoadingProgress(true);
    try {
      // 1. Fetch detailed completed series from DB/mock
      let { data: seriesData, error: seriesError } = await dbService.getSeriesRealizadasDetalhadas(userId);
      
      // 2. Fetch body metrics
      let { data: metricsData, error: metricsError } = await dbService.getMetricas(userId);

      // Seed mock data if in demo mode or Supabase is unconfigured, and we have no historical stats
      if (!isSupabaseConfigured || isDemoMode) {
        // Seed Metrics if completely empty
        if (!metricsData || metricsData.length === 0) {
          const now = new Date();
          const seedMetricas = [
            { id: 'm-p-1', aluno_id: userId, personal_id: null, tipo: 'peso', valor: 74.2, unidade: 'kg', registrado_em: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'm-p-2', aluno_id: userId, personal_id: null, tipo: 'peso', valor: 73.5, unidade: 'kg', registrado_em: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'm-p-3', aluno_id: userId, personal_id: null, tipo: 'peso', valor: 72.9, unidade: 'kg', registrado_em: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'm-p-4', aluno_id: userId, personal_id: null, tipo: 'peso', valor: 72.6, unidade: 'kg', registrado_em: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'm-p-5', aluno_id: userId, personal_id: null, tipo: 'peso', valor: 72.4, unidade: 'kg', registrado_em: now.toISOString() },

            { id: 'm-g-1', aluno_id: userId, personal_id: null, tipo: 'gordura_pct', valor: 18.5, unidade: '%', registrado_em: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'm-g-2', aluno_id: userId, personal_id: null, tipo: 'gordura_pct', valor: 17.8, unidade: '%', registrado_em: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'm-g-3', aluno_id: userId, personal_id: null, tipo: 'gordura_pct', valor: 17.2, unidade: '%', registrado_em: now.toISOString() },

            { id: 'm-b-1', aluno_id: userId, personal_id: null, tipo: 'braço', valor: 34.5, unidade: 'cm', registrado_em: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'm-b-2', aluno_id: userId, personal_id: null, tipo: 'braço', valor: 35.2, unidade: 'cm', registrado_em: now.toISOString() },

            { id: 'm-c-1', aluno_id: userId, personal_id: null, tipo: 'cintura', valor: 84.0, unidade: 'cm', registrado_em: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'm-c-2', aluno_id: userId, personal_id: null, tipo: 'cintura', valor: 81.5, unidade: 'cm', registrado_em: now.toISOString() }
          ];

          localStorage.setItem('zenite_metricas', JSON.stringify(seedMetricas));
          metricsData = seedMetricas;
        }

        // Seed series execution history if completely empty
        if (!seriesData || seriesData.length === 0) {
          const now = new Date();
          const dates = [
            new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            now.toISOString().split('T')[0]
          ];

          const seedSeries = [
            // Week 1 (21 days ago) - Supino Reto (60kg), Agachamento (80kg)
            { id: 'sr-s1-1', treino_exercicio_id: 'te-sup-1', aluno_id: userId, numero_serie: 1, carga_kg: 60, repeticoes: 10, concluida: true, concluida_em: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'sr-s1-2', treino_exercicio_id: 'te-sup-1', aluno_id: userId, numero_serie: 2, carga_kg: 60, repeticoes: 10, concluida: true, concluida_em: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'sr-s1-3', treino_exercicio_id: 'te-sup-1', aluno_id: userId, numero_serie: 3, carga_kg: 65, repeticoes: 8, concluida: true, concluida_em: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'sr-a1-1', treino_exercicio_id: 'te-aga-1', aluno_id: userId, numero_serie: 1, carga_kg: 80, repeticoes: 10, concluida: true, concluida_em: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'sr-a1-2', treino_exercicio_id: 'te-aga-1', aluno_id: userId, numero_serie: 2, carga_kg: 80, repeticoes: 10, concluida: true, concluida_em: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'sr-a1-3', treino_exercicio_id: 'te-aga-1', aluno_id: userId, numero_serie: 3, carga_kg: 85, repeticoes: 8, concluida: true, concluida_em: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString() },

            // Week 2 (14 days ago) - Supino (62kg), Agachamento (85kg)
            { id: 'sr-s2-1', treino_exercicio_id: 'te-sup-2', aluno_id: userId, numero_serie: 1, carga_kg: 62, repeticoes: 10, concluida: true, concluida_em: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'sr-s2-2', treino_exercicio_id: 'te-sup-2', aluno_id: userId, numero_serie: 2, carga_kg: 62, repeticoes: 10, concluida: true, concluida_em: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'sr-s2-3', treino_exercicio_id: 'te-sup-2', aluno_id: userId, numero_serie: 3, carga_kg: 68, repeticoes: 8, concluida: true, concluida_em: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'sr-a2-1', treino_exercicio_id: 'te-aga-2', aluno_id: userId, numero_serie: 1, carga_kg: 85, repeticoes: 10, concluida: true, concluida_em: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'sr-a2-2', treino_exercicio_id: 'te-aga-2', aluno_id: userId, numero_serie: 2, carga_kg: 85, repeticoes: 10, concluida: true, concluida_em: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'sr-a2-3', treino_exercicio_id: 'te-aga-2', aluno_id: userId, numero_serie: 3, carga_kg: 90, repeticoes: 8, concluida: true, concluida_em: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString() },

            // Week 3 (7 days ago) - Supino (65kg), Agachamento (90kg)
            { id: 'sr-s3-1', treino_exercicio_id: 'te-sup-3', aluno_id: userId, numero_serie: 1, carga_kg: 65, repeticoes: 10, concluida: true, concluida_em: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'sr-s3-2', treino_exercicio_id: 'te-sup-3', aluno_id: userId, numero_serie: 2, carga_kg: 65, repeticoes: 10, concluida: true, concluida_em: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'sr-s3-3', treino_exercicio_id: 'te-sup-3', aluno_id: userId, numero_serie: 3, carga_kg: 70, repeticoes: 8, concluida: true, concluida_em: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'sr-a3-1', treino_exercicio_id: 'te-aga-3', aluno_id: userId, numero_serie: 1, carga_kg: 90, repeticoes: 10, concluida: true, concluida_em: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'sr-a3-2', treino_exercicio_id: 'te-aga-3', aluno_id: userId, numero_serie: 2, carga_kg: 90, repeticoes: 10, concluida: true, concluida_em: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'sr-a3-3', treino_exercicio_id: 'te-aga-3', aluno_id: userId, numero_serie: 3, carga_kg: 95, repeticoes: 8, concluida: true, concluida_em: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString() },

            // Today - Supino (68kg), Agachamento (102.5kg PR)
            { id: 'sr-s4-1', treino_exercicio_id: 'te-sup-4', aluno_id: userId, numero_serie: 1, carga_kg: 68, repeticoes: 10, concluida: true, concluida_em: now.toISOString() },
            { id: 'sr-s4-2', treino_exercicio_id: 'te-sup-4', aluno_id: userId, numero_serie: 2, carga_kg: 68, repeticoes: 10, concluida: true, concluida_em: now.toISOString() },
            { id: 'sr-s4-3', treino_exercicio_id: 'te-sup-4', aluno_id: userId, numero_serie: 3, carga_kg: 75, repeticoes: 8, concluida: true, concluida_em: now.toISOString() },
            { id: 'sr-a4-1', treino_exercicio_id: 'te-aga-4', aluno_id: userId, numero_serie: 1, carga_kg: 95, repeticoes: 10, concluida: true, concluida_em: now.toISOString() },
            { id: 'sr-a4-2', treino_exercicio_id: 'te-aga-4', aluno_id: userId, numero_serie: 2, carga_kg: 95, repeticoes: 10, concluida: true, concluida_em: now.toISOString() },
            { id: 'sr-a4-3', treino_exercicio_id: 'te-aga-4', aluno_id: userId, numero_serie: 3, carga_kg: 102.5, repeticoes: 6, concluida: true, concluida_em: now.toISOString() }
          ];

          localStorage.setItem('zenite_series_realizadas', JSON.stringify(seedSeries));

          // Set up mock workouts to bind correctly
          const mockTreinos = [
            { id: 'w-past-1', aluno_id: userId, personal_id: 'personal-1', titulo: 'Treino A - Ativação', data_treino: dates[0], status: 'concluido', criado_em: dates[0] },
            { id: 'w-past-2', aluno_id: userId, personal_id: 'personal-1', titulo: 'Treino A - Ativação', data_treino: dates[1], status: 'concluido', criado_em: dates[1] },
            { id: 'w-past-3', aluno_id: userId, personal_id: 'personal-1', titulo: 'Treino A - Ativação', data_treino: dates[2], status: 'concluido', criado_em: dates[2] },
            { id: 'w-past-4', aluno_id: userId, personal_id: 'personal-1', titulo: 'Treino A - Ativação', data_treino: dates[3], status: 'concluido', criado_em: dates[3] }
          ];

          const mockTreinoExs = [
            { id: 'te-sup-1', treino_id: 'w-past-1', exercicio_id: 'ex-supino', ordem: 1, series: 3, repeticoes: '10', carga_kg: 60 },
            { id: 'te-aga-1', treino_id: 'w-past-1', exercicio_id: 'ex-agachamento', ordem: 2, series: 3, repeticoes: '10', carga_kg: 80 },

            { id: 'te-sup-2', treino_id: 'w-past-2', exercicio_id: 'ex-supino', ordem: 1, series: 3, repeticoes: '10', carga_kg: 62 },
            { id: 'te-aga-2', treino_id: 'w-past-2', exercicio_id: 'ex-agachamento', ordem: 2, series: 3, repeticoes: '10', carga_kg: 85 },

            { id: 'te-sup-3', treino_id: 'w-past-3', exercicio_id: 'ex-supino', ordem: 1, series: 3, repeticoes: '10', carga_kg: 65 },
            { id: 'te-aga-3', treino_id: 'w-past-3', exercicio_id: 'ex-agachamento', ordem: 2, series: 3, repeticoes: '10', carga_kg: 90 },

            { id: 'te-sup-4', treino_id: 'w-past-4', exercicio_id: 'ex-supino', ordem: 1, series: 3, repeticoes: '10', carga_kg: 68 },
            { id: 'te-aga-4', treino_id: 'w-past-4', exercicio_id: 'ex-agachamento', ordem: 2, series: 3, repeticoes: '10', carga_kg: 95 }
          ];

          const curTreinos = JSON.parse(localStorage.getItem('zenite_mock_treinos') || '[]');
          const curTreinoExs = JSON.parse(localStorage.getItem('zenite_mock_treino_exercicios') || '[]');

          mockTreinos.forEach(t => { if (!curTreinos.some((ct: any) => ct.id === t.id)) curTreinos.push(t); });
          mockTreinoExs.forEach(te => { if (!curTreinoExs.some((cte: any) => cte.id === te.id)) curTreinoExs.push(te); });

          localStorage.setItem('zenite_mock_treinos', JSON.stringify(curTreinos));
          localStorage.setItem('zenite_mock_treino_exercicios', JSON.stringify(curTreinoExs));

          // Reload with seed details
          const { data: reloadedSeries } = await dbService.getSeriesRealizadasDetalhadas(userId);
          seriesData = reloadedSeries;
        }
      }

      setDetailedSeries(seriesData || []);
      setMetricas(metricsData || []);
    } catch (err) {
      console.error('Erro ao carregar dados de progresso:', err);
    } finally {
      setLoadingProgress(false);
    }
  };

  // Add metrics registration handler
  const handleAddMetricaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewMetricaError('');

    const val = parseFloat(newMetricaValor);
    if (isNaN(val) || val <= 0) {
      setNewMetricaError('Insira um valor numérico válido maior que zero.');
      return;
    }

    setSavingMetrica(true);
    try {
      let unit = 'cm';
      if (newMetricaTipo === 'peso') unit = 'kg';
      else if (newMetricaTipo === 'gordura_pct') unit = '%';

      // Find personal ID to associate if any workout exists
      const pId = workouts[0]?.personal_id || null;

      const { error } = await dbService.salvarMetrica({
        aluno_id: userId,
        personal_id: pId,
        tipo: newMetricaTipo,
        valor: val,
        unidade: unit,
        registrado_em: new Date().toISOString()
      });

      if (error) {
        setNewMetricaError('Falha ao salvar métrica no banco de dados.');
      } else {
        // Success
        setNewMetricaValor('');
        setShowAddMetricaModal(false);
        await loadProgressData();
      }
    } catch (err) {
      console.error(err);
      setNewMetricaError('Erro inesperado ao registrar medida.');
    } finally {
      setSavingMetrica(false);
    }
  };

  // Trigger loading progress data when activeTab transitions to 'progresso'
  useEffect(() => {
    if (activeTab === 'progresso') {
      loadProgressData();
    }
  }, [activeTab, userId]);

  const isFemale = profile.avatar_tipo === 'feminino';

  // Resolve signed URLs for AlunoArea exercises (selectedWorkout & selectedExercise)
  useEffect(() => {
    const fetchSignedUrls = async () => {
      const pathsToFetch: string[] = [];
      const exercisesToProcess: any[] = [];

      if (selectedWorkout?.exercicios) {
        selectedWorkout.exercicios.forEach((item: any) => {
          if (item.exercicio) {
            exercisesToProcess.push(item.exercicio);
          }
        });
      }
      if (selectedExercise) {
        exercisesToProcess.push(selectedExercise);
      }

      exercisesToProcess.forEach((ex) => {
        const path = isFemale 
          ? (ex.video_url_fem || ex.video_url_masc) 
          : (ex.video_url_masc || ex.video_url_fem);
        if (path && !pathsToFetch.includes(path)) {
          pathsToFetch.push(path);
        }
      });

      if (pathsToFetch.length === 0) return;

      try {
        const promises = pathsToFetch.map(async (path) => {
          const signedUrl = await dbService.getSignedUrl(path);
          return { path, url: signedUrl };
        });

        const results = await Promise.all(promises);
        const newMap = { ...videoUrls };
        results.forEach(({ path, url }) => {
          if (url) {
            newMap[path] = url;
          }
        });
        setVideoUrls(newMap);
      } catch (err) {
        console.error('Erro ao buscar signed URLs para aluno:', err);
      }
    };

    fetchSignedUrls();
  }, [selectedWorkout, selectedExercise, isFemale]);

  // Load published workouts on mount / tab change & set up Realtime subscription
  useEffect(() => {
    loadStudentWorkouts();
    
    const loadObjetivo = async () => {
      try {
        const { objetivo: obj } = await dbService.getAlunoObjetivo(userId);
        setObjetivo(obj);
      } catch (err) {
        console.error(err);
      }
    };
    loadObjetivo();
  }, [userId]);

  const loadStudentWorkouts = async () => {
    setLoading(true);
    try {
      const { data, error } = await dbService.getTreinosParaAluno(userId);
      if (error) {
        console.error('Erro ao carregar treinos:', error);
      } else if (data && data.length > 0) {
        setWorkouts(data);
        
        // Find today's workout (YYYY-MM-DD) or get the most recent one
        const todayStr = new Date().toISOString().split('T')[0];
        const todayWorkout = data.find((w: any) => w.data_treino === todayStr);
        const workoutToLoad = todayWorkout || data[0]; // de hoje ou o mais recente

        await handleSelectWorkout(workoutToLoad.id);
      } else {
        setWorkouts([]);
        setSelectedWorkout(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWorkout = async (workoutId: string) => {
    setLoadingWorkoutDetails(true);
    try {
      const { data, error } = await dbService.getTreinoCompleto(workoutId);
      if (error) {
        console.error(error);
      } else if (data) {
        setSelectedWorkout(data);

        // Fetch personal profile to display actual name
        if (data.personal_id) {
          setPersonalId(data.personal_id);
          const { data: prof } = await dbService.getProfile(data.personal_id);
          if (prof) {
            setPersonalName(prof.nome);
            setPersonalAvatar(prof.avatar_url);
          }
        }

        // Fetch series execution progress from database
        const { data: seriesRealizadas, error: srError } = await dbService.getSeriesRealizadas(userId);
        if (!srError && seriesRealizadas) {
          const completionMap: Record<string, boolean> = {};
          const repsMap: Record<string, number> = {};
          const cargaMap: Record<string, number> = {};

          seriesRealizadas.forEach((sr: any) => {
            const key = `${sr.treino_exercicio_id}_${sr.numero_serie}`;
            completionMap[key] = !!sr.concluida;
            repsMap[key] = sr.repeticoes;
            cargaMap[key] = sr.carga_kg ?? 0;
          });

          setCompletedSeries(completionMap);
          setCustomReps(repsMap);
          setCustomCargas(cargaMap);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingWorkoutDetails(false);
    }
  };

  const handleCargaChange = async (sKey: string, val: number, item: any, sNum: number, isDone: boolean) => {
    setCustomCargas(prev => ({ ...prev, [sKey]: val }));
    if (isDone) {
      const realReps = customReps[sKey] !== undefined ? customReps[sKey] : (parseInt(item.repeticoes) || 10);
      await dbService.salvarSerieRealizada({
        treino_exercicio_id: item.id,
        aluno_id: userId,
        numero_serie: sNum,
        carga_kg: val,
        repeticoes: realReps,
        concluida: true,
        concluida_em: new Date().toISOString()
      });
    }
  };

  const handleRepsChange = async (sKey: string, val: number, item: any, sNum: number, isDone: boolean) => {
    setCustomReps(prev => ({ ...prev, [sKey]: val }));
    if (isDone) {
      const realCarga = customCargas[sKey] !== undefined ? customCargas[sKey] : (item.carga_kg || 0);
      await dbService.salvarSerieRealizada({
        treino_exercicio_id: item.id,
        aluno_id: userId,
        numero_serie: sNum,
        carga_kg: realCarga,
        repeticoes: val,
        concluida: true,
        concluida_em: new Date().toISOString()
      });
    }
  };

  const toggleSeriesDone = async (sKey: string, item: any, sNum: number) => {
    const isNowDone = !completedSeries[sKey];
    const updatedCompleted = { ...completedSeries, [sKey]: isNowDone };
    setCompletedSeries(updatedCompleted);

    const realCarga = customCargas[sKey] !== undefined ? customCargas[sKey] : (item.carga_kg || 0);
    const realReps = customReps[sKey] !== undefined ? customReps[sKey] : (parseInt(item.repeticoes) || 10);

    await dbService.salvarSerieRealizada({
      treino_exercicio_id: item.id,
      aluno_id: userId,
      numero_serie: sNum,
      carga_kg: realCarga,
      repeticoes: realReps,
      concluida: isNowDone,
      concluida_em: new Date().toISOString()
    });

    if (isNowDone) {
      // Check for PR
      await checkPR(item.exercicio_id, item.exercicio?.nome || 'Exercício', realCarga);
      
      // Update sets count for achievement
      const setsKey = `zenite_mock_sets_count_${userId}`;
      const count = parseInt(localStorage.getItem(setsKey) || '0') + 1;
      localStorage.setItem(setsKey, count.toString());
      if (count === 100) await checkAchievements('workout');
    }

    if (selectedWorkout) {
      const total = selectedWorkout.exercicios?.reduce((acc: number, item: any) => acc + (Number(item.series) || 0), 0) || 0;
      if (total > 0) {
        let completed = 0;
        selectedWorkout.exercicios?.forEach((item: any) => {
          for (let s = 1; s <= (Number(item.series) || 0); s++) {
            if (updatedCompleted[`${item.id}_${s}`]) {
              completed++;
            }
          }
        });

        if (completed === total) {
          await dbService.updateTreinoStatus(selectedWorkout.id, 'concluido');
          setShowCelebration(true);
          if (userId) {
            await dbService.verificarConquistas(userId);
          }
          await checkAchievements('workout');
          try {
            const finishedCount = Number(localStorage.getItem('zenite_finished_count') || '0') + 1;
            localStorage.setItem('zenite_finished_count', String(finishedCount));
            localStorage.setItem('zenite_last_workout_date', new Date().toISOString().split('T')[0]);
          } catch (e) {
            console.error(e);
          }
        }
      }
    }
  };

  const isExerciseCompleted = (itemId: string, numSeries: number) => {
    if (numSeries <= 0) return false;
    for (let s = 1; s <= numSeries; s++) {
      if (!completedSeries[`${itemId}_${s}`]) return false;
    }
    return true;
  };

  const handleFinishWorkout = async () => {
    if (selectedWorkout) {
      await dbService.updateTreinoStatus(selectedWorkout.id, 'concluido');
      if (userId) {
        await dbService.verificarConquistas(userId);
      }
    }
    setShowCelebration(true);
    try {
      const finishedCount = Number(localStorage.getItem('zenite_finished_count') || '0') + 1;
      localStorage.setItem('zenite_finished_count', String(finishedCount));
      localStorage.setItem('zenite_last_workout_date', new Date().toISOString().split('T')[0]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCloseCelebration = () => {
    setShowCelebration(false);
    setSelectedWorkout(null);
    loadStudentWorkouts();
  };

  // Stats calculation
  const totalCompletedCount = Number(localStorage.getItem('zenite_finished_count') || '3');
  const userStreak = totalCompletedCount > 0 ? 5 : 0; // standard display

  return (
    <div id="aluno-area-root" className="min-h-screen bg-void text-ink font-sans flex flex-col pb-24">
      {/* Top Header */}
      <header className="sticky top-0 bg-void/90 backdrop-blur-md z-40 border-b border-b-white/5 py-5 px-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-2xl tracking-tight">
                ZÊNI<span className="brand-gradient-text">TE</span>
              </span>
              <span className="text-[10px] font-mono uppercase bg-violet/15 text-violet px-2.5 py-0.5 rounded-full border border-violet/20 font-bold">
                Aluno
              </span>
            </div>
            <p className="text-xs text-ink-3 mt-1 font-mono tracking-wider">WORKSPACE · ÁREA DE ATIVAÇÃO</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-ink">{profile.nome}</span>
              <span className="text-[10px] text-ink-2 font-mono">ID: {userId.substring(0, 8)}</span>
            </div>
            <div className="w-10 h-10 rounded-full border border-white/10 p-[1px]">
              <div className="w-full h-full rounded-full bg-surface-3 flex items-center justify-center font-display font-bold text-ink">
                {isFemale ? '👩' : '👨'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 pt-8 pb-32 md:pb-8">
        
        {/* TAB 1: TREINO */}
        {activeTab === 'treino' && (
          <div id="tab-content-treino" className="space-y-6">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1 w-full">
                <HabitosPainel alunoId={userId} onHabitComplete={() => checkAchievements('habit')} />
              </div>
              {streak > 0 && (
                <div className="shrink-0 flex flex-col items-center md:items-end w-full md:w-auto">
                  <div className="flex items-center gap-2 bg-flame/10 px-4 py-2 rounded-2xl border border-flame/20 shadow-[0_0_20px_rgba(245,51,79,0.1)]">
                    <Flame className="w-5 h-5 text-flame animate-pulse" />
                    <span className="text-lg font-mono font-black text-flame">{streak} DIAS DE STREAK</span>
                  </div>
                  <p className="text-[10px] font-mono text-ink-3 uppercase mt-1">Mantenha o ritmo!</p>
                </div>
              )}
            </div>

            {/* WORKOUT LIST (If no active workout is selected) */}
            {!selectedWorkout ? (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display font-bold text-2xl text-ink tracking-tight">Meu Treino de Hoje</h1>
                  <p className="text-sm text-ink-2">Seus treinos, cargas e exercícios personalizados publicados pelo seu Personal.</p>
                </div>

                {loading ? (
                  <div className="flex justify-center py-20">
                    <span className="w-8 h-8 border-2 border-flame border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : workouts.length === 0 ? (
                  <div className="bg-surface rounded-3xl p-12 text-center border border-white/5 flex flex-col justify-center items-center">
                    <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-5 border border-white/5">
                      <Dumbbell className="w-8 h-8 text-ink-3 stroke-1" />
                    </div>
                    <span className="font-display font-medium text-lg text-ink mb-1">Nenhum treino publicado ainda</span>
                    <p className="text-sm text-ink-2 max-w-md mb-6 leading-relaxed">
                      Seu personal trainer ainda não publicou uma planilha de treinos para você. Assim que ele criar e liberar sua rotina, ela aparecerá aqui completa.
                    </p>
                    <div className="text-xs font-mono text-ink-3 bg-void px-4 py-2 rounded-full border border-white/5 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-flame animate-pulse" />
                      <span>Mantenha o foco. O progresso está a caminho!</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {workouts.map((workout) => {
                      const dateFormatted = new Date(workout.data_treino + 'T00:00:00').toLocaleDateString('pt-BR');
                      return (
                        <div
                          key={workout.id}
                          onClick={() => handleSelectWorkout(workout.id)}
                          className="bg-surface border border-white/5 hover:border-white/10 rounded-2xl p-5 cursor-pointer hover:bg-surface-2 transition-all group flex flex-col justify-between h-40 relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-24 h-24 bg-flame/5 blur-2xl pointer-events-none rounded-full" />
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono bg-flame/10 text-flame px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              Planilha Ativa
                            </span>
                            <h3 className="font-display font-bold text-lg text-ink group-hover:text-white transition-colors mt-2 truncate">
                              {workout.titulo}
                            </h3>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-white/5">
                            <span className="text-xs text-ink-3 font-mono flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-violet" />
                              {dateFormatted}
                            </span>
                            <span className="text-xs text-flame font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                              <span>Iniciar</span>
                              <ChevronRight className="w-4 h-4" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (() => {
              const totalWorkoutSeries = selectedWorkout?.exercicios?.reduce((acc: number, item: any) => acc + (Number(item.series) || 0), 0) || 0;
              const completedWorkoutSeries = selectedWorkout?.exercicios?.reduce((acc: number, item: any) => {
                let count = 0;
                for (let s = 1; s <= (Number(item.series) || 0); s++) {
                  if (completedSeries[`${item.id}_${s}`]) {
                    count++;
                  }
                }
                return acc + count;
              }, 0) || 0;
              const progressPercentage = totalWorkoutSeries > 0 ? (completedWorkoutSeries / totalWorkoutSeries) * 100 : 0;

              return (
                // WORKOUT DETAIL VIEW (Active training session)
                <div className="space-y-6">
                  
                  {/* Header detail */}
                  <div className="bg-surface-2 p-5 rounded-2xl border border-white/5 space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-flame/5 blur-3xl pointer-events-none rounded-full" />
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
                      <div className="flex items-center gap-3">
                        {workouts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setSelectedWorkout(null)}
                            className="p-2 bg-void border border-white/5 rounded-xl text-ink-2 hover:text-ink transition-all flex items-center justify-center shrink-0"
                            title="Ver outros treinos"
                          >
                            <ArrowLeft className="w-5 h-5 text-flame" />
                          </button>
                        )}
                        <div>
                          <span className="text-[9px] font-mono uppercase bg-flame/10 text-flame px-2.5 py-0.5 rounded-full font-bold">
                            Executando Treino Ativo
                          </span>
                          <h2 className="font-display font-bold text-xl text-ink mt-1 tracking-tight">
                            {selectedWorkout.titulo}
                          </h2>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-ink-2 font-mono">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-violet" />
                              {new Date(selectedWorkout.data_treino + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </span>
                            <span>·</span>
                            <span className="flex items-center gap-1 text-ink">
                              <User className="w-3.5 h-3.5 text-flame" />
                              {personalName}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {workouts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setSelectedWorkout(null)}
                            className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-surface-3 hover:bg-surface border border-white/5 text-ink-2 hover:text-ink text-xs font-semibold transition-all"
                          >
                            Outros Treinos
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleFinishWorkout}
                          className="w-full sm:w-auto py-2.5 px-5 rounded-xl brand-gradient-bg font-display font-bold text-void text-xs shadow-lg hover:opacity-95 transition-all"
                        >
                          Concluir Treino
                        </button>
                      </div>
                    </div>

                    {/* Barra de progresso do treino */}
                    <div className="space-y-1.5 pt-3 border-t border-white/5 relative z-10">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-ink-3">Progresso de ativação muscular</span>
                        <span className="text-flame font-bold">{completedWorkoutSeries} de {totalWorkoutSeries} séries</span>
                      </div>
                      <div className="w-full h-2.5 bg-void rounded-full overflow-hidden border border-white/5 p-[1px]">
                        <div 
                          className="h-full brand-gradient-bg rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(245,51,79,0.4)]"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Exercises list */}
                  <div className="space-y-3">
                    {selectedWorkout.exercicios?.map((item: any) => {
                      const ex = item.exercicio;
                      const numSeries = Number(item.series) || 0;
                      const isCompleted = isExerciseCompleted(item.id, numSeries);
                      const videoPath = isFemale && ex?.video_url_fem ? ex.video_url_fem : ex?.video_url_masc;
                      const videoSrc = videoPath ? videoUrls[videoPath] : null;
                      const isExpanded = expandedExerciseId === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`bg-surface border transition-all duration-200 rounded-2xl overflow-hidden ${
                            isCompleted 
                              ? 'border-emerald-500/20 bg-emerald-500/[0.02]' 
                              : isExpanded 
                                ? 'border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.3)] bg-surface-2' 
                                : 'border-white/5 hover:border-white/10'
                          }`}
                        >
                          {/* Card Header (Clickable to Expand/Collapse) */}
                          <div
                            onClick={() => setExpandedExerciseId(isExpanded ? null : item.id)}
                            className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Checkbox circle to check completion of the ENTIRE exercise */}
                              <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                isCompleted 
                                  ? 'bg-emerald-500 border-emerald-400 text-void shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                                  : 'border-white/15 bg-void/50'
                              }`}>
                                {isCompleted ? (
                                  <Check className="w-4 h-4 stroke-[3]" />
                                ) : (
                                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                )
                                }
                              </div>

                              {/* Miniatura do vídeo */}
                              <div className="w-12 h-12 rounded-xl bg-void border border-white/5 overflow-hidden flex items-center justify-center shrink-0 relative">
                                {videoSrc ? (
                                  <video
                                    src={videoSrc}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Dumbbell className="w-5 h-5 text-ink-3" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <span className="text-[9px] font-mono text-ink-3 uppercase block tracking-wider">
                                  {ex?.musculo_primario?.[0] || 'Geral'}
                                </span>
                                <h4 className="font-display font-bold text-sm text-ink truncate mt-0.5">
                                  {ex?.nome || 'Exercício'}
                                </h4>
                              </div>
                            </div>

                            {/* Prescrição: séries x repetições e carga */}
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-mono text-xs text-ink-2 bg-void/30 border border-white/5 py-1 px-2.5 rounded-lg">
                                {item.series} × {item.repeticoes} {item.carga_kg ? ` ·  ${item.carga_kg} kg` : ''}
                              </span>
                              <span className={`w-5 h-5 flex items-center justify-center text-ink-3 transition-transform duration-200 ${
                                isExpanded ? 'rotate-90 text-flame' : ''
                              }`}>
                                <ChevronRight className="w-4 h-4" />
                              </span>
                            </div>
                          </div>

                          {/* Expanded Content (9:16 Video + Series Tracking) */}
                          {isExpanded && (
                            <div className="px-4 pb-5 border-t border-white/5 pt-4 bg-void/25 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                
                                {/* 9:16 Vertical video player */}
                                <div className="flex flex-col items-center">
                                  <div className="relative w-full max-w-[180px] aspect-[9/16] bg-void rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                                    {videoSrc ? (
                                      <video
                                        src={videoSrc}
                                        autoPlay
                                        loop
                                        muted
                                        playsInline
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-ink-3">
                                        <Dumbbell className="w-8 h-8 text-ink-3 stroke-1 text-flame animate-pulse" />
                                        <p className="text-[10px] mt-1">Sem vídeo demonstrativo</p>
                                      </div>
                                    )}
                                    <span className="absolute bottom-2 right-2 text-[8px] font-mono bg-void/80 backdrop-blur-md border border-white/10 text-ink-2 px-2 py-0.5 rounded-full select-none flex items-center gap-1">
                                      <span className="w-1 h-1 rounded-full bg-flame animate-pulse" />
                                      <span>9:16 LOOP</span>
                                    </span>
                                  </div>
                                  
                                  {ex?.dicas && ex.dicas.length > 0 && (
                                    <div className="mt-3.5 p-3.5 bg-surface-2 border border-white/5 rounded-xl w-full max-w-[200px]">
                                      <span className="text-[9px] font-mono text-flame uppercase tracking-wider block mb-1 font-bold">Cuidado Técnico</span>
                                      <ul className="text-[10px] text-ink-2 space-y-1 list-disc pl-3">
                                        {ex.dicas.map((dica: string, idx: number) => (
                                          <li key={idx} className="leading-snug">{dica}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>

                                {/* Series register checklist */}
                                <div className="space-y-2.5">
                                  <div className="flex justify-between items-center pb-1.5 border-b border-white/5">
                                    <span className="text-[10px] font-mono text-ink-3 uppercase tracking-wider">Métricas das Séries</span>
                                    <span className="text-[8px] font-mono text-violet bg-violet/10 border border-violet/20 px-2 py-0.5 rounded-full font-bold">INSIRA VALORES REAIS</span>
                                  </div>

                                  {Array.from({ length: numSeries }).map((_, sIdx) => {
                                    const sNum = sIdx + 1;
                                    const sKey = `${item.id}_${sNum}`;
                                    const isDone = !!completedSeries[sKey];

                                    const currentCarga = customCargas[sKey] !== undefined ? customCargas[sKey] : (item.carga_kg || 0);
                                    const currentReps = customReps[sKey] !== undefined ? customReps[sKey] : (parseInt(item.repeticoes) || 10);

                                    return (
                                      <div
                                        key={sKey}
                                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                                          isDone 
                                            ? 'bg-flame/5 border-flame/20 shadow-[0_0_12px_rgba(245,51,79,0.03)]' 
                                            : 'bg-void/40 border-white/5'
                                        }`}
                                      >
                                        <div className="flex flex-col">
                                          <span className="text-xs font-semibold text-ink">Série {sNum}</span>
                                          <span className="text-[9px] text-ink-3 font-mono mt-0.5">
                                            Meta: {item.repeticoes} rps {item.carga_kg ? `· ${item.carga_kg} kg` : ''}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-3">
                                          {/* Inputs for weight and reps */}
                                          <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1">
                                              <input
                                                type="number"
                                                value={currentCarga === 0 ? '' : currentCarga}
                                                placeholder={String(item.carga_kg || 0)}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => {
                                                  const val = parseFloat(e.target.value) || 0;
                                                  handleCargaChange(sKey, val, item, sNum, isDone);
                                                }}
                                                className="w-12 text-center bg-surface-2 border border-white/10 rounded-lg py-1 text-xs font-mono text-ink focus:border-flame/50 focus:outline-none"
                                              />
                                              <span className="text-[9px] text-ink-3 font-mono">kg</span>
                                            </div>

                                            <div className="flex items-center gap-1">
                                              <input
                                                type="number"
                                                value={currentReps === 0 ? '' : currentReps}
                                                placeholder={String(parseInt(item.repeticoes) || 10)}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => {
                                                  const val = parseInt(e.target.value) || 0;
                                                  handleRepsChange(sKey, val, item, sNum, isDone);
                                                }}
                                                className="w-12 text-center bg-surface-2 border border-white/10 rounded-lg py-1 text-xs font-mono text-ink focus:border-flame/50 focus:outline-none"
                                              />
                                              <span className="text-[9px] text-ink-3 font-mono">reps</span>
                                            </div>
                                          </div>

                                          {/* Circle checkbox for series check */}
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleSeriesDone(sKey, item, sNum);
                                            }}
                                            className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                              isDone 
                                                ? 'brand-gradient-bg border-transparent text-void shadow-[0_0_10px_rgba(245,51,79,0.25)]' 
                                                : 'border-white/20 hover:border-white/40 bg-surface-2'
                                            }`}
                                          >
                                            {isDone ? (
                                              <Check className="w-4 h-4 stroke-[3.5]" />
                                            ) : (
                                              <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })()}

          </div>
        )}

        {/* TAB 2: PROGRESSO */}
        {activeTab === 'progresso' && (
          <div id="tab-content-progresso" className="space-y-6">
            {/* Tab Header with Register button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-display font-bold text-2xl text-ink tracking-tight flex items-center gap-2">
                  <span>Meu Progresso</span>
                  <span className="text-xs font-mono bg-flame/15 text-flame px-2 py-0.5 rounded-full border border-flame/20 font-bold uppercase tracking-wider">
                    Performance
                  </span>
                </h1>
                <p className="text-sm text-ink-2 font-sans">Acompanhe seu progresso de força, consistência e métricas corporais.</p>
              </div>
              <button
                id="btn-register-metric"
                onClick={() => {
                  setNewMetricaError('');
                  setNewMetricaValor('');
                  setShowAddMetricaModal(true);
                }}
                className="self-start sm:self-center bg-flame hover:bg-flame-hover text-white font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-lg shadow-flame/20 cursor-pointer transition-colors font-sans border-0 outline-none"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Medida</span>
              </button>
            </div>

            {/* NEW: Weekly Check-in Section */}
            <div className="bg-surface-2 border border-white/10 rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Calendar className="w-24 h-24 rotate-12" />
              </div>
              
              <div className="w-16 h-16 rounded-2xl brand-gradient-bg flex items-center justify-center shrink-0 shadow-lg">
                {checkinDaSemana ? (
                  <CheckCircle className="w-8 h-8 text-void" />
                ) : (
                  <Flame className="w-8 h-8 text-void animate-pulse" />
                )}
              </div>

              <div className="flex-1 text-center sm:text-left z-10">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-ink-3">Check-in da Semana</span>
                  {checkinDaSemana ? (
                    <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Enviado ✓
                    </span>
                  ) : (
                    <span className="bg-flame/10 text-flame text-[9px] font-bold px-2 py-0.5 rounded-full border border-flame/20 animate-pulse">
                      Pendente
                    </span>
                  )}
                </div>
                <h3 className="font-display font-bold text-lg text-ink">
                  {checkinDaSemana 
                    ? 'Sua semana está registrada!' 
                    : 'Como foi seu desempenho esta semana?'}
                </h3>
                <p className="text-xs text-ink-2 mt-1 leading-relaxed">
                  {checkinDaSemana 
                    ? 'Obrigado por completar o check-in. Seu personal já pode ver as respostas.' 
                    : 'Relate seu nível de energia, sono e estresse para que possamos ajustar seu plano.'}
                </p>
              </div>

              {!checkinDaSemana && (
                <button
                  onClick={() => setShowCheckinForm(true)}
                  className="w-full sm:w-auto px-8 py-3 bg-white text-void rounded-xl font-display font-bold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all z-10"
                >
                  FAZER CHECK-IN
                </button>
              )}
            </div>

            {/* FOTOS DE EVOLUÇÃO */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-flame/10 rounded-xl">
                    <Camera className="w-4 h-4 text-flame" />
                  </div>
                  <h3 className="font-display font-bold text-lg text-ink">Fotos de Evolução</h3>
                </div>
                <button
                  onClick={() => setShowFotoUpload(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-surface-3 border border-white/10 rounded-xl text-[10px] font-mono font-bold text-ink hover:border-flame/30 transition-all uppercase tracking-widest"
                >
                  <Plus className="w-3 h-3" /> REGISTRAR FOTO
                </button>
              </div>

              <div className="bg-surface-2 border border-white/5 rounded-3xl p-6">
                <div key={fotoRefreshTrigger}>
                  <FotoProgressoGaleria alunoId={userId} />
                </div>
              </div>
            </div>

            <AnimatePresence>
              {showFotoUpload && personalId && (
                <FotoProgressoUpload
                  alunoId={userId}
                  personalId={personalId}
                  onClose={() => setShowFotoUpload(false)}
                  onSuccess={() => {
                    setFotoRefreshTrigger(prev => prev + 1);
                    setShowFotoUpload(false);
                  }}
                />
              )}
            </AnimatePresence>

            {/* Render the CheckinForm modal when triggered */}
            <AnimatePresence>
              {showCheckinForm && personalId && (
                <CheckinForm 
                  alunoId={userId}
                  personalId={personalId}
                  semana={getStartOfWeek()}
                  onClose={() => setShowCheckinForm(false)}
                  onSuccess={async () => {
                    await fetchCheckinDaSemana();
                    setShowCheckinForm(false);
                    await checkAchievements('checkin');
                  }}
                />
              )}
            </AnimatePresence>

            {loadingProgress ? (
              <div className="flex justify-center py-20">
                <span className="w-8 h-8 border-2 border-flame border-t-transparent rounded-full animate-spin" />
              </div>
            ) : detailedSeries.length === 0 && metricas.length === 0 ? (
              /* State Empty Guard */
              <div className="bg-surface rounded-3xl p-12 text-center border border-white/5 flex flex-col justify-center items-center">
                <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-5 border border-white/5">
                  <TrendingUp className="w-8 h-8 text-ink-3 stroke-1" />
                </div>
                <span className="font-display font-medium text-lg text-ink mb-1">Evolução em processamento</span>
                <p className="text-sm text-ink-2 max-w-md mb-6 leading-relaxed">
                  Complete alguns treinos para ver sua aderência, volume e progressão de carga calculados automaticamente aqui.
                </p>
                <button
                  onClick={() => setActiveTab('treino')}
                  className="bg-white/5 hover:bg-white/10 text-ink text-xs font-semibold py-2 px-4 rounded-xl border border-white/10 transition-colors cursor-pointer"
                >
                  Ver Treino do Dia
                </button>
              </div>
            ) : (() => {
              // Extract unique exercises from completed series
              const exercisesList = Array.from(
                new Map(
                  detailedSeries
                    .filter((s: any) => s.concluida && s.exercicio_id)
                    .map((s: any) => [s.exercicio_id, { id: s.exercicio_id, nome: s.exercicio_nome }])
                ).values()
              ) as any[];

              // Select active exercise if not set yet
              const activeExId = selectedExIdProgress || (exercisesList[0]?.id || null);

              // Chart 1: Load evolution for selected exercise
              const getLoadEvolutionData = () => {
                if (!activeExId) return [];
                const filtered = detailedSeries.filter((s: any) => s.concluida && s.exercicio_id === activeExId);
                const maxByDate: Record<string, number> = {};
                filtered.forEach((s: any) => {
                  const dateStr = s.data_treino;
                  const load = Number(s.carga_kg) || 0;
                  if (!maxByDate[dateStr] || load > maxByDate[dateStr]) {
                    maxByDate[dateStr] = load;
                  }
                });
                return Object.entries(maxByDate)
                  .map(([date, load]) => ({
                    date: new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                    rawDate: date,
                    Carga: load
                  }))
                  .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());
              };

              const loadEvolutionData = getLoadEvolutionData();
              const personalRecord = loadEvolutionData.reduce((max, d) => (d.Carga > max ? d.Carga : max), 0);

              // Chart 2: Workout Adherence Rate
              const getAdherenceData = () => {
                if (workouts.length === 0) return [];
                return workouts
                  .filter((w: any) => w.status === 'publicado' || w.status === 'concluido')
                  .map((w: any) => {
                    const totalPrescribed = w.exercicios?.reduce((acc: number, item: any) => acc + (Number(item.series) || 0), 0) || 0;
                    const completedCount = detailedSeries.filter((s: any) => s.treino_id === w.id && s.concluida).length;
                    const pct = totalPrescribed > 0 ? Math.min(100, Math.round((completedCount / totalPrescribed) * 100)) : 0;
                    return {
                      id: w.id,
                      titulo: w.titulo,
                      date: new Date(w.data_treino + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                      rawDate: w.data_treino,
                      Aderência: pct
                    };
                  })
                  .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());
              };

              const adherenceData = getAdherenceData();
              const averageAdherence = adherenceData.length > 0
                ? Math.round(adherenceData.reduce((acc, d) => acc + d.Aderência, 0) / adherenceData.length)
                : 0;

              // Chart 3: Total Training Volume Over Time (Carga * Repetições)
              const getVolumeData = () => {
                const volByDate: Record<string, number> = {};
                detailedSeries.filter((s: any) => s.concluida).forEach((s: any) => {
                  const dateStr = s.data_treino;
                  const vol = (Number(s.carga_kg) || 0) * (Number(s.repeticoes) || 0);
                  volByDate[dateStr] = (volByDate[dateStr] || 0) + vol;
                });
                return Object.entries(volByDate)
                  .map(([date, vol]) => ({
                    date: new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                    rawDate: date,
                    Volume: vol
                  }))
                  .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());
              };

              const volumeData = getVolumeData();

              // Biometrics Data
              const getBiometricsByType = (tipo: string) => {
                return metricas
                  .filter((m: any) => m.tipo === tipo)
                  .map((m: any) => ({
                    date: new Date(m.registrado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                    rawDate: m.registrado_em,
                    Valor: Number(m.valor)
                  }))
                  .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());
              };

              const pesoHistory = getBiometricsByType('peso');
              const currentPeso = pesoHistory.length > 0 ? pesoHistory[pesoHistory.length - 1].Valor : null;
              
              // Calculate weight variation over the last 30 days
              let pesoVariation = 0;
              let hasPesoVariation = false;
              if (pesoHistory.length > 1) {
                pesoVariation = pesoHistory[pesoHistory.length - 1].Valor - pesoHistory[0].Valor;
                hasPesoVariation = true;
              }

              // All unique tracked biometric types
              const biometricTypes = [
                { tipo: 'peso', label: 'Peso Corporal', unit: 'kg', icon: Scale },
                { tipo: 'gordura_pct', label: 'Percentual de Gordura', unit: '%', icon: Activity },
                { tipo: 'cintura', label: 'Cintura', unit: 'cm', icon: Target },
                { tipo: 'quadril', label: 'Quadril', unit: 'cm', icon: Target },
                { tipo: 'braço', label: 'Braço', unit: 'cm', icon: Award },
                { tipo: 'coxa', label: 'Coxa', unit: 'cm', icon: Award },
                { tipo: 'peito', label: 'Peito', unit: 'cm', icon: Dumbbell }
              ];

              return (
                <div className="space-y-6">

                  {/* HERO CARD: Weight Biometrics Progress */}
                  {currentPeso && (
                    <div className="bg-[#0F1218] border border-white/5 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-flame/5 blur-3xl pointer-events-none rounded-full" />
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-ink-3">Métrica Principal</span>
                          <h2 className="font-display font-bold text-xl text-ink mt-0.5">Peso Corporal</h2>
                          <p className="text-xs text-ink-2 mt-1 font-sans">Sua trajetória biométrica atualizada.</p>
                        </div>
                        <div className="flex items-baseline gap-3 shrink-0">
                          <span className="text-3xl font-mono font-black text-ink">{currentPeso.toFixed(1)} <span className="text-lg font-sans font-medium text-ink-2">kg</span></span>
                          {hasPesoVariation && (
                            <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                              pesoVariation < 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-flame/10 text-flame border border-flame/15'
                            }`}>
                              {pesoVariation <= 0 ? '▼' : '▲'} {Math.abs(pesoVariation).toFixed(1)} kg no mês
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="h-48 w-full">
                        {pesoHistory.length > 1 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={pesoHistory} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                              <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#08090C', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                                labelStyle={{ color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                                itemStyle={{ color: '#7B6CF6', fontSize: '12px', fontWeight: 'bold' }}
                                formatter={(value: any) => [`${value} kg`, 'Peso']}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="Valor" 
                                stroke="#7B6CF6" 
                                strokeWidth={3} 
                                dot={{ fill: '#7B6CF6', strokeWidth: 1 }} 
                                activeDot={{ r: 6, strokeWidth: 1 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="w-full h-full flex flex-col justify-center items-center text-center bg-void/30 rounded-2xl border border-white/5">
                            <Scale className="w-8 h-8 text-ink-3 mb-2 opacity-50" />
                            <p className="text-xs text-ink-2 font-sans">Mais registros de peso necessários para traçar gráfico.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* MAIN PERFORMANCE CHARTS GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* CHART 1: LOAD PROGRESSION */}
                    <div className="bg-[#0F1218] border border-white/5 rounded-3xl p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-3">Força Bruta</span>
                            <h3 className="font-display font-bold text-lg text-ink mt-0.5">Evolução de Carga</h3>
                          </div>
                          
                          {/* Dropdown selector */}
                          {exercisesList.length > 0 ? (
                            <div className="relative shrink-0">
                              <select
                                value={activeExId || ''}
                                onChange={(e) => setSelectedExIdProgress(e.target.value)}
                                className="w-full sm:w-auto bg-surface-2 text-xs font-semibold text-ink border border-white/10 rounded-xl py-2 px-3 pr-8 appearance-none focus:outline-none focus:border-flame cursor-pointer transition-colors"
                              >
                                {exercisesList.map((ex: any) => (
                                  <option key={ex.id} value={ex.id}>{ex.nome}</option>
                                ))}
                              </select>
                              <ChevronDown className="w-4 h-4 text-ink-2 absolute right-2.5 top-2.5 pointer-events-none" />
                            </div>
                          ) : (
                            <span className="text-xs text-ink-3 font-mono">Sem exercícios realizados</span>
                          )}
                        </div>

                        {loadEvolutionData.length > 0 && personalRecord > 0 && (
                          <div className="bg-void/40 border border-white/5 rounded-xl p-3 mb-4 flex items-center justify-between">
                            <span className="text-xs font-semibold text-ink-2 font-sans">Maior carga registrada:</span>
                            <span className="text-sm font-mono font-black text-flame bg-flame/10 border border-flame/15 px-3 py-1 rounded-lg">
                              Recorde: {personalRecord.toFixed(1)} kg
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="h-48 w-full mt-4">
                        {loadEvolutionData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={loadEvolutionData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                              <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#08090C', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                                labelStyle={{ color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                                itemStyle={{ color: '#F5334F', fontSize: '12px', fontWeight: 'bold' }}
                                formatter={(value: any) => [`${value} kg`, 'Carga']}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="Carga" 
                                stroke="#F5334F" 
                                strokeWidth={3} 
                                dot={{ fill: '#F5334F', strokeWidth: 1 }} 
                                activeDot={{ r: 6, strokeWidth: 1 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="w-full h-full flex flex-col justify-center items-center text-center bg-void/30 rounded-2xl border border-white/5">
                            <Dumbbell className="w-8 h-8 text-ink-3 mb-2 opacity-50" />
                            <p className="text-xs text-ink-2 px-6 font-sans">Escolha outro exercício ou complete séries para ver a curva.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CHART 2: ADHERENCE */}
                    <div className="bg-[#0F1218] border border-white/5 rounded-3xl p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-4 mb-4">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-3">Consistência</span>
                            <h3 className="font-display font-bold text-lg text-ink mt-0.5">Aderência ao Treino</h3>
                          </div>
                          <div className="shrink-0 bg-emerald-500/10 border border-emerald-500/15 px-3 py-1 rounded-xl text-right">
                            <span className="text-[9px] font-mono text-ink-3 uppercase block">Fator Médio</span>
                            <span className="text-xs font-mono font-black text-emerald-400">
                              Aderência: {averageAdherence}%
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-ink-2 mb-4 leading-relaxed font-sans">
                          Porcentagem de séries concluídas em relação ao que foi prescrito pelo Personal.
                        </p>
                      </div>

                      <div className="h-48 w-full mt-4">
                        {adherenceData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={adherenceData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                              <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#08090C', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                                labelStyle={{ color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                                itemStyle={{ color: '#10B981', fontSize: '12px', fontWeight: 'bold' }}
                                formatter={(value: any) => [`${value}%`, 'Concluído']}
                              />
                              <Bar 
                                dataKey="Aderência" 
                                fill="#10B981" 
                                radius={[4, 4, 0, 0]} 
                                maxBarSize={30}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="w-full h-full flex flex-col justify-center items-center text-center bg-void/30 rounded-2xl border border-white/5">
                            <Award className="w-8 h-8 text-ink-3 mb-2 opacity-50" />
                            <p className="text-xs text-ink-2 px-6 font-sans">Conclua e salve seus treinos para gerar o histórico semanal.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CHART 3: ACCUMULATED VOLUME */}
                    <div className="bg-[#0F1218] border border-white/5 rounded-3xl p-6 md:col-span-2 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-3">Sobrecarga Progressiva</span>
                            <h3 className="font-display font-bold text-lg text-ink mt-0.5">Volume Total Acumulado</h3>
                          </div>
                        </div>
                        <p className="text-xs text-ink-2 mb-4 font-sans">
                          Esforço mecânico por treino (calculado pela fórmula: <code className="text-flame font-mono text-xs">Carga × Repetições</code> de todas as séries executadas).
                        </p>
                      </div>

                      <div className="h-56 w-full mt-4">
                        {volumeData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={volumeData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                              <defs>
                                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#FF6A2B" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#FF6A2B" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                              <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#08090C', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                                labelStyle={{ color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                                itemStyle={{ color: '#FF6A2B', fontSize: '12px', fontWeight: 'bold' }}
                                formatter={(value: any) => [`${value} kg`, 'Esforço Mecânico']}
                              />
                              <Area 
                                type="monotone" 
                                dataKey="Volume" 
                                stroke="#FF6A2B" 
                                strokeWidth={3} 
                                fillOpacity={1} 
                                fill="url(#colorVolume)" 
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="w-full h-full flex flex-col justify-center items-center text-center bg-void/30 rounded-2xl border border-white/5 py-10">
                            <Activity className="w-8 h-8 text-ink-3 mb-2 opacity-50" />
                            <p className="text-xs text-ink-2 px-6 font-sans">Faça o upload de cargas válidas e conclua séries para visualizar.</p>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* BIOMETRICS LISTING SECTIONS */}
                  <div className="space-y-4">
                    <h3 className="font-display font-bold text-lg text-ink">Métricas e Medidas Corporais</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {biometricTypes.map((item) => {
                        const history = getBiometricsByType(item.tipo);
                        const currentVal = history.length > 0 ? history[history.length - 1].Valor : null;
                        const ItemIcon = item.icon;

                        return (
                          <div 
                            key={item.tipo} 
                            className="bg-[#0F1218] border border-white/5 rounded-2xl p-4 flex flex-col justify-between h-28 relative group"
                          >
                            <div className="flex items-center justify-between text-ink-3">
                              <span className="text-[10px] font-semibold truncate pr-1 font-sans">{item.label}</span>
                              <ItemIcon className="w-4 h-4 text-violet group-hover:scale-110 transition-transform" />
                            </div>
                            
                            <div className="mt-3">
                              {currentVal !== null ? (
                                <p className="text-xl font-mono font-black text-ink">
                                  {currentVal.toFixed(1)} <span className="text-xs font-sans font-medium text-ink-2">{item.unit}</span>
                                </p>
                              ) : (
                                <p className="text-xs font-sans text-ink-3 italic">Sem registros</p>
                              )}
                              {history.length > 0 && (
                                <span className="text-[9px] font-mono text-ink-3 block mt-1">
                                  Reg: {history[history.length - 1].date}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              );
            })()}
          </div>
        )}

        {/* TAB: NUTRIÇÃO */}
        {activeTab === 'nutricao' && (
          <div id="tab-content-nutricao" className="pb-12">
            <div className="mb-8">
              <h2 className="font-display font-black text-3xl text-ink tracking-tighter uppercase italic">
                Nutri<span className="text-flame">ção</span>
              </h2>
              <p className="text-ink-3 text-xs font-mono uppercase tracking-widest mt-1">Plano & Registros Alimentares</p>
            </div>
            <NutricaoPainel alunoId={userId} />
          </div>
        )}

        {/* TAB: BEM-ESTAR */}
        {activeTab === 'bemestar' && (
          <div id="tab-content-bemestar" className="pb-12">
            <div className="mb-8">
              <h2 className="font-display font-black text-3xl text-ink tracking-tighter uppercase italic">
                Bem-<span className="text-flame">Estar</span>
              </h2>
              <p className="text-ink-3 text-xs font-mono uppercase tracking-widest mt-1">Mente & Equilíbrio</p>
            </div>
            
            {/* Integrated Wellbeing Report */}
            <div className="mb-10">
              <RelatorioBemEstar alunoId={userId} />
            </div>

            <BemEstarPainel alunoId={userId} />
          </div>
        )}

        {/* TAB: APRENDER */}
        {activeTab === 'aprender' && (
          <div id="tab-content-aprender" className="pb-12">
            <div className="mb-8">
              <h2 className="font-display font-black text-3xl text-ink tracking-tighter uppercase italic">
                Apren<span className="text-flame">der</span>
              </h2>
              <p className="text-ink-3 text-xs font-mono uppercase tracking-widest mt-1">Biblioteca de Conhecimento</p>
            </div>
            <FeedConteudo personalId={personalId} />
          </div>
        )}

        {/* TAB: AGENDA */}
        {activeTab === 'agenda' && (
          <div id="tab-content-agenda" className="pb-12">
            <AgendamentoPainel alunoId={userId} personalId={personalId} />
          </div>
        )}

        {/* TAB 3: PERFIL */}
        {activeTab === 'perfil' && (
          <div id="tab-content-perfil" className="space-y-6">
            <div>
              <h1 className="font-display font-bold text-2xl text-ink tracking-tight">Seu Perfil</h1>
              <p className="text-sm text-ink-2">Seus dados cadastrais de aluno e tipo de avatar de ativação.</p>
            </div>

            {/* Premium Profile Card */}
            <div className="bg-surface border border-white/5 rounded-3xl p-8 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-violet/5 blur-3xl pointer-events-none rounded-full" />

              <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-white/5">
                <div className="w-20 h-20 rounded-full border border-white/10 flex items-center justify-center text-4xl bg-surface-3 shrink-0">
                  {isFemale ? '👩' : '👨'}
                </div>

                <div className="text-center sm:text-left space-y-1">
                  <h3 className="font-display font-bold text-xl text-ink">{profile.nome}</h3>
                  <p className="text-sm text-ink-2">{userEmail}</p>
                  <div className="pt-2 flex flex-wrap justify-center sm:justify-start gap-2">
                    <span className="text-[10px] font-mono bg-violet/10 border border-violet/20 text-violet px-2.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                      Avatar {isFemale ? 'Feminino' : 'Masculino'}
                    </span>
                    <span className="text-[10px] font-mono bg-white/5 border border-white/10 text-ink-2 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                      Perfil Aluno
                    </span>
                  </div>
                </div>
              </div>

              {/* Goal section */}
              {objetivo && (
                <div className="p-4 bg-violet/5 border border-violet/10 rounded-2xl flex items-center gap-3">
                  <Target className="w-5 h-5 text-violet shrink-0" />
                  <div>
                    <span className="text-[10px] font-mono text-violet uppercase tracking-wider block">Objetivo Estabelecido</span>
                    <p className="text-xs text-ink leading-relaxed font-semibold">{objetivo}</p>
                  </div>
                </div>
              )}

              {/* Additional Account Metadata details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-void/50 border border-white/5 rounded-2xl space-y-1">
                  <span className="text-[10px] font-mono text-ink-3 uppercase tracking-wider">Credencial ID</span>
                  <p className="text-xs font-mono text-ink truncate">{userId}</p>
                </div>
                <div className="p-4 bg-void/50 border border-white/5 rounded-2xl space-y-1">
                  <span className="text-[10px] font-mono text-ink-3 uppercase tracking-wider">Criado Em</span>
                  <p className="text-xs font-mono text-ink flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-flame" />
                    <span>{new Date(profile.criado_em).toLocaleDateString('pt-BR')}</span>
                  </p>
                </div>
              </div>

              {/* Safety notice / app status */}
              <div className="p-4 bg-white/5 rounded-2xl flex gap-3 text-xs text-ink-2 leading-relaxed">
                <ShieldCheck className="w-5 h-5 text-violet shrink-0 mt-0.5" />
                <div>
                  <p className="text-ink font-semibold">Row Level Security Ativa</p>
                  <p className="mt-0.5 text-ink-3">Sua segurança é prioridade. Todos os treinos e dados que seu personal publicar são criptografados e acessíveis estritamente por você através da segurança real do banco de dados.</p>
                </div>
              </div>

              {/* Sign out button */}
              <div className="pt-4">
                <button
                  id="btn-logout"
                  type="button"
                  onClick={onLogout}
                  className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-white/5 hover:bg-white/10 text-sm font-semibold border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2 text-rose-400 hover:text-rose-300 active:scale-[0.98]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair da Conta</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* DETAILED EXERCISE POPUP / MODAL (WITH ACCURATE 9:16 VERTICAL LOOPING VIDEO DEMO) */}
      <AnimatePresence>
        {selectedExercise && (
          <div id="exercise-demo-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/90 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-surface border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-[0_25px_60px_rgba(0,0,0,0.9)] space-y-5"
            >
              {/* Header */}
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="text-[10px] font-mono uppercase bg-flame/10 text-flame px-2.5 py-0.5 rounded-full font-bold">
                    Demonstração Técnica
                  </span>
                  <h3 className="font-display font-black text-lg text-ink mt-2 leading-snug">
                    {selectedExercise.nome}
                  </h3>
                </div>
                <button
                  id="btn-close-exercise-demo"
                  type="button"
                  onClick={() => setSelectedExercise(null)}
                  className="w-8 h-8 rounded-full bg-surface-3 hover:bg-surface-2 border border-white/5 flex items-center justify-center text-xs text-ink-2 hover:text-ink transition-all"
                >
                  ✕
                </button>
              </div>

              {/* 9:16 VERTICAL VIDEO PLAYER CONTAINER (EXACT IMPLEMENTATION FOR VERTICAL CELLPHONE SIZE) */}
              <div className="flex flex-col items-center justify-center">
                <div 
                  className="relative w-full overflow-hidden bg-void rounded-2xl border border-white/10 shadow-inner"
                  style={{
                    aspectRatio: '9/16',
                    maxWidth: '320px' // Limite a largura máxima do vídeo e centralize
                  }}
                >
                  {(() => {
                    const videoPath = isFemale 
                      ? (selectedExercise.video_url_fem || selectedExercise.video_url_masc) 
                      : (selectedExercise.video_url_masc || selectedExercise.video_url_fem);
                    const signedUrl = videoPath ? videoUrls[videoPath] : null;

                    return signedUrl ? (
                      <video
                        src={signedUrl}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover bg-void"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-ink-3 space-y-2">
                        <Dumbbell className="w-12 h-12 animate-bounce stroke-1 text-flame" />
                        <p className="text-xs font-mono">Prévia em breve</p>
                      </div>
                    );
                  })()}

                  {/* Aesthetic loop badge overlay */}
                  <span className="absolute bottom-3 right-3 text-[8px] font-mono bg-void/70 backdrop-blur-md border border-white/10 text-ink-2 px-2 py-0.5 rounded-full flex items-center gap-1 select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-flame animate-ping" />
                    <span>Loopplayer</span>
                  </span>
                </div>
              </div>

              {/* Muscle info / tags */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {selectedExercise.musculo_primario?.map((m: string) => (
                    <span key={m} className="text-[10px] font-mono bg-violet/10 border border-violet/20 text-violet px-2.5 py-0.5 rounded-full font-semibold">
                      {m}
                    </span>
                  ))}
                  {selectedExercise.musculo_secundario?.map((m: string) => (
                    <span key={m} className="text-[10px] font-mono bg-white/5 border border-white/10 text-ink-2 px-2.5 py-0.5 rounded-full">
                      {m}
                    </span>
                  ))}
                </div>

                {/* Instructions / Tips */}
                {selectedExercise.dicas && selectedExercise.dicas.length > 0 && (
                  <div className="p-4 bg-void/50 border border-white/5 rounded-2xl space-y-2">
                    <span className="text-[10px] font-mono text-ink-3 uppercase tracking-wider block">Dicas de Execução</span>
                    <ul className="text-xs text-ink-2 space-y-1.5 list-disc pl-4 leading-relaxed">
                      {selectedExercise.dicas.map((dica: string, idx: number) => (
                        <li key={idx}>{dica}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Confirm / Close Button */}
              <button
                type="button"
                onClick={() => setSelectedExercise(null)}
                className="w-full py-3 rounded-xl bg-surface-3 hover:bg-surface-2 border border-white/5 font-display font-bold text-ink text-xs transition-colors"
              >
                Voltar ao Treino
              </button>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CELEBRATION MODAL */}
      <AnimatePresence>
        {showCelebration && (
          <div id="celebration-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-surface border border-white/10 rounded-3xl max-w-sm w-full p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-center space-y-5"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto text-3xl">
                🏆
              </div>

              <div className="space-y-1.5">
                <h3 className="font-display font-black text-xl text-ink">Treino Concluído!</h3>
                <p className="text-xs text-ink-2">Você executou com consistência e dedicação hoje.</p>
              </div>

              <div className="py-3 bg-void/40 border border-white/5 rounded-2xl grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-mono text-ink-3 block uppercase">Streak Semanal</span>
                  <span className="text-sm font-mono font-bold text-flame">5 Dias 🔥</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-ink-3 block uppercase">Histórico Geral</span>
                  <span className="text-sm font-mono font-bold text-violet">{totalCompletedCount} sessões</span>
                </div>
              </div>

              <p className="text-[10px] text-ink-3 leading-relaxed">
                Suas cargas de treino foram enviadas para o seu Personal analisar seu volume total de ativação muscular.
              </p>

              <button
                id="btn-close-celebration"
                type="button"
                onClick={handleCloseCelebration}
                className="w-full py-3.5 rounded-xl brand-gradient-bg font-display font-bold text-void text-xs shadow-md"
              >
                Retornar ao Dashboard
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BIOMETRIC REGISTRATION MODAL */}
      <AnimatePresence>
        {showAddMetricaModal && (
          <div id="biometric-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/95 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="bg-[#0F1218] border border-white/10 rounded-3xl max-w-sm w-full p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display font-black text-lg text-ink flex items-center gap-2">
                  <Scale className="w-5 h-5 text-flame" />
                  <span className="font-sans">Nova Medida</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddMetricaModal(false)}
                  className="text-ink-3 hover:text-ink transition-colors font-mono text-sm border-0 bg-transparent p-1 cursor-pointer outline-none"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddMetricaSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-ink-3 uppercase tracking-wider block">Tipo de Medida</label>
                  <div className="relative">
                    <select
                      value={newMetricaTipo}
                      onChange={(e) => setNewMetricaTipo(e.target.value)}
                      className="w-full bg-void text-sm text-ink border border-white/10 rounded-xl py-3 px-4 pr-10 appearance-none focus:outline-none focus:border-flame cursor-pointer transition-colors font-sans font-medium"
                    >
                      <option value="peso">Peso Corporal (kg)</option>
                      <option value="gordura_pct">Percentual de Gordura (%)</option>
                      <option value="cintura">Cintura (cm)</option>
                      <option value="quadril">Quadril (cm)</option>
                      <option value="braço">Braço (cm)</option>
                      <option value="coxa">Coxa (cm)</option>
                      <option value="peito">Peito (cm)</option>
                    </select>
                    <ChevronDown className="w-5 h-5 text-ink-2 absolute right-3 top-3.5 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-ink-3 uppercase tracking-wider block">Valor Registrado</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Ex: 72.5"
                      value={newMetricaValor}
                      onChange={(e) => setNewMetricaValor(e.target.value)}
                      className="w-full bg-void text-base text-ink border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-flame transition-colors font-mono font-bold"
                    />
                    <span className="absolute right-4 top-3.5 text-xs font-mono font-bold text-ink-3">
                      {newMetricaTipo === 'peso' ? 'kg' : newMetricaTipo === 'gordura_pct' ? '%' : 'cm'}
                    </span>
                  </div>
                </div>

                {newMetricaError && (
                  <p className="text-xs font-sans text-rose-400 font-semibold">{newMetricaError}</p>
                )}

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddMetricaModal(false)}
                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-display font-bold text-ink text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingMetrica}
                    className="flex-1 py-3 rounded-xl brand-gradient-bg font-display font-bold text-void text-xs shadow-md shadow-flame/10 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer border-0 outline-none"
                  >
                    {savingMetrica ? (
                      <span className="w-4 h-4 border-2 border-void border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Salvar Medida'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-surface border-t border-white/5 py-3 px-1 z-50 shadow-[0_-15px_50px_rgba(0,0,0,0.5)]">
        <div className="max-w-6xl h-full mx-auto grid grid-cols-7 gap-0.5 items-center">
          {/* Tab 1 */}
          <button
            id="tab-btn-treino"
            type="button"
            onClick={() => {
              setActiveTab('treino');
              setSelectedWorkout(null);
            }}
            className={`flex flex-col items-center gap-1 py-1 rounded-xl transition-all duration-300 relative h-full justify-center ${
              activeTab === 'treino' ? 'text-flame' : 'text-ink-2 hover:text-ink'
            }`}
          >
            <Dumbbell className="w-5 h-5" />
            <span className="text-[7px] font-bold tracking-tighter uppercase">Treino</span>
            {activeTab === 'treino' && (
              <span className="absolute bottom-0 w-6 h-1 bg-gradient-to-r from-ember via-flame to-amber rounded-t-full shadow-[0_-4px_10px_rgba(245,51,79,0.5)]" />
            )}
          </button>

          {/* Tab 2 */}
          <button
            id="tab-btn-progresso"
            type="button"
            onClick={() => setActiveTab('progresso')}
            className={`flex flex-col items-center gap-1 py-1 rounded-xl transition-all duration-300 relative h-full justify-center ${
              activeTab === 'progresso' ? 'text-flame' : 'text-ink-2 hover:text-ink'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-[7px] font-bold tracking-tighter uppercase">Progresso</span>
            {activeTab === 'progresso' && (
              <span className="absolute bottom-0 w-6 h-1 bg-gradient-to-r from-ember via-flame to-amber rounded-t-full shadow-[0_-4px_10px_rgba(245,51,79,0.5)]" />
            )}
          </button>

          {/* Tab: Nutrição */}
          <button
            id="tab-btn-nutricao"
            type="button"
            onClick={() => setActiveTab('nutricao')}
            className={`flex flex-col items-center gap-1 py-1 rounded-xl transition-all duration-300 relative h-full justify-center ${
              activeTab === 'nutricao' ? 'text-flame' : 'text-ink-2 hover:text-ink'
            }`}
          >
            <Utensils className="w-5 h-5" />
            <span className="text-[7px] font-bold tracking-tighter uppercase">Nutri</span>
            {activeTab === 'nutricao' && (
              <span className="absolute bottom-0 w-6 h-1 bg-gradient-to-r from-ember via-flame to-amber rounded-t-full shadow-[0_-4px_10px_rgba(245,51,79,0.5)]" />
            )}
          </button>

          {/* Tab: Bem-estar */}
          <button
            id="tab-btn-bemestar"
            type="button"
            onClick={() => setActiveTab('bemestar')}
            className={`flex flex-col items-center gap-1 py-1 rounded-xl transition-all duration-300 relative h-full justify-center ${
              activeTab === 'bemestar' ? 'text-flame' : 'text-ink-2 hover:text-ink'
            }`}
          >
            <Heart className="w-5 h-5" />
            <span className="text-[7px] font-bold tracking-tighter uppercase">Zen</span>
            {activeTab === 'bemestar' && (
              <span className="absolute bottom-0 w-6 h-1 bg-gradient-to-r from-ember via-flame to-amber rounded-t-full shadow-[0_-4px_10px_rgba(245,51,79,0.5)]" />
            )}
          </button>

          {/* Tab: Agenda */}
          <button
            id="tab-btn-agenda"
            type="button"
            onClick={() => setActiveTab('agenda')}
            className={`flex flex-col items-center gap-1 py-1 rounded-xl transition-all duration-300 relative h-full justify-center ${
              activeTab === 'agenda' ? 'text-flame' : 'text-ink-2 hover:text-ink'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[7px] font-bold tracking-tighter uppercase">Agenda</span>
            {activeTab === 'agenda' && (
              <span className="absolute bottom-0 w-6 h-1 bg-gradient-to-r from-ember via-flame to-amber rounded-t-full shadow-[0_-4px_10px_rgba(245,51,79,0.5)]" />
            )}
          </button>

          {/* Tab: Aprender */}
          <button
            id="tab-btn-aprender"
            type="button"
            onClick={() => setActiveTab('aprender')}
            className={`flex flex-col items-center gap-1 py-1 rounded-xl transition-all duration-300 relative h-full justify-center ${
              activeTab === 'aprender' ? 'text-flame' : 'text-ink-2 hover:text-ink'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[7px] font-bold tracking-tighter uppercase">Aprender</span>
            {activeTab === 'aprender' && (
              <span className="absolute bottom-0 w-6 h-1 bg-gradient-to-r from-ember via-flame to-amber rounded-t-full shadow-[0_-4px_10px_rgba(245,51,79,0.5)]" />
            )}
          </button>

          {/* Tab: Perfil */}
          <button
            id="tab-btn-perfil"
            type="button"
            onClick={() => setActiveTab('perfil')}
            className={`flex flex-col items-center gap-1 py-1 rounded-xl transition-all duration-300 relative h-full justify-center ${
              activeTab === 'perfil' ? 'text-flame' : 'text-ink-2 hover:text-ink'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[7px] font-bold tracking-tighter uppercase">Perfil</span>
            {activeTab === 'perfil' && (
              <span className="absolute bottom-0 w-6 h-1 bg-gradient-to-r from-ember via-flame to-amber rounded-t-full shadow-[0_-4px_10px_rgba(245,51,79,0.5)]" />
            )}
          </button>
        </div>
      </nav>
    </div>
  );
}
