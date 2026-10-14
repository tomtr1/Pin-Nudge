import { fail, ok } from "@/lib/actions";
import { apiRoute, readJson } from "@/lib/http/api";
import * as products from "@/lib/operations/products";

export const runtime = "nodejs";

type P = { id: string };

/** GET /api/mobile/v1/products/:id — the product and its campaigns. */
export const GET = apiRoute<P>("products.get", async ({ repo }, _request, { id }) => {
  const product = /^[0-9a-f-]{36}$/i.test(id) ? await repo.getProduct(id) : null;
  if (!product) return fail("Product not found.", { code: "not_found" });
  return ok({ product, campaigns: await repo.listCampaigns({ productId: id }) });
});

export const PUT = apiRoute<P>("products.update", async (ctx, request, { id }) => products.updateProduct(ctx, id, await readJson(request)));

export const DELETE = apiRoute<P>("products.delete", (ctx, _request, { id }) => products.deleteProduct(ctx, id));
