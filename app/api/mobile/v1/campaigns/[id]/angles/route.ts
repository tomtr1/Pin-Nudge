import { apiRoute } from "@/lib/http/api";
import * as campaigns from "@/lib/operations/campaigns";

export const runtime = "nodejs";
export const maxDuration = 120;

/** POST /api/mobile/v1/campaigns/:id/angles — generates (or regenerates) marketing angles. */
export const POST = apiRoute<{ id: string }>("campaigns.angles", (ctx, _request, { id }) => campaigns.runAngleGeneration(ctx, id));
