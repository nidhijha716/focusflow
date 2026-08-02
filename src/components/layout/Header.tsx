"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { SettingsIcon, TasksIcon } from "@/components/ui/icons";

export interface HeaderProps {
  /** Streak display slot -- StreakIndicator (compact) is passed in from app/page.tsx; kept generic so Header never imports the streak feature directly. */
  streakSlot?: ReactNode;
  onOpenTasks: () => void;
  onOpenSettings: () => void;
}

/**
 * `header: brand | streak | settings` -- doc 05_Frontend_Specification.pdf
 * section 2. The brand text is intentionally the boldest/largest thing in
 * the header (bigger weight/tracking than the utility buttons) so it reads
 * as the top of the timer-first hero rather than a small dashboard logo,
 * while the header itself still stays inside the ~56-64px mobile height
 * budget from doc 08 section 8.
 *
 * Kept consistent with the current `<title>` in app/layout.tsx ("Pomodoro")
 * rather than the internal `focusflow` IndexedDB/window-global naming (see
 * db/schema.ts, providers/TimerProvider.tsx) -- that name is an
 * implementation detail, not the confirmed user-facing brand.
 */
export function Header({ streakSlot, onOpenTasks, onOpenSettings }: HeaderProps) {
  return (
    <>
      <span className="text-xl font-bold tracking-tight sm:text-2xl">Pomodoro</span>

      <div className="flex items-center gap-2 sm:gap-3">
        {streakSlot}

        <Button variant="ghost" size="sm" onClick={onOpenTasks} aria-label="Open tasks">
          <TasksIcon className="size-5" />
          <span className="hidden sm:inline">Tasks</span>
        </Button>

        <Button variant="ghost" size="sm" onClick={onOpenSettings} aria-label="Open settings">
          <SettingsIcon className="size-5" />
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </div>
    </>
  );
}
