import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CampaignSummary, ProductImage, UsageKind } from "@/types/domain";
import { DataError } from "./errors";
import {
  fromAngleWrite,
  fromCampaignWrite,
  fromPinWrite,
  fromProductWrite,
  fromProfilePatch,
  fromSubscriptionPatch,
  toAngle,
  toCampaign,
  toIntegration,
  toMetric,
  toPin,
  toProduct,
  toProfile,
  toSubscription,
  toUsage,
} from "./mappers";
import type { AdminRepository, CampaignQuery, PinQuery, ProductQuery, UserRepository } from "./types";

export const PRODUCT_IMAGE_BUCKET = "product-images";

function check<T>(result: { data: T; error: { message: string; code?: string } | null }, op: string): T {
  if (result.error) throw new DataError(op, result.error.code, result.error.message);
  return result.data;
}

/** Like check(), for queries returning a list: a null result becomes []. */
function rows<T>(result: { data: T[] | null; error: { message: string; code?: string } | null }, op: string): T[] {
  return check(result, op) ?? [];
}

/** Escape user search input for a PostgREST ilike filter. */
function likePattern(search: string): string {
  return `%${search.replace(/[\\%_,()]/g, (c) => `\\${c}`)}%`;
}

export function createSupabaseUserRepository(db: SupabaseClient, userId: string): UserRepository {
  return {
    userId,

    async getProfile() {
      const data = check(await db.from("profiles").select("*").eq("id", userId).maybeSingle(), "profile.get");
      return data ? toProfile(data) : null;
    },

    async upsertProfile(patch) {
      const data = check(
        await db.from("profiles").upsert({ id: userId, ...fromProfilePatch(patch) }, { onConflict: "id" }).select("*").single(),
        "profile.upsert",
      );
      return toProfile(data);
    },

    async listProducts(query: ProductQuery = {}) {
      let q = db.from("products").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (query.search) q = q.or(`name.ilike.${likePattern(query.search)},description.ilike.${likePattern(query.search)}`);
      if (query.category) q = q.eq("category", query.category);
      if (query.limit) q = q.limit(query.limit);
      return rows(await q, "products.list").map(toProduct);
    },

    async countProducts() {
      const res = await db.from("products").select("id", { count: "exact", head: true }).eq("user_id", userId);
      check(res, "products.count");
      return res.count ?? 0;
    },

    async getProduct(id) {
      const data = check(await db.from("products").select("*").eq("user_id", userId).eq("id", id).maybeSingle(), "products.get");
      return data ? toProduct(data) : null;
    },

    async createProduct(input) {
      const data = check(
        await db.from("products").insert({ user_id: userId, ...fromProductWrite(input) }).select("*").single(),
        "products.create",
      );
      return toProduct(data);
    },

    async updateProduct(id, patch) {
      const data = check(
        await db.from("products").update(fromProductWrite(patch)).eq("user_id", userId).eq("id", id).select("*").maybeSingle(),
        "products.update",
      );
      return data ? toProduct(data) : null;
    },

    async deleteProduct(id) {
      const data = rows(await db.from("products").delete().eq("user_id", userId).eq("id", id).select("id"), "products.delete");
      return data.length > 0;
    },

    async uploadProductImage(productId, file) {
      const path = `${userId}/${productId}/${randomUUID()}.${file.extension}`;
      const { error } = await db.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, file.bytes, {
        contentType: file.contentType,
        upsert: false,
      });
      if (error) throw new DataError("storage.upload", undefined, error.message);
      const image: ProductImage = { path, contentType: file.contentType };
      return image;
    },

    async readProductImage(path) {
      // Paths are always "<owner id>/...". Refuse anything else before asking
      // storage, which enforces the same rule through its RLS policies.
      if (!path.startsWith(`${userId}/`) || path.includes("..")) return null;
      const { data, error } = await db.storage.from(PRODUCT_IMAGE_BUCKET).download(path);
      if (error || !data) return null;
      return { bytes: new Uint8Array(await data.arrayBuffer()), contentType: data.type || "application/octet-stream" };
    },

    async deleteStoredFiles(paths) {
      const own = paths.filter((p) => p.startsWith(`${userId}/`) && !p.includes(".."));
      if (own.length === 0) return;
      const { error } = await db.storage.from(PRODUCT_IMAGE_BUCKET).remove(own);
      if (error) throw new DataError("storage.remove", undefined, error.message);
    },

    async listCampaigns(query: CampaignQuery = {}) {
      let q = db.from("campaigns").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (query.productId) q = q.eq("product_id", query.productId);
      if (query.status) q = q.eq("status", query.status);
      if (query.search) q = q.ilike("name", likePattern(query.search));
      if (query.limit) q = q.limit(query.limit);
      const campaigns = rows(await q, "campaigns.list").map(toCampaign);
      if (campaigns.length === 0) return [];
      const pins = rows(
        await db
          .from("pins")
          .select("id, campaign_id, status, planned_for, position")
          .eq("user_id", userId)
          .in(
            "campaign_id",
            campaigns.map((c) => c.id),
          )
          .order("position"),
        "campaigns.pinCounts",
      );
      return campaigns.map((c): CampaignSummary => {
        const own = pins.filter((p) => p.campaign_id === c.id);
        return {
          ...c,
          pinCount: own.length,
          approvedCount: own.filter((p) => p.status === "approved").length,
          plannedCount: own.filter((p) => p.planned_for).length,
          publishedCount: own.filter((p) => p.status === "published").length,
          coverPinId: own[0]?.id ?? null,
        };
      });
    },

    async getCampaign(id) {
      const [campaign, angles, pins] = await Promise.all([
        db.from("campaigns").select("*").eq("user_id", userId).eq("id", id).maybeSingle(),
        db.from("campaign_angles").select("*").eq("user_id", userId).eq("campaign_id", id).order("position"),
        db.from("pins").select("*").eq("user_id", userId).eq("campaign_id", id).order("position"),
      ]);
      const c = check(campaign, "campaigns.get");
      if (!c) return null;
      return {
        ...toCampaign(c),
        angles: rows(angles, "angles.list").map(toAngle),
        pins: rows(pins, "pins.list").map(toPin),
      };
    },

    async createCampaign(input) {
      const data = check(
        await db.from("campaigns").insert({ user_id: userId, ...fromCampaignWrite(input) }).select("*").single(),
        "campaigns.create",
      );
      return toCampaign(data);
    },

    async updateCampaign(id, patch) {
      const data = check(
        await db.from("campaigns").update(fromCampaignWrite(patch)).eq("user_id", userId).eq("id", id).select("*").maybeSingle(),
        "campaigns.update",
      );
      return data ? toCampaign(data) : null;
    },

    async deleteCampaign(id) {
      const data = rows(await db.from("campaigns").delete().eq("user_id", userId).eq("id", id).select("id"), "campaigns.delete");
      return data.length > 0;
    },

    async replaceAngles(campaignId, angles) {
      check(await db.from("campaign_angles").delete().eq("user_id", userId).eq("campaign_id", campaignId), "angles.clear");
      if (angles.length === 0) return [];
      const inserts = angles.map((a) => ({ user_id: userId, campaign_id: campaignId, ...fromAngleWrite(a) }));
      return rows(await db.from("campaign_angles").insert(inserts).select("*").order("position"), "angles.insert").map(toAngle);
    },

    async updateAngle(id, patch) {
      const data = check(
        await db.from("campaign_angles").update(fromAngleWrite(patch)).eq("user_id", userId).eq("id", id).select("*").maybeSingle(),
        "angles.update",
      );
      return data ? toAngle(data) : null;
    },

    async insertPins(campaignId, pins) {
      if (pins.length === 0) return [];
      const inserts = pins.map((p) => ({ user_id: userId, campaign_id: campaignId, ...fromPinWrite(p) }));
      return rows(await db.from("pins").insert(inserts).select("*").order("position"), "pins.insert").map(toPin);
    },

    async getPin(id) {
      const data = check(await db.from("pins").select("*").eq("user_id", userId).eq("id", id).maybeSingle(), "pins.get");
      return data ? toPin(data) : null;
    },

    async listPins(query: PinQuery = {}) {
      let q = db.from("pins").select("*").eq("user_id", userId);
      if (query.campaignId) q = q.eq("campaign_id", query.campaignId);
      if (query.productId) q = q.eq("product_id", query.productId);
      if (query.status) q = q.eq("status", query.status);
      if (query.hasPlannedDate) q = q.not("planned_for", "is", null);
      if (query.plannedFrom) q = q.gte("planned_for", query.plannedFrom);
      if (query.plannedTo) q = q.lte("planned_for", query.plannedTo);
      q = q.order("planned_for", { ascending: true, nullsFirst: false }).order("position");
      return rows(await q, "pins.listAll").map(toPin);
    },

    async updatePin(id, patch) {
      const data = check(
        await db.from("pins").update(fromPinWrite(patch)).eq("user_id", userId).eq("id", id).select("*").maybeSingle(),
        "pins.update",
      );
      return data ? toPin(data) : null;
    },

    async updatePins(ids, patch) {
      if (ids.length === 0) return 0;
      const data = rows(
        await db.from("pins").update(fromPinWrite(patch)).eq("user_id", userId).in("id", ids).select("id"),
        "pins.updateMany",
      );
      return data.length;
    },

    async deletePin(id) {
      const data = rows(await db.from("pins").delete().eq("user_id", userId).eq("id", id).select("id"), "pins.delete");
      return data.length > 0;
    },

    async listMetrics(query = {}) {
      let q = db.from("pin_metrics").select("*").eq("user_id", userId).order("period_start", { ascending: false });
      if (query.pinIds) {
        if (query.pinIds.length === 0) return [];
        q = q.in("pin_id", query.pinIds);
      }
      return rows(await q, "metrics.list").map(toMetric);
    },

    async addMetric(input) {
      const data = check(
        await db
          .from("pin_metrics")
          .insert({
            user_id: userId,
            pin_id: input.pinId,
            source: input.source,
            period_start: input.periodStart,
            period_end: input.periodEnd,
            impressions: input.impressions,
            saves: input.saves,
            pin_clicks: input.pinClicks,
            outbound_clicks: input.outboundClicks,
            notes: input.notes,
          })
          .select("*")
          .single(),
        "metrics.add",
      );
      return toMetric(data);
    },

    async deleteMetric(id) {
      const data = rows(await db.from("pin_metrics").delete().eq("user_id", userId).eq("id", id).select("id"), "metrics.delete");
      return data.length > 0;
    },

    async sumUsage(kind: UsageKind, since: Date) {
      const data = rows(
        await db.from("usage_events").select("quantity").eq("user_id", userId).eq("kind", kind).gte("created_at", since.toISOString()),
        "usage.sum",
      );
      return data.reduce((acc, r) => acc + Number(r.quantity ?? 0), 0);
    },

    async listUsage(since: Date) {
      return rows(
        await db.from("usage_events").select("*").eq("user_id", userId).gte("created_at", since.toISOString()).order("created_at", { ascending: false }),
        "usage.list",
      ).map(toUsage);
    },

    async getSubscription() {
      const data = check(await db.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(), "subscription.get");
      return data ? toSubscription(data) : null;
    },

    async listIntegrations() {
      return rows(await db.from("integrations").select("*").eq("user_id", userId), "integrations.list").map(toIntegration);
    },

    async exportAll() {
      const tables = ["products", "campaigns", "campaign_angles", "pins", "pin_metrics", "usage_events", "integrations"] as const;
      const results = await Promise.all(tables.map((t) => db.from(t).select("*").eq("user_id", userId)));
      const out: Record<string, unknown> = {
        profile: check(await db.from("profiles").select("*").eq("id", userId).maybeSingle(), "export.profile"),
        subscription: check(
          await db
            .from("subscriptions")
            .select("plan, status, current_period_end, cancel_at_period_end, created_at, updated_at")
            .eq("user_id", userId)
            .maybeSingle(),
          "export.subscription",
        ),
      };
      tables.forEach((t, i) => {
        out[t] = check(results[i], `export.${t}`);
      });
      return out;
    },
  };
}

