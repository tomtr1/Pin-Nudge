import "server-only";
import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/actions";
import { assertFeature, getEntitlement } from "@/lib/billing/usage";
import { fieldErrors, metricInputSchema } from "@/lib/validations/schemas";
import type { PinMetric } from "@/types/domain";
import type { OpCtx } from "./context";

/** Record manually reported metrics for a pin. Always stored with source "manual". */
export async function addMetric({ repo }: OpCtx, raw: unknown): Promise<ActionResult<PinMetric>> {
  assertFeature(await getEntitlement(repo), "analytics", "Performance tracking");
  const parsed = metricInputSchema.safeParse(raw);
  if (!parsed.success) return fail("Please check the highlighted fields.", { code: "validation", fieldErrors: fieldErrors(parsed.error) });
  const pin = await repo.getPin(parsed.data.pinId);
  if (!pin) return fail("Pin not found.", { code: "not_found" });
  return ok(await repo.addMetric({ ...parsed.data, source: "manual" }));
}

export async function deleteMetric({ repo }: OpCtx, metricId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(metricId).success) return fail("Entry not found.", { code: "not_found" });
  return (await repo.deleteMetric(metricId)) ? ok() : fail("Entry not found.", { code: "not_found" });
}
