import type { FocusFlowDB } from "../schema";
import type { NewSessionInput, Session } from "@/types/session";
import { emptyDailyStats } from "@/types/dailyStats";

/**
 * Idempotent session completion / cancellation.
 * Source: 03_Local_Data_Schema.pdf, Data Integrity Rules:
 *  - "Session completion must be idempotent by session ID."
 *  - "Only completed focus sessions increase task focus totals and daily
 *     focus statistics."
 *
 * Both writers run inside a single IndexedDB transaction across
 * `sessions` + `dailyStats` (+ `tasks` for focus sessions) so a session is
 * never recorded without its stats being updated, or vice versa.
 *
 * Idempotency strategy: if a session with this `id` already exists in the
 * `sessions` store, this is treated as a retried/duplicate completion call
 * and the existing record is returned unchanged — none of the side effects
 * (dailyStats increments, task directFocusSeconds increments) are re-applied.
 */
export async function completeFocusSession(
  db: FocusFlowDB,
  input: NewSessionInput,
  completedAt: number = Date.now(),
): Promise<Session> {
  const tx = db.transaction(["sessions", "dailyStats", "tasks"], "readwrite");
  const sessionsStore = tx.objectStore("sessions");

  const existing = await sessionsStore.get(input.id);
  if (existing) {
    await tx.done;
    return existing;
  }

  const session: Session = {
    ...input,
    status: "completed",
    completedAt,
  };
  await sessionsStore.put(session);

  const statsStore = tx.objectStore("dailyStats");
  const existingStats = await statsStore.get(session.localDate);
  const stats = existingStats ?? emptyDailyStats(session.localDate);

  if (session.type === "focus") {
    stats.focusSessions += 1;
    stats.focusSeconds += session.actualSeconds;
  } else if (session.type === "short_break") {
    stats.shortBreaks += 1;
  } else {
    stats.longBreaks += 1;
  }
  stats.updatedAt = completedAt;
  await statsStore.put(stats);

  if (session.type === "focus" && session.taskId) {
    const tasksStore = tx.objectStore("tasks");
    const task = await tasksStore.get(session.taskId);
    if (task) {
      task.directFocusSeconds += session.actualSeconds;
      task.updatedAt = completedAt;
      await tasksStore.put(task);
    }
  }

  await tx.done;
  return session;
}

/**
 * Records a cancelled session. Cancelled sessions never affect task totals
 * or daily statistics (per the integrity rule above). Idempotent by ID for
 * the same reason as `completeFocusSession`.
 */
export async function cancelSession(
  db: FocusFlowDB,
  input: NewSessionInput,
  cancelledAt: number = Date.now(),
): Promise<Session> {
  const existing = await db.get("sessions", input.id);
  if (existing) return existing;

  const session: Session = {
    ...input,
    status: "cancelled",
    completedAt: cancelledAt,
  };
  await db.put("sessions", session);
  return session;
}
