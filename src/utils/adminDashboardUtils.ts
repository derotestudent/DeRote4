/**
 * Pure utilities for Admin Dashboard filtering, sorting, active filter chips,
 * summary counts, and responsive student display formatting.
 */

import {
  type AdminStudentRecord,
  type QuestionnaireStatus,
  formatClassDisplay,
  normalizeClassGrade,
} from '../services/studentAdminService';

export type AdminStatusFilter =
  | 'all'
  | 'Submitted'
  | 'In Progress'
  | 'Not Started'
  | 'Unable to Load';

export type AdminClassFilter =
  | 'all'
  | '8'
  | '9'
  | '10'
  | '11'
  | '12'
  | 'Higher'
  | 'Others';

export type AdminSortBy = 'name_asc' | 'name_desc' | 'date_desc' | 'date_asc';

export interface AdminFilterState {
  searchQuery: string;
  classFilter: AdminClassFilter;
  institutionFilter: string;
  statusFilter: AdminStatusFilter;
  sortBy: AdminSortBy;
}

export interface ActiveFilterChip {
  key: 'search' | 'class' | 'institution' | 'status';
  label: string;
  valueLabel: string;
}

/**
 * Resolves the current effective status of a student using live statusErrors and statusCache.
 */
export function resolveEffectiveStudentStatus(
  student: AdminStudentRecord,
  statusCache: Record<string, { status: QuestionnaireStatus; submittedAt?: string; updatedAt?: string }>,
  statusErrors: Record<string, string>
): QuestionnaireStatus {
  if (statusErrors[student.id]) return 'Unable to Load';
  return statusCache[student.id]?.status || student.status;
}

/**
 * Computes top summary card metrics from current students and resolved status maps.
 */
export function computeAdminSummaryCounts(
  students: AdminStudentRecord[],
  statusCache: Record<string, { status: QuestionnaireStatus; submittedAt?: string; updatedAt?: string }>,
  statusErrors: Record<string, string>
): {
  totalRegistered: number;
  totalSubmitted: number;
  totalInProgress: number;
  totalNotStarted: number;
  totalUnableToLoad: number;
} {
  let totalSubmitted = 0;
  let totalInProgress = 0;
  let totalNotStarted = 0;

  for (const student of students) {
    const status = resolveEffectiveStudentStatus(student, statusCache, statusErrors);
    if (status === 'Submitted') totalSubmitted += 1;
    else if (status === 'In Progress') totalInProgress += 1;
    else if (status === 'Not Started') totalNotStarted += 1;
  }

  return {
    totalRegistered: students.length,
    totalSubmitted,
    totalInProgress,
    totalNotStarted,
    totalUnableToLoad: Object.keys(statusErrors).length,
  };
}

/**
 * Applies multi-field search (name, email, institution, class), class, institution, status filters, and sort.
 */
export function filterAndSortStudents(
  students: AdminStudentRecord[],
  filters: AdminFilterState,
  statusCache: Record<string, { status: QuestionnaireStatus; submittedAt?: string; updatedAt?: string }>,
  statusErrors: Record<string, string>
): AdminStudentRecord[] {
  const { searchQuery, classFilter, institutionFilter, statusFilter, sortBy } = filters;
  const q = searchQuery.trim().toLowerCase();

  return students
    .filter((student) => {
      if (q) {
        const nameMatch = student.fullName.toLowerCase().includes(q);
        const emailMatch = (student.email || '').toLowerCase().includes(q);
        const schoolMatch = (student.schoolName || '').toLowerCase().includes(q);
        const classMatch =
          student.classGrade.toLowerCase().includes(q) ||
          formatClassDisplay(student.classGrade).toLowerCase().includes(q);

        if (!nameMatch && !emailMatch && !schoolMatch && !classMatch) {
          return false;
        }
      }

      if (classFilter !== 'all') {
        if (normalizeClassGrade(student.classGrade) !== classFilter) {
          return false;
        }
      }

      if (institutionFilter !== 'all') {
        if (student.schoolName !== institutionFilter) {
          return false;
        }
      }

      if (statusFilter !== 'all') {
        const currentStatus = resolveEffectiveStudentStatus(student, statusCache, statusErrors);
        if (currentStatus !== statusFilter) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name_asc') {
        return a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' });
      }
      if (sortBy === 'name_desc') {
        return b.fullName.localeCompare(a.fullName, undefined, { sensitivity: 'base' });
      }
      if (sortBy === 'date_desc') {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      if (sortBy === 'date_asc') {
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      }
      return 0;
    });
}

/**
 * Extracts active filter chips for compact display and individual dismissal.
 */
export function getActiveFilterChips(filters: Omit<AdminFilterState, 'sortBy'>): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  if (filters.searchQuery.trim()) {
    chips.push({
      key: 'search',
      label: 'Search',
      valueLabel: `"${filters.searchQuery.trim()}"`,
    });
  }

  if (filters.classFilter !== 'all') {
    chips.push({
      key: 'class',
      label: 'Class',
      valueLabel: formatClassDisplay(filters.classFilter),
    });
  }

  if (filters.institutionFilter !== 'all') {
    chips.push({
      key: 'institution',
      label: 'Institution',
      valueLabel: filters.institutionFilter,
    });
  }

  if (filters.statusFilter !== 'all') {
    chips.push({
      key: 'status',
      label: 'Status',
      valueLabel: filters.statusFilter,
    });
  }

  return chips;
}

/**
 * Formats compact class + age metadata for mobile student cards, omitting unavailable fields.
 */
export function formatMobileStudentMeta(classGrade?: string, age?: string): string {
  const parts: string[] = [];
  const trimmedClass = (classGrade || '').trim();
  if (trimmedClass) {
    parts.push(formatClassDisplay(trimmedClass));
  }
  const trimmedAge = (age || '').trim();
  if (trimmedAge) {
    parts.push(`Age ${trimmedAge}`);
  }
  return parts.join(' · ');
}
