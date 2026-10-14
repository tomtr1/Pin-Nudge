import type { CampaignConfig, ProductSnapshot } from "@/types/domain";
import type { AngleDraft, PinCopyDraft, PinDraft } from "./schemas";

/** The only product/campaign data sent to an AI provider. No account data, emails or URLs. */
export interface GenerationContext {
  product: Pick<ProductSnapshot, "name" | "description" | "category" | "targetAudience" | "mainBenefit" | "keywords" | "visualStyle">;
  config: CampaignConfig;
  campaignAudience: string;
  storeVoice?: string | null;
  hasProductImage: boolean;
  allowedTemplates: readonly string[];
}

export interface AngleRef {
  name: string;
  audience: string;
  problem: string;
  message: string;
  visualConcept: string;
  keywords: string[];
}

export interface ExistingPinRef {
  title: string;
  description: string;
  primaryKeyword: string;
  keywords: string[];
  creativeConcept: string;
  headline: string;
  subheadline: string;
  bullets: string[];
  cta: string;
  altText: string;
  template: string;
}

export interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
  costUsd: number | null;
}

export interface GenerationResult<T> {
  data: T;
  source: "ai" | "demo";
  model: string | null;
  usage: UsageInfo | null;
}

export interface CopyProvider {
  readonly id: "anthropic" | "demo";
  generateAngles(ctx: GenerationContext, count: number): Promise<GenerationResult<AngleDraft[]>>;
  generatePins(ctx: GenerationContext, angles: AngleRef[], count: number): Promise<GenerationResult<PinDraft[]>>;
  regeneratePinCopy(
    ctx: GenerationContext,
    angle: AngleRef | null,
    current: ExistingPinRef,
    siblings: string[],
  ): Promise<GenerationResult<PinCopyDraft>>;
  regenerateCreative(
    ctx: GenerationContext,
    angle: AngleRef | null,
    current: ExistingPinRef,
  ): Promise<GenerationResult<Pick<PinCopyDraft, "creativeConcept" | "headline" | "subheadline" | "bullets" | "template">>>;
}
