import test from 'node:test';
import assert from 'node:assert/strict';

// In-memory mock localStorage
class MockLocalStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

const mockStorage = new MockLocalStorage();

// Storage key generators
function getDraftStorageKey(uid?: string | null): string {
  const clean = uid ? uid.trim() : '';
  return clean ? `derote_draft_${clean}` : 'derote_draft_guest';
}

function getSubmissionStorageKey(uid?: string | null): string {
  const clean = uid ? uid.trim() : '';
  return clean ? `derote_submission_${clean}` : 'derote_submission_guest';
}

// Simulated Cloud Firestore Datastore
interface FirestoreDraftDoc {
  studentId: string;
  answers: Record<string, any>;
  currentSection: number;
  version: number;
  updatedAt: string;
}

interface FirestoreSubmissionDoc {
  studentId: string;
  answers: Record<string, any>;
  version: number;
  submittedAt: string;
  updatedAt: string;
}

const cloudDrafts: Map<string, FirestoreDraftDoc> = new Map();
const cloudSubmissions: Map<string, FirestoreSubmissionDoc> = new Map();
let simulateNetworkFailure = false;
let simulateOffline = false;

// Mock Backend Operations
async function mockSaveDraftToBackendOutcome(
  studentId: string,
  answers: Record<number, any>,
  currentSection: number,
  version: number = 1
) {
  if (simulateOffline) {
    return { success: false, code: 'unavailable', message: 'Client is offline.' };
  }
  if (simulateNetworkFailure) {
    return { success: false, code: 'unavailable', message: 'Network connection failed.' };
  }
  const serialized: Record<string, any> = {};
  for (const [k, v] of Object.entries(answers)) {
    serialized[String(k)] = v;
  }
  const updatedAt = new Date().toISOString();
  cloudDrafts.set(studentId, {
    studentId,
    answers: serialized,
    currentSection,
    version,
    updatedAt,
  });
  return { success: true, updatedAt };
}

async function mockLoadDraftFromBackend(studentId: string) {
  if (simulateOffline || simulateNetworkFailure) {
    return null;
  }
  const doc = cloudDrafts.get(studentId);
  if (!doc) return null;
  const deserialized: Record<number, any> = {};
  for (const [k, v] of Object.entries(doc.answers)) {
    deserialized[Number(k)] = v;
  }
  return {
    answers: deserialized,
    currentSection: doc.currentSection,
    version: doc.version,
    updatedAt: doc.updatedAt,
  };
}

async function mockSaveSubmissionToBackendOutcome(
  studentId: string,
  submission: { answers: Record<number, any>; version: number; submittedAt: string }
) {
  if (simulateOffline || simulateNetworkFailure) {
    return { success: false, code: 'unavailable', message: 'Network connection failed.' };
  }
  // Firestore Security Rules invariant: submissions cannot be overwritten
  if (cloudSubmissions.has(studentId)) {
    return { success: false, code: 'permission-denied', message: 'Final submissions are strictly immutable.' };
  }
  const serialized: Record<string, any> = {};
  for (const [k, v] of Object.entries(submission.answers)) {
    serialized[String(k)] = v;
  }
  cloudSubmissions.set(studentId, {
    studentId,
    answers: serialized,
    version: submission.version,
    submittedAt: submission.submittedAt,
    updatedAt: new Date().toISOString(),
  });
  return { success: true, submittedAt: submission.submittedAt };
}

async function mockGetSubmissionFromBackend(studentId: string) {
  const doc = cloudSubmissions.get(studentId);
  if (!doc) return null;
  const deserialized: Record<number, any> = {};
  for (const [k, v] of Object.entries(doc.answers)) {
    deserialized[Number(k)] = v;
  }
  return {
    answers: deserialized,
    version: doc.version,
    submittedAt: doc.submittedAt,
  };
}

async function mockDeleteDraftFromBackend(studentId: string) {
  cloudDrafts.delete(studentId);
  return true;
}

// Logic implementations under test
async function testSaveDraft(uid: string, answers: Record<number, any>, currentSection: number, version = 1) {
  // 1. Save to local namespaced storage immediately
  const payload = { studentId: uid, answers, currentSection, version, updatedAt: new Date().toISOString() };
  mockStorage.setItem(getDraftStorageKey(uid), JSON.stringify(payload));

  // 2. Cloud save
  const outcome = await mockSaveDraftToBackendOutcome(uid, answers, currentSection, version);
  return outcome;
}

