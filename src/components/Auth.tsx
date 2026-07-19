import React, { useState, useMemo } from 'react';
import { authService, isSupabaseConfigured } from '../lib/supabase';
import { PapelUsuario, TipoAvatar } from '../types';
import { 
  Eye, 
  EyeOff, 
  Dumbbell, 
  User, 
  Sparkles, 
  Mail, 
  Lock, 
  Check, 
  X, 
  Volume2, 
  VolumeX, 
  Sun, 
  Moon, 
  ShieldCheck, 
  Users 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { traduzErro } from '../lib/erros';
import LogoZelos from './LogoZelos';
import { useTheme } from '../contexts/ThemeContext';

interface AuthProps {
  onAuthSuccess: (user: any) => void;
  initialRecoveryMode?: boolean;
  onRecoveryComplete?: () => void;
}

// Sound Synthesis using Web Audio API (fitness-themed, no external asset dependencies)
const playWhoosh = () => {
  const isSoundEnabled = localStorage.getItem('zelos_som_login') !== 'false';
  if (!isSoundEnabled) return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    // Deep whoosh frequency sweep
    osc.frequency.setValueAtTime(450, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.22);
    
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  } catch (err) {
    // silently catch autoplay restrictions
  }
};

const playSuccess = () => {
  const isSoundEnabled = localStorage.getItem('zelos_som_login') !== 'false';
  if (!isSoundEnabled) return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      
      gain.gain.setValueAtTime(0.001, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    
    playTone(523.25, 0, 0.12); // C5
    playTone(659.25, 0.08, 0.2); // E5
  } catch (err) {
    // silently catch autoplay restrictions
  }
};

