import React from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  type AdminStudentRecord,
  type QuestionnaireStatus,
  formatClassDisplay,
} from '../../services/studentAdminService';
import {
  formatMobileStudentMeta,
  resolveEffectiveStudentStatus,
} from '../../utils/adminDashboardUtils';

interface AdminStudentListProps {
  studentListRef: React.RefObject<HTMLDivElement | null>;
  filteredStudents: AdminStudentRecord[];
  paginatedStudents: AdminStudentRecord[];
  statusCache: Record<string, { status: QuestionnaireStatus; submittedAt?: string; updatedAt?: string }>;
  statusErrors: Record<string, string>;
  retryingStatusIds: Set<string>;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onSelectStudent: (studentId: string) => void;
  onRetryStudentStatus: (studentId: string, e?: React.MouseEvent) => void;
  onResetFilters: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const renderStatusIndicator = (
  currentStatus: QuestionnaireStatus,
  studentId: string,
  statusError: string | undefined,
  isRetrying: boolean,
  onRetry: (id: string, e?: React.MouseEvent) => void
) => {
  if (currentStatus === 'Submitted') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
        <span>Submitted</span>
      </span>
    );
  }
  if (currentStatus === 'In Progress') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 whitespace-nowrap">
        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
        <span>In Progress</span>
      </span>
    );
  }
  if (currentStatus === 'Not Started') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 whitespace-nowrap">
        <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" aria-hidden="true" />
        <span>Not Started</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 whitespace-nowrap">
      <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" aria-hidden="true" />
      <span>Unable to Load</span>
      <button
        type="button"
        onClick={(e) => onRetry(studentId, e)}
        disabled={isRetrying}
        className="ml-1 underline text-[11px] font-semibold text-red-800 hover:text-red-950 cursor-pointer disabled:opacity-50"
        title={statusError || 'Retry status check'}
      >
        {isRetrying ? '...' : 'Retry'}
      </button>
    </span>
  );
};

