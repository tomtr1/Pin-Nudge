import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { requireUserContext } from "@/lib/auth/session";
import { getStripe, planForPriceId } from "@/lib/billing/stripe";
import { getEntitlement } from "@/lib/billing/usage";
import { syncSubscription } from "@/lib/billing/webhooks";
import { getAdminRepository } from "@/lib/data";
import { isStripeConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";

export const metadata: Metadata = { title: "Subscription" };

/**
 * Post-checkout landing page. The plan only changes from verified Stripe data:
 * we look the session up through the Stripe API (never trusting query params),
 * check it belongs to this user, and sync the subscription — the same path the
 * webhook uses. If anything is pending, the webhook will complete it.
 */
export default async function BillingSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  const { user, repo } = await requireUserContext();

  if (session_id && /^cs_[A-Za-z0-9_]+$/.test(session_id) && isStripeConfigured()) {
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(session_id);
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (session.client_reference_id === user.id && session.status === "complete" && subscriptionId) {
        await syncSubscription(
          { admin: getAdminRepository(), retrieveSubscription: (id) => stripe.subscriptions.retrieve(id), planForPriceId },
          subscriptionId,
          { userId: user.id },
        );
      }
    } catch (error) {
      logger.warn("billing.success_sync_failed", { error });
    }
  }

  const ent = await getEntitlement(repo);
  return ent.isPaid ? (
    <EmptyState
      icon={<CheckCircle2 />}
      title={`You're on ${ent.plan.name}`}
      description="Thanks for subscribing. Your new limits and features are active now."
      action={<Button asChild><Link href="/dashboard">Go to dashboard</Link></Button>}
    />
  ) : (
    <EmptyState
      icon={<Clock />}
      title="Confirming your payment"
      description="Stripe is still confirming your subscription. This usually takes a few seconds — refresh this page shortly. You won't be charged twice."
      action={
        <>
          <Button asChild><Link href="/billing/success">Refresh</Link></Button>
          <Button asChild variant="secondary"><Link href="/settings#billing">Billing settings</Link></Button>
        </>
      }
    />
  );
}
