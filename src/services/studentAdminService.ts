/**
 * Student Administration Service for DeRote Student Insight System
 *
 * Provides student roster management, answer loading, profile editing authority,
 * and context-aware report generation.
 * Pure offline/localStorage-first operation.
 */

import {
  LocalStudentAccount,
  getStoredRegisteredAccounts,
  saveRegisteredAccounts,
  getCurrentStudent,
  setStoredStudent,
} from './localAuth';
import { QUESTIONS } from '../data/questionnaire';
import {
  getAllStudentsFromBackend,
  getAllSubmissionsFromBackend,
  updateStudentProfileInBackend,
} from './firestoreBackend';
import type { SubmissionData } from './api';

export type QuestionnaireStatus = 'Not Started' | 'In Progress' | 'Submitted';

export interface AdminStudentRecord {
  id: string;
  fullName: string;
  age: string;
  classGrade: string; // '8', '9', '10', '11', '12', 'Others'
  schoolName: string;
  email: string;
  phone?: string;
  status: QuestionnaireStatus;
  answeredCount: number;
  totalQuestions: number;
  submittedAt?: string;
  updatedAt?: string;
  answers: Record<number, string | string[]>;
}

const STORAGE_PREFIX_SUBMISSION = 'derote_questionnaire_submission_';
const STORAGE_PREFIX_DRAFT = 'derote_questionnaire_draft_';
const GLOBAL_SUBMISSION_KEY = 'derote_student_questionnaire_submission';
const GLOBAL_DRAFT_KEY = 'derote_student_questionnaire_draft';

// Sample answers for demo students to demonstrate complete records, incomplete responses, and not-started status
const DEMO_ANSWERS_AARAV: Record<number, string | string[]> = {
  1: 'Aarav Sharma',
  2: '15',
  3: '10',
  4: 'Delhi Public School, R.K. Puram',
  5: 'Curious, analytical, observant',
  6: 'Building hobby coding projects and playing badminton',
  7: 'I sometimes worry more about future expectations than I let people see.',
  8: 'I like some subjects more than others',
  9: 'Physics and Computer Science, because understanding how systems work and solving logic puzzles feels natural and engaging.',
  10: ['Social science'],
  11: ['Remembering facts or steps', 'Writing answers clearly'],
  12: ['Examples from real life', 'Solving questions by myself', 'Teacher explanation'],
  13: ['Look it up online / in a book', 'Ask a friend'],
  14: ['Disappointed but ready to try again', 'I feel I did not work effectively'],
  15: '1–2 hours',
  16: ['Mostly in the evening', 'At a regular time'],
  17: 'A few times a week',
  18: ['Mobile / social media', 'Noise / lack of space'],
  19: ['I plan it and start later'],
  20: ['I know the material but feel nervous'],
  21: 'I sit down at my desk around 7:30 PM. Doing problem sets first works well, but memorizing long dates is difficult without visual summaries.',
  22: 'Sometimes',
  23: ['My own expectations', 'Exams and marks', 'Competition with others'],
  24: ['Listen to music', 'Spend time alone', 'Talk to a friend'],
  25: ['I prefer not to burden others', 'I feel others might not understand'],
  26: 'Sometimes',
  27: 'I prefer not to answer',
  28: 'To stay grounded and remind myself that one exam does not define my future.',
  29: 'Logical thinking, structuring tasks, and helping classmates debug code.',
  30: ['Coding and technology', 'Reading / writing', 'Sports / fitness'],
  31: ['Creating something of my own', 'Solving a difficult challenge', 'Learning something new'],
  32: 'Yes, I can focus deeply for about an hour when the challenge is genuine.',
  33: 'A lightweight study-group organizing tool for classmates.',
  34: ['Curiosity to understand things', 'Wanting to build a good future'],
  35: ['With effort and better methods, I can improve'],
  36: ['I analyze what went wrong and try differently'],
  37: ['When I see genuine improvement', 'When a teacher gives constructive feedback'],
  38: ['Fear of failure', 'Feeling that the work is not meaningful'],
  39: '2–3 hours',
  40: ['Schoolwork or learning', 'Watching videos / series', 'Texting friends'],
  41: ['It helps me discover interesting ideas', 'It sometimes distracts me from sleep'],
  42: 'Yes, I occasionally compare myself with achievements shared online.',
  43: ['No, it does not bother me'],
  44: 'Placing my phone in another room while solving mathematics problems.',
  45: ['Supported and cared for', 'Expected to do well academically'],
  46: ['Sometimes'],
  47: ['Studies and career choices'],
  48: ['They encourage me to try my best'],
  49: ['Academic performance', 'Screen time'],
  50: 'A calm environment with quiet hours for study and open conversation during meals.',
  51: ['A small group of close friends'],
  52: ['I can be myself around them', 'We share common interests'],
  53: ['Rarely'],
  54: ['Listening when they are down', 'Explaining difficult concepts patiently'],
  55: 'To study computer systems and design software tools that benefit education.',
  56: ['Having fulfilling work', 'Being able to support my family', 'Continuing to learn throughout life'],
  57: ['Not getting into the course I hope for', 'Losing time for personal hobbies'],
  58: ['Guidance on emerging tech careers', 'Learning how to manage stress better'],
  59: 'To stay curious, honest, and persistent through challenges.',
  60: ['Falling behind my peers', 'Disappointing people who believe in me'],
  61: ['Focusing on small daily habits', 'Taking deep breaths'],
  62: 'Transitioning to Class 11 with greater focus and balance.',
  63: 'That high test scores are not the only measure of a student’s dedication or creativity.',
  64: 'I appreciate having a quiet space to express how I think without being graded.',
};

