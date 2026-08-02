import { z } from "zod";
import { LocalDateSchema } from "./localDate";

/**
 * Daily statistics record — IndexedDB store `dailyStats` (focusflow DB).
 * Source: 03_Local_Data_Schema.pdf, section 6.
 */
export const DailyStatsSchema = z.object({
  date: LocalDateSchema,
  focusSessions: z.number().int().nonnegative(),
  shortBreaks: z.number().int().nonnegative(),
  longBreaks: z.number().int().nonnegative(),
  focusSeconds: z.number().nonnegative(),
  updatedAt: z.number(),
});

export type DailyStats = z.infer<typeof DailyStatsSchema>;

/** Zeroed stats for a date that has no record yet. */
export function emptyDailyStats(date: string): DailyStats {
  return {
    date,
    focusSessions: 0,
    shortBreaks: 0,
    longBreaks: 0,
    focusSeconds: 0,
    updatedAt: Date.now(),
  };
}
