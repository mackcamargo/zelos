import React, { useState, useEffect } from 'react';
import { dbService, authService } from '../lib/supabase';
import { Aluno, Profile } from '../types';
import { Users, BookOpen, User, LogOut, Plus, Sparkles, Target, Activity, Calendar, ShieldCheck, FolderHeart, MessageSquare, Menu, X, ChevronLeft, ChevronRight, Volume2, VolumeX, CreditCard, AlertCircle, Camera, Trash2, Loader2 } from 'lucide-react';
import Biblioteca from './Biblioteca';
import GerenciarExercicios from './GerenciarExercicios';
import GerenciarCortesias from './GerenciarCortesias';
import GerenciarAgendaPersonal from './GerenciarAgendaPersonal';
import GerenciarAlunos from './GerenciarAlunos';
import GerenciarTemplates from './GerenciarTemplates';
import GerenciarCheckins from './GerenciarCheckins';
import { DashPersonalBemEstar } from './DashPersonalBemEstar';
import ChatPersonal from './ChatPersonal';
import PlanosArea from './PlanosArea';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { tocar, getSomHabilitado, setSomHabilitado } from '../lib/som';
import { SubscriptionProvider, useSubscription } from '../contexts/SubscriptionContext';
import { useTheme } from '../contexts/ThemeContext';
import LogoZelos from './LogoZelos';

interface PersonalAreaProps {
  userId: string;
  userEmail: string;
  profile: Profile;
  onLogout: () => void;
  isDemoMode: boolean;
  onProfileUpdate?: () => void;
}

const resizeImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 512;
        const MAX_HEIGHT = 512;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: "image/jpeg",
              lastModified: Date.now()
            });
            resolve(resizedFile);
          } else {
            resolve(file);
          }
        }, "image/jpeg", 0.8);
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

type TabType = 'dashboard' | 'alunos' | 'exercicios' | 'agenda' | 'checkins' | 'templates' | 'perfil' | 'gerenciar' | 'chat' | 'planos' | 'cortesias';

