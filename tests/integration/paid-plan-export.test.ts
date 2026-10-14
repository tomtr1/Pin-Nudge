/**
 * Paid-plan entitlements and the ZIP export, using the local store. The
 * subscription row is written through the same admin path a verified Stripe
 * webhook uses.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import { describe, expect, it } from "vitest";

const dir = mkdtempSync(path.join(tmpdir(), "pinnudge-paid-"));
process.env.PINNUDGE_DATA_MODE = "local";
process.env.PINNUDGE_LOCAL_DATA_DIR = dir;
delete process.env.ANTHROPIC_API_KEY;

const { createLocalAdminRepository, createLocalUserRepository } = await import("@/lib/data/local-repo");
const { createDraftCampaign, generateAngles, generatePins } = await import("@/lib/campaigns/service");
const { assertFeature, getEntitlement, FeatureLockedError } = await import("@/lib/billing/usage");
const { buildCampaignZip, exportFilenames } = await import("@/lib/export/campaign");

const USER = "44444444-4444-4444-8444-444444444444";
const PNG_1PX = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABpfZFQAAAAABJRU5ErkJggg==", "base64");

describe("paid plans", () => {
  const repo = createLocalUserRepository(USER, dir);
  const admin = createLocalAdminRepository(dir);

  it("locks Growth features on the Free plan", async () => {
    const ent = await getEntitlement(repo);
    expect(ent.planId).toBe("free");
    expect(() => assertFeature(ent, "zipExport", "ZIP")).toThrow(FeatureLockedError);
  });

  it("unlocks Growth features from an active subscription and exports a ZIP of approved pins", async () => {
    expect(() => assertFeature({ plan: { features: { zipExport: false } } } as never, "zipExport", "ZIP")).toThrow(FeatureLockedError);

    await admin.upsertSubscription(USER, {
      stripeCustomerId: "cus_test",
      stripeSubscriptionId: "sub_test",
      plan: "growth",
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 20 * 86400000).toISOString(),
    });
    const ent = await getEntitlement(repo);
    expect(ent.planId).toBe("growth");
    expect(() => assertFeature(ent, "zipExport", "ZIP")).not.toThrow();
    expect(() => assertFeature(ent, "calendar", "Calendar")).not.toThrow();

    const product = await repo.createProduct({
      name: "Zip Planner", description: "d", category: "planner", targetAudience: "", mainBenefit: "", keywords: [], destinationUrl: "https://www.etsy.com/listing/5",
      images: [], visualStyle: "", price: null, currency: null, tags: [], isSample: false,
    });
    const img = await repo.uploadProductImage(product.id, { bytes: PNG_1PX, contentType: "image/png", extension: "png" });
    await repo.updateProduct(product.id, { images: [img] });

    const config = { objective: "traffic", pinCount: 12, angleCount: 4, tone: "friendly", visualStyle: "warm", language: "en", primaryKeyword: "", cta: "", season: "", variety: "broad" as const, template: "auto" as const };
    const draft = await createDraftCampaign(repo, { productId: product.id, name: "Zip test", targetAudience: "", config });
    await generateAngles(repo, draft.id);
    const campaign = await generatePins(repo, draft.id);
    expect(campaign.pins).toHaveLength(12);
    expect(new Set(campaign.pins.map((p) => p.design.template)).size).toBeGreaterThan(2); // Growth has all templates

    const approved = campaign.pins.slice(0, 5);
    await repo.updatePins(approved.map((p) => p.id), { status: "approved" });
    const refreshed = (await repo.getCampaign(draft.id))!;
    const toExport = refreshed.pins.filter((p) => p.status === "approved");
    const zip = unzipSync(await buildCampaignZip(repo, refreshed, toExport));
    const names = exportFilenames(toExport);
    expect(Object.keys(zip).sort()).toEqual([...names, "campaign-summary.md", "pins.csv"].sort());
    for (const n of names) {
      const f = Buffer.from(zip[n]);
      expect([f.readUInt32BE(16), f.readUInt32BE(20)]).toEqual([1000, 1500]);
      expect(n).toMatch(/^zip-planner_[a-z0-9-]+_\d{2}\.png$/);
    }
    const csv = strFromU8(zip["pins.csv"]);
    expect(csv.trim().split("\r\n")).toHaveLength(6);
    expect(strFromU8(zip["campaign-summary.md"])).toContain("# Zip test");
  });

  it("returns to Free limits when the subscription is canceled", async () => {
    await admin.upsertSubscription(USER, { status: "canceled", cancelAtPeriodEnd: false });
    const ent = await getEntitlement(repo);
    expect(ent.planId).toBe("free");
    expect(() => assertFeature(ent, "zipExport", "ZIP")).toThrow(FeatureLockedError);
    // Data is retained after a downgrade.
    expect(await repo.listCampaigns()).toHaveLength(1);
  });
});
