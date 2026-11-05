import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  BookOpen,
  Calendar,
  School,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  LogOut,
  RotateCcw,
  Edit3,
  Eye,
  ShieldCheck,
  Heart,
  Compass,
  Sun,
  Feather,
  Smile,
  X,
  FileText,
  Loader2,
  Check,
} from 'lucide-react';
import { DeRoteWordmark } from '../components/DeRoteWordmark';
import {
  getCurrentStudent,
  onLocalAuthChange,
  logoutStudent,
  syncStudentProfileFromPart1,
  LocalStudentAccount,
} from '../services/localAuth';
import {
  hasSubmitted,
  getSubmissionData,
  getQuestionnaireProgress,
  resetSubmission,
  getOrSeedStudentSubmission,
  loadDraft,
  SubmissionData,
  StudentAnswers,
} from '../services/api';
import { SECTIONS, QUESTIONS } from '../data/questionnaire';
import { resetStudentQuestionnaireSession } from '../services/questionnaireService';

interface StudentDashboardPageProps {
  onNavigate: (route: string) => void;
}

interface SimpleReminder {
  id: string;
  title: string;
  text: string;
  accentBg: string;
  accentBorder: string;
  iconBg: string;
  iconColor: string;
  icon: React.ElementType;
}

const REMINDERS: SimpleReminder[] = [
  {
    id: 'rem_1',
    title: 'Your Own Pace',
    text: "You don't have to figure out everything today. Taking things one day at a time is more than enough.",
    accentBg: 'bg-[#F0F6FD]',
    accentBorder: 'border-[#CCE3FC]',
    iconBg: 'bg-[#0866C6]/10',
    iconColor: 'text-[#0866C6]',
    icon: Compass,
  },
  {
    id: 'rem_2',
    title: 'Your Unique Path',
    text: 'No two journeys are the same. Focus on what brings you joy rather than comparing with others.',
    accentBg: 'bg-[#F4F9FD]',
    accentBorder: 'border-[#D1E6FB]',
    iconBg: 'bg-[#062B50]/10',
    iconColor: 'text-[#062B50]',
    icon: Sparkles,
  },
  {
    id: 'rem_3',
    title: 'Rest Matters',
    text: 'Pausing to rest, listen to music, or take a breath helps your mind recharge and feel clear.',
    accentBg: 'bg-[#F2FAF6]',
    accentBorder: 'border-[#D0EFE0]',
    iconBg: 'bg-[#107E54]/10',
    iconColor: 'text-[#107E54]',
    icon: Sun,
  },
  {
    id: 'rem_4',
    title: 'Follow Curiosity',
    text: "You don't need a final plan right now. Exploring what interests you is how passions grow.",
    accentBg: 'bg-[#FAF6FD]',
    accentBorder: 'border-[#EADBFC]',
    iconBg: 'bg-[#7E3AF2]/10',
    iconColor: 'text-[#7E3AF2]',
    icon: Feather,
  },
  {
    id: 'rem_5',
    title: 'Room to Learn',
    text: 'Mistakes are simply part of trying. Give yourself the space to learn and try again.',
    accentBg: 'bg-[#FFF9F2]',
    accentBorder: 'border-[#FFE3C7]',
    iconBg: 'bg-[#C26B00]/10',
    iconColor: 'text-[#C26B00]',
    icon: RotateCcw,
  },
  {
    id: 'rem_6',
    title: 'True Friends',
    text: 'The best friendships let you be completely yourself, on quiet days and busy days alike.',
    accentBg: 'bg-[#FEF6F7]',
    accentBorder: 'border-[#FCD3D9]',
    iconBg: 'bg-[#D93856]/10',
    iconColor: 'text-[#D93856]',
    icon: Heart,
  },
  {
    id: 'rem_7',
    title: 'Trust Yourself',
    text: "Give yourself credit for how far you've come. You are capable of more than you realize.",
    accentBg: 'bg-[#F2F8FD]',
    accentBorder: 'border-[#CCE3FC]',
    iconBg: 'bg-[#0866C6]/10',
    iconColor: 'text-[#0866C6]',
    icon: Smile,
  },
];

