import { describe, expect, it } from "vitest";
import { createDemoProvider } from "@/lib/ai/demo-provider";
import { anglesPrompt, SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { clampText, InvalidGenerationError, normalizeAngles, normalizeCreative, normalizePinCopy, normalizePins } from "@/lib/ai/schemas";
import type { GenerationContext } from "@/lib/ai/types";

const ctx: GenerationContext = {
  product: {
    name: "Minimal Budget Planner",
    description: "Monthly budget planner",
    category: "spreadsheet",
    targetAudience: "young adults",
    mainBenefit: "See where your money goes",
    keywords: ["budget planner"],
    visualStyle: "minimal",
  },
  config: {
    objective: "traffic",
    pinCount: 7,
    angleCount: 3,
    tone: "friendly",
    visualStyle: "minimal",
    language: "en",
    primaryKeyword: "",
    cta: "Get the planner",
    season: "",
    variety: "balanced",
    template: "auto",
  },
  campaignAudience: "",
  hasProductImage: true,
  allowedTemplates: ["minimal", "benefits", "checklist"],
};

const angle = { name: "A", audience: "x", problem: "y", message: "m", visualConcept: "v", keywords: ["k"] };
const pin = {
  title: "Title",
  description: "Desc",
  primaryKeyword: "kw",
  keywords: ["a", "A", "#b"],
  creativeConcept: "c",
  headline: "Head",
  subheadline: "",
  bullets: [],
  cta: "Go",
  altText: "alt",
  template: "minimal" as const,
};

describe("AI output validation", () => {
  it("clamps at word boundaries", () => {
    expect(clampText("hello wonderful world", 17)).toBe("hello wonderful");
    expect(clampText("hello wonderful world", 12)).toBe("hello wonder"); // last space too early → hard cut
    expect(clampText("  spaced\n\ttext <b>x</b> ", 100)).toBe("spaced text x");
  });

  it("requires the requested number of distinct angles", () => {
    expect(normalizeAngles({ angles: [angle, { ...angle, name: "B" }] }, 2)).toHaveLength(2);
    expect(() => normalizeAngles({ angles: [angle, { ...angle }] }, 2)).toThrow(InvalidGenerationError);
    expect(() => normalizeAngles({ wrong: true }, 1)).toThrow(InvalidGenerationError);
    expect(() => normalizeAngles("not json", 1)).toThrow(InvalidGenerationError);
  });

  it("validates pins, dedupes keywords and clamps the angle index", () => {
    const pins = normalizePins({ pins: [{ ...pin, angleIndex: 9 }, { ...pin, title: "Other", angleIndex: 1 }] }, 2, 2);
    expect(pins[0].angleIndex).toBe(0);
    expect(pins[0].keywords).toEqual(["a", "b"]);
    expect(() => normalizePins({ pins: [{ ...pin, angleIndex: 0 }] }, 2, 1)).toThrow(/expected 2 pins/);
    expect(() => normalizePins({ pins: [{ ...pin, angleIndex: 0 }, { ...pin, angleIndex: 0 }, { ...pin, angleIndex: 0 }] }, 3, 1)).toThrow(/repetitive/);
    expect(() => normalizePinCopy({ ...pin, title: "" })).toThrow(InvalidGenerationError);
    expect(normalizePinCopy({ ...pin, title: "x".repeat(300) }).title.length).toBeLessThanOrEqual(100);
    expect(normalizePinCopy({ ...pin, template: "fancy" as never }).template).toBe("minimal");
  });

  it("validates creative concepts", () => {
    expect(normalizeCreative({ creativeConcept: "c", headline: "h", subheadline: "", bullets: [], template: "checklist" }).template).toBe("checklist");
    expect(() => normalizeCreative({ creativeConcept: "c", headline: "", subheadline: "", bullets: [], template: "minimal" })).toThrow();
  });

  it("keeps seller text inside data delimiters and never sends account data", () => {
    const prompt = anglesPrompt(ctx, 3);
    expect(prompt).toContain("<product>");
    expect(prompt).toContain("exactly 3 distinct marketing angles");
    expect(SYSTEM_PROMPT).toMatch(/Never invent statistics, search volumes/);
    expect(prompt).not.toMatch(/@|https?:\/\//);
  });
});

describe("demo provider", () => {
  it("produces schema-valid, varied sample output that is marked as demo", async () => {
    const p = createDemoProvider();
    const angles = await p.generateAngles(ctx, 3);
    expect(angles.source).toBe("demo");
    expect(normalizeAngles({ angles: angles.data }, 3)).toHaveLength(3);
    const pins = await p.generatePins(ctx, angles.data, 7);
    expect(pins.source).toBe("demo");
    const normalized = normalizePins({ pins: pins.data }, 7, 3);
    expect(new Set(normalized.map((x) => x.title)).size).toBe(7);
    expect(normalized.every((x) => ctx.allowedTemplates.includes(x.template))).toBe(true);
    const regen = await p.regeneratePinCopy(ctx, angles.data[0], { ...pin, title: normalized[0].title }, normalized.map((x) => x.title));
    expect(regen.data.title).not.toBe(normalized[0].title);
  });
});
