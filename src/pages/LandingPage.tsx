import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  X,
  Compass,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Footer } from '../components/Footer';
import { getCurrentStudent } from '../services/localAuth';

// Visual Illustrations from assets (significantly compressed WebP for instant loading)
import cardFamilyExpectations from '../assets/images/expectations.webp';
import cardCareerConfusion from '../assets/images/confusion.webp';
import cardFinancialPressure from '../assets/images/xx.webp';
import cardLostMotivation from '../assets/images/bb.webp';
import cardStrugglingFocus from '../assets/images/lost.webp';
import cardFeelingBehind from '../assets/images/zz.webp';
import cardFindingStrengths from '../assets/images/mm.webp';
import cardStudyingMarks from '../assets/images/nn.webp';
import cardFearDisappointing from '../assets/images/cc.webp';
import cardTooManyChoices from '../assets/images/vv-1.webp';

interface LandingPageProps {
  onNavigate: (route: string) => void;
}

export interface ProblemCardData {
  id: string;
  heading: string;
  tagline: string;
  intro: string;
  situations: string[];
  thoughts: string[];
  closing: string;
  image: string;
  alt: string;
}

export const PROBLEM_CARDS: ProblemCardData[] = [
  {
    id: 'family-expectations',
    heading: 'Family expectations',
    tagline: "I don't want to disappoint my parents.",
    intro: 'Sometimes, it feels like your future has already been decided.',
    situations: [
      'Maybe your parents want you to become a doctor, engineer or government officer. Relatives keep asking about your marks and future plans. Your family might compare you with cousins or other students who are doing well.',
      'You might want to explore something completely different, but explaining that feels difficult. Sometimes you agree with everyone simply because you don’t want arguments or disappointment at home.',
    ],
    thoughts: [
      'What if I choose something my parents don’t approve of?',
      'I know they’re doing this for me, but what about what I actually want?',
      'Will they still be proud of me if I choose differently?',
    ],
    closing: 'You can care about your family and still have your own dreams. Both can matter.',
    image: cardFamilyExpectations,
    alt: 'Student experiencing family expectations',
  },
  {
    id: 'career-confusion',
    heading: 'Career confusion',
    tagline: "Everyone asks what I want to become. I'm not sure yet.",
    intro: 'Everyone wants to know your future plans. You wish you knew them too.',
    situations: [
      'Perhaps you’re interested in several different things but don’t know which one to pursue. Maybe you’ve changed your mind several times. Some days you imagine a creative career, other days something technical, and sometimes you just have no idea.',
      'After Class 10 or 12, the pressure to choose subjects, courses or a career can make everything feel even more confusing. Everyone has advice, but very few people understand what genuinely interests you.',
    ],
    thoughts: [
      'What if I choose the wrong stream?',
      'How am I supposed to decide my entire future right now?',
      'What if I discover something I love after I’ve already chosen?',
    ],
    closing: 'Not having a clear career plan doesn’t mean you’re falling behind.',
    image: cardCareerConfusion,
    alt: 'Student facing career choices and confusion',
  },
  {
    id: 'lost-motivation',
    heading: 'Lost motivation',
    tagline: "I'm studying because I have to, not because I know what I'm working towards.",
    intro: 'You haven’t necessarily stopped caring. You might just be tired of how things are going.',
    situations: [
      'Maybe studying has become a repeated cycle of school, coaching, homework, tests and marks. You keep working, but you rarely get the chance to explore something simply because it interests you.',
      'Perhaps you’ve tried hard several times but haven’t seen the results you expected. Maybe a difficult subject makes you feel incapable, or constant pressure has taken away the enjoyment you once had.',
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
    alt: 'Student feeling tired of the repeated study cycle',
  },
  {
    id: 'finding-my-strengths',
    heading: 'Finding my strengths',
    tagline: "I know my marks, but not always what I'm good at.",
    intro: 'You know you have interests, but you aren’t sure what you’re actually good at.',
    situations: [
      'Maybe you enjoy drawing, repairing things, gaming, storytelling, helping people, sports or exploring technology. But because these interests don’t always show up in your school marks, you might not consider them real strengths.',
      'Perhaps nobody has encouraged you to explore them seriously. You might also be afraid of trying something new because you don’t know whether you’ll be good at it.',
    ],
    thoughts: [
      'I’m not particularly good at anything.',
      'Does something I enjoy have any real future?',
      'What if I’m wasting my time exploring this?',
      'I wish someone could help me discover what suits me.',
    ],
    closing: 'Your strengths don’t have to be limited to what appears on a report card.',
    image: cardFindingStrengths,
    alt: 'Student wondering what their real unique strengths are',
  },
  {
    id: 'feeling-behind',
    heading: 'Feeling behind',
    tagline: "Everyone seems ahead. I'm still figuring things out.",
    intro: 'It sometimes feels like everyone else has figured life out except you.',
    situations: [
      'Your friends are getting better marks, joining competitions, learning new things or talking confidently about their future. You scroll through social media and see people your age achieving things you haven’t even started.',
      'Maybe you feel that you’re not progressing quickly enough. Sometimes you become so busy comparing yourself with others that you forget what you actually enjoy.',
    ],
    thoughts: [
      'Everyone seems to be doing something with their life.',
      'Am I wasting my time?',
      'Why does everything look so easy for other people?',
      'Maybe I’m just not good enough.',
    ],
    closing: 'You rarely see the uncertainty and struggles behind someone else’s achievements.',
    image: cardFeelingBehind,
    alt: 'Student comparing themselves to others and feeling behind',
  },
  {
    id: 'my-voice-my-choices',
    heading: 'My voice, my choices',
    tagline: "I wish people would ask what matters to me.",
    intro: 'Sometimes it feels like everyone has an opinion on what you should do, except you.',
    situations: [
      'You study because there is an examination coming, but deep down you wish people asked what you are curious about.',
      'Maybe you want to ask questions or choose your own subjects, but syllabus deadlines and family expectations drown out your own voice.',
      'Getting good marks is valued, but wanting learning to feel meaningful is just as important.',
    ],
    thoughts: [
      'I wish people would ask what matters to me.',
      'I want to understand the subject, not just score in it.',
      'Will anyone listen if I say what I really feel?',
    ],
    closing: 'Wanting learning to feel meaningful and having your own voice doesn’t make you a less serious student.',
    image: cardStudyingMarks,
    alt: 'Student dealing with opinions and finding their own voice',
  },
  {
    id: 'financial-pressure',
    heading: 'Financial pressure',
    tagline: "Sometimes, your choices are influenced by what’s happening at home.",
    intro: 'Sometimes, your choices are influenced by what’s happening at home.',
    situations: [
      'Maybe you want to join a coaching institute, buy books, learn a skill or explore an interest, but the expenses make it difficult. You might avoid asking your parents for something because you already know money is tight.',
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
    alt: 'Student aware of household and financial circumstances',
  },
  {
    id: 'struggling-to-focus',
    heading: 'Struggling to focus',
    tagline: "You sit down to study, but somehow your mind is somewhere else.",
    intro: 'You sit down to study, but somehow your mind is somewhere else.',
    situations: [
      'You open your book and read the same paragraph three times. You check your phone for a minute and suddenly half an hour has passed. Sometimes even without your phone, your thoughts wander.',
      'Maybe there’s noise at home, people interrupting you, household responsibilities or a lack of personal space. Perhaps you’re worried about something, aren’t sleeping well, or simply don’t know where to begin.',
      'And when you finally realise how much time has passed, you feel frustrated with yourself.',
    ],
    thoughts: [
      'Why can’t I concentrate like everyone else?',
      'I had the entire evening. Where did the time go?',
      'I know I have to study, but I just can’t get started.',
    ],
    closing: 'Difficulty concentrating isn’t always about a lack of effort. Sometimes there is more going on than people realise.',
    image: cardStrugglingFocus,
    alt: 'Student struggling with concentration and wandering thoughts',
  },
  {
    id: 'fear-of-disappointing-others',
    heading: 'Fear of disappointing others',
    tagline: "Sometimes, making a mistake feels bigger than the mistake itself.",
    intro: 'Sometimes, making a mistake feels bigger than the mistake itself.',
    situations: [
      'Maybe you avoid trying something because you’re afraid of failing. Perhaps you don’t ask questions in class because you worry people might laugh. You might hide a poor result, hesitate to share an idea or feel nervous about telling your parents that something isn’t going well.',
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
    alt: 'Student holding back because of fear of letting people down',
  },
  {
    id: 'too-many-choices',
    heading: 'Too many choices, no direction',
    tagline: "There are so many possibilities that choosing one feels impossible.",
    intro: 'There are so many possibilities that choosing one feels impossible.',
    situations: [
      'You hear about different streams, colleges, entrance examinations, courses, careers and skills. One person tells you to follow your passion, another says to choose something secure, and someone else suggests doing what everyone else is doing.',
      'You might spend hours researching options without becoming any more certain. Sometimes you delay decisions because you’re afraid of closing the door on other possibilities.',
    ],
    thoughts: [
      'How do I know which choice is right for me?',
      'What if I regret this decision later?',
      'Why does everyone have a different answer?',
      'I wish someone could help me understand myself before I choose.',
    ],
    closing: 'You don’t need to figure out your entire future in one decision.',
    image: cardTooManyChoices,
    alt: 'Student standing at a crossroad with too many conflicting directions',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);

  // Close modal on Escape key press or navigate with arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCardIndex(null);
      } else if (selectedCardIndex !== null) {
        if (e.key === 'ArrowRight') {
          setSelectedCardIndex((prev) => (prev !== null ? (prev + 1) % PROBLEM_CARDS.length : null));
        } else if (e.key === 'ArrowLeft') {
          setSelectedCardIndex((prev) =>
            prev !== null ? (prev - 1 + PROBLEM_CARDS.length) % PROBLEM_CARDS.length : null
          );
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCardIndex]);

  // Lock body scroll when expanded modal is open
  useEffect(() => {
    if (selectedCardIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedCardIndex]);

  const activeCard = selectedCardIndex !== null ? PROBLEM_CARDS[selectedCardIndex] : null;

  const handleExploreYourself = () => {
    setSelectedCardIndex(null);
    const student = getCurrentStudent();
    if (student) {
      onNavigate('/questionnaire');
    } else {
      try {
        sessionStorage.setItem('derote_auth_redirect', '/questionnaire');
      } catch {}
      onNavigate('/login');
    }
  };

  const handleNextCard = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedCardIndex !== null) {
      setSelectedCardIndex((selectedCardIndex + 1) % PROBLEM_CARDS.length);
    }
  };

  const handlePrevCard = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedCardIndex !== null) {
      setSelectedCardIndex((selectedCardIndex - 1 + PROBLEM_CARDS.length) % PROBLEM_CARDS.length);
    }
  };

  return (
    <div className="min-w-0 w-full flex flex-col bg-white text-[#102C46] overflow-x-hidden">
      {/* =========================================================================
          PRIMARY MAIN CONTENT: 10 RELATABLE PROBLEM CARDS
          - Mobile: 2-column grid, compact height, 4–6 cards visible in initial view
          - Desktop: 3-column grid, spacious cards, original desktop proportions
          - Pure DeRote Blue visual identity, zero green Forest/Citrus elements
          ========================================================================= */}
      <section
        id="student-concerns"
        className="relative px-3 sm:px-6 lg:px-8 pt-3 sm:pt-12 lg:pt-14 pb-12 sm:pb-24 bg-gradient-to-b from-[#F2F7FC]/80 via-white to-white border-b border-[#E8F3FF]"
      >
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="mb-3.5 sm:mb-12 text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center justify-center gap-1.5 sm:gap-2 mb-1 sm:mb-2.5">
              <h1 className="text-2xl sm:text-[44px] lg:text-[50px] font-extrabold text-[#062B50] tracking-tight leading-tight">
                Ever feel like nobody gets it?
              </h1>
              {/* Playful blue accent marks */}
              <span
                className="inline-flex items-center gap-0.5 sm:gap-1 text-[#0866C6] -mt-2 sm:-mt-3.5"
                aria-hidden="true"
              >
                <span className="w-1 sm:w-1.5 h-3 sm:h-5 bg-[#0866C6] rounded-full rotate-[25deg]" />
                <span className="w-1 sm:w-1.5 h-1.5 sm:h-3 bg-[#0866C6] rounded-full rotate-[25deg]" />
              </span>
            </div>
            <p className="text-xs sm:text-lg text-[#5A6E85] leading-relaxed font-normal">
              Sometimes, it's difficult to explain what's going on in your head.
            </p>
          </div>

          {/* Cards Grid:
              - Mobile: 2 columns, landscape images, exactly 6 cards visible on page one
              - Consistent 2-line description area for uniform card heights across all cards
              - Desktop: 3 columns with spacious layout and original desktop proportions */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6 lg:gap-8 items-stretch">
            {PROBLEM_CARDS.map((card, index) => (
              <div
                key={card.id}
                onClick={() => setSelectedCardIndex(index)}
                className="bg-white rounded-2xl sm:rounded-3xl p-2.5 sm:p-5 lg:p-6 border border-[#E2EDF8] shadow-xs hover:shadow-lg hover:border-[#0866C6]/30 transition-all duration-200 flex flex-col justify-between group cursor-pointer active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-[#0866C6] h-full"
                role="button"
                tabIndex={0}
                aria-label={`Open details for ${card.heading}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedCardIndex(index);
                  }
                }}
              >
                <div className="h-full flex flex-col justify-between">
                  {/* Card Illustration Banner:
                      - Mobile: landscape aspect ratio (aspect-[16/10]) so artwork is landscape and exactly 6 cards fit on page one
                      - Desktop: spacious (h-36 to h-44) */}
                  <div className="w-full aspect-[16/10] sm:aspect-auto sm:h-36 lg:h-44 rounded-xl sm:rounded-2xl overflow-hidden bg-[#F0F6FD] mb-2 sm:mb-4 border border-[#EAF2FC] shrink-0">
                    <img
                      src={card.image}
                      alt={card.alt}
                      className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Card Title, Tagline & Expand Arrow */}
                  <div className="flex items-end justify-between gap-1.5 sm:gap-3 flex-1 pt-0.5 sm:pt-1">
                    <div className="min-w-0 flex-1 flex flex-col justify-between">
                      <h3 className="text-xs sm:text-base lg:text-[18px] font-bold text-[#062B50] tracking-tight group-hover:text-[#0866C6] transition-colors line-clamp-1 leading-tight mb-1">
                        {card.heading}
                      </h3>
                      {/* Consistent two-line area for descriptions across all cards */}
                      <div className="h-[28px] sm:h-[34px] lg:h-[38px] flex items-start overflow-hidden">
                        <p className="text-[10px] sm:text-xs lg:text-[13px] text-[#5A6E85] line-clamp-2 leading-snug">
                          "{card.tagline}"
                        </p>
                      </div>
                    </div>

                    {/* Small circular arrow indicating expansion */}
                    <div
                      className="w-6 h-6 sm:w-8 sm:h-8 lg:w-9 lg:h-9 rounded-full bg-[#EBF4FE] text-[#0866C6] group-hover:bg-[#0866C6] group-hover:text-white transition-all flex items-center justify-center shrink-0 mb-0.5 shadow-2xs group-hover:translate-x-0.5"
                      aria-hidden="true"
                    >
                      <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Section Bottom Reassurance Callout (Removed "Explore what's on your mind" button) */}
          <div className="mt-8 sm:mt-14 text-center bg-[#F4F8FD] rounded-3xl p-6 sm:p-8 border border-[#E8F3FF] max-w-2xl mx-auto">
            <h3 className="text-lg sm:text-xl font-bold text-[#062B50] mb-1.5 tracking-tight">
              Ready to explore what matters to you?
            </h3>
            <p className="text-xs sm:text-sm text-[#5A6E85] max-w-lg mx-auto leading-relaxed">
              No grades, no expectations—just a quiet, structured space to discover your genuine strengths and interests.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          EXPANDED CARD DETAIL VIEW MODAL
          - Natural enlargement of the original card
          - Same blue visual language with larger illustration
          - Relatable student-to-student tone
          - "Explore Yourself →" button beneath content
          - Return to landing page close / back action
          ========================================================================= */}
      {activeCard && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeCard.heading}
          className="fixed inset-0 z-50 bg-[#062B50]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setSelectedCardIndex(null)}
        >
          <div
            className="bg-white rounded-3xl border border-[#E8F3FF] shadow-2xl max-w-2xl w-full my-auto overflow-hidden text-[#102C46] flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Navigation Bar: Back arrow and Close button */}
            <div className="px-4 sm:px-6 py-3.5 border-b border-[#E8F3FF] bg-white flex items-center justify-between sticky top-0 z-10 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedCardIndex(null)}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#0866C6] hover:text-[#062B50] transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-[#F2F7FC]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Experiences</span>
              </button>

              <div className="flex items-center gap-1">
                {/* Prev / Next buttons for smooth exploration */}
                <button
                  type="button"
                  onClick={handlePrevCard}
                  aria-label="Previous card"
                  className="p-1.5 rounded-lg text-[#64778C] hover:text-[#062B50] hover:bg-[#F2F7FC] transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextCard}
                  aria-label="Next card"
                  className="p-1.5 rounded-lg text-[#64778C] hover:text-[#062B50] hover:bg-[#F2F7FC] transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-[#E8F3FF] mx-1" />
                <button
                  type="button"
                  onClick={() => setSelectedCardIndex(null)}
                  aria-label="Close"
                  className="p-1.5 rounded-lg text-[#64778C] hover:text-[#062B50] hover:bg-[#F2F7FC] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Expanded Content Area */}
            <div className="p-4 sm:p-8 overflow-y-auto">
              {/* Enlarged Illustration Banner */}
              <div className="w-full h-44 sm:h-64 rounded-2xl overflow-hidden bg-[#F0F6FD] mb-6 border border-[#EAF2FC] shadow-xs">
                <img
                  src={activeCard.image}
                  alt={activeCard.alt}
                  className="w-full h-full object-cover object-center"
                />
              </div>

              {/* Problem Heading */}
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#062B50] tracking-tight mb-3">
                {activeCard.heading}
              </h2>

              {/* Relatable Introduction */}
              <p className="text-base sm:text-lg font-bold text-[#0866C6] mb-5 leading-snug">
                {activeCard.intro}
              </p>

              {/* Several Realistic Everyday Situations */}
              <div className="space-y-3.5 mb-6">
                {activeCard.situations.map((situation, i) => (
                  <p key={i} className="text-sm sm:text-base text-[#475A6E] leading-relaxed font-normal">
                    {situation}
                  </p>
                ))}
              </div>

              {/* "You might find yourself thinking..." Section */}
              <div className="mb-6 pt-2">
                <h4 className="text-sm sm:text-base font-bold text-[#062B50] mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-[#0866C6] rounded-full inline-block" />
                  <span>You might find yourself thinking:</span>
                </h4>
                <div className="space-y-2.5">
                  {activeCard.thoughts.map((thought, i) => (
                    <div
                      key={i}
                      className="bg-[#F4F8FD] border border-[#E2EDF8] rounded-xl p-3 sm:p-3.5 text-xs sm:text-sm text-[#102C46] flex items-start gap-2.5"
                    >
                      <span className="text-[#0866C6] font-bold text-base leading-none select-none">“</span>
                      <p className="italic leading-relaxed text-[#102C46] flex-1">
                        {thought}
                      </p>
                      <span className="text-[#0866C6] font-bold text-base leading-none select-none">”</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Short Reassuring Closing Paragraph */}
              <div className="bg-[#EBF4FE] border-l-4 border-[#0866C6] p-4 sm:p-4.5 rounded-r-2xl mb-8">
                <p className="text-xs sm:text-sm font-semibold text-[#062B50] leading-relaxed">
                  {activeCard.closing}
                </p>
              </div>

              {/* "Explore Yourself →" Button Beneath Content */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#E8F3FF]">
                <button
                  type="button"
                  onClick={handleExploreYourself}
                  className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 rounded-xl bg-[#0866C6] hover:bg-[#062B50] text-white font-bold text-sm sm:text-base transition-all shadow-md shadow-[#0866C6]/20 inline-flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.98]"
                >
                  <span>Explore Yourself</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCardIndex(null)}
                  className="text-xs sm:text-sm font-medium text-[#64778C] hover:text-[#062B50] transition-colors py-2 px-3 rounded-lg"
                >
                  Keep reading experiences
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          REASSURANCE SECTION
          Transparent, reassuring guidance for students and parents
          ========================================================================= */}
      <section className="px-4 sm:px-6 lg:px-8 py-10 sm:py-12 bg-[#F4F8FD] border-b border-[#E8F3FF]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 text-center sm:text-left">
          <div className="w-12 h-12 rounded-2xl bg-[#E8F3FF] text-[#0866C6] flex items-center justify-center shrink-0 shadow-xs border border-[#168FE5]/20">
            <Compass className="w-6 h-6 text-[#0866C6]" aria-hidden="true" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg sm:text-xl font-bold text-[#062B50] tracking-tight">
              Not an exam. No perfect answers. Just a chance to reflect.
            </h2>
            <p className="text-sm sm:text-[15px] leading-relaxed text-[#64778C]">
              Your responses are not graded and do not determine your future or define who you are.
              Authorized school staff may review responses to provide thoughtful guidance, and full details
              will be explained before you begin any questionnaire.
            </p>
          </div>
        </div>
      </section>

      {/* Global DeRote Footer */}
      <Footer onNavigate={onNavigate} />
    </div>
  );
};
