import test from 'node:test';
import assert from 'node:assert/strict';

// Constants under test
const DESIGNATED_ADMIN_UID = 'VIwgfF6Q2FTDPDQwkRECSjpwbc32';
const STUDENT_A_UID = 'student_uid_alice_123';
const STUDENT_B_UID = 'student_uid_bob_456';

const VALID_AGES = [
  '8', '9', '10', '11', '12', '13', '14', '15',
  '16', '17', '18', '19', '20', '21', '22', '23', '24', '25'
];

// Canonical classes for all new profile registrations
const CANONICAL_CLASSES = ['8', '9', '10', '11', '12', 'Higher'];
// Supported classes including legacy
const SUPPORTED_CLASSES = ['8', '9', '10', '11', '12', 'Higher', 'Others'];

const VALID_QUESTION_KEYS = Array.from({ length: 64 }, (_, i) => String(i + 1));

const ALLOWED_STUDENT_CREATE_KEYS = [
  'id', 'fullName', 'email', 'age', 'classGrade', 'schoolName',
  'phone', 'completedReflections', 'totalReflections', 'badge',
  'createdAt', 'lastLoginAt', 'updatedAt'
];

const ALLOWED_DRAFT_KEYS = [
  'studentId', 'answers', 'currentSection', 'version', 'updatedAt'
];

const ALLOWED_SUBMISSION_KEYS = [
  'studentId', 'answers', 'version', 'submittedAt', 'updatedAt'
];

interface AuthContext {
  uid: string | null;
  token?: {
    email?: string;
  };
}

// MapDiff simulation in TypeScript
function computeAffectedKeys(incoming: Record<string, any>, existing: Record<string, any>): string[] {
  const allKeys = new Set([...Object.keys(incoming), ...Object.keys(existing)]);
  const affected: string[] = [];
  for (const k of allKeys) {
    if (!(k in existing) || !(k in incoming) || incoming[k] !== existing[k]) {
      affected.push(k);
    }
  }
  return affected;
}

function hasOnly(keys: string[], allowlist: string[]): boolean {
  return keys.every((k) => allowlist.includes(k));
}

function hasAll(keys: string[], required: string[]): boolean {
  return required.every((r) => keys.includes(r));
}

// Logic implementations mirroring refined firestore.rules functions
function isSignedIn(auth: AuthContext | null): boolean {
  return auth !== null && auth.uid !== null;
}

function isAdmin(auth: AuthContext | null): boolean {
  return isSignedIn(auth) && auth!.uid === DESIGNATED_ADMIN_UID;
}

function isOwner(auth: AuthContext | null, studentId: string): boolean {
  return isSignedIn(auth) && auth!.uid === studentId;
}

function isValidAge(age: unknown): boolean {
  return typeof age === 'string' && VALID_AGES.includes(age);
}

function isValidNewClassGrade(grade: unknown): boolean {
  return typeof grade === 'string' && CANONICAL_CLASSES.includes(grade);
}

function isValidClassGrade(grade: unknown): boolean {
  return typeof grade === 'string' && SUPPORTED_CLASSES.includes(grade);
}

function isValidAnswersMap(answers: unknown): boolean {
  if (typeof answers !== 'object' || answers === null || Array.isArray(answers)) {
    return false;
  }
  const keys = Object.keys(answers as Record<string, any>);
  return keys.length <= 64 && hasOnly(keys, VALID_QUESTION_KEYS);
}

// Rule match evaluators
function evaluateStudentRead(auth: AuthContext | null, studentId: string): 'ALLOW' | 'DENY' {
  if (isOwner(auth, studentId) || isAdmin(auth)) return 'ALLOW';
  return 'DENY';
}

function evaluateStudentList(auth: AuthContext | null): 'ALLOW' | 'DENY' {
  if (isAdmin(auth)) return 'ALLOW';
  return 'DENY';
}

