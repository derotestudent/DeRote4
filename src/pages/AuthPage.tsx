import React, { useState } from 'react';
import {
  ArrowLeft,
  Mail,
  Phone,
  Lock,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { DeRoteWordmark } from '../components/DeRoteWordmark';
import { Footer } from '../components/Footer';
import {
  createStudentAccount,
  loginStudent,
} from '../services/localAuth';

interface AuthPageProps {
  initialMode?: 'login' | 'signup';
  onNavigate: (route: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'login',
  onNavigate,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

  // Sign In fields: email, registered mobile number, password
  const [signInEmail, setSignInEmail] = useState('');
  const [signInMobile, setSignInMobile] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Create Account fields: name, email address or phone number, password, confirm password
  const [signupName, setSignupName] = useState('');
  const [signupEmailOrPhone, setSignupEmailOrPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & loading
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const emailTrim = signInEmail.trim();
    const mobileTrim = signInMobile.trim();

    if (!emailTrim && !mobileTrim) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter your email or registered mobile number.',
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
      const identifier = emailTrim || mobileTrim;
      const res = await loginStudent(identifier, signInPassword, mobileTrim);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: 'Welcome back! Opening your student dashboard...',
        });
        setTimeout(() => onNavigate('/dashboard'), 350);
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

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const nameTrim = signupName.trim();
    const contactTrim = signupEmailOrPhone.trim();

    if (!nameTrim) {
      setStatusMessage({ type: 'error', text: 'Please enter your full name.' });
      return;
    }
    if (!contactTrim) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter your email address or phone number.',
      });
      return;
    }
    if (!signupPassword) {
      setStatusMessage({ type: 'error', text: 'Please enter a password.' });
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setStatusMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setIsLoading(true);
    try {
      const res = await createStudentAccount({
        fullName: nameTrim,
        emailOrPhone: contactTrim,
        password: signupPassword,
      });

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: 'Account created successfully! Welcome to DeRote.',
        });
        setTimeout(() => onNavigate('/dashboard'), 400);
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Could not create account. Please check details.',
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
                ? 'Sign in to access your self-reflection journey.'
                : 'Enter your details to create your student account.'}
            </p>
          </div>

          {/* Status Message */}
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

          {/* Sign In Form */}
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
                    disabled={isLoading}
                    className="w-full text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-[#062B50]/15 focus:border-[#0866C6] outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#062B50] mb-1.5">
                  Registered Mobile Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#64778C] absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    value={signInMobile}
                    onChange={(e) => setSignInMobile(e.target.value.replace(/[^\d]/g, '').slice(0, 10))}
                    placeholder="10-digit mobile number"
                    disabled={isLoading}
                    className="w-full text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-[#062B50]/15 focus:border-[#0866C6] outline-none transition-colors"
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
                    placeholder="Enter password"
                    disabled={isLoading}
                    required
                    className="w-full text-sm pl-10 pr-10 py-2.5 rounded-xl border border-[#062B50]/15 focus:border-[#0866C6] outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    className="absolute right-3 top-3 text-[#64778C] hover:text-[#062B50] cursor-pointer"
                  >
                    {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
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
            /* Create Account Form */
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#062B50] mb-1.5">
                  Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#64778C] absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="Full name"
                    disabled={isLoading}
                    required
                    className="w-full text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-[#062B50]/15 focus:border-[#0866C6] outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#062B50] mb-1.5">
                  Email Address or Phone Number
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#64778C] absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={signupEmailOrPhone}
                    onChange={(e) => setSignupEmailOrPhone(e.target.value)}
                    placeholder="email@example.com or 10-digit number"
                    disabled={isLoading}
                    required
                    className="w-full text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-[#062B50]/15 focus:border-[#0866C6] outline-none transition-colors"
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
                    placeholder="Create a password"
                    disabled={isLoading}
                    required
                    className="w-full text-sm pl-10 pr-10 py-2.5 rounded-xl border border-[#062B50]/15 focus:border-[#0866C6] outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-3 top-3 text-[#64778C] hover:text-[#062B50] cursor-pointer"
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
                    disabled={isLoading}
                    required
                    className="w-full text-sm pl-10 pr-10 py-2.5 rounded-xl border border-[#062B50]/15 focus:border-[#0866C6] outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-[#64778C] hover:text-[#062B50] cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
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
