"use client";

import { useEffect, type ReactNode } from "react";
import { useTimerEngine } from "@/hooks/useTimerEngine";
import { useTimerStore } from "@/stores/timer.store";

declare global {
  interface Window {
    __focusflowTimerStore?: typeof useTimerStore;
  }
}

/**
 * Mounts the timer engine's side effects (worker, persistence, cross-tab
 * sync, leader-gated alarm -- see hooks/useTimerEngine.ts) once for the
 * whole app. Renders no markup of its own; wrap the app shell with it the
 * same way app/layout.tsx already wraps it with next-themes' ThemeProvider.
 */
export function TimerProvider({ children }: { children: ReactNode }) {
  useTimerEngine();

  useEffect(() => {
    // Dev-only console hook so the engine can be exercised before the
    // Phase 3 UI exists: e.g. `__focusflowTimerStore.getState().start()`
    // and `__focusflowTimerStore.getState().snapshot` in devtools.
    if (process.env.NODE_ENV !== "production") {
      window.__focusflowTimerStore = useTimerStore;
    }
  }, []);

  return <>{children}</>;
}
