/**
 * Authentication Bridge for DeRote Student Insight System
 *
 * Firebase Authentication is the single source of truth.
 * This module delegates all authentication state, profile management, and session listeners
 * directly to Firebase Authentication (`firebaseAuth.ts`).
 *
 * Local password storage and fake authentication identities have been removed.
 */

import {
  type LocalStudentAccount,
  getCurrentStudent as getFirebaseCurrentStudent,
  onAuthChange,
  signOutStudent,
  completeStudentProfile as completeFirebaseStudentProfile,
  updateStudentProfile as updateFirebaseStudentProfile,
  syncStudentProfileFromPart1 as syncFirebaseStudentProfileFromPart1,
  sendStudentPasswordResetEmail as sendFirebasePasswordResetEmail,
  signInStudentWithEmail,
  signInStudentWithGoogle,
  registerStudentWithEmail,
  isStudentProfileComplete,
  KNOWN_PLACEHOLDER_SCHOOLS,
} from './firebaseAuth';

export type { LocalStudentAccount };
export {
  signInStudentWithEmail,
  signInStudentWithGoogle,
  registerStudentWithEmail,
  isStudentProfileComplete,
  KNOWN_PLACEHOLDER_SCHOOLS,
};

export async function completeStudentProfile(details: {
  fullName: string;
  age: string;
  classGrade: string;
  schoolName: string;
}) {
  return completeFirebaseStudentProfile(details);
}

export function normalizePhoneNumber(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function isValidMobileNumber(raw: string): boolean {
  const digits = normalizePhoneNumber(raw);
  return digits.length === 10 && /^[6-9]\d{9}$/.test(digits);
}

export function isValidEmail(email: string): boolean {
  const clean = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean);
}

const PROFILES_CACHE_KEY = 'derote_student_profiles_cache_v3';

/**
 * Returns cached registered student accounts (no passwords stored).
 */
export function getStoredRegisteredAccounts(): LocalStudentAccount[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PROFILES_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => {
          // Guarantee no password field leaks
          const { password, ...safe } = item as any;
          return safe as LocalStudentAccount;
        });
      }
    }
  } catch (err) {
    console.warn('Error reading stored accounts cache:', err);
  }
  return [];
}

/**
 * Saves registered student profiles to cache without passwords.
 */
export function saveRegisteredAccounts(accounts: LocalStudentAccount[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const safeAccounts = accounts.map((acc) => {
      const { password, ...safe } = acc as any;
      return safe;
    });
    localStorage.setItem(PROFILES_CACHE_KEY, JSON.stringify(safeAccounts));
  } catch (err) {
    console.warn('Error saving accounts cache:', err);
  }
}

/**
 * Updates stored active student in memory and cache.
 */
export function setStoredStudent(student: LocalStudentAccount | null): void {
  if (student) {
    const accounts = getStoredRegisteredAccounts();
    const idx = accounts.findIndex((a) => a.id === student.id);
    if (idx >= 0) {
      accounts[idx] = { ...accounts[idx], ...student };
    } else {
      accounts.unshift(student);
    }
    saveRegisteredAccounts(accounts);
  }
}

/**
 * Returns the currently authenticated student profile from Firebase Auth.
 */
export function getCurrentStudent(): LocalStudentAccount | null {
  return getFirebaseCurrentStudent();
}

/**
 * Subscribes to authentication state changes driven by Firebase Auth's onAuthStateChanged.
 */
export function onLocalAuthChange(
  callback: (student: LocalStudentAccount | null) => void
): () => void {
  return onAuthChange((student) => {
    callback(student);
  });
}

/**
 * Signs out the current student from Firebase Auth.
 */
export async function logoutStudent(): Promise<void> {
  await signOutStudent();
}

/**
 * Updates editable profile fields (Age and Class) directly in Firestore.
 */
export function updateStudentProfile(updates: {
  age: string;
  classGrade: string;
}): { success: boolean; student?: LocalStudentAccount; error?: string } {
  const current = getCurrentStudent();
  if (!current) {
    return { success: false, error: 'No active student session found.' };
  }

  // Synchronously return updated object for immediate UI responsiveness, while persisting to Firestore
  const updated: LocalStudentAccount = {
    ...current,
    age: updates.age.trim(),
    classGrade: updates.classGrade.trim(),
    badge: updates.classGrade.trim() === 'Others' ? 'Student' : `Class ${updates.classGrade.trim()} Student`,
    lastLoginAt: new Date().toISOString(),
  };

  updateFirebaseStudentProfile({
    age: updates.age,
    classGrade: updates.classGrade,
  }).catch((err) => {
    console.error('Failed to update student profile in cloud:', err);
  });

  return { success: true, student: updated };
}

/**
 * Synchronizes student profile from Questionnaire About Me Part 1 responses
 */
export function syncStudentProfileFromPart1(
  answers: Record<number, string | string[]>
): LocalStudentAccount {
  return syncFirebaseStudentProfileFromPart1(answers);
}

/**
 * Sends a password reset email via Firebase Auth
 */
export async function sendStudentPasswordResetEmail(
  email: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  return sendFirebasePasswordResetEmail(email);
}

export async function upgradeStudentEmail(
  newEmail: string,
  _currentPassword?: string
): Promise<{ success: boolean; requiresVerification?: boolean; message?: string; error?: string }> {
  const current = getCurrentStudent();
  if (!current) {
    return { success: false, error: 'No active session found.' };
  }
  const clean = newEmail.trim().toLowerCase();
  if (!isValidEmail(clean)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  return {
    success: true,
    requiresVerification: true,
    message: `To change your email to ${clean}, please update your credentials via Firebase Authentication settings.`,
  };
}
