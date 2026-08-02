"use client";

import { useEffect, useState } from "react";
import { useTimerStore } from "@/stores/timer.store";
import { TIMER_MODE_SESSION_LABELS } from "@/lib/format";

/**
 * Produces the text for a single `aria-live="polite"` announcement each
 * time a focus/break interval actually finishes (natural completion or
 * Skip while running) -- doc 05_Frontend_Specification.pdf section 8:
 * "ARIA live announcement for meaningful timer completion, not every
 * second" -- and clears itself shortly after so the region doesn't keep
 * re-announcing stale text.
 *
 * Detection mirrors the exact heuristic `hooks/useTimerEngine.ts` already
 * uses to gate the completion alarm (`before.status === "running" &&
 * after.status !== "running"`), narrowed to `status -> "idle"` with a mode
 * change so it fires only for SKIP/COMPLETE transitions and not PAUSE
 * (status -> "paused") or RESET (status -> "idle" but same mode). This is a
 * read-only UI-layer subscription -- it does not dispatch actions or touch
 * the store's persisted state, so it can't drift from or duplicate the FSM
 * in services/timer.service.ts.
 */
export function useSessionCompletionAnnouncer(): string {
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const unsubscribe = useTimerStore.subscribe((state, previousState) => {
      const previous = previousState.snapshot;
      const current = state.snapshot;

      const justFinished = previous.status === "running" && current.status === "idle" && current.mode !== previous.mode;
      if (!justFinished) return;

      setAnnouncement(
        `${TIMER_MODE_SESSION_LABELS[previous.mode]} complete. Starting ${TIMER_MODE_SESSION_LABELS[current.mode].toLowerCase()}.`
      );
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!announcement) return;
    const timeoutId = window.setTimeout(() => setAnnouncement(""), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [announcement]);

  return announcement;
}
