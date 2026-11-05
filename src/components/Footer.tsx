import React from 'react';
import { Shield, FileText, CheckCircle2, Mail, ExternalLink } from 'lucide-react';
import { DeRoteWordmark } from './DeRoteWordmark';

interface FooterProps {
  onNavigate: (route: string) => void;
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, className = '' }) => {
  return (
    <footer className={`border-t border-[#E8F3FF] bg-[#F4F8FD] px-4 sm:px-6 lg:px-8 py-10 sm:py-12 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          {/* Brand Summary (Spans 6 columns on desktop) */}
          <div className="md:col-span-6 space-y-3 text-left">
            <DeRoteWordmark showDescriptor={false} size="sm" />
            <p className="text-xs sm:text-sm text-[#5A6E85] leading-relaxed max-w-md">
              DeRote Student Insight System empowers students—no matter what grade or learning path—to
              explore learning preferences, habits, motivations, and future possibilities through
              guided, non-evaluative self-reflection.
            </p>
            <div className="pt-1 flex items-center gap-2 text-[11px] font-semibold text-[#0866C6]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EBF4FE] border border-[#CCE3FC]">
                <Shield className="w-3.5 h-3.5 text-[#0866C6] shrink-0" />
                <span>Operated &amp; Managed Directly by DeRote</span>
              </span>
            </div>
          </div>

          {/* Structured Link Columns (2 balanced columns on mobile and desktop) */}
          <div className="md:col-span-6 grid grid-cols-2 gap-6 sm:gap-8 text-left">
            {/* Column 1: Trust & Privacy */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#062B50]">
                Trust &amp; Privacy
              </h4>
              <ul className="space-y-2.5 text-xs text-[#5A6E85]">
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('/consent')}
                    className="hover:text-[#0866C6] transition-colors cursor-pointer inline-flex items-center gap-1.5 text-left focus-visible:outline-2 focus-visible:outline-[#0866C6] rounded"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0866C6] shrink-0" />
                    <span>Consent &amp; Privacy</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('/privacy')}
                    className="hover:text-[#0866C6] transition-colors cursor-pointer inline-flex items-center gap-1.5 text-left focus-visible:outline-2 focus-visible:outline-[#0866C6] rounded"
                  >
                    <Shield className="w-3.5 h-3.5 text-[#0866C6] shrink-0" />
                    <span>Privacy Policy</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('/contact-privacy')}
                    className="hover:text-[#0866C6] transition-colors cursor-pointer inline-flex items-center gap-1.5 text-left focus-visible:outline-2 focus-visible:outline-[#0866C6] rounded"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#0866C6] shrink-0" />
                    <span>Contact Requests</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 2: Platform & Access */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#062B50]">
                Platform
              </h4>
              <ul className="space-y-2.5 text-xs text-[#5A6E85]">
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('/terms')}
                    className="hover:text-[#0866C6] transition-colors cursor-pointer inline-flex items-center gap-1.5 text-left focus-visible:outline-2 focus-visible:outline-[#0866C6] rounded"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#0866C6] shrink-0" />
                    <span>Terms of Use</span>
                  </button>
                </li>
                <li>
                  <a
                    href="https://derote.in/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#0866C6] transition-colors inline-flex items-center gap-1.5 text-[#062B50] font-medium focus-visible:outline-2 focus-visible:outline-[#0866C6] rounded"
                  >
                    <span>About DeRote</span>
                    <ExternalLink className="w-3 h-3 text-[#5A6E85]" aria-hidden="true" />
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('/admin')}
                    className="inline-flex items-center gap-1.5 text-[#0866C6] hover:text-[#062B50] bg-white border border-[#CCE3FC] px-2.5 py-1 rounded-lg text-xs font-semibold shadow-2xs hover:bg-[#F2F7FC] transition-colors cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5 text-[#0866C6] shrink-0" />
                    <span>Admin Portal</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Reassurance Note */}
        <div className="mt-8 pt-6 border-t border-[#E8F3FF] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#64778C] gap-2.5 text-center sm:text-left">
          <span>© {new Date().getFullYear()} DeRote. All rights reserved.</span>
          <span className="text-[#8EA3B8]">
            Secure student reflection environment · Not an evaluation or exam
          </span>
        </div>
      </div>
    </footer>
  );
};
