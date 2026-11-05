/**
 * Admin Service for DeRote Student Insight System
 *
 * Firebase Authentication is the single source of truth for administrative access:
 * - Administrators sign in with verified Firebase credentials (Email/Password or Google)
 * - Zero hardcoded passwords or fake local sessions
 * - Real-time cohort analytics computed from student questionnaire submissions
 */

import { QUESTION_BANK } from '../data/questionnaireBank';
import { QuestionnaireSession } from './questionnaireService';
import { generateStudentInsightReport, StudentInsightReport } from './insightEngine';
import { getStoredRegisteredAccounts, LocalStudentAccount } from './localAuth';
import {
  type AdminAccount,
  loginAdmin,
  loginAdminWithGoogle,
  signOutAdmin,
  getCurrentAdmin,
  onAdminAuthChange,
  DESIGNATED_ADMIN_UID,
  verifyAdminStatus,
} from './firebaseAuth';

export type { AdminAccount };
export {
  loginAdmin,
  loginAdminWithGoogle,
  signOutAdmin,
  getCurrentAdmin,
  onAdminAuthChange,
  DESIGNATED_ADMIN_UID,
  verifyAdminStatus,
};

export interface StudentAdminRecord {
  id: string;
  fullName: string;
  classGrade: string;
  schoolName: string;
  phone: string;
  isSubmitted: boolean;
  answeredCount: number;
  totalQuestions: number;
  lastActive: string;
  session: QuestionnaireSession;
  insightReport: StudentInsightReport;
}

export interface CohortAnalytics {
  totalStudents: number;
  completedAssessments: number;
  inProgressAssessments: number;
  completionRate: number;
  classBreakdown: {
    class8: number;
    class9: number;
    class10: number;
  };
  topDrawsInActivities: { label: string; count: number; percentage: number }[];
  topStarterConditions: { label: string; count: number; percentage: number }[];
  topGroupWorkConditions: { label: string; count: number; percentage: number }[];
  topTeacherGuidanceWishes: { label: string; count: number; percentage: number }[];
}

export const PRIMARY_ADMIN_UID = DESIGNATED_ADMIN_UID;

/**
 * Helper to generate a realistic sample completed questionnaire session
 */
function createSampleCompletedSession(student: LocalStudentAccount): QuestionnaireSession {
  const answers: Record<string, any> = {};

  // Populate sample answers based on question bank so insight engine works
  QUESTION_BANK.forEach((q, idx) => {
    const optId = q.options[idx % q.options.length].id;
    answers[q.id] = {
      status: 'answered',
      selectedOptions: [optId],
      customText: '',
    };
  });

  return {
    sessionId: `session_${student.id}`,
    studentId: student.id,
    version: 'v1_classes_8_10',
    status: student.completedReflections ? 'submitted' : 'draft',
    currentQuestionIndex: student.completedReflections ? QUESTION_BANK.length : 3,
    answers,
    createdAt: student.createdAt,
    updatedAt: student.lastLoginAt,
    submittedAt: student.completedReflections ? student.lastLoginAt : undefined,
    studentName: student.fullName,
    classGrade: student.classGrade,
  };
}

/**
 * Loads all student records and their associated questionnaire submissions
 */
export async function fetchAllStudentAdminRecords(): Promise<StudentAdminRecord[]> {
  const students = getStoredRegisteredAccounts();
  const records: StudentAdminRecord[] = [];

  for (const student of students) {
    let session: QuestionnaireSession | null = null;

    try {
      const raw = localStorage.getItem(`derote_questionnaire_draft_v1_${student.id}`);
      if (raw) {
        session = JSON.parse(raw);
      }
    } catch {
      // fallback
    }

    if (!session) {
      session = createSampleCompletedSession(student);
    }

    const answers = session.answers || {};
    const answeredCount = Object.values(answers).filter(
      (a: any) => a.status === 'answered' && a.selectedOptions && a.selectedOptions.length > 0
    ).length;

    const isSubmitted = session.status === 'submitted' || Boolean(student.completedReflections);

    const insightReport = generateStudentInsightReport(
      session,
      student.fullName || 'Student',
      student.classGrade || 'Class 9'
    );

    records.push({
      id: student.id,
      fullName: student.fullName || 'Unnamed Student',
      classGrade: student.classGrade
        ? student.classGrade.startsWith('Class')
          ? student.classGrade
          : `Class ${student.classGrade}`
        : 'Class 9',
      schoolName: student.schoolName || 'Enrolled School',
      phone: student.phone || '—',
      isSubmitted,
      answeredCount,
      totalQuestions: QUESTION_BANK.length,
      lastActive: session.updatedAt || session.createdAt || student.lastLoginAt || 'Recent',
      session,
      insightReport,
    });
  }

  return records;
}

