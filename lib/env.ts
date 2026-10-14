import "server-only";
import { z } from "zod";

/**
 * Server-side environment parsing. Every external integration is optional so
 * the app can run in a clearly labelled local demo mode; helpers below report
 * which integrations are actually configured. Values are never logged.
 */
const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_APP_URL: optionalString,

  NEXT_PUBLIC_SUPABASE_URL: optionalString,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,

  PINNUDGE_DATA_MODE: z.enum(["auto", "supabase", "local"]).default("auto"),
  PINNUDGE_ALLOW_LOCAL_MODE_IN_PRODUCTION: optionalString,
  PINNUDGE_LOCAL_DATA_DIR: optionalString,
  PINNUDGE_SESSION_SECRET: optionalString,

  AI_PROVIDER: z.enum(["anthropic", "demo"]).optional(),
  ANTHROPIC_API_KEY: optionalString,
  AI_MODEL: optionalString,
  AI_EFFORT: z.enum(["low", "medium", "high", "xhigh", "max"]).default("low"),
  AI_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(300_000).default(90_000),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(1_000).max(64_000).default(16_000),
  AI_INPUT_COST_PER_MTOK: z.coerce.number().min(0).optional(),
  AI_OUTPUT_COST_PER_MTOK: z.coerce.number().min(0).optional(),
  AI_REFUSAL_FALLBACK: z.enum(["on", "off"]).default("on"),

  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
  STRIPE_PRICE_STARTER: optionalString,
  STRIPE_PRICE_GROWTH: optionalString,
  STRIPE_PRICE_PRO: optionalString,

  RATE_LIMIT_GENERATIONS_PER_MINUTE: z.coerce.number().int().min(1).max(120).default(6),
});

export type ServerEnv = z.infer<typeof envSchema>;

let cached: ServerEnv | null = null;

export function getEnv(): ServerEnv {
  if (cached && process.env.NODE_ENV !== "test") return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // Report variable names only; never echo values.
    const names = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid environment configuration: ${names}`);
  }
  cached = parsed.data;
  return cached;
}

export function isSupabaseConfigured(env = getEnv()): boolean {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export type DataMode = "supabase" | "local" | "unconfigured";

/**
 * Supabase is used whenever it is configured. Local demo mode (a JSON file on
 * the server's disk) is used for development without credentials. Production
 * deployments must configure Supabase unless local mode is explicitly allowed.
 */
export function getDataMode(env = getEnv()): DataMode {
  if (env.PINNUDGE_DATA_MODE === "supabase") return isSupabaseConfigured(env) ? "supabase" : "unconfigured";
  if (env.PINNUDGE_DATA_MODE === "local") return localModeAllowed(env) ? "local" : "unconfigured";
  if (isSupabaseConfigured(env)) return "supabase";
  return localModeAllowed(env) ? "local" : "unconfigured";
}

function localModeAllowed(env: ServerEnv): boolean {
  return env.NODE_ENV !== "production" || env.PINNUDGE_ALLOW_LOCAL_MODE_IN_PRODUCTION === "true";
}

export function isAiConfigured(env = getEnv()): boolean {
  if (env.AI_PROVIDER === "demo") return false;
  return Boolean(env.ANTHROPIC_API_KEY && env.AI_MODEL);
}

export function isStripeConfigured(env = getEnv()): boolean {
  return Boolean(
    env.STRIPE_SECRET_KEY &&
      env.STRIPE_WEBHOOK_SECRET &&
      (env.STRIPE_PRICE_STARTER || env.STRIPE_PRICE_GROWTH || env.STRIPE_PRICE_PRO),
  );
}

export function resetEnvCacheForTests() {
  cached = null;
}
