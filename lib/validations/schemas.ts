import { z } from "zod";
import {
  CATEGORY_VALUES,
  LANGUAGE_VALUES,
  MARKETING_GOAL_VALUES,
  OBJECTIVE_VALUES,
  TONE_VALUES,
  VISUAL_STYLE_VALUES,
} from "@/lib/constants";
import { FONT_PRESETS, IMAGE_PLACEMENTS, TEMPLATE_IDS } from "@/types/domain";
import { normalizeUrl } from "./url";

/** Accepts an array or a comma/newline separated string; trims and de-duplicates. */
export function parseList(input: unknown): string[] {
  const items = Array.isArray(input)
    ? input.map((v) => String(v))
    : typeof input === "string"
      ? input.split(/[,\n]/)
      : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const v = item.trim().replace(/\s+/g, " ");
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

export const keywordList = (maxItems: number, maxLen = 60) =>
  z.preprocess(parseList, z.array(z.string().max(maxLen, `Keep each keyword under ${maxLen} characters.`)).max(maxItems, `Use at most ${maxItems} keywords.`));

export const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .optional()
  .nullable()
  .transform((v, ctx) => {
    if (!v) return null;
    const res = normalizeUrl(v);
    if (!res.ok) {
      ctx.addIssue({ code: "custom", message: res.error });
      return z.NEVER;
    }
    return res.url;
  });

export const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex colour like #4f7a5f.");

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
export const productInputSchema = z.object({
  name: z.string().trim().min(2, "Give the product a name.").max(140),
  description: z.string().trim().max(2000).default(""),
  category: z.enum(CATEGORY_VALUES).default("other"),
  targetAudience: z.string().trim().max(300).default(""),
  mainBenefit: z.string().trim().max(300).default(""),
  keywords: keywordList(20),
  destinationUrl: optionalUrl,
  visualStyle: z.union([z.enum(VISUAL_STYLE_VALUES), z.literal("")]).default(""),
  price: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(String(v).replace(",", "."))),
    z.number().min(0, "Price can't be negative.").max(100000).nullable(),
  ),
  currency: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim().toUpperCase() : null),
    z.string().length(3).nullable(),
  ),
  tags: keywordList(15, 40),
});
export type ProductInput = z.infer<typeof productInputSchema>;

// ---------------------------------------------------------------------------
// Profile / onboarding
// ---------------------------------------------------------------------------
export const profileInputSchema = z.object({
  displayName: z.string().trim().max(80).optional().nullable().transform((v) => v || null),
  storeName: z.string().trim().max(120).optional().nullable().transform((v) => v || null),
  etsyShopUrl: optionalUrl,
  pinterestProfileUrl: optionalUrl,
  productTypes: z.preprocess(parseList, z.array(z.enum(CATEGORY_VALUES)).max(9)),
  visualStyle: z.union([z.enum(VISUAL_STYLE_VALUES), z.literal("")]).optional().nullable().transform((v) => v || null),
  targetAudience: z.string().trim().max(300).optional().nullable().transform((v) => v || null),
  marketingGoals: z.preprocess(parseList, z.array(z.enum(MARKETING_GOAL_VALUES)).max(5)),
  preferredLanguage: z.enum(LANGUAGE_VALUES).default("en"),
  destinationBehavior: z.enum(["product_url", "shop_url", "ask"]).default("product_url"),
});
export type ProfileInput = z.infer<typeof profileInputSchema>;

