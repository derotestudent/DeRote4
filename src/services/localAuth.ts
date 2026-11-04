/**
 * Local Authentication Service for DeRote Student Insight System
 *
 * Fully standalone local storage auth service:
 * - Instant, private client-side account management
 * - Zero external cloud service dependencies (pure browser-local storage)
 */

export interface LocalStudentAccount {
  id: string;
  fullName: string;
  age?: string;
  classGrade: string;
  schoolName: string;
  email: string;
  phone?: string;
  password?: string;
  isSyntheticEmail?: boolean;
  completedReflections?: number;
  totalReflections?: number;
  badge?: string;
  createdAt: string;
  lastLoginAt: string;
}

const STORAGE_KEY_STUDENT = 'derote_active_student_session_v1';
const LEGACY_STORAGE_KEY = 'derote_student_session_v1';
const STORAGE_KEY_ACCOUNTS = 'derote_registered_students_v2';
export const STUDENT_AUTH_STATE_EVENT = 'derote_student_auth_changed';

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

/**
 * Pre-seeded student records for demo and rich cohort display
 */
const INITIAL_STUDENT_ACCOUNTS: LocalStudentAccount[] = [
  {
    id: 'student_demo_01',
    fullName: 'Aarav Sharma',
    age: '15',
    classGrade: '10',
    schoolName: 'Delhi Public School, R.K. Puram',
    email: 'student@derote.in',
    phone: '9876543210',
    password: 'student123',
    completedReflections: 1,
    totalReflections: 14,
    badge: 'Class 10 Student',
    createdAt: '2026-10-15T09:30:00.000Z',
    lastLoginAt: '2026-11-04T08:00:00.000Z',
  },
  {
    id: 'student_seed_02',
    fullName: 'Diya Patel',
    age: '14',
    classGrade: '9',
    schoolName: 'The Mother\'s International School',
    email: 'diya@derote.in',
    phone: '9876543211',
    password: 'password123',
    completedReflections: 1,
    totalReflections: 14,
    badge: 'Class 9 Student',
    createdAt: '2026-10-18T11:15:00.000Z',
    lastLoginAt: '2026-11-03T14:20:00.000Z',
  },
  {
    id: 'student_seed_03',
    fullName: 'Rohan Verma',
    age: '16',
    classGrade: '10',
    schoolName: 'Sanskriti School, Chanakyapuri',
    email: 'rohan@derote.in',
    phone: '9876543212',
    password: 'password123',
    completedReflections: 1,
    totalReflections: 14,
    badge: 'Class 10 Student',
    createdAt: '2026-10-20T10:00:00.000Z',
    lastLoginAt: '2026-11-02T16:45:00.000Z',
  },
  {
    id: 'student_seed_04',
    fullName: 'Ananya Iyer',
    age: '13',
    classGrade: '8',
    schoolName: 'Modern School, Barakhamba Road',
    email: 'ananya@derote.in',
    phone: '9876543213',
    password: 'password123',
    completedReflections: 0,
    totalReflections: 14,
    badge: 'Class 8 Student',
    createdAt: '2026-10-25T13:40:00.000Z',
    lastLoginAt: '2026-11-01T09:10:00.000Z',
  },
];

export function getStoredRegisteredAccounts(): LocalStudentAccount[] {
  try {
    if (typeof localStorage === 'undefined') return INITIAL_STUDENT_ACCOUNTS;
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(INITIAL_STUDENT_ACCOUNTS));
      return INITIAL_STUDENT_ACCOUNTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure demo account is always present
      const hasDemo = parsed.some((acc) => acc.email === 'student@derote.in');
      if (!hasDemo) {
        parsed.unshift(INITIAL_STUDENT_ACCOUNTS[0]);
        localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(parsed));
      }
      return parsed;
    }
    return INITIAL_STUDENT_ACCOUNTS;
  } catch {
    return INITIAL_STUDENT_ACCOUNTS;
  }
}

export function saveRegisteredAccounts(accounts: LocalStudentAccount[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
    }
  } catch (err) {
    console.warn('Failed to save registered student accounts:', err);
  }
}

