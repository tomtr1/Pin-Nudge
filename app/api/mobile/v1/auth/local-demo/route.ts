import { localDemoSession } from "@/lib/auth/token-auth";
import { resultResponse } from "@/lib/http/api";

export const runtime = "nodejs";

/** POST /api/mobile/v1/auth/local-demo — local demo servers only. */
export async function POST() {
  return resultResponse(await localDemoSession());
}
