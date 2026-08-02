"use client";

import Link from "next/link";
import { TimerHero } from "@/components/timer/TimerHero";
import { usePresetFocusDuration } from "@/hooks/usePresetFocusDuration";
import type { TimerPresetDefinition } from "@/constants/presets.constants";

export interface PresetTimerViewProps {
  preset: TimerPresetDefinition;
}

/**
 * Client half of the preset route (server half: `page.tsx`, which owns
 * `generateStaticParams`/`generateMetadata` -- Server Components can't call
 * hooks). Sets the intended focus duration for this tab
 * (`usePresetFocusDuration`) and renders the same live `TimerHero` the home
 * page uses, plus a short unique intro paragraph per doc 07's SEO content
 * requirement.
 */
export function PresetTimerView({ preset }: PresetTimerViewProps) {
  usePresetFocusDuration(preset.minutes);

  return (
    <div className="flex flex-1 flex-col items-center gap-10 py-10 sm:py-16">
      <header className="flex w-full max-w-md items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight sm:text-xl">
          Pomodoro
        </Link>
        <Link
          href="/"
          className="control rounded-pill border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
        >
          Open full app
        </Link>
      </header>

      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{preset.title}</h1>
        <p className="max-w-md text-sm text-text-secondary">{preset.intro}</p>
      </div>

      <TimerHero />

      <p className="max-w-md text-center text-xs text-text-secondary">
        Tasks, streaks, statistics and settings live in the{" "}
        <Link href="/" className="font-medium underline">
          full app
        </Link>
        . Everything here runs the same local-first timer engine -- no account, no tracking.
      </p>
    </div>
  );
}
