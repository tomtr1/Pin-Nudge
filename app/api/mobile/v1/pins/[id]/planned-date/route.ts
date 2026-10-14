import { apiRoute, readJson } from "@/lib/http/api";
import * as pins from "@/lib/operations/pins";

export const runtime = "nodejs";

/** PUT /api/mobile/v1/pins/:id/planned-date — { date: "YYYY-MM-DD" | null } */
export const PUT = apiRoute<{ id: string }>("pins.plan", async (ctx, request, { id }) => {
  const body = (await readJson(request)) as { date?: unknown } | undefined;
  return pins.setPlannedDate(ctx, id, body?.date ?? null);
});
