"use client";

import { useTimerStore } from "@/stores/timer.store";

/**
 * Public read/act hook for the timer FSM. Side effects (persistence,
 * cross-tab sync, worker, alarm) are wired once by
 * providers/TimerProvider.tsx + hooks/useTimerEngine.ts -- components only
 * need this hook to render the current snapshot and dispatch intents.
 *
 * Deliberately does not compute display-only derived values (formatted
 * mm:ss, progress percentage, etc.) -- that belongs to the Phase 3 UI layer
 * that consumes this hook, not to the engine wiring built here.
 */
export function useTimer() {
  const snapshot = useTimerStore((state) => state.snapshot);
  const start = useTimerStore((state) => state.start);
  const pause = useTimerStore((state) => state.pause);
  const resume = useTimerStore((state) => state.resume);
  const reset = useTimerStore((state) => state.reset);
  const skip = useTimerStore((state) => state.skip);
  const changeMode = useTimerStore((state) => state.changeMode);

  return { snapshot, start, pause, resume, reset, skip, changeMode };
}
