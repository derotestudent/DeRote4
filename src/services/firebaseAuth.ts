/**
 * Firebase Authentication & Onboarding Service for DeRote Student Insight System
 *
 * Single Source of Truth for Authentication:
 * 1. onAuthStateChanged() manages and restores session on page reload
 * 2. Real Email/Password and Google Sign-In (popup)
 * 3. Enforces profile completion before granting dashboard access
 * 4. Eliminates all random/default placeholders (no 'Enrolled Institution', 'Class 10', or fake age)
 * 5. Distinguishes genuinely missing profiles from database read/security-rule failures
 * 6. Admin exception: Designated Admin UID is never sent to student profile completion
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail as fbSendPasswordResetEmail,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import {
  fetchStudentProfileOutcome,
  saveStudentProfileOutcome,
  isStudentProfileComplete,
  KNOWN_PLACEHOLDER_SCHOOLS,
} from './firestoreBackend';

export { isStudentProfileComplete, KNOWN_PLACEHOLDER_SCHOOLS };

export interface LocalStudentAccount {
  id: string; // Stable Firebase Auth UID
  fullName: string;
  age?: string;
  classGrade: string;
  schoolName: string;
  email: string;
  phone?: string;
  completedReflections?: number;
  totalReflections?: number;
  badge?: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface AdminAccount {
  id: string; // Stable Firebase Auth UID
  fullName: string;
  roleTitle: string;
  institution: string;
  email: string;
  avatarText?: string;
}

export interface AuthResult {
  success: boolean;
  student?: LocalStudentAccount;
  admin?: AdminAccount;
  requiresProfileCompletion?: boolean;
  error?: string;
  errorCode?: string;
  domain?: string;
}

/**
 * Designated Administrator UID (Phase 3 Sole Source of Administrator Identity).
 * The ONLY authorized administrator in the system.
 */
export const DESIGNATED_ADMIN_UID = 'VIwgfF6Q2FTDPDQwkRECSjpwbc32';

// Clean legacy localStorage items containing plaintext passwords or fake credentials
function cleanLegacyInsecureStorage(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const keysToClean = [
      'derote_registered_students_v2',
      'derote_active_student_session_v1',
      'derote_student_session_v1',
      'derote_active_admin_session_v1',
    ];

    keysToClean.forEach((key) => {
      const item = localStorage.getItem(key);
      if (item && item.includes('password')) {
        localStorage.removeItem(key);
      }
    });
  } catch (err) {
    console.warn('Storage cleanup warning:', err);
  }
}

cleanLegacyInsecureStorage();

// Safe in-memory session cache populated directly by onAuthStateChanged
let activeStudent: LocalStudentAccount | null = null;
let activeAdmin: AdminAccount | null = null;
let authReady = false;
let firestoreAuthError: { code: string; message: string } | null = null;

const studentListeners = new Set<(student: LocalStudentAccount | null, isReady: boolean) => void>();
const adminListeners = new Set<(admin: AdminAccount | null, isReady: boolean) => void>();

function notifyStudentListeners(): void {
  studentListeners.forEach((listener) => {
    try {
      listener(activeStudent, authReady);
    } catch (err) {
      console.error('Student auth listener error:', err);
    }
  });
}

function notifyAdminListeners(): void {
  adminListeners.forEach((listener) => {
    try {
      listener(activeAdmin, authReady);
    } catch (err) {
      console.error('Admin auth listener error:', err);
    }
  });
}

/**
 * Checks whether a Firebase User qualifies as the designated administrator.
 * The designated Firebase Authentication UID is the SOLE source of administrator identity.
 * All email allowlists, Firestore profile checks, and admins/{uid} checks are completely removed.
 */
export function verifyAdminStatus(user: { uid: string } | null | undefined): boolean {
  if (!user || !user.uid) return false;
  return user.uid === DESIGNATED_ADMIN_UID;
}

/**
 * Builds an AdminAccount object from an authenticated Firebase User
 */
