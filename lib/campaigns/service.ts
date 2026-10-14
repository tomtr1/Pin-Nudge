import "server-only";
import { AiError, getCopyProvider, type GenerationContext } from "@/lib/ai";
import type { AngleRef, ExistingPinRef, GenerationResult } from "@/lib/ai/types";
import type { Entitlement } from "@/lib/billing/entitlements";
import { assertFeature, enforceGenerationRateLimit, getEntitlement, reserveUsage } from "@/lib/billing/usage";
import { getAdminRepository, type UserRepository } from "@/lib/data";
import { NotFoundError } from "@/lib/data/errors";
import type { PinPatch, PinWrite } from "@/lib/data/types";
import { logger } from "@/lib/logger";
import { COLOR_PRESETS, DEFAULT_DESIGN, normalizeDesign, TEMPLATE_META } from "@/lib/pins/design";
import { pinExportFilename } from "@/lib/validations/filenames";
import type { PinEditInput } from "@/lib/validations/schemas";
import {
  EDITABLE_PIN_FIELDS,
  type Campaign,
  type CampaignAngle,
  type CampaignConfig,
  type CampaignWithDetails,
  type EditablePinField,
  type Pin,
  type PinDesign,
  type Product,
  type ProductSnapshot,
  type Profile,
  type TemplateId,
} from "@/types/domain";
import { deriveCampaignStatus } from "./status";

export class CampaignRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CampaignRuleError";
  }
}

export function productSnapshot(p: Product): ProductSnapshot {
  return {
    name: p.name,
    description: p.description,
    category: p.category,
    targetAudience: p.targetAudience,
    mainBenefit: p.mainBenefit,
    keywords: p.keywords,
    destinationUrl: p.destinationUrl,
    visualStyle: p.visualStyle,
    price: p.price,
    currency: p.currency,
  };
}

function generationContext(
  campaign: Campaign,
  entitlement: Entitlement,
  hasProductImage: boolean,
  profile: Profile | null,
): GenerationContext {
  const s = campaign.productSnapshot;
  return {
    product: {
      name: s.name,
      description: s.description,
      category: s.category,
      targetAudience: s.targetAudience,
      mainBenefit: s.mainBenefit,
      keywords: s.keywords ?? [],
      visualStyle: s.visualStyle,
    },
    config: campaign.config,
    campaignAudience: campaign.targetAudience,
    storeVoice: profile?.targetAudience ?? null,
    hasProductImage,
    allowedTemplates: entitlement.plan.features.templates,
  };
}

const STYLE_PALETTES: Record<string, number[]> = {
  minimal: [0, 5, 3],
  warm: [2, 4, 0],
  bold: [1, 3, 2],
  elegant: [1, 5, 4],
  playful: [2, 3, 0],
  earthy: [4, 0, 1],
};

/** Base design for a newly generated pin, varied per angle so a campaign isn't monotone. */
export function initialDesign(
  template: TemplateId,
  angleIndex: number,
  visualStyle: string,
  profile: Profile | null,
  entitlement: Entitlement,
  hasImage: boolean,
): PinDesign {
  const palette = STYLE_PALETTES[visualStyle] ?? STYLE_PALETTES.minimal;
  const preset = COLOR_PRESETS[palette[angleIndex % palette.length]];
  const defaults = entitlement.plan.features.savedPreferences ? (profile?.campaignDefaults ?? {}) : {};
  const useCustom = entitlement.plan.features.customColors;
  return normalizeDesign({
    ...DEFAULT_DESIGN,
    template,
    background: (useCustom && defaults.background) || preset.background,
    textColor: (useCustom && defaults.textColor) || preset.textColor,
    accentColor: (useCustom && defaults.accentColor) || preset.accentColor,
    fontPreset: entitlement.plan.features.allFontPresets ? (defaults.fontPreset ?? "modern") : "modern",
    imagePlacement: hasImage ? "auto" : "none",
    showStoreName: Boolean(profile?.storeName),
  });
}

function destinationFor(snapshot: ProductSnapshot, profile: Profile | null): string | null {
  if (profile?.destinationBehavior === "shop_url") return profile.etsyShopUrl ?? snapshot.destinationUrl ?? null;
  return snapshot.destinationUrl ?? profile?.etsyShopUrl ?? null;
}

