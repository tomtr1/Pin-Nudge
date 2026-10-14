"use server";

import { revalidatePath } from "next/cache";
import { withUser, type ActionResult } from "@/lib/actions";
import * as pins from "@/lib/operations/pins";
import type { EditablePinField, Pin, PinStatus } from "@/types/domain";

const refreshCampaign = (campaignId: string) => revalidatePath(`/campaigns/${campaignId}`);

export async function savePinAction(pinId: string, input: unknown): Promise<ActionResult<Pin>> {
  return withUser("pins.save", async (ctx) => {
    const result = await pins.savePin(ctx, pinId, input);
    if (result.ok) refreshCampaign(result.data.campaignId);
    return result;
  });
}

export async function regeneratePinAction(
  pinId: string,
  mode: "copy" | "creative",
  overwriteEdits = false,
): Promise<ActionResult<{ pin: Pin; keptFields: EditablePinField[] }>> {
  return withUser("pins.regenerate", async (ctx) => {
    const result = await pins.regenerate(ctx, pinId, mode, Boolean(overwriteEdits));
    if (result.ok) refreshCampaign(result.data.pin.campaignId);
    return result;
  });
}

export async function duplicatePinAction(pinId: string): Promise<ActionResult<Pin>> {
  return withUser("pins.duplicate", async (ctx) => {
    const result = await pins.duplicatePin(ctx, pinId);
    if (result.ok) refreshCampaign(result.data.campaignId);
    return result;
  });
}

export async function deletePinAction(pinId: string): Promise<ActionResult> {
  return withUser("pins.delete", async (ctx) => {
    const result = await pins.deletePin(ctx, pinId);
    if (!result.ok) return result;
    refreshCampaign(result.data.campaignId);
    return { ok: true, data: undefined };
  });
}

export async function setPinStatusAction(pinId: string, status: PinStatus): Promise<ActionResult<Pin>> {
  return withUser("pins.status", async (ctx) => {
    const result = await pins.setPinStatus(ctx, pinId, status);
    if (result.ok) {
      refreshCampaign(result.data.campaignId);
      revalidatePath("/calendar");
    }
    return result;
  });
}

export async function approveAllPinsAction(campaignId: string): Promise<ActionResult<{ approved: number }>> {
  return withUser("pins.approveAll", async (ctx) => {
    const result = await pins.approveAll(ctx, campaignId);
    if (result.ok) refreshCampaign(campaignId);
    return result;
  });
}

export async function setPlannedDateAction(pinId: string, date: string | null): Promise<ActionResult<Pin>> {
  return withUser("pins.plan", async (ctx) => {
    const result = await pins.setPlannedDate(ctx, pinId, date);
    if (result.ok) {
      revalidatePath("/calendar");
      refreshCampaign(result.data.campaignId);
    }
    return result;
  });
}
