import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  X,
  Printer,
} from 'lucide-react';
import {
  seedQuestionnaireToBackend,
  testFirestoreConnection,
  getStudentSubmissionStatus,
} from '../services/firestoreBackend';
import { SECTIONS, QUESTIONS } from '../data/questionnaire';
import {
  AdminStudentRecord,
  QuestionnaireStatus,
  fetchAllStudentsWithStatus,
  fetchStudentAnswersForAdmin,
  resolveStudentBatchStatus,
  updateStudentProfileByAdmin,
  normalizeClassGrade,
  getReportTitle,
} from '../services/studentAdminService';
import { executePrint } from '../utils/printHelper';
import { PrintableReport } from '../components/PrintableReport';
import {
  getCurrentAdmin,
  signOutAdmin,
  onAdminAuthChange,
  AdminAccount,
} from '../services/adminService';
import { AdminHeader } from '../components/admin/AdminHeader';
import { AdminSummaryCards } from '../components/admin/AdminSummaryCards';
import { AdminStudentList } from '../components/admin/AdminStudentList';
import { AdminStudentDetail } from '../components/admin/AdminStudentDetail';
import {
  type AdminClassFilter,
  type AdminSortBy,
  type AdminStatusFilter,
  computeAdminSummaryCounts,
  filterAndSortStudents,
  getActiveFilterChips,
} from '../utils/adminDashboardUtils';

