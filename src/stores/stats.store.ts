import { create } from "zustand";
import { getDb } from "@/db/client";
import { getDailyStats } from "@/db/repositories/dailyStatsRepository";
import { getStreak } from "@/db/repositories/streakRepository";
import { emptyDailyStats, type DailyStats } from "@/types/dailyStats";
import { defaultStreak, type Streak } from "@/types/streak";
import { todayLocalDateString } from "@/types/localDate";

export interface StatsStoreState {
  dailyStats: DailyStats;
  streak: Streak;
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
  refreshAll: () => Promise<void>;
}

/**
 * Real stats/streak store backed by the read-only `dailyStats` and `streak`
 * repositories. Both records are only ever written as a side effect of a
 * completed session (`src/db/integrity/completeFocusSession.ts`,
 * `src/db/repositories/streakRepository.ts`'s `recordStreakActivity`) --
 * this store's `refreshAll` re-reads them, it never writes. Call it once on
 * mount and again after `services/session.service.ts` records a completed
 * session so `StatsView`/`StreakIndicator`/`ChallengeCard` reflect the new
 * totals without polling.
 */
export const useStatsStore = create<StatsStoreState>((set, get) => ({
  dailyStats: emptyDailyStats(todayLocalDateString()),
  streak: defaultStreak(),
  isLoading: false,
  hasLoaded: false,
  error: null,

  refreshAll: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const db = await getDb();
      const today = todayLocalDateString();
      const [dailyStats, streak] = await Promise.all([getDailyStats(db, today), getStreak(db)]);
      set({ dailyStats, streak, isLoading: false, hasLoaded: true });
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : "Failed to load stats" });
    }
  },
}));
