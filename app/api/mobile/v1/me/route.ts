import { apiRoute, readJson } from "@/lib/http/api";
import * as account from "@/lib/operations/account";

export const runtime = "nodejs";

/** GET /api/mobile/v1/me — profile, plan, usage and limits. */
export const GET = apiRoute("me.get", (ctx) => account.accountSummary(ctx));

/** DELETE /api/mobile/v1/me — body { confirm: "DELETE" }. Permanently deletes the account. */
export const DELETE = apiRoute("me.delete", async (ctx, request) => {
  const body = (await readJson(request)) as { confirm?: unknown } | undefined;
  return account.deleteAccount(ctx, body?.confirm);
});
