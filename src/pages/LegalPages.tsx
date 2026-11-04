import React from 'react';
import { Shield, ArrowLeft, Mail, FileText, CheckCircle2, Lock } from 'lucide-react';
import { DeRoteWordmark } from '../components/DeRoteWordmark';
import { Footer } from '../components/Footer';

interface LegalPageProps {
  onNavigate: (route: string) => void;
}

const LegalHeader: React.FC<LegalPageProps> = ({ onNavigate }) => (
  <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E8F3FF] px-4 sm:px-8 py-3.5">
    <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
      <button
        onClick={() => onNavigate('/')}
        className="flex items-center text-left focus-visible:outline-2 focus-visible:outline-[#0866C6] rounded-lg cursor-pointer"
        aria-label="DeRote Home"
      >
        <DeRoteWordmark showDescriptor={true} size="md" />
      </button>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate('/signup')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#0866C6] hover:bg-[#062B50] rounded-xl transition-all cursor-pointer shadow-xs"
        >
          Sign Up
        </button>
        <button
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#64778C] hover:text-[#062B50] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
      </div>
    </div>
  </header>
);

export const ConsentNoticePage: React.FC<LegalPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#102C46]">
      <LegalHeader onNavigate={onNavigate} />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-10 sm:py-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8F3FF] text-[#0866C6] text-xs font-bold mb-4">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Student Informed Consent</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#062B50] tracking-tight mb-4">
          Student Consent &amp; Transparency Notice
        </h1>
        <p className="text-sm text-[#64778C] mb-8">Last Updated: October 2026</p>

        <div className="space-y-6 text-sm sm:text-base text-[#334E68] leading-relaxed">
          <section className="bg-[#F8FAFD] p-6 rounded-2xl border border-[#E8F3FF]">
            <h2 className="text-lg font-bold text-[#062B50] mb-2">1. Nature of the Experience</h2>
            <p>
              DeRote is an educational self-reflection experience designed for school students in Classes 8, 9,
              and 10. It is <strong>not an examination, intelligence quotient test, or mental health diagnostic tool</strong>.
              There are no scores, grades, cut-offs, or pass/fail criteria.
            </p>
          </section>

          <section className="bg-[#F8FAFD] p-6 rounded-2xl border border-[#E8F3FF]">
            <h2 className="text-lg font-bold text-[#062B50] mb-2">2. How Your Responses Are Handled</h2>
            <p>
              Your responses help generate a personalized reflective narrative covering your learning styles,
              curiosity themes, and collaborative habits. Authorized educators or school counselors may review
              summaries exclusively to offer constructive guidance.
            </p>
          </section>

          <section className="bg-[#F8FAFD] p-6 rounded-2xl border border-[#E8F3FF]">
            <h2 className="text-lg font-bold text-[#062B50] mb-2">3. Voluntary Participation</h2>
            <p>
              Participation in this reflection is voluntary. You may skip questions or choose "Something else" to
              express yourself authentically.
            </p>
          </section>
        </div>
      </main>
      <Footer onNavigate={onNavigate} />
    </div>
  );
};

export const PrivacyPolicyPage: React.FC<LegalPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#102C46]">
      <LegalHeader onNavigate={onNavigate} />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-10 sm:py-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8F3FF] text-[#0866C6] text-xs font-bold mb-4">
          <Shield className="w-3.5 h-3.5" />
          <span>Data Protection</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#062B50] tracking-tight mb-4">
          Privacy Policy
        </h1>
        <p className="text-sm text-[#64778C] mb-8">Last Updated: October 2026</p>

        <div className="space-y-6 text-sm sm:text-base text-[#334E68] leading-relaxed">
          <section className="bg-[#F8FAFD] p-6 rounded-2xl border border-[#E8F3FF]">
            <h2 className="text-lg font-bold text-[#062B50] mb-2">Information We Collect</h2>
            <p>
              We collect information provided directly by students during registration: Full Name, Class Grade,
              School Name, and optional contact details. We store self-reflection responses securely in Google Cloud Firestore.
            </p>
          </section>

          <section className="bg-[#F8FAFD] p-6 rounded-2xl border border-[#E8F3FF]">
            <h2 className="text-lg font-bold text-[#062B50] mb-2">Security &amp; Data Rights</h2>
            <p>
              We never sell, rent, or monetize student personal data. All data transmission is encrypted using TLS.
              Students and parents may request profile corrections or complete deletion at any time.
            </p>
          </section>
        </div>
      </main>
      <Footer onNavigate={onNavigate} />
    </div>
  );
};

export const TermsOfUsePage: React.FC<LegalPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#102C46]">
      <LegalHeader onNavigate={onNavigate} />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-10 sm:py-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8F3FF] text-[#0866C6] text-xs font-bold mb-4">
          <FileText className="w-3.5 h-3.5" />
          <span>Terms &amp; Conditions</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#062B50] tracking-tight mb-4">
          Terms of Use
        </h1>
        <p className="text-sm text-[#64778C] mb-8">Last Updated: October 2026</p>

        <div className="space-y-6 text-sm sm:text-base text-[#334E68] leading-relaxed">
          <section className="bg-[#F8FAFD] p-6 rounded-2xl border border-[#E8F3FF]">
            <h2 className="text-lg font-bold text-[#062B50] mb-2">Permitted Use</h2>
            <p>
              The DeRote platform is provided exclusively for personal and educational reflection. Users agree to provide
              accurate registration details and respect community standards.
            </p>
          </section>
        </div>
      </main>
      <Footer onNavigate={onNavigate} />
    </div>
  );
};

export const ContactPrivacyPage: React.FC<LegalPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#102C46]">
      <LegalHeader onNavigate={onNavigate} />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-10 sm:py-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8F3FF] text-[#0866C6] text-xs font-bold mb-4">
          <Mail className="w-3.5 h-3.5" />
          <span>Support &amp; Compliance</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#062B50] tracking-tight mb-4">
          Contact &amp; Privacy Requests
        </h1>
        <p className="text-sm text-[#64778C] mb-8">Direct correspondence with the DeRote team</p>

        <div className="bg-[#F8FAFD] p-6 sm:p-8 rounded-3xl border border-[#E8F3FF] max-w-xl">
          <p className="text-sm text-[#5A6E85] mb-6 leading-relaxed">
            For parental queries, student data rectification, account removal requests, or institutional inquiries,
            please reach out directly:
          </p>
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-[#D5E4F3]">
            <Mail className="w-5 h-5 text-[#0866C6]" />
            <div>
              <div className="text-xs font-bold text-[#64778C]">Official Contact</div>
              <a href="mailto:contact@derote.in" className="text-sm font-bold text-[#0866C6] hover:underline">
                contact@derote.in
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer onNavigate={onNavigate} />
    </div>
  );
};
