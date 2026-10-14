import { NextResponse } from "next/server";
import { getAdminRepository } from "@/lib/data";
import { getEnv, isStripeConfigured } from "@/lib/env";
import { getStripe, planForPriceId } from "@/lib/billing/stripe";
import { handleStripeEvent } from "@/lib/billing/webhooks";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/** POST /api/webhooks/stripe — verified Stripe webhook endpoint. */
export async function POST(request: Request) {
  const env = getEnv();
  if (!isStripeConfigured(env) || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature." }, { status: 400 });

  const stripe = getStripe();
  const payload = await request.text();
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    logger.warn("stripe.webhook_signature_invalid");
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    const result = await handleStripeEvent(event, {
      admin: getAdminRepository(),
      retrieveSubscription: (id) => stripe.subscriptions.retrieve(id),
      planForPriceId,
    });
    logger.info("stripe.webhook", { type: event.type, result });
    return NextResponse.json({ received: true, result });
  } catch (error) {
    logger.error("stripe.webhook_failed", { type: event.type, error });
    // Non-2xx makes Stripe retry later.
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
