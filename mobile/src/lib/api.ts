import { API_URL } from "./config";
import { getSecret, setSecret, deleteSecret } from "./storage";
import type { TokenSession } from "./types";

/**
 * Typed client for the PinNudge mobile API (/api/mobile/v1). Holds the token
 * session, refreshes it shortly before expiry and retries once on a 401.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly fieldErrors: Record<string, string> = {},
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const SESSION_KEY = "pinnudge.session.v1";
const BASE = `${API_URL}/api/mobile/v1`;

let session: TokenSession | null = null;
let loaded = false;
let refreshing: Promise<TokenSession | null> | null = null;
const listeners = new Set<(s: TokenSession | null) => void>();

export function onSessionChange(fn: (s: TokenSession | null) => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

export async function loadSession(): Promise<TokenSession | null> {
  if (loaded) return session;
  loaded = true;
  const raw = await getSecret(SESSION_KEY).catch(() => null);
  try {
    session = raw ? (JSON.parse(raw) as TokenSession) : null;
  } catch {
    session = null;
  }
  return session;
}

export async function setSession(next: TokenSession | null) {
  session = next;
  loaded = true;
  if (next) await setSecret(SESSION_KEY, JSON.stringify(next));
  else await deleteSecret(SESSION_KEY).catch(() => undefined);
  for (const fn of listeners) fn(next);
}

export function currentAccessToken() {
  return session?.accessToken ?? null;
}

async function parse<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as { data?: T; error?: string; code?: string; fieldErrors?: Record<string, string>; retryable?: boolean } | null;
  if (!res.ok) {
    throw new ApiError(
      body?.error ?? (res.status >= 500 ? "The server had a problem. Please try again." : "That request didn't work."),
      res.status,
      body?.code ?? "server",
      body?.fieldErrors ?? {},
      Boolean(body?.retryable),
    );
  }
  return (body?.data ?? null) as T;
}

async function refresh(): Promise<TokenSession | null> {
  const current = session;
  if (!current?.refreshToken) return null;
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });
      const next = await parse<TokenSession>(res);
      await setSession(next);
      return next;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) await setSession(null);
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** Returns a valid access token, refreshing it if it expires within a minute. */
export async function freshToken(): Promise<string | null> {
  await loadSession();
  if (!session) return null;
  if (session.refreshToken && session.expiresAt - 60 < Date.now() / 1000) await refresh();
  return session?.accessToken ?? null;
}

type Options = { method?: string; body?: unknown; form?: FormData; auth?: boolean; signal?: AbortSignal };

export async function request<T>(path: string, opts: Options = {}): Promise<T> {
  const { method = opts.body || opts.form ? "POST" : "GET", body, form, auth = true, signal } = opts;
  const send = async (token: string | null) => {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    try {
      return await fetch(`${BASE}${path}`, { method, headers, body: form ?? (body !== undefined ? JSON.stringify(body) : undefined), signal });
    } catch {
      throw new ApiError("Can't reach PinNudge. Check your connection and try again.", 0, "network", {}, true);
    }
  };
  let token = auth ? await freshToken() : null;
  let res = await send(token);
  if (res.status === 401 && auth && token) {
    token = (await refresh())?.accessToken ?? null;
    if (token) res = await send(token);
    else await setSession(null);
  }
  return parse<T>(res);
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body: unknown = {}) => request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body }),
  del: <T>(path: string, body?: unknown) => request<T>(path, { method: "DELETE", body }),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: "POST", form }),
  public: <T>(path: string, body?: unknown) => request<T>(path, { method: body === undefined ? "GET" : "POST", body, auth: false }),
};

/** URL of a server-rendered pin PNG (send with authHeaders()). */
export function pinImageUrl(pinId: string, size: "thumb" | "preview" | "full" = "preview", version?: string) {
  return `${API_URL}/api/pins/${pinId}/image?size=${size}${version ? `&v=${encodeURIComponent(version)}` : ""}`;
}

export function productImageUrl(productId: string, index: number) {
  return `${API_URL}/api/products/${productId}/images/${index}`;
}

export function previewUrl(pinId: string) {
  return `${API_URL}/api/pins/${pinId}/preview`;
}

export function authHeaders(): Record<string, string> {
  const token = currentAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
