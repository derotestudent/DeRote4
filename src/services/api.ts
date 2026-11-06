import { QUESTIONNAIRE_VERSION, QUESTIONS, SECTIONS } from '../data/questionnaire';
import { getCurrentStudent, onLocalAuthChange } from './localAuth';
import {
  saveDraftToBackendOutcome,
  loadDraftFromBackend,
  saveSubmissionToBackendOutcome,
  getSubmissionFromBackend,
  deleteDraftFromBackend,
} from './firestoreBackend';

export type StudentAnswers = Record<number, string | string[]>;

export interface DraftData {
  studentId?: string;
  answers: StudentAnswers;
  currentSection: number;
  version: number;
  updatedAt: string;
}

export interface SubmissionData {
  studentId?: string;
  answers: StudentAnswers;
  version: number;
  submittedAt: string;
}

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'failed';

export interface SaveStateInfo {
  status: AutosaveStatus;
  lastSavedAt?: string;
  error?: string;
}

// -----------------------------------------------------------------------------
// SHARED-DEVICE DATA ISOLATION HELPERS
// -----------------------------------------------------------------------------

/**
 * Namespaces draft local cache key using authenticated student UID.
 * Prevents cross-student data leakage on shared devices.
 */
export function getDraftStorageKey(uid?: string | null): string {
  const clean = uid ? uid.trim() : '';
  return clean ? `derote_draft_${clean}` : 'derote_draft_guest';
}

/**
 * Namespaces submission local cache key using authenticated student UID.
 */
export function getSubmissionStorageKey(uid?: string | null): string {
  const clean = uid ? uid.trim() : '';
  return clean ? `derote_submission_${clean}` : 'derote_submission_guest';
}

// -----------------------------------------------------------------------------
// AUTOSAVE MANAGER (DEBOUNCED & FLUSHABLE)
// -----------------------------------------------------------------------------

let currentSaveState: SaveStateInfo = { status: 'idle' };
const stateListeners: Set<(info: SaveStateInfo) => void> = new Set();

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingDraft: { answers: StudentAnswers; section: number; version: number } | null = null;
let activeUidForPending: string | null = null;

function notifyState(info: SaveStateInfo) {
  currentSaveState = info;
  stateListeners.forEach((listener) => {
    try {
      listener(info);
    } catch (e) {
      console.warn('Error in autosave state listener:', e);
    }
  });
}

/**
 * Subscribes to autosave state changes (saving, saved, offline, failed).
 */
export function onAutosaveStateChange(listener: (info: SaveStateInfo) => void): () => void {
  stateListeners.add(listener);
  listener(currentSaveState);
  return () => {
    stateListeners.delete(listener);
  };
}

/**
 * Clears in-memory debounce timers and pending changes (e.g. during sign out).
 */
export function clearActiveDraftSession(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  pendingDraft = null;
  activeUidForPending = null;
  notifyState({ status: 'idle' });
}

// Automatically clear draft session on sign-out to prevent shared-device data leakage
onLocalAuthChange((student) => {
  if (!student) {
    clearActiveDraftSession();
  }
});

// Listen to browser network connectivity changes to automatically sync when reconnected
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (pendingDraft && activeUidForPending) {
      flushPendingDraft().catch(() => {});
    } else if (currentSaveState.status === 'offline') {
      notifyState({ status: 'idle' });
    }
  });

  window.addEventListener('offline', () => {
    notifyState({
      status: 'offline',
      error: 'Working offline. Answers saved locally on this device.',
    });
  });
}

/**
 * Executes the cloud draft write for pending changes.
 */
async function executeCloudSave(
  uid: string,
  answers: StudentAnswers,
  section: number,
  version: number
): Promise<SaveStateInfo> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (!isOnline) {
    const offlineState: SaveStateInfo = {
      status: 'offline',
      lastSavedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      error: 'Network offline. Answers saved locally on this device and will sync automatically when reconnected.',
    };
    notifyState(offlineState);
    return offlineState;
  }

  notifyState({ status: 'saving' });

  try {
    const outcome = await saveDraftToBackendOutcome(uid, answers, section, version);
    if (outcome.success) {
      const savedState: SaveStateInfo = {
        status: 'saved',
        lastSavedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
      notifyState(savedState);
      return savedState;
    } else {
      const errRes = outcome as { success: false; code: string; message: string };
      const failedState: SaveStateInfo = {
        status: 'failed',
        error: errRes.message || 'Cloud sync failed. Answers remain protected on this device.',
      };
      notifyState(failedState);
      return failedState;
    }
  } catch (err: unknown) {
    const message = (err as { message?: string })?.message || 'Network error saving draft to cloud.';
    const failedState: SaveStateInfo = {
      status: 'failed',
      error: message,
    };
    notifyState(failedState);
    return failedState;
  }
}

/**
 * Queues a draft save with debouncing (default 800ms) for typing,
 * or immediate write when requested (for choice questions or navigation).
 */
