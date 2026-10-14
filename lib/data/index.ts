import "server-only";
import { getDataMode } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseBearerClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { createLocalAdminRepository, createLocalUserRepository } from "./local-repo";
import { createSupabaseAdminRepository, createSupabaseUserRepository } from "./supabase-repo";
import type { AdminRepository, UserRepository } from "./types";

export type { AdminRepository, UserRepository } from "./types";

/**
 * Repository for a user who has already been authenticated by lib/auth.
 * `accessToken` is set for bearer-authenticated API requests (mobile app);
 * otherwise the cookie session is used.
 */
export async function repositoryForUser(userId: string, accessToken?: string | null): Promise<UserRepository> {
  const mode = getDataMode();
  if (mode === "supabase") {
    const client = accessToken ? createSupabaseBearerClient(accessToken) : await createSupabaseServerClient();
    return createSupabaseUserRepository(client, userId);
  }
  if (mode === "local") return createLocalUserRepository(userId);
  throw new Error("No data store is configured.");
}

export function getAdminRepository(): AdminRepository {
  const mode = getDataMode();
  if (mode === "supabase") return createSupabaseAdminRepository(getSupabaseAdmin());
  if (mode === "local") return createLocalAdminRepository();
  throw new Error("No data store is configured.");
}
