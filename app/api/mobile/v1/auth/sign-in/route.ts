import { signInWithPassword } from "@/lib/auth/token-auth";
import { readJson, resultResponse } from "@/lib/http/api";

export const runtime = "nodejs";

/** POST /api/mobile/v1/auth/sign-in */
export async function POST(request: Request) {
  return resultResponse(await signInWithPassword(await readJson(request)));
}
