import { apiRoute } from "@/lib/http/api";
import * as pins from "@/lib/operations/pins";

export const runtime = "nodejs";

/** POST /api/mobile/v1/campaigns/:id/approve-all — approves every complete draft pin. */
export const POST = apiRoute<{ id: string }>("pins.approveAll", (ctx, _request, { id }) => pins.approveAll(ctx, id));
