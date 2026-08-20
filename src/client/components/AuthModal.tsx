import React, { useState } from 'react';
import { 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  googleProvider,
  signOut,
  db,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from '../lib/firebase.ts';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';
import { 
  Lock, 
  Mail, 
  User as UserIcon, 
  X, 
  Sparkles, 
  ArrowRight, 
  Building, 
  ShieldCheck, 
  LogOut,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { user, firebaseUser, showToast, refreshData } = useApp() as any;
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const fbUser = cred.user;

        // Create user doc in Firestore
        const userRef = doc(db, 'users', fbUser.uid);
        await setDoc(userRef, {
          id: fbUser.uid,
          email: fbUser.email,
          name: name || fbUser.displayName || 'Business Operator',
          role: 'owner',
          workspaceId: `ws-${fbUser.uid.substring(0, 8)}`,
          companyName: companyName || 'My Company',
          createdAt: serverTimestamp(),
        }, { merge: true });

        // Initialize isolated backend workspace for this user
        await api.initUserWorkspace({
          userId: fbUser.uid,
          userEmail: fbUser.email || email,
          userName: name || fbUser.displayName || 'Business Operator',
          companyName: companyName || 'My Company'
        });

        showToast('Account Created', 'Welcome to NexusOS! Your private database workspace is ready.');
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const fbUser = cred.user;
        
        await api.initUserWorkspace({
          userId: fbUser.uid,
          userEmail: fbUser.email || email,
          userName: fbUser.displayName || 'Business Operator'
        });

        showToast('Signed In', 'Welcome back to your private workspace.');
      }
      await refreshData();
      onClose();
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;

      // Sync user profile to Firestore
      const userRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        await setDoc(userRef, {
          id: fbUser.uid,
          email: fbUser.email,
          name: fbUser.displayName || 'Business Operator',
          photoURL: fbUser.photoURL || '',
          role: 'owner',
          workspaceId: `ws-${fbUser.uid.substring(0, 8)}`,
          companyName: `${fbUser.displayName || 'My'}'s Enterprise`,
          createdAt: serverTimestamp(),
        });
      }

      await api.initUserWorkspace({
        userId: fbUser.uid,
        userEmail: fbUser.email || '',
        userName: fbUser.displayName || 'Google User',
        companyName: `${fbUser.displayName || 'Enterprise'} Workspace`
      });

      showToast('Google Sign-In Successful', `Connected as ${fbUser.displayName || fbUser.email}`);
      await refreshData();
      onClose();
    } catch (err: any) {
      console.error('Google auth error:', err);
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      showToast('Signed Out', 'You have been logged out.');
      await refreshData();
      onClose();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden relative">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              N
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {firebaseUser ? 'User Account & Database' : isRegister ? 'Create Your Account' : 'Sign In to NexusOS'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {firebaseUser ? 'Connected to live Firestore Cloud Database' : 'Persistent workspace with live database storage'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {firebaseUser ? (
            <div className="space-y-5">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-3">
                  {firebaseUser.photoURL ? (
                    <img 
                      src={firebaseUser.photoURL} 
                      alt={firebaseUser.displayName || 'User'} 
                      className="w-12 h-12 rounded-full border border-slate-200"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base">
                      {(firebaseUser.displayName || firebaseUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{firebaseUser.displayName || 'Active Operator'}</h3>
                    <p className="text-xs text-slate-500 font-mono">{firebaseUser.email}</p>
                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="w-3 h-3" /> Live Firestore Connected
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="w-full py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Google One-Click Login */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2.5 shadow-2xs transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="flex items-center gap-2 my-2">
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-[10px] text-slate-400 uppercase font-semibold">or email</span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-3">
                {isRegister && (
                  <>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Full Name</label>
                      <div className="relative">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                        <input
                          required
                          type="text"
                          placeholder="e.g. Alex Morgan"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Business Name</label>
                      <div className="relative">
                        <Building className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          placeholder="e.g. Apex Agency Ltd"
                          value={companyName}
                          onChange={e => setCompanyName(e.target.value)}
                          className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      required
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      required
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-blue-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <span>{loading ? 'Processing...' : isRegister ? 'Create Account & Workspace' : 'Sign In'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setError(null);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                >
                  {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
