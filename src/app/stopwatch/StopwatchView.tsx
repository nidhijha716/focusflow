"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Stopwatch } from "@/components/stopwatch/Stopwatch";

/**
 * Client half of `/stopwatch` (kept separate from `page.tsx` only so that
 * file can stay a Server Component exporting `metadata`). Mirrors the
 * lightweight header pattern `presets/[preset]/PresetTimerView.tsx` uses --
 * brand + a link back to the full app -- rather than duplicating the home
 * page's Tasks/Settings dialog wiring for a page whose only job is the
 * standalone stopwatch (doc 05_Frontend_Specification.pdf section 4:
 * "Independent").
 */
export function StopwatchView() {
  return (
    <AppShell
      header={
        <>
          <Link href="/" className="text-xl font-bold tracking-tight sm:text-2xl">
            Pomodoro
          </Link>
          <Link
            href="/"
            className="control rounded-pill border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
          >
            Open full app
          </Link>
        </>
      }
    >
      <section className="flex flex-1 flex-col items-center justify-center gap-6 py-10 sm:py-16">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Stopwatch</h1>
          <p className="max-w-sm text-sm text-text-secondary">
            An independent elapsed-time clock -- start, pause, resume and reset. It runs on its own and never
            affects the Pomodoro timer or your stats.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface-soft px-6 py-5">
          <Stopwatch />
        </div>
      </section>
    </AppShell>
  );
}
