import React, { useState, useEffect } from 'react';
import { dbService, authService } from '../lib/supabase';
import { Aluno, Profile } from '../types';
import { Users, BookOpen, User, LogOut, Plus, Sparkles, Target, Activity, Calendar, ShieldCheck, FolderHeart, MessageSquare, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Biblioteca from './Biblioteca';
import GerenciarExercicios from './GerenciarExercicios';
import GerenciarConteudo from './GerenciarConteudo';
import GerenciarAgendaPersonal from './GerenciarAgendaPersonal';
import GerenciarAlunos from './GerenciarAlunos';
import GerenciarTemplates from './GerenciarTemplates';
import GerenciarCheckins from './GerenciarCheckins';
import { DashPersonalBemEstar } from './DashPersonalBemEstar';
import ChatPersonal from './ChatPersonal';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface PersonalAreaProps {
  userId: string;
  userEmail: string;
  profile: Profile;
  onLogout: () => void;
  isDemoMode: boolean;
}

type TabType = 'dashboard' | 'alunos' | 'exercicios' | 'agenda' | 'checkins' | 'conteudo' | 'templates' | 'perfil' | 'gerenciar' | 'chat';

export default function PersonalArea({ userId, userEmail, profile, onLogout, isDemoMode }: PersonalAreaProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Sparkles },
    { id: 'alunos', label: 'Alunos', icon: Users },
    { id: 'exercicios', label: 'Treinos', icon: Activity },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'checkins', label: 'Check-ins', icon: MessageSquare },
    { id: 'conteudo', label: 'Biblioteca', icon: BookOpen },
    { id: 'templates', label: 'Modelos', icon: FolderHeart },
    { id: 'chat', label: 'Mensagens', icon: MessageSquare },
    { id: 'perfil', label: 'Perfil', icon: User },
  ];

  useEffect(() => {
    const fetchUnreads = async () => {
      const { data } = await dbService.getPersonalUnreadCount(userId);
      setUnreadCount(data || 0);
    };

    fetchUnreads();

    window.addEventListener('zenite_mensagem_enviada', fetchUnreads);
    window.addEventListener('zenite_mensagem_lida', fetchUnreads);

    let canal: any = null;
    if (isSupabaseConfigured && supabase) {
      canal = supabase.channel('personal-unreads')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'mensagens', filter: `personal_id=eq.${userId}` },
          () => {
            fetchUnreads();
          }
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener('zenite_mensagem_enviada', fetchUnreads);
      window.removeEventListener('zenite_mensagem_lida', fetchUnreads);
      if (canal) {
        supabase.removeChannel(canal);
      }
    };
  }, [userId]);

  return (
    <div id="personal-area-root" className="min-h-screen bg-void text-ink font-sans flex overflow-hidden">
      
      {/* SIDEBAR: Desktop */}
      <aside 
        id="desktop-sidebar"
        className={`hidden md:flex flex-col bg-[#141414] border-r border-white/10 h-screen sticky top-0 transition-all duration-300 z-30 shrink-0 ${
          isCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Top bar logo */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-4 border-b border-white/5 h-16 shrink-0`}>
          {isCollapsed ? (
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="font-display font-black text-2xl tracking-tight text-[#F26A1B] hover:scale-110 transition-transform focus:outline-none cursor-pointer"
              title="Expandir menu"
            >
              Z
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="font-display font-black text-xl tracking-tight truncate hover:opacity-85 transition-opacity text-left focus:outline-none cursor-pointer"
              >
                ZÊNI<span className="text-[#F26A1B]">TE</span>
                <span className="text-[9px] font-mono uppercase bg-[#F26A1B]/15 text-[#F26A1B] px-1.5 py-0.5 rounded-full border border-[#F26A1B]/20 ml-1.5 align-middle">
                  Pro
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-white/5 transition-colors cursor-pointer"
                title="Recolher menu"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
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
                  onClick={() => {
                    setActiveTab(item.id as TabType);
                  }}
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center px-2' : 'px-4'
                  } py-3 gap-3 rounded-xl transition-all duration-200 relative group/btn cursor-pointer ${
                    isActive 
                      ? 'text-[#F26A1B] bg-white/[0.04] font-semibold' 
                      : 'text-ink-2 hover:text-ink hover:bg-white/[0.02]'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-[#F26A1B] rounded-r-full" />
                  )}
                  <div className="relative">
                    <Icon className={`w-5 h-5 transition-transform duration-200 group-hover/btn:scale-105 ${
                      isActive ? 'text-[#F26A1B]' : 'text-ink-2 group-hover/btn:text-ink'
                    }`} />
                    {item.id === 'chat' && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#F26A1B] rounded-full ring-2 ring-[#141414]" />
                    )}
                  </div>
                  {!isCollapsed && <span className="text-sm font-sans truncate">{item.label}</span>}
                  {!isCollapsed && item.id === 'chat' && unreadCount > 0 && (
                    <span className="ml-auto text-[9px] bg-[#F26A1B] text-white px-1.5 py-0.5 rounded-full font-mono font-bold">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Tooltip on Collapsed hover */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#1a1a1a] border border-white/10 text-xs font-semibold text-ink rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 whitespace-nowrap pointer-events-none shadow-xl">
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer profile & logout */}
        <div className="p-2 border-t border-white/5 shrink-0 relative group/footer">
          <button
            type="button"
            onClick={() => setActiveTab('perfil')}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2' : 'p-2'
            } gap-3 text-left hover:bg-white/[0.03] rounded-xl transition-all group/btn cursor-pointer`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full brand-gradient-bg p-[1px] shrink-0">
                <div className="w-full h-full rounded-full bg-[#1c1d22] flex items-center justify-center font-display font-bold text-ink text-xs">
                  {profile.nome.charAt(0).toUpperCase()}
                </div>
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink group-hover/btn:text-[#F26A1B] transition-colors truncate">
                    {profile.nome}
                  </p>
                  <p className="text-[9px] text-ink-3 font-mono truncate">ID: {userId.substring(0, 8)}</p>
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
                className="p-1.5 rounded-lg text-ink-3 hover:text-ember hover:bg-white/5 transition-colors shrink-0 ml-auto cursor-pointer"
                title="Sair da conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </button>

          {/* Footer Tooltip on Collapsed */}
          {isCollapsed && (
            <div className="absolute left-full ml-3 bottom-4 px-2.5 py-1.5 bg-[#1a1a1a] border border-white/10 text-xs font-semibold text-ink rounded-lg opacity-0 invisible group-hover/footer:opacity-100 group-hover/footer:visible transition-all duration-200 z-50 whitespace-nowrap pointer-events-none shadow-xl">
              {profile.nome} (Sair)
            </div>
          )}
        </div>
      </aside>

      {/* MOBILE DRAWER: Sidebar drawer */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden transition-all duration-300"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      <aside 
        id="mobile-sidebar"
        className={`fixed top-0 bottom-0 left-0 bg-[#141414] border-r border-white/10 w-60 z-50 transition-transform duration-300 md:hidden flex flex-col ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 h-16 shrink-0">
          <span className="font-display font-black text-xl tracking-tight">
            ZÊNI<span className="text-[#F26A1B]">TE</span>
          </span>
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-white/5 transition-colors cursor-pointer"
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
                }}
                className={`w-full flex items-center px-4 py-3 gap-3 rounded-xl transition-all duration-200 relative cursor-pointer ${
                  isActive 
                    ? 'text-[#F26A1B] bg-white/[0.04] font-semibold' 
                    : 'text-ink-2 hover:text-ink hover:bg-white/[0.02]'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-[#F26A1B] rounded-r-full" />
                )}
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-[#F26A1B]' : 'text-ink-2'}`} />
                  {item.id === 'chat' && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#F26A1B] rounded-full ring-2 ring-[#141414]" />
                  )}
                </div>
                <span className="text-sm font-sans">{item.label}</span>
                {item.id === 'chat' && unreadCount > 0 && (
                  <span className="ml-auto text-[9px] bg-[#F26A1B] text-white px-1.5 py-0.5 rounded-full font-mono font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/5 shrink-0">
          <div className="w-full flex items-center justify-between gap-3 p-2 rounded-xl bg-white/[0.02]">
            <button
              type="button"
              onClick={() => {
                setActiveTab('perfil');
                setIsMobileOpen(false);
              }}
              className="flex items-center gap-3 min-w-0 text-left cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full brand-gradient-bg p-[1px] shrink-0">
                <div className="w-full h-full rounded-full bg-[#1c1d22] flex items-center justify-center font-display font-bold text-ink text-xs">
                  {profile.nome.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink truncate">{profile.nome}</p>
                <p className="text-[9px] text-ink-3 font-mono truncate">ID: {userId.substring(0, 8)}</p>
              </div>
            </button>
            <button 
              type="button"
              onClick={onLogout}
              className="p-1.5 rounded-lg text-ink-3 hover:text-ember hover:bg-white/5 transition-colors shrink-0 cursor-pointer"
              title="Sair da conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto">
        
        {/* Top Header */}
        <header className="sticky top-0 bg-void/90 backdrop-blur-md z-20 border-b border-white/5 py-4 px-6 shrink-0">
          <div className="max-w-5xl mx-auto flex justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              {/* Hamburger button on Mobile */}
              <button
                type="button"
                onClick={() => setIsMobileOpen(true)}
                className="md:hidden p-2 -ml-2 text-ink-2 hover:text-ink hover:bg-white/5 rounded-xl transition-all cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <h1 className="font-display font-black text-xl text-ink tracking-tight uppercase italic flex items-center gap-2">
                  {activeTab === 'dashboard' && <>Dash<span className="text-[#F26A1B]">board</span></>}
                  {activeTab === 'alunos' && <>Alu<span className="text-[#F26A1B]">nos</span></>}
                  {activeTab === 'exercicios' && <>Exer<span className="text-[#F26A1B]">cícios</span></>}
                  {activeTab === 'agenda' && <>Agen<span className="text-[#F26A1B]">da</span></>}
                  {activeTab === 'checkins' && <>Check-<span className="text-[#F26A1B]">ins</span></>}
                  {activeTab === 'conteudo' && <>Biblio<span className="text-[#F26A1B]">teca</span></>}
                  {activeTab === 'templates' && <>Mode<span className="text-[#F26A1B]">los</span></>}
                  {activeTab === 'chat' && <>Mensa<span className="text-[#F26A1B]">gens</span></>}
                  {activeTab === 'perfil' && <>Per<span className="text-[#F26A1B]">fil</span></>}
                  {activeTab === 'gerenciar' && <>Admin <span className="text-[#F26A1B]">Exercícios</span></>}
                </h1>
                <p className="text-ink-3 text-[10px] font-mono uppercase tracking-widest mt-0.5">
                  {activeTab === 'dashboard' && 'Visão Geral de Bem-estar'}
                  {activeTab === 'alunos' && 'Gestão de Alunos'}
                  {activeTab === 'exercicios' && 'Biblioteca de Movimentos'}
                  {activeTab === 'agenda' && 'Horários & Compromissos'}
                  {activeTab === 'checkins' && 'Mensagens & Feedback'}
                  {activeTab === 'conteudo' && 'Artigos & Postagens'}
                  {activeTab === 'templates' && 'Modelos de Ficha de Treino'}
                  {activeTab === 'chat' && 'Centro de Comunicação Realtime'}
                  {activeTab === 'perfil' && 'Dados Cadastrais'}
                  {activeTab === 'gerenciar' && 'Painel Administrativo'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold text-ink">{profile.nome}</span>
                <span className="text-[10px] text-ink-2 font-mono">Personal</span>
              </div>
              <div className="w-9 h-9 rounded-full brand-gradient-bg p-[1px]">
                <div className="w-full h-full rounded-full bg-surface-3 flex items-center justify-center font-display font-bold text-ink text-sm">
                  {profile.nome.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main View Area */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-6 pt-8 pb-16">
        
        {/* TAB 0: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div id="tab-content-dashboard" className="space-y-6">
            <div className="mb-8">
              <h2 className="font-display font-black text-3xl text-ink tracking-tighter uppercase italic">
                Dash<span className="text-flame">board</span>
              </h2>
              <p className="text-ink-3 text-xs font-mono uppercase tracking-widest mt-1">Visão Geral de Bem-estar</p>
            </div>
            <DashPersonalBemEstar 
              personalId={userId} 
              onSelectAluno={(id) => {
                // Here we could redirect to specific student view
                // For now just switch to 'alunos' tab as a placeholder or stay here
                setActiveTab('alunos');
              }} 
            />
          </div>
        )}

        {/* TAB 1: ALUNOS */}
        {activeTab === 'alunos' && (
          <div id="tab-content-alunos" className="space-y-6">
            <GerenciarAlunos personalId={userId} />
          </div>
        )}


        {/* TAB 2: EXERCICIOS */}
        {activeTab === 'exercicios' && (
          <div id="tab-content-exercicios" className="space-y-6">
            <Biblioteca personalId={userId} avatarTipo={profile.avatar_tipo} />
          </div>
        )}

        {/* TAB: CONTEUDO EDUCATIVO */}
        {activeTab === 'conteudo' && (
          <div id="tab-content-conteudo" className="space-y-6">
            <GerenciarConteudo personalId={userId} />
          </div>
        )}

        {/* TAB: AGENDA PERSONAL */}
        {activeTab === 'agenda' && (
          <div id="tab-content-agenda" className="space-y-6">
            <GerenciarAgendaPersonal personalId={userId} />
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
            <GerenciarTemplates personalId={userId} />
          </div>
        )}

        {/* TAB: CHAT / MENSAGENS */}
        {activeTab === 'chat' && (
          <div id="tab-content-chat" className="space-y-6">
            <ChatPersonal personalId={userId} />
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
            <div className="bg-surface border border-white/5 rounded-3xl p-8 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-flame/5 blur-3xl pointer-events-none rounded-full" />

              <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-white/5">
                <div className="w-20 h-20 rounded-full brand-gradient-bg p-[1px] shrink-0">
                  <div className="w-full h-full rounded-full bg-surface-3 flex items-center justify-center font-display font-bold text-3xl text-ink">
                    {profile.nome.charAt(0).toUpperCase()}
                  </div>
                </div>

                <div className="text-center sm:text-left space-y-1">
                  <h3 className="font-display font-bold text-xl text-ink">{profile.nome}</h3>
                  <p className="text-sm text-ink-2">{userEmail}</p>
                  <div className="pt-2 flex flex-wrap justify-center sm:justify-start gap-2">
                    <span className="text-[10px] font-mono bg-violet/10 border border-violet/20 text-violet px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Plano Black
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Assinatura Ativa
                    </span>
                  </div>
                </div>
              </div>

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
                <ShieldCheck className="w-5 h-5 text-flame shrink-0 mt-0.5" />
                <div>
                  <p className="text-ink font-semibold">Segurança & RLS Habilitada</p>
                  <p className="mt-0.5">Suas conexões e dados de alunos estão totalmente protegidos pelas políticas de Row Level Security (RLS) do Supabase real.</p>
                </div>
              </div>

              {/* Admin Button */}
              <div className="p-5 bg-violet/5 hover:bg-violet/10 border border-violet/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
                <div className="flex gap-3 text-xs text-ink-2 leading-relaxed">
                  <span className="text-xl">⚙️</span>
                  <div>
                    <p className="text-ink font-semibold flex items-center gap-2">
                      <span>Gerenciar Exercícios</span>
                      <span className="text-[9px] font-mono uppercase bg-violet/20 text-violet px-2 py-0.5 rounded-full border border-violet/30 font-bold">Admin</span>
                    </p>
                    <p className="mt-0.5 text-[11px]">Adicione movimentos, dicas de execução e faça upload dos vídeos.</p>
                  </div>
                </div>
                <button
                  id="btn-goto-admin"
                  type="button"
                  onClick={() => setActiveTab('gerenciar')}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-violet text-void text-xs font-bold transition-all hover:bg-violet/95 active:scale-[0.98] shrink-0 cursor-pointer text-center"
                >
                  ⚙️ Gerenciar Exercícios
                </button>
              </div>

              {/* Sign out button */}
              <div className="pt-2">
                <button
                  id="btn-logout"
                  type="button"
                  onClick={onLogout}
                  className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-white/5 hover:bg-white/10 text-sm font-semibold border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2 text-ember hover:text-ember active:scale-[0.98]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair da Conta</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: GERENCIAR EXERCÍCIOS ADMIN */}
        {activeTab === 'gerenciar' && (
          <div id="tab-content-gerenciar" className="space-y-6">
            <GerenciarExercicios onBack={() => setActiveTab('perfil')} />
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