function evaluateStudentCreate(
  auth: AuthContext | null,
  studentId: string,
  data: Record<string, any>
): 'ALLOW' | 'DENY' {
  if (!isOwner(auth, studentId)) return 'DENY';

  const dataKeys = Object.keys(data);
  const required = ['id', 'fullName', 'email', 'age', 'classGrade', 'schoolName'];

  // Email ownership check: must match auth token email
  const tokenEmail = auth?.token?.email?.toLowerCase().trim();
  const dataEmail = typeof data.email === 'string' ? data.email.toLowerCase().trim() : '';

  if (
    hasAll(dataKeys, required) &&
    hasOnly(dataKeys, ALLOWED_STUDENT_CREATE_KEYS) &&
    data.id === studentId &&
    data.id === auth?.uid &&
    typeof data.fullName === 'string' &&
    data.fullName.length > 0 &&
    data.fullName.length <= 128 &&
    typeof data.email === 'string' &&
    data.email.length > 0 &&
    data.email.length <= 128 &&
    tokenEmail !== undefined &&
    tokenEmail.length > 0 &&
    dataEmail === tokenEmail &&
    isValidAge(data.age) &&
    isValidNewClassGrade(data.classGrade) &&
    typeof data.schoolName === 'string' &&
    data.schoolName.length > 0 &&
    data.schoolName.length <= 200 &&
    (!('completedReflections' in data) || data.completedReflections === 0) &&
    (!('totalReflections' in data) || data.totalReflections === 13) &&
    !('lastSubmittedAt' in data)
  ) {
    return 'ALLOW';
  }
  return 'DENY';
}

function evaluateStudentUpdate(
  auth: AuthContext | null,
  studentId: string,
  incoming: Record<string, any>,
  existing: Record<string, any>
): 'ALLOW' | 'DENY' {
  if (isAdmin(auth)) {
    const incomingKeys = Object.keys(incoming);
    if (
      hasOnly(incomingKeys, ALLOWED_STUDENT_CREATE_KEYS) &&
      incoming.id === existing.id &&
      incoming.id === studentId &&
      typeof incoming.fullName === 'string' &&
      typeof incoming.schoolName === 'string' &&
      isValidAge(incoming.age) &&
      isValidClassGrade(incoming.classGrade)
    ) {
      return 'ALLOW';
    }
    return 'DENY';
  }

  if (isOwner(auth, studentId)) {
    const affected = computeAffectedKeys(incoming, existing);
    const hasOnlyAllowed = hasOnly(affected, ['age', 'classGrade', 'updatedAt']);

    const validClass =
      isValidNewClassGrade(incoming.classGrade) ||
      (incoming.classGrade === existing.classGrade && isValidClassGrade(incoming.classGrade));

    if (
      hasOnlyAllowed &&
      isValidAge(incoming.age) &&
      validClass &&
      (!('updatedAt' in incoming) || typeof incoming.updatedAt === 'string')
    ) {
      return 'ALLOW';
    }
    return 'DENY';
  }

  return 'DENY';
}

function evaluateDraftCreate(
  auth: AuthContext | null,
  studentId: string,
  hasSubmission: boolean,
  data: Record<string, any>
): 'ALLOW' | 'DENY' {
  if (!isOwner(auth, studentId) || hasSubmission) return 'DENY';

  const dataKeys = Object.keys(data);
  if (
    hasAll(dataKeys, ['studentId', 'answers', 'currentSection']) &&
    hasOnly(dataKeys, ALLOWED_DRAFT_KEYS) &&
    data.studentId === studentId &&
    isValidAnswersMap(data.answers) &&
    typeof data.currentSection === 'number' &&
    Number.isInteger(data.currentSection) &&
    data.currentSection >= 0 &&
    data.currentSection <= 14
  ) {
    return 'ALLOW';
  }
  return 'DENY';
}

