import "server-only";
import { zipSync, strToU8 } from "fflate";
import type { UserRepository } from "@/lib/data";
import { renderPinPng } from "@/lib/render";
import { renderInputForPin } from "@/lib/render/pin-input";
import { dedupeFilenames, sanitizeFilename, slugify } from "@/lib/validations/filenames";
import type { CampaignWithDetails, Pin } from "@/types/domain";
import { pinsToCsv } from "./csv";
import { campaignSummaryMarkdown } from "./summary";

export function exportFilenames(pins: Pin[], ext = "png"): string[] {
  return dedupeFilenames(pins.map((p, i) => `${sanitizeFilename(p.filename || p.title, `pin-${i + 1}`)}.${ext}`));
}

export function campaignSlug(c: CampaignWithDetails) {
  return slugify(c.name) || "campaign";
}

/** ZIP with every approved pin as PNG plus pins.csv and campaign-summary.md. */
export async function buildCampaignZip(repo: UserRepository, campaign: CampaignWithDetails, pins: Pin[]): Promise<Uint8Array> {
  const product = campaign.productId ? await repo.getProduct(campaign.productId) : null;
  const profile = await repo.getProfile();
  const names = exportFilenames(pins);
  const files: Record<string, [Uint8Array, { level: 0 | 6 }]> = {};
  // Render sequentially to keep memory bounded on serverless instances.
  for (let i = 0; i < pins.length; i++) {
    const png = await renderPinPng(await renderInputForPin(repo, pins[i], { product, profile }), 1);
    files[names[i]] = [png, { level: 0 }];
  }
  files["pins.csv"] = [strToU8(pinsToCsv(pins, campaign.angles, names, campaign.generationSource)), { level: 6 }];
  files["campaign-summary.md"] = [strToU8(campaignSummaryMarkdown({ ...campaign, pins }, names)), { level: 6 }];
  return zipSync(files);
}
