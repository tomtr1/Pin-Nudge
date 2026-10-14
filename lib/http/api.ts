import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { toActionError, type ActionResult } from "@/lib/actions";
import { getUserContext } from "@/lib/auth/session";
import type { OpCtx } from "@/lib/operations/context";

/**
 * JSON API helpers for the mobile app (`/api/mobile/v1`). Routes call the same
 * operations as the website's Server Actions and translate ActionResults into
 * HTTP responses: `{ data }` on success, `{ error, code, fieldErrors? }` otherwise.
 */
type Failure = Extract<ActionResult, { ok: false }>;

const STATUS: Record<NonNullable<Failure["code"]>, number> = {
  auth: 401,
  validation: 422,
  quota: 403,
  feature: 403,
  rate: 429,
  not_found: 404,
  rule: 409,
  ai: 502,
  server: 500,
};

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * The iOS app is a free companion to the web subscription (App Review
 * guideline 3.1.3(f)): it must not contain purchase prompts or point users to
 * buy elsewhere. Plan-limit messages are therefore stated neutrally here and
 * `upgradeTo` is never sent to the app.
 */
export function companionMessage(failure: Failure): string {
  if (failure.code === "feature") {
    const m = failure.error.match(/^(.*?) (?:is|are) available on the .+ plan and above\.$/);
    return m ? `Not included in your current plan: ${m[1]}.` : "This isn't included in your current plan.";
  }
  if (failure.code === "quota") {
    const kept = failure.error
      .split(/(?<=\.)\s+/)
      .filter((s) => !/\bupgrade\b/i.test(s))
      .join(" ")
      .trim();
    return kept || "You've reached a limit on your current plan.";
  }
  return failure.error;
}

export function failureResponse(failure: Failure) {
  const status = STATUS[failure.code ?? "server"] ?? 400;
  return NextResponse.json(
    {
      error: companionMessage(failure),
      code: failure.code ?? "server",
      ...(failure.fieldErrors ? { fieldErrors: failure.fieldErrors } : {}),
      ...(failure.retryable ? { retryable: true } : {}),
    },
    { status, headers: NO_STORE },
  );
}

export function resultResponse<T>(result: ActionResult<T>, successStatus = 200) {
  if (!result.ok) return failureResponse(result);
  return NextResponse.json({ data: result.data ?? null }, { status: successStatus, headers: NO_STORE });
}

const MAX_JSON_BYTES = 256 * 1024;

/** Parses a JSON body, returning undefined for missing/invalid/oversized bodies. */
export async function readJson(request: Request): Promise<unknown> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_JSON_BYTES) return undefined;
  const text = await request.text().catch(() => "");
  if (!text || text.length > MAX_JSON_BYTES) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

type Handler<P> = (ctx: OpCtx, request: NextRequest, params: P) => Promise<ActionResult<unknown> | Response>;

/**
 * Wraps an authenticated route: resolves the bearer (or cookie) session,
 * runs the handler and maps thrown errors the same way Server Actions do.
 */
export function apiRoute<P extends Record<string, string> = Record<string, never>>(op: string, handler: Handler<P>, successStatus = 200) {
  return async (request: NextRequest, context: { params: Promise<P> }): Promise<Response> => {
    const ctx = await getUserContext();
    if (!ctx) return failureResponse({ ok: false, error: "Please sign in again.", code: "auth" });
    try {
      const result = await handler(ctx, request, await context.params);
      return result instanceof Response ? result : resultResponse(result, successStatus);
    } catch (error) {
      unstable_rethrow(error);
      const failure = toActionError(error, `api.${op}`);
      return failure.ok ? resultResponse(failure) : failureResponse(failure);
    }
  };
}
