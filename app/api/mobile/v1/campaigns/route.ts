import { ok } from "@/lib/actions";
import { apiRoute, readJson } from "@/lib/http/api";
import * as campaigns from "@/lib/operations/campaigns";

export const runtime = "nodejs";

/** GET /api/mobile/v1/campaigns?productId= */
export const GET = apiRoute("campaigns.list", async ({ repo }, request) => {
  const productId = request.nextUrl.searchParams.get("productId") ?? undefined;
  return ok(await repo.listCampaigns({ productId: productId && /^[0-9a-f-]{36}$/i.test(productId) ? productId : undefined }));
});

/** POST /api/mobile/v1/campaigns — { productId, name?, targetAudience?, config } creates a draft. */
export const POST = apiRoute("campaigns.create", async (ctx, request) => campaigns.createCampaign(ctx, await readJson(request)), 201);
