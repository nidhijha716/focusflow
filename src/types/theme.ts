/**
 * Theme system types.
 * Source: 08_UI_Theme_Colors_and_Responsive_Rules.pdf section 2 (Core Color
 * System) and 02_Technical_Architecture.pdf section 4 (Timer State Machine
 * modes: focus, short_break, long_break).
 */

/** Color scheme choices exposed to the user via next-themes. */
export const THEME_MODES = ["light", "dark", "system"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

/**
 * Timer mode accents. Names match the timer state machine's `mode` values
 * (doc 02 section 4) so stores/services can key off the same union without a
 * translation layer.
 */
export const ACCENT_MODES = ["focus", "short_break", "long_break"] as const;
export type AccentMode = (typeof ACCENT_MODES)[number];

/** Non-mode semantic status colors -- doc 08 section 2. */
export const STATUS_COLORS = ["warning", "danger", "success"] as const;
export type StatusColor = (typeof STATUS_COLORS)[number];

/**
 * Maps each accent mode to its semantic CSS custom property name, defined in
 * `src/styles/tokens.css` and bridged into Tailwind's `--color-*` namespace
 * in `src/app/globals.css`.
 *
 * Usage: `var(${ACCENT_CSS_VAR.focus})` or the Tailwind class
 * `bg-${ACCENT_TAILWIND_COLOR.focus}` (e.g. `bg-focus`).
 */
export const ACCENT_CSS_VAR: Record<AccentMode, string> = {
  focus: "--focus",
  short_break: "--short-break",
  long_break: "--long-break",
};

/** Tailwind color utility suffix for each accent mode (e.g. `bg-short-break`). */
export const ACCENT_TAILWIND_COLOR: Record<AccentMode, string> = {
  focus: "focus",
  short_break: "short-break",
  long_break: "long-break",
};
