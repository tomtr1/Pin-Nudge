import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { handleStripeEvent, type WebhookDeps } from "@/lib/billing/webhooks";
import type { AdminRepository } from "@/lib/data/types";
import type { PlanId, SubscriptionRecord } from "@/types/domain";

function fakeAdmin() {
  const claimed = new Set<string>();
  const subs = new Map<string, Partial<SubscriptionRecord>>();
  const admin = {
    claimStripeEvent: vi.fn(async (id: string) => (claimed.has(id) ? false : (claimed.add(id), true))),
    releaseStripeEvent: vi.fn(async (id: string) => void claimed.delete(id)),
    upsertSubscription: vi.fn(async (userId: string, patch: Partial<SubscriptionRecord>) => void subs.set(userId, { ...subs.get(userId), ...patch })),
    findUserIdByCustomer: vi.fn(async (c: string) => (c === "cus_known" ? "user-2" : null)),
  } as unknown as AdminRepository;
  return { admin, subs, claimed };
}

function subscription(status: Stripe.Subscription.Status, price = "price_growth", metadata: Record<string, string> = { userId: "user-1" }): Stripe.Subscription {
  return {
    id: "sub_1",
    status,
    customer: "cus_1",
    metadata,
    cancel_at_period_end: false,
    items: { data: [{ price: { id: price }, current_period_end: 1_800_000_000 }] },
  } as unknown as Stripe.Subscription;
}

const planFor = (id: string | null | undefined): PlanId | null => (id === "price_growth" ? "growth" : id === "price_pro" ? "pro" : null);

function event(type: string, object: unknown, id = `evt_${Math.random()}`, created = 1_700_000_000): Stripe.Event {
  return { id, type, created, data: { object } } as unknown as Stripe.Event;
}

describe("Stripe webhook handling", () => {
  it("syncs plan state from the Stripe API, not the event payload", async () => {
    const { admin, subs } = fakeAdmin();
    const deps: WebhookDeps = { admin, planForPriceId: planFor, retrieveSubscription: vi.fn(async () => subscription("active")) };
    // Payload says incomplete, but the API (source of truth) says active.
    const res = await handleStripeEvent(event("customer.subscription.updated", { ...subscription("incomplete"), metadata: { userId: "user-1" } }), deps);
    expect(res).toBe("processed");
    expect(subs.get("user-1")).toMatchObject({ plan: "growth", status: "active", stripeSubscriptionId: "sub_1", currentPeriodEnd: new Date(1_800_000_000_000).toISOString() });
  });

  it("acknowledges duplicate deliveries without reprocessing", async () => {
    const { admin } = fakeAdmin();
    const retrieve = vi.fn(async () => subscription("active"));
    const deps: WebhookDeps = { admin, planForPriceId: planFor, retrieveSubscription: retrieve };
    const e = event("customer.subscription.updated", subscription("active"), "evt_dup");
    expect(await handleStripeEvent(e, deps)).toBe("processed");
    expect(await handleStripeEvent(e, deps)).toBe("duplicate");
    expect(retrieve).toHaveBeenCalledTimes(1);
  });

  it("handles out-of-order events by always storing the current state", async () => {
    const { admin, subs } = fakeAdmin();
    const deps: WebhookDeps = { admin, planForPriceId: planFor, retrieveSubscription: vi.fn(async () => subscription("canceled")) };
    // A late "created" event arrives after the subscription was already canceled.
    await handleStripeEvent(event("customer.subscription.deleted", subscription("canceled"), "evt_2", 200), deps);
    await handleStripeEvent(event("customer.subscription.created", subscription("active"), "evt_1", 100), deps);
    expect(subs.get("user-1")?.status).toBe("canceled");
  });

  it("releases the idempotency claim when processing fails so Stripe can retry", async () => {
    const { admin, claimed } = fakeAdmin();
    const deps: WebhookDeps = { admin, planForPriceId: planFor, retrieveSubscription: vi.fn(async () => { throw new Error("network"); }) };
    await expect(handleStripeEvent(event("invoice.payment_failed", { parent: { subscription_details: { subscription: "sub_1" } } }, "evt_fail"), deps)).rejects.toThrow();
    expect(claimed.has("evt_fail")).toBe(false);
  });

  it("links checkout sessions to the user and records the customer", async () => {
    const { admin, subs } = fakeAdmin();
    const deps: WebhookDeps = { admin, planForPriceId: planFor, retrieveSubscription: vi.fn(async () => subscription("active", "price_pro", {})) };
    await handleStripeEvent(event("checkout.session.completed", { mode: "subscription", subscription: "sub_1", customer: "cus_9", client_reference_id: "user-7", metadata: {} }), deps);
    expect(subs.get("user-7")).toMatchObject({ stripeCustomerId: "cus_1", plan: "pro", status: "active" });
  });

  it("maps failed payments to past_due and unknown prices to free", async () => {
    const { admin, subs } = fakeAdmin();
    const deps: WebhookDeps = { admin, planForPriceId: planFor, retrieveSubscription: vi.fn(async () => subscription("past_due", "price_unknown")) };
    await handleStripeEvent(event("invoice.payment_failed", { parent: { subscription_details: { subscription: "sub_1" } } }), deps);
    expect(subs.get("user-1")).toMatchObject({ status: "past_due", plan: "free" });
  });

  it("falls back to the customer mapping when metadata is missing and ignores unrelated events", async () => {
    const { admin, subs } = fakeAdmin();
    const sub = { ...subscription("active", "price_growth", {}), customer: "cus_known" } as Stripe.Subscription;
    const deps: WebhookDeps = { admin, planForPriceId: planFor, retrieveSubscription: vi.fn(async () => sub) };
    await handleStripeEvent(event("customer.subscription.updated", sub), deps);
    expect(subs.get("user-2")?.plan).toBe("growth");
    expect(await handleStripeEvent(event("customer.created", {}), deps)).toBe("ignored");
  });
});
