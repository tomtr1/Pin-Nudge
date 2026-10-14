import { NextResponse } from "next/server";
import { AiError } from "@/lib/ai/errors";
import { FeatureLockedError, QuotaExceededError, RateLimitedError } from "@/lib/billing/usage";
import { CampaignRuleError } from "@/lib/campaigns/service";
import { NotFoundError } from "@/lib/data/errors";
import { logger } from "@/lib/logger";

export function jsonError(status: number, message: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...extra }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Map known errors to safe responses; anything unexpected becomes a generic 500. */
export function errorResponse(error: unknown, op: string) {
  if (error instanceof NotFoundError) return jsonError(404, "Not found.");
  if (error instanceof QuotaExceededError) return jsonError(402, error.message, { code: "quota", upgradeTo: error.upgradeTo?.id ?? null });
  if (error instanceof FeatureLockedError) return jsonError(402, error.message, { code: "feature", upgradeTo: error.upgradeTo.id });
  if (error instanceof RateLimitedError) return jsonError(429, error.message);
  if (error instanceof CampaignRuleError) return jsonError(400, error.message);
  if (error instanceof AiError) return jsonError(error.kind === "rate_limited" ? 429 : 502, error.userMessage);
  logger.error(`${op}.failed`, { error });
  return jsonError(500, "Something went wrong. Please try again.");
}

export function pngResponse(png: Uint8Array, opts: { filename?: string; download?: boolean } = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "image/png",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (opts.filename) headers["Content-Disposition"] = `${opts.download ? "attachment" : "inline"}; filename="${opts.filename}"`;
  return new NextResponse(Buffer.from(png), { status: 200, headers });
}