export const campaignDefaultsSchema = z.object({
  tone: z.enum(TONE_VALUES).optional(),
  pinCount: z.coerce.number().int().min(1).max(20).optional(),
  template: z.enum(TEMPLATE_IDS).optional(),
  fontPreset: z.enum(FONT_PRESETS).optional(),
  cta: z.string().trim().max(40).optional(),
  background: hexColor.optional(),
  textColor: hexColor.optional(),
  accentColor: hexColor.optional(),
});

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------
export const campaignConfigSchema = z.object({
  objective: z.enum(OBJECTIVE_VALUES).default("traffic"),
  pinCount: z.coerce.number().int().min(1, "Generate at least one pin.").max(20, "Generate at most 20 pins at a time."),
  angleCount: z.coerce.number().int().min(1).max(6),
  tone: z.enum(TONE_VALUES).default("friendly"),
  visualStyle: z.enum(VISUAL_STYLE_VALUES).default("minimal"),
  language: z.enum(LANGUAGE_VALUES).default("en"),
  primaryKeyword: z.string().trim().max(80).default(""),
  cta: z.string().trim().max(40).default(""),
  season: z.string().trim().max(80).default(""),
  variety: z.enum(["focused", "balanced", "broad"]).default("balanced"),
  template: z.union([z.enum(TEMPLATE_IDS), z.literal("auto")]).default("auto"),
});
export type CampaignConfigInput = z.infer<typeof campaignConfigSchema>;

export const campaignCreateSchema = z
  .object({
    productId: z.uuid("Choose a product."),
    name: z.string().trim().max(160).default(""),
    targetAudience: z.string().trim().max(300).default(""),
    config: campaignConfigSchema,
  })
  .refine((v) => v.config.angleCount <= v.config.pinCount, {
    message: "You need at least one pin per angle. Reduce the number of angles or add more pins.",
    path: ["config", "angleCount"],
  });

export const angleEditSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(120),
  audience: z.string().trim().max(300),
  problem: z.string().trim().max(500),
  message: z.string().trim().max(500),
  visualConcept: z.string().trim().max(500),
  keywords: keywordList(15),
  selected: z.boolean(),
});

// ---------------------------------------------------------------------------
// Pins
// ---------------------------------------------------------------------------
export const pinDesignSchema = z.object({
  template: z.enum(TEMPLATE_IDS),
  background: hexColor,
  textColor: hexColor,
  accentColor: hexColor,
  fontPreset: z.enum(FONT_PRESETS),
  imagePlacement: z.enum(IMAGE_PLACEMENTS),
  imageIndex: z.number().int().min(0).max(9),
  showStoreName: z.boolean(),
});

export const pinEditSchema = z.object({
  title: z.string().trim().max(100, "Pinterest titles are limited to 100 characters."),
  description: z.string().trim().max(500, "Pinterest descriptions are limited to 500 characters."),
  primaryKeyword: z.string().trim().max(80),
  keywords: keywordList(15),
  creativeConcept: z.string().trim().max(500),
  headline: z.string().trim().max(90),
  subheadline: z.string().trim().max(140),
  bullets: z.preprocess(
    (v) => (typeof v === "string" ? v.split("\n") : v),
    z.array(z.string().trim().max(60)).transform((a) => a.filter(Boolean)).pipe(z.array(z.string()).max(5)),
  ),
  cta: z.string().trim().max(40),
  destinationUrl: optionalUrl,
  altText: z.string().trim().max(500),
  filename: z.string().trim().max(120),
  design: pinDesignSchema,
});
export type PinEditInput = z.infer<typeof pinEditSchema>;

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------
const optionalCount = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
  z.number().int("Use whole numbers.").min(0, "Counts can't be negative.").max(1_000_000_000).nullable(),
);

export const metricInputSchema = z
  .object({
    pinId: z.uuid(),
    periodStart: z.iso.date("Choose a start date."),
    periodEnd: z.iso.date("Choose an end date."),
    impressions: optionalCount,
    saves: optionalCount,
    pinClicks: optionalCount,
    outboundClicks: optionalCount,
    notes: z.string().trim().max(1000).optional().nullable().transform((v) => v || null),
  })
  .refine((v) => v.periodEnd >= v.periodStart, { message: "The end date must be on or after the start date.", path: ["periodEnd"] })
  .refine((v) => [v.impressions, v.saves, v.pinClicks, v.outboundClicks].some((n) => n !== null), {
    message: "Enter at least one metric.",
    path: ["impressions"],
  });
export type MetricInput = z.infer<typeof metricInputSchema>;

/** Flatten zod errors to { field: message } for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
