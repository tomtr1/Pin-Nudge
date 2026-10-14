import { z } from "zod";
import { TEMPLATE_IDS, type TemplateId } from "@/types/domain";

/**
 * Two layers of schemas:
 *  - "wire" schemas describe the JSON shape the model must return. They are
 *    sent to the provider as a structured-output JSON schema and are
 *    deliberately free of length constraints the provider can't enforce.
 *  - normalize* functions validate that output against PinNudge's real
 *    limits (counts, lengths, allowed templates) before anything is persisted.
 * Output that can't be normalized is rejected as invalid, never stored.
 */

export const angleWireSchema = z.object({
  name: z.string().describe("Short name for the marketing angle, 2-6 words."),
  audience: z.string().describe("Who this angle speaks to, specifically."),
  problem: z.string().describe("The problem or aspiration this audience has."),
  message: z.string().describe("The core marketing message for this angle, one sentence."),
  visualConcept: z.string().describe("How pins for this angle should look, one or two sentences."),
  keywords: z.array(z.string()).describe("3-6 search phrases a Pinterest user with this need might type."),
});

export const angleSetWireSchema = z.object({ angles: z.array(angleWireSchema) });
export type AngleWire = z.infer<typeof angleWireSchema>;

const templateEnum = z.enum(TEMPLATE_IDS);

export const pinCopyWireSchema = z.object({
  title: z.string().describe("Pinterest pin title, natural language, max 100 characters."),
  description: z.string().describe("Pinterest description, 2-4 helpful sentences, max 450 characters, no hashtag lists."),
  primaryKeyword: z.string().describe("The main search phrase this pin targets."),
  keywords: z.array(z.string()).describe("3-6 supporting search phrases."),
  creativeConcept: z.string().describe("One or two sentences describing the pin's visual idea."),
  headline: z.string().describe("Text overlay headline on the image, max 60 characters."),
  subheadline: z.string().describe("Optional supporting overlay line, max 110 characters; empty string if not needed."),
  bullets: z.array(z.string()).describe("0-4 very short overlay points (max 40 characters each) for list-style templates."),
  cta: z.string().describe("Short call to action, max 30 characters."),
  altText: z.string().describe("Accessible alt text describing the pin image, max 300 characters."),
  template: templateEnum.describe("Best-fitting layout template for this pin."),
});

export const pinWireSchema = pinCopyWireSchema.extend({
  angleIndex: z.number().int().describe("Zero-based index of the angle this pin belongs to."),
});
export const pinSetWireSchema = z.object({ pins: z.array(pinWireSchema) });
export type PinWire = z.infer<typeof pinWireSchema>;
export type PinCopyWire = z.infer<typeof pinCopyWireSchema>;

export const creativeWireSchema = pinCopyWireSchema.pick({
  creativeConcept: true,
  headline: true,
  subheadline: true,
  bullets: true,
  template: true,
});
export type CreativeWire = z.infer<typeof creativeWireSchema>;

// ---------------------------------------------------------------------------
// Normalization / strict validation
// ---------------------------------------------------------------------------
export class InvalidGenerationError extends Error {
  constructor(public readonly reason: string) {
    super(`Generated content failed validation: ${reason}`);
    this.name = "InvalidGenerationError";
  }
}

const clean = (s: unknown) =>
  typeof s === "string"
    ? s
        // Strip control characters and any markup the model might emit; output is
        // always rendered as plain text, but we store it clean regardless.
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
        .replace(/<[^>]{0,200}>/g, "")
        .replace(/\s+/g, " ")
        .trim()
    : "";

/** Trim to a limit at a word boundary, adding no ellipsis for titles/overlays. */
export function clampText(input: string, max: number): string {
  const s = clean(input);
  if (s.length <= max) return s;
  const cut = s.slice(0, max + 1);
  const space = cut.lastIndexOf(" ");
  return (space > max * 0.6 ? cut.slice(0, space) : s.slice(0, max)).replace(/[\s,;:–-]+$/, "");
}

function cleanList(list: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const v = clampText(String(item ?? ""), maxLen).replace(/^#/, "");
    if (!v || seen.has(v.toLowerCase())) continue;
    seen.add(v.toLowerCase());
    out.push(v);
    if (out.length >= maxItems) break;
  }
  return out;
}

