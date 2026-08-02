"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PauseIcon, PlayIcon, ResetIcon, SkipIcon } from "@/components/ui/icons";
import { useTimerActions, useTimerMode, useTimerStatus } from "@/hooks/useTimer";
import { TIMER_MODE_LABELS } from "@/lib/format";

/**
 * `TimerControls` -- start, pause, resume, reset, skip (doc
 * 05_Frontend_Specification.pdf section 4). Start/Pause/Resume collapse
 * into one primary button (doc section 7: "Start changes to Pause while
 * running"), tinted with the current mode's accent (doc 08 section 2:
 * "Primary action uses the current mode accent when contrast is
 * sufficient").
 *
 * Reset opens a confirmation dialog before dispatching -- approved product
 * decision, and doc section 7: "Reset requires clear behavior and should
 * avoid accidental session completion."
 *
 * Reads `useTimerMode()`/`useTimerStatus()` (not `useTimer()`) so this
 * component never re-renders on the once-a-second TICK -- see those hooks'
 * docstring in hooks/useTimer.ts and architecture doc §10.
 */
export function TimerControls() {
  const mode = useTimerMode();
  const status = useTimerStatus();
  const { start, pause, resume, reset, skip } = useTimerActions();
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const isRunning = status === "running";
  const isPaused = status === "paused";

  function handlePrimaryClick() {
    if (isRunning) pause();
    else if (isPaused) resume();
    else start();
  }

  const primaryLabel = isRunning ? "Pause" : isPaused ? "Resume" : "Start";

  return (
    <>
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <Button
          variant="primary"
          accent={mode}
          size="md"
          className="w-full max-w-xs sm:w-auto sm:min-w-56"
          onClick={handlePrimaryClick}
        >
          {isRunning ? <PauseIcon className="size-5" /> : <PlayIcon className="size-5" />}
          {primaryLabel}
        </Button>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => setConfirmResetOpen(true)}>
            <ResetIcon className="size-4" />
            Reset
          </Button>
          <Button variant="secondary" size="sm" onClick={skip}>
            <SkipIcon className="size-4" />
            Skip
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={reset}
        tone="danger"
        title="Reset this session?"
        description={`This discards the current ${TIMER_MODE_LABELS[mode].toLowerCase()} session's progress and sets the clock back to its full duration.`}
        confirmLabel="Reset"
      />
    </>
  );
}
