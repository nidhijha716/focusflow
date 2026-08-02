import type { TimerMode } from "@/types/timer.types";

export const DEFAULT_DURATIONS_MS: Record<TimerMode, number> = {
  focus: 25 * 60 * 1000,
  short_break: 5 * 60 * 1000,
  long_break: 15 * 60 * 1000,
};

/** Number of focus sessions completed before a long break is scheduled. */
export const LONG_BREAK_INTERVAL = 4;

/** Worker-internal polling cadence; independent of persistence cadence. */
export const TIMER_TICK_INTERVAL_MS = 250;

/**
 * Alarm asset id/src for `services/audio.service.ts`, played once per
 * COMPLETE by the elected leader tab (hooks/useTimerEngine.ts).
 * `/sounds/alarm.wav` is a generated placeholder beep (no license-cleared
 * sound file exists yet, same placeholder status as the manifest icons in
 * app/manifest.ts) -- see scripts/generate-assets.mjs, which is also what
 * `public/sw.js` precaches. WAV (not MP3) because the generator writes raw
 * PCM directly with no encoder dependency; every evergreen browser plays it
 * natively via HTMLAudioElement.
 */
export const ALARM_SOUND_ID = "timer-complete";
export const ALARM_SOUND_SRC = "/sounds/alarm.wav";
