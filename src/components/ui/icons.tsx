import type { SVGProps } from "react";

/**
 * Hand-written stroke icons (24x24, `currentColor`) -- no icon package is
 * installed (see package.json) and Phase 3 scope doesn't call for adding
 * one. Each icon is purely decorative (`aria-hidden`); the accessible name
 * always comes from the button/label text that wraps it, never the icon
 * alone (doc 08 section 20: "Mode state must have text/icon cues in
 * addition to color").
 */

type IconProps = SVGProps<SVGSVGElement>;

function BaseIcon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </BaseIcon>
  );
}

export function TasksIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4.5 6l.75.75L6.5 5.25M4.5 12l.75.75 1.25-1.5M4.5 18l.75.75 1.25-1.5" />
    </BaseIcon>
  );
}

export function FlameIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 2.5s5 4.2 5 9.2a5 5 0 0 1-10 0c0-1 .3-1.9.8-2.7.4.9 1.2 1.6 1.9 1.4-.6-2 .6-4.4 2.3-5.9z" />
    </BaseIcon>
  );
}

export function MusicIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
    </BaseIcon>
  );
}

export function ImageIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M21 15l-5-5-7 7" />
    </BaseIcon>
  );
}

export function PipIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <rect x="12" y="12" width="7" height="5" rx="1" fill="currentColor" stroke="none" />
    </BaseIcon>
  );
}

export function StopwatchIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 2M10 2h4M12 2v3" />
    </BaseIcon>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 4.5v15l13-7.5-13-7.5z" fill="currentColor" stroke="none" />
    </BaseIcon>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" />
      <rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" />
    </BaseIcon>
  );
}

export function ResetIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 12a9 9 0 1 0 2.6-6.36" />
      <path d="M3 4v5h5" />
    </BaseIcon>
  );
}

export function SkipIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 5v14l10-7z" fill="currentColor" stroke="none" />
      <rect x="17" y="5" width="2.5" height="14" fill="currentColor" stroke="none" />
    </BaseIcon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </BaseIcon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 9l6 6 6-6" />
    </BaseIcon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 5v14M5 12h14" />
    </BaseIcon>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4z" />
      <path d="M7 5H4a3 3 0 0 0 3 3M17 5h3a3 3 0 0 1-3 3" />
      <path d="M12 13v3M9 20h6M10 20v-2.5a2 2 0 0 1 2-2 2 2 0 0 1 2 2V20" />
    </BaseIcon>
  );
}