function PersonalAreaContent({ userId, userEmail, profile, onLogout, isDemoMode, onProfileUpdate }: PersonalAreaProps) {
  const isAdmin = userId === 'fdcb50c9-9057-4922-b2f8-c6093d6941f4';
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [agendaPendingCount, setAgendaPendingCount] = useState<number>(0);
  const [checkinsPendingCount, setCheckinsPendingCount] = useState<number>(0);
  const [somHabilitado, setSomLocal] = useState(getSomHabilitado());

  const [selectedAlunoIdForFicha, setSelectedAlunoIdForFicha] = useState<string | null>(null);
  const [selectedAlunoIdForChat, setSelectedAlunoIdForChat] = useState<string | null>(null);

  const { assinatura, loading, isReadOnly, daysRemaining } = useSubscription();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const tabLabels: Record<TabType, string> = {
      dashboard: 'Dashboard',
      alunos: 'Alunos',
      exercicios: 'Exercícios',
      agenda: 'Agenda',
      checkins: 'Check-ins',
      templates: 'Modelos de Treino',
      perfil: 'Meu Perfil',
      gerenciar: 'Configurações',
      chat: 'Mensagens',
      planos: 'Planos',
      cortesias: 'Cortesias',
    };
    const label = tabLabels[activeTab] || 'Área do Personal';
    document.title = `Zelos Personal · ${label}`;
    return () => {
      document.title = 'Zelos Personal';
    };
  }, [activeTab]);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('A imagem é muito grande. Escolha uma imagem de até 5MB.');
      return;
    }

    setUploadingAvatar(true);
    try {
      const compressedFile = await resizeImage(file);
      const { publicUrl, error: uploadErr } = await dbService.uploadAvatar(userId, compressedFile);
      if (uploadErr) {
        throw uploadErr;
      }

      const { error: dbErr } = await dbService.updateProfileAvatar(userId, publicUrl);
      if (dbErr) {
        throw dbErr;
      }

      showToast('Foto de perfil atualizada com sucesso!');
      if (onProfileUpdate) {
        onProfileUpdate();
      }
    } catch (err) {
      console.error('Erro ao fazer upload da foto de perfil:', err);
      showToast('Não foi possível enviar a foto, tente novamente.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!window.confirm('Deseja realmente remover sua foto de perfil?')) return;
    
    setUploadingAvatar(true);
    try {
      const { error: dbErr } = await dbService.updateProfileAvatar(userId, null);
      if (dbErr) {
        throw dbErr;
      }

      showToast('Foto de perfil removida com sucesso!');
      if (onProfileUpdate) {
        onProfileUpdate();
      }
    } catch (err) {
      console.error('Erro ao remover foto de perfil:', err);
      showToast('Não foi possível remover a foto, tente novamente.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    const handleTabChangeScroll = (e: any) => {
      if (e.detail) {
        setActiveTab(e.detail);
      }
    };
    window.addEventListener('changeTab', handleTabChangeScroll);
    return () => window.removeEventListener('changeTab', handleTabChangeScroll);
  }, []);

  useEffect(() => {
    if (activeTab === 'cortesias' && !isAdmin) {
      setActiveTab('dashboard');
    }
  }, [activeTab, isAdmin]);

  const toggleSom = () => {
    const novo = !somHabilitado;
    setSomLocal(novo);
    setSomHabilitado(novo);
    tocar('tap');
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    tocar('tap');
    if (isMobileOpen) setIsMobileOpen(false);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Sparkles },
    { id: 'alunos', label: 'Alunos', icon: Users },
    { id: 'exercicios', label: 'Treinos', icon: Activity },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'checkins', label: 'Check-ins', icon: MessageSquare },
    { id: 'templates', label: 'Modelos', icon: FolderHeart },
    { id: 'chat', label: 'Mensagens', icon: MessageSquare },
    { id: 'planos', label: 'Assinatura', icon: CreditCard },
    { id: 'perfil', label: 'Perfil', icon: User },
    ...(isAdmin ? [{ id: 'cortesias', label: 'Cortesias', icon: ShieldCheck }] : []),
  ];

  const getPlanoLabel = (plano: string | null | undefined) => {
    if (!plano) return "Sem plano ativo";
    const p = plano.toLowerCase();
    switch (p) {
      case 'basico':
        return "Plano Básico";
      case 'pro':
        return "Plano Pro";
      case 'ilimitado':
        return "Plano Ilimitado";
      case 'cortesia':
        return "Cortesia";
      case 'trial':
        return "Plano Teste";
      default:
        return `Plano ${plano.charAt(0).toUpperCase() + plano.slice(1)}`;
    }
  };

  const getPlanoStyles = (plano: string | null | undefined) => {
    if (!plano) return "bg-zinc-500/10 border border-zinc-500/20 text-zinc-400";
    return "bg-[#F26A1B]/10 border border-[#F26A1B]/20 text-[#F26A1B]";
  };

  const getStatusBadge = (status: string | null | undefined, plano: string | null | undefined) => {
    const s = status ? status.toLowerCase() : '';
    const p = plano ? plano.toLowerCase() : '';

    if (p === 'cortesia') {
      return {
        label: "Cortesia ativa",
        className: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
      };
    }

    if (s === 'ativa') {
      return {
        label: "Assinatura ativa",
        className: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
      };
    }

    if (s === 'trial') {
      return {
        label: "Em teste",
        className: "bg-amber-500/10 border border-amber-500/20 text-amber-400"
      };
    }

    return {
      label: "Assinatura inativa",
      className: "bg-red-500/10 border border-red-500/20 text-red-400"
    };
  };

  useEffect(() => {
    const fetchUnreads = async () => {
      const { data } = await dbService.getPersonalUnreadCount(userId);
      setUnreadCount(Math.max(0, Number(data) || 0));
    };

    const fetchPendingCounts = async () => {
      if (!isSupabaseConfigured || !supabase) return;

      // 1. Agenda Pending
      const { count: agendaCount } = await supabase
        .from("agendamentos")
        .select("id", { count: "exact", head: true })
        .eq("personal_id", userId)
        .eq("status", "solicitado");
      
      setAgendaPendingCount(Math.max(0, Number(agendaCount) || 0));

      // 2. Check-ins Pending (Attention needed)
      const getMonday = () => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday.toISOString().split('T')[0];
      };

      const segundaFeiraAtual = getMonday();
      const { data: checkinsData } = await supabase
        .from("checkins")
        .select("energia, qualidade_sono, nivel_estresse, dores")
        .eq("personal_id", userId)
        .eq("semana", segundaFeiraAtual);

      if (checkinsData) {
        const attentionCount = checkinsData.filter(c => 
          (c.dores && c.dores.trim() !== '') || 
          c.energia <= 2 || 
          c.qualidade_sono <= 2 || 
          c.nivel_estresse >= 4
        ).length;
        setCheckinsPendingCount(Math.max(0, Number(attentionCount) || 0));
      }
    };

    fetchUnreads();
    fetchPendingCounts();

    window.addEventListener('zenite_mensagem_enviada', fetchUnreads);
    window.addEventListener('zenite_mensagem_lida', fetchUnreads);
    window.addEventListener('zenite_agenda_updated', fetchPendingCounts);
    window.addEventListener('zenite_checkin_updated', fetchPendingCounts);

    let canal: any = null;
    if (isSupabaseConfigured && supabase) {
      canal = supabase.channel('personal-notifications')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'mensagens', filter: `personal_id=eq.${userId}` },
          () => {
            fetchUnreads();
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'agendamentos', filter: `personal_id=eq.${userId}` },
          () => {
            fetchPendingCounts();
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'checkins', filter: `personal_id=eq.${userId}` },
          () => {
            fetchPendingCounts();
          }
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener('zenite_mensagem_enviada', fetchUnreads);
      window.removeEventListener('zenite_mensagem_lida', fetchUnreads);
      window.removeEventListener('zenite_agenda_updated', fetchPendingCounts);
      window.removeEventListener('zenite_checkin_updated', fetchPendingCounts);
      if (canal) {
        supabase.removeChannel(canal);
      }
    };
  }, [userId, activeTab]);

  // BLOQUEIO TOTAL: assinatura inativa (trial expirado, cancelada ou vencida).
  // O personal não navega mais pelo app — só vê a tela de reativação e pode sair.
  if (!loading && isReadOnly) {
    return (
      <div className="min-h-screen bg-void text-ink font-sans overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <LogoZelos size="sm" />
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 text-sm text-ink-2 hover:text-ink px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>

          <div className="max-w-2xl mx-auto text-center mb-10 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500" strokeWidth={1.75} />
            </div>
            <h1 className="font-display font-bold text-2xl text-ink">
              Sua assinatura não está ativa
            </h1>
            <p className="text-sm text-ink-2 leading-relaxed">
              Para voltar a acessar seus alunos, treinos e todo o restante do app,
              escolha um plano abaixo e reative sua conta. Enquanto a assinatura estiver
              inativa, o acesso fica bloqueado — inclusive para os seus alunos.
            </p>
          </div>

          <PlanosArea userEmail={userEmail} />
        </div>
      </div>
    );
  }

  return (
    <div
      id="personal-area-root"
      className="bg-bg text-ink font-sans flex h-screen overflow-hidden"
    >
      
      {/* SIDEBAR: Desktop */}
      <aside 
        id="desktop-sidebar"
        className={`hidden md:flex flex-col bg-surface border-r border-line h-screen sticky top-0 transition-all duration-300 z-30 shrink-0 ${
          isCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Top bar logo */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-4 border-b border-line/40 h-16 shrink-0`}>
          {isCollapsed ? (
            <button
              type="button"
              onClick={() => {
                setIsCollapsed(false);
                tocar('abrir');
              }}
              data-sem-som
              className="font-display font-black text-2xl tracking-tight text-accent hover:scale-110 transition-transform focus:outline-none cursor-pointer"
              title="Expandir menu"
            >
              Z
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleTabChange('dashboard')}
                data-sem-som
                className="hover:opacity-85 transition-opacity text-left focus:outline-none cursor-pointer"
              >
                <LogoZelos size="sm" />
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={toggleSom}
                  data-sem-som
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-raise text-ink-3 hover:text-ink transition-colors"
                  title={somHabilitado ? "Silenciar sons" : "Ativar sons"}
                >
                  {somHabilitado ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCollapsed(true);
                    tocar('fechar');
                  }}
                  data-sem-som
                  className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-raise transition-colors cursor-pointer"
                  title="Recolher menu"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Navigation links */}
        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <div key={item.id} className="relative group/tooltip">
                <button
                  type="button"
                  onClick={() => handleTabChange(item.id as TabType)}
                  data-sem-som
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center px-2' : 'px-4'
                  } py-3 gap-3 rounded-xl transition-all duration-200 relative group/btn cursor-pointer ${
                    isActive 
                      ? 'text-accent bg-accent/10 font-semibold' 
                      : 'text-ink-2 hover:text-ink hover:bg-raise/40'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-accent rounded-r-full" />
                  )}
                  <div className="relative">
                    <Icon className={`w-5 h-5 transition-transform duration-200 group-hover/btn:scale-105 ${
                      isActive ? 'text-accent' : 'text-ink-2 group-hover/btn:text-ink'
                    }`} />
                    {item.id === 'chat' && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full ring-2 ring-surface" />
                    )}
                    {item.id === 'agenda' && agendaPendingCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full ring-2 ring-surface" />
                    )}
                    {item.id === 'checkins' && checkinsPendingCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full ring-2 ring-surface" />
                    )}
                  </div>
                  {!isCollapsed && <span className="text-sm font-sans truncate">{item.label}</span>}
                  {!isCollapsed && item.id === 'chat' && unreadCount > 0 && (
                    <span className="ml-auto text-[9px] bg-accent text-white px-1.5 py-0.5 rounded-full font-semibold num">
                      {unreadCount}
                    </span>
                  )}
                  {!isCollapsed && item.id === 'agenda' && agendaPendingCount > 0 && (
                    <span className="ml-auto text-[9px] bg-accent text-white px-1.5 py-0.5 rounded-full font-semibold num">
                      {agendaPendingCount}
                    </span>
                  )}
                  {!isCollapsed && item.id === 'checkins' && checkinsPendingCount > 0 && (
                    <span className="ml-auto text-[9px] bg-accent text-white px-1.5 py-0.5 rounded-full font-semibold num">
                      {checkinsPendingCount}
                    </span>
                  )}
                </button>

                {/* Tooltip on Collapsed hover */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-raise border border-line text-xs font-semibold text-ink rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 whitespace-nowrap pointer-events-none shadow-xl">
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer profile & logout */}
        <div className="p-2 border-t border-line/40 shrink-0 relative group/footer">
          <button
            type="button"
            onClick={() => setActiveTab('perfil')}
            data-sem-som
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2' : 'p-2'
            } gap-3 text-left hover:bg-raise rounded-xl transition-all group/btn cursor-pointer`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full brand-gradient-bg p-[1px] shrink-0">
                <div className="w-full h-full rounded-full bg-raise flex items-center justify-center font-display font-bold text-ink text-xs overflow-hidden">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.nome} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    profile.nome.charAt(0).toUpperCase()
                  )}
                </div>
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink group-hover/btn:text-accent transition-colors truncate">
                    {profile.nome}
                  </p>
                </div>
              )}
            </div>
            
            {!isCollapsed && (
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onLogout();
                }}
                className="p-1.5 rounded-lg text-ink-3 hover:text-accent hover:bg-raise transition-colors shrink-0 ml-auto cursor-pointer"
                title="Sair da conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </button>

          {/* Footer Tooltip on Collapsed */}
          {isCollapsed && (
            <div className="absolute left-full ml-3 bottom-4 px-2.5 py-1.5 bg-raise border border-line text-xs font-semibold text-ink rounded-lg opacity-0 invisible group-hover/footer:opacity-100 group-hover/footer:visible transition-all duration-200 z-50 whitespace-nowrap pointer-events-none shadow-xl">
              {profile.nome} (Sair)
            </div>
          )}
        </div>
      </aside>

      {/* MOBILE DRAWER: Sidebar drawer */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-all duration-300 clicavel"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      <aside 
        id="mobile-sidebar"
        className={`fixed top-0 bottom-0 left-0 bg-surface border-r border-line w-60 z-50 transition-transform duration-300 md:hidden flex flex-col ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-line/40 h-16 shrink-0">
          <LogoZelos size="sm" />
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-raise transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav Items */}
        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id as TabType);
                  setIsMobileOpen(false);
                  tocar('tap');
                }}
                data-sem-som
                className={`w-full flex items-center px-4 py-3 gap-3 rounded-xl transition-all duration-200 relative cursor-pointer ${
                  isActive 
                    ? 'text-accent bg-accent/10 font-semibold' 
                    : 'text-ink-2 hover:text-ink hover:bg-raise/40'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-accent rounded-r-full" />
                )}
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-accent' : 'text-ink-2'}`} />
                  {item.id === 'chat' && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full ring-2 ring-surface" />
                  )}
                  {item.id === 'agenda' && agendaPendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full ring-2 ring-surface" />
                  )}
                  {item.id === 'checkins' && checkinsPendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full ring-2 ring-surface" />
                  )}
                </div>
                <span className="text-sm font-sans">{item.label}</span>
                {item.id === 'chat' && unreadCount > 0 && (
                  <span className="ml-auto text-[9px] bg-accent text-white px-1.5 py-0.5 rounded-full font-semibold num">
                    {unreadCount}
                  </span>
                )}
                {item.id === 'agenda' && agendaPendingCount > 0 && (
                  <span className="ml-auto text-[9px] bg-accent text-white px-1.5 py-0.5 rounded-full font-semibold num">
                    {agendaPendingCount}
                  </span>
                )}
                {item.id === 'checkins' && checkinsPendingCount > 0 && (
                  <span className="ml-auto text-[9px] bg-accent text-white px-1.5 py-0.5 rounded-full font-semibold num">
                    {checkinsPendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-line/40 shrink-0">
          <div className="w-full flex items-center justify-between gap-3 p-2 rounded-xl bg-raise/40">
            <button
              type="button"
              onClick={() => {
                setActiveTab('perfil');
                setIsMobileOpen(false);
              }}
              data-sem-som
              className="flex items-center gap-3 min-w-0 text-left cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full brand-gradient-bg p-[1px] shrink-0">
                <div className="w-full h-full rounded-full bg-raise flex items-center justify-center font-display font-semibold text-ink text-xs overflow-hidden">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.nome} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    profile.nome.charAt(0).toUpperCase()
                  )}
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink truncate">{profile.nome}</p>
              </div>
            </button>
            <button 
              type="button"
              onClick={onLogout}
              className="p-1.5 rounded-lg text-ink-3 hover:text-accent hover:bg-raise transition-colors shrink-0 cursor-pointer"
              title="Sair da conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Read-only Mode Banner */}
        {isReadOnly && (
          <div className="bg-red-500 text-white px-6 py-2 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 z-40 sticky top-0">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              <span className="text-[10px] sm:text-xs font-semibold text-center">
                Sua assinatura não está ativa. Você pode ver seus dados, mas não criar ou editar.
              </span>
            </div>
            <button 
              onClick={() => handleTabChange('planos')}
              className="px-3 py-1 bg-white text-red-500 text-[10px] font-semibold rounded-full hover:bg-ink-1 transition-colors whitespace-nowrap"
            >
              Reativar plano
            </button>
          </div>
        )}

        {/* Trial Ending Banner */}
        {!isReadOnly && assinatura?.status === 'trial' && daysRemaining <= 3 && (
          <div className="bg-amber text-void px-6 py-2 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 z-40 sticky top-0">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              <span className="text-[10px] sm:text-xs font-semibold text-center">
                Seu trial termina em {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}. Escolha um plano para continuar.
              </span>
            </div>
            <button 
              onClick={() => handleTabChange('planos')}
              className="px-3 py-1 bg-void text-white text-[10px] font-semibold rounded-full hover:bg-ink-dark transition-colors whitespace-nowrap"
            >
              Escolher plano
            </button>
          </div>
        )}
        {/* Top Header */}
        <header className="sticky top-0 bg-bg/90 backdrop-blur-md z-20 border-b border-line/40 py-4 px-4 sm:px-6 shrink-0">
          <div className="w-full flex justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              {/* Hamburger button on Mobile */}
              <button
                type="button"
                onClick={() => setIsMobileOpen(true)}
                className="md:hidden p-2 -ml-2 text-ink-2 hover:text-ink hover:bg-raise rounded-xl transition-all cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex flex-col md:flex-row md:items-baseline gap-x-3 gap-y-1">
                <h1 className="font-display font-semibold text-[28px] text-ink tracking-tight whitespace-nowrap leading-none">
                  {activeTab === 'dashboard' && `Olá, ${profile.nome.split(' ')[0]}`}
                  {activeTab === 'alunos' && 'Seus alunos'}
                  {activeTab === 'exercicios' && 'Exercícios'}
                  {activeTab === 'agenda' && 'Sua agenda'}
                  {activeTab === 'checkins' && 'Check-ins'}
                  {activeTab === 'templates' && 'Modelos de treino'}
                  {activeTab === 'chat' && 'Mensagens'}
                  {activeTab === 'perfil' && 'Seu perfil'}
                  {activeTab === 'gerenciar' && 'Gestão'}
                  {activeTab === 'cortesias' && 'Códigos de Cortesia'}
                </h1>
                <p className="text-sm text-ink-2 leading-none">
                  {activeTab === 'dashboard' && 'Aqui está o resumo dos seus alunos hoje'}
                  {activeTab === 'alunos' && 'Gerencie os alunos ativos e acompanhe os treinos'}
                  {activeTab === 'exercicios' && 'Explore a biblioteca de movimentos e treinos de referência'}
                  {activeTab === 'agenda' && 'Horários de atendimento e compromissos marcados'}
                  {activeTab === 'checkins' && 'Monitore as respostas semanais e feedbacks recebidos'}
                  {activeTab === 'templates' && 'Fichas pré-estruturadas para agilizar a prescrição'}
                  {activeTab === 'chat' && 'Converse com seus alunos e tire dúvidas em tempo real'}
                  {activeTab === 'perfil' && 'Gerencie seus dados cadastrais e assinatura'}
                  {activeTab === 'gerenciar' && 'Painel administrativo para adicionar e editar movimentos'}
                  {activeTab === 'cortesias' && 'Gerencie e distribua códigos de acesso gratuito para alunos'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold text-ink">{profile.nome}</span>
                <span className="text-[12px] text-ink-2">Personal</span>
              </div>
              <div className="w-9 h-9 rounded-full brand-gradient-bg p-[1px]">
                <div className="w-full h-full rounded-full bg-raise flex items-center justify-center font-display font-semibold text-ink text-sm overflow-hidden">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.nome} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    profile.nome.charAt(0).toUpperCase()
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main View Area */}
        <main className={`flex-1 w-full px-3 sm:px-6 overflow-y-auto ${
          activeTab === 'chat' ? 'pt-4 pb-4 flex flex-col min-h-0 overflow-hidden' : 'pt-8 pb-16'
        }`}>
        
        {/* TAB 0: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div id="tab-content-dashboard" className="space-y-6">
            <DashPersonalBemEstar 
              personalId={userId} 
              onSelectAluno={(id) => {
                setSelectedAlunoIdForFicha(id);
                setActiveTab('alunos');
              }}
              onSelectAlunoAndChat={(id) => {
                setSelectedAlunoIdForChat(id);
                setActiveTab('chat');
              }}
              onNavigateToTab={(tab) => {
                setActiveTab(tab);
              }}
              onUnauthorized={onLogout}
            />
          </div>
        )}

        {/* TAB 1: ALUNOS */}
        {activeTab === 'alunos' && (
          <div id="tab-content-alunos" className="space-y-6">
            <GerenciarAlunos 
              personalId={userId} 
              isReadOnly={isReadOnly} 
              initialSelectedAlunoId={selectedAlunoIdForFicha}
              onClearInitialSelected={() => setSelectedAlunoIdForFicha(null)}
            />
          </div>
        )}


        {/* TAB 2: EXERCICIOS */}
        {activeTab === 'exercicios' && (
          <div id="tab-content-exercicios" className="space-y-6">
            <Biblioteca personalId={userId} avatarTipo={profile.avatar_tipo} isReadOnly={isReadOnly} />
          </div>
        )}

        {/* TAB: AGENDA PERSONAL */}
        {activeTab === 'agenda' && (
          <div id="tab-content-agenda" className="space-y-6">
            <GerenciarAgendaPersonal personalId={userId} isReadOnly={isReadOnly} />
          </div>
        )}

        {/* TAB: CHECK-INS */}
        {activeTab === 'checkins' && (
          <div id="tab-content-checkins" className="space-y-6">
            <GerenciarCheckins personalId={userId} />
          </div>
        )}

        {/* TAB: MODELOS (NOVO) */}
        {activeTab === 'templates' && (
          <div id="tab-content-templates" className="space-y-6">
            <GerenciarTemplates personalId={userId} isReadOnly={isReadOnly} />
          </div>
        )}

        {/* TAB: CHAT / MENSAGENS */}
        {activeTab === 'chat' && (
          <div id="tab-content-chat" className="flex-1 flex flex-col min-h-0">
            <ChatPersonal 
              personalId={userId} 
              initialSelectedAlunoId={selectedAlunoIdForChat}
              onClearInitialSelected={() => setSelectedAlunoIdForChat(null)}
            />
          </div>
        )}

        {/* TAB 3: PERFIL */}
        {activeTab === 'perfil' && (
          <div id="tab-content-perfil" className="space-y-6">
            <div>
              <h1 className="font-display font-bold text-2xl text-ink tracking-tight">Seu Perfil</h1>
              <p className="text-sm text-ink-2">Configurações da sua assinatura de Personal Trainer e dados cadastrais.</p>
            </div>

            {/* Premium Profile Card */}
            <div className="bg-surface border border-line rounded-3xl p-8 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 blur-3xl pointer-events-none rounded-full" />

              <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-line">
                <div className="relative group/avatar shrink-0">
                  <div className="w-20 h-20 rounded-full brand-gradient-bg p-[1px] relative flex items-center justify-center overflow-hidden">
                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-surface/80 flex items-center justify-center z-10 rounded-full">
                        <Loader2 className="w-6 h-6 text-flame animate-spin" />
                      </div>
                    )}
                    <div className="w-full h-full rounded-full bg-raise flex items-center justify-center overflow-hidden font-display font-semibold text-[28px] text-ink">
                      {profile.avatar_url ? (
                        <img 
                          src={profile.avatar_url} 
                          alt={profile.nome} 
                          className="w-full h-full rounded-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        profile.nome.charAt(0).toUpperCase()
                      )}
                    </div>
                  </div>
                  
                  {/* Floating Change Photo Camera Button */}
                  <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-flame hover:bg-flame-dark flex items-center justify-center cursor-pointer shadow-md transition-all hover:scale-110 z-20">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleAvatarChange} 
                      disabled={uploadingAvatar}
                    />
                    <Camera className="w-3.5 h-3.5 text-white" />
                  </label>
                </div>

                <div className="text-center sm:text-left flex-1 min-w-0">
                  <h3 className="font-display font-semibold text-xl text-ink">{profile.nome}</h3>
                  <p className="text-sm text-ink-2">{userEmail}</p>
                  <div className="pt-2 flex flex-wrap justify-center sm:justify-start items-center gap-2">
                    <span className={`text-[12px] px-2.5 py-0.5 rounded-full ${getPlanoStyles(assinatura?.plano)}`}>
                      {getPlanoLabel(assinatura?.plano)}
                    </span>
                    <span className={`text-[12px] px-2.5 py-0.5 rounded-full ${getStatusBadge(assinatura?.status, assinatura?.plano).className}`}>
                      {getStatusBadge(assinatura?.status, assinatura?.plano).label}
                    </span>
                    {profile.avatar_url && (
                      <button
                        onClick={handleRemoveAvatar}
                        disabled={uploadingAvatar}
                        className="text-[11px] font-mono bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Remover foto
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Account Metadata details */}
              <div className="grid grid-cols-1 gap-4">
                <div className="p-4 bg-bg border border-line rounded-2xl space-y-1">
                  <span className="text-[12px] text-ink-3">Criado em</span>
                  <p className="text-sm text-ink flex items-center gap-1.5 num">
                    <Calendar className="w-3.5 h-3.5 text-accent" />
                    <span>{new Date(profile.criado_em).toLocaleDateString('pt-BR')}</span>
                  </p>
                </div>
              </div>

              {/* Footer Copyright */}
              <div className="py-4 text-center text-[11px] text-ink-3 font-mono">
                © {new Date().getFullYear()} ZELOS Personal • Todos os direitos reservados
              </div>



              {/* Admin Button */}
              <div className="p-5 bg-accent/5 hover:bg-accent/10 border border-accent/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
                <div className="flex gap-3 text-xs text-ink-2 leading-relaxed">
                  <span className="text-xl">⚙️</span>
                  <div>
                    <p className="text-ink font-semibold flex items-center gap-2">
                      <span>Gestão de exercícios</span>
                      <span className="text-[9px] bg-accent/20 text-accent px-2 py-0.5 rounded-full border border-accent/30 font-semibold">Admin</span>
                    </p>
                    <p className="mt-0.5 text-[11px]">Adicione movimentos, dicas de execução e faça upload dos vídeos.</p>
                  </div>
                </div>
                {profile.is_admin && (
                  <button
                    id="btn-goto-admin"
                    type="button"
                    onClick={() => handleTabChange('gerenciar')}
                    data-sem-som
                    className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-accent text-white text-xs font-bold transition-all hover:bg-accent/95 active:scale-[0.98] shrink-0 cursor-pointer text-center"
                  >
                    ⚙️ Gerenciar Exercícios
                  </button>
                )}
              </div>

              {/* Admin Cortesias Button */}
              {isAdmin && (
                <div className="p-5 bg-accent/5 hover:bg-accent/10 border border-accent/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
                  <div className="flex gap-3 text-xs text-ink-2 leading-relaxed">
                    <span className="text-xl">🎟️</span>
                    <div>
                      <p className="text-ink font-semibold flex items-center gap-2">
                        <span>Códigos de cortesia</span>
                        <span className="text-[9px] bg-accent/20 text-accent px-2 py-0.5 rounded-full border border-accent/30 font-semibold">Admin</span>
                      </p>
                      <p className="mt-0.5 text-[11px]">Gerencie códigos de cortesia e controle de acessos de alunos.</p>
                    </div>
                  </div>
                  <button
                    id="btn-goto-cortesias"
                    type="button"
                    onClick={() => handleTabChange('cortesias')}
                    data-sem-som
                    className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-accent text-white text-xs font-bold transition-all hover:bg-accent/95 active:scale-[0.98] shrink-0 cursor-pointer text-center"
                  >
                    🎟️ Códigos de Cortesia
                  </button>
                </div>
              )}

              {/* Sound Settings */}
              <div className="p-5 bg-surface border border-line rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent/10 rounded-xl">
                      <Volume2 className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">Sons do app</p>
                      <p className="text-[12px] text-ink-3">Feedback sonoro sintetizado</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleSom}
                    data-sem-som
                    className={`w-12 h-6 rounded-full transition-colors relative ${somHabilitado ? 'bg-accent' : 'bg-raise'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${somHabilitado ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              {/* Theme Settings */}
              <div className="p-5 bg-surface border border-line rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent/10 rounded-xl">
                      <Sparkles className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">Tema visual</p>
                      <p className="text-[12px] text-ink-3">Escolha a aparência do aplicativo</p>
                    </div>
                  </div>
                  <div className="flex bg-raise border border-line rounded-xl p-1 gap-1 w-full sm:w-auto">
                    {(['light', 'dark', 'system'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setTheme(t);
                          tocar('tap');
                        }}
                        className={`flex-1 sm:flex-initial py-1.5 px-3.5 text-xs font-semibold rounded-lg transition-all capitalize cursor-pointer ${
                          theme === t 
                            ? 'bg-accent text-white shadow-md shadow-accent/20 border-b-2 border-accent-hi' 
                            : 'text-ink-3 hover:text-ink'
                        }`}
                      >
                        {t === 'light' ? 'Claro' : t === 'dark' ? 'Escuro' : 'Sistema'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sign out button */}
              <div className="pt-2">
                <button
                  id="btn-logout"
                  type="button"
                  onClick={onLogout}
                  className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-raise hover:bg-raise/80 text-sm font-semibold border border-line hover:border-line-strong transition-all flex items-center justify-center gap-2 text-accent active:scale-[0.98]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair da Conta</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: GERENCIAR EXERCÍCIOS ADMIN */}
        {activeTab === 'gerenciar' && profile.is_admin && (
          <div id="tab-content-gerenciar" className="space-y-6">
            <GerenciarExercicios personalId={userId} isReadOnly={isReadOnly} />
          </div>
        )}

        {/* TAB: CORTESIAS ADMIN */}
        {activeTab === 'cortesias' && isAdmin && (
          <div id="tab-content-cortesias" className="space-y-6">
            <GerenciarCortesias />
          </div>
        )}

        {/* TAB: PLANOS */}
        {activeTab === 'planos' && (
          <PlanosArea userEmail={userEmail} />
        )}
      </main>
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-surface border border-line p-3 rounded-2xl shadow-xl flex items-center gap-2.5 z-[100] animate-in fade-in slide-in-from-bottom-5">
          <div className="w-2 h-2 rounded-full bg-accent" />
          <span className="text-xs font-medium text-ink">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default function PersonalArea(props: PersonalAreaProps) {
  return (
    <SubscriptionProvider personalId={props.userId}>
      <PersonalAreaContent {...props} />
    </SubscriptionProvider>
  );
}
