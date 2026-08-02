import { FlameIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { defaultStreak, type Streak } from "@/types/streak";

export interface StreakIndicatorProps {
  streak?: Streak;
  /** Icon + number only, for the header's streak slot. */
  compact?: boolean;
}

/**
 * `StreakIndicator` -- current streak/freeze status (doc
 * 05_Frontend_Specification.pdf section 4). The flame icon is a
 * supplementary cue, never the only signal -- the streak count and freeze
 * status are always spelled out in text too (doc 08 section 20: "Do not
 * rely only on color to communicate state").
 *
 * Reads the real `Streak` record shape (`@/types/streak.ts`, IndexedDB
 * `streak` singleton row) as a prop -- `app/page.tsx` supplies it from
 * `stores/stats.store.ts`, which reads the `streak` repository (Phase 4
 * wiring). Defaults to `defaultStreak()` (the documented first-run value)
 * so a not-yet-loaded state never shows a fabricated streak.
 */
export function StreakIndicator({ streak = defaultStreak(), compact = false }: StreakIndicatorProps) {
  if (compact) {
    return (
      <span
        className="control inline-flex items-center gap-1 rounded-pill bg-surface-soft px-3 text-sm font-semibold text-text-primary"
        title={streak.freezeAvailable ? "Streak freeze available" : "No streak freeze available"}
      >
        <FlameIcon className={cn("size-4", streak.currentStreak > 0 ? "text-warning" : "text-text-secondary")} />
        <span aria-label={`${streak.currentStreak} day streak`}>{streak.currentStreak}</span>
      </span>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg bg-surface-soft px-4 py-3">
      <FlameIcon className={cn("size-6", streak.currentStreak > 0 ? "text-warning" : "text-text-secondary")} />
      <div>
        <p className="text-sm font-semibold text-text-primary">
          {streak.currentStreak} day{streak.currentStreak === 1 ? "" : "s"} streak
        </p>
        <p className="text-xs text-text-secondary">
          {`Longest: ${streak.longestStreak} \u00b7 ${streak.freezeAvailable ? "Freeze available" : "No freeze available"}`}
        </p>
      </div>
    </div>
  );
}
