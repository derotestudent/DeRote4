/**
 * Deterministic Insight Generation Engine for DeRote Student Insight System
 *
 * PHILOSOPHY: "Reflect, don't judge."
 * - Reflects student-reported choices, interests, and stated preferences.
 * - ZERO numerical scores, trait percentages, rankings, or personality archetypes.
 * - ZERO unsolicited improvement plans, weaknesses, or diagnostic labels.
 * - Explicit, reviewable traceability to specific question IDs and selected option IDs.
 */

import {
  QUESTION_BANK,
  QuestionDefinition,
  CUSTOM_OPTION_ID,
} from '../data/questionnaireBank';
import { QuestionnaireSession } from './questionnaireService';

export interface InsightEvidenceRef {
  questionId: string;
  questionNumber: number;
  questionTitle: string;
  selectedOptionTexts: string[];
}

export interface InsightCard {
  id: string; // 'what_draws_you_in' | 'how_you_explore_ideas' | 'how_you_approach_choices' | 'working_with_others' | 'what_helps_you_get_started' | 'your_voice_and_preferences'
  categoryKey: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  heading: string;
  reflectionText: string;
  iconName: 'Compass' | 'Lightbulb' | 'GitFork' | 'Users' | 'PlayCircle' | 'HeartHandshake';
  evidence: InsightEvidenceRef[];
  supportScore: number;
}

export interface StudentInsightReport {
  studentName: string;
  classGrade: string;
  submittedAt?: string;
  cards: InsightCard[];
  totalAnswered: number;
}

/**
 * Maps question option IDs to friendly reflective phrase fragments.
 */
interface OptionMapping {
  phrase: string;
  weight?: number;
}

// B1: What keeps you interested?
const B1_PHRASES: Record<string, OptionMapping> = {
  b1_1: { phrase: 'getting better through practice', weight: 2 },
  b1_2: { phrase: 'working out how things work', weight: 2 },
  b1_3: { phrase: 'making something of your own', weight: 2 },
  b1_4: { phrase: 'collaborating with others', weight: 2 },
  b1_5: { phrase: 'activities that help you relax or switch off', weight: 1.5 },
  b1_6: { phrase: 'welcoming a challenge or friendly competition', weight: 2 },
  b1_7: { phrase: 'developing skills for later in life', weight: 1.5 },
  b1_8: { phrase: 'exploring interests shared with someone you admire', weight: 1.5 },
};

// B2: Your exhibition project
const B2_PHRASES: Record<string, OptionMapping> = {
  b2_1: { phrase: 'building a working model', weight: 2.5 },
  b2_2: { phrase: 'investigating a puzzling question', weight: 2.5 },
  b2_3: { phrase: 'making a creative film, comic, or piece of music', weight: 2.5 },
  b2_4: { phrase: 'organising an interactive game or tournament', weight: 2.5 },
  b2_5: { phrase: 'exploring an entrepreneurial or stall project', weight: 2.5 },
  b2_6: { phrase: 'teaching and mentoring younger students', weight: 2.5 },
  b2_7: { phrase: 'writing and performing a story', weight: 2.5 },
  b2_8: { phrase: 'planning a solution for a local community issue', weight: 2.5 },
};

// B3: When something surprises you
const B3_PHRASES: Record<string, OptionMapping> = {
  b3_1: { phrase: 'asking questions to understand why it happened', weight: 2.5 },
  b3_2: { phrase: 'testing it again with a small change', weight: 2.5 },
  b3_3: { phrase: 'looking up the explanation directly', weight: 2.5 },
  b3_4: { phrase: 'talking it over with classmates', weight: 2 },
  b3_5: { phrase: 'waiting to hear the teacher’s explanation', weight: 1.5 },
  b3_6: { phrase: 'moving on to other topics that catch your attention', weight: 1.5 },
};

// B4: Interesting or useful?
const B4_PHRASES: Record<string, OptionMapping> = {
  b4_1: { phrase: 'choosing what sparks genuine interest', weight: 2 },
  b4_2: { phrase: 'weighing practical usefulness', weight: 2 },
  b4_3: { phrase: 'looking for ways to balance both interest and utility', weight: 2.5 },
  b4_4: { phrase: 'talking it through with people you trust', weight: 2.5 },
  b4_5: { phrase: 'gathering more information before deciding', weight: 2.5 },
  b4_7: { phrase: 'taking practical factors like scheduling into account', weight: 2 },
};

