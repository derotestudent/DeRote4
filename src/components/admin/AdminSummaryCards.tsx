import React from 'react';
import { Users, CheckCircle2, Clock, AlertCircle, Check } from 'lucide-react';
import { type AdminStatusFilter } from '../../utils/adminDashboardUtils';

interface AdminSummaryCardsProps {
  statusFilter: AdminStatusFilter;
  totalRegistered: number;
  totalSubmitted: number;
  totalInProgress: number;
  totalNotStarted: number;
  onCardClick: (targetStatus: 'all' | 'Submitted' | 'In Progress' | 'Not Started') => void;
}

export const AdminSummaryCards: React.FC<AdminSummaryCardsProps> = ({
  statusFilter,
  totalRegistered,
  totalSubmitted,
  totalInProgress,
  totalNotStarted,
  onCardClick,
}) => {
  const isAll = statusFilter === 'all';
  const isSubmitted = statusFilter === 'Submitted';
  const isInProgress = statusFilter === 'In Progress';
  const isNotStarted = statusFilter === 'Not Started';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Total Students */}
      <button
        type="button"
        onClick={() => onCardClick('all')}
        className={`rounded-2xl p-3.5 sm:p-4 text-left border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0866C6] ${
          isAll
            ? 'bg-[#EDF5FE] border-[#0866C6]/60'
            : 'bg-white border-[#E2EDF8] hover:border-[#0866C6]/35 hover:bg-[#F8FBFF]'
        }`}
        aria-pressed={isAll}
        title="Click to view and scroll to all registered students"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-[#334E68] truncate">Total Students</span>
          <span
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              isAll ? 'bg-[#0866C6] text-white' : 'bg-[#EBF4FE] text-[#0866C6]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span className="text-2xl font-extrabold text-[#062B50] tabular-nums leading-none">
            {totalRegistered}
          </span>
          {isAll && (
            <Check className="w-4 h-4 text-[#0866C6] shrink-0" aria-hidden="true" />
          )}
        </div>
      </button>

      {/* 2. Submitted */}
      <button
        type="button"
        onClick={() => onCardClick('Submitted')}
        className={`rounded-2xl p-3.5 sm:p-4 text-left border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0866C6] ${
          isSubmitted
            ? 'bg-emerald-50/80 border-emerald-500/70'
            : 'bg-white border-[#E2EDF8] hover:border-emerald-500/40 hover:bg-emerald-50/30'
        }`}
        aria-pressed={isSubmitted}
        title={
          isSubmitted
            ? 'Click to show all students and scroll to list'
            : 'Click to filter and scroll to submitted students'
        }
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-emerald-800 truncate">Submitted</span>
          <span
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              isSubmitted
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-100/80 text-emerald-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span className="text-2xl font-extrabold text-[#062B50] tabular-nums leading-none">
            {totalSubmitted}
          </span>
          {isSubmitted && (
            <Check className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
          )}
        </div>
      </button>

      {/* 3. In Progress */}
      <button
        type="button"
        onClick={() => onCardClick('In Progress')}
        className={`rounded-2xl p-3.5 sm:p-4 text-left border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0866C6] ${
          isInProgress
            ? 'bg-amber-50/80 border-amber-500/70'
            : 'bg-white border-[#E2EDF8] hover:border-amber-500/40 hover:bg-amber-50/30'
        }`}
        aria-pressed={isInProgress}
        title={
          isInProgress
            ? 'Click to show all students and scroll to list'
            : 'Click to filter and scroll to in-progress students'
        }
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-amber-800 truncate">In Progress</span>
          <span
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              isInProgress
                ? 'bg-amber-600 text-white'
                : 'bg-amber-100/80 text-amber-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span className="text-2xl font-extrabold text-[#062B50] tabular-nums leading-none">
            {totalInProgress}
          </span>
          {isInProgress && (
            <Check className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
          )}
        </div>
      </button>

      {/* 4. Not Started */}
      <button
        type="button"
        onClick={() => onCardClick('Not Started')}
        className={`rounded-2xl p-3.5 sm:p-4 text-left border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0866C6] ${
          isNotStarted
            ? 'bg-slate-100/90 border-slate-500/70'
            : 'bg-white border-[#E2EDF8] hover:border-slate-400/60 hover:bg-slate-50/60'
        }`}
        aria-pressed={isNotStarted}
        title={
          isNotStarted
            ? 'Click to show all students and scroll to list'
            : 'Click to filter and scroll to not-started students'
        }
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-700 truncate">Not Started</span>
          <span
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              isNotStarted
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span className="text-2xl font-extrabold text-[#062B50] tabular-nums leading-none">
            {totalNotStarted}
          </span>
          {isNotStarted && (
            <Check className="w-4 h-4 text-slate-700 shrink-0" aria-hidden="true" />
          )}
        </div>
      </button>
    </div>
  );
};
