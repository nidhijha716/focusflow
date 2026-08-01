import { z } from "zod";

/**
 * Custom background record — IndexedDB store `backgrounds` (focusflow DB).
 * Source: 03_Local_Data_Schema.pdf, section 8.
 *
 * `blob` is validated with `instanceof` rather than a deep zod check since
 * zod cannot introspect binary content; byte-level/format validation of the
 * image itself is expected to be layered on by Agent 4 (security).
 */
export const BackgroundMimeTypeSchema = z.enum([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export type BackgroundMimeType = z.infer<typeof BackgroundMimeTypeSchema>;

export const BackgroundRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  mimeType: BackgroundMimeTypeSchema,
  blob: z.instanceof(Blob),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  byteSize: z.number().int().positive(),
  createdAt: z.number(),
});

export type BackgroundRecord = z.infer<typeof BackgroundRecordSchema>;

export const NewBackgroundInputSchema = BackgroundRecordSchema.omit({
  id: true,
  createdAt: true,
});

export type NewBackgroundInput = z.infer<typeof NewBackgroundInputSchema>;
