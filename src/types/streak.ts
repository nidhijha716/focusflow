import { z } from "zod";
import { LocalDateSchema } from "./localDate";

/**
 * Streak record — IndexedDB store `streak` (focusflow DB), single row keyed
 * by the literal string `'singleton'`.
 * Source: 03_Local_Data_Schema.pdf, section 7.
 */
export const STREAK_SINGLETON_ID = "singleton" as const;

export const StreakSchema = z.object({
  id: z.literal(STREAK_SINGLETON_ID),
  currentStreak: z.number().int().nonnegative(),
  longestStreak: z.number().int().nonnegative(),
  lastActiveDate: LocalDateSchema.nullable(),
  freezeAvailable: z.boolean(),
  freezeUsedDate: LocalDateSchema.optional(),
  updatedAt: z.number(),
});

export type Streak = z.infer<typeof StreakSchema>;

/** Default streak state for a first-time user (no persisted row yet). */
export function defaultStreak(): Streak {
  return {
    id: STREAK_SINGLETON_ID,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    freezeAvailable: true,
    updatedAt: Date.now(),
  };
}
