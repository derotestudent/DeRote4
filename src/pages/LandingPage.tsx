import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Compass,
  X,
  Sparkles,
  Quote,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Heart,
  HelpCircle,
} from 'lucide-react';
import { Footer } from '../components/Footer';
import { getCurrentStudent, loginStudent } from '../services/localAuth';

// Visual Illustrations from assets
import cardFamilyExpectations from '../assets/images/expectations.png';
import cardCareerConfusion from '../assets/images/confusion.png';
import cardFinancialPressure from '../assets/images/card_my_voice_choices_1791984301899.jpg';
import cardLostMotivation from '../assets/images/lost.png';
import cardStrugglingFocus from '../assets/images/1.png';
import cardFeelingBehind from '../assets/images/behind.png';
import cardFindingStrengths from '../assets/images/mm.png';
import cardStudyingMarks from '../assets/images/nn.png';
import cardFearDisappointing from '../assets/images/card_feeling_behind_1791984272837.jpg';
import cardTooManyChoices from '../assets/images/futuristic_students_path_of_discovery.png';

interface LandingPageProps {
  onNavigate: (route: string) => void;
}

export interface ProblemCardData {
  id: string;
  number: string;
  heading: string;
  tagline: string;
  intro: string;
  situations: string[];
  thoughts: string[];
  closing: string;
  image: string;
  accentColor: string;
  badgeBg: string;
}

