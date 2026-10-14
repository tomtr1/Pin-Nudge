/**
 * URL validation for user-supplied destination links. PinNudge never fetches
 * these URLs server-side (no previews, no scraping), which removes SSRF risk;
 * we still restrict them to well-formed http(s) links so they are safe to
 * render as anchors and export.
 */
export type UrlResult = { ok: true; url: string } | { ok: false; error: string };

export const MAX_URL_LENGTH = 2048;

export function normalizeUrl(input: string | null | undefined): UrlResult {
  const raw = (input ?? "").trim();
  if (!raw) return { ok: false, error: "Enter a URL." };
  if (raw.length > MAX_URL_LENGTH) return { ok: false, error: "That URL is too long." };
  if (/\s/.test(raw)) return { ok: false, error: "URLs cannot contain spaces." };

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw);
  const candidate = hasScheme ? raw : `https://${raw}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return { ok: false, error: "That doesn't look like a valid link." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, error: "Only http and https links are supported." };
  }
  if (url.username || url.password) {
    return { ok: false, error: "Links containing credentials are not allowed." };
  }
  const host = url.hostname.toLowerCase();
  if (!host.includes(".") || host.endsWith(".") || host.startsWith(".")) {
    return { ok: false, error: "Enter a public web address, for example https://www.etsy.com/listing/…" };
  }
  return { ok: true, url: url.toString() };
}

export function isEtsyUrl(input: string | null | undefined): boolean {
  const res = normalizeUrl(input);
  if (!res.ok) return false;
  const host = new URL(res.url).hostname.toLowerCase();
  return host === "etsy.com" || host.endsWith(".etsy.com") || host === "etsy.me";
}

export function isEtsyListingUrl(input: string | null | undefined): boolean {
  if (!isEtsyUrl(input)) return false;
  const res = normalizeUrl(input);
  return res.ok && /\/listing\/\d+/.test(new URL(res.url).pathname);
}

/** Display-friendly version of a URL (host + path, no protocol). */
export function displayUrl(input: string | null | undefined, max = 48): string {
  if (!input) return "";
  try {
    const u = new URL(input);
    const text = `${u.hostname.replace(/^www\./, "")}${u.pathname === "/" ? "" : u.pathname}`;
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
  } catch {
    return input.slice(0, max);
  }
}
