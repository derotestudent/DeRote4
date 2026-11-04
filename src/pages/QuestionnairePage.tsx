import React, { useState, useEffect, useMemo } from 'react';
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

  const totalSections = SECTIONS.length;

  // Initialize draft and check submission status on mount
  useEffect(() => {
    let isMounted = true;

    async function init() {
      // Note: The real one-submission rule will be enforced on the server.
      const submitted = await hasSubmitted();
      if (!isMounted) return;

      if (submitted) {
        setView('confirmation');
        setIsLoaded(true);
        return;
      }

      const draft = await loadDraft();
      if (!isMounted) return;

      if (draft) {
        setAnswers(draft.answers || {});
        if (draft.currentSection >= 1 && draft.currentSection <= totalSections) {
          setCurrentSection(draft.currentSection);
          setView('section');
        } else if (draft.currentSection > totalSections) {
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
    return SECTIONS.find((s) => s.id === currentSection) || SECTIONS[0];
  }, [currentSection]);

  const sectionQuestions = useMemo(() => {
    return QUESTIONS.filter((q) => q.section === currentSection);
  }, [currentSection]);

  const handleTextChange = (questionNumber: number, value: string) => {
    setAnswers((prev) => {
      const updated = { ...prev, [questionNumber]: value };
      saveDraft(updated, currentSection);
      // Auto-sync student profile whenever personal information (Part 1: Q1-Q4) is modified
      if (questionNumber <= 4) {
        syncStudentProfileFromPart1(updated);
      }
      return updated;
    });
  };

  const handleSingleChange = (questionNumber: number, option: string) => {
    setAnswers((prev) => {
      const updated = { ...prev, [questionNumber]: option };
      saveDraft(updated, currentSection);
      // Auto-sync student profile whenever personal information (Part 1: Q1-Q4) is modified
      if (questionNumber <= 4) {
        syncStudentProfileFromPart1(updated);
      }
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
          // If exclusive option ticked, clear all others
          updatedList = [option];
        } else {
          // If standard option ticked, clear any exclusive ones
          updatedList = current.filter((item) => !EXCLUSIVE_OPTIONS.includes(item)).concat(option);
        }
      }

      const updated = { ...prev, [questionNumber]: updatedList };
      saveDraft(updated, currentSection);
      return updated;
    });
  };

  const handleBegin = () => {
    setCurrentSection(1);
    setView('section');
    saveDraft(answers, 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackFromSection = () => {
    if (currentSection <= 1) {
      setCurrentSection(0);
      setView('intro');
      saveDraft(answers, 0);
    } else {
      const prev = currentSection - 1;
      setCurrentSection(prev);
      saveDraft(answers, prev);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextFromSection = () => {
    // If advancing from Section 1 (Part 1), ensure the student profile is synced immediately
    if (currentSection === 1) {
      syncStudentProfileFromPart1(answers);
    }

    if (currentSection >= totalSections) {
      const reviewSectionId = totalSections + 1;
      setCurrentSection(reviewSectionId);
      setView('review');
      saveDraft(answers, reviewSectionId);
    } else {
      const next = currentSection + 1;
      setCurrentSection(next);
      saveDraft(answers, next);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getSectionUnansweredCount = (secId: number): number => {
    const questions = QUESTIONS.filter((q) => q.section === secId);
    return questions.filter((q) => {
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
      await submitQuestionnaire(answers);
      // Guarantee student profile is synced strictly using Part 1 information
      syncStudentProfileFromPart1(answers);
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

  if (!isLoaded || view === 'loading') {
    return (
      <div className="min-h-screen bg-[#F7F5EE] flex items-center justify-center p-4">
        <p className="text-[#202923] text-base font-medium">Loading questionnaire...</p>
      </div>
    );
  }

  // 1. Intro Screen
  if (view === 'intro') {
    return (
      <div className="min-h-screen bg-[#F7F5EE] text-[#202923] py-8 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto bg-white border border-[#E5E2D6] p-6 sm:p-10 rounded-lg">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#245847] uppercase mb-2">
            {INTRO.title}
          </h1>
          <p className="text-sm sm:text-base font-semibold text-[#202923]/70 mb-8">
            {INTRO.subtitle}
          </p>

          <div className="mb-6">
            <h2 className="text-base sm:text-lg font-bold text-[#245847] uppercase mb-3">
              {INTRO.whyHeading}
            </h2>
            <div className="space-y-3 text-sm sm:text-base text-[#202923] leading-relaxed">
              {INTRO.why.map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
            </div>
          </div>

          <div className="mb-8 p-4 bg-[#F7F5EE] border border-[#E5E2D6] rounded">
            <p className="text-xs sm:text-sm text-[#202923] leading-relaxed">
              {INTRO.beforeYouBegin}
            </p>
          </div>

          <button
            type="button"
            onClick={handleBegin}
            className="w-full sm:w-auto min-h-[44px] px-8 py-3 bg-[#245847] hover:bg-[#1b4336] text-white font-semibold text-base rounded cursor-pointer transition-colors"
          >
            Begin
          </button>
        </div>
      </div>
    );
  }

  // 2. Questionnaire Section Screen
  if (view === 'section') {
    const progressPercent = Math.round((currentSection / totalSections) * 100);

    return (
      <div className="min-h-screen bg-[#F7F5EE] text-[#202923] py-8 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Progress Header */}
          <div className="bg-white border border-[#E5E2D6] p-4 sm:p-6 rounded-lg space-y-3">
            <div className="flex items-center justify-between text-sm font-semibold text-[#202923]">
              <span>Section {currentSection} of {totalSections}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full bg-[#E5E2D6] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#245847] h-full transition-all duration-200"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Section Title & Intro */}
          <div className="bg-white border border-[#E5E2D6] p-6 sm:p-8 rounded-lg space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-[#245847] uppercase tracking-wide">
              {sectionData.title}
            </h2>
            {sectionData.intro && (
              <p className="text-sm sm:text-base text-[#202923] leading-relaxed">
                {sectionData.intro}
              </p>
            )}
          </div>

          {/* Questions List */}
          <div className="space-y-6">
            {sectionQuestions.map((q: Question) => {
              const currentVal = answers[q.n];

              return (
                <div
                  key={q.n}
                  className="bg-white border border-[#E5E2D6] p-5 sm:p-6 rounded-lg space-y-4"
                >
                  <p className="text-sm sm:text-base font-semibold text-[#202923] leading-snug">
                    <span className="font-bold text-[#245847] mr-1.5">{q.n}.</span>
                    {q.text}
                  </p>

                  {/* Text Question */}
                  {q.type === 'text' && (
                    <textarea
                      rows={q.lines}
                      value={(currentVal as string) || ''}
                      onChange={(e) => handleTextChange(q.n, e.target.value)}
                      className="w-full p-3 border border-[#E5E2D6] rounded text-sm sm:text-base text-[#202923] focus:outline-none focus:border-[#245847] bg-[#F7F5EE]"
                    />
                  )}

                  {/* Single Choice Question */}
                  {q.type === 'single' && (
                    <div className="flex flex-col gap-2">
                      {q.options.map((opt, oIdx) => (
                        <label
                          key={oIdx}
                          className="flex items-center min-h-[44px] px-3 py-2 border border-[#E5E2D6] rounded cursor-pointer hover:bg-[#F7F5EE] transition-colors"
                        >
                          <input
                            type="radio"
                            name={`q_${q.n}`}
                            checked={currentVal === opt}
                            onChange={() => handleSingleChange(q.n, opt)}
                            className="w-5 h-5 accent-[#245847] shrink-0"
                          />
                          <span className="ml-3 text-sm sm:text-base text-[#202923] leading-snug">
                            {opt}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Multi Choice Question */}
                  {q.type === 'multi' && (
                    <div className="flex flex-col gap-2">
                      {q.options.map((opt, oIdx) => {
                        const selectedList = (currentVal as string[]) || [];
                        const isChecked = selectedList.includes(opt);

                        return (
                          <label
                            key={oIdx}
                            className="flex items-center min-h-[44px] px-3 py-2 border border-[#E5E2D6] rounded cursor-pointer hover:bg-[#F7F5EE] transition-colors"
                          >
                            <input
                              type="checkbox"
                              name={`q_${q.n}_${oIdx}`}
                              checked={isChecked}
                              onChange={() => handleMultiChange(q.n, opt)}
                              className="w-5 h-5 accent-[#245847] shrink-0 rounded"
                            />
                            <span className="ml-3 text-sm sm:text-base text-[#202923] leading-snug">
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

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleBackFromSection}
              className="min-h-[44px] px-6 py-2.5 bg-white border border-[#E5E2D6] text-[#202923] font-semibold text-sm sm:text-base rounded cursor-pointer hover:bg-[#F7F5EE] transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNextFromSection}
              className="min-h-[44px] px-6 py-2.5 bg-[#245847] hover:bg-[#1b4336] text-white font-semibold text-sm sm:text-base rounded cursor-pointer transition-colors"
            >
              {currentSection === totalSections ? 'Review' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Review Screen
  if (view === 'review') {
    return (
      <div className="min-h-screen bg-[#F7F5EE] text-[#202923] py-8 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white border border-[#E5E2D6] p-6 sm:p-8 rounded-lg space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#245847] uppercase">
              Review Your Answers
            </h1>
            <p className="text-sm sm:text-base text-[#202923]">
              You can review or change your answers below. Answering is optional—you may submit at any time.
            </p>
          </div>

          <div className="bg-white border border-[#E5E2D6] rounded-lg divide-y divide-[#E5E2D6] overflow-hidden">
            {SECTIONS.map((sec) => {
              const unansweredCount = getSectionUnansweredCount(sec.id);
              const totalSectionQuestions = QUESTIONS.filter((q) => q.section === sec.id).length;

              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => {
                    setCurrentSection(sec.id);
                    setView('section');
                    saveDraft(answers, sec.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full text-left min-h-[44px] p-4 sm:p-5 flex items-center justify-between hover:bg-[#F7F5EE] transition-colors cursor-pointer"
                >
                  <div>
                    <p className="text-xs font-semibold text-[#245847] uppercase">
                      Section {sec.id}
                    </p>
                    <p className="text-sm sm:text-base font-bold text-[#202923]">
                      {sec.title}
                    </p>
                  </div>
                  <div className="text-right pl-3 shrink-0">
                    {unansweredCount === 0 ? (
                      <span className="text-xs sm:text-sm font-semibold text-[#245847]">
                        All answered
                      </span>
                    ) : (
                      <span className="text-xs sm:text-sm font-medium text-[#202923]/70">
                        {unansweredCount} of {totalSectionQuestions} unanswered
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                setCurrentSection(totalSections);
                setView('section');
                saveDraft(answers, totalSections);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="min-h-[44px] px-6 py-2.5 bg-white border border-[#E5E2D6] text-[#202923] font-semibold text-sm sm:text-base rounded cursor-pointer hover:bg-[#F7F5EE] transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="min-h-[44px] px-8 py-2.5 bg-[#245847] hover:bg-[#1b4336] text-white font-semibold text-sm sm:text-base rounded cursor-pointer transition-colors disabled:opacity-60"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Confirmation Screen
  return (
    <div className="min-h-screen bg-[#F7F5EE] text-[#202923] flex items-center justify-center py-12 px-4 sm:px-6">
      <div className="max-w-md w-full bg-white border border-[#E5E2D6] p-8 sm:p-10 rounded-lg text-center space-y-4">
        <h1 className="text-xl sm:text-2xl font-bold text-[#202923]">
          Your responses have been submitted.
        </h1>
        <p className="text-base sm:text-lg text-[#202923] leading-relaxed">
          You've taken an important step toward understanding yourself.
        </p>
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleRetake}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 bg-[#245847] hover:bg-[#1b4336] text-white font-semibold text-sm sm:text-base rounded cursor-pointer transition-colors"
          >
            Retake Questionnaire
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/dashboard')}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 bg-white border border-[#E5E2D6] text-[#202923] hover:bg-[#F7F5EE] font-semibold text-sm sm:text-base rounded cursor-pointer transition-colors"
          >
            View Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
