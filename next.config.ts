import type { NextConfig } from "next";

/**
 * Content Security Policy (production only; the dev server needs eval for
 * fast refresh). The browser never talks to Supabase, Stripe or the AI
 * provider directly — all of that happens server-side — so connections are
 * limited to this origin. Next.js inline bootstrap scripts require
 * 'unsafe-inline' unless nonces are introduced.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  ...(process.env.NODE_ENV === "production" ? [{ key: "Content-Security-Policy", value: csp }] : []),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  // PinNudge is an authenticated, per-user app where nearly every page reads the
  // session. We use the classic dynamic rendering model rather than Cache
  // Components to keep data access explicit and predictable.
  cacheComponents: false,
  poweredByHeader: false,
  serverExternalPackages: ["@resvg/resvg-js"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./assets/fonts/**/*", "./assets/textures/**/*"],
  },
  experimental: {
    serverActions: {
      // Product image uploads go through server actions (validated to 5 MB).
      bodySizeLimit: "6mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
