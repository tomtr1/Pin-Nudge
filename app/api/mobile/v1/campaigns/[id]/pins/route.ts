import { apiRoute } from "@/lib/http/api";
import * as campaigns from "@/lib/operations/campaigns";

export const runtime = "nodejs";
export const maxDuration = 120;

/** POST /api/mobile/v1/campaigns/:id/pins — writes pins for the selected angles. */
export const POST = apiRoute<{ id: string }>("campaigns.pins", (ctx, _request, { id }) => campaigns.runPinGeneration(ctx, id));
