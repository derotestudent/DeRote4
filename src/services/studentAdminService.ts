/**
 * Student Administration Service for DeRote Student Insight System
 *
 * Provides student roster management, answer loading, profile editing authority,
 * and context-aware report generation.
 * Pure offline/localStorage-first operation.
 */

import {
  LocalStudentAccount,
  getStoredRegisteredAccounts,
  saveRegisteredAccounts,
  getCurrentStudent,
  setStoredStudent,
} from './localAuth';
import { QUESTIONS } from '../data/questionnaire';
import {
  getAllStudentsFromBackend,
  adminUpdateStudentProfileOutcome,
  getStudentSubmissionStatus,
  getStudentFullQuestionnaireResponses,
} from './firestoreBackend';
import { getDraftStorageKey, getSubmissionStorageKey } from './api';

export type QuestionnaireStatus = 'Not Started' | 'In Progress' | 'Submitted' | 'Unable to Load';

export interface AdminStudentRecord {
  id: string;
  fullName: string;
  age: string;
  classGrade: string; // '8', '9', '10', '11', '12', 'Higher', 'Others'
  schoolName: string;
  email: string;
  phone?: string;
  status: QuestionnaireStatus;
  answeredCount: number;
  totalQuestions: number;
  createdAt?: string;
  submittedAt?: string;
  updatedAt?: string;
  answers: Record<number, string | string[]>;
}

const STORAGE_PREFIX_SUBMISSION = 'derote_questionnaire_submission_';
const STORAGE_PREFIX_DRAFT = 'derote_questionnaire_draft_';

/**
 * Normalizes class format for filter matching ('8', '9', '10', '11', '12', 'Higher', 'Others')
 */
export function normalizeClassGrade(grade?: string): string {
  if (!grade) return 'Others';
  const clean = grade.trim();
  if (clean.toLowerCase().includes('higher')) return 'Higher';
  if (clean.toLowerCase().includes('others')) return 'Others';
  const numMatch = clean.match(/\b(8|9|10|11|12)\b/);
  if (numMatch) return numMatch[1];
  return clean;
}

/**
 * Formats class for user-facing display ('Class 8', 'Class 9', ... 'Higher', or 'Others')
 */
export function formatClassDisplay(grade?: string): string {
  const norm = normalizeClassGrade(grade);
  if (norm === 'Others') return 'Others';
  if (norm === 'Higher') return 'Higher / Other';
  if (norm.toLowerCase().startsWith('class')) return norm;
  return `Class ${norm}`;
}

/**
 * Reads all registered student profiles from Firestore backend.
 * Performance Optimization:
 * - Does NOT fetch all student submissions during directory initialization.
 * - Does NOT load complete questionnaire answers into memory.
 * - Answers are loaded on-demand only when opening an individual student.
 */
