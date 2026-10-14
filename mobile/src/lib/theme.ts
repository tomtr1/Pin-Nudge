/**
 * The same editorial look as the website: warm paper background, deep ink
 * text, flat colour blocks, square corners and an offset ink shadow.
 */
export const colors = {
  background: "#fbfaf7",
  ink: "#13203a",
  surface: "#ffffff",
  surfaceMuted: "#f3f1ec",
  border: "#e2e0d8",
  muted: "#4f586b",
  accent: "#167a4a",
  accentSoft: "#dcf3d3",
  accentSoftInk: "#0f4d2e",
  mint: "#dcf3d3",
  mintLine: "#bfe4b2",
  blush: "#fde1d9",
  blushLine: "#f6bfb0",
  sky: "#d7e8fb",
  skyLine: "#afcdf1",
  butter: "#fbf2c0",
  butterLine: "#ecdc8d",
  tomato: "#e4573d",
  cobalt: "#2a55d6",
  sun: "#f0bf2e",
  danger: "#b33a2b",
  dangerSoft: "#fbe5e1",
  warning: "#8a5c0f",
  warningSoft: "#fbf1d6",
  info: "#23488f",
  infoSoft: "#e3ecfa",
} as const;

export type BlockColor = "mint" | "blush" | "sky" | "butter";
export const blocks: Record<BlockColor, { fill: string; line: string }> = {
  mint: { fill: colors.mint, line: colors.mintLine },
  blush: { fill: colors.blush, line: colors.blushLine },
  sky: { fill: colors.sky, line: colors.skyLine },
  butter: { fill: colors.butter, line: colors.butterLine },
};

export const fonts = {
  display: "Newsreader_500Medium",
  displayItalic: "Newsreader_400Regular_Italic",
  body: "InstrumentSans_400Regular",
  medium: "InstrumentSans_500Medium",
  semibold: "InstrumentSans_600SemiBold",
  hand: "Caveat_600SemiBold",
} as const;

export const radius = 4;
export const space = (n: number) => n * 4;
