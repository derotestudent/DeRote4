import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Compass,
  FileCheck,
  RotateCcw,
  Sparkles,
  Loader2,
  Home,
  WifiOff,
  RefreshCw,
  Lock,
  Printer,
} from 'lucide-react';
import { executePrint } from '../utils/printHelper';
import { PrintableReport } from '../components/PrintableReport';
import {
  INTRO,
  SECTIONS,
  QUESTIONS,
  EXCLUSIVE_OPTIONS,
  Question,
  ChoiceQuestion,
  TextQuestion,
  QUESTIONNAIRE_VERSION,
} from '../data/questionnaire';
import {
  loadDraft,
  queueDraftSave,
  flushPendingDraft,
  retryFailedSave,
  onAutosaveStateChange,
  SaveStateInfo,
  submitQuestionnaireOutcome,
  hasSubmitted,
  resetSubmission,
  getSubmissionData,
  StudentAnswers,
} from '../services/api';
import {
  getCurrentStudent,
  syncStudentProfileFromPart1,
} from '../services/localAuth';
import { resetStudentQuestionnaireSession } from '../services/questionnaireService';
import {
  getQuestionnaireFromBackend,
  seedQuestionnaireToBackend,
} from '../services/firestoreBackend';
import { DeRoteWordmark } from '../components/DeRoteWordmark';

interface QuestionnairePageProps {
  onNavigate: (route: string) => void;
}

type ScreenView = 'loading' | 'intro' | 'section' | 'review' | 'confirmation';