export function buildAdminAccount(user: User): AdminAccount {
  const email = user.email || 'admin@derote.in';
  const nameParts = (user.displayName || email.split('@')[0] || 'Admin').trim().split(/\s+/);
  const avatarText =
    nameParts.length > 1
      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      : nameParts[0].slice(0, 2).toUpperCase();

  return {
    id: user.uid,
    fullName: user.displayName || 'DeRote Academic Leadership',
    roleTitle: 'Master Administrator',
    institution: 'DeRote Partner School Network',
    email,
    avatarText,
  };
}

/**
 * Resolves a student's Firestore profile without inventing fake or default values.
 * Distinguishes between:
 * - Found and Complete
 * - Found but Incomplete (e.g. missing age, placeholder school)
 * - Not Found (genuinely missing document)
 * - Database Error (permission-denied, unavailable, etc.)
 */
export async function resolveStudentProfile(user: User): Promise<{
  profile: LocalStudentAccount;
  isComplete: boolean;
  isExistingInFirestore: boolean;
  firestoreError?: { code: string; message: string };
}> {
  const uid = user.uid;
  const email = (user.email || '').toLowerCase();
  const displayName = user.displayName || '';

  const outcome = await fetchStudentProfileOutcome(uid);

  if (outcome.type === 'error') {
    // DO NOT assume profile is missing. DO NOT fabricate fake data.
    const unverifiedDraft: LocalStudentAccount = {
      id: uid,
      fullName: displayName,
      email,
      age: '',
      classGrade: '',
      schoolName: '',
      completedReflections: 0,
      totalReflections: 13,
      badge: 'Student',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
    return {
      profile: unverifiedDraft,
      isComplete: false,
      isExistingInFirestore: false,
      firestoreError: { code: outcome.code, message: outcome.message },
    };
  }

  if (outcome.type === 'not_found') {
    // Genuinely missing profile in Firestore.
    // Return empty draft for onboarding completion. Never silently save random defaults.
    const emptyDraft: LocalStudentAccount = {
      id: uid,
      fullName: displayName,
      email,
      age: '',
      classGrade: '',
      schoolName: '',
      completedReflections: 0,
      totalReflections: 13,
      badge: 'Student',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
    return {
      profile: emptyDraft,
      isComplete: false,
      isExistingInFirestore: false,
    };
  }

  // outcome.type === 'found'
  const existing = outcome.profile;
  const isComplete = isStudentProfileComplete(existing);

  // If complete, update lastLoginAt safely in background
  if (isComplete) {
    saveStudentProfileOutcome({
      ...existing,
      lastLoginAt: new Date().toISOString(),
    }).catch(() => {});
  }

  return {
    profile: existing,
    isComplete,
    isExistingInFirestore: true,
  };
}

// ============================================================================
// SINGLE SOURCE OF TRUTH: onAuthStateChanged
// ============================================================================
onAuthStateChanged(auth, async (firebaseUser: User | null) => {
  firestoreAuthError = null;

  if (firebaseUser) {
    try {
      // 1. Check if user is the designated Admin or authorized administrator
      const isAdmin = await verifyAdminStatus(firebaseUser);
      if (isAdmin) {
        activeAdmin = buildAdminAccount(firebaseUser);
        activeStudent = null;
        authReady = true;
        notifyAdminListeners();
        notifyStudentListeners();
        return;
      }

      // 2. Resolve student profile from Firestore
      const resolution = await resolveStudentProfile(firebaseUser);
      activeAdmin = null;

      if (resolution.firestoreError) {
        firestoreAuthError = resolution.firestoreError;
        // Keep in memory draft but marked incomplete so student is not granted invalid dashboard access
        activeStudent = resolution.profile;
      } else {
        activeStudent = resolution.profile;
      }
    } catch (err) {
      console.error('Error synchronizing user on auth state change:', err);
      firestoreAuthError = { code: 'sync-failed', message: 'Failed to synchronize user session.' };
      activeStudent = {
        id: firebaseUser.uid,
        fullName: firebaseUser.displayName || '',
        classGrade: '',
        schoolName: '',
        age: '',
        email: (firebaseUser.email || '').toLowerCase(),
        completedReflections: 0,
        totalReflections: 13,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      activeAdmin = null;
    }
  } else {
    activeStudent = null;
    activeAdmin = null;
  }

  authReady = true;
  notifyStudentListeners();
  notifyAdminListeners();
});

// Safety fallback: Ensure authReady never stays false indefinitely if Firebase Auth resolution is delayed
if (typeof window !== 'undefined') {
  setTimeout(() => {
    if (!authReady) {
      authReady = true;
      notifyStudentListeners();
      notifyAdminListeners();
    }
  }, 1500);
}

/**
 * Normalizes Firebase auth error messages into user-friendly text.
 */
export function getFriendlyErrorMessage(err: unknown): string {
  if (!err || typeof err !== 'object') return 'An error occurred. Please try again.';
  const code = (err as { code?: string }).code || '';

  switch (code) {
    case 'auth/user-not-found':
      return 'No account found with this email. Please check your email or create an account.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please verify and try again.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completing.';
    case 'auth/cancelled-popup-request':
      return 'Sign-in request was cancelled. Please try again.';
    case 'auth/popup-blocked':
      return 'Popup was blocked by your browser. Please allow popups for this site and try again.';
    case 'auth/network-request-failed':
      return 'Network connection issue. Please check your internet connection.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled yet in your Firebase Console. Please verify Authentication settings.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a moment and try again.';
    case 'auth/unauthorized-domain': {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
      return `This domain (${hostname}) is not authorized yet for OAuth sign-in in your Firebase Console. Add "${hostname}" to Authentication > Settings > Authorized domains.`;
    }
    default:
      return (err as { message?: string }).message || 'Authentication could not be completed.';
  }
}

// ============================================================================
// STUDENT AUTHENTICATION ACTIONS
// ============================================================================

/**
 * 1. Sign In Student with Email and Password
 */
export async function signInStudentWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password;

  if (!cleanEmail) {
    return { success: false, error: 'Please enter your email address.' };
  }
  if (!cleanPassword) {
    return { success: false, error: 'Please enter your password.' };
  }

  try {
    const cred: UserCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);

    const isAdmin = await verifyAdminStatus(cred.user);
    if (isAdmin) {
      const admin = buildAdminAccount(cred.user);
      activeAdmin = admin;
      activeStudent = null;
      notifyAdminListeners();
      notifyStudentListeners();
      return { success: true, admin, requiresProfileCompletion: false };
    }

    const resolution = await resolveStudentProfile(cred.user);

    if (resolution.firestoreError) {
      return {
        success: false,
        errorCode: resolution.firestoreError.code,
        error: `Database access error (${resolution.firestoreError.code}): ${resolution.firestoreError.message}. Could not retrieve your student profile.`,
      };
    }

    activeStudent = resolution.profile;
    notifyStudentListeners();

    return {
      success: true,
      student: resolution.profile,
      requiresProfileCompletion: !resolution.isComplete,
    };
  } catch (fbErr: unknown) {
    const code = (fbErr as { code?: string })?.code;
    return {
      success: false,
      errorCode: code,
      error: getFriendlyErrorMessage(fbErr),
    };
  }
}

/**
 * 2. Sign In Student with Google Popup
 */
export async function signInStudentWithGoogle(): Promise<AuthResult> {
  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject({
          code: 'auth/popup-closed-by-user',
          message: 'Google sign-in popup was closed or timed out.',
        });
      }, 60000);
    });

    const cred: UserCredential = await Promise.race([
      signInWithPopup(auth, provider),
      timeoutPromise,
    ]);

    const user = cred.user;
    if (!user.email) {
      return {
        success: false,
        error: 'Unable to retrieve email from your Google account.',
      };
    }

    // Check if user is an Administrator
    const isAdmin = await verifyAdminStatus(user);
    if (isAdmin) {
      const admin = buildAdminAccount(user);
      activeAdmin = admin;
      activeStudent = null;
      notifyAdminListeners();
      notifyStudentListeners();
      return { success: true, admin, requiresProfileCompletion: false };
    }

    // Student: Retrieve profile outcome from Firestore
    const resolution = await resolveStudentProfile(user);

    if (resolution.firestoreError) {
      return {
        success: false,
        errorCode: resolution.firestoreError.code,
        error: `Database access error (${resolution.firestoreError.code}): ${resolution.firestoreError.message}. Could not retrieve your student profile.`,
      };
    }

    activeStudent = resolution.profile;
    notifyStudentListeners();

    return {
      success: true,
      student: resolution.profile,
      requiresProfileCompletion: !resolution.isComplete,
    };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    console.error('Google Sign-In failed:', err);
    return {
      success: false,
      errorCode: code,
      domain: currentDomain,
      error: getFriendlyErrorMessage(err),
    };
  }
}

