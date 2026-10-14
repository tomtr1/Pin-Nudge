import { apiRoute, readJson } from "@/lib/http/api";
import * as campaigns from "@/lib/operations/campaigns";

export const runtime = "nodejs";

/** PUT /api/mobile/v1/angles/:id — full angle edit (including `selected`). */
export const PUT = apiRoute<{ id: string }>("campaigns.angle", async (ctx, request, { id }) => {
  const body = await readJson(request);
  return campaigns.updateAngle(ctx, body && typeof body === "object" ? { ...body, id } : body);
});
