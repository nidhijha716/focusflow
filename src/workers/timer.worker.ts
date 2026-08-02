import { TIMER_TICK_INTERVAL_MS } from "@/constants/timer.constants";
import type { TimerWorkerInboundMessage, TimerWorkerOutboundMessage } from "@/types/timer.types";

/**
 * Deadline-based timer worker (02_Technical_Architecture §2/§4): ticks are
 * derived from `Date.now()` against an authoritative deadline, never by
 * accumulating per-second intervals, so drift and background-tab throttling
 * cannot desync the displayed time from the real deadline. Persisting the
 * deadline (not a per-second countdown) is what makes this safe.
 *
 * `self` is cast to the `Worker` interface — the message-passing shape is
 * symmetric on both ends of the channel — instead of adding the `webworker`
 * TS lib, which redeclares globals already provided by `dom` (tsconfig lib)
 * and would conflict.
 */
const ctx = self as unknown as Worker;

let deadline: number | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;

function post(message: TimerWorkerOutboundMessage): void {
  ctx.postMessage(message);
}

function stopPolling(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function startPolling(): void {
  stopPolling();
  intervalId = setInterval(() => {
    if (deadline === null) return;
    const remainingMs = Math.max(0, deadline - Date.now());
    if (remainingMs <= 0) {
      post({ type: "COMPLETE" });
      deadline = null;
      stopPolling();
      return;
    }
    post({ type: "TICK", remainingMs });
  }, TIMER_TICK_INTERVAL_MS);
}

ctx.addEventListener("message", (event: MessageEvent<TimerWorkerInboundMessage>) => {
  const message = event.data;
  switch (message.type) {
    case "START":
    case "SYNC":
      deadline = message.deadline;
      startPolling();
      break;
    case "PAUSE":
    case "STOP":
      deadline = null;
      stopPolling();
      break;
  }
});
