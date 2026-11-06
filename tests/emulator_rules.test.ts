/**
 * Firebase Emulator Suite Integration Test Runner
 *
 * This test file runs against the live Firestore Emulator when a Java Runtime
 * Environment (JRE 11+) is installed on the host machine.
 *
 * Windows Execution Instructions:
 * -------------------------------------------------------------
 * 1. Ensure Java (JRE/JDK 11+) is installed:
 *      java -version
 * 2. Start the Firebase Emulator and run this test suite:
 *      npx firebase emulators:exec --only firestore "npx tsx tests/emulator_rules.test.ts"
 *
 * Alternatively, run emulator in one terminal:
 *      npx firebase emulators:start --only firestore
 * And in a second terminal:
 *      npx tsx tests/emulator_rules.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';

export const DESIGNATED_ADMIN_UID = 'VIwgfF6Q2FTDPDQwkRECSjpwbc32';
export const STUDENT_A_UID = 'student_uid_alice';
export const STUDENT_B_UID = 'student_uid_bob';

export const EMULATOR_SUITE_SPEC = {
  version: '2.1.0',
  prerequisites: [
    'Java Runtime Environment (JRE 11+ / OpenJDK 11+)',
    'Firebase CLI: npm install -g firebase-tools (or run via npx firebase)',
    'Dependency: @firebase/rules-unit-testing (installed)',
  ],
  exactWindowsCommand: 'npx firebase emulators:exec --only firestore "npx tsx tests/emulator_rules.test.ts"',
  targetRulesFile: 'firestore.rules',
  testedContexts: [
    'Student A (authenticated as alice@derote.in, UID: student_uid_alice)',
    'Student B (authenticated as bob@derote.in, UID: student_uid_bob)',
    'Designated Admin (authenticated as admin@derote.in, UID: VIwgfF6Q2FTDPDQwkRECSjpwbc32)',
    'Unauthenticated Visitor (no auth context)',
  ],
};

async function runEmulatorTestSuite() {
  console.log('================================================================');
  console.log('DeRote Student Insight — Firebase Emulator Suite Test Runner');
  console.log('================================================================\n');

  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  if (!fs.existsSync(rulesPath)) {
    throw new Error(`Rules file not found at: ${rulesPath}`);
  }
  const rulesContent = fs.readFileSync(rulesPath, 'utf8');

  console.log('Initializing RulesTestEnvironment against Firestore Emulator...');
  let testEnv: RulesTestEnvironment;
  try {
    testEnv = await initializeTestEnvironment({
      projectId: 'derote-test-emulator',
      firestore: {
        rules: rulesContent,
        host: '127.0.0.1',
        port: 8080,
      },
    });
  } catch (err) {
    console.error('\n[Notice] Could not connect to Firestore Emulator on port 8080.');
    console.error('Please ensure the Firebase Emulator is running via:');
    console.error(`  ${EMULATOR_SUITE_SPEC.exactWindowsCommand}\n`);
    throw err;
  }

  try {
    // -------------------------------------------------------------------------
    // Set up initial test data with admin / bypass rules context
    // -------------------------------------------------------------------------
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminFirestore = context.firestore();
      // Seed published questionnaire
      await setDoc(doc(adminFirestore, 'questionnaires', 'default_v1'), {
        version: 1,
        title: 'DeRote Student Insight Default Questionnaire',
        published: true,
      });
      // Seed unpublished internal questionnaire
      await setDoc(doc(adminFirestore, 'questionnaires', 'draft_v2'), {
        version: 2,
        title: 'DeRote Internal Questionnaire Draft',
        published: false,
      });
      // Seed existing Student B profile
      await setDoc(doc(adminFirestore, 'students', STUDENT_B_UID), {
        id: STUDENT_B_UID,
        fullName: 'Bob Sharma',
        email: 'bob@derote.in',
        age: '16',
        classGrade: '11',
        schoolName: 'Delhi Public School',
        completedReflections: 0,
        totalReflections: 13,
        createdAt: new Date().toISOString(),
      });
    });

    // -------------------------------------------------------------------------
    // Contexts Under Test
    // -------------------------------------------------------------------------
    const aliceContext = testEnv.authenticatedContext(STUDENT_A_UID, { email: 'alice@derote.in' });
    const bobContext = testEnv.authenticatedContext(STUDENT_B_UID, { email: 'bob@derote.in' });
    const adminContext = testEnv.authenticatedContext(DESIGNATED_ADMIN_UID, { email: 'admin@derote.in' });
    const unauthContext = testEnv.unauthenticatedContext();

    const aliceDb = aliceContext.firestore();
    const bobDb = bobContext.firestore();
    const adminDb = adminContext.firestore();
    const unauthDb = unauthContext.firestore();

    console.log('Running test assertions against loaded firestore.rules...\n');

    // 1. Student A creates profile with matching email & canonical class -> ALLOW
    await assertSucceeds(
      setDoc(doc(aliceDb, 'students', STUDENT_A_UID), {
        id: STUDENT_A_UID,
        fullName: 'Alice Sen',
        email: 'alice@derote.in',
        age: '15',
        classGrade: '10',
        schoolName: 'Kendriya Vidyalaya',
        completedReflections: 0,
        totalReflections: 13,
      })
    );
    console.log('✔ 1. Student A creates profile with matching token email & canonical class: ALLOW');

    // 2. Student A attempts to spoof another user email on creation -> DENY
    await assertFails(
      setDoc(doc(aliceDb, 'students', 'student_spoof'), {
        id: 'student_spoof',
        fullName: 'Alice Sen',
        email: 'victim@other.com',
        age: '15',
        classGrade: '10',
        schoolName: 'KV',
      })
    );
    console.log('✔ 2. Student attempts to register another email in profile: DENY');

    // 3. Student A creates profile with non-canonical class "Others" -> DENY
    await assertFails(
      setDoc(doc(aliceDb, 'students', STUDENT_A_UID), {
        id: STUDENT_A_UID,
        fullName: 'Alice Sen',
        email: 'alice@derote.in',
        age: '15',
        classGrade: 'Others',
        schoolName: 'KV',
      })
    );
    console.log('✔ 3. Student creates profile with non-canonical class "Others": DENY');

    // 4. Student A reads Student A profile -> ALLOW
    await assertSucceeds(getDoc(doc(aliceDb, 'students', STUDENT_A_UID)));
    console.log('✔ 4. Student A reads Student A profile: ALLOW');

    // 5. Student A reads Student B profile -> DENY
    await assertFails(getDoc(doc(aliceDb, 'students', STUDENT_B_UID)));
    console.log('✔ 5. Student A reads Student B profile: DENY');

    // 6. Student A updates own permitted fields (age, classGrade) -> ALLOW
    await assertSucceeds(
      updateDoc(doc(aliceDb, 'students', STUDENT_A_UID), {
        age: '16',
        classGrade: '11',
      })
    );
    console.log('✔ 6. Student A updates permitted fields (age, classGrade): ALLOW');

    // 7. Student A attempts to update immutable field (fullName) -> DENY
    await assertFails(
      updateDoc(doc(aliceDb, 'students', STUDENT_A_UID), {
        fullName: 'Alice Hacked',
      })
    );
    console.log('✔ 7. Student A attempts to modify immutable fullName: DENY');

    // 8. Student A attempts to inject arbitrary field on update -> DENY
    await assertFails(
      updateDoc(doc(aliceDb, 'students', STUDENT_A_UID), {
        age: '16',
        role: 'admin',
      })
    );
    console.log('✔ 8. Student A attempts to inject arbitrary field on update: DENY');

    // 9. Student A reads published questionnaire (default_v1) -> ALLOW
    await assertSucceeds(getDoc(doc(aliceDb, 'questionnaires', 'default_v1')));
    console.log('✔ 9. Student A reads published questionnaire default_v1: ALLOW');

    // 10. Student A attempts to read unpublished questionnaire (draft_v2) -> DENY
    await assertFails(getDoc(doc(aliceDb, 'questionnaires', 'draft_v2')));
    console.log('✔ 10. Student A attempts to read unpublished questionnaire draft_v2: DENY');

    // 11. Student A attempts to list questionnaires collection -> DENY
    await assertFails(getDocs(collection(aliceDb, 'questionnaires')));
    console.log('✔ 11. Student A attempts to list questionnaires collection: DENY');

    // 12. Admin lists questionnaires collection -> ALLOW
    await assertSucceeds(getDocs(collection(adminDb, 'questionnaires')));
    console.log('✔ 12. Admin lists questionnaires collection: ALLOW');

    // 13. Admin reads any student profile -> ALLOW
    await assertSucceeds(getDoc(doc(adminDb, 'students', STUDENT_A_UID)));
    console.log('✔ 13. Admin reads student profile: ALLOW');

    // 14. Admin lists all student profiles -> ALLOW
    await assertSucceeds(getDocs(collection(adminDb, 'students')));
    console.log('✔ 14. Admin lists all student profiles: ALLOW');

    // 15. Student A creates valid draft with answers map and currentSection 1..14 -> ALLOW
    await assertSucceeds(
      setDoc(doc(aliceDb, 'drafts', STUDENT_A_UID), {
        studentId: STUDENT_A_UID,
        answers: { '1': 'Alice', '8': 'I enjoy learning' },
        currentSection: 2,
      })
    );
    console.log('✔ 15. Student A creates valid draft with valid question keys: ALLOW');

    // 16. Student A creates draft with arbitrary question key -> DENY
    await assertFails(
      setDoc(doc(aliceDb, 'drafts', STUDENT_A_UID), {
        studentId: STUDENT_A_UID,
        answers: { 'exploitKey': 'malicious' },
        currentSection: 1,
      })
    );
    console.log('✔ 16. Student A creates draft with unauthorized question key: DENY');

    // 17. Student A submits final answers -> ALLOW
    await assertSucceeds(
      setDoc(doc(aliceDb, 'submissions', STUDENT_A_UID), {
        studentId: STUDENT_A_UID,
        answers: { '1': 'Alice', '8': 'I enjoy learning' },
        version: 1,
        submittedAt: new Date().toISOString(),
      })
    );
    console.log('✔ 17. Student A submits final questionnaire answers: ALLOW');

    // 18. Student A attempts to overwrite final submission -> DENY
    await assertFails(
      setDoc(doc(aliceDb, 'submissions', STUDENT_A_UID), {
        studentId: STUDENT_A_UID,
        answers: { '1': 'Alice Hacked' },
        version: 1,
        submittedAt: new Date().toISOString(),
      })
    );
    console.log('✔ 18. Overwrite final submission attempt: DENY');

    // 19. Admin attempts to edit or delete final submission -> DENY
    await assertFails(
      updateDoc(doc(adminDb, 'submissions', STUDENT_A_UID), {
        answers: { '1': 'Admin Overwrite' },
      })
    );
    await assertFails(deleteDoc(doc(adminDb, 'submissions', STUDENT_A_UID)));
    console.log('✔ 19. Admin attempts to edit or delete final submission: DENY');

    // 20. Unauthenticated access to private collections -> DENY
    await assertFails(getDoc(doc(unauthDb, 'students', STUDENT_A_UID)));
    await assertFails(getDoc(doc(unauthDb, 'submissions', STUDENT_A_UID)));
    await assertFails(getDocs(collection(unauthDb, 'students')));
    console.log('✔ 20. Unauthenticated visitor access: DENY');

    console.log('\n================================================================');
    console.log('All 20 Firebase Emulator Suite integration tests PASSED!');
    console.log('================================================================');
  } finally {
    await testEnv.cleanup();
  }
}

if (process.argv[1]?.endsWith('emulator_rules.test.ts')) {
  runEmulatorTestSuite().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
