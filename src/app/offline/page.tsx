import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "You're offline",
  robots: { index: false, follow: false },
};

/**
 * Offline fallback shell (POM-034). `public/sw.js` serves this precached
 * page for any navigation that both the network and the runtime cache miss
 * -- i.e. the very first visit to a route that was never opened before
 * going offline. Once the real app shell (`/`) has been visited online at
 * least once, the service worker's cache-first static assets + this page's
 * own network-first-with-cache-fallback strategy mean the timer/tasks/
 * settings routes themselves are served from cache and this page is rarely
 * seen again -- it exists purely as a safety net.
 */
export default function OfflinePage() {
  return (
    <main id="main-content" className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-6 text-center text-text-primary">
      <p className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Offline</p>
      <h1 className="text-2xl font-bold sm:text-3xl">You&apos;re not connected</h1>
      <p className="max-w-sm text-sm text-text-secondary">
        This page hasn&apos;t been cached for offline use yet. If you&apos;ve opened the timer before while
        online, go back and it should still work -- your tasks, settings and stats are all stored on this
        device already.
      </p>
      <Link
        href="/"
        className="control mt-2 inline-flex items-center justify-center rounded-pill bg-focus px-6 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        Back to timer
      </Link>
    </main>
  );
}
