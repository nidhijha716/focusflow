/**
 * Gated permission/capability requests for Notifications and Picture-in-Picture.
 *
 * Scope: 04_Security_and_Access.pdf §7 — "Request notification or
 * Picture-in-Picture capabilities only in response to clear user actions and
 * explain why permission is needed. The timer must remain usable when
 * permissions are denied."
 *
 * Every request function here requires the caller to pass
 * `triggeredByUserGesture: true`, which must only be `true` when the call is
 * made synchronously inside a click/keydown handler (or similarly, within the
 * same task as a genuine user action) — never on page load, on a timer tick,
 * or speculatively. This is an explicit contract, not just documentation:
 * requests are refused outright when the flag is false or omitted.
 *
 * Browsers independently enforce "requires a user gesture" for these APIs
 * (e.g. `Notification.requestPermission`, `HTMLVideoElement.requestPictureInPicture`)
 * and will reject/throw if that isn't the case; this wrapper adds an explicit
 * app-level gate on top and normalizes both outcomes into `PermissionRequestResult`
 * so callers never need to catch a raw exception to keep the timer usable.
 */

import type { PermissionRequestResult } from "@/types/security";

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Current Notification permission without prompting the user. */
export function getNotificationPermissionStatus(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) {
    return "unsupported";
  }
  return Notification.permission;
}

/**
 * Requests Notification permission. Must be called synchronously from a user
 * gesture handler (e.g. an "Enable notifications" button's `onClick`), with
 * the reason for the request shown to the user beforehand in the UI (§7).
 */
export async function requestNotificationPermission(
  triggeredByUserGesture: boolean
): Promise<PermissionRequestResult> {
  if (!isNotificationSupported()) {
    return { status: "unsupported", reason: "The Notification API is not available in this browser." };
  }

  if (!triggeredByUserGesture) {
    return {
      status: "blocked-no-gesture",
      reason: "Notification permission must be requested from a direct user action.",
    };
  }

  if (Notification.permission === "granted") {
    return { status: "granted" };
  }

  if (Notification.permission === "denied") {
    return { status: "denied" };
  }

  try {
    const result = await Notification.requestPermission();
    return result === "granted" ? { status: "granted" } : { status: "denied" };
  } catch {
    return { status: "denied" };
  }
}

export function isPictureInPictureSupported(): boolean {
  return typeof document !== "undefined" && "pictureInPictureEnabled" in document && document.pictureInPictureEnabled;
}

/**
 * Requests Picture-in-Picture for a given `<video>` element. Must be called
 * synchronously from a user gesture handler, with the reason for the request
 * explained in the UI beforehand (§7). The timer's own state/logic must not
 * depend on this succeeding — treat PiP purely as an optional presentation
 * enhancement.
 */
export async function requestPictureInPicture(
  videoElement: HTMLVideoElement,
  triggeredByUserGesture: boolean
): Promise<PermissionRequestResult> {
  if (!isPictureInPictureSupported()) {
    return { status: "unsupported", reason: "Picture-in-Picture is not available in this browser." };
  }

  if (!triggeredByUserGesture) {
    return {
      status: "blocked-no-gesture",
      reason: "Picture-in-Picture must be requested from a direct user action.",
    };
  }

  try {
    await videoElement.requestPictureInPicture();
    return { status: "granted" };
  } catch {
    return { status: "denied" };
  }
}

/** Best-effort exit; never throws, since PiP is an optional enhancement. */
export async function exitPictureInPictureIfActive(): Promise<void> {
  if (typeof document === "undefined" || !document.pictureInPictureElement) {
    return;
  }
  try {
    await document.exitPictureInPicture();
  } catch {
    // Intentionally ignored: exiting PiP is best-effort.
  }
}
