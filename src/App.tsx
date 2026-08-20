import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './client/context/AppContext.tsx';
import { Sidebar } from './client/components/Sidebar.tsx';
import { Header } from './client/components/Header.tsx';
import { GlobalSearchModal } from './client/components/GlobalSearchModal.tsx';
import { QuickCreateModal } from './client/components/QuickCreateModal.tsx';
import { AIAssistantDrawer } from './client/components/AIAssistantDrawer.tsx';
import { AuthModal } from './client/components/AuthModal.tsx';

// Views
import { DashboardView } from './client/views/DashboardView.tsx';
import { CRMView } from './client/views/CRMView.tsx';
import { SalesFinanceView } from './client/views/SalesFinanceView.tsx';
import { MarketingView } from './client/views/MarketingView.tsx';
import { UnifiedInboxView } from './client/views/UnifiedInboxView.tsx';
import { AppointmentsView } from './client/views/AppointmentsView.tsx';
import { AIAssistantView } from './client/views/AIAssistantView.tsx';
import { AutomationEngineView } from './client/views/AutomationEngineView.tsx';
import { AnalyticsGrowthView } from './client/views/AnalyticsGrowthView.tsx';
import { TeamManagementView } from './client/views/TeamManagementView.tsx';
import { SettingsBillingView } from './client/views/SettingsBillingView.tsx';
import { PublicBookingPage } from './client/views/PublicBookingPage.tsx';
import { PublicLeadFormPage } from './client/views/PublicLeadFormPage.tsx';

import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto p-3.5 rounded-2xl shadow-xl border flex items-start justify-between gap-3 text-xs animate-in slide-in-from-bottom-2 fade-in duration-200 ${
            t.type === 'success' ? 'bg-slate-900 border-slate-800 text-white' :
            t.type === 'error' ? 'bg-rose-950 border-rose-800 text-rose-100' :
            t.type === 'warning' ? 'bg-amber-950 border-amber-800 text-amber-100' :
            'bg-slate-900 border-slate-800 text-white'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
            {t.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
            {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
            {t.type === 'info' && <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />}
            <div>
              <p className="font-bold">{t.title}</p>
              {t.message && <p className="text-[11px] text-slate-300 mt-0.5 opacity-90">{t.message}</p>}
            </div>
          </div>
          <button
            onClick={() => dismissToast(t.id)}
            className="p-1 hover:bg-slate-800/80 rounded text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

const MainAppShell: React.FC = () => {
  const { activeView, isLoading, isAuthModalOpen, setIsAuthModalOpen } = useApp();

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'crm':
        return <CRMView />;
      case 'finance':
        return <SalesFinanceView />;
      case 'marketing':
        return <MarketingView />;
      case 'inbox':
        return <UnifiedInboxView />;
      case 'appointments':
        return <AppointmentsView />;
      case 'ai-assistant':
        return <AIAssistantView />;
      case 'automations':
        return <AutomationEngineView />;
      case 'analytics':
        return <AnalyticsGrowthView />;
      case 'team':
        return <TeamManagementView />;
      case 'settings':
        return <SettingsBillingView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans antialiased text-slate-900 select-none">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          {isLoading ? (
            <div className="h-full flex items-center justify-center p-12 text-slate-400 text-xs">
              <div className="text-center space-y-2">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p>Loading workspace records...</p>
              </div>
            </div>
          ) : (
            renderActiveView()
          )}
        </main>
      </div>

      {/* Global Modals & Overlays */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <GlobalSearchModal />
      <QuickCreateModal />
      <AIAssistantDrawer />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  const [publicRoute, setPublicRoute] = useState<{ type: 'booking' | 'form'; param: string } | null>(null);

  useEffect(() => {
    const pathname = window.location.pathname;
    if (pathname.startsWith('/booking/')) {
      const slug = pathname.replace('/booking/', '');
      if (slug) setPublicRoute({ type: 'booking', param: slug });
    } else if (pathname.startsWith('/form/')) {
      const formId = pathname.replace('/form/', '');
      if (formId) setPublicRoute({ type: 'form', param: formId });
    }
  }, []);

  if (publicRoute?.type === 'booking') {
    return <PublicBookingPage slug={publicRoute.param} />;
  }

  if (publicRoute?.type === 'form') {
    return <PublicLeadFormPage formId={publicRoute.param} />;
  }

  return (
    <AppProvider>
      <MainAppShell />
    </AppProvider>
  );
}
