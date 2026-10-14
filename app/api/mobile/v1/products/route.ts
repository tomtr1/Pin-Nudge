import { ok } from "@/lib/actions";
import { apiRoute, readJson } from "@/lib/http/api";
import * as products from "@/lib/operations/products";

export const runtime = "nodejs";

/** GET /api/mobile/v1/products?search= */
export const GET = apiRoute("products.list", async ({ repo }, request) => {
  const search = request.nextUrl.searchParams.get("search")?.slice(0, 100) || undefined;
  return ok(await repo.listProducts({ search }));
});

/** POST /api/mobile/v1/products — JSON product fields; add images afterwards via /products/:id/images. */
export const POST = apiRoute("products.create", async (ctx, request) => products.createProduct(ctx, await readJson(request)), 201);
