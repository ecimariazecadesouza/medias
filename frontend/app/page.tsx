'use client';

import { GradesProvider, useGrades } from '@/context/GradesContext';
import { useState, useEffect, useMemo } from 'react';
import { UserRole } from '@/lib/supabase';
import {
  Users, Building2, GraduationCap, BookOpen,
  ClipboardList, BarChart3, ShieldCheck, FileText,
  Settings, Menu, X, ChevronLeft, ChevronRight,
  LogOut, School, Pencil
} from 'lucide-react';

import ProtagonistsModule from '@/components/ProtagonistsModule';
import TurmasModule from '@/components/TurmasModule';
import DocentesModule from '@/components/DocentesModule';
import GradeCurricularModule from '@/components/GradeCurricularModule';
import LancamentoModule from '@/components/LancamentoModule';
import AnalysesModule from '@/components/AnalysesModule';
import ConselhoModule from '@/components/ConselhoModule';
import BoletinsModule from '@/components/BoletinsModule';
import ConfiguracoesModule from '@/components/ConfiguracoesModule';

type TabId =
  | 'protagonistas' | 'turmas' | 'docentes' | 'grade'
  | 'lancamento' | 'analises' | 'conselho' | 'boletins' | 'configuracoes';

const navSections = [
  {
    label: 'Gestão',
    items: [
      { id: 'protagonistas' as TabId, label: 'Protagonistas', icon: Users },
      { id: 'turmas' as TabId, label: 'Turmas', icon: Building2 },
      { id: 'docentes' as TabId, label: 'Docentes', icon: GraduationCap },
      { id: 'grade' as TabId, label: 'Grade Curricular', icon: BookOpen },
    ],
  },
  {
    label: 'Pedagógico',
    items: [
      { id: 'lancamento' as TabId, label: 'Lançamento de Médias', icon: ClipboardList },
      { id: 'analises' as TabId, label: 'Análises', icon: BarChart3 },
      { id: 'conselho' as TabId, label: 'Conselho de Classe', icon: ShieldCheck },
      { id: 'boletins' as TabId, label: 'Boletins', icon: FileText },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { id: 'configuracoes' as TabId, label: 'Configurações', icon: Settings },
    ],
  },
];

const moduleTitles: Record<TabId, { title: string; subtitle: string }> = {
  protagonistas: { title: 'Protagonistas', subtitle: 'Gerenciar estudantes cadastrados' },
  turmas: { title: 'Turmas', subtitle: 'Organizar turmas e ano letivo' },
  docentes: { title: 'Docentes', subtitle: 'Cadastrar e vincular professores' },
  grade: { title: 'Grade Curricular', subtitle: 'Hierarquia de formações e disciplinas' },
  lancamento: { title: 'Lançamento de Médias', subtitle: 'Inserir médias bimestrais' },
  analises: { title: 'Análises', subtitle: 'Gráficos e relatórios de desempenho' },
  conselho: { title: 'Conselho de Classe', subtitle: 'Situação consolidada por turma' },
  boletins: { title: 'Boletins', subtitle: 'Gerar boletins individuais dos protagonistas' },
  configuracoes: { title: 'Configurações', subtitle: 'Parâmetros do sistema e bimestres' },
};

import { useAuth } from '@/context/AuthContext';

