import React from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Edit3,
  CheckCircle2,
  Clock,
  AlertCircle,
  School,
  User,
  BookOpen,
  Calendar,
  RefreshCw,
  Mail,
  Printer,
} from 'lucide-react';
import { SECTIONS, QUESTIONS, type Question, resolveQuestionAnswer } from '../../data/questionnaire';
import {
  type AdminStudentRecord,
  formatClassDisplay,
} from '../../services/studentAdminService';

export type AdminStudentDetailRecord = AdminStudentRecord & {
  version?: number;
};

interface AdminStudentDetailProps {
  selectedStudent: AdminStudentDetailRecord;
  currentFilteredIndex: number;
  totalFilteredCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  isLoadingAnswers: boolean;
  answersError: string | null;
  statusError?: string;
  isRetryingStatus: boolean;
  onBackToList: () => void;
  onPreviousStudent: () => void;
  onNextStudent: () => void;
  onPrintReport: () => void;
  onOpenEditModal: () => void;
  onRetryStatus: (studentId: string, e?: React.MouseEvent) => void;
  onRetryAnswers: () => void;
}

const isAnswerProvided = (answer: string | string[] | undefined): boolean => {
  if (answer === undefined || answer === null) return false;
  if (typeof answer === 'string') return answer.trim().length > 0;
  if (Array.isArray(answer)) return answer.length > 0;
  return false;
};

