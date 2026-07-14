import React, { useState } from 'react';
import { authService, isSupabaseConfigured } from '../lib/supabase';
import { PapelUsuario, TipoAvatar } from '../types';
import { Eye, EyeOff, Dumbbell, User, Sparkles, Mail, Lock, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthProps {
  onAuthSuccess: (user: any) => void;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [papel, setPapel] = useState<PapelUsuario>('personal');
  const [avatarTipo, setAvatarTipo] = useState<TipoAvatar>('masculino');
  const [codigoConvite, setCodigoConvite] = useState('');
  const [isConviteLocked, setIsConviteLocked] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
          // E-mail desligado: entra direto
          onAuthSuccess(data.user);
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

  return (
    <div id="auth-container" className="min-h-screen bg-void flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-gradient-to-b from-[#F5334F]/10 via-[#FF6A2B]/5 to-transparent blur-3xl pointer-events-none rounded-full" />
      <div className="absolute bottom-[-100px] left-1/4 w-[300px] h-[300px] bg-[#7B6CF6]/5 blur-3xl pointer-events-none rounded-full" />

      {/* Main card */}
      <div className="w-full max-w-md bg-surface border border-white/5 rounded-3xl p-8 relative z-10 shadow-[0_30px_100px_rgba(0,0,0,0.8)]">
        {/* Wordmark Logo */}
        <div className="text-center mb-8">
          <span className="font-display font-extrabold text-5xl tracking-tight select-none">
            ZÊNI<span className="brand-gradient-text">TE</span>
          </span>
          <p className="text-ink-2 font-sans font-light text-sm mt-3 tracking-wide">
            {isLogin 
              ? 'Ative o seu potencial máximo' 
              : 'Faça parte da elite do treinamento'
            }
          </p>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 bg-void/80 p-1.5 rounded-2xl mb-8 border border-white/5">
          <button
            id="tab-login"
            type="button"
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`py-3 text-sm font-medium rounded-xl transition-all duration-300 ${
              isLogin 
                ? 'bg-surface-3 text-ink shadow-sm' 
                : 'text-ink-2 hover:text-ink'
            }`}
          >
            Entrar
          </button>
          <button
            id="tab-signup"
            type="button"
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`py-3 text-sm font-medium rounded-xl transition-all duration-300 ${
              !isLogin 
                ? 'bg-surface-3 text-ink shadow-sm' 
                : 'text-ink-2 hover:text-ink'
            }`}
          >
            Cadastrar
          </button>
        </div>

        {/* Demo Credentials Hint if in Login & Demo mode */}
        {isLogin && !isSupabaseConfigured && (
          <div className="mb-6 p-4 bg-violet/10 rounded-2xl border border-violet/20 text-xs text-ink-2">
            <span className="font-semibold text-violet block mb-1">💡 MODO DEMO ATIVO</span>
            <p className="mb-1">Utilize qualquer e-mail e senha para testar. Sugestões:</p>
            <ul className="list-disc pl-4 space-y-1 font-mono text-[10px]">
              <li>Personal: <span className="text-ink">personal@zenite.com</span></li>
              <li>Aluno: <span className="text-ink">aluno@zenite.com</span></li>
            </ul>
          </div>
        )}

        {/* Error and Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-ember/10 border border-ember/20 rounded-2xl text-sm text-ember/90 font-sans">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-sm text-emerald-400 font-sans flex items-start gap-3">
            <Check className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sign Up Fields */}
          {!isLogin && (
            <>
              {isConviteLocked && (
                <div className="p-3 bg-violet/10 border border-violet/20 rounded-2xl text-xs text-ink-2 flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-violet shrink-0" />
                  <span>Você está se cadastrando como Aluno via link de convite.</span>
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-ink-3 block">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-3" />
                  <input
                    id="input-name"
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Como prefere ser chamado"
                    className="w-full bg-void border border-white/5 focus:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-ink placeholder-ink-3 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Profile/Role selector */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-ink-3 block">Quem é você?</label>
                <div className="grid grid-cols-2 gap-4">
                  {/* Personal Trainer Card */}
                  <button
                    id="role-personal"
                    type="button"
                    disabled={isConviteLocked}
                    onClick={() => setPapel('personal')}
                    className={`p-4 rounded-2xl border text-left flex flex-col items-start transition-all duration-300 ${
                      papel === 'personal'
                        ? 'bg-surface-3 border-flame shadow-[0_0_15px_rgba(255,106,43,0.15)]'
                        : 'bg-void border-white/5 hover:border-white/10'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <Dumbbell className={`w-6 h-6 mb-2 ${papel === 'personal' ? 'text-flame' : 'text-ink-3'}`} />
                    <span className="font-display font-semibold text-sm text-ink">Sou Personal</span>
                    <span className="text-[10px] text-ink-2 mt-1 leading-relaxed">Gerencie alunos e treinos</span>
                  </button>

                  {/* Student/Aluno Card */}
                  <button
                    id="role-aluno"
                    type="button"
                    disabled={isConviteLocked}
                    onClick={() => setPapel('aluno')}
                    className={`p-4 rounded-2xl border text-left flex flex-col items-start transition-all duration-300 ${
                      papel === 'aluno'
                        ? 'bg-surface-3 border-violet shadow-[0_0_15px_rgba(123,108,246,0.15)]'
                        : 'bg-void border-white/5 hover:border-white/10'
                    } disabled:opacity-75`}
                  >
                    <User className={`w-6 h-6 mb-2 ${papel === 'aluno' ? 'text-violet' : 'text-ink-3'}`} />
                    <span className="font-display font-semibold text-sm text-ink">Sou Aluno</span>
                    <span className="text-[10px] text-ink-2 mt-1 leading-relaxed">Acompanhe sua ativação</span>
                  </button>
                </div>
              </div>

              {/* Avatar Type Selector */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-ink-3 block">Estilo do Avatar</label>
                <div className="grid grid-cols-2 gap-4">
                  {/* Male Card */}
                  <button
                    id="avatar-masculino"
                    type="button"
                    onClick={() => setAvatarTipo('masculino')}
                    className={`p-3 rounded-2xl border text-center transition-all ${
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
                    className={`p-3 rounded-2xl border text-center transition-all ${
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
                  <label className="text-xs font-mono uppercase tracking-wider text-ink-3 block">
                    Código do Personal <span className="text-ink-3 text-[10px] font-sans lowercase italic">({isConviteLocked ? 'travado' : 'opcional'})</span>
                  </label>
                  <input
                    id="input-codigo-convite"
                    type="text"
                    value={codigoConvite}
                    onChange={(e) => setCodigoConvite(e.target.value.toUpperCase())}
                    disabled={isConviteLocked}
                    placeholder="Ex: ZEN-DEMO-123"
                    className="w-full bg-void border border-white/5 focus:border-white/10 rounded-2xl py-4 px-4 text-sm font-mono text-ink placeholder-ink-3 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <p className="text-[10px] text-ink-3 font-sans leading-relaxed">
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
            <label className="text-xs font-mono uppercase tracking-wider text-ink-3 block">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-3" />
              <input
                id="input-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@zenite.com"
                className="w-full bg-void border border-white/5 focus:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-ink placeholder-ink-3 outline-none transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-mono uppercase tracking-wider text-ink-3">Senha</label>
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
                className="w-full bg-void border border-white/5 focus:border-white/10 rounded-2xl py-4 pl-12 pr-12 text-sm text-ink placeholder-ink-3 outline-none transition-all"
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
            className="w-full mt-2 py-4 px-6 rounded-2xl brand-gradient-bg font-display font-semibold text-void hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(245,51,79,0.3)] disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-void border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{isLogin ? 'Entrar na Plataforma' : 'Criar Conta de Elite'}</span>
                <Sparkles className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
