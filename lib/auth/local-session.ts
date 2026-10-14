import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { localDataDir } from "@/lib/data/local-repo";

/**
 * Signed cookie session for local demo mode only. Supabase mode uses Supabase
 * Auth sessions instead.
 */
export const LOCAL_SESSION_COOKIE = "pn_local_session";
export const LOCAL_DEMO_USER_ID = "00000000-0000-4000-8000-00000000d3e0";
export const LOCAL_DEMO_EMAIL = "demo@local.pinnudge";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

let cachedSecret: string | null = null;

async function getSecret(): Promise<string> {
  if (process.env.PINNUDGE_SESSION_SECRET) return process.env.PINNUDGE_SESSION_SECRET;
  if (cachedSecret) return cachedSecret;
  const dir = localDataDir();
  const file = path.join(dir, "session-secret");
  try {
    cachedSecret = (await fs.readFile(file, "utf8")).trim();
  } catch {
    await fs.mkdir(dir, { recursive: true });
    cachedSecret = randomBytes(32).toString("hex");
    await fs.writeFile(file, cachedSecret, { mode: 0o600 });
  }
  return cachedSecret;
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export async function createLocalSessionValue(userId: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload, await getSecret())}`;
}

export async function verifyLocalSessionValue(value: string | undefined): Promise<string | null> {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  const expected = sign(`${userId}.${exp}`, await getSecret());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return userId;
}

export const localSessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production" && process.env.PINNUDGE_INSECURE_LOCAL_COOKIE !== "true",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