// B10: A busy week
const B10_PHRASES: Record<string, OptionMapping> = {
  b10_1: { phrase: 'making a rough plan for the week ahead', weight: 2.5 },
  b10_2: { phrase: 'starting with what feels most critical', weight: 2 },
  b10_3: { phrase: 'handling tasks in order of deadline', weight: 2 },
  b10_4: { phrase: 'starting with an engaging activity to build momentum', weight: 2 },
  b10_5: { phrase: 'organising your schedule around what matters most to you', weight: 2 },
  b10_6: { phrase: 'asking someone to help you structure the priorities', weight: 2 },
};

// B8: When your group disagrees
const B8_PHRASES: Record<string, OptionMapping> = {
  b8_1: { phrase: 'explaining your perspective to persuade others', weight: 2 },
  b8_2: { phrase: 'supporting the group’s chosen direction when time is short', weight: 2 },
  b8_3: { phrase: 'suggesting a quick way to test multiple ideas', weight: 2.5 },
  b8_4: { phrase: 'combining the best parts of different ideas', weight: 2.5 },
  b8_5: { phrase: 'asking a neutral teacher or peer to help choose', weight: 2 },
  b8_6: { phrase: 'focusing carefully on completing your own part', weight: 1.5 },
  b8_7: { phrase: 'sharing your idea once and then backing the team decision', weight: 2 },
};

// B9: What makes group work easier?
const B9_PHRASES: Record<string, OptionMapping> = {
  b9_1: { phrase: 'having clear individual roles', weight: 2 },
  b9_2: { phrase: 'being able to choose your teammates', weight: 1.5 },
  b9_3: { phrase: 'working in compact groups of two or three', weight: 2 },
  b9_4: { phrase: 'knowing that diverse ideas are welcomed', weight: 2 },
  b9_5: { phrase: 'having someone help coordinate the steps', weight: 2 },
  b9_6: { phrase: 'sharing the workload fairly', weight: 2 },
  b9_7: { phrase: 'having enough time for open discussion', weight: 2 },
  b9_8: { phrase: 'having a calmer, quieter workspace', weight: 1.5 },
};

// B12: Choosing a quiz team
const B12_PHRASES: Record<string, OptionMapping> = {
  b12_A: { phrase: 'teaming up with a close friend', weight: 1.5 },
  b12_B: { phrase: 'prioritising deep subject knowledge', weight: 2 },
  b12_C: { phrase: 'giving a classmate an opportunity to represent the group', weight: 2 },
  b12_D: { phrase: 'valuing quiet, careful accuracy', weight: 2 },
  b12_E: { phrase: 'keeping the group relaxed and in good spirits', weight: 2 },
};

// B13: Who gets the credit?
const B13_PHRASES: Record<string, OptionMapping> = {
  b13_1: { phrase: 'politely clarifying your contribution', weight: 2 },
  b13_2: { phrase: 'focusing on the team’s overall success', weight: 2 },
  b13_3: { phrase: 'talking with teammates to share credit fairly in future', weight: 2.5 },
  b13_5: { phrase: 'valuing team progress over individual recognition', weight: 2 },
  b13_6: { phrase: 'checking in with a friend for advice', weight: 1.5 },
};

// B11: Getting started
const B11_PHRASES: Record<string, OptionMapping> = {
  b11_1: { phrase: 'breaking a task into a tiny first step', weight: 2.5 },
  b11_2: { phrase: 'working alongside someone else', weight: 2 },
  b11_3: { phrase: 'setting a specific time and sticking to it', weight: 2 },
  b11_4: { phrase: 'having an external deadline known to others', weight: 2 },
  b11_5: { phrase: 'finding a way to make the task more interesting', weight: 2 },
  b11_6: { phrase: 'putting distractions out of sight', weight: 2 },
  b11_7: { phrase: 'planning a small reward afterwards', weight: 1.5 },
  b11_8: { phrase: 'setting a clear note or reminder', weight: 1.5 },
};

