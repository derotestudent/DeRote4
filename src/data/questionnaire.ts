// DeRote Student Self-Discovery Questionnaire
// Source of truth: the HOD's PDF. Wording and order are copied from it exactly.
// Nothing is required: the PDF says students may leave open questions blank
// and may choose "Prefer not to answer" where provided.
//
// 'single' = pick one option, 'multi' = tick any that apply.
// The PDF does not say which tickbox questions are single or multi (only Q56
// says "Choose any that fit"). The choices below are a first guess. To change
// one, swap 's' for 'm' (or the reverse) on that line. Confirm with the HOD.

export const QUESTIONNAIRE_VERSION = 2;

export type TextQuestion = {
  n: number;
  section: number;
  type: 'text';
  text: string;
  lines: number; // number of ruled lines on the PDF, used as the box height
};

export type ChoiceQuestion = {
  n: number;
  section: number;
  type: 'single' | 'multi';
  text: string;
  options: string[];
};

export type Question = TextQuestion | ChoiceQuestion;

// In a multi question, picking one of these should clear the other ticks.
export const EXCLUSIVE_OPTIONS = [
  'Prefer not to answer',
  'No subject in particular',
  'Nothing in particular',
  'I do not relate to these',
];

export const INTRO = {
  title: 'STUDENT SELF-DISCOVERY QUESTIONNAIRE',
  subtitle: 'Classes 8–12 | Approx. 25 minutes',
  whyHeading: 'WHY ARE YOU FILLING THIS IN?',
  why: [
    'This questionnaire gives you a chance to share how you experience studying, everyday life, relationships, interests, feelings and future hopes. There are no right or wrong answers. Your honest answers can help adults understand your point of view.',
    'Answer only what you feel comfortable answering. You may choose “Prefer not to answer” where provided, and you can leave an open question blank. This is not an exam or a test.',
  ],
  beforeYouBegin:
    'Ask the person giving you this form who will read your answers and how they will be used. Your privacy should be respected. If you share something that suggests you or someone else may be unsafe, a trusted adult may need to help.',
};

export const OUTRO = {
  heading: 'THANK YOU FOR SHARING YOUR POINT OF VIEW',
  text: 'Your answers help adults hear your perspective. You do not have to be perfect, have everything figured out, or answer every question.',
};

export const SECTIONS: { id: number; title: string; intro?: string }[] = [
  { id: 1, title: 'ABOUT ME — PART 1', intro: 'Tell us your personal information.' },
  { id: 2, title: 'ABOUT ME — PART 2', intro: 'A few quick reflections about yourself.' },
  { id: 3, title: 'MY ACADEMIC WORLD' },
  { id: 4, title: 'MY STUDY HABITS' },
  {
    id: 5,
    title: 'MY FEELINGS AND INNER WORLD',
    intro:
      'Feelings can change from day to day. You do not need to share anything you are not comfortable sharing.',
  },
  { id: 6, title: 'MY STRENGTHS, INTERESTS AND TALENTS' },
  { id: 7, title: 'MY MOTIVATION AND MINDSET' },
  { id: 8, title: 'MY DIGITAL LIFE' },
  { id: 9, title: 'MY FAMILY AND HOME' },
  { id: 10, title: 'MY FRIENDS AND SOCIAL WORLD' },
  { id: 11, title: 'MY DREAMS AND FUTURE' },
  { id: 12, title: 'MY FEARS AND CHALLENGES' },
  { id: 13, title: 'MY OWN VOICE' },
];

const t = (n: number, section: number, text: string, lines: number): TextQuestion => ({ n, section, type: 'text', text, lines });
const s = (n: number, section: number, text: string, options: string[]): ChoiceQuestion => ({ n, section, type: 'single', text, options });
const m = (n: number, section: number, text: string, options: string[]): ChoiceQuestion => ({ n, section, type: 'multi', text, options });

