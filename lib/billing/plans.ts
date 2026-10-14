import type { PlanId, TemplateId } from "@/types/domain";

/**
 * Single source of truth for plans, prices, limits and feature access.
 * Display prices here must match the Stripe Prices configured through the
 * STRIPE_PRICE_* environment variables (see README → Stripe).
 */
export interface PlanLimits {
  products: number;
  campaignGenerationsPerMonth: number;
  pinsPerCampaign: number;
  anglesPerCampaign: number;
  regenerationsPerMonth: number;
}

export interface PlanFeatures {
  templates: TemplateId[];
  customColors: boolean;
  allFontPresets: boolean;
  zipExport: boolean;
  calendar: boolean;
  analytics: boolean;
  campaignComparison: "none" | "basic" | "detailed";
  savedPreferences: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthlyEur: number;
  description: string;
  highlight?: boolean;
  limits: PlanLimits;
  features: PlanFeatures;
  marketingFeatures: string[];
}

const BASIC_TEMPLATES: TemplateId[] = ["minimal", "benefits", "checklist"];
const ALL_TEMPLATES: TemplateId[] = ["minimal", "editorial", "benefits", "problem_solution", "checklist", "mockup"];

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthlyEur: 0,
    description: "Try the full workflow with one or two products.",
    limits: { products: 3, campaignGenerationsPerMonth: 2, pinsPerCampaign: 6, anglesPerCampaign: 2, regenerationsPerMonth: 10 },
    features: {
      templates: BASIC_TEMPLATES,
      customColors: false,
      allFontPresets: false,
      zipExport: false,
      calendar: false,
      analytics: false,
      campaignComparison: "none",
      savedPreferences: false,
    },
    marketingFeatures: [
      "Up to 3 products",
      "2 campaign generations per month",
      "Up to 6 pins per campaign",
      "3 basic templates",
      "PNG and CSV export",
    ],
  },
  starter: {
    id: "starter",
    name: "Starter",
    priceMonthlyEur: 9.99,
    description: "For sellers promoting a handful of products each month.",
    limits: { products: 25, campaignGenerationsPerMonth: 10, pinsPerCampaign: 10, anglesPerCampaign: 3, regenerationsPerMonth: 60 },
    features: {
      templates: ALL_TEMPLATES,
      customColors: true,
      allFontPresets: false,
      zipExport: false,
      calendar: false,
      analytics: false,
      campaignComparison: "none",
      savedPreferences: false,
    },
    marketingFeatures: [
      "Up to 25 products",
      "10 campaign generations per month",
      "Up to 10 pins per campaign",
      "All 6 templates with custom colours",
      "Individual PNG and CSV export",
    ],
  },
  growth: {
    id: "growth",
    name: "Growth",
    priceMonthlyEur: 14.99,
    description: "The complete planning and optimisation workflow.",
    highlight: true,
    limits: { products: 100, campaignGenerationsPerMonth: 30, pinsPerCampaign: 15, anglesPerCampaign: 5, regenerationsPerMonth: 200 },
    features: {
      templates: ALL_TEMPLATES,
      customColors: true,
      allFontPresets: true,
      zipExport: true,
      calendar: true,
      analytics: true,
      campaignComparison: "basic",
      savedPreferences: true,
    },
    marketingFeatures: [
      "Up to 100 products",
      "30 campaign generations per month",
      "Up to 15 pins and 5 angles per campaign",
      "Batch ZIP export",
      "Content calendar",
      "Saved campaign preferences",
      "Performance tracking (manual entry)",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthlyEur: 24.99,
    description: "Higher limits for larger catalogues and multiple shops.",
    limits: { products: 500, campaignGenerationsPerMonth: 80, pinsPerCampaign: 20, anglesPerCampaign: 6, regenerationsPerMonth: 600 },
    features: {
      templates: ALL_TEMPLATES,
      customColors: true,
      allFontPresets: true,
      zipExport: true,
      calendar: true,
      analytics: true,
      campaignComparison: "detailed",
      savedPreferences: true,
    },
    marketingFeatures: [
      "Up to 500 products across shops",
      "80 campaign generations per month",
      "Up to 20 pins and 6 angles per campaign",
      "All typography presets",
      "Detailed campaign comparisons",
      "Everything in Growth",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "starter", "growth", "pro"];
export const PAID_PLANS: PlanId[] = ["starter", "growth", "pro"];

export function getPlan(id: PlanId): Plan {
  return PLANS[id] ?? PLANS.free;
}

export function formatPrice(eur: number): string {
  if (eur === 0) return "€0";
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(eur);
}

/** Smallest plan that unlocks a feature, for upgrade prompts. */
export function minimumPlanFor(feature: keyof PlanFeatures): Plan {
  for (const id of PLAN_ORDER) {
    const value = PLANS[id].features[feature];
    if (value === true || (typeof value === "string" && value !== "none")) return PLANS[id];
  }
  return PLANS.pro;
}
