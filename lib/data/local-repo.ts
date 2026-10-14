import "server-only";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  Campaign,
  CampaignAngle,
  CampaignSummary,
  Pin,
  PinMetric,
  Product,
  Profile,
  SubscriptionRecord,
  UsageEvent,
} from "@/types/domain";
import type { AdminRepository, UserRepository } from "./types";

/**
 * Local demo data store: a single JSON file plus an uploads folder on the
 * server's disk. It exists so PinNudge can be explored end-to-end without any
 * external credentials. It is single-process, not suitable for production and
 * is visibly labelled in the UI whenever it is active.
 */
interface LocalDb {
  version: 1;
  profiles: Profile[];
  products: Product[];
  campaigns: Campaign[];
  angles: CampaignAngle[];
  pins: Pin[];
  metrics: PinMetric[];
  usage: UsageEvent[];
  subscriptions: SubscriptionRecord[];
  stripeEvents: { id: string; type: string; processedAt: string }[];
}

const empty = (): LocalDb => ({
  version: 1,
  profiles: [],
  products: [],
  campaigns: [],
  angles: [],
  pins: [],
  metrics: [],
  usage: [],
  subscriptions: [],
  stripeEvents: [],
});

interface StoreState {
  dir: string;
  db: LocalDb | null;
  queue: Promise<unknown>;
}

const globalKey = Symbol.for("pinnudge.localStore");
type GlobalWithStore = typeof globalThis & { [globalKey]?: Map<string, StoreState> };

function stateFor(dir: string): StoreState {
  const g = globalThis as GlobalWithStore;
  g[globalKey] ??= new Map();
  let s = g[globalKey].get(dir);
  if (!s) {
    s = { dir, db: null, queue: Promise.resolve() };
    g[globalKey].set(dir, s);
  }
  return s;
}

export function localDataDir(): string {
  // Runtime-only location for demo data; excluded from output file tracing.
  return path.resolve(/*turbopackIgnore: true*/ process.env.PINNUDGE_LOCAL_DATA_DIR || path.join(process.cwd(), ".data"));
}

async function load(s: StoreState): Promise<LocalDb> {
  if (s.db) return s.db;
  try {
    const raw = await fs.readFile(path.join(s.dir, "store.json"), "utf8");
    s.db = { ...empty(), ...(JSON.parse(raw) as Partial<LocalDb>) } as LocalDb;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    s.db = empty();
  }
  return s.db;
}

async function persist(s: StoreState) {
  if (!s.db) return;
  await fs.mkdir(s.dir, { recursive: true });
  const file = path.join(s.dir, "store.json");
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(s.db, null, 1));
  await fs.rename(tmp, file);
}

/** Serialise all reads/writes so concurrent requests can't interleave. */
function run<T>(s: StoreState, fn: (db: LocalDb) => T | Promise<T>, write = false): Promise<T> {
  const next = s.queue.then(async () => {
    const db = await load(s);
    const result = await fn(db);
    if (write) await persist(s);
    return structuredClone(result);
  });
  s.queue = next.catch(() => undefined);
  return next;
}

const now = () => new Date().toISOString();

function summarize(c: Campaign, pins: Pin[]): CampaignSummary {
  const own = pins.filter((p) => p.campaignId === c.id).sort((a, b) => a.position - b.position);
  return {
    ...c,
    pinCount: own.length,
    approvedCount: own.filter((p) => p.status === "approved").length,
    plannedCount: own.filter((p) => p.plannedFor).length,
    publishedCount: own.filter((p) => p.status === "published").length,
    coverPinId: own[0]?.id ?? null,
  };
}

function matches(text: string, search: string) {
  return text.toLowerCase().includes(search.toLowerCase());
}

