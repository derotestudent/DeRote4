/**
 * Firestore Backend Service for DeRote Student Insight System
 *
 * Implements cloud database persistence for:
 * 1. Student Profiles (`students` collection)
 * 2. Questionnaire Answers & Drafts (`submissions` and `drafts` collections)
 * 3. Questionnaire Definitions (`questionnaires` collection)
 *
 * Designed with dual-persistence (write-through cache):
 * - Writes to both local cache and Firestore
 * - Reads from Firestore when online, falling back gracefully to local storage if offline or during rule propagation
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type { LocalStudentAccount } from './localAuth';
import type { StudentAnswers, SubmissionData, DraftData } from './api';
import {
  SECTIONS as DEFAULT_SECTIONS,
  QUESTIONS as DEFAULT_QUESTIONS,
  INTRO as DEFAULT_INTRO,
  OUTRO as DEFAULT_OUTRO,
  QUESTIONNAIRE_VERSION,
  type Question,
} from '../data/questionnaire';

// Collection references
const COLLECTION_STUDENTS = 'students';
const COLLECTION_SUBMISSIONS = 'submissions';
const COLLECTION_DRAFTS = 'drafts';
const COLLECTION_QUESTIONNAIRES = 'questionnaires';
const DEFAULT_QUESTIONNAIRE_DOC_ID = 'default_v1';

/* =========================================================================
   1. STUDENT PROFILES BACKEND
   ========================================================================= */

/**
 * Saves a student profile into the Firestore `students` collection.
 */
export async function saveStudentProfileToBackend(student: LocalStudentAccount): Promise<boolean> {
  try {
    const studentRef = doc(db, COLLECTION_STUDENTS, student.id);
    const payload = {
      id: student.id,
      fullName: student.fullName,
      age: student.age || '',
      classGrade: student.classGrade,
      schoolName: student.schoolName,
      email: student.email,
      phone: student.phone || '',
      completedReflections: student.completedReflections ?? 0,
      totalReflections: student.totalReflections ?? 13,
      badge: student.badge || `Class ${student.classGrade} Student`,
      createdAt: student.createdAt || new Date().toISOString(),
      lastLoginAt: student.lastLoginAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(studentRef, payload, { merge: true });
    return true;
  } catch (err) {
    console.warn('[Firestore Backend] Could not save student profile to cloud:', err);
    return false;
  }
}

/**
 * Loads a student profile by ID from Firestore.
 */
export async function getStudentProfileFromBackend(studentId: string): Promise<LocalStudentAccount | null> {
  try {
    const studentRef = doc(db, COLLECTION_STUDENTS, studentId);
    const snap = await getDoc(studentRef);
    if (!snap.exists()) return null;
    return snap.data() as LocalStudentAccount;
  } catch (err) {
    console.warn('[Firestore Backend] Could not load student profile from cloud:', err);
    return null;
  }
}

/**
 * Fetches all student profiles from Firestore.
 */
export async function getAllStudentsFromBackend(): Promise<LocalStudentAccount[] | null> {
  try {
    const colRef = collection(db, COLLECTION_STUDENTS);
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) return null;
    const students: LocalStudentAccount[] = [];
    snapshot.forEach((d) => {
      students.push(d.data() as LocalStudentAccount);
    });
    return students;
  } catch (err) {
    console.warn('[Firestore Backend] Could not list students from cloud:', err);
    return null;
  }
}

/**
 * Updates specific fields of a student profile in Firestore.
 */
export async function updateStudentProfileInBackend(
  studentId: string,
  updates: Partial<LocalStudentAccount>
): Promise<boolean> {
  try {
    const studentRef = doc(db, COLLECTION_STUDENTS, studentId);
    await updateDoc(studentRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.warn('[Firestore Backend] Could not update student profile in cloud:', err);
    return false;
  }
}

/* =========================================================================
   2. QUESTIONNAIRE ANSWERS & DRAFTS BACKEND
   ========================================================================= */

/**
 * Converts numeric answer keys to string keys for Firestore compatibility.
 */
function serializeAnswers(answers: StudentAnswers): Record<string, string | string[]> {
  const serialized: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(answers)) {
    serialized[String(key)] = value;
  }
  return serialized;
}

/**
 * Converts string answer keys from Firestore back to numeric keys.
 */
function deserializeAnswers(raw: Record<string, unknown>): StudentAnswers {
  const deserialized: StudentAnswers = {};
  for (const [key, value] of Object.entries(raw)) {
    const num = Number(key);
    if (!isNaN(num)) {
      deserialized[num] = value as string | string[];
    }
  }
  return deserialized;
}

/**
 * Saves a questionnaire draft for a student to Firestore.
 */
