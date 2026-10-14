import { requestPasswordReset } from "@/lib/auth/token-auth";
import { readJson, resultResponse } from "@/lib/http/api";

export const runtime = "nodejs";

/** POST /api/mobile/v1/auth/reset-password */
export async function POST(request: Request) {
  return resultResponse(await requestPasswordReset(await readJson(request)));
}
