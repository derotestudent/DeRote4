import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  RotateCcw,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Edit3,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  School,
  User,
  BookOpen,
  LogOut,
  Check,
  Calendar,
  ExternalLink,
  Users,
  Database,
  UploadCloud,
  RefreshCw,
  Cloud,
  Mail,
  ChevronsLeft,
  ChevronsRight,
  Printer,
} from 'lucide-react';
import {
  seedQuestionnaireToBackend,
  testFirestoreConnection,
  getStudentSubmissionStatus,
} from '../services/firestoreBackend';
import { DeRoteWordmark } from '../components/DeRoteWordmark';
import { SECTIONS, QUESTIONS, Question } from '../data/questionnaire';
import {
  AdminStudentRecord,
  QuestionnaireStatus,
  fetchAllStudentsWithStatus,
  fetchStudentAnswersForAdmin,
  resolveStudentBatchStatus,
  updateStudentProfileByAdmin,
  formatClassDisplay,
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
  const [classFilter, setClassFilter] = useState<'all' | '8' | '9' | '10' | '11' | '12' | 'Higher' | 'Others'>('all');
  const [institutionFilter, setInstitutionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Submitted' | 'In Progress' | 'Not Started' | 'Unable to Load'>('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'date_desc' | 'date_asc'>('name_asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

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

  // Load student records
  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const records = await fetchAllStudentsWithStatus();
      setStudents(records);
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

  // Top metric counts from all available student records
  const totalRegistered = students.length;
  const totalSubmitted = students.filter((s) => (statusErrors[s.id] ? false : (statusCache[s.id]?.status || s.status) === 'Submitted')).length;
  const totalInProgress = students.filter((s) => (statusErrors[s.id] ? false : (statusCache[s.id]?.status || s.status) === 'In Progress')).length;
  const totalNotStarted = students.filter((s) => (statusErrors[s.id] ? false : (statusCache[s.id]?.status || s.status) === 'Not Started')).length;
  const totalUnableToLoad = Object.keys(statusErrors).length;

  // Unique institutions list for the institution filter
  const uniqueInstitutions = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.schoolName).filter(Boolean))).sort();
  }, [students]);

  // Filtered and sorted students list
  const filteredStudents = useMemo(() => {
    return students
      .filter((student) => {
        // Multi-field search filter: name, email, institution, or class
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
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

        // Class filter
        if (classFilter !== 'all') {
          if (normalizeClassGrade(student.classGrade) !== classFilter) {
            return false;
          }
        }

        // Institution filter
        if (institutionFilter !== 'all') {
          if (student.schoolName !== institutionFilter) {
            return false;
          }
        }

        // Status filter
        if (statusFilter !== 'all') {
          const currentStatus = statusErrors[student.id]
            ? 'Unable to Load'
            : statusCache[student.id]?.status || student.status;
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
  }, [students, searchQuery, classFilter, institutionFilter, statusFilter, sortBy, statusCache, statusErrors]);

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
  }, [selectedStudentId]);

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
        {/* Administration Header */}
        <header className="bg-white border-b border-[#E8F3FF] px-4 sm:px-8 py-3.5 sticky top-0 z-30 shadow-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedStudentId(null);
                }}
                className="flex items-center text-left focus-visible:outline-2 focus-visible:outline-[#0866C6] rounded-lg cursor-pointer"
                title="DeRote Administration"
              >
                <DeRoteWordmark showDescriptor={false} size="md" />
              </button>
              <span className="h-5 w-px bg-[#D5E4F3]" aria-hidden="true" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0866C6] bg-[#EBF4FE] px-2.5 py-1 rounded-md">
                  Administration
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <div className="text-right hidden md:block">
                <div className="text-xs font-bold text-[#062B50]">{admin.fullName}</div>
                <div className="text-[11px] text-[#64778C]">{admin.email}</div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('/')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D5E4F3] text-xs font-semibold text-[#062B50] hover:bg-[#F2F7FC] transition-colors cursor-pointer"
                title="Return to Student Portal"
              >
                <span>Student Site</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#64778C]" />
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-[#D5E4F3] text-xs font-bold text-[#64778C] hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer flex items-center gap-1.5"
                title="Sign Out of Administration"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </header>

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
            <div className="space-y-6">
              {/* Navigation Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E8F3FF] shadow-xs">
                <button
                  type="button"
                  onClick={() => setSelectedStudentId(null)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-[#0866C6] hover:bg-[#EBF4FE] transition-colors cursor-pointer w-fit"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Student List</span>
                </button>

                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  {currentFilteredIndex >= 0 && (
                    <span className="text-xs text-[#64778C] font-medium mr-1 hidden sm:inline">
                      Student {currentFilteredIndex + 1} of {filteredStudents.length}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handlePreviousStudent}
                    disabled={!hasPrevious}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-[#D5E4F3] text-xs font-semibold text-[#062B50] hover:bg-[#F2F7FC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Previous Student"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextStudent}
                    disabled={!hasNext}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-[#D5E4F3] text-xs font-semibold text-[#062B50] hover:bg-[#F2F7FC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Next Student"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintReport}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#D5E4F3] bg-white text-[#062B50] text-xs font-bold hover:bg-[#F2F7FC] hover:border-[#0866C6] transition-colors cursor-pointer shadow-xs"
                    title="Print student reflection report"
                  >
                    <Printer className="w-4 h-4 text-[#0866C6]" />
                    <span>Print Report</span>
                  </button>
                </div>
              </div>

              {/* Student Profile Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8F3FF] shadow-xs">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-[#E8F3FF]">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-[#062B50] tracking-tight">
                        {selectedStudent.fullName}
                      </h1>

                      {/* Status indicator */}
                      {selectedStudent.status === 'Submitted' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Submitted</span>
                        </span>
                      )}
                      {selectedStudent.status === 'In Progress' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>In Progress</span>
                        </span>
                      )}
                      {selectedStudent.status === 'Not Started' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold">
                          <span>Not Started</span>
                        </span>
                      )}
                      {selectedStudent.status === 'Unable to Load' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
                          <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                          <span>Unable to Load</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-[#5A6E85]">
                      {selectedStudent.email ? (
                        <span>{selectedStudent.email}</span>
                      ) : (
                        <span>Student Record ID: {selectedStudent.id}</span>
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenEditModal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#0866C6] text-[#0866C6] hover:bg-[#EBF4FE] text-xs sm:text-sm font-bold transition-colors cursor-pointer w-fit"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Student Details</span>
                  </button>
                </div>

                {/* Profile Fields Grid - 8 fields as required by Phase 6 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-6">
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F8FAFD] border border-[#E8F3FF]">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#64778C] mb-1">
                      <User className="w-3.5 h-3.5 text-[#0866C6]" />
                      <span>Full Name</span>
                    </div>
                    <div className="text-sm font-bold text-[#062B50] break-words">
                      {selectedStudent.fullName}
                    </div>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F8FAFD] border border-[#E8F3FF]">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#64778C] mb-1">
                      <Mail className="w-3.5 h-3.5 text-[#0866C6]" />
                      <span>Email</span>
                    </div>
                    <div className="text-sm font-bold text-[#062B50] break-words truncate" title={selectedStudent.email}>
                      {selectedStudent.email || '—'}
                    </div>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F8FAFD] border border-[#E8F3FF]">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#64778C] mb-1">
                      <Clock className="w-3.5 h-3.5 text-[#0866C6]" />
                      <span>Age</span>
                    </div>
                    <div className="text-sm font-bold text-[#062B50]">
                      {selectedStudent.age ? `${selectedStudent.age} years` : 'Not specified'}
                    </div>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F8FAFD] border border-[#E8F3FF]">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#64778C] mb-1">
                      <BookOpen className="w-3.5 h-3.5 text-[#0866C6]" />
                      <span>Class / Grade</span>
                    </div>
                    <div className="text-sm font-bold text-[#062B50]">
                      {formatClassDisplay(selectedStudent.classGrade)}
                    </div>
                  </div>

                  <div className="col-span-2 p-3.5 sm:p-4 rounded-2xl bg-[#F8FAFD] border border-[#E8F3FF]">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#64778C] mb-1">
                      <School className="w-3.5 h-3.5 text-[#0866C6]" />
                      <span>Institution / School</span>
                    </div>
                    <div className="text-sm font-bold text-[#062B50] break-words" title={selectedStudent.schoolName}>
                      {selectedStudent.schoolName}
                    </div>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F8FAFD] border border-[#E8F3FF]">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#64778C] mb-1">
                      <Calendar className="w-3.5 h-3.5 text-[#0866C6]" />
                      <span>Registration Date</span>
                    </div>
                    <div className="text-sm font-bold text-[#062B50]">
                      {selectedStudent.createdAt
                        ? new Date(selectedStudent.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                    </div>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F8FAFD] border border-[#E8F3FF]">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#64778C] mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0866C6]" />
                      <span>Submission Date</span>
                    </div>
                    <div className="text-sm font-bold text-[#062B50]">
                      {selectedStudent.submittedAt
                        ? new Date(selectedStudent.submittedAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : selectedStudent.status === 'Submitted'
                        ? 'Submitted'
                        : selectedStudent.status === 'Unable to Load'
                        ? 'Lookup Failed'
                        : 'Not submitted yet'}
                    </div>
                  </div>
                </div>

                {/* Questionnaire Status Banner */}
                {selectedStudent.status === 'In Progress' && (
                  <div className="mt-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                        Incomplete Responses
                      </h4>
                      <p className="text-xs sm:text-sm text-amber-700 mt-0.5">
                        This student is currently in progress. Showing only responses that have actually been saved.
                      </p>
                    </div>
                  </div>
                )}

                {selectedStudent.status === 'Not Started' && (
                  <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Not Started
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                        This student has not yet begun answering the self-discovery questionnaire.
                      </p>
                    </div>
                  </div>
                )}

                {selectedStudent.status === 'Unable to Load' && (
                  <div className="mt-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-red-800">
                          Status Lookup Error
                        </h4>
                        <p className="text-xs sm:text-sm text-red-700 mt-0.5">
                          {statusErrors[selectedStudent.id]
                            ? `Could not verify questionnaire status: ${statusErrors[selectedStudent.id]}`
                            : "Unable to retrieve this student's questionnaire status due to a Firestore or network error."}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleRetryStudentStatus(selectedStudent.id, e)}
                      disabled={retryingStatusIds.has(selectedStudent.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto disabled:opacity-50"
                    >
                      {retryingStatusIds.has(selectedStudent.id) ? 'Retrying...' : 'Retry Status Check'}
                    </button>
                  </div>
                )}
              </div>

              {/* Student Answers Display Section */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8F3FF] shadow-xs space-y-8">
                <div className="border-b border-[#E8F3FF] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-bold text-[#062B50]">Questionnaire Responses</h2>
                    <p className="text-xs sm:text-sm text-[#64778C] mt-0.5">
                      {selectedStudent.status === 'Submitted'
                        ? 'Complete responses in original question order.'
                        : selectedStudent.status === 'In Progress'
                        ? 'Incomplete Responses — saved questions in original order.'
                        : 'No responses recorded yet.'}
                    </p>
                  </div>
                  <div className="text-xs font-bold text-[#0866C6] bg-[#EBF4FE] px-3 py-1 rounded-full w-fit">
                    {selectedStudent.answeredCount} of {QUESTIONS.length} Questions Answered
                  </div>
                </div>

                {isLoadingAnswers ? (
                  <div className="text-center py-16 text-[#64778C]">
                    <RefreshCw className="w-8 h-8 mx-auto text-[#0866C6] animate-spin mb-3" />
                    <p className="text-sm font-semibold text-[#062B50]">Loading student responses from Firestore...</p>
                    <p className="text-xs text-[#64778C] mt-1">Retrieving answers for {selectedStudent.fullName}...</p>
                  </div>
                ) : answersError ? (
                  <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center space-y-3">
                    <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
                    <p className="text-sm font-semibold text-red-900">{answersError}</p>
                    <button
                      type="button"
                      onClick={() => {
                        const sId = selectedStudentId;
                        setSelectedStudentId(null);
                        setTimeout(() => setSelectedStudentId(sId), 50);
                      }}
                      className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition cursor-pointer"
                    >
                      Retry Loading Answers
                    </button>
                  </div>
                ) : selectedStudent.status === 'Not Started' || selectedStudent.answeredCount === 0 ? (
                  <div className="text-center py-12 text-[#64778C]">
                    <AlertCircle className="w-10 h-10 mx-auto text-[#0866C6] opacity-40 mb-3" />
                    <p className="text-sm font-semibold text-[#062B50]">No Answers Saved Yet</p>
                    <p className="text-xs text-[#64778C] mt-1 max-w-md mx-auto">
                      Once the student opens the questionnaire and saves responses, their answers will appear here in original sequence.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-10">
                    {SECTIONS.map((section) => {
                      const sectionQuestions = QUESTIONS.filter((q) => q.section === section.id);
                      // Incomplete response check for this section
                      const sectionHasAnswers = sectionQuestions.some((q) => {
                        const val = selectedStudent.answers[q.n];
                        return val !== undefined && val !== null && (typeof val === 'string' ? val.trim() !== '' : val.length > 0);
                      });

                      // If in progress and this section has zero answers, we can still show questions as unanswered or marked
                      return (
                        <div key={section.id} className="space-y-4">
                          {/* Section Header */}
                          <div className="bg-[#F8FAFD] border border-[#E8F3FF] p-4 rounded-2xl">
                            <div className="text-xs font-bold text-[#0866C6] uppercase tracking-wider">
                              Section {section.id}
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-[#062B50] mt-0.5">
                              {section.title}
                            </h3>
                            {section.intro && (
                              <p className="text-xs sm:text-sm text-[#5A6E85] mt-1 italic leading-relaxed">
                                {section.intro}
                              </p>
                            )}
                          </div>

                          {/* Questions in Section */}
                          <div className="space-y-3.5 pl-1 sm:pl-3">
                            {sectionQuestions.map((q: Question) => {
                              const answer = selectedStudent.answers[q.n];
                              const isAnswered =
                                answer !== undefined &&
                                answer !== null &&
                                (typeof answer === 'string' ? answer.trim().length > 0 : answer.length > 0);

                              return (
                                <div
                                  key={q.n}
                                  className={`p-4 rounded-2xl border transition-colors ${
                                    isAnswered
                                      ? 'bg-white border-[#E8F3FF] hover:border-[#0866C6]/30'
                                      : 'bg-[#FCFDFE] border-dashed border-[#E2EDF8]'
                                  }`}
                                >
                                  {/* Question Title & Number */}
                                  <div className="flex items-start gap-2.5 mb-2">
                                    <span className="text-xs font-extrabold text-[#0866C6] bg-[#EBF4FE] px-2 py-0.5 rounded-md shrink-0">
                                      Q{q.n}
                                    </span>
                                    <span className="text-xs font-medium text-[#64778C] uppercase tracking-wider pt-0.5">
                                      {q.type === 'text'
                                        ? 'Written Response'
                                        : q.type === 'single'
                                        ? 'Single Choice'
                                        : 'Multiple Choice'}
                                    </span>
                                  </div>
                                  <p className="text-sm font-semibold text-[#062B50] leading-snug mb-3">
                                    {q.text}
                                  </p>

                                  {/* Answer Content */}
                                  {isAnswered ? (
                                    <div className="p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E8F3FF]">
                                      {q.type === 'text' && (
                                        <p className="text-sm text-[#062B50] whitespace-pre-wrap leading-relaxed font-normal">
                                          {answer as string}
                                        </p>
                                      )}

                                      {q.type === 'single' && (
                                        <div className="flex items-center gap-2 text-sm font-bold text-[#062B50]">
                                          <div className="w-2.5 h-2.5 rounded-full bg-[#0866C6] shrink-0" />
                                          <span>{answer as string}</span>
                                        </div>
                                      )}

                                      {q.type === 'multi' && (
                                        <div className="space-y-1.5">
                                          {Array.isArray(answer) ? (
                                            (answer as string[]).map((item, idx) => (
                                              <div
                                                key={idx}
                                                className="flex items-center gap-2 text-sm font-semibold text-[#062B50]"
                                              >
                                                <div className="w-2 h-2 rounded-sm bg-[#0866C6] shrink-0" />
                                                <span>{item}</span>
                                              </div>
                                            ))
                                          ) : (
                                            <span className="text-sm font-semibold text-[#062B50]">
                                              {String(answer)}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-[#8A9BA8] italic p-2.5 rounded-lg bg-[#F8FAFD]/50">
                                      No response provided (unanswered)
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* 3. MAIN DASHBOARD — STUDENT LIST VIEW                         */
            /* ============================================================== */
            <div className="space-y-8">
              {/* Dashboard Heading */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#062B50] tracking-tight">
                    Student Roster &amp; Questionnaire Records
                  </h1>
                  <p className="text-xs sm:text-sm text-[#5A6E85] mt-1">
                    Manage student registration details and inspect submitted self-discovery responses.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrintReport}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#D5E4F3] bg-white text-[#062B50] text-xs sm:text-sm font-bold hover:bg-[#F2F7FC] hover:border-[#0866C6] transition-colors shadow-xs cursor-pointer"
                    title="Print student cohort report"
                  >
                    <Printer className="w-4 h-4 text-[#0866C6]" />
                    <span>Print Report</span>
                  </button>
                </div>
              </div>

              {/* Top Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E8F3FF] shadow-xs">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#64778C] mb-2">
                    <span>Total Students</span>
                    <Users className="w-4 h-4 text-[#0866C6]" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#062B50]">
                    {totalRegistered}
                  </div>
                  <div className="text-[11px] text-[#64778C] mt-1">
                    Registered in database
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E8F3FF] shadow-xs">
                  <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 mb-2">
                    <span>Submitted</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#062B50]">
                    {totalSubmitted}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-medium mt-1">
                    Completed reflections
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E8F3FF] shadow-xs">
                  <div className="flex items-center justify-between text-xs font-semibold text-amber-700 mb-2">
                    <span>In Progress</span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#062B50]">
                    {totalInProgress}
                  </div>
                  <div className="text-[11px] text-amber-700 font-medium mt-1">
                    Saved partial responses
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E8F3FF] shadow-xs">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
                    <span>Not Started</span>
                    <AlertCircle className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#062B50]">
                    {totalNotStarted}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-1">
                    Awaiting questionnaire
                  </div>
                </div>
              </div>

              {/* Firebase Cloud Backend & Questionnaire Status Card */}
              <div className="bg-gradient-to-r from-[#062B50] via-[#083D6F] to-[#0A4D8C] text-white rounded-3xl p-5 sm:p-6 shadow-md border border-[#144A7E] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Firebase Backend Active</span>
                    </span>
                    <span className="text-xs text-blue-200 font-mono">
                      Project: gen-lang-client-0276070718
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-300 shrink-0" />
                    <span>Cloud Firestore Backend &amp; Questionnaire Storage</span>
                  </h3>

                  <p className="text-xs sm:text-sm text-blue-100/80 max-w-2xl leading-relaxed">
                    Student profiles (<code className="bg-white/10 px-1 py-0.5 rounded text-blue-200 font-mono text-xs">students</code>), answers &amp; drafts (<code className="bg-white/10 px-1 py-0.5 rounded text-blue-200 font-mono text-xs">submissions</code>, <code className="bg-white/10 px-1 py-0.5 rounded text-blue-200 font-mono text-xs">drafts</code>), and the dynamic questionnaire (<code className="bg-white/10 px-1 py-0.5 rounded text-blue-200 font-mono text-xs">questionnaires</code>) are integrated directly with your cloud database.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                  <button
                    type="button"
                    onClick={handleSyncQuestionnaire}
                    disabled={isSyncingQuestionnaire}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#062B50] hover:bg-blue-50 font-bold text-xs sm:text-sm transition-all shadow-sm cursor-pointer disabled:opacity-60"
                    title="Upload or update all 64 questions & 13 sections in Firestore backend"
                  >
                    {isSyncingQuestionnaire ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-[#0866C6]" />
                        <span>Syncing to Cloud...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4 text-[#0866C6]" />
                        <span>Move / Sync Questionnaire to Backend</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleTestBackendPing}
                    disabled={isTestingPing}
                    className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-60"
                    title="Verify read/write permissions to Firestore backend"
                  >
                    {isTestingPing ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-200" />
                    ) : (
                      <Cloud className="w-4 h-4 text-blue-200" />
                    )}
                    <span>{backendPingResult ? `Ping: ${backendPingResult}` : 'Test Cloud Ping'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={loadData}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs sm:text-sm transition-all cursor-pointer"
                    title="Reload data from Firestore"
                  >
                    <RotateCcw className="w-4 h-4 text-blue-200" />
                    <span className="hidden sm:inline">Refresh Data</span>
                  </button>
                </div>
              </div>

              {/* Load Error Banner */}
              {loadError && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    <span>{loadError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={loadData}
                    className="px-3.5 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Search and Filters Bar */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E8F3FF] shadow-xs space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 items-center">
                  {/* Search Bar - Multi-field Search */}
                  <div className="lg:col-span-4 relative">
                    <Search className="w-4 h-4 text-[#64778C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name, email, institution, or class..."
                      className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-[#D5E4F3] text-xs sm:text-sm text-[#062B50] placeholder-[#8A9BA8] focus:outline-none focus:border-[#0866C6] focus:ring-2 focus:ring-[#0866C6]/10 transition-all bg-[#F8FAFD]"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A9BA8] hover:text-[#062B50] p-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Class Filter */}
                  <div className="lg:col-span-2">
                    <select
                      value={classFilter}
                      onChange={(e) =>
                        setClassFilter(
                          e.target.value as 'all' | '8' | '9' | '10' | '11' | '12' | 'Higher' | 'Others'
                        )
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-[#D5E4F3] text-xs sm:text-sm font-semibold text-[#062B50] bg-[#F8FAFD] focus:outline-none focus:border-[#0866C6] focus:ring-2 focus:ring-[#0866C6]/10 cursor-pointer"
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
                  <div className="lg:col-span-3">
                    <select
                      value={institutionFilter}
                      onChange={(e) => setInstitutionFilter(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#D5E4F3] text-xs sm:text-sm font-semibold text-[#062B50] bg-[#F8FAFD] focus:outline-none focus:border-[#0866C6] focus:ring-2 focus:ring-[#0866C6]/10 cursor-pointer truncate"
                      title="Filter by institution"
                    >
                      <option value="all">All Institutions ({uniqueInstitutions.length})</option>
                      {uniqueInstitutions.map((inst) => (
                        <option key={inst} value={inst}>
                          {inst}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div className="lg:col-span-2">
                    <select
                      value={statusFilter}
                      onChange={(e) =>
                        setStatusFilter(
                          e.target.value as 'all' | 'Submitted' | 'In Progress' | 'Not Started' | 'Unable to Load'
                        )
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-[#D5E4F3] text-xs sm:text-sm font-semibold text-[#062B50] bg-[#F8FAFD] focus:outline-none focus:border-[#0866C6] focus:ring-2 focus:ring-[#0866C6]/10 cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      <option value="Submitted">Submitted</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Not Started">Not Started</option>
                      <option value="Unable to Load">Unable to Load</option>
                    </select>
                  </div>

                  {/* Reset Filters Button */}
                  <div className="lg:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="w-full p-2.5 rounded-xl border border-[#D5E4F3] text-[#64778C] hover:text-[#062B50] hover:bg-[#F2F7FC] transition-colors cursor-pointer flex items-center justify-center"
                      title="Reset all filters and search"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span className="lg:hidden ml-2 text-xs font-semibold">Reset</span>
                    </button>
                  </div>
                </div>

                {/* Filter info indicator and Sort Control */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#64778C] pt-2 border-t border-[#E8F3FF]">
                  <div className="flex items-center gap-3">
                    <span>
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
                        <span> (filtered from {students.length} total)</span>
                      )}
                    </span>

                    {(searchQuery ||
                      classFilter !== 'all' ||
                      institutionFilter !== 'all' ||
                      statusFilter !== 'all') && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="text-xs font-bold text-[#0866C6] hover:underline cursor-pointer"
                      >
                        Clear active filters
                      </button>
                    )}
                  </div>

                  {/* Sort Controls */}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#64778C]">Sort:</span>
                    <select
                      value={sortBy}
                      onChange={(e) =>
                        setSortBy(
                          e.target.value as 'name_asc' | 'name_desc' | 'date_desc' | 'date_asc'
                        )
                      }
                      className="px-2.5 py-1 rounded-lg border border-[#D5E4F3] text-xs font-semibold text-[#062B50] bg-[#F8FAFD] focus:outline-none focus:border-[#0866C6] cursor-pointer"
                    >
                      <option value="name_asc">Name (A–Z)</option>
                      <option value="name_desc">Name (Z–A)</option>
                      <option value="date_desc">Registration (Newest)</option>
                      <option value="date_asc">Registration (Oldest)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Student List Table */}
              <div className="bg-white rounded-3xl border border-[#E8F3FF] shadow-xs overflow-hidden">
                {filteredStudents.length === 0 ? (
                  <div className="p-12 text-center text-[#64778C]">
                    <Search className="w-10 h-10 mx-auto text-[#0866C6] opacity-30 mb-3" />
                    <p className="text-base font-bold text-[#062B50]">No matching students found</p>
                    <p className="text-xs sm:text-sm text-[#64778C] mt-1 max-w-sm mx-auto">
                      Try adjusting your search query, class selection, institution, or status filter.
                    </p>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-4 px-4 py-2 rounded-xl bg-[#EBF4FE] text-[#0866C6] text-xs font-bold hover:bg-[#D9EAFE] transition-colors cursor-pointer"
                    >
                      Reset All Filters
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#E8F3FF] bg-[#F8FAFD] text-[11px] font-extrabold uppercase tracking-wider text-[#64778C]">
                            <th className="py-3.5 px-6">Student Name</th>
                            <th className="py-3.5 px-4">Class</th>
                            <th className="py-3.5 px-4">Age</th>
                            <th className="py-3.5 px-4">Institution / School</th>
                            <th className="py-3.5 px-4">Status</th>
                            <th className="py-3.5 px-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8F3FF] text-xs sm:text-sm">
                          {paginatedStudents.map((student) => {
                            const isStatusError = Boolean(statusErrors[student.id]);
                            const currentStatus = isStatusError
                              ? 'Unable to Load'
                              : statusCache[student.id]?.status || student.status;
                            return (
                              <tr
                                key={student.id}
                                onClick={() => {
                                  setSelectedStudentId(student.id);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="hover:bg-[#F8FAFD] transition-colors cursor-pointer group"
                              >
                                <td className="py-4 px-6 font-bold text-[#062B50] group-hover:text-[#0866C6] transition-colors">
                                  <div>{student.fullName}</div>
                                  {student.email && (
                                    <div className="text-[11px] font-normal text-[#64778C]">
                                      {student.email}
                                    </div>
                                  )}
                                </td>
                                <td className="py-4 px-4 font-semibold text-[#062B50]">
                                  {formatClassDisplay(student.classGrade)}
                                </td>
                                <td className="py-4 px-4 text-[#5A6E85]">
                                  {student.age ? `${student.age} yrs` : '—'}
                                </td>
                                <td className="py-4 px-4 text-[#5A6E85] max-w-xs truncate" title={student.schoolName}>
                                  {student.schoolName}
                                </td>
                                <td className="py-4 px-4">
                                  {currentStatus === 'Submitted' && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                      <span>Submitted</span>
                                    </span>
                                  )}
                                  {currentStatus === 'In Progress' && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                      <span>In Progress</span>
                                    </span>
                                  )}
                                  {currentStatus === 'Not Started' && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                      <span>Not Started</span>
                                    </span>
                                  )}
                                  {currentStatus === 'Unable to Load' && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-200">
                                      <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                                      <span>Unable to Load</span>
                                      <button
                                        type="button"
                                        onClick={(e) => handleRetryStudentStatus(student.id, e)}
                                        disabled={retryingStatusIds.has(student.id)}
                                        className="ml-1 underline text-[11px] font-semibold text-red-800 hover:text-red-950 cursor-pointer disabled:opacity-50"
                                        title={statusErrors[student.id] || 'Retry status check'}
                                      >
                                        {retryingStatusIds.has(student.id) ? '...' : 'Retry'}
                                      </button>
                                    </span>
                                  )}
                                </td>
                                <td className="py-4 px-6 text-right">
                                  <span className="text-xs font-bold text-[#0866C6] group-hover:underline">
                                    View Answers &amp; Profile →
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Bar */}
                    <div className="p-4 bg-[#F8FAFD] border-t border-[#E8F3FF] flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-xs text-[#64778C]">
                        <span>Rows per page:</span>
                        <select
                          value={pageSize}
                          onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          className="px-2 py-1 rounded-lg border border-[#D5E4F3] bg-white text-xs font-bold text-[#062B50] focus:outline-none focus:border-[#0866C6] cursor-pointer"
                        >
                          <option value="10">10</option>
                          <option value="15">15</option>
                          <option value="25">25</option>
                          <option value="50">50</option>
                        </select>
                        <span className="ml-2">
                          Page <strong className="text-[#062B50]">{currentPage}</strong> of{' '}
                          <strong className="text-[#062B50]">{totalPages}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className="p-1.5 rounded-lg border border-[#D5E4F3] bg-white text-[#062B50] hover:bg-[#F2F7FC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title="First Page"
                        >
                          <ChevronsLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-1.5 rounded-lg border border-[#D5E4F3] bg-white text-[#062B50] hover:bg-[#F2F7FC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title="Previous Page"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <span className="px-3 py-1 text-xs font-bold text-[#0866C6] bg-[#EBF4FE] rounded-lg">
                          {currentPage}
                        </span>

                        <button
                          type="button"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage >= totalPages}
                          className="p-1.5 rounded-lg border border-[#D5E4F3] bg-white text-[#062B50] hover:bg-[#F2F7FC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title="Next Page"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage >= totalPages}
                          className="p-1.5 rounded-lg border border-[#D5E4F3] bg-white text-[#062B50] hover:bg-[#F2F7FC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title="Last Page"
                        >
                          <ChevronsRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
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
