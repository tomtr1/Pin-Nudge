"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, withUser, type ActionResult } from "@/lib/actions";
import { assertFeature, getEntitlement } from "@/lib/billing/usage";
import { applyPinEdit, refreshCampaignStatus, regeneratePin } from "@/lib/campaigns/service";
import { canTransitionPin } from "@/lib/campaigns/status";
import { fieldErrors, pinEditSchema } from "@/lib/validations/schemas";
import type { EditablePinField, Pin, PinStatus } from "@/types/domain";

const id = z.uuid();

export async function savePinAction(pinId: string, input: unknown): Promise<ActionResult<Pin>> {
  return withUser("pins.save", async ({ repo }) => {
    if (!id.safeParse(pinId).success) return fail("Pin not found.", { code: "not_found" });
    const parsed = pinEditSchema.safeParse(input);
    if (!parsed.success) return fail("Please check the highlighted fields.", { code: "validation", fieldErrors: fieldErrors(parsed.error) });
    const pin = await applyPinEdit(repo, pinId, parsed.data);
    revalidatePath(`/campaigns/${pin.campaignId}`);
    return ok(pin);
  });
}

export async function regeneratePinAction(
  pinId: string,
  mode: "copy" | "creative",
  overwriteEdits = false,
): Promise<ActionResult<{ pin: Pin; keptFields: EditablePinField[] }>> {
  return withUser("pins.regenerate", async ({ repo }) => {
    if (!id.safeParse(pinId).success || !["copy", "creative"].includes(mode)) return fail("Pin not found.", { code: "not_found" });
    const result = await regeneratePin(repo, pinId, mode, Boolean(overwriteEdits));
    revalidatePath(`/campaigns/${result.pin.campaignId}`);
    return ok(result);
  });
}

export async function duplicatePinAction(pinId: string): Promise<ActionResult<Pin>> {
  return withUser("pins.duplicate", async ({ repo }) => {
    if (!id.safeParse(pinId).success) return fail("Pin not found.", { code: "not_found" });
    const pin = await repo.getPin(pinId);
    if (!pin) return fail("Pin not found.", { code: "not_found" });
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
    revalidatePath(`/campaigns/${campaignId}`);
    return ok(copy);
  });
}

export async function deletePinAction(pinId: string): Promise<ActionResult> {
  return withUser("pins.delete", async ({ repo }) => {
    if (!id.safeParse(pinId).success) return fail("Pin not found.", { code: "not_found" });
    const pin = await repo.getPin(pinId);
    if (!pin) return fail("Pin not found.", { code: "not_found" });
    await repo.deletePin(pinId);
    await refreshCampaignStatus(repo, pin.campaignId);
    revalidatePath(`/campaigns/${pin.campaignId}`);
    return ok();
  });
}

const statusSchema = z.enum(["draft", "approved", "published", "archived"]);

export async function setPinStatusAction(pinId: string, status: PinStatus): Promise<ActionResult<Pin>> {
  return withUser("pins.status", async ({ repo }) => {
    const parsed = z.object({ pinId: id, status: statusSchema }).safeParse({ pinId, status });
    if (!parsed.success) return fail("Invalid request.", { code: "validation" });
    const pin = await repo.getPin(pinId);
    if (!pin) return fail("Pin not found.", { code: "not_found" });
    if (!canTransitionPin(pin.status, status)) {
      return fail(status === "published" ? "Approve the pin before marking it as published." : "That status change isn't allowed.", { code: "rule" });
    }
    const updated = await repo.updatePin(pinId, {
      status,
      publishedAt: status === "published" ? new Date().toISOString() : status === "approved" ? null : pin.publishedAt,
      publishedMethod: status === "published" ? "manual" : status === "approved" ? null : pin.publishedMethod,
    });
    await refreshCampaignStatus(repo, pin.campaignId);
    revalidatePath(`/campaigns/${pin.campaignId}`);
    revalidatePath("/calendar");
    return updated ? ok(updated) : fail("Pin not found.", { code: "not_found" });
  });
}

export async function approveAllPinsAction(campaignId: string): Promise<ActionResult<{ approved: number }>> {
  return withUser("pins.approveAll", async ({ repo }) => {
    if (!id.safeParse(campaignId).success) return fail("Campaign not found.", { code: "not_found" });
    const campaign = await repo.getCampaign(campaignId);
    if (!campaign) return fail("Campaign not found.", { code: "not_found" });
    // Only pins with the essentials filled in can be approved.
    const ids = campaign.pins.filter((p) => p.status === "draft" && p.title && p.description && p.headline).map((p) => p.id);
    const approved = await repo.updatePins(ids, { status: "approved" });
    await refreshCampaignStatus(repo, campaignId);
    revalidatePath(`/campaigns/${campaignId}`);
    return ok({ approved });
  });
}

export async function setPlannedDateAction(pinId: string, date: string | null): Promise<ActionResult<Pin>> {
  return withUser("pins.plan", async ({ repo }) => {
    const parsed = z.object({ pinId: id, date: z.iso.date().nullable() }).safeParse({ pinId, date });
    if (!parsed.success) return fail("Choose a valid date.", { code: "validation" });
    assertFeature(await getEntitlement(repo), "calendar", "The content calendar");
    const pin = await repo.getPin(pinId);
    if (!pin) return fail("Pin not found.", { code: "not_found" });
    const updated = await repo.updatePin(pinId, { plannedFor: parsed.data.date });
    await refreshCampaignStatus(repo, pin.campaignId);
    revalidatePath("/calendar");
    revalidatePath(`/campaigns/${pin.campaignId}`);
    return updated ? ok(updated) : fail("Pin not found.", { code: "not_found" });
  });
}
