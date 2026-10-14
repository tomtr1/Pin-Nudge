import type { PlanId, SubscriptionRecord, SubscriptionStatus } from "@/types/domain";
import { getPlan, type Plan } from "./plans";

/**
 * Access policy per Stripe subscription status (documented in README → Billing):
 *
 * - active, trialing ............ full access to the subscribed plan
 * - past_due .................... keeps paid access while Stripe retries the
 *                                 payment (grace period); a banner asks the user
 *                                 to update their payment method
 * - canceled with a future period end and cancel_at_period_end ... access
 *                                 continues until the paid period ends
 * - incomplete .................. checkout not finished → Free
 * - incomplete_expired, canceled, unpaid, paused, none → Free
 *
 * Entitlements are derived only from the server-side subscription record that
 * is written by verified Stripe webhooks — never from client input.
 */
export interface Entitlement {
  plan: Plan;
  planId: PlanId;
  status: SubscriptionStatus;
  isPaid: boolean;
  paymentIssue: boolean;
  endsAt: string | null;
  cancelAtPeriodEnd: boolean;
  reason: string;
}

export function resolveEntitlement(sub: SubscriptionRecord | null, now: Date = new Date()): Entitlement {
  const free = (status: SubscriptionStatus, reason: string): Entitlement => ({
    plan: getPlan("free"),
    planId: "free",
    status,
    isPaid: false,
    paymentIssue: status === "unpaid" || status === "incomplete",
    endsAt: null,
    cancelAtPeriodEnd: false,
    reason,
  });

  if (!sub || sub.plan === "free") return free(sub?.status ?? "none", "No paid subscription.");

  const paid = (reason: string, paymentIssue = false): Entitlement => ({
    plan: getPlan(sub.plan),
    planId: sub.plan,
    status: sub.status,
    isPaid: true,
    paymentIssue,
    endsAt: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    reason,
  });

  const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
  const periodActive = periodEnd !== null && periodEnd.getTime() > now.getTime();

  switch (sub.status) {
    case "active":
    case "trialing":
      return paid("Subscription active.");
    case "past_due":
      return paid("Payment failed; Stripe is retrying. Access continues during the grace period.", true);
    case "canceled":
      if (sub.cancelAtPeriodEnd && periodActive) return paid("Canceled; access continues until the end of the paid period.");
      return free("canceled", "Subscription canceled.");
    case "incomplete":
      return free("incomplete", "Checkout was not completed.");
    case "unpaid":
      return free("unpaid", "Subscription unpaid.");
    default:
      return free(sub.status, "No active subscription.");
  }
}

/** Start of the current usage period (calendar month, UTC). */
export function usagePeriodStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function usagePeriodEnd(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

export interface QuotaCheck {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}

export function checkQuota(used: number, requested: number, limit: number): QuotaCheck {
  const safeUsed = Math.max(0, used);
  const remaining = Math.max(0, limit - safeUsed);
  return { allowed: requested > 0 && safeUsed + requested <= limit, used: safeUsed, limit, remaining };
}
