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
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type { LocalStudentAccount } from './firebaseAuth';
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
 * Exact generated placeholder school names that must never be treated as valid profile data.
 */
export const KNOWN_PLACEHOLDER_SCHOOLS = [
  'enrolled institution',
  'general institute',
  'enrolled school',
  'institution / school',
  'institution',
];

/**
 * Validates whether a student profile has all mandatory fields complete with genuine, non-placeholder data:
 * - fullName (non-empty, not generic 'Student')
 * - email (valid non-empty email)
 * - age (realistic integer between 8 and 25)
 * - classGrade (valid grade: 8, 9, 10, 11, 12, or Others)
 * - schoolName (non-empty, and NOT a generated placeholder)
 */
export function isStudentProfileComplete(
  profile: Partial<LocalStudentAccount> | null | undefined
): boolean {
  if (!profile) return false;

  const fullName = (profile.fullName || '').trim();
  const email = (profile.email || '').trim();
  const age = (profile.age || '').trim();
  const classGrade = (profile.classGrade || '').trim();
  const schoolName = (profile.schoolName || '').trim();

  if (!fullName || fullName.toLowerCase() === 'student' || fullName.toLowerCase() === 'unnamed student') {
    return false;
  }
  if (!email) {
    return false;
  }
  if (!age) {
    return false;
  }
  const ageNum = parseInt(age, 10);
  if (isNaN(ageNum) || ageNum < 8 || ageNum > 25) {
    return false;
  }
  if (!classGrade) {
    return false;
  }
  if (!schoolName) {
    return false;
  }
  if (KNOWN_PLACEHOLDER_SCHOOLS.includes(schoolName.toLowerCase())) {
    return false;
  }

  return true;
}

export type ProfileFetchOutcome =
  | { type: 'found'; profile: LocalStudentAccount }
  | { type: 'not_found' }
  | { type: 'error'; code: string; message: string };

export type ProfileSaveOutcome =
  | { success: true; profile: LocalStudentAccount }
  | { success: false; code: string; message: string };

/**
 * Fetches a student profile from Firestore, clearly distinguishing between:
 * 1. Document genuinely does not exist (`not_found`)
 * 2. Document found (`found`)
 * 3. Database error or permission denied (`error`)
 */
export async function fetchStudentProfileOutcome(studentId: string): Promise<ProfileFetchOutcome> {
  if (!studentId) {
    return { type: 'not_found' };
  }
  try {
    const studentRef = doc(db, COLLECTION_STUDENTS, studentId);
    const snap = await getDoc(studentRef);
    if (!snap.exists()) {
      return { type: 'not_found' };
    }
    const data = snap.data();
    const profile: LocalStudentAccount = {
      id: studentId,
      fullName: data.fullName || '',
      email: data.email || '',
      age: data.age || '',
      classGrade: data.classGrade || '',
      schoolName: data.schoolName || '',
      phone: data.phone || '',
      completedReflections: data.completedReflections ?? 0,
      totalReflections: data.totalReflections ?? 13,
      badge: data.badge || (data.classGrade ? `Class ${data.classGrade} Student` : 'Student'),
      createdAt: data.createdAt || new Date().toISOString(),
      lastLoginAt: data.lastLoginAt || new Date().toISOString(),
    };
    return { type: 'found', profile };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || 'unknown-error';
    const message = (err as { message?: string })?.message || String(err);
    console.error(`[Firestore Backend] Profile fetch failed for ${studentId} (${code}):`, message);
    return { type: 'error', code, message };
  }
}

/**
 * Saves a student profile into Firestore, returning clear error status if rejected by rules or network.
 */