const DEMO_ANSWERS_ROHAN: Record<number, string | string[]> = {
  1: 'Rohan Verma',
  2: '16',
  3: '10',
  4: 'Sanskriti School, Chanakyapuri',
  5: 'Determined, quiet, empathetic',
  6: 'Reading history and drawing diagrams',
  7: 'I remember small details that people often overlook.',
  8: 'I enjoy learning new things',
  9: 'History and Environmental Science, because they explain human decisions and our planet.',
  10: ['Mathematics'],
  11: ['Solving problems quickly', 'Remembering facts or steps'],
  12: ['Pictures, diagrams or videos', 'Reading by myself', 'Examples from real life'],
  13: ['Look it up online / in a book', 'Try again later'],
  14: ['Disappointed but ready to try again'],
  15: '2–3 hours',
  16: ['Early in the morning', 'At a regular time'],
  17: 'Almost every day',
  18: ['Tiredness or lack of sleep'],
  19: ['I start soon'],
  20: ['I know the material but feel nervous'],
  21: 'I wake up at 5:30 AM to read theory while my mind is clear. Evening time is for writing practice.',
  22: 'Rarely',
  23: ['My own expectations'],
  24: ['Spend time alone', 'Listen to music'],
  25: ['I prefer not to burden others'],
  26: 'Rarely',
  27: 'No subject in particular',
  28: 'To trust my early morning preparation.',
  29: 'Consistency, neat note-making, and patience.',
  30: ['Reading / writing', 'Art / design'],
  31: ['Completing a long project thoroughly'],
  32: 'Yes, when reading historical biographies.',
  33: 'An illustrated guide to medieval Delhi monuments.',
  34: ['Wanting to build a good future', 'Curiosity to understand things'],
  35: ['With effort and better methods, I can improve'],
  36: ['I analyze what went wrong and try differently'],
  37: ['When I see genuine improvement'],
  38: ['Tiredness / lack of sleep'],
  39: '1–2 hours',
  40: ['Schoolwork or learning', 'Reading articles'],
  41: ['It helps me learn things quickly'],
  42: 'Rarely',
  43: ['No, it does not bother me'],
  44: 'No screens allowed during early morning study.',
  45: ['Supported and cared for'],
  46: ['Never'],
  47: ['Studies and career choices'],
  48: ['They encourage me to try my best'],
  49: ['Sleep schedule'],
  50: 'Mutual respect and peaceful quiet.',
  51: ['A small group of close friends'],
  52: ['They respect my quiet nature'],
  53: ['Rarely'],
  54: ['Being dependable and calm'],
  55: 'To pursue historical research and heritage preservation.',
  56: ['Doing meaningful work', 'Peace of mind'],
  57: ['Burnout before board exams'],
  58: ['Guidance on humanities research careers'],
  59: 'To be known as someone steady and trustworthy.',
  60: ['Falling behind schedule'],
  61: ['Making a structured checklist'],
  62: 'Maintaining my sleep schedule during pre-board exams.',
  63: 'Quiet students also have deep ambitions.',
  64: 'The questions felt respectful and thoughtful.',
};

