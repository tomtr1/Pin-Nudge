import { normalizeDesign } from "@/lib/pins/design";
import {
  EDITABLE_PIN_FIELDS,
  type Campaign,
  type CampaignAngle,
  type CampaignConfig,
  type EditablePinField,
  type Integration,
  type Pin,
  type PinMetric,
  type Product,
  type ProductImage,
  type ProductSnapshot,
  type Profile,
  type SubscriptionRecord,
  type UsageEvent,
} from "@/types/domain";
import type { AngleWrite, CampaignCreate, PinWrite, ProductWrite, ProfilePatch } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the database driver untyped */
type Row = Record<string, any>;

const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const strOrNull = (v: unknown) => (typeof v === "string" && v.length > 0 ? v : null);
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const num = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : Number(v));
const obj = (v: unknown): Record<string, any> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Row) : {});

export function toProfile(r: Row): Profile {
  return {
    id: r.id,
    displayName: strOrNull(r.display_name),
    storeName: strOrNull(r.store_name),
    etsyShopUrl: strOrNull(r.etsy_shop_url),
    pinterestProfileUrl: strOrNull(r.pinterest_profile_url),
    productTypes: arr(r.product_types),
    visualStyle: strOrNull(r.visual_style),
    targetAudience: strOrNull(r.target_audience),
    marketingGoals: arr(r.marketing_goals),
    preferredLanguage: str(r.preferred_language, "en"),
    destinationBehavior: (["product_url", "shop_url", "ask"].includes(r.destination_behavior) ? r.destination_behavior : "product_url") as Profile["destinationBehavior"],
    campaignDefaults: obj(r.campaign_defaults),
    onboardingCompleted: Boolean(r.onboarding_completed),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function fromProfilePatch(p: ProfilePatch): Row {
  const out: Row = {};
  if (p.displayName !== undefined) out.display_name = p.displayName;
  if (p.storeName !== undefined) out.store_name = p.storeName;
  if (p.etsyShopUrl !== undefined) out.etsy_shop_url = p.etsyShopUrl;
  if (p.pinterestProfileUrl !== undefined) out.pinterest_profile_url = p.pinterestProfileUrl;
  if (p.productTypes !== undefined) out.product_types = p.productTypes;
  if (p.visualStyle !== undefined) out.visual_style = p.visualStyle;
  if (p.targetAudience !== undefined) out.target_audience = p.targetAudience;
  if (p.marketingGoals !== undefined) out.marketing_goals = p.marketingGoals;
  if (p.preferredLanguage !== undefined) out.preferred_language = p.preferredLanguage;
  if (p.destinationBehavior !== undefined) out.destination_behavior = p.destinationBehavior;
  if (p.campaignDefaults !== undefined) out.campaign_defaults = p.campaignDefaults;
  if (p.onboardingCompleted !== undefined) out.onboarding_completed = p.onboardingCompleted;
  return out;
}

function toImages(v: unknown): ProductImage[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((i) => i && typeof i === "object" && typeof i.path === "string")
    .map((i) => ({ path: i.path, contentType: str(i.contentType, "image/png"), width: num(i.width), height: num(i.height) }));
}

export function toProduct(r: Row): Product {
  return {
    id: r.id,
    userId: r.user_id,
    name: str(r.name),
    description: str(r.description),
    category: str(r.category, "other"),
    targetAudience: str(r.target_audience),
    mainBenefit: str(r.main_benefit),
    keywords: arr(r.keywords),
    destinationUrl: strOrNull(r.destination_url),
    images: toImages(r.images),
    visualStyle: str(r.visual_style),
    price: num(r.price),
    currency: strOrNull(r.currency),
    tags: arr(r.tags),
    isSample: Boolean(r.is_sample),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function fromProductWrite(p: Partial<ProductWrite>): Row {
  const out: Row = {};
  if (p.name !== undefined) out.name = p.name;
  if (p.description !== undefined) out.description = p.description;
  if (p.category !== undefined) out.category = p.category;
  if (p.targetAudience !== undefined) out.target_audience = p.targetAudience;
  if (p.mainBenefit !== undefined) out.main_benefit = p.mainBenefit;
  if (p.keywords !== undefined) out.keywords = p.keywords;
  if (p.destinationUrl !== undefined) out.destination_url = p.destinationUrl;
  if (p.images !== undefined) out.images = p.images;
  if (p.visualStyle !== undefined) out.visual_style = p.visualStyle;
  if (p.price !== undefined) out.price = p.price;
  if (p.currency !== undefined) out.currency = p.currency;
  if (p.tags !== undefined) out.tags = p.tags;
  if (p.isSample !== undefined) out.is_sample = p.isSample;
  return out;
}

export function toCampaign(r: Row): Campaign {
  return {
    id: r.id,
    userId: r.user_id,
    productId: r.product_id ?? null,
    name: str(r.name),
    objective: str(r.objective, "traffic"),
    targetAudience: str(r.target_audience),
    language: str(r.language, "en"),
    config: obj(r.config) as CampaignConfig,
    productSnapshot: obj(r.product_snapshot) as ProductSnapshot,
    status: r.status,
    generationSource: r.generation_source ?? null,
    aiModel: r.ai_model ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function fromCampaignWrite(p: Partial<CampaignCreate>): Row {
  const out: Row = {};
  if (p.productId !== undefined) out.product_id = p.productId;
  if (p.name !== undefined) out.name = p.name;
  if (p.objective !== undefined) out.objective = p.objective;
  if (p.targetAudience !== undefined) out.target_audience = p.targetAudience;
  if (p.language !== undefined) out.language = p.language;
  if (p.config !== undefined) out.config = p.config;
  if (p.productSnapshot !== undefined) out.product_snapshot = p.productSnapshot;
  if (p.status !== undefined) out.status = p.status;
  if (p.generationSource !== undefined) out.generation_source = p.generationSource;
  if (p.aiModel !== undefined) out.ai_model = p.aiModel;
  return out;
}

export function toAngle(r: Row): CampaignAngle {
  return {
    id: r.id,
    campaignId: r.campaign_id,
    userId: r.user_id,
    position: Number(r.position ?? 0),
    name: str(r.name),
    audience: str(r.audience),
    problem: str(r.problem),
    message: str(r.message),
    visualConcept: str(r.visual_concept),
    keywords: arr(r.keywords),
    selected: r.selected !== false,
    createdAt: r.created_at,
  };
}

export function fromAngleWrite(a: Partial<AngleWrite>): Row {
  const out: Row = {};
  if (a.position !== undefined) out.position = a.position;
  if (a.name !== undefined) out.name = a.name;
  if (a.audience !== undefined) out.audience = a.audience;
  if (a.problem !== undefined) out.problem = a.problem;
  if (a.message !== undefined) out.message = a.message;
  if (a.visualConcept !== undefined) out.visual_concept = a.visualConcept;
  if (a.keywords !== undefined) out.keywords = a.keywords;
  if (a.selected !== undefined) out.selected = a.selected;
  return out;
}

export function toPin(r: Row): Pin {
  return {
    id: r.id,
    campaignId: r.campaign_id,
    userId: r.user_id,
    productId: r.product_id ?? null,
    angleId: r.angle_id ?? null,
    position: Number(r.position ?? 0),
    title: str(r.title),
    description: str(r.description),
    primaryKeyword: str(r.primary_keyword),
    keywords: arr(r.keywords),
    creativeConcept: str(r.creative_concept),
    headline: str(r.headline),
    subheadline: str(r.subheadline),
    bullets: arr(r.bullets),
    cta: str(r.cta),
    destinationUrl: strOrNull(r.destination_url),
    altText: str(r.alt_text),
    filename: str(r.filename),
    design: normalizeDesign(r.design),
    editedFields: arr(r.edited_fields).filter((f): f is EditablePinField => (EDITABLE_PIN_FIELDS as readonly string[]).includes(f)),
    status: r.status,
    plannedFor: r.planned_for ?? null,
    publishedAt: r.published_at ?? null,
    publishedMethod: r.published_method ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function fromPinWrite(p: Partial<PinWrite>): Row {
  const out: Row = {};
  const map: [keyof PinWrite, string][] = [
    ["productId", "product_id"],
    ["angleId", "angle_id"],
    ["position", "position"],
    ["title", "title"],
    ["description", "description"],
    ["primaryKeyword", "primary_keyword"],
    ["keywords", "keywords"],
    ["creativeConcept", "creative_concept"],
    ["headline", "headline"],
    ["subheadline", "subheadline"],
    ["bullets", "bullets"],
    ["cta", "cta"],
    ["destinationUrl", "destination_url"],
    ["altText", "alt_text"],
    ["filename", "filename"],
    ["design", "design"],
    ["editedFields", "edited_fields"],
    ["status", "status"],
    ["plannedFor", "planned_for"],
    ["publishedAt", "published_at"],
    ["publishedMethod", "published_method"],
  ];
  for (const [k, col] of map) if (p[k] !== undefined) out[col] = p[k];
  return out;
}

export function toMetric(r: Row): PinMetric {
  return {
    id: r.id,
    pinId: r.pin_id,
    userId: r.user_id,
    source: r.source,
    periodStart: str(r.period_start).slice(0, 10),
    periodEnd: str(r.period_end).slice(0, 10),
    impressions: num(r.impressions),
    saves: num(r.saves),
    pinClicks: num(r.pin_clicks),
    outboundClicks: num(r.outbound_clicks),
    notes: strOrNull(r.notes),
    createdAt: r.created_at,
  };
}

export function toSubscription(r: Row): SubscriptionRecord {
  return {
    userId: r.user_id,
    stripeCustomerId: r.stripe_customer_id ?? null,
    stripeSubscriptionId: r.stripe_subscription_id ?? null,
    stripePriceId: r.stripe_price_id ?? null,
    plan: r.plan ?? "free",
    status: r.status ?? "none",
    currentPeriodEnd: r.current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(r.cancel_at_period_end),
    lastEventAt: r.last_event_at ?? null,
    updatedAt: r.updated_at ?? null,
  };
}

export function fromSubscriptionPatch(p: Partial<SubscriptionRecord>): Row {
  const out: Row = {};
  if (p.stripeCustomerId !== undefined) out.stripe_customer_id = p.stripeCustomerId;
  if (p.stripeSubscriptionId !== undefined) out.stripe_subscription_id = p.stripeSubscriptionId;
  if (p.stripePriceId !== undefined) out.stripe_price_id = p.stripePriceId;
  if (p.plan !== undefined) out.plan = p.plan;
  if (p.status !== undefined) out.status = p.status;
  if (p.currentPeriodEnd !== undefined) out.current_period_end = p.currentPeriodEnd;
  if (p.cancelAtPeriodEnd !== undefined) out.cancel_at_period_end = p.cancelAtPeriodEnd;
  if (p.lastEventAt !== undefined) out.last_event_at = p.lastEventAt;
  return out;
}

export function toUsage(r: Row): UsageEvent {
  return {
    id: r.id,
    userId: r.user_id,
    kind: r.kind,
    quantity: Number(r.quantity ?? 1),
    metadata: obj(r.metadata),
    costEstimateUsd: num(r.cost_estimate_usd),
    createdAt: r.created_at,
  };
}

export function toIntegration(r: Row): Integration {
  return {
    provider: r.provider,
    status: r.status,
    externalAccountId: r.external_account_id ?? null,
    scopes: arr(r.scopes),
    lastSyncedAt: r.last_synced_at ?? null,
  };
}
