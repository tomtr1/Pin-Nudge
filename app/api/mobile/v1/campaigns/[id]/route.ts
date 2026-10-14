import { fail, ok } from "@/lib/actions";
import { apiRoute, readJson } from "@/lib/http/api";
import * as campaigns from "@/lib/operations/campaigns";

export const runtime = "nodejs";

type P = { id: string };

/** GET /api/mobile/v1/campaigns/:id — campaign with angles and pins. */
export const GET = apiRoute<P>("campaigns.get", (ctx, _request, { id }) => campaigns.getCampaign(ctx, id));

/** PATCH /api/mobile/v1/campaigns/:id — { name } and/or { archived }. */
export const PATCH = apiRoute<P>("campaigns.update", async (ctx, request, { id }) => {
  const body = (await readJson(request)) as { name?: unknown; archived?: unknown } | undefined;
  if (!body || (body.name === undefined && typeof body.archived !== "boolean")) return fail("Nothing to update.", { code: "validation" });
  if (body.name !== undefined) {
    const renamed = await campaigns.renameCampaign(ctx, id, body.name);
    if (!renamed.ok) return renamed;
  }
  if (typeof body.archived === "boolean") {
    const archived = await campaigns.setCampaignArchived(ctx, id, body.archived);
    if (!archived.ok) return archived;
  }
  return ok();
});

export const DELETE = apiRoute<P>("campaigns.delete", (ctx, _request, { id }) => campaigns.deleteCampaign(ctx, id));
