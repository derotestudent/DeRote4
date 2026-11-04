import React from 'react';
import { X, Printer, Download } from 'lucide-react';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  htmlContent: string;
  plainTextSummary: string;
  fileName: string;
  onDownloadPdf?: () => void;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  htmlContent,
  plainTextSummary,
  fileName,
  onDownloadPdf,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-[#062B50]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
    >
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#E8F3FF] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E8F3FF] flex items-center justify-between bg-[#F8FAFD]">
          <div>
            <h3 className="text-lg font-bold text-[#062B50] tracking-tight">{title}</h3>
            {subtitle && <p className="text-xs text-[#64778C]">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#D5E4F3] text-xs font-bold text-[#062B50] hover:bg-[#F2F7FC] flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4 text-[#0866C6]" />
              <span>Print</span>
            </button>

            {onDownloadPdf && (
              <button
                type="button"
                onClick={onDownloadPdf}
                className="px-3.5 py-1.5 rounded-xl bg-[#0866C6] text-white text-xs font-bold hover:bg-[#062B50] flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>PDF</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#64778C] hover:text-[#062B50] hover:bg-slate-100 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          <div
            className="prose max-w-none text-sm text-[#102C46]"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </div>
    </div>
  );
};
