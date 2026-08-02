"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PauseIcon, PlayIcon, ResetIcon } from "@/components/ui/icons";
import { formatClockTime } from "@/lib/format";

/**
 * `Stopwatch` -- independent elapsed-time utility (doc
 * 05_Frontend_Specification.pdf section 4: "Independent"). Deliberately
 * has no relationship to `useTimer()`/`useTimerStore` -- it's a standalone
 * count-up clock with its own local `useState`, not backed by the worker
 * or persisted anywhere, matching the "can be basic" scope note.
 */
export function Stopwatch() {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRunning) return;

    startedAtRef.current = Date.now() - elapsedMs;
    const intervalId = window.setInterval(() => {
      setElapsedMs(Date.now() - (startedAtRef.current ?? Date.now()));
    }, 250);

    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally re-anchors startedAtRef only when running toggles, not on every elapsedMs tick.
  }, [isRunning]);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="timer-value text-3xl font-semibold text-text-primary sm:text-4xl">
        {formatClockTime(elapsedMs)}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => setIsRunning((previous) => !previous)}>
          {isRunning ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />}
          {isRunning ? "Pause" : elapsedMs > 0 ? "Resume" : "Start"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsRunning(false);
            setElapsedMs(0);
          }}
        >
          <ResetIcon className="size-4" />
          Reset
        </Button>
      </div>
    </div>
  );
}
