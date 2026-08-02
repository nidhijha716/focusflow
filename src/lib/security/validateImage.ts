/**
 * Custom background image validation.
 *
 * Scope: 04_Security_and_Access.pdf §6 — "Accept only supported image MIME
 * types and verify decoded image content", "Set a maximum input size",
 * "Do not execute SVG/HTML as user backgrounds in the initial release."
 *
 * This is client-side, defense-in-depth validation for a local-first app
 * that never uploads these files to a server (§6: "Do not upload anonymous
 * custom images to a server"). It is not a substitute for server-side
 * validation in any future phase that introduces uploads.
 *
 * Three layers are checked, in order:
 * 1. Declared `File.type` must be in the MIME allowlist (jpeg/png/webp/avif).
 * 2. The file's actual bytes are sniffed against known magic-byte signatures
 *    so a renamed/mislabeled SVG, HTML, or script file cannot pass by
 *    spoofing `File.type` or extension alone.
 * 3. The bytes must actually decode as an image (`createImageBitmap`), which
 *    catches truncated/corrupt files and content that merely mimics a magic
 *    number without being a valid image.
 */

import type {
  ImageValidationMeta,
  ImageValidationOptions,
  SupportedImageMimeType,
  ValidationResult,
} from "@/types/security";

/** Default max upload size for a single custom background image (5 MB). */
export const DEFAULT_MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

/** Default max width/height (in pixels) accepted for a custom background. */
export const DEFAULT_MAX_IMAGE_DIMENSION_PX = 8000;

export const DEFAULT_ALLOWED_IMAGE_MIME_TYPES: readonly SupportedImageMimeType[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

/** Number of leading bytes needed to sniff the largest supported signature (AVIF: 12 bytes). */
const SNIFF_BYTE_LENGTH = 12;

/** Detects the real image type from magic bytes, independent of the file's declared MIME/extension. */
function sniffImageMimeType(bytes: Uint8Array): SupportedImageMimeType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    return "image/webp";
  }

  // AVIF/ISOBMFF: bytes[4..8) === "ftyp", bytes[8..12) === "avif" | "avis".
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 && // f
    bytes[5] === 0x74 && // t
    bytes[6] === 0x79 && // y
    bytes[7] === 0x70 && // p
    ((bytes[8] === 0x61 && bytes[9] === 0x76 && bytes[10] === 0x69 && bytes[11] === 0x66) || // avif
      (bytes[8] === 0x61 && bytes[9] === 0x76 && bytes[10] === 0x69 && bytes[11] === 0x73)) // avis
  ) {
    return "image/avif";
  }

  return null;
}

async function decodeImageDimensions(
  blob: Blob
): Promise<{ width: number; height: number } | null> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob);
      const dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return dimensions;
    } catch {
      return null;
    }
  }

  // Fallback for environments without createImageBitmap (rare in evergreen browsers).
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Validates a candidate custom-background image file. Never trust
 * `file.type`/`file.name` alone — this performs MIME allowlisting, byte
 * sniffing, size limits, and a real decode before returning success.
 */
export async function validateImageFile(
  file: File,
  options: ImageValidationOptions = {}
): Promise<ValidationResult<ImageValidationMeta>> {
  const maxSizeBytes = options.maxSizeBytes ?? DEFAULT_MAX_IMAGE_SIZE_BYTES;
  const maxDimensionPx = options.maxDimensionPx ?? DEFAULT_MAX_IMAGE_DIMENSION_PX;
  const allowedMimeTypes = options.allowedMimeTypes ?? DEFAULT_ALLOWED_IMAGE_MIME_TYPES;

  if (file.size <= 0) {
    return { ok: false, error: "File is empty." };
  }

  if (file.size > maxSizeBytes) {
    return {
      ok: false,
      error: `File exceeds the maximum size of ${Math.round(maxSizeBytes / (1024 * 1024))} MB.`,
    };
  }

  if (!allowedMimeTypes.includes(file.type as SupportedImageMimeType)) {
    return {
      ok: false,
      error: `Unsupported file type "${file.type || "unknown"}". Allowed types: ${allowedMimeTypes.join(", ")}.`,
    };
  }

  let headerBytes: Uint8Array;
  try {
    const headerBuffer = await file.slice(0, SNIFF_BYTE_LENGTH).arrayBuffer();
    headerBytes = new Uint8Array(headerBuffer);
  } catch {
    return { ok: false, error: "Could not read file contents." };
  }

  const sniffedMimeType = sniffImageMimeType(headerBytes);

  if (sniffedMimeType === null) {
    return {
      ok: false,
      error: "File content does not match a supported image format (SVG, HTML, and other formats are not allowed).",
    };
  }

  if (!allowedMimeTypes.includes(sniffedMimeType)) {
    return { ok: false, error: `Detected image type "${sniffedMimeType}" is not allowed.` };
  }

  if (sniffedMimeType !== file.type) {
    return {
      ok: false,
      error: `Declared file type "${file.type}" does not match detected content type "${sniffedMimeType}".`,
    };
  }

  const dimensions = await decodeImageDimensions(file);

  if (dimensions === null) {
    return { ok: false, error: "File could not be decoded as a valid image." };
  }

  if (dimensions.width <= 0 || dimensions.height <= 0) {
    return { ok: false, error: "Decoded image has invalid dimensions." };
  }

  if (dimensions.width > maxDimensionPx || dimensions.height > maxDimensionPx) {
    return {
      ok: false,
      error: `Image dimensions exceed the maximum of ${maxDimensionPx}px per side.`,
    };
  }

  return {
    ok: true,
    value: {
      mimeType: sniffedMimeType,
      width: dimensions.width,
      height: dimensions.height,
      sizeBytes: file.size,
    },
  };
}
