/**
 * Upload validation. File type is decided from the file's magic bytes, not
 * from the browser-supplied name or MIME type. Only PNG and JPEG are accepted
 * because those are the formats the pin renderer can embed reliably.
 */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES_PER_PRODUCT = 6;
export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg"] as const;
export const ACCEPT_ATTRIBUTE = ".png,.jpg,.jpeg,image/png,image/jpeg";

export type ImageCheck =
  | { ok: true; contentType: "image/png" | "image/jpeg"; extension: "png" | "jpg" }
  | { ok: false; error: string };

export function sniffImage(bytes: Uint8Array): ImageCheck {
  if (bytes.length === 0) return { ok: false, error: "The file is empty." };
  if (bytes.length > MAX_UPLOAD_BYTES) return { ok: false, error: "Images must be 5 MB or smaller." };
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((b, i) => bytes[i] === b)) return { ok: true, contentType: "image/png", extension: "png" };
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ok: true, contentType: "image/jpeg", extension: "jpg" };
  return { ok: false, error: "Please upload a PNG or JPEG image." };
}