// B7: What helps you try again?
const B7_PHRASES: Record<string, OptionMapping> = {
  b7_1: { phrase: 'knowing specifically what to adjust', weight: 2.5 },
  b7_2: { phrase: 'encouragement from someone you trust', weight: 2 },
  b7_3: { phrase: 'taking a brief pause before restarting', weight: 2 },
  b7_4: { phrase: 'seeing examples of how others improved', weight: 2 },
  b7_5: { phrase: 'taking smaller, manageable steps', weight: 2.5 },
  b7_6: { phrase: 'starting fresh with a different task', weight: 2 },
};

// B6: When things don’t go as hoped
const B6_PHRASES: Record<string, OptionMapping> = {
  b6_1: { phrase: 'reviewing what happened and planning adjustments', weight: 2 },
  b6_2: { phrase: 'taking a break for a while', weight: 1.5 },
  b6_3: { phrase: 'talking through the experience with someone', weight: 2 },
  b6_4: { phrase: 'practising right away', weight: 2 },
  b6_5: { phrase: 'exploring a different approach', weight: 2 },
};

// B14: Sharing ideas or asking for help
const B14_PHRASES: Record<string, OptionMapping> = {
  b14_1: { phrase: 'knowing that mistakes are treated as normal parts of learning', weight: 2 },
  b14_2: { phrase: 'being able to ask questions privately or in writing', weight: 2.5 },
  b14_3: { phrase: 'talking through an idea with a partner first', weight: 2 },
  b14_4: { phrase: 'having time to think before answering', weight: 2.5 },
  b14_5: { phrase: 'having a teacher check in gently without drawing attention', weight: 2 },
  b14_6: { phrase: 'showing ideas visually or through hands-on work', weight: 2 },
  b14_7: { phrase: 'discussing in a smaller group setting', weight: 2 },
  b14_8: { phrase: 'knowing you won’t be compared to others', weight: 2 },
};

// B15: What would you like teachers to understand?
const B15_PHRASES: Record<string, OptionMapping> = {
  b15_1: { phrase: 'having clear instructions to get started', weight: 2 },
  b15_2: { phrase: 'having a moment to think before answering', weight: 2.5 },
  b15_3: { phrase: 'recognising interests that might not show in marks', weight: 2.5 },
  b15_4: { phrase: 'receiving feedback that highlights both positives and adjustments', weight: 2 },
  b15_5: { phrase: 'being able to ask for help privately', weight: 2.5 },
  b15_6: { phrase: 'having different ways to demonstrate what you know', weight: 2.5 },
  b15_7: { phrase: 'having more opportunities to explore personal interests', weight: 2 },
};

/**
 * Helper to extract option texts and definitions for evidence traceability.
 */
function extractEvidence(
  questionId: string,
  selectedIds: string[],
  customText?: string
): InsightEvidenceRef | null {
  const qDef = QUESTION_BANK.find((q) => q.id === questionId);
  if (!qDef) return null;

  const validSelected = selectedIds.filter(
    (id) => id !== 'b1_9' && id !== 'b1_10' && id !== 'b2_9' && id !== 'b3_9' && id !== 'b6_10' && id !== 'b7_8' && id !== 'b9_10' && id !== 'b11_9' && id !== 'b11_10' && id !== 'b15_8'
  );

  if (validSelected.length === 0) return null;

  const texts: string[] = [];
  for (const id of validSelected) {
    if (id === CUSTOM_OPTION_ID) {
      if (customText && customText.trim()) {
        texts.push(`Self-written: "${customText.trim()}"`);
      }
    } else {
      const opt = qDef.options.find((o) => o.id === id);
      if (opt) {
        texts.push(opt.text);
      }
    }
  }

  if (texts.length === 0) return null;

  return {
    questionId: qDef.id,
    questionNumber: qDef.number,
    questionTitle: qDef.title,
    selectedOptionTexts: texts,
  };
}

/**
 * Builds friendly English list (e.g. "A, B, and C")
 */
function joinPhrases(phrases: string[]): string {
  if (phrases.length === 0) return '';
  if (phrases.length === 1) return phrases[0];
  if (phrases.length === 2) return `${phrases[0]} or ${phrases[1]}`;
  const head = phrases.slice(0, phrases.length - 1).join(', ');
  return `${head}, or ${phrases[phrases.length - 1]}`;
}