function AppShell() {
  const { configuracao, loading: dataLoading } = useGrades();
  const { user, signOut, loading: authLoading, updateProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>('protagonistas');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileFormName, setProfileFormName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [mounted, setMounted] = useState(false);

  const showMsg = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // Filtro de navegação baseado no Cargo (Role) - Mover para cima (antes do return)
  const filteredSections = useMemo(() => {
    return navSections.map(section => ({
      ...section,
      items: section.items.filter(item => {
        const role = user?.role || 'Docente';
        if (role === 'Administrador') return true;
        if (role === 'Docente') {
          const docenteTabs: TabId[] = ['lancamento', 'analises', 'conselho', 'boletins'];
          return docenteTabs.includes(item.id);
        }
        if (role === 'Gestor') {
          const gestorBlocked: TabId[] = ['configuracoes', 'grade'];
          return !gestorBlocked.includes(item.id);
        }
        const readOnlyRoles: UserRole[] = ['CP', 'CA', 'Secretaria'];
        if (readOnlyRoles.includes(role as UserRole)) {
          return item.id !== 'configuracoes';
        }
        return false;
      })
    })).filter(section => section.items.length > 0);
  }, [user]);

  // Redireciona para a primeira aba disponível caso o usuário não tenha acesso à atual - Mover para cima
  useEffect(() => {
    if (user && !authLoading && filteredSections.length > 0) {
      const allAllowedTabs = filteredSections.flatMap(s => (s.items || []).map(i => i.id));
      if (!allAllowedTabs.includes(activeTab) && allAllowedTabs.length > 0) {
        setActiveTab(allAllowedTabs[0]);
      }
    }
  }, [user, authLoading, filteredSections, activeTab]);

  useEffect(() => {
    setMounted(true);
    const onResize = () => {
      if (window.innerWidth < 1024) setCollapsed(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (authLoading || !mounted) return (
    <div className="loading-overlay">
      <div className="spinner" />
      <span>Autenticando...</span>
    </div>
  );

  const navigate = (id: TabId) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileFormName.trim()) return;
    setProfileSaving(true);
    try {
      await updateProfile(profileFormName.trim());
      showMsg('Perfil atualizado com sucesso!');
      setProfileModalOpen(false);
    } catch {
      showMsg('Erro ao atualizar perfil.');
    } finally {
      setProfileSaving(false);
    }
  };

  const SidebarNav = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo">
          {configuracao.logoUrl ? (
            <img src={configuracao.logoUrl} alt="Logo" />
          ) : (
            <School size={22} color="white" />
          )}
        </div>
        {!collapsed && (
          <div className="sidebar-brand-text">
            <h1>{configuracao.nomeEscola || 'Gestão de Médias'}</h1>
            <p>Ano Letivo {configuracao.anoLetivo}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {filteredSections.map(section => (
          <div key={section.label}>
            {!collapsed && (
              <div className="nav-section-label">{section.label}</div>
            )}
            {section.items.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  className={`nav-btn ${isActive ? 'active' : ''}`}
                  onClick={() => navigate(item.id)}
                  title={collapsed ? item.label : undefined}
                  style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
                >
                  <span className="nav-btn-icon">
                    <Icon size={20} />
                  </span>
                  {!collapsed && <span className="nav-btn-label">{item.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </div>
  );

  const current = moduleTitles[activeTab];

  // Regras de Edição (Somente Admin e Docente podem editar, e com restrições)
  const isReadOnly = user?.role !== 'Administrador' && user?.role !== 'Docente' && (user?.role as any) !== 'Admin';

  return (
    <div className="app-shell">
      {/* Desktop Sidebar */}
      <aside
        className={`sidebar ${collapsed ? 'collapsed' : ''}`}
        style={{ display: 'flex' }}
      >
        <SidebarNav />
      </aside>

      {/* Mobile overlay + drawer */}
      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)}>
          <aside
            className="sidebar mobile-open"
            style={{ display: 'flex' }}
            onClick={e => e.stopPropagation()}
          >
            <SidebarNav />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={22} />
          </button>

          <div className="topbar-title">
            <h2>{current.title}</h2>
            <p>{current.subtitle}</p>
          </div>

          <div className="topbar-spacer" />

          <div className="topbar-user">
            <div
              className="topbar-user-info"
              onClick={() => {
                setProfileFormName(user?.nome || '');
                setProfileModalOpen(true);
              }}
            >
              <div className="topbar-user-name">
                {user?.nome || user?.email}
                <Pencil size={12} className="edit-icon" />
              </div>
              <div className="topbar-user-role">{user?.role}</div>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={signOut} title="Sair">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content" key={activeTab}>
          {dataLoading ? (
            <div className="loading-overlay">
              <div className="spinner" />
              <span>Carregando dados...</span>
            </div>
          ) : (
            <div className={isReadOnly ? 'read-only-view' : ''}>
              {activeTab === 'protagonistas' && <ProtagonistsModule readOnly={isReadOnly} />}
              {activeTab === 'turmas' && <TurmasModule readOnly={isReadOnly} />}
              {activeTab === 'docentes' && <DocentesModule readOnly={isReadOnly} />}
              {activeTab === 'grade' && <GradeCurricularModule readOnly={isReadOnly} />}
              {activeTab === 'lancamento' && <LancamentoModule readOnly={isReadOnly} role={user?.role} userEmail={user?.email} />}
              {activeTab === 'analises' && <AnalysesModule />}
              {activeTab === 'conselho' && <ConselhoModule />}
              {activeTab === 'boletins' && <BoletinsModule />}
              {activeTab === 'configuracoes' && <ConfiguracoesModule readOnly={isReadOnly} />}
            </div>
          )}
        </main>
      </div>

      {/* Notifications */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.includes('Erro') ? 'error' : 'success'}`}>
            {toast}
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {profileModalOpen && (
        <div className="modal-overlay" onClick={() => setProfileModalOpen(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Meu Perfil</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setProfileModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleProfileSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="label">Nome de Usuário</label>
                  <input
                    className="input"
                    value={profileFormName}
                    onChange={e => setProfileFormName(e.target.value)}
                    placeholder="Seu nome completo"
                    autoFocus
                  />
                </div>
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="label">E-mail</label>
                  <input
                    className="input"
                    value={user?.email || ''}
                    disabled
                    style={{ background: 'hsl(var(--surface-raised))', cursor: 'not-allowed' }}
                  />
                  <p className="help-text" style={{ marginTop: '0.5rem' }}>
                    O e-mail é utilizado para login e não pode ser alterado aqui.
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setProfileModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={profileSaving || !profileFormName.trim()}>
                  {profileSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <GradesProvider>
      <AppShell />
    </GradesProvider>
  );
}
