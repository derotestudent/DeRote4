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
import {
  getCurrentAdmin,
  onAdminAuthChange,
  AdminAccount,
} from './services/adminService';
import {
  getCurrentStudent,
  onLocalAuthChange,
  LocalStudentAccount,
} from './services/localAuth';

export default function App() {
  const [route, setRoute] = useState<string>(() => {
    const p = window.location.pathname;
    const h = window.location.hash;
    const match = (r: string) => p === r || h === `#${r}` || h === `#/${r.replace(/^\//, '')}`;

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

  useEffect(() => {
    const unsubAdmin = onAdminAuthChange((admin) => setAdminUser(admin));
    const unsubStudent = onLocalAuthChange((student) => setStudentUser(student));

    return () => {
      unsubAdmin();
      unsubStudent();
    };
  }, []);

  const isSuperAdmin = adminUser !== null;

  useEffect(() => {
    const onLocationChange = () => {
      const p = window.location.pathname;
      const h = window.location.hash;
      const match = (r: string) => p === r || h === `#${r}` || h === `#/${r.replace(/^\//, '')}`;

      if (match('/dashboard')) setRoute('/dashboard');
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

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#102C46] font-sans antialiased">
      {route === '/login' && (
        <main className="flex-1 flex flex-col">
          <AuthPage initialMode="login" onNavigate={navigate} />
        </main>
      )}

      {route === '/signup' && (
        <main className="flex-1 flex flex-col">
          <AuthPage initialMode="signup" onNavigate={navigate} />
        </main>
      )}

      {route === '/dashboard' && (
        <main className="flex-1 flex flex-col">
          <StudentDashboardPage onNavigate={navigate} />
        </main>
      )}

      {route === '/profile/edit' && (
        <main className="flex-1 flex flex-col">
          <EditProfilePage onNavigate={navigate} />
        </main>
      )}

      {(route === '/prototype' || route === '/questionnaire') && (
        <main className="flex-1 flex flex-col">
          <QuestionnairePage onNavigate={navigate} />
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
          {adminUser || isSuperAdmin ? (
            <AdminDashboardPage onNavigate={navigate} />
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

      {route !== '/dashboard' &&
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
