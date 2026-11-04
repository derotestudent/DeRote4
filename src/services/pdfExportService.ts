/**
 * PDF Generation Service for DeRote Student Insight System
 *
 * Generates official, vector-crisp, searchable PDF reports using jsPDF.
 * Operates 100% client-side with zero iframe restrictions or popups.
 */

import { jsPDF } from 'jspdf';
import { CohortAnalytics, StudentAdminRecord, AdminAccount } from './adminService';
import { StudentInsightReport } from './insightEngine';

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_LEFT = 15;
const MARGIN_RIGHT = 15;
const MARGIN_TOP = 15;
const MARGIN_BOTTOM = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 180mm

// Color palette
const COLOR_PRIMARY = [8, 102, 198]; // #0866C6
const COLOR_NAVY = [6, 43, 80]; // #062B50
const COLOR_MUTED = [100, 119, 140]; // #64778C
const COLOR_DARK = [16, 44, 70]; // #102C46
const COLOR_CARD_BG = [248, 250, 253]; // #F8FAFD
const COLOR_CARD_BORDER = [213, 233, 255]; // #D5E9FF
const COLOR_SUCCESS = [5, 150, 105]; // #059669
const COLOR_AMBER = [217, 119, 6]; // #D97706

function checkPageBreak(doc: jsPDF, currentY: number, neededHeight: number): number {
  if (currentY + neededHeight > PAGE_HEIGHT - MARGIN_BOTTOM) {
    doc.addPage();
    return MARGIN_TOP + 5;
  }
  return currentY;
}

function drawHeaderBar(doc: jsPDF, y: number): void {
  doc.setFillColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.rect(MARGIN_LEFT, y, CONTENT_WIDTH, 2.5, 'F');
}

function drawFooter(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    doc.text(
      `DeRote Student Insight System · Reflective Guidance Documentation · Page ${i} of ${pageCount}`,
      PAGE_WIDTH / 2,
      PAGE_HEIGHT - 10,
      { align: 'center' }
    );
  }
}

/**
 * Exports Cohort Overview PDF
 */