const DEMO_ANSWERS_MEERA: Record<number, string | string[]> = {
  1: 'Meera Nair',
  2: '18',
  3: '12',
  4: 'Greenwood High International School',
  5: 'Driven, articulate, caring',
  6: 'Debating, playing the violin, and mentoring younger students',
  7: 'I feel the weight of leadership roles but try to stay optimistic.',
  8: 'I enjoy learning new things',
  9: 'Biology and English Literature. Both explore life, emotions, and complexity.',
  10: ['Physics'],
  11: ['Solving problems quickly', 'Applying ideas to new questions'],
  12: ['Discussing with friends', 'Teacher explanation', 'Practical activities'],
  13: ['Ask the teacher', 'Discuss with friends'],
  14: ['Disappointed but ready to try again'],
  15: 'More than 3 hours',
  16: ['At a regular time', 'Mostly in the evening'],
  17: 'A few times a week',
  18: ['Tiredness or lack of sleep', 'Household responsibilities'],
  19: ['I plan it and start later'],
  20: ['I feel prepared and calm'],
  21: 'I balance school labs with entrance exam preparation. Spaced repetition flashcards help immensely.',
  22: 'Often',
  23: ['Competitive entrance exams', 'College application deadlines'],
  24: ['Play violin', 'Talk to a mentor', 'Walk outside'],
  25: ['I prefer not to burden others'],
  26: 'Sometimes',
  27: 'I prefer not to answer',
  28: 'Remembering that medicine is a long marathon, not a sprint.',
  29: 'Public speaking, scientific inquiry, and active listening.',
  30: ['Music', 'Debating / speech', 'Science / research'],
  31: ['Solving a complex diagnostic case in class'],
  32: 'Yes, especially during biology laboratory sessions.',
  33: 'A school peer wellness support initiative.',
  34: ['Desire to help others in need', 'Curiosity about life sciences'],
  35: ['Effort and strategic practice lead to mastery'],
  36: ['I seek feedback from experienced teachers'],
  37: ['When I help a classmate finally grasp a tough concept'],
  38: ['Physical exhaustion'],
  39: '1–2 hours',
  40: ['Medical lecture recordings', 'Connecting with study group'],
  41: ['A valuable tool when managed consciously'],
  42: 'Occasionally',
  43: ['No, it does not bother me'],
  44: 'Strict cutoff for screens after 10:30 PM.',
  45: ['Warmly encouraging and supportive'],
  46: ['Rarely'],
  47: ['Choice of medical college'],
  48: ['They trust my work ethic'],
  49: ['Taking enough rest'],
  50: 'Family tea time in the evening.',
  51: ['Close friends from debate society'],
  52: ['Honest feedback and mutual growth'],
  53: ['Rarely'],
  54: ['Cheering them up before exams'],
  55: 'To become a dedicated pediatric surgeon.',
  56: ['Serving underserved communities', 'Lifelong learning'],
  57: ['Missing clinical training opportunities'],
  58: ['Mentorship from healthcare professionals'],
  59: 'Integrity and kindness in all circumstances.',
  60: ['Letting down my team or patients in the future'],
  61: ['Mindful breathing and reviewing fundamentals'],
  62: 'Excelling in Class 12 finals and NEET entrance.',
  63: 'Students want guidance, not just pressure to top the ranks.',
  64: 'Clear, well-crafted questions that made me reflect deeply.',
};

