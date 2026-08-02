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
  const { start, pause, resume, reset, skip, changeMode } = useTimerActions();

  return { snapshot, start, pause, resume, reset, skip, changeMode };
}

/**
 * Lighter-weight alternative to `useTimer()` for components that only need
 * `mode`/`status` -- never the ticking `remainingMs` -- so the once-a-second
 * TICK (which always produces a new `snapshot` object, see
 * services/timer.service.ts's `timerReducer`) doesn't re-render them too.
 * Each field is its own `useTimerStore` selector (same pattern `useTimer()`
 * already uses for the action functions below) rather than one selector
 * returning `{ mode, status }`: a selector that builds a fresh object every
 * call would defeat the point by always looking "changed" to Zustand's
 * default `Object.is` equality check.
 *
 * Architecture doc §10: "Avoid continuous React re-renders outside timer
 * display/progress components." `ModeSelector`/`TimerControls` render a
 * mode label and a running/paused-derived button state -- not the clock --
 * so they belong on this hook instead of `useTimer()`.
 */
export function useTimerMode() {
  return useTimerStore((state) => state.snapshot.mode);
}

export function useTimerStatus() {
  return useTimerStore((state) => state.snapshot.status);
}

/**
 * Action dispatchers only. These are stable function references for the
 * lifetime of the store (assigned once inside `create()` in
 * stores/timer.store.ts), so selecting them individually never re-renders
 * a component on its own, regardless of how often `tick()` fires.
 */
export function useTimerActions() {
  const start = useTimerStore((state) => state.start);
  const pause = useTimerStore((state) => state.pause);
  const resume = useTimerStore((state) => state.resume);
  const reset = useTimerStore((state) => state.reset);
  const skip = useTimerStore((state) => state.skip);
  const changeMode = useTimerStore((state) => state.changeMode);

  return { start, pause, resume, reset, skip, changeMode };
}