/**
 * Generates the student insight cards deterministically from the session answers.
 */
export function generateStudentInsightReport(
  session: QuestionnaireSession,
  studentName?: string,
  classGrade?: string
): StudentInsightReport {
  const resolvedStudentName = studentName || session.studentName || 'Student';
  const resolvedClassGrade = classGrade || session.classGrade || 'Class 10';
  const answers = session.answers || {};

  // Count total questions with any valid answer
  const totalAnswered = Object.values(answers).filter(
    (a) => (a.status === 'answered' || !a.status) && a.selectedOptions && a.selectedOptions.length > 0
  ).length;

  const candidateCards: InsightCard[] = [];

  // =========================================================================
  // THEME A: WHAT DRAWS YOU IN (Questions B1, B2)
  // =========================================================================
  const b1 = answers['B1'];
  const b2 = answers['B2'];
  const evidenceA: InsightEvidenceRef[] = [];
  const phrasesA: string[] = [];
  let scoreA = 0;

  if (b1 && b1.selectedOptions.length > 0) {
    const ev = extractEvidence('B1', b1.selectedOptions, b1.customText);
    if (ev) evidenceA.push(ev);
    b1.selectedOptions.forEach((optId) => {
      if (B1_PHRASES[optId]) {
        phrasesA.push(B1_PHRASES[optId].phrase);
        scoreA += B1_PHRASES[optId].weight || 1;
      }
    });
  }

  if (b2 && b2.selectedOptions.length > 0) {
    const ev = extractEvidence('B2', b2.selectedOptions, b2.customText);
    if (ev) evidenceA.push(ev);
    b2.selectedOptions.forEach((optId) => {
      if (B2_PHRASES[optId]) {
        phrasesA.push(B2_PHRASES[optId].phrase);
        scoreA += B2_PHRASES[optId].weight || 1;
      }
    });
  }

  if (phrasesA.length > 0 && evidenceA.length > 0) {
    const selectedText = joinPhrases(phrasesA.slice(0, 3));
    candidateCards.push({
      id: 'what_draws_you_in',
      categoryKey: 'A',
      heading: 'What Draws You In',
      reflectionText: `Your answers mention activities involving ${selectedText}. These may be some of the kinds of activities that catch your interest.`,
      iconName: 'Compass',
      evidence: evidenceA,
      supportScore: scoreA,
    });
  }

  // =========================================================================
  // THEME B: HOW YOU EXPLORE IDEAS (Questions B3, B1)
  // =========================================================================
  const b3 = answers['B3'];
  const evidenceB: InsightEvidenceRef[] = [];
  const phrasesB: string[] = [];
  let scoreB = 0;

  if (b3 && b3.selectedOptions.length > 0) {
    const ev = extractEvidence('B3', b3.selectedOptions, b3.customText);
    if (ev) evidenceB.push(ev);
    b3.selectedOptions.forEach((optId) => {
      if (B3_PHRASES[optId]) {
        phrasesB.push(B3_PHRASES[optId].phrase);
        scoreB += B3_PHRASES[optId].weight || 1;
      }
    });
  }

  if (phrasesB.length > 0 && evidenceB.length > 0) {
    const selectedText = joinPhrases(phrasesB.slice(0, 2));
    candidateCards.push({
      id: 'how_you_explore_ideas',
      categoryKey: 'B',
      heading: 'How You Explore Ideas',
      reflectionText: `When something unexpected happens, you selected ${selectedText}. Those are approaches you expressed interest in using in that situation.`,
      iconName: 'Lightbulb',
      evidence: evidenceB,
      supportScore: scoreB + 1, // High salience question
    });
  }

  // =========================================================================
  // THEME C: HOW YOU APPROACH CHOICES (Questions B4, B10)
  // =========================================================================
  const b4 = answers['B4'];
  const b10 = answers['B10'];
  const evidenceC: InsightEvidenceRef[] = [];
  const phrasesC: string[] = [];
  let scoreC = 0;

  if (b4 && b4.selectedOptions.length > 0) {
    const ev = extractEvidence('B4', b4.selectedOptions, b4.customText);
    if (ev) evidenceC.push(ev);
    b4.selectedOptions.forEach((optId) => {
      if (B4_PHRASES[optId]) {
        phrasesC.push(B4_PHRASES[optId].phrase);
        scoreC += B4_PHRASES[optId].weight || 1;
      }
    });
  }

  if (b10 && b10.selectedOptions.length > 0) {
    const ev = extractEvidence('B10', b10.selectedOptions, b10.customText);
    if (ev) evidenceC.push(ev);
    b10.selectedOptions.forEach((optId) => {
      if (B10_PHRASES[optId]) {
        phrasesC.push(B10_PHRASES[optId].phrase);
        scoreC += B10_PHRASES[optId].weight || 1;
      }
    });
  }

  if (phrasesC.length > 0 && evidenceC.length > 0) {
    const selectedText = joinPhrases(phrasesC.slice(0, 2));
    candidateCards.push({
      id: 'how_you_approach_choices',
      categoryKey: 'C',
      heading: 'How You Approach Choices',
      reflectionText: `Your answers show that you considered different ways of approaching a choice, including ${selectedText}.`,
      iconName: 'GitFork',
      evidence: evidenceC,
      supportScore: scoreC,
    });
  }

  // =========================================================================
  // THEME D: WORKING WITH OTHERS (Questions B8, B9, B12, B13)
  // =========================================================================
  const b8 = answers['B8'];
  const b9 = answers['B9'];
  const b12 = answers['B12'];
  const b13 = answers['B13'];
  const evidenceD: InsightEvidenceRef[] = [];
  const phrasesD: string[] = [];
  let scoreD = 0;

  if (b9 && b9.selectedOptions.length > 0) {
    const ev = extractEvidence('B9', b9.selectedOptions, b9.customText);
    if (ev) evidenceD.push(ev);
    b9.selectedOptions.forEach((optId) => {
      if (B9_PHRASES[optId]) {
        phrasesD.push(B9_PHRASES[optId].phrase);
        scoreD += B9_PHRASES[optId].weight || 1;
      }
    });
  }

  if (b8 && b8.selectedOptions.length > 0) {
    const ev = extractEvidence('B8', b8.selectedOptions, b8.customText);
    if (ev) evidenceD.push(ev);
    b8.selectedOptions.forEach((optId) => {
      if (B8_PHRASES[optId]) {
        phrasesD.push(B8_PHRASES[optId].phrase);
        scoreD += B8_PHRASES[optId].weight || 1;
      }
    });
  }

  if (b12 && b12.selectedOptions.length > 0) {
    const ev = extractEvidence('B12', b12.selectedOptions, b12.customText);
    if (ev) evidenceD.push(ev);
    b12.selectedOptions.forEach((optId) => {
      if (B12_PHRASES[optId]) {
        phrasesD.push(B12_PHRASES[optId].phrase);
        scoreD += B12_PHRASES[optId].weight || 1;
      }
    });
  }

  if (b13 && b13.selectedOptions.length > 0) {
    const ev = extractEvidence('B13', b13.selectedOptions, b13.customText);
    if (ev) evidenceD.push(ev);
    b13.selectedOptions.forEach((optId) => {
      if (B13_PHRASES[optId]) {
        phrasesD.push(B13_PHRASES[optId].phrase);
        scoreD += B13_PHRASES[optId].weight || 1;
      }
    });
  }

  if (phrasesD.length > 0 && evidenceD.length > 0) {
    const selectedText = joinPhrases(phrasesD.slice(0, 3));
    candidateCards.push({
      id: 'working_with_others',
      categoryKey: 'D',
      heading: 'Working With Others',
      reflectionText: `You highlighted ${selectedText} as things that can make group work easier for you.`,
      iconName: 'Users',
      evidence: evidenceD,
      supportScore: scoreD,
    });
  }

  // =========================================================================
  // THEME E: WHAT HELPS YOU GET STARTED (Questions B11, B7, B6)
  // =========================================================================
  const b11 = answers['B11'];
  const b7 = answers['B7'];
  const b6 = answers['B6'];
  const evidenceE: InsightEvidenceRef[] = [];
  const phrasesE: string[] = [];
  let scoreE = 0;

  if (b11 && b11.selectedOptions.length > 0) {
    const ev = extractEvidence('B11', b11.selectedOptions, b11.customText);
    if (ev) evidenceE.push(ev);
    b11.selectedOptions.forEach((optId) => {
      if (B11_PHRASES[optId]) {
        phrasesE.push(B11_PHRASES[optId].phrase);
        scoreE += B11_PHRASES[optId].weight || 1;
      }
    });
  }

  if (b7 && b7.selectedOptions.length > 0) {
    const ev = extractEvidence('B7', b7.selectedOptions, b7.customText);
    if (ev) evidenceE.push(ev);
    b7.selectedOptions.forEach((optId) => {
      if (B7_PHRASES[optId]) {
        phrasesE.push(B7_PHRASES[optId].phrase);
        scoreE += B7_PHRASES[optId].weight || 1;
      }
    });
  }

  if (b6 && b6.selectedOptions.length > 0) {
    const ev = extractEvidence('B6', b6.selectedOptions, b6.customText);
    if (ev) evidenceE.push(ev);
    b6.selectedOptions.forEach((optId) => {
      if (B6_PHRASES[optId]) {
        phrasesE.push(B6_PHRASES[optId].phrase);
        scoreE += B6_PHRASES[optId].weight || 1;
      }
    });
  }

  if (phrasesE.length > 0 && evidenceE.length > 0) {
    const selectedText = joinPhrases(phrasesE.slice(0, 2));
    candidateCards.push({
      id: 'what_helps_you_get_started',
      categoryKey: 'E',
      heading: 'What Helps You Get Started',
      reflectionText: `You selected ${selectedText} as something that could help you get started or find momentum.`,
      iconName: 'PlayCircle',
      evidence: evidenceE,
      supportScore: scoreE,
    });
  }

  // =========================================================================
  // THEME F: YOUR VOICE AND PREFERENCES (Questions B14, B15)
  // =========================================================================
  const b14 = answers['B14'];
  const b15 = answers['B15'];
  const evidenceF: InsightEvidenceRef[] = [];
  const phrasesF: string[] = [];
  let scoreF = 0;

  if (b14 && b14.selectedOptions.length > 0) {
    const ev = extractEvidence('B14', b14.selectedOptions, b14.customText);
    if (ev) evidenceF.push(ev);
    b14.selectedOptions.forEach((optId) => {
      if (B14_PHRASES[optId]) {
        phrasesF.push(B14_PHRASES[optId].phrase);
        scoreF += B14_PHRASES[optId].weight || 1;
      }
    });
  }

  if (b15 && b15.selectedOptions.length > 0) {
    const ev = extractEvidence('B15', b15.selectedOptions, b15.customText);
    if (ev) evidenceF.push(ev);
    b15.selectedOptions.forEach((optId) => {
      if (B15_PHRASES[optId]) {
        phrasesF.push(B15_PHRASES[optId].phrase);
        scoreF += B15_PHRASES[optId].weight || 1;
      }
    });
  }

  if (phrasesF.length > 0 && evidenceF.length > 0) {
    const selectedText = joinPhrases(phrasesF.slice(0, 2));
    candidateCards.push({
      id: 'your_voice_and_preferences',
      categoryKey: 'F',
      heading: 'Your Voice and Preferences',
      reflectionText: `You indicated that ${selectedText} can make sharing ideas and asking questions feel more comfortable.`,
      iconName: 'HeartHandshake',
      evidence: evidenceF,
      supportScore: scoreF,
    });
  }

  // =========================================================================
  // SELECTION OF 3 TO 4 CARDS:
  // Sort candidate cards by support score (how solidly anchored in responses)
  // Ensure we display 3 or 4 cards if supported, or fewer if answers are limited.
  // =========================================================================
  candidateCards.sort((a, b) => b.supportScore - a.supportScore);

  // Take at most 4 cards (or 3 minimum if available, else whatever is supported)
  const maxCards = candidateCards.length >= 4 ? 4 : candidateCards.length;
  const finalCards = candidateCards.slice(0, maxCards);

  return {
    studentName: resolvedStudentName,
    classGrade: resolvedClassGrade,
    submittedAt: session.submittedAt,
    cards: finalCards,
    totalAnswered,
  };
}
