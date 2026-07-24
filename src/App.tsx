import { useState, useEffect } from 'react';
import { authService, dbService, isSupabaseConfigured, supabase } from './lib/supabase';
import { Profile } from './types';
import Auth from './components/Auth';
import PersonalArea from './components/PersonalArea';
import AlunoArea from './components/AlunoArea';
import { Sparkles, Terminal, Play, X, Clock, Dumbbell, History } from 'lucide-react';
import { initSom, tocar } from './lib/som';
import LogoZelos from './components/LogoZelos';
import { useSessaoPersistente, SessaoAtiva } from './hooks/useSessaoPersistente';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConviteConflict, setShowConviteConflict] = useState(false);
  const [conviteCode, setConviteCode] = useState<string | null>(null);
  const [modoRecuperacao, setModoRecuperacao] = useState(false);
  const [sessaoRecuperada, setSessaoRecuperada] = useState<SessaoAtiva | null>(null);
  const { carregarSessao, limparSessao } = useSessaoPersistente();

  useEffect(() => {
    initSom();
    
    // Listener Global de Cliques para Sonoplastia
    const handler = (e: MouseEvent) => {
      const alvo = (e.target as HTMLElement)?.closest(
        'button, a, [role="button"], input[type="checkbox"], input[type="radio"], select, summary, .clicavel'
      );
      if (alvo && !alvo.hasAttribute("data-sem-som")) {
        tocar("tap");
      }
    };
    document.addEventListener("click", handler, true); // fase de captura

    // Listener para recuperação de senha
    let authSub: any = null;
    
    // Tratamento de tokens de recuperação no boot
    (async () => {
      if (!isSupabaseConfigured || !supabase) return;

      const hash = window.location.hash;
      const params = new URLSearchParams(window.location.search);

      // Detecta erros no hash (link expirado ou inválido)
      if (hash.includes("error=")) {
        const h = new URLSearchParams(hash.substring(1));
        const erro = h.get("error_code") || h.get("error");
        if (erro) {
          const desc = h.get("error_description")?.replace(/\+/g, " ") ?? "";
          const msg = erro === "otp_expired" 
            ? "Este link já foi usado ou expirou. Solicite um novo link de recuperação."
            : (desc || "Link inválido. Solicite a recuperação novamente.");
          
          // Dispara evento customizado ou armazena erro para o componente Auth ler
          localStorage.setItem('zenite_recovery_error', msg);
          setModoRecuperacao(false);
          window.history.replaceState({}, "", window.location.pathname);
          return;
        }
      }

      // 1. PKCE: ?code=...
      const code = params.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) console.error("exchangeCodeForSession error:", error.message);
      }

      // 2. Implícito: #access_token=...&type=recovery
      if (hash.includes("access_token")) {
        const h = new URLSearchParams(hash.substring(1));
        const access_token = h.get("access_token");
        const refresh_token = h.get("refresh_token");
        let hasSession = false;

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) {
            console.error("setSession error:", error.message);
          } else {
            hasSession = true;
          }
        }

        if (h.get("type") === "recovery" && hasSession) {
          setModoRecuperacao(true);
        }
      }

      // Limpa a URL depois de consumir o token para evitar re-processamento
      if (code || hash.includes("access_token")) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    })();

    if (isSupabaseConfigured && supabase) {
      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          setModoRecuperacao(true);
        }
      });
      authSub = data;
    }

    return () => {
      document.removeEventListener("click", handler, true);
      if (authSub?.subscription) {
        authSub.subscription.unsubscribe();
      }
    };
  }, []);

  // Initialize and check current session
  const checkSession = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('convite') || params.get('code');
      
      const currentUser = await authService.getCurrentUser();
      
      if (currentUser && code) {
        setConviteCode(code.toUpperCase());
        setShowConviteConflict(true);
      }

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
            nome: currentUser.user_metadata?.nome || 'Membro Zelos',
            avatar_url: currentUser.user_metadata?.avatar_url || null,
            avatar_tipo: currentUser.user_metadata?.avatar_tipo || 'masculino',
            criado_em: new Date().toISOString()
          });
        }

        // Verificar sessão pendente
        const sessao = await carregarSessao(currentUser.id);
        if (sessao) {
          if (sessao.contexto.tipo === 'navegacao') {
            window.history.replaceState({}, '', sessao.rota);
          } else if (sessao.contexto.tipo === 'treino_guiado') {
            setSessaoRecuperada(sessao);
          }
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
          nome: authenticatedUser.user_metadata?.nome || 'Membro Zelos',
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
      if (user) {
        await limparSessao(user.id);
      }
      await authService.signOut();
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error('Erro ao sair da conta:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const { data: userProfile } = await dbService.getProfile(user.id);
      if (userProfile) {
        setProfile(userProfile);
      }
    }
  };

  // 1. BRAND LOADING STATE
  if (loading) {
    return (
      <div id="loader-view" className="min-h-screen bg-void flex flex-col justify-center items-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#F26A1B]/5 blur-3xl rounded-full pointer-events-none" />
        <div className="text-center relative z-10 space-y-6 flex flex-col items-center">
          <LogoZelos size="xl" center />
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
          <div className="w-full bg-raise border-b border-line py-3 px-6 flex flex-col sm:flex-row items-center justify-between gap-2 z-50 relative">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-violet shrink-0" />
              <span className="text-[11px] font-mono text-ink-2">
                <span className="text-violet font-semibold uppercase mr-1">⚙️ Modo Demo Ativo:</span>
                Os dados serão salvos localmente. Configure <code className="text-ink bg-surface border border-line px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> para produção.
              </span>
            </div>
          </div>
        )}
        <Auth 
          onAuthSuccess={handleAuthSuccess} 
          initialRecoveryMode={modoRecuperacao}
          onRecoveryComplete={() => setModoRecuperacao(false)}
        />
      </div>
    );
  }

  // 3. AUTHENTICATED SYSTEM ROUTING
  return (
    <div id="app-workspace-root" className="min-h-screen bg-void relative">
      {/* Invitation Conflict Modal */}
      {showConviteConflict && (
        <div className="z-overlay !z-[200]">
          <div className="z-modal relative p-8 border border-line">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl pointer-events-none rounded-full" />
            
            <div className="text-center space-y-6 relative z-10">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center border border-line">
                  <Sparkles className="w-8 h-8 text-accent" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="font-display font-bold text-xl text-ink leading-tight">
                  Convite Detectado!
                </h2>
                <p className="text-sm text-ink-2 leading-relaxed">
                  Você já está conectado como <span className="text-ink font-semibold">{profile.nome}</span>. Para usar o convite <span className="text-accent font-mono font-bold tracking-wider">{conviteCode}</span>, você precisa sair da conta atual primeiro.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  id="btn-logout-and-invite"
                  type="button"
                  onClick={async () => {
                    await handleLogout();
                    setShowConviteConflict(false);
                    // Force refresh to ensure Auth component picks up the param correctly
                    window.location.reload();
                  }}
                  className="w-full py-4 px-6 rounded-2xl bg-accent hover:opacity-90 text-white font-display font-bold text-sm transition-all active:scale-[0.98] border border-line"
                >
                  Sair e usar o convite
                </button>
                <button
                  id="btn-ignore-invite"
                  type="button"
                  onClick={() => setShowConviteConflict(false)}
                  className="w-full py-4 px-6 rounded-2xl bg-bg hover:bg-raise border border-line text-ink-2 hover:text-ink font-display font-bold text-sm transition-all active:scale-[0.98]"
                >
                  Continuar na conta atual
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {sessaoRecuperada && sessaoRecuperada.contexto.tipo === 'treino_guiado' && sessaoRecuperada.ts !== -1 && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-surface border border-line rounded-3xl w-full max-w-sm p-6 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#F26A1B]/5 blur-3xl pointer-events-none rounded-full" />
            
            <div className="text-center space-y-4 relative z-10">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-[#F26A1B]/10 rounded-full flex items-center justify-center border border-[#F26A1B]/20 relative">
                  <History className="w-8 h-8 text-[#F26A1B]" />
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F26A1B] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-[#F26A1B]"></span>
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <h2 className="font-display font-extrabold text-xl text-ink leading-tight">
                  Retomar treino?
                </h2>
                <p className="text-sm text-ink-2">
                  Encontramos um treino interrompido. Deseja continuar de onde parou?
                </p>
              </div>

              <div className="bg-raise rounded-2xl p-4 border border-line space-y-2 text-left">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-surface rounded-lg border border-line">
                    <Dumbbell className="w-4 h-4 text-[#F26A1B]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono text-ink-3 uppercase font-bold">Último Exercício</p>
                    <p className="text-xs font-bold text-ink truncate">Exercício { (sessaoRecuperada.contexto.exercicio_index ?? 0) + 1 }</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-surface rounded-lg border border-line">
                    <Clock className="w-4 h-4 text-[#F26A1B]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono text-ink-3 uppercase font-bold">Visto em</p>
                    <p className="text-xs font-bold text-ink">{ new Date(sessaoRecuperada.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    tocar('tap');
                    // Mantemos a sessão no estado local para que o AlunoArea possa lê-la
                    // Mas mudamos o contexto para indicar que ela foi ACEITA (opcional)
                    setSessaoRecuperada({ ...sessaoRecuperada, ts: -1 }); // Flag para AlunoArea saber que pode abrir
                  }}
                  className="w-full py-4 px-6 rounded-2xl bg-[#F26A1B] hover:bg-[#ff8a3d] text-white font-display font-bold text-sm shadow-lg shadow-[#F26A1B]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Sim, retomar agora
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    tocar('tap');
                    await limparSessao(user.id);
                    setSessaoRecuperada(null);
                  }}
                  className="w-full py-3 px-6 rounded-2xl bg-surface hover:bg-raise border border-line text-ink-3 hover:text-ink font-display font-bold text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <X className="w-3.5 h-3.5" />
                  Descartar e começar do zero
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {profile.papel === 'personal' ? (
        <PersonalArea
          userId={user.id}
          userEmail={user.email}
          profile={profile}
          onLogout={handleLogout}
          isDemoMode={!isSupabaseConfigured}
          onProfileUpdate={refreshProfile}
          sessaoRestaurada={sessaoRecuperada}
          onSessaoConsumida={() => setSessaoRecuperada(null)}
        />
      ) : (
        <AlunoArea
          userId={user.id}
          userEmail={user.email}
          profile={profile}
          onLogout={handleLogout}
          isDemoMode={!isSupabaseConfigured}
          onProfileUpdate={refreshProfile}
          sessaoRestaurada={sessaoRecuperada?.ts === -1 ? sessaoRecuperada : null}
          onSessaoConsumida={() => setSessaoRecuperada(null)}
        />
      )}
    </div>
  );
}