export const StudentDashboardPage: React.FC<StudentDashboardPageProps> = ({ onNavigate }) => {
  const [student, setStudent] = useState<LocalStudentAccount | null>(() => getCurrentStudent());
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [submissionData, setSubmissionData] = useState<SubmissionData | null>(null);
  const [allAnswers, setAllAnswers] = useState<StudentAnswers>({});
  const [progressData, setProgressData] = useState<{
    hasDraft: boolean;
    currentSection: number;
    totalSections: number;
    answeredCount: number;
    totalQuestions: number;
    progressPercent: number;
    sectionTitle: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showSignoutModal, setShowSignoutModal] = useState<boolean>(false);
  const [showRetakeModal, setShowRetakeModal] = useState<boolean>(false);

  // "View My Answers" modal state
  const [showAnswersModal, setShowAnswersModal] = useState<boolean>(false);
  const [activeAnswersSection, setActiveAnswersSection] = useState<number>(1);

  // Load and sync student status
  useEffect(() => {
    const unsub = onLocalAuthChange((curr) => {
      if (curr) {
        setStudent(curr);
      } else {
        // Fallback: check if student filled About Me Part 1 in draft/submission
        try {
          const subRaw = localStorage.getItem('derote_student_questionnaire_submission');
          const draftRaw = localStorage.getItem('derote_student_questionnaire_draft');
          const raw = subRaw || draftRaw;
          if (raw) {
            const parsed = JSON.parse(raw);
            const ans = parsed?.answers;
            if (ans && (ans[1] || ans[2] || ans[3] || ans[4])) {
              const created = syncStudentProfileFromPart1(ans);
              setStudent(created);
              return;
            }
          }
        } catch {}
        setStudent(null);
      }
    });
    return () => unsub();
  }, []);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const submitted = await hasSubmitted();
      const currentAcc = getCurrentStudent();
      const draft = await loadDraft();
      const sub = await getSubmissionData();

      // Collect best available answers
      let gatheredAnswers: StudentAnswers = {};
      if (sub?.answers && Object.keys(sub.answers).length > 0) {
        gatheredAnswers = { ...sub.answers };
      } else if (draft?.answers && Object.keys(draft.answers).length > 0) {
        gatheredAnswers = { ...draft.answers };
      }

      if (submitted || (currentAcc && currentAcc.completedReflections > 0)) {
        setIsCompleted(true);
        const resolvedSub =
          sub ||
          (await getOrSeedStudentSubmission(
            currentAcc?.fullName,
            currentAcc?.classGrade,
            currentAcc?.schoolName,
            currentAcc?.age
          ));
        setSubmissionData(resolvedSub);
        if (resolvedSub?.answers) {
          gatheredAnswers = { ...resolvedSub.answers, ...gatheredAnswers };
        }

        // If student account is missing, create from Part 1 answers
        if (!currentAcc && gatheredAnswers && (gatheredAnswers[1] || gatheredAnswers[4])) {
          const synced = syncStudentProfileFromPart1(gatheredAnswers);
          setStudent(synced);
        }
      } else {
        setIsCompleted(false);
        const progress = await getQuestionnaireProgress();
        setProgressData(progress);

        if (!currentAcc && progress.answers && (progress.answers[1] || progress.answers[4])) {
          const synced = syncStudentProfileFromPart1(progress.answers);
          setStudent(synced);
        }

        if (progress.answers) {
          gatheredAnswers = { ...progress.answers, ...gatheredAnswers };
        }
      }

      // If answers are still sparse for testing/demo, seed them
      if (Object.keys(gatheredAnswers).length === 0) {
        const seeded = await getOrSeedStudentSubmission(
          currentAcc?.fullName,
          currentAcc?.classGrade,
          currentAcc?.schoolName,
          currentAcc?.age
        );
        if (seeded?.answers) {
          gatheredAnswers = seeded.answers;
        }
      }

      setAllAnswers(gatheredAnswers);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [student?.id, student?.age, student?.classGrade]);

  const handleContinueQuestionnaire = () => {
    onNavigate('/questionnaire');
  };

  const handleOpenAnswersModal = (initialSection = 1) => {
    setActiveAnswersSection(initialSection);
    setShowAnswersModal(true);
  };

  const handleRetakeConfirm = async () => {
    if (student) {
      await resetStudentQuestionnaireSession(student);
    }
    await resetSubmission();
    setShowRetakeModal(false);
    onNavigate('/questionnaire');
  };

  const handleSignoutConfirm = async () => {
    await logoutStudent();
    setShowSignoutModal(false);
    onNavigate('/login');
  };

  const studentInitials = useMemo(() => {
    if (!student?.fullName) return 'ST';
    const parts = student.fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [student?.fullName]);

  const formattedSubmittedDate = useMemo(() => {
    if (!submissionData?.submittedAt) return 'Recently';
    try {
      const d = new Date(submissionData.submittedAt);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  }, [submissionData?.submittedAt]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F2F7FC]/80 via-white to-[#F4F8FD] flex flex-col items-center justify-center p-6 text-[#102C46]">
        <div className="w-12 h-12 rounded-2xl bg-[#EBF4FE] border border-[#E2EDF8] flex items-center justify-center mb-4">
          <Loader2 className="w-6 h-6 text-[#0866C6] animate-spin" />
        </div>
        <p className="text-[#062B50] text-base font-bold">Loading your dashboard...</p>
        <p className="text-xs text-[#5A6E85] mt-1">Preparing your reflection space</p>
      </div>
    );
  }

  const studentDisplayName = student?.fullName || 'Student';
  const studentSchool = student?.schoolName || 'Enrolled School';
  const studentClass = student?.classGrade ? `Class ${student.classGrade}` : 'Class 10';
  const studentAge = student?.age || '15';

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#F2F7FC]/80 via-white to-[#F4F8FD] text-[#102C46]">
      {/* Top Header Bar (No duplicate Edit Profile button here) */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-[#E8F3FF] transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('/')}
              className="flex items-center text-left focus-visible:outline-2 focus-visible:outline-[#0866C6] rounded-lg cursor-pointer"
              aria-label="DeRote Student Insight - Home"
            >
              <DeRoteWordmark showDescriptor={false} size="sm" />
            </button>
            <span className="hidden sm:inline-block w-px h-4 bg-[#D5E4F3]" />
            <span className="hidden sm:inline-block text-xs font-bold text-[#5A6E85] tracking-wide uppercase">
              Student Dashboard
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Demo Retake option for testing */}
            <button
              type="button"
              onClick={() => setShowRetakeModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2EDF8] bg-white hover:bg-[#F2F7FC] text-xs font-semibold text-[#5A6E85] hover:text-[#0866C6] transition-colors cursor-pointer"
              title="Demo Retake (for testing)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#5A6E85]" />
              <span className="hidden md:inline">Demo Retake</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSignoutModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-transparent hover:border-[#E2EDF8] text-xs font-semibold text-[#5A6E85] hover:text-red-600 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
        {/* ========================================================= */}
        {/* CASE 1: STUDENT HAS NOT COMPLETED THE QUESTIONNAIRE        */}
        {/* ========================================================= */}
        {!isCompleted && (
          <section className="space-y-6">
            {/* Incomplete Welcome Hero Card */}
            <div className="bg-white rounded-3xl border border-[#CCE3FC] p-6 sm:p-8 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full bg-gradient-to-br from-[#E8F3FF] to-transparent pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF4FE] text-[#0866C6] text-xs font-bold tracking-wide uppercase">
                    <Clock className="w-3.5 h-3.5 text-[#0866C6]" />
                    <span>Questionnaire In Progress</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#062B50] tracking-tight">
                    Welcome back, {studentDisplayName}!
                  </h1>
                  <p className="text-sm sm:text-base text-[#5A6E85] leading-relaxed">
                    You have an ongoing self-reflection session. All your answers are saved, and you can resume right where you paused.
                  </p>
                </div>

                {/* Continue Questionnaire Action */}
                <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleContinueQuestionnaire}
                    className="min-h-[48px] px-8 py-3 rounded-2xl bg-[#0866C6] hover:bg-[#062B50] text-white font-bold text-sm sm:text-base transition-all shadow-md shadow-[#0866C6]/20 active:scale-[0.98] cursor-pointer inline-flex items-center justify-center gap-2"
                  >
                    <span>Continue Questionnaire</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <p className="text-[11px] text-[#8EA3B8] text-center md:text-right">
                    Takes you to the exact question you left off
                  </p>
                </div>
              </div>

              {/* Progress Summary Box */}
              <div className="mt-6 pt-6 border-t border-[#E8F3FF] grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-[#F8FAFD] border border-[#E2EDF8]">
                  <p className="text-xs font-bold text-[#5A6E85] uppercase tracking-wider">
                    Questions Completed
                  </p>
                  <p className="text-xl sm:text-2xl font-extrabold text-[#062B50] mt-1">
                    {progressData?.answeredCount || 0}{' '}
                    <span className="text-xs font-medium text-[#8EA3B8]">
                      of {progressData?.totalQuestions || 64}
                    </span>
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#F8FAFD] border border-[#E2EDF8]">
                  <p className="text-xs font-bold text-[#5A6E85] uppercase tracking-wider">
                    Current Section
                  </p>
                  <p className="text-base sm:text-lg font-bold text-[#062B50] mt-1 truncate">
                    Section {progressData?.currentSection || 1}
                  </p>
                  <p className="text-xs text-[#5A6E85] truncate">
                    {progressData?.sectionTitle || 'About Me (Part 1)'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#F8FAFD] border border-[#E2EDF8] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-[#5A6E85]">
                      <span>OVERALL PROGRESS</span>
                      <span className="text-[#0866C6]">{progressData?.progressPercent || 0}%</span>
                    </div>
                    <div className="w-full bg-[#E2EDF8] rounded-full h-2 mt-2 overflow-hidden">
                      <div
                        className="bg-[#0866C6] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progressData?.progressPercent || 5}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-[#8EA3B8] mt-2">
                    Leave any time and your progress stays safe
                  </p>
                </div>
              </div>
            </div>

            {/* Student Profile Card - Mobile-First & Beautifully Integrated */}
            <div className="bg-white rounded-3xl border border-[#CCE3FC] p-4 sm:p-6 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between gap-3 pb-3.5 mb-3.5 border-b border-[#EAF2FC]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-[#0866C6] to-[#043F7D] text-white flex items-center justify-center font-extrabold text-sm sm:text-base shrink-0 shadow-sm shadow-[#0866C6]/20">
                    {studentInitials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h2 className="text-sm sm:text-base font-extrabold text-[#062B50] truncate">
                        {studentDisplayName}
                      </h2>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF4FE] text-[#0866C6] shrink-0">
                        {studentClass}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64778C] truncate mt-0.5">
                      Student Profile Details
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('/profile/edit')}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-[#CCE3FC] bg-[#F2F7FC] hover:bg-[#0866C6] text-[#0866C6] hover:text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 shadow-2xs"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              </div>

              {/* 2-Column Responsive Credential Grid for Mobile */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                {/* Age */}
                <div className="p-3 sm:p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#E2EDF8] flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#64778C] mb-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#0866C6]" />
                      <span>Age</span>
                    </span>
                    <span className="text-[10px] font-semibold text-[#0866C6] bg-[#EBF4FE] px-1.5 py-0.5 rounded">
                      Editable
                    </span>
                  </div>
                  <div className="text-sm sm:text-base font-bold text-[#062B50] mt-0.5">
                    {studentAge} years old
                  </div>
                </div>

                {/* Class / Grade */}
                <div className="p-3 sm:p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#E2EDF8] flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#64778C] mb-1">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-[#0866C6]" />
                      <span>Class</span>
                    </span>
                    <span className="text-[10px] font-semibold text-[#0866C6] bg-[#EBF4FE] px-1.5 py-0.5 rounded">
                      Editable
                    </span>
                  </div>
                  <div className="text-sm sm:text-base font-bold text-[#062B50] mt-0.5">
                    {studentClass}
                  </div>
                </div>

                {/* School / Institution - Spans full width on mobile for long school names */}
                <div className="col-span-2 p-3 sm:p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#E2EDF8] space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#64778C]">
                    <span className="flex items-center gap-1">
                      <School className="w-3.5 h-3.5 text-[#0866C6]" />
                      <span>School / Institution</span>
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                      Verified
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-[#062B50] leading-snug break-words" title={studentSchool}>
                    {studentSchool}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* CASE 2: STUDENT HAS COMPLETED THE QUESTIONNAIRE           */}
        {/* ========================================================= */}
        {isCompleted && (
          <section className="space-y-8">
            {/* Completion Hero Banner */}
            <div className="bg-white rounded-3xl border border-[#CCE3FC] p-6 sm:p-8 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-12 -mt-12 w-64 h-64 rounded-full bg-gradient-to-br from-[#E8F3FF] via-[#F0F7FF] to-transparent pointer-events-none" />

              <div className="relative z-10 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    {/* Clear Assessment Completed Status */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Assessment Completed</span>
                      <span className="text-emerald-400">•</span>
                      <span className="font-medium">{formattedSubmittedDate}</span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-extrabold text-[#062B50] tracking-tight pt-1">
                      Welcome, {studentDisplayName}!
                    </h1>
                    <p className="text-xs sm:text-sm text-[#5A6E85] leading-relaxed max-w-xl">
                      Your self-reflection assessment is successfully submitted. You can read through all your submitted answers below.
                    </p>
                  </div>

                  {/* Primary Action Button: View My Answers ONLY */}
                  <div className="flex items-center shrink-0 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleOpenAnswersModal(1)}
                      className="w-full sm:w-auto min-h-[46px] px-6 py-2.5 rounded-xl bg-[#0866C6] hover:bg-[#062B50] text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#0866C6]/20 active:scale-[0.98] cursor-pointer inline-flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View My Answers</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Student Profile Card - Mobile-First & Beautifully Integrated */}
            <div className="bg-white rounded-3xl border border-[#CCE3FC] p-4 sm:p-6 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between gap-3 pb-3.5 mb-3.5 border-b border-[#EAF2FC]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-[#0866C6] to-[#043F7D] text-white flex items-center justify-center font-extrabold text-sm sm:text-base shrink-0 shadow-sm shadow-[#0866C6]/20">
                    {studentInitials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h2 className="text-sm sm:text-base font-extrabold text-[#062B50] truncate">
                        {studentDisplayName}
                      </h2>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF4FE] text-[#0866C6] shrink-0">
                        {studentClass}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64778C] truncate mt-0.5">
                      Student Profile Details
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('/profile/edit')}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-[#CCE3FC] bg-[#F2F7FC] hover:bg-[#0866C6] text-[#0866C6] hover:text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 shadow-2xs"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              </div>

              {/* 2-Column Responsive Credential Grid for Mobile */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                {/* Age */}
                <div className="p-3 sm:p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#E2EDF8] flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#64778C] mb-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#0866C6]" />
                      <span>Age</span>
                    </span>
                    <span className="text-[10px] font-semibold text-[#0866C6] bg-[#EBF4FE] px-1.5 py-0.5 rounded">
                      Editable
                    </span>
                  </div>
                  <div className="text-sm sm:text-base font-bold text-[#062B50] mt-0.5">
                    {studentAge} years old
                  </div>
                </div>

                {/* Class / Grade */}
                <div className="p-3 sm:p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#E2EDF8] flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#64778C] mb-1">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-[#0866C6]" />
                      <span>Class</span>
                    </span>
                    <span className="text-[10px] font-semibold text-[#0866C6] bg-[#EBF4FE] px-1.5 py-0.5 rounded">
                      Editable
                    </span>
                  </div>
                  <div className="text-sm sm:text-base font-bold text-[#062B50] mt-0.5">
                    {studentClass}
                  </div>
                </div>

                {/* School / Institution - Spans full width on mobile for long school names */}
                <div className="col-span-2 p-3 sm:p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#E2EDF8] space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#64778C]">
                    <span className="flex items-center gap-1">
                      <School className="w-3.5 h-3.5 text-[#0866C6]" />
                      <span>School / Institution</span>
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                      Verified
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-[#062B50] leading-snug break-words" title={studentSchool}>
                    {studentSchool}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* SHORT, WARM REMINDERS (NO FILTERS, NO OVEREXPLAINING)      */}
        {/* ========================================================= */}
        <section className="bg-white rounded-3xl border border-[#CCE3FC] p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-[#E8F3FF] pb-4">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#062B50]">
              Reminders for You
            </h2>
          </div>

          {/* Cards Grid: Short, warm, small lines */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {REMINDERS.map((card) => {
              const IconComponent = card.icon;
              return (
                <div
                  key={card.id}
                  className={`p-5 rounded-2xl border ${card.accentBorder} ${card.accentBg} flex flex-col justify-between space-y-3`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-[#062B50]">
                      {card.title}
                    </h3>
                    <div
                      className={`w-7 h-7 rounded-lg ${card.iconBg} ${card.iconColor} flex items-center justify-center shrink-0`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-[#4A5D73] leading-relaxed">
                    {card.text}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* ========================================================= */}
      {/* VIEW MY ANSWERS INTERACTIVE MODAL (GUARANTEED TO WORK)    */}
      {/* ========================================================= */}
      {showAnswersModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl border border-[#CCE3FC] shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 sm:px-8 py-5 border-b border-[#E8F3FF] flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="space-y-0.5">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0866C6] uppercase tracking-wider">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Questionnaire Answers</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-[#062B50]">
                  My Submitted Answers
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAnswersModal(false)}
                  className="w-9 h-9 rounded-xl border border-[#D5E4F3] text-[#5A6E85] hover:text-[#062B50] hover:bg-[#F2F7FC] flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Close answers modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Section Pills Navigation */}
            <div className="px-5 sm:px-8 py-3 bg-[#F8FAFD] border-b border-[#E8F3FF] overflow-x-auto flex items-center gap-2 shrink-0">
              {SECTIONS.map((sec) => {
                const isSelected = activeAnswersSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setActiveAnswersSection(sec.id)}
                    className={`min-h-[36px] px-3.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                      isSelected
                        ? 'bg-[#0866C6] text-white shadow-xs'
                        : 'bg-white border border-[#D5E4F3] text-[#5A6E85] hover:bg-[#EBF4FE] hover:text-[#062B50]'
                    }`}
                  >
                    <span>Sec {sec.id}</span>
                  </button>
                );
              })}
            </div>

            {/* Modal Body: Active Section Content */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 space-y-4">
              {(() => {
                const currentSec =
                  SECTIONS.find((s) => s.id === activeAnswersSection) || SECTIONS[0];
                const sectionQuestions = QUESTIONS.filter((q) => q.section === currentSec.id);

                return (
                  <div className="space-y-4">
                    {/* Active Section Banner */}
                    <div className="p-4 rounded-2xl bg-[#EBF4FE] border border-[#CCE3FC] flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-[#0866C6]">
                          Section {currentSec.id} of {SECTIONS.length}
                        </span>
                        <h4 className="text-base sm:text-lg font-bold text-[#062B50]">
                          {currentSec.title}
                        </h4>
                      </div>
                      <span className="text-xs font-semibold text-[#5A6E85]">
                        {sectionQuestions.length} Questions
                      </span>
                    </div>

                    {/* Questions & Answers List */}
                    <div className="space-y-3.5">
                      {sectionQuestions.map((q) => {
                        const ans = allAnswers[q.n];
                        const hasAnswer =
                          ans !== undefined &&
                          ans !== null &&
                          (typeof ans === 'string'
                            ? ans.trim().length > 0
                            : Array.isArray(ans)
                            ? ans.length > 0
                            : true);

                        return (
                          <div
                            key={q.n}
                            className="p-4 sm:p-5 rounded-2xl border border-[#E2EDF8] bg-white space-y-3"
                          >
                            <div className="flex items-start gap-3">
                              <span className="w-6 h-6 rounded-lg bg-[#EBF4FE] text-[#0866C6] text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                                {q.n}
                              </span>
                              <p className="text-xs sm:text-sm font-bold text-[#062B50] leading-snug">
                                {q.text}
                              </p>
                            </div>

                            <div className="pl-9">
                              {hasAnswer ? (
                                typeof ans === 'string' ? (
                                  <div className="p-3 rounded-xl bg-[#F8FAFD] border border-[#E8F3FF] text-xs sm:text-sm text-[#062B50] font-medium leading-relaxed">
                                    {ans}
                                  </div>
                                ) : Array.isArray(ans) ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {ans.map((item, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#EBF4FE] text-[#0866C6] font-semibold text-xs border border-[#CCE3FC]"
                                      >
                                        <Check className="w-3 h-3 text-[#0866C6]" />
                                        <span>{item}</span>
                                      </span>
                                    ))}
                                  </div>
                                ) : null
                              ) : (
                                <span className="text-xs italic text-[#8EA3B8]">
                                  Not answered (optional)
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer Controls */}
            <div className="px-5 sm:px-8 py-4 bg-white border-t border-[#E8F3FF] flex items-center justify-between sticky bottom-0 z-10">
              <button
                type="button"
                disabled={activeAnswersSection <= 1}
                onClick={() => setActiveAnswersSection((prev) => Math.max(1, prev - 1))}
                className="min-h-[40px] px-4 py-2 rounded-xl border border-[#E2EDF8] text-xs font-bold text-[#062B50] hover:bg-[#F4F8FD] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous Section
              </button>

              <button
                type="button"
                onClick={() => setShowAnswersModal(false)}
                className="min-h-[40px] px-6 py-2 rounded-xl bg-[#0866C6] hover:bg-[#062B50] text-white text-xs font-bold transition-all cursor-pointer"
              >
                Done
              </button>

              <button
                type="button"
                disabled={activeAnswersSection >= SECTIONS.length}
                onClick={() => setActiveAnswersSection((prev) => Math.min(SECTIONS.length, prev + 1))}
                className="min-h-[40px] px-4 py-2 rounded-xl border border-[#E2EDF8] text-xs font-bold text-[#062B50] hover:bg-[#F4F8FD] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next Section
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demo Retake Modal (Kept for testing) */}
      {showRetakeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-[#CCE3FC] shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-[#EBF4FE] text-[#0866C6] flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-extrabold text-[#062B50]">
                Retake Questionnaire?
              </h3>
              <p className="text-xs sm:text-sm text-[#5A6E85] leading-relaxed">
                This demo reset allows you to test the questionnaire flow from question 1. In the final release, assessment submissions will be permanently recorded.
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowRetakeModal(false)}
                className="w-full sm:w-1/2 min-h-[44px] px-4 py-2.5 rounded-xl border border-[#D5E4F3] text-xs sm:text-sm font-bold text-[#062B50] hover:bg-[#F2F7FC] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRetakeConfirm}
                className="w-full sm:w-1/2 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0866C6] hover:bg-[#062B50] text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#0866C6]/20 cursor-pointer"
              >
                Reset &amp; Retake
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign Out Confirmation Modal */}
      {showSignoutModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-white rounded-3xl p-6 sm:p-8 border border-[#CCE3FC] shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-extrabold text-[#062B50]">
                Sign Out of DeRote?
              </h3>
              <p className="text-xs sm:text-sm text-[#5A6E85]">
                Your answers and profile remain safely stored. You can sign in anytime to continue.
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowSignoutModal(false)}
                className="w-full sm:w-1/2 min-h-[44px] px-4 py-2.5 rounded-xl border border-[#D5E4F3] text-xs sm:text-sm font-bold text-[#062B50] hover:bg-[#F2F7FC] transition-colors cursor-pointer"
              >
                Stay Here
              </button>
              <button
                type="button"
                onClick={handleSignoutConfirm}
                className="w-full sm:w-1/2 min-h-[44px] px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
