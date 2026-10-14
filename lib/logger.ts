/**
 * Minimal structured logger. Callers pass identifiers and codes only; secrets,
 * tokens and user content must never be included in log context.
 */
type Level = "info" | "warn" | "error";

const REDACT_KEYS = /key|secret|token|password|authorization|cookie|email/i;

function sanitize(ctx: Record<string, unknown> | undefined) {
  if (!ctx) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(ctx)) {
    if (REDACT_KEYS.test(k)) out[k] = "[redacted]";
    else if (v instanceof Error) out[k] = { name: v.name, message: v.message };
    else if (typeof v === "string" && v.length > 300) out[k] = `${v.slice(0, 300)}…`;
    else out[k] = v;
  }
  return out;
}

function log(level: Level, message: string, ctx?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "test" && level !== "error") return;
  const line = JSON.stringify({ level, message, ...sanitize(ctx), at: new Date().toISOString() });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const logger = {
  info: (m: string, c?: Record<string, unknown>) => log("info", m, c),
  warn: (m: string, c?: Record<string, unknown>) => log("warn", m, c),
  error: (m: string, c?: Record<string, unknown>) => log("error", m, c),
};
