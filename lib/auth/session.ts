import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDataMode } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { repositoryForUser, type UserRepository } from "@/lib/data";
import type { SessionUser } from "@/types/domain";
import { LOCAL_DEMO_EMAIL, LOCAL_SESSION_COOKIE, verifyLocalSessionValue } from "./local-session";

/**
 * Returns the authenticated user for this request, or null. In Supabase mode
 * the session is validated against Supabase Auth (getUser), never trusted
 * from the cookie alone.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const mode = getDataMode();
  if (mode === "supabase") {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? null, mode: "supabase" };
  }
  if (mode === "local") {
    const store = await cookies();
    const userId = await verifyLocalSessionValue(store.get(LOCAL_SESSION_COOKIE)?.value);
    return userId ? { id: userId, email: LOCAL_DEMO_EMAIL, mode: "local" } : null;
  }
  return null;
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Authenticated user plus a repository scoped to them. */
export const requireUserContext = cache(async (): Promise<{ user: SessionUser; repo: UserRepository }> => {
  const user = await requireUser();
  return { user, repo: await repositoryForUser(user.id) };
});

/**
 * For Server Actions and Route Handlers: returns null instead of redirecting,
 * so the caller can respond with a 401 / error result.
 */
export async function getUserContext(): Promise<{ user: SessionUser; repo: UserRepository } | null> {
  const user = await getSessionUser();
  if (!user) return null;
  return { user, repo: await repositoryForUser(user.id) };
}
