/** Prefix for IndexedDB-backed custom background ids in settings. */
export const CUSTOM_BACKGROUND_PREFIX = "custom:";

export function isCustomBackgroundId(id: string | null | undefined): id is string {
  return typeof id === "string" && id.startsWith(CUSTOM_BACKGROUND_PREFIX);
}

export function customBackgroundRecordId(backgroundId: string): string {
  return backgroundId.slice(CUSTOM_BACKGROUND_PREFIX.length);
}

export interface BundledBackgroundDefinition {
  id: string;
  name: string;
  /** CSS background value (gradient or color). */
  background: string;
  previewClassName: string;
}

/** Bundled presets - CSS-only, no proprietary assets (doc 08). */
export const BUNDLED_BACKGROUNDS: readonly BundledBackgroundDefinition[] = [
  {
    id: "none",
    name: "None",
    background: "var(--bg)",
    previewClassName: "bg-surface-soft",
  },
  {
    id: "focus-gradient",
    name: "Focus glow",
    background:
      "linear-gradient(135deg, color-mix(in srgb, var(--focus) 35%, var(--bg)), color-mix(in srgb, var(--long-break) 25%, var(--bg)))",
    previewClassName: "bg-[linear-gradient(135deg,var(--focus),var(--long-break))]",
  },
  {
    id: "forest",
    name: "Forest",
    background:
      "linear-gradient(135deg, color-mix(in srgb, var(--short-break) 40%, var(--bg)), color-mix(in srgb, var(--surface-soft) 80%, var(--bg)))",
    previewClassName: "bg-[linear-gradient(135deg,var(--short-break),var(--surface-soft))]",
  },
  {
    id: "dusk",
    name: "Dusk",
    background:
      "linear-gradient(160deg, color-mix(in srgb, var(--long-break) 45%, var(--bg)), color-mix(in srgb, var(--warning) 30%, var(--bg)))",
    previewClassName: "bg-[linear-gradient(135deg,var(--long-break),var(--warning))]",
  },
  {
    id: "aurora",
    name: "Aurora",
    background:
      "linear-gradient(120deg, color-mix(in srgb, var(--short-break) 30%, var(--bg)), color-mix(in srgb, var(--long-break) 35%, var(--bg)), color-mix(in srgb, var(--focus) 25%, var(--bg)))",
    previewClassName: "bg-[linear-gradient(120deg,var(--short-break),var(--long-break))]",
  },
] as const;

export function getBundledBackground(id: string | null | undefined): BundledBackgroundDefinition {
  return BUNDLED_BACKGROUNDS.find((item) => item.id === id) ?? BUNDLED_BACKGROUNDS[0];
}

/** Mode-aware tint overlay for readability (doc 08: preserve text contrast). */
export function modeTintGradient(mode: "focus" | "short_break" | "long_break"): string {
  const accent =
    mode === "focus" ? "var(--focus)" : mode === "short_break" ? "var(--short-break)" : "var(--long-break)";
  return `linear-gradient(to bottom, color-mix(in srgb, ${accent} 18%, transparent), color-mix(in srgb, var(--overlay) 85%, transparent))`;
}
