import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { FontPreset } from "@/types/domain";

type SatoriFont = { name: string; data: Buffer; weight: 400 | 600 | 700 | 800; style: "normal" };

const FILES: { name: string; file: string; weight: SatoriFont["weight"] }[] = [
  { name: "Inter", file: "inter-latin-400-normal.woff", weight: 400 },
  { name: "Inter", file: "inter-latin-ext-400-normal.woff", weight: 400 },
  { name: "Inter", file: "inter-latin-600-normal.woff", weight: 600 },
  { name: "Inter", file: "inter-latin-ext-600-normal.woff", weight: 600 },
  { name: "Inter", file: "inter-latin-800-normal.woff", weight: 800 },
  { name: "Inter", file: "inter-latin-ext-800-normal.woff", weight: 800 },
  { name: "DM Serif Display", file: "dm-serif-display-latin-400-normal.woff", weight: 400 },
  { name: "DM Serif Display", file: "dm-serif-display-latin-ext-400-normal.woff", weight: 400 },
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
      style: "normal" as const,
      data: await fs.readFile(path.join(process.cwd(), "assets", "fonts", f.file)),
    })),
  ).catch((e) => {
    loaded = null;
    throw e;
  });
  return loaded;
}

export interface TypePreset {
  heading: string;
  headingWeight: 400 | 600 | 700 | 800;
  /** Average glyph width as a fraction of font size, used for text fitting. */
  widthFactor: number;
  uppercaseHeading: boolean;
  letterSpacing: number;
}

export const TYPE_PRESETS: Record<FontPreset, TypePreset> = {
  modern: { heading: "Inter", headingWeight: 800, widthFactor: 0.56, uppercaseHeading: false, letterSpacing: -1.5 },
  editorial: { heading: "DM Serif Display", headingWeight: 400, widthFactor: 0.5, uppercaseHeading: false, letterSpacing: -0.5 },
  classic: { heading: "Playfair Display", headingWeight: 700, widthFactor: 0.55, uppercaseHeading: false, letterSpacing: -0.5 },
  bold: { heading: "Space Grotesk", headingWeight: 700, widthFactor: 0.62, uppercaseHeading: true, letterSpacing: -0.5 },
};
