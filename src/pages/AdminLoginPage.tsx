import React, { useState } from 'react';
import { Shield, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { DeRoteWordmark } from '../components/DeRoteWordmark';
import { loginAdmin, loginAdminWithGoogle } from '../services/adminService';

interface AdminLoginPageProps {
  onNavigate: (route: string) => void;
  onAdminLoginSuccess?: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onNavigate,
  onAdminLoginSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSuccess = () => {
    if (onAdminLoginSuccess) {
      onAdminLoginSuccess();
    } else {
      onNavigate('/admin');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please provide both administrative email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await loginAdmin(email.trim(), password);
      if (result.success) {
        handleSuccess();
      } else {
        setError(result.error || 'Authentication failed. Please verify credentials.');
      }
    } catch {
      setError('A network error occurred. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAdminLogin = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      const result = await loginAdminWithGoogle();
      if (result.success) {
        handleSuccess();
      } else {
        setError(result.error || 'Google administrator sign-in failed.');
      }
    } catch {
      setError('Failed to authenticate administrator with Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F8FD] flex flex-col justify-between text-[#102C46]">
      <header className="bg-white border-b border-[#E8F3FF] px-4 sm:px-8 py-3.5 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => onNavigate('/')}
            className="flex items-center text-left focus-visible:outline-2 focus-visible:outline-[#0866C6] rounded-lg cursor-pointer"
          >
            <DeRoteWordmark showDescriptor={true} size="md" />
          </button>

          <button
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#64778C] hover:text-[#062B50] px-2.5 py-1.5 rounded-lg cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Site</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-[#D5E4F3] shadow-none">
          <div className="w-12 h-12 rounded-2xl bg-[#E8F3FF] text-[#0866C6] flex items-center justify-center mb-5">
            <Shield className="w-6 h-6" />
          </div>

          <h1 className="text-2xl font-extrabold text-[#062B50] tracking-tight mb-2">
            Administrator Portal
          </h1>
          <p className="text-xs sm:text-sm text-[#5A6E85] mb-6 leading-relaxed">
            Authorized administrative access for DeRote institutional oversight and cohort reporting.
          </p>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign In for Admin */}
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleAdminLogin}
              disabled={isLoading || isGoogleLoading}
              className="w-full min-h-[46px] py-2 px-4 rounded-xl border border-[#D5E4F3] bg-white hover:bg-[#F8FAFD] text-[#062B50] text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-3 shadow-none hover:border-[#0866C6]/40 active:scale-[0.99] disabled:opacity-60"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 text-[#0866C6] animate-spin" />
                  <span>Connecting Google Account...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
                  <span>Sign in with Google</span>
                </>
              )}
            </button>

            <div className="relative flex py-3.5 items-center">
              <div className="flex-grow border-t border-[#E8F3FF]"></div>
              <span className="flex-shrink mx-3 text-[11px] text-[#64778C] font-semibold uppercase tracking-wider">
                Or with password
              </span>
              <div className="flex-grow border-t border-[#E8F3FF]"></div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#062B50] mb-1.5">
                Admin Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=""
                autoComplete="off"
                required
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[#D5E4F3] bg-white text-[#102C46] focus:border-[#0866C6] focus:outline-none shadow-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#062B50] mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=""
                autoComplete="current-password"
                required
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[#D5E4F3] bg-white text-[#102C46] focus:border-[#0866C6] focus:outline-none shadow-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[46px] rounded-xl bg-[#0866C6] hover:bg-[#062B50] text-white text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-none disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Access Admin Portal</span>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};