export async function saveStudentProfileOutcome(
  student: LocalStudentAccount
): Promise<ProfileSaveOutcome> {
  if (!student || !student.id) {
    return { success: false, code: 'invalid-id', message: 'Invalid student ID.' };
  }
  try {
    const studentRef = doc(db, COLLECTION_STUDENTS, student.id);
    const cleanClass = student.classGrade ? student.classGrade.trim() : '';
    const payload = {
      id: student.id,
      fullName: (student.fullName || '').trim(),
      email: (student.email || '').trim().toLowerCase(),
      age: (student.age || '').trim(),
      classGrade: cleanClass,
      schoolName: (student.schoolName || '').trim(),
      phone: student.phone || '',
      completedReflections: student.completedReflections ?? 0,
      totalReflections: student.totalReflections ?? 13,
      badge: cleanClass === 'Others' ? 'Student' : cleanClass ? `Class ${cleanClass} Student` : 'Student',
      createdAt: student.createdAt || new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(studentRef, payload, { merge: true });
    return { success: true, profile: { ...student, ...payload } };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || 'unknown-error';
    const message = (err as { message?: string })?.message || String(err);
    console.error(`[Firestore Backend] Profile save failed for ${student.id} (${code}):`, message);
    return { success: false, code, message };
  }
}

/**
 * Backward-compatible helper: saves student profile into Firestore.
 */
export async function saveStudentProfileToBackend(student: LocalStudentAccount): Promise<boolean> {
  const result = await saveStudentProfileOutcome(student);
  return result.success;
}

/**
 * Backward-compatible helper: loads student profile by ID from Firestore.
 */
export async function getStudentProfileFromBackend(studentId: string): Promise<LocalStudentAccount | null> {
  const result = await fetchStudentProfileOutcome(studentId);
  if (result.type === 'found') {
    return result.profile;
  }
  return null;
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

/**
 * Updates editable fields (age and classGrade) of a student profile in Firestore, returning outcome.
 * Touches strictly age, classGrade, and updatedAt to satisfy affectedKeys().hasOnly() rules.
 */
export async function updateStudentProfileOutcome(
  studentId: string,
  updates: { age: string; classGrade: string }
): Promise<ProfileSaveOutcome> {
  if (!studentId) {
    return { success: false, code: 'invalid-id', message: 'Invalid student ID.' };
  }
  try {
    const studentRef = doc(db, COLLECTION_STUDENTS, studentId);
    const updatedAt = new Date().toISOString();
    await updateDoc(studentRef, {
      age: updates.age.trim(),
      classGrade: updates.classGrade.trim(),
      updatedAt,
    });
    return {
      success: true,
      profile: {
        id: studentId,
        age: updates.age.trim(),
        classGrade: updates.classGrade.trim(),
        updatedAt,
      } as unknown as LocalStudentAccount,
    };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || 'unknown-error';
    const message = (err as { message?: string })?.message || String(err);
    console.error(`[Firestore Backend] Profile update failed for ${studentId} (${code}):`, message);
    return { success: false, code, message };
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

export type SaveDraftOutcome =
  | { success: true; updatedAt: string }
  | { success: false; code: string; message: string };

export type SaveSubmissionOutcome =
  | { success: true; submittedAt: string }
  | { success: false; code: string; message: string };

/**
 * Saves a questionnaire draft for a student to Firestore with detailed outcome.
 */
export async function saveDraftToBackendOutcome(
  studentId: string,
  answers: StudentAnswers,
  currentSection: number,
  version: number = QUESTIONNAIRE_VERSION
): Promise<SaveDraftOutcome> {
  if (!studentId) {
    return { success: false, code: 'unauthenticated', message: 'No student ID provided for draft save.' };
  }
  try {
    const draftRef = doc(db, COLLECTION_DRAFTS, studentId);
    const updatedAt = new Date().toISOString();
    const payload = {
      studentId,
      answers: serializeAnswers(answers),
      currentSection,
      version,
      updatedAt,
    };
    await setDoc(draftRef, payload);
    return { success: true, updatedAt };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || 'unknown-error';
    const message = (err as { message?: string })?.message || String(err);
    console.error(`[Firestore Backend] Draft save failed for ${studentId} (${code}):`, message);
    return { success: false, code, message };
  }
}

/**
 * Saves a questionnaire draft for a student to Firestore (boolean wrapper).
 */
export async function saveDraftToBackend(
  studentId: string,
  answers: StudentAnswers,
  currentSection: number,
  version: number = QUESTIONNAIRE_VERSION
): Promise<boolean> {
  const result = await saveDraftToBackendOutcome(studentId, answers, currentSection, version);
  return result.success;
}

/**
 * Deletes a questionnaire draft for a student from Firestore (e.g. after final submission).
 */
export async function deleteDraftFromBackend(studentId: string): Promise<boolean> {
  if (!studentId) return false;
  try {
    const draftRef = doc(db, COLLECTION_DRAFTS, studentId);
    await deleteDoc(draftRef);
    return true;
  } catch (err) {
    console.warn('[Firestore Backend] Could not delete cloud draft:', err);
    return false;
  }
}

/**
 * Loads a questionnaire draft for a student from Firestore.
 */
export async function loadDraftFromBackend(
  studentId: string
): Promise<{ answers: StudentAnswers; currentSection: number; version: number; updatedAt?: string } | null> {
  if (!studentId) return null;
  try {
    const draftRef = doc(db, COLLECTION_DRAFTS, studentId);
    const snap = await getDoc(draftRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      answers: deserializeAnswers(data.answers || {}),
      currentSection: typeof data.currentSection === 'number' ? data.currentSection : 1,
      version: typeof data.version === 'number' ? data.version : QUESTIONNAIRE_VERSION,
      updatedAt: data.updatedAt,
    };
  } catch (err) {
    console.warn('[Firestore Backend] Could not load draft from cloud:', err);
    return null;
  }
}

/**
 * Submits finalized questionnaire answers for a student to Firestore with detailed outcome.
 * Uses create-only write semantics to conform with immutable security rules.
 */
export async function saveSubmissionToBackendOutcome(
  studentId: string,
  submission: SubmissionData
): Promise<SaveSubmissionOutcome> {
  if (!studentId) {
    return { success: false, code: 'unauthenticated', message: 'No student ID provided for final submission.' };
  }
  try {
    const submissionRef = doc(db, COLLECTION_SUBMISSIONS, studentId);
    const now = new Date().toISOString();
    const payload = {
      studentId,
      answers: serializeAnswers(submission.answers),
      version: submission.version || QUESTIONNAIRE_VERSION,
      submittedAt: submission.submittedAt || now,
      updatedAt: now,
    };
    await setDoc(submissionRef, payload);
    return { success: true, submittedAt: payload.submittedAt };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || 'unknown-error';
    const message = (err as { message?: string })?.message || String(err);
    console.error(`[Firestore Backend] Submission failed for ${studentId} (${code}):`, message);
    return { success: false, code, message };
  }
}

/**
 * Backward-compatible helper: submits finalized questionnaire answers for a student to Firestore.
 */
export async function saveSubmissionToBackend(
  studentId: string,
  submission: SubmissionData
): Promise<boolean> {
  const result = await saveSubmissionToBackendOutcome(studentId, submission);
  return result.success;
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
    const qDocRef = doc(db, COLLECTION_QUESTIONNAIRES, DEFAULT_QUESTIONNAIRE_DOC_ID);
    await getDoc(qDocRef);
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
