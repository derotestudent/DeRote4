import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  RotateCcw,
  Printer,
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
} from 'lucide-react';
import { DeRoteWordmark } from '../components/DeRoteWordmark';
import { SECTIONS, QUESTIONS, Question } from '../data/questionnaire';
import {
  AdminStudentRecord,
  QuestionnaireStatus,
  fetchAllStudentsWithStatus,
  updateStudentProfileByAdmin,
  getReportTitle,
  formatClassDisplay,
  normalizeClassGrade,
} from '../services/studentAdminService';
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
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [classFilter, setClassFilter] = useState<'all' | '8' | '9' | '10' | '11' | '12' | 'Others'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Submitted' | 'In Progress' | 'Not Started'>('all');

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

  // Subscribe to admin auth state
  useEffect(() => {
    const unsub = onAdminAuthChange((current) => {
      setAdmin(current);
      if (!current) {
        onNavigate('/admin/login');
      }
    });
    return () => unsub();
  }, [onNavigate]);

  // Load student records
  const loadData = async () => {
    setIsLoading(true);
    try {
      const records = await fetchAllStudentsWithStatus();
      setStudents(records);
    } catch (err) {
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
  const totalSubmitted = students.filter((s) => s.status === 'Submitted').length;
  const totalInProgress = students.filter((s) => s.status === 'In Progress').length;
  const totalNotStarted = students.filter((s) => s.status === 'Not Started').length;

  // Filtered and alphabetically sorted students list
  const filteredStudents = useMemo(() => {
    return students
      .filter((student) => {
        // Name search filter
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          if (!student.fullName.toLowerCase().includes(q)) {
            return false;
          }
        }

        // Class filter
        if (classFilter !== 'all') {
          if (normalizeClassGrade(student.classGrade) !== classFilter) {
            return false;
          }
        }

        // Status filter
        if (statusFilter !== 'all') {
          if (student.status !== statusFilter) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' }));
  }, [students, searchQuery, classFilter, statusFilter]);

  // Selected student record
  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return students.find((s) => s.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

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
    setStatusFilter('all');
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

  // Context-aware report title for print
  const reportTitle = useMemo(() => {
    return getReportTitle({
      view: selectedStudent ? 'detail' : 'list',
      student: selectedStudent,
      classFilter,
      statusFilter,
      searchQuery,
    });
  }, [selectedStudent, classFilter, statusFilter, searchQuery]);

  const handlePrint = () => {
    window.print();
  };

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

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
                    onClick={handlePrint}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0866C6] text-white text-xs sm:text-sm font-bold hover:bg-[#062B50] transition-colors shadow-sm cursor-pointer ml-1"
                  >
                    <Printer className="w-4 h-4" />
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

                {/* Profile Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
                  <div className="p-4 rounded-2xl bg-[#F8FAFD] border border-[#E8F3FF]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#64778C] mb-1">
                      <User className="w-3.5 h-3.5 text-[#0866C6]" />
                      <span>Student Name</span>
                    </div>
                    <div className="text-sm font-bold text-[#062B50] break-words">
                      {selectedStudent.fullName}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F8FAFD] border border-[#E8F3FF]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#64778C] mb-1">
                      <Clock className="w-3.5 h-3.5 text-[#0866C6]" />
                      <span>Age</span>
                    </div>
                    <div className="text-sm font-bold text-[#062B50]">
                      {selectedStudent.age ? `${selectedStudent.age} years` : 'Not specified'}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F8FAFD] border border-[#E8F3FF]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#64778C] mb-1">
                      <BookOpen className="w-3.5 h-3.5 text-[#0866C6]" />
                      <span>Class / Grade</span>
                    </div>
                    <div className="text-sm font-bold text-[#062B50]">
                      {formatClassDisplay(selectedStudent.classGrade)}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F8FAFD] border border-[#E8F3FF]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#64778C] mb-1">
                      <School className="w-3.5 h-3.5 text-[#0866C6]" />
                      <span>Institution / School</span>
                    </div>
                    <div className="text-sm font-bold text-[#062B50] truncate" title={selectedStudent.schoolName}>
                      {selectedStudent.schoolName}
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

                {selectedStudent.status === 'Not Started' || selectedStudent.answeredCount === 0 ? (
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
              {/* Dashboard Heading & Print button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#062B50] tracking-tight">
                    Student Roster &amp; Questionnaire Records
                  </h1>
                  <p className="text-xs sm:text-sm text-[#5A6E85] mt-1">
                    Manage student registration details and inspect submitted self-discovery responses.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0866C6] hover:bg-[#062B50] text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#0866C6]/20 cursor-pointer w-fit"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Report</span>
                </button>
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

              {/* Search and Filters Bar */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E8F3FF] shadow-xs space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center">
                  {/* Search Bar */}
                  <div className="md:col-span-5 relative">
                    <Search className="w-4 h-4 text-[#64778C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search student by name..."
                      className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-[#D5E4F3] text-xs sm:text-sm text-[#062B50] placeholder-[#8A9BA8] focus:outline-none focus:border-[#0866C6] focus:ring-2 focus:ring-[#0866C6]/10 transition-all bg-[#F8FAFD]"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A9BA8] hover:text-[#062B50] p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Class Filter */}
                  <div className="md:col-span-3">
                    <select
                      value={classFilter}
                      onChange={(e) =>
                        setClassFilter(
                          e.target.value as 'all' | '8' | '9' | '10' | '11' | '12' | 'Others'
                        )
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E4F3] text-xs sm:text-sm font-semibold text-[#062B50] bg-[#F8FAFD] focus:outline-none focus:border-[#0866C6] focus:ring-2 focus:ring-[#0866C6]/10 cursor-pointer"
                    >
                      <option value="all">All Classes</option>
                      <option value="8">Class 8</option>
                      <option value="9">Class 9</option>
                      <option value="10">Class 10</option>
                      <option value="11">Class 11</option>
                      <option value="12">Class 12</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div className="md:col-span-3">
                    <select
                      value={statusFilter}
                      onChange={(e) =>
                        setStatusFilter(
                          e.target.value as 'all' | 'Submitted' | 'In Progress' | 'Not Started'
                        )
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E4F3] text-xs sm:text-sm font-semibold text-[#062B50] bg-[#F8FAFD] focus:outline-none focus:border-[#0866C6] focus:ring-2 focus:ring-[#0866C6]/10 cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      <option value="Submitted">Submitted</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Not Started">Not Started</option>
                    </select>
                  </div>

                  {/* Reset Filters Button */}
                  <div className="md:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="w-full md:w-auto p-2.5 rounded-xl border border-[#D5E4F3] text-[#64778C] hover:text-[#062B50] hover:bg-[#F2F7FC] transition-colors cursor-pointer flex items-center justify-center"
                      title="Reset all filters"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span className="md:hidden ml-2 text-xs font-semibold">Reset Filters</span>
                    </button>
                  </div>
                </div>

                {/* Filter info indicator */}
                <div className="flex items-center justify-between text-xs text-[#64778C] pt-2 border-t border-[#E8F3FF]">
                  <span>
                    Showing <strong className="text-[#062B50]">{filteredStudents.length}</strong> of{' '}
                    {students.length} students (Sorted Alphabetically A–Z)
                  </span>

                  {(searchQuery || classFilter !== 'all' || statusFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="text-xs font-bold text-[#0866C6] hover:underline cursor-pointer"
                    >
                      Clear active filters
                    </button>
                  )}
                </div>
              </div>

              {/* Student List Table */}
              <div className="bg-white rounded-3xl border border-[#E8F3FF] shadow-xs overflow-hidden">
                {filteredStudents.length === 0 ? (
                  <div className="p-12 text-center text-[#64778C]">
                    <Search className="w-10 h-10 mx-auto text-[#0866C6] opacity-30 mb-3" />
                    <p className="text-base font-bold text-[#062B50]">No matching students found</p>
                    <p className="text-xs sm:text-sm text-[#64778C] mt-1 max-w-sm mx-auto">
                      Try adjusting your search query, class selection, or status filter.
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
                        {filteredStudents.map((student) => (
                          <tr
                            key={student.id}
                            onClick={() => {
                              setSelectedStudentId(student.id);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="hover:bg-[#F8FAFD] transition-colors cursor-pointer group"
                          >
                            <td className="py-4 px-6 font-bold text-[#062B50] group-hover:text-[#0866C6] transition-colors">
                              {student.fullName}
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
                              {student.status === 'Submitted' && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>Submitted</span>
                                </span>
                              )}
                              {student.status === 'In Progress' && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  <span>In Progress</span>
                                </span>
                              )}
                              {student.status === 'Not Started' && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  <span>Not Started</span>
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <span className="text-xs font-bold text-[#0866C6] group-hover:underline">
                                View Answers &amp; Profile →
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
      {/* 5. CONTEXT-AWARE PRINT REPORT (Visible strictly during print)   */}
      {/* ============================================================== */}
      <div id="derote-admin-print-view" className="hidden print:block w-full bg-white text-black p-4">
        {/* Printable Header */}
        <div className="border-b-2 border-black pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xl font-black tracking-tight text-black uppercase">
                DeRote — Student Insight System
              </div>
              <div className="text-xs uppercase tracking-wider text-gray-700 mt-0.5">
                Official Administrative Record
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block border border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-black">
                CONFIDENTIAL
              </span>
              <div className="text-[11px] text-gray-700 mt-1">
                Date: {currentDateFormatted}
              </div>
            </div>
          </div>

          <h2 className="text-lg font-black uppercase tracking-wide mt-4 text-black">
            {reportTitle}
          </h2>
        </div>

        {/* PRINT VIEW A: INDIVIDUAL STUDENT REPORT */}
        {selectedStudent ? (
          <div className="space-y-6">
            {/* Student Profile Box */}
            <div className="border border-black p-4 rounded-sm print-page-break-avoid">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-bold text-gray-700 block uppercase text-[10px]">
                    Student Name
                  </span>
                  <span className="font-black text-sm text-black">{selectedStudent.fullName}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-700 block uppercase text-[10px]">
                    Class / Grade
                  </span>
                  <span className="font-black text-sm text-black">
                    {formatClassDisplay(selectedStudent.classGrade)}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-gray-700 block uppercase text-[10px]">
                    Age
                  </span>
                  <span className="font-semibold text-black">
                    {selectedStudent.age ? `${selectedStudent.age} years` : 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-gray-700 block uppercase text-[10px]">
                    Institution / School
                  </span>
                  <span className="font-semibold text-black">{selectedStudent.schoolName}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-700 block uppercase text-[10px]">
                    Questionnaire Status
                  </span>
                  <span className="font-black text-black uppercase">{selectedStudent.status}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-700 block uppercase text-[10px]">
                    Questions Answered
                  </span>
                  <span className="font-semibold text-black">
                    {selectedStudent.answeredCount} of {QUESTIONS.length}
                  </span>
                </div>
              </div>

              {selectedStudent.status === 'In Progress' && (
                <div className="mt-3 pt-3 border-t border-dashed border-gray-400 text-xs font-bold uppercase text-black">
                  ** INCOMPLETE RESPONSES — Questionnaire currently in progress. Showing answers saved so far. **
                </div>
              )}

              {selectedStudent.status === 'Not Started' && (
                <div className="mt-3 pt-3 border-t border-dashed border-gray-400 text-xs font-bold uppercase text-black">
                  ** NOT STARTED — Student has not begun answering the questionnaire. **
                </div>
              )}
            </div>

            {/* Questions & Answers in original order */}
            {selectedStudent.answeredCount > 0 && (
              <div className="space-y-6">
                {SECTIONS.map((section) => {
                  const sectionQuestions = QUESTIONS.filter((q) => q.section === section.id);

                  return (
                    <div key={section.id} className="space-y-3">
                      <div className="border-b border-black pb-1 pt-2">
                        <div className="text-[10px] font-black uppercase text-gray-700">
                          Section {section.id}
                        </div>
                        <div className="text-sm font-black uppercase text-black">
                          {section.title}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {sectionQuestions.map((q: Question) => {
                          const answer = selectedStudent.answers[q.n];
                          const hasAns =
                            answer !== undefined &&
                            answer !== null &&
                            (typeof answer === 'string' ? answer.trim().length > 0 : answer.length > 0);

                          return (
                            <div
                              key={q.n}
                              className="border-b border-gray-300 pb-2.5 print-page-break-avoid"
                            >
                              <div className="text-xs font-bold text-black mb-1">
                                <span className="font-black mr-1">{q.n}.</span>
                                {q.text}
                              </div>

                              <div className="pl-4 text-xs">
                                {hasAns ? (
                                  q.type === 'multi' && Array.isArray(answer) ? (
                                    <ul className="list-disc pl-4 space-y-0.5 font-medium text-black">
                                      {answer.map((item, i) => (
                                        <li key={i}>{item}</li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="font-medium text-black whitespace-pre-wrap">
                                      {String(answer)}
                                    </p>
                                  )
                                ) : (
                                  <span className="italic text-gray-600">
                                    (No response provided)
                                  </span>
                                )}
                              </div>
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
        ) : (
          /* PRINT VIEW B: FILTERED STUDENT LIST REPORT */
          <div className="space-y-4">
            <div className="text-xs text-gray-800 flex justify-between items-center pb-2 border-b border-gray-400">
              <span>
                Total Matching Students: <strong>{filteredStudents.length}</strong>
              </span>
              <span>Sorted Alphabetically (A–Z)</span>
            </div>

            <table className="w-full text-left text-xs border border-black border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-black text-[10px] font-black uppercase">
                  <th className="p-2 border-r border-black w-8 text-center">#</th>
                  <th className="p-2 border-r border-black">Student Name</th>
                  <th className="p-2 border-r border-black w-24">Class</th>
                  <th className="p-2 border-r border-black w-14">Age</th>
                  <th className="p-2 border-r border-black">Institution / School</th>
                  <th className="p-2 w-28">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {filteredStudents.map((st, idx) => (
                  <tr key={st.id} className="print-page-break-avoid">
                    <td className="p-2 border-r border-gray-300 text-center font-mono">{idx + 1}</td>
                    <td className="p-2 border-r border-gray-300 font-bold text-black">{st.fullName}</td>
                    <td className="p-2 border-r border-gray-300">{formatClassDisplay(st.classGrade)}</td>
                    <td className="p-2 border-r border-gray-300">{st.age || '—'}</td>
                    <td className="p-2 border-r border-gray-300">{st.schoolName}</td>
                    <td className="p-2 font-bold uppercase">{st.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Printable Footer */}
        <div className="mt-8 pt-4 border-t border-gray-400 text-center text-[10px] text-gray-600 print-page-break-avoid">
          DeRote Student Insight System — Confidential Administrative Document — Generated on {currentDateFormatted}
        </div>
      </div>
    </div>
  );
};
