import { fail } from "@/lib/actions";
import { apiRoute } from "@/lib/http/api";
import * as products from "@/lib/operations/products";
import { MAX_IMAGES_PER_PRODUCT, MAX_UPLOAD_BYTES } from "@/lib/storage/uploads";

export const runtime = "nodejs";

/** POST /api/mobile/v1/products/:id/images — multipart/form-data with one or more `images` files (PNG/JPEG). */
export const POST = apiRoute<{ id: string }>(
  "products.images",
  async (ctx, request, { id }) => {
    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > MAX_UPLOAD_BYTES * MAX_IMAGES_PER_PRODUCT + 64 * 1024) return fail("Images must be 5 MB or smaller.", { code: "validation" });
    const form = await request.formData().catch(() => null);
    if (!form) return fail("Send the images as multipart form data.", { code: "validation" });
    const imgs = await products.readImagesFromForm(form);
    if ("error" in imgs) return fail(imgs.error, { code: "validation" });
    return products.addProductImages(ctx, id, imgs.images);
  },
  201,
);
