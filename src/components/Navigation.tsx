import React, { useState, useEffect } from 'react';
import { DeRoteWordmark } from './DeRoteWordmark';
import {
  onLocalAuthChange,
  LocalStudentAccount,
} from '../services/localAuth';

interface NavigationProps {
  onNavigate: (route: string) => void;
  currentRoute?: string;
}

export const Navigation: React.FC<NavigationProps> = ({ onNavigate, currentRoute = '/' }) => {
  const [activeStudent, setActiveStudent] = useState<LocalStudentAccount | null>(null);

  useEffect(() => {
    const unsubStudent = onLocalAuthChange((student) => {
      setActiveStudent(student);
    });
    return () => {
      unsubStudent();
    };
  }, []);

  const handleExploreClick = () => {
    if (currentRoute !== '/') {
      onNavigate('/');
      setTimeout(() => {
        const el = document.getElementById('student-concerns');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      const el = document.getElementById('student-concerns');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-[#E8F3FF] transition-colors">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-18 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Zone */}
        <button
          onClick={() => onNavigate('/')}
          className="flex items-center text-left focus-visible:outline-2 focus-visible:outline-[#0866C6] rounded-lg cursor-pointer shrink-0"
          aria-label="DeRote Student Insight - Home"
        >
          <DeRoteWordmark showDescriptor={true} size="md" />
        </button>

        {/* Action Zone: EXACTLY TWO primary navigation buttons */}
        <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
          {/* BUTTON 1: Sign in */}
          <button
            onClick={() => onNavigate(activeStudent ? '/dashboard' : '/login')}
            type="button"
            className="inline-flex items-center justify-center min-h-[38px] sm:min-h-[42px] px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-[#062B50] hover:text-[#0866C6] transition-colors cursor-pointer rounded-xl focus-visible:outline-2 focus-visible:outline-[#0866C6] whitespace-nowrap"
          >
            Sign in
          </button>

          {/* BUTTON 2: Explore what's on your mind */}
          <button
            onClick={handleExploreClick}
            type="button"
            className="min-h-[38px] sm:min-h-[42px] px-3 sm:px-5 py-2 text-xs sm:text-sm font-bold text-white bg-[#0866C6] hover:bg-[#062B50] rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0866C6] whitespace-nowrap"
          >
            Explore what's on your mind
          </button>
        </div>
      </div>
    </header>
  );
};
