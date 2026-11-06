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
  getAllSubmissionsFromBackend,
  updateStudentProfileInBackend,
} from './firestoreBackend';
import { type SubmissionData, getDraftStorageKey, getSubmissionStorageKey } from './api';

export type QuestionnaireStatus = 'Not Started' | 'In Progress' | 'Submitted';

export interface AdminStudentRecord {
  id: string;
  fullName: string;
  age: string;
  classGrade: string; // '8', '9', '10', '11', '12', 'Others'
  schoolName: string;
  email: string;
  phone?: string;
  status: QuestionnaireStatus;
  answeredCount: number;
  totalQuestions: number;
  submittedAt?: string;
  updatedAt?: string;
  answers: Record<number, string | string[]>;
}

const STORAGE_PREFIX_SUBMISSION = 'derote_questionnaire_submission_';
const STORAGE_PREFIX_DRAFT = 'derote_questionnaire_draft_';





/**
 * Normalizes class format for filter matching ('8', '9', '10', '11', '12', 'Others')
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
 * Reads all registered student records and resolves their status and answers
 */
export async function fetchAllStudentsWithStatus(): Promise<AdminStudentRecord[]> {
  let accounts = getStoredRegisteredAccounts();
  const currentStudent = getCurrentStudent();

  // Try fetching cloud students and submissions from Firestore backend
  let cloudSubmissionsMap: Record<string, SubmissionData> | null = null;
  try {
    const [cloudStudents, cloudSubs] = await Promise.all([
      getAllStudentsFromBackend(),
      getAllSubmissionsFromBackend(),
    ]);

    if (cloudStudents && cloudStudents.length > 0) {
      // Merge cloud students into accounts
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
    cloudSubmissionsMap = cloudSubs;
  } catch (err) {
    console.warn('Could not sync with Firestore backend during fetchAllStudentsWithStatus:', err);
  }

  const records: AdminStudentRecord[] = accounts.map((acc) => {
    let answers: Record<number, string | string[]> = {};
    let status: QuestionnaireStatus = 'Not Started';
    let submittedAt: string | undefined;
    let updatedAt: string | undefined;

    // 0. Check Firestore cloud submissions map
    if (cloudSubmissionsMap && cloudSubmissionsMap[acc.id]) {
      const cloudSub = cloudSubmissionsMap[acc.id];
      if (cloudSub.answers && Object.keys(cloudSub.answers).length > 0) {
        answers = { ...cloudSub.answers };
        status = 'Submitted';
        submittedAt = cloudSub.submittedAt || acc.lastLoginAt;
        updatedAt = cloudSub.submittedAt;
      }
    }

    // 1. Try student-specific submission in localStorage
    if (status !== 'Submitted') {
      try {
        const subRaw = localStorage.getItem(`${STORAGE_PREFIX_SUBMISSION}${acc.id}`);
        if (subRaw) {
          const parsed = JSON.parse(subRaw);
          if (parsed.answers && Object.keys(parsed.answers).length > 0) {
            answers = parsed.answers;
            status = 'Submitted';
            submittedAt = parsed.submittedAt || acc.lastLoginAt;
            updatedAt = parsed.submittedAt;
          }
        }
      } catch {}
    }

    // 2. Try student-specific draft in localStorage if not submitted
    if (status !== 'Submitted') {
      try {
        const draftRaw = localStorage.getItem(`${STORAGE_PREFIX_DRAFT}${acc.id}`);
        if (draftRaw) {
          const parsed = JSON.parse(draftRaw);
          if (parsed.answers && Object.keys(parsed.answers).length > 0) {
            answers = parsed.answers;
            status = 'In Progress';
            updatedAt = parsed.updatedAt;
          }
        }
      } catch {}
    }

    // 3. Check student-specific namespaced local storage keys
    if (status === 'Not Started') {
      try {
        const studentSubKey = getSubmissionStorageKey(acc.id);
        const subRaw = localStorage.getItem(studentSubKey);
        if (subRaw) {
          const parsed = JSON.parse(subRaw);
          if (parsed.answers && Object.keys(parsed.answers).length > 0) {
            answers = parsed.answers;
            status = 'Submitted';
            submittedAt = parsed.submittedAt;
            updatedAt = parsed.submittedAt;
          }
        } else {
          const studentDraftKey = getDraftStorageKey(acc.id);
          const draftRaw = localStorage.getItem(studentDraftKey);
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
    }

    if (Object.keys(answers).length === 0) {
      answers = {};
      status = 'Not Started';
    }

    // Always ensure Part 1 questions Q1-Q4 reflect the student's profile info if answers exist
    if (Object.keys(answers).length > 0) {
      if (acc.fullName) answers[1] = acc.fullName;
      if (acc.age) answers[2] = acc.age;
      if (acc.classGrade) answers[3] = normalizeClassGrade(acc.classGrade);
      if (acc.schoolName) answers[4] = acc.schoolName;
    }

    // Count answered questions
    const answeredCount = Object.keys(answers).filter((k) => {
      const val = answers[Number(k)];
      if (val === undefined || val === null) return false;
      if (typeof val === 'string') return val.trim().length > 0;
      if (Array.isArray(val)) return val.length > 0;
      return false;
    }).length;

    // Recalibrate status based on answers if not already submitted
    if (status !== 'Submitted') {
      if (answeredCount >= QUESTIONS.length) {
        status = 'Submitted';
      } else if (answeredCount > 0) {
        status = 'In Progress';
      } else {
        status = 'Not Started';
      }
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
      answeredCount,
      totalQuestions: QUESTIONS.length,
      submittedAt,
      updatedAt,
      answers,
    };
  });

  // Sort alphabetically A-Z by full name
  return records.sort((a, b) => a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' }));
}

/**
 * Updates a student's profile details by the administrator.
 * Critical Rules:
 * - Updates in place without modifying or deleting questionnaire answers (Q5–Q64).
 * - Synchronizes personal info Q1–Q4 in answers if answers exist.
 * - Does not create a duplicate student.
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
  if (!cleanSchool) {
    return { success: false, error: 'Institution / School is required.' };
  }

  const accounts = getStoredRegisteredAccounts();
  const existingIdx = accounts.findIndex((a) => a.id === studentId);
  if (existingIdx === -1) {
    return { success: false, error: 'Student record could not be found.' };
  }

  const existingAccount = accounts[existingIdx];
  const updatedAccount: LocalStudentAccount = {
    ...existingAccount,
    fullName: cleanName,
    age: cleanAge,
    classGrade: cleanClass,
    schoolName: cleanSchool,
    badge: cleanClass === 'Others' ? 'Student' : `Class ${cleanClass} Student`,
    lastLoginAt: existingAccount.lastLoginAt || new Date().toISOString(),
  };

  accounts[existingIdx] = updatedAccount;
  saveRegisteredAccounts(accounts);

  // Sync to Firestore backend asynchronously
  updateStudentProfileInBackend(studentId, {
    fullName: cleanName,
    age: cleanAge,
    classGrade: cleanClass,
    schoolName: cleanSchool,
  }).catch((err) => {
    console.warn('Async cloud student profile update warning:', err);
  });

  // If the active student session matches this ID, sync it too
  const current = getCurrentStudent();
  if (current && current.id === studentId) {
    setStoredStudent(updatedAccount);
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
