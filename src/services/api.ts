import { QUESTIONNAIRE_VERSION } from '../data/questionnaire';

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

// Will later call a PHP endpoint: GET /api/draft.php
export async function loadDraft(): Promise<{ answers: StudentAnswers; currentSection: number } | null> {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftData;
    return {
      answers: parsed.answers || {},
      currentSection: typeof parsed.currentSection === 'number' ? parsed.currentSection : 1,
    };
  } catch (err) {
    console.error('Failed to load draft from localStorage', err);
    return null;
  }
}

// Will later call a PHP endpoint: POST /api/draft.php
export async function saveDraft(answers: StudentAnswers, currentSection: number): Promise<void> {
  try {
    const payload: DraftData = {
      answers,
      currentSection,
      version: QUESTIONNAIRE_VERSION,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error('Failed to save draft to localStorage', err);
  }
}

// Will later call a PHP endpoint: POST /api/submit.php
export async function submitQuestionnaire(answers: StudentAnswers): Promise<void> {
  try {
    const payload: SubmissionData = {
      answers,
      version: QUESTIONNAIRE_VERSION,
      submittedAt: new Date().toISOString(),
    };
    localStorage.setItem(SUBMISSION_STORAGE_KEY, JSON.stringify(payload));
    // Clear draft on successful submission
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to submit questionnaire to localStorage', err);
    throw err;
  }
}

// Will later call a PHP endpoint: GET /api/submission-status.php
// Note: The real one-submission rule will be enforced on the server.
export async function hasSubmitted(): Promise<boolean> {
  try {
    const raw = localStorage.getItem(SUBMISSION_STORAGE_KEY);
    return !!raw;
  } catch (err) {
    console.error('Failed to check submission status in localStorage', err);
    return false;
  }
}

// Will later call a PHP endpoint: POST /api/reset-submission.php
export async function resetSubmission(): Promise<void> {
  try {
    localStorage.removeItem(SUBMISSION_STORAGE_KEY);
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to reset submission in localStorage', err);
  }
}

// Will later call a PHP endpoint: GET /api/latest-answers.php
export async function getLatestAnswers(): Promise<StudentAnswers | null> {
  try {
    const subRaw = localStorage.getItem(SUBMISSION_STORAGE_KEY);
    if (subRaw) {
      const parsed = JSON.parse(subRaw) as SubmissionData;
      if (parsed.answers) return parsed.answers;
    }
    const draftRaw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (draftRaw) {
      const parsed = JSON.parse(draftRaw) as DraftData;
      if (parsed.answers) return parsed.answers;
    }
    return null;
  } catch {
    return null;
  }
}


