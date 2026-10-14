"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/actions";
import { createLocalSessionValue, LOCAL_DEMO_USER_ID, LOCAL_SESSION_COOKIE, localSessionCookieOptions } from "@/lib/auth/local-session";
import { getAppUrl } from "@/lib/brand";
import { createLocalUserRepository } from "@/lib/data/local-repo";
import { getDataMode } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const email = z.email("Enter a valid email address.").max(254);
const password = z.string().min(8, "Use at least 8 characters.").max(128);

/** Only allow same-site relative redirects after login. */
function safeNext(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/dashboard";
  return next;
}

async function originUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return process.env.NEXT_PUBLIC_APP_URL ? getAppUrl() : host ? `${proto}://${host}` : getAppUrl();
}

export async function signInAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  if (getDataMode() !== "supabase") return fail("Accounts are not enabled in local demo mode. Use “Continue in local demo”.");
  const parsed = z.object({ email, password: z.string().min(1, "Enter your password.") }).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return fail("Check the highlighted fields.", { code: "validation", fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) });

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") return fail("Please confirm your email address first — check your inbox for the link.");
    logger.info("auth.sign_in_failed", { code: error.code });
    return fail("That email and password combination didn't work.");
  }
  redirect(safeNext(formData.get("next")));
}

export async function signUpAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  if (getDataMode() !== "supabase") return fail("Accounts are not enabled in local demo mode. Use “Continue in local demo”.");
  const parsed = z
    .object({ email, password, displayName: z.string().trim().max(80).optional(), terms: z.literal("on", "Please accept the terms to continue.") })
    .safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
      displayName: formData.get("displayName") || undefined,
      terms: formData.get("terms"),
    });
  if (!parsed.success) return fail("Check the highlighted fields.", { code: "validation", fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${await originUrl()}/auth/callback?next=/onboarding`,
      data: { display_name: parsed.data.displayName ?? "" },
    },
  });
  if (error) {
    logger.info("auth.sign_up_failed", { code: error.code });
    if (error.code === "weak_password") return fail("Please choose a stronger password.", { fieldErrors: { password: "Choose a stronger password." } });
    return fail("We couldn't create your account. Please try again.");
  }
  if (data.session) redirect("/onboarding");
  return ok({ needsConfirmation: true });
}

export async function requestPasswordResetAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  if (getDataMode() !== "supabase") return fail("Password reset is not available in local demo mode.");
  const parsed = email.safeParse(formData.get("email"));
  if (!parsed.success) return fail("Enter a valid email address.", { fieldErrors: { email: "Enter a valid email address." } });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${await originUrl()}/auth/callback?next=/reset-password`,
  });
  if (error) logger.info("auth.reset_request_failed", { code: error.code });
  // Same response either way so the form can't be used to discover accounts.
  return ok();
}

export async function updatePasswordAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  if (getDataMode() !== "supabase") return fail("Password changes are not available in local demo mode.");
  const parsed = z
    .object({ password, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: "Passwords don't match.", path: ["confirm"] })
    .safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return fail("Check the highlighted fields.", { fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) });
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return fail("Your reset link has expired. Request a new one.", { code: "auth" });
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    logger.info("auth.update_password_failed", { code: error.code });
    return fail(error.code === "same_password" ? "Choose a password you haven't used before." : "We couldn't update your password.");
  }
  return ok();
}

export async function signOutAction() {
  if (getDataMode() === "supabase") {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  (await cookies()).delete(LOCAL_SESSION_COOKIE);
  redirect("/");
}

/** Local demo mode: sign in as the single local demo user (no credentials exist in this mode). */
export async function enterLocalDemoAction() {
  if (getDataMode() !== "local") redirect("/login");
  const store = await cookies();
  store.set(LOCAL_SESSION_COOKIE, await createLocalSessionValue(LOCAL_DEMO_USER_ID), localSessionCookieOptions);
  const repo = createLocalUserRepository(LOCAL_DEMO_USER_ID);
  const profile = await repo.getProfile();
  if (!profile) await repo.upsertProfile({ displayName: "Demo seller" });
  redirect(profile?.onboardingCompleted ? "/dashboard" : "/onboarding");
}
