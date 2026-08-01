import { create } from "zustand";
import { DEFAULT_DURATIONS_MS } from "@/constants/timer.constants";
import { createIdleSnapshot, timerReducer } from "@/services/timer.service";
import type { TimerEvent, TimerMode, TimerSnapshot } from "@/types/timer.types";

export interface TimerStoreState {
  snapshot: TimerSnapshot;
  durations: Record<TimerMode, number>;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  skip: () => void;
  tick: () => void;
  changeMode: (mode: TimerMode) => void;
  restore: (snapshot: TimerSnapshot) => void;
  setDurations: (durations: Record<TimerMode, number>) => void;
}

/**
 * Runtime-only store: holds the current FSM snapshot and dispatches events
 * through the pure `timerReducer`. Persistence (services/storage.service),
 * cross-tab broadcast (services/sync.service), and worker wiring
 * (workers/timer.worker.ts) are integration concerns for a higher-level
 * hook/provider, not this store — keeping it free of side effects makes the
 * FSM trivially testable.
 */
export const useTimerStore = create<TimerStoreState>((set, get) => {
  function dispatch(event: TimerEvent): void {
    const { snapshot, durations } = get();
    set({ snapshot: timerReducer(snapshot, event, { durations }) });
  }

  return {
    snapshot: createIdleSnapshot("focus", DEFAULT_DURATIONS_MS.focus),
    durations: DEFAULT_DURATIONS_MS,

    start: () => dispatch({ type: "START" }),
    pause: () => dispatch({ type: "PAUSE" }),
    resume: () => dispatch({ type: "RESUME" }),
    reset: () => dispatch({ type: "RESET" }),
    skip: () => dispatch({ type: "SKIP" }),
    tick: () => dispatch({ type: "TICK", now: Date.now() }),
    changeMode: (mode) => dispatch({ type: "CHANGE_MODE", mode }),
    restore: (snapshot) => dispatch({ type: "RESTORE", snapshot }),
    setDurations: (durations) => set({ durations }),
  };
});
