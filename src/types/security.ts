/**
 * Shared result/value types for the security utilities in `src/lib/security/*`.
 *
 * Scope (per 04_Security_and_Access.pdf): local-first, no-auth app. These types
 * back client-side validation, image handling, permission gating, and storage
 * quota utilities — they do not model server/API security concerns.
 */

/** Discriminated result for any validation routine that can fail with a reason. */
export type ValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string; readonly issues?: readonly string[] };

/** MIME types accepted for custom backgrounds. SVG and HTML are intentionally excluded (§6). */
export type SupportedImageMimeType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/avif";

/** Metadata captured while validating an image before it is accepted. */
export interface ImageValidationMeta {
  readonly mimeType: SupportedImageMimeType;
  readonly width: number;
  readonly height: number;
  readonly sizeBytes: number;
}

/** Output of the client-side re-encode/compress step (§6). */
export interface ProcessedImage {
  readonly blob: Blob;
  readonly mimeType: SupportedImageMimeType;
  readonly width: number;
  readonly height: number;
  readonly sizeBytes: number;
}

/** Options accepted by the image validation/processing pipeline. */
export interface ImageValidationOptions {
  readonly maxSizeBytes?: number;
  readonly maxDimensionPx?: number;
  readonly allowedMimeTypes?: readonly SupportedImageMimeType[];
}

/** Outcome of requesting a gated browser permission/capability. */
export type PermissionRequestResult =
  | { readonly status: "granted" }
  | { readonly status: "denied" }
  | { readonly status: "unsupported"; readonly reason: string }
  | { readonly status: "blocked-no-gesture"; readonly reason: string };

/** Result of a quota/count check (e.g. max saved custom backgrounds). */
export interface QuotaCheckResult {
  readonly ok: boolean;
  readonly reason?: string;
  readonly currentCount?: number;
  readonly maxCount?: number;
}

/** Best-effort snapshot of `navigator.storage.estimate()`. */
export interface StorageEstimateSnapshot {
  readonly usageBytes: number | null;
  readonly quotaBytes: number | null;
  readonly usageRatio: number | null;
  readonly supported: boolean;
}