// Partial answers for Diya Patel (In Progress - stopped at Section 4/5)
const DEMO_ANSWERS_DIYA: Record<number, string | string[]> = {
  1: 'Diya Patel',
  2: '14',
  3: '9',
  4: "The Mother's International School",
  5: 'Creative, energetic, friendly',
  6: 'Sketching comics and practicing gymnastics',
  7: 'I get distracted easily in quiet rooms and prefer soft background music.',
  8: 'I like some subjects more than others',
  9: 'Visual Arts and Biology, because I love illustrating anatomy diagrams.',
  10: ['Mathematics', 'Physics'],
  11: ['Understanding the idea', 'Solving problems quickly'],
  12: ['Pictures, diagrams or videos', 'Experiments / practical activities'],
  13: ['Ask a friend', 'Look it up online / in a book'],
  14: ['I feel I did not work effectively', 'Disappointed but ready to try again'],
  15: '30–60 minutes',
  16: ['Whenever I get time', 'Mostly in the evening'],
  17: 'Mainly before tests',
  18: ['Mobile / social media', 'Games or videos'],
  19: ['I wait until the deadline is close'],
  20: ['I know the material but feel nervous'],
  21: 'I study better with color-coded flashcards, but I struggle to sit still for longer than 30 minutes.',
};

// Partial answers for Kabir Sen (In Progress - stopped at Section 3)
const DEMO_ANSWERS_KABIR: Record<number, string | string[]> = {
  1: 'Kabir Sen',
  2: '17',
  3: '11',
  4: 'DPS International, Saket',
  5: 'Energetic, practical, curious',
  6: 'Football and video editing',
  7: 'I like organizing events more than studying textbooks.',
  8: 'I mainly study for marks or exams',
  9: 'Economics and Business Studies, because they deal with real markets and consumer decisions.',
  10: ['Mathematics'],
  11: ['Concentrating long enough', 'Solving problems quickly'],
  12: ['Examples from real life', 'Group activities'],
  13: ['Ask a friend', 'Look it up online / in a book'],
  14: ['Disappointed but ready to try again'],
};

/**
 * Normalizes class format for filter matching ('8', '9', '10', '11', '12', 'Others')
 */
export function normalizeClassGrade(grade?: string): string {
  if (!grade) return 'Others';
  const clean = grade.trim();
  if (clean.toLowerCase().includes('others')) return 'Others';
  const numMatch = clean.match(/\b(8|9|10|11|12)\b/);
  if (numMatch) return numMatch[1];
  return clean;
}

/**
 * Formats class for user-facing display ('Class 8', 'Class 9', ... or 'Others')
 */
export function formatClassDisplay(grade?: string): string {
  const norm = normalizeClassGrade(grade);
  if (norm === 'Others') return 'Others';
  if (norm.toLowerCase().startsWith('class')) return norm;
  return `Class ${norm}`;
}

/**
 * Reads all registered student records and resolves their status and answers
 */
