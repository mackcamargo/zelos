import React, { useState } from 'react';
import { authService, isSupabaseConfigured } from '../lib/supabase';
import { PapelUsuario, TipoAvatar } from '../types';
import { Eye, EyeOff, Dumbbell, User, Sparkles, Mail, Lock, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthProps {
  onAuthSuccess: (user: any) => void;
  initialRecoveryMode?: boolean;
  onRecoveryComplete?: () => void;
}

export default function Auth({ onAuthSuccess, initialRecoveryMode = false, onRecoveryComplete }: AuthProps) {
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

  React.useEffect(() => {
    const recoveryError = localStorage.getItem('zenite_recovery_error');
    if (recoveryError) {
      setView('forgot');
      setError(recoveryError);
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
        setError(resetError.message);
      } else {
        setSuccessMessage('Se este e-mail estiver cadastrado, enviamos um link ou código de recuperação. Verifique sua caixa de entrada.');
        // Transição automática para o campo de código para facilitar
        setTimeout(() => {
          setView('otp');
          setSuccessMessage(null);
        }, 3000);
      }
    } catch (err: any) {
      setError(err?.message || 'Ocorreu um erro ao enviar o e-mail de recuperação.');
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
        setError(verifyError.message);
      } else {
        setView('reset');
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao validar o código.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (newPassword.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
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
        setError(updateError.message);
      } else {
        setSuccessMessage('Senha alterada com sucesso! Você já pode entrar na sua conta.');
        setTimeout(() => {
          setView('auth');
          setIsLogin(true);
          onRecoveryComplete?.();
        }, 2000);
      }
    } catch (err: any) {
      setError(err?.message || 'Ocorreu um erro ao alterar a senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error: authError } = await authService.signIn(email, password);
        if (authError) {
          setError(authError.message);
        } else if (data?.user) {
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
          setError(authError.message);
        } else if (data?.user) {
          // Se for aluno e cadastro novo, mostra boas-vindas
          if (papel === 'aluno') {
            setPendingUser(data.user);
            setShowWelcomeModal(true);
          } else {
            // E-mail desligado: entra direto
            onAuthSuccess(data.user);
          }
        } else {
          setError('Não foi possível criar a conta. Tente novamente.');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartApp = () => {
    if (pendingUser) {
      onAuthSuccess(pendingUser);
    }
  };

  return (
    <div id="auth-container" className="min-h-screen bg-void flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Welcome Modal for Students */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-sm bg-surface border border-white/10 rounded-xl p-8 relative overflow-hidden"
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
                className="w-full py-4 px-6 rounded-lg bg-[#F26A1B] hover:bg-[#FF7A2B] text-white font-semibold text-base transition-all active:scale-[0.98]"
              >
                Começar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Decorative ambient background glows */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#F26A1B]/5 blur-3xl pointer-events-none rounded-full" />

      {/* Main card */}
      <div className="w-full max-w-md bg-surface border border-white/5 rounded-xl p-8 relative z-10">
        {/* Wordmark Logo */}
        <div className="text-center mb-8">
          <span className="font-semibold text-[28px] tracking-tight select-none">
            ZE<span className="brand-gradient-text">LOS</span>
          </span>
          <p className="text-ink-2 font-sans font-normal text-sm mt-3 tracking-normal">
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
          <div className="grid grid-cols-2 bg-void/80 p-1 rounded-lg mb-8 border border-white/5">
            <button
              id="tab-login"
              type="button"
              onClick={() => { setIsLogin(true); setError(null); }}
              className={`py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                isLogin 
                  ? 'bg-surface-3 text-ink' 
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              Entrar
            </button>
            <button
              id="tab-signup"
              type="button"
              onClick={() => { setIsLogin(false); setError(null); }}
              className={`py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                !isLogin 
                  ? 'bg-surface-3 text-ink' 
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              Cadastrar
            </button>
          </div>
        )}

        {/* Demo Credentials Hint if in Login & Demo mode */}
        {view === 'auth' && isLogin && !isSupabaseConfigured && (
          <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/5 text-xs text-ink-2">
            <span className="font-semibold text-[#F26A1B] block mb-1">Modo demo ativo</span>
            <p className="mb-1">Utilize qualquer e-mail e senha para testar. Sugestões:</p>
            <ul className="list-disc pl-4 space-y-1 text-[12px]">
              <li>Personal: <span className="text-ink num">personal@zelos.com</span></li>
              <li>Aluno: <span className="text-ink num">aluno@zelos.com</span></li>
            </ul>
          </div>
        )}

        {/* Error and Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-ember/10 border border-ember/20 rounded-lg text-sm text-ember/90 font-sans">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400 font-sans flex items-start gap-3">
            <Check className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {view === 'auth' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sign Up Fields */}
            {!isLogin && (
              <>
                {isConviteLocked && (
                  <div className="p-3 bg-white/5 border border-white/5 rounded-lg text-xs text-ink-2 flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-[#F26A1B] shrink-0" />
                    <span>Você está se cadastrando como Aluno via link de convite.</span>
                  </div>
                )}

                {/* Full Name */}
                <div className="space-y-2">
                  <label className="text-[12px] font-medium text-ink-3 block">Nome completo</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-3" />
                    <input
                      id="input-name"
                      type="text"
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Como prefere ser chamado"
                      className="w-full bg-void border border-white/5 focus:border-white/10 rounded-lg py-4 pl-12 pr-4 text-sm text-ink placeholder-ink-3 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Profile/Role selector */}
                <div className="space-y-2">
                  <label className="text-[12px] font-medium text-ink-3 block">Quem é você?</label>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Personal Trainer Card */}
                    <button
                      id="role-personal"
                      type="button"
                      disabled={isConviteLocked}
                      onClick={() => setPapel('personal')}
                      className={`p-4 rounded-lg border text-left flex flex-col items-start transition-all duration-300 ${
                        papel === 'personal'
                          ? 'bg-surface-3 border-[#F26A1B]'
                          : 'bg-void border-white/5 hover:border-white/10'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      <Dumbbell className={`w-6 h-6 mb-2 ${papel === 'personal' ? 'text-flame' : 'text-ink-3'}`} />
                      <span className="font-semibold text-sm text-ink">Sou personal</span>
                      <span className="text-[12px] text-ink-2 mt-1 leading-relaxed">Gerencie alunos e treinos</span>
                    </button>

                    {/* Student/Aluno Card */}
                    <button
                      id="role-aluno"
                      type="button"
                      disabled={isConviteLocked}
                      onClick={() => setPapel('aluno')}
                      className={`p-4 rounded-lg border text-left flex flex-col items-start transition-all duration-300 ${
                        papel === 'aluno'
                          ? 'bg-surface-3 border-[#F26A1B]'
                          : 'bg-void border-white/5 hover:border-white/10'
                      } disabled:opacity-75`}
                    >
                      <User className={`w-6 h-6 mb-2 ${papel === 'aluno' ? 'text-[#F26A1B]' : 'text-ink-3'}`} />
                      <span className="font-semibold text-sm text-ink">Sou aluno</span>
                      <span className="text-[12px] text-ink-2 mt-1 leading-relaxed">Acompanhe sua ativação</span>
                    </button>
                  </div>
                </div>

                {/* Avatar Type Selector */}
                <div className="space-y-2">
                  <label className="text-[12px] font-medium text-ink-3 block">Estilo do avatar</label>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Male Card */}
                    <button
                      id="avatar-masculino"
                      type="button"
                      onClick={() => setAvatarTipo('masculino')}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        avatarTipo === 'masculino'
                          ? 'bg-surface-3 border-white/20 text-ink font-semibold'
                          : 'bg-void border-white/5 text-ink-2 hover:border-white/10'
                      }`}
                    >
                      <span className="text-xs">Masculino</span>
                    </button>

                    {/* Female Card */}
                    <button
                      id="avatar-feminino"
                      type="button"
                      onClick={() => setAvatarTipo('feminino')}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        avatarTipo === 'feminino'
                          ? 'bg-surface-3 border-white/20 text-ink font-semibold'
                          : 'bg-void border-white/5 text-ink-2 hover:border-white/10'
                      }`}
                    >
                      <span className="text-xs">Feminino</span>
                    </button>
                  </div>
                </div>

                {/* Optional invitation code for students */}
                {papel === 'aluno' && (
                  <div className="space-y-2">
                    <label className="text-[12px] font-medium text-ink-3 block">
                      Código do personal <span className="text-ink-3 text-[12px] font-sans lowercase italic">({isConviteLocked ? 'travado' : 'opcional'})</span>
                    </label>
                    <input
                      id="input-codigo-convite"
                      type="text"
                      value={codigoConvite}
                      onChange={(e) => setCodigoConvite(e.target.value.toUpperCase())}
                      disabled={isConviteLocked}
                      placeholder="Ex: ZEN-DEMO-123"
                      className="w-full bg-void border border-white/5 focus:border-white/10 rounded-lg py-4 px-4 text-sm text-ink placeholder-ink-3 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed num"
                    />
                    <p className="text-[12px] text-ink-3 font-sans leading-relaxed">
                      {isConviteLocked 
                        ? 'Este código de convite vincula você automaticamente ao seu Personal Trainer após criar sua conta.' 
                        : 'Insira o código enviado pelo seu Personal Trainer para se vincular instantaneamente a ele. No modo Demo, use ZEN-DEMO-123.'
                      }
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Email */}
            <div className="space-y-2">
              <label className="text-[12px] font-medium text-ink-3 block">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-3" />
                <input
                  id="input-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@zelos.com"
                  className="w-full bg-void border border-white/5 focus:border-white/10 rounded-lg py-4 pl-12 pr-4 text-sm text-ink placeholder-ink-3 outline-none transition-all num"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[12px] font-medium text-ink-3">Senha</label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => { setView('forgot'); setError(null); setSuccessMessage(null); }}
                    className="text-[12px] text-ink-3 hover:text-[#F26A1B] transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-3" />
                <input
                  id="input-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-void border border-white/5 focus:border-white/10 rounded-lg py-4 pl-12 pr-12 text-sm text-ink placeholder-ink-3 outline-none transition-all num"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="btn-auth-submit"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-4 px-6 rounded-lg bg-[#F26A1B] font-semibold text-ink hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-ink border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'Entrar na plataforma' : 'Criar conta de elite'}</span>
                  <Sparkles className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* VIEW: FORGOT PASSWORD */}
        {view === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[12px] font-medium text-ink-3 block">E-mail de recuperação</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-3" />
                <input
                  id="input-forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@zelos.com"
                  className="w-full bg-void border border-white/5 focus:border-white/10 rounded-lg py-4 pl-12 pr-4 text-sm text-ink placeholder-ink-3 outline-none transition-all num"
                />
              </div>
            </div>

            <button
              id="btn-forgot-submit"
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 rounded-lg bg-[#F26A1B] font-semibold text-ink hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-ink border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Enviar link ou código</span>
                  <Mail className="w-5 h-5" />
                </>
              )}
            </button>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => { setView('otp'); setError(null); setSuccessMessage(null); }}
                className="w-full text-[12px] text-[#F26A1B] hover:text-ink transition-colors"
              >
                Já tenho um código de 6 dígitos
              </button>
              
              <button
                type="button"
                onClick={() => { setView('auth'); setError(null); setSuccessMessage(null); }}
                className="w-full text-[12px] text-ink-3 hover:text-ink transition-colors"
              >
                Voltar para o login
              </button>
            </div>
          </form>
        )}

        {/* VIEW: OTP CODE ENTRY */}
        {view === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[12px] font-medium text-ink-3 block">Código de 6 dígitos</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-3" />
                <input
                  id="input-otp-code"
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full bg-void border border-white/5 focus:border-white/10 rounded-lg py-4 pl-12 pr-4 text-center text-xl num tracking-[0.5em] text-ink placeholder-ink-3 outline-none transition-all font-semibold"
                />
              </div>
              <p className="text-[12px] text-ink-3 font-sans leading-relaxed text-center">
                Insira o código enviado para <span className="text-ink-2 num">{email || 'seu e-mail'}</span>
              </p>
            </div>

            <button
              id="btn-otp-submit"
              type="submit"
              disabled={loading || otpCode.length < 6}
              className="w-full py-4 px-6 rounded-lg bg-[#F26A1B] font-semibold text-ink hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-ink border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Validar código</span>
                  <Check className="w-5 h-5" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setView('forgot'); setError(null); setSuccessMessage(null); }}
              className="w-full text-[12px] text-ink-3 hover:text-ink transition-colors"
            >
              Não recebi o código
            </button>
          </form>
        )}

        {/* VIEW: RESET PASSWORD */}
        {view === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[12px] font-medium text-ink-3 block">Nova senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-3" />
                <input
                  id="input-reset-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full bg-void border border-white/5 focus:border-white/10 rounded-lg py-4 pl-12 pr-12 text-sm text-ink placeholder-ink-3 outline-none transition-all num"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-medium text-ink-3 block">Confirmar nova senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-3" />
                <input
                  id="input-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full bg-void border border-white/5 focus:border-white/10 rounded-lg py-4 pl-12 pr-12 text-sm text-ink placeholder-ink-3 outline-none transition-all num"
                />
              </div>
            </div>

            <button
              id="btn-reset-submit"
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 rounded-lg bg-[#F26A1B] font-semibold text-ink hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-ink border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Definir nova senha</span>
                  <Check className="w-5 h-5" />
                </>
              )}
            </button>

            {error && (error.includes('expirado') || error.includes('inválido')) && (
              <button
                type="button"
                onClick={() => { setView('forgot'); setError(null); }}
                className="w-full text-[12px] text-ink-3 hover:text-[#F26A1B] transition-colors mt-4"
              >
                Voltar para solicitar novo link
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
