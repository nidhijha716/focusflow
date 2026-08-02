import { getChallenge, upsertChallenge } from "@/db/repositories/challengeRepository";
import { getDailyStats } from "@/db/repositories/dailyStatsRepository";
import { addReward } from "@/db/repositories/rewardRepository";
import { grantStreakFreeze } from "@/db/repositories/streakRepository";
import type { FocusFlowDB } from "@/db/schema";
import type { LocalDateString } from "@/types/localDate";

/**
 * Minimal daily-challenge engine (Phase 4 scope; see 06_Feature_Ticket_List.pdf
 * POM-024/POM-025). `03_Local_Data_Schema.pdf` only guarantees `id`/`date`/
 * `completed` on a challenge record (see src/types/challenge.ts), so the
 * "complete N focus sessions" rule and its reward live here rather than on
 * the record itself -- this matches the already-shipped
 * `components/challenge/ChallengeCard.tsx` default copy ("Complete 4 focus
 * sessions today").
 */
export const DAILY_CHALLENGE_TARGET_FOCUS_SESSIONS = 4;

/** `rewards.type` value for the reward granted on completing the daily challenge. */
export const STREAK_FREEZE_REWARD_TYPE = "streak_freeze";

export interface ChallengeService {
  isEnabled: () => boolean;
}

export const challengeService: ChallengeService = {
  isEnabled: () => true,
};

/**
 * Re-derives today's challenge progress from `dailyStats` (never cached --
 * "derive-on-read", matching the parent-focus-time rollup pattern in
 * src/db/integrity/taskRollup.ts) and, the first time the target is
 * reached for `date`, persists a completed `Challenge` row plus its reward
 * (a restored streak freeze -- `grantStreakFreeze`, and a `Reward` record so
 * the unlock has a durable history). Idempotent: once a date's challenge is
 * marked `completed`, later calls for the same date are no-ops even though
 * `dailyStats.focusSessions` keeps counting beyond the target.
 */
export async function evaluateDailyChallenge(db: FocusFlowDB, date: LocalDateString): Promise<boolean> {
  const stats = await getDailyStats(db, date);
  if (stats.focusSessions < DAILY_CHALLENGE_TARGET_FOCUS_SESSIONS) return false;

  const existing = await getChallenge(db, date);
  if (existing?.completed) return false;

  const now = Date.now();
  await upsertChallenge(db, {
    id: date,
    date,
    completed: true,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
  await grantStreakFreeze(db);
  await addReward(db, {
    id: crypto.randomUUID(),
    type: STREAK_FREEZE_REWARD_TYPE,
    unlockedAt: now,
    createdAt: now,
  });
  return true;
}