export async function fetchAllStudentsWithStatus(): Promise<AdminStudentRecord[]> {
  let accounts = getStoredRegisteredAccounts();
  const currentStudent = getCurrentStudent();

  // Try fetching cloud students and submissions from Firestore backend
  let cloudSubmissionsMap: Record<string, SubmissionData> | null = null;
  try {
    const [cloudStudents, cloudSubs] = await Promise.all([
      getAllStudentsFromBackend(),
      getAllSubmissionsFromBackend(),
    ]);

    if (cloudStudents && cloudStudents.length > 0) {
      // Merge cloud students into accounts
      const localMap = new Map(accounts.map((a) => [a.id, a]));
      for (const cs of cloudStudents) {
        if (!localMap.has(cs.id)) {
          accounts.unshift(cs);
          localMap.set(cs.id, cs);
        } else {
          const existing = localMap.get(cs.id)!;
          localMap.set(cs.id, { ...existing, ...cs });
        }
      }
      accounts = Array.from(localMap.values());
      saveRegisteredAccounts(accounts);
    }
    cloudSubmissionsMap = cloudSubs;
  } catch (err) {
    console.warn('Could not sync with Firestore backend during fetchAllStudentsWithStatus:', err);
  }

  const records: AdminStudentRecord[] = accounts.map((acc) => {
    let answers: Record<number, string | string[]> = {};
    let status: QuestionnaireStatus = 'Not Started';
    let submittedAt: string | undefined;
    let updatedAt: string | undefined;

    // 0. Check Firestore cloud submissions map
    if (cloudSubmissionsMap && cloudSubmissionsMap[acc.id]) {
      const cloudSub = cloudSubmissionsMap[acc.id];
      if (cloudSub.answers && Object.keys(cloudSub.answers).length > 0) {
        answers = { ...cloudSub.answers };
        status = 'Submitted';
        submittedAt = cloudSub.submittedAt || acc.lastLoginAt;
        updatedAt = cloudSub.submittedAt;
      }
    }

    // 1. Try student-specific submission in localStorage
    if (status !== 'Submitted') {
      try {
        const subRaw = localStorage.getItem(`${STORAGE_PREFIX_SUBMISSION}${acc.id}`);
        if (subRaw) {
          const parsed = JSON.parse(subRaw);
          if (parsed.answers && Object.keys(parsed.answers).length > 0) {
            answers = parsed.answers;
            status = 'Submitted';
            submittedAt = parsed.submittedAt || acc.lastLoginAt;
            updatedAt = parsed.submittedAt;
          }
        }
      } catch {}
    }

    // 2. Try student-specific draft in localStorage if not submitted
    if (status !== 'Submitted') {
      try {
        const draftRaw = localStorage.getItem(`${STORAGE_PREFIX_DRAFT}${acc.id}`);
        if (draftRaw) {
          const parsed = JSON.parse(draftRaw);
          if (parsed.answers && Object.keys(parsed.answers).length > 0) {
            answers = parsed.answers;
            status = 'In Progress';
            updatedAt = parsed.updatedAt;
          }
        }
      } catch {}
    }

    // 3. If currently logged in student or demo student, check global storage keys
    if (status === 'Not Started' && (currentStudent?.id === acc.id || acc.id === 'student_demo_01')) {
      try {
        const globalSub = localStorage.getItem(GLOBAL_SUBMISSION_KEY);
        if (globalSub) {
          const parsed = JSON.parse(globalSub);
          if (parsed.answers && Object.keys(parsed.answers).length > 0) {
            answers = parsed.answers;
            status = 'Submitted';
            submittedAt = parsed.submittedAt;
            updatedAt = parsed.submittedAt;
          }
        } else {
          const globalDraft = localStorage.getItem(GLOBAL_DRAFT_KEY);
          if (globalDraft) {
            const parsed = JSON.parse(globalDraft);
            if (parsed.answers && Object.keys(parsed.answers).length > 0) {
              answers = parsed.answers;
              status = 'In Progress';
              updatedAt = parsed.updatedAt;
            }
          }
        }
      } catch {}
    }

    // 4. If no localStorage responses exist yet, resolve from pre-seeded demo records
    if (Object.keys(answers).length === 0) {
      if (acc.id === 'student_demo_01') {
        answers = { ...DEMO_ANSWERS_AARAV };
        status = 'Submitted';
        submittedAt = acc.lastLoginAt;
      } else if (acc.id === 'student_seed_03') {
        answers = { ...DEMO_ANSWERS_ROHAN };
        status = 'Submitted';
        submittedAt = acc.lastLoginAt;
      } else if (acc.id === 'student_seed_06') {
        answers = { ...DEMO_ANSWERS_MEERA };
        status = 'Submitted';
        submittedAt = acc.lastLoginAt;
      } else if (acc.id === 'student_seed_02') {
        answers = { ...DEMO_ANSWERS_DIYA };
        status = 'In Progress';
        updatedAt = acc.lastLoginAt;
      } else if (acc.id === 'student_seed_05') {
        answers = { ...DEMO_ANSWERS_KABIR };
        status = 'In Progress';
        updatedAt = acc.lastLoginAt;
      } else {
        // student_seed_04, student_seed_07 or newly registered students without answers
        answers = {};
        status = 'Not Started';
      }
    }

    // Always ensure Part 1 questions Q1-Q4 reflect the student's profile info if answers exist
    if (Object.keys(answers).length > 0) {
      if (acc.fullName) answers[1] = acc.fullName;
      if (acc.age) answers[2] = acc.age;
      if (acc.classGrade) answers[3] = normalizeClassGrade(acc.classGrade);
      if (acc.schoolName) answers[4] = acc.schoolName;
    }

    // Count answered questions
    const answeredCount = Object.keys(answers).filter((k) => {
      const val = answers[Number(k)];
      if (val === undefined || val === null) return false;
      if (typeof val === 'string') return val.trim().length > 0;
      if (Array.isArray(val)) return val.length > 0;
      return false;
    }).length;

    // Recalibrate status based on answers if not already submitted
    if (status !== 'Submitted') {
      if (answeredCount >= QUESTIONS.length) {
        status = 'Submitted';
      } else if (answeredCount > 0) {
        status = 'In Progress';
      } else {
        status = 'Not Started';
      }
    }

    return {
      id: acc.id,
      fullName: acc.fullName || 'Student',
      age: acc.age || '',
      classGrade: normalizeClassGrade(acc.classGrade),
      schoolName: acc.schoolName || 'Institution / School',
      email: acc.email || '',
      phone: acc.phone,
      status,
      answeredCount,
      totalQuestions: QUESTIONS.length,
      submittedAt,
      updatedAt,
      answers,
    };
  });

  // Sort alphabetically A-Z by full name
  return records.sort((a, b) => a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' }));
}

/**
 * Updates a student's profile details by the administrator.
 * Critical Rules:
 * - Updates in place without modifying or deleting questionnaire answers (Q5–Q64).
 * - Synchronizes personal info Q1–Q4 in answers if answers exist.
 * - Does not create a duplicate student.
 */
export async function updateStudentProfileByAdmin(
  studentId: string,
  updates: {
    fullName: string;
    age: string;
    classGrade: string;
    schoolName: string;
  }
): Promise<{ success: boolean; student?: AdminStudentRecord; error?: string }> {
  const cleanName = updates.fullName.trim();
  const cleanAge = updates.age.trim();
  const cleanClass = normalizeClassGrade(updates.classGrade);
  const cleanSchool = updates.schoolName.trim();

  if (!cleanName) {
    return { success: false, error: 'Student Name is required.' };
  }
  if (!cleanSchool) {
    return { success: false, error: 'Institution / School is required.' };
  }

  const accounts = getStoredRegisteredAccounts();
  const existingIdx = accounts.findIndex((a) => a.id === studentId);
  if (existingIdx === -1) {
    return { success: false, error: 'Student record could not be found.' };
  }

  const existingAccount = accounts[existingIdx];
  const updatedAccount: LocalStudentAccount = {
    ...existingAccount,
    fullName: cleanName,
    age: cleanAge,
    classGrade: cleanClass,
    schoolName: cleanSchool,
    badge: cleanClass === 'Others' ? 'Student' : `Class ${cleanClass} Student`,
    lastLoginAt: existingAccount.lastLoginAt || new Date().toISOString(),
  };

  accounts[existingIdx] = updatedAccount;
  saveRegisteredAccounts(accounts);

  // Sync to Firestore backend asynchronously
  updateStudentProfileInBackend(studentId, {
    fullName: cleanName,
    age: cleanAge,
    classGrade: cleanClass,
    schoolName: cleanSchool,
  }).catch((err) => {
    console.warn('Async cloud student profile update warning:', err);
  });

  // If the active student session matches this ID, sync it too
  const current = getCurrentStudent();
  if (current && current.id === studentId) {
    setStoredStudent(updatedAccount);
  }

  // Sync personal info fields Q1–Q4 in student's stored answers if any exist
  const updateAnswersForStorageKey = (key: string) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.answers) {
          parsed.answers[1] = cleanName;
          if (cleanAge) parsed.answers[2] = cleanAge;
          parsed.answers[3] = cleanClass;
          parsed.answers[4] = cleanSchool;
          localStorage.setItem(key, JSON.stringify(parsed));
        }
      }
    } catch {}
  };

  updateAnswersForStorageKey(`${STORAGE_PREFIX_SUBMISSION}${studentId}`);
  updateAnswersForStorageKey(`${STORAGE_PREFIX_DRAFT}${studentId}`);
  if (studentId === 'student_demo_01' || current?.id === studentId) {
    updateAnswersForStorageKey(GLOBAL_SUBMISSION_KEY);
    updateAnswersForStorageKey(GLOBAL_DRAFT_KEY);
  }

  const allUpdated = await fetchAllStudentsWithStatus();
  const updatedRecord = allUpdated.find((r) => r.id === studentId);

  return {
    success: true,
    student: updatedRecord,
  };
}