export default function Auth({ onAuthSuccess, initialRecoveryMode = false, onRecoveryComplete }: AuthProps) {
  const { theme, resolved, setTheme } = useTheme();
  const [view, setView] = useState<'auth' | 'forgot' | 'otp' | 'reset'>(initialRecoveryMode ? 'reset' : 'auth');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [nome, setNome] = useState('');
  const [papel, setPapel] = useState<PapelUsuario>('personal');
  const [avatarTipo, setAvatarTipo] = useState<TipoAvatar>('masculino');
  const [codigoConvite, setCodigoConvite] = useState('');
  const [isConviteLocked, setIsConviteLocked] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);

  // Sound preference state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('zelos_som_login') !== 'false';
  });

  const toggleSound = () => {
    const nextValue = !soundEnabled;
    setSoundEnabled(nextValue);
    localStorage.setItem('zelos_som_login', nextValue ? 'true' : 'false');
    if (nextValue) {
      setTimeout(() => playWhoosh(), 50);
    }
  };

  const handleTabToggle = (login: boolean) => {
    setIsLogin(login);
    setError(null);
    setSuccessMessage(null);
    playWhoosh();
  };

  // Password validation logic
  const passwordCriteria = useMemo(() => {
    const p = !isLogin && view === 'auth' ? password : newPassword;
    return {
      length: p.length >= 8,
      lower: /[a-z]/.test(p),
      upper: /[A-Z]/.test(p),
      number: /[0-9]/.test(p),
    };
  }, [password, newPassword, isLogin, view]);

  const isPasswordValid = useMemo(() => {
    return passwordCriteria.length && passwordCriteria.lower && passwordCriteria.upper && passwordCriteria.number;
  }, [passwordCriteria]);

  const canSubmitSignup = isLogin || isPasswordValid;
  const canSubmitReset = view !== 'reset' || (isPasswordValid && newPassword === confirmPassword);

  React.useEffect(() => {
    const recoveryError = localStorage.getItem('zenite_recovery_error');
    if (recoveryError) {
      setView('forgot');
      setError(traduzErro(recoveryError));
      localStorage.removeItem('zenite_recovery_error');
      return;
    }

    if (initialRecoveryMode) {
      setView('reset');
    }
  }, [initialRecoveryMode]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const conviteParam = params.get('convite') || params.get('code');
    if (conviteParam) {
      setCodigoConvite(conviteParam.toUpperCase());
      setPapel('aluno');
      setIsLogin(false);
      setIsConviteLocked(true);
    }
  }, []);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const { error: resetError } = await authService.resetPassword(email);
      if (resetError) {
        setError(traduzErro(resetError.message));
      } else {
        playSuccess();
        setSuccessMessage('Se este e-mail estiver cadastrado, enviamos um link ou código de recuperação. Verifique sua caixa de entrada.');
        setTimeout(() => {
          setView('otp');
          setSuccessMessage(null);
        }, 3000);
      }
    } catch (err: any) {
      setError(traduzErro(err?.message) || 'Ocorreu um erro ao enviar o e-mail de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const { error: verifyError } = await authService.verifyOtp(email, otpCode);
      if (verifyError) {
        setError(traduzErro(verifyError.message));
      } else {
        playSuccess();
        setView('reset');
      }
    } catch (err: any) {
      setError(traduzErro(err?.message) || 'Erro ao validar o código.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!isPasswordValid) {
      setError('A senha não atende aos requisitos mínimos.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await authService.updatePassword(newPassword);
      if (updateError) {
        setError(traduzErro(updateError.message));
      } else {
        playSuccess();
        setSuccessMessage('Senha alterada com sucesso! Você já pode entrar na sua conta.');
        setTimeout(() => {
          setView('auth');
          setIsLogin(true);
          onRecoveryComplete?.();
        }, 2000);
      }
    } catch (err: any) {
      setError(traduzErro(err?.message) || 'Ocorreu um erro ao alterar a senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!isLogin && !isPasswordValid) {
      setError('A senha não atende aos requisitos mínimos.');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { data, error: authError } = await authService.signIn(email, password);
        if (authError) {
          setError(traduzErro(authError.message));
        } else if (data?.user) {
          playSuccess();
          onAuthSuccess(data.user);
        }
      } else {
        if (!nome.trim()) {
          setError('Por favor, informe seu nome completo.');
          setLoading(false);
          return;
        }

        // Valida o código de convite do aluno ANTES de criar a conta
        if (papel === 'aluno' && codigoConvite.trim()) {
          const { valido } = await authService.validarConvite(codigoConvite.trim());
          if (!valido) {
            setError('Código de convite inválido ou já utilizado. Confira com seu Personal.');
            setLoading(false);
            return;
          }
        }

        const { data, error: authError } = await authService.signUp(
          email,
          password,
          nome,
          papel,
          avatarTipo,
          papel === 'aluno' && codigoConvite ? codigoConvite : undefined
        );

        if (authError) {
          setError(traduzErro(authError.message));
        } else if (data?.user) {
          if (!data.session) {
            setIsLogin(true);
            playSuccess();
            setSuccessMessage(
              `Conta criada! Enviamos um e-mail de confirmação para ${email}. ` +
              `Confirme seu e-mail e depois faça login para entrar.`
            );
            setLoading(false);
            return;
          }

          if (papel === 'aluno') {
            setPendingUser(data.user);
            playSuccess();
            setShowWelcomeModal(true);
          } else {
            playSuccess();
            onAuthSuccess(data.user);
          }
        } else {
          setError('Não foi possível criar a conta. Tente novamente.');
        }
      }
    } catch (err: any) {
      setError(traduzErro(err?.message) || 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const PasswordRequirements = ({ criteria }: { criteria: typeof passwordCriteria }) => (
    <div className="mt-3 space-y-1.5 p-3 bg-raise/50 border border-line rounded-xl text-ink">
      <p className="text-[10px] text-ink-3 font-bold uppercase tracking-wider mb-2">Requisitos da Senha</p>
      <div className="flex items-center gap-2">
        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${criteria.length ? 'bg-ok text-white' : 'bg-line text-ink-3'}`}>
          <Check className="w-2.5 h-2.5 stroke-[4px]" />
        </div>
        <span className={`text-[11px] ${criteria.length ? 'text-ok font-semibold' : 'text-ink-3'}`}>Pelo menos 8 caracteres</span>
      </div>
      <div className="flex items-center gap-2">
        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${criteria.lower ? 'bg-ok text-white' : 'bg-line text-ink-3'}`}>
          <Check className="w-2.5 h-2.5 stroke-[4px]" />
        </div>
        <span className={`text-[11px] ${criteria.lower ? 'text-ok font-semibold' : 'text-ink-3'}`}>Pelo menos uma letra minúscula</span>
      </div>
      <div className="flex items-center gap-2">
        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${criteria.upper ? 'bg-ok text-white' : 'bg-line text-ink-3'}`}>
          <Check className="w-2.5 h-2.5 stroke-[4px]" />
        </div>
        <span className={`text-[11px] ${criteria.upper ? 'text-ok font-semibold' : 'text-ink-3'}`}>Pelo menos uma letra maiúscula</span>
      </div>
      <div className="flex items-center gap-2">
        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${criteria.number ? 'bg-ok text-white' : 'bg-line text-ink-3'}`}>
          <Check className="w-2.5 h-2.5 stroke-[4px]" />
        </div>
        <span className={`text-[11px] ${criteria.number ? 'text-ok font-semibold' : 'text-ink-3'}`}>Pelo menos um número</span>
      </div>
    </div>
  );

  const handleStartApp = () => {
    if (pendingUser) {
      onAuthSuccess(pendingUser);
    }
  };

  return (
    <div id="auth-container" className="min-h-screen bg-bg flex items-stretch relative overflow-hidden transition-colors duration-300">
      
      {/* Brand panel (left column, desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-bg border-r border-line/30 relative overflow-hidden flex-col justify-between p-12 select-none">
        {/* Background gradient effects */}
        <motion.div
          animate={{
            scale: [1, 1.1, 0.9, 1],
            x: [0, 20, -15, 0],
            y: [0, -30, 20, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#F26A1B]/6 blur-[120px] pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 0.9, 1.1, 1],
            x: [0, -20, 20, 0],
            y: [0, 20, -20, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#F26A1B]/5 blur-[120px] pointer-events-none"
        />

        {/* Waves SVG pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.12] pointer-events-none text-[#F26A1B]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M 0 120 Q 250 70 500 170 T 1000 120 L 1000 1000 L 0 1000 Z" fill="url(#waveGrad)" />
          <path d="M 0 240 Q 300 160 600 260 T 1000 220 L 1000 1000 L 0 1000 Z" fill="url(#waveGrad)" opacity="0.6" />
        </svg>

        {/* Top Logo */}
        <div className="relative z-10">
          <LogoZelos size="md" />
        </div>

        {/* Mid copy */}
        <div className="relative z-10 my-auto space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-4"
          >
            <span className="z-eyebrow text-xs font-semibold text-[#F26A1B]">ZELOS PERSONAL</span>
            <h1 className="text-4xl xl:text-5xl font-black font-display text-ink tracking-tight leading-tight max-w-md">
              Performance de elite e <span className="text-[#F26A1B]">controle total</span> da sua evolução.
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="space-y-6 max-w-sm"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#F26A1B]/10 flex items-center justify-center border border-[#F26A1B]/15 text-[#F26A1B] shrink-0">
                <Dumbbell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-ink text-sm">Treinos e nutrição</h3>
                <p className="text-ink-2 text-xs leading-relaxed mt-0.5">Acompanhamento completo de atividade física e dieta num só lugar.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#F26A1B]/10 flex items-center justify-center border border-[#F26A1B]/15 text-[#F26A1B] shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-ink text-sm">Segurança ortopédica</h3>
                <p className="text-ink-2 text-xs leading-relaxed mt-0.5">Foco em integridade física com metodologias científicas para evitar lesões.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#F26A1B]/10 flex items-center justify-center border border-[#F26A1B]/15 text-[#F26A1B] shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-ink text-sm">Acompanhamento em tempo real</h3>
                <p className="text-ink-2 text-xs leading-relaxed mt-0.5">Feedbacks imediatos, métricas integradas e proximidade total entre você e seu Personal.</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-ink-3 font-mono">
          © {new Date().getFullYear()} ZELOS Personal • v1.0.0
        </div>
      </div>

      {/* Auth form container (right column, center on mobile) */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 relative z-10 bg-bg/40">
        
        {/* Corner Controls */}
        <div className="absolute top-6 right-6 flex items-center gap-2 z-50">
          {/* Sound toggle button */}
          <button
            type="button"
            onClick={toggleSound}
            className="p-2.5 rounded-xl bg-surface/40 backdrop-blur-sm hover:bg-raise border border-line/40 hover:border-line-strong transition-all cursor-pointer text-ink-2 hover:text-ink shadow-sm"
            title={soundEnabled ? "Mutar sons" : "Ativar sons"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#F26A1B]" /> : <VolumeX className="w-4 h-4 text-ink-3" />}
          </button>

          {/* Theme toggle button */}
          <button
            type="button"
            onClick={() => {
              setTheme(resolved === 'dark' ? 'light' : 'dark');
              playWhoosh();
            }}
            className="p-2.5 rounded-xl bg-surface/40 backdrop-blur-sm hover:bg-raise border border-line/40 hover:border-line-strong transition-all cursor-pointer text-ink-2 hover:text-ink shadow-sm"
            title={resolved === 'dark' ? "Modo Claro" : "Modo Escuro"}
          >
            {resolved === 'dark' ? <Sun className="w-4 h-4 text-[#F26A1B]" /> : <Moon className="w-4 h-4 text-ink-3" />}
          </button>
        </div>

        {/* Glow behind card on mobile or theme transitions */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#F26A1B]/5 blur-[80px] pointer-events-none rounded-full" />

        {/* Welcome Modal for Students */}
        {showWelcomeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-sm bg-surface border border-line rounded-xl p-8 relative overflow-hidden"
            >
              {/* Background accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#F26A1B]/10 blur-3xl pointer-events-none rounded-full" />
              
              <div className="text-center space-y-6 relative z-10">
                <div className="flex justify-center">
                  <div className="w-20 h-20 bg-[#F26A1B]/10 rounded-full flex items-center justify-center border border-[#F26A1B]/20">
                    <div className="w-12 h-12 bg-[#F26A1B] rounded-full flex items-center justify-center">
                      <Check className="w-7 h-7 text-white stroke-[3px]" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="font-semibold text-2xl text-ink leading-tight">
                    Bem-vindo à sua jornada!
                  </h2>
                  <p className="text-sm text-ink-2 leading-relaxed font-sans">
                    Sua conta foi criada com sucesso e você já está conectado ao seu Personal. A partir de agora, seus treinos, metas e acompanhamento aparecem aqui. Assim que seu Personal montar seu plano, tudo estará disponível nesta tela.
                  </p>
                </div>

                <button
                  id="btn-welcome-start"
                  type="button"
                  onClick={handleStartApp}
                  className="w-full py-4 px-6 rounded-lg bg-[#F26A1B] hover:opacity-90 text-white font-semibold text-base transition-all active:scale-[0.98] cursor-pointer"
                >
                  Começar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`w-full max-w-md p-8 rounded-2xl relative z-10 backdrop-blur-md transition-all duration-300 ${
            resolved === 'dark'
              ? 'bg-surface/50 border border-line/50 shadow-2xl'
              : 'bg-white/80 border border-line/40 shadow-xl'
          }`}
        >
          {/* Logo visible on all, centered, perfect branding */}
          <div className="text-center mb-6 flex flex-col items-center">
            <LogoZelos size="lg" center />
            <p className="text-ink-2 font-sans font-normal text-[10px] mt-4 tracking-[0.08em] uppercase text-center">
              {view === 'reset' 
                ? 'Defina sua nova credencial de acesso'
                : view === 'otp'
                  ? 'Validação de Segurança'
                  : view === 'forgot'
                    ? 'Recupere seu acesso à plataforma'
                    : isLogin 
                      ? 'Ative o seu potencial máximo' 
                      : 'Faça parte da elite do treinamento'
              }
            </p>
          </div>

          {/* Tab switcher - Only show in auth view */}
          {view === 'auth' && (
            <div className="grid grid-cols-2 bg-raise/50 p-1 rounded-xl mb-6 border border-line/40">
              <button
                id="tab-login"
                type="button"
                onClick={() => handleTabToggle(true)}
                className={`py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  isLogin 
                    ? 'bg-surface text-ink shadow-sm border border-line/30' 
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                Entrar
              </button>
              <button
                id="tab-signup"
                type="button"
                onClick={() => handleTabToggle(false)}
                className={`py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  !isLogin 
                    ? 'bg-surface text-ink shadow-sm border border-line/30' 
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                Cadastrar
              </button>
            </div>
          )}

          {/* Demo Credentials Hint if in Login & Demo mode */}
          {view === 'auth' && isLogin && !isSupabaseConfigured && (
            <div className="mb-6 p-4 bg-[#F26A1B]/5 rounded-xl border border-[#F26A1B]/15 text-xs text-ink-2">
              <span className="font-semibold text-[#F26A1B] block mb-1">Modo demo ativo</span>
              <p className="mb-1">Utilize qualquer e-mail e senha para testar. Sugestões:</p>
              <ul className="list-disc pl-4 space-y-1 text-[12px]">
                <li>Personal: <span className="text-ink font-medium num">personal@zelos.com</span></li>
                <li>Aluno: <span className="text-ink font-medium num">aluno@zelos.com</span></li>
              </ul>
            </div>
          )}

          {/* Error and Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-xl text-xs text-danger font-medium font-sans">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-ok/10 border border-ok/20 rounded-xl text-xs text-ok font-medium font-sans flex items-start gap-3">
              <Check className="w-4 h-4 shrink-0 mt-0.5 text-ok" />
              <span>{successMessage}</span>
            </div>
          )}

          {view === 'auth' && (
            <form onSubmit={(e) => { playWhoosh(); handleSubmit(e); }} className="space-y-5">
              {/* Sign Up Fields */}
              {!isLogin && (
                <div className="space-y-4">
                  {isConviteLocked && (
                    <div className="p-3 bg-[#F26A1B]/5 border border-[#F26A1B]/15 rounded-xl text-xs text-ink-2 flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-[#F26A1B] shrink-0" />
                      <span>Você está se cadastrando como Aluno via link de convite.</span>
                    </div>
                  )}

                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider block">Nome completo</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-3" />
                      <input
                        id="input-name"
                        type="text"
                        required
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Como prefere ser chamado"
                        className="z-input !pl-12 !h-12 text-sm focus:border-[#F26A1B] focus:ring-2 focus:ring-[#F26A1B]/15"
                      />
                    </div>
                  </div>

                  {/* Profile/Role selector */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider block">Quem é você?</label>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Personal Trainer Card */}
                      <button
                        id="role-personal"
                        type="button"
                        disabled={isConviteLocked}
                        onClick={() => { setPapel('personal'); playWhoosh(); }}
                        className={`p-4 rounded-xl border text-left flex flex-col items-start transition-all cursor-pointer ${
                          papel === 'personal'
                            ? 'bg-[#F26A1B]/5 border-[#F26A1B]'
                            : 'bg-raise/20 border-line hover:border-[#F26A1B]/30'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        <Dumbbell className={`w-5 h-5 mb-2 ${papel === 'personal' ? 'text-[#F26A1B]' : 'text-ink-3'}`} />
                        <span className="font-bold text-xs text-ink">Sou personal</span>
                        <span className="text-[10px] text-ink-2 mt-1 leading-normal">Gerencie alunos e treinos</span>
                      </button>

                      {/* Student/Aluno Card */}
                      <button
                        id="role-aluno"
                        type="button"
                        disabled={isConviteLocked}
                        onClick={() => { setPapel('aluno'); playWhoosh(); }}
                        className={`p-4 rounded-xl border text-left flex flex-col items-start transition-all cursor-pointer ${
                          papel === 'aluno'
                            ? 'bg-[#F26A1B]/5 border-[#F26A1B]'
                            : 'bg-raise/20 border-line hover:border-[#F26A1B]/30'
                        } disabled:opacity-75`}
                      >
                        <User className={`w-5 h-5 mb-2 ${papel === 'aluno' ? 'text-[#F26A1B]' : 'text-ink-3'}`} />
                        <span className="font-bold text-xs text-ink">Sou aluno</span>
                        <span className="text-[10px] text-ink-2 mt-1 leading-normal">Acompanhe sua ativação</span>
                      </button>
                    </div>
                  </div>

                  {/* Avatar Type Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider block">Estilo do avatar</label>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Male Card */}
                      <button
                        id="avatar-masculino"
                        type="button"
                        onClick={() => { setAvatarTipo('masculino'); playWhoosh(); }}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer text-xs ${
                          avatarTipo === 'masculino'
                            ? 'bg-[#F26A1B]/5 border-[#F26A1B] text-ink font-bold'
                            : 'bg-raise/20 border-line text-ink-2 hover:border-[#F26A1B]/30'
                        }`}
                      >
                        Masculino
                      </button>

                      {/* Female Card */}
                      <button
                        id="avatar-feminino"
                        type="button"
                        onClick={() => { setAvatarTipo('feminino'); playWhoosh(); }}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer text-xs ${
                          avatarTipo === 'feminino'
                            ? 'bg-[#F26A1B]/5 border-[#F26A1B] text-ink font-bold'
                            : 'bg-raise/20 border-line text-ink-2 hover:border-[#F26A1B]/30'
                        }`}
                      >
                        Feminino
                      </button>
                    </div>
                  </div>

                  {/* Optional invitation code for students */}
                  {papel === 'aluno' && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider block">
                        Código do personal <span className="text-ink-3 text-[10px] font-sans lowercase italic">({isConviteLocked ? 'travado' : 'opcional'})</span>
                      </label>
                      <input
                        id="input-codigo-convite"
                        type="text"
                        value={codigoConvite}
                        onChange={(e) => setCodigoConvite(e.target.value.toUpperCase())}
                        disabled={isConviteLocked}
                        placeholder="Ex: ZEN-DEMO-123"
                        className="z-input !h-12 text-sm focus:border-[#F26A1B] focus:ring-2 focus:ring-[#F26A1B]/15 disabled:opacity-60 disabled:cursor-not-allowed num"
                      />
                      <p className="text-[11px] text-ink-3 font-sans leading-relaxed">
                        {isConviteLocked 
                          ? 'Este código de convite vincula você automaticamente ao seu Personal Trainer.' 
                          : 'Insira o código enviado pelo seu Personal Trainer para se vincular instantaneamente. No modo Demo, use ZEN-DEMO-123.'
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider block">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-3" />
                  <input
                    id="input-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@zelos.com"
                    className="z-input !pl-12 !h-12 text-sm focus:border-[#F26A1B] focus:ring-2 focus:ring-[#F26A1B]/15 num"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider block">Senha</label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => { setView('forgot'); setError(null); setSuccessMessage(null); playWhoosh(); }}
                      className="text-xs text-ink-3 hover:text-[#F26A1B] transition-colors cursor-pointer"
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-3" />
                  <input
                    id="input-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isLogin ? "Mínimo 6 caracteres" : "Senha forte necessária"}
                    className="z-input !pl-12 !pr-12 !h-12 text-sm focus:border-[#F26A1B] focus:ring-2 focus:ring-[#F26A1B]/15 num"
                  />
                  <button
                    type="button"
                    onClick={() => { setShowPassword(!showPassword); playWhoosh(); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {!isLogin && <PasswordRequirements criteria={passwordCriteria} />}
              </div>

              {/* Submit Button */}
              <button
                id="btn-auth-submit"
                type="submit"
                disabled={loading || !canSubmitSignup}
                className="w-full mt-4 h-12 rounded-xl bg-[#F26A1B] font-bold text-white hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer shadow-md shadow-[#F26A1B]/20"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{isLogin ? 'Entrar na plataforma' : 'Criar conta de elite'}</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* VIEW: FORGOT PASSWORD */}
          {view === 'forgot' && (
            <form onSubmit={(e) => { playWhoosh(); handleForgotPassword(e); }} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider block">E-mail de recuperação</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-3" />
                  <input
                    id="input-forgot-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@zelos.com"
                    className="z-input !pl-12 !h-12 text-sm focus:border-[#F26A1B] focus:ring-2 focus:ring-[#F26A1B]/15 num"
                  />
                </div>
              </div>

              <button
                id="btn-forgot-submit"
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-[#F26A1B] font-bold text-white hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer shadow-md shadow-[#F26A1B]/20"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Enviar código</span>
                    <Mail className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setView('otp'); setError(null); setSuccessMessage(null); playWhoosh(); }}
                  className="w-full text-xs text-[#F26A1B] hover:opacity-90 font-semibold transition-colors cursor-pointer text-center"
                >
                  Já tenho um código de 6 dígitos
                </button>
                
                <button
                  type="button"
                  onClick={() => { setView('auth'); setError(null); setSuccessMessage(null); playWhoosh(); }}
                  className="w-full text-xs text-ink-3 hover:text-ink transition-colors cursor-pointer text-center"
                >
                  Voltar para o login
                </button>
              </div>
            </form>
          )}

          {/* VIEW: OTP CODE ENTRY */}
          {view === 'otp' && (
            <form onSubmit={(e) => { playWhoosh(); handleVerifyOtp(e); }} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider block text-center">Código de 6 dígitos</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-3" />
                  <input
                    id="input-otp-code"
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="z-input !h-14 text-center text-xl num tracking-[0.5em] font-bold focus:border-[#F26A1B] focus:ring-2 focus:ring-[#F26A1B]/15"
                  />
                </div>
                <p className="text-xs text-ink-3 leading-relaxed text-center">
                  Insira o código enviado para <span className="text-ink-2 font-semibold num">{email || 'seu e-mail'}</span>
                </p>
              </div>

              <button
                id="btn-otp-submit"
                type="submit"
                disabled={loading || otpCode.length < 6}
                className="w-full h-12 rounded-xl bg-[#F26A1B] font-bold text-white hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer shadow-md shadow-[#F26A1B]/20"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Validar código</span>
                    <Check className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setView('forgot'); setError(null); setSuccessMessage(null); playWhoosh(); }}
                className="w-full text-xs text-ink-3 hover:text-ink transition-colors cursor-pointer text-center"
              >
                Não recebi o código
              </button>
            </form>
          )}

          {/* VIEW: RESET PASSWORD */}
          {view === 'reset' && (
            <form onSubmit={(e) => { playWhoosh(); handleResetPassword(e); }} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider block">Nova senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-3" />
                  <input
                    id="input-reset-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Senha forte necessária"
                    className="z-input !pl-12 !pr-12 !h-12 text-sm focus:border-[#F26A1B] focus:ring-2 focus:ring-[#F26A1B]/15 num"
                  />
                  <button
                    type="button"
                    onClick={() => { setShowPassword(!showPassword); playWhoosh(); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <PasswordRequirements criteria={passwordCriteria} />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-ink-3 uppercase tracking-wider block">Confirmar nova senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink-3" />
                  <input
                    id="input-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="z-input !pl-12 !pr-12 !h-12 text-sm focus:border-[#F26A1B] focus:ring-2 focus:ring-[#F26A1B]/15 num"
                  />
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-[10px] text-danger font-medium mt-1">As senhas não coincidem</p>
                )}
              </div>

              <button
                id="btn-reset-submit"
                type="submit"
                disabled={loading || !canSubmitReset}
                className="w-full h-12 rounded-xl bg-[#F26A1B] font-bold text-white hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer shadow-md shadow-[#F26A1B]/20"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Definir nova senha</span>
                    <Check className="w-4 h-4" />
                  </>
                )}
              </button>

              {error && (error.includes('expirado') || error.includes('inválido')) && (
                <button
                  type="button"
                  onClick={() => { setView('forgot'); setError(null); playWhoosh(); }}
                  className="w-full text-xs text-ink-3 hover:text-[#F26A1B] transition-colors mt-4 cursor-pointer font-medium text-center"
                >
                  Voltar para solicitar novo link
                </button>
              )}
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
