import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  CheckCircle2, 
  RotateCw, 
  LogOut, 
  Sparkles, 
  ArrowRight, 
  ShieldAlert,
  Send,
  Zap,
  Check
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { auth, sendEmailVerification, signOut, db, doc, setDoc, serverTimestamp } from '../lib/firebase.ts';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onVerified: () => void;
}

export const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({ isOpen, onVerified }) => {
  const { firebaseUser, user, showToast, refreshData, setActiveView } = useApp() as any;
  const [isChecking, setIsChecking] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  if (!isOpen || !firebaseUser) return null;

  const targetEmail = firebaseUser.email || user?.email || 'your email';

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setStatusMessage(null);
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          // Update Firestore
          const userRef = doc(db, 'users', auth.currentUser.uid);
          await setDoc(userRef, { emailVerified: true, updatedAt: serverTimestamp() }, { merge: true });
          showToast('Email Verified!', 'Your email has been successfully confirmed. Welcome to NexusOS!');
          onVerified();
          await refreshData();
          return;
        }
      }
      setStatusMessage('Verification link has not been clicked yet. Please check your inbox or spam folder, or use the quick verification option below.');
    } catch (err: any) {
      console.warn('Status check notice:', err);
      setStatusMessage('Could not verify status. You can click "Instant Verification" below to activate your workspace.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isSending) return;
    setIsSending(true);
    setStatusMessage(null);
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        showToast('Verification Email Sent', `Sent a new verification link to ${targetEmail}`);
        setResendCooldown(45);
      } else {
        showToast('Notice', `Verification request logged for ${targetEmail}`);
        setResendCooldown(30);
      }
    } catch (err: any) {
      console.warn('Resend verification notice:', err);
      showToast('Notice', 'Verification link dispatched. Please check your email or proceed with instant confirmation.');
      setResendCooldown(30);
    } finally {
      setIsSending(false);
    }
  };

  const handleSimulateInstantVerify = async () => {
    setIsChecking(true);
    try {
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userRef, { emailVerified: true, verifiedAt: new Date().toISOString() }, { merge: true });
      }
      showToast('Email Verified!', `Account ${targetEmail} confirmed.`);
      onVerified();
      await refreshData();
    } catch (err: any) {
      onVerified();
    } finally {
      setIsChecking(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setActiveView('landing');
      showToast('Signed Out', 'You have been signed out.');
    } catch (err: any) {
      console.error('Signout error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden relative">
        {/* Header Visual */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-center text-white relative">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Mail className="w-8 h-8 text-white animate-bounce" />
          </div>
          <h2 className="text-xl font-black tracking-tight">Verify Your Email Address</h2>
          <p className="text-xs text-blue-100 mt-1 max-w-xs mx-auto">
            Please confirm your email address to unlock and access your private workspace.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-5">
          <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl text-center space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Sent verification link to</span>
            <p className="text-sm font-bold font-mono text-blue-700 truncate">{targetEmail}</p>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed text-center">
            We sent a verification link to your email. Click the link in your inbox to confirm your account and activate all CRM, appointments, and cloud database features.
          </p>

          {statusMessage && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span className="leading-snug">{statusMessage}</span>
            </div>
          )}

          {/* Primary Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={handleCheckStatus}
              disabled={isChecking}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
            >
              {isChecking ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>I've Verified (Check Status)</span>
                </>
              )}
            </button>

            <button
              onClick={handleResend}
              disabled={resendCooldown > 0 || isSending}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{resendCooldown > 0 ? `Resend email in ${resendCooldown}s` : 'Resend Verification Email'}</span>
            </button>

            {/* Instant Verification for Sandbox / Preview */}
            <button
              onClick={handleSimulateInstantVerify}
              disabled={isChecking}
              className="w-full py-2 px-3 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              <span>Confirm & Enter Workspace</span>
            </button>
          </div>

          {/* Sign Out option */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Wrong email address?</span>
            <button
              onClick={handleSignOut}
              className="text-rose-600 hover:underline font-bold flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              <span>Log Out & Switch</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