export function createLocalUserRepository(userId: string, dir = localDataDir()): UserRepository {
  const s = stateFor(dir);
  const uploadsDir = path.join(dir, "uploads");

  return {
    userId,

    getProfile: () => run(s, (db) => db.profiles.find((p) => p.id === userId) ?? null),

    upsertProfile: (patch) =>
      run(
        s,
        (db) => {
          let p = db.profiles.find((x) => x.id === userId);
          if (!p) {
            p = {
              id: userId,
              displayName: null,
              storeName: null,
              etsyShopUrl: null,
              pinterestProfileUrl: null,
              productTypes: [],
              visualStyle: null,
              targetAudience: null,
              marketingGoals: [],
              preferredLanguage: "en",
              destinationBehavior: "product_url",
              campaignDefaults: {},
              onboardingCompleted: false,
              createdAt: now(),
              updatedAt: now(),
            };
            db.profiles.push(p);
          }
          Object.assign(p, patch, { updatedAt: now() });
          return p;
        },
        true,
      ),

    listProducts: (query = {}) =>
      run(s, (db) => {
        let list = db.products.filter((p) => p.userId === userId);
        if (query.search) list = list.filter((p) => matches(p.name, query.search!) || matches(p.description, query.search!));
        if (query.category) list = list.filter((p) => p.category === query.category);
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return query.limit ? list.slice(0, query.limit) : list;
      }),

    countProducts: () => run(s, (db) => db.products.filter((p) => p.userId === userId).length),

    getProduct: (id) => run(s, (db) => db.products.find((p) => p.id === id && p.userId === userId) ?? null),

    createProduct: (input) =>
      run(
        s,
        (db) => {
          const p: Product = { ...input, id: randomUUID(), userId, createdAt: now(), updatedAt: now() };
          db.products.push(p);
          return p;
        },
        true,
      ),

    updateProduct: (id, patch) =>
      run(
        s,
        (db) => {
          const p = db.products.find((x) => x.id === id && x.userId === userId);
          if (!p) return null;
          Object.assign(p, patch, { updatedAt: now() });
          return p;
        },
        true,
      ),

    deleteProduct: (id) =>
      run(
        s,
        (db) => {
          const before = db.products.length;
          db.products = db.products.filter((p) => !(p.id === id && p.userId === userId));
          if (db.products.length === before) return false;
          for (const c of db.campaigns) if (c.productId === id && c.userId === userId) c.productId = null;
          for (const p of db.pins) if (p.productId === id && p.userId === userId) p.productId = null;
          return true;
        },
        true,
      ),

    async uploadProductImage(productId, file) {
      const rel = `${userId}/${productId}/${randomUUID()}.${file.extension}`;
      const abs = path.join(uploadsDir, rel);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, file.bytes);
      return { path: rel, contentType: file.contentType };
    },

    async readProductImage(rel) {
      if (!rel.startsWith(`${userId}/`) || rel.includes("..")) return null;
      const abs = path.resolve(uploadsDir, rel);
      if (!abs.startsWith(path.resolve(uploadsDir, userId) + path.sep)) return null;
      try {
        const bytes = new Uint8Array(await fs.readFile(abs));
        const ext = path.extname(abs).toLowerCase();
        const contentType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
        return { bytes, contentType };
      } catch {
        return null;
      }
    },

    async deleteStoredFiles(paths) {
      for (const rel of paths) {
        if (!rel.startsWith(`${userId}/`) || rel.includes("..")) continue;
        await fs.rm(path.join(uploadsDir, rel), { force: true });
      }
    },

    listCampaigns: (query = {}) =>
      run(s, (db) => {
        let list = db.campaigns.filter((c) => c.userId === userId);
        if (query.productId) list = list.filter((c) => c.productId === query.productId);
        if (query.status) list = list.filter((c) => c.status === query.status);
        if (query.search) list = list.filter((c) => matches(c.name, query.search!));
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        if (query.limit) list = list.slice(0, query.limit);
        return list.map((c) => summarize(c, db.pins));
      }),

    getCampaign: (id) =>
      run(s, (db) => {
        const c = db.campaigns.find((x) => x.id === id && x.userId === userId);
        if (!c) return null;
        return {
          ...c,
          angles: db.angles.filter((a) => a.campaignId === id && a.userId === userId).sort((a, b) => a.position - b.position),
          pins: db.pins.filter((p) => p.campaignId === id && p.userId === userId).sort((a, b) => a.position - b.position),
        };
      }),

    createCampaign: (input) =>
      run(
        s,
        (db) => {
          if (input.productId && !db.products.some((p) => p.id === input.productId && p.userId === userId)) {
            throw new Error("Product not found.");
          }
          const c: Campaign = { ...input, id: randomUUID(), userId, createdAt: now(), updatedAt: now() };
          db.campaigns.push(c);
          return c;
        },
        true,
      ),

    updateCampaign: (id, patch) =>
      run(
        s,
        (db) => {
          const c = db.campaigns.find((x) => x.id === id && x.userId === userId);
          if (!c) return null;
          Object.assign(c, patch, { updatedAt: now() });
          return c;
        },
        true,
      ),

    deleteCampaign: (id) =>
      run(
        s,
        (db) => {
          const c = db.campaigns.find((x) => x.id === id && x.userId === userId);
          if (!c) return false;
          const pinIds = new Set(db.pins.filter((p) => p.campaignId === id).map((p) => p.id));
          db.campaigns = db.campaigns.filter((x) => x.id !== id);
          db.angles = db.angles.filter((a) => a.campaignId !== id);
          db.pins = db.pins.filter((p) => p.campaignId !== id);
          db.metrics = db.metrics.filter((m) => !pinIds.has(m.pinId));
          return true;
        },
        true,
      ),

    replaceAngles: (campaignId, angles) =>
      run(
        s,
        (db) => {
          if (!db.campaigns.some((c) => c.id === campaignId && c.userId === userId)) throw new Error("Campaign not found.");
          const removed = new Set(db.angles.filter((a) => a.campaignId === campaignId).map((a) => a.id));
          db.angles = db.angles.filter((a) => a.campaignId !== campaignId);
          for (const p of db.pins) if (p.angleId && removed.has(p.angleId)) p.angleId = null;
          const created = angles.map((a): CampaignAngle => ({ ...a, id: randomUUID(), campaignId, userId, createdAt: now() }));
          db.angles.push(...created);
          return created.sort((a, b) => a.position - b.position);
        },
        true,
      ),

    updateAngle: (id, patch) =>
      run(
        s,
        (db) => {
          const a = db.angles.find((x) => x.id === id && x.userId === userId);
          if (!a) return null;
          Object.assign(a, patch);
          return a;
        },
        true,
      ),

    insertPins: (campaignId, pins) =>
      run(
        s,
        (db) => {
          if (!db.campaigns.some((c) => c.id === campaignId && c.userId === userId)) throw new Error("Campaign not found.");
          const created = pins.map((p): Pin => ({ ...p, id: randomUUID(), campaignId, userId, createdAt: now(), updatedAt: now() }));
          db.pins.push(...created);
          return created.sort((a, b) => a.position - b.position);
        },
        true,
      ),

    getPin: (id) => run(s, (db) => db.pins.find((p) => p.id === id && p.userId === userId) ?? null),

    listPins: (query = {}) =>
      run(s, (db) => {
        let list = db.pins.filter((p) => p.userId === userId);
        if (query.campaignId) list = list.filter((p) => p.campaignId === query.campaignId);
        if (query.productId) list = list.filter((p) => p.productId === query.productId);
        if (query.status) list = list.filter((p) => p.status === query.status);
        if (query.hasPlannedDate) list = list.filter((p) => p.plannedFor);
        if (query.plannedFrom) list = list.filter((p) => p.plannedFor && p.plannedFor >= query.plannedFrom!);
        if (query.plannedTo) list = list.filter((p) => p.plannedFor && p.plannedFor <= query.plannedTo!);
        return list.sort((a, b) => (a.plannedFor ?? "9999").localeCompare(b.plannedFor ?? "9999") || a.position - b.position);
      }),

    updatePin: (id, patch) =>
      run(
        s,
        (db) => {
          const p = db.pins.find((x) => x.id === id && x.userId === userId);
          if (!p) return null;
          Object.assign(p, patch, { updatedAt: now() });
          return p;
        },
        true,
      ),

    updatePins: (ids, patch) =>
      run(
        s,
        (db) => {
          let n = 0;
          for (const p of db.pins) {
            if (p.userId === userId && ids.includes(p.id)) {
              Object.assign(p, patch, { updatedAt: now() });
              n++;
            }
          }
          return n;
        },
        true,
      ),

    deletePin: (id) =>
      run(
        s,
        (db) => {
          const before = db.pins.length;
          db.pins = db.pins.filter((p) => !(p.id === id && p.userId === userId));
          db.metrics = db.metrics.filter((m) => m.pinId !== id || m.userId !== userId);
          return db.pins.length < before;
        },
        true,
      ),

    listMetrics: (query = {}) =>
      run(s, (db) => {
        let list = db.metrics.filter((m) => m.userId === userId);
        if (query.pinIds) list = list.filter((m) => query.pinIds!.includes(m.pinId));
        return list.sort((a, b) => b.periodStart.localeCompare(a.periodStart));
      }),

    addMetric: (input) =>
      run(
        s,
        (db) => {
          if (!db.pins.some((p) => p.id === input.pinId && p.userId === userId)) throw new Error("Pin not found.");
          const m: PinMetric = { ...input, id: randomUUID(), userId, createdAt: now() };
          db.metrics.push(m);
          return m;
        },
        true,
      ),

    deleteMetric: (id) =>
      run(
        s,
        (db) => {
          const before = db.metrics.length;
          db.metrics = db.metrics.filter((m) => !(m.id === id && m.userId === userId));
          return db.metrics.length < before;
        },
        true,
      ),

    sumUsage: (kind, since) =>
      run(s, (db) =>
        db.usage
          .filter((u) => u.userId === userId && u.kind === kind && new Date(u.createdAt) >= since)
          .reduce((acc, u) => acc + u.quantity, 0),
      ),

    listUsage: (since) =>
      run(s, (db) =>
        db.usage.filter((u) => u.userId === userId && new Date(u.createdAt) >= since).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      ),

    getSubscription: () => run(s, (db) => db.subscriptions.find((x) => x.userId === userId) ?? null),

    listIntegrations: async () => [],

    exportAll: () =>
      run(s, (db) => ({
        profile: db.profiles.find((p) => p.id === userId) ?? null,
        products: db.products.filter((p) => p.userId === userId),
        campaigns: db.campaigns.filter((c) => c.userId === userId),
        campaign_angles: db.angles.filter((a) => a.userId === userId),
        pins: db.pins.filter((p) => p.userId === userId),
        pin_metrics: db.metrics.filter((m) => m.userId === userId),
        usage_events: db.usage.filter((u) => u.userId === userId),
        subscription: db.subscriptions.find((x) => x.userId === userId) ?? null,
      })),
  };
}

