import { describe, expect, it } from "vitest";
import {
  computeRemainingMs,
  createIdleSnapshot,
  restoreSnapshot,
  timerConfigFromSettings,
  timerReducer,
  type TimerConfig,
} from "@/services/timer.service";
import { defaultSettingsState } from "@/types/storage";
import type { TimerSnapshot } from "@/types/timer.types";

const CONFIG: TimerConfig = {
  durations: { focus: 25 * 60 * 1000, short_break: 5 * 60 * 1000, long_break: 15 * 60 * 1000 },
  longBreakInterval: 4,
};

function idleFocus(overrides: Partial<TimerSnapshot> = {}): TimerSnapshot {
  return { ...createIdleSnapshot("focus", CONFIG.durations.focus), ...overrides };
}

describe("computeRemainingMs", () => {
  it("returns remainingMs unchanged when there is no deadline (idle/paused)", () => {
    expect(computeRemainingMs(null, 12_345, 999_999)).toBe(12_345);
  });

  it("derives remaining time from the deadline when running", () => {
    expect(computeRemainingMs(10_000, 0, 4_000)).toBe(6_000);
  });

  it("never goes negative once the deadline has passed", () => {
    expect(computeRemainingMs(1_000, 0, 5_000)).toBe(0);
  });
});

describe("timerReducer", () => {
  it("START sets a deadline `now + remainingMs` and moves to running", () => {
    const idle = idleFocus();
    const next = timerReducer(idle, { type: "START" }, { ...CONFIG, now: 1_000 });
    expect(next.status).toBe("running");
    expect(next.deadline).toBe(1_000 + idle.remainingMs);
  });

  it("START is a no-op while already running (idempotent)", () => {
    const running = timerReducer(idleFocus(), { type: "START" }, { ...CONFIG, now: 0 });
    const again = timerReducer(running, { type: "START" }, { ...CONFIG, now: 500 });
    expect(again).toEqual(running);
  });

  it("PAUSE freezes remainingMs and clears the deadline", () => {
    const running = timerReducer(idleFocus(), { type: "START" }, { ...CONFIG, now: 0 });
    const paused = timerReducer(running, { type: "PAUSE" }, { ...CONFIG, now: 4_000 });
    expect(paused.status).toBe("paused");
    expect(paused.deadline).toBeNull();
    expect(paused.remainingMs).toBe(CONFIG.durations.focus - 4_000);
  });

  it("PAUSE while paused/idle is a no-op", () => {
    const idle = idleFocus();
    expect(timerReducer(idle, { type: "PAUSE" }, CONFIG)).toBe(idle);
  });

  it("RESUME derives a fresh deadline from the frozen remainingMs", () => {
    const running = timerReducer(idleFocus(), { type: "START" }, { ...CONFIG, now: 0 });
    const paused = timerReducer(running, { type: "PAUSE" }, { ...CONFIG, now: 4_000 });
    const resumed = timerReducer(paused, { type: "RESUME" }, { ...CONFIG, now: 10_000 });
    expect(resumed.status).toBe("running");
    expect(resumed.deadline).toBe(10_000 + paused.remainingMs);
  });

  it("RESET returns a fresh idle snapshot for the current mode's configured duration", () => {
    const running = timerReducer(idleFocus(), { type: "START" }, { ...CONFIG, now: 0 });
    const reset = timerReducer(running, { type: "RESET" }, CONFIG);
    expect(reset).toEqual(createIdleSnapshot("focus", CONFIG.durations.focus));
  });

  it("SKIP on a focus session advances to short_break and increments the cycle counter", () => {
    const focus = idleFocus({ focusSessionsSinceLongBreak: 0 });
    const skipped = timerReducer(focus, { type: "SKIP" }, CONFIG);
    expect(skipped.mode).toBe("short_break");
    expect(skipped.status).toBe("idle");
    expect(skipped.focusSessionsSinceLongBreak).toBe(1);
    expect(skipped.durationMs).toBe(CONFIG.durations.short_break);
  });

  it("every 4th focus completion (default longBreakInterval) schedules a long_break, then resets the counter", () => {
    let snapshot = idleFocus({ focusSessionsSinceLongBreak: 3 });
    snapshot = timerReducer(snapshot, { type: "COMPLETE" }, CONFIG);
    expect(snapshot.mode).toBe("long_break");
    expect(snapshot.focusSessionsSinceLongBreak).toBe(0);
  });

  it("break modes always return to focus next, regardless of the cycle counter", () => {
    const shortBreak: TimerSnapshot = {
      ...createIdleSnapshot("short_break", CONFIG.durations.short_break),
      focusSessionsSinceLongBreak: 2,
    };
    const next = timerReducer(shortBreak, { type: "COMPLETE" }, CONFIG);
    expect(next.mode).toBe("focus");
    expect(next.focusSessionsSinceLongBreak).toBe(2);
  });

  it("TICK below zero remaining transitions to COMPLETE's resolved next-mode snapshot exactly once", () => {
    const running = timerReducer(idleFocus(), { type: "START" }, { ...CONFIG, now: 0 });
    const completed = timerReducer(running, { type: "TICK", now: CONFIG.durations.focus + 1 }, CONFIG);
    expect(completed.status).toBe("idle");
    expect(completed.mode).toBe("short_break");
  });

  it("TICK while paused/idle is a no-op (never advances time on its own)", () => {
    const idle = idleFocus();
    expect(timerReducer(idle, { type: "TICK", now: 999_999 }, CONFIG)).toBe(idle);
  });

  it("CHANGE_MODE is disallowed by convention while running, but the reducer itself just resets to idle for the target mode", () => {
    const next = timerReducer(idleFocus(), { type: "CHANGE_MODE", mode: "long_break" }, CONFIG);
    expect(next).toEqual(createIdleSnapshot("long_break", CONFIG.durations.long_break));
  });

  it("RESTORE returns the given snapshot verbatim", () => {
    const snapshot = idleFocus({ remainingMs: 42 });
    expect(timerReducer(idleFocus(), { type: "RESTORE", snapshot }, CONFIG)).toBe(snapshot);
  });
});