const formatShortDate = (isoString?: string): string => {
  if (!isoString) return '—';
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const AdminStudentDetail: React.FC<AdminStudentDetailProps> = ({
  selectedStudent,
  currentFilteredIndex,
  totalFilteredCount,
  hasPrevious,
  hasNext,
  isLoadingAnswers,
  answersError,
  statusError,
  isRetryingStatus,
  onBackToList,
  onPreviousStudent,
  onNextStudent,
  onPrintReport,
  onOpenEditModal,
  onRetryStatus,
  onRetryAnswers,
}) => {
  const showEmptyResponses =
    !isLoadingAnswers &&
    !answersError &&
    (selectedStudent.status === 'Not Started' || selectedStudent.answeredCount === 0);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Compact Student Navigation Strip */}
      <nav
        aria-label="Student record navigation"
        className="flex items-center justify-between gap-3 flex-wrap"
      >
        <button
          type="button"
          onClick={onBackToList}
          className="inline-flex items-center gap-1.5 py-1.5 pr-2 rounded-lg text-xs sm:text-sm font-semibold text-[#5A6E85] hover:text-[#0866C6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0866C6] transition-colors cursor-pointer whitespace-nowrap"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Back to Student List</span>
        </button>

        <div className="flex items-center gap-1.5">
          {currentFilteredIndex >= 0 && totalFilteredCount > 0 && (
            <span className="text-xs font-medium text-[#5A6E85] tabular-nums mr-1.5">
              {currentFilteredIndex + 1} of {totalFilteredCount}
            </span>
          )}

          <button
            type="button"
            onClick={onPreviousStudent}
            disabled={!hasPrevious}
            aria-label="Previous student"
            title="Previous Student"
            className="w-8 h-8 rounded-lg border border-[#D5E4F3] bg-white text-[#062B50] hover:bg-[#F2F7FC] hover:border-[#0866C6] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0866C6] transition-colors cursor-pointer inline-flex items-center justify-center shrink-0"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onNextStudent}
            disabled={!hasNext}
            aria-label="Next student"
            title="Next Student"
            className="w-8 h-8 rounded-lg border border-[#D5E4F3] bg-white text-[#062B50] hover:bg-[#F2F7FC] hover:border-[#0866C6] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0866C6] transition-colors cursor-pointer inline-flex items-center justify-center shrink-0"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </nav>

      {/* Unified Student Identity, Profile & Status Surface */}
      <section
        aria-label="Student record summary"
        className="bg-white rounded-2xl border border-[#E2EDF8] p-4 sm:p-6"
      >
        {/* Student Identity Header + Compact Actions */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#EEF4FB]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-extrabold text-[#062B50] tracking-tight leading-snug break-words">
                {selectedStudent.fullName}
              </h1>

              {selectedStudent.status === 'Submitted' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] font-bold whitespace-nowrap">
                  <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span>Submitted</span>
                </span>
              )}
              {selectedStudent.status === 'In Progress' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 text-[11px] font-bold whitespace-nowrap">
                  <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span>In Progress</span>
                </span>
              )}
              {selectedStudent.status === 'Not Started' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80 text-[11px] font-bold whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" aria-hidden="true" />
                  <span>Not Started</span>
                </span>
              )}
              {selectedStudent.status === 'Unable to Load' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200/80 text-[11px] font-bold whitespace-nowrap">
                  <AlertCircle className="w-3 h-3 text-red-600 shrink-0" aria-hidden="true" />
                  <span>Unable to Load</span>
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-[#5A6E85] mt-1 break-all">
              {selectedStudent.email
                ? selectedStudent.email
                : `Student Record ID: ${selectedStudent.id}`}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onPrintReport}
              aria-label="Print Report"
              title="Print Report"
              className="w-9 h-9 rounded-lg border border-[#D5E4F3] bg-white text-[#0866C6] hover:bg-[#F2F7FC] hover:border-[#0866C6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0866C6] inline-flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onOpenEditModal}
              aria-label="Edit Details"
              title="Edit Details"
              className="h-9 px-2.5 sm:px-3 rounded-lg border border-[#D5E4F3] bg-white text-[#062B50] hover:text-[#0866C6] hover:bg-[#F2F7FC] hover:border-[#0866C6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0866C6] inline-flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#0866C6] shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Edit Details</span>
            </button>
          </div>
        </div>

        {/* Compact Profile Information Grid */}
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3.5 py-4">
          <div className="min-w-0">
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-[#5A6E85]">
              <User className="w-3.5 h-3.5 text-[#0866C6]/80 shrink-0" aria-hidden="true" />
              <span>Full Name</span>
            </dt>
            <dd className="text-xs sm:text-sm font-semibold text-[#062B50] mt-0.5 leading-snug break-words">
              {selectedStudent.fullName}
            </dd>
          </div>

          <div className="min-w-0">
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-[#5A6E85]">
              <Mail className="w-3.5 h-3.5 text-[#0866C6]/80 shrink-0" aria-hidden="true" />
              <span>Email</span>
            </dt>
            <dd className="text-xs sm:text-sm font-semibold text-[#062B50] mt-0.5 leading-snug break-all">
              {selectedStudent.email || '—'}
            </dd>
          </div>

          <div className="min-w-0">
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-[#5A6E85]">
              <Clock className="w-3.5 h-3.5 text-[#0866C6]/80 shrink-0" aria-hidden="true" />
              <span>Age</span>
            </dt>
            <dd className="text-xs sm:text-sm font-semibold text-[#062B50] mt-0.5 leading-snug tabular-nums">
              {selectedStudent.age ? `${selectedStudent.age} years` : '—'}
            </dd>
          </div>

          <div className="min-w-0">
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-[#5A6E85]">
              <BookOpen className="w-3.5 h-3.5 text-[#0866C6]/80 shrink-0" aria-hidden="true" />
              <span>Class / Grade</span>
            </dt>
            <dd className="text-xs sm:text-sm font-semibold text-[#062B50] mt-0.5 leading-snug">
              {formatClassDisplay(selectedStudent.classGrade)}
            </dd>
          </div>

          <div className="col-span-2 min-w-0">
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-[#5A6E85]">
              <School className="w-3.5 h-3.5 text-[#0866C6]/80 shrink-0" aria-hidden="true" />
              <span>Institution / School</span>
            </dt>
            <dd className="text-xs sm:text-sm font-semibold text-[#062B50] mt-0.5 leading-snug break-words">
              {selectedStudent.schoolName || '—'}
            </dd>
          </div>

          <div className="min-w-0">
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-[#5A6E85]">
              <Calendar className="w-3.5 h-3.5 text-[#0866C6]/80 shrink-0" aria-hidden="true" />
              <span>Registration Date</span>
            </dt>
            <dd className="text-xs sm:text-sm font-semibold text-[#062B50] mt-0.5 leading-snug tabular-nums">
              {formatShortDate(selectedStudent.createdAt)}
            </dd>
          </div>

          <div className="min-w-0">
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-[#5A6E85]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0866C6]/80 shrink-0" aria-hidden="true" />
              <span>Submission Date</span>
            </dt>
            <dd className="text-xs sm:text-sm font-semibold text-[#062B50] mt-0.5 leading-snug tabular-nums">
              {selectedStudent.submittedAt
                ? formatShortDate(selectedStudent.submittedAt)
                : selectedStudent.status === 'Submitted'
                ? 'Submitted'
                : selectedStudent.status === 'Unable to Load'
                ? 'Lookup Failed'
                : 'Not submitted yet'}
            </dd>
          </div>
        </dl>

        {/* Compact Questionnaire Status Strip */}
        <div className="pt-3.5 border-t border-[#EEF4FB]">
          {selectedStudent.status === 'Submitted' && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5A6E85]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                <span className="font-bold uppercase tracking-wider text-emerald-700 text-[11px]">
                  Submitted
                </span>
                <span className="text-[#102C46]">
                  {selectedStudent.submittedAt
                    ? `Completed on ${formatShortDate(selectedStudent.submittedAt)}.`
                    : 'Questionnaire submitted.'}
                </span>
              </div>
              <span className="font-semibold text-[#062B50] tabular-nums">
                {selectedStudent.answeredCount} of {QUESTIONS.length} answered
              </span>
            </div>
          )}

          {selectedStudent.status === 'In Progress' && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-amber-800">
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
                <span className="font-bold uppercase tracking-wider text-[11px]">
                  In Progress
                </span>
                <span className="text-[#5A6E85]">
                  Showing saved draft responses.
                </span>
              </div>
              <span className="font-semibold text-[#062B50] tabular-nums">
                {selectedStudent.answeredCount} of {QUESTIONS.length} answered
              </span>
            </div>
          )}

          {selectedStudent.status === 'Not Started' && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5A6E85]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" aria-hidden="true" />
                <span className="font-bold uppercase tracking-wider text-slate-700 text-[11px]">
                  Not Started
                </span>
                <span>This student has not started the self-discovery questionnaire.</span>
              </div>
            </div>
          )}

          {selectedStudent.status === 'Unable to Load' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-red-800">
              <div className="flex items-start sm:items-center gap-2 min-w-0">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
                <p className="leading-snug break-words">
                  <span className="font-bold uppercase tracking-wider text-[11px] mr-1.5">
                    Unable to Load
                  </span>
                  <span className="text-red-700">
                    {statusError
                      ? `Could not verify questionnaire status: ${statusError}`
                      : 'Unable to retrieve questionnaire status due to a network or permissions error.'}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => onRetryStatus(selectedStudent.id, e)}
                disabled={isRetryingStatus}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto shrink-0 disabled:opacity-50"
              >
                {isRetryingStatus ? 'Retrying...' : 'Retry Status Check'}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Questionnaire Responses Editorial Document Surface */}
      <section
        aria-label="Questionnaire responses"
        className="bg-white rounded-2xl border border-[#E2EDF8] p-4 sm:p-6"
      >
        <div className="pb-4 border-b border-[#E2EDF8] flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5">
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#062B50]">
              QUESTIONNAIRE RESPONSES
            </h2>
            <p className="text-xs sm:text-sm text-[#5A6E85] mt-1">
              {selectedStudent.status === 'Submitted'
                ? 'Complete student responses presented in original question order.'
                : selectedStudent.status === 'In Progress'
                ? 'Saved draft responses presented in original question order.'
                : selectedStudent.status === 'Unable to Load'
                ? 'Status could not be verified. Only confirmed responses are displayed.'
                : 'Student reflection responses appear here once the questionnaire begins.'}
            </p>
          </div>
          <div className="text-xs font-bold text-[#0866C6] tabular-nums shrink-0">
            {selectedStudent.answeredCount} of {QUESTIONS.length} questions answered
          </div>
        </div>

        {isLoadingAnswers ? (
          <div className="py-12 text-center text-[#5A6E85]">
            <RefreshCw className="w-6 h-6 mx-auto text-[#0866C6] animate-spin mb-2.5" aria-hidden="true" />
            <p className="text-sm font-semibold text-[#062B50]">Loading student responses...</p>
            <p className="text-xs mt-0.5">Retrieving records for {selectedStudent.fullName}</p>
          </div>
        ) : answersError ? (
          <div className="py-8 space-y-3 text-left sm:text-center">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
              <span>{answersError}</span>
            </div>
            <div>
              <button
                type="button"
                onClick={onRetryAnswers}
                className="px-3.5 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors cursor-pointer"
              >
                Retry Loading Answers
              </button>
            </div>
          </div>
        ) : showEmptyResponses ? (
          <div className="py-7">
            <p className="text-sm font-semibold text-[#062B50]">No responses recorded yet.</p>
            <p className="text-xs text-[#5A6E85] mt-1 tabular-nums">
              0 of {QUESTIONS.length} questions answered.
            </p>
          </div>
        ) : (
          <div className="space-y-8 pt-5">
            {SECTIONS.map((section) => {
              const sectionQuestions = QUESTIONS.filter((q) => q.section === section.id);

              return (
                <div key={section.id}>
                  {/* Clean Unboxed Section Header */}
                  <div className="pb-2.5 border-b border-[#D5E4F3]">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#0866C6] tabular-nums">
                      SECTION {section.id}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-[#062B50] mt-0.5 leading-snug">
                      {section.title}
                    </h3>
                    {section.intro && (
                      <p className="text-xs text-[#5A6E85] mt-1 leading-relaxed">
                        {section.intro}
                      </p>
                    )}
                  </div>

                  {/* Subtle Horizontal Dividers Between Questions */}
                  <div className="divide-y divide-[#EFF5FC]">
                    {sectionQuestions.map((q: Question) => {
                      const answer = resolveQuestionAnswer(
                        selectedStudent.answers,
                        q.n,
                        selectedStudent.version
                      );
                      const answered = isAnswerProvided(answer);

                      return (
                        <div key={q.n} className="py-3.5 last:pb-1">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64778C] tabular-nums">
                            <span className="font-bold text-[#0866C6]">Q{q.n}</span>
                            <span className="mx-1.5 text-[#B4C6D9]">·</span>
                            <span>
                              {q.type === 'text'
                                ? 'WRITTEN RESPONSE'
                                : q.type === 'single'
                                ? 'SINGLE CHOICE'
                                : 'MULTIPLE CHOICE'}
                            </span>
                          </div>

                          <p className="text-sm font-semibold text-[#062B50] leading-snug mt-1">
                            {q.text}
                          </p>

                          <div className="mt-2">
                            {answered ? (
                              <>
                                {q.type === 'text' && (
                                  <p className="text-sm text-[#102C46] whitespace-pre-wrap leading-relaxed pl-3 border-l-2 border-[#C7DDF6] break-words">
                                    {answer as string}
                                  </p>
                                )}

                                {q.type === 'single' && (
                                  <p className="text-sm font-medium text-[#102C46] pl-3 border-l-2 border-[#0866C6] break-words">
                                    {answer as string}
                                  </p>
                                )}

                                {q.type === 'multi' && (
                                  <div className="pl-3 border-l-2 border-[#C7DDF6] space-y-1">
                                    {Array.isArray(answer) ? (
                                      (answer as string[]).map((item, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-start gap-2 text-sm text-[#102C46] leading-snug"
                                        >
                                          <span
                                            className="w-1.5 h-1.5 rounded-full bg-[#0866C6] mt-1.5 shrink-0"
                                            aria-hidden="true"
                                          />
                                          <span className="break-words">{item}</span>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-sm text-[#102C46] break-words">
                                        {String(answer)}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </>
                            ) : (
                              <p className="text-xs italic text-[#7B8FA3]">
                                No response provided
                              </p>
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
      </section>
    </div>
  );
};