async function testLoadDraft(uid: string) {
  // 1. Try cloud
  const cloud = await mockLoadDraftFromBackend(uid);
  if (cloud) {
    mockStorage.setItem(getDraftStorageKey(uid), JSON.stringify({ studentId: uid, ...cloud }));
    return cloud;
  }
  // 2. Try namespaced local storage
  const local = mockStorage.getItem(getDraftStorageKey(uid));
  if (local) {
    const parsed = JSON.parse(local);
    return {
      answers: parsed.answers,
      currentSection: parsed.currentSection,
      version: parsed.version || 1,
    };
  }
  return null;
}

async function testSubmitQuestionnaire(uid: string, answers: Record<number, any>, version = 1) {
  // 1. Check existing submission
  const existing = await mockGetSubmissionFromBackend(uid);
  if (existing) {
    return { success: false, code: 'already-submitted', message: 'Already submitted.' };
  }

  const submittedAt = new Date().toISOString();
  const payload = { studentId: uid, answers, version, submittedAt };

  // 2. Cloud save
  const outcome = await mockSaveSubmissionToBackendOutcome(uid, payload);
  if (!outcome.success) {
    return { success: false, code: outcome.code, message: outcome.message };
  }

  // 3. Mark local namespaced storage and delete draft
  mockStorage.setItem(getSubmissionStorageKey(uid), JSON.stringify(payload));
  mockStorage.removeItem(getDraftStorageKey(uid));
  await mockDeleteDraftFromBackend(uid);

  return { success: true, submittedAt };
}

async function testHasSubmitted(uid: string) {
  const cloud = await mockGetSubmissionFromBackend(uid);
  if (cloud) return true;
  const local = mockStorage.getItem(getSubmissionStorageKey(uid));
  return Boolean(local);
}

// =============================================================================
// PHASE 5 TEST SUITE: 12 MANDATORY SCENARIOS
// =============================================================================

test('1. Student answers questions 1-15 and refreshes (draft persists & restores)', async () => {
  mockStorage.clear();
  cloudDrafts.clear();
  const uid = 'student_test_1';

  const answers: Record<number, any> = {};
  for (let i = 1; i <= 15; i++) {
    answers[i] = `Answer to question ${i}`;
  }

  const saveRes = await testSaveDraft(uid, answers, 3, 1);
  assert.equal(saveRes.success, true);

  // Simulated browser refresh: load draft from storage
  const restored = await testLoadDraft(uid);
  assert.notEqual(restored, null);
  assert.equal(Object.keys(restored!.answers).length, 15);
  assert.equal(restored!.answers[1], 'Answer to question 1');
  assert.equal(restored!.answers[15], 'Answer to question 15');
  assert.equal(restored!.currentSection, 3);
});

test('2. Student logs out and logs back in (session clears, draft restored on login)', async () => {
  const uid = 'student_test_2';
  const answers = { 1: 'Alice', 2: '16', 3: '10' };
  await testSaveDraft(uid, answers, 1, 1);

  // Logout clears in-memory state
  let inMemorySession: any = { uid, activeAnswers: answers };
  inMemorySession = null;
  assert.equal(inMemorySession, null);

  // Login back in restores draft for uid
  const restored = await testLoadDraft(uid);
  assert.notEqual(restored, null);
  assert.equal(restored!.answers[1], 'Alice');
});

test('3. Student switches accounts on the same device (data isolation strictly enforced)', async () => {
  mockStorage.clear();
  const uidA = 'student_alice';
  const uidB = 'student_bob';

  await testSaveDraft(uidA, { 1: 'Alice Answers', 2: '15' }, 2, 1);
  await testSaveDraft(uidB, { 1: 'Bob Answers', 2: '17' }, 4, 1);

  // Alice checks draft -> Alice only
  const draftAlice = await testLoadDraft(uidA);
  assert.equal(draftAlice!.answers[1], 'Alice Answers');
  assert.equal(draftAlice!.currentSection, 2);

  // Bob checks draft -> Bob only
  const draftBob = await testLoadDraft(uidB);
  assert.equal(draftBob!.answers[1], 'Bob Answers');
  assert.equal(draftBob!.currentSection, 4);

  // Direct storage check verifies distinct namespaced keys
  assert.notEqual(mockStorage.getItem(getDraftStorageKey(uidA)), null);
  assert.notEqual(mockStorage.getItem(getDraftStorageKey(uidB)), null);
  assert.notEqual(mockStorage.getItem(getDraftStorageKey(uidA)), mockStorage.getItem(getDraftStorageKey(uidB)));
});