export interface AngleDraft {
  name: string;
  audience: string;
  problem: string;
  message: string;
  visualConcept: string;
  keywords: string[];
}

export function normalizeAngles(raw: unknown, expected: number): AngleDraft[] {
  const parsed = angleSetWireSchema.safeParse(raw);
  if (!parsed.success) throw new InvalidGenerationError("angles did not match the schema");
  const angles = parsed.data.angles
    .map((a) => ({
      name: clampText(a.name, 120),
      audience: clampText(a.audience, 300),
      problem: clampText(a.problem, 500),
      message: clampText(a.message, 500),
      visualConcept: clampText(a.visualConcept, 500),
      keywords: cleanList(a.keywords, 8, 60),
    }))
    .filter((a) => a.name && a.message);
  const unique = angles.filter((a, i) => angles.findIndex((b) => b.name.toLowerCase() === a.name.toLowerCase()) === i);
  if (unique.length < expected) throw new InvalidGenerationError(`expected ${expected} distinct angles, got ${unique.length}`);
  return unique.slice(0, expected);
}

export interface PinCopyDraft {
  title: string;
  description: string;
  primaryKeyword: string;
  keywords: string[];
  creativeConcept: string;
  headline: string;
  subheadline: string;
  bullets: string[];
  cta: string;
  altText: string;
  template: TemplateId;
}

export interface PinDraft extends PinCopyDraft {
  angleIndex: number;
}

export function normalizePinCopy(p: PinCopyWire): PinCopyDraft {
  const draft: PinCopyDraft = {
    title: clampText(p.title, 100),
    description: clampText(p.description, 500),
    primaryKeyword: clampText(p.primaryKeyword, 80),
    keywords: cleanList(p.keywords, 8, 60),
    creativeConcept: clampText(p.creativeConcept, 500),
    headline: clampText(p.headline, 90),
    subheadline: clampText(p.subheadline, 140),
    bullets: cleanList(p.bullets, 4, 60),
    cta: clampText(p.cta, 40),
    altText: clampText(p.altText, 500),
    template: (TEMPLATE_IDS as readonly string[]).includes(p.template) ? p.template : "minimal",
  };
  if (!draft.title || !draft.description || !draft.headline) {
    throw new InvalidGenerationError("a pin is missing its title, description or headline");
  }
  return draft;
}

export function normalizePins(raw: unknown, expected: number, angleCount: number): PinDraft[] {
  const parsed = pinSetWireSchema.safeParse(raw);
  if (!parsed.success) throw new InvalidGenerationError("pins did not match the schema");
  const pins = parsed.data.pins.map((p) => ({
    ...normalizePinCopy(p),
    angleIndex: Number.isInteger(p.angleIndex) && p.angleIndex >= 0 && p.angleIndex < angleCount ? p.angleIndex : 0,
  }));
  if (pins.length < expected) throw new InvalidGenerationError(`expected ${expected} pins, got ${pins.length}`);
  const titles = new Set(pins.slice(0, expected).map((p) => p.title.toLowerCase()));
  if (titles.size < Math.ceil(expected * 0.8)) throw new InvalidGenerationError("pin titles were too repetitive");
  return pins.slice(0, expected);
}

export function normalizeCreative(raw: unknown): Pick<PinCopyDraft, "creativeConcept" | "headline" | "subheadline" | "bullets" | "template"> {
  const parsed = creativeWireSchema.safeParse(raw);
  if (!parsed.success) throw new InvalidGenerationError("creative concept did not match the schema");
  const c = parsed.data;
  const out = {
    creativeConcept: clampText(c.creativeConcept, 500),
    headline: clampText(c.headline, 90),
    subheadline: clampText(c.subheadline, 140),
    bullets: cleanList(c.bullets, 4, 60),
    template: (TEMPLATE_IDS as readonly string[]).includes(c.template) ? c.template : ("minimal" as TemplateId),
  };
  if (!out.headline) throw new InvalidGenerationError("creative concept is missing a headline");
  return out;
}
