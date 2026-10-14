import "server-only";
import { getEnv, isAiConfigured } from "@/lib/env";
import { createAnthropicProvider } from "./anthropic-provider";
import { createDemoProvider } from "./demo-provider";
import type { CopyProvider } from "./types";

export { AiError } from "./errors";
export type { CopyProvider, GenerationContext, GenerationResult } from "./types";

/**
 * Returns the configured copy provider. When no AI key is configured the demo
 * provider is used; its output is stored and displayed as sample content.
 * Adding another provider means implementing CopyProvider and wiring it here.
 */
export function getCopyProvider(): CopyProvider {
  if (isAiConfigured()) return createAnthropicProvider();
  return createDemoProvider();
}

export function aiStatus(): { mode: "live" | "demo"; model: string | null } {
  const env = getEnv();
  return isAiConfigured() ? { mode: "live", model: env.AI_MODEL ?? null } : { mode: "demo", model: null };
}