export async function saveDraftToBackend(
  studentId: string,
  answers: StudentAnswers,
  currentSection: number
): Promise<boolean> {
  try {
    const draftRef = doc(db, COLLECTION_DRAFTS, studentId);
    const payload = {
      studentId,
      answers: serializeAnswers(answers),
      currentSection,
      version: QUESTIONNAIRE_VERSION,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(draftRef, payload, { merge: true });
    return true;
  } catch (err) {
    console.warn('[Firestore Backend] Could not save draft to cloud:', err);
    return false;
  }
}

/**
 * Loads a questionnaire draft for a student from Firestore.
 */
export async function loadDraftFromBackend(
  studentId: string
): Promise<{ answers: StudentAnswers; currentSection: number } | null> {
  try {
    const draftRef = doc(db, COLLECTION_DRAFTS, studentId);
    const snap = await getDoc(draftRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      answers: deserializeAnswers(data.answers || {}),
      currentSection: typeof data.currentSection === 'number' ? data.currentSection : 1,
    };
  } catch (err) {
    console.warn('[Firestore Backend] Could not load draft from cloud:', err);
    return null;
  }
}

/**
 * Submits finalized questionnaire answers for a student to Firestore.
 */
export async function saveSubmissionToBackend(
  studentId: string,
  submission: SubmissionData
): Promise<boolean> {
  try {
    const submissionRef = doc(db, COLLECTION_SUBMISSIONS, studentId);
    const payload = {
      studentId,
      answers: serializeAnswers(submission.answers),
      version: submission.version,
      submittedAt: submission.submittedAt,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(submissionRef, payload);

    // Also mark student account's completed reflections in backend
    const studentRef = doc(db, COLLECTION_STUDENTS, studentId);
    await updateDoc(studentRef, {
      completedReflections: 1,
      lastSubmittedAt: submission.submittedAt,
    }).catch(() => {
      /* ignore if student doc not yet indexed */
    });

    return true;
  } catch (err) {
    console.warn('[Firestore Backend] Could not save submission to cloud:', err);
    return false;
  }
}

/**
 * Loads finalized questionnaire submission for a student from Firestore.
 */
export async function getSubmissionFromBackend(studentId: string): Promise<SubmissionData | null> {
  try {
    const submissionRef = doc(db, COLLECTION_SUBMISSIONS, studentId);
    const snap = await getDoc(submissionRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      answers: deserializeAnswers(data.answers || {}),
      version: data.version || QUESTIONNAIRE_VERSION,
      submittedAt: data.submittedAt || new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[Firestore Backend] Could not load submission from cloud:', err);
    return null;
  }
}

/**
 * Fetches all submissions from Firestore mapped by studentId.
 */
export async function getAllSubmissionsFromBackend(): Promise<Record<string, SubmissionData> | null> {
  try {
    const colRef = collection(db, COLLECTION_SUBMISSIONS);
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) return null;

    const map: Record<string, SubmissionData> = {};
    snapshot.forEach((d) => {
      const data = d.data();
      const sId = (data.studentId as string) || d.id;
      map[sId] = {
        answers: deserializeAnswers(data.answers || {}),
        version: data.version || QUESTIONNAIRE_VERSION,
        submittedAt: data.submittedAt || new Date().toISOString(),
      };
    });
    return map;
  } catch (err) {
    console.warn('[Firestore Backend] Could not load all submissions from cloud:', err);
    return null;
  }
}

/* =========================================================================
   3. QUESTIONNAIRE DEFINITION IN BACKEND (QUESTIONS, SECTIONS, INTRO)
   ========================================================================= */

export interface BackendQuestionnaireData {
  version: number;
  intro: typeof DEFAULT_INTRO;
  outro: typeof DEFAULT_OUTRO;
  sections: typeof DEFAULT_SECTIONS;
  questions: Question[];
  updatedAt: string;
}

/**
 * Fetches questionnaire structure directly from Firestore backend.
 */
export async function getQuestionnaireFromBackend(): Promise<BackendQuestionnaireData | null> {
  try {
    const qRef = doc(db, COLLECTION_QUESTIONNAIRES, DEFAULT_QUESTIONNAIRE_DOC_ID);
    const snap = await getDoc(qRef);
    if (!snap.exists()) return null;
    return snap.data() as BackendQuestionnaireData;
  } catch (err) {
    console.warn('[Firestore Backend] Could not load questionnaire from cloud:', err);
    return null;
  }
}

/**
 * Seeds or updates the questionnaire definition into Firestore backend.
 * Can be called during setup or via Admin sync button.
 */
export async function seedQuestionnaireToBackend(
  force = false
): Promise<{ success: boolean; message: string; version: number }> {
  try {
    const qRef = doc(db, COLLECTION_QUESTIONNAIRES, DEFAULT_QUESTIONNAIRE_DOC_ID);

    if (!force) {
      const existing = await getDoc(qRef);
      if (existing.exists()) {
        const data = existing.data() as BackendQuestionnaireData;
        return {
          success: true,
          message: `Questionnaire already present in backend (Version ${data.version || 1})`,
          version: data.version || 1,
        };
      }
    }

    const payload: BackendQuestionnaireData = {
      version: QUESTIONNAIRE_VERSION,
      intro: DEFAULT_INTRO,
      outro: DEFAULT_OUTRO,
      sections: DEFAULT_SECTIONS,
      questions: DEFAULT_QUESTIONS,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(qRef, payload);
    return {
      success: true,
      message: `Successfully seeded ${DEFAULT_QUESTIONS.length} questions across ${DEFAULT_SECTIONS.length} sections into Firestore!`,
      version: QUESTIONNAIRE_VERSION,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[Firestore Backend] Seeding questionnaire failed:', errMsg);
    return {
      success: false,
      message: `Failed to seed questionnaire: ${errMsg}`,
      version: QUESTIONNAIRE_VERSION,
    };
  }
}

/**
 * Checks connectivity to the Firestore backend.
 */
export async function testFirestoreConnection(): Promise<{
  connected: boolean;
  projectId: string;
  error?: string;
}> {
  try {
    const testDocRef = doc(db, '_connection_test', 'ping');
    await setDoc(testDocRef, { timestamp: new Date().toISOString() });
    return { connected: true, projectId: db.app.options.projectId || 'gen-lang-client-0276070718' };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      connected: false,
      projectId: db.app.options.projectId || 'gen-lang-client-0276070718',
      error: errMsg,
    };
  }
}
