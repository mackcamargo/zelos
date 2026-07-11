import React, { useState, useEffect } from 'react';
import { dbService, authService } from '../lib/supabase';
import { Aluno, Profile } from '../types';
import { Users, BookOpen, User, LogOut, Plus, Sparkles, Target, Activity, Calendar, ShieldCheck, FolderHeart, MessageSquare } from 'lucide-react';
import Biblioteca from './Biblioteca';
import GerenciarExercicios from './GerenciarExercicios';
import GerenciarConteudo from './GerenciarConteudo';
import GerenciarAgendaPersonal from './GerenciarAgendaPersonal';
import GerenciarAlunos from './GerenciarAlunos';
import GerenciarTemplates from './GerenciarTemplates';
import { DashPersonalBemEstar } from './DashPersonalBemEstar';

interface PersonalAreaProps {
  userId: string;
  userEmail: string;
  profile: Profile;
  onLogout: () => void;
  isDemoMode: boolean;
}

type TabType = 'dashboard' | 'alunos' | 'exercicios' | 'agenda' | 'conteudo' | 'templates' | 'perfil' | 'gerenciar';

export default function PersonalArea({ userId, userEmail, profile, onLogout, isDemoMode }: PersonalAreaProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  return (
    <div id="personal-area-root" className="min-h-screen bg-void text-ink font-sans flex flex-col pb-24">
      {/* Top Header */}
      <header className="sticky top-0 bg-void/90 backdrop-blur-md z-40 border-b border-white/5 py-5 px-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-2xl tracking-tight">
                ZÊNI<span className="brand-gradient-text">TE</span>
              </span>
              <span className="text-[10px] font-mono uppercase bg-flame/15 text-flame px-2 py-0.5 rounded-full border border-flame/20">
                Personal
              </span>
            </div>
            <p className="text-xs text-ink-3 mt-1 font-mono tracking-wider">WORKSPACE · ÁREA DE COMANDO</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-ink">{profile.nome}</span>
              <span className="text-[10px] text-ink-2 font-mono">ID: {userId.substring(0, 8)}</span>
            </div>
            <div className="w-10 h-10 rounded-full brand-gradient-bg p-[1px]">
              <div className="w-full h-full rounded-full bg-surface-3 flex items-center justify-center font-display font-bold text-ink">
                {profile.nome.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 pt-8 pb-32 md:pb-8">
        
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

        {/* TAB: MODELOS (NOVO) */}
        {activeTab === 'templates' && (
          <div id="tab-content-templates" className="space-y-6">
            <GerenciarTemplates personalId={userId} />
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

      {/* Bottom Navigation Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-surface border-t border-white/5 py-3 px-1 z-50 shadow-[0_-15px_50px_rgba(0,0,0,0.5)]">
        <div className="max-w-5xl h-full mx-auto grid grid-cols-7 gap-0.5 items-center">
          {/* Tab 0: Dashboard */}
          <button
            id="tab-btn-dashboard"
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 py-1 rounded-xl transition-all duration-300 relative h-full justify-center ${
              activeTab === 'dashboard' ? 'text-flame' : 'text-ink-2 hover:text-ink'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-[7px] font-bold tracking-tighter uppercase">Dash</span>
            {activeTab === 'dashboard' && (
              <span className="absolute bottom-0 w-6 h-1 bg-gradient-to-r from-ember via-flame to-amber rounded-t-full shadow-[0_-4px_10px_rgba(245,51,79,0.5)]" />
            )}
          </button>

          {/* Tab 1 */}
          <button
            id="tab-btn-alunos"
            type="button"
            onClick={() => setActiveTab('alunos')}
            className={`flex flex-col items-center gap-1 py-1 rounded-xl transition-all duration-300 relative h-full justify-center ${
              activeTab === 'alunos' ? 'text-flame' : 'text-ink-2 hover:text-ink'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[7px] font-bold tracking-tighter uppercase">Alunos</span>
            {activeTab === 'alunos' && (
              <span className="absolute bottom-0 w-6 h-1 bg-gradient-to-r from-ember via-flame to-amber rounded-t-full shadow-[0_-4px_10px_rgba(245,51,79,0.5)]" />
            )}
          </button>

          {/* Tab: Exercicios */}
          <button
            id="tab-btn-exercicios"
            type="button"
            onClick={() => setActiveTab('exercicios')}
            className={`flex flex-col items-center gap-1 py-1 rounded-xl transition-all duration-300 relative h-full justify-center ${
              activeTab === 'exercicios' ? 'text-flame' : 'text-ink-2 hover:text-ink'
            }`}
          >
            <Activity className="w-5 h-5" />
            <span className="text-[7px] font-bold tracking-tighter uppercase">Treinos</span>
            {activeTab === 'exercicios' && (
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

          {/* Tab: Conteudo */}
          <button
            id="tab-btn-conteudo"
            type="button"
            onClick={() => setActiveTab('conteudo')}
            className={`flex flex-col items-center gap-1 py-1 rounded-xl transition-all duration-300 relative h-full justify-center ${
              activeTab === 'conteudo' ? 'text-flame' : 'text-ink-2 hover:text-ink'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[7px] font-bold tracking-tighter uppercase">Biblio</span>
            {activeTab === 'conteudo' && (
              <span className="absolute bottom-0 w-6 h-1 bg-gradient-to-r from-ember via-flame to-amber rounded-t-full shadow-[0_-4px_10px_rgba(245,51,79,0.5)]" />
            )}
          </button>

          {/* Tab: Modelos */}
          <button
            id="tab-btn-templates"
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`flex flex-col items-center gap-1 py-1 rounded-xl transition-all duration-300 relative h-full justify-center ${
              activeTab === 'templates' ? 'text-flame' : 'text-ink-2 hover:text-ink'
            }`}
          >
            <FolderHeart className="w-5 h-5" />
            <span className="text-[7px] font-bold tracking-tighter uppercase">Models</span>
            {activeTab === 'templates' && (
              <span className="absolute bottom-0 w-6 h-1 bg-gradient-to-r from-ember via-flame to-amber rounded-t-full shadow-[0_-4px_10px_rgba(245,51,79,0.5)]" />
            )}
          </button>

          {/* Tab 3 */}
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
