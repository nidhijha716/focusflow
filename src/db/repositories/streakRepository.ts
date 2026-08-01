import type { FocusFlowDB } from "../schema";
import { localDateDiffInDays } from "@/types/localDate";
import {
  STREAK_SINGLETON_ID,
  StreakSchema,
  defaultStreak,
  type Streak,
} from "@/types/streak";

/**
 * Repository for the `streak` IndexedDB store (single row, key `'singleton'`).
 * Source: 03_Local_Data_Schema.pdf, section 7 + Data Integrity Rules
 * ("Date-based streak calculations use the user's local calendar date").
 */
function parseStreakOrThrow(record: unknown): Streak {
  const result = StreakSchema.safeParse(record);
  if (!result.success) {
    throw new Error(`Corrupt streak record: ${result.error.message}`);
  }
  return result.data;
}

export async function getStreak(db: FocusFlowDB): Promise<Streak> {
  const record = await db.get("streak", STREAK_SINGLETON_ID);
  if (!record) return defaultStreak();
  return parseStreakOrThrow(record);
}

/**
 * Records that the user was active on `activeLocalDate` (e.g. after a
 * completed focus session) and recomputes the streak accordingly:
 *  - Same day as last activity: no-op (idempotent for repeated calls within a day).
 *  - Exactly one day after: streak continues (+1).
 *  - More than one day after: streak resets to 1, unless a freeze is
 *    available and consumed to bridge exactly one missed day.
 *  - No prior activity: streak starts at 1.
 */
export async function recordStreakActivity(db: FocusFlowDB, activeLocalDate: string): Promise<Streak> {
  const current = await getStreak(db);

  if (current.lastActiveDate === activeLocalDate) {
    return current; // already recorded today; idempotent.
  }

  const now = Date.now();

  if (current.lastActiveDate === null) {
    const started: Streak = {
      ...current,
      currentStreak: 1,
      longestStreak: Math.max(1, current.longestStreak),
      lastActiveDate: activeLocalDate,
      updatedAt: now,
    };
    await db.put("streak", StreakSchema.parse(started));
    return started;
  }

  const gapDays = localDateDiffInDays(current.lastActiveDate, activeLocalDate);

  let nextStreak: number;
  let freezeAvailable = current.freezeAvailable;
  let freezeUsedDate = current.freezeUsedDate;

  if (gapDays <= 0) {
    // Activity for a date not after the last recorded one (e.g. clock skew); ignore.
    return current;
  } else if (gapDays === 1) {
    nextStreak = current.currentStreak + 1;
  } else if (gapDays === 2 && current.freezeAvailable) {
    // Bridge exactly one missed day using the streak freeze.
    nextStreak = current.currentStreak + 1;
    freezeAvailable = false;
    freezeUsedDate = activeLocalDate;
  } else {
    nextStreak = 1;
  }

  const updated: Streak = {
    ...current,
    currentStreak: nextStreak,
    longestStreak: Math.max(current.longestStreak, nextStreak),
    lastActiveDate: activeLocalDate,
    freezeAvailable,
    freezeUsedDate,
    updatedAt: now,
  };

  await db.put("streak", StreakSchema.parse(updated));
  return updated;
}

/** Restores the streak freeze (e.g. as a reward unlock) — does not affect the current streak count. */
export async function grantStreakFreeze(db: FocusFlowDB): Promise<Streak> {
  const current = await getStreak(db);
  const updated: Streak = { ...current, freezeAvailable: true, updatedAt: Date.now() };
  await db.put("streak", StreakSchema.parse(updated));
  return updated;
}
