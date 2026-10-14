/**
 * Shared domain types. Database rows (snake_case) are mapped to these
 * camelCase shapes in the data layer so UI and services never touch raw rows.
 */

export type PlanId = "free" | "starter" | "growth" | "pro";

export type CampaignStatus = "draft" | "ready" | "planned" | "published" | "archived";
export type PinStatus = "draft" | "approved" | "published" | "archived";
export type GenerationSource = "ai" | "demo";
export type DestinationBehavior = "product_url" | "shop_url" | "ask";

export const TEMPLATE_IDS = [
  "minimal",
  "editorial",
  "benefits",
  "problem_solution",
  "checklist",
  "mockup",
] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const FONT_PRESETS = ["modern", "editorial", "classic", "bold"] as const;
export type FontPreset = (typeof FONT_PRESETS)[number];

export const IMAGE_PLACEMENTS = ["auto", "top", "middle", "bottom", "none"] as const;
export type ImagePlacement = (typeof IMAGE_PLACEMENTS)[number];

export interface PinDesign {
  template: TemplateId;
  background: string;
  textColor: string;
  accentColor: string;
  fontPreset: FontPreset;
  imagePlacement: ImagePlacement;
  imageIndex: number;
  showStoreName: boolean;
}

export interface CampaignDefaults {
  tone?: string;
  pinCount?: number;
  template?: TemplateId;
  fontPreset?: FontPreset;
  cta?: string;
  background?: string;
  textColor?: string;
  accentColor?: string;
}

export interface Profile {
  id: string;
  displayName: string | null;
  storeName: string | null;
  etsyShopUrl: string | null;
  pinterestProfileUrl: string | null;
  productTypes: string[];
  visualStyle: string | null;
  targetAudience: string | null;
  marketingGoals: string[];
  preferredLanguage: string;
  destinationBehavior: DestinationBehavior;
  campaignDefaults: CampaignDefaults;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  path: string;
  contentType: string;
  width?: number | null;
  height?: number | null;
}

export interface Product {
  id: string;
  userId: string;
  name: string;
  description: string;
  category: string;
  targetAudience: string;
  mainBenefit: string;
  keywords: string[];
  destinationUrl: string | null;
  images: ProductImage[];
  visualStyle: string;
  price: number | null;
  currency: string | null;
  tags: string[];
  isSample: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignConfig {
  objective: string;
  pinCount: number;
  angleCount: number;
  tone: string;
  visualStyle: string;
  language: string;
  primaryKeyword: string;
  cta: string;
  season: string;
  variety: "focused" | "balanced" | "broad";
  template: TemplateId | "auto";
}

export interface ProductSnapshot {
  name: string;
  description: string;
  category: string;
  targetAudience: string;
  mainBenefit: string;
  keywords: string[];
  destinationUrl: string | null;
  visualStyle: string;
  price: number | null;
  currency: string | null;
}

export interface Campaign {
  id: string;
  userId: string;
  productId: string | null;
  name: string;
  objective: string;
  targetAudience: string;
  language: string;
  config: CampaignConfig;
  productSnapshot: ProductSnapshot;
  status: CampaignStatus;
  generationSource: GenerationSource | null;
  aiModel: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignAngle {
  id: string;
  campaignId: string;
  userId: string;
  position: number;
  name: string;
  audience: string;
  problem: string;
  message: string;
  visualConcept: string;
  keywords: string[];
  selected: boolean;
  createdAt: string;
}

export const EDITABLE_PIN_FIELDS = [
  "title",
  "description",
  "primaryKeyword",
  "keywords",
  "creativeConcept",
  "headline",
  "subheadline",
  "bullets",
  "cta",
  "destinationUrl",
  "altText",
  "filename",
] as const;
export type EditablePinField = (typeof EDITABLE_PIN_FIELDS)[number];

export interface Pin {
  id: string;
  campaignId: string;
  userId: string;
  productId: string | null;
  angleId: string | null;
  position: number;
  title: string;
  description: string;
  primaryKeyword: string;
  keywords: string[];
  creativeConcept: string;
  headline: string;
  subheadline: string;
  bullets: string[];
  cta: string;
  destinationUrl: string | null;
  altText: string;
  filename: string;
  design: PinDesign;
  editedFields: EditablePinField[];
  status: PinStatus;
  plannedFor: string | null;
  publishedAt: string | null;
  publishedMethod: "manual" | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignWithDetails extends Campaign {
  angles: CampaignAngle[];
  pins: Pin[];
}

export interface CampaignSummary extends Campaign {
  pinCount: number;
  approvedCount: number;
  plannedCount: number;
  publishedCount: number;
  coverPinId: string | null;
}

export type MetricSource = "manual" | "pinterest_api";

export interface PinMetric {
  id: string;
  pinId: string;
  userId: string;
  source: MetricSource;
  periodStart: string;
  periodEnd: string;
  impressions: number | null;
  saves: number | null;
  pinClicks: number | null;
  outboundClicks: number | null;
  notes: string | null;
  createdAt: string;
}

export type SubscriptionStatus =
  | "none"
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused";

export interface SubscriptionRecord {
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  plan: PlanId;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  lastEventAt: string | null;
  updatedAt: string | null;
}

export type UsageKind =
  | "campaign_generation"
  | "pin_generation"
  | "regeneration"
  | "image_export"
  | "zip_export"
  | "csv_export";

export interface UsageEvent {
  id: string;
  userId: string;
  kind: UsageKind;
  quantity: number;
  metadata: Record<string, unknown>;
  costEstimateUsd: number | null;
  createdAt: string;
}

export interface Integration {
  provider: "pinterest" | "etsy";
  status: "disconnected" | "connected" | "error" | "revoked";
  externalAccountId: string | null;
  scopes: string[];
  lastSyncedAt: string | null;
}

export interface SessionUser {
  id: string;
  email: string | null;
  mode: "supabase" | "local";
}
