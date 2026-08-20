import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  Plus, 
  Sparkles, 
  CheckCheck, 
  Clock,
  Database,
  UserCheck,
  LogIn
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

export const Header: React.FC = () => {
  const { 
    activeView, 
    notifications, 
    unreadNotificationCount, 
    markNotificationsRead,
    setIsSearchOpen,
    setIsQuickCreateOpen,
    setIsAiDrawerOpen,
    setActiveView,
    setIsAuthModalOpen,
    firebaseUser,
    user
  } = useApp();

  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8 z-20 shrink-0 select-none">
      {/* Search Input Button */}
      <div className="relative w-80 sm:w-96">
        <button
          onClick={() => setIsSearchOpen(true)}
          className="w-full flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 py-2 pl-3.5 pr-3 text-sm text-slate-500 hover:bg-slate-100/70 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400">Search records, deals, or invoices...</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 rounded shadow-xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        {/* Live Database / Auth Account Button */}
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            firebaseUser 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-slate-900 text-white border-slate-800 hover:bg-slate-800 shadow-xs'
          }`}
        >
          {firebaseUser ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="max-w-[110px] truncate">{firebaseUser.displayName || firebaseUser.email}</span>
            </>
          ) : (
            <>
              <LogIn className="w-3.5 h-3.5" />
              <span>Login / Live DB</span>
            </>
          )}
        </button>

        <button
          onClick={() => setIsAiDrawerOpen(true)}
          className="flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors shadow-2xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>AI Copilot</span>
        </button>

        <button
          onClick={() => setIsQuickCreateOpen(true)}
          className="flex items-center rounded-md bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          <span>Quick Create</span>
        </button>

        <div className="h-6 w-px bg-slate-200"></div>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsNotifMenuOpen(!isNotifMenuOpen)}
            className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-md transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
            )}
          </button>

          {isNotifMenuOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Notifications</h3>
                  <p className="text-[10px] text-slate-400">{unreadNotificationCount} unread alerts</p>
                </div>
                {unreadNotificationCount > 0 && (
                  <button
                    onClick={() => markNotificationsRead()}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">No notifications</div>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markNotificationsRead(notif.id);
                        if (notif.link) {
                          setIsNotifMenuOpen(false);
                          const target = notif.link.replace('/', '').split('/')[0];
                          if (target) setActiveView(target);
                        }
                      }}
                      className={`p-3 text-left hover:bg-slate-50 transition-colors cursor-pointer ${
                        !notif.is_read ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs ${!notif.is_read ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                          {notif.title}
                        </p>
                        {!notif.is_read && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1"></span>}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
