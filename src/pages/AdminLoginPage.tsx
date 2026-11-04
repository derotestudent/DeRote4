import React, { useState } from 'react';
import { Shield, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { DeRoteWordmark } from '../components/DeRoteWordmark';
import { loginAdmin, AdminAccount } from '../services/adminService';

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
        if (onAdminLoginSuccess) {
          onAdminLoginSuccess();
        } else {
          onNavigate('/admin');
        }
      } else {
        setError(result.error || 'Authentication failed. Please verify credentials.');
      }
    } catch {
      setError('A network error occurred. Please check your connection.');
    } finally {
      setIsLoading(false);
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
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-[#E8F3FF] shadow-xl">
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#062B50] mb-1.5">
                Admin Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@derote.in"
                required
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[#062B50]/15 focus:border-[#0866C6] outline-none"
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
                placeholder="••••••••••••"
                required
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[#062B50]/15 focus:border-[#0866C6] outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[46px] rounded-xl bg-[#0866C6] hover:bg-[#062B50] text-white text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
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
