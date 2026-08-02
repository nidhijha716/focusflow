/**
 * "Skip to main content" link -- doc 07_Verification_and_Validation.pdf
 * VAL-030 ("All core controls reachable/operable with visible focus") and
 * the standard WCAG 2.4.1 bypass-blocks requirement. Visually hidden until
 * keyboard-focused, then pinned to the top of the viewport so a keyboard
 * user never has to tab through the header's Tasks/Settings buttons just
 * to reach the timer.
 *
 * Targets `#main-content`, the id `AppShell`'s `<main>` renders on every
 * page (see components/layout/AppShell.tsx).
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-focus focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:font-semibold focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      Skip to main content
    </a>
  );
}
