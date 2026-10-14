import { describe, expect, it } from "vitest";
import { inflateSync } from "node:zlib";
import { pngDimensions, renderPinPng } from "@/lib/render";
import { estimateLines, fitFontSize } from "@/lib/render/fit";
import { COLOR_PRESETS, contrastRatio, DEFAULT_DESIGN, normalizeDesign, readableTextColor } from "@/lib/pins/design";
import { TEMPLATE_IDS } from "@/types/domain";

// 2×2 red PNG
const RED_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP4z8DAwMDAxAAADXABBfTdUl8AAAAASUVORK5CYII=",
  "base64",
);

describe("pin renderer", () => {
  it.each(TEMPLATE_IDS)("renders %s at 1000×1500 with and without an image", async (template) => {
    for (const withImage of [true, false]) {
      const png = await renderPinPng({
        headline: "A very long headline that keeps going and going to test fitting and clamping behaviour in the template",
        subheadline: "Supporting text ".repeat(20),
        bullets: ["One benefit that is fairly long", "Two", "Three", "Four"],
        cta: "Get the planner today",
        storeName: "A store with an unusually long name for testing",
        design: { ...DEFAULT_DESIGN, template, showStoreName: true },
        image: withImage ? { dataUri: `data:image/png;base64,${RED_PNG.toString("base64")}`, width: 2, height: 2 } : null,
      });
      expect(pngDimensions(png)).toEqual({ width: 1000, height: 1500 });
    }
  });

  it("renders scaled previews from the same layout", async () => {
    const png = await renderPinPng({ headline: "Hi", subheadline: "", bullets: [], cta: "", storeName: null, design: DEFAULT_DESIGN, image: null }, 0.5);
    expect(pngDimensions(png)).toEqual({ width: 500, height: 750 });
  });

  it("is deterministic (cache and re-render agree)", async () => {
    const input = { headline: "Same", subheadline: "x", bullets: [], cta: "Go", storeName: null, design: { ...DEFAULT_DESIGN, template: "benefits" as const }, image: null };
    const a = await renderPinPng(input, 0.3);
    const b = await renderPinPng({ ...input }, 0.3);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });

  it("does not leave the background blank (text is drawn)", async () => {
    const png = await renderPinPng({ headline: "Visible", subheadline: "", bullets: [], cta: "", storeName: null, design: { ...DEFAULT_DESIGN, background: "#ffffff", textColor: "#000000" }, image: null }, 0.2);
    // Decode IDAT and check some pixels are dark.
    const buf = Buffer.from(png);
    const chunks: Buffer[] = [];
    let off = 8;
    while (off < buf.length) {
      const len = buf.readUInt32BE(off);
      const type = buf.toString("ascii", off + 4, off + 8);
      if (type === "IDAT") chunks.push(buf.subarray(off + 8, off + 8 + len));
      off += 12 + len;
    }
    const raw = inflateSync(Buffer.concat(chunks));
    let dark = 0;
    for (let i = 0; i < raw.length; i += 4) if (raw[i] < 80 && raw[i + 1] < 80 && raw[i + 2] < 80) dark++;
    expect(dark).toBeGreaterThan(50);
  });
});

describe("text fitting", () => {
  it("shrinks long text and keeps short text large", () => {
    const opts = { maxWidth: 840, maxLines: 3, max: 100, min: 40, widthFactor: 0.56 };
    expect(fitFontSize("Short", opts)).toBe(100);
    expect(fitFontSize("A much longer headline that will need to wrap over several lines to fit", opts)).toBeLessThan(100);
    expect(estimateLines("", 50, 800, 0.5)).toBe(0);
    expect(estimateLines("supercalifragilisticexpialidocious", 100, 400, 0.6)).toBeGreaterThan(1);
  });
});

describe("design helpers", () => {
  it("normalizes untrusted design JSON", () => {
    const d = normalizeDesign({ template: "evil", background: "url(x)", imageIndex: 99, fontPreset: "bold", showStoreName: "yes" });
    expect(d.template).toBe(DEFAULT_DESIGN.template);
    expect(d.background).toBe(DEFAULT_DESIGN.background);
    expect(d.imageIndex).toBe(9);
    expect(d.fontPreset).toBe("bold");
    expect(d.showStoreName).toBe(false);
  });
  it("guarantees readable text contrast", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(readableTextColor("#ffffff", "#f0f0f0")).toBe("#1f2421");
    for (const p of COLOR_PRESETS) expect(contrastRatio(p.background, p.textColor)).toBeGreaterThanOrEqual(4.5);
  });
});
