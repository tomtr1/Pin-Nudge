import { apiRoute } from "@/lib/http/api";
import * as products from "@/lib/operations/products";

export const runtime = "nodejs";

/** POST /api/mobile/v1/products/sample — adds the clearly labelled sample product. */
export const POST = apiRoute("products.sample", (ctx) => products.addSampleProduct(ctx), 201);