function angleRef(a: CampaignAngle | undefined | null): AngleRef | null {
  if (!a) return null;
  return { name: a.name, audience: a.audience, problem: a.problem, message: a.message, visualConcept: a.visualConcept, keywords: a.keywords };
}

function pinRef(p: Pin): ExistingPinRef {
  return {
    title: p.title,
    description: p.description,
    primaryKeyword: p.primaryKeyword,
    keywords: p.keywords,
    creativeConcept: p.creativeConcept,
    headline: p.headline,
    subheadline: p.subheadline,
    bullets: p.bullets,
    cta: p.cta,
    altText: p.altText,
    template: p.design.template,
  };
}

async function annotate(eventId: string, result: GenerationResult<unknown>) {
  try {
    await getAdminRepository().annotateUsage(
      eventId,
      { source: result.source, model: result.model, inputTokens: result.usage?.inputTokens, outputTokens: result.usage?.outputTokens },
      result.usage?.costUsd ?? null,
    );
  } catch (error) {
    logger.warn("usage.annotate_failed", { error });
  }
}

async function hasImage(repo: UserRepository, campaign: Campaign) {
  if (!campaign.productId) return false;
  const product = await repo.getProduct(campaign.productId);
  return Boolean(product && product.images.length > 0);
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
export async function createDraftCampaign(
  repo: UserRepository,
  input: { productId: string; name: string; targetAudience: string; config: CampaignConfig },
): Promise<Campaign> {
  const entitlement = await getEntitlement(repo);
  const limits = entitlement.plan.limits;
  if (input.config.pinCount > limits.pinsPerCampaign) {
    throw new CampaignRuleError(`Your ${entitlement.plan.name} plan allows up to ${limits.pinsPerCampaign} pins per campaign.`);
  }
  if (input.config.angleCount > limits.anglesPerCampaign) {
    throw new CampaignRuleError(`Your ${entitlement.plan.name} plan allows up to ${limits.anglesPerCampaign} angles per campaign.`);
  }
  if (input.config.template !== "auto" && !entitlement.plan.features.templates.includes(input.config.template)) {
    throw new CampaignRuleError("That template isn't included in your plan.");
  }
  const product = await repo.getProduct(input.productId);
  if (!product) throw new NotFoundError("Product");

  return repo.createCampaign({
    productId: product.id,
    name: input.name || `${product.name} — ${new Date().toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`,
    objective: input.config.objective,
    targetAudience: input.targetAudience || product.targetAudience,
    language: input.config.language,
    config: input.config,
    productSnapshot: productSnapshot(product),
    status: "draft",
    generationSource: null,
    aiModel: null,
  });
}

// ---------------------------------------------------------------------------
// Angles
// ---------------------------------------------------------------------------
export async function generateAngles(repo: UserRepository, campaignId: string): Promise<CampaignWithDetails> {
  const campaign = await repo.getCampaign(campaignId);
  if (!campaign) throw new NotFoundError("Campaign");
  if (campaign.pins.length > 0) throw new CampaignRuleError("This campaign already has pins. Regenerate individual pins instead.");

  const entitlement = await getEntitlement(repo);
  const isFirst = campaign.angles.length === 0 && !campaign.generationSource;
  await enforceGenerationRateLimit(repo.userId);
  const reservation = await reserveUsage(repo.userId, entitlement, isFirst ? "campaign_generation" : "regeneration", 1, {
    campaignId,
    step: "angles",
  });

  try {
    const profile = await repo.getProfile();
    const ctx = generationContext(campaign, entitlement, await hasImage(repo, campaign), profile);
    const result = await getCopyProvider().generateAngles(ctx, campaign.config.angleCount);
    await repo.replaceAngles(
      campaignId,
      result.data.map((a, i) => ({ ...a, position: i, selected: true })),
    );
    await repo.updateCampaign(campaignId, { generationSource: result.source, aiModel: result.model });
    await annotate(reservation.eventId, result);
  } catch (error) {
    await reservation.release().catch(() => undefined);
    throw error;
  }

  const updated = await repo.getCampaign(campaignId);
  if (!updated) throw new NotFoundError("Campaign");
  return updated;
}

// ---------------------------------------------------------------------------
// Pins
// ---------------------------------------------------------------------------
export async function generatePins(repo: UserRepository, campaignId: string): Promise<CampaignWithDetails> {
  const campaign = await repo.getCampaign(campaignId);
  if (!campaign) throw new NotFoundError("Campaign");
  if (campaign.pins.length > 0) throw new CampaignRuleError("Pins have already been generated for this campaign.");
  const angles = campaign.angles.filter((a) => a.selected);
  if (angles.length === 0) throw new CampaignRuleError("Select at least one angle first.");

  const entitlement = await getEntitlement(repo);
  const count = Math.min(campaign.config.pinCount, entitlement.plan.limits.pinsPerCampaign);
  if (count < angles.length) throw new CampaignRuleError("Select no more angles than the number of pins.");

  await enforceGenerationRateLimit(repo.userId);
  const reservation = await reserveUsage(repo.userId, entitlement, "pin_generation", count, { campaignId });

  try {
    const profile = await repo.getProfile();
    const imageAvailable = await hasImage(repo, campaign);
    const ctx = generationContext(campaign, entitlement, imageAvailable, profile);
    const result = await getCopyProvider().generatePins(ctx, angles.map((a) => angleRef(a)!), count);

    const destination = destinationFor(campaign.productSnapshot, profile);
    const forcedTemplate = campaign.config.template !== "auto" ? campaign.config.template : null;
    const allowed = entitlement.plan.features.templates;
    const angleCounters = new Map<number, number>();

    const writes: PinWrite[] = result.data.map((d, i) => {
      const angle = angles[d.angleIndex] ?? angles[0];
      const nth = (angleCounters.get(d.angleIndex) ?? 0) + 1;
      angleCounters.set(d.angleIndex, nth);
      const template = forcedTemplate ?? (allowed.includes(d.template) ? d.template : allowed[0]);
      return {
        productId: campaign.productId,
        angleId: angle.id,
        position: i,
        title: d.title,
        description: d.description,
        primaryKeyword: d.primaryKeyword,
        keywords: d.keywords,
        creativeConcept: d.creativeConcept,
        headline: d.headline,
        subheadline: d.subheadline,
        bullets: TEMPLATE_META[template].usesBullets ? d.bullets : d.bullets.slice(0, 4),
        cta: d.cta,
        destinationUrl: destination,
        altText: d.altText,
        filename: pinExportFilename(campaign.productSnapshot.name, angle.name, i + 1),
        design: initialDesign(template, d.angleIndex, campaign.config.visualStyle, profile, entitlement, imageAvailable),
        editedFields: [],
        status: "draft",
        plannedFor: null,
        publishedAt: null,
        publishedMethod: null,
      };
    });

    await repo.insertPins(campaignId, writes);
    await repo.updateCampaign(campaignId, { generationSource: result.source, aiModel: result.model, status: "draft" });
    await annotate(reservation.eventId, result);
  } catch (error) {
    await reservation.release().catch(() => undefined);
    throw error;
  }

  const updated = await repo.getCampaign(campaignId);
  if (!updated) throw new NotFoundError("Campaign");
  return updated;
}

const COPY_FIELDS: EditablePinField[] = ["title", "description", "primaryKeyword", "keywords", "cta", "altText"];
const CREATIVE_FIELDS: EditablePinField[] = ["creativeConcept", "headline", "subheadline", "bullets"];

/**
 * Regenerate one pin's copy or creative concept. Fields the user edited by
 * hand are preserved unless `overwriteEdits` is set. Only this pin is sent to
 * the provider — the rest of the campaign is untouched.
 */
export async function regeneratePin(
  repo: UserRepository,
  pinId: string,
  mode: "copy" | "creative",
  overwriteEdits = false,
): Promise<{ pin: Pin; keptFields: EditablePinField[] }> {
  const pin = await repo.getPin(pinId);
  if (!pin) throw new NotFoundError("Pin");
  const campaign = await repo.getCampaign(pin.campaignId);
  if (!campaign) throw new NotFoundError("Campaign");

  const entitlement = await getEntitlement(repo);
  await enforceGenerationRateLimit(repo.userId);
  const reservation = await reserveUsage(repo.userId, entitlement, "regeneration", 1, { pinId, mode });

  try {
    const profile = await repo.getProfile();
    const ctx = generationContext(campaign, entitlement, await hasImage(repo, campaign), profile);
    const angle = angleRef(campaign.angles.find((a) => a.id === pin.angleId));
    const provider = getCopyProvider();
    const fields = mode === "copy" ? COPY_FIELDS : CREATIVE_FIELDS;
    const kept = overwriteEdits ? [] : fields.filter((f) => pin.editedFields.includes(f));
    const patch: PinPatch = {};
    let result: GenerationResult<unknown>;

    if (mode === "copy") {
      const siblings = campaign.pins.filter((p) => p.id !== pin.id).map((p) => p.title);
      const r = await provider.regeneratePinCopy(ctx, angle, pinRef(pin), siblings);
      result = r;
      for (const f of COPY_FIELDS) if (!kept.includes(f)) Object.assign(patch, { [f]: r.data[f as keyof typeof r.data] });
    } else {
      const r = await provider.regenerateCreative(ctx, angle, pinRef(pin));
      result = r;
      for (const f of CREATIVE_FIELDS) if (!kept.includes(f)) Object.assign(patch, { [f]: r.data[f as keyof typeof r.data] });
      if (entitlement.plan.features.templates.includes(r.data.template)) {
        patch.design = { ...pin.design, template: r.data.template };
      }
    }

    if (overwriteEdits) patch.editedFields = pin.editedFields.filter((f) => !fields.includes(f));
    // A regenerated pin needs a fresh review before it counts as approved.
    if (pin.status === "approved") patch.status = "draft";

    const updated = await repo.updatePin(pinId, patch);
    if (!updated) throw new NotFoundError("Pin");
    await annotate(reservation.eventId, result);
    await refreshCampaignStatus(repo, campaign.id);
    return { pin: updated, keptFields: kept };
  } catch (error) {
    await reservation.release().catch(() => undefined);
    if (error instanceof AiError) logger.warn("pin.regenerate_failed", { kind: error.kind });
    throw error;
  }
}

/** Apply a manual edit; records which fields the user changed so regeneration keeps them. */
export async function applyPinEdit(repo: UserRepository, pinId: string, input: PinEditInput): Promise<Pin> {
  const pin = await repo.getPin(pinId);
  if (!pin) throw new NotFoundError("Pin");
  const entitlement = await getEntitlement(repo);
  const features = entitlement.plan.features;

  let design = input.design;
  if (!features.templates.includes(design.template)) {
    throw new CampaignRuleError("That template isn't included in your plan.");
  }
  if (!features.customColors) {
    const preset = COLOR_PRESETS.find((c) => c.background === design.background && c.textColor === design.textColor && c.accentColor === design.accentColor);
    if (!preset) design = { ...design, background: pin.design.background, textColor: pin.design.textColor, accentColor: pin.design.accentColor };
  }
  if (!features.allFontPresets && design.fontPreset !== "modern") design = { ...design, fontPreset: "modern" };

  const edited = new Set(pin.editedFields);
  for (const f of EDITABLE_PIN_FIELDS) {
    const before = pin[f];
    const after = input[f];
    if (JSON.stringify(before ?? null) !== JSON.stringify(after ?? null)) edited.add(f);
  }

  const updated = await repo.updatePin(pinId, {
    title: input.title,
    description: input.description,
    primaryKeyword: input.primaryKeyword,
    keywords: input.keywords,
    creativeConcept: input.creativeConcept,
    headline: input.headline,
    subheadline: input.subheadline,
    bullets: input.bullets,
    cta: input.cta,
    destinationUrl: input.destinationUrl,
    altText: input.altText,
    filename: input.filename || pin.filename,
    design,
    editedFields: [...edited],
  });
  if (!updated) throw new NotFoundError("Pin");
  return updated;
}

export async function refreshCampaignStatus(repo: UserRepository, campaignId: string): Promise<void> {
  const campaign = await repo.getCampaign(campaignId);
  if (!campaign) return;
  const next = deriveCampaignStatus(campaign.pins, campaign.status);
  if (next !== campaign.status) await repo.updateCampaign(campaignId, { status: next });
}

export async function assertCalendarAccess(repo: UserRepository) {
  assertFeature(await getEntitlement(repo), "calendar", "The content calendar");
}
