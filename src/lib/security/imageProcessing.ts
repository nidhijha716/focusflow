/**
 * Client-side custom background re-encoding/compression.
 *
 * Scope: 04_Security_and_Access.pdf §6 — "Re-encode/compress images
 * client-side where practical" and "Do not execute SVG/HTML as user
 * backgrounds in the initial release."
 *
 * Call `validateImageFile` (validateImage.ts) BEFORE this module. This module
 * assumes the input already passed MIME allowlisting, byte sniffing, size,
 * and decode checks — it focuses on producing a normalized output blob.
 *
 * Security note: decoding the source into a `<canvas>`/`OffscreenCanvas` and
 * re-serializing it as pixel data is itself a sanitization step — only raw
 * pixels survive the round trip, so any active content (scripts, embedded
 * objects, polyglot payloads) hidden inside a container that merely *looked*
 * like a supported raster image cannot execute or persist through
 * re-encoding.
 *
 * Canvas-based encoders reliably support `image/png`, `image/jpeg`, and
 * `image/webp` output. AVIF *encoding* via `canvas.convertToBlob`/`toBlob` is
 * not consistently supported across browsers as of this writing, so AVIF
 * inputs are re-encoded to `image/webp` instead of round-tripping to AVIF.
 */

import type { ProcessedImage, SupportedImageMimeType } from "@/types/security";
import { DEFAULT_MAX_IMAGE_DIMENSION_PX } from "./validateImage";

/** Output formats that canvas-based encoders reliably support in evergreen browsers. */
const CANVAS_ENCODABLE_MIME_TYPES: readonly SupportedImageMimeType[] = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

export interface ReencodeOptions {
  /** Longest side, in pixels, the output image is scaled down to fit within. */
  readonly maxDimensionPx?: number;
  /** JPEG/WebP quality, 0–1. Ignored for PNG (lossless). */
  readonly quality?: number;
  /** Preferred output MIME type. Falls back to `image/webp` if not canvas-encodable. */
  readonly preferredOutputMimeType?: SupportedImageMimeType;
}

const DEFAULT_QUALITY = 0.85;

function resolveOutputMimeType(
  sourceMimeType: SupportedImageMimeType,
  preferred?: SupportedImageMimeType
): SupportedImageMimeType {
  const candidate = preferred ?? sourceMimeType;
  return CANVAS_ENCODABLE_MIME_TYPES.includes(candidate) ? candidate : "image/webp";
}

function computeScaledDimensions(
  width: number,
  height: number,
  maxDimensionPx: number
): { width: number; height: number } {
  const longestSide = Math.max(width, height);
  if (longestSide <= maxDimensionPx) {
    return { width, height };
  }
  const scale = maxDimensionPx / longestSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function canvasEncode(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  mimeType: SupportedImageMimeType,
  quality: number
): Promise<Blob> {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not acquire 2D canvas context.");
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    return canvas.convertToBlob({ type: mimeType, quality });
  }

  // Fallback for environments without OffscreenCanvas.
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not acquire 2D canvas context.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas encoding failed."));
        }
      },
      mimeType,
      quality
    );
  });
}

/**
 * Re-encodes an already-validated image file into a normalized, bounded
 * raster blob. Returns `null` if decoding or encoding fails at this stage
 * (should be rare given `validateImageFile` already confirmed decodability).
 */
export async function reencodeImage(
  file: File | Blob,
  sourceMimeType: SupportedImageMimeType,
  options: ReencodeOptions = {}
): Promise<ProcessedImage | null> {
  const maxDimensionPx = options.maxDimensionPx ?? DEFAULT_MAX_IMAGE_DIMENSION_PX;
  const quality = options.quality ?? DEFAULT_QUALITY;
  const outputMimeType = resolveOutputMimeType(sourceMimeType, options.preferredOutputMimeType);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }

  try {
    const { width, height } = computeScaledDimensions(bitmap.width, bitmap.height, maxDimensionPx);

    const blob = await canvasEncode(bitmap, width, height, outputMimeType, quality);

    return {
      blob,
      mimeType: outputMimeType,
      width,
      height,
      sizeBytes: blob.size,
    };
  } catch {
    return null;
  } finally {
    bitmap.close();
  }
}