function evaluateSubmissionCreate(
  auth: AuthContext | null,
  studentId: string,
  hasExistingSubmission: boolean,
  data: Record<string, any>
): 'ALLOW' | 'DENY' {
  if (!isOwner(auth, studentId) || hasExistingSubmission) return 'DENY';

  const dataKeys = Object.keys(data);
  if (
    hasAll(dataKeys, ['studentId', 'answers', 'version', 'submittedAt']) &&
    hasOnly(dataKeys, ALLOWED_SUBMISSION_KEYS) &&
    data.studentId === studentId &&
    isValidAnswersMap(data.answers) &&
    typeof data.version === 'number' &&
    typeof data.submittedAt === 'string'
  ) {
    return 'ALLOW';
  }
  return 'DENY';
}

function evaluateQuestionnaireGet(auth: AuthContext | null, docId: string): 'ALLOW' | 'DENY' {
  if (isAdmin(auth)) return 'ALLOW';
  if (isSignedIn(auth) && docId === 'default_v1') return 'ALLOW';
  return 'DENY';
}

function evaluateQuestionnaireList(auth: AuthContext | null): 'ALLOW' | 'DENY' {
  if (isAdmin(auth)) return 'ALLOW';
  return 'DENY';
}

// ---------------------------------------------------------------------------
// TEST SUITE: Hardened Verification & Invariants
// ---------------------------------------------------------------------------

test('1. Student A reads Student A profile: ALLOW', () => {
  const auth = { uid: STUDENT_A_UID };
  assert.equal(evaluateStudentRead(auth, STUDENT_A_UID), 'ALLOW');
});

test('2. Student A reads Student B profile: DENY', () => {
  const auth = { uid: STUDENT_A_UID };
  assert.equal(evaluateStudentRead(auth, STUDENT_B_UID), 'DENY');
});

test('3. Student A edits Student B profile: DENY', () => {
  const auth = { uid: STUDENT_A_UID };
  const existing = { id: STUDENT_B_UID, fullName: 'Bob', age: '15', classGrade: '10' };
  const incoming = { ...existing, age: '16' };
  assert.equal(evaluateStudentUpdate(auth, STUDENT_B_UID, incoming, existing), 'DENY');
});

test('4. Student A edits Student A profile touching ONLY age, classGrade, updatedAt: ALLOW', () => {
  const auth = { uid: STUDENT_A_UID };
  const existing = {
    id: STUDENT_A_UID,
    fullName: 'Alice',
    email: 'alice@derote.in',
    age: '15',
    classGrade: '10',
    schoolName: 'Delhi Public School',
    createdAt: '2026-01-01T00:00:00.000Z',
    completedReflections: 0,
  };
  const incoming = {
    ...existing,
    age: '16',
    classGrade: '11',
    updatedAt: '2026-11-06T10:00:00.000Z',
  };
  assert.equal(evaluateStudentUpdate(auth, STUDENT_A_UID, incoming, existing), 'ALLOW');
});

test('5. Student A attempts to modify fullName or schoolName: DENY', () => {
  const auth = { uid: STUDENT_A_UID };
  const existing = {
    id: STUDENT_A_UID,
    fullName: 'Alice',
    email: 'alice@derote.in',
    age: '15',
    classGrade: '10',
    schoolName: 'Delhi Public School',
  };
  assert.equal(evaluateStudentUpdate(auth, STUDENT_A_UID, { ...existing, schoolName: 'Another School' }, existing), 'DENY');
  assert.equal(evaluateStudentUpdate(auth, STUDENT_A_UID, { ...existing, fullName: 'Alice Hacked' }, existing), 'DENY');
});

test('6. Student A attempts to inject arbitrary field on update: DENY', () => {
  const auth = { uid: STUDENT_A_UID };
  const existing = {
    id: STUDENT_A_UID,
    fullName: 'Alice',
    email: 'alice@derote.in',
    age: '15',
    classGrade: '10',
    schoolName: 'DPS',
  };
  const injected = { ...existing, age: '16', role: 'admin' };
  assert.equal(evaluateStudentUpdate(auth, STUDENT_A_UID, injected, existing), 'DENY');
});