export function queueDraftSave(
  answers: StudentAnswers,
  currentSection: number,
  options?: { immediate?: boolean; version?: number }
): void {
  const current = getCurrentStudent();
  const uid = current?.id || null;

  const version = options?.version || QUESTIONNAIRE_VERSION;
  pendingDraft = { answers, section: currentSection, version };
  activeUidForPending = uid;

  // 1. Always update local namespaced cache immediately for zero data loss
  if (uid && typeof localStorage !== 'undefined') {
    try {
      const payload: DraftData = {
        studentId: uid,
        answers,
        currentSection,
        version,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(getDraftStorageKey(uid), JSON.stringify(payload));
    } catch (err) {
      console.warn('Could not cache draft locally:', err);
    }
  }

  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  if (!uid) {
    notifyState({ status: 'offline', error: 'Not authenticated with cloud database.' });
    return;
  }

  if (options?.immediate) {
    executeCloudSave(uid, answers, currentSection, version).catch(() => {});
  } else {
    notifyState({ status: 'saving' });
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      if (pendingDraft && activeUidForPending === uid) {
        executeCloudSave(uid, pendingDraft.answers, pendingDraft.section, pendingDraft.version).catch(() => {});
      }
    }, 800);
  }
}

/**
 * Immediately flushes any pending draft changes to cloud (used on section navigation).
 */
export async function flushPendingDraft(): Promise<SaveStateInfo> {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (!pendingDraft || !activeUidForPending) {
    return currentSaveState;
  }
  const { answers, section, version } = pendingDraft;
  const uid = activeUidForPending;
  pendingDraft = null;
  return await executeCloudSave(uid, answers, section, version);
}

/**
 * Retries saving the current draft after a failure.
 */
export async function retryFailedSave(): Promise<SaveStateInfo> {
  const current = getCurrentStudent();
  if (!current?.id) {
    const s: SaveStateInfo = { status: 'failed', error: 'Please sign in to save your draft.' };
    notifyState(s);
    return s;
  }
  const draft = await loadDraft(current.id);
  if (!draft) {
    const s: SaveStateInfo = { status: 'idle' };
    notifyState(s);
    return s;
  }
  return await executeCloudSave(current.id, draft.answers, draft.currentSection, draft.version || QUESTIONNAIRE_VERSION);
}

// -----------------------------------------------------------------------------
// DRAFT RESTORATION & RESUME (STUDENT-SPECIFIC)
// -----------------------------------------------------------------------------

/**
 * Loads draft answers for the authenticated student.
 * Priority:
 * 1. Cloud Firestore draft (authoritative)
 * 2. Namespaced local storage draft (offline fallback)
 * Never loads un-namespaced or another student's draft.
 */
export async function loadDraft(
  explicitUid?: string
): Promise<{ answers: StudentAnswers; currentSection: number; version: number } | null> {
  const current = getCurrentStudent();
  const uid = explicitUid || current?.id;

  if (!uid) {
    return null;
  }

  // 1. Attempt to restore from cloud Firestore first if online
  if (typeof navigator === 'undefined' || navigator.onLine) {
    try {
      const cloudDraft = await loadDraftFromBackend(uid);
      if (cloudDraft && cloudDraft.answers && Object.keys(cloudDraft.answers).length > 0) {
        // Cache in namespaced local storage
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(
              getDraftStorageKey(uid),
              JSON.stringify({
                studentId: uid,
                answers: cloudDraft.answers,
                currentSection: cloudDraft.currentSection,
                version: cloudDraft.version || QUESTIONNAIRE_VERSION,
                updatedAt: cloudDraft.updatedAt || new Date().toISOString(),
              })
            );
          } catch {}
        }
        return {
          answers: cloudDraft.answers,
          currentSection: cloudDraft.currentSection,
          version: cloudDraft.version || QUESTIONNAIRE_VERSION,
        };
      }
    } catch (err) {
      console.warn('Could not retrieve cloud draft, checking namespaced local cache:', err);
    }
  }

  // 2. Fall back to student-specific namespaced local storage
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(getDraftStorageKey(uid));
      if (raw) {
        const parsed = JSON.parse(raw) as DraftData;
        if (parsed.answers && Object.keys(parsed.answers).length > 0) {
          return {
            answers: parsed.answers,
            currentSection: typeof parsed.currentSection === 'number' ? parsed.currentSection : 1,
            version: parsed.version || QUESTIONNAIRE_VERSION,
          };
        }
      }
    } catch (err) {
      console.error('Failed to parse namespaced local draft:', err);
    }
  }

  return null;
}

/**
 * Backward-compatible helper: saves draft answers.
 */
export async function saveDraft(answers: StudentAnswers, currentSection: number): Promise<void> {
  queueDraftSave(answers, currentSection, { immediate: false });
}

// -----------------------------------------------------------------------------
// FINAL SUBMISSION & LOCKING
// -----------------------------------------------------------------------------

export interface SubmissionOutcome {
  success: boolean;
  error?: string;
  errorCode?: string;
  submittedAt?: string;
}

/**
 * Submits finalized questionnaire answers.
 * Requires positive server confirmation before declaring success or updating local cache.
 */
