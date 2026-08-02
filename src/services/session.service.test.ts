import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeDb, getDb } from "@/db/client";
import { DB_NAME } from "@/db/schema";
import { getChallenge } from "@/db/repositories/challengeRepository";
import { listRewards } from "@/db/repositories/rewardRepository";
import { recordCompletedSession } from "@/services/session.service";
import { DAILY_CHALLENGE_TARGET_FOCUS_SESSIONS, STREAK_FREEZE_REWARD_TYPE } from "@/services/challenge.service";
import { useStatsStore } from "@/stores/stats.store";
import { useTaskStore } from "@/stores/task.store";
import { emptyDailyStats } from "@/types/dailyStats";
import { defaultStreak } from "@/types/streak";
import { todayLocalDateString } from "@/types/localDate";
import type { TimerSnapshot } from "@/types/timer.types";

/**
 * End-to-end proof for the ChallengeCard/StatsView/StreakIndicator wiring:
 * `recordCompletedSession` (the exact function `hooks/useTimerEngine.ts`
 * calls on a leader tab's COMPLETE) must, by itself and with no test-only
 * shortcuts, leave `useStatsStore` holding the freshly-incremented
 * `dailyStats`/`streak` -- the same store `app/page.tsx` subscribes to via
 * selectors. If this passes, a completed focus session in the real app is
 * guaranteed to re-render those components with live numbers, not just
 * write bytes to IndexedDB that nothing ever re-reads.
 */
function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onblocked = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function focusSnapshot(overrides: Partial<TimerSnapshot> = {}): TimerSnapshot {
  return {
    status: "running",
    mode: "focus",
    deadline: null,
    remainingMs: 0,
    durationMs: 25 * 60 * 1000,
    focusSessionsSinceLongBreak: 0,
    ...overrides,
  };
}

beforeEach(async () => {
  vi.setSystemTime(new Date("2024-06-01T10:00:00"));
  await closeDb();
  await deleteDatabase(DB_NAME);
  useStatsStore.setState({
    dailyStats: emptyDailyStats(todayLocalDateString()),
    streak: defaultStreak(),
    isLoading: false,
    hasLoaded: false,
    error: null,
  });
  useTaskStore.setState({ selectedTaskId: null });
});

afterEach(async () => {
  vi.useRealTimers();
  await closeDb();
});

describe("recordCompletedSession -> useStatsStore wiring", () => {
  it("increments today's dailyStats.focusSessions in the store immediately, with no manual refresh needed", async () => {
    expect(useStatsStore.getState().dailyStats.focusSessions).toBe(0);

    await recordCompletedSession(focusSnapshot(), Date.now());

    // This is exactly the selector app/page.tsx reads -- if it updates here,
    // ChallengeCard/StatsView re-render with the new numbers in the real app.
    expect(useStatsStore.getState().dailyStats.focusSessions).toBe(1);
    expect(useStatsStore.getState().dailyStats.focusSeconds).toBe(25 * 60);
    expect(useStatsStore.getState().hasLoaded).toBe(true);
  });

  it("also refreshes the streak (StreakIndicator's data source) on the same completion", async () => {
    await recordCompletedSession(focusSnapshot(), Date.now());

    expect(useStatsStore.getState().streak.currentStreak).toBe(1);
    expect(useStatsStore.getState().streak.lastActiveDate).toBe(todayLocalDateString());
  });

  it("does NOT increment focusSessions for a completed break session (only focus sessions count)", async () => {
    await recordCompletedSession(focusSnapshot({ mode: "short_break", durationMs: 5 * 60 * 1000 }), Date.now());

    expect(useStatsStore.getState().dailyStats.focusSessions).toBe(0);
    expect(useStatsStore.getState().dailyStats.shortBreaks).toBe(1);
  });

  it(
    `completing ${DAILY_CHALLENGE_TARGET_FOCUS_SESSIONS} focus sessions reaches the challenge target in the store ` +
      "and persists a completed Challenge + streak-freeze Reward",
    async () => {
      for (let i = 0; i < DAILY_CHALLENGE_TARGET_FOCUS_SESSIONS; i += 1) {
        await recordCompletedSession(focusSnapshot(), Date.now());
      }

      expect(useStatsStore.getState().dailyStats.focusSessions).toBe(DAILY_CHALLENGE_TARGET_FOCUS_SESSIONS);

      const db = await getDb();
      const today = todayLocalDateString();

      const challenge = await getChallenge(db, today);
      expect(challenge?.completed).toBe(true);

      const rewards = await listRewards(db);
      expect(rewards).toHaveLength(1);
      expect(rewards[0]).toMatchObject({ type: STREAK_FREEZE_REWARD_TYPE });
    }
  );

  it("a 5th focus session keeps counting dailyStats but does not re-grant the reward (idempotent challenge)", async () => {
    for (let i = 0; i < DAILY_CHALLENGE_TARGET_FOCUS_SESSIONS + 1; i += 1) {
      await recordCompletedSession(focusSnapshot(), Date.now());
    }

    expect(useStatsStore.getState().dailyStats.focusSessions).toBe(DAILY_CHALLENGE_TARGET_FOCUS_SESSIONS + 1);

    const db = await getDb();
    const rewards = await listRewards(db);
    expect(rewards).toHaveLength(1); // not 2
  });
});
