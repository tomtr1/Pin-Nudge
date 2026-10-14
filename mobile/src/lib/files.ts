/**
 * Native (iOS) file operations. The web preview build uses files.web.ts instead,
 * because expo-media-library has no web implementation.
 */
import { File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { authHeaders, freshToken, pinImageUrl } from "./api";

function safeName(name: string) {
  return (name || "pin").toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "pin";
}

/** Downloads the full-size (1000×1500) PNG of a saved pin to the app cache. */
async function downloadPin(pinId: string, filename: string): Promise<File> {
  await freshToken();
  const target = new File(Paths.cache, `${safeName(filename)}.png`);
  return File.downloadFileAsync(`${pinImageUrl(pinId, "full")}&download=1`, target, { headers: authHeaders(), idempotent: true });
}

export type SaveResult = "saved" | "denied" | "unsupported";

/** Saves a pin image to the Photos library (asks for add-only access the first time). */
export async function savePinToPhotos(pinId: string, filename: string): Promise<SaveResult> {
  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) return "denied";
  const file = await downloadPin(pinId, filename);
  await MediaLibrary.Asset.create(file.uri);
  return "saved";
}

/** Opens the iOS share sheet for a pin image (e.g. to post it with the Pinterest app). */
export async function sharePin(pinId: string, filename: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  const file = await downloadPin(pinId, filename);
  await Sharing.shareAsync(file.uri, { mimeType: "image/png", UTI: "public.png", dialogTitle: "Share pin" });
  return true;
}
