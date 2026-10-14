import type {
  Campaign,
  CampaignAngle,
  CampaignConfig,
  CampaignStatus,
  CampaignSummary,
  CampaignWithDetails,
  GenerationSource,
  Integration,
  Pin,
  PinMetric,
  Product,
  ProductImage,
  ProductSnapshot,
  Profile,
  SubscriptionRecord,
  UsageEvent,
  UsageKind,
} from "@/types/domain";

export type ProfilePatch = Partial<Omit<Profile, "id" | "createdAt" | "updatedAt">>;

export type ProductWrite = Omit<Product, "id" | "userId" | "createdAt" | "updatedAt">;

export interface CampaignCreate {
  productId: string | null;
  name: string;
  objective: string;
  targetAudience: string;
  language: string;
  config: CampaignConfig;
  productSnapshot: ProductSnapshot;
  status: CampaignStatus;
  generationSource: GenerationSource | null;
  aiModel: string | null;
}
export type CampaignPatch = Partial<Omit<CampaignCreate, "productId">>;

export type AngleWrite = Omit<CampaignAngle, "id" | "campaignId" | "userId" | "createdAt">;
export type AnglePatch = Partial<AngleWrite>;

export type PinWrite = Omit<Pin, "id" | "campaignId" | "userId" | "createdAt" | "updatedAt">;
export type PinPatch = Partial<PinWrite>;

export interface PinQuery {
  campaignId?: string;
  productId?: string;
  status?: Pin["status"];
  plannedFrom?: string;
  plannedTo?: string;
  hasPlannedDate?: boolean;
}

export interface CampaignQuery {
  productId?: string;
  status?: CampaignStatus;
  search?: string;
  limit?: number;
}

export interface ProductQuery {
  search?: string;
  category?: string;
  limit?: number;
}

export type MetricWrite = Omit<PinMetric, "id" | "userId" | "createdAt">;

export interface StoredFile {
  bytes: Uint8Array;
  contentType: string;
}

/**
 * Data access scoped to one signed-in user. Every method only ever reads or
 * writes that user's rows. In Supabase mode this is enforced twice: by the
 * user-scoped client (Row Level Security) and by explicit user_id filters.
 */
export interface UserRepository {
  readonly userId: string;

  getProfile(): Promise<Profile | null>;
  upsertProfile(patch: ProfilePatch): Promise<Profile>;

  listProducts(query?: ProductQuery): Promise<Product[]>;
  countProducts(): Promise<number>;
  getProduct(id: string): Promise<Product | null>;
  createProduct(input: ProductWrite): Promise<Product>;
  updateProduct(id: string, patch: Partial<ProductWrite>): Promise<Product | null>;
  deleteProduct(id: string): Promise<boolean>;

  uploadProductImage(productId: string, file: StoredFile & { extension: string }): Promise<ProductImage>;
  readProductImage(path: string): Promise<StoredFile | null>;
  deleteStoredFiles(paths: string[]): Promise<void>;

  listCampaigns(query?: CampaignQuery): Promise<CampaignSummary[]>;
  getCampaign(id: string): Promise<CampaignWithDetails | null>;
  createCampaign(input: CampaignCreate): Promise<Campaign>;
  updateCampaign(id: string, patch: CampaignPatch): Promise<Campaign | null>;
  deleteCampaign(id: string): Promise<boolean>;

  replaceAngles(campaignId: string, angles: AngleWrite[]): Promise<CampaignAngle[]>;
  updateAngle(id: string, patch: AnglePatch): Promise<CampaignAngle | null>;

  insertPins(campaignId: string, pins: PinWrite[]): Promise<Pin[]>;
  getPin(id: string): Promise<Pin | null>;
  listPins(query?: PinQuery): Promise<Pin[]>;
  updatePin(id: string, patch: PinPatch): Promise<Pin | null>;
  updatePins(ids: string[], patch: PinPatch): Promise<number>;
  deletePin(id: string): Promise<boolean>;

  listMetrics(query?: { pinIds?: string[] }): Promise<PinMetric[]>;
  addMetric(input: MetricWrite): Promise<PinMetric>;
  deleteMetric(id: string): Promise<boolean>;

  sumUsage(kind: UsageKind, since: Date): Promise<number>;
  listUsage(since: Date): Promise<UsageEvent[]>;
  getSubscription(): Promise<SubscriptionRecord | null>;
  listIntegrations(): Promise<Integration[]>;

  exportAll(): Promise<Record<string, unknown>>;
}

/**
 * Privileged operations that must never be reachable from the browser:
 * quota reservation, subscription writes from verified webhooks, webhook
 * idempotency and account deletion. Supabase mode uses the service role.
 */
export interface AdminRepository {
  consumeUsage(input: {
    userId: string;
    kind: UsageKind;
    quantity: number;
    limit: number;
    periodStart: Date;
    metadata?: Record<string, unknown>;
  }): Promise<string | null>;
  releaseUsage(eventId: string): Promise<void>;
  annotateUsage(eventId: string, metadata: Record<string, unknown>, costEstimateUsd: number | null): Promise<void>;
  recordUsage(userId: string, kind: UsageKind, quantity: number, metadata?: Record<string, unknown>): Promise<void>;
  countRecentUsage(userId: string, kinds: UsageKind[], since: Date): Promise<number>;

  getSubscription(userId: string): Promise<SubscriptionRecord | null>;
  findUserIdByCustomer(customerId: string): Promise<string | null>;
  upsertSubscription(userId: string, patch: Partial<Omit<SubscriptionRecord, "userId" | "updatedAt">>): Promise<void>;

  /** Returns false if the event was already processed (duplicate delivery). */
  claimStripeEvent(eventId: string, type: string): Promise<boolean>;
  releaseStripeEvent(eventId: string): Promise<void>;

  deleteUser(userId: string): Promise<void>;
}
