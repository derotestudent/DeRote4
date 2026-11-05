/**
 * Print Utility for DeRote Student Insight System
 *
 * Sets document title to the meaningful report title for native print & "Save as PDF" filename,
 * triggers browser print dialog synchronously directly within user interaction event handler,
 * and restores document title after print completion.
 */

export function executePrint(reportTitle: string): void {
  if (typeof window === 'undefined') return;

  const originalTitle = document.title || 'DeRote — Student Insight System';

  try {
    // 1. Immediately update document title so the browser print dialog uses this exact name for PDF / header
    document.title = reportTitle;

    // 2. Bring window / iframe into active focus
    window.focus();

    // 3. Immediately trigger browser native print synchronously to preserve user activation
    window.print();
  } catch (err) {
    console.error('Failed to trigger window.print():', err);
  } finally {
    // 4. Restore document title cleanly after print dialog is closed or after a safe delay
    let restored = false;
    const restore = () => {
      if (!restored) {
        restored = true;
        document.title = originalTitle;
        window.removeEventListener('afterprint', restore);
      }
    };

    window.addEventListener('afterprint', restore);
    // Safe timeout fallback in case afterprint is not supported or not triggered in certain environments
    setTimeout(restore, 10000);
  }
}