test('7. Enforce age validation (8 to 25 accepted): ALLOW', () => {
  const auth = { uid: STUDENT_A_UID, token: { email: 'alice@derote.in' } };
  const validBase = {
    id: STUDENT_A_UID,
    fullName: 'Alice',
    email: 'alice@derote.in',
    classGrade: '10',
    schoolName: 'DPS',
  };
  assert.equal(evaluateStudentCreate(auth, STUDENT_A_UID, { ...validBase, age: '8' }), 'ALLOW');
  assert.equal(evaluateStudentCreate(auth, STUDENT_A_UID, { ...validBase, age: '15' }), 'ALLOW');
  assert.equal(evaluateStudentCreate(auth, STUDENT_A_UID, { ...validBase, age: '25' }), 'ALLOW');
});

test('8. Enforce age validation (out of range rejected): DENY', () => {
  const auth = { uid: STUDENT_A_UID, token: { email: 'alice@derote.in' } };
  const validBase = {
    id: STUDENT_A_UID,
    fullName: 'Alice',
    email: 'alice@derote.in',
    classGrade: '10',
    schoolName: 'DPS',
  };
  assert.equal(evaluateStudentCreate(auth, STUDENT_A_UID, { ...validBase, age: '7' }), 'DENY');
  assert.equal(evaluateStudentCreate(auth, STUDENT_A_UID, { ...validBase, age: '26' }), 'DENY');
  assert.equal(evaluateStudentCreate(auth, STUDENT_A_UID, { ...validBase, age: '-5' }), 'DENY');
  assert.equal(evaluateStudentCreate(auth, STUDENT_A_UID, { ...validBase, age: 'adult' }), 'DENY');
});

test('9. Canonical class values on new profile creation (8, 9, 10, 11, 12, Higher): ALLOW', () => {
  const auth = { uid: STUDENT_A_UID, token: { email: 'alice@derote.in' } };
  const validBase = {
    id: STUDENT_A_UID,
    fullName: 'Alice',
    email: 'alice@derote.in',
    age: '16',
    schoolName: 'DPS',
  };
  for (const c of ['8', '9', '10', '11', '12', 'Higher']) {
    assert.equal(evaluateStudentCreate(auth, STUDENT_A_UID, { ...validBase, classGrade: c }), 'ALLOW');
  }
});

test('10. New profile creation with non-canonical class "Others" is rejected: DENY', () => {
  const auth = { uid: STUDENT_A_UID, token: { email: 'alice@derote.in' } };
  const validBase = {
    id: STUDENT_A_UID,
    fullName: 'Alice',
    email: 'alice@derote.in',
    age: '16',
    schoolName: 'DPS',
  };
  assert.equal(evaluateStudentCreate(auth, STUDENT_A_UID, { ...validBase, classGrade: 'Others' }), 'DENY');
  assert.equal(evaluateStudentCreate(auth, STUDENT_A_UID, { ...validBase, classGrade: 'College' }), 'DENY');
});

test('11. Legacy profile with "Others" can preserve class on age update: ALLOW', () => {
  const auth = { uid: STUDENT_A_UID };
  const existing = {
    id: STUDENT_A_UID,
    fullName: 'Alice',
    email: 'alice@derote.in',
    age: '15',
    classGrade: 'Others', // Legacy record
    schoolName: 'DPS',
  };
  const incoming = { ...existing, age: '16' };
  assert.equal(evaluateStudentUpdate(auth, STUDENT_A_UID, incoming, existing), 'ALLOW');
});

