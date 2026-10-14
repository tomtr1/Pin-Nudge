import "server-only";
import { getDataMode } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createLocalAdminRepository, createLocalUserRepository } from "./local-repo";
import { createSupabaseAdminRepository, createSupabaseUserRepository } from "./supabase-repo";
import type { AdminRepository, UserRepository } from "./types";

export type { AdminRepository, UserRepository } from "./types";

/** Repository for a user who has already been authenticated by lib/auth. */
export async function repositoryForUser(userId: string): Promise<UserRepository> {
  const mode = getDataMode();
  if (mode === "supabase") return createSupabaseUserRepository(await createSupabaseServerClient(), userId);
  if (mode === "local") return createLocalUserRepository(userId);
  throw new Error("No data store is configured.");
}

export function getAdminRepository(): AdminRepository {
  const mode = getDataMode();
  if (mode === "supabase") return createSupabaseAdminRepository(getSupabaseAdmin());
  if (mode === "local") return createLocalAdminRepository();
  throw new Error("No data store is configured.");
}
