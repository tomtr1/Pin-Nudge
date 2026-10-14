import type Stripe from "stripe";
import type { AdminRepository } from "@/lib/data/types";
import { logger } from "@/lib/logger";
import type { PlanId, SubscriptionStatus } from "@/types/domain";

/**
 * Stripe webhook processing.
 *
 * - Signature verification happens in the route handler before this runs.
 * - Idempotency: each event ID is claimed in `stripe_events`; duplicate
 *   deliveries are acknowledged without reprocessing. If processing fails the
 *   claim is released so Stripe's retry can succeed.
 * - Ordering: events can arrive out of order, so we never trust the event
 *   payload's subscription snapshot. We re-fetch the subscription from the
 *   Stripe API (the source of truth) and store that current state.
 */
export interface WebhookDeps {
  admin: AdminRepository;
  retrieveSubscription: (id: string) => Promise<Stripe.Subscription>;
  planForPriceId: (priceId: string | null | undefined) => PlanId | null;
}

const KNOWN_STATUSES: SubscriptionStatus[] = ["incomplete", "incomplete_expired", "trialing", "active", "past_due", "canceled", "unpaid", "paused"];

const idOf = (v: string | { id: string } | null | undefined) => (typeof v === "string" ? v : (v?.id ?? null));

export async function syncSubscription(
  deps: WebhookDeps,
  subscriptionId: string,
  hints: { userId?: string | null; eventCreated?: number } = {},
): Promise<"updated" | "unmatched"> {
  const sub = await deps.retrieveSubscription(subscriptionId);
  const customerId = idOf(sub.customer);
  const userId =
    sub.metadata?.userId || hints.userId || (customerId ? await deps.admin.findUserIdByCustomer(customerId) : null);
  if (!userId) {
    logger.warn("stripe.subscription_unmatched", { subscriptionId });
    return "unmatched";
  }

  const item = sub.items?.data?.[0];
  const priceId = item?.price?.id ?? null;
  const plan = deps.planForPriceId(priceId);
  const status = (KNOWN_STATUSES.includes(sub.status as SubscriptionStatus) ? sub.status : "incomplete") as SubscriptionStatus;
  if (!plan) logger.warn("stripe.unknown_price", { subscriptionId });
  const periodEnd = item?.current_period_end ?? null;

  await deps.admin.upsertSubscription(userId, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    stripePriceId: priceId,
    plan: plan ?? "free",
    status,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    lastEventAt: hints.eventCreated ? new Date(hints.eventCreated * 1000).toISOString() : new Date().toISOString(),
  });
  return "updated";
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  return idOf(invoice.parent?.subscription_details?.subscription ?? null);
}

export async function handleStripeEvent(event: Stripe.Event, deps: WebhookDeps): Promise<"processed" | "duplicate" | "ignored"> {
  const claimed = await deps.admin.claimStripeEvent(event.id, event.type);
  if (!claimed) return "duplicate";

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode !== "subscription") return "ignored";
        const subscriptionId = idOf(session.subscription);
        const userId = session.client_reference_id || session.metadata?.userId || null;
        const customerId = idOf(session.customer);
        if (userId && customerId) await deps.admin.upsertSubscription(userId, { stripeCustomerId: customerId });
        if (subscriptionId) await syncSubscription(deps, subscriptionId, { userId, eventCreated: event.created });
        return "processed";
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed": {
        const sub = event.data.object;
        await syncSubscription(deps, sub.id, { userId: sub.metadata?.userId ?? null, eventCreated: event.created });
        return "processed";
      }
      case "invoice.paid":
      case "invoice.payment_failed":
      case "invoice.payment_action_required": {
        const subscriptionId = invoiceSubscriptionId(event.data.object);
        if (subscriptionId) await syncSubscription(deps, subscriptionId, { eventCreated: event.created });
        return "processed";
      }
      default:
        return "ignored";
    }
  } catch (error) {
    await deps.admin.releaseStripeEvent(event.id).catch(() => undefined);
    throw error;
  }
}
