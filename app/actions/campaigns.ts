"use server";

import { revalidatePath } from "next/cache";
import { withUser, type ActionResult } from "@/lib/actions";
import * as campaigns from "@/lib/operations/campaigns";
import type { CampaignWithDetails } from "@/types/domain";

export async function createCampaignAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return withUser("campaigns.create", async (ctx) => {
    const result = await campaigns.createCampaign(ctx, input);
    if (result.ok) revalidatePath("/campaigns");
    return result;
  });
}

export async function generateAnglesAction(campaignId: string): Promise<ActionResult<CampaignWithDetails>> {
  return withUser("campaigns.angles", async (ctx) => {
    const result = await campaigns.runAngleGeneration(ctx, campaignId);
    if (result.ok) revalidatePath(`/campaigns/${campaignId}`);
    return result;
  });
}

export async function updateAngleAction(input: unknown): Promise<ActionResult> {
  return withUser("campaigns.angle", async (ctx) => {
    const result = await campaigns.updateAngle(ctx, input);
    return result.ok ? { ok: true, data: undefined } : result;
  });
}

export async function generatePinsAction(campaignId: string): Promise<ActionResult<CampaignWithDetails>> {
  return withUser("campaigns.pins", async (ctx) => {
    const result = await campaigns.runPinGeneration(ctx, campaignId);
    if (result.ok) {
      revalidatePath(`/campaigns/${campaignId}`);
      revalidatePath("/campaigns");
      revalidatePath("/dashboard");
    }
    return result;
  });
}

export async function renameCampaignAction(campaignId: string, name: string): Promise<ActionResult> {
  return withUser("campaigns.rename", async (ctx) => {
    const result = await campaigns.renameCampaign(ctx, campaignId, name);
    if (result.ok) revalidatePath(`/campaigns/${campaignId}`);
    return result;
  });
}

export async function setCampaignArchivedAction(campaignId: string, archived: boolean): Promise<ActionResult> {
  return withUser("campaigns.archive", async (ctx) => {
    const result = await campaigns.setCampaignArchived(ctx, campaignId, archived);
    if (result.ok) {
      revalidatePath(`/campaigns/${campaignId}`);
      revalidatePath("/campaigns");
    }
    return result;
  });
}

export async function deleteCampaignAction(campaignId: string): Promise<ActionResult> {
  return withUser("campaigns.delete", async (ctx) => {
    const result = await campaigns.deleteCampaign(ctx, campaignId);
    if (result.ok) {
      revalidatePath("/campaigns");
      revalidatePath("/dashboard");
    }
    return result;
  });
}