interface AdminDashboardPageProps {
  onNavigate: (route: string) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onNavigate }) => {
  const [admin, setAdmin] = useState<AdminAccount | null>(() => getCurrentAdmin());
  const [students, setStudents] = useState<AdminStudentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Filters & Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [classFilter, setClassFilter] = useState<AdminClassFilter>('all');
  const [institutionFilter, setInstitutionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<AdminStatusFilter>('all');
  const [sortBy, setSortBy] = useState<AdminSortBy>('name_asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Target ref for auto-scrolling from top summary cards to the student list
  const studentListRef = useRef<HTMLDivElement | null>(null);

  // Status cache for visible batch: strictly holds successful statuses ('Submitted', 'In Progress', 'Not Started')
  const [statusCache, setStatusCache] = useState<
    Record<string, { status: QuestionnaireStatus; submittedAt?: string; updatedAt?: string }>
  >({});

  // Status lookup errors map: tracks failed status lookups ('Unable to Load') separately without caching as success
  const [statusErrors, setStatusErrors] = useState<Record<string, string>>({});
  const [retryingStatusIds, setRetryingStatusIds] = useState<Set<string>>(new Set());

  // Individual student on-demand answer loading state
  const [isLoadingAnswers, setIsLoadingAnswers] = useState<boolean>(false);
  const [answersError, setAnswersError] = useState<string | null>(null);
  const [answersRetryNonce, setAnswersRetryNonce] = useState<number>(0);
  const [loadedAnswersData, setLoadedAnswersData] = useState<{
    status: QuestionnaireStatus;
    answers: Record<number, string | string[]>;
    answeredCount: number;
    submittedAt?: string;
    updatedAt?: string;
    version?: number;
  } | null>(null);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<{
    fullName: string;
    age: string;
    classGrade: string;
    schoolName: string;
  }>({
    fullName: '',
    age: '',
    classGrade: '10',
    schoolName: '',
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Feedback notifications
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Firebase Backend Status & Questionnaire sync state
  const [isSyncingQuestionnaire, setIsSyncingQuestionnaire] = useState<boolean>(false);
  const [isTestingPing, setIsTestingPing] = useState<boolean>(false);
  const [backendPingResult, setBackendPingResult] = useState<string | null>(null);

  const handleSyncQuestionnaire = async () => {
    setIsSyncingQuestionnaire(true);
    try {
      const res = await seedQuestionnaireToBackend(true);
      if (res.success) {
        setNotification({
          type: 'success',
          text: res.message,
        });
      } else {
        setNotification({
          type: 'error',
          text: res.message,
        });
      }
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        text: `Sync error: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setIsSyncingQuestionnaire(false);
    }
  };

  const handleTestBackendPing = async () => {
    setIsTestingPing(true);
    try {
      const res = await testFirestoreConnection();
      if (res.connected) {
        setBackendPingResult('Verified');
        setNotification({
          type: 'success',
          text: `Firestore Backend online! Connected to ${res.projectId}`,
        });
      } else {
        setBackendPingResult('Failed');
        setNotification({
          type: 'error',
          text: `Firestore Backend test failed: ${res.error || 'Check rules / connectivity'}`,
        });
      }
    } catch (err: unknown) {
      setBackendPingResult('Failed');
      setNotification({
        type: 'error',
        text: `Firestore error: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setIsTestingPing(false);
    }
  };

  // Subscribe to admin auth state
  useEffect(() => {
    const unsub = onAdminAuthChange((current, ready) => {
      setAdmin(current);
      if (ready && !current) {
        onNavigate('/admin/login');
      }
    });
    return () => unsub();
  }, [onNavigate]);

  // Helper to resolve effective status for a student record
  const getStudentEffectiveStatus = (s: AdminStudentRecord): QuestionnaireStatus | 'Unable to Load' => {
    if (statusErrors[s.id]) return 'Unable to Load';
    return statusCache[s.id]?.status || s.status;
  };

  // Smoothly scroll to the student list below after React commits filtered state
  const scrollToStudentList = () => {
    if (typeof window === 'undefined') return;
    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.requestAnimationFrame(() => {
      studentListRef.current?.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  };

  // Interactive summary card filter click handler
  const handleCardFilterClick = (targetStatus: 'all' | 'Submitted' | 'In Progress' | 'Not Started') => {
    if (targetStatus === 'all') {
      setStatusFilter('all');
    } else if (statusFilter === targetStatus) {
      // Clicking the currently selected card again restores the complete student list
      setStatusFilter('all');
    } else {
      setStatusFilter(targetStatus);
    }
    setCurrentPage(1);
    scrollToStudentList();
  };

  // Load student records
  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const records = await fetchAllStudentsWithStatus();
      setStudents(records);

      // Immediately resolve status for all students from Firebase
      const allIds = records.map((s) => s.id);
      if (allIds.length > 0) {
        resolveStudentBatchStatus(allIds)
          .then((batch) => {
            setStatusCache((prev) => {
              const next = { ...prev };
              for (const [id, res] of Object.entries(batch)) {
                if (res.status === 'Submitted' || res.status === 'In Progress' || res.status === 'Not Started') {
                  next[id] = res;
                }
              }
              return next;
            });
            const errors: Record<string, string> = {};
            for (const [id, res] of Object.entries(batch)) {
              if (res.status === 'Unable to Load' && res.error) {
                errors[id] = res.error;
              }
            }
            if (Object.keys(errors).length > 0) {
              setStatusErrors((prev) => ({ ...prev, ...errors }));
            }
          })
          .catch((err) => {
            console.warn('[AdminDashboard] Status batch lookup warning:', err);
          });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve records from Firestore.';
      setLoadError(msg);
      console.error('Failed to load student records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Top metric counts dynamically calculated from live records and statusCache
  const {
    totalRegistered,
    totalSubmitted,
    totalInProgress,
    totalNotStarted,
    totalUnableToLoad,
  } = useMemo(
    () => computeAdminSummaryCounts(students, statusCache, statusErrors),
    [students, statusCache, statusErrors]
  );

  // Unique institutions list for the institution filter
  const uniqueInstitutions = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.schoolName).filter(Boolean))).sort();
  }, [students]);

  // Filtered and sorted students list
  const filteredStudents = useMemo(
    () =>
      filterAndSortStudents(
        students,
        {
          searchQuery,
          classFilter,
          institutionFilter,
          statusFilter,
          sortBy,
        },
        statusCache,
        statusErrors
      ),
    [students, searchQuery, classFilter, institutionFilter, statusFilter, sortBy, statusCache, statusErrors]
  );

  const activeFilterChips = useMemo(
    () =>
      getActiveFilterChips({
        searchQuery,
        classFilter,
        institutionFilter,
        statusFilter,
      }),
    [searchQuery, classFilter, institutionFilter, statusFilter]
  );

  // Reset to page 1 whenever any filter, search, or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, classFilter, institutionFilter, statusFilter, sortBy]);

  // Paginated students slice for current page
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Resolve status for visible batch of students if not already cached
  useEffect(() => {
    if (paginatedStudents.length === 0) return;
    const unresolvedIds = paginatedStudents
      .map((s) => s.id)
      .filter((id) => !statusCache[id] && !statusErrors[id]);

    if (unresolvedIds.length === 0) return;

    let isCancelled = false;
    resolveStudentBatchStatus(unresolvedIds).then((batch) => {
      if (!isCancelled) {
        // Cache successful statuses ONLY; do not cache failed lookups as successful results
        setStatusCache((prev) => {
          const next = { ...prev };
          for (const [id, res] of Object.entries(batch)) {
            if (res.status === 'Submitted' || res.status === 'In Progress' || res.status === 'Not Started') {
              next[id] = res;
            }
          }
          return next;
        });

        // Track failed status lookups ('Unable to Load') separately
        setStatusErrors((prev) => {
          const next = { ...prev };
          for (const [id, res] of Object.entries(batch)) {
            if (res.status === 'Unable to Load') {
              next[id] = res.error || 'Failed to check status';
            } else {
              delete next[id];
            }
          }
          return next;
        });
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [paginatedStudents, statusCache, statusErrors]);

  // Handler to retry fetching an individual student's status
  const handleRetryStudentStatus = async (studentId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRetryingStatusIds((prev) => new Set(prev).add(studentId));
    setStatusErrors((prev) => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });

    try {
      const res = await getStudentSubmissionStatus(studentId);
      if (res.status === 'Unable to Load') {
        setStatusErrors((prev) => ({
          ...prev,
          [studentId]: res.error || 'Failed to check status',
        }));
      } else {
        setStatusCache((prev) => ({
          ...prev,
          [studentId]: res,
        }));
      }
    } catch (err: unknown) {
      setStatusErrors((prev) => ({
        ...prev,
        [studentId]: err instanceof Error ? err.message : String(err),
      }));
    } finally {
      setRetryingStatusIds((prev) => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
    }
  };

  // Selected student record (merged with loaded answers and live status)
  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    const base = students.find((s) => s.id === selectedStudentId);
    if (!base) return null;

    const cached = statusCache[selectedStudentId];
    const isStatusError = Boolean(statusErrors[selectedStudentId]);
    const computedStatus: QuestionnaireStatus = isStatusError
      ? 'Unable to Load'
      : (loadedAnswersData?.status || cached?.status || base.status);

    return {
      ...base,
      status: computedStatus,
      submittedAt: loadedAnswersData?.submittedAt || cached?.submittedAt || base.submittedAt,
      updatedAt: loadedAnswersData?.updatedAt || cached?.updatedAt || base.updatedAt,
      answers: loadedAnswersData?.answers || base.answers,
      answeredCount: loadedAnswersData?.answeredCount ?? base.answeredCount,
      version: loadedAnswersData?.version,
    };
  }, [students, selectedStudentId, loadedAnswersData, statusCache, statusErrors]);

  // On-demand questionnaire responses loader when an individual student is selected
  useEffect(() => {
    if (!selectedStudentId) {
      setLoadedAnswersData(null);
      setAnswersError(null);
      return;
    }

    let isCancelled = false;
    const loadAnswers = async () => {
      setIsLoadingAnswers(true);
      setAnswersError(null);
      try {
        const res = await fetchStudentAnswersForAdmin(selectedStudentId);
        if (!isCancelled) {
          setLoadedAnswersData(res);
          if (res.status !== 'Unable to Load') {
            setStatusCache((prev) => ({
              ...prev,
              [selectedStudentId]: {
                status: res.status,
                submittedAt: res.submittedAt,
                updatedAt: res.updatedAt,
              },
            }));
            setStatusErrors((prev) => {
              const next = { ...prev };
              delete next[selectedStudentId];
              return next;
            });
          }
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setAnswersError(`Failed to load questionnaire responses: ${msg}`);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingAnswers(false);
        }
      }
    };

    loadAnswers();

    return () => {
      isCancelled = true;
    };
  }, [selectedStudentId, answersRetryNonce]);

  // Previous / Next navigation index inside the current filtered list
  const currentFilteredIndex = useMemo(() => {
    if (!selectedStudentId) return -1;
    return filteredStudents.findIndex((s) => s.id === selectedStudentId);
  }, [filteredStudents, selectedStudentId]);

  const hasPrevious = currentFilteredIndex > 0;
  const hasNext = currentFilteredIndex >= 0 && currentFilteredIndex < filteredStudents.length - 1;

  const handlePreviousStudent = () => {
    if (hasPrevious) {
      setSelectedStudentId(filteredStudents[currentFilteredIndex - 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextStudent = () => {
    if (hasNext) {
      setSelectedStudentId(filteredStudents[currentFilteredIndex + 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setClassFilter('all');
    setInstitutionFilter('all');
    setStatusFilter('all');
    setSortBy('name_asc');
    setCurrentPage(1);
  };

  const handleSignOut = async () => {
    await signOutAdmin();
    onNavigate('/admin/login');
  };

  // Open Edit Modal with current student details
  const handleOpenEditModal = () => {
    if (!selectedStudent) return;
    setEditForm({
      fullName: selectedStudent.fullName,
      age: selectedStudent.age || '',
      classGrade: normalizeClassGrade(selectedStudent.classGrade),
      schoolName: selectedStudent.schoolName,
    });
    setEditError(null);
    setShowEditModal(true);
  };

  // Save edited student profile details
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setEditError(null);

    if (!editForm.fullName.trim()) {
      setEditError('Student Name is required.');
      return;
    }
    if (!editForm.schoolName.trim()) {
      setEditError('Institution / School is required.');
      return;
    }

    setIsSavingEdit(true);
    try {
      const res = await updateStudentProfileByAdmin(selectedStudent.id, {
        fullName: editForm.fullName.trim(),
        age: editForm.age.trim(),
        classGrade: editForm.classGrade,
        schoolName: editForm.schoolName.trim(),
      });

      if (res.success && res.student) {
        // Update local state list
        setStudents((prev) =>
          prev.map((s) => (s.id === res.student!.id ? res.student! : s))
        );
        setShowEditModal(false);
        setNotification({
          type: 'success',
          text: `Student profile for ${res.student.fullName} was updated successfully.`,
        });
        setTimeout(() => setNotification(null), 5000);
      } else {
        setEditError(res.error || 'Failed to update student details. Please try again.');
      }
    } catch {
      setEditError('An unexpected error occurred while saving.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Formatted date for print reports
  const currentDateFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  // Context-aware report title for list view vs individual student detail view
  const reportTitle = useMemo(() => {
    return getReportTitle({
      view: selectedStudent ? 'detail' : 'list',
      student: selectedStudent,
      classFilter,
      statusFilter,
      searchQuery,
    });
  }, [selectedStudent, classFilter, statusFilter, searchQuery]);

  const handlePrintReport = () => {
    executePrint(reportTitle);
  };

  if (!admin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F4F8FD] flex flex-col text-[#102C46]">
      {/* ============================================================== */}
      {/* 1. SCREEN INTERFACE (Hidden during print)                      */}
      {/* ============================================================== */}
      <div className="print:hidden flex flex-col min-h-screen">
        {/* Compact Sticky Administration Header */}
        <AdminHeader
          admin={admin}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenSearchNavigateToList={() => {
            if (selectedStudentId) {
              setSelectedStudentId(null);
            }
          }}
          onReturnToMainDashboard={() => {
            setSelectedStudentId(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onRefreshData={loadData}
          onSyncQuestionnaire={handleSyncQuestionnaire}
          onTestBackendPing={handleTestBackendPing}
          isSyncingQuestionnaire={isSyncingQuestionnaire}
          isTestingPing={isTestingPing}
          backendPingResult={backendPingResult}
          questionCount={QUESTIONS.length}
          sectionCount={SECTIONS.length}
          onSignOut={handleSignOut}
        />

        {/* Global Feedback Banner */}
        {notification && (
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4">
            <div
              className={`p-4 rounded-2xl flex items-center justify-between border ${
                notification.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                {notification.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                )}
                <span>{notification.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setNotification(null)}
                className="p-1 hover:bg-black/5 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#64778C]">
              <div className="w-10 h-10 border-3 border-[#0866C6] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-semibold">Loading student roster and reflection records...</p>
            </div>
          ) : selectedStudent ? (
            /* ============================================================== */
            /* 2. INDIVIDUAL STUDENT PAGE VIEW                                */
            /* ============================================================== */
            <AdminStudentDetail
              selectedStudent={selectedStudent}
              currentFilteredIndex={currentFilteredIndex}
              totalFilteredCount={filteredStudents.length}
              hasPrevious={hasPrevious}
              hasNext={hasNext}
              isLoadingAnswers={isLoadingAnswers}
              answersError={answersError}
              statusError={statusErrors[selectedStudent.id]}
              isRetryingStatus={retryingStatusIds.has(selectedStudent.id)}
              onBackToList={() => setSelectedStudentId(null)}
              onPreviousStudent={handlePreviousStudent}
              onNextStudent={handleNextStudent}
              onPrintReport={handlePrintReport}
              onOpenEditModal={handleOpenEditModal}
              onRetryStatus={handleRetryStudentStatus}
              onRetryAnswers={() => setAnswersRetryNonce((n) => n + 1)}
            />
          ) : (
            /* ============================================================== */
            /* 3. MAIN DASHBOARD — STUDENT LIST VIEW                         */
            /* ============================================================== */
            <div className="space-y-5 sm:space-y-6">
              {/* Student Roster Heading + Compact Printer Icon */}
              <div>
                <div className="flex items-start sm:items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-[#062B50] tracking-tight leading-snug">
                    Student Roster &amp; Questionnaire Records
                  </h1>
                  <button
                    type="button"
                    onClick={handlePrintReport}
                    aria-label="Print Report"
                    title="Print Report"
                    className="w-9 h-9 rounded-lg border border-[#D5E4F3] bg-white text-[#0866C6] hover:bg-[#F2F7FC] hover:border-[#0866C6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0866C6] inline-flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-[#5A6E85] mt-1">
                  Manage student registration details and inspect submitted self-discovery responses.
                </p>
              </div>

              {/* Refined Interactive Summary Cards */}
              <AdminSummaryCards
                statusFilter={statusFilter}
                totalRegistered={totalRegistered}
                totalSubmitted={totalSubmitted}
                totalInProgress={totalInProgress}
                totalNotStarted={totalNotStarted}
                onCardClick={handleCardFilterClick}
              />

              {/* Load Error Banner */}
              {loadError && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    <span>{loadError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={loadData}
                    className="px-3.5 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition cursor-pointer shrink-0"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Simplified Roster Filter Bar */}
              <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-[#E2EDF8] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 sm:gap-3 items-center">
                  {/* Class Filter */}
                  <div className="lg:col-span-3">
                    <select
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value as AdminClassFilter)}
                      aria-label="Filter by class"
                      className="w-full h-10 px-3 rounded-xl border border-[#D5E4F3] text-xs sm:text-sm font-semibold text-[#062B50] bg-[#F8FAFD] focus:outline-none focus:border-[#0866C6] cursor-pointer"
                    >
                      <option value="all">All Classes</option>
                      <option value="8">Class 8</option>
                      <option value="9">Class 9</option>
                      <option value="10">Class 10</option>
                      <option value="11">Class 11</option>
                      <option value="12">Class 12</option>
                      <option value="Higher">Higher / Other</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>

                  {/* Institution Filter */}
                  <div className="lg:col-span-5">
                    <select
                      value={institutionFilter}
                      onChange={(e) => setInstitutionFilter(e.target.value)}
                      aria-label="Filter by institution"
                      title="Filter by institution"
                      className="w-full h-10 px-3 rounded-xl border border-[#D5E4F3] text-xs sm:text-sm font-semibold text-[#062B50] bg-[#F8FAFD] focus:outline-none focus:border-[#0866C6] cursor-pointer truncate"
                    >
                      <option value="all">All Institutions ({uniqueInstitutions.length})</option>
                      {uniqueInstitutions.map((inst) => (
                        <option key={inst} value={inst}>
                          {inst}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sort Control */}
                  <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-2">
                    <label
                      htmlFor="admin-sort-select"
                      className="text-xs font-semibold text-[#5A6E85] whitespace-nowrap shrink-0"
                    >
                      Sort:
                    </label>
                    <select
                      id="admin-sort-select"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as AdminSortBy)}
                      className="w-full h-10 px-3 rounded-xl border border-[#D5E4F3] text-xs sm:text-sm font-semibold text-[#062B50] bg-[#F8FAFD] focus:outline-none focus:border-[#0866C6] cursor-pointer"
                    >
                      <option value="name_asc">Name (A–Z)</option>
                      <option value="name_desc">Name (Z–A)</option>
                      <option value="date_desc">Registration (Newest)</option>
                      <option value="date_asc">Registration (Oldest)</option>
                    </select>
                  </div>
                </div>

                {/* Non-card fallback status filter: only rendered when lookup errors exist */}
                {totalUnableToLoad > 0 && (
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#EFF5FC]">
                    <span className="text-xs text-red-700 font-medium">
                      {totalUnableToLoad} student status lookup{totalUnableToLoad === 1 ? '' : 's'} failed.
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setStatusFilter((prev) =>
                          prev === 'Unable to Load' ? 'all' : 'Unable to Load'
                        )
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                        statusFilter === 'Unable to Load'
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                      }`}
                    >
                      {statusFilter === 'Unable to Load'
                        ? 'Showing Unable to Load'
                        : `Filter Unable to Load (${totalUnableToLoad})`}
                    </button>
                  </div>
                )}

                {/* Result Count, Removable Active Filter Chips & Clear All */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-[#EFF5FC] text-xs text-[#5A6E85]">
                  <span className="tabular-nums">
                    Showing{' '}
                    <strong className="text-[#062B50]">
                      {filteredStudents.length === 0
                        ? 0
                        : `${(currentPage - 1) * pageSize + 1}–${Math.min(
                            currentPage * pageSize,
                            filteredStudents.length
                          )}`}
                    </strong>{' '}
                    of <strong className="text-[#062B50]">{filteredStudents.length}</strong> students
                    {filteredStudents.length !== students.length && (
                      <span> (from {students.length} total)</span>
                    )}
                  </span>

                  {activeFilterChips.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {activeFilterChips.map((chip) => (
                        <button
                          key={chip.key}
                          type="button"
                          onClick={() => {
                            if (chip.key === 'search') setSearchQuery('');
                            if (chip.key === 'class') setClassFilter('all');
                            if (chip.key === 'institution') setInstitutionFilter('all');
                            if (chip.key === 'status') setStatusFilter('all');
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#EBF4FE] text-[#0866C6] border border-[#D5E4F3] hover:bg-[#DCEBFC] transition-colors cursor-pointer max-w-[220px]"
                          title={`Remove ${chip.label.toLowerCase()} filter`}
                          aria-label={`Remove ${chip.label} filter: ${chip.valueLabel}`}
                        >
                          <span className="truncate">
                            {chip.label}: {chip.valueLabel}
                          </span>
                          <X className="w-3 h-3 shrink-0" aria-hidden="true" />
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="px-2 py-1 text-xs font-bold text-[#0866C6] hover:underline cursor-pointer whitespace-nowrap"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Responsive Student Directory (Mobile Cards + Desktop Table + Pagination) */}
              <AdminStudentList
                studentListRef={studentListRef}
                filteredStudents={filteredStudents}
                paginatedStudents={paginatedStudents}
                statusCache={statusCache}
                statusErrors={statusErrors}
                retryingStatusIds={retryingStatusIds}
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                onSelectStudent={(studentId) => {
                  setSelectedStudentId(studentId);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onRetryStudentStatus={handleRetryStudentStatus}
                onResetFilters={handleResetFilters}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </main>
      </div>

      {/* ============================================================== */}
      {/* 4. EDIT STUDENT PROFILE MODAL                                  */}
      {/* ============================================================== */}
      {showEditModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs print:hidden animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#E8F3FF]">
            <div className="flex items-center justify-between pb-4 border-b border-[#E8F3FF] mb-6">
              <div>
                <h3 className="text-lg font-bold text-[#062B50]">Edit Student Details</h3>
                <p className="text-xs text-[#64778C] mt-0.5">
                  Update administrative record for {selectedStudent.fullName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-lg text-[#8A9BA8] hover:text-[#062B50] hover:bg-[#F2F7FC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#062B50] mb-1">
                  Student Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E4F3] text-sm text-[#062B50] focus:outline-none focus:border-[#0866C6] focus:ring-2 focus:ring-[#0866C6]/10"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#062B50] mb-1">
                    Age
                  </label>
                  <input
                    type="text"
                    value={editForm.age}
                    onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                    placeholder="e.g. 15"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E4F3] text-sm text-[#062B50] focus:outline-none focus:border-[#0866C6] focus:ring-2 focus:ring-[#0866C6]/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#062B50] mb-1">
                    Class / Grade <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editForm.classGrade}
                    onChange={(e) => setEditForm({ ...editForm, classGrade: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E4F3] text-sm font-semibold text-[#062B50] bg-white focus:outline-none focus:border-[#0866C6] focus:ring-2 focus:ring-[#0866C6]/10"
                  >
                    <option value="8">Class 8</option>
                    <option value="9">Class 9</option>
                    <option value="10">Class 10</option>
                    <option value="11">Class 11</option>
                    <option value="12">Class 12</option>
                    <option value="Higher">Higher / Other</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#062B50] mb-1">
                  Institution / School <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.schoolName}
                  onChange={(e) => setEditForm({ ...editForm, schoolName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E4F3] text-sm text-[#062B50] focus:outline-none focus:border-[#0866C6] focus:ring-2 focus:ring-[#0866C6]/10"
                  required
                />
              </div>

              <div className="p-3 bg-[#F8FAFD] rounded-xl border border-[#E8F3FF] text-[11px] text-[#5A6E85] leading-relaxed">
                Note: Updating profile information updates the roster record in place. It will not modify or reset the student's questionnaire responses.
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E8F3FF]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={isSavingEdit}
                  className="px-4 py-2.5 rounded-xl border border-[#D5E4F3] text-xs font-bold text-[#64778C] hover:bg-[#F2F7FC] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2.5 rounded-xl bg-[#0866C6] text-white text-xs font-bold hover:bg-[#062B50] transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSavingEdit ? 'Saving Changes...' : 'Save Profile Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. PRINT-ONLY REPORT CONTAINER                                */}
      {/* ============================================================== */}
      <div className="hidden print:block w-full bg-white text-black">
        {selectedStudent ? (
          <PrintableReport
            type="individual-student"
            title={reportTitle}
            student={{
              fullName: selectedStudent.fullName,
              age: selectedStudent.age,
              classGrade: selectedStudent.classGrade,
              schoolName: selectedStudent.schoolName,
              status: selectedStudent.status,
              submittedAt: selectedStudent.submittedAt,
              answers: loadedAnswersData?.answers || selectedStudent.answers || {},
            }}
            date={currentDateFormatted}
          />
        ) : (
          <PrintableReport
            type="student-list"
            title={reportTitle}
            students={filteredStudents}
            date={currentDateFormatted}
          />
        )}
      </div>

    </div>
  );
};
