import { getDb } from "@/db/client";
import {
  addBackground,
  countBackgrounds,
  deleteBackground,
  getBackground,
  listBackgrounds,
} from "@/db/repositories/backgroundRepository";
import { CUSTOM_BACKGROUND_PREFIX, customBackgroundRecordId } from "@/constants/backgrounds.constants";
import { reencodeImage } from "@/lib/security/imageProcessing";
import { checkBackgroundCountQuota } from "@/lib/security/quota";
import { validateImageFile } from "@/lib/security/validateImage";
import type { BackgroundRecord } from "@/types/background";
import type { SupportedImageMimeType } from "@/types/security";

export function toCustomBackgroundSettingsId(recordId: string): string {
  return `${CUSTOM_BACKGROUND_PREFIX}${recordId}`;
}

export async function listCustomBackgrounds(): Promise<BackgroundRecord[]> {
  const db = await getDb();
  return listBackgrounds(db);
}

export async function uploadCustomBackground(file: File, name?: string): Promise<{ ok: true; settingsId: string } | { ok: false; error: string }> {
  const validation = await validateImageFile(file);
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  const db = await getDb();
  const currentCount = await countBackgrounds(db);
  const quota = checkBackgroundCountQuota(currentCount);
  if (!quota.ok) {
    return { ok: false, error: quota.reason ?? "Background limit reached." };
  }

  const processed = await reencodeImage(file, validation.value.mimeType as SupportedImageMimeType, {
    maxDimensionPx: 1920,
    preferredOutputMimeType: "image/webp",
  });
  if (!processed) {
    return { ok: false, error: "Could not process image." };
  }

  const id = crypto.randomUUID();
  try {
    await addBackground(db, {
      name: name?.trim() || file.name.replace(/\.[^.]+$/, "") || "Custom",
      mimeType: processed.mimeType as BackgroundRecord["mimeType"],
      blob: processed.blob,
      width: processed.width,
      height: processed.height,
      byteSize: processed.sizeBytes,
    }, id);
  } catch (err) {
    if (err instanceof DOMException && err.name === "QuotaExceededError") {
      return { ok: false, error: "Storage quota exceeded. Delete an old background and try again." };
    }
    return { ok: false, error: "Could not save background." };
  }

  return { ok: true, settingsId: toCustomBackgroundSettingsId(id) };
}

export async function removeCustomBackground(settingsId: string): Promise<void> {
  const recordId = customBackgroundRecordId(settingsId);
  const db = await getDb();
  await deleteBackground(db, recordId);
}

export async function loadCustomBackgroundBlobUrl(settingsId: string): Promise<string | null> {
  const recordId = customBackgroundRecordId(settingsId);
  const db = await getDb();
  const record = await getBackground(db, recordId);
  if (!record) return null;
  return URL.createObjectURL(record.blob);
}