export const PROBLEM_CARDS: ProblemCardData[] = [
  {
    id: 'family-expectations',
    number: '01',
    heading: 'Family Expectations',
    tagline: 'Sometimes, it feels like your future has already been decided.',
    intro: 'Sometimes, it feels like your future has already been decided.',
    situations: [
      'Maybe your parents want you to become a doctor, engineer or government officer. Relatives keep asking about your marks and future plans.',
      'Your family might compare you with cousins or other students who are doing well.',
      'You might want to explore something completely different, but explaining that feels difficult.',
      "Sometimes you agree with everyone simply because you don't want arguments or disappointment at home.",
    ],
    thoughts: [
      'What if I choose something my parents don’t approve of?',
      'I know they’re doing this for me, but what about what I actually want?',
      'Will they still be proud of me if I choose differently?',
    ],
    closing: 'You can care about your family and still have your own dreams. Both can matter.',
    image: cardFamilyExpectations,
    accentColor: '#16382B',
    badgeBg: '#E8F5E9',
  },
  {
    id: 'career-confusion',
    number: '02',
    heading: 'Career Confusion',
    tagline: 'Everyone wants to know your future plans. You wish you knew them too.',
    intro: 'Everyone wants to know your future plans. You wish you knew them too.',
    situations: [
      'Perhaps you’re interested in several different things but don’t know which one to pursue.',
      'Maybe you’ve changed your mind several times. Some days you imagine a creative career, other days something technical, and sometimes you just have no idea.',
      'After Class 10 or 12, the pressure to choose subjects, courses or a career can make everything feel even more confusing.',
      'Everyone has advice, but very few people understand what genuinely interests you.',
    ],
    thoughts: [
      'What if I choose the wrong stream?',
      'How am I supposed to decide my entire future right now?',
      'What if I discover something I love after I’ve already chosen?',
    ],
    closing: 'Not having a clear career plan doesn’t mean you’re falling behind.',
    image: cardCareerConfusion,
    accentColor: '#0866C6',
    badgeBg: '#EBF4FE',
  },
  {
    id: 'financial-pressure',
    number: '03',
    heading: 'Financial Pressure',
    tagline: 'Sometimes, your choices are influenced by what’s happening at home.',
    intro: 'Sometimes, your choices are influenced by what’s happening at home.',
    situations: [
      'Maybe you want to join a coaching institute, buy books, learn a skill or explore an interest, but the expenses make it difficult.',
      'You might avoid asking your parents for something because you already know money is tight.',
      'Perhaps you see other students attending expensive classes, buying equipment or pursuing opportunities that aren’t easily available to you.',
      'Sometimes you take household responsibilities seriously, worry about your family’s finances, or feel that you need to become successful quickly so you can support them.',
    ],
    thoughts: [
      'I don’t want to ask my parents for more money.',
      'Would I have more opportunities if things were different at home?',
      'I want to pursue my interests, but can my family afford it?',
      'I should probably choose something that guarantees an income.',
    ],
    closing: 'Financial circumstances can influence your decisions, but they don’t define your ability or potential.',
    image: cardFinancialPressure,
    accentColor: '#D97706',
    badgeBg: '#FFFBEB',
  },
  {
    id: 'lost-motivation',
    number: '04',
    heading: 'Lost Motivation',
    tagline: 'You haven’t stopped caring. You might just be tired of how things are going.',
    intro: 'You haven’t necessarily stopped caring. You might just be tired of how things are going.',
    situations: [
      'Maybe studying has become a repeated cycle of school, coaching, homework, tests and marks.',
      'You keep working, but you rarely get the chance to explore something simply because it interests you.',
      'Perhaps you’ve tried hard several times but haven’t seen the results you expected.',
      'Maybe a difficult subject makes you feel incapable, or constant pressure has taken away the enjoyment you once had.',
      'Sometimes you don’t even know why you’re studying beyond the next examination.',
    ],
    thoughts: [
      'What’s the point when I’ll forget everything after the exam?',
      'I used to enjoy learning. Why does it feel like a burden now?',
      'No matter how much I do, it never seems enough.',
      'I want to do something meaningful, but I don’t know what.',
    ],
    closing: 'Losing motivation can happen for many reasons. It doesn’t automatically mean you’re lazy.',
    image: cardLostMotivation,
    accentColor: '#2D6A4F',
    badgeBg: '#ECFDF5',
  },
  {
    id: 'struggling-to-focus',
    number: '05',
    heading: 'Struggling to Focus',
    tagline: 'You sit down to study, but somehow your mind is somewhere else.',
    intro: 'You sit down to study, but somehow your mind is somewhere else.',
    situations: [
      'You open your book and read the same paragraph three times.',
      'You check your phone for a minute and suddenly half an hour has passed. Sometimes even without your phone, your thoughts wander.',
      'Maybe there’s noise at home, people interrupting you, household responsibilities or a lack of personal space.',
      'Perhaps you’re worried about something, aren’t sleeping well, or simply don’t know where to begin.',
      'And when you finally realise how much time has passed, you feel frustrated with yourself.',
    ],
    thoughts: [
      'Why can’t I concentrate like everyone else?',
      'I had the entire evening. Where did the time go?',
      'I know I have to study, but I just can’t get started.',
    ],
    closing: 'Difficulty concentrating isn’t always about a lack of effort. Sometimes there is more going on than people realise.',
    image: cardStrugglingFocus,
    accentColor: '#0F766E',
    badgeBg: '#F0FDFA',
  },
  {
    id: 'feeling-left-behind',
    number: '06',
    heading: 'Feeling Left Behind',
    tagline: 'It sometimes feels like everyone else has figured life out except you.',
    intro: 'It sometimes feels like everyone else has figured life out except you.',
    situations: [
      'Your friends are getting better marks, joining competitions, learning new things or talking confidently about their future.',
      'You scroll through social media and see people your age achieving things you haven’t even started.',
      'Maybe you feel that you’re not progressing quickly enough.',
      'Sometimes you become so busy comparing yourself with others that you forget what you actually enjoy.',
    ],
    thoughts: [
      'Everyone seems to be doing something with their life.',
      'Am I wasting my time?',
      'Why does everything look so easy for other people?',
      'Maybe I’m just not good enough.',
    ],
    closing: 'You rarely see the uncertainty and struggles behind someone else’s achievements.',
    image: cardFeelingBehind,
    accentColor: '#1E3A8A',
    badgeBg: '#EFF6FF',
  },
  {
    id: 'finding-my-strengths',
    number: '07',
    heading: 'Finding My Strengths',
    tagline: 'You know you have interests, but you aren’t sure what you’re actually good at.',
    intro: 'You know you have interests, but you aren’t sure what you’re actually good at.',
    situations: [
      'Maybe you enjoy drawing, repairing things, gaming, storytelling, helping people, sports or exploring technology.',
      'Because these interests don’t always show up in your school marks, you might not consider them real strengths.',
      'Perhaps nobody has encouraged you to explore them seriously.',
      'You might also be afraid of trying something new because you don’t know whether you’ll be good at it.',
    ],
    thoughts: [
      'I’m not particularly good at anything.',
      'Does something I enjoy have any real future?',
      'What if I’m wasting my time exploring this?',
      'I wish someone could help me discover what suits me.',
    ],
    closing: 'Your strengths don’t have to be limited to what appears on a report card.',
    image: cardFindingStrengths,
    accentColor: '#1B4332',
    badgeBg: '#E8F5E9',
  },
  {
    id: 'studying-just-for-marks',
    number: '08',
    heading: 'Studying Just for Marks',
    tagline: 'You study because there’s an exam coming, not because you’re interested.',
    intro: 'You study because there’s an examination coming, not necessarily because you’re interested.',
    situations: [
      'You memorise chapters, practise questions and prepare for tests.',
      'Once the examination is over, much of what you studied doesn’t feel meaningful anymore.',
      'Maybe you enjoy understanding how things work but dislike memorising answers.',
      'Perhaps you want to ask questions but feel that completing the syllabus is always more important.',
      'Sometimes getting good marks becomes the only reason to study, and curiosity slowly gets pushed aside.',
    ],
    thoughts: [
      'Will I ever actually use what I’m memorising?',
      'I want to understand the subject, not just score in it.',
      'Why does everyone only ask about my marks?',
    ],
    closing: 'Wanting learning to feel meaningful doesn’t make you a less serious student.',
    image: cardStudyingMarks,
    accentColor: '#C2410C',
    badgeBg: '#FFF7ED',
  },
  {
    id: 'fear-of-disappointing-others',
    number: '09',
    heading: 'Fear of Disappointing Others',
    tagline: 'Sometimes, making a mistake feels bigger than the mistake itself.',
    intro: 'Sometimes, making a mistake feels bigger than the mistake itself.',
    situations: [
      'Maybe you avoid trying something because you’re afraid of failing.',
      'Perhaps you don’t ask questions in class because you worry people might laugh.',
      'You might hide a poor result, hesitate to share an idea or feel nervous about telling your parents that something isn’t going well.',
      'Even when you want to make your own decisions, the possibility of disappointing people can hold you back.',
    ],
    thoughts: [
      'What will everyone say if I fail?',
      'I don’t want people to think I’m incapable.',
      'I wish I could make mistakes without feeling guilty.',
      'What if I let everyone down?',
    ],
    closing: 'You deserve room to learn, make mistakes and discover things at your own pace.',
    image: cardFearDisappointing,
    accentColor: '#7C2D12',
    badgeBg: '#FEF2F2',
  },
  {
    id: 'too-many-choices',
    number: '10',
    heading: 'Too Many Choices, No Direction',
    tagline: 'There are so many possibilities that choosing one feels impossible.',
    intro: 'There are so many possibilities that choosing one feels impossible.',
    situations: [
      'You hear about different streams, colleges, entrance examinations, courses, careers and skills.',
      'One person tells you to follow your passion, another says to choose something secure, and someone else suggests doing what everyone else is doing.',
      'You might spend hours researching options without becoming any more certain.',
      'Sometimes you delay decisions because you’re afraid of closing the door on other possibilities.',
    ],
    thoughts: [
      'How do I know which choice is right for me?',
      'What if I regret this decision later?',
      'Why does everyone have a different answer?',
      'I wish someone could help me understand myself before I choose.',
    ],
    closing: 'You don’t need to figure out your entire future in one decision.',
    image: cardTooManyChoices,
    accentColor: '#164E63',
    badgeBg: '#ECFEFF',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCardIndex(null);
      } else if (selectedCardIndex !== null) {
        if (e.key === 'ArrowRight') {
          setSelectedCardIndex((prev) =>
            prev !== null ? (prev + 1) % PROBLEM_CARDS.length : null
          );
        } else if (e.key === 'ArrowLeft') {
          setSelectedCardIndex((prev) =>
            prev !== null
              ? (prev - 1 + PROBLEM_CARDS.length) % PROBLEM_CARDS.length
              : null
          );
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCardIndex]);

  // Handle "Explore Yourself →" action
  const handleExploreYourself = async () => {
    if (isNavigating) return;
    setIsNavigating(true);

    try {
      const activeStudent = getCurrentStudent();
      if (activeStudent) {
        // If already logged in, navigate straight to the questionnaire
        onNavigate('/questionnaire');
      } else {
        // Use the existing demo login and navigate directly to the questionnaire
        const res = await loginStudent('student@derote.in', 'student123');
        if (res.success) {
          onNavigate('/questionnaire');
        } else {
          onNavigate('/login');
        }
      }
    } catch {
      onNavigate('/questionnaire');
    } finally {
      setIsNavigating(false);
      setSelectedCardIndex(null);
    }
  };

  const currentCard =
    selectedCardIndex !== null ? PROBLEM_CARDS[selectedCardIndex] : null;

  return (
    <div className="min-w-0 w-full flex flex-col bg-[#FDFCFB] text-[#102C46] overflow-x-hidden">
      {/* =========================================================================
          HERO & STUDENT CONCERN CARDS SECTION
          Natural, student-centric tone with Forest & Citrus palette
          ========================================================================= */}
      <section
        id="student-concerns"
        className="relative px-3 sm:px-6 lg:px-8 pt-6 sm:pt-12 lg:pt-16 pb-16 sm:pb-24 bg-gradient-to-b from-[#F3F7F5] via-[#FAFDFB] to-white border-b border-[#E3ECE6]"
      >
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="mb-8 sm:mb-14 text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8F3EE] border border-[#D1E5DB] text-[#164E37] text-xs font-bold tracking-wide uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Real Student Experiences</span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-[44px] font-extrabold text-[#0F281E] tracking-tight leading-tight mb-3">
              Ever feel like nobody gets it?
            </h1>

            <p className="text-sm sm:text-lg text-[#405B4E] leading-relaxed font-normal max-w-xl mx-auto">
              Sometimes, it’s difficult to explain what’s going on in your head. Choose what feels closest to what you’re experiencing right now.
            </p>
          </div>

          {/* Cards Grid: 10 Relatable Cards (2 columns on mobile, 3-4 on tablet/desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6 lg:gap-7">
            {PROBLEM_CARDS.map((concern, idx) => (
              <div
                key={concern.id}
                onClick={() => setSelectedCardIndex(idx)}
                className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-[#E3ECE6] shadow-xs hover:shadow-xl hover:border-[#2D6A4F]/40 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between group cursor-pointer focus-visible:outline-2 focus-visible:outline-[#2D6A4F]"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedCardIndex(idx);
                  }
                }}
              >
                <div>
                  {/* Card Illustration Banner with Subtle Badge */}
                  <div className="relative w-full h-32 sm:h-44 rounded-xl sm:rounded-2xl overflow-hidden bg-[#EDF4F0] mb-3.5 border border-[#DEECE4]">
                    <img
                      src={concern.image}
                      alt={concern.heading}
                      className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.04]"
                      loading="lazy"
                    />
                    <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-xs text-[#0F281E] text-[11px] font-extrabold px-2.5 py-1 rounded-lg border border-[#D5E5DC] shadow-xs flex items-center gap-1">
                      <span className="text-[#D97706]">#{concern.number}</span>
                    </div>
                  </div>

                  {/* Heading & Tagline */}
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-bold text-[#0F281E] tracking-tight group-hover:text-[#1B4332] transition-colors">
                      {concern.heading}
                    </h3>
                    <p className="text-xs sm:text-[13.5px] text-[#4A6458] leading-relaxed line-clamp-2">
                      {concern.tagline}
                    </p>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="mt-4 pt-3 border-t border-[#EEF5F1] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1B4332] group-hover:text-[#D97706] transition-colors flex items-center gap-1">
                    <span>Read experience</span>
                  </span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#E8F3EE] text-[#1B4332] group-hover:bg-[#1B4332] group-hover:text-white transition-all flex items-center justify-center shrink-0 shadow-xs group-hover:translate-x-0.5">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Section Bottom CTA Banner */}
          <div className="mt-14 sm:mt-20 bg-gradient-to-br from-[#16382B] to-[#0F281E] text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-[#23533F] relative overflow-hidden text-center max-w-3xl mx-auto">
            <div className="relative z-10 max-w-xl mx-auto space-y-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F59E0B] tracking-wider uppercase bg-[#1B4332]/80 px-3 py-1 rounded-full border border-[#F59E0B]/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Zero Pressure, 100% Reflective</span>
              </span>
              <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-[#FAFDFB]">
                Discover where your genuine interests lie
              </h2>
              <p className="text-xs sm:text-base text-[#D1E5DB] leading-relaxed font-normal">
                No marks, no judgment, and no expectations. Just an authentic space designed to help you understand your strengths and what matters to you.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleExploreYourself}
                  className="w-full sm:w-auto min-h-[48px] px-8 py-3 rounded-2xl bg-[#D97706] hover:bg-[#B45309] text-white font-extrabold text-sm sm:text-base transition-all shadow-lg hover:shadow-orange-500/20 active:scale-[0.98] cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <span>Explore Yourself</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          EXPANDED DETAIL CARD MODAL
          Meets all prompt requirements:
          - A heading
          - A short introductory paragraph
          - 3–4 relatable everyday situations or experiences ("Does this sound familiar?")
          - A short section expressing what a student might think or feel ("You might find yourself thinking...")
          - A reassuring closing sentence
          - Prominent "Explore Yourself →" button
          - Forest & Citrus palette with ample whitespace and comfort
          ========================================================================= */}
      {currentCard && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#0F281E]/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setSelectedCardIndex(null)}
        >
          <div
            className="bg-white rounded-3xl border border-[#D5E5DC] shadow-2xl max-w-2xl w-full my-auto overflow-hidden relative max-h-[92vh] flex flex-col text-[#0F281E]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header Bar */}
            <div className="px-5 sm:px-8 py-4 bg-[#F7FAF8] border-b border-[#E3ECE6] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-black text-[#D97706] bg-[#FFFBEB] border border-[#FDE68A] px-2.5 py-0.5 rounded-md">
                  #{currentCard.number}
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#2D6A4F] uppercase tracking-wider">
                  Student Experience
                </span>
              </div>

              {/* Close Button & Navigation Arrows */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedCardIndex((prev) =>
                      prev !== null
                        ? (prev - 1 + PROBLEM_CARDS.length) % PROBLEM_CARDS.length
                        : null
                    )
                  }
                  title="Previous concern"
                  className="p-1.5 sm:p-2 rounded-xl text-[#405B4E] hover:bg-[#E8F3EE] hover:text-[#0F281E] transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedCardIndex((prev) =>
                      prev !== null ? (prev + 1) % PROBLEM_CARDS.length : null
                    )
                  }
                  title="Next concern"
                  className="p-1.5 sm:p-2 rounded-xl text-[#405B4E] hover:bg-[#E8F3EE] hover:text-[#0F281E] transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <div className="w-[1px] h-5 bg-[#D5E5DC] mx-1" />
                <button
                  type="button"
                  onClick={() => setSelectedCardIndex(null)}
                  className="p-1.5 sm:p-2 rounded-xl text-[#5A6E85] hover:bg-[#F0F4F2] hover:text-[#0F281E] transition-colors cursor-pointer"
                  aria-label="Close detail card"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Modal Content */}
            <div className="overflow-y-auto px-5 sm:px-8 py-5 sm:py-6 space-y-6">
              {/* Heading and Short Intro Paragraph */}
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F281E] tracking-tight mb-2">
                  {currentCard.heading}
                </h2>
                <p className="text-base sm:text-lg font-semibold text-[#1B4332] leading-snug">
                  {currentCard.intro}
                </p>
              </div>

              {/* Section 1: "Does this sound familiar?" - 3 to 4 Everyday Situations */}
              <div className="space-y-3 pt-1">
                <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#D97706] flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4" />
                  <span>Does this sound familiar?</span>
                </h3>

                <div className="space-y-2.5">
                  {currentCard.situations.map((sit, sIdx) => (
                    <div
                      key={sIdx}
                      className="flex items-start gap-3 p-3 sm:p-3.5 rounded-2xl bg-[#F7FAF8] border border-[#E3ECE6] text-xs sm:text-[14px] text-[#2C4A3E] leading-relaxed"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#2D6A4F] shrink-0 mt-2" />
                      <span>{sit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: "You might find yourself thinking..." - Student Internal Thoughts */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#2D6A4F] flex items-center gap-1.5">
                  <Quote className="w-4 h-4" />
                  <span>You might find yourself thinking...</span>
                </h3>

                <div className="grid grid-cols-1 gap-2.5">
                  {currentCard.thoughts.map((thought, tIdx) => (
                    <div
                      key={tIdx}
                      className="p-3 sm:p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] text-xs sm:text-[14px] text-[#78350F] italic font-medium flex items-start gap-2.5 shadow-2xs"
                    >
                      <span className="text-[#D97706] font-bold text-base not-italic leading-none">“</span>
                      <span className="flex-1 leading-relaxed">{thought}</span>
                      <span className="text-[#D97706] font-bold text-base not-italic leading-none">”</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Reassuring Closing Sentence in Forest Highlight Box */}
              <div className="p-4 sm:p-4.5 rounded-2xl bg-gradient-to-r from-[#ECFDF5] to-[#F0FDF4] border border-[#A7F3D0] flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-[#059669] text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Heart className="w-4 h-4" />
                </div>
                <p className="text-xs sm:text-[14.5px] font-bold text-[#065F46] leading-relaxed">
                  {currentCard.closing}
                </p>
              </div>
            </div>

            {/* Modal Bottom Action Bar */}
            <div className="px-5 sm:px-8 py-4 bg-[#F7FAF8] border-t border-[#E3ECE6] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-[#52796F] font-medium hidden sm:inline">
                Card {currentCard.number} of {PROBLEM_CARDS.length}
              </span>

              <div className="w-full sm:w-auto flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedCardIndex(null)}
                  className="px-4 py-2.5 rounded-xl border border-[#D5E5DC] text-xs font-bold text-[#405B4E] hover:bg-[#EEF5F1] transition-colors cursor-pointer"
                >
                  Back to All
                </button>

                <button
                  type="button"
                  onClick={handleExploreYourself}
                  className="flex-1 sm:flex-initial min-h-[44px] px-6 py-2.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] active:bg-[#92400E] text-white font-extrabold text-sm transition-all shadow-sm hover:shadow-md cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <span>Explore Yourself</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          REASSURANCE / ETHICAL COMMITMENT SECTION
          Transparent guidance for students, teachers, and guardians
          ========================================================================= */}
      <section className="px-4 sm:px-6 lg:px-8 py-10 sm:py-14 bg-[#F4F8F6] border-b border-[#E3ECE6]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left">
          <div className="w-12 h-12 rounded-2xl bg-[#E8F3EE] text-[#1B4332] flex items-center justify-center shrink-0 shadow-xs border border-[#C5DEC8]">
            <Compass className="w-6 h-6 text-[#1B4332]" aria-hidden="true" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg sm:text-xl font-bold text-[#0F281E] tracking-tight">
              Not an exam. No perfect answers. Just a chance to reflect.
            </h2>
            <p className="text-xs sm:text-[14.5px] leading-relaxed text-[#405B4E]">
              Your responses are not graded and do not determine your stream, future, or who you are.
              DeRote is purely designed to help you discover what you enjoy, understand what drives your choices,
              and build authentic self-confidence at your own pace.
            </p>
          </div>
        </div>
      </section>

      {/* Global DeRote Footer */}
      <Footer onNavigate={onNavigate} />
    </div>
  );
};