/**
 * 3. Create Student Account with Email and Password
 * Returns with requiresProfileCompletion = true so student is routed to complete age, class, and school.
 */
export async function registerStudentWithEmail(
  fullName: string,
  email: string,
  password: string
): Promise<AuthResult> {
  const cleanName = fullName.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanName) {
    return { success: false, error: 'Please enter your full name.' };
  }
  if (!cleanEmail) {
    return { success: false, error: 'Please enter your email address.' };
  }
  if (!password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  try {
    const cred: UserCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    await updateProfile(cred.user, { displayName: cleanName });

    const now = new Date().toISOString();
    // Incomplete draft: MUST complete age, class, and school on onboarding screen
    const newStudent: LocalStudentAccount = {
      id: cred.user.uid,
      fullName: cleanName,
      age: '',
      classGrade: '',
      schoolName: '',
      email: cleanEmail,
      completedReflections: 0,
      totalReflections: 13,
      badge: 'Student',
      createdAt: now,
      lastLoginAt: now,
    };

    activeStudent = newStudent;
    notifyStudentListeners();

    return {
      success: true,
      student: newStudent,
      requiresProfileCompletion: true,
    };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    console.error('Registration failed:', err);
    return {
      success: false,
      errorCode: code,
      error: getFriendlyErrorMessage(err),
    };
  }
}

