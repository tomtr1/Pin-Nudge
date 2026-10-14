import { apiRoute, readJson } from "@/lib/http/api";
import * as pins from "@/lib/operations/pins";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST /api/mobile/v1/pins/:id/regenerate — { mode: "copy" | "creative", overwriteEdits?: boolean } */
export const POST = apiRoute<{ id: string }>("pins.regenerate", async (ctx, request, { id }) => {
  const body = (await readJson(request)) as { mode?: unknown; overwriteEdits?: unknown } | undefined;
  return pins.regenerate(ctx, id, body?.mode, body?.overwriteEdits);
});
