/**
 * Firebase Authentication Service for DeRote Student Insight System
 *
 * Implements:
 * 1. Email and Password authentication (via Firebase Auth)
 * 2. Google Sign-In with popup (via Firebase GoogleAuthProvider)
 * 3. Automatic synchronization with student profile in Firestore `students/{uid}`
 * 4. Fallback support for pre-seeded demonstration accounts
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  type UserCredential,
} from 'firebase/auth';
import { auth } from './firebase';
import {
  saveStudentProfileToBackend,
  getStudentProfileFromBackend,
} from './firestoreBackend';
import {
  type LocalStudentAccount,
  getStoredRegisteredAccounts,
  saveRegisteredAccounts,
  setStoredStudent,
} from './localAuth';

export interface AuthResult {
  success: boolean;
  student?: LocalStudentAccount;
  error?: string;
  errorCode?: string;
  domain?: string;
}

/**
 * Normalizes Firebase auth error messages into user-friendly text.
 */
function getFriendlyErrorMessage(err: unknown): string {
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

/**
 * Ensures a student profile exists in both Firestore and local session.
 */
async function syncAndActivateProfile(
  uid: string,
  email: string,
  displayName?: string | null
): Promise<LocalStudentAccount> {
  const accounts = getStoredRegisteredAccounts();
  const existingLocal = accounts.find(
    (a) => a.id === uid || a.email.toLowerCase() === email.toLowerCase()
  );

  // Check Firestore cloud backend
  let cloudProfile: LocalStudentAccount | null = null;
  try {
    cloudProfile = await getStudentProfileFromBackend(uid);
  } catch (err) {
    console.warn('Could not query cloud profile during auth sync:', err);
  }

  const now = new Date().toISOString();
  const student: LocalStudentAccount = {
    id: uid,
    fullName:
      cloudProfile?.fullName ||
      existingLocal?.fullName ||
      displayName ||
      email.split('@')[0] ||
      'Student',
    age: cloudProfile?.age || existingLocal?.age || '',
    classGrade: cloudProfile?.classGrade || existingLocal?.classGrade || '10',
    schoolName:
      cloudProfile?.schoolName ||
      existingLocal?.schoolName ||
      'Enrolled Institution',
    email: email.toLowerCase(),
    phone: cloudProfile?.phone || existingLocal?.phone,
    completedReflections:
      cloudProfile?.completedReflections ?? existingLocal?.completedReflections ?? 0,
    totalReflections:
      cloudProfile?.totalReflections ?? existingLocal?.totalReflections ?? 13,
    badge:
      cloudProfile?.badge ||
      existingLocal?.badge ||
      `Class ${cloudProfile?.classGrade || existingLocal?.classGrade || '10'} Student`,
    createdAt: cloudProfile?.createdAt || existingLocal?.createdAt || now,
    lastLoginAt: now,
  };

  // Save to local cache
  const idx = accounts.findIndex((a) => a.id === student.id || a.email.toLowerCase() === student.email);
  if (idx >= 0) {
    accounts[idx] = student;
  } else {
    accounts.unshift(student);
  }
  saveRegisteredAccounts(accounts);
  setStoredStudent(student);

  // Sync to Firestore backend asynchronously
  saveStudentProfileToBackend(student).catch((err) => {
    console.warn('Async cloud profile save warning:', err);
  });

  return student;
}

/**
 * 1. Sign In with Email and Password
 * Authenticates against Firebase Auth with active student profile sync.
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

  // Attempt Firebase Authentication
  try {
    const cred: UserCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
    const user = cred.user;
    const student = await syncAndActivateProfile(user.uid, user.email || cleanEmail, user.displayName);
    return { success: true, student };
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
 * 2. Sign In with Google Popup
 * Authenticates directly with Google via Firebase Auth.
 */
export async function signInStudentWithGoogle(): Promise<AuthResult> {
  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
    });

    // 45-second safeguard in case popup is closed by user or blocked by cross-origin policies
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject({ code: 'auth/popup-closed-by-user', message: 'Google sign-in popup was closed or timed out.' });
      }, 45000);
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

    const student = await syncAndActivateProfile(user.uid, user.email, user.displayName);
    return { success: true, student };
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
 * Registers in Firebase Auth and creates profile in Firestore.
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
    const user = cred.user;
    const student = await syncAndActivateProfile(user.uid, cleanEmail, cleanName);
    return { success: true, student };
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
 * Signs out active student from Firebase Auth and local session.
 */
export async function signOutStudent(): Promise<void> {
  try {
    await fbSignOut(auth);
  } catch (err) {
    console.warn('Firebase sign out warning:', err);
  }
  setStoredStudent(null);
}