/**
 * 4. Completes student profile during initial onboarding and saves directly to Firestore.
 * Does not grant dashboard access unless Firestore write succeeds.
 */
export async function completeStudentProfile(details: {
  fullName: string;
  age: string;
  classGrade: string;
  schoolName: string;
}): Promise<{ success: boolean; student?: LocalStudentAccount; error?: string; errorCode?: string }> {
  const currentUid = auth.currentUser?.uid || activeStudent?.id;
  if (!currentUid) {
    return { success: false, error: 'No authenticated user session found. Please sign in again.' };
  }

  const cleanName = details.fullName.trim();
  const cleanAge = details.age.trim();
  const cleanClass = details.classGrade.trim();
  const cleanSchool = details.schoolName.trim();
  const email = (auth.currentUser?.email || activeStudent?.email || '').toLowerCase().trim();

  if (!cleanName) {
    return { success: false, error: 'Please enter your full name.' };
  }
  if (!cleanAge) {
    return { success: false, error: 'Please enter your age.' };
  }
  const ageNum = parseInt(cleanAge, 10);
  if (isNaN(ageNum) || ageNum < 8 || ageNum > 25) {
    return { success: false, error: 'Please enter a valid age between 8 and 25 years.' };
  }
  if (!cleanClass) {
    return { success: false, error: 'Please select your current class.' };
  }
  if (!cleanSchool) {
    return { success: false, error: 'Please enter or select your School / Institution Name.' };
  }
  if (KNOWN_PLACEHOLDER_SCHOOLS.includes(cleanSchool.toLowerCase())) {
    return { success: false, error: 'Please enter your actual School / Institution Name.' };
  }

  const completedStudent: LocalStudentAccount = {
    id: currentUid,
    fullName: cleanName,
    email,
    age: cleanAge,
    classGrade: cleanClass,
    schoolName: cleanSchool,
    phone: activeStudent?.phone || '',
    completedReflections: activeStudent?.completedReflections ?? 0,
    totalReflections: activeStudent?.totalReflections ?? 13,
    badge: cleanClass === 'Others' ? 'Student' : `Class ${cleanClass} Student`,
    createdAt: activeStudent?.createdAt || new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  // Save to Firestore using saveStudentProfileOutcome
  const saveResult = await saveStudentProfileOutcome(completedStudent);

  if (!saveResult.success) {
    const errOutcome = saveResult as { success: false; code: string; message: string };
    return {
      success: false,
      errorCode: errOutcome.code,
      error: `Could not save profile to database (${errOutcome.code}): ${errOutcome.message}. Please check your connection or contact administrator.`,
    };
  }

  // Update in-memory user only after successful server confirmation!
  activeStudent = saveResult.profile;
  notifyStudentListeners();

  return {
    success: true,
    student: saveResult.profile,
  };
}

/**
 * 5. Signs out active student from Firebase Auth
 */
export async function signOutStudent(): Promise<void> {
  try {
    await fbSignOut(auth);
  } catch (err) {
    console.warn('Firebase sign out warning:', err);
  }
  activeStudent = null;
  notifyStudentListeners();
}

/**
 * Password reset email via Firebase Auth
 */
export async function sendStudentPasswordResetEmail(
  email: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const clean = email.trim().toLowerCase();
  if (!clean) {
    return { success: false, error: 'Please enter your email address.' };
  }
  try {
    await fbSendPasswordResetEmail(auth, clean);
    return {
      success: true,
      message: `Password reset instructions have been sent to ${clean}. Please check your inbox.`,
    };
  } catch (err) {
    return {
      success: false,
      error: getFriendlyErrorMessage(err),
    };
  }
}

// ============================================================================
// ADMINISTRATOR AUTHENTICATION (AUTHENTICATED VIA FIREBASE AUTH)
// ============================================================================

/**
 * Signs in Administrator via Firebase Authentication with role verification.
 */
export async function loginAdmin(
  email: string,
  pass: string
): Promise<{ success: boolean; error?: string; admin?: AdminAccount }> {
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail || !pass) {
    return {
      success: false,
      error: 'Please enter both administrator email and password.',
    };
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    const isAdmin = await verifyAdminStatus(cred.user);

    if (!isAdmin) {
      await fbSignOut(auth);
      return {
        success: false,
        error: 'Access restricted: This account is not authorized as an administrator.',
      };
    }

    const admin = buildAdminAccount(cred.user);
    activeAdmin = admin;
    notifyAdminListeners();
    return { success: true, admin };
  } catch (err) {
    return {
      success: false,
      error: getFriendlyErrorMessage(err),
    };
  }
}