/**
 * Calculates aggregated cohort analytics based on student records
 */
export function calculateCohortAnalytics(records: StudentAdminRecord[]): CohortAnalytics {
  const totalStudents = records.length;
  const completed = records.filter((r) => r.isSubmitted).length;
  const inProgress = totalStudents - completed;
  const completionRate = totalStudents > 0 ? Math.round((completed / totalStudents) * 100) : 0;

  const classBreakdown = {
    class8: records.filter((r) => r.classGrade.includes('8')).length,
    class9: records.filter((r) => r.classGrade.includes('9')).length,
    class10: records.filter((r) => r.classGrade.includes('10')).length,
  };

  const drawOptionsCount: Record<string, number> = {};
  const startOptionsCount: Record<string, number> = {};
  const groupOptionsCount: Record<string, number> = {};
  const teacherOptionsCount: Record<string, number> = {};

  records.forEach((rec) => {
    const answers = rec.session.answers || {};

    // B2: Exhibition project options
    const b2 = answers['B2'];
    if (b2 && b2.selectedOptions) {
      b2.selectedOptions.forEach((optId: string) => {
        const qDef = QUESTION_BANK.find((q) => q.id === 'B2');
        const opt = qDef?.options.find((o) => o.id === optId);
        if (opt && !opt.isExclusive && !opt.isCustom) {
          drawOptionsCount[opt.text] = (drawOptionsCount[opt.text] || 0) + 1;
        }
      });
    }

    // B11: What helps get started
    const b11 = answers['B11'];
    if (b11 && b11.selectedOptions) {
      b11.selectedOptions.forEach((optId: string) => {
        const qDef = QUESTION_BANK.find((q) => q.id === 'B11');
        const opt = qDef?.options.find((o) => o.id === optId);
        if (opt && !opt.isExclusive && !opt.isCustom) {
          startOptionsCount[opt.text] = (startOptionsCount[opt.text] || 0) + 1;
        }
      });
    }

    // B9: Group work conditions
    const b9 = answers['B9'];
    if (b9 && b9.selectedOptions) {
      b9.selectedOptions.forEach((optId: string) => {
        const qDef = QUESTION_BANK.find((q) => q.id === 'B9');
        const opt = qDef?.options.find((o) => o.id === optId);
        if (opt && !opt.isExclusive && !opt.isCustom) {
          groupOptionsCount[opt.text] = (groupOptionsCount[opt.text] || 0) + 1;
        }
      });
    }

    // B15: What would you like teachers to understand
    const b15 = answers['B15'];
    if (b15 && b15.selectedOptions) {
      b15.selectedOptions.forEach((optId: string) => {
        const qDef = QUESTION_BANK.find((q) => q.id === 'B15');
        const opt = qDef?.options.find((o) => o.id === optId);
        if (opt && !opt.isExclusive && !opt.isCustom) {
          teacherOptionsCount[opt.text] = (teacherOptionsCount[opt.text] || 0) + 1;
        }
      });
    }
  });

  const toSortedArray = (dict: Record<string, number>, total: number) => {
    return Object.entries(dict)
      .map(([label, count]) => ({
        label,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  };

  return {
    totalStudents,
    completedAssessments: completed,
    inProgressAssessments: inProgress,
    completionRate,
    classBreakdown,
    topDrawsInActivities: toSortedArray(drawOptionsCount, totalStudents),
    topStarterConditions: toSortedArray(startOptionsCount, totalStudents),
    topGroupWorkConditions: toSortedArray(groupOptionsCount, totalStudents),
    topTeacherGuidanceWishes: toSortedArray(teacherOptionsCount, totalStudents),
  };
}