export function createLocalAdminRepository(dir = localDataDir()): AdminRepository {
  const s = stateFor(dir);
  return {
    consumeUsage: ({ userId, kind, quantity, limit, periodStart, metadata }) =>
      run(
        s,
        (db) => {
          const used = db.usage
            .filter((u) => u.userId === userId && u.kind === kind && new Date(u.createdAt) >= periodStart)
            .reduce((acc, u) => acc + u.quantity, 0);
          if (used + quantity > limit) return null;
          const ev: UsageEvent = { id: randomUUID(), userId, kind, quantity, metadata: metadata ?? {}, costEstimateUsd: null, createdAt: now() };
          db.usage.push(ev);
          return ev.id;
        },
        true,
      ),

    releaseUsage: (eventId) =>
      run(
        s,
        (db) => {
          db.usage = db.usage.filter((u) => u.id !== eventId);
        },
        true,
      ),

    annotateUsage: (eventId, metadata, cost) =>
      run(
        s,
        (db) => {
          const ev = db.usage.find((u) => u.id === eventId);
          if (ev) {
            ev.metadata = { ...ev.metadata, ...metadata };
            ev.costEstimateUsd = cost;
          }
        },
        true,
      ),

    recordUsage: (userId, kind, quantity, metadata) =>
      run(
        s,
        (db) => {
          db.usage.push({ id: randomUUID(), userId, kind, quantity, metadata: metadata ?? {}, costEstimateUsd: null, createdAt: now() });
        },
        true,
      ),

    countRecentUsage: (userId, kinds, since) =>
      run(s, (db) => db.usage.filter((u) => u.userId === userId && kinds.includes(u.kind) && new Date(u.createdAt) >= since).length),

    getSubscription: (userId) => run(s, (db) => db.subscriptions.find((x) => x.userId === userId) ?? null),

    findUserIdByCustomer: (customerId) =>
      run(s, (db) => db.subscriptions.find((x) => x.stripeCustomerId === customerId)?.userId ?? null),

    upsertSubscription: (userId, patch) =>
      run(
        s,
        (db) => {
          let sub = db.subscriptions.find((x) => x.userId === userId);
          if (!sub) {
            sub = {
              userId,
              stripeCustomerId: null,
              stripeSubscriptionId: null,
              stripePriceId: null,
              plan: "free",
              status: "none",
              currentPeriodEnd: null,
              cancelAtPeriodEnd: false,
              lastEventAt: null,
              updatedAt: now(),
            };
            db.subscriptions.push(sub);
          }
          Object.assign(sub, patch, { updatedAt: now() });
        },
        true,
      ),

    claimStripeEvent: (eventId, type) =>
      run(
        s,
        (db) => {
          if (db.stripeEvents.some((e) => e.id === eventId)) return false;
          db.stripeEvents.push({ id: eventId, type, processedAt: now() });
          return true;
        },
        true,
      ),

    releaseStripeEvent: (eventId) =>
      run(
        s,
        (db) => {
          db.stripeEvents = db.stripeEvents.filter((e) => e.id !== eventId);
        },
        true,
      ),

    async deleteUser(userId) {
      await run(
        s,
        (db) => {
          db.profiles = db.profiles.filter((p) => p.id !== userId);
          db.products = db.products.filter((p) => p.userId !== userId);
          db.campaigns = db.campaigns.filter((c) => c.userId !== userId);
          db.angles = db.angles.filter((a) => a.userId !== userId);
          db.pins = db.pins.filter((p) => p.userId !== userId);
          db.metrics = db.metrics.filter((m) => m.userId !== userId);
          db.usage = db.usage.filter((u) => u.userId !== userId);
          db.subscriptions = db.subscriptions.filter((x) => x.userId !== userId);
        },
        true,
      );
      await fs.rm(path.join(dir, "uploads", userId), { recursive: true, force: true });
    },
  };
}
