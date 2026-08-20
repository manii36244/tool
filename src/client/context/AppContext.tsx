import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Workspace, User, AppNotification, PlanLimits } from '../../../shared/types.ts';
import { api } from '../lib/api.ts';
import { auth, onAuthStateChanged, FirebaseUser, db, doc, getDoc } from '../lib/firebase.ts';

interface Toast {
  id: string;
  title: string;
  message?: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface AppContextType {
  workspace: Workspace | null;
  workspaces: Workspace[];
  user: User | null;
  firebaseUser: FirebaseUser | null;
  teamMembers: User[];
  plan: PlanLimits | null;
  notifications: AppNotification[];
  unreadNotificationCount: number;
  isLoading: boolean;
  activeView: string;
  setActiveView: (view: string) => void;
  // Modals & Panels
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isQuickCreateOpen: boolean;
  setIsQuickCreateOpen: (open: boolean) => void;
  isAiDrawerOpen: boolean;
  setIsAiDrawerOpen: (open: boolean) => void;
  aiDrawerInitialPrompt: string;
  openAiDrawerWithPrompt: (prompt: string) => void;
  // Actions
  refreshData: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  markNotificationsRead: (id?: string) => Promise<void>;
  showToast: (title: string, message?: string, type?: Toast['type']) => void;
  toasts: Toast[];
  dismissToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [plan, setPlan] = useState<PlanLimits | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<string>('dashboard');

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [aiDrawerInitialPrompt, setAiDrawerInitialPrompt] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((title: string, message?: string, type: Toast['type'] = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const openAiDrawerWithPrompt = useCallback((prompt: string) => {
    setAiDrawerInitialPrompt(prompt);
    setIsAiDrawerOpen(true);
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [wsData, allWs, notifs] = await Promise.all([
        api.getWorkspace(),
        api.getWorkspaces(),
        api.getNotifications(),
      ]);

      setWorkspace(wsData.workspace);
      setUser(wsData.user);
      setTeamMembers(wsData.teamMembers || []);
      setPlan(wsData.plan);
      setWorkspaces(allWs);
      setNotifications(notifs);
    } catch (err: any) {
      console.error('Error loading workspace data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setFirebaseUser(currentUser);
      if (currentUser) {
        // Sync user state with Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUser(prev => prev ? {
              ...prev,
              id: currentUser.uid,
              name: data.name || currentUser.displayName || prev.name,
              email: currentUser.email || prev.email,
              avatar: currentUser.photoURL || prev.avatar,
              role: data.role || 'owner',
            } : null);
          } else {
            setUser(prev => prev ? {
              ...prev,
              id: currentUser.uid,
              name: currentUser.displayName || prev.name,
              email: currentUser.email || prev.email,
              avatar: currentUser.photoURL || prev.avatar,
            } : null);
          }
        } catch (e) {
          console.warn('Firestore user fetch notice:', e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const refreshData = async () => {
    try {
      const [wsData, allWs, notifs] = await Promise.all([
        api.getWorkspace(),
        api.getWorkspaces(),
        api.getNotifications(),
      ]);
      setWorkspace(wsData.workspace);
      setUser(wsData.user);
      setTeamMembers(wsData.teamMembers || []);
      setPlan(wsData.plan);
      setWorkspaces(allWs);
      setNotifications(notifs);
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  };

  const switchWorkspace = async (workspaceId: string) => {
    try {
      setIsLoading(true);
      await api.switchWorkspace(workspaceId);
      await loadInitialData();
      showToast('Workspace Switched', 'Loaded active tenant data and permissions.', 'info');
    } catch (err: any) {
      showToast('Failed to switch workspace', err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const markNotificationsRead = async (id?: string) => {
    try {
      await api.markNotificationsRead(id);
      setNotifications(prev =>
        prev.map(n => (id ? (n.id === id ? { ...n, is_read: true } : n) : { ...n, is_read: true }))
      );
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  const unreadNotificationCount = notifications.filter(n => !n.is_read).length;

  return (
    <AppContext.Provider
      value={{
        workspace,
        workspaces,
        user,
        firebaseUser,
        teamMembers,
        plan,
        notifications,
        unreadNotificationCount,
        isLoading,
        activeView,
        setActiveView,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isSearchOpen,
        setIsSearchOpen,
        isQuickCreateOpen,
        setIsQuickCreateOpen,
        isAiDrawerOpen,
        setIsAiDrawerOpen,
        aiDrawerInitialPrompt,
        openAiDrawerWithPrompt,
        refreshData,
        switchWorkspace,
        markNotificationsRead,
        showToast,
        toasts,
        dismissToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