/**
 * Signs in Administrator via Google Popup with role verification.
 */
export async function loginAdminWithGoogle(): Promise<{
  success: boolean;
  error?: string;
  admin?: AdminAccount;
}> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);

    const isAdmin = await verifyAdminStatus(cred.user);
    if (!isAdmin) {
      await fbSignOut(auth);
      return {
        success: false,
        error: `Access restricted: Account ${cred.user.email} is not authorized as an administrator.`,
      };
    }

    const admin = buildAdminAccount(cred.user);
    activeAdmin = admin;
    notifyAdminListeners();
    return { success: true, admin };
  } catch (err) {
    return {
      success: false,
      error: getFriendlyErrorMessage(err),
    };
  }
}

/**
 * Signs out Administrator
 */
export async function signOutAdmin(): Promise<void> {
  try {
    await fbSignOut(auth);
  } catch (err) {
    console.warn('Admin sign out error:', err);
  }
  activeAdmin = null;
  notifyAdminListeners();
}

// ============================================================================
// STATE GETTERS & SUBSCRIPTIONS
// ============================================================================

export function getCurrentStudent(): LocalStudentAccount | null {
  return activeStudent;
}

export function getCurrentAdmin(): AdminAccount | null {
  return activeAdmin;
}

export function getCurrentFirebaseUser(): User | null {
  return auth.currentUser;
}

export function isAuthenticationReady(): boolean {
  return authReady;
}

export function getFirestoreAuthError(): { code: string; message: string } | null {
  return firestoreAuthError;
}

