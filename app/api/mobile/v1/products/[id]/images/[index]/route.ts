import { apiRoute } from "@/lib/http/api";
import * as products from "@/lib/operations/products";

export const runtime = "nodejs";

/** DELETE /api/mobile/v1/products/:id/images/:index */
export const DELETE = apiRoute<{ id: string; index: string }>("products.removeImage", (ctx, _request, { id, index }) =>
  products.removeProductImage(ctx, id, Number(index)),
);
