import { create } from "zustand";
import { createIdleSnapshot, timerConfigFromSettings, timerReducer } from "@/services/timer.service";
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
 * Initial `snapshot` is deliberately the SSR-safe idle default (never reads
 * `localStorage` at module-eval time) so the very first client render
 * matches the server-rendered HTML exactly. A store that read an already-
 * running or paused persisted snapshot here instead would make the client's
 * first paint show "Pause" + a mid-countdown time while the server (no `window`)
 * always renders "Start" + the full duration -- a structural mismatch (a
 * different icon/button), not just differing text, which React cannot
 * reconcile leniently: it throws a hydration error (React error #418) and
 * discards/re-renders the whole subtree client-side, which is a worse and
 * *slower* flash than the one this was trying to avoid.
 *
 * The real persisted snapshot is instead applied once via `restore()` from
 * `hooks/useTimerEngine.ts`'s mount effect, run after hydration has already
 * committed the matching default -- exactly the
 * `node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md`
 * guide's "Date updates live (countdown timers, clocks): Use a Client
 * Component with `useEffect`" row (its inline-script/`suppressHydrationWarning`
 * technique is for a value that must be right at first paint with zero
 * flash, e.g. theme; a per-second countdown value is already going to
 * change again on its own a moment later regardless).
 */
export const useTimerStore = create<TimerStoreState>((set, get) => {
  const initialConfig = timerConfigFromSettings(useSettingsStore.getState().durations);

  function dispatch(event: TimerEvent): void {
    const { snapshot, durations, longBreakInterval } = get();
    set({ snapshot: timerReducer(snapshot, event, { durations, longBreakInterval }) });
  }

  return {
    snapshot: createIdleSnapshot("focus", initialConfig.durations.focus),
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
