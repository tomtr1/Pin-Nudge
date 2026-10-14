import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDataMode } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { repositoryForUser, type UserRepository } from "@/lib/data";
import type { SessionUser } from "@/types/domain";
import { LOCAL_DEMO_EMAIL, LOCAL_SESSION_COOKIE, verifyLocalSessionValue } from "./local-session";

/** Extracts a bearer token from the Authorization header (used by the mobile app). */
export function parseBearer(header: string | null | undefined): string | null {
  const match = header?.match(/^Bearer\s+([A-Za-z0-9._~+/=-]{10,4096})\s*$/i);
  return match ? match[1] : null;
}

async function requestBearer(): Promise<string | null> {
  try {
    return parseBearer((await headers()).get("authorization"));
  } catch {
    return null; // outside a request scope
  }
}

/**
 * Resolves who is making this request. A bearer token, when present, takes
 * precedence over cookies; it is never stored in a cookie. In Supabase mode
 * every credential is validated against Supabase Auth (getUser), never
 * trusted from the token's claims alone.
 */
const getRequestAuth = cache(async (): Promise<{ user: SessionUser; accessToken: string | null } | null> => {
  const mode = getDataMode();
  const bearer = await requestBearer();
  if (mode === "supabase") {
    const supabase = await createSupabaseServerClient();
    const { data, error } = bearer ? await supabase.auth.getUser(bearer) : await supabase.auth.getUser();
    if (error || !data.user) return null;
    return { user: { id: data.user.id, email: data.user.email ?? null, mode: "supabase" }, accessToken: bearer };
  }
  if (mode === "local") {
    const value = bearer ?? (await cookies()).get(LOCAL_SESSION_COOKIE)?.value;
    const userId = await verifyLocalSessionValue(value);
    return userId ? { user: { id: userId, email: LOCAL_DEMO_EMAIL, mode: "local" }, accessToken: null } : null;
  }
  return null;
});

/** Returns the authenticated user for this request, or null. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => (await getRequestAuth())?.user ?? null);

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Authenticated user plus a repository scoped to them. */
export const requireUserContext = cache(async (): Promise<{ user: SessionUser; repo: UserRepository }> => {
  const user = await requireUser();
  const auth = await getRequestAuth();
  return { user, repo: await repositoryForUser(user.id, auth?.accessToken) };
});

/**
 * For Server Actions and Route Handlers: returns null instead of redirecting,
 * so the caller can respond with a 401 / error result.
 */
export async function getUserContext(): Promise<{ user: SessionUser; repo: UserRepository } | null> {
  const auth = await getRequestAuth();
  if (!auth) return null;
  return { user: auth.user, repo: await repositoryForUser(auth.user.id, auth.accessToken) };
}
