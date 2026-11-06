import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { QuestionnairePage } from './pages/QuestionnairePage';
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import { EditProfilePage } from './pages/EditProfilePage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import {
  ConsentNoticePage,
  PrivacyPolicyPage,
  TermsOfUsePage,
  ContactPrivacyPage,
} from './pages/LegalPages';
import { ShieldAlert, Loader2 } from 'lucide-react';
import {
  getCurrentAdmin,
  onAdminAuthChange,
  AdminAccount,
} from './services/adminService';
import {
  getCurrentStudent,
  onLocalAuthChange,
  isStudentProfileComplete,
  LocalStudentAccount,
  logoutStudent,
} from './services/localAuth';
import { DESIGNATED_ADMIN_UID, isAuthenticationReady } from './services/firebaseAuth';

export default function App() {
  const [route, setRoute] = useState<string>(() => {
    const p = window.location.pathname;
    const h = window.location.hash;
    const match = (r: string) => p === r || h === `#${r}` || h === `#/${r.replace(/^\//, '')}`;

    if (match('/complete-profile')) return '/complete-profile';
    if (match('/dashboard')) return '/dashboard';
    if (match('/profile/edit') || match('/edit-profile')) return '/profile/edit';
    if (match('/signup')) return '/signup';
    if (match('/login')) return '/login';
    if (match('/admin')) return '/admin';
    if (match('/admin/login')) return '/admin/login';
    if (match('/privacy')) return '/privacy';
    if (match('/terms')) return '/terms';
    if (match('/contact-privacy')) return '/contact-privacy';
    if (match('/consent')) return '/consent';
    if (match('/prototype') || match('/questionnaire')) return '/questionnaire';
    return '/';
  });

  const [adminUser, setAdminUser] = useState<AdminAccount | null>(() => getCurrentAdmin());
  const [studentUser, setStudentUser] = useState<LocalStudentAccount | null>(() => getCurrentStudent());
  const [isAuthReady, setIsAuthReady] = useState<boolean>(() => isAuthenticationReady());

  useEffect(() => {
    const unsubAdmin = onAdminAuthChange((admin, ready) => {
      setAdminUser(admin);
      if (ready) setIsAuthReady(true);
    });
    const unsubStudent = onLocalAuthChange((student) => {
      setStudentUser(student);
      if (isAuthenticationReady()) setIsAuthReady(true);
    });

    const fallbackTimer = setTimeout(() => {
      setIsAuthReady(true);
    }, 1500);

    return () => {
      unsubAdmin();
      unsubStudent();
      clearTimeout(fallbackTimer);
    };
  }, []);

  const isSuperAdmin = Boolean(
    (adminUser && adminUser.id === DESIGNATED_ADMIN_UID) ||
    (studentUser && studentUser.id === DESIGNATED_ADMIN_UID)
  );
  const isProfileDone = isStudentProfileComplete(studentUser);

  useEffect(() => {
    const onLocationChange = () => {
      const p = window.location.pathname;
      const h = window.location.hash;
      const match = (r: string) => p === r || h === `#${r}` || h === `#/${r.replace(/^\//, '')}`;

      if (match('/complete-profile')) setRoute('/complete-profile');
      else if (match('/dashboard')) setRoute('/dashboard');
      else if (match('/profile/edit') || match('/edit-profile')) setRoute('/profile/edit');
      else if (match('/signup')) setRoute('/signup');
      else if (match('/login')) setRoute('/login');
      else if (match('/admin')) setRoute('/admin');
      else if (match('/admin/login')) setRoute('/admin/login');
      else if (match('/privacy')) setRoute('/privacy');
      else if (match('/terms')) setRoute('/terms');
      else if (match('/contact-privacy')) setRoute('/contact-privacy');
      else if (match('/consent')) setRoute('/consent');
      else if (match('/prototype') || match('/questionnaire')) setRoute('/questionnaire');
      else setRoute('/');
    };

    window.addEventListener('popstate', onLocationChange);
    window.addEventListener('hashchange', onLocationChange);

    return () => {
      window.removeEventListener('popstate', onLocationChange);
      window.removeEventListener('hashchange', onLocationChange);
    };
  }, []);

  const navigate = (newRoute: string) => {
    setRoute(newRoute);
    try {
      window.history.pushState({}, '', newRoute);
    } catch {
      window.location.hash = newRoute;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Route Guard: If student is logged in with incomplete profile, enforce /complete-profile
  // Admin is exempt from student profile completion
  const shouldEnforceProfileCompletion =
    studentUser !== null && !isSuperAdmin && !isProfileDone;

  // Guard against flash of admin content while restoring authentication
  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F8FD] text-[#102C46]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#0866C6] animate-spin" />
          <p className="text-xs sm:text-sm font-semibold text-[#64778C]">Verifying DeRote authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#102C46] font-sans antialiased">
      {route === '/login' && (
        <main className="flex-1 flex flex-col">
          {isSuperAdmin ? (
            <AdminDashboardPage onNavigate={navigate} />
          ) : studentUser ? (
            shouldEnforceProfileCompletion ? (
              <EditProfilePage mode="completion" onNavigate={navigate} />
            ) : (
              <StudentDashboardPage onNavigate={navigate} />
            )
          ) : (
            <AuthPage initialMode="login" onNavigate={navigate} />
          )}
        </main>
      )}

      {route === '/signup' && (
        <main className="flex-1 flex flex-col">
          {isSuperAdmin ? (
            <AdminDashboardPage onNavigate={navigate} />
          ) : studentUser ? (
            shouldEnforceProfileCompletion ? (
              <EditProfilePage mode="completion" onNavigate={navigate} />
            ) : (
              <StudentDashboardPage onNavigate={navigate} />
            )
          ) : (
            <AuthPage initialMode="signup" onNavigate={navigate} />
          )}
        </main>
      )}

      {route === '/complete-profile' && (
        <main className="flex-1 flex flex-col">
          {isSuperAdmin ? (
            <AdminDashboardPage onNavigate={navigate} />
          ) : studentUser ? (
            isProfileDone ? (
              <StudentDashboardPage onNavigate={navigate} />
            ) : (
              <EditProfilePage mode="completion" onNavigate={navigate} />
            )
          ) : (
            <AuthPage initialMode="login" onNavigate={navigate} />
          )}
        </main>
      )}

      {route === '/dashboard' && (
        <main className="flex-1 flex flex-col">
          {isSuperAdmin ? (
            <AdminDashboardPage onNavigate={navigate} />
          ) : studentUser ? (
            shouldEnforceProfileCompletion ? (
              <EditProfilePage mode="completion" onNavigate={navigate} />
            ) : (
              <StudentDashboardPage onNavigate={navigate} />
            )
          ) : (
            <AuthPage initialMode="login" onNavigate={navigate} />
          )}
        </main>
      )}

      {route === '/profile/edit' && (
        <main className="flex-1 flex flex-col">
          {isSuperAdmin ? (
            <AdminDashboardPage onNavigate={navigate} />
          ) : studentUser ? (
            shouldEnforceProfileCompletion ? (
              <EditProfilePage mode="completion" onNavigate={navigate} />
            ) : (
              <EditProfilePage mode="edit" onNavigate={navigate} />
            )
          ) : (
            <AuthPage initialMode="login" onNavigate={navigate} />
          )}
        </main>
      )}

      {(route === '/prototype' || route === '/questionnaire') && (
        <main className="flex-1 flex flex-col">
          {studentUser && shouldEnforceProfileCompletion ? (
            <EditProfilePage mode="completion" onNavigate={navigate} />
          ) : (
            <QuestionnairePage onNavigate={navigate} />
          )}
        </main>
      )}

      {route === '/consent' && (
        <main className="flex-1 flex flex-col">
          <ConsentNoticePage onNavigate={navigate} />
        </main>
      )}

      {route === '/privacy' && (
        <main className="flex-1 flex flex-col">
          <PrivacyPolicyPage onNavigate={navigate} />
        </main>
      )}

      {route === '/terms' && (
        <main className="flex-1 flex flex-col">
          <TermsOfUsePage onNavigate={navigate} />
        </main>
      )}

      {route === '/contact-privacy' && (
        <main className="flex-1 flex flex-col">
          <ContactPrivacyPage onNavigate={navigate} />
        </main>
      )}

      {(route === '/admin' || route === '/admin/login') && (
        <main className="flex-1 flex flex-col">
          {isSuperAdmin ? (
            <AdminDashboardPage onNavigate={navigate} />
          ) : studentUser ? (
            <div className="min-h-screen bg-[#F4F8FD] flex flex-col items-center justify-center p-4 sm:p-6 text-[#102C46]">
              <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-red-100 shadow-xl text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-5">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <h1 className="text-xl font-bold text-[#062B50] mb-2">Access Restricted</h1>
                <p className="text-xs sm:text-sm text-[#5A6E85] mb-6 leading-relaxed">
                  You are signed in as a student (<span className="font-semibold text-[#102C46]">{studentUser.email || studentUser.fullName}</span>). The Admin Portal is strictly restricted to the designated institution administrator.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => navigate(isProfileDone ? '/dashboard' : '/complete-profile')}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#0866C6] hover:bg-[#062B50] text-white text-sm font-semibold transition cursor-pointer"
                  >
                    Return to {isProfileDone ? 'Student Dashboard' : 'Profile Completion'}
                  </button>
                  <button
                    onClick={async () => {
                      await logoutStudent();
                      navigate('/admin/login');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl border border-[#D5E4F3] text-sm text-[#64778C] hover:text-[#062B50] font-medium transition cursor-pointer"
                  >
                    Sign Out &amp; Switch Account
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <AdminLoginPage
              onNavigate={navigate}
              onAdminLoginSuccess={() => {
                setAdminUser(getCurrentAdmin());
                navigate('/admin');
              }}
            />
          )}
        </main>
      )}

      {route !== '/complete-profile' &&
        route !== '/dashboard' &&
        route !== '/profile/edit' &&
        route !== '/login' &&
        route !== '/signup' &&
        route !== '/prototype' &&
        route !== '/questionnaire' &&
        route !== '/consent' &&
        route !== '/privacy' &&
        route !== '/terms' &&
        route !== '/contact-privacy' &&
        route !== '/admin' &&
        route !== '/admin/login' && (
          <>
            <Navigation onNavigate={navigate} currentRoute="/" />
            <main className="flex-1">
              <LandingPage onNavigate={navigate} />
            </main>
          </>
        )}
    </div>
  );
}
