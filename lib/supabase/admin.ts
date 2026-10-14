import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";

let adminClient: SupabaseClient | null = null;

/**
 * Service-role client. Bypasses Row Level Security, so it is only used for
 * privileged server-side operations (quota reservation, verified Stripe
 * webhooks, account deletion). Never import this from client code.
 */
export function getSupabaseAdmin(): SupabaseClient {
  const env = getEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for this operation.");
  }
  if (!adminClient) {
    adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return adminClient;
}