export const QUESTIONS: Question[] = [
  // SECTION 1 | ABOUT ME — PART 1 (Personal Information)
  t(1, 1, 'Name:', 1),
  t(2, 1, 'Age:', 1),
  s(3, 1, 'Class:', [
    '8',
    '9',
    '10',
    '11',
    '12',
    'Others',
  ]),
  t(4, 1, 'School and Institute:', 1),

  // SECTION 2 | ABOUT ME — PART 2
  t(5, 2, 'What are three words you would use to describe yourself?', 2),
  t(6, 2, 'What do you most enjoy doing when you have free time?', 2),
  t(7, 2, 'What is something about you that people may not easily notice?', 2),

  // SECTION 3 | MY ACADEMIC WORLD
  s(8, 3, 'How do you generally feel about studying?', [
    'I enjoy learning new things',
    'I like some subjects more than others',
    'I mainly study for marks or exams',
    'I often feel pressure about studying',
    'I find studying difficult to enjoy',
    'It changes from day to day',
    'Prefer not to answer',
  ]),
  t(9, 3, 'Which subjects do you enjoy most, and what do you like about them?', 2),
  m(10, 3, 'Which subjects or topics feel most difficult at present?', [
    'Mathematics',
    'Science',
    'English / languages',
    'Social science',
    'Computer / technology',
    'Other subject',
    'No subject in particular',
  ]),
  m(11, 3, 'When a topic is difficult, what is usually hardest for you?', [
    'Understanding the idea',
    'Remembering facts or steps',
    'Applying ideas to new questions',
    'Reading or understanding the question',
    'Solving problems quickly',
    'Writing answers clearly',
    'Concentrating long enough',
    'I am not sure',
    'Other',
  ]),
  m(12, 3, 'Which ways of learning help you understand best?', [
    'Teacher explanation',
    'Examples from real life',
    'Experiments / practical activities',
    'Pictures, diagrams or videos',
    'Reading by myself',
    'Discussing with friends',
    'Solving questions by myself',
    'Group activities',
    'Other',
  ]),
  m(13, 3, 'When you do not understand something in class, what do you usually do?', [
    'Ask the teacher',
    'Ask a friend',
    'Look it up online / in a book',
    'Try again later',
    'Stay quiet even if confused',
    'Leave it and move on',
    'Other',
  ]),
  m(14, 3, 'How do you usually feel when you receive marks lower than you expected?', [
    'Disappointed but ready to try again',
    'Worried about what others will think',
    "Afraid of parents' / teachers' reaction",
    'I feel I did not work effectively',
    'I lose motivation for a while',
    'I feel unsure what went wrong',
    'Other',
    'Prefer not to answer',
  ]),

  // SECTION 4 | MY STUDY HABITS
  s(15, 4, 'On a usual school day, how much time do you spend studying outside class (not counting school or coaching)?', [
    'Less than 30 minutes',
    '30–60 minutes',
    '1–2 hours',
    '2–3 hours',
    'More than 3 hours',
    'It varies a lot',
  ]),
  m(16, 4, 'When do you usually study?', [
    'At a regular time',
    'Mostly in the evening',
    'Late at night',
    'Early in the morning',
    'Mostly just before tests',
    'Whenever I get time',
    'I do not have a regular routine',
  ]),
  s(17, 4, 'How often do you revise what you learned earlier?', [
    'Almost every day',
    'A few times a week',
    'Mainly before tests',
    'Only when asked',
    'Rarely',
    'I am unsure how to revise',
  ]),
  m(18, 4, 'What most often interrupts or delays your study time?', [
    'Mobile / social media',
    'Games or videos',
    'Friends or family activities',
    'Tiredness or lack of sleep',
    'Not knowing where to start',
    'Finding the work difficult',
    'Worry or overthinking',
    'Household responsibilities',
    'Noise / lack of space',
    'I put it off even when I have time',
    'Other',
  ]),
  m(19, 4, 'When you have homework or a task, how do you usually begin?', [
    'I start soon',
    'I plan it and start later',
    'I wait until the deadline is close',
    'I need someone to remind me',
    'I sometimes avoid starting',
    'It depends on the task',
  ]),
  m(20, 4, 'What is your usual experience during exams?', [
    'I feel prepared and calm',
    'I know the material but feel nervous',
    'I forget things under pressure',
    'I struggle to finish on time',
    'I find the questions different from practice',
    'I often begin preparation late',
    'My experience varies',
  ]),
  t(21, 4, 'Describe your usual study routine, including what works well and what is difficult.', 3),

  // SECTION 5 | MY FEELINGS AND INNER WORLD
  s(22, 5, 'During the past few weeks, how often have you felt overwhelmed by schoolwork or expectations?', [
    'Never',
    'Rarely',
    'Sometimes',
    'Often',
    'Almost always',
    'Prefer not to answer',
  ]),
  m(23, 5, 'What kinds of things have been on your mind or worried you recently?', [
    'Marks or exams',
    'Expectations from family',
    'Expectations from teachers',
    'Future or career',
    'Friendships or relationships',
    'Comparing myself with others',
    'Making mistakes or failing',
    'Money or responsibilities at home',
    'Health or personal matters',
    'Nothing in particular',
    'Something else',
    'Prefer not to answer',
  ]),
  m(24, 5, 'When you feel upset, worried or disappointed, what do you usually do?', [
    'Talk to someone I trust',
    'Spend time alone',
    'Listen to music / do an activity',
    'Use my phone or play games',
    'Try to solve the problem myself',
    'Keep it to myself',
    'I am not sure',
    'Prefer not to answer',
  ]),
  s(25, 5, 'How comfortable do you feel talking to an adult when something is bothering you?', [
    'Very comfortable',
    'Somewhat comfortable',
    'Not very comfortable',
    'Not comfortable at all',
    'It depends on the person',
    'Prefer not to answer',
  ]),
  t(26, 5, 'What situations make you feel proud, happy or confident?', 2),
  t(27, 5, 'Is there something you wish adults understood better about your feelings or experiences?', 3),

  // SECTION 6 | MY STRENGTHS, INTERESTS AND TALENTS
  m(28, 6, 'What do you think you are good at? This can be academic or non-academic.', [
    'Explaining ideas',
    'Solving problems',
    'Making / building things',
    'Drawing / designing / creating',
    'Sports or physical activities',
    'Helping or caring for others',
    'Organising or leading',
    'Writing / speaking',
    'Technology / digital skills',
    'Remembering details',
    'Observing / asking questions',
    'Something else',
    'I am still discovering my strengths',
  ]),
  t(29, 6, 'What activity makes you so interested that you lose track of time?', 2),
  t(30, 6, 'What is something you have done that you feel proud of, even if other people did not notice?', 2),
  t(31, 6, 'What do friends, classmates or family members usually ask you for help with?', 2),
  t(32, 6, 'What would you like to become better at, and why?', 2),

  // SECTION 7 | MY MOTIVATION AND MINDSET
  m(33, 7, 'What usually motivates you to study or work towards a goal?', [
    'Curiosity / learning',
    'Achieving good marks',
    'My future career',
    'Making my family proud',
    'Personal challenge',
    'Teacher encouragement',
    'Friends / competition',
    'Recognition or rewards',
    'Solving real-world problems',
    'I am still figuring this out',
    'Other',
  ]),
  m(34, 7, 'What tends to reduce your motivation?', [
    'The work feels too difficult',
    'I do not see the purpose',
    'Fear of getting it wrong',
    'Pressure or too many expectations',
    'Comparing myself with others',
    'I do not see progress',
    'Distractions',
    'Tiredness',
    'Lack of support',
    'Other',
    'Prefer not to answer',
  ]),
  m(35, 7, 'When you make a mistake or fail at something, what do you usually think or do?', [
    'Try again in a different way',
    'Ask someone for help',
    'Think about what went wrong',
    'Feel disappointed but continue later',
    'Avoid trying again for a while',
    'Worry that I am not good enough',
    'It depends on the situation',
    'Other',
  ]),
  t(36, 7, 'Who inspires you, and what do you admire about that person?', 2),
  t(37, 7, 'What makes a day feel meaningful or successful to you?', 2),

  // SECTION 8 | MY DIGITAL LIFE
  s(38, 8, 'On a usual day, how much time do you spend on a phone or other personal screen outside schoolwork?', [
    'Less than 1 hour',
    '1–2 hours',
    '2–3 hours',
    '3–5 hours',
    'More than 5 hours',
    'I do not know',
  ]),
  m(39, 8, 'What do you mainly use your phone or the internet for?', [
    'Study / learning',
    'Messaging or calls',
    'Social media',
    'Videos / entertainment',
    'Games',
    'News / information',
    'Creative work',
    'Other',
  ]),
  s(40, 8, 'How does your screen use affect your sleep, study, mood or relationships, if at all?', [
    'Mostly helps me',
    'Mostly distracts me',
    'Both helps and distracts me',
    'I have not noticed an effect',
    'I am unsure',
    'Prefer not to answer',
  ]),
  s(41, 8, 'When you intend to stop using a device and return to another activity, how easy or difficult is that for you?', [
    'Very easy',
    'Somewhat easy',
    'Somewhat difficult',
    'Very difficult',
    'It depends on what I am doing',
    'Prefer not to answer',
  ]),

  // SECTION 9 | MY FAMILY AND HOME
  s(42, 9, 'How comfortable do you feel sharing your thoughts and problems with your family?', [
    'Very comfortable',
    'Mostly comfortable',
    'Sometimes comfortable',
    'Rarely comfortable',
    'Not comfortable',
    'It depends on the topic',
    'Prefer not to answer',
  ]),
  t(43, 9, 'What do you feel your family expects from you regarding studies and your future?', 2),
  m(44, 9, 'How do you usually experience conversations at home about marks or academic performance?', [
    'Encouraging',
    'Practical and focused on improvement',
    'Mostly focused on marks',
    'I feel compared with others',
    'I feel pressure or worry',
    'We rarely discuss it',
    'It varies',
    'Prefer not to answer',
  ]),
  m(45, 9, 'What is your usual study environment at home?', [
    'Quiet place of my own',
    'Shared room / shared space',
    'Often noisy or interrupted',
    'I do not have a regular study place',
    'I often have household responsibilities',
    'It changes day to day',
    'Other',
    'Prefer not to answer',
  ]),
  t(46, 9, 'What do you wish your family knew about your daily life, effort or challenges?', 3),

  // SECTION 10 | MY FRIENDS AND SOCIAL WORLD
  m(47, 10, 'How do you usually feel around classmates and friends?', [
    'I feel accepted and comfortable',
    'I have a few close friends',
    'I often feel left out',
    'I find it hard to make friends',
    'I feel pressure to fit in',
    'It changes depending on the group',
    'Prefer not to answer',
  ]),
  s(48, 10, 'How often do you compare your marks, appearance, abilities or life with other people?', [
    'Never',
    'Rarely',
    'Sometimes',
    'Often',
    'Very often',
    'Prefer not to answer',
  ]),
  s(49, 10, 'Have friends or classmates ever influenced a decision you made about studying, behaviour or your future?', [
    'Yes, positively',
    'Yes, negatively',
    'Both positively and negatively',
    'Not really',
    'Prefer not to answer',
  ]),
  t(50, 10, 'What helps you feel included, respected and comfortable with other people?', 2),
  t(51, 10, 'Is there anything about friendships, teasing, exclusion or peer pressure that you would like adults to understand? (Optional)', 2),

  // SECTION 11 | MY DREAMS AND FUTURE
  s(52, 11, 'Have you thought about what you might like to do after school?', [
    'Yes, I have a clear idea',
    'I have a few ideas',
    'I am exploring options',
    'I feel confused',
    'I have not thought much about it',
    'Prefer not to answer',
  ]),
  t(53, 11, 'What careers, fields or kinds of work interest you right now? What attracts you to them?', 3),
  m(54, 11, 'When you imagine a good future for yourself, what matters most?', [
    'Doing work I enjoy',
    'Financial security',
    'Helping people / society',
    'Learning and discovering',
    'Being creative',
    'Respect / recognition',
    'Supporting my family',
    'Independence',
    'A balanced and peaceful life',
    'I am not sure yet',
    'Other',
  ]),
  t(55, 11, 'What questions or uncertainties do you have about your future?', 3),
  s(56, 11, 'Are there expectations from other people that influence what you think you should become?', [
    'Yes, a lot',
    'Somewhat',
    'A little',
    'Not really',
    'I am unsure',
    'Prefer not to answer',
  ]),

  // SECTION 12 | MY FEARS AND CHALLENGES
  m(57, 12, 'Which situations feel most difficult for you? Choose any that fit.', [
    'Speaking in front of others',
    'Asking questions in class',
    'Making mistakes',
    'Getting low marks',
    'Disappointing people',
    'Starting something unfamiliar',
    'Making decisions',
    'Being compared with others',
    'Conflict with friends / family',
    'Managing time',
    'I do not relate to these',
    'Something else',
    'Prefer not to answer',
  ]),
  t(58, 12, 'Is there a fear or challenge that people may not realise you are dealing with? (Optional)', 3),
  m(59, 12, 'When you need help, what can make it difficult to ask for it?', [
    'Fear of being judged',
    'Worry that others will know',
    'Not knowing whom to approach',
    'Not wanting to bother anyone',
    'Thinking I should manage alone',
    'I can usually ask for help',
    'Other',
    'Prefer not to answer',
  ]),

  // SECTION 13 | MY OWN VOICE
  t(60, 13, 'What is the biggest thing you wish teachers understood about you as a student?', 3),
  t(61, 13, 'What is the biggest thing you wish your parents or family understood about you?', 3),
  t(62, 13, 'What do adults often misunderstand about students of your age?', 3),
  t(63, 13, 'Is there anything important about you, your life or your experiences that this questionnaire has not asked?', 4),
  t(64, 13, 'Is there any answer you would like to explain further or any topic you prefer to discuss privately with a trusted adult?', 3),
];

// Questions whose written answers the admin should see first when not blank
export const ATTENTION_QUESTIONS = [27, 51, 58, 63, 64];