export async function fetchAllStudentsWithStatus(): Promise<AdminStudentRecord[]> {
  let accounts = getStoredRegisteredAccounts();

  // 1. Fetch student profiles from Firestore backend
  try {
    const cloudStudents = await getAllStudentsFromBackend();
    if (cloudStudents && cloudStudents.length > 0) {
      const localMap = new Map(accounts.map((a) => [a.id, a]));
      for (const cs of cloudStudents) {
        if (!localMap.has(cs.id)) {
          accounts.unshift(cs);
          localMap.set(cs.id, cs);
        } else {
          const existing = localMap.get(cs.id)!;
          localMap.set(cs.id, { ...existing, ...cs });
        }
      }
      accounts = Array.from(localMap.values());
      saveRegisteredAccounts(accounts);
    }
  } catch (err) {
    console.warn('[StudentAdminService] Could not sync with Firestore backend during fetchAllStudentsWithStatus:', err);
  }

  // 2. Build lightweight student directory records without loading full answers
  const records: AdminStudentRecord[] = accounts.map((acc) => {
    let status: QuestionnaireStatus = 'Not Started';
    let submittedAt: string | undefined;
    let updatedAt: string | undefined = acc.lastLoginAt;

    // Check student-specific namespaced local submission cache
    try {
      const studentSubKey = getSubmissionStorageKey(acc.id);
      const subRaw = localStorage.getItem(studentSubKey) || localStorage.getItem(`${STORAGE_PREFIX_SUBMISSION}${acc.id}`);
      if (subRaw) {
        const parsed = JSON.parse(subRaw);
        if (parsed.submittedAt || (parsed.answers && Object.keys(parsed.answers).length > 0)) {
          status = 'Submitted';
          submittedAt = parsed.submittedAt;
          updatedAt = parsed.submittedAt;
        }
      } else {
        const studentDraftKey = getDraftStorageKey(acc.id);
        const draftRaw = localStorage.getItem(studentDraftKey) || localStorage.getItem(`${STORAGE_PREFIX_DRAFT}${acc.id}`);
        if (draftRaw) {
          const parsed = JSON.parse(draftRaw);
          if (parsed.answers && Object.keys(parsed.answers).length > 0) {
            status = 'In Progress';
            updatedAt = parsed.updatedAt;
          }
        }
      }
    } catch {}

    // Fall back to student's informational completedReflections flag if known
    if (status === 'Not Started' && (acc.completedReflections ?? 0) > 0) {
      status = 'Submitted';
    }

    return {
      id: acc.id,
      fullName: acc.fullName || 'Student',
      age: acc.age || '',
      classGrade: normalizeClassGrade(acc.classGrade),
      schoolName: acc.schoolName || 'Institution / School',
      email: acc.email || '',
      phone: acc.phone,
      status,
      answeredCount: status === 'Submitted' ? QUESTIONS.length : 0,
      totalQuestions: QUESTIONS.length,
      createdAt: acc.createdAt,
      submittedAt,
      updatedAt,
      answers: {}, // Loaded on-demand when opening individual student
    };
  });

  // Sort alphabetically A-Z by full name by default
  return records.sort((a, b) => a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' }));
}

/**
 * Resolves questionnaire submission status for a batch of student IDs from Firestore.
 * Preserves 'Unable to Load' on failure without silently converting to 'Not Started'.
 */
export async function resolveStudentBatchStatus(studentIds: string[]): Promise<
  Record<string, { status: QuestionnaireStatus; submittedAt?: string; updatedAt?: string; error?: string }>
> {
  const result: Record<string, { status: QuestionnaireStatus; submittedAt?: string; updatedAt?: string; error?: string }> = {};

  await Promise.all(
    studentIds.map(async (id) => {
      try {
        const res = await getStudentSubmissionStatus(id);
        result[id] = res;
      } catch (err: unknown) {
        result[id] = {
          status: 'Unable to Load',
          error: err instanceof Error ? err.message : String(err),
        };
      }
    })
  );

  return result;
}

/**
 * Fetches complete questionnaire answers on-demand for an individual student.
 * Guarantees all 64 questions are retrieved with original types without truncation.
 */
export async function fetchStudentAnswersForAdmin(studentId: string): Promise<{
  status: QuestionnaireStatus;
  answers: Record<number, string | string[]>;
  answeredCount: number;
  submittedAt?: string;
  updatedAt?: string;
  version?: number;
}> {
  try {
    const cloudRes = await getStudentFullQuestionnaireResponses(studentId);
    if (cloudRes.status !== 'Not Started' && Object.keys(cloudRes.answers).length > 0) {
      return cloudRes;
    }
  } catch (err) {
    console.warn(`[StudentAdminService] Could not fetch answers from cloud for ${studentId}:`, err);
  }

  // Fallback to local storage if offline or during simulation
  let answers: Record<number, string | string[]> = {};
  let status: QuestionnaireStatus = 'Not Started';
  let submittedAt: string | undefined;
  let updatedAt: string | undefined;

  try {
    const subKey = getSubmissionStorageKey(studentId);
    const subRaw = localStorage.getItem(subKey) || localStorage.getItem(`${STORAGE_PREFIX_SUBMISSION}${studentId}`);
    if (subRaw) {
      const parsed = JSON.parse(subRaw);
      if (parsed.answers && Object.keys(parsed.answers).length > 0) {
        answers = parsed.answers;
        status = 'Submitted';
        submittedAt = parsed.submittedAt;
        updatedAt = parsed.submittedAt;
      }
    } else {
      const draftKey = getDraftStorageKey(studentId);
      const draftRaw = localStorage.getItem(draftKey) || localStorage.getItem(`${STORAGE_PREFIX_DRAFT}${studentId}`);
      if (draftRaw) {
        const parsed = JSON.parse(draftRaw);
        if (parsed.answers && Object.keys(parsed.answers).length > 0) {
          answers = parsed.answers;
          status = 'In Progress';
          updatedAt = parsed.updatedAt;
        }
      }
    }
  } catch {}

  const answeredCount = Object.keys(answers).filter((k) => {
    const val = answers[Number(k)];
    if (val === undefined || val === null) return false;
    if (typeof val === 'string') return val.trim().length > 0;
    if (Array.isArray(val)) return val.length > 0;
    return false;
  }).length;

  return {
    status,
    answers,
    answeredCount,
    submittedAt,
    updatedAt,
  };
}

/**
 * Updates a student's profile details by the administrator.
 * Critical Rules:
 * - Validates inputs (name <= 128, school <= 200, age 8..25, class).
 * - Persists directly to Firestore students/{studentId}.
 * - Only updates local cache after confirmed server write.
 * - Does not modify questionnaire responses (Q5–Q64).
 */
export async function updateStudentProfileByAdmin(
  studentId: string,
  updates: {
    fullName: string;
    age: string;
    classGrade: string;
    schoolName: string;
  }
): Promise<{ success: boolean; student?: AdminStudentRecord; error?: string }> {
  const cleanName = updates.fullName.trim();
  const cleanAge = updates.age.trim();
  const cleanClass = normalizeClassGrade(updates.classGrade);
  const cleanSchool = updates.schoolName.trim();

  if (!cleanName) {
    return { success: false, error: 'Student Name is required.' };
  }
  if (cleanName.length > 128) {
    return { success: false, error: 'Student Name must not exceed 128 characters.' };
  }
  if (!cleanSchool) {
    return { success: false, error: 'Institution / School is required.' };
  }
  if (cleanSchool.length > 200) {
    return { success: false, error: 'Institution / School must not exceed 200 characters.' };
  }
  const ageNum = parseInt(cleanAge, 10);
  if (isNaN(ageNum) || ageNum < 8 || ageNum > 25) {
    return { success: false, error: 'Please enter a valid age between 8 and 25 years.' };
  }

  // 1. Persist directly to Firestore backend and await positive confirmation
  const outcome = await adminUpdateStudentProfileOutcome(studentId, {
    fullName: cleanName,
    age: cleanAge,
    classGrade: cleanClass,
    schoolName: cleanSchool,
  });

  if (!outcome.success) {
    const errRes = outcome as { success: false; code: string; message: string };
    return {
      success: false,
      error: `Firestore update failed (${errRes.code}): ${errRes.message}`,
    };
  }

  // 2. Only after successful server write, update local cache
  const accounts = getStoredRegisteredAccounts();
  const existingIdx = accounts.findIndex((a) => a.id === studentId);
  if (existingIdx !== -1) {
    const existingAccount = accounts[existingIdx];
    const updatedAccount: LocalStudentAccount = {
      ...existingAccount,
      fullName: cleanName,
      age: cleanAge,
      classGrade: cleanClass,
      schoolName: cleanSchool,
      badge: cleanClass === 'Others' ? 'Student' : cleanClass === 'Higher' ? 'Higher Education' : `Class ${cleanClass} Student`,
      lastLoginAt: existingAccount.lastLoginAt || new Date().toISOString(),
    };
    accounts[existingIdx] = updatedAccount;
    saveRegisteredAccounts(accounts);

    // If active student session matches this ID, sync it too
    const current = getCurrentStudent();
    if (current && current.id === studentId) {
      setStoredStudent(updatedAccount);
    }
  }

  // Sync personal info fields Q1–Q4 in student's stored answers if any exist
  const updateAnswersForStorageKey = (key: string) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.answers) {
          parsed.answers[1] = cleanName;
          if (cleanAge) parsed.answers[2] = cleanAge;
          parsed.answers[3] = cleanClass;
          parsed.answers[4] = cleanSchool;
          localStorage.setItem(key, JSON.stringify(parsed));
        }
      }
    } catch {}
  };

  updateAnswersForStorageKey(`${STORAGE_PREFIX_SUBMISSION}${studentId}`);
  updateAnswersForStorageKey(`${STORAGE_PREFIX_DRAFT}${studentId}`);
  updateAnswersForStorageKey(getSubmissionStorageKey(studentId));
  updateAnswersForStorageKey(getDraftStorageKey(studentId));

  const allUpdated = await fetchAllStudentsWithStatus();
  const updatedRecord = allUpdated.find((r) => r.id === studentId);

  return {
    success: true,
    student: updatedRecord,
  };
}

