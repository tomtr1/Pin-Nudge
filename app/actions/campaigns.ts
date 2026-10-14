"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, withUser, type ActionResult } from "@/lib/actions";
import { createDraftCampaign, generateAngles, generatePins, refreshCampaignStatus } from "@/lib/campaigns/service";
import { angleEditSchema, campaignCreateSchema, fieldErrors } from "@/lib/validations/schemas";
import type { CampaignWithDetails } from "@/types/domain";

const id = z.uuid();

export async function createCampaignAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return withUser("campaigns.create", async ({ repo }) => {
    const parsed = campaignCreateSchema.safeParse(input);
    if (!parsed.success) return fail("Please check the campaign settings.", { code: "validation", fieldErrors: fieldErrors(parsed.error) });
    const campaign = await createDraftCampaign(repo, parsed.data);
    revalidatePath("/campaigns");
    return ok({ id: campaign.id });
  });
}

export async function generateAnglesAction(campaignId: string): Promise<ActionResult<CampaignWithDetails>> {
  return withUser("campaigns.angles", async ({ repo }) => {
    if (!id.safeParse(campaignId).success) return fail("Campaign not found.", { code: "not_found" });
    const campaign = await generateAngles(repo, campaignId);
    revalidatePath(`/campaigns/${campaignId}`);
    return ok(campaign);
  });
}

export async function updateAngleAction(input: unknown): Promise<ActionResult> {
  return withUser("campaigns.angle", async ({ repo }) => {
    const parsed = angleEditSchema.safeParse(input);
    if (!parsed.success) return fail("Please check the angle details.", { code: "validation", fieldErrors: fieldErrors(parsed.error) });
    const { id: angleId, ...patch } = parsed.data;
    const updated = await repo.updateAngle(angleId, patch);
    if (!updated) return fail("Angle not found.", { code: "not_found" });
    return ok();
  });
}

export async function generatePinsAction(campaignId: string): Promise<ActionResult<CampaignWithDetails>> {
  return withUser("campaigns.pins", async ({ repo }) => {
    if (!id.safeParse(campaignId).success) return fail("Campaign not found.", { code: "not_found" });
    const campaign = await generatePins(repo, campaignId);
    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath("/campaigns");
    revalidatePath("/dashboard");
    return ok(campaign);
  });
}

export async function renameCampaignAction(campaignId: string, name: string): Promise<ActionResult> {
  return withUser("campaigns.rename", async ({ repo }) => {
    const parsed = z.object({ id, name: z.string().trim().min(1, "Enter a name.").max(160) }).safeParse({ id: campaignId, name });
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid name.", { code: "validation" });
    const updated = await repo.updateCampaign(campaignId, { name: parsed.data.name });
    if (!updated) return fail("Campaign not found.", { code: "not_found" });
    revalidatePath(`/campaigns/${campaignId}`);
    return ok();
  });
}

export async function setCampaignArchivedAction(campaignId: string, archived: boolean): Promise<ActionResult> {
  return withUser("campaigns.archive", async ({ repo }) => {
    if (!id.safeParse(campaignId).success) return fail("Campaign not found.", { code: "not_found" });
    const updated = await repo.updateCampaign(campaignId, { status: archived ? "archived" : "draft" });
    if (!updated) return fail("Campaign not found.", { code: "not_found" });
    if (!archived) await refreshCampaignStatus(repo, campaignId);
    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath("/campaigns");
    return ok();
  });
}

export async function deleteCampaignAction(campaignId: string): Promise<ActionResult> {
  return withUser("campaigns.delete", async ({ repo }) => {
    if (!id.safeParse(campaignId).success) return fail("Campaign not found.", { code: "not_found" });
    const deleted = await repo.deleteCampaign(campaignId);
    if (!deleted) return fail("Campaign not found.", { code: "not_found" });
    revalidatePath("/campaigns");
    revalidatePath("/dashboard");
    return ok();
  });
}
