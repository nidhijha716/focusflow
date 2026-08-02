import { TrophyIcon } from "@/components/ui/icons";
import { toProgressPercent } from "@/lib/format";

export interface ChallengeCardProps {
  title?: string;
  /** Progress/target/reward are plain display props, not fields on `@/types/challenge.ts` -- see that file's docstring: the record shape only guarantees `id`/`date`/`completed` today, so this component doesn't invent unconfirmed challenge/reward business rules onto it. */
  progress?: number;
  target?: number;
  rewardLabel?: string;
  completed?: boolean;
}

/**
 * `ChallengeCard` -- daily target/progress/reward (doc
 * 05_Frontend_Specification.pdf section 4). Rendered as one slim module
 * below the timer fold, not a hero card -- doc 08 section 13: "Challenges
 * and secondary information should not create a dashboard-like wall of
 * cards."
 *
 * `progress`/`target`/`completed` are supplied by `app/page.tsx` from the
 * real `dailyStats.focusSessions` count and
 * `services/challenge.service.ts`'s `DAILY_CHALLENGE_TARGET_FOCUS_SESSIONS`
 * (Phase 4 wiring) -- completing the target persists a `Challenge` row and
 * grants a streak-freeze reward via `evaluateDailyChallenge`, called from
 * `services/session.service.ts` on every completed focus session.
 */
export function ChallengeCard({
  title = "Complete 4 focus sessions today",
  progress = 0,
  target = 4,
  rewardLabel = "Streak freeze",
  completed = false,
}: ChallengeCardProps) {
  const percent = toProgressPercent(target - Math.min(progress, target), target);

  return (
    <div className="flex w-full items-center gap-4 rounded-lg border border-border bg-surface-soft px-4 py-3">
      <TrophyIcon className={completed ? "size-6 text-success" : "size-6 text-text-secondary"} />
      <div className="flex-1">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <div className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-pill bg-border" aria-hidden="true">
          <div className="h-full rounded-pill bg-success" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold tabular-nums text-text-primary">
          {Math.min(progress, target)}/{target}
        </p>
        <p className="text-xs text-text-secondary">{completed ? "Reward unlocked" : rewardLabel}</p>
      </div>
    </div>
  );
}
