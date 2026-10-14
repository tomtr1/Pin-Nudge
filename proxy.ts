import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Runs before every matched request:
 *  1. Refreshes the Supabase auth session cookie (Supabase mode).
 *  2. Redirects signed-out visitors away from authenticated app routes.
 * Pages and actions still perform their own authorization checks; this is a
 * convenience layer, not the security boundary.
 */
const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/products", "/campaigns", "/calendar", "/analytics", "/settings", "/billing"];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function supabaseConfigured() {
  if (process.env.PINNUDGE_DATA_MODE === "local") return false;
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Optional CORS for the JSON API, for running the mobile app's web build
 * during development. Native iOS requests don't need CORS. Off unless
 * API_CORS_ORIGINS is set (comma-separated exact origins).
 */
function corsHeaders(request: NextRequest): Record<string, string> | null {
  const origin = request.headers.get("origin");
  const allowed = (process.env.API_CORS_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean);
  if (!origin || !allowed.includes(origin) || !request.nextUrl.pathname.startsWith("/api/")) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

export async function proxy(request: NextRequest) {
  const cors = corsHeaders(request);
  if (cors && request.method === "OPTIONS") return new NextResponse(null, { status: 204, headers: cors });
  if (request.nextUrl.pathname.startsWith("/api/mobile/")) {
    // The mobile API authenticates with bearer tokens, not cookies.
    const response = NextResponse.next();
    for (const [k, v] of Object.entries(cors ?? {})) response.headers.set(k, v);
    return response;
  }

  let response = NextResponse.next({ request });
  let signedIn = false;

  if (supabaseConfigured()) {
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    });
    const { data } = await supabase.auth.getClaims();
    signedIn = Boolean(data?.claims?.sub);
  } else {
    signedIn = Boolean(request.cookies.get("pn_local_session")?.value);
  }

  if (!signedIn && isProtected(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
    const redirect = NextResponse.redirect(url);
    for (const c of response.cookies.getAll()) redirect.cookies.set(c);
    return redirect;
  }

  for (const [k, v] of Object.entries(cors ?? {})) response.headers.set(k, v);
  return response;
}

export const config = {
  matcher: [
    // Skip static assets, images and the Stripe webhook (which must receive the raw body untouched).
    "/((?!_next/static|_next/image|icon.svg|api/webhooks|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$).*)",
  ],
};
