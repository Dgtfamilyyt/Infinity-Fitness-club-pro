import React, { useState, useRef } from 'react';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Dumbbell, 
  Sparkles, 
  ShieldAlert, 
  ArrowLeft,
  ExternalLink,
  Info
} from 'lucide-react';
import { 
  signInWithEmail, 
  signInWithGoogle, 
  sendResetPassword, 
  parseAuthError
} from '../../lib/firebase';
import { GymSettings } from '../../types';

interface MemberLoginProps {
  settings: GymSettings;
  onSuccess: (email: string) => void;
  onNavigateHome: () => void;
  onNavigateStaffLogin: () => void;
}

export const MemberLogin: React.FC<MemberLoginProps> = ({
  settings,
  onSuccess,
  onNavigateHome,
  onNavigateStaffLogin
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  
  // Loading & Error States
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showProviderNotice, setShowProviderNotice] = useState(false);

  // Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please provide both registered email address and password.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setShowProviderNotice(false);

    try {
      const user = await signInWithEmail(email, password);
      onSuccess(user.email || email);
    } catch (err: any) {
      console.error('Auth error:', err);
      const parsed = parseAuthError(err);
      setErrorMessage(parsed.message);
      if (parsed.isOperationNotAllowed) {
        setShowProviderNotice(true);
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
      await signInWithGoogle();
      // Browser navigates away to Google Redirect auth directly from user click
    } catch (err: any) {
      const parsed = parseAuthError(err);
      if (parsed.isCancelled) {
        setGoogleLoading(false);
        return;
      }
      console.error('Google sign-in error:', err);
      setErrorMessage(parsed.message);
      if (parsed.isOperationNotAllowed) {
        setShowProviderNotice(true);
      }
      setGoogleLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetError('Please enter your registered email address.');
      return;
    }

    setResetLoading(true);
    setResetError(null);
    setResetSuccess(null);

    try {
      await sendResetPassword(resetEmail);
      setResetSuccess(`Password reset email sent to ${resetEmail}. Check your inbox or spam folder.`);
    } catch (err: any) {
      console.error('Reset error:', err);
      const parsed = parseAuthError(err);
      setResetError(parsed.message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#09090b] flex flex-col justify-center">
      {/* Back button */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6 pb-2">
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition group py-2"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Public Website</span>
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-5xl rounded-3xl bg-[#121214] border border-zinc-800 shadow-2xl overflow-hidden grid lg:grid-cols-12 min-h-[620px]">
          
          {/* Left Column: Athletic Visual & Brand Identity (Desktop Only) */}
          <div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between p-10 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black border-r border-zinc-800/80 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.15),transparent_60%)] pointer-events-none" />

            {/* Top Brand */}
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-black flex items-center justify-center font-black text-2xl shadow-xl shadow-emerald-500/20">
                ∞
              </div>
              <h1 className="mt-6 text-2xl font-black tracking-tight text-white uppercase leading-none">
                {settings.name}
              </h1>
              <p className="mt-2 text-xs font-extrabold tracking-widest text-emerald-400 uppercase">
                {settings.tagline}
              </p>
              <p className="mt-4 text-xs text-zinc-400 leading-relaxed max-w-xs">
                {settings.supportingConcept} Experience zero wait times with our smart crowd-balanced training zones.
              </p>
            </div>

            {/* Middle Feature Highlights */}
            <div className="relative z-10 space-y-3 my-6">
              <div className="flex items-center gap-3 text-xs text-zinc-300">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  ✓
                </div>
                <span>Contactless QR Check-In with live zone passes</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-300">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  ✓
                </div>
                <span>Periodized hypertrophy & strength assignments</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-300">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  ✓
                </div>
                <span>Verified PR history & real-time floor occupancy</span>
              </div>
            </div>

            {/* Bottom Staff Portal Link */}
            <div className="relative z-10 pt-6 border-t border-zinc-800">
              <button
                onClick={onNavigateStaffLogin}
                className="text-xs text-zinc-400 hover:text-emerald-400 font-semibold transition flex items-center gap-1.5"
              >
                <span>Gym Trainer or Staff Member?</span>
                <span className="text-emerald-400 font-bold underline">Staff Portal →</span>
              </button>
            </div>
          </div>

          {/* Right Column: Member Sign In Form */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-[#121214]">
            <div className="max-w-md w-full mx-auto">
              
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono uppercase tracking-wider">
                    ATHLETE ENTRANCE
                  </span>
                  <span className="text-xs text-zinc-500 font-medium">
                    Infinity Member Club
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white uppercase mt-2 tracking-tight">
                  Sign In To Member Club
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Access your workout splits, contactless QR pass, and training records
                </p>
              </div>

              {/* Error Notice */}
              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-950/30 border border-red-500/30 text-red-300 text-xs space-y-2 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                    <span className="leading-relaxed">{errorMessage}</span>
                  </div>
                </div>
              )}

              {/* Single Google Redirect Auth Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full min-h-[46px] py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-3 disabled:opacity-50 shadow-sm"
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>CONTINUE WITH GOOGLE</span>
              </button>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-[#121214] px-3 text-zinc-500 font-mono font-bold tracking-wider">
                    USE EMAIL & PASSWORD
                  </span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                    <input
                      ref={emailInputRef}
                      type="email"
                      required
                      placeholder="athlete@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition font-mono"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(email);
                        setShowForgotModal(true);
                      }}
                      className="text-[11px] text-zinc-400 hover:text-emerald-400 transition"
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
                  disabled={loading || googleLoading}
                  className="w-full min-h-[46px] py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In To Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Reception notice for new athletes */}
              <div className="mt-4 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-center">
                <p className="text-[11px] text-zinc-400">
                  New to Infinity Fitness Club? Memberships and athlete profiles are issued by club reception.
                </p>
              </div>

              {/* Mobile Staff Link */}
              <div className="mt-6 pt-4 border-t border-zinc-800/80 text-center lg:hidden">
                <button
                  onClick={onNavigateStaffLogin}
                  className="text-xs text-zinc-400 hover:text-emerald-400 font-semibold"
                >
                  Are you a trainer or gym staff? <span className="text-emerald-400 underline">Staff Portal →</span>
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#121214] border border-zinc-800 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white uppercase tracking-wide">
              Reset Your Password
            </h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Enter your registered athlete email address and Firebase Authentication will send you a secure password reset link.
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
                  placeholder="name@example.com"
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
                    {resetLoading ? 'Sending...' : 'Send Reset Link'}
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
