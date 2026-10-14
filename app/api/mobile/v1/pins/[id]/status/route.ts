import { apiRoute, readJson } from "@/lib/http/api";
import * as pins from "@/lib/operations/pins";

export const runtime = "nodejs";

/** PUT /api/mobile/v1/pins/:id/status — { status }. "published" means the user posted it themselves. */
export const PUT = apiRoute<{ id: string }>("pins.status", async (ctx, request, { id }) => {
  const body = (await readJson(request)) as { status?: unknown } | undefined;
  return pins.setPinStatus(ctx, id, body?.status);
});
