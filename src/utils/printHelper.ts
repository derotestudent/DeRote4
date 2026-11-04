/**
 * Print Utility for DeRote Student Insight System
 *
 * Sets document title to the meaningful report title for native print & "Save as PDF" filename,
 * triggers browser print dialog, and cleanly restores document title after dialog closes.
 */

let originalTitleCache: string | null = null;

export function executePrint(reportTitle: string): void {
  if (typeof window === 'undefined') return;

  // Cache the original document title if not already cached
  if (!originalTitleCache) {
    originalTitleCache = document.title || 'DeRote — Student Insight System';
  }

  // Set the document title to the exact uppercase report title
  document.title = reportTitle;

  // Use requestAnimationFrame and small timeout so browser has painted the title
  window.requestAnimationFrame(() => {
    setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.error('Failed to trigger window.print():', err);
      } finally {
        const restore = () => {
          if (originalTitleCache) {
            document.title = originalTitleCache;
          }
          window.removeEventListener('afterprint', restore);
        };

        window.addEventListener('afterprint', restore);
        // Fallback restore in case afterprint does not fire in all environments
        setTimeout(restore, 1200);
      }
    }, 60);
  });
}