export async function submitQuestionnaire(answers: StudentAnswers): Promise<void> {
  const res = await submitQuestionnaireOutcome(answers);
  if (!res.success) {
    throw new Error(res.error || 'Failed to submit questionnaire to the server.');
  }
}

/**
 * Executes final questionnaire submission with comprehensive outcome tracking.
 */
export async function submitQuestionnaireOutcome(answers: StudentAnswers): Promise<SubmissionOutcome> {
  const current = getCurrentStudent();
  if (!current?.id) {
    return {
      success: false,
      errorCode: 'unauthenticated',
      error: 'You must be signed in to submit your reflection questionnaire.',
    };
  }

  const uid = current.id;

  // Flush any pending draft changes first
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  // Check if student already has a submission in cloud (submission locking)
  try {
    const existing = await getSubmissionFromBackend(uid);
    if (existing) {
      // Cache locally to lock UI
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(getSubmissionStorageKey(uid), JSON.stringify(existing));
        localStorage.removeItem(getDraftStorageKey(uid));
      }
      return {
        success: false,
        errorCode: 'already-submitted',
        error: 'Your assessment questionnaire has already been submitted and is locked against modifications.',
      };
    }
  } catch {}

  const submittedAt = new Date().toISOString();
  const payload: SubmissionData = {
    studentId: uid,
    answers,
    version: QUESTIONNAIRE_VERSION,
    submittedAt,
  };

  const cloudOutcome = await saveSubmissionToBackendOutcome(uid, payload);
  if (!cloudOutcome.success) {
    const errRes = cloudOutcome as { success: false; code: string; message: string };
    return {
      success: false,
      errorCode: errRes.code,
      error: `Cloud submission rejected (${errRes.code}): ${errRes.message}. Your answers are preserved. Please click Retry.`,
    };
  }

  // Only AFTER positive cloud confirmation:
  // 1. Mark namespaced local submission cache
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(getSubmissionStorageKey(uid), JSON.stringify(payload));
      localStorage.removeItem(getDraftStorageKey(uid));
    } catch {}
  }

  // 2. Clean up cloud draft document now that final submission exists
  deleteDraftFromBackend(uid).catch(() => {});

  pendingDraft = null;
  activeUidForPending = null;
  notifyState({ status: 'saved', lastSavedAt: new Date().toLocaleTimeString() });

  return {
    success: true,
    submittedAt,
  };
}

/**
 * Authoritatively checks if current student has submitted questionnaire.
 * Priority:
 * 1. Cloud Firestore submissions/{uid} (single source of truth)
 * 2. Namespaced local submission cache
 */
export async function hasSubmitted(explicitUid?: string): Promise<boolean> {
  const current = getCurrentStudent();
  const uid = explicitUid || current?.id;

  if (!uid) {
    return false;
  }

  // 1. Cloud Firestore check (authoritative source)
  if (typeof navigator === 'undefined' || navigator.onLine) {
    try {
      const cloudSub = await getSubmissionFromBackend(uid);
      if (cloudSub) {
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(getSubmissionStorageKey(uid), JSON.stringify(cloudSub));
            localStorage.removeItem(getDraftStorageKey(uid));
          } catch {}
        }
        return true;
      }
    } catch (err) {
      console.warn('Cloud submission check offline fallback:', err);
    }
  }

  // 2. Namespaced local cache check
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(getSubmissionStorageKey(uid));
      if (raw) return true;
    } catch {}
  }

  return false;
}

/**
 * Retrieves submission data from local namespaced cache or Firestore backend.
 */
export async function getSubmissionData(explicitUid?: string): Promise<SubmissionData | null> {
  const current = getCurrentStudent();
  const uid = explicitUid || current?.id;

  if (!uid) {
    return null;
  }

  // 1. Cloud fetch if online
  if (typeof navigator === 'undefined' || navigator.onLine) {
    try {
      const cloudSub = await getSubmissionFromBackend(uid);
      if (cloudSub) {
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(getSubmissionStorageKey(uid), JSON.stringify(cloudSub));
          } catch {}
        }
        return cloudSub;
      }
    } catch (err) {
      console.warn('Could not retrieve cloud submission data:', err);
    }
  }

  // 2. Namespaced local cache fallback
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(getSubmissionStorageKey(uid));
      if (raw) {
        return JSON.parse(raw) as SubmissionData;
      }
    } catch {}
  }

  return null;
}

/**
 * Resets local submission for demo/testing mode only.
 * Production submissions in Firestore remain permanently locked under security rules.
 */
export async function resetSubmission(explicitUid?: string): Promise<void> {
  const current = getCurrentStudent();
  const uid = explicitUid || current?.id;
  if (!uid || typeof localStorage === 'undefined') return;

  try {
    localStorage.removeItem(getSubmissionStorageKey(uid));
    localStorage.removeItem(getDraftStorageKey(uid));
  } catch (err) {
    console.error('Failed to reset demo submission in localStorage:', err);
  }
}

/**
 * Computes questionnaire progress for the current student.
 * Total sections is dynamically derived from SECTIONS.length.
 */
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