describe("restoreSnapshot (deadline-based recovery on reload)", () => {
  it("treats the all-zero sentinel (never persisted) as first run and returns a fresh focus idle snapshot", () => {
    const neverPersisted: TimerSnapshot = {
      status: "idle",
      mode: "focus",
      deadline: null,
      remainingMs: 0,
      durationMs: 0,
      focusSessionsSinceLongBreak: 0,
    };
    const restored = restoreSnapshot(neverPersisted, CONFIG, 1_000);
    expect(restored).toEqual(createIdleSnapshot("focus", CONFIG.durations.focus));
  });

  it("leaves a persisted idle/paused snapshot untouched", () => {
    const paused: TimerSnapshot = { ...idleFocus(), status: "paused", remainingMs: 5_000 };
    expect(restoreSnapshot(paused, CONFIG, 999_999)).toBe(paused);
  });

  it("a running snapshot still short of its deadline just recomputes remainingMs", () => {
    const running: TimerSnapshot = { ...idleFocus(), status: "running", deadline: 10_000, remainingMs: 20_000 };
    const restored = restoreSnapshot(running, CONFIG, 4_000);
    expect(restored.status).toBe("running");
    expect(restored.remainingMs).toBe(6_000);
  });

  it("a running snapshot whose deadline has already passed (tab closed past completion) resolves to the next mode, exactly once", () => {
    const running: TimerSnapshot = { ...idleFocus(), status: "running", deadline: 1_000, remainingMs: 25 * 60 * 1000 };
    const restored = restoreSnapshot(running, CONFIG, 999_999);
    expect(restored.status).toBe("idle");
    expect(restored.mode).toBe("short_break");
  });
});

describe("timerConfigFromSettings", () => {
  it("converts seconds-based settings durations into the ms-based TimerConfig the reducer expects", () => {
    const settings = defaultSettingsState();
    const config = timerConfigFromSettings(settings.durations);
    expect(config.durations.focus).toBe(settings.durations.focusSeconds * 1000);
    expect(config.durations.short_break).toBe(settings.durations.shortBreakSeconds * 1000);
    expect(config.durations.long_break).toBe(settings.durations.longBreakSeconds * 1000);
    expect(config.longBreakInterval).toBe(settings.durations.longBreakInterval);
  });
});
