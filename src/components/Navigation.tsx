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

        {/* Action Zone */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => onNavigate(activeStudent ? '/dashboard' : '/login')}
            type="button"
            className="inline-flex items-center justify-center min-h-[38px] sm:min-h-[42px] px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold text-white bg-[#0866C6] hover:bg-[#062B50] rounded-xl transition-all shadow-xs active:scale-[0.98] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0866C6] whitespace-nowrap"
          >
            {activeStudent ? 'Dashboard' : 'Sign in'}
          </button>
        </div>
      </div>
    </header>
  );
};
