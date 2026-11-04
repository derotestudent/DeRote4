import React from 'react';
import { Shield, FileText, CheckCircle2, Mail, ExternalLink } from 'lucide-react';
import { DeRoteWordmark } from './DeRoteWordmark';

interface FooterProps {
  onNavigate: (route: string) => void;
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, className = '' }) => {
  return (
    <footer className={`border-t border-[#E8F3FF] bg-[#F4F8FD] px-4 sm:px-6 lg:px-8 py-10 ${className}`}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center md:items-start justify-between gap-8 text-center md:text-left">
        {/* Brand Summary */}
        <div className="space-y-2.5 max-w-sm">
          <DeRoteWordmark showDescriptor={false} size="sm" />
          <p className="text-xs text-[#64778C] leading-relaxed">
            DeRote Student Insight System empowers school students in Classes 8, 9, and 10 to explore
            learning preferences, habits, and motivations through guided self-reflection.
          </p>
          <div className="pt-1 flex items-center justify-center md:justify-start gap-2 text-[11px] text-[#0866C6] font-semibold">
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span>Operated &amp; Managed Directly by DeRote</span>
          </div>
        </div>

        {/* Navigation & Compliance Links */}
        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center md:justify-end gap-x-6 gap-y-3 text-xs font-semibold text-[#64778C]">
          <button
            type="button"
            onClick={() => onNavigate('/consent')}
            className="hover:text-[#0866C6] transition-colors cursor-pointer flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-[#0866C6] rounded px-1"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#0866C6]" />
            <span>Student Consent &amp; Privacy</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/privacy')}
            className="hover:text-[#0866C6] transition-colors cursor-pointer flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-[#0866C6] rounded px-1"
          >
            <Shield className="w-3.5 h-3.5 text-[#0866C6]" />
            <span>Privacy Policy</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/terms')}
            className="hover:text-[#0866C6] transition-colors cursor-pointer flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-[#0866C6] rounded px-1"
          >
            <FileText className="w-3.5 h-3.5 text-[#0866C6]" />
            <span>Terms of Use</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/contact-privacy')}
            className="hover:text-[#0866C6] transition-colors cursor-pointer flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-[#0866C6] rounded px-1"
          >
            <Mail className="w-3.5 h-3.5 text-[#0866C6]" />
            <span>Contact &amp; Privacy Requests</span>
          </button>

          <span className="text-[#64778C]/40 hidden md:inline" aria-hidden="true">
            |
          </span>

          <a
            href="https://derote.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#062B50] hover:text-[#0866C6] transition-colors focus-visible:outline-2 focus-visible:outline-[#0866C6] rounded px-1"
          >
            <span>About DeRote</span>
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>

          <button
            type="button"
            onClick={() => onNavigate('/admin')}
            className="inline-flex items-center gap-1.5 text-[#0866C6] hover:text-[#062B50] bg-white border border-[#E8F3FF] px-2.5 py-1 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-[#0866C6]" />
            <span>Admin Portal</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-[#E8F3FF] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#64778C] gap-2">
        <span>© {new Date().getFullYear()} DeRote. All rights reserved.</span>
        <span>Secure student reflection environment · Not an evaluation or exam</span>
      </div>
    </footer>
  );
};
