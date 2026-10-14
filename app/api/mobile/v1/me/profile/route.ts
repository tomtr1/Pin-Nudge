import { apiRoute, readJson } from "@/lib/http/api";
import * as account from "@/lib/operations/account";

export const runtime = "nodejs";

/** PUT /api/mobile/v1/me/profile */
export const PUT = apiRoute("me.profile", async (ctx, request) => account.updateProfile(ctx, await readJson(request)));