export function exportCohortReportPdf(
  analytics: CohortAnalytics,
  studentRecords: StudentAdminRecord[],
  admin: AdminAccount | null,
  fileName: string = 'derote-cohort-report'
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const institution = admin?.institution || 'DeRote Partner School Network';
  const adminName = admin?.fullName || 'Admin';
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  let y = MARGIN_TOP;

  // Top color accent bar
  drawHeaderBar(doc, y);
  y += 7;

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.text('DeRote — Cohort Insight & Learning Environment Summary', MARGIN_LEFT, y);
  y += 5;

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.text(`${institution} · Classes 8, 9, & 10 Cohort`, MARGIN_LEFT, y);

  // Admin and Date on the right
  doc.setFontSize(9);
  doc.text(`Admin: ${adminName}`, PAGE_WIDTH - MARGIN_RIGHT, y - 5, { align: 'right' });
  doc.text(`Generated: ${dateStr}`, PAGE_WIDTH - MARGIN_RIGHT, y, { align: 'right' });
  y += 8;

  // Divider line
  doc.setDrawColor(COLOR_CARD_BORDER[0], COLOR_CARD_BORDER[1], COLOR_CARD_BORDER[2]);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  y += 6;

  // --- STATS HIGHLIGHT TILES (4 columns) ---
  const tileWidth = (CONTENT_WIDTH - 9) / 4;
  const tileHeight = 18;

  const stats = [
    { label: 'TOTAL STUDENTS', value: `${analytics.totalStudents}`, sub: 'Enrolled cohort' },
    { label: 'COMPLETED', value: `${analytics.completedAssessments}`, sub: `${analytics.completionRate}% completion` },
    { label: 'IN PROGRESS', value: `${analytics.inProgressAssessments}`, sub: 'In-progress' },
    {
      label: 'CLASSES 8, 9, 10',
      value: `${analytics.classBreakdown.class8} / ${analytics.classBreakdown.class9} / ${analytics.classBreakdown.class10}`,
      sub: 'Grade distribution',
    },
  ];

  stats.forEach((s, idx) => {
    const tx = MARGIN_LEFT + idx * (tileWidth + 3);
    doc.setFillColor(COLOR_CARD_BG[0], COLOR_CARD_BG[1], COLOR_CARD_BG[2]);
    doc.setDrawColor(COLOR_CARD_BORDER[0], COLOR_CARD_BORDER[1], COLOR_CARD_BORDER[2]);
    doc.roundedRect(tx, y, tileWidth, tileHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
    doc.text(s.value, tx + tileWidth / 2, y + 7, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
    doc.text(s.label, tx + tileWidth / 2, y + 12, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    doc.text(s.sub, tx + tileWidth / 2, y + 15.5, { align: 'center' });
  });

  y += tileHeight + 8;

  // --- TOP INTEREST DRIVERS SECTION ---
  y = checkPageBreak(doc, y, 35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.text('Top Project Activities That Catch Interest (Question B2)', MARGIN_LEFT, y);
  y += 4;

  const colWidth = (CONTENT_WIDTH - 4) / 2;
  analytics.topDrawsInActivities.forEach((item, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const itemX = MARGIN_LEFT + col * (colWidth + 4);
    const itemY = y + row * 8;

    doc.setFillColor(COLOR_CARD_BG[0], COLOR_CARD_BG[1], COLOR_CARD_BG[2]);
    doc.roundedRect(itemX, itemY, colWidth, 6.5, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
    doc.text(`• ${item.label}`, itemX + 3, itemY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
    doc.text(`${item.percentage}% (${item.count})`, itemX + colWidth - 3, itemY + 4.5, { align: 'right' });
  });

  y += Math.ceil(analytics.topDrawsInActivities.length / 2) * 8 + 6;

  // --- STARTER CONDITIONS SECTION ---
  y = checkPageBreak(doc, y, 35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.text('What Helps Students Get Started (Question B11)', MARGIN_LEFT, y);
  y += 4;

  analytics.topStarterConditions.forEach((item, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const itemX = MARGIN_LEFT + col * (colWidth + 4);
    const itemY = y + row * 8;

    doc.setFillColor(COLOR_CARD_BG[0], COLOR_CARD_BG[1], COLOR_CARD_BG[2]);
    doc.roundedRect(itemX, itemY, colWidth, 6.5, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
    doc.text(`• ${item.label}`, itemX + 3, itemY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
    doc.text(`${item.percentage}% (${item.count})`, itemX + colWidth - 3, itemY + 4.5, { align: 'right' });
  });

  y += Math.ceil(analytics.topStarterConditions.length / 2) * 8 + 6;

  // --- STUDENT SUBMISSIONS ROSTER TABLE ---
  y = checkPageBreak(doc, y, 40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.text(`Student Submissions Roster (${studentRecords.length} Students)`, MARGIN_LEFT, y);
  y += 4;

  // Table header
  doc.setFillColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.rect(MARGIN_LEFT, y, CONTENT_WIDTH, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Student Name', MARGIN_LEFT + 3, y + 4.2);
  doc.text('Grade', MARGIN_LEFT + 45, y + 4.2);
  doc.text('Status', MARGIN_LEFT + 70, y + 4.2);
  doc.text('Answered', MARGIN_LEFT + 98, y + 4.2);
  doc.text('Primary Reflected Focus Theme', MARGIN_LEFT + 125, y + 4.2);
  y += 6;

  // Table rows
  studentRecords.forEach((s, idx) => {
    y = checkPageBreak(doc, y, 7);

    const isEven = idx % 2 === 0;
    if (isEven) {
      doc.setFillColor(250, 252, 255);
      doc.rect(MARGIN_LEFT, y, CONTENT_WIDTH, 6, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
    doc.text(s.fullName, MARGIN_LEFT + 3, y + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
    doc.text(s.classGrade, MARGIN_LEFT + 45, y + 4.2);

    if (s.isSubmitted) {
      doc.setTextColor(COLOR_SUCCESS[0], COLOR_SUCCESS[1], COLOR_SUCCESS[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('Completed', MARGIN_LEFT + 70, y + 4.2);
    } else {
      doc.setTextColor(COLOR_AMBER[0], COLOR_AMBER[1], COLOR_AMBER[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('In Progress', MARGIN_LEFT + 70, y + 4.2);
    }

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
    doc.text(`${s.answeredCount} / ${s.totalQuestions}`, MARGIN_LEFT + 98, y + 4.2);

    const topTheme = s.insightReport.cards[0]?.heading || 'In Progress';
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
    doc.text(topTheme, MARGIN_LEFT + 125, y + 4.2);

    y += 6;
  });

  // Footer notes & page numbering
  drawFooter(doc);

  // Trigger browser download of PDF
  doc.save(`${fileName}.pdf`);
}

/**
 * Exports Individual Student Insight Report PDF
 */
export function exportStudentReportPdf(
  report: StudentInsightReport,
  schoolName: string = 'DeRote Partner School',
  fileName?: string
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const saveName =
    fileName ||
    `derote-student-${report.studentName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}`;

  const dateStr = report.submittedAt
    ? new Date(report.submittedAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

  let y = MARGIN_TOP;

  // Top color accent bar
  drawHeaderBar(doc, y);
  y += 7;

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.text('DeRote — Student Reflective Insight Snapshot', MARGIN_LEFT, y);
  y += 5.5;

  // Student Identity & Class
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.text(`${report.studentName} · ${report.classGrade}`, MARGIN_LEFT, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.text(schoolName, MARGIN_LEFT, y + 4.5);

  // Right-side meta info
  doc.text(`Submitted: ${dateStr}`, PAGE_WIDTH - MARGIN_RIGHT, y, { align: 'right' });
  doc.text(`Questions Answered: ${report.totalAnswered} / 14`, PAGE_WIDTH - MARGIN_RIGHT, y + 4.5, { align: 'right' });

  y += 11;

  // Divider line
  doc.setDrawColor(COLOR_CARD_BORDER[0], COLOR_CARD_BORDER[1], COLOR_CARD_BORDER[2]);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
  y += 7;

  // Insight Framing Headline
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.text('YOUR INSIGHT', MARGIN_LEFT, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.text('A little more about you.', MARGIN_LEFT, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  const introLines = doc.splitTextToSize(
    'Your answers offer a glimpse of what matters to you and how you approach different situations. They reflect stated choices without personality labels or numerical ranking.',
    CONTENT_WIDTH
  );
  doc.text(introLines, MARGIN_LEFT, y);
  y += introLines.length * 4.5 + 4;

  // --- INSIGHT CARDS (3-4 cards) ---
  report.cards.forEach((card) => {
    // Estimate card height
    const headingHeight = 6;
    const bodyLines = doc.splitTextToSize(card.reflectionText, CONTENT_WIDTH - 12);
    const bodyHeight = bodyLines.length * 4.2;
    const evidenceText = `Traceable Evidence: ${card.evidence
      .map((e) => `Q${e.questionNumber} (${e.questionTitle}): ${e.selectedOptionTexts.join(' / ')}`)
      .join('; ')}`;
    const evidenceLines = doc.splitTextToSize(evidenceText, CONTENT_WIDTH - 12);
    const evidenceHeight = evidenceLines.length * 3.5;
    const totalCardHeight = headingHeight + bodyHeight + evidenceHeight + 10;

    y = checkPageBreak(doc, y, totalCardHeight + 4);

    // Card background
    doc.setFillColor(COLOR_CARD_BG[0], COLOR_CARD_BG[1], COLOR_CARD_BG[2]);
    doc.setDrawColor(COLOR_CARD_BORDER[0], COLOR_CARD_BORDER[1], COLOR_CARD_BORDER[2]);
    doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, totalCardHeight, 2.5, 2.5, 'FD');

    let innerY = y + 5;

    // Card heading
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
    doc.text(card.heading, MARGIN_LEFT + 6, innerY);
    innerY += 5;

    // Card reflection text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2]);
    doc.text(bodyLines, MARGIN_LEFT + 6, innerY);
    innerY += bodyLines.length * 4.2 + 2;

    // Evidence
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
    doc.text(evidenceLines, MARGIN_LEFT + 6, innerY);

    y += totalCardHeight + 5;
  });

  // Philosophical statement box at bottom
  y = checkPageBreak(doc, y, 16);
  doc.setFillColor(244, 248, 253);
  doc.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  const philText =
    'Philosophy: "Reflect, don\'t judge." Zero numerical scores, trait percentages, or personality archetypes. Designed to support pedagogical reflection and student self-awareness.';
  doc.text(doc.splitTextToSize(philText, CONTENT_WIDTH - 10), MARGIN_LEFT + 5, y + 5.5);

  drawFooter(doc);

  // Save PDF file
  doc.save(`${saveName}.pdf`);
}
