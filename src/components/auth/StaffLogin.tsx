import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ArrowLeft,
  ExternalLink,
  Zap,
  Info,
  KeyRound
} from 'lucide-react';
import { signInWithEmail, signInWithGoogle, sendResetPassword, signInAsDemoUser } from '../../lib/firebase';
import { GymSettings } from '../../types';

interface StaffLoginProps {
  settings: GymSettings;
  onSuccess: (email: string) => void;
  onNavigateMemberLogin: () => void;
  onNavigateHome: () => void;
}

export const StaffLogin: React.FC<StaffLoginProps> = ({
  settings,
  onSuccess,
  onNavigateMemberLogin,
  onNavigateHome
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showProviderNotice, setShowProviderNotice] = useState(false);

  // Forgot password
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both staff email and secure password.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setShowProviderNotice(false);

    try {
      const user = await signInWithEmail(email, password);
      onSuccess(user.email || email);
    } catch (err: any) {
      console.error('Staff auth error:', err);
      const code = err.code || '';
      if (code === 'auth/operation-not-allowed') {
        setShowProviderNotice(true);
        setErrorMessage('Firebase Authentication has not enabled this sign-in provider yet in the Firebase Console.');
      } else if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setErrorMessage('Invalid staff credentials. Please check your email and password or use quick access below.');
      } else if (code === 'auth/network-request-failed') {
        setErrorMessage('Network error. Please check your internet connection.');
      } else {
        setErrorMessage(err.message || 'Staff sign-in failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorMessage(null);
    setShowProviderNotice(false);

    try {
      const user = await signInWithGoogle();
      onSuccess(user.email || '');
    } catch (err: any) {
      console.error('Google sign in error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setShowProviderNotice(true);
        setErrorMessage('Google Sign-In is not enabled yet in your Firebase Project Console (swift-fx-h1ttq).');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Google sign-in was cancelled.');
      } else if (err.code === 'auth/network-request-failed') {
        setErrorMessage('Network connection error. Please check your internet connection.');
      } else {
        setErrorMessage(err.message || 'Google Sign-In failed. Please try again or use quick access.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, name: string) => {
    setErrorMessage(null);
    setShowProviderNotice(false);
    signInAsDemoUser(demoEmail, name);
    onSuccess(demoEmail);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetError('Please enter your staff email.');
      return;
    }

    setResetLoading(true);
    setResetError(null);
    setResetSuccess(null);

    try {
      await sendResetPassword(resetEmail);
      setResetSuccess(`Password reset instructions sent to ${resetEmail}.`);
    } catch (err: any) {
      console.error('Reset error:', err);
      setResetError(err.message || 'Failed to send reset link.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#070709] flex flex-col justify-center">
      {/* Top back link */}
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-6 pb-2 flex items-center justify-between">
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-white transition group py-2"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Public Website</span>
        </button>

        <button
          onClick={onNavigateMemberLogin}
          className="text-xs text-zinc-400 hover:text-emerald-400 font-semibold"
        >
          Member Athlete? <span className="text-emerald-400 underline">Member Portal →</span>
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md rounded-3xl bg-[#111113] border border-zinc-800 shadow-2xl p-6 sm:p-8 relative overflow-hidden">
          {/* Subtle accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-black">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase tracking-widest">
              AUTHORIZED ACCESS ONLY
            </span>
          </div>

          <div className="mt-5">
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
              Infinity Staff Portal
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Floor Trainers • Front Desk Reception • Administration & Ownership
            </p>
          </div>

          {/* Error Banner & Firebase Provider Guide */}
          {errorMessage && (
            <div className="mt-4 p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
              
              {showProviderNotice && (
                <div className="pt-2 border-t border-red-500/20 text-[11px] text-zinc-300 space-y-2">
                  <p className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    How to enable in 30 seconds:
                  </p>
                  <ol className="list-decimal pl-4 space-y-1 text-zinc-300">
                    <li>Open Firebase Console for your project (<strong>swift-fx-h1ttq</strong>).</li>
                    <li>Go to <strong>Authentication → Sign-in method</strong>.</li>
                    <li>Click <strong>Google</strong> (or <strong>Email/Password</strong>) and toggle <strong>Enable</strong>.</li>
                  </ol>
                  <a
                    href="https://console.firebase.google.com/project/swift-fx-h1ttq/authentication/providers"
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-bold underline mt-1"
                  >
                    <span>Open Firebase Console Providers</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Quick Instant Test Access */}
          <div className="mt-5 p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold font-mono uppercase text-emerald-400 flex items-center gap-1.5">
                <Zap className="w-3 h-3" />
                Instant Portal Access (One-Click)
              </span>
              <span className="text-[9px] text-zinc-500 uppercase">Bypass pending setup</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('dgtfamilyyt8@gmail.com', 'Karan Singhania (Club Owner)')}
                className="w-full text-left px-3 py-2 rounded-xl bg-zinc-950 hover:bg-emerald-950/30 border border-zinc-800 hover:border-emerald-500/40 text-xs text-zinc-200 hover:text-white transition flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-[11px] text-emerald-400 group-hover:text-emerald-300">Club Owner & Admin</div>
                  <div className="text-[10px] text-zinc-400 font-mono">dgtfamilyyt8@gmail.com</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 transition" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('rahul.sharma@infinityfitnessclub.in', 'Rahul Sharma (Head Coach)')}
                className="w-full text-left px-3 py-2 rounded-xl bg-zinc-950 hover:bg-emerald-950/30 border border-zinc-800 hover:border-emerald-500/40 text-xs text-zinc-200 hover:text-white transition flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-[11px] text-emerald-400 group-hover:text-emerald-300">Head Coach & Floor Trainer</div>
                  <div className="text-[10px] text-zinc-400 font-mono">rahul.sharma@infinityfitnessclub.in</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 transition" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('priya.verma@infinityfitnessclub.in', 'Priya Verma (Front Desk)')}
                className="w-full text-left px-3 py-2 rounded-xl bg-zinc-950 hover:bg-emerald-950/30 border border-zinc-800 hover:border-emerald-500/40 text-xs text-zinc-200 hover:text-white transition flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-[11px] text-emerald-400 group-hover:text-emerald-300">Front Desk & Reception</div>
                  <div className="text-[10px] text-zinc-400 font-mono">priya.verma@infinityfitnessclub.in</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 transition" />
              </button>
            </div>
          </div>

          {/* Quick Google Sign In */}
          <div className="mt-6">
            <button
              type="button"
              disabled={googleLoading || loading}
              onClick={handleGoogleSignIn}
              className="w-full min-h-[46px] py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-bold transition flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              )}
              <span>Continue with Staff Google ID</span>
            </button>
          </div>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px bg-zinc-800 flex-1" />
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Or Official Staff Email</span>
            <div className="h-px bg-zinc-800 flex-1" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="coach@infinityfitnessclub.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block">
                  Staff Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setShowForgotModal(true);
                  }}
                  className="text-[11px] text-zinc-500 hover:text-emerald-400 transition"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full min-h-[44px] pl-10 pr-10 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-zinc-500 hover:text-white p-0.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[46px] py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authorizing Staff Role...</span>
                </>
              ) : (
                <>
                  <span>Sign In To Operations</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-zinc-800/80 text-center text-[11px] text-zinc-500">
            Internal Gym Portal • Authenticated through Firebase Security Rules
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#121214] border border-zinc-800 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white uppercase tracking-wide">
              Staff Password Recovery
            </h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Enter your official staff email. A reset link will be dispatched via Firebase Auth.
            </p>

            {resetSuccess ? (
              <div className="mt-4 p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>{resetSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="mt-4 space-y-3">
                {resetError && (
                  <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-red-300 text-xs">
                    {resetError}
                  </div>
                )}
                <input
                  type="email"
                  required
                  placeholder="staff@infinityfitnessclub.in"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-emerald-500 font-mono"
                />
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs"
                  >
                    {resetLoading ? 'Sending...' : 'Send Recovery Link'}
                  </button>
                </div>
              </form>
            )}

            {resetSuccess && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
