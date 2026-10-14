import type { FontPreset, PlanId, Profile, SubscriptionStatus, TemplateId } from "../shared/domain";

export interface TokenSession {
  accessToken: string;
  refreshToken: string | null;
  /** Unix seconds. */
  expiresAt: number;
  user: { id: string; email: string | null };
}

export interface ServerStatus {
  name: string;
  apiVersion: number;
  dataMode: "supabase" | "local" | "unconfigured";
  auth: "password" | "local-demo" | "unavailable";
  aiMode: "live" | "demo";
  disclaimer: string;
  supportEmail: string;
}

export interface QuotaCheck {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}

export interface AccountSummary {
  user: { id: string; email: string | null };
  profile: Profile | null;
  plan: {
    id: PlanId;
    name: string;
    status: SubscriptionStatus;
    isPaid: boolean;
    paymentIssue: boolean;
    endsAt: string | null;
    cancelAtPeriodEnd: boolean;
    limits: {
      products: number;
      campaignGenerationsPerMonth: number;
      pinsPerCampaign: number;
      anglesPerCampaign: number;
      regenerationsPerMonth: number;
    };
    features: {
      templates: TemplateId[];
      customColors: boolean;
      allFontPresets: boolean;
      zipExport: boolean;
      calendar: boolean;
      analytics: boolean;
      campaignComparison: "none" | "basic" | "detailed";
      savedPreferences: boolean;
    };
    basicFontPresets: FontPreset[];
  };
  usage: { campaigns: QuotaCheck; regenerations: QuotaCheck; products: QuotaCheck; periodEnd: string };
  app: { dataMode: string; aiMode: "live" | "demo" };
}
