import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  FileCheck,
  RotateCcw,
  Sparkles,
  Loader2,
  Home,
} from 'lucide-react';
import {
  INTRO,
  SECTIONS,
  QUESTIONS,
  EXCLUSIVE_OPTIONS,
  Question,
  ChoiceQuestion,
  TextQuestion,
} from '../data/questionnaire';
import {
  loadDraft,
  saveDraft,
  submitQuestionnaire,
  hasSubmitted,
  resetSubmission,
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
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [sections, setSections] = useState(SECTIONS);
  const [questions, setQuestions] = useState(QUESTIONS);

  const totalSections = sections.length; // sections from backend or fallback default

  // Initialize draft and check submission status on mount
  useEffect(() => {
    let isMounted = true;

    async function init() {
      const submitted = await hasSubmitted();
      if (!isMounted) return;

      if (submitted) {
        setView('confirmation');
        setIsLoaded(true);
        return;
      }

      // Load questions from Firestore backend if available, or auto-seed
      try {
        const cloudQ = await getQuestionnaireFromBackend();
        if (cloudQ && cloudQ.questions && cloudQ.questions.length > 0) {
          if (isMounted) {
            setSections(cloudQ.sections);
            setQuestions(cloudQ.questions);
          }
        } else {
          // Initialize/seed questions in Firestore backend
          seedQuestionnaireToBackend(false).catch(() => {});
        }
      } catch (err) {
        console.warn('Backend questionnaire load fallback to local:', err);
      }

      const draft = await loadDraft();
      if (!isMounted) return;

      if (draft) {
        setAnswers(draft.answers || {});

        // If About Me Part 1 responses already exist, ensure the student profile is synced
        if (draft.answers && (draft.answers[1] || draft.answers[2] || draft.answers[3] || draft.answers[4])) {
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
      isMounted = false;
    };
  }, [totalSections]);

  const sectionData = useMemo(() => {
    return sections.find((s) => s.id === currentSection) || sections[0];
  }, [sections, currentSection]);

  const sectionQuestions = useMemo(() => {
    return questions.filter((q) => q.section === currentSection);
  }, [questions, currentSection]);

  const updateDraft = (updated: StudentAnswers, sec: number) => {
    saveDraft(updated, sec);
    setLastSaved('Draft auto-saved');
  };

  const handleTextChange = (questionNumber: number, value: string) => {
    setAnswers((prev) => {
      const updated = { ...prev, [questionNumber]: value };
      updateDraft(updated, currentSection);
      return updated;
    });
  };

  const handleSingleChange = (questionNumber: number, option: string) => {
    setAnswers((prev) => {
      const updated = { ...prev, [questionNumber]: option };
      updateDraft(updated, currentSection);
      return updated;
    });
  };

  const handleMultiChange = (questionNumber: number, option: string) => {
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
      updateDraft(updated, currentSection);
      return updated;
    });
  };

  const handleBegin = () => {
    setCurrentSection(1);
    setView('section');
    updateDraft(answers, 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackFromSection = () => {
    if (currentSection <= 1) {
      setCurrentSection(0);
      setView('intro');
      updateDraft(answers, 0);
    } else {
      const prev = currentSection - 1;
      setCurrentSection(prev);
      updateDraft(answers, prev);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextFromSection = () => {
    // When departing About Me Part 1, strictly use Part 1 information to build/update student profile & dashboard
    if (currentSection === 1) {
      syncStudentProfileFromPart1(answers);
    }

    if (currentSection >= totalSections) {
      const reviewSectionId = totalSections + 1;
      setCurrentSection(reviewSectionId);
      setView('review');
      updateDraft(answers, reviewSectionId);
    } else {
      const next = currentSection + 1;
      setCurrentSection(next);
      updateDraft(answers, next);
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

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      // Ensure student profile is up to date using strictly About Me Part 1 information
      syncStudentProfileFromPart1(answers);
      await submitQuestionnaire(answers);
      setView('confirmation');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Submission failed', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetake = async () => {
    await resetSubmission();
    const currStudent = getCurrentStudent();
    if (currStudent) {
      await resetStudentQuestionnaireSession(currStudent);
    }
    setAnswers({});
    setCurrentSection(1);
    setView('section');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

        <div className="flex items-center gap-3">
          {lastSaved && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-[#5A6E85]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0866C6] animate-pulse" />
              {lastSaved}
            </span>
          )}
          <button
            type="button"
            onClick={() => onNavigate('/dashboard')}
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
        <p className="text-xs text-[#5A6E85] mt-1">Checking saved responses</p>
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
            {/* Header with DeRote accent mark */}
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

            {/* Reassurance Callout Box */}
            <div className="mb-8 p-4 sm:p-5 bg-[#EBF4FE] border-l-4 border-[#0866C6] rounded-r-2xl">
              <p className="text-xs sm:text-sm text-[#062B50] leading-relaxed font-semibold">
                {INTRO.beforeYouBegin}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-[#E8F3FF]">
              <button
                type="button"
                onClick={handleBegin}
                className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 bg-[#0866C6] hover:bg-[#062B50] text-white font-bold text-sm sm:text-base rounded-2xl cursor-pointer transition-all shadow-md shadow-[#0866C6]/20 active:scale-[0.98] inline-flex items-center justify-center gap-2"
              >
                <span>Begin Questionnaire</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('/')}
                className="text-xs sm:text-sm font-semibold text-[#5A6E85] hover:text-[#062B50] transition-colors py-2 px-3"
              >
                Return to home page
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 2. Questionnaire Section Screen
  if (view === 'section') {
    const progressPercent = Math.round((currentSection / totalSections) * 100);

    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#F2F7FC]/80 via-white to-[#F4F8FD] text-[#102C46]">
        {renderHeader()}

        <main className="flex-1 py-6 sm:py-10 px-4 sm:px-6">
          <div className="max-w-2xl mx-auto space-y-5">
            {/* Progress Header Card */}
            <div className="bg-white border border-[#E2EDF8] p-4 sm:p-5 rounded-2xl shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-[#062B50]">
                <div className="flex items-center gap-2">
                  <span className="text-[#5A6E85]">Progress</span>
                  <span className="w-1 h-1 rounded-full bg-[#5A6E85]" />
                  <span>Section {currentSection} of {totalSections}</span>
                </div>
                <span className="bg-[#EBF4FE] text-[#0866C6] px-2.5 py-0.5 rounded-full text-xs font-bold">
                  {progressPercent}%
                </span>
              </div>
              <div className="w-full bg-[#E8F3FF] h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#0866C6] h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Section Title & Intro Card */}
            <div className="bg-white border border-[#E2EDF8] p-5 sm:p-7 rounded-2xl shadow-xs space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0866C6] uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0866C6]" />
                <span>Section {currentSection}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#062B50] tracking-tight">
                {sectionData.title}
              </h2>
              {sectionData.intro && (
                <p className="text-sm sm:text-[15px] text-[#5A6E85] leading-relaxed pt-1">
                  {sectionData.intro}
                </p>
              )}
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {sectionQuestions.map((q: Question) => {
                const currentVal = answers[q.n];

                return (
                  <div
                    key={q.n}
                    className="bg-white border border-[#E2EDF8] p-5 sm:p-6 rounded-2xl shadow-xs space-y-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#EBF4FE] text-[#0866C6] font-bold text-xs shrink-0 mt-0.5">
                        {q.n}
                      </span>
                      <p className="text-sm sm:text-base font-bold text-[#062B50] leading-snug">
                        {q.text}
                      </p>
                    </div>

                    {/* Text Question */}
                    {q.type === 'text' && (
                      <div className="pt-1">
                        <textarea
                          rows={q.lines || 3}
                          value={(currentVal as string) || ''}
                          onChange={(e) => handleTextChange(q.n, e.target.value)}
                          placeholder="Type your answer here (optional)..."
                          className="w-full p-3.5 border border-[#E2EDF8] rounded-xl text-sm sm:text-base text-[#102C46] placeholder-[#8EA3B8] focus:outline-none focus:border-[#0866C6] focus:ring-2 focus:ring-[#0866C6]/15 bg-[#F8FAFD] focus:bg-white transition-all"
                        />
                      </div>
                    )}

                    {/* Single Choice Question */}
                    {q.type === 'single' && (
                      <div className="flex flex-col gap-2 pt-1">
                        {q.options.map((opt, oIdx) => {
                          const isSelected = currentVal === opt;
                          return (
                            <label
                              key={oIdx}
                              className={`flex items-center min-h-[44px] px-3.5 py-2.5 rounded-xl border cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-[#F0F6FD] border-[#0866C6] text-[#062B50] font-medium shadow-xs'
                                  : 'bg-white border-[#E2EDF8] text-[#102C46] hover:bg-[#F4F8FD] hover:border-[#0866C6]/30'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q_${q.n}`}
                                checked={isSelected}
                                onChange={() => handleSingleChange(q.n, opt)}
                                className="w-4 h-4 accent-[#0866C6] shrink-0"
                              />
                              <span className="ml-3 text-sm sm:text-base leading-snug">
                                {opt}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* Multi Choice Question */}
                    {q.type === 'multi' && (
                      <div className="flex flex-col gap-2 pt-1">
                        {q.options.map((opt, oIdx) => {
                          const selectedList = (currentVal as string[]) || [];
                          const isChecked = selectedList.includes(opt);

                          return (
                            <label
                              key={oIdx}
                              className={`flex items-center min-h-[44px] px-3.5 py-2.5 rounded-xl border cursor-pointer transition-all ${
                                isChecked
                                  ? 'bg-[#F0F6FD] border-[#0866C6] text-[#062B50] font-medium shadow-xs'
                                  : 'bg-white border-[#E2EDF8] text-[#102C46] hover:bg-[#F4F8FD] hover:border-[#0866C6]/30'
                              }`}
                            >
                              <input
                                type="checkbox"
                                name={`q_${q.n}_${oIdx}`}
                                checked={isChecked}
                                onChange={() => handleMultiChange(q.n, opt)}
                                className="w-4 h-4 accent-[#0866C6] shrink-0 rounded"
                              />
                              <span className="ml-3 text-sm sm:text-base leading-snug">
                                {opt}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Navigation Buttons Card */}
            <div className="flex items-center justify-between pt-3">
              <button
                type="button"
                onClick={handleBackFromSection}
                className="min-h-[46px] px-6 py-2.5 bg-white border border-[#E2EDF8] text-[#062B50] hover:text-[#0866C6] hover:border-[#0866C6]/30 hover:bg-[#F2F7FC] font-bold text-sm sm:text-base rounded-xl cursor-pointer transition-all shadow-xs inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleNextFromSection}
                className="min-h-[46px] px-7 py-2.5 bg-[#0866C6] hover:bg-[#062B50] text-white font-bold text-sm sm:text-base rounded-xl cursor-pointer transition-all shadow-md shadow-[#0866C6]/20 active:scale-[0.98] inline-flex items-center gap-2"
              >
                <span>{currentSection === totalSections ? 'Review Answers' : 'Next Section'}</span>
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
            <div className="bg-white border border-[#E2EDF8] p-6 sm:p-8 rounded-3xl shadow-sm space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0866C6] uppercase tracking-wider">
                <FileCheck className="w-4 h-4 text-[#0866C6]" />
                <span>Ready for Submission</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#062B50] tracking-tight">
                Review Your Answers
              </h1>
              <p className="text-sm sm:text-base text-[#5A6E85] leading-relaxed">
                You can review or change your answers below. Every question is reflective and optional—you may submit whenever you feel ready.
              </p>
            </div>

            {/* Sections List */}
            <div className="bg-white border border-[#E2EDF8] rounded-2xl divide-y divide-[#EAF2FC] overflow-hidden shadow-xs">
              {sections.map((sec) => {
                const unansweredCount = getSectionUnansweredCount(sec.id);
                const totalSectionQuestions = questions.filter((q) => q.section === sec.id).length;

                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => {
                      setCurrentSection(sec.id);
                      setView('section');
                      updateDraft(answers, sec.id);
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

            <div className="flex items-center justify-between pt-3">
              <button
                type="button"
                onClick={() => {
                  setCurrentSection(totalSections);
                  setView('section');
                  updateDraft(answers, totalSections);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="min-h-[46px] px-6 py-2.5 bg-white border border-[#E2EDF8] text-[#062B50] hover:text-[#0866C6] hover:bg-[#F2F7FC] font-bold text-sm sm:text-base rounded-xl cursor-pointer transition-all shadow-xs inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Section {totalSections}</span>
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="min-h-[46px] px-8 py-2.5 bg-[#0866C6] hover:bg-[#062B50] text-white font-bold text-sm sm:text-base rounded-xl cursor-pointer transition-all shadow-md shadow-[#0866C6]/20 active:scale-[0.98] disabled:opacity-60 inline-flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
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

  // 4. Confirmation Screen
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#F2F7FC]/80 via-white to-[#F4F8FD] text-[#102C46]">
      {renderHeader()}

      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6">
        <div className="max-w-lg w-full bg-white border border-[#E2EDF8] p-8 sm:p-10 rounded-3xl text-center space-y-5 shadow-lg">
          <div className="w-16 h-16 rounded-3xl bg-[#EBF4FE] border border-[#E2EDF8] flex items-center justify-center mx-auto text-[#0866C6] shadow-xs">
            <CheckCircle2 className="w-8 h-8 text-[#0866C6]" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#062B50] tracking-tight">
              Your responses have been saved!
            </h1>
            <p className="text-sm sm:text-base text-[#5A6E85] leading-relaxed max-w-sm mx-auto">
              Your student profile has been created with your personal details from About Me (Part 1).
            </p>
          </div>

          {/* Profile details summary card */}
          {answers[1] || answers[3] || answers[4] ? (
            <div className="bg-[#F8FAFD] border border-[#E8F3FF] p-4 rounded-2xl text-left space-y-1.5 text-xs sm:text-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-[#0866C6] mb-1">
                Student Profile Created (From Part 1)
              </div>
              <div className="text-[#062B50]">
                <span className="text-[#64778C]">Name:</span> <strong>{answers[1] || 'Student'}</strong>
              </div>
              {answers[2] && (
                <div className="text-[#062B50]">
                  <span className="text-[#64778C]">Age:</span> <strong>{answers[2]}</strong>
                </div>
              )}
              {answers[3] && (
                <div className="text-[#062B50]">
                  <span className="text-[#64778C]">Class:</span> <strong>{answers[3]}</strong>
                </div>
              )}
              {answers[4] && (
                <div className="text-[#062B50]">
                  <span className="text-[#64778C]">School / Institute:</span> <strong>{answers[4]}</strong>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#F4F8FD] border border-[#E8F3FF] p-4 rounded-2xl text-xs sm:text-sm text-[#062B50] font-medium">
              Your responses are purely reflective and help you understand your unique paths without grades or ranking.
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
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
              className="w-full sm:w-auto min-h-[46px] px-6 py-3 bg-white border border-[#E2EDF8] text-[#062B50] hover:text-[#0866C6] hover:bg-[#F2F7FC] font-bold text-sm sm:text-base rounded-xl cursor-pointer transition-all inline-flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retake Questionnaire</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
