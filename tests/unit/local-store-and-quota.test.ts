import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { CampaignConfig } from "@/types/domain";

// Configure local demo mode with an isolated data directory before importing app modules.
const dir = mkdtempSync(path.join(tmpdir(), "pinnudge-test-"));
process.env.PINNUDGE_DATA_MODE = "local";
process.env.PINNUDGE_LOCAL_DATA_DIR = dir;
delete process.env.ANTHROPIC_API_KEY;

const { createLocalAdminRepository, createLocalUserRepository } = await import("@/lib/data/local-repo");
const { createDraftCampaign, generateAngles, generatePins, regeneratePin, applyPinEdit, CampaignRuleError } = await import("@/lib/campaigns/service");
const { QuotaExceededError } = await import("@/lib/billing/usage");

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const config: CampaignConfig = {
  objective: "traffic",
  pinCount: 4,
  angleCount: 2,
  tone: "friendly",
  visualStyle: "minimal",
  language: "en",
  primaryKeyword: "",
  cta: "",
  season: "",
  variety: "balanced",
  template: "auto",
};

const productInput = {
  name: "Planner",
  description: "d",
  category: "planner",
  targetAudience: "",
  mainBenefit: "",
  keywords: [],
  destinationUrl: "https://www.etsy.com/listing/1",
  images: [],
  visualStyle: "",
  price: null,
  currency: null,
  tags: [],
  isSample: false,
};

describe("local store isolation", () => {
  it("never returns or mutates another user's records", async () => {
    const a = createLocalUserRepository(A, dir);
    const b = createLocalUserRepository(B, dir);
    const product = await a.createProduct(productInput);
    expect(await b.getProduct(product.id)).toBeNull();
    expect(await b.listProducts()).toHaveLength(0);
    expect(await b.updateProduct(product.id, { name: "hacked" })).toBeNull();
    expect(await b.deleteProduct(product.id)).toBe(false);
    expect((await a.getProduct(product.id))?.name).toBe("Planner");
    await expect(b.createCampaign({ productId: product.id, name: "x", objective: "traffic", targetAudience: "", language: "en", config, productSnapshot: {} as never, status: "draft", generationSource: null, aiModel: null })).rejects.toThrow();
    expect(await b.readProductImage(`${A}/${product.id}/x.png`)).toBeNull();
    expect(await b.readProductImage(`${B}/../${A}/x.png`)).toBeNull();
  });

  it("reserves quota atomically under concurrency", async () => {
    const admin = createLocalAdminRepository(dir);
    const results = await Promise.all(
      Array.from({ length: 10 }, () => admin.consumeUsage({ userId: B, kind: "regeneration", quantity: 1, limit: 3, periodStart: new Date(0) })),
    );
    expect(results.filter(Boolean)).toHaveLength(3);
  });
});

describe("campaign service (server-side rules)", () => {
  const C = "33333333-3333-4333-8333-333333333333";
  const repo = createLocalUserRepository(C, dir);
  let productId = "";

  beforeAll(async () => {
    productId = (await repo.createProduct(productInput)).id;
  });

  it("rejects configurations beyond the plan, regardless of the client", async () => {
    await expect(createDraftCampaign(repo, { productId, name: "", targetAudience: "", config: { ...config, pinCount: 20 } })).rejects.toBeInstanceOf(CampaignRuleError);
    await expect(createDraftCampaign(repo, { productId, name: "", targetAudience: "", config: { ...config, angleCount: 6 } })).rejects.toBeInstanceOf(CampaignRuleError);
    await expect(createDraftCampaign(repo, { productId, name: "", targetAudience: "", config: { ...config, template: "editorial" } })).rejects.toBeInstanceOf(CampaignRuleError);
  });

  it("generates a labelled demo campaign and preserves edited fields on regeneration", async () => {
    const draft = await createDraftCampaign(repo, { productId, name: "", targetAudience: "", config });
    const withAngles = await generateAngles(repo, draft.id);
    expect(withAngles.angles).toHaveLength(2);
    expect(withAngles.generationSource).toBe("demo");
    const full = await generatePins(repo, draft.id);
    expect(full.pins).toHaveLength(4);
    expect(full.pins.every((p) => p.destinationUrl === "https://www.etsy.com/listing/1")).toBe(true);
    expect(full.pins[0].filename).toMatch(/^planner_.+_01\.png$|^planner_.+_01$/);
    await expect(generatePins(repo, draft.id)).rejects.toBeInstanceOf(CampaignRuleError);

    const pin = full.pins[0];
    const edited = await applyPinEdit(repo, pin.id, {
      title: "My own title",
      description: pin.description,
      primaryKeyword: pin.primaryKeyword,
      keywords: pin.keywords,
      creativeConcept: pin.creativeConcept,
      headline: pin.headline,
      subheadline: pin.subheadline,
      bullets: pin.bullets,
      cta: pin.cta,
      destinationUrl: pin.destinationUrl,
      altText: pin.altText,
      filename: pin.filename,
      design: pin.design,
    });
    expect(edited.editedFields).toEqual(["title"]);
    const regen = await regeneratePin(repo, pin.id, "copy");
    expect(regen.pin.title).toBe("My own title");
    expect(regen.keptFields).toEqual(["title"]);
    const overwritten = await regeneratePin(repo, pin.id, "copy", true);
    expect(overwritten.pin.title).not.toBe("My own title");
    expect(overwritten.pin.editedFields).not.toContain("title");
  });

  it("refuses generation once the monthly campaign quota is used (Free = 2)", async () => {
    // One campaign generation was used above; one more is allowed, the next is rejected.
    const second = await createDraftCampaign(repo, { productId, name: "", targetAudience: "", config });
    await generateAngles(repo, second.id);
    const third = await createDraftCampaign(repo, { productId, name: "", targetAudience: "", config });
    await expect(generateAngles(repo, third.id)).rejects.toBeInstanceOf(QuotaExceededError);
    // The rejected attempt didn't consume anything and the draft (inputs) is preserved.
    const kept = await repo.getCampaign(third.id);
    expect(kept?.angles).toHaveLength(0);
    expect(kept?.config.pinCount).toBe(4);
    expect(await repo.sumUsage("campaign_generation", new Date(0))).toBe(2);
  });
});
