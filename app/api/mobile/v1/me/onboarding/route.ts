import { apiRoute, readJson } from "@/lib/http/api";
import * as account from "@/lib/operations/account";

export const runtime = "nodejs";

/** POST /api/mobile/v1/me/onboarding — body is a profile, or { skip: true }. */
export const POST = apiRoute("me.onboarding", async (ctx, request) => {
  const body = (await readJson(request)) as Record<string, unknown> | undefined;
  return account.completeOnboarding(ctx, body?.skip === true ? null : (body ?? {}));
});
