import "server-only";
import { unstable_rethrow } from "next/navigation";
import { AiError } from "@/lib/ai/errors";
import { getUserContext } from "@/lib/auth/session";
import { FeatureLockedError, QuotaExceededError, RateLimitedError } from "@/lib/billing/usage";
import { CampaignRuleError } from "@/lib/campaigns/service";
import type { UserRepository } from "@/lib/data";
import { NotFoundError } from "@/lib/data/errors";
import { logger } from "@/lib/logger";
import type { PlanId, SessionUser } from "@/types/domain";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string>;
      code?: "auth" | "quota" | "feature" | "rate" | "ai" | "validation" | "not_found" | "rule" | "server";
      upgradeTo?: PlanId | null;
      retryable?: boolean;
    };

export function ok<T>(data: T): ActionResult<T>;
export function ok(): ActionResult<undefined>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function fail(error: string, extra: Omit<Extract<ActionResult, { ok: false }>, "ok" | "error"> = {}): ActionResult<never> {
  return { ok: false, error, ...extra };
}

/** Convert thrown errors into safe, user-facing action results. */
export function toActionError(error: unknown, op: string): ActionResult<never> {
  if (error instanceof QuotaExceededError) return fail(error.message, { code: "quota", upgradeTo: error.upgradeTo?.id ?? null });
  if (error instanceof FeatureLockedError) return fail(error.message, { code: "feature", upgradeTo: error.upgradeTo.id });
  if (error instanceof RateLimitedError) return fail(error.message, { code: "rate", retryable: true });
  if (error instanceof AiError) return fail(error.userMessage, { code: "ai", retryable: error.retryable });
  if (error instanceof CampaignRuleError) return fail(error.message, { code: "rule" });
  if (error instanceof NotFoundError) return fail("We couldn't find that item. It may have been deleted.", { code: "not_found" });
  logger.error(`${op}.failed`, { error });
  return fail("Something went wrong. Please try again.", { code: "server", retryable: true });
}

/** Run an action for the signed-in user with uniform error handling. */
export async function withUser<T>(
  op: string,
  fn: (ctx: { user: SessionUser; repo: UserRepository }) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  const ctx = await getUserContext();
  if (!ctx) return fail("Your session has expired. Please sign in again.", { code: "auth" });
  try {
    return await fn(ctx);
  } catch (error) {
    // Let Next.js redirect()/notFound() interrupts propagate.
    unstable_rethrow(error);
    return toActionError(error, op);
  }
}
