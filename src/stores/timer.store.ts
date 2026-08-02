import { create } from "zustand";
import { restoreSnapshot, timerConfigFromSettings, timerReducer } from "@/services/timer.service";
import { loadTimerSnapshot } from "@/services/storage.service";
import { useSettingsStore } from "./settings.store";
import type { TimerEvent, TimerMode, TimerSnapshot } from "@/types/timer.types";

export interface TimerStoreState {
  snapshot: TimerSnapshot;
  durations: Record<TimerMode, number>;
  longBreakInterval: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  skip: () => void;
  tick: () => void;
  changeMode: (mode: TimerMode) => void;
  restore: (snapshot: TimerSnapshot) => void;
  setDurations: (durations: Record<TimerMode, number>) => void;
  setLongBreakInterval: (longBreakInterval: number) => void;
}

/**
 * Runtime-only store: holds the current FSM snapshot and dispatches events
 * through the pure `timerReducer`. Persistence (services/storage.service),
 * cross-tab broadcast (services/sync.service), and worker wiring
 * (workers/timer.worker.ts) are integration concerns owned by
 * hooks/useTimerEngine.ts (mounted once by providers/TimerProvider.tsx),
 * not this store -- keeping dispatch free of side effects keeps the FSM
 * trivially testable.
 *
 * The one exception is initial hydration: like `useSettingsStore`
 * (stores/settings.store.ts), this store seeds itself from
 * `services/storage.service.ts` at creation time so there is no
 * flash-of-default-state before a mount effect runs. `restoreSnapshot`
 * (services/timer.service.ts) recomputes `remainingMs` from `deadline`
 * against "now", so a timer left running while the tab was closed resolves
 * to its correct current interval on first read.
 */
export const useTimerStore = create<TimerStoreState>((set, get) => {
  const initialConfig = timerConfigFromSettings(useSettingsStore.getState().durations);

  function dispatch(event: TimerEvent): void {
    const { snapshot, durations, longBreakInterval } = get();
    set({ snapshot: timerReducer(snapshot, event, { durations, longBreakInterval }) });
  }

  return {
    snapshot: restoreSnapshot(loadTimerSnapshot(), initialConfig),
    durations: initialConfig.durations,
    longBreakInterval: initialConfig.longBreakInterval,

    start: () => dispatch({ type: "START" }),
    pause: () => dispatch({ type: "PAUSE" }),
    resume: () => dispatch({ type: "RESUME" }),
    reset: () => dispatch({ type: "RESET" }),
    skip: () => dispatch({ type: "SKIP" }),
    tick: () => dispatch({ type: "TICK", now: Date.now() }),
    changeMode: (mode) => dispatch({ type: "CHANGE_MODE", mode }),
    restore: (snapshot) => dispatch({ type: "RESTORE", snapshot }),
    setDurations: (durations) => set({ durations }),
    setLongBreakInterval: (longBreakInterval) => set({ longBreakInterval }),
  };
});