test('12. Email ownership matching: email matches token email: ALLOW', () => {
  const auth = { uid: STUDENT_A_UID, token: { email: 'Alice@DeRote.in' } };
  const validPayload = {
    id: STUDENT_A_UID,
    fullName: 'Alice',
    email: 'alice@derote.in',
    age: '16',
    classGrade: '10',
    schoolName: 'DPS',
  };
  assert.equal(evaluateStudentCreate(auth, STUDENT_A_UID, validPayload), 'ALLOW');
});

test('13. Email ownership spoofing attempt rejected: DENY', () => {
  const auth = { uid: STUDENT_A_UID, token: { email: 'alice@derote.in' } };
  const spoofedPayload = {
    id: STUDENT_A_UID,
    fullName: 'Alice',
    email: 'victim@other.com', // Spoofed email
    age: '16',
    classGrade: '10',
    schoolName: 'DPS',
  };
  assert.equal(evaluateStudentCreate(auth, STUDENT_A_UID, spoofedPayload), 'DENY');
});

test('14. Server-managed fields on creation: invalid completedReflections (>0) rejected: DENY', () => {
  const auth = { uid: STUDENT_A_UID, token: { email: 'alice@derote.in' } };
  const base = {
    id: STUDENT_A_UID,
    fullName: 'Alice',
    email: 'alice@derote.in',
    age: '16',
    classGrade: '10',
    schoolName: 'DPS',
  };
  assert.equal(evaluateStudentCreate(auth, STUDENT_A_UID, { ...base, completedReflections: 5 }), 'DENY');
});

test('15. Server-managed fields on creation: invalid totalReflections (!= 13) rejected: DENY', () => {
  const auth = { uid: STUDENT_A_UID, token: { email: 'alice@derote.in' } };
  const base = {
    id: STUDENT_A_UID,
    fullName: 'Alice',
    email: 'alice@derote.in',
    age: '16',
    classGrade: '10',
    schoolName: 'DPS',
  };
  assert.equal(evaluateStudentCreate(auth, STUDENT_A_UID, { ...base, totalReflections: 99 }), 'DENY');
});

test('16. Server-managed fields on creation: lastSubmittedAt injected on create rejected: DENY', () => {
  const auth = { uid: STUDENT_A_UID, token: { email: 'alice@derote.in' } };
  const base = {
    id: STUDENT_A_UID,
    fullName: 'Alice',
    email: 'alice@derote.in',
    age: '16',
    classGrade: '10',
    schoolName: 'DPS',
    lastSubmittedAt: '2026-11-06T00:00:00.000Z',
  };
  assert.equal(evaluateStudentCreate(auth, STUDENT_A_UID, base), 'DENY');
});

test('17. Questionnaire access: Student reads default_v1: ALLOW', () => {
  const auth = { uid: STUDENT_A_UID };
  assert.equal(evaluateQuestionnaireGet(auth, 'default_v1'), 'ALLOW');
});

test('18. Questionnaire access: Student reads unpublished document: DENY', () => {
  const auth = { uid: STUDENT_A_UID };
  assert.equal(evaluateQuestionnaireGet(auth, 'draft_questionnaire_v2'), 'DENY');
  assert.equal(evaluateQuestionnaireGet(auth, 'internal_test'), 'DENY');
});

test('19. Questionnaire access: Student lists questionnaires collection: DENY', () => {
  const auth = { uid: STUDENT_A_UID };
  assert.equal(evaluateQuestionnaireList(auth), 'DENY');
});

test('20. Questionnaire access: Admin reads and lists any questionnaires: ALLOW', () => {
  const auth = { uid: DESIGNATED_ADMIN_UID };
  assert.equal(evaluateQuestionnaireGet(auth, 'draft_questionnaire_v2'), 'ALLOW');
  assert.equal(evaluateQuestionnaireList(auth), 'ALLOW');
});

