import { FONT_PRESETS, IMAGE_PLACEMENTS, TEMPLATE_IDS, type PinDesign, type TemplateId } from "@/types/domain";

export const PIN_WIDTH = 1000;
export const PIN_HEIGHT = 1500;

export const TEMPLATE_META: Record<TemplateId, { name: string; description: string; usesBullets: boolean }> = {
  minimal: { name: "Minimal typography", description: "A single strong headline with generous space.", usesBullets: false },
  editorial: { name: "Editorial feature", description: "Magazine-style serif headline over a product image.", usesBullets: false },
  benefits: { name: "Benefits", description: "Headline plus three short benefits.", usesBullets: true },
  problem_solution: { name: "Problem → solution", description: "Names the problem, then presents the product as the fix.", usesBullets: false },
  checklist: { name: "Checklist", description: "A tick-list of what's inside or what it helps with.", usesBullets: true },
  mockup: { name: "Product showcase", description: "Large product image framed like a mockup card.", usesBullets: false },
};

export const COLOR_PRESETS: { name: string; background: string; textColor: string; accentColor: string }[] = [
  { name: "Sage", background: "#f4f1ea", textColor: "#24302a", accentColor: "#4f7a5f" },
  { name: "Charcoal", background: "#22262a", textColor: "#f6f3ec", accentColor: "#c9a86a" },
  { name: "Blush", background: "#f8ece8", textColor: "#3b2a2a", accentColor: "#b8635a" },
  { name: "Sky", background: "#e9f0f5", textColor: "#1e2d3a", accentColor: "#3c6188" },
  { name: "Sand", background: "#efe6d8", textColor: "#3a3027", accentColor: "#9a6b1c" },
  { name: "Paper", background: "#ffffff", textColor: "#1f2421", accentColor: "#1f2421" },
];

export const DEFAULT_DESIGN: PinDesign = {
  template: "minimal",
  background: COLOR_PRESETS[0].background,
  textColor: COLOR_PRESETS[0].textColor,
  accentColor: COLOR_PRESETS[0].accentColor,
  fontPreset: "modern",
  imagePlacement: "auto",
  imageIndex: 0,
  showStoreName: false,
};

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Coerce any stored/untrusted design JSON into a valid PinDesign. */
export function normalizeDesign(raw: unknown, fallback: PinDesign = DEFAULT_DESIGN): PinDesign {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pick = <T extends string>(value: unknown, allowed: readonly T[], def: T): T =>
    typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : def;
  const color = (value: unknown, def: string) => (typeof value === "string" && HEX.test(value) ? value : def);
  const idx = typeof r.imageIndex === "number" && Number.isInteger(r.imageIndex) ? Math.min(9, Math.max(0, r.imageIndex)) : fallback.imageIndex;
  return {
    template: pick(r.template, TEMPLATE_IDS, fallback.template),
    background: color(r.background, fallback.background),
    textColor: color(r.textColor, fallback.textColor),
    accentColor: color(r.accentColor, fallback.accentColor),
    fontPreset: pick(r.fontPreset, FONT_PRESETS, fallback.fontPreset),
    imagePlacement: pick(r.imagePlacement, IMAGE_PLACEMENTS, fallback.imagePlacement),
    imageIndex: idx,
    showStoreName: typeof r.showStoreName === "boolean" ? r.showStoreName : fallback.showStoreName,
  };
}

/** WCAG relative luminance contrast ratio between two hex colours. */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Pick black or white text for a given background when contrast is too low. */
export function readableTextColor(background: string, preferred: string): string {
  if (contrastRatio(background, preferred) >= 4.5) return preferred;
  return contrastRatio(background, "#1f2421") >= contrastRatio(background, "#ffffff") ? "#1f2421" : "#ffffff";
}
