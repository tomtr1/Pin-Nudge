import { signUp } from "@/lib/auth/token-auth";
import { readJson, resultResponse } from "@/lib/http/api";

export const runtime = "nodejs";

/** POST /api/mobile/v1/auth/sign-up */
export async function POST(request: Request) {
  return resultResponse(await signUp(await readJson(request)));
}
