"use client";

import { useId } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { CloseIcon, ImageIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { useSettingsStore } from "@/stores/settings.store";

interface BundledBackground {
  id: string;
  name: string;
  /** CSS color/gradient preview swatch -- original, non-photographic placeholders (doc 08 section 1: "do not copy the reference product's ... proprietary assets"). */
  previewClassName: string;
}

const BUNDLED_BACKGROUNDS: BundledBackground[] = [
  { id: "none", name: "None", previewClassName: "bg-surface-soft" },
  { id: "focus-gradient", name: "Focus glow", previewClassName: "bg-[linear-gradient(135deg,var(--focus),var(--long-break))]" },
  { id: "forest", name: "Forest", previewClassName: "bg-[linear-gradient(135deg,var(--short-break),var(--surface-soft))]" },
  { id: "dusk", name: "Dusk", previewClassName: "bg-[linear-gradient(135deg,var(--long-break),var(--warning))]" },
];

export interface BackgroundPickerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * `BackgroundPicker` -- bundled/custom backgrounds (doc
 * 05_Frontend_Specification.pdf section 4), UI-only per the Phase 3 brief.
 * Bundled swatches are plain CSS gradients from existing mode-accent tokens
 * (no bitmap assets to lazy-load yet, but the grid renders behind
 * `next/dynamic` in app/page.tsx so real thumbnail images added later don't
 * cost anything on first paint -- doc 05 section 11: "Lazy-load heavy
 * audio/background assets").
 *
 * Selecting a swatch persists immediately through the existing
 * `useSettingsStore.setAppearance` setter (`appearance.backgroundId`,
 * `@/types/storage`) -- the same field `SettingsDialog` and the real
 * `backgrounds` IndexedDB store (`@/db/repositories/backgroundRepository.ts`)
 * will read from once custom uploads are wired in Phase 4. Custom upload
 * (`lib/security/validateImage.ts` + `imageProcessing.ts`) is intentionally
 * left as a disabled stub here -- wiring the real pipeline is Phase 4 scope.
 */
export function BackgroundPicker({ open, onClose }: BackgroundPickerProps) {
  const titleId = useId();
  const backgroundId = useSettingsStore((state) => state.appearance.backgroundId);
  const setAppearance = useSettingsStore((state) => state.setAppearance);

  return (
    <Dialog open={open} onClose={onClose} labelledBy={titleId}>
      <div className="flex items-center justify-between">
        <h2 id={titleId} className="text-lg font-semibold text-text-primary">
          Background
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close background picker">
          <CloseIcon className="size-5" />
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {BUNDLED_BACKGROUNDS.map((background) => {
          const selected = (backgroundId ?? "none") === background.id;
          return (
            <button
              key={background.id}
              type="button"
              onClick={() => setAppearance({ backgroundId: background.id === "none" ? null : background.id })}
              aria-pressed={selected}
              className={cn(
                "control flex flex-col items-center gap-2 rounded-lg border p-2 text-xs font-medium",
                selected ? "border-focus" : "border-border"
              )}
            >
              <span className={cn("h-14 w-full rounded-md", background.previewClassName)} aria-hidden="true" />
              <span className={selected ? "text-text-primary" : "text-text-secondary"}>
                {background.name}
                {selected ? " (selected)" : ""}
              </span>
            </button>
          );
        })}
      </div>

      <Button variant="secondary" size="sm" className="mt-4 w-full" disabled title="Custom uploads arrive in a later phase">
        <ImageIcon className="size-4" />
        Upload custom background (coming soon)
      </Button>
    </Dialog>
  );
}