export const QuestionnairePage: React.FC<QuestionnairePageProps> = ({ onNavigate }) => {
  const [view, setView] = useState<ScreenView>('loading');
  const [currentSection, setCurrentSection] = useState<number>(1);
  const [answers, setAnswers] = useState<StudentAnswers>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isLockedSubmission, setIsLockedSubmission] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const [saveState, setSaveState] = useState<SaveStateInfo>({ status: 'idle' });
  const [sections, setSections] = useState(SECTIONS);
  const [questions, setQuestions] = useState(QUESTIONS);
  const [draftVersion, setDraftVersion] = useState<number>(QUESTIONNAIRE_VERSION);

  const totalSections = sections.length;
  const isMountedRef = useRef<boolean>(true);

  // Subscribe to real-time autosave status updates
  useEffect(() => {
    const unsub = onAutosaveStateChange((info) => {
      if (isMountedRef.current) {
        setSaveState(info);
      }
    });
    return () => unsub();
  }, []);

  // Initialize draft and authoritatively check submission status on mount
  useEffect(() => {
    isMountedRef.current = true;

    async function init() {
      // 1. Authoritative check: has student already submitted to Firestore?
      const submitted = await hasSubmitted();
      if (!isMountedRef.current) return;

      if (submitted) {
        setIsLockedSubmission(true);
        // Load submitted answers to display on confirmation screen
        const existingSub = await getSubmissionData();
        if (existingSub?.answers) {
          setAnswers(existingSub.answers);
        }
        setView('confirmation');
        setIsLoaded(true);
        return;
      }

      // 2. Load questions from Firestore backend if available, or auto-seed
      try {
        const cloudQ = await getQuestionnaireFromBackend();
        if (cloudQ && cloudQ.questions && cloudQ.questions.length > 0 && cloudQ.version === QUESTIONNAIRE_VERSION) {
          if (isMountedRef.current) {
            setSections(cloudQ.sections);
            setQuestions(cloudQ.questions);
          }
        } else {
          seedQuestionnaireToBackend(true).catch(() => {});
        }
      } catch (err) {
        console.warn('Backend questionnaire load fallback to local:', err);
      }

      // 3. Load active student's draft
      const draft = await loadDraft();
      if (!isMountedRef.current) return;

      if (draft) {
        setAnswers(draft.answers || {});
        setDraftVersion(draft.version || QUESTIONNAIRE_VERSION);

        // Sync Part 1 only if legacy Version 1 answers are present
        if (draft.version === 1 && draft.answers && (draft.answers[1] || draft.answers[2] || draft.answers[3] || draft.answers[4])) {
          syncStudentProfileFromPart1(draft.answers);
        }

        if (draft.currentSection >= 1 && draft.currentSection <= totalSections) {
          setCurrentSection(draft.currentSection);
          setView('section');
        } else if (draft.currentSection === totalSections + 1) {
          setView('review');
        } else {
          setView('intro');
        }
      } else {
        setView('intro');
      }

      setIsLoaded(true);
    }

    init();

    return () => {
      isMountedRef.current = false;
      // Flush any pending changes when user leaves questionnaire page
      flushPendingDraft().catch(() => {});
    };
  }, [totalSections]);

  const sectionData = useMemo(() => {
    return sections.find((s) => s.id === currentSection) || sections[0];
  }, [sections, currentSection]);

  const sectionQuestions = useMemo(() => {
    return questions.filter((q) => q.section === currentSection);
  }, [questions, currentSection]);

  // Handle typing with debounced autosave
  const handleTextChange = (questionNumber: number, value: string) => {
    if (isLockedSubmission) return;
    setAnswers((prev) => {
      const updated = { ...prev, [questionNumber]: value };
      queueDraftSave(updated, currentSection, { immediate: false, version: draftVersion });
      return updated;
    });
  };

  // Handle single-choice with immediate autosave
  const handleSingleChange = (questionNumber: number, option: string) => {
    if (isLockedSubmission) return;
    setAnswers((prev) => {
      const updated = { ...prev, [questionNumber]: option };
      queueDraftSave(updated, currentSection, { immediate: true, version: draftVersion });
      return updated;
    });
  };

  // Handle multi-choice with immediate autosave
  const handleMultiChange = (questionNumber: number, option: string) => {
    if (isLockedSubmission) return;
    setAnswers((prev) => {
      const current = (prev[questionNumber] as string[]) || [];
      const isSelected = current.includes(option);
      let updatedList: string[];

      if (isSelected) {
        updatedList = current.filter((item) => item !== option);
      } else {
        if (EXCLUSIVE_OPTIONS.includes(option)) {
          updatedList = [option];
        } else {
          updatedList = current.filter((item) => !EXCLUSIVE_OPTIONS.includes(item)).concat(option);
        }
      }

      const updated = { ...prev, [questionNumber]: updatedList };
      queueDraftSave(updated, currentSection, { immediate: true, version: draftVersion });
      return updated;
    });
  };

  // Section navigation handlers flush any pending text changes before view transition
  const handleBegin = async () => {
    await flushPendingDraft();
    setCurrentSection(1);
    setView('section');
    queueDraftSave(answers, 1, { immediate: true, version: draftVersion });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackFromSection = async () => {
    await flushPendingDraft();
    if (currentSection <= 1) {
      setCurrentSection(0);
      setView('intro');
      queueDraftSave(answers, 0, { immediate: true, version: draftVersion });
    } else {
      const prev = currentSection - 1;
      setCurrentSection(prev);
      queueDraftSave(answers, prev, { immediate: true, version: draftVersion });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextFromSection = async () => {
    await flushPendingDraft();
    if (currentSection === 1 && draftVersion === 1) {
      syncStudentProfileFromPart1(answers);
    }

    if (currentSection >= totalSections) {
      const reviewSectionId = totalSections + 1;
      setCurrentSection(reviewSectionId);
      setView('review');
      queueDraftSave(answers, reviewSectionId, { immediate: true, version: draftVersion });
    } else {
      const next = currentSection + 1;
      setCurrentSection(next);
      queueDraftSave(answers, next, { immediate: true, version: draftVersion });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getSectionUnansweredCount = (secId: number): number => {
    const secQuestions = questions.filter((q) => q.section === secId);
    return secQuestions.filter((q) => {
      const val = answers[q.n];
      if (val === undefined || val === null) return true;
      if (typeof val === 'string') return val.trim() === '';
      if (Array.isArray(val)) return val.length === 0;
      return true;
    }).length;
  };

  // Submit Questionnaire with positive cloud server confirmation
  const handleSubmit = async () => {
    if (isSubmitting || isLockedSubmission) return;
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      syncStudentProfileFromPart1(answers);
      const outcome = await submitQuestionnaireOutcome(answers);

      if (outcome.success) {
        setIsLockedSubmission(true);
        setView('confirmation');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setSubmissionError(outcome.error || 'Submission could not be confirmed by the server. Please try again.');
      }
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'An unexpected error occurred during submission.';
      setSubmissionError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Demo Retake Handler (Development / Testing Mode Only)
  const handleRetake = async () => {
    await resetSubmission();
    const currStudent = getCurrentStudent();
    if (currStudent) {
      await resetStudentQuestionnaireSession(currStudent);
    }
    setIsLockedSubmission(false);
    setAnswers({});
    setCurrentSection(1);
    setView('section');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Header Save Status Indicator
  const renderSaveStatus = () => {
    if (isLockedSubmission) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700">
          <Lock className="w-3 h-3 text-emerald-600" />
          <span>Submitted & Locked</span>
        </span>
      );
    }

    switch (saveState.status) {
      case 'saving':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EBF4FE] border border-[#CCE3FC] text-[11px] font-semibold text-[#0866C6]">
            <Loader2 className="w-3 h-3 animate-spin text-[#0866C6]" />
            <span>Saving draft...</span>
          </span>
        );
      case 'saved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Saved {saveState.lastSavedAt ? `at ${saveState.lastSavedAt}` : 'to cloud'}</span>
          </span>
        );
      case 'offline':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-700">
            <WifiOff className="w-3 h-3 text-amber-600" />
            <span>Offline — Saved locally</span>
          </span>
        );
      case 'failed':
        return (
          <button
            type="button"
            onClick={() => retryFailedSave()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-[11px] font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
            title="Click to retry saving your draft"
          >
            <AlertCircle className="w-3 h-3 text-red-600" />
            <span>Save failed — Retry</span>
            <RefreshCw className="w-2.5 h-2.5 text-red-600" />
          </button>
        );
      default:
        return null;
    }
  };

  // Top header bar adhering to landing page identity
  const renderHeader = () => (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-[#E8F3FF] transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
        <button
          onClick={() => onNavigate('/')}
          className="flex items-center text-left focus-visible:outline-2 focus-visible:outline-[#0866C6] rounded-lg cursor-pointer"
          aria-label="DeRote Student Insight - Home"
        >
          <DeRoteWordmark showDescriptor={false} size="sm" />
        </button>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {renderSaveStatus()}
          <button
            type="button"
            onClick={async () => {
              await flushPendingDraft();
              onNavigate('/dashboard');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2EDF8] bg-white hover:bg-[#F2F7FC] text-xs font-semibold text-[#062B50] hover:text-[#0866C6] transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5 text-[#0866C6]" />
            <span>Save & Exit</span>
          </button>
        </div>
      </div>
    </header>
  );

  // Loading Screen
  if (!isLoaded || view === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F2F7FC]/80 via-white to-[#F4F8FD] flex flex-col items-center justify-center p-6 text-[#102C46]">
        <div className="w-12 h-12 rounded-2xl bg-[#EBF4FE] border border-[#E2EDF8] flex items-center justify-center mb-4">
          <Loader2 className="w-6 h-6 text-[#0866C6] animate-spin" />
        </div>
        <p className="text-[#062B50] text-base font-bold">Opening your reflection space...</p>
        <p className="text-xs text-[#5A6E85] mt-1">Connecting to your secure cloud draft</p>
      </div>
    );
  }

  // 1. Intro Screen
  if (view === 'intro') {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#F2F7FC]/80 via-white to-[#F4F8FD] text-[#102C46]">
        {renderHeader()}

        <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6">
          <div className="max-w-2xl mx-auto bg-white border border-[#E2EDF8] p-6 sm:p-10 rounded-3xl shadow-sm">
            <div className="mb-6">
              <div className="inline-flex items-center gap-1 text-[#0866C6] text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4 text-[#0866C6]" />
                <span>Student Reflection</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#062B50] tracking-tight leading-tight">
                {INTRO.title}
              </h1>
              <p className="text-sm sm:text-base font-medium text-[#5A6E85] mt-1.5">
                {INTRO.subtitle}
              </p>
            </div>

            <div className="mb-6 border-t border-[#E8F3FF] pt-5">
              <h2 className="text-sm sm:text-base font-bold text-[#062B50] uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#0866C6] rounded-full inline-block" />
                <span>{INTRO.whyHeading}</span>
              </h2>
              <div className="space-y-3 text-sm sm:text-base text-[#475A6E] leading-relaxed">
                {INTRO.why.map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>
            </div>

            <div className="mb-8 p-4 sm:p-5 bg-[#EBF4FE] border-l-4 border-[#0866C6] rounded-r-2xl">
              <p className="text-xs sm:text-sm text-[#062B50] leading-relaxed font-semibold">
                {INTRO.beforeYouBegin}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-[#E8F3FF]">
              <button
                type="button"
                onClick={() => onNavigate('/dashboard')}
                className="w-full sm:w-auto min-h-[46px] px-6 py-2.5 bg-white border border-[#E2EDF8] text-[#062B50] hover:text-[#0866C6] hover:bg-[#F2F7FC] font-bold text-sm sm:text-base rounded-xl cursor-pointer transition-all shadow-xs inline-flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </button>
              <button
                type="button"
                onClick={handleBegin}
                className="w-full sm:w-auto min-h-[46px] px-8 py-2.5 bg-[#0866C6] hover:bg-[#062B50] text-white font-bold text-sm sm:text-base rounded-xl cursor-pointer transition-all shadow-md shadow-[#0866C6]/20 active:scale-[0.98] inline-flex items-center justify-center gap-2"
              >
                <span>Begin Reflection</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 2. Section Screen
  if (view === 'section') {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#F2F7FC]/80 via-white to-[#F4F8FD] text-[#102C46]">
        {renderHeader()}

        <main className="flex-1 py-6 sm:py-10 px-4 sm:px-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Progress Bar & Counter */}
            <div className="bg-white border border-[#E2EDF8] p-4 sm:p-5 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-[#5A6E85] mb-2">
                <span className="uppercase tracking-wider text-[#0866C6]">
                  Section {currentSection} of {totalSections}
                </span>
                <span>{Math.round((currentSection / totalSections) * 100)}% through questionnaire</span>
              </div>
              <div className="w-full bg-[#E2EDF8] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#0866C6] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentSection / totalSections) * 100}%` }}
                />
              </div>
            </div>

            {/* Section Header */}
            <div className="bg-white border border-[#E2EDF8] p-6 sm:p-8 rounded-3xl shadow-sm">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF4FE] text-[#0866C6] text-xs font-bold tracking-wide uppercase mb-2">
                <Compass className="w-3.5 h-3.5" />
                <span>Section {sectionData.id}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#062B50] tracking-tight">
                {sectionData.title}
              </h1>
              {sectionData.intro && (
                <p className="text-xs sm:text-sm text-[#5A6E85] mt-2 italic leading-relaxed bg-[#F8FAFD] p-3 rounded-xl border border-[#EAF2FC]">
                  {sectionData.intro}
                </p>
              )}
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {sectionQuestions.map((q) => {
                const currentVal = answers[q.n];

                return (
                  <div
                    key={q.n}
                    className="bg-white border border-[#E2EDF8] p-5 sm:p-6 rounded-2xl shadow-xs space-y-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#EBF4FE] text-[#0866C6] font-bold text-xs shrink-0 mt-0.5">
                        {q.n}
                      </span>
                      <label className="text-sm sm:text-base font-bold text-[#062B50] leading-snug">
                        {q.text}
                      </label>
                    </div>

                    {/* Text Question */}
                    {q.type === 'text' && (
                      <div className="pt-1">
                        {(q as TextQuestion).lines > 1 ? (
                          <textarea
                            rows={(q as TextQuestion).lines}
                            value={(currentVal as string) || ''}
                            onChange={(e) => handleTextChange(q.n, e.target.value)}
                            disabled={isLockedSubmission}
                            placeholder="Write your thoughts here..."
                            className="w-full p-3.5 rounded-xl border border-[#D5E4F3] bg-white text-[#102C46] text-sm focus:border-[#0866C6] focus:ring-2 focus:ring-[#0866C6]/15 outline-none transition-all resize-y disabled:bg-[#F8FAFD] disabled:cursor-not-allowed"
                          />
                        ) : (
                          <input
                            type="text"
                            value={(currentVal as string) || ''}
                            onChange={(e) => handleTextChange(q.n, e.target.value)}
                            disabled={isLockedSubmission}
                            placeholder="Your answer..."
                            className="w-full px-4 py-3 rounded-xl border border-[#D5E4F3] bg-white text-[#102C46] text-sm focus:border-[#0866C6] focus:ring-2 focus:ring-[#0866C6]/15 outline-none transition-all disabled:bg-[#F8FAFD] disabled:cursor-not-allowed"
                          />
                        )}
                      </div>
                    )}

                    {/* Single-Choice Question */}
                    {q.type === 'single' && (
                      <div className="space-y-2 pt-1">
                        {(q as ChoiceQuestion).options.map((opt) => {
                          const isSelected = currentVal === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleSingleChange(q.n, opt)}
                              disabled={isLockedSubmission}
                              className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-between ${
                                isSelected
                                  ? 'bg-[#EBF4FE] border-[#0866C6] text-[#0866C6] shadow-xs'
                                  : 'bg-white border-[#E2EDF8] text-[#062B50] hover:border-[#0866C6]/40 hover:bg-[#F9FBFE]'
                              } disabled:cursor-not-allowed`}
                            >
                              <span>{opt}</span>
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                  isSelected ? 'border-[#0866C6] bg-[#0866C6]' : 'border-[#CBD5E1] bg-white'
                                }`}
                              >
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Multi-Choice Question */}
                    {q.type === 'multi' && (
                      <div className="space-y-2 pt-1">
                        <p className="text-[11px] font-semibold text-[#8EA3B8] pb-0.5">
                          Select all that apply
                        </p>
                        {(q as ChoiceQuestion).options.map((opt) => {
                          const selectedList = (currentVal as string[]) || [];
                          const isSelected = selectedList.includes(opt);
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleMultiChange(q.n, opt)}
                              disabled={isLockedSubmission}
                              className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-between ${
                                isSelected
                                  ? 'bg-[#EBF4FE] border-[#0866C6] text-[#0866C6] shadow-xs'
                                  : 'bg-white border-[#E2EDF8] text-[#062B50] hover:border-[#0866C6]/40 hover:bg-[#F9FBFE]'
                              } disabled:cursor-not-allowed`}
                            >
                              <span>{opt}</span>
                              <div
                                className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                  isSelected ? 'border-[#0866C6] bg-[#0866C6]' : 'border-[#CBD5E1] bg-white'
                                }`}
                              >
                                {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleBackFromSection}
                className="min-h-[46px] px-6 py-2.5 bg-white border border-[#E2EDF8] text-[#062B50] hover:text-[#0866C6] hover:bg-[#F2F7FC] font-bold text-sm sm:text-base rounded-xl cursor-pointer transition-all shadow-xs inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{currentSection <= 1 ? 'Intro' : 'Previous Section'}</span>
              </button>

              <button
                type="button"
                onClick={handleNextFromSection}
                className="min-h-[46px] px-7 py-2.5 bg-[#0866C6] hover:bg-[#062B50] text-white font-bold text-sm sm:text-base rounded-xl cursor-pointer transition-all shadow-md shadow-[#0866C6]/20 active:scale-[0.98] inline-flex items-center gap-2"
              >
                <span>{currentSection >= totalSections ? 'Review All' : 'Next Section'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 3. Review Screen
  if (view === 'review') {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#F2F7FC]/80 via-white to-[#F4F8FD] text-[#102C46]">
        {renderHeader()}

        <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white border border-[#E2EDF8] p-6 sm:p-8 rounded-3xl shadow-sm">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF4FE] text-[#0866C6] text-xs font-bold tracking-wide uppercase mb-2">
                <FileCheck className="w-3.5 h-3.5" />
                <span>Final Review</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#062B50] tracking-tight">
                Review Your Self-Reflection
              </h1>
              <p className="text-xs sm:text-sm text-[#5A6E85] mt-1.5 leading-relaxed">
                You can review or change your answers below. Every question is reflective and optional—you may submit whenever you feel ready.
              </p>
            </div>

            {/* Submission Error Alert */}
            {submissionError && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Submission Pending Server Confirmation</p>
                  <p className="leading-relaxed">{submissionError}</p>
                </div>
              </div>
            )}

            {/* Sections List */}
            <div className="bg-white border border-[#E2EDF8] rounded-2xl divide-y divide-[#EAF2FC] overflow-hidden shadow-xs">
              {sections.map((sec) => {
                const unansweredCount = getSectionUnansweredCount(sec.id);
                const totalSectionQuestions = questions.filter((q) => q.section === sec.id).length;

                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={async () => {
                      await flushPendingDraft();
                      setCurrentSection(sec.id);
                      setView('section');
                      queueDraftSave(answers, sec.id, { immediate: true, version: draftVersion });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full text-left min-h-[48px] p-4 sm:p-5 flex items-center justify-between hover:bg-[#F4F8FD] transition-colors cursor-pointer group"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#0866C6] uppercase tracking-wider mb-0.5">
                        Section {sec.id}
                      </p>
                      <p className="text-sm sm:text-base font-bold text-[#062B50] group-hover:text-[#0866C6] transition-colors">
                        {sec.title}
                      </p>
                    </div>
                    <div className="text-right pl-3 shrink-0">
                      {unansweredCount === 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#0866C6] bg-[#EBF4FE] px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>All answered</span>
                        </span>
                      ) : (
                        <span className="text-xs sm:text-sm font-medium text-[#5A6E85]">
                          {unansweredCount} of {totalSectionQuestions} left
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
              <button
                type="button"
                onClick={async () => {
                  await flushPendingDraft();
                  setCurrentSection(totalSections);
                  setView('section');
                  queueDraftSave(answers, totalSections, { immediate: true, version: draftVersion });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full sm:w-auto min-h-[46px] px-6 py-2.5 bg-white border border-[#E2EDF8] text-[#062B50] hover:text-[#0866C6] hover:bg-[#F2F7FC] font-bold text-sm sm:text-base rounded-xl cursor-pointer transition-all shadow-xs inline-flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Section {totalSections}</span>
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || isLockedSubmission}
                className="w-full sm:w-auto min-h-[46px] px-8 py-2.5 bg-[#0866C6] hover:bg-[#062B50] text-white font-bold text-sm sm:text-base rounded-xl cursor-pointer transition-all shadow-md shadow-[#0866C6]/20 active:scale-[0.98] disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Confirming with Server...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Questionnaire</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 4. Confirmation Screen (Submitted & Locked)
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#F2F7FC]/80 via-white to-[#F4F8FD] text-[#102C46]">
      {renderHeader()}

      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6">
        <div className="max-w-lg w-full bg-white border border-[#E2EDF8] p-8 sm:p-10 rounded-3xl text-center space-y-5 shadow-lg">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Assessment Completed & Locked</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#062B50] tracking-tight pt-1">
              Your responses have been saved!
            </h1>
            <p className="text-sm sm:text-base text-[#5A6E85] leading-relaxed max-w-sm mx-auto">
              Your self-reflection assessment is permanently recorded in your student profile.
            </p>
          </div>

          {/* Profile details summary card */}
          {(() => {
            const currentStudent = getCurrentStudent();
            const studentName = currentStudent?.fullName || (draftVersion === 1 ? (answers[1] as string) : '') || 'Student';
            const studentAge = currentStudent?.age || (draftVersion === 1 ? (answers[2] as string) : '');
            const studentClass = currentStudent?.classGrade || (draftVersion === 1 ? (answers[3] as string) : '');
            const studentSchool = currentStudent?.schoolName || (draftVersion === 1 ? (answers[4] as string) : '');

            return (
              <div className="bg-[#F8FAFD] border border-[#E8F3FF] p-4 rounded-2xl text-left space-y-1.5 text-xs sm:text-sm">
                <div className="text-xs font-bold uppercase tracking-wider text-[#0866C6] mb-1">
                  Student Profile Verified
                </div>
                <div className="text-[#062B50]">
                  <span className="text-[#64778C]">Name:</span> <strong>{studentName}</strong>
                </div>
                {studentAge && (
                  <div className="text-[#062B50]">
                    <span className="text-[#64778C]">Age:</span> <strong>{studentAge}</strong>
                  </div>
                )}
                {studentClass && (
                  <div className="text-[#062B50]">
                    <span className="text-[#64778C]">Class:</span> <strong>{studentClass}</strong>
                  </div>
                )}
                {studentSchool && (
                  <div className="text-[#062B50]">
                    <span className="text-[#64778C]">School / Institute:</span> <strong>{studentSchool}</strong>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                const currentStudent = getCurrentStudent();
                const studentName = currentStudent?.fullName || (draftVersion === 1 && answers[1] ? String(answers[1]) : 'STUDENT');
                executePrint(`STUDENT REPORT — ${studentName.toUpperCase()}`);
              }}
              className="w-full sm:w-auto min-h-[46px] px-6 py-3 bg-white border border-[#CCE3FC] text-[#062B50] hover:bg-[#F2F7FC] hover:border-[#0866C6] font-bold text-xs sm:text-sm rounded-xl cursor-pointer transition-all shadow-xs inline-flex items-center justify-center gap-2"
              title="Print your reflection report"
            >
              <Printer className="w-4 h-4 text-[#0866C6]" />
              <span>Print Report</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/dashboard')}
              className="w-full sm:w-auto min-h-[46px] px-7 py-3 bg-[#0866C6] hover:bg-[#062B50] text-white font-bold text-sm sm:text-base rounded-xl cursor-pointer transition-all shadow-md shadow-[#0866C6]/20 active:scale-[0.98] inline-flex items-center justify-center gap-2"
            >
              <span>View Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRetake}
              className="w-full sm:w-auto min-h-[46px] px-6 py-3 bg-white border border-[#E2EDF8] text-[#5A6E85] hover:text-[#062B50] hover:bg-[#F2F7FC] font-semibold text-xs sm:text-sm rounded-xl cursor-pointer transition-all inline-flex items-center justify-center gap-1.5"
              title="Reset local testing session (Cloud submissions remain immutable in production)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Demo Retake (Test Mode)</span>
            </button>
          </div>
        </div>
      </main>

      {/* Hidden print report container for completed questionnaire */}
      <div className="hidden print:block w-full bg-white text-black">
        <PrintableReport
          type="individual-student"
          title={`STUDENT REPORT — ${(answers[1] ? String(answers[1]) : 'STUDENT').toUpperCase()}`}
          student={{
            fullName: answers[1] ? String(answers[1]) : 'Student',
            age: answers[2] ? String(answers[2]) : undefined,
            classGrade: answers[3] ? String(answers[3]) : undefined,
            schoolName: answers[4] ? String(answers[4]) : undefined,
            status: 'Submitted',
            submittedAt: new Date().toISOString(),
            answers: answers,
          }}
          date={new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
          isStudentSelfView={true}
        />
      </div>
    </div>
  );
};
