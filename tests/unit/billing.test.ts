import { describe, expect, it } from "vitest";
import { checkQuota, resolveEntitlement, usagePeriodEnd, usagePeriodStart } from "@/lib/billing/entitlements";
import { getPlan, minimumPlanFor, PLAN_ORDER, PLANS } from "@/lib/billing/plans";
import type { SubscriptionRecord } from "@/types/domain";

const now = new Date("2026-10-14T12:00:00Z");
const sub = (patch: Partial<SubscriptionRecord>): SubscriptionRecord => ({
  userId: "u",
  stripeCustomerId: "cus_1",
  stripeSubscriptionId: "sub_1",
  stripePriceId: "price_g",
  plan: "growth",
  status: "active",
  currentPeriodEnd: "2026-11-01T00:00:00Z",
  cancelAtPeriodEnd: false,
  lastEventAt: null,
  updatedAt: null,
  ...patch,
});

describe("resolveEntitlement", () => {
  it("defaults to Free without a subscription", () => {
    const e = resolveEntitlement(null, now);
    expect(e.planId).toBe("free");
    expect(e.isPaid).toBe(false);
  });
  it.each(["active", "trialing"] as const)("grants the paid plan when %s", (status) => {
    const e = resolveEntitlement(sub({ status }), now);
    expect(e.planId).toBe("growth");
    expect(e.isPaid).toBe(true);
    expect(e.paymentIssue).toBe(false);
  });
  it("keeps access with a payment warning while past_due", () => {
    const e = resolveEntitlement(sub({ status: "past_due" }), now);
    expect(e.planId).toBe("growth");
    expect(e.paymentIssue).toBe(true);
  });
  it("honours cancel-at-period-end until the period ends", () => {
    expect(resolveEntitlement(sub({ status: "canceled", cancelAtPeriodEnd: true }), now).planId).toBe("growth");
    expect(resolveEntitlement(sub({ status: "canceled", cancelAtPeriodEnd: true, currentPeriodEnd: "2026-10-01T00:00:00Z" }), now).planId).toBe("free");
    expect(resolveEntitlement(sub({ status: "canceled" }), now).planId).toBe("free");
  });
  it.each(["incomplete", "incomplete_expired", "unpaid", "paused", "none"] as const)("falls back to Free when %s", (status) => {
    expect(resolveEntitlement(sub({ status }), now).planId).toBe("free");
  });
  it("never grants a paid plan for an unknown price (plan stored as free)", () => {
    expect(resolveEntitlement(sub({ plan: "free", status: "active" }), now).isPaid).toBe(false);
  });
});

describe("quotas and plans", () => {
  it("computes remaining quota and rejects over-limit requests", () => {
    expect(checkQuota(1, 1, 2)).toMatchObject({ allowed: true, remaining: 1 });
    expect(checkQuota(2, 1, 2)).toMatchObject({ allowed: false, remaining: 0 });
    expect(checkQuota(0, 3, 2).allowed).toBe(false);
    expect(checkQuota(-5, 1, 2)).toMatchObject({ used: 0, allowed: true });
    expect(checkQuota(0, 0, 2).allowed).toBe(false);
  });
  it("uses calendar months in UTC for usage periods", () => {
    expect(usagePeriodStart(now).toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(usagePeriodEnd(new Date("2026-12-31T23:59:00Z")).toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
  it("orders plans with non-decreasing limits and the configured prices", () => {
    const prices = PLAN_ORDER.map((p) => PLANS[p].priceMonthlyEur);
    expect(prices).toEqual([0, 9.99, 14.99, 24.99]);
    for (let i = 1; i < PLAN_ORDER.length; i++) {
      const prev = PLANS[PLAN_ORDER[i - 1]].limits;
      const cur = PLANS[PLAN_ORDER[i]].limits;
      for (const k of Object.keys(cur) as (keyof typeof cur)[]) expect(cur[k]).toBeGreaterThanOrEqual(prev[k]);
    }
  });
  it("finds the minimum plan for a feature", () => {
    expect(minimumPlanFor("zipExport").id).toBe("growth");
    expect(minimumPlanFor("customColors").id).toBe("starter");
    expect(getPlan("pro").features.campaignComparison).toBe("detailed");
  });
});
