import "server-only";
import { getAdminRepository, type UserRepository } from "@/lib/data";
import { getEnv } from "@/lib/env";
import type { UsageKind } from "@/types/domain";
import { checkQuota, resolveEntitlement, usagePeriodEnd, usagePeriodStart, type Entitlement, type QuotaCheck } from "./entitlements";
import { PLAN_ORDER, PLANS, type Plan, type PlanLimits } from "./plans";

export class QuotaExceededError extends Error {
  constructor(
    public readonly kind: UsageKind | "products",
    public readonly limit: number,
    public readonly upgradeTo: Plan | null,
  ) {
    super(QuotaExceededError.describe(kind, limit, upgradeTo));
    this.name = "QuotaExceededError";
  }
  static describe(kind: UsageKind | "products", limit: number, upgradeTo: Plan | null) {
    const what: Record<string, string> = {
      campaign_generation: `campaign generations this month (${limit})`,
      regeneration: `regenerations this month (${limit})`,
      pin_generation: `pins generated this month (${limit})`,
      products: `products (${limit})`,
    };
    const base = `You've reached your plan's limit for ${what[kind] ?? kind}.`;
    return upgradeTo ? `${base} Upgrade to ${upgradeTo.name} for more.` : `${base} The limit resets at the start of next month.`;
  }
}

export class RateLimitedError extends Error {
  constructor() {
    super("You're generating very quickly. Please wait a minute before trying again.");
    this.name = "RateLimitedError";
  }
}

export class FeatureLockedError extends Error {
  constructor(
    public readonly feature: string,
    public readonly upgradeTo: Plan,
  ) {
    super(`${feature} is available on the ${upgradeTo.name} plan and above.`);
    this.name = "FeatureLockedError";
  }
}

const LIMIT_FOR: Partial<Record<UsageKind, (l: PlanLimits) => number>> = {
  campaign_generation: (l) => l.campaignGenerationsPerMonth,
  regeneration: (l) => l.regenerationsPerMonth,
  pin_generation: (l) => l.pinsPerCampaign * l.campaignGenerationsPerMonth,
};

export function limitFor(kind: UsageKind, plan: Plan): number {
  return LIMIT_FOR[kind]?.(plan.limits) ?? Number.MAX_SAFE_INTEGER;
}

export function nextPlanWithHigherLimit(current: Plan, pick: (l: PlanLimits) => number): Plan | null {
  const idx = PLAN_ORDER.indexOf(current.id);
  for (const id of PLAN_ORDER.slice(idx + 1)) if (pick(PLANS[id].limits) > pick(current.limits)) return PLANS[id];
  return null;
}

export async function getEntitlement(repo: UserRepository): Promise<Entitlement> {
  return resolveEntitlement(await repo.getSubscription());
}

export interface AccountUsage {
  entitlement: Entitlement;
  periodStart: Date;
  periodEnd: Date;
  campaigns: QuotaCheck;
  regenerations: QuotaCheck;
  products: QuotaCheck;
}

export async function getAccountUsage(repo: UserRepository): Promise<AccountUsage> {
  const entitlement = await getEntitlement(repo);
  const periodStart = usagePeriodStart();
  const [campaigns, regenerations, products] = await Promise.all([
    repo.sumUsage("campaign_generation", periodStart),
    repo.sumUsage("regeneration", periodStart),
    repo.countProducts(),
  ]);
  const l = entitlement.plan.limits;
  return {
    entitlement,
    periodStart,
    periodEnd: usagePeriodEnd(),
    campaigns: checkQuota(campaigns, 1, l.campaignGenerationsPerMonth),
    regenerations: checkQuota(regenerations, 1, l.regenerationsPerMonth),
    products: checkQuota(products, 1, l.products),
  };
}

const GENERATION_KINDS: UsageKind[] = ["campaign_generation", "pin_generation", "regeneration"];

/** Per-user request rate limit for costly generation endpoints (shared across instances via the database). */
export async function enforceGenerationRateLimit(userId: string): Promise<void> {
  const perMinute = getEnv().RATE_LIMIT_GENERATIONS_PER_MINUTE;
  const recent = await getAdminRepository().countRecentUsage(userId, GENERATION_KINDS, new Date(Date.now() - 60_000));
  if (recent >= perMinute) throw new RateLimitedError();
}

/**
 * Atomically reserve quota before doing expensive work. Returns a release
 * function to refund the reservation if the work fails.
 */
export async function reserveUsage(
  userId: string,
  entitlement: Entitlement,
  kind: UsageKind,
  quantity: number,
  metadata: Record<string, unknown> = {},
): Promise<{ eventId: string; release: () => Promise<void> }> {
  const admin = getAdminRepository();
  const limit = limitFor(kind, entitlement.plan);
  const eventId = await admin.consumeUsage({ userId, kind, quantity, limit, periodStart: usagePeriodStart(), metadata });
  if (!eventId) {
    const pick = LIMIT_FOR[kind] ?? (() => 0);
    throw new QuotaExceededError(kind, limit, nextPlanWithHigherLimit(entitlement.plan, pick));
  }
  return { eventId, release: () => admin.releaseUsage(eventId) };
}

export function assertFeature(entitlement: Entitlement, feature: keyof Plan["features"], label: string) {
  const value = entitlement.plan.features[feature];
  const enabled = value === true || (typeof value === "string" && value !== "none");
  if (!enabled) {
    const upgrade = PLAN_ORDER.map((id) => PLANS[id]).find((p) => {
      const v = p.features[feature];
      return v === true || (typeof v === "string" && v !== "none");
    });
    throw new FeatureLockedError(label, upgrade ?? PLANS.pro);
  }
}
