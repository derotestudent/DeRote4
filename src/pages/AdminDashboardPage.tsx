import React, { useState, useMemo, useEffect } from 'react';
import {
  Shield,
  Users,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Eye,
  LogOut,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Compass,
  Lightbulb,
  HeartHandshake,
  PlayCircle,
  FileText,
  Printer,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  Info,
  Building2,
  MapPin,
  School,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { DeRoteWordmark } from '../components/DeRoteWordmark';
import {
  getCurrentAdmin,
  signOutAdmin,
  onAdminAuthChange,
  fetchAllStudentAdminRecords,
  calculateCohortAnalytics,
  StudentAdminRecord,
  AdminAccount,
} from '../services/adminService';
import { QUESTION_BANK, CUSTOM_OPTION_ID } from '../data/questionnaireBank';
import { PrintReportModal } from '../components/PrintReportModal';
import { exportCohortReportPdf, exportStudentReportPdf } from '../services/pdfExportService';

interface AdminDashboardPageProps {
  onNavigate: (route: string) => void;
}

export function AdminDashboardPage({ onNavigate }: AdminDashboardPageProps) {
  const [admin, setAdmin] = useState<AdminAccount | null>(() => getCurrentAdmin());
  const [activeTab, setActiveTab] = useState<'cohort' | 'roster' | 'questions'>('cohort');
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<'all' | '8' | '9' | '10'>('all');
  const [schoolFilter, setSchoolFilter] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<StudentAdminRecord | null>(null);

  const [printModalConfig, setPrintModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    htmlContent: string;
    plainTextSummary: string;
    fileName: string;
    onDownloadPdf?: () => void;
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    htmlContent: '',
    plainTextSummary: '',
    fileName: '',
  });

  useEffect(() => {
    const unsub = onAdminAuthChange((current) => {
      setAdmin(current);
      if (!current) {
        onNavigate('/admin/login');
      }
    });
    return () => unsub();
  }, [onNavigate]);

  const [studentRecords, setStudentRecords] = useState<StudentAdminRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState<boolean>(true);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const loadRecords = async () => {
    setIsLoadingRecords(true);
    setRecordsError(null);
    try {
      const records = await fetchAllStudentAdminRecords();
      setStudentRecords(records);
    } catch (err) {
      console.error('Failed to load student records from Firestore:', err);
      setRecordsError('Unable to load student records from Cloud Firestore. Please verify your administrator credentials.');
    } finally {
      setIsLoadingRecords(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const analytics = useMemo(() => {
    return calculateCohortAnalytics(studentRecords);
  }, [studentRecords]);

  const availableSchools = useMemo(() => {
    const set = new Set<string>();
    studentRecords.forEach((r) => {
      if (r.schoolName && r.schoolName.trim()) {
        set.add(r.schoolName.trim());
      }
    });
    return Array.from(set).sort();
  }, [studentRecords]);

  const schoolDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    studentRecords.forEach((r) => {
      const s = r.schoolName ? r.schoolName.trim() : 'Unspecified';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: studentRecords.length > 0 ? Math.round((count / studentRecords.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [studentRecords]);

  const filteredRecords = useMemo(() => {
    return studentRecords.filter((rec) => {
      const matchesSearch =
        rec.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.schoolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.phone.includes(searchQuery);

      const matchesClass =
        classFilter === 'all' || rec.classGrade.includes(classFilter);

      const matchesSchool =
        schoolFilter === 'all' || rec.schoolName.trim().toLowerCase() === schoolFilter.trim().toLowerCase();

      return matchesSearch && matchesClass && matchesSchool;
    });
  }, [studentRecords, searchQuery, classFilter, schoolFilter]);

  const handleSignOut = async () => {
    await signOutAdmin();
    setAdmin(null);
    onNavigate('/admin/login');
  };

  const handlePrintCohort = () => {
    const institution = admin?.institution || 'DeRote Partner School Network';
    const dateStr = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const htmlContent = `
      <div style="border-bottom: 2px solid #0866C6; padding-bottom: 14px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
          <div>
            <h1 style="font-size: 22px; font-weight: 800; color: #062B50; margin: 0 0 4px 0;">DeRote — Cohort Insight & Learning Environment Summary</h1>
            <p style="font-size: 13px; color: #465B72; margin: 0;">${institution} · Classes 8, 9, & 10 Cohort</p>
          </div>
          <div style="text-align: right; font-size: 11px; color: #64778C;">
            <div>Admin: <strong style="color: #062B50;">${admin?.fullName || 'Admin'}</strong></div>
            <div>Date: ${dateStr}</div>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
        <div style="background: #F8FAFD; border: 1px solid #D5E9FF; border-radius: 12px; padding: 12px; text-align: center;">
          <div style="font-size: 22px; font-weight: 800; color: #062B50;">${analytics.totalStudents}</div>
          <div style="font-size: 10px; font-weight: 700; color: #64778C; text-transform: uppercase;">Total Students</div>
        </div>
        <div style="background: #F8FAFD; border: 1px solid #D5E9FF; border-radius: 12px; padding: 12px; text-align: center;">
          <div style="font-size: 22px; font-weight: 800; color: #059669;">${analytics.completedAssessments}</div>
          <div style="font-size: 10px; font-weight: 700; color: #059669; text-transform: uppercase;">Completed (${analytics.completionRate}%)</div>
        </div>
        <div style="background: #F8FAFD; border: 1px solid #D5E9FF; border-radius: 12px; padding: 12px; text-align: center;">
          <div style="font-size: 22px; font-weight: 800; color: #0866C6;">${analytics.inProgressAssessments}</div>
          <div style="font-size: 10px; font-weight: 700; color: #0866C6; text-transform: uppercase;">In Progress</div>
        </div>
        <div style="background: #F8FAFD; border: 1px solid #D5E9FF; border-radius: 12px; padding: 12px; text-align: center;">
          <div style="font-size: 12px; font-weight: 700; color: #062B50;">C8: ${analytics.classBreakdown.class8} | C9: ${analytics.classBreakdown.class9}</div>
          <div style="font-size: 12px; font-weight: 700; color: #062B50;">C10: ${analytics.classBreakdown.class10}</div>
          <div style="font-size: 10px; font-weight: 700; color: #64778C; text-transform: uppercase;">Class Breakdown</div>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 13px; font-weight: 700; color: #062B50; margin: 0 0 8px 0; border-bottom: 1px solid #E8F3FF; padding-bottom: 4px;">Top Project Activities That Catch Interest</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          ${analytics.topDrawsInActivities.map(item => `
            <div style="padding: 8px 12px; background: #F8FAFD; border-radius: 8px; border: 1px solid #E8F3FF; font-size: 12px; display: flex; justify-content: space-between;">
              <span style="color: #062B50;">• ${item.label}</span>
              <strong style="color: #0866C6;">${item.percentage}% (${item.count})</strong>
            </div>
          `).join('')}
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 13px; font-weight: 700; color: #062B50; margin: 0 0 8px 0; border-bottom: 1px solid #E8F3FF; padding-bottom: 4px;">What Helps Students Get Started (Starter Conditions)</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          ${analytics.topStarterConditions.map(item => `
            <div style="padding: 8px 12px; background: #F8FAFD; border-radius: 8px; border: 1px solid #E8F3FF; font-size: 12px; display: flex; justify-content: space-between;">
              <span style="color: #062B50;">• ${item.label}</span>
              <strong style="color: #0866C6;">${item.percentage}% (${item.count})</strong>
            </div>
          `).join('')}
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 13px; font-weight: 700; color: #062B50; margin: 0 0 8px 0; border-bottom: 1px solid #E8F3FF; padding-bottom: 4px;">Student Submissions Roster Overview (${studentRecords.length} Students)</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
          <thead>
            <tr style="background: #F4F8FD; border-bottom: 1px solid #D5E9FF;">
              <th style="padding: 6px 8px; color: #062B50;">Student Name</th>
              <th style="padding: 6px 8px; color: #062B50;">Grade</th>
              <th style="padding: 6px 8px; color: #062B50;">Status</th>
              <th style="padding: 6px 8px; color: #062B50;">Answered</th>
              <th style="padding: 6px 8px; color: #062B50;">Primary Reflected Focus</th>
            </tr>
          </thead>
          <tbody>
            ${studentRecords.map(s => `
              <tr style="border-bottom: 1px solid #F0F5FA;">
                <td style="padding: 6px 8px; font-weight: 600; color: #062B50;">${s.fullName}</td>
                <td style="padding: 6px 8px; color: #465B72;">${s.classGrade}</td>
                <td style="padding: 6px 8px; color: ${s.isSubmitted ? '#059669' : '#D97706'}; font-weight: 600;">${s.isSubmitted ? 'Completed' : 'In Progress'}</td>
                <td style="padding: 6px 8px; color: #465B72;">${s.answeredCount} / ${s.totalQuestions}</td>
                <td style="padding: 6px 8px; color: #0866C6;">${s.insightReport.cards[0]?.heading || 'In Progress'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    const plainTextSummary = `DeRote — Cohort Insight & Learning Environment Summary
Institution: ${institution}
Admin: ${admin?.fullName || 'Admin'}
Date: ${dateStr}

Summary Metrics:
- Total Enrolled Students: ${analytics.totalStudents}
- Completed Reflections: ${analytics.completedAssessments} (${analytics.completionRate}%)
- In-Progress Assessments: ${analytics.inProgressAssessments}
- Class Breakdown: Class 8: ${analytics.classBreakdown.class8}, Class 9: ${analytics.classBreakdown.class9}, Class 10: ${analytics.classBreakdown.class10}

Top Project Draws:
${analytics.topDrawsInActivities.map(i => `- ${i.label}: ${i.percentage}% (${i.count})`).join('\n')}

Top Starter Conditions:
${analytics.topStarterConditions.map(i => `- ${i.label}: ${i.percentage}% (${i.count})`).join('\n')}

Student Submissions:
${studentRecords.map(s => `- ${s.fullName} (${s.classGrade}): ${s.isSubmitted ? 'Completed' : 'In Progress'}, Top Theme: ${s.insightReport.cards[0]?.heading || 'In Progress'}`).join('\n')}
    `;

    const cohortFileName = `derote-cohort-report-${new Date().toISOString().slice(0, 10)}`;
    setPrintModalConfig({
      isOpen: true,
      title: 'Cohort Insight & Learning Environment Report',
      subtitle: `${institution} · Classes 8–10 Overview`,
      htmlContent,
      plainTextSummary,
      fileName: cohortFileName,
      onDownloadPdf: () => exportCohortReportPdf(analytics, studentRecords, admin, cohortFileName),
    });
  };

  const handlePrintStudent = (student: StudentAdminRecord) => {
    const cardsHtml = student.insightReport.cards.map(card => `
      <div style="background: #F8FAFD; border: 1px solid #D5E9FF; border-radius: 12px; padding: 14px; margin-bottom: 12px;">
        <h4 style="font-size: 14px; font-weight: 700; color: #062B50; margin: 0 0 6px 0;">${card.heading}</h4>
        <p style="font-size: 13px; color: #465B72; margin: 0 0 8px 0; line-height: 1.5;">${card.reflectionText}</p>
        <div style="font-size: 11px; color: #0866C6; font-weight: 600;">
          Traceable Evidence: ${card.evidence.map(e => `Q${e.questionNumber} (${e.questionTitle}): ${e.selectedOptionTexts.join(' / ')}`).join('; ')}
        </div>
      </div>
    `).join('');

    const htmlContent = `
      <div style="border-bottom: 2px solid #0866C6; padding-bottom: 14px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h1 style="font-size: 22px; font-weight: 800; color: #062B50; margin: 0 0 4px 0;">DeRote — Student Reflective Insight Record</h1>
            <p style="font-size: 14px; font-weight: 600; color: #0866C6; margin: 0;">${student.fullName} · ${student.classGrade}</p>
            <p style="font-size: 12px; color: #64778C; margin: 2px 0 0 0;">${student.schoolName}</p>
          </div>
          <div style="text-align: right; font-size: 11px; color: #64778C;">
            <div>Status: <strong style="color: ${student.isSubmitted ? '#059669' : '#D97706'};">${student.isSubmitted ? 'Completed Assessment' : 'In Progress'}</strong></div>
            <div>Answered: ${student.answeredCount} / ${student.totalQuestions} Questions</div>
            <div>Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 13px; font-weight: 700; color: #062B50; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em;">
          Reflected Themes & Pedagogical Observations
        </h3>
        ${cardsHtml}
      </div>

      <div style="background: #F4F8FD; border-radius: 12px; padding: 12px; font-size: 11px; color: #465B72; border: 1px solid #E8F3FF;">
        <strong>Philosophical Framing:</strong> "Reflect, don't judge." These insights reflect student-stated choices to support pedagogical guidance and collaborative conditions without personality labelling or numerical ranking.
      </div>
    `;

    const plainTextSummary = `DeRote — Student Reflective Insight Record
Student: ${student.fullName}
Grade: ${student.classGrade}
School: ${student.schoolName}
Status: ${student.isSubmitted ? 'Completed' : 'In Progress'} (${student.answeredCount}/${student.totalQuestions} answered)

Reflected Themes:
${student.insightReport.cards.map(c => `* ${c.heading}: ${c.reflectionText}`).join('\n\n')}
    `;

    const studentFileName = `derote-student-${student.fullName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}`;
    setPrintModalConfig({
      isOpen: true,
      title: `Student Insight Record — ${student.fullName}`,
      subtitle: `${student.classGrade} · ${student.schoolName}`,
      htmlContent,
      plainTextSummary,
      fileName: studentFileName,
      onDownloadPdf: () => exportStudentReportPdf(student.insightReport, student.schoolName, studentFileName),
    });
  };

  return (
    <div className="min-h-screen bg-[#F4F8FD] flex flex-col text-[#102C46]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E8F3FF] px-3 sm:px-8 py-2.5 sm:py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <DeRoteWordmark size="sm" showDescriptor={false} />
            <div className="h-4 w-px bg-[#E8F3FF] hidden sm:block" />
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-[#0866C6] bg-[#E8F3FF] px-2 sm:px-2.5 py-1 rounded-full whitespace-nowrap shrink-0">
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>Admin Dashboard</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {admin && (
              <div className="hidden md:flex items-center gap-2.5 bg-[#F4F8FD] border border-[#E8F3FF] px-3.5 py-1.5 rounded-full text-xs">
                <span className="w-6 h-6 rounded-full bg-[#0866C6] text-white flex items-center justify-center font-bold text-[10px]">
                  {admin.avatarText || 'AD'}
                </span>
                <div className="text-left">
                  <span className="font-bold text-[#062B50] block leading-tight">
                    {admin.fullName}
                  </span>
                  <span className="text-[10px] text-[#64778C] block leading-tight">
                    {admin.roleTitle}
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={loadRecords}
              disabled={isLoadingRecords}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#465B72] hover:text-[#062B50] bg-white border border-[#E8F3FF] px-3 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh records from Cloud Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#0866C6] ${isLoadingRecords ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handlePrintCohort}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#465B72] hover:text-[#062B50] bg-white border border-[#E8F3FF] px-3 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer"
              title="Print Cohort Report"
            >
              <Printer className="w-3.5 h-3.5 text-[#0866C6]" />
              <span>Print Report</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('/questionnaire')}
              className="text-xs font-semibold text-[#0866C6] hover:text-[#062B50] bg-white border border-[#E8F3FF] px-2.5 sm:px-3 py-1.5 rounded-xl shadow-xs cursor-pointer whitespace-nowrap"
            >
              Student Portal
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="p-1.5 sm:p-2 rounded-xl text-[#64778C] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              title="Sign Out Admin"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-6">
        {/* Institutional Welcome & Headline */}
        <div className="bg-white rounded-3xl p-5 sm:p-8 border border-[#E8F3FF] shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 sm:gap-6">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0866C6] uppercase tracking-wider mb-1">
              <span className="break-words">{admin?.institution || 'DeRote Partner School Network'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#062B50] tracking-tight break-words leading-tight">
              Cohort Insight & Learning Environment Overview
            </h1>
            <p className="text-xs sm:text-sm text-[#64778C] mt-2 max-w-2xl leading-relaxed">
              Synthesized reflections from Classes 8, 9, and 10. Designed to guide pedagogical support, collaborative formats, and classroom conditions without personality labelling or numerical ranking.
            </p>
          </div>

          <div className="w-full lg:w-auto flex items-center gap-1.5 sm:gap-2 self-stretch lg:self-auto bg-[#F4F8FD] p-1.5 rounded-2xl border border-[#E8F3FF] overflow-x-auto no-scrollbar scroll-smooth">
            <button
              type="button"
              onClick={() => setActiveTab('cohort')}
              className={`shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'cohort'
                  ? 'bg-white text-[#0866C6] shadow-xs'
                  : 'text-[#64778C] hover:text-[#062B50]'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Cohort Trends</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('roster')}
              className={`shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'roster'
                  ? 'bg-white text-[#0866C6] shadow-xs'
                  : 'text-[#64778C] hover:text-[#062B50]'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Student Submissions ({studentRecords.length})</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('questions')}
              className={`shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'questions'
                  ? 'bg-white text-[#0866C6] shadow-xs'
                  : 'text-[#64778C] hover:text-[#062B50]'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Question Bank (14)</span>
              </span>
            </button>
          </div>
        </div>

        {/* Cloud Firestore Loading & Error Notifications */}
        {isLoadingRecords && (
          <div className="bg-white p-4 rounded-2xl border border-[#D5E9FF] shadow-xs flex items-center justify-center gap-3 text-xs text-[#0866C6]">
            <Loader2 className="w-4 h-4 animate-spin text-[#0866C6]" />
            <span className="font-semibold">Loading student submissions from Cloud Firestore...</span>
          </div>
        )}

        {recordsError && (
          <div className="bg-red-50 p-4 rounded-2xl border border-red-200 shadow-xs flex items-center justify-between gap-3 text-xs text-red-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{recordsError}</span>
            </div>
            <button
              type="button"
              onClick={loadRecords}
              className="px-3 py-1 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shrink-0 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Top 4 KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#E8F3FF] shadow-xs">
            <span className="text-[11px] font-bold text-[#64778C] uppercase tracking-wider block">
              Registered Students
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#062B50]">
                {analytics.totalStudents}
              </span>
              <span className="text-xs text-[#64778C]">enrolled</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-[#64778C] border-t border-[#F4F8FD] pt-2">
              <span>Class 8: {analytics.classBreakdown.class8}</span>
              <span>·</span>
              <span>Class 9: {analytics.classBreakdown.class9}</span>
              <span>·</span>
              <span>Class 10: {analytics.classBreakdown.class10}</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E8F3FF] shadow-xs">
            <span className="text-[11px] font-bold text-[#64778C] uppercase tracking-wider block">
              Completed Reflections
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
                {analytics.completedAssessments}
              </span>
              <span className="text-xs text-emerald-700/80 font-semibold">
                ({analytics.completionRate}%)
              </span>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] text-emerald-700 border-t border-[#F4F8FD] pt-2">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Full 14-question submissions</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E8F3FF] shadow-xs">
            <span className="text-[11px] font-bold text-[#64778C] uppercase tracking-wider block">
              In-Progress Assessments
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#0866C6]">
                {analytics.inProgressAssessments}
              </span>
              <span className="text-xs text-[#64778C]">active</span>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] text-[#64778C] border-t border-[#F4F8FD] pt-2">
              <Clock className="w-3 h-3 text-[#0866C6]" />
              <span>Autosaved on device</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E8F3FF] shadow-xs">
            <span className="text-[11px] font-bold text-[#64778C] uppercase tracking-wider block">
              Insight Themes Mapped
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#062B50]">
                6 Themes
              </span>
              <span className="text-xs text-[#64778C]">deterministic</span>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] text-[#64778C] border-t border-[#F4F8FD] pt-2">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Zero personality rankings</span>
            </div>
          </div>
        </div>

        {/* TAB 1: COHORT TRENDS & ENVIRONMENT INSIGHTS */}
        {activeTab === 'cohort' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Pedagogical Guidance Banner */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#E8F3FF]/50 border border-[#D5E9FF] flex items-start gap-3.5 text-xs text-[#465B72]">
              <Info className="w-5 h-5 text-[#0866C6] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#062B50] font-bold block mb-0.5">
                  Institutional Guiding Principle: "Reflect, Don't Judge"
                </strong>
                <p className="leading-relaxed">
                  These aggregated findings summarize what students report regarding their learning instincts, collaboration preferences, and support conditions. Use this data to calibrate classroom instructions, project groupings, and assessment choices—never to pigeonhole individual learners.
                </p>
              </div>
            </div>

            {/* 4 Environmental Theme Grid or Empty State */}
            {studentRecords.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#E8F3FF] shadow-xs text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-[#E8F3FF] text-[#0866C6] flex items-center justify-center mb-3">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#062B50]">
                  No Student Reflections Recorded in Firestore Yet
                </h3>
                <p className="text-xs text-[#64778C] mt-2 max-w-md mx-auto leading-relaxed">
                  As students register and submit their reflections through the student portal, cohort themes (such as exhibition choices, starter conditions, and collaboration instincts) will populate here in real time.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Category A: What Draws Students In */}
                  <div className="bg-white p-6 rounded-3xl border border-[#E8F3FF] shadow-xs">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-xl bg-[#F0F7FF] flex items-center justify-center text-[#0866C6]">
                        <Compass className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#062B50]">
                          What Draws Students In
                        </h3>
                        <p className="text-[11px] text-[#64778C]">
                          Most appealing activities chosen for year-end exhibition
                        </p>
                      </div>
                    </div>

                <div className="space-y-3">
                  {analytics.topDrawsInActivities.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[#062B50] truncate mr-2">
                          {item.label}
                        </span>
                        <span className="font-bold text-[#0866C6] shrink-0">
                          {item.count} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#F4F8FD] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0866C6] rounded-full"
                          style={{ width: `${Math.max(item.percentage, 10)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category E: What Helps Students Get Started */}
              <div className="bg-white p-6 rounded-3xl border border-[#E8F3FF] shadow-xs">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-[#F0F7FF] flex items-center justify-center text-[#0866C6]">
                    <PlayCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#062B50]">
                      What Helps Students Get Started
                    </h3>
                    <p className="text-[11px] text-[#64778C]">
                      Reported conditions that overcome hesitation or procrastination
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {analytics.topStarterConditions.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[#062B50] truncate mr-2">
                          {item.label}
                        </span>
                        <span className="font-bold text-[#0866C6] shrink-0">
                          {item.count} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#F4F8FD] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.max(item.percentage, 10)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category D: What Makes Group Work Easier */}
              <div className="bg-white p-6 rounded-3xl border border-[#E8F3FF] shadow-xs">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-[#F0F7FF] flex items-center justify-center text-[#0866C6]">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#062B50]">
                      What Makes Group Work Easier
                    </h3>
                    <p className="text-[11px] text-[#64778C]">
                      Team dynamics and structural factors students rely on
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {analytics.topGroupWorkConditions.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[#062B50] truncate mr-2">
                          {item.label}
                        </span>
                        <span className="font-bold text-[#0866C6] shrink-0">
                          {item.count} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#F4F8FD] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#168FE5] rounded-full"
                          style={{ width: `${Math.max(item.percentage, 10)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category F: What Students Want Teachers to Understand */}
              <div className="bg-white p-6 rounded-3xl border border-[#E8F3FF] shadow-xs">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-[#F0F7FF] flex items-center justify-center text-[#0866C6]">
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#062B50]">
                      Voice & Teacher Understanding
                    </h3>
                    <p className="text-[11px] text-[#64778C]">
                      What students indicated would help educators support them best
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {analytics.topTeacherGuidanceWishes.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[#062B50] truncate mr-2">
                          {item.label}
                        </span>
                        <span className="font-bold text-[#0866C6] shrink-0">
                          {item.count} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#F4F8FD] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${Math.max(item.percentage, 10)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Participating Schools Representation */}
            <div className="bg-white p-6 rounded-3xl border border-[#E8F3FF] shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#F0F7FF] flex items-center justify-center text-[#0866C6]">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#062B50]">
                      Participating Schools Representation ({schoolDistribution.length})
                    </h3>
                    <p className="text-[11px] text-[#64778C]">
                      Enrolled students grouped by institutional affiliation
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-semibold text-[#0866C6] bg-[#E8F3FF] px-2.5 py-1 rounded-full self-start sm:self-auto">
                  Click any school to filter student submissions
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {schoolDistribution.map((sch) => (
                  <button
                    key={sch.name}
                    type="button"
                    onClick={() => {
                      setSchoolFilter(sch.name);
                      setActiveTab('roster');
                    }}
                    className="p-3.5 rounded-2xl bg-[#F8FAFD] hover:bg-[#EAF1FF] border border-[#E8F3FF] hover:border-[#D5E9FF] transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-xs text-[#062B50] group-hover:text-[#0866C6] transition-colors truncate">
                        {sch.name}
                      </span>
                      <span className="text-xs font-bold text-[#0866C6] bg-white px-2 py-0.5 rounded-md border border-[#E8F3FF] shrink-0">
                        {sch.count} {sch.count === 1 ? 'student' : 'students'}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-[#64778C]">
                      <span>{sch.percentage}% of cohort</span>
                      <span className="font-semibold text-[#0866C6] group-hover:underline">
                        Filter Roster →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    )}

        {/* TAB 2: STUDENT SUBMISSIONS ROSTER */}
        {activeTab === 'roster' && (
          <div className="bg-white rounded-3xl border border-[#E8F3FF] shadow-xs overflow-hidden animate-fadeIn">
            {/* Search and Filters Bar */}
            <div className="p-5 border-b border-[#F0F5FA] flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="relative w-full lg:w-72">
                <Search className="w-4 h-4 text-[#64778C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student or school..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E8F3FF] bg-[#F4F8FD] text-xs text-[#062B50] focus:outline-none focus:ring-2 focus:ring-[#0866C6]/20 focus:bg-white transition-all"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                {/* School Filter Dropdown */}
                <div className="flex items-center gap-1.5 bg-[#F4F8FD] px-3 py-1.5 rounded-xl border border-[#E8F3FF]">
                  <Building2 className="w-3.5 h-3.5 text-[#0866C6] shrink-0" />
                  <span className="text-xs font-semibold text-[#64778C] hidden sm:inline">
                    School:
                  </span>
                  <select
                    value={schoolFilter}
                    onChange={(e) => setSchoolFilter(e.target.value)}
                    className="bg-transparent text-xs font-bold text-[#062B50] focus:outline-none cursor-pointer max-w-[170px] sm:max-w-[210px] truncate"
                    title="Filter students by school name"
                  >
                    <option value="all">All Schools ({availableSchools.length})</option>
                    {availableSchools.map((sch) => (
                      <option key={sch} value={sch}>
                        {sch}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Class Filter */}
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-[#64778C] mr-1 hidden sm:inline">
                    Class:
                  </span>
                  {(['all', '8', '9', '10'] as const).map((cls) => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setClassFilter(cls)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        classFilter === cls
                          ? 'bg-[#0866C6] text-white shadow-xs'
                          : 'bg-[#F4F8FD] text-[#64778C] hover:text-[#062B50]'
                      }`}
                    >
                      {cls === 'all' ? 'All' : `Class ${cls}`}
                    </button>
                  ))}
                </div>

                {/* Reset Filters Chip */}
                {(schoolFilter !== 'all' || classFilter !== 'all' || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSchoolFilter('all');
                      setClassFilter('all');
                      setSearchQuery('');
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    title="Clear all active filters"
                  >
                    <X className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Students Table & Mobile Card List */}
            {/* Mobile View: Clean Card List */}
            <div className="block sm:hidden divide-y divide-[#F0F5FA]">
              {filteredRecords.map((record) => {
                const topTheme = record.insightReport.cards[0]?.heading || 'In Progress';

                return (
                  <div key={record.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-[#062B50] break-words">
                          {record.fullName}
                        </div>
                        <div className="text-xs text-[#64778C] flex items-center gap-1.5 mt-0.5">
                          <span className="font-semibold text-[#0866C6] bg-[#E8F3FF] px-2 py-0.5 rounded-md">
                            {record.classGrade}
                          </span>
                          <span>·</span>
                          <span>{record.phone}</span>
                        </div>
                      </div>

                      {record.isSubmitted ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Done</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full shrink-0">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>In Progress</span>
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-[#465B72] bg-[#F8FAFD] p-2.5 rounded-xl border border-[#E8F3FF] space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#64778C]">School:</span>
                        <span className="font-semibold text-[#062B50] break-words text-right max-w-[200px]">
                          {record.schoolName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#E8F3FF]/60">
                        <span className="text-[#64778C]">Reflected Theme:</span>
                        <span className="font-semibold text-[#0866C6] truncate max-w-[180px]">
                          {topTheme}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#E8F3FF]/60">
                        <span className="text-[#64778C]">Questions Answered:</span>
                        <span className="font-bold text-[#062B50]">
                          {record.answeredCount} / {record.totalQuestions}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedStudent(record)}
                      className="w-full min-h-[40px] rounded-xl bg-[#0866C6] text-white font-bold text-xs hover:bg-[#062B50] transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Responses & Insights</span>
                    </button>
                  </div>
                );
              })}

              {studentRecords.length === 0 ? (
                <div className="py-12 px-4 text-center text-xs text-[#64778C] space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-[#E8F3FF] text-[#0866C6] flex items-center justify-center mx-auto mb-2">
                    <Users className="w-5 h-5" />
                  </div>
                  <p className="font-bold text-sm text-[#062B50]">No Student Submissions in Firestore Yet</p>
                  <p className="max-w-md mx-auto leading-relaxed">There are currently no student records in Cloud Firestore. As students register and complete assessments, their profiles will appear here.</p>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="py-10 px-4 text-center text-xs text-[#64778C] space-y-2">
                  <p>No student records found matching the current filters.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSchoolFilter('all');
                      setClassFilter('all');
                      setSearchQuery('');
                    }}
                    className="text-xs font-bold text-[#0866C6] hover:underline cursor-pointer"
                  >
                    Reset all filters
                  </button>
                </div>
              ) : null}
            </div>

            {/* Desktop View: Full Data Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFD] text-[#64778C] font-bold border-b border-[#E8F3FF]">
                  <tr>
                    <th className="py-3.5 px-6">Student Name</th>
                    <th className="py-3.5 px-4">Grade</th>
                    <th className="py-3.5 px-4">School</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Answered</th>
                    <th className="py-3.5 px-4">Top Reflected Theme</th>
                    <th className="py-3.5 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F5FA]">
                  {filteredRecords.map((record) => {
                    const topTheme = record.insightReport.cards[0]?.heading || 'In Progress';

                    return (
                      <tr key={record.id} className="hover:bg-[#F8FAFD] transition-colors">
                        <td className="py-3.5 px-6">
                          <div className="font-bold text-[#062B50]">{record.fullName}</div>
                          <div className="text-[11px] text-[#64778C]">{record.phone}</div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-[#062B50]">
                          {record.classGrade}
                        </td>
                        <td className="py-3.5 px-4 text-[#64778C] truncate max-w-xs">
                          {record.schoolName}
                        </td>
                        <td className="py-3.5 px-4">
                          {record.isSubmitted ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Completed</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>In Progress</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-[#062B50]">
                          {record.answeredCount} / {record.totalQuestions}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-[11px] font-medium text-[#0866C6] bg-[#E8F3FF] px-2 py-0.5 rounded-md">
                            {topTheme}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedStudent(record)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0866C6] text-white font-bold text-xs hover:bg-[#062B50] transition-colors shadow-xs cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Insights</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {studentRecords.length === 0 ? (
                <div className="py-16 text-center text-xs text-[#64778C] space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-[#E8F3FF] text-[#0866C6] flex items-center justify-center mx-auto mb-2">
                    <Users className="w-5 h-5" />
                  </div>
                  <p className="font-bold text-sm text-[#062B50]">No Student Records in Cloud Firestore Yet</p>
                  <p className="max-w-md mx-auto leading-relaxed">There are currently no student records in Cloud Firestore. As students register and complete assessments, their profiles will appear here.</p>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#64778C] space-y-2">
                  <p>No student records found matching the current filters.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSchoolFilter('all');
                      setClassFilter('all');
                      setSearchQuery('');
                    }}
                    className="text-xs font-bold text-[#0866C6] hover:underline cursor-pointer"
                  >
                    Reset all filters
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* TAB 3: QUESTION BANK REVIEW */}
        {activeTab === 'questions' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-white p-5 rounded-3xl border border-[#E8F3FF] shadow-xs flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#062B50]">
                  Locked Question Bank (Classes 8–10)
                </h3>
                <p className="text-xs text-[#64778C] mt-0.5">
                  14 standardized, non-evaluative self-reflection questions.
                </p>
              </div>
              <span className="text-xs font-bold text-[#0866C6] bg-[#E8F3FF] px-3 py-1 rounded-full">
                Version 1.0 (Locked)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {QUESTION_BANK.map((q) => (
                <div key={q.id} className="bg-white p-5 rounded-2xl border border-[#E8F3FF] text-left">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0866C6]">
                      Question {q.number} · ID {q.id}
                    </span>
                    <span className="text-[11px] text-[#64778C] font-semibold">
                      {q.type === 'single' ? 'Single Choice' : 'Multi-Select'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#062B50] mb-1.5">
                    {q.title}
                  </h4>
                  <p className="text-xs text-[#465B72] bg-[#F8FAFD] p-2.5 rounded-xl border border-[#E8F3FF] mb-3 leading-relaxed">
                    {q.prompt}
                  </p>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#64778C] uppercase tracking-wider block">
                      Options ({q.options.length}):
                    </span>
                    <div className="space-y-1">
                      {q.options.slice(0, 4).map((opt) => (
                        <div key={opt.id} className="text-[11px] text-[#062B50] flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-[#0866C6]" />
                          <span className="truncate">{opt.text}</span>
                        </div>
                      ))}
                      {q.options.length > 4 && (
                        <span className="text-[10px] text-[#64778C] italic block">
                          +{q.options.length - 4} more choices...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Admin Dashboard Legal Footer */}
      <footer className="border-t border-[#E8F3FF] bg-white py-4 px-4 sm:px-8 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-[#64778C] gap-3">
          <span>DeRote Student Insight System · Authorized Admin Dashboard</span>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('/consent')}
              className="hover:underline text-[#0866C6] cursor-pointer"
            >
              Consent Notice
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => onNavigate('/privacy')}
              className="hover:underline text-[#0866C6] cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => onNavigate('/terms')}
              className="hover:underline text-[#0866C6] cursor-pointer"
            >
              Terms of Use
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => onNavigate('/contact-privacy')}
              className="hover:underline text-[#0866C6] cursor-pointer"
            >
              Privacy Requests
            </button>
          </div>
        </div>
      </footer>

      {/* STUDENT DETAIL MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <div
            className="fixed inset-0 bg-[#062B50]/50 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedStudent(null)}
          />

          <div className="relative w-full max-w-3xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-[#E8F3FF] flex flex-col z-10 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-[#F0F5FA] flex items-start justify-between gap-3 bg-[#FAFCFF]">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider uppercase text-[#0866C6] block mb-1">
                  Student Submission Inspection
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-[#062B50] break-words">
                  {selectedStudent.fullName}
                </h2>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1 text-xs text-[#64778C]">
                  <span className="font-semibold text-[#0866C6]">{selectedStudent.classGrade}</span>
                  <span>·</span>
                  <span className="break-words">{selectedStudent.schoolName}</span>
                  <span>·</span>
                  <span className="font-semibold text-emerald-600 whitespace-nowrap">
                    {selectedStudent.answeredCount} / {selectedStudent.totalQuestions} Answered
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 sm:p-2 rounded-xl text-[#64778C] hover:text-[#062B50] hover:bg-[#F4F8FD] transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6">
              {/* Generated Insight Cards for Student */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#64778C] mb-3">
                  Reflected Student Themes ({selectedStudent.insightReport.cards.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedStudent.insightReport.cards.map((card) => (
                    <div
                      key={card.id}
                      className="p-4 rounded-2xl bg-[#F8FAFD] border border-[#E8F3FF]"
                    >
                      <h4 className="text-xs font-bold text-[#062B50] mb-1">
                        {card.heading}
                      </h4>
                      <p className="text-xs text-[#465B72] leading-relaxed mb-2">
                        {card.reflectionText}
                      </p>
                      <span className="text-[10px] text-[#0866C6] font-semibold block">
                        Traceable: {card.evidence.map((e) => `Q${e.questionNumber}`).join(', ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Exact Answers to All Questions */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#64778C] mb-3">
                  Original Submitted Responses (Traceable)
                </h3>
                <div className="space-y-3">
                  {QUESTION_BANK.map((question) => {
                    const ans = selectedStudent.session.answers[question.id];
                    const selectedIds = ans?.selectedOptions || [];
                    const customText = ans?.customText || '';

                    return (
                      <div
                        key={question.id}
                        className="p-3.5 rounded-xl border border-[#E8F3FF] bg-white text-xs"
                      >
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-bold text-[#0866C6]">
                            Q{question.number} ({question.id}): {question.title}
                          </span>
                          <span className="text-[#64778C]">
                            {selectedIds.length > 0 ? 'Answered' : 'Skipped'}
                          </span>
                        </div>

                        {selectedIds.length > 0 ? (
                          <div className="space-y-1 mt-1.5">
                            {selectedIds.map((optId) => {
                              if (optId === CUSTOM_OPTION_ID) {
                                return (
                                  <div
                                    key={optId}
                                    className="p-1.5 rounded-lg bg-[#F4F8FD] text-[#062B50] font-medium"
                                  >
                                    ✍️ <em>Self-written:</em> {customText}
                                  </div>
                                );
                              }
                              const opt = question.options.find((o) => o.id === optId);
                              return (
                                <div
                                  key={optId}
                                  className="p-1.5 rounded-lg bg-[#F4F8FD] text-[#062B50] font-medium"
                                >
                                  • {opt ? opt.text : optId}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-[#64778C] italic text-[11px]">
                            No option selected
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-[#F0F5FA] bg-[#FAFCFF] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handlePrintStudent(selectedStudent)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-[#D5E9FF] text-[#062B50] hover:text-[#0866C6] font-bold text-xs hover:bg-[#F8FAFD] transition-colors shadow-xs cursor-pointer"
                title="Print or export this student's insight report"
              >
                <Printer className="w-3.5 h-3.5 text-[#0866C6]" />
                <span>Print Student Report</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#0866C6] text-white font-bold text-xs hover:bg-[#062B50] transition-colors cursor-pointer text-center"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT REPORT MODAL */}
      <PrintReportModal
        isOpen={printModalConfig.isOpen}
        onClose={() => setPrintModalConfig((prev) => ({ ...prev, isOpen: false }))}
        title={printModalConfig.title}
        subtitle={printModalConfig.subtitle}
        htmlContent={printModalConfig.htmlContent}
        plainTextSummary={printModalConfig.plainTextSummary}
        fileName={printModalConfig.fileName}
        onDownloadPdf={printModalConfig.onDownloadPdf}
      />
    </div>
  );
}
