import { getDb } from "@/db/client";
import { completeFocusSession } from "@/db/integrity/completeFocusSession";
import { recordStreakActivity } from "@/db/repositories/streakRepository";
import { evaluateDailyChallenge } from "@/services/challenge.service";
import { useStatsStore } from "@/stores/stats.store";
import { useTaskStore } from "@/stores/task.store";
import { todayLocalDateString } from "@/types/localDate";
import type { NewSessionInput } from "@/types/session";
import type { TimerSnapshot } from "@/types/timer.types";

/**
 * Persists the interval that just naturally finished (`previous` is the
 * pre-completion snapshot -- see hooks/useTimerEngine.ts's `justCompleted`
 * check, the same trigger already gating the completion alarm) into
 * IndexedDB via the idempotent `completeFocusSession` integrity writer.
 *
 * Called only by the elected leader tab, for the exact same reason the
 * alarm is leader-gated (02_Technical_Architecture, section 6): every open
 * tab's worker reaches the same deadline independently, so without gating
 * this would record one session per open tab.
 *
 * Skip/Reset never reach this function -- both dispatch their event
 * directly on `useTimerStore` rather than through the worker-message path
 * this is wired into, so only a full, uninterrupted interval is ever
 * recorded (matches the Data Integrity Rule "only completed focus sessions
 * increase task focus totals and daily statistics").
 */
export async function recordCompletedSession(previous: TimerSnapshot, completedAt: number): Promise<void> {
  try {
    const db = await getDb();
    const localDate = todayLocalDateString();
    const plannedSeconds = Math.round(previous.durationMs / 1000);
    const isFocus = previous.mode === "focus";

    const input: NewSessionInput = {
      id: crypto.randomUUID(),
      taskId: isFocus ? useTaskStore.getState().selectedTaskId : null,
      type: previous.mode,
      plannedSeconds,
      actualSeconds: plannedSeconds,
      startedAt: completedAt - previous.durationMs,
      localDate,
    };

    await completeFocusSession(db, input, completedAt);

    if (isFocus) {
      await recordStreakActivity(db, localDate);
      await evaluateDailyChallenge(db, localDate);
    }

    await useStatsStore.getState().refreshAll();
  } catch (error) {
    console.error("[session] Failed to record completed session:", error);
  }
}
