"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { CloseIcon, ImageIcon } from "@/components/ui/icons";
import { BUNDLED_BACKGROUNDS, isCustomBackgroundId } from "@/constants/backgrounds.constants";
import { cn } from "@/lib/cn";
import {
  listCustomBackgrounds,
  removeCustomBackground,
  toCustomBackgroundSettingsId,
  uploadCustomBackground,
} from "@/services/background.service";
import { useSettingsStore } from "@/stores/settings.store";
import type { BackgroundRecord } from "@/types/background";

export interface BackgroundPickerProps {
  open: boolean;
  onClose: () => void;
}

export function BackgroundPicker({ open, onClose }: BackgroundPickerProps) {
  const titleId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backgroundId = useSettingsStore((state) => state.appearance.backgroundId);
  const setAppearance = useSettingsStore((state) => state.setAppearance);
  const [customBackgrounds, setCustomBackgrounds] = useState<BackgroundRecord[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    void listCustomBackgrounds().then(setCustomBackgrounds);
  }, [open]);

  async function refreshCustomBackgrounds() {
    setCustomBackgrounds(await listCustomBackgrounds());
  }

  async function handleUpload(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const result = await uploadCustomBackground(file);
      if (!result.ok) {
        setUploadError(result.error);
        return;
      }
      setAppearance({ backgroundId: result.settingsId });
      await refreshCustomBackgrounds();
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteCustom(settingsId: string) {
    await removeCustomBackground(settingsId);
    if (backgroundId === settingsId) {
      setAppearance({ backgroundId: null });
    }
    await refreshCustomBackgrounds();
  }

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

      <p className="mt-2 text-xs text-text-secondary">
        Backgrounds shift with your timer mode. Custom uploads are stored on this device only.
      </p>

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

      {customBackgrounds.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-text-primary">Your uploads</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {customBackgrounds.map((background) => {
              const settingsId = toCustomBackgroundSettingsId(background.id);
              const selected = backgroundId === settingsId;
              return (
                <li key={background.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAppearance({ backgroundId: settingsId })}
                    aria-pressed={selected}
                    className={cn(
                      "control flex flex-1 items-center justify-between rounded-lg border px-3 py-2 text-left text-sm",
                      selected ? "border-focus bg-surface-soft" : "border-border"
                    )}
                  >
                    <span>{background.name}</span>
                    {selected ? <span className="text-xs text-focus">Selected</span> : null}
                  </button>
                  <Button variant="ghost" size="sm" onClick={() => void handleDeleteCustom(settingsId)}>
                    Delete
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleUpload(file);
        }}
      />

      <Button
        variant="secondary"
        size="sm"
        className="mt-4 w-full"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
      >
        <ImageIcon className="size-4" />
        {uploading ? "Uploading..." : "Upload custom background"}
      </Button>

      {uploadError ? <p className="mt-2 text-xs text-danger">{uploadError}</p> : null}
      {isCustomBackgroundId(backgroundId) ? (
        <p className="mt-2 text-xs text-text-secondary">Custom image applied to the app background.</p>
      ) : null}
    </Dialog>
  );
}
