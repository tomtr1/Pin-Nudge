import type { NextRequest } from "next/server";
import { z } from "zod";
import { getUserContext } from "@/lib/auth/session";
import { errorResponse, jsonError, pngResponse } from "@/lib/http/responses";
import { renderPinPng } from "@/lib/render";
import { renderInputForPin } from "@/lib/render/pin-input";
import { pinDesignSchema } from "@/lib/validations/schemas";

export const runtime = "nodejs";

const previewSchema = z.object({
  headline: z.string().max(90),
  subheadline: z.string().max(140),
  bullets: z.array(z.string().max(60)).max(5),
  cta: z.string().max(40),
  design: pinDesignSchema,
});

/**
 * POST /api/pins/:id/preview — renders unsaved edits with the same renderer
 * used for exports, so the editor preview matches the downloaded file.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return jsonError(404, "Not found.");
  const ctx = await getUserContext();
  if (!ctx) return jsonError(401, "Please sign in.");

  const body = previewSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return jsonError(400, "Invalid preview request.");

  try {
    const pin = await ctx.repo.getPin(id);
    if (!pin) return jsonError(404, "Not found.");
    const input = await renderInputForPin(ctx.repo, { ...body.data, productId: pin.productId });
    return pngResponse(await renderPinPng(input, 0.5));
  } catch (error) {
    return errorResponse(error, "pin.preview");
  }
}
