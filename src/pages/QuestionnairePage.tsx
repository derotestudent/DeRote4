import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  HelpCircle,
  AlertCircle,
  Save,
  RotateCcw,
  Check,
  Send,
  Loader2,
} from 'lucide-react';
import { DeRoteWordmark } from '../components/DeRoteWordmark';
import { QUESTION_BANK, CUSTOM_OPTION_ID, QuestionItem } from '../data/questionnaireBank';
import {
  getCurrentStudent,
  onLocalAuthChange,
  LocalStudentAccount,
} from '../services/localAuth';
import {
  loadStudentQuestionnaireSession,
  saveStudentDraft,
  submitStudentResponses,
  resetStudentQuestionnaireSession,
  QuestionnaireSession,
  QuestionAnswerState,
} from '../services/questionnaireService';

interface QuestionnairePageProps {
  onNavigate: (route: string) => void;
}

export const QuestionnairePage: React.FC<QuestionnairePageProps> = ({ onNavigate }) => {
  const [student, setStudent] = useState<LocalStudentAccount | null>(() => getCurrentStudent());
  const [session, setSession] = useState<QuestionnaireSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'offline_unsynced'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('Just now');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [customText, setCustomText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onLocalAuthChange((curr) => {
      setStudent(curr);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (student) {
      loadStudentQuestionnaireSession(student).then(({ session: loadedSession, isAlreadySubmitted }) => {
        setSession(loadedSession);
        setCurrentIndex(loadedSession.currentQuestionIndex || 0);
        if (isAlreadySubmitted) {
          setIsSubmitted(true);
        }
      });
    }
  }, [student]);

  const currentQuestion: QuestionItem = useMemo(() => {
    return QUESTION_BANK[currentIndex] || QUESTION_BANK[0];
  }, [currentIndex]);

  const currentAnswer: QuestionAnswerState = useMemo(() => {
    if (!session || !session.answers[currentQuestion.id]) {
      return { status: 'unanswered', selectedOptions: [], customText: '' };
    }
    return session.answers[currentQuestion.id];
  }, [session, currentQuestion.id]);

  useEffect(() => {
    if (currentAnswer.customText) {
      setCustomText(currentAnswer.customText);
    } else {
      setCustomText('');
    }
  }, [currentQuestion.id, currentAnswer.customText]);

  const persistSession = async (updated: QuestionnaireSession) => {
    setIsSaving(true);
    setSaveStatus('saving');
    const res = await saveStudentDraft(updated);
    setIsSaving(false);
    if (res.confirmedCloudSaved) {
      setSaveStatus('saved');
      setLastSavedTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    } else {
      setSaveStatus('offline_unsynced');
    }
  };

  const handleOptionToggle = (optionId: string) => {
    if (!session || isSubmitted) return;
    setErrorMessage(null);

    const question = currentQuestion;
    const currentSelections = [...currentAnswer.selectedOptions];
    const targetOption = question.options.find((o) => o.id === optionId);
    const isExclusive = targetOption?.isExclusive;

    let nextSelections: string[] = [];

    if (isExclusive) {
      // If selecting an exclusive option, it replaces all other selections
      if (currentSelections.includes(optionId)) {
        nextSelections = [];
      } else {
        nextSelections = [optionId];
      }
    } else {
      // Non-exclusive: remove any exclusive selection first
      const nonExclusiveExisting = currentSelections.filter(
        (id) => !question.options.find((o) => o.id === id)?.isExclusive
      );

      if (question.type === 'single') {
        nextSelections = [optionId];
      } else {
        // Multi
        const max = question.maxSelections || 3;
        if (nonExclusiveExisting.includes(optionId)) {
          nextSelections = nonExclusiveExisting.filter((id) => id !== optionId);
        } else {
          if (nonExclusiveExisting.length >= max) {
            setErrorMessage(`You can choose up to ${max} options for this question.`);
            return;
          }
          nextSelections = [...nonExclusiveExisting, optionId];
        }
      }
    }

    const nextStatus: 'answered' | 'unanswered' = nextSelections.length > 0 ? 'answered' : 'unanswered';
    const updatedAnswers = {
      ...session.answers,
      [question.id]: {
        status: nextStatus,
        selectedOptions: nextSelections,
        customText: nextSelections.includes(CUSTOM_OPTION_ID) ? customText : '',
      },
    };

    const nextSession: QuestionnaireSession = {
      ...session,
      answers: updatedAnswers,
      currentQuestionIndex: currentIndex,
    };

    setSession(nextSession);
    persistSession(nextSession);
  };

  const handleCustomTextChange = (text: string) => {
    setCustomText(text);
    if (!session || isSubmitted) return;

    const question = currentQuestion;
    const isCustomSelected = currentAnswer.selectedOptions.includes(CUSTOM_OPTION_ID);
    if (!isCustomSelected) return;

    const updatedAnswers = {
      ...session.answers,
      [question.id]: {
        ...currentAnswer,
        customText: text,
      },
    };

    const nextSession: QuestionnaireSession = {
      ...session,
      answers: updatedAnswers,
    };

    setSession(nextSession);
    persistSession(nextSession);
  };

  const handleSkip = () => {
    if (!session || isSubmitted) return;
    const question = currentQuestion;

    const updatedAnswers = {
      ...session.answers,
      [question.id]: {
        status: 'skipped' as const,
        selectedOptions: [],
        customText: '',
      },
    };

    const nextIndex = Math.min(currentIndex + 1, QUESTION_BANK.length - 1);
    const nextSession: QuestionnaireSession = {
      ...session,
      answers: updatedAnswers,
      currentQuestionIndex: nextIndex,
    };

    setSession(nextSession);
    setCurrentIndex(nextIndex);
    persistSession(nextSession);
  };

  const handleNext = () => {
    if (currentIndex < QUESTION_BANK.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      if (session) {
        const nextSession = { ...session, currentQuestionIndex: nextIndex };
        setSession(nextSession);
        persistSession(nextSession);
      }
    } else {
      setShowSubmitModal(true);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      if (session) {
        const nextSession = { ...session, currentQuestionIndex: prevIndex };
        setSession(nextSession);
        persistSession(nextSession);
      }
    }
  };

  const handleSubmit = async () => {
    if (!session) return;
    setSubmitting(true);
    setErrorMessage(null);

    const result = await submitStudentResponses(session);
    setSubmitting(false);

    if (result.success) {
      setIsSubmitted(true);
      setShowSubmitModal(false);
    } else {
      setErrorMessage(result.error || 'Failed to submit responses. Please retry.');
    }
  };

  const handleRetake = async () => {
    if (!student) return;
    const fresh = await resetStudentQuestionnaireSession(student);
    setSession(fresh);
    setCurrentIndex(0);
    setIsSubmitted(false);
  };

  const totalAnswered = useMemo(() => {
    if (!session) return 0;
    return Object.values(session.answers).filter((a) => a.status === 'answered').length;
  }, [session]);

  const progressPercent = Math.round(((currentIndex + 1) / QUESTION_BANK.length) * 100);

  if (isSubmitted) {
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
              onClick={() => onNavigate('/dashboard')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0866C6] text-white font-bold text-xs sm:text-sm hover:bg-[#062B50] transition-colors"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="max-w-lg w-full bg-white rounded-3xl p-6 sm:p-10 border border-[#E8F3FF] shadow-xl text-center">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-xs border border-emerald-100">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <span className="text-xs font-bold text-[#0866C6] uppercase tracking-wider bg-[#E8F3FF] px-3 py-1 rounded-full inline-block mb-3">
              Reflection Completed
            </span>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#062B50] tracking-tight mb-3">
              Thank you for sharing your thoughts!
            </h1>

            <p className="text-sm text-[#5A6E85] leading-relaxed mb-8">
              Your 14 reflection responses have been safely saved to your private DeRote profile. You can
              review your personalized narrative, habits, and self-chosen learning directions anytime on your dashboard.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => onNavigate('/dashboard')}
                className="flex-1 py-3 px-5 rounded-2xl bg-[#0866C6] hover:bg-[#062B50] text-white font-bold text-sm transition-all shadow-md shadow-[#0866C6]/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>View Student Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleRetake}
                className="py-3 px-4 rounded-2xl bg-white border border-[#D5E4F3] text-[#062B50] hover:bg-[#F2F7FC] font-bold text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake Assessment</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F8FD] flex flex-col justify-between text-[#102C46]">
      {/* Questionnaire Sticky Header */}
      <header className="bg-white border-b border-[#E8F3FF] px-4 sm:px-8 py-3 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => onNavigate('/')}
            className="flex items-center text-left focus-visible:outline-2 focus-visible:outline-[#0866C6] rounded-lg cursor-pointer"
          >
            <DeRoteWordmark showDescriptor={false} size="sm" />
          </button>

          {/* Progress Indicator */}
          <div className="flex-1 max-w-xs mx-4 hidden sm:block">
            <div className="flex items-center justify-between text-xs text-[#64778C] mb-1 font-semibold">
              <span>Question {currentIndex + 1} of {QUESTION_BANK.length}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-[#E8F3FF] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0866C6] transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Cloud Auto-Save Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-[#64778C]">
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0866C6]" />
                  <span className="hidden sm:inline">Saving...</span>
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Saved {lastSavedTime}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline">Offline</span>
                </>
              )}
            </div>

            <button
              onClick={() => onNavigate(student ? '/dashboard' : '/')}
              className="text-xs font-bold text-[#64778C] hover:text-[#062B50] px-2 py-1 rounded cursor-pointer"
            >
              Exit
            </button>
          </div>
        </div>
      </header>

      {/* Main Question Flow */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs sm:text-sm text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Question Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#E8F3FF] shadow-md">
          {/* Question Tag & Number */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#0866C6] bg-[#E8F3FF] px-3 py-1 rounded-full">
              Question {currentQuestion.number} of {QUESTION_BANK.length}
            </span>

            <span className="text-xs text-[#64778C] font-semibold">
              {currentQuestion.type === 'single'
                ? 'Choose 1 option'
                : `Choose up to ${currentQuestion.maxSelections || 3} options`}
            </span>
          </div>

          {/* Title & Prompt */}
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#062B50] tracking-tight mb-3">
            {currentQuestion.title}
          </h2>
          <p className="text-sm sm:text-base text-[#5A6E85] leading-relaxed mb-6 font-normal">
            {currentQuestion.prompt}
          </p>

          {/* Options List */}
          <div className="space-y-3">
            {currentQuestion.options.map((option) => {
              const isSelected = currentAnswer.selectedOptions.includes(option.id);
              return (
                <div key={option.id}>
                  <button
                    type="button"
                    onClick={() => handleOptionToggle(option.id)}
                    className={`w-full text-left p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                      isSelected
                        ? 'bg-[#EBF4FE] border-[#0866C6] text-[#062B50] shadow-xs'
                        : 'bg-white border-[#E2EDF8] text-[#102C46] hover:border-[#0866C6]/40 hover:bg-[#F8FAFD]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-${
                        currentQuestion.type === 'single' ? 'full' : 'md'
                      } border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isSelected
                          ? 'border-[#0866C6] bg-[#0866C6] text-white'
                          : 'border-[#CBD5E1] bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <span className="text-sm sm:text-[15px] font-medium leading-relaxed flex-1">
                      {option.text}
                    </span>
                  </button>

                  {/* Custom write-in box when selected */}
                  {option.isCustom && isSelected && (
                    <div className="mt-2.5 ml-8 pr-2">
                      <input
                        type="text"
                        value={customText}
                        onChange={(e) => handleCustomTextChange(e.target.value)}
                        placeholder="Type your own answer in your words..."
                        className="w-full text-sm px-4 py-2.5 rounded-xl border border-[#0866C6] focus:ring-2 focus:ring-[#0866C6]/20 outline-none text-[#102C46]"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Navigation Bar */}
          <div className="mt-8 pt-6 border-t border-[#E8F3FF] flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="px-4 py-2.5 rounded-xl border border-[#D5E4F3] text-xs sm:text-sm font-bold text-[#062B50] hover:bg-[#F2F7FC] disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSkip}
                className="px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#64778C] hover:text-[#062B50] transition-colors cursor-pointer"
              >
                Skip question
              </button>

              {currentIndex === QUESTION_BANK.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(true)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
                >
                  <span>Review &amp; Submit</span>
                  <Send className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2.5 rounded-xl bg-[#0866C6] hover:bg-[#062B50] text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-[#0866C6]/25 flex items-center gap-2 cursor-pointer"
                >
                  <span>Next Question</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Reassurance Note */}
        <p className="mt-6 text-center text-xs text-[#64778C] leading-relaxed">
          Take your time. No right or wrong choices—just what feels true for you today.
        </p>
      </main>

      {/* Confirmation Submit Modal */}
      {showSubmitModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#062B50]/40 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#E8F3FF] shadow-2xl text-left">
            <h3 className="text-xl font-bold text-[#062B50] mb-2 tracking-tight">
              Ready to submit your reflections?
            </h3>
            <p className="text-xs sm:text-sm text-[#5A6E85] mb-5 leading-relaxed">
              You answered <strong>{totalAnswered} of {QUESTION_BANK.length}</strong> questions.
              Once submitted, your personal reflection summary will be prepared and viewable on your dashboard.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8F3FF]">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 text-xs font-semibold text-[#64778C] hover:text-[#062B50] cursor-pointer"
              >
                Back to questions
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-[#0866C6] hover:bg-[#062B50] text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Confirm &amp; Finish</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
