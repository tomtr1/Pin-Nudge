import "server-only";
import Stripe from "stripe";
import { getEnv, isStripeConfigured } from "@/lib/env";
import type { PlanId } from "@/types/domain";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  const env = getEnv();
  if (!isStripeConfigured(env) || !env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured.");
  client ??= new Stripe(env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2, timeout: 20_000 });
  return client;
}

/** Stripe Price ID for each paid plan, from environment configuration. */
export function priceIdForPlan(plan: PlanId): string | null {
  const env = getEnv();
  const map: Partial<Record<PlanId, string | undefined>> = {
    starter: env.STRIPE_PRICE_STARTER,
    growth: env.STRIPE_PRICE_GROWTH,
    pro: env.STRIPE_PRICE_PRO,
  };
  return map[plan] ?? null;
}

export function planForPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  const env = getEnv();
  if (priceId === env.STRIPE_PRICE_STARTER) return "starter";
  if (priceId === env.STRIPE_PRICE_GROWTH) return "growth";
  if (priceId === env.STRIPE_PRICE_PRO) return "pro";
  return null;
}
