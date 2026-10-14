"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, withUser, type ActionResult } from "@/lib/actions";
import { getAppUrl } from "@/lib/brand";
import { getEntitlement } from "@/lib/billing/usage";
import { getStripe, priceIdForPlan } from "@/lib/billing/stripe";
import { getAdminRepository } from "@/lib/data";
import { isStripeConfigured } from "@/lib/env";

const planSchema = z.enum(["starter", "growth", "pro"]);

/** Start Stripe Checkout for a paid plan. Entitlements change only via verified webhooks. */
export async function startCheckoutAction(plan: string): Promise<ActionResult> {
  let url: string | null = null;
  const result = await withUser("billing.checkout", async ({ user, repo }) => {
    if (!isStripeConfigured()) return fail("Live billing is not connected on this server yet.");
    const parsed = planSchema.safeParse(plan);
    if (!parsed.success) return fail("Unknown plan.");
    const priceId = priceIdForPlan(parsed.data);
    if (!priceId) return fail("This plan isn't available for purchase yet.");

    const stripe = getStripe();
    const admin = getAdminRepository();
    const existing = await admin.getSubscription(user.id);
    const entitlement = await getEntitlement(repo);

    // Existing subscribers change plans in the Stripe billing portal so they
    // are never charged for two subscriptions.
    if (entitlement.isPaid && existing?.stripeCustomerId) {
      const portal = await stripe.billingPortal.sessions.create({ customer: existing.stripeCustomerId, return_url: `${getAppUrl()}/settings#billing` });
      url = portal.url;
      return { ok: true, data: undefined };
    }

    let customerId = existing?.stripeCustomerId ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email ?? undefined, metadata: { userId: user.id } }, { idempotencyKey: `customer-${user.id}` });
      customerId = customer.id;
      await admin.upsertSubscription(user.id, { stripeCustomerId: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { metadata: { userId: user.id } },
      metadata: { userId: user.id, plan: parsed.data },
      allow_promotion_codes: true,
      success_url: `${getAppUrl()}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getAppUrl()}/billing/cancel`,
    });
    if (!session.url) return fail("Stripe did not return a checkout link. Please try again.");
    url = session.url;
    return { ok: true, data: undefined };
  });
  if (result.ok && url) redirect(url);
  return result;
}

export async function openBillingPortalAction(): Promise<ActionResult> {
  let url: string | null = null;
  const result = await withUser("billing.portal", async ({ user }) => {
    if (!isStripeConfigured()) return fail("Live billing is not connected on this server yet.");
    const sub = await getAdminRepository().getSubscription(user.id);
    if (!sub?.stripeCustomerId) return fail("You don't have a billing account yet. Choose a plan first.");
    const portal = await getStripe().billingPortal.sessions.create({ customer: sub.stripeCustomerId, return_url: `${getAppUrl()}/settings#billing` });
    url = portal.url;
    return { ok: true, data: undefined };
  });
  if (result.ok && url) redirect(url);
  return result;
}