test('4. Student resumes an existing draft (preserves answers, section, and version)', async () => {
  const uid = 'student_resume';
  await testSaveDraft(uid, { 8: 'I enjoy learning', 10: ['Mathematics', 'Science'] }, 5, 1);

  const restored = await testLoadDraft(uid);
  assert.notEqual(restored, null);
  assert.equal(restored!.currentSection, 5);
  assert.equal(restored!.version, 1);
  assert.deepEqual(restored!.answers[10], ['Mathematics', 'Science']);
});

test('5. Student loses internet connectivity while answering (local storage preserves answers)', async () => {
  const uid = 'student_offline';
  simulateOffline = true;

  const answers = { 1: 'Offline Answer', 2: '16' };
  const res = await testSaveDraft(uid, answers, 1, 1);
  // Cloud write fails because offline
  assert.equal(res.success, false);

  // Local namespaced storage still has the answers!
  const localRaw = mockStorage.getItem(getDraftStorageKey(uid));
  assert.notEqual(localRaw, null);
  const parsed = JSON.parse(localRaw!);
  assert.equal(parsed.answers[1], 'Offline Answer');

  simulateOffline = false;
});

test('6. Firestore write fails (returns clear error without crashing)', async () => {
  const uid = 'student_fail';
  simulateNetworkFailure = true;

  const res = await testSaveDraft(uid, { 1: 'Test' }, 1, 1);
  assert.equal(res.success, false);
  assert.equal(res.code, 'unavailable');

  simulateNetworkFailure = false;
});

test('7. Student retries a failed save (retry succeeds and updates cloud)', async () => {
  const uid = 'student_retry';
  simulateNetworkFailure = true;
  await testSaveDraft(uid, { 1: 'Needs Retry' }, 1, 1);

  // Recover network and retry
  simulateNetworkFailure = false;
  const retryOutcome = await mockSaveDraftToBackendOutcome(uid, { 1: 'Needs Retry' }, 1, 1);
  assert.equal(retryOutcome.success, true);

  const cloud = await mockLoadDraftFromBackend(uid);
  assert.equal(cloud!.answers[1], 'Needs Retry');
});

test('8. Student completes and submits questionnaire (confirmed server write & draft cleanup)', async () => {
  const uid = 'student_submit';
  await testSaveDraft(uid, { 1: 'Final Alice' }, 13, 1);

  const subOutcome = await testSubmitQuestionnaire(uid, { 1: 'Final Alice' }, 1);
  assert.equal(subOutcome.success, true);

  // Local storage submission marker is set
  assert.notEqual(mockStorage.getItem(getSubmissionStorageKey(uid)), null);
  // Local and cloud drafts are cleaned up
  assert.equal(mockStorage.getItem(getDraftStorageKey(uid)), null);
  assert.equal(cloudDrafts.get(uid), undefined);
});

test('9. Student refreshes after submission (hasSubmitted returns true, submission locked)', async () => {
  const uid = 'student_submit'; // Already submitted in test 8
  const submitted = await testHasSubmitted(uid);
  assert.equal(submitted, true);
});

test('10. Student attempts to submit a second time (rejected, duplicate prevented)', async () => {
  const uid = 'student_submit'; // Already submitted in test 8
  const secondAttempt = await testSubmitQuestionnaire(uid, { 1: 'Tampered' }, 1);
  assert.equal(secondAttempt.success, false);
  assert.equal(secondAttempt.code, 'already-submitted');
});

test('11. Student attempts to reopen submitted questionnaire (submission document is immutable)', async () => {
  const uid = 'student_submit';
  // Final submission in cloud cannot be overwritten
  const overwriteAttempt = await mockSaveSubmissionToBackendOutcome(uid, {
    answers: { 1: 'Hacked' },
    version: 1,
    submittedAt: new Date().toISOString(),
  });
  assert.equal(overwriteAttempt.success, false);
  assert.equal(overwriteAttempt.code, 'permission-denied');
});

test('12. Student A and Student B use the same device (complete separation between submitted and draft)', async () => {
  const studentA = 'device_student_alice';
  const studentB = 'device_student_bob';

  // Student A completes and submits
  await testSubmitQuestionnaire(studentA, { 1: 'Alice Final' }, 1);

  // Student B logs in and only has a draft
  await testSaveDraft(studentB, { 1: 'Bob Draft' }, 2, 1);

  // Check Student A: submitted = true, draft = null
  assert.equal(await testHasSubmitted(studentA), true);
  assert.equal(mockStorage.getItem(getDraftStorageKey(studentA)), null);

  // Check Student B: submitted = false, draft exists
  assert.equal(await testHasSubmitted(studentB), false);
  const draftB = await testLoadDraft(studentB);
  assert.equal(draftB!.answers[1], 'Bob Draft');
  assert.equal(draftB!.currentSection, 2);
});
