/**
 * Row Level Security & storage isolation tests against a real Supabase stack.
 *
 * Runs against the local stack (`npx supabase start`) or any project whose
 * credentials are in the environment / .env.local. Skipped when Supabase is
 * unreachable so the standard suite never needs external services.
 *
 * Each test acts as a malicious authenticated user ("mallory") attempting to
 * read or modify another user's ("alice") data with the public anon key.
 */
import { existsSync, readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSupabaseAdminRepository, createSupabaseUserRepository } from "@/lib/data/supabase-repo";
import { createSupabaseBearerClient, createSupabaseStatelessClient } from "@/lib/supabase/server";

function loadEnvFile() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnvFile();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function reachable() {
  if (!url || !anon || !service) return false;
  try {
    const res = await fetch(`${url}/auth/v1/health`, { headers: { apikey: anon }, signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
const available = await reachable();

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABpfZFQAAAAABJRU5ErkJggg==", "base64");

describe.skipIf(!available)("Supabase RLS and storage isolation", () => {
  let admin: SupabaseClient;
  let alice: SupabaseClient;
  let mallory: SupabaseClient;
  let anonClient: SupabaseClient;
  const ids = { alice: "", mallory: "", product: "", campaign: "", angle: "", pin: "", malloryCampaign: "", imagePath: "" };
  const stamp = Date.now();

  async function signIn(email: string) {
    const c = createClient(url!, anon!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await c.auth.signInWithPassword({ email, password: "integration-pass-1" });
    if (error) throw error;
    return c;
  }

  beforeAll(async () => {
    admin = createClient(url!, service!, { auth: { persistSession: false } });
    for (const who of ["alice", "mallory"] as const) {
      const { data, error } = await admin.auth.admin.createUser({ email: `${who}-${stamp}@example.com`, password: "integration-pass-1", email_confirm: true });
      if (error) throw error;
      ids[who] = data.user.id;
    }
    alice = await signIn(`alice-${stamp}@example.com`);
    mallory = await signIn(`mallory-${stamp}@example.com`);
    anonClient = createClient(url!, anon!, { auth: { persistSession: false } });

    const aliceRepo = createSupabaseUserRepository(alice, ids.alice);
    const product = await aliceRepo.createProduct({
      name: "Alice's planner", description: "", category: "planner", targetAudience: "", mainBenefit: "", keywords: [], destinationUrl: null,
      images: [], visualStyle: "", price: null, currency: null, tags: [], isSample: false,
    });
    ids.product = product.id;
    const img = await aliceRepo.uploadProductImage(product.id, { bytes: PNG, contentType: "image/png", extension: "png" });
    ids.imagePath = img.path;
    const campaign = await aliceRepo.createCampaign({
      productId: product.id, name: "Alice campaign", objective: "traffic", targetAudience: "", language: "en",
      config: {} as never, productSnapshot: {} as never, status: "draft", generationSource: null, aiModel: null,
    });
    ids.campaign = campaign.id;
    const [angle] = await aliceRepo.replaceAngles(campaign.id, [{ position: 0, name: "A", audience: "", problem: "", message: "m", visualConcept: "", keywords: [], selected: true }]);
    ids.angle = angle.id;
    const { data: pin, error } = await alice.from("pins").insert({ user_id: ids.alice, campaign_id: campaign.id, product_id: product.id, angle_id: angle.id, title: "Alice pin" }).select("id").single();
    if (error) throw error;
    ids.pin = pin.id;
    const { data: mc } = await mallory.from("campaigns").insert({ user_id: ids.mallory, name: "Mallory campaign" }).select("id").single();
    ids.malloryCampaign = mc!.id;
  });

  afterAll(async () => {
    if (!admin) return;
    await admin.storage.from("product-images").remove([ids.imagePath]).catch(() => undefined);
    for (const id of [ids.alice, ids.mallory]) if (id) await admin.auth.admin.deleteUser(id);
  });

  it("creates a profile automatically on sign-up", async () => {
    const { data } = await alice.from("profiles").select("id").eq("id", ids.alice).single();
    expect(data?.id).toBe(ids.alice);
  });

  it.each(["products", "campaigns", "campaign_angles", "pins"])("hides %s rows from other users", async (table) => {
    const { data, error } = await mallory.from(table).select("id").eq("user_id", ids.alice);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("hides another user's profile", async () => {
    const { data } = await mallory.from("profiles").select("*").eq("id", ids.alice);
    expect(data).toEqual([]);
  });

  it("blocks updates and deletes of another user's rows", async () => {
    const upd = await mallory.from("products").update({ name: "pwned" }).eq("id", ids.product).select("id");
    expect(upd.data).toEqual([]);
    const del = await mallory.from("pins").delete().eq("id", ids.pin).select("id");
    expect(del.data).toEqual([]);
    const { data } = await admin.from("products").select("name").eq("id", ids.product).single();
    expect(data?.name).toBe("Alice's planner");
  });

  it("blocks inserting rows that claim another user's id", async () => {
    const res = await mallory.from("products").insert({ user_id: ids.alice, name: "spoof" });
    expect(res.error).not.toBeNull();
  });

  it("blocks attaching own rows to another user's campaign, product or pin", async () => {
    const pinIntoAliceCampaign = await mallory.from("pins").insert({ user_id: ids.mallory, campaign_id: ids.campaign, title: "x" });
    expect(pinIntoAliceCampaign.error).not.toBeNull();
    const pinWithAliceProduct = await mallory.from("pins").insert({ user_id: ids.mallory, campaign_id: ids.malloryCampaign, product_id: ids.product, title: "x" });
    expect(pinWithAliceProduct.error).not.toBeNull();
    const metricOnAlicePin = await mallory.from("pin_metrics").insert({ user_id: ids.mallory, pin_id: ids.pin, source: "manual", period_start: "2026-10-01", period_end: "2026-10-02", impressions: 1 });
    expect(metricOnAlicePin.error).not.toBeNull();
    const moveOwnCampaign = await mallory.from("campaigns").update({ user_id: ids.alice }).eq("id", ids.malloryCampaign).select("id");
    expect(moveOwnCampaign.error ?? moveOwnCampaign.data?.length === 0).toBeTruthy();
  });

  it("prevents users from granting themselves a plan or editing usage", async () => {
    const sub = await mallory.from("subscriptions").insert({ user_id: ids.mallory, plan: "pro", status: "active" });
    expect(sub.error).not.toBeNull();
    const usage = await mallory.from("usage_events").insert({ user_id: ids.mallory, kind: "campaign_generation" });
    expect(usage.error).not.toBeNull();
    await admin.from("usage_events").insert({ user_id: ids.mallory, kind: "campaign_generation" });
    const del = await mallory.from("usage_events").delete().eq("user_id", ids.mallory).select("id");
    expect(del.data ?? []).toEqual([]);
    const rpc = await mallory.rpc("consume_usage", { p_user_id: ids.mallory, p_kind: "regeneration", p_quantity: 1, p_limit: 999, p_period_start: new Date(0).toISOString() });
    expect(rpc.error).not.toBeNull();
    const events = await mallory.from("stripe_events").select("*");
    expect(events.data ?? []).toEqual([]);
  });

  it("gives anonymous visitors no access", async () => {
    for (const table of ["products", "campaigns", "pins", "profiles", "subscriptions"]) {
      const { data } = await anonClient.from(table).select("*").limit(1);
      expect(data ?? []).toEqual([]);
    }
  });

  it("isolates private storage objects by user folder", async () => {
    const own = await alice.storage.from("product-images").download(ids.imagePath);
    expect(own.error).toBeNull();
    const stolen = await mallory.storage.from("product-images").download(ids.imagePath);
    expect(stolen.data).toBeNull();
    const list = await mallory.storage.from("product-images").list(ids.alice);
    expect(list.data ?? []).toEqual([]);
    const upload = await mallory.storage.from("product-images").upload(`${ids.alice}/${ids.product}/evil.png`, PNG, { contentType: "image/png" });
    expect(upload.error).not.toBeNull();
    const publicUrl = await fetch(`${url}/storage/v1/object/public/product-images/${ids.imagePath}`);
    expect(publicUrl.ok).toBe(false);
    // The repository refuses paths outside the caller's folder before asking storage.
    const malloryRepo = createSupabaseUserRepository(mallory, ids.mallory);
    expect(await malloryRepo.readProductImage(ids.imagePath)).toBeNull();
  });

  it("rejects disallowed file types at the bucket", async () => {
    const res = await alice.storage.from("product-images").upload(`${ids.alice}/${ids.product}/x.svg`, Buffer.from("<svg/>"), { contentType: "image/svg+xml" });
    expect(res.error).not.toBeNull();
  });

  it("reserves quota atomically under concurrent requests", async () => {
    const repo = createSupabaseAdminRepository(admin);
    const results = await Promise.all(
      Array.from({ length: 8 }, () => repo.consumeUsage({ userId: ids.alice, kind: "regeneration", quantity: 1, limit: 3, periodStart: new Date(Date.now() - 60_000) })),
    );
    expect(results.filter(Boolean)).toHaveLength(3);
    const userRepo = createSupabaseUserRepository(alice, ids.alice);
    expect(await userRepo.sumUsage("regeneration", new Date(Date.now() - 60_000))).toBe(3);
  });

  it("records Stripe events idempotently", async () => {
    const repo = createSupabaseAdminRepository(admin);
    const id = `evt_test_${stamp}`;
    expect(await repo.claimStripeEvent(id, "test")).toBe(true);
    expect(await repo.claimStripeEvent(id, "test")).toBe(false);
    await repo.releaseStripeEvent(id);
    expect(await repo.claimStripeEvent(id, "test")).toBe(true);
    await repo.releaseStripeEvent(id);
  });

  it("bearer-token clients (mobile API) are scoped by RLS like cookie sessions", async () => {
    const { data } = await mallory.auth.getSession();
    const token = data.session!.access_token;
    const bearer = createSupabaseBearerClient(token);
    const { data: who } = await createSupabaseStatelessClient().auth.getUser(token);
    expect(who.user?.id).toBe(ids.mallory);
    const repo = createSupabaseUserRepository(bearer, ids.mallory);
    expect(await repo.getProduct(ids.product)).toBeNull();
    expect(await repo.getCampaign(ids.campaign)).toBeNull();
    // Even if the server mistakenly passed alice's id, RLS still filters by the token's user.
    const confused = createSupabaseUserRepository(bearer, ids.alice);
    expect(await confused.getProduct(ids.product)).toBeNull();
    const file = await bearer.storage.from("product-images").download(ids.imagePath);
    expect(file.data).toBeNull();
    // A forged token is rejected outright.
    const forged = await createSupabaseStatelessClient().auth.getUser(`${token.slice(0, -4)}AAAA`);
    expect(forged.data.user).toBeNull();
  });

  it("deleting a product keeps campaigns but unlinks them", async () => {
    const aliceRepo = createSupabaseUserRepository(alice, ids.alice);
    const p2 = await aliceRepo.createProduct({
      name: "Temp", description: "", category: "other", targetAudience: "", mainBenefit: "", keywords: [], destinationUrl: null,
      images: [], visualStyle: "", price: null, currency: null, tags: [], isSample: false,
    });
    const c2 = await aliceRepo.createCampaign({ productId: p2.id, name: "C2", objective: "traffic", targetAudience: "", language: "en", config: {} as never, productSnapshot: {} as never, status: "draft", generationSource: null, aiModel: null });
    expect(await aliceRepo.deleteProduct(p2.id)).toBe(true);
    const after = await aliceRepo.getCampaign(c2.id);
    expect(after?.productId).toBeNull();
    expect(after?.userId).toBe(ids.alice);
  });

  it("account deletion removes the user's rows and files", async () => {
    const { data } = await admin.auth.admin.createUser({ email: `temp-${stamp}@example.com`, password: "integration-pass-1", email_confirm: true });
    const tempId = data.user!.id;
    const c = await signIn(`temp-${stamp}@example.com`);
    const r = createSupabaseUserRepository(c, tempId);
    const p = await r.createProduct({ name: "Gone", description: "", category: "other", targetAudience: "", mainBenefit: "", keywords: [], destinationUrl: null, images: [], visualStyle: "", price: null, currency: null, tags: [], isSample: false });
    const img = await r.uploadProductImage(p.id, { bytes: PNG, contentType: "image/png", extension: "png" });
    await createSupabaseAdminRepository(admin).deleteUser(tempId);
    const rows = await admin.from("products").select("id").eq("user_id", tempId);
    expect(rows.data).toEqual([]);
    const file = await admin.storage.from("product-images").download(img.path);
    expect(file.data).toBeNull();
  });
});