export const AdminStudentList: React.FC<AdminStudentListProps> = ({
  studentListRef,
  filteredStudents,
  paginatedStudents,
  statusCache,
  statusErrors,
  retryingStatusIds,
  currentPage,
  totalPages,
  pageSize,
  onSelectStudent,
  onRetryStudentStatus,
  onResetFilters,
  onPageChange,
  onPageSizeChange,
}) => {
  return (
    <div ref={studentListRef} className="scroll-mt-20 space-y-4">
      {filteredStudents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2EDF8] p-10 sm:p-12 text-center text-[#64778C]">
          <Search className="w-9 h-9 mx-auto text-[#0866C6] opacity-35 mb-3" />
          <p className="text-base font-bold text-[#062B50]">No matching students found</p>
          <p className="text-xs sm:text-sm text-[#5A6E85] mt-1 max-w-sm mx-auto">
            Try adjusting your search query, class selection, institution, or status filter.
          </p>
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-4 px-4 py-2 rounded-xl bg-[#EBF4FE] text-[#0866C6] text-xs font-bold hover:bg-[#D9EAFE] transition-colors cursor-pointer"
          >
            Clear All
          </button>
        </div>
      ) : (
        <>
          {/* Mobile Student Cards (< md) */}
          <div className="md:hidden space-y-2.5" aria-label="Student directory cards">
            {paginatedStudents.map((student) => {
              const currentStatus = resolveEffectiveStudentStatus(
                student,
                statusCache,
                statusErrors
              );
              const isStatusError = Boolean(statusErrors[student.id]);
              const isRetrying = retryingStatusIds.has(student.id);
              const classAndAge = formatMobileStudentMeta(student.classGrade, student.age);
              const hasInstitution = Boolean(student.schoolName && student.schoolName.trim());

              return (
                <article
                  key={student.id}
                  className="bg-white rounded-2xl border border-[#E2EDF8] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => onSelectStudent(student.id)}
                    aria-label={`View student ${student.fullName}`}
                    className="w-full p-4 text-left hover:bg-[#F8FBFF] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#0866C6] transition-colors cursor-pointer block"
                  >
                    <div className="space-y-2">
                      <div>
                        <h3 className="text-[15px] font-bold text-[#062B50] leading-snug break-words">
                          {student.fullName}
                        </h3>
                        {student.email && (
                          <p className="text-xs text-[#5A6E85] mt-0.5 break-all">
                            {student.email}
                          </p>
                        )}
                      </div>

                      {classAndAge && (
                        <p className="text-xs font-semibold text-[#102C46] tabular-nums">
                          {classAndAge}
                        </p>
                      )}

                      {hasInstitution && (
                        <p className="text-xs text-[#5A6E85] leading-relaxed break-words">
                          <span className="font-semibold text-[#334E68]">Institution:</span>{' '}
                          {student.schoolName}
                        </p>
                      )}

                      <div className="pt-2.5 mt-1 border-t border-[#F0F6FC] flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          {currentStatus === 'Submitted' && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                              <span>Submitted</span>
                            </span>
                          )}
                          {currentStatus === 'In Progress' && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700">
                              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
                              <span>In Progress</span>
                            </span>
                          )}
                          {currentStatus === 'Not Started' && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                              <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" aria-hidden="true" />
                              <span>Not Started</span>
                            </span>
                          )}
                          {currentStatus === 'Unable to Load' && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700">
                              <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" aria-hidden="true" />
                              <span>Unable to Load</span>
                            </span>
                          )}
                        </div>

                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0866C6] whitespace-nowrap shrink-0">
                          <span>View Student</span>
                          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </span>
                      </div>
                    </div>
                  </button>

                  {isStatusError && (
                    <div className="px-4 py-2 bg-red-50/70 border-t border-red-100 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-red-700 truncate">
                        Status lookup failed
                      </span>
                      <button
                        type="button"
                        onClick={(e) => onRetryStudentStatus(student.id, e)}
                        disabled={isRetrying}
                        className="px-2.5 py-1 rounded-lg bg-white border border-red-200 text-[11px] font-bold text-red-700 hover:bg-red-50 cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {isRetrying ? 'Retrying...' : 'Retry'}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {/* Desktop Student Table (>= md) */}
          <div className="hidden md:block bg-white rounded-2xl border border-[#E2EDF8] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E8F3FF] bg-[#F8FAFD] text-[11px] font-bold uppercase tracking-wider text-[#5A6E85]">
                    <th className="py-3.5 px-5 whitespace-nowrap">Student Name</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Class</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Age</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Institution / School</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                    <th className="py-3.5 px-5 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFF5FC] text-sm">
                  {paginatedStudents.map((student) => {
                    const currentStatus = resolveEffectiveStudentStatus(
                      student,
                      statusCache,
                      statusErrors
                    );
                    const isRetrying = retryingStatusIds.has(student.id);
                    return (
                      <tr
                        key={student.id}
                        onClick={() => onSelectStudent(student.id)}
                        className="hover:bg-[#F8FBFF] transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-5 font-bold text-[#062B50] group-hover:text-[#0866C6] transition-colors">
                          <div className="leading-snug">{student.fullName}</div>
                          {student.email && (
                            <div className="text-xs font-normal text-[#5A6E85] mt-0.5">
                              {student.email}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-[#102C46] whitespace-nowrap">
                          {formatClassDisplay(student.classGrade)}
                        </td>
                        <td className="py-3.5 px-4 text-[#5A6E85] tabular-nums whitespace-nowrap">
                          {student.age ? `${student.age} yrs` : '—'}
                        </td>
                        <td
                          className="py-3.5 px-4 text-[#5A6E85] max-w-[240px] truncate"
                          title={student.schoolName}
                        >
                          {student.schoolName}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderStatusIndicator(
                            currentStatus,
                            student.id,
                            statusErrors[student.id],
                            isRetrying,
                            onRetryStudentStatus
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectStudent(student.id);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-[#0866C6] group-hover:underline focus-visible:outline-2 focus-visible:outline-[#0866C6] rounded px-1.5 py-1 cursor-pointer whitespace-nowrap"
                          >
                            <span>View Student</span>
                            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Unified Pagination Bar */}
          <div className="bg-white rounded-2xl border border-[#E2EDF8] px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-[#5A6E85]">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  onPageSizeChange(Number(e.target.value));
                  onPageChange(1);
                }}
                aria-label="Rows per page"
                className="px-2 py-1 rounded-lg border border-[#D5E4F3] bg-[#F8FAFD] text-xs font-bold text-[#062B50] focus:outline-none focus:border-[#0866C6] cursor-pointer tabular-nums"
              >
                <option value="10">10</option>
                <option value="15">15</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
              <span className="ml-1 tabular-nums">
                Page <strong className="text-[#062B50]">{currentPage}</strong> of{' '}
                <strong className="text-[#062B50]">{totalPages}</strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className="w-9 h-9 rounded-lg border border-[#D5E4F3] bg-white text-[#062B50] hover:bg-[#F2F7FC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
                aria-label="First Page"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="w-9 h-9 rounded-lg border border-[#D5E4F3] bg-white text-[#062B50] hover:bg-[#F2F7FC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
                aria-label="Previous Page"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="min-w-[36px] h-9 px-2.5 inline-flex items-center justify-center text-xs font-bold text-[#0866C6] bg-[#EBF4FE] rounded-lg tabular-nums">
                {currentPage}
              </span>

              <button
                type="button"
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="w-9 h-9 rounded-lg border border-[#D5E4F3] bg-white text-[#062B50] hover:bg-[#F2F7FC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
                aria-label="Next Page"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage >= totalPages}
                className="w-9 h-9 rounded-lg border border-[#D5E4F3] bg-white text-[#062B50] hover:bg-[#F2F7FC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
                aria-label="Last Page"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
