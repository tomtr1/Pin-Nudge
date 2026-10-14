/**
 * Exercises the real /api/webhooks/stripe route handler: signature
 * verification, idempotent duplicate handling and the disabled state.
 * Uses local demo storage and an event type that needs no Stripe API calls.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Stripe from "stripe";
import { beforeEach, describe, expect, it } from "vitest";

const SECRET = "whsec_test_secret_for_unit_tests";

function setEnv(configured: boolean) {
  process.env.PINNUDGE_DATA_MODE = "local";
  process.env.PINNUDGE_LOCAL_DATA_DIR = mkdtempSync(path.join(tmpdir(), "pinnudge-webhook-"));
  if (configured) {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy_not_used_for_network";
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
    process.env.STRIPE_PRICE_GROWTH = "price_growth_test";
  } else {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_PRICE_GROWTH;
  }
}

async function post(body: string, signature?: string) {
  const { POST } = await import("@/app/api/webhooks/stripe/route");
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (signature) headers["stripe-signature"] = signature;
  return POST(new Request("http://localhost/api/webhooks/stripe", { method: "POST", body, headers }));
}

const payload = JSON.stringify({ id: "evt_route_1", object: "event", type: "customer.created", created: 1_700_000_000, data: { object: { id: "cus_1", object: "customer" } } });

describe("Stripe webhook route", () => {
  beforeEach(() => setEnv(true));

  it("rejects requests without a signature", async () => {
    expect((await post(payload)).status).toBe(400);
  });

  it("rejects forged signatures", async () => {
    const forged = Stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_wrong" });
    expect((await post(payload, forged)).status).toBe(400);
  });

  it("rejects a valid signature over a tampered body", async () => {
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
    expect((await post(payload.replace("cus_1", "cus_2"), header)).status).toBe(400);
  });

  it("accepts verified events and acknowledges duplicates without reprocessing", async () => {
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
    const first = await post(payload, header);
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ received: true, result: "ignored" });
    const second = await post(payload, header);
    expect(await second.json()).toMatchObject({ result: "duplicate" });
  });

  it("reports billing as unavailable when Stripe isn't configured", async () => {
    setEnv(false);
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
    expect((await post(payload, header)).status).toBe(503);
  });
});
