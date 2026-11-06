import React from 'react';
import { SECTIONS, QUESTIONS, Question } from '../data/questionnaire';
import { AdminStudentRecord, QuestionnaireStatus, formatClassDisplay } from '../services/studentAdminService';

export interface PrintableStudentListReportProps {
  type: 'student-list';
  title: string;
  students: AdminStudentRecord[];
  date: string;
}

export interface PrintableIndividualStudentReportProps {
  type: 'individual-student';
  title: string;
  student: {
    fullName: string;
    age?: string;
    classGrade?: string;
    schoolName?: string;
    status: QuestionnaireStatus;
    submittedAt?: string;
    answers?: Record<number, string | string[]>;
  };
  date: string;
  isStudentSelfView?: boolean;
}

export type PrintableReportProps =
  | PrintableStudentListReportProps
  | PrintableIndividualStudentReportProps;

export const PrintableReport: React.FC<PrintableReportProps> = (props) => {
  const { type, title, date } = props;

  return (
    <div
      id="derote-printable-area"
      className="w-full bg-white text-black p-6 sm:p-8 font-sans antialiased selection:bg-transparent"
      style={{ color: '#000000', backgroundColor: '#ffffff' }}
    >
      {/* ============================================================== */}
      {/* 1. DOCUMENT HEADER (Standard DeRote Official Confidential Header) */}
      {/* ============================================================== */}
      <header className="border-b-2 border-black pb-4 mb-6">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-black">
              DeRote — Student Insight System
            </h1>
            <p className="text-xs uppercase tracking-wider text-gray-700 font-semibold mt-0.5">
              {type === 'student-list'
                ? 'Official Administrative Cohort Record'
                : 'Student Reflection & Self-Discovery Report'}
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="inline-block border-2 border-black px-2.5 py-0.5 text-xs font-black uppercase tracking-widest text-black">
              CONFIDENTIAL
            </span>
            <div className="text-xs text-gray-800 font-medium mt-1.5">
              Date: <strong>{date}</strong>
            </div>
          </div>
        </div>

        {/* Dynamic Context-Aware Report Title */}
        <div className="mt-4 pt-3 border-t border-gray-300 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-wide text-black">
            {title}
          </h2>

          {type === 'student-list' && (
            <span className="text-xs font-bold text-gray-800 shrink-0">
              Total Students: <strong>{props.students.length}</strong>
            </span>
          )}
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. REPORT BODY                                                 */}
      {/* ============================================================== */}

      {/* CASE A: STUDENT LIST REPORT */}
      {type === 'student-list' && (
        <section className="space-y-4">
          <div className="text-xs text-gray-800 flex justify-between items-center pb-2 border-b border-gray-300">
            <span>
              Total Matching Records: <strong>{props.students.length}</strong>
            </span>
            <span className="italic text-gray-600">Complete matching cohort roster (A–Z)</span>
          </div>

          {props.students.length === 0 ? (
            <div className="p-8 text-center border border-gray-300 text-sm text-gray-600">
              No registered student records match the active search and filter criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs border border-black border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-black text-[11px] font-black uppercase">
                  <th className="p-2.5 border-r border-black w-10 text-center">#</th>
                  <th className="p-2.5 border-r border-black">Student Name</th>
                  <th className="p-2.5 border-r border-black w-24">Class</th>
                  <th className="p-2.5 border-r border-black w-16 text-center">Age</th>
                  <th className="p-2.5 border-r border-black">Institution / School</th>
                  <th className="p-2.5 w-32">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {props.students.map((st, idx) => (
                  <tr key={st.id || idx} className="print-page-break-avoid">
                    <td className="p-2.5 border-r border-gray-300 text-center font-mono font-semibold">
                      {idx + 1}
                    </td>
                    <td className="p-2.5 border-r border-gray-300 font-bold text-black">
                      {st.fullName}
                    </td>
                    <td className="p-2.5 border-r border-gray-300">
                      {formatClassDisplay(st.classGrade)}
                    </td>
                    <td className="p-2.5 border-r border-gray-300 text-center">
                      {st.age ? `${st.age} yrs` : '—'}
                    </td>
                    <td className="p-2.5 border-r border-gray-300">
                      {st.schoolName || '—'}
                    </td>
                    <td className="p-2.5 font-bold uppercase">
                      {st.status === 'Submitted' && (
                        <span className="text-black font-black">SUBMITTED</span>
                      )}
                      {st.status === 'In Progress' && (
                        <span className="text-gray-800 font-bold">IN PROGRESS</span>
                      )}
                      {st.status === 'Not Started' && (
                        <span className="text-gray-600 font-medium">NOT STARTED</span>
                      )}
                      {st.status === 'Unable to Load' && (
                        <span className="text-red-700 font-medium">UNABLE TO LOAD</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* CASE B: INDIVIDUAL STUDENT REPORT */}
      {type === 'individual-student' && (
        <section className="space-y-6">
          {/* Student Profile Box */}
          <div className="border-2 border-black p-4 sm:p-5 print-page-break-avoid bg-white">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-6 text-xs">
              <div>
                <span className="font-bold text-gray-700 block uppercase text-[10px] tracking-wider">
                  Student Name
                </span>
                <span className="font-black text-sm text-black block mt-0.5">
                  {props.student.fullName}
                </span>
              </div>

              <div>
                <span className="font-bold text-gray-700 block uppercase text-[10px] tracking-wider">
                  Class / Grade
                </span>
                <span className="font-black text-sm text-black block mt-0.5">
                  {formatClassDisplay(props.student.classGrade || '10')}
                </span>
              </div>

              <div>
                <span className="font-bold text-gray-700 block uppercase text-[10px] tracking-wider">
                  Age
                </span>
                <span className="font-black text-sm text-black block mt-0.5">
                  {props.student.age ? `${props.student.age} years old` : 'Not specified'}
                </span>
              </div>

              <div className="col-span-2">
                <span className="font-bold text-gray-700 block uppercase text-[10px] tracking-wider">
                  Institution / School
                </span>
                <span className="font-black text-sm text-black block mt-0.5">
                  {props.student.schoolName || 'Enrolled School'}
                </span>
              </div>

              <div>
                <span className="font-bold text-gray-700 block uppercase text-[10px] tracking-wider">
                  Questionnaire Status
                </span>
                <span className="font-black text-sm text-black block mt-0.5 uppercase">
                  {props.student.status}
                </span>
              </div>
            </div>

            {/* Clear Status Callout Banner */}
            {props.student.status === 'In Progress' && (
              <div className="mt-4 pt-3 border-t-2 border-dashed border-black text-xs font-black uppercase text-black bg-gray-50 p-2 text-center">
                ** IN PROGRESS — Self-reflection questionnaire is currently in progress. Showing saved responses so far. **
              </div>
            )}

            {props.student.status === 'Not Started' && (
              <div className="mt-4 pt-3 border-t-2 border-dashed border-black text-xs font-black uppercase text-black bg-gray-50 p-2 text-center">
                ** NOT STARTED — Student has not begun answering the self-reflection questionnaire. **
              </div>
            )}

            {props.student.status === 'Submitted' && props.student.submittedAt && (
              <div className="mt-4 pt-3 border-t border-gray-300 text-xs text-gray-700 font-medium">
                Submitted on:{' '}
                <strong>
                  {new Date(props.student.submittedAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </strong>
              </div>
            )}
          </div>

          {/* Complete Questionnaire Questions & Answers (Original order, all questions) */}
          <div className="space-y-6 pt-2">
            <div className="border-b-2 border-black pb-1">
              <h3 className="text-sm font-black uppercase tracking-wider text-black">
                Questionnaire Responses (Original Question Order)
              </h3>
            </div>

            {SECTIONS.map((section) => {
              const sectionQuestions = QUESTIONS.filter((q) => q.section === section.id);
              const studentAnswers = props.student.answers || {};

              return (
                <div key={section.id} className="space-y-3">
                  {/* Section Title Banner */}
                  <div className="border-b border-black pb-1 pt-3 print-page-break-avoid">
                    <span className="text-[10px] font-black uppercase text-gray-700 tracking-wider">
                      Section {section.id} of {SECTIONS.length}
                    </span>
                    <h4 className="text-sm font-black uppercase text-black">
                      {section.title}
                    </h4>
                    {section.intro && (
                      <p className="text-[11px] text-gray-600 italic mt-0.5">
                        {section.intro}
                      </p>
                    )}
                  </div>

                  {/* Section Questions */}
                  <div className="space-y-3.5">
                    {sectionQuestions.map((q: Question) => {
                      const answer = studentAnswers[q.n];
                      const hasAns =
                        answer !== undefined &&
                        answer !== null &&
                        (typeof answer === 'string'
                          ? answer.trim().length > 0
                          : Array.isArray(answer)
                          ? answer.length > 0
                          : true);

                      return (
                        <div
                          key={q.n}
                          className="border border-gray-300 p-3 sm:p-4 rounded-sm print-page-break-avoid bg-white"
                        >
                          {/* Question Number and Full Exact Question Text */}
                          <div className="text-xs font-bold text-black mb-1.5 leading-snug">
                            <span className="font-black mr-1 text-black">Q{q.n}.</span>
                            <span>{q.text}</span>
                          </div>

                          {/* Student Answer */}
                          <div className="pl-4 mt-2 text-xs">
                            {hasAns ? (
                              q.type === 'multi' && Array.isArray(answer) ? (
                                <ul className="list-disc pl-4 space-y-1 font-semibold text-black">
                                  {answer.map((item, idx) => (
                                    <li key={idx} className="leading-snug">
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="font-semibold text-black whitespace-pre-wrap leading-relaxed">
                                  {String(answer)}
                                </p>
                              )
                            ) : (
                              <span className="italic text-gray-500 font-normal">
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
        </section>
      )}

      {/* ============================================================== */}
      {/* 3. DOCUMENT FOOTER                                             */}
      {/* ============================================================== */}
      <footer className="mt-10 pt-4 border-t-2 border-black text-center text-[10px] text-gray-600 print-page-break-avoid space-y-1">
        <p className="font-bold text-black uppercase tracking-wider">
          DeRote Student Insight System — Confidential Document
        </p>
        <p>
          Generated on {date} · A reflective insight experience for students in Classes 8–12.
        </p>
      </footer>
    </div>
  );
};
