"use client";

import { useId, useState, useSyncExternalStore, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { CloseIcon } from "@/components/ui/icons";
import { useHasMounted } from "@/hooks/useHasMounted";
import { cn } from "@/lib/cn";
import { formatMinutes, minutesToSeconds } from "@/lib/format";
import { getNotificationPermissionStatus, requestNotificationPermission } from "@/lib/security/permissions";
import { useSettingsStore } from "@/stores/settings.store";

export interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-text-primary">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClassName =
  "control w-full rounded-md border border-border bg-surface px-3 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border";

function noopSubscribe(): () => void {
  // Nothing external to subscribe to -- this only exists to read
  // `Notification.permission` in an SSR-safe way without a `setState`-in-effect
  // cascade (same `useSyncExternalStore` pattern as hooks/usePiPSupport.ts).
  // Updates after the user acts on the toggle go through local state instead
  // (see `permissionOverride` below).
  return () => {};
}

function getServerPermissionSnapshot(): NotificationPermission | "unsupported" {
  return "unsupported";
}

/**
 * `SettingsDialog` -- timer/audio/appearance preferences (doc
 * 05_Frontend_Specification.pdf section 4). Every field writes straight
 * through the existing `useSettingsStore` setters, which already persist
 * to `pomodoro:settings:v1` on every call (`services/storage.service.ts`)
 * -- "persist immediately" is the approved product decision, so there is
 * no separate local draft state or Save button here.
 *
 * Theme uses `next-themes`' `useTheme()` (already wired in
 * app/layout.tsx's `ThemeProvider`) rather than `appearance.theme` in the
 * settings store directly, mirroring the split already established there:
 * `next-themes` owns the live `.dark` class + localStorage theme key,
 * while `appearance.theme` in `pomodoro:settings:v1` is this feature's
 * source of truth for what to *restore* next session.
 */
export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const titleId = useId();
  const durationsId = useId();
  const settings = useSettingsStore();
  const { theme, setTheme } = useTheme();
  const mounted = useHasMounted();

  // Initial value read via `useSyncExternalStore` (SSR-safe, no
  // setState-in-effect render cascade); `permissionOverride` then takes over
  // once the user has acted on the toggle at least once this session, since
  // `Notification.permission` itself doesn't emit change events to
  // re-subscribe to.
  const initialNotificationPermission = useSyncExternalStore(
    noopSubscribe,
    getNotificationPermissionStatus,
    getServerPermissionSnapshot
  );
  const [permissionOverride, setPermissionOverride] = useState<NotificationPermission | "unsupported" | null>(null);
  const notificationPermission = permissionOverride ?? initialNotificationPermission;

  /**
   * Runs synchronously inside this checkbox's own `onChange` -- a genuine
   * user gesture -- so `requestNotificationPermission`'s gesture gate
   * (lib/security/permissions.ts §"must only be true when the call is made
   * synchronously inside a click/keydown handler") is satisfied. Turning
   * the toggle off never prompts; only turning it on does, and only once
   * per click (the browser itself only re-prompts if permission is still
   * `"default"`).
   */
  async function handleNotificationsToggle(checked: boolean) {
    if (!checked) {
      settings.setNotificationsEnabled(false);
      return;
    }
    const result = await requestNotificationPermission(true);
    setPermissionOverride(getNotificationPermissionStatus());
    // If the user denies (or the browser/OS blocks it), the toggle must not
    // silently show "on" while nothing will ever fire -- POM-031's
    // "denial is harmless" criterion.
    settings.setNotificationsEnabled(result.status === "granted");
  }

  return (
    <Dialog open={open} onClose={onClose} labelledBy={titleId}>
      <div className="flex items-center justify-between">
        <h2 id={titleId} className="text-lg font-semibold text-text-primary">
          Settings
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close settings">
          <CloseIcon className="size-5" />
        </Button>
      </div>

      <div className="mt-4 flex flex-col gap-6">
        <fieldset className="flex flex-col gap-3">
          <legend id={durationsId} className="text-sm font-semibold text-text-primary">
            Durations (minutes)
          </legend>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Focus" htmlFor={`${durationsId}-focus`}>
              <input
                id={`${durationsId}-focus`}
                type="number"
                min={1}
                max={180}
                value={formatMinutes(settings.durations.focusSeconds)}
                onChange={(event) =>
                  settings.updateDurations({ focusSeconds: minutesToSeconds(Number(event.target.value)) })
                }
                className={inputClassName}
              />
            </Field>
            <Field label="Short break" htmlFor={`${durationsId}-short`}>
              <input
                id={`${durationsId}-short`}
                type="number"
                min={1}
                max={60}
                value={formatMinutes(settings.durations.shortBreakSeconds)}
                onChange={(event) =>
                  settings.updateDurations({ shortBreakSeconds: minutesToSeconds(Number(event.target.value)) })
                }
                className={inputClassName}
              />
            </Field>
            <Field label="Long break" htmlFor={`${durationsId}-long`}>
              <input
                id={`${durationsId}-long`}
                type="number"
                min={1}
                max={120}
                value={formatMinutes(settings.durations.longBreakSeconds)}
                onChange={(event) =>
                  settings.updateDurations({ longBreakSeconds: minutesToSeconds(Number(event.target.value)) })
                }
                className={inputClassName}
              />
            </Field>
          </div>

          <Field label="Focus sessions before a long break" htmlFor={`${durationsId}-interval`}>
            <input
              id={`${durationsId}-interval`}
              type="number"
              min={2}
              max={8}
              value={settings.durations.longBreakInterval}
              onChange={(event) =>
                settings.updateDurations({ longBreakInterval: Number(event.target.value) })
              }
              className={cn(inputClassName, "max-w-24")}
            />
          </Field>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-semibold text-text-primary">Automation</legend>
          <label className="control flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={settings.autoStartBreaks}
              onChange={(event) => settings.setAutoStartBreaks(event.target.checked)}
              className="size-5"
            />
            Auto-start breaks
          </label>
          <label className="control flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={settings.autoStartFocus}
              onChange={(event) => settings.setAutoStartFocus(event.target.checked)}
              className="size-5"
            />
            Auto-start focus sessions
          </label>
          <label className="control flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={settings.notificationsEnabled}
              onChange={(event) => void handleNotificationsToggle(event.target.checked)}
              disabled={mounted && notificationPermission === "unsupported"}
              className="size-5"
            />
            Notifications on session complete
          </label>
          {mounted && notificationPermission === "denied" ? (
            <p className="pl-7 text-xs text-danger">
              Blocked in your browser&apos;s site settings. Allow notifications there, then turn this back on.
            </p>
          ) : null}
          {mounted && notificationPermission === "unsupported" ? (
            <p className="pl-7 text-xs text-text-secondary">Not supported in this browser.</p>
          ) : null}
        </fieldset>

        <Field label="Alarm volume" htmlFor={`${durationsId}-alarm-volume`}>
          <input
            id={`${durationsId}-alarm-volume`}
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.alarmVolume}
            onChange={(event) => settings.setAlarmVolume(Number(event.target.value))}
            className="control w-full accent-focus"
          />
        </Field>

        <Field label="Ambient music volume" htmlFor={`${durationsId}-music-volume`}>
          <input
            id={`${durationsId}-music-volume`}
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.musicVolume}
            onChange={(event) => settings.setMusicVolume(Number(event.target.value))}
            className="control w-full accent-focus"
          />
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-text-primary">Appearance</legend>
          <div className="flex gap-2" role="radiogroup" aria-label="Theme">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={mounted && theme === option.value}
                onClick={() => setTheme(option.value)}
                className={cn(
                  "control flex-1 rounded-pill border px-3 py-2 text-sm font-medium",
                  mounted && theme === option.value
                    ? "border-focus text-focus underline"
                    : "border-border text-text-secondary"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    </Dialog>
  );
}
