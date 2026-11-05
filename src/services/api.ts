import { QUESTIONNAIRE_VERSION, QUESTIONS, SECTIONS } from '../data/questionnaire';
import { getCurrentStudent } from './localAuth';
import {
  saveDraftToBackend,
  loadDraftFromBackend,
  saveSubmissionToBackend,
  getSubmissionFromBackend,
} from './firestoreBackend';

export type StudentAnswers = Record<number, string | string[]>;

export interface DraftData {
  answers: StudentAnswers;
  currentSection: number;
  version: number;
  updatedAt: string;
}

export interface SubmissionData {
  answers: StudentAnswers;
  version: number;
  submittedAt: string;
}

const DRAFT_STORAGE_KEY = 'derote_student_questionnaire_draft';
const SUBMISSION_STORAGE_KEY = 'derote_student_questionnaire_submission';

/**
 * Loads draft answers from local cache, with automatic cloud restore from Firestore backend.
 */
export async function loadDraft(): Promise<{ answers: StudentAnswers; currentSection: number } | null> {
  const current = getCurrentStudent();

  // 1. Check local storage first for fast response
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DraftData;
      if (parsed.answers && Object.keys(parsed.answers).length > 0) {
        return {
          answers: parsed.answers,
          currentSection: typeof parsed.currentSection === 'number' ? parsed.currentSection : 1,
        };
      }
    }
  } catch (err) {
    console.error('Failed to load draft from localStorage', err);
  }

  // 2. If no local draft found, try loading from Firestore backend
  if (current?.id) {
    try {
      const cloudDraft = await loadDraftFromBackend(current.id);
      if (cloudDraft && Object.keys(cloudDraft.answers).length > 0) {
        // Cache locally for offline availability
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            answers: cloudDraft.answers,
            currentSection: cloudDraft.currentSection,
            version: QUESTIONNAIRE_VERSION,
            updatedAt: new Date().toISOString(),
          })
        );
        return cloudDraft;
      }
    } catch (err) {
      console.warn('Failed to load draft from Firestore backend', err);
    }
  }

  return null;
}

/**
 * Saves draft answers to local storage and syncs to Firestore backend.
 */
export async function saveDraft(answers: StudentAnswers, currentSection: number): Promise<void> {
  const payload: DraftData = {
    answers,
    currentSection,
    version: QUESTIONNAIRE_VERSION,
    updatedAt: new Date().toISOString(),
  };

  // 1. Write through local cache
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error('Failed to save draft to localStorage', err);
  }

  // 2. Sync to Firestore backend asynchronously
  const current = getCurrentStudent();
  if (current?.id) {
    saveDraftToBackend(current.id, answers, currentSection).catch((err) => {
      console.warn('Async cloud draft save warning:', err);
    });
  }
}

/**
 * Submits final questionnaire answers to local storage and Firestore backend.
 */
export async function submitQuestionnaire(answers: StudentAnswers): Promise<void> {
  const payload: SubmissionData = {
    answers,
    version: QUESTIONNAIRE_VERSION,
    submittedAt: new Date().toISOString(),
  };

  // 1. Save to local storage
  try {
    localStorage.setItem(SUBMISSION_STORAGE_KEY, JSON.stringify(payload));
    // Clear draft on successful submission
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to submit questionnaire to localStorage', err);
    throw err;
  }

  // 2. Sync to Firestore backend
  const current = getCurrentStudent();
  if (current?.id) {
    await saveSubmissionToBackend(current.id, payload).catch((err) => {
      console.warn('Could not sync submission to Firestore backend immediately:', err);
    });
  }
}

/**
 * Checks if current student has submitted questionnaire.
 */
export async function hasSubmitted(): Promise<boolean> {
  // Check local storage
  try {
    const raw = localStorage.getItem(SUBMISSION_STORAGE_KEY);
    if (raw) return true;
  } catch (err) {
    console.error('Failed to check submission status in localStorage', err);
  }

  // Check active student account record
  const current = getCurrentStudent();
  if (current && (current.completedReflections ?? 0) > 0) {
    return true;
  }

  // Check Firestore backend
  if (current?.id) {
    try {
      const cloudSub = await getSubmissionFromBackend(current.id);
      if (cloudSub) return true;
    } catch {
      // offline fallback
    }
  }

  return false;
}

/**
 * Resets submission for testing / retake.
 */
export async function resetSubmission(): Promise<void> {
  try {
    localStorage.removeItem(SUBMISSION_STORAGE_KEY);
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to reset submission in localStorage', err);
  }
}

/**
 * Retrieves submission data from local cache or Firestore backend.
 */
export async function getSubmissionData(): Promise<SubmissionData | null> {
  try {
    const raw = localStorage.getItem(SUBMISSION_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as SubmissionData;
    }
  } catch (err) {
    console.error('Failed to get submission data from localStorage', err);
  }

  const current = getCurrentStudent();
  if (current?.id) {
    try {
      const cloudSub = await getSubmissionFromBackend(current.id);
      if (cloudSub) {
        localStorage.setItem(SUBMISSION_STORAGE_KEY, JSON.stringify(cloudSub));
        return cloudSub;
      }
    } catch (err) {
      console.warn('Could not retrieve cloud submission data', err);
    }
  }

  return null;
}

export async function getQuestionnaireProgress(): Promise<{
  hasDraft: boolean;
  currentSection: number;
  totalSections: number;
  answeredCount: number;
  totalQuestions: number;
  progressPercent: number;
  sectionTitle: string;
  answers: StudentAnswers;
}> {
  const totalQuestions = QUESTIONS.length;
  const totalSections = SECTIONS.length;

  const draft = await loadDraft();
  if (!draft || !draft.answers || Object.keys(draft.answers).length === 0) {
    return {
      hasDraft: false,
      currentSection: 1,
      totalSections,
      answeredCount: 0,
      totalQuestions,
      progressPercent: 0,
      sectionTitle: SECTIONS[0]?.title || 'About Me (Part 1)',
      answers: {},
    };
  }

  const answeredCount = QUESTIONS.filter((q) => {
    const val = draft.answers[q.n];
    if (val === undefined || val === null) return false;
    if (typeof val === 'string') return val.trim().length > 0;
    if (Array.isArray(val)) return val.length > 0;
    return false;
  }).length;

  const currentSection = Math.max(1, Math.min(draft.currentSection || 1, totalSections));
  const sectionObj = SECTIONS.find((s) => s.id === currentSection) || SECTIONS[0];
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  return {
    hasDraft: true,
    currentSection,
    totalSections,
    answeredCount,
    totalQuestions,
    progressPercent,
    sectionTitle: sectionObj?.title || `Section ${currentSection}`,
    answers: draft.answers,
  };
}

/**
 * Returns the student's real submission data.
 */
export async function getOrSeedStudentSubmission(): Promise<SubmissionData | null> {
  return getSubmissionData();
}


