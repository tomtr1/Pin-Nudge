import "server-only";
import type { Session } from "@supabase/supabase-js";
import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/actions";
import { getAppUrl } from "@/lib/brand";
import { createLocalUserRepository } from "@/lib/data/local-repo";
import { getDataMode } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseStatelessClient } from "@/lib/supabase/server";
import { createLocalSessionValue, LOCAL_DEMO_EMAIL, LOCAL_DEMO_USER_ID } from "./local-session";

/**
 * Token sessions for the mobile app. The app never talks to Supabase directly:
 * it signs in through these endpoints, keeps the tokens in the iOS Keychain
 * and sends `Authorization: Bearer <accessToken>` to the JSON API.
 */
export interface TokenSession {
  accessToken: string;
  refreshToken: string | null;
  /** Unix seconds. */
  expiresAt: number;
  user: { id: string; email: string | null };
}

const email = z.email("Enter a valid email address.").max(254);
const password = z.string().min(8, "Use at least 8 characters.").max(128);

function toTokenSession(session: Session): TokenSession {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? Math.floor(Date.now() / 1000) + session.expires_in,
    user: { id: session.user.id, email: session.user.email ?? null },
  };
}

function fieldErrorsOf(error: z.ZodError) {
  return Object.fromEntries(error.issues.map((i) => [String(i.path[0]), i.message]));
}

const notInLocal = () => fail("Accounts are not enabled on this server. Use the demo instead.", { code: "rule" });

export async function signInWithPassword(raw: unknown): Promise<ActionResult<TokenSession>> {
  if (getDataMode() !== "supabase") return notInLocal();
  const parsed = z.object({ email, password: z.string().min(1, "Enter your password.").max(128) }).safeParse(raw);
  if (!parsed.success) return fail("Check the highlighted fields.", { code: "validation", fieldErrors: fieldErrorsOf(parsed.error) });
  const { data, error } = await createSupabaseStatelessClient().auth.signInWithPassword(parsed.data);
  if (error || !data.session) {
    if (error?.code === "email_not_confirmed") return fail("Please confirm your email address first. Check your inbox for the link.", { code: "auth" });
    logger.info("auth.token_sign_in_failed", { code: error?.code });
    return fail("That email and password combination didn't work.", { code: "auth" });
  }
  return ok(toTokenSession(data.session));
}

export async function signUp(raw: unknown): Promise<ActionResult<{ session: TokenSession | null; needsConfirmation: boolean }>> {
  if (getDataMode() !== "supabase") return notInLocal();
  const parsed = z
    .object({ email, password, displayName: z.string().trim().max(80).optional(), acceptTerms: z.literal(true, "Please accept the terms to continue.") })
    .safeParse(raw);
  if (!parsed.success) return fail("Check the highlighted fields.", { code: "validation", fieldErrors: fieldErrorsOf(parsed.error) });
  const { data, error } = await createSupabaseStatelessClient().auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${getAppUrl()}/auth/callback?next=/dashboard`,
      data: { display_name: parsed.data.displayName ?? "" },
    },
  });
  if (error) {
    logger.info("auth.token_sign_up_failed", { code: error.code });
    if (error.code === "weak_password") return fail("Please choose a stronger password.", { code: "validation", fieldErrors: { password: "Choose a stronger password." } });
    return fail("We couldn't create your account. Please try again.", { code: "server" });
  }
  return ok({ session: data.session ? toTokenSession(data.session) : null, needsConfirmation: !data.session });
}

export async function refreshSession(raw: unknown): Promise<ActionResult<TokenSession>> {
  if (getDataMode() !== "supabase") return notInLocal();
  const parsed = z.object({ refreshToken: z.string().min(10).max(4096) }).safeParse(raw);
  if (!parsed.success) return fail("Please sign in again.", { code: "auth" });
  const { data, error } = await createSupabaseStatelessClient().auth.refreshSession({ refresh_token: parsed.data.refreshToken });
  if (error || !data.session) return fail("Please sign in again.", { code: "auth" });
  return ok(toTokenSession(data.session));
}

/** Revokes the refresh tokens behind an access token (best effort). */
export async function signOutToken(accessToken: string | null): Promise<ActionResult> {
  if (getDataMode() === "supabase" && accessToken) {
    await getSupabaseAdmin()
      .auth.admin.signOut(accessToken, "local")
      .catch(() => undefined);
  }
  return ok();
}

export async function requestPasswordReset(raw: unknown): Promise<ActionResult> {
  if (getDataMode() !== "supabase") return notInLocal();
  const parsed = z.object({ email }).safeParse(raw);
  if (!parsed.success) return fail("Enter a valid email address.", { code: "validation", fieldErrors: { email: "Enter a valid email address." } });
  const { error } = await createSupabaseStatelessClient().auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getAppUrl()}/auth/callback?next=/reset-password`,
  });
  if (error) logger.info("auth.token_reset_failed", { code: error.code });
  // Same response either way so the endpoint can't be used to discover accounts.
  return ok();
}

/** Local demo mode only: a signed token for the single local demo user. */
export async function localDemoSession(): Promise<ActionResult<TokenSession>> {
  if (getDataMode() !== "local") return fail("The demo sign-in is only available on local demo servers.", { code: "rule" });
  const repo = createLocalUserRepository(LOCAL_DEMO_USER_ID);
  if (!(await repo.getProfile())) await repo.upsertProfile({ displayName: "Demo seller" });
  const accessToken = await createLocalSessionValue(LOCAL_DEMO_USER_ID);
  return ok({
    accessToken,
    refreshToken: null,
    expiresAt: Number(accessToken.split(".")[1]),
    user: { id: LOCAL_DEMO_USER_ID, email: LOCAL_DEMO_EMAIL },
  });
}
