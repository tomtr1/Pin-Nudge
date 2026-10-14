"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, withUser, type ActionResult } from "@/lib/actions";
import { assertFeature, getEntitlement } from "@/lib/billing/usage";
import { fieldErrors, metricInputSchema } from "@/lib/validations/schemas";
import type { PinMetric } from "@/types/domain";

/** Record manually reported metrics for a pin. Always stored with source "manual". */
export async function addMetricAction(input: unknown): Promise<ActionResult<PinMetric>> {
  return withUser("metrics.add", async ({ repo }) => {
    assertFeature(await getEntitlement(repo), "analytics", "Performance tracking");
    const parsed = metricInputSchema.safeParse(input);
    if (!parsed.success) return fail("Please check the highlighted fields.", { code: "validation", fieldErrors: fieldErrors(parsed.error) });
    const pin = await repo.getPin(parsed.data.pinId);
    if (!pin) return fail("Pin not found.", { code: "not_found" });
    const metric = await repo.addMetric({ ...parsed.data, source: "manual" });
    revalidatePath("/analytics");
    return ok(metric);
  });
}

export async function deleteMetricAction(metricId: string): Promise<ActionResult> {
  return withUser("metrics.delete", async ({ repo }) => {
    if (!z.uuid().safeParse(metricId).success) return fail("Entry not found.", { code: "not_found" });
    const deleted = await repo.deleteMetric(metricId);
    if (!deleted) return fail("Entry not found.", { code: "not_found" });
    revalidatePath("/analytics");
    return ok();
  });
}