export function getCurrentStudent(): LocalStudentAccount | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY_STUDENT);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredStudent(student: LocalStudentAccount | null): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (student) {
      localStorage.setItem(STORAGE_KEY_STUDENT, JSON.stringify(student));
      localStorage.setItem(
        LEGACY_STORAGE_KEY,
        JSON.stringify({
          id: student.id,
          fullName: student.fullName,
          classGrade: student.classGrade,
          schoolName: student.schoolName,
          phone: student.phone,
        })
      );
    } else {
      localStorage.removeItem(STORAGE_KEY_STUDENT);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch (err) {
    console.warn('Failed to update student session storage:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STUDENT_AUTH_STATE_EVENT, { detail: { student } }));
  }
}

export function onLocalAuthChange(
  callback: (student: LocalStudentAccount | null) => void
): () => void {
  callback(getCurrentStudent());

  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent;
    if (custom.detail === undefined) {
      callback(getCurrentStudent());
    } else {
      callback(custom.detail.student);
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY_STUDENT) {
      callback(getCurrentStudent());
    }
  };

  window.addEventListener(STUDENT_AUTH_STATE_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(STUDENT_AUTH_STATE_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

/**
 * Simplified Sign In:
 * Supports email and/or registered mobile number plus password.
 */
export async function loginStudent(
  identifier: string,
  password: string,
  mobileField?: string
): Promise<{ success: boolean; student?: LocalStudentAccount; error?: string }> {
  const cleanId = identifier.trim().toLowerCase();
  const cleanMobile = mobileField ? normalizePhoneNumber(mobileField) : '';
  const cleanPass = password;

  if (!cleanId && !cleanMobile) {
    return { success: false, error: 'Please enter your email or registered mobile number.' };
  }
  if (!cleanPass) {
    return { success: false, error: 'Please enter your password.' };
  }

  const accounts = getStoredRegisteredAccounts();
  const idDigits = normalizePhoneNumber(cleanId);

  const matched = accounts.find((acc) => {
    const accEmail = (acc.email || '').toLowerCase();
    const accPhone = normalizePhoneNumber(acc.phone || '');

    // Match by email
    const emailMatch = cleanId.includes('@') && accEmail === cleanId;

    // Match by mobile entered in primary field
    const primaryPhoneMatch = idDigits.length >= 10 && accPhone === idDigits;

    // Match by mobile entered in dedicated mobile field
    const secondaryPhoneMatch = cleanMobile.length >= 10 && accPhone === cleanMobile;

    return emailMatch || primaryPhoneMatch || secondaryPhoneMatch;
  });

  if (!matched) {
    return {
      success: false,
      error: 'No student account found with the provided credentials. Please check details or create an account.',
    };
  }

  if (matched.password && matched.password !== cleanPass) {
    return {
      success: false,
      error: 'Incorrect password. Please verify and try again.',
    };
  }

  const now = new Date().toISOString();
  const updatedStudent: LocalStudentAccount = {
    ...matched,
    lastLoginAt: now,
  };

  // Update in accounts store
  const updatedAccounts = accounts.map((acc) =>
    acc.id === matched.id ? updatedStudent : acc
  );
  saveRegisteredAccounts(updatedAccounts);

  setStoredStudent(updatedStudent);
  return { success: true, student: updatedStudent };
}

/**
 * Simplified Account Creation:
 * Name, Email or Phone, Password, and Confirm Password.
 */
export async function createStudentAccount(data: {
  fullName: string;
  emailOrPhone: string;
  password: string;
  classGrade?: string;
  schoolName?: string;
}): Promise<{ success: boolean; student?: LocalStudentAccount; error?: string }> {
  const fullName = data.fullName.trim();
  const rawContact = data.emailOrPhone.trim();
  const password = data.password;

  if (!fullName) {
    return { success: false, error: 'Please enter your name.' };
  }
  if (!rawContact) {
    return { success: false, error: 'Please enter your email address or phone number.' };
  }
  if (!password || password.length < 4) {
    return { success: false, error: 'Password must be at least 4 characters long.' };
  }

  const isEmail = rawContact.includes('@');
  const digits = normalizePhoneNumber(rawContact);

  let email = isEmail ? rawContact.toLowerCase() : '';
  let phone = !isEmail && digits.length >= 10 ? digits : '';

  if (isEmail && !isValidEmail(email)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }
  if (!isEmail && digits.length < 10) {
    return { success: false, error: 'Please enter a valid 10-digit phone number or email address.' };
  }

  const accounts = getStoredRegisteredAccounts();

  // Check for duplicate account
  const exists = accounts.some((acc) => {
    if (email && (acc.email || '').toLowerCase() === email) return true;
    if (phone && normalizePhoneNumber(acc.phone || '') === phone) return true;
    return false;
  });

  if (exists) {
    return {
      success: false,
      error: 'An account with this email address or phone number already exists. Please sign in.',
    };
  }

  const now = new Date().toISOString();
  const newId = `student_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const defaultClass = data.classGrade || 'Class 9';
  const defaultSchool = data.schoolName || 'Enrolled School';

  const newStudent: LocalStudentAccount = {
    id: newId,
    fullName,
    classGrade: defaultClass,
    schoolName: defaultSchool,
    email: email || `${phone}@student.local`,
    phone: phone || undefined,
    password,
    completedReflections: 0,
    totalReflections: 14,
    badge: `${defaultClass} Student`,
    createdAt: now,
    lastLoginAt: now,
  };

  accounts.unshift(newStudent);
  saveRegisteredAccounts(accounts);
  setStoredStudent(newStudent);

  return { success: true, student: newStudent };
}

export async function updateStudentProfile(
  studentId: string,
  updates: Partial<LocalStudentAccount>
): Promise<{ success: boolean; student?: LocalStudentAccount; error?: string }> {
  try {
    const current = getCurrentStudent();
    if (!current || current.id !== studentId) {
      return { success: false, error: 'Student session not found or unauthorized.' };
    }

    const updated: LocalStudentAccount = {
      ...current,
      ...(updates.fullName ? { fullName: updates.fullName.trim() } : {}),
      ...(updates.classGrade ? { classGrade: updates.classGrade.trim() } : {}),
      ...(updates.schoolName ? { schoolName: updates.schoolName.trim() } : {}),
      ...(updates.phone !== undefined ? { phone: updates.phone.trim() } : {}),
    };

    const accounts = getStoredRegisteredAccounts();
    const updatedAccounts = accounts.map((acc) => (acc.id === studentId ? { ...acc, ...updated } : acc));
    saveRegisteredAccounts(updatedAccounts);

    setStoredStudent(updated);
    return { success: true, student: updated };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update profile.';
    return { success: false, error: msg };
  }
}

export async function sendStudentPasswordResetEmail(
  emailOrMobile: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const raw = emailOrMobile.trim();
  if (!raw) {
    return { success: false, error: 'Please enter your email address to receive password instructions.' };
  }
  return {
    success: true,
    message: `Password recovery instructions have been noted for ${raw}.`,
  };
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

  const updated: LocalStudentAccount = {
    ...current,
    email: clean,
  };

  const accounts = getStoredRegisteredAccounts();
  const updatedAccounts = accounts.map((acc) => (acc.id === current.id ? updated : acc));
  saveRegisteredAccounts(updatedAccounts);
  setStoredStudent(updated);

  return {
    success: true,
    requiresVerification: false,
    message: `Your login email has been updated to ${clean}.`,
  };
}

export async function logoutStudent(): Promise<void> {
  setStoredStudent(null);
}

/**
 * Creates or updates a student profile strictly using About Me Part 1 information:
 * - Q1: Name
 * - Q2: Age
 * - Q3: Class (8, 9, 10, 11, 12, Others)
 * - Q4: School and Institute
 * Part 2 or later questions are explicitly NOT used to build the student profile.
 */
export function syncStudentProfileFromPart1(
  answers: Record<number, string | string[]>
): LocalStudentAccount {
  const existing = getCurrentStudent();
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

  const studentId = existing?.id || `student_${Date.now()}`;
  const now = new Date().toISOString();

  const updated: LocalStudentAccount = {
    id: studentId,
    fullName: nameVal || existing?.fullName || 'Student',
    age: ageVal || existing?.age || '',
    classGrade: classVal || existing?.classGrade || '10',
    schoolName: schoolVal || existing?.schoolName || 'General Institute',
    email: existing?.email || `student_${studentId.slice(-6)}@derote.in`,
    phone: existing?.phone,
    password: existing?.password || 'student123',
    isSyntheticEmail: existing?.isSyntheticEmail ?? true,
    completedReflections: existing?.completedReflections ?? 1,
    totalReflections: existing?.totalReflections ?? 14,
    badge: classVal ? `Class ${classVal} Student` : existing?.badge || 'Student',
    createdAt: existing?.createdAt || now,
    lastLoginAt: now,
  };

  setStoredStudent(updated);

  const accounts = getStoredRegisteredAccounts();
  const idx = accounts.findIndex((acc) => acc.id === studentId);
  if (idx >= 0) {
    accounts[idx] = updated;
  } else {
    accounts.unshift(updated);
  }
  saveRegisteredAccounts(accounts);

  return updated;
}