/**
 * Generates the context-aware uppercase report title based on current screen and filters.
 *
 * Specification rules:
 * - Main dashboard: ALL REGISTERED STUDENTS
 * - Class filter: CLASS 9 — STUDENT LIST
 * - Submitted filter: SUBMITTED STUDENTS
 * - Class + Submitted: CLASS 9 — SUBMITTED STUDENTS
 * - Search query: STUDENT LIST (SEARCH: "XYZ")
 * - Class + Search: CLASS 9 — STUDENT LIST (SEARCH: "XYZ")
 * - Individual student: STUDENT REPORT — [STUDENT NAME]
 */
export function getReportTitle(context: {
  view: 'list' | 'detail';
  student?: AdminStudentRecord | null;
  classFilter?: string;
  statusFilter?: string;
  searchQuery?: string;
}): string {
  if (context.view === 'detail' && context.student) {
    return `STUDENT REPORT — ${context.student.fullName.toUpperCase()}`;
  }

  const { classFilter = 'all', statusFilter = 'all', searchQuery = '' } = context;
  const cleanSearch = searchQuery.trim().toUpperCase();

  const classPrefix =
    classFilter !== 'all'
      ? classFilter === 'Others'
        ? 'OTHERS'
        : `CLASS ${classFilter}`
      : '';

  const statusName =
    statusFilter === 'Submitted'
      ? 'SUBMITTED STUDENTS'
      : statusFilter === 'In Progress'
      ? 'IN PROGRESS STUDENTS'
      : statusFilter === 'Not Started'
      ? 'NOT STARTED STUDENTS'
      : '';

  if (classPrefix && statusName) {
    const base = `${classPrefix} — ${statusName}`;
    return cleanSearch ? `${base} — SEARCH RESULTS — ${cleanSearch}` : base;
  }

  if (classPrefix && !statusName) {
    return cleanSearch ? `${classPrefix} — SEARCH RESULTS — ${cleanSearch}` : `${classPrefix} — STUDENT LIST`;
  }

  if (!classPrefix && statusName) {
    return cleanSearch ? `${statusName} — SEARCH RESULTS — ${cleanSearch}` : statusName;
  }

  if (cleanSearch) {
    return `SEARCH RESULTS — ${cleanSearch}`;
  }

  return 'ALL REGISTERED STUDENTS';
}
