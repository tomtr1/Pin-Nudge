import type { NextRequest } from "next/server";
import { getUserContext } from "@/lib/auth/session";
import { getAdminRepository } from "@/lib/data";
import { errorResponse, jsonError, pngResponse } from "@/lib/http/responses";
import { renderPinPng } from "@/lib/render";
import { renderInputForPin } from "@/lib/render/pin-input";
import { sanitizeFilename } from "@/lib/validations/filenames";
import { z } from "zod";

export const runtime = "nodejs";

/** GET /api/pins/:id/image?size=preview|full&download=1 — renders the saved pin. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return jsonError(404, "Not found.");
  const ctx = await getUserContext();
  if (!ctx) return jsonError(401, "Please sign in.");

  try {
    const pin = await ctx.repo.getPin(id);
    if (!pin) return jsonError(404, "Not found.");
    const size = request.nextUrl.searchParams.get("size");
    const download = request.nextUrl.searchParams.get("download") === "1";
    const scale = download || size === "full" ? 1 : size === "thumb" ? 0.3 : 0.5;
    const png = await renderPinPng(await renderInputForPin(ctx.repo, pin), scale);
    if (download) {
      await getAdminRepository()
        .recordUsage(ctx.user.id, "image_export", 1, { pinId: pin.id })
        .catch(() => undefined);
    }
    return pngResponse(png, { filename: `${sanitizeFilename(pin.filename || pin.title, "pin")}.png`, download });
  } catch (error) {
    return errorResponse(error, "pin.image");
  }
}
