import { parseBearer } from "@/lib/auth/session";
import { signOutToken } from "@/lib/auth/token-auth";
import { resultResponse } from "@/lib/http/api";

export const runtime = "nodejs";

/** POST /api/mobile/v1/auth/sign-out — revokes the session behind the bearer token. */
export async function POST(request: Request) {
  return resultResponse(await signOutToken(parseBearer(request.headers.get("authorization"))));
}