/**
 * Generates the context-aware uppercase report title based on current screen and filters.
 *
 * Specification rules:
 * - Main dashboard: ALL REGISTERED STUDENTS
 * - Class filter: CLASS 9 — STUDENT LIST
 * - Submitted filter: SUBMITTED STUDENTS
 * - Class + Submitted: CLASS 9 — SUBMITTED STUDENTS
 * - Search query: STUDENT LIST (SEARCH: "XYZ")
 * - Class + Search: CLASS 9 — STUDENT LIST (SEARCH: "XYZ")
 * - Individual student: STUDENT REPORT — [STUDENT NAME]
 */
export function getReportTitle(context: {
  view: 'list' | 'detail';
  student?: AdminStudentRecord | null;
  classFilter?: string;
  statusFilter?: string;
  searchQuery?: string;
}): string {
  if (context.view === 'detail' && context.student) {
    return `STUDENT REPORT — ${context.student.fullName.toUpperCase()}`;
  }

  const { classFilter = 'all', statusFilter = 'all', searchQuery = '' } = context;
  const cleanSearch = searchQuery.trim().toUpperCase();

  const classPrefix =
    classFilter !== 'all'
      ? classFilter === 'Others'
        ? 'OTHERS'
        : `CLASS ${classFilter}`
      : '';

  const statusName =
    statusFilter === 'Submitted'
      ? 'SUBMITTED STUDENTS'
      : statusFilter === 'In Progress'
      ? 'IN PROGRESS STUDENTS'
      : statusFilter === 'Not Started'
      ? 'NOT STARTED STUDENTS'
      : '';

  if (classPrefix && statusName) {
    const base = `${classPrefix} — ${statusName}`;
    return cleanSearch ? `${base} — SEARCH RESULTS — ${cleanSearch}` : base;
  }

  if (classPrefix && !statusName) {
    return cleanSearch ? `${classPrefix} — SEARCH RESULTS — ${cleanSearch}` : `${classPrefix} — STUDENT LIST`;
  }

  if (!classPrefix && statusName) {
    return cleanSearch ? `${statusName} — SEARCH RESULTS — ${cleanSearch}` : statusName;
  }

  if (cleanSearch) {
    return `SEARCH RESULTS — ${cleanSearch}`;
  }

  return 'ALL REGISTERED STUDENTS';
}
