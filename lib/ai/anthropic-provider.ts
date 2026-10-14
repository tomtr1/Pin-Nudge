import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { AiError } from "./errors";
import { anglesPrompt, pinsPrompt, regenerateCopyPrompt, regenerateCreativePrompt, SYSTEM_PROMPT } from "./prompts";
import {
  angleSetWireSchema,
  creativeWireSchema,
  InvalidGenerationError,
  normalizeAngles,
  normalizeCreative,
  normalizePinCopy,
  normalizePins,
  pinCopyWireSchema,
  pinSetWireSchema,
} from "./schemas";
import type { CopyProvider, GenerationResult, UsageInfo } from "./types";

/**
 * Default per-million-token prices used for cost estimates when
 * AI_INPUT_COST_PER_MTOK / AI_OUTPUT_COST_PER_MTOK are not set. Estimates are
 * for internal cost tracking only and are never shown as a bill.
 */
const DEFAULT_PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};

/** Models that accept the server-side refusal fallback (`fallbacks: "default"`). */
const FALLBACK_MODELS = new Set(["claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"]);

export function createAnthropicProvider(): CopyProvider {
  const env = getEnv();
  if (!env.ANTHROPIC_API_KEY || !env.AI_MODEL) throw new AiError("config", "ANTHROPIC_API_KEY or AI_MODEL missing");
  const model = env.AI_MODEL;
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: env.AI_TIMEOUT_MS, maxRetries: 2 });
  const useFallback = env.AI_REFUSAL_FALLBACK === "on" && FALLBACK_MODELS.has(model);

  function estimateCost(input: number, output: number): number | null {
    const price =
      env.AI_INPUT_COST_PER_MTOK !== undefined && env.AI_OUTPUT_COST_PER_MTOK !== undefined
        ? { input: env.AI_INPUT_COST_PER_MTOK, output: env.AI_OUTPUT_COST_PER_MTOK }
        : DEFAULT_PRICING[model];
    if (!price) return null;
    return Number(((input * price.input + output * price.output) / 1_000_000).toFixed(5));
  }

  async function call<S extends z.ZodType>(schema: S, prompt: string, maxTokens: number): Promise<{ json: unknown; usage: UsageInfo }> {
    try {
      const response = await client.beta.messages.create({
        model,
        max_tokens: maxTokens,
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: prompt }],
        output_config: { effort: env.AI_EFFORT, format: betaZodOutputFormat(schema) },
        ...(useFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      });

      const usage: UsageInfo = {
        inputTokens: response.usage.input_tokens + (response.usage.cache_read_input_tokens ?? 0) + (response.usage.cache_creation_input_tokens ?? 0),
        outputTokens: response.usage.output_tokens,
        costUsd: estimateCost(response.usage.input_tokens, response.usage.output_tokens),
      };

      if (response.stop_reason === "refusal") throw new AiError("refused", "stop_reason=refusal");
      if (response.stop_reason === "max_tokens") throw new AiError("invalid_output", "stop_reason=max_tokens");

      const text = response.content.find((b) => b.type === "text");
      if (!text || text.type !== "text") throw new AiError("invalid_output", "no text block");
      try {
        return { json: JSON.parse(text.text), usage };
      } catch {
        throw new AiError("invalid_output", "response was not JSON");
      }
    } catch (error) {
      throw toAiError(error);
    }
  }

  function wrap<T>(data: T, usage: UsageInfo): GenerationResult<T> {
    return { data, source: "ai", model, usage };
  }

  function validated<T>(fn: () => T): T {
    try {
      return fn();
    } catch (error) {
      if (error instanceof InvalidGenerationError) throw new AiError("invalid_output", error.reason);
      throw error;
    }
  }

  const tokenBudget = (n: number) => Math.min(env.AI_MAX_OUTPUT_TOKENS, n);

  return {
    id: "anthropic",

    async generateAngles(ctx, count) {
      const { json, usage } = await call(angleSetWireSchema, anglesPrompt(ctx, count), tokenBudget(6_000));
      return wrap(validated(() => normalizeAngles(json, count)), usage);
    },

    async generatePins(ctx, angles, count) {
      const { json, usage } = await call(pinSetWireSchema, pinsPrompt(ctx, angles, count), tokenBudget(4_000 + count * 900));
      return wrap(validated(() => normalizePins(json, count, angles.length)), usage);
    },

    async regeneratePinCopy(ctx, angle, current, siblings) {
      const { json, usage } = await call(pinCopyWireSchema, regenerateCopyPrompt(ctx, angle, current, siblings), tokenBudget(3_000));
      return wrap(
        validated(() => {
          const parsed = pinCopyWireSchema.safeParse(json);
          if (!parsed.success) throw new InvalidGenerationError("pin copy did not match the schema");
          return normalizePinCopy(parsed.data);
        }),
        usage,
      );
    },

    async regenerateCreative(ctx, angle, current) {
      const { json, usage } = await call(creativeWireSchema, regenerateCreativePrompt(ctx, angle, current), tokenBudget(2_000));
      return wrap(validated(() => normalizeCreative(json)), usage);
    },
  };
}

function toAiError(error: unknown): AiError {
  if (error instanceof AiError) return error;
  if (error instanceof Anthropic.RateLimitError) {
    logger.warn("ai.rate_limited");
    return new AiError("rate_limited");
  }
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    logger.warn("ai.timeout");
    return new AiError("timeout");
  }
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    logger.error("ai.auth_failed", { status: error.status });
    return new AiError("config", "authentication failed");
  }
  if (error instanceof Anthropic.BadRequestError || error instanceof Anthropic.NotFoundError) {
    logger.error("ai.bad_request", { status: error.status });
    return new AiError("unavailable", "bad request");
  }
  if (error instanceof Anthropic.APIError) {
    logger.error("ai.api_error", { status: error.status });
    return new AiError("unavailable", `status ${error.status}`);
  }
  logger.error("ai.unexpected_error", { error: error instanceof Error ? error.name : "unknown" });
  return new AiError("unavailable", "unexpected");
}
