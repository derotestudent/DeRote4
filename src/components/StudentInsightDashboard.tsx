import React from 'react';
import {
  StudentInsightReport,
  InsightCard,
} from '../services/insightEngine';
import {
  Compass,
  Lightbulb,
  GitFork,
  Users,
  PlayCircle,
  HeartHandshake,
  Download,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { exportStudentReportPdf } from '../services/pdfExportService';

interface StudentInsightDashboardProps {
  report: StudentInsightReport;
  onRetake?: () => void;
  onBackToHome?: () => void;
}

const ICON_MAP = {
  Compass,
  Lightbulb,
  GitFork,
  Users,
  PlayCircle,
  HeartHandshake,
};

export const StudentInsightDashboard: React.FC<StudentInsightDashboardProps> = ({
  report,
  onRetake,
  onBackToHome,
}) => {
  const handleDownloadPdf = () => {
    exportStudentReportPdf(report);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Top action header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        {onBackToHome && (
          <button
            onClick={onBackToHome}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#0866C6] hover:text-[#062B50] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        )}
        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-[#0866C6] hover:bg-[#062B50] rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download PDF Report
          </button>
        </div>
      </div>

      {/* Main Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#D5E9FF] shadow-lg mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E5F1FC] text-[#0866C6] text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Reflective Insight Summary
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#062B50] mb-2">
          {report.studentName}'s Reflection
        </h1>
        <p className="text-sm sm:text-base text-[#64778C]">
          {report.classGrade} · DeRote Student Insight Report
        </p>
        <p className="mt-4 text-xs sm:text-sm text-[#4E6278] leading-relaxed bg-[#F8FAFD] p-4 rounded-xl border border-[#E1EAF5]">
          <strong>Notice:</strong> This document reflects your self-reported preferences and natural inclinations. It contains zero numerical scores, diagnostic labels, or academic rankings.
        </p>
      </div>

      {/* Insight Cards */}
      <div className="space-y-6">
        {report.cards.map((card: InsightCard) => {
          const IconComponent = ICON_MAP[card.iconName] || Compass;
          return (
            <div
              key={card.id}
              className="bg-white rounded-2xl p-6 sm:p-7 border border-[#D5E9FF] shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#E5F1FC] text-[#0866C6] flex items-center justify-center shrink-0">
                  <IconComponent className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-[#062B50] mb-2">
                    {card.heading}
                  </h3>
                  <p className="text-sm sm:text-base text-[#334D66] leading-relaxed mb-4">
                    {card.reflectionText}
                  </p>

                  {/* Traceable Evidence */}
                  {card.evidence && card.evidence.length > 0 && (
                    <div className="bg-[#F8FAFD] rounded-xl p-3.5 border border-[#E8F1FA] text-xs">
                      <p className="font-semibold text-[#062B50] mb-1.5 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0866C6]" />
                        Anchored in your responses:
                      </p>
                      <ul className="space-y-1 text-[#64778C] pl-5 list-disc">
                        {card.evidence.map((ev, i) => (
                          <li key={i}>
                            <span className="font-medium text-[#334D66]">
                              {ev.questionTitle}:
                            </span>{' '}
                            {ev.selectedOptionTexts.join(', ')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {onRetake && (
        <div className="mt-10 text-center">
          <button
            onClick={onRetake}
            className="text-xs sm:text-sm font-semibold text-[#64778C] hover:text-[#0866C6] underline cursor-pointer"
          >
            Retake or edit your reflection answers
          </button>
        </div>
      )}
    </div>
  );
};