test('21. Answers map validation: valid answers with up to 64 valid question IDs: ALLOW', () => {
  const auth = { uid: STUDENT_A_UID };
  const validAnswers: Record<string, any> = {
    '1': 'Alice',
    '8': 'I enjoy learning new things',
    '10': ['Mathematics', 'Science'],
    '64': 'Everything looks great',
  };
  const draft = { studentId: STUDENT_A_UID, answers: validAnswers, currentSection: 1 };
  assert.equal(evaluateDraftCreate(auth, STUDENT_A_UID, false, draft), 'ALLOW');
});

test('22. Answers map validation: arbitrary/malicious question key rejected: DENY', () => {
  const auth = { uid: STUDENT_A_UID };
  const invalidAnswers: Record<string, any> = {
    '1': 'Alice',
    'exploitKey': 'injection',
  };
  const draft = { studentId: STUDENT_A_UID, answers: invalidAnswers, currentSection: 1 };
  assert.equal(evaluateDraftCreate(auth, STUDENT_A_UID, false, draft), 'DENY');
});

test('23. Answers map validation: oversized answers map (>64 keys) rejected: DENY', () => {
  const auth = { uid: STUDENT_A_UID };
  const oversizedAnswers: Record<string, any> = {};
  for (let i = 1; i <= 65; i++) {
    oversizedAnswers[String(i)] = 'Answer';
  }
  const draft = { studentId: STUDENT_A_UID, answers: oversizedAnswers, currentSection: 1 };
  assert.equal(evaluateDraftCreate(auth, STUDENT_A_UID, false, draft), 'DENY');
});

test('24. Draft section indexing (0 through 14 allowed, outside rejected): VERIFIED', () => {
  const auth = { uid: STUDENT_A_UID };
  const baseDraft = { studentId: STUDENT_A_UID, answers: {} };
  assert.equal(evaluateDraftCreate(auth, STUDENT_A_UID, false, { ...baseDraft, currentSection: 0 }), 'ALLOW');
  assert.equal(evaluateDraftCreate(auth, STUDENT_A_UID, false, { ...baseDraft, currentSection: 14 }), 'ALLOW');
  assert.equal(evaluateDraftCreate(auth, STUDENT_A_UID, false, { ...baseDraft, currentSection: -1 }), 'DENY');
  assert.equal(evaluateDraftCreate(auth, STUDENT_A_UID, false, { ...baseDraft, currentSection: 15 }), 'DENY');
});

test('25. Draft creation after final submission exists: DENY', () => {
  const auth = { uid: STUDENT_A_UID };
  const draft = { studentId: STUDENT_A_UID, answers: {}, currentSection: 1 };
  assert.equal(evaluateDraftCreate(auth, STUDENT_A_UID, true, draft), 'DENY');
});

test('26. Submission overwrite attempt: DENY', () => {
  const auth = { uid: STUDENT_A_UID };
  const sub = { studentId: STUDENT_A_UID, answers: {}, version: 1, submittedAt: '2026-11-06T00:00:00.000Z' };
  assert.equal(evaluateSubmissionCreate(auth, STUDENT_A_UID, true, sub), 'DENY');
});

test('27. Admin reads all student profiles and submissions: ALLOW', () => {
  const auth = { uid: DESIGNATED_ADMIN_UID };
  assert.equal(evaluateStudentList(auth), 'ALLOW');
  assert.equal(evaluateStudentRead(auth, STUDENT_A_UID), 'ALLOW');
});

test('28. Admin edits student profile without arbitrary keys: ALLOW', () => {
  const auth = { uid: DESIGNATED_ADMIN_UID };
  const existing = {
    id: STUDENT_A_UID,
    fullName: 'Alice',
    schoolName: 'DPS',
    age: '15',
    classGrade: '10',
  };
  const incoming = {
    ...existing,
    schoolName: 'Modern School',
    age: '16',
    classGrade: '11',
  };
  assert.equal(evaluateStudentUpdate(auth, STUDENT_A_UID, incoming, existing), 'ALLOW');
});
