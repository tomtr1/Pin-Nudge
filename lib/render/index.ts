import "server-only";
import { createHash } from "node:crypto";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import { PIN_HEIGHT, PIN_WIDTH } from "@/lib/pins/design";
import { loadFonts, loadGrain } from "./fonts";
import { buildPinElement, type PinRenderInput } from "./templates";

export type { PinRenderInput } from "./templates";

/**
 * Deterministic pin renderer: template + data → PNG (1000×1500). The same
 * function produces on-screen previews and exported files, so what a seller
 * sees is exactly what they download. Rendering is local; no external image
 * service is called.
 */
const CACHE_LIMIT = 64;
const cache = new Map<string, Uint8Array>();

function cacheKey(input: PinRenderInput, scale: number) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the grain texture is constant
  const { image, grain, ...rest } = input;
  return createHash("sha1")
    .update(JSON.stringify({ rest, scale, image: image ? createHash("sha1").update(image.dataUri).digest("hex") : null }))
    .digest("hex");
}

export async function renderPinSvg(input: PinRenderInput): Promise<string> {
  const [fonts, grain] = await Promise.all([loadFonts(), input.grain === undefined ? loadGrain() : Promise.resolve(input.grain)]);
  return satori(buildPinElement({ ...input, grain }), { width: PIN_WIDTH, height: PIN_HEIGHT, fonts });
}

/** Render to PNG. `scale` < 1 produces smaller previews from the same layout. */
export async function renderPinPng(input: PinRenderInput, scale = 1): Promise<Uint8Array> {
  const key = cacheKey(input, scale);
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const svg = await renderPinSvg(input);
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: Math.round(PIN_WIDTH * scale) }, font: { loadSystemFonts: false } });
  const png = new Uint8Array(resvg.render().asPng());
  cache.set(key, png);
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  return png;
}

export function toDataUri(bytes: Uint8Array, contentType: string): string {
  return `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
}

/** Read PNG dimensions from the IHDR chunk (used by tests and export checks). */
export function pngDimensions(png: Uint8Array): { width: number; height: number } | null {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.length < 24 || !sig.every((b, i) => png[i] === b)) return null;
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}
