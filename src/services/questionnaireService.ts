/**
 * Questionnaire Service for DeRote Student Insight System
 *
 * Standalone client-side persistence for student reflection drafts and final submissions:
 * - Instant offline-first localStorage persistence
 * - Zero external cloud service dependencies (pure browser-local storage)
 */

import { QUESTION_BANK } from '../data/questionnaireBank';
import {
  LocalStudentAccount,
  getStoredRegisteredAccounts,
  saveRegisteredAccounts,
  setStoredStudent,
} from './localAuth';

export interface QuestionAnswerState {
  status: 'unanswered' | 'answered' | 'skipped';
  selectedOptions: string[];
  customText?: string;
}

export interface QuestionnaireSession {
  sessionId: string;
  studentId: string;
  version: string;
  status: 'draft' | 'submitted';
  currentQuestionIndex: number;
  answers: Record<string, QuestionAnswerState>;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  studentName?: string;
  classGrade?: string;
}

const STORAGE_KEY_PREFIX = 'derote_questionnaire_draft_v1';

export const createEmptyAnswers = (): Record<string, QuestionAnswerState> => {
  const map: Record<string, QuestionAnswerState> = {};
  for (const q of QUESTION_BANK) {
    map[q.id] = {
      status: 'unanswered',
      selectedOptions: [],
      customText: '',
    };
  }
  return map;
};

export const hasAnyProgress = (answers: Record<string, QuestionAnswerState>): boolean => {
  return Object.values(answers).some(
    (ans) => ans.status === 'answered' || ans.status === 'skipped'
  );
};

export const loadStudentQuestionnaireSession = async (
  student: LocalStudentAccount
): Promise<{
  session: QuestionnaireSession;
  isExistingDraft: boolean;
  isAlreadySubmitted: boolean;
}> => {
  const key = `${STORAGE_KEY_PREFIX}_${student.id}`;

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const cached = JSON.parse(raw) as QuestionnaireSession;
      if (cached && cached.studentId === student.id) {
        const isSubmitted = cached.status === 'submitted';
        return {
          session: cached,
          isExistingDraft: !isSubmitted && hasAnyProgress(cached.answers || {}),
          isAlreadySubmitted: isSubmitted,
        };
      }
    }
  } catch (err) {
    console.warn('Error reading stored questionnaire session:', err);
  }

  // If student is marked as completed in their account record, load a sample completed set
  if (student.completedReflections && student.completedReflections > 0) {
    const answers = createEmptyAnswers();
    QUESTION_BANK.forEach((q, idx) => {
      answers[q.id] = {
        status: 'answered',
        selectedOptions: [q.options[idx % q.options.length].id],
        customText: '',
      };
    });
    const completedSession: QuestionnaireSession = {
      sessionId: `session_${student.id}`,
      studentId: student.id,
      version: 'v1_classes_8_10',
      status: 'submitted',
      currentQuestionIndex: QUESTION_BANK.length,
      answers,
      createdAt: student.createdAt,
      updatedAt: student.lastLoginAt,
      submittedAt: student.lastLoginAt,
      studentName: student.fullName,
      classGrade: student.classGrade,
    };
    try {
      localStorage.setItem(key, JSON.stringify(completedSession));
    } catch {}
    return {
      session: completedSession,
      isExistingDraft: false,
      isAlreadySubmitted: true,
    };
  }

  // Create fresh new draft session
  const now = new Date().toISOString();
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const freshSession: QuestionnaireSession = {
    sessionId,
    studentId: student.id,
    version: 'v1_classes_8_10',
    status: 'draft',
    currentQuestionIndex: 0,
    answers: createEmptyAnswers(),
    createdAt: now,
    updatedAt: now,
    studentName: student.fullName,
    classGrade: student.classGrade,
  };

  try {
    localStorage.setItem(key, JSON.stringify(freshSession));
  } catch {}

  return {
    session: freshSession,
    isExistingDraft: false,
    isAlreadySubmitted: false,
  };
};

export const resetStudentQuestionnaireSession = async (
  student: LocalStudentAccount
): Promise<QuestionnaireSession> => {
  const key = `${STORAGE_KEY_PREFIX}_${student.id}`;
  try {
    localStorage.removeItem(key);
  } catch {}

  const now = new Date().toISOString();
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const newSession: QuestionnaireSession = {
    sessionId,
    studentId: student.id,
    version: 'v1_classes_8_10',
    status: 'draft',
    currentQuestionIndex: 0,
    answers: createEmptyAnswers(),
    createdAt: now,
    updatedAt: now,
    studentName: student.fullName,
    classGrade: student.classGrade,
  };

  try {
    localStorage.setItem(key, JSON.stringify(newSession));
  } catch {}

  return newSession;
};

export const saveStudentDraft = async (
  session: QuestionnaireSession
): Promise<{ confirmedCloudSaved: boolean; error?: string }> => {
  session.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}_${session.studentId}`, JSON.stringify(session));
    return { confirmedCloudSaved: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { confirmedCloudSaved: false, error: msg };
  }
};

export const submitStudentResponses = async (
  session: QuestionnaireSession
): Promise<{ success: boolean; error?: string }> => {
  const now = new Date().toISOString();
  session.status = 'submitted';
  session.updatedAt = now;
  session.submittedAt = now;

  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}_${session.studentId}`, JSON.stringify(session));

    // Update student's completedReflections counter in registered accounts
    const accounts = getStoredRegisteredAccounts();
    const updatedAccounts = accounts.map((acc) => {
      if (acc.id === session.studentId) {
        return {
          ...acc,
          completedReflections: Math.max(1, acc.completedReflections || 1),
          lastLoginAt: now,
        };
      }
      return acc;
    });
    saveRegisteredAccounts(updatedAccounts);

    const active = updatedAccounts.find((a) => a.id === session.studentId);
    if (active) {
      setStoredStudent(active);
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Storage save failed.';
    return {
      success: false,
      error: `Could not save responses (${msg}). Please try again.`,
    };
  }
};
