import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Megaphone, 
  Sparkles, 
  Inbox, 
  Calendar, 
  Zap, 
  BarChart3, 
  ShieldCheck, 
  Settings, 
  ChevronDown, 
  Plus, 
  Building2,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeColor?: string;
}

export const Sidebar: React.FC = () => {
  const { 
    workspace, 
    workspaces, 
    user, 
    activeView, 
    setActiveView, 
    switchWorkspace,
    unreadNotificationCount,
    setIsQuickCreateOpen,
    openAiDrawerWithPrompt,
    firebaseUser,
    setIsAuthModalOpen
  } = useApp();

  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = React.useState(false);

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'crm', label: 'CRM', icon: Users, badge: '5 Hot', badgeColor: 'bg-blue-100 text-blue-700' },
    { id: 'finance', label: 'Sales & Finance', icon: CreditCard, badge: '$11.6k', badgeColor: 'bg-amber-100 text-amber-800' },
    { id: 'marketing', label: 'Marketing', icon: Megaphone },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Sparkles, badge: 'AI', badgeColor: 'bg-blue-100 text-blue-700' },
    { id: 'inbox', label: 'Inbox', icon: Inbox, badge: unreadNotificationCount > 0 ? unreadNotificationCount : 3, badgeColor: 'bg-red-100 text-red-600' },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'automations', label: 'Automations', icon: Zap },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'team', label: 'Team & RBAC', icon: ShieldCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col h-screen shrink-0 select-none">
      {/* Brand Header & Workspace Switcher */}
      <div className="flex h-16 items-center px-4 border-b border-slate-100 relative justify-between">
        <button
          onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
          className="flex items-center gap-2.5 text-left w-full hover:bg-slate-50 p-1.5 rounded-lg transition-colors"
        >
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs">
            <div className="w-3.5 h-3.5 border-2 border-white rounded-xs"></div>
          </div>
          <div className="truncate flex-1">
            <span className="text-sm font-bold tracking-tight text-slate-800 block truncate">
              {workspace?.name || 'Nexus OS'}
            </span>
            <span className="text-[10px] text-slate-500 font-medium capitalize block">
              {workspace?.subscription_plan || 'Pro'} Plan
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>

        {/* Workspace Dropdown */}
        {isWorkspaceMenuOpen && (
          <div className="absolute top-full left-3 right-3 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
            <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Switch Workspace
            </div>
            {workspaces.map(ws => (
              <button
                key={ws.id}
                onClick={() => {
                  switchWorkspace(ws.id);
                  setIsWorkspaceMenuOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                  ws.id === workspace?.id ? 'text-blue-600 font-semibold bg-blue-50/60' : 'text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{ws.name}</span>
                </div>
                {ws.id === workspace?.id && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
              </button>
            ))}
            <div className="my-1 border-t border-slate-100"></div>
            <button
              onClick={() => {
                setIsWorkspaceMenuOpen(false);
                setActiveView('settings');
              }}
              className="w-full px-3 py-1.5 text-left text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1.5 hover:bg-blue-50/50 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Workspace</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto custom-scrollbar">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-100 text-slate-600'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Clean Utility AI Assist Pill */}
      <div className="p-3 mx-3 mb-3 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-bold text-slate-800">AI Assistant</span>
          </div>
          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Ready</span>
        </div>
        <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
          Ask questions or optimize campaigns.
        </p>
        <button
          onClick={() => openAiDrawerWithPrompt('Analyze current pipeline bottlenecks and top 3 revenue opportunities')}
          className="w-full py-1.5 px-2 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-slate-200 rounded-md transition-colors flex items-center justify-center gap-1 shadow-2xs"
        >
          <span>Ask AI Assistant</span>
          <ExternalLink className="w-3 h-3 text-blue-500" />
        </button>
      </div>

      {/* User Profile Footer */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center justify-between gap-2">
          <button 
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-2.5 overflow-hidden text-left hover:bg-slate-50 p-1 rounded-lg transition-colors flex-1"
          >
            {firebaseUser?.photoURL ? (
              <img
                src={firebaseUser.photoURL}
                alt={firebaseUser.displayName || 'User'}
                className="h-8 w-8 rounded-full object-cover bg-slate-200 shrink-0"
              />
            ) : user?.avatar ? (
              <img
                src={user.avatar}
                alt={user?.name}
                className="h-8 w-8 rounded-full object-cover bg-slate-200 shrink-0"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                {(firebaseUser?.displayName || user?.name || 'A')[0].toUpperCase()}
              </div>
            )}
            <div className="flex flex-col truncate">
              <span className="text-xs font-bold text-slate-800 truncate">
                {firebaseUser?.displayName || user?.name || 'Alex Morgan'}
              </span>
              <span className="text-[10px] text-slate-500 font-medium capitalize truncate flex items-center gap-1">
                {firebaseUser ? (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Live DB
                  </span>
                ) : (
                  user?.role?.replace('_', ' ') || 'Admin'
                )}
              </span>
            </div>
          </button>
          <button 
            onClick={() => setActiveView('settings')} 
            title="Account Settings"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
