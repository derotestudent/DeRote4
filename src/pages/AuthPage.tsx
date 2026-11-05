import React, { useState } from 'react';
import {
  ArrowLeft,
  Mail,
  Lock,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { DeRoteWordmark } from '../components/DeRoteWordmark';
import { Footer } from '../components/Footer';
import {
  signInStudentWithEmail,
  signInStudentWithGoogle,
  registerStudentWithEmail,
} from '../services/firebaseAuth';

interface AuthPageProps {
  initialMode?: 'login' | 'signup';
  onNavigate: (route: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'login',
  onNavigate,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

  // Sign In fields: ONLY Email and Password
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Create Account fields: Name, Email, Password, Confirm Password
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & loading
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  const handleRedirect = () => {
    const target = sessionStorage.getItem('derote_auth_redirect') || '/dashboard';
    sessionStorage.removeItem('derote_auth_redirect');
    setTimeout(() => onNavigate(target), 350);
  };

  // 1. Email and Password Sign In
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const emailTrim = signInEmail.trim();

    if (!emailTrim) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter your email address.',
      });
      return;
    }

    if (!signInPassword) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter your password.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await signInStudentWithEmail(emailTrim, signInPassword);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Welcome back, ${res.student?.fullName || 'Student'}! Opening your session...`,
        });
        handleRedirect();
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Invalid credentials. Please verify your details.',
        });
      }
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'An error occurred during sign in. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Google Direct Sign In
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setStatusMessage(null);

    try {
      const res = await signInStudentWithGoogle();
      if (res.success) {
        setUnauthorizedDomain(null);
        setStatusMessage({
          type: 'success',
          text: `Welcome, ${res.student?.fullName || 'Student'}! Signed in with Google.`,
        });
        handleRedirect();
      } else {
        if (res.errorCode === 'auth/unauthorized-domain') {
          const currentHostname = res.domain || (typeof window !== 'undefined' ? window.location.hostname : '');
          setUnauthorizedDomain(currentHostname);
        }
        setStatusMessage({
          type: 'error',
          text: res.error || 'Google sign in could not be completed.',
        });
      }
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Failed to authenticate with Google. Please try again.',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // 3. Create Account with Email and Password
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const nameTrim = signupName.trim();
    const emailTrim = signupEmail.trim();

    if (!nameTrim) {
      setStatusMessage({ type: 'error', text: 'Please enter your full name.' });
      return;
    }
    if (!emailTrim) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter your email address.',
      });
      return;
    }
    if (!signupPassword || signupPassword.length < 6) {
      setStatusMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setStatusMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerStudentWithEmail(nameTrim, emailTrim, signupPassword);

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: 'Account created successfully! Welcome to DeRote.',
        });
        handleRedirect();
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Could not create account. Please check your details.',
        });
      }
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Registration could not be completed. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F8FD] flex flex-col justify-between text-[#102C46]">
      {/* Top Header */}
      <header className="bg-white border-b border-[#E8F3FF] px-4 sm:px-8 py-3.5 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => onNavigate('/')}
            className="flex items-center text-left focus-visible:outline-2 focus-visible:outline-[#0866C6] rounded-lg cursor-pointer"
          >
            <DeRoteWordmark showDescriptor={true} size="md" />
          </button>

          <button
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#64778C] hover:text-[#062B50] px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Site</span>
          </button>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#E8F3FF] shadow-xl max-w-md w-full">
          {/* Two-Option Switcher */}
          <div className="grid grid-cols-2 p-1.5 bg-[#F2F7FC] rounded-2xl mb-8 border border-[#E2EDF8]">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setStatusMessage(null);
              }}
              className={`py-2.5 text-sm font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-[#0866C6] shadow-sm'
                  : 'text-[#64778C] hover:text-[#062B50]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setStatusMessage(null);
              }}
              className={`py-2.5 text-sm font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-[#0866C6] shadow-sm'
                  : 'text-[#64778C] hover:text-[#062B50]'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Title */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#062B50] tracking-tight">
              {mode === 'login' ? 'Student Sign In' : 'Create Student Account'}
            </h1>
            <p className="text-xs sm:text-sm text-[#5A6E85] mt-1.5 leading-relaxed">
              {mode === 'login'
                ? 'Sign in to access your reflective self-discovery journey.'
                : 'Enter your details to create your student account.'}
            </p>
          </div>

          {/* Status Feedback Message */}
          {statusMessage && (
            <div
              className={`mb-6 p-4 rounded-2xl text-xs sm:text-sm flex items-start gap-2.5 ${
                statusMessage.type === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              {statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Interactive Authorized Domain Helper Card */}
          {unauthorizedDomain && (
            <div className="mb-6 p-4.5 rounded-2xl bg-amber-50/90 border border-amber-300 text-left space-y-3 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs sm:text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Authorize Domain in Firebase Console</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUnauthorizedDomain(null)}
                  className="text-amber-700 hover:text-amber-900 text-xs font-semibold px-1.5 py-0.5 rounded cursor-pointer"
                >
                  Dismiss
                </button>
              </div>

              <p className="text-xs text-amber-800 leading-relaxed">
                Google OAuth requires your web app domain to be added to Authorized Domains in your Firebase project (takes 10 seconds):
              </p>

              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-amber-300/80 font-mono text-xs text-slate-900">
                <span className="flex-1 truncate font-semibold select-all">{unauthorizedDomain}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(unauthorizedDomain);
                    }
                    setCopiedDomain(true);
                    setTimeout(() => setCopiedDomain(false), 2000);
                  }}
                  className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold cursor-pointer transition-colors"
                >
                  {copiedDomain ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-amber-800" />
                      <span>Copy Domain</span>
                    </>
                  )}
                </button>
              </div>

              <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <a
                  href="https://console.firebase.google.com/project/gen-lang-client-0276070718/authentication/settings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0866C6] hover:text-[#062B50] hover:underline"
                >
                  <span>Open Firebase Authorized Domains Settings</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Option: Sign in Directly with Google */}
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading || isGoogleLoading}
              className="w-full min-h-[48px] py-2.5 px-4 rounded-xl border border-[#D5E4F3] bg-white hover:bg-[#F8FAFD] text-[#062B50] text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-3 shadow-xs hover:border-[#0866C6]/40 active:scale-[0.99] disabled:opacity-60"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="w-5 h-5 text-[#0866C6] animate-spin" />
                  <span>Connecting with Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>{mode === 'login' ? 'Sign in with Google' : 'Sign up with Google'}</span>
                </>
              )}
            </button>

            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-[#E8F3FF]"></div>
              <span className="flex-shrink mx-3 text-[11px] text-[#64778C] font-semibold uppercase tracking-wider">
                Or with email
              </span>
              <div className="flex-grow border-t border-[#E8F3FF]"></div>
            </div>
          </div>

          {/* Mode 1: Sign In Form (ONLY Email and Password) */}
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#062B50] mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#64778C] absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="student@example.com"
                    disabled={isLoading || isGoogleLoading}
                    required
                    autoComplete="email"
                    className="w-full text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-[#062B50]/15 focus:border-[#0866C6] focus:ring-2 focus:ring-[#0866C6]/15 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#062B50] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64778C] absolute left-3.5 top-3.5" />
                  <input
                    type={showSignInPassword ? 'text' : 'password'}
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={isLoading || isGoogleLoading}
                    required
                    autoComplete="current-password"
                    className="w-full text-sm pl-10 pr-10 py-2.5 rounded-xl border border-[#062B50]/15 focus:border-[#0866C6] focus:ring-2 focus:ring-[#0866C6]/15 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    className="absolute right-3 top-3 text-[#64778C] hover:text-[#062B50] cursor-pointer"
                    aria-label={showSignInPassword ? 'Hide password' : 'Show password'}
                  >
                    {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || isGoogleLoading}
                  className="w-full min-h-[48px] py-3 rounded-xl bg-[#0866C6] hover:bg-[#062B50] text-white text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Mode 2: Create Account Form */
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#062B50] mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#64778C] absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="Your full name"
                    disabled={isLoading || isGoogleLoading}
                    required
                    autoComplete="name"
                    className="w-full text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-[#062B50]/15 focus:border-[#0866C6] focus:ring-2 focus:ring-[#0866C6]/15 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#062B50] mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#64778C] absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="student@example.com"
                    disabled={isLoading || isGoogleLoading}
                    required
                    autoComplete="email"
                    className="w-full text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-[#062B50]/15 focus:border-[#0866C6] focus:ring-2 focus:ring-[#0866C6]/15 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#062B50] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64778C] absolute left-3.5 top-3.5" />
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    disabled={isLoading || isGoogleLoading}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="w-full text-sm pl-10 pr-10 py-2.5 rounded-xl border border-[#062B50]/15 focus:border-[#0866C6] focus:ring-2 focus:ring-[#0866C6]/15 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-3 top-3 text-[#64778C] hover:text-[#062B50] cursor-pointer"
                    aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                  >
                    {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#062B50] mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64778C] absolute left-3.5 top-3.5" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    disabled={isLoading || isGoogleLoading}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="w-full text-sm pl-10 pr-10 py-2.5 rounded-xl border border-[#062B50]/15 focus:border-[#0866C6] focus:ring-2 focus:ring-[#0866C6]/15 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-[#64778C] hover:text-[#062B50] cursor-pointer"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || isGoogleLoading}
                  className="w-full min-h-[48px] py-3 rounded-xl bg-[#0866C6] hover:bg-[#062B50] text-white text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Create Account</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer onNavigate={onNavigate} />
    </div>
  );
};