export function createSupabaseAdminRepository(admin: SupabaseClient): AdminRepository {
  return {
    async consumeUsage({ userId, kind, quantity, limit, periodStart, metadata }) {
      const data = check(
        await admin.rpc("consume_usage", {
          p_user_id: userId,
          p_kind: kind,
          p_quantity: quantity,
          p_limit: limit,
          p_period_start: periodStart.toISOString(),
          p_metadata: metadata ?? {},
        }),
        "usage.consume",
      );
      return (data as string | null) ?? null;
    },

    async releaseUsage(eventId) {
      check(await admin.from("usage_events").delete().eq("id", eventId), "usage.release");
    },

    async annotateUsage(eventId, metadata, cost) {
      const existing = check(await admin.from("usage_events").select("metadata").eq("id", eventId).maybeSingle(), "usage.read");
      check(
        await admin
          .from("usage_events")
          .update({ metadata: { ...(existing?.metadata ?? {}), ...metadata }, cost_estimate_usd: cost })
          .eq("id", eventId),
        "usage.annotate",
      );
    },

    async recordUsage(userId, kind, quantity, metadata) {
      check(await admin.from("usage_events").insert({ user_id: userId, kind, quantity, metadata: metadata ?? {} }), "usage.record");
    },

    async countRecentUsage(userId, kinds, since) {
      const res = await admin
        .from("usage_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .in("kind", kinds)
        .gte("created_at", since.toISOString());
      check(res, "usage.recent");
      return res.count ?? 0;
    },

    async getSubscription(userId) {
      const data = check(await admin.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(), "subscription.adminGet");
      return data ? toSubscription(data) : null;
    },

    async findUserIdByCustomer(customerId) {
      const data = check(
        await admin.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).maybeSingle(),
        "subscription.byCustomer",
      );
      return data?.user_id ?? null;
    },

    async upsertSubscription(userId, patch) {
      check(
        await admin.from("subscriptions").upsert({ user_id: userId, ...fromSubscriptionPatch(patch) }, { onConflict: "user_id" }),
        "subscription.upsert",
      );
    },

    async claimStripeEvent(eventId, type) {
      const res = await admin.from("stripe_events").insert({ id: eventId, type });
      if (res.error) {
        if (res.error.code === "23505") return false; // unique violation → already processed
        throw new DataError("stripe.claim", res.error.code, res.error.message);
      }
      return true;
    },

    async releaseStripeEvent(eventId) {
      check(await admin.from("stripe_events").delete().eq("id", eventId), "stripe.release");
    },

    async deleteUser(userId) {
      // Remove stored files first (storage objects are not cascaded), then the
      // auth user; every table row cascades from auth.users.
      const bucket = admin.storage.from(PRODUCT_IMAGE_BUCKET);
      const { data: folders } = await bucket.list(userId, { limit: 1000 });
      const paths: string[] = [];
      for (const folder of folders ?? []) {
        const { data: files } = await bucket.list(`${userId}/${folder.name}`, { limit: 1000 });
        for (const f of files ?? []) paths.push(`${userId}/${folder.name}/${f.name}`);
      }
      if (paths.length) {
        const { error } = await bucket.remove(paths);
        if (error) throw new DataError("account.deleteFiles", undefined, error.message);
      }
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw new DataError("account.deleteUser", undefined, error.message);
    },
  };
}