/**
 * Subscribes to student auth state changes. Immediately invokes callback with current state.
 */
export function onAuthChange(
  callback: (student: LocalStudentAccount | null, isReady: boolean) => void
): () => void {
  studentListeners.add(callback);
  callback(activeStudent, authReady);

  return () => {
    studentListeners.delete(callback);
  };
}

/**
 * Subscribes to admin auth state changes. Immediately invokes callback with current state.
 */
export function onAdminAuthChange(
  callback: (admin: AdminAccount | null, isReady: boolean) => void
): () => void {
  adminListeners.add(callback);
  callback(activeAdmin, authReady);

  return () => {
    adminListeners.delete(callback);
  };
}

/**
 * Updates editable student profile fields (Age and Class only) in Firestore and memory.
 * Preserves registered Name and School.
 */
export async function updateStudentProfile(updates: {
  age: string;
  classGrade: string;
}): Promise<{ success: boolean; student?: LocalStudentAccount; error?: string; errorCode?: string }> {
  if (!activeStudent) {
    return { success: false, error: 'No active student session found.' };
  }

  const cleanAge = updates.age.trim();
  const cleanClass = updates.classGrade.trim();
  if (!cleanAge) {
    return { success: false, error: 'Please enter a valid age.' };
  }
  const ageNum = parseInt(cleanAge, 10);
  if (isNaN(ageNum) || ageNum < 8 || ageNum > 25) {
    return { success: false, error: 'Please enter a valid age between 8 and 25 years.' };
  }
  if (!cleanClass) {
    return { success: false, error: 'Please select your class.' };
  }

  const updated: LocalStudentAccount = {
    ...activeStudent,
    age: cleanAge,
    classGrade: cleanClass,
    badge: cleanClass === 'Others' ? 'Student' : `Class ${cleanClass} Student`,
    lastLoginAt: new Date().toISOString(),
  };

  const saveResult = await saveStudentProfileOutcome(updated);

  if (!saveResult.success) {
    const errOutcome = saveResult as { success: false; code: string; message: string };
    return {
      success: false,
      errorCode: errOutcome.code,
      error: `Could not save updated profile (${errOutcome.code}): ${errOutcome.message}.`,
    };
  }

  activeStudent = saveResult.profile;
  notifyStudentListeners();

  return { success: true, student: saveResult.profile };
}

/**
 * Syncs student profile from Questionnaire About Me Part 1 responses without fake defaults.
 */
export function syncStudentProfileFromPart1(
  answers: Record<number, string | string[]>
): LocalStudentAccount {
  const nameVal = typeof answers[1] === 'string' ? answers[1].trim() : '';
  const ageVal = typeof answers[2] === 'string' ? answers[2].trim() : '';
  const rawClass = answers[3];
  const classVal =
    typeof rawClass === 'string'
      ? rawClass.trim()
      : Array.isArray(rawClass) && rawClass.length > 0
      ? rawClass[0].trim()
      : '';
  const schoolVal = typeof answers[4] === 'string' ? answers[4].trim() : '';

  const uid = auth.currentUser?.uid || activeStudent?.id || `student_${Date.now()}`;
  const now = new Date().toISOString();

  const updated: LocalStudentAccount = {
    id: uid,
    fullName: nameVal || activeStudent?.fullName || auth.currentUser?.displayName || '',
    age: ageVal || activeStudent?.age || '',
    classGrade: classVal || activeStudent?.classGrade || '',
    schoolName: schoolVal || activeStudent?.schoolName || '',
    email: activeStudent?.email || auth.currentUser?.email || '',
    phone: activeStudent?.phone,
    completedReflections: activeStudent?.completedReflections ?? 1,
    totalReflections: activeStudent?.totalReflections ?? 13,
    badge: classVal ? `Class ${classVal} Student` : activeStudent?.badge || 'Student',
    createdAt: activeStudent?.createdAt || now,
    lastLoginAt: now,
  };

  if (isStudentProfileComplete(updated)) {
    saveStudentProfileOutcome(updated).catch(() => {});
  }

  activeStudent = updated;
  notifyStudentListeners();

  return updated;
}
