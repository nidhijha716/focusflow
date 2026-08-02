import { getNotificationPermissionStatus } from "@/lib/security/permissions";
import { TIMER_MODE_SESSION_LABELS } from "@/lib/format";
import type { TimerSnapshot } from "@/types/timer.types";

/**
 * Best-effort completion notification (POM-031). Called only by the
 * elected leader tab at the same `justCompleted` point that already gates
 * the alarm and `recordCompletedSession` (hooks/useTimerEngine.ts) -- so at
 * most one notification fires per real completion, never once per open tab.
 *
 * Deliberately never calls `Notification.requestPermission()` -- that is
 * gated behind an explicit user gesture in
 * `lib/security/permissions.ts`/`components/settings/SettingsDialog.tsx`
 * (04_Security_and_Access.pdf, section 7). This function only *uses* an
 * already-granted permission; if it is not granted (default or denied), it
 * silently no-ops -- "denial is harmless" (POM-031's acceptance criterion)
 * and there is no retry/spam here, since a session-complete tick is the
 * only place this is ever called from.
 */
export function notifySessionComplete(previous: TimerSnapshot, next: TimerSnapshot, notificationsEnabled: boolean): void {
  if (!notificationsEnabled) return;
  if (getNotificationPermissionStatus() !== "granted") return;
  if (typeof window === "undefined" || !("Notification" in window)) return;

  try {
    new Notification(`${TIMER_MODE_SESSION_LABELS[previous.mode]} complete`, {
      body: `Starting ${TIMER_MODE_SESSION_LABELS[next.mode].toLowerCase()}.`,
      // A stable tag means a near-simultaneous second call (there should
      // never be one -- see the leader-gating note above) replaces rather
      // than stacking a duplicate notification.
      tag: "pomodoro-session-complete",
    });
  } catch {
    // Notification construction can throw in some environments (e.g. a
    // service worker context expecting registration.showNotification, or a
    // browser quirk) -- never let that break the timer.
  }
}
