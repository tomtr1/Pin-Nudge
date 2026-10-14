"use server";

import { revalidatePath } from "next/cache";
import { withUser, type ActionResult } from "@/lib/actions";
import * as metrics from "@/lib/operations/metrics";
import type { PinMetric } from "@/types/domain";

/** Record manually reported metrics for a pin. Always stored with source "manual". */
export async function addMetricAction(input: unknown): Promise<ActionResult<PinMetric>> {
  return withUser("metrics.add", async (ctx) => {
    const result = await metrics.addMetric(ctx, input);
    if (result.ok) revalidatePath("/analytics");
    return result;
  });
}

export async function deleteMetricAction(metricId: string): Promise<ActionResult> {
  return withUser("metrics.delete", async (ctx) => {
    const result = await metrics.deleteMetric(ctx, metricId);
    if (result.ok) revalidatePath("/analytics");
    return result;
  });
}
