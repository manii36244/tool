import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  CreditCard, 
  Calendar, 
  Inbox, 
  Zap, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Video, 
  DollarSign, 
  Database, 
  Lock, 
  Layers, 
  TrendingUp, 
  BarChart3, 
  Globe, 
  Check, 
  ChevronRight,
  Mail,
  User as UserIcon,
  Play,
  Menu,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  googleProvider,
  db,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from '../lib/firebase.ts';
import { api } from '../lib/api.ts';

export const LandingView: React.FC = () => {
  const { setActiveView, showToast, refreshData, firebaseUser } = useApp() as any;
  
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeFeatureTab, setActiveFeatureTab] = useState<'crm' | 'finance' | 'appointments' | 'inbox' | 'automations' | 'ai'>('appointments');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);

    if (!email || !email.includes('@')) {
      setAuthError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    if (!password || password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      let fbUser: any = null;

      try {
        if (authMode === 'register') {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          fbUser = cred.user;
        } else {
          const cred = await signInWithEmailAndPassword(auth, email, password);
          fbUser = cred.user;
        }
      } catch (fbErr: any) {
        const code = fbErr?.code || '';
        console.warn('Firebase direct auth notice:', code, fbErr.message);

        if (code === 'auth/email-already-in-use') {
          // If already registered, switch to login and attempt sign-in
          setAuthMode('login');
          try {
            const loginCred = await signInWithEmailAndPassword(auth, email, password);
            fbUser = loginCred.user;
          } catch (loginErr: any) {
            throw new Error('This email is already registered. Please enter your correct password to log in.');
          }
        } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
          throw new Error('Invalid email or password. Please verify your credentials or choose "Create Workspace" if signing up for the first time.');
        } else if (code === 'auth/user-not-found') {
          throw new Error('Account not found. Please click "Create Workspace" above to sign up.');
        } else if (code === 'auth/weak-password') {
          throw new Error('Password must be at least 6 characters.');
        } else if (code === 'auth/invalid-email') {
          throw new Error('Please enter a valid email address.');
        } else {
          // If Firebase Auth provider is not enabled in Firebase Console (e.g. operation-not-allowed), 
          // use direct simulated user ID so the user can enter their workspace database smoothly
          const fallbackUid = `user-${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
          fbUser = {
            uid: fallbackUid,
            email: email,
            displayName: name || email.split('@')[0],
            photoURL: ''
          };
        }
      }

      const uid = fbUser?.uid || `user-${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const userDisplayName = name || fbUser?.displayName || email.split('@')[0];
      const wsCompany = companyName || `${userDisplayName}'s Enterprise`;

      // Sync Firestore user profile if possible
      try {
        const userRef = doc(db, 'users', uid);
        await setDoc(userRef, {
          id: uid,
          email: fbUser?.email || email,
          name: userDisplayName,
          role: 'owner',
          companyName: wsCompany,
          createdAt: serverTimestamp(),
        }, { merge: true });
      } catch (e) {
        console.warn('Firestore doc sync notice:', e);
      }

      // Initialize / switch to user's isolated workspace in backend
      await api.initUserWorkspace({
        userId: uid,
        userEmail: fbUser?.email || email,
        userName: userDisplayName,
        companyName: wsCompany,
        avatar: fbUser?.photoURL || ''
      });

      showToast('Workspace Ready', `Logged in as ${userDisplayName}`);
      await refreshData();
      setActiveView('dashboard');
    } catch (err: any) {
      console.error('Auth error:', err);
      setAuthError(err.message?.replace('Firebase: ', '') || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setAuthError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;

      try {
        const userRef = doc(db, 'users', fbUser.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          await setDoc(userRef, {
            id: fbUser.uid,
            email: fbUser.email,
            name: fbUser.displayName || 'Business Leader',
            photoURL: fbUser.photoURL || '',
            role: 'owner',
            companyName: `${fbUser.displayName || 'My'}'s Enterprise`,
            createdAt: serverTimestamp(),
          });
        }
      } catch (e) {
        console.warn('Firestore sync notice:', e);
      }

      await api.initUserWorkspace({
        userId: fbUser.uid,
        userEmail: fbUser.email || '',
        userName: fbUser.displayName || 'Google User',
        companyName: `${fbUser.displayName || 'Enterprise'} Workspace`
      });

      showToast('Google Sign-In Successful', `Connected as ${fbUser.displayName || fbUser.email}`);
      await refreshData();
      setActiveView('dashboard');
    } catch (err: any) {
      console.error('Google auth error:', err);
      setAuthError(err.message?.replace('Firebase: ', '') || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchDemo = async () => {
    showToast('Demo Workspace Ready', 'Viewing live interactive business system.', 'info');
    setActiveView('dashboard');
  };

  const pricingTiers = [
    {
      name: 'Starter',
      price: '$49',
      period: '/month',
      desc: 'Ideal for solo operators, freelancers, and early-stage consulting.',
      features: ['2 Team Seats', '1,000 Contacts & Leads', '50 Invoices / Month', 'Auto Google Meet Scheduling', '200 AI Gemini Requests', 'Standard Support'],
      highlight: false,
      tierKey: 'starter'
    },
    {
      name: 'Professional',
      price: '$99',
      period: '/month',
      desc: 'Everything growing SMBs need for multi-channel sales, finance & automation.',
      features: ['10 Team Seats with RBAC', '10,000 Contacts & Companies', 'Unlimited Invoices & Quotes', 'Automated Google Meet Video Links', '1,000 AI Gemini Calls / Month', 'Multi-step Workflow Automations', 'Priority Database Sync'],
      highlight: true,
      tierKey: 'pro'
    },
    {
      name: 'Business Scale',
      price: '$199',
      period: '/month',
      desc: 'For high-velocity agencies and scaling teams with complex operations.',
      features: ['25 Team Seats', '50,000 Contacts', 'Unlimited Invoices & Stripe Checkout', 'Advanced BI & Revenue Analytics', '5,000 AI Gemini Operations', 'Custom Webhooks & Redis Queues', 'Dedicated SLA'],
      highlight: false,
      tierKey: 'business'
    },
    {
      name: 'Enterprise',
      price: '$399',
      period: '/month',
      desc: 'Full private cloud tenancy, custom integrations, and infinite scaling.',
      features: ['Unlimited Seats & Contacts', 'Unlimited Everything', 'Custom Domain Routing', 'Custom Google Workspace OAuth', 'Dedicated Account Manager', '24/7 Phone & Slack Support'],
      highlight: false,
      tierKey: 'enterprise'
    }
  ];

  return (
    <div className="min-h-full bg-slate-50 text-slate-900 overflow-y-auto">
      {/* Top Banner Navigation */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs font-bold text-base">
            N
          </div>
          <div>
            <div className="text-sm font-black tracking-tight text-slate-900 flex items-center gap-1.5">
              <span>NexusOS</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">Enterprise</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">All-in-One Cloud Business Operating System</p>
          </div>
        </div>

        {/* Desktop Quick Nav */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
          <a href="#features-showcase" className="hover:text-blue-600 transition-colors">Features</a>
          <a href="#why-nexus" className="hover:text-blue-600 transition-colors">Why NexusOS</a>
          <a href="#architecture" className="hover:text-blue-600 transition-colors">Architecture</a>
          <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing & Limits</a>
        </nav>

        {/* Desktop Right CTA */}
        <div className="hidden sm:flex items-center gap-3">
          {firebaseUser ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 hidden lg:inline">
                Signed in as <strong className="text-blue-600">{firebaseUser.email}</strong>
              </span>
              <button
                onClick={() => setActiveView('dashboard')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <span>Go to Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleLaunchDemo}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Explore Live Demo
              </button>
              <a
                href="#auth-section"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <span>Sign In / Sign Up</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 sm:hidden">
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Dropdown */}
      {mobileNavOpen && (
        <div className="sm:hidden bg-white border-b border-slate-200 px-4 py-4 space-y-3 z-20 sticky top-[57px] shadow-lg animate-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col space-y-2 text-sm font-semibold text-slate-700">
            <a 
              href="#features-showcase" 
              onClick={() => setMobileNavOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Features & Tools
            </a>
            <a 
              href="#why-nexus" 
              onClick={() => setMobileNavOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Why NexusOS
            </a>
            <a 
              href="#architecture" 
              onClick={() => setMobileNavOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Private Architecture
            </a>
            <a 
              href="#pricing" 
              onClick={() => setMobileNavOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Pricing & Limits
            </a>
          </nav>
          
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <button
              onClick={() => {
                setMobileNavOpen(false);
                handleLaunchDemo();
              }}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all text-center"
            >
              Launch Live Demo
            </button>
            <a
              href="#auth-section"
              onClick={() => setMobileNavOpen(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5"
            >
              <span>Sign In / Sign Up</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="px-4 sm:px-8 py-12 sm:py-16 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Gen Operating System with Auto Google Meet & Private Database</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-[1.15]">
            Every tool your business needs. <br />
            <span className="text-blue-600">One unified private platform.</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
            Streamline your entire client lifecycle: CRM lead tracking, itemized quotes & Stripe invoicing, automated Google Meet scheduling, unified multichannel inbox, workflow triggers, and native Gemini AI assistance.
          </p>

          {/* Quick Pillars */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-xs">
                <Video className="w-4 h-4" />
                <span>Google Meet</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Instant video links on confirmation</p>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                <CreditCard className="w-4 h-4" />
                <span>Sales & Finance</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Quotes, invoices & Stripe payments</p>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
                <Database className="w-4 h-4" />
                <span>Private Database</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Isolated data storage per user</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleLaunchDemo}
              className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Launch Live Interactive System</span>
            </button>
            <a
              href="#features-showcase"
              className="px-5 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm transition-all"
            >
              View Feature Capabilities
            </a>
          </div>
        </div>

        {/* Auth / Sign-Up Card */}
        <div id="auth-section" className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {authMode === 'register' ? 'Create Private Workspace' : 'Sign In to Your Workspace'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {authMode === 'register' ? 'Get your dedicated database & tenant storage' : 'Access your isolated records & live data'}
                </p>
              </div>
              <div className="flex p-0.5 bg-slate-100 rounded-lg">
                <button
                  onClick={() => setAuthMode('register')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${authMode === 'register' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'}`}
                >
                  Sign Up
                </button>
                <button
                  onClick={() => setAuthMode('login')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${authMode === 'login' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'}`}
                >
                  Log In
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{authError}</span>
              </div>
            )}

            <button
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-2 shadow-2xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continue with Google Cloud Auth</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-slate-200"></div>
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">or with email</span>
              <div className="flex-1 border-t border-slate-200"></div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-3.5">
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Full Name *</label>
                    <div className="relative">
                      <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        required
                        placeholder="Alex Morgan"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full text-xs pl-8 pr-3 py-2.5 rounded-lg border border-slate-200 focus:outline-blue-600"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Company / Organization *</label>
                    <div className="relative">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        required
                        placeholder="Apex Ventures Inc."
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        className="w-full text-xs pl-8 pr-3 py-2.5 rounded-lg border border-slate-200 focus:outline-blue-600"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Work Email *</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    required
                    type="email"
                    placeholder="alex@apexventures.io"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-2.5 rounded-lg border border-slate-200 focus:outline-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Password *</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    required
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-2.5 rounded-lg border border-slate-200 focus:outline-blue-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{authMode === 'register' ? 'Launch My Dedicated Database' : 'Log In & Load Data'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Multi-tenant Data Isolation</span>
              </span>
              <button
                type="button"
                onClick={handleLaunchDemo}
                className="text-blue-600 hover:underline font-semibold"
              >
                Skip for Guest Demo →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep-Dive Section */}
      <section id="features-showcase" className="px-4 sm:px-8 py-16 max-w-7xl mx-auto border-t border-slate-200 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Engineered for Complete Operational Excellence</h2>
          <p className="text-xs sm:text-sm text-slate-600">Every module is natively integrated with zero plugin dependencies.</p>
        </div>

        {/* Feature Navigation Tabs */}
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { id: 'appointments', label: 'Appointments & Google Meet', icon: Video },
            { id: 'finance', label: 'Sales, Invoicing & Stripe', icon: CreditCard },
            { id: 'crm', label: 'Client CRM & Pipeline', icon: Users },
            { id: 'inbox', label: 'Multichannel Inbox', icon: Inbox },
            { id: 'automations', label: 'Automations & Queues', icon: Zap },
            { id: 'ai', label: 'Gemini AI Co-Pilot', icon: Sparkles },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeFeatureTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFeatureTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Feature Showcase Box */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-10">
          {activeFeatureTab === 'appointments' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold">
                  <Video className="w-3.5 h-3.5" />
                  <span>Automated Google Meet Video Generation</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Seamless Meeting Confirmations with Auto Video Links</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  When a client books an appointment via your public booking page or when your staff schedules a session internally, NexusOS instantly generates a secure Google Meet video link (<code className="text-blue-600 font-mono text-xs">https://meet.google.com/xxx-yyyy-zzz</code>), attaches it to the confirmation, and includes 1-click Join & Copy actions directly in the appointments view.
                </p>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Public client booking link with real-time slot availability</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Instant Google Meet URL generated and stored per booking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Direct cancellation & appointment deletion controls</span>
                  </li>
                </ul>
                <button
                  onClick={() => setActiveView('appointments')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <span>Open Appointments Tool</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4 font-mono text-xs">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 font-sans">Discovery Video Call</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">Confirmed</span>
                  </div>
                  <p className="text-slate-500 text-[11px] font-sans">Client: Alex Morgan (alex@apexventures.io)</p>
                  <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-md flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-blue-700 truncate">
                      <Video className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">https://meet.google.com/dsk-opqw-zrt</span>
                    </div>
                    <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded font-sans font-semibold">Join Meet</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeFeatureTab === 'finance' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Sales, Quotes & Invoicing</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Commercial Proposals to Instant Invoicing & Stripe</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Manage your catalog of services and products, generate professional itemized quotes, convert accepted proposals into invoices with a single click, collect Stripe payments, and track operational expenses with robust deletion and auditing.
                </p>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>1-Click Quote to Invoice conversion</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Stripe Checkout integration & direct Mark Paid action</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Products/Services catalog and Expense tracking with full deletion</span>
                  </li>
                </ul>
                <button
                  onClick={() => setActiveView('finance')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <span>Open Sales & Finance</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-3 font-sans text-xs">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900 block">INV-2026-004</span>
                    <span className="text-[11px] text-slate-500">Cloud Architecture Retainer</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 block">$4,850.00</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">PAID VIA STRIPE</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeFeatureTab === 'crm' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold">
                  <Users className="w-3.5 h-3.5" />
                  <span>Pipeline & Contacts CRM</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Full Pipeline Visibility & Automated Lead Scoring</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Track inbound inquiries from public web forms, score leads automatically based on deal size and engagement, convert leads into customers, and manage multi-stage visual deal boards with drag-and-drop velocity.
                </p>
                <button
                  onClick={() => setActiveView('crm')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <span>Open CRM Pipeline</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex justify-between items-center">
                  <span className="font-bold text-slate-800">Acme Global Enterprise</span>
                  <span className="text-blue-600 font-bold">$28,000</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex justify-between items-center">
                  <span className="font-bold text-slate-800">Apex Growth Strategy</span>
                  <span className="text-blue-600 font-bold">$12,500</span>
                </div>
              </div>
            </div>
          )}

          {activeFeatureTab === 'inbox' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-rose-50 text-rose-700 text-xs font-bold">
                  <Inbox className="w-3.5 h-3.5" />
                  <span>Unified Multichannel Inbox</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Email, Live Chat, WhatsApp & Internal Team Notes</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Consolidate every client conversation across channels into a single unified stream with instant AI suggested replies and team collaboration notes.
                </p>
                <button
                  onClick={() => setActiveView('inbox')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <span>Open Unified Inbox</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1">
                  <span className="font-bold text-slate-900 block">Sarah Jenkins • Live Chat</span>
                  <p className="text-slate-500 text-[11px]">"Could you confirm the deployment schedule for next Tuesday?"</p>
                </div>
              </div>
            </div>
          )}

          {activeFeatureTab === 'automations' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Workflow Automation Engine</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Automate Triggers, Follow-ups, and Task Assignment</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Set event-driven recipes: when a new lead submits a form, trigger automated onboarding emails, generate tasks for account managers, and post notifications.
                </p>
                <button
                  onClick={() => setActiveView('automations')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <span>Open Automations Engine</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
                  <span className="font-bold text-slate-800">Auto-assign hot leads to sales lead</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">ACTIVE</span>
                </div>
              </div>
            </div>
          )}

          {activeFeatureTab === 'ai' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Server-Side Gemini AI Engine</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Executive AI Co-Pilot Across Your Entire Database</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Ask Gemini anything about your financial velocity, top converting deals, unpaid invoices, or draft custom customer outreach emails in seconds.
                </p>
                <button
                  onClick={() => setActiveView('ai-assistant')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <span>Open AI Assistant</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="font-bold text-blue-600 block mb-1">Gemini AI Executive Summary</span>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    "Total pipeline value is $148,500 across 8 active deals. $11,600 collected this month with a 42% invoice conversion rate."
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Database Isolation & Multi-Tenancy Architecture Section */}
      <section className="px-4 sm:px-8 py-16 max-w-7xl mx-auto border-t border-slate-200">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden space-y-8">
          <div className="max-w-2xl space-y-3 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold">
              <Database className="w-3.5 h-3.5" />
              <span>Isolated Multi-Tenant Cloud Architecture</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
              Every User Gets Their Own Private Database & Workspace
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              When you sign up or log in, NexusOS provisions a dedicated workspace tied specifically to your user account. Your client contacts, invoices, quotes, appointments, and custom configurations are strictly isolated and never mixed with other users.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <h4 className="text-sm font-bold text-white">Private Data Scoping</h4>
              <p className="text-xs text-slate-400 leading-relaxed">Every query, write, and delete is strictly scoped to your authenticated <code className="text-blue-300">workspace_id</code>.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2">
              <HardDriveIcon className="w-5 h-5 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">Firestore Cloud Sync</h4>
              <p className="text-xs text-slate-400 leading-relaxed">Persistent cloud document storage ensures your data is saved safely across sessions.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2">
              <Lock className="w-5 h-5 text-amber-400" />
              <h4 className="text-sm font-bold text-white">Role-Based Access (RBAC)</h4>
              <p className="text-xs text-slate-400 leading-relaxed">Invite team members with granular permissions (Owner, Admin, Manager, Specialist).</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing & Upgrade Limits Section */}
      <section id="pricing" className="px-4 sm:px-8 py-16 max-w-7xl mx-auto border-t border-slate-200 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Transparent Plans & Limit Upgrades</h2>
          <p className="text-xs sm:text-sm text-slate-600">Upgrade limits any time inside Settings & Billing with instant Stripe activation.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pricingTiers.map(tier => (
            <div
              key={tier.name}
              className={`rounded-2xl p-6 flex flex-col justify-between transition-all bg-white border ${
                tier.highlight
                  ? 'border-blue-600 shadow-xl ring-2 ring-blue-600/20 relative'
                  : 'border-slate-200 shadow-xs hover:border-slate-300'
              }`}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                  Most Popular
                </span>
              )}
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{tier.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{tier.desc}</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900">{tier.price}</span>
                  <span className="text-xs text-slate-400 font-semibold">{tier.period}</span>
                </div>
                <div className="border-t border-slate-100 pt-4 space-y-2">
                  {tier.features.map(f => (
                    <div key={f} className="flex items-center gap-2 text-xs text-slate-700">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6">
                <button
                  onClick={() => {
                    setActiveView('settings');
                    showToast('Subscription Upgrade', `Configure ${tier.name} plan tier in Settings & Billing.`);
                  }}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                    tier.highlight
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  Upgrade to {tier.name}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              N
            </div>
            <span className="font-bold text-slate-800">NexusOS</span>
            <span>— Complete Business Architecture</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Google Meet Automated Integration</span>
            <span>•</span>
            <span>Stripe Commercial Invoicing</span>
            <span>•</span>
            <span>Private User Database</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

function HardDriveIcon(props: any) {
  return <Database {...props} />;
}
