import "server-only";
import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/actions";
import { assertFeature, getEntitlement } from "@/lib/billing/usage";
import { applyPinEdit, refreshCampaignStatus, regeneratePin } from "@/lib/campaigns/service";
import { canTransitionPin } from "@/lib/campaigns/status";
import { fieldErrors, pinEditSchema } from "@/lib/validations/schemas";
import type { EditablePinField, Pin } from "@/types/domain";
import type { OpCtx } from "./context";

const id = z.uuid();
const notFound = () => fail("Pin not found.", { code: "not_found" });
const statusSchema = z.enum(["draft", "approved", "published", "archived"]);

export async function savePin({ repo }: OpCtx, pinId: string, raw: unknown): Promise<ActionResult<Pin>> {
  if (!id.safeParse(pinId).success) return notFound();
  const parsed = pinEditSchema.safeParse(raw);
  if (!parsed.success) return fail("Please check the highlighted fields.", { code: "validation", fieldErrors: fieldErrors(parsed.error) });
  return ok(await applyPinEdit(repo, pinId, parsed.data));
}

export async function regenerate(
  { repo }: OpCtx,
  pinId: string,
  mode: unknown,
  overwriteEdits: unknown,
): Promise<ActionResult<{ pin: Pin; keptFields: EditablePinField[] }>> {
  if (!id.safeParse(pinId).success) return notFound();
  if (mode !== "copy" && mode !== "creative") return fail("Choose what to regenerate.", { code: "validation" });
  return ok(await regeneratePin(repo, pinId, mode, overwriteEdits === true));
}

export async function duplicatePin({ repo }: OpCtx, pinId: string): Promise<ActionResult<Pin>> {
  if (!id.safeParse(pinId).success) return notFound();
  const pin = await repo.getPin(pinId);
  if (!pin) return notFound();
  const campaign = await repo.getCampaign(pin.campaignId);
  const entitlement = await getEntitlement(repo);
  const activeCount = campaign?.pins.filter((p) => p.status !== "archived").length ?? 0;
  if (activeCount >= entitlement.plan.limits.pinsPerCampaign) {
    return fail(`Your ${entitlement.plan.name} plan allows up to ${entitlement.plan.limits.pinsPerCampaign} pins per campaign.`, { code: "quota" });
  }
  const maxPos = Math.max(0, ...(campaign?.pins.map((p) => p.position) ?? [0]));
  /* eslint-disable @typescript-eslint/no-unused-vars -- strip identity fields from the copy */
  const { id: _id, campaignId, userId, createdAt, updatedAt, ...rest } = pin;
  /* eslint-enable @typescript-eslint/no-unused-vars */
  const [copy] = await repo.insertPins(campaignId, [
    {
      ...rest,
      position: maxPos + 1,
      title: pin.title.length <= 93 ? `${pin.title} (copy)` : pin.title,
      filename: pin.filename ? `${pin.filename}-copy` : pin.filename,
      status: "draft",
      plannedFor: null,
      publishedAt: null,
      publishedMethod: null,
    },
  ]);
  await refreshCampaignStatus(repo, campaignId);
  return ok(copy);
}

export async function deletePin({ repo }: OpCtx, pinId: string): Promise<ActionResult<{ campaignId: string }>> {
  if (!id.safeParse(pinId).success) return notFound();
  const pin = await repo.getPin(pinId);
  if (!pin) return notFound();
  await repo.deletePin(pinId);
  await refreshCampaignStatus(repo, pin.campaignId);
  return ok({ campaignId: pin.campaignId });
}

export async function setPinStatus({ repo }: OpCtx, pinId: string, status: unknown): Promise<ActionResult<Pin>> {
  const parsed = z.object({ pinId: id, status: statusSchema }).safeParse({ pinId, status });
  if (!parsed.success) return fail("Invalid request.", { code: "validation" });
  const next = parsed.data.status;
  const pin = await repo.getPin(pinId);
  if (!pin) return notFound();
  if (!canTransitionPin(pin.status, next)) {
    return fail(next === "published" ? "Approve the pin before marking it as published." : "That status change isn't allowed.", { code: "rule" });
  }
  const updated = await repo.updatePin(pinId, {
    status: next,
    publishedAt: next === "published" ? new Date().toISOString() : next === "approved" ? null : pin.publishedAt,
    publishedMethod: next === "published" ? "manual" : next === "approved" ? null : pin.publishedMethod,
  });
  await refreshCampaignStatus(repo, pin.campaignId);
  return updated ? ok(updated) : notFound();
}

export async function approveAll({ repo }: OpCtx, campaignId: string): Promise<ActionResult<{ approved: number }>> {
  if (!id.safeParse(campaignId).success) return fail("Campaign not found.", { code: "not_found" });
  const campaign = await repo.getCampaign(campaignId);
  if (!campaign) return fail("Campaign not found.", { code: "not_found" });
  // Only pins with the essentials filled in can be approved.
  const ids = campaign.pins.filter((p) => p.status === "draft" && p.title && p.description && p.headline).map((p) => p.id);
  const approved = await repo.updatePins(ids, { status: "approved" });
  await refreshCampaignStatus(repo, campaignId);
  return ok({ approved });
}

export async function setPlannedDate({ repo }: OpCtx, pinId: string, date: unknown): Promise<ActionResult<Pin>> {
  const parsed = z.object({ pinId: id, date: z.iso.date().nullable() }).safeParse({ pinId, date });
  if (!parsed.success) return fail("Choose a valid date.", { code: "validation" });
  assertFeature(await getEntitlement(repo), "calendar", "The content calendar");
  const pin = await repo.getPin(pinId);
  if (!pin) return notFound();
  const updated = await repo.updatePin(pinId, { plannedFor: parsed.data.date });
  await refreshCampaignStatus(repo, pin.campaignId);
  return updated ? ok(updated) : notFound();
}
