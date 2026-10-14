import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { FontPreset } from "@/types/domain";

type Weight = 400 | 500 | 600 | 700;
type SatoriFont = { name: string; data: Buffer; weight: Weight; style: "normal" | "italic" };

const FILES: { name: string; file: string; weight: Weight; style?: "italic" }[] = [
  { name: "Newsreader", file: "newsreader-latin-500-normal.woff", weight: 500 },
  { name: "Newsreader", file: "newsreader-latin-ext-500-normal.woff", weight: 500 },
  { name: "Newsreader", file: "newsreader-latin-400-italic.woff", weight: 400, style: "italic" },
  { name: "Newsreader", file: "newsreader-latin-ext-400-italic.woff", weight: 400, style: "italic" },
  { name: "Instrument Sans", file: "instrument-sans-latin-500-normal.woff", weight: 500 },
  { name: "Instrument Sans", file: "instrument-sans-latin-ext-500-normal.woff", weight: 500 },
  { name: "Instrument Sans", file: "instrument-sans-latin-600-normal.woff", weight: 600 },
  { name: "Instrument Sans", file: "instrument-sans-latin-ext-600-normal.woff", weight: 600 },
  { name: "Instrument Sans", file: "instrument-sans-latin-700-normal.woff", weight: 700 },
  { name: "Instrument Sans", file: "instrument-sans-latin-ext-700-normal.woff", weight: 700 },
  { name: "Caveat", file: "caveat-latin-600-normal.woff", weight: 600 },
  { name: "Caveat", file: "caveat-latin-ext-600-normal.woff", weight: 600 },
  { name: "Caveat", file: "caveat-latin-700-normal.woff", weight: 700 },
  { name: "Caveat", file: "caveat-latin-ext-700-normal.woff", weight: 700 },
  { name: "Playfair Display", file: "playfair-display-latin-700-normal.woff", weight: 700 },
  { name: "Playfair Display", file: "playfair-display-latin-ext-700-normal.woff", weight: 700 },
  { name: "Space Grotesk", file: "space-grotesk-latin-700-normal.woff", weight: 700 },
  { name: "Space Grotesk", file: "space-grotesk-latin-ext-700-normal.woff", weight: 700 },
];

let loaded: Promise<SatoriFont[]> | null = null;

export function loadFonts(): Promise<SatoriFont[]> {
  loaded ??= Promise.all(
    FILES.map(async (f) => ({
      name: f.name,
      weight: f.weight,
      style: f.style ?? ("normal" as const),
      data: await fs.readFile(path.join(process.cwd(), "assets", "fonts", f.file)),
    })),
  ).catch((e) => {
    loaded = null;
    throw e;
  });
  return loaded;
}

let grain: Promise<string> | null = null;

/** Tileable paper-grain texture as a data URI (generated noise, see assets/textures). */
export function loadGrain(): Promise<string> {
  grain ??= fs
    .readFile(path.join(process.cwd(), "assets", "textures", "grain.png"))
    .then((b) => `data:image/png;base64,${b.toString("base64")}`)
    .catch((e) => {
      grain = null;
      throw e;
    });
  return grain;
}

export interface TypePreset {
  heading: string;
  headingWeight: Weight;
  /** Average glyph width as a fraction of font size, used for text fitting. */
  widthFactor: number;
  uppercaseHeading: boolean;
  letterSpacing: number;
  lineHeight: number;
}

export const TYPE_PRESETS: Record<FontPreset, TypePreset> = {
  editorial: { heading: "Newsreader", headingWeight: 500, widthFactor: 0.52, uppercaseHeading: false, letterSpacing: -2.5, lineHeight: 1.0 },
  modern: { heading: "Instrument Sans", headingWeight: 700, widthFactor: 0.54, uppercaseHeading: false, letterSpacing: -2, lineHeight: 1.04 },
  classic: { heading: "Playfair Display", headingWeight: 700, widthFactor: 0.55, uppercaseHeading: false, letterSpacing: -1, lineHeight: 1.06 },
  bold: { heading: "Space Grotesk", headingWeight: 700, widthFactor: 0.62, uppercaseHeading: true, letterSpacing: -1, lineHeight: 1.0 },
};

export const BODY_FONT = "Instrument Sans";
export const HAND_FONT = "Caveat";
