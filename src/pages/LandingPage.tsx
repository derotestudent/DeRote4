import React from 'react';
import { ArrowRight, Compass } from 'lucide-react';
import { Footer } from '../components/Footer';

// Six Student Concern Card Illustrations
import cardFamilyExpectations from '../assets/images/expectations.png';
import cardCareerConfusion from '../assets/images/confusion.png';
import cardLostMotivation from '../assets/images/lost.png';
import cardFindingStrengths from '../assets/images/mm.png';
import cardFeelingBehind from '../assets/images/behind.png';
import cardMyVoiceChoices from '../assets/images/nn.png';

interface LandingPageProps {
  onNavigate: (route: string) => void;
}

interface StudentConcern {
  id: string;
  heading: string;
  description: string;
  image: string;
  alt: string;
}

const STUDENT_CONCERNS: StudentConcern[] = [
  {
    id: 'family-expectations',
    heading: 'Family expectations',
    description: "I don't want to disappoint my parents.",
    image: cardFamilyExpectations,
    alt: 'Student experiencing pressure from family expectations',
  },
  {
    id: 'career-confusion',
    heading: 'Career confusion',
    description: "Everyone asks what I want to become. I'm not sure yet.",
    image: cardCareerConfusion,
    alt: 'Student unsure about career direction',
  },
  {
    id: 'lost-motivation',
    heading: 'Lost motivation',
    description: "I'm studying because I have to, not because I know what I want.",
    image: cardLostMotivation,
    alt: 'Student searching for personal meaning and motivation in studies',
  },
  {
    id: 'finding-strengths',
    heading: 'Finding my strengths',
    description: "I know my marks, but not always what I'm good at.",
    image: cardFindingStrengths,
    alt: 'Student exploring innate strengths and interests beyond marks',
  },
  {
    id: 'feeling-behind',
    heading: 'Feeling behind',
    description: "Everyone seems ahead. I'm still figuring things out.",
    image: cardFeelingBehind,
    alt: 'Student realizing growth is a personal journey, not a race',
  },
  {
    id: 'my-voice-choices',
    heading: 'My voice, my choices',
    description: 'I wish people would ask what matters to me.',
    image: cardMyVoiceChoices,
    alt: 'Student voicing authentic interests and personal agency',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-w-0 w-full flex flex-col bg-white text-[#102C46] overflow-x-hidden">
      {/* =========================================================================
          PRIMARY MAIN CONTENT: STUDENT CONCERN CARDS
          Purpose: Immediately help students recognise situations they may be experiencing.
          - Placed at the top of the homepage body, directly beneath the header
          - Heading: "Ever feel like nobody gets it?" with playful blue accent ticks
          - Subtitle: "Sometimes, it's difficult to explain what's going on in your head."
          - SIX INDIVIDUAL CARDS in a 3-column x 2-row grid on desktop
          ========================================================================= */}
      <section
        id="student-concerns"
        className="relative px-3 sm:px-6 lg:px-8 pt-5 sm:pt-12 lg:pt-14 pb-12 sm:pb-24 bg-gradient-to-b from-[#F2F7FC]/80 via-white to-white border-b border-[#E8F3FF]"
      >
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="mb-5 sm:mb-12 text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center justify-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2.5">
              <h1 className="text-2xl sm:text-4xl lg:text-[42px] font-extrabold text-[#062B50] tracking-tight leading-tight">
                Ever feel like nobody gets it?
              </h1>
              {/* Playful blue accent marks right after question mark */}
              <span className="inline-flex items-center gap-0.5 sm:gap-1 text-[#0866C6] -mt-2 sm:-mt-3" aria-hidden="true">
                <span className="w-1 sm:w-1.5 h-3 sm:h-4 bg-[#0866C6] rounded-full rotate-[25deg]" />
                <span className="w-1 sm:w-1.5 h-1.5 sm:h-2.5 bg-[#0866C6] rounded-full rotate-[25deg]" />
              </span>
            </div>
            <p className="text-xs sm:text-lg text-[#5A6E85] leading-relaxed font-normal">
              Sometimes, it's difficult to explain what's going on in your head.
            </p>
          </div>

          {/* Cards Grid: 2 columns on mobile (showing 4 cards at once in viewport), 3 columns on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-7 lg:gap-8">
            {STUDENT_CONCERNS.map((concern) => (
              <div
                key={concern.id}
                onClick={() => onNavigate('/questionnaire')}
                className="bg-white rounded-2xl sm:rounded-3xl p-2.5 sm:p-6 border border-[#E2EDF8] shadow-xs hover:shadow-lg hover:border-[#0866C6]/30 transition-all duration-200 flex flex-col justify-between group cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0866C6]"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onNavigate('/questionnaire');
                  }
                }}
              >
                <div>
                  {/* Card Illustration Banner */}
                  <div className="w-full h-20 sm:h-40 lg:h-44 rounded-xl sm:rounded-2xl overflow-hidden bg-[#F0F6FD] mb-2 sm:mb-5 border border-[#EAF2FC]">
                    <img
                      src={concern.image}
                      alt={concern.alt}
                      className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Heading & Description on Left, Circular Action Arrow on Right */}
                  <div className="flex items-center justify-between gap-1.5 sm:gap-3 pt-0.5 sm:pt-1">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs sm:text-[19px] font-bold text-[#062B50] tracking-tight mb-0.5 sm:mb-1 group-hover:text-[#0866C6] transition-colors truncate">
                        {concern.heading}
                      </h3>
                      <p className="text-[10px] sm:text-[13.5px] text-[#5A6E85] leading-snug font-normal line-clamp-2">
                        "{concern.description}"
                      </p>
                    </div>

                    <div
                      className="w-6 h-6 sm:w-10 sm:h-10 rounded-full bg-[#EBF4FE] text-[#0866C6] group-hover:bg-[#0866C6] group-hover:text-white transition-all flex items-center justify-center shrink-0 shadow-xs group-hover:translate-x-0.5"
                      aria-hidden="true"
                    >
                      <ArrowRight className="w-3 h-3 sm:w-4.5 sm:h-4.5" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Section Bottom CTA Callout */}
          <div className="mt-12 sm:mt-16 text-center bg-[#F4F8FD] rounded-3xl p-8 sm:p-10 border border-[#E8F3FF] max-w-3xl mx-auto">
            <h3 className="text-xl sm:text-2xl font-bold text-[#062B50] mb-2.5 tracking-tight">
              Ready to explore what matters to you?
            </h3>
            <p className="text-sm sm:text-base text-[#5A6E85] mb-6 max-w-xl mx-auto leading-relaxed">
              No grades, no expectations—just a quiet, structured space to discover your genuine strengths and interests.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('/signup')}
              className="w-full sm:w-auto min-h-[50px] px-8 py-3.5 rounded-2xl bg-[#0866C6] text-white font-bold text-base hover:bg-[#062B50] active:scale-[0.98] transition-all shadow-md shadow-[#0866C6]/25 focus-visible:outline-2 focus-visible:outline-[#0866C6] cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <span>Explore what's on your mind</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

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
