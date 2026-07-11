import { useState, useEffect } from 'react';
import { authService, dbService, isSupabaseConfigured } from './lib/supabase';
import { Profile } from './types';
import Auth from './components/Auth';
import PersonalArea from './components/PersonalArea';
import AlunoArea from './components/AlunoArea';
import { Sparkles, Terminal } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize and check current session
  const checkSession = async () => {
    setLoading(true);
    try {
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        // Fetch profile
        const { data: userProfile } = await dbService.getProfile(currentUser.id);
        if (userProfile) {
          setProfile(userProfile);
        } else {
          // If authenticated but profile doesn't exist yet, we fall back to metadata
          setProfile({
            id: currentUser.id,
            papel: currentUser.user_metadata?.papel || 'personal',
            nome: currentUser.user_metadata?.nome || 'Membro Zênite',
            avatar_url: currentUser.user_metadata?.avatar_url || null,
            avatar_tipo: currentUser.user_metadata?.avatar_tipo || 'masculino',
            criado_em: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      console.error('Erro ao verificar sessão do usuário:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleAuthSuccess = async (authenticatedUser: any) => {
    setUser(authenticatedUser);
    setLoading(true);
    try {
      const { data: userProfile } = await dbService.getProfile(authenticatedUser.id);
      if (userProfile) {
        setProfile(userProfile);
      } else {
        // Fallback or metadata creation (especially for first signup)
        setProfile({
          id: authenticatedUser.id,
          papel: authenticatedUser.user_metadata?.papel || 'personal',
          nome: authenticatedUser.user_metadata?.nome || 'Membro Zênite',
          avatar_url: authenticatedUser.user_metadata?.avatar_url || null,
          avatar_tipo: authenticatedUser.user_metadata?.avatar_tipo || 'masculino',
          criado_em: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Erro ao obter perfil de usuário:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await authService.signOut();
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error('Erro ao sair da conta:', err);
    } finally {
      setLoading(false);
    }
  };

  // 1. BRAND LOADING STATE
  if (loading) {
    return (
      <div id="loader-view" className="min-h-screen bg-void flex flex-col justify-center items-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-gradient-to-tr from-[#F5334F]/10 via-[#FF6A2B]/5 to-transparent blur-3xl rounded-full pointer-events-none" />
        <div className="text-center relative z-10 space-y-4">
          <span className="font-display font-black text-5xl tracking-tight select-none">
            ZÊNI<span className="brand-gradient-text">TE</span>
          </span>
          <div className="flex justify-center items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full brand-gradient-bg animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2.5 h-2.5 rounded-full brand-gradient-bg animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2.5 h-2.5 rounded-full brand-gradient-bg animate-bounce" />
          </div>
          <p className="text-[10px] font-mono text-ink-3 uppercase tracking-widest pt-2">Carregando Ativação Muscular</p>
        </div>
      </div>
    );
  }

  // 2. UNAUTHENTICATED LOGIN / SIGNUP FLOW
  if (!user || !profile) {
    return (
      <div id="auth-flow-view" className="min-h-screen bg-void">
        {/* Floating Demo banner at the top of the auth screen */}
        {!isSupabaseConfigured && (
          <div className="w-full bg-[#161A22] border-b border-white/5 py-3 px-6 flex flex-col sm:flex-row items-center justify-between gap-2 z-50 relative">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-violet shrink-0" />
              <span className="text-[11px] font-mono text-ink-2">
                <span className="text-violet font-semibold uppercase mr-1">⚙️ Modo Demo Ativo:</span>
                Os dados serão salvos localmente. Configure <code className="text-white bg-white/5 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> para produção.
              </span>
            </div>
          </div>
        )}
        <Auth onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  // 3. AUTHENTICATED SYSTEM ROUTING
  return (
    <div id="app-workspace-root" className="min-h-screen bg-void relative">
      {/* Floating Demo warning banner for authenticated view */}
      {!isSupabaseConfigured && (
        <div className="w-full bg-surface-2 border-b border-white/5 py-2.5 px-6 flex justify-center items-center gap-2 relative z-50">
          <Terminal className="w-4 h-4 text-flame shrink-0" />
          <span className="text-[10px] font-mono text-ink-2 uppercase tracking-wide">
            Executando em Modo Demo · Alunos simulados criados localmente
          </span>
        </div>
      )}

      {profile.papel === 'personal' ? (
        <PersonalArea
          userId={user.id}
          userEmail={user.email}
          profile={profile}
          onLogout={handleLogout}
          isDemoMode={!isSupabaseConfigured}
        />
      ) : (
        <AlunoArea
          userId={user.id}
          userEmail={user.email}
          profile={profile}
          onLogout={handleLogout}
          isDemoMode={!isSupabaseConfigured}
        />
      )}
    </div>
  );
}

