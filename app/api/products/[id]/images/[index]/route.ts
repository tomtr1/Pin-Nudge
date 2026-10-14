import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserContext } from "@/lib/auth/session";
import { errorResponse, jsonError } from "@/lib/http/responses";

export const runtime = "nodejs";

/** GET /api/products/:id/images/:index — streams a private product image to its owner. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; index: string }> }) {
  const { id, index } = await params;
  const n = Number(index);
  if (!z.uuid().safeParse(id).success || !Number.isInteger(n) || n < 0 || n > 20) return jsonError(404, "Not found.");
  const ctx = await getUserContext();
  if (!ctx) return jsonError(401, "Please sign in.");
  try {
    const product = await ctx.repo.getProduct(id);
    const image = product?.images[n];
    if (!image) return jsonError(404, "Not found.");
    const file = await ctx.repo.readProductImage(image.path);
    if (!file) return jsonError(404, "Not found.");
    return new NextResponse(Buffer.from(file.bytes), {
      headers: {
        "Content-Type": image.contentType === "image/jpeg" ? "image/jpeg" : "image/png",
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  } catch (error) {
    return errorResponse(error, "product.image");
  }
}
