/**
 * Runs the real Anthropic SDK client against a local fake Messages API so we
 * can verify how the provider handles good output, malformed output,
 * refusals, truncation, rate limits and auth failures — without paid calls.
 */
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { GenerationContext } from "@/lib/ai/types";

type Reply = { status: number; body: unknown; headers?: Record<string, string> };
let queue: Reply[] = [];
let lastRequest: Record<string, unknown> | null = null;
let server: Server;

const message = (text: string, stop_reason = "end_turn") => ({
  status: 200,
  body: {
    id: "msg_1",
    type: "message",
    role: "assistant",
    model: "claude-opus-5-5",
    content: [{ type: "text", text }],
    stop_reason,
    stop_sequence: null,
    usage: { input_tokens: 1200, output_tokens: 800 },
  },
});

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      lastRequest = raw ? JSON.parse(raw) : null;
      const reply = queue.shift() ?? { status: 500, body: { type: "error", error: { type: "api_error", message: "no reply queued" } } };
      res.writeHead(reply.status, { "content-type": "application/json", ...(reply.headers ?? {}) });
      res.end(JSON.stringify(reply.body));
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server?.close();
  delete process.env.ANTHROPIC_BASE_URL;
});

beforeEach(() => {
  queue = [];
  process.env.ANTHROPIC_API_KEY = "sk-ant-test-not-real";
  process.env.AI_MODEL = "claude-opus-5-5";
  process.env.AI_PROVIDER = "anthropic";
  process.env.AI_TIMEOUT_MS = "5000";
});

const ctx: GenerationContext = {
  product: { name: "Planner", description: "d", category: "planner", targetAudience: "", mainBenefit: "", keywords: [], visualStyle: "" },
  config: { objective: "traffic", pinCount: 2, angleCount: 2, tone: "friendly", visualStyle: "minimal", language: "en", primaryKeyword: "", cta: "", season: "", variety: "balanced", template: "auto" },
  campaignAudience: "",
  hasProductImage: false,
  allowedTemplates: ["minimal", "benefits", "checklist"],
};
const angle = (name: string) => ({ name, audience: "a", problem: "p", message: "m", visualConcept: "v", keywords: ["k"] });

async function provider() {
  const { createAnthropicProvider } = await import("@/lib/ai/anthropic-provider");
  return createAnthropicProvider();
}

describe("Anthropic provider", () => {
  it("sends a structured-output request and returns validated angles with usage and cost", async () => {
    queue.push(message(JSON.stringify({ angles: [angle("Beginners"), angle("Students")] })));
    const res = await (await provider()).generateAngles(ctx, 2);
    expect(res.source).toBe("ai");
    expect(res.model).toBe("claude-opus-5-5");
    expect(res.data.map((a) => a.name)).toEqual(["Beginners", "Students"]);
    expect(res.usage).toMatchObject({ inputTokens: 1200, outputTokens: 800 });
    expect(res.usage?.costUsd).toBeCloseTo((1200 * 4 + 800 * 20) / 1e6, 6);
    const req = lastRequest as { model: string; output_config: { format: { type: string }; effort: string }; fallbacks?: string };
    expect(req.model).toBe("claude-opus-5-5");
    expect(req.output_config.format.type).toBe("json_schema");
    expect(req.output_config.effort).toBe("low");
    expect(req.fallbacks).toBe("default");
  });

  it("rejects output that isn't JSON", async () => {
    queue.push(message("Sure! Here are some angles: ..."));
    await expect((await provider()).generateAngles(ctx, 2)).rejects.toMatchObject({ kind: "invalid_output" });
  });

  it("rejects schema-valid JSON that fails PinNudge's rules", async () => {
    queue.push(message(JSON.stringify({ angles: [angle("Same"), angle("same")] })));
    await expect((await provider()).generateAngles(ctx, 2)).rejects.toMatchObject({ kind: "invalid_output" });
  });

  it("maps refusals and truncated responses to safe errors", async () => {
    queue.push(message("", "refusal"));
    await expect((await provider()).generateAngles(ctx, 2)).rejects.toMatchObject({ kind: "refused" });
    queue.push(message('{"angles": [', "max_tokens"));
    await expect((await provider()).generateAngles(ctx, 2)).rejects.toMatchObject({ kind: "invalid_output" });
  });

  it("retries rate limits, then reports a friendly rate-limit error", async () => {
    const limited = { status: 429, body: { type: "error", error: { type: "rate_limit_error", message: "slow down" } }, headers: { "retry-after": "0" } };
    queue.push(limited, limited, limited);
    const err = await (await provider()).generateAngles(ctx, 2).catch((e) => e);
    expect(err.kind).toBe("rate_limited");
    expect(err.userMessage).not.toMatch(/slow down|429/);
    expect(queue).toHaveLength(0); // 1 attempt + 2 retries
  });

  it("succeeds after a transient server error", async () => {
    queue.push({ status: 529, body: { type: "error", error: { type: "overloaded_error", message: "overloaded" } }, headers: { "retry-after": "0" } });
    queue.push(message(JSON.stringify({ angles: [angle("One"), angle("Two")] })));
    const res = await (await provider()).generateAngles(ctx, 2);
    expect(res.data).toHaveLength(2);
  });

  it("treats auth failures as configuration errors without leaking details", async () => {
    queue.push({ status: 401, body: { type: "error", error: { type: "authentication_error", message: "invalid x-api-key sk-ant-..." } } });
    const err = await (await provider()).generateAngles(ctx, 2).catch((e) => e);
    expect(err.kind).toBe("config");
    expect(err.message).not.toMatch(/sk-ant|x-api-key/);
  });

  it("validates generated pins", async () => {
    const pin = { title: "T1", description: "D", primaryKeyword: "k", keywords: [], creativeConcept: "c", headline: "H", subheadline: "", bullets: [], cta: "Go", altText: "a", template: "minimal", angleIndex: 0 };
    queue.push(message(JSON.stringify({ pins: [pin, { ...pin, title: "T2", angleIndex: 1 }] })));
    const res = await (await provider()).generatePins(ctx, [angle("A"), angle("B")], 2);
    expect(res.data.map((p) => p.angleIndex)).toEqual([0, 1]);
  });
});
