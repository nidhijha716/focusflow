import { z } from "zod";

/**
 * Shared `YYYY-MM-DD` local-calendar-date type used by sessions, dailyStats
 * and streak records (03_Local_Data_Schema.pdf, Data Integrity Rules: "Date-based
 * streak calculations use the user's local calendar date").
 *
 * Kept in one place so every store agrees on the exact format and on how
 * "today" is computed, avoiding subtly-inconsistent date logic per repository.
 */
export const LocalDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD local date string");

export type LocalDateString = z.infer<typeof LocalDateSchema>;

/** Formats a Date using the *local* timezone (not UTC) as `YYYY-MM-DD`. */
export function toLocalDateString(date: Date): LocalDateString {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Local calendar date for "now", used as the default for new sessions/stats. */
export function todayLocalDateString(): LocalDateString {
  return toLocalDateString(new Date());
}

/** Number of whole calendar days between two local dates (b - a), DST-safe. */
export function localDateDiffInDays(a: LocalDateString, b: LocalDateString): number {
  const [aY, aM, aD] = a.split("-").map(Number);
  const [bY, bM, bD] = b.split("-").map(Number);
  const aUtc = Date.UTC(aY, aM - 1, aD);
  const bUtc = Date.UTC(bY, bM - 1, bD);
  return Math.round((bUtc - aUtc) / 86_400_000);
}
