import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  LogOut,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  School,
  Mail,
  Phone,
  Shield,
  FileText,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { DeRoteWordmark } from '../components/DeRoteWordmark';
import {
  getCurrentStudent,
  onLocalAuthChange,
  logoutStudent,
  upgradeStudentEmail,
  syncStudentProfileFromPart1,
  LocalStudentAccount,
} from '../services/localAuth';
import {
  loadStudentQuestionnaireSession,
  resetStudentQuestionnaireSession,
  QuestionnaireSession,
} from '../services/questionnaireService';
import { generateStudentInsightReport, StudentInsightReport } from '../services/insightEngine';
import { resetSubmission } from '../services/api';

interface StudentDashboardPageProps {
  onNavigate: (route: string) => void;
  initialTab?: 'overview' | 'planner' | 'profile';
}

interface StudentTask {
  id: string;
  title: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  completed: boolean;
  notes?: string;
}

export const StudentDashboardPage: React.FC<StudentDashboardPageProps> = ({
  onNavigate,
  initialTab = 'overview',
}) => {
  const [student, setStudent] = useState<LocalStudentAccount | null>(() => getCurrentStudent());
  const [activeTab, setActiveTab] = useState<'overview' | 'planner' | 'profile'>(initialTab);
  const [session, setSession] = useState<QuestionnaireSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Planner state
  const [tasks, setTasks] = useState<StudentTask[]>(() => {
    if (!student) return [];
    try {
      const raw = localStorage.getItem(`derote_student_tasks_${student.id}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Task form modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState('Schoolwork');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskDueDate, setTaskDueDate] = useState('Tomorrow');
  const [taskNotes, setTaskNotes] = useState('');

  // Modals
  const [showRetakeModal, setShowRetakeModal] = useState(false);
  const [showSignoutModal, setShowSignoutModal] = useState(false);

  // Email upgrade modal
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [upgradePassword, setUpgradePassword] = useState('');
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    const unsub = onLocalAuthChange((curr) => {
      if (curr) {
        setStudent(curr);
      } else {
        // If no explicit student session, check if student filled About Me Part 1
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

  useEffect(() => {
    if (student) {
      setIsLoading(true);
      loadStudentQuestionnaireSession(student)
        .then(({ session: loadedSession }) => {
          setSession(loadedSession);
        })
        .finally(() => {
          setIsLoading(false);
        });

      // Load tasks
      try {
        const raw = localStorage.getItem(`derote_student_tasks_${student.id}`);
        if (raw) {
          setTasks(JSON.parse(raw));
        } else {
          // Default initial tasks
          const defaultTasks: StudentTask[] = [
            {
              id: 'task_1',
              title: 'Review my DeRote reflection summary',
              category: 'Self-Reflection',
              priority: 'high',
              dueDate: 'Today',
              completed: false,
            },
            {
              id: 'task_2',
              title: 'Explore one hobby or interest outside schoolwork',
              category: 'Personal Interests',
              priority: 'medium',
              dueDate: 'This weekend',
              completed: false,
            },
          ];
          setTasks(defaultTasks);
          localStorage.setItem(`derote_student_tasks_${student.id}`, JSON.stringify(defaultTasks));
        }
      } catch {}
    } else {
      setIsLoading(false);
    }
  }, [student]);

  const saveTasks = (newTasks: StudentTask[]) => {
    setTasks(newTasks);
    if (student) {
      try {
        localStorage.setItem(`derote_student_tasks_${student.id}`, JSON.stringify(newTasks));
      } catch {}
    }
  };

  const handleToggleTask = (taskId: string) => {
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t));
    saveTasks(updated);
  };

  const handleDeleteTask = (taskId: string) => {
    const updated = tasks.filter((t) => t.id !== taskId);
    saveTasks(updated);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const newTask: StudentTask = {
      id: `task_${Date.now()}`,
      title: taskTitle.trim(),
      category: taskCategory,
      priority: taskPriority,
      dueDate: taskDueDate.trim() || 'Upcoming',
      notes: taskNotes.trim() || undefined,
      completed: false,
    };

    saveTasks([newTask, ...tasks]);
    setTaskTitle('');
    setTaskNotes('');
    setShowTaskModal(false);
  };

  const handleRetakeConfirm = async () => {
    if (!student) return;
    await resetStudentQuestionnaireSession(student);
    await resetSubmission();
    setShowRetakeModal(false);
    onNavigate('/questionnaire');
  };

  const handleSignoutConfirm = async () => {
    await logoutStudent();
    setShowSignoutModal(false);
    onNavigate('/login');
  };

  const handleUpgradeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setUpgradeLoading(true);
    setUpgradeMessage(null);

    try {
      const res = await upgradeStudentEmail(newEmail.trim(), upgradePassword || undefined);
      if (res.success) {
        setUpgradeMessage({
          type: 'success',
          text: res.message || 'Login email successfully updated!',
        });
        setTimeout(() => {
          setShowUpgradeModal(false);
          setUpgradeMessage(null);
        }, 1500);
      } else {
        setUpgradeMessage({ type: 'error', text: res.error || 'Failed to update email.' });
      }
    } catch {
      setUpgradeMessage({ type: 'error', text: 'Network error occurred.' });
    } finally {
      setUpgradeLoading(false);
    }
  };

  // Generate insight report if answers are available
  const insightReport: StudentInsightReport | null = useMemo(() => {
    if (!session || !session.answers) return null;
    return generateStudentInsightReport(
      session,
      student?.fullName || 'Student',
      student?.classGrade || '9'
    );
  }, [session, student]);

  if (!student) {
    return (
      <div className="min-h-screen bg-[#F4F8FD] flex flex-col justify-between text-[#102C46]">
        <header className="bg-white border-b border-[#E8F3FF] px-4 sm:px-8 py-3.5 sticky top-0 z-20">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <button
              onClick={() => onNavigate('/')}
              className="flex items-center text-left focus-visible:outline-2 focus-visible:outline-[#0866C6] rounded-lg cursor-pointer"
            >
              <DeRoteWordmark showDescriptor={true} size="md" />
            </button>
            <button
              onClick={() => onNavigate('/login')}
              className="text-xs sm:text-sm font-bold text-[#0866C6] hover:underline"
            >
              Sign In
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#E8F3FF] shadow-xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#EBF4FE] text-[#0866C6] flex items-center justify-center mx-auto mb-4">
              <User className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#062B50] mb-2">Student Portal Access</h1>
            <p className="text-sm text-[#5A6E85] mb-6 leading-relaxed">
              Please sign in to access your personalized student reflections, study planner, and learning insights.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => onNavigate('/login')}
                className="w-full py-3.5 px-4 rounded-xl bg-[#0866C6] text-white font-bold text-sm hover:bg-[#062B50] transition-colors shadow-md shadow-[#0866C6]/20 cursor-pointer"
              >
                Sign In to Student Account
              </button>
              <button
                onClick={() => onNavigate('/signup')}
                className="w-full py-3 px-4 rounded-xl bg-white text-[#062B50] border border-[#E2EDF8] font-semibold text-sm hover:bg-[#F4F8FD] transition-colors cursor-pointer"
              >
                Create New Student Account
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F8FD] flex flex-col text-[#102C46]">
      {/* Top Navigation */}
      <header className="bg-white border-b border-[#E8F3FF] px-4 sm:px-8 py-3.5 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => onNavigate('/')}
            className="flex items-center text-left focus-visible:outline-2 focus-visible:outline-[#0866C6] rounded-lg cursor-pointer"
          >
            <DeRoteWordmark showDescriptor={true} size="md" />
          </button>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-[#062B50]">{student.fullName}</div>
              <div className="text-[11px] text-[#64778C]">
                {student.classGrade === 'Others' ? 'Others' : `Class ${student.classGrade}`}
                {student.age ? ` · Age ${student.age}` : ''} · {student.schoolName}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSignoutModal(true)}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-[#D5E4F3] text-xs font-bold text-[#64778C] hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer flex items-center gap-1.5"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Welcome Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF4FE] text-[#0866C6] text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Personal Student Dashboard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#062B50] tracking-tight">
              Hello, {student.fullName}
            </h1>
            <p className="text-xs sm:text-sm text-[#5A6E85] mt-1">
              Your safe space to reflect on school, interests, and what matters to you.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('/questionnaire')}
              className="px-5 py-2.5 rounded-xl bg-[#0866C6] hover:bg-[#062B50] text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#0866C6]/20 flex items-center gap-2 cursor-pointer"
            >
              <span>{session?.status === 'submitted' ? 'Review Reflection' : 'Continue Reflection'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dashboard Tabs */}
        <div className="flex border-b border-[#E8F3FF] mb-8 space-x-6">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'border-[#0866C6] text-[#0866C6]'
                : 'border-transparent text-[#64778C] hover:text-[#062B50]'
            }`}
          >
            Insights &amp; Reflection
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('planner')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'planner'
                ? 'border-[#0866C6] text-[#0866C6]'
                : 'border-transparent text-[#64778C] hover:text-[#062B50]'
            }`}
          >
            My Study &amp; Goals Planner ({tasks.filter((t) => !t.completed).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'border-[#0866C6] text-[#0866C6]'
                : 'border-transparent text-[#64778C] hover:text-[#062B50]'
            }`}
          >
            Profile &amp; Account
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Assessment Status Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8F3FF] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    session?.status === 'submitted'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-[#EBF4FE] text-[#0866C6]'
                  }`}
                >
                  {session?.status === 'submitted' ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <Clock className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#062B50]">
                    {session?.status === 'submitted'
                      ? 'Self-Reflection Completed'
                      : 'Self-Reflection in Progress'}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5A6E85] mt-1 leading-relaxed max-w-xl">
                    {session?.status === 'submitted'
                      ? 'Your answers are safely logged. You can review your personal narrative below or retake the assessment anytime.'
                      : 'You can pause and come back anytime. Your draft is automatically saved as you answer.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                <button
                  type="button"
                  onClick={() => onNavigate('/questionnaire')}
                  className="px-5 py-2.5 rounded-xl bg-[#0866C6] text-white text-xs sm:text-sm font-bold hover:bg-[#062B50] transition-colors cursor-pointer"
                >
                  {session?.status === 'submitted' ? 'Review Answers' : 'Continue Questionnaire'}
                </button>
                {session?.status === 'submitted' && (
                  <button
                    type="button"
                    onClick={() => setShowRetakeModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#0866C6]/30 text-xs sm:text-sm font-bold text-[#0866C6] hover:bg-[#EBF4FE] transition-colors cursor-pointer"
                    title="Retake reflection"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Retake Questionnaire</span>
                  </button>
                )}
              </div>
            </div>

            {/* Generated Insight Cards */}
            {insightReport ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-[#062B50] tracking-tight">
                    Your Personalized Reflection Narrative
                  </h2>
                  <p className="text-xs text-[#64778C] mt-1">
                    Synthesized from your responses. Not a diagnosis or score—a mirror for your thoughts.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {insightReport.cards.map((card, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-3xl p-6 border border-[#E8F3FF] shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#0866C6] bg-[#E8F3FF] px-2.5 py-0.5 rounded-full mb-3 inline-block">
                          Category {card.categoryKey}
                        </span>
                        <h3 className="text-base font-bold text-[#062B50] mb-2">{card.heading}</h3>
                        <p className="text-xs sm:text-sm text-[#5A6E85] leading-relaxed">
                          {card.reflectionText}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#E8F3FF] text-[11px] text-[#64778C]">
                        {card.evidence.length > 0
                          ? `Traceable to Question ${card.evidence.map((e) => e.questionNumber).join(', ')}`
                          : 'Derived from your stated reflections'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 border border-[#E8F3FF] text-center">
                <BookOpen className="w-10 h-10 text-[#0866C6] mx-auto mb-3 opacity-60" />
                <h3 className="text-lg font-bold text-[#062B50] mb-1">Begin your reflection</h3>
                <p className="text-xs sm:text-sm text-[#5A6E85] max-w-md mx-auto mb-5 leading-relaxed">
                  Answer 14 gentle questions to uncover your unique patterns of curiosity, working with others, and personal agency.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('/questionnaire')}
                  className="px-6 py-3 rounded-2xl bg-[#0866C6] text-white font-bold text-xs sm:text-sm hover:bg-[#062B50] transition-colors shadow-sm"
                >
                  Start 14-Question Reflection
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PLANNER */}
        {activeTab === 'planner' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#062B50] tracking-tight">
                  Personal Study &amp; Goals Planner
                </h2>
                <p className="text-xs text-[#64778C] mt-1">
                  Keep track of homework, self-study goals, and personal projects.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowTaskModal(true)}
                className="px-4 py-2.5 rounded-xl bg-[#0866C6] hover:bg-[#062B50] text-white text-xs sm:text-sm font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Goal</span>
              </button>
            </div>

            {/* Task List */}
            <div className="bg-white rounded-3xl border border-[#E8F3FF] shadow-xs divide-y divide-[#E8F3FF] overflow-hidden">
              {tasks.length === 0 ? (
                <div className="p-8 text-center text-xs sm:text-sm text-[#64778C]">
                  No goals yet. Click <strong>Add Goal</strong> above to start organizing your study plans.
                </div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-[#F8FAFD] transition-colors"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleTask(task.id)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 cursor-pointer transition-colors ${
                          task.completed
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-white border-[#CBD5E1] hover:border-[#0866C6]'
                        }`}
                      >
                        {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      <div className="min-w-0">
                        <div
                          className={`text-sm font-bold text-[#062B50] truncate ${
                            task.completed ? 'line-through opacity-50' : ''
                          }`}
                        >
                          {task.title}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#64778C] mt-0.5">
                          <span className="text-[#0866C6] font-semibold">{task.category}</span>
                          <span>·</span>
                          <span>Due: {task.dueDate}</span>
                          {task.notes && (
                            <>
                              <span>·</span>
                              <span className="truncate max-w-[200px]">{task.notes}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-2 text-[#64778C] hover:text-red-600 transition-colors cursor-pointer shrink-0"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PROFILE */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl bg-white rounded-3xl p-6 sm:p-8 border border-[#E8F3FF] shadow-xs space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#062B50] tracking-tight">Student Profile Details</h2>
                <p className="text-xs text-[#5A6E85] mt-0.5">
                  Created strictly using your About Me (Part 1) personal information.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-[#EBF4FE] text-[#0866C6] rounded-full border border-[#0866C6]/20">
                About Me Part 1
              </span>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#E8F3FF]">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-[#0866C6]" />
                  <span className="text-[#64778C]">Full Name</span>
                </div>
                <span className="font-bold text-[#062B50]">{student.fullName}</span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#E8F3FF]">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-[#0866C6]" />
                  <span className="text-[#64778C]">Age</span>
                </div>
                <span className="font-bold text-[#062B50]">
                  {student.age ? `${student.age} years old` : 'Not specified'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#E8F3FF]">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-[#0866C6]" />
                  <span className="text-[#64778C]">Class</span>
                </div>
                <span className="font-bold text-[#062B50]">
                  {student.classGrade === 'Others' ? 'Others' : `Class ${student.classGrade}`}
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#E8F3FF]">
                <div className="flex items-center gap-3">
                  <School className="w-4 h-4 text-[#0866C6]" />
                  <span className="text-[#64778C]">School and Institute</span>
                </div>
                <span className="font-bold text-[#062B50] text-right truncate max-w-xs">
                  {student.schoolName}
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#E8F3FF]">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-[#0866C6]" />
                  <span className="text-[#64778C]">Login Email</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#062B50]">{student.email || 'None'}</span>
                  {student.isSyntheticEmail && (
                    <button
                      type="button"
                      onClick={() => setShowUpgradeModal(true)}
                      className="text-xs font-bold text-[#0866C6] hover:underline cursor-pointer"
                    >
                      (Set Real Email)
                    </button>
                  )}
                </div>
              </div>

              {student.phone && (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#E8F3FF]">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-[#0866C6]" />
                    <span className="text-[#64778C]">Registered Mobile</span>
                  </div>
                  <span className="font-bold text-[#062B50]">+91 {student.phone}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#E8F3FF] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowSignoutModal(true)}
                className="px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer"
              >
                Sign Out
              </button>

              <button
                type="button"
                onClick={() => setShowUpgradeModal(true)}
                className="px-4 py-2 rounded-xl bg-white border border-[#D5E4F3] text-xs font-bold text-[#062B50] hover:bg-[#F2F7FC] cursor-pointer"
              >
                Update Login Email
              </button>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: ADD GOAL TASK */}
      {showTaskModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#062B50]/40 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#E8F3FF] shadow-2xl">
            <h3 className="text-xl font-bold text-[#062B50] mb-4">Add Study or Personal Goal</h3>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#062B50] mb-1.5">Goal Title</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Science Chapter 4 revision"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[#062B50]/15 focus:border-[#0866C6] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#062B50] mb-1.5">Category</label>
                <select
                  value={taskCategory}
                  onChange={(e) => setTaskCategory(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[#062B50]/15 focus:border-[#0866C6] outline-none"
                >
                  <option value="Schoolwork">Schoolwork</option>
                  <option value="Self-Reflection">Self-Reflection</option>
                  <option value="Personal Interests">Personal Interests</option>
                  <option value="Skill Practice">Skill Practice</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#062B50] mb-1.5">Due Timeframe</label>
                <input
                  type="text"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  placeholder="e.g. Tomorrow, Friday, or Next week"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[#062B50]/15 focus:border-[#0866C6] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#062B50] mb-1.5">
                  Notes (Optional)
                </label>
                <textarea
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="Key concepts or reminders..."
                  rows={2}
                  className="w-full text-sm px-3.5 py-2 rounded-xl border border-[#062B50]/15 focus:border-[#0866C6] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8F3FF]">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64778C] hover:text-[#062B50] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0866C6] hover:bg-[#062B50] text-white text-xs font-bold cursor-pointer"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RETAKE ASSESSMENT */}
      {showRetakeModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#062B50]/40 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#E8F3FF] shadow-2xl">
            <h3 className="text-xl font-bold text-[#062B50] mb-2">Retake Reflection?</h3>
            <p className="text-xs sm:text-sm text-[#5A6E85] mb-5 leading-relaxed">
              This will reset your questionnaire submission and draft so you can take it fresh from Section 1.
              Your student profile and planner tasks will remain completely safe.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8F3FF]">
              <button
                type="button"
                onClick={() => setShowRetakeModal(false)}
                className="px-4 py-2 text-xs font-semibold text-[#64778C] hover:text-[#062B50] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRetakeConfirm}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Confirm Retake
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SIGN OUT */}
      {showSignoutModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#062B50]/40 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#E8F3FF] shadow-2xl">
            <h3 className="text-xl font-bold text-[#062B50] mb-2">Sign Out</h3>
            <p className="text-xs sm:text-sm text-[#5A6E85] mb-5 leading-relaxed">
              Are you sure you want to sign out? Your reflection answers and planner tasks are saved and will
              be restored next time you log in.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8F3FF]">
              <button
                type="button"
                onClick={() => setShowSignoutModal(false)}
                className="px-4 py-2 text-xs font-semibold text-[#64778C] hover:text-[#062B50] cursor-pointer"
              >
                Stay Signed In
              </button>
              <button
                type="button"
                onClick={handleSignoutConfirm}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: UPGRADE EMAIL */}
      {showUpgradeModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#062B50]/40 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#E8F3FF] shadow-2xl">
            <h3 className="text-xl font-bold text-[#062B50] mb-2">Update Login Email</h3>
            <p className="text-xs text-[#5A6E85] mb-4 leading-relaxed">
              Attach an active email address to your account for easy password reset and sign-in.
            </p>

            {upgradeMessage && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs flex items-start gap-2 ${
                  upgradeMessage.type === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {upgradeMessage.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <span>{upgradeMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleUpgradeEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#062B50] mb-1.5">New Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  disabled={upgradeLoading}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[#062B50]/15 focus:border-[#0866C6] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#062B50] mb-1.5">
                  Current Password (if applicable)
                </label>
                <input
                  type="password"
                  value={upgradePassword}
                  onChange={(e) => setUpgradePassword(e.target.value)}
                  placeholder="Enter current password"
                  disabled={upgradeLoading}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-[#062B50]/15 focus:border-[#0866C6] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8F3FF]">
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64778C] hover:text-[#062B50] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={upgradeLoading}
                  className="px-5 py-2 rounded-xl bg-[#0866C6] hover:bg-[#062B50] text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
                >
                  {upgradeLoading ? 'Updating...' : 'Update Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
