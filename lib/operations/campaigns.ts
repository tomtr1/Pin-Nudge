import "server-only";
import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/actions";
import { createDraftCampaign, generateAngles, generatePins, refreshCampaignStatus } from "@/lib/campaigns/service";
import { angleEditSchema, campaignCreateSchema, fieldErrors } from "@/lib/validations/schemas";
import type { CampaignAngle, CampaignWithDetails } from "@/types/domain";
import type { OpCtx } from "./context";

const id = z.uuid();
const notFound = () => fail("Campaign not found.", { code: "not_found" });

export async function createCampaign({ repo }: OpCtx, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = campaignCreateSchema.safeParse(raw);
  if (!parsed.success) return fail("Please check the campaign settings.", { code: "validation", fieldErrors: fieldErrors(parsed.error) });
  const campaign = await createDraftCampaign(repo, parsed.data);
  return ok({ id: campaign.id });
}

export async function getCampaign({ repo }: OpCtx, campaignId: string): Promise<ActionResult<CampaignWithDetails>> {
  if (!id.safeParse(campaignId).success) return notFound();
  const campaign = await repo.getCampaign(campaignId);
  return campaign ? ok(campaign) : notFound();
}

export async function runAngleGeneration({ repo }: OpCtx, campaignId: string): Promise<ActionResult<CampaignWithDetails>> {
  if (!id.safeParse(campaignId).success) return notFound();
  return ok(await generateAngles(repo, campaignId));
}

export async function updateAngle({ repo }: OpCtx, raw: unknown): Promise<ActionResult<CampaignAngle>> {
  const parsed = angleEditSchema.safeParse(raw);
  if (!parsed.success) return fail("Please check the angle details.", { code: "validation", fieldErrors: fieldErrors(parsed.error) });
  const { id: angleId, ...patch } = parsed.data;
  const updated = await repo.updateAngle(angleId, patch);
  return updated ? ok(updated) : fail("Angle not found.", { code: "not_found" });
}

export async function runPinGeneration({ repo }: OpCtx, campaignId: string): Promise<ActionResult<CampaignWithDetails>> {
  if (!id.safeParse(campaignId).success) return notFound();
  return ok(await generatePins(repo, campaignId));
}

export async function renameCampaign({ repo }: OpCtx, campaignId: string, name: unknown): Promise<ActionResult> {
  const parsed = z.object({ id, name: z.string().trim().min(1, "Enter a name.").max(160) }).safeParse({ id: campaignId, name });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid name.", { code: "validation" });
  const updated = await repo.updateCampaign(campaignId, { name: parsed.data.name });
  return updated ? ok() : notFound();
}

export async function setCampaignArchived({ repo }: OpCtx, campaignId: string, archived: boolean): Promise<ActionResult> {
  if (!id.safeParse(campaignId).success) return notFound();
  const updated = await repo.updateCampaign(campaignId, { status: archived ? "archived" : "draft" });
  if (!updated) return notFound();
  if (!archived) await refreshCampaignStatus(repo, campaignId);
  return ok();
}

export async function deleteCampaign({ repo }: OpCtx, campaignId: string): Promise<ActionResult> {
  if (!id.safeParse(campaignId).success) return notFound();
  return (await repo.deleteCampaign(campaignId)) ? ok() : notFound();
}
