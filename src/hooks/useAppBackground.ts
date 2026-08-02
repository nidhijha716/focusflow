"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getBundledBackground,
  isCustomBackgroundId,
  modeTintGradient,
} from "@/constants/backgrounds.constants";
import { loadCustomBackgroundBlobUrl } from "@/services/background.service";
import { useSettingsStore } from "@/stores/settings.store";
import { useTimerStore } from "@/stores/timer.store";

export interface AppBackgroundStyle {
  baseBackground: string;
  overlayBackground: string;
}

export function useAppBackground(): AppBackgroundStyle {
  const backgroundId = useSettingsStore((state) => state.appearance.backgroundId);
  const mode = useTimerStore((state) => state.snapshot.mode);
  const [customBackground, setCustomBackground] = useState<{ id: string; url: string } | null>(null);

  useEffect(() => {
    if (!isCustomBackgroundId(backgroundId)) return;

    let cancelled = false;
    let objectUrl: string | null = null;

    void loadCustomBackgroundBlobUrl(backgroundId).then((url) => {
      if (cancelled || !url) return;
      objectUrl = url;
      setCustomBackground({ id: backgroundId, url });
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [backgroundId]);

  const activeCustomUrl =
    customBackground && customBackground.id === backgroundId ? customBackground.url : null;

  return useMemo(() => {
    if (isCustomBackgroundId(backgroundId) && activeCustomUrl) {
      return {
        baseBackground: `url("${activeCustomUrl}") center / cover no-repeat`,
        overlayBackground: modeTintGradient(mode),
      };
    }

    const bundled = getBundledBackground(backgroundId);
    return {
      baseBackground: bundled.background,
      overlayBackground: bundled.id === "none" ? "transparent" : modeTintGradient(mode),
    };
  }, [backgroundId, activeCustomUrl, mode]);
}
