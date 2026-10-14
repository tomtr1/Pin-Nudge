# PinNudge

**Create smarter. Pin with purpose.**

PinNudge helps Etsy digital-product sellers turn products into differentiated Pinterest campaigns, manage their publishing workflow, and learn from real performance data.

> PinNudge is an independent product and is not affiliated with, endorsed by, or sponsored by Pinterest or Etsy.

The core flow: **product → distinct marketing angles → AI-written pins → edit/regenerate → PNG/ZIP/CSV export → planning → manually recorded results → evidence-based suggestions.**

---

## Contents

1. [What's implemented](#whats-implemented)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Quick start (local demo mode, no credentials)](#quick-start-local-demo-mode-no-credentials)
5. [Supabase setup](#supabase-setup)
6. [Authentication](#authentication)
7. [AI configuration](#ai-configuration)
8. [Stripe (test mode)](#stripe-test-mode)
9. [Testing](#testing)
10. [Production build & deployment](#production-build--deployment)
11. [Integrations requiring third-party approval](#integrations-requiring-third-party-approval)
12. [Known limitations](#known-limitations)
13. [Brand configuration & renaming](#brand-configuration--renaming)

---

## What's implemented

| Area | Details |
| --- | --- |
| Public site | Landing page (labelled illustrative examples, no invented testimonials or results), `/pricing` with plan comparison, `/help`, draft `/privacy` and `/terms` (clearly marked as needing legal review), affiliation disclaimer in the footer and legal pages. |
| Auth | Supabase email/password with email confirmation, password reset, sign-out; protected routes via `proxy.ts`; local demo login when Supabase isn't configured. |
| Onboarding & settings | Product types, store, Etsy/Pinterest links (stored as references only), visual style, audience, goals, language, default destination. Settings: profile, saved campaign defaults (Growth+), password, plan & billing, integrations status, JSON data export, real account deletion. |
| Product library | Create/edit/delete, search and filter, PNG/JPEG uploads to private storage (magic-byte checked, 5 MB, 6 per product), Etsy link detection with an explicit "enter details manually" message (no scraping), per-product campaign history, sample product. |
| Campaign builder | Six-step flow: product → settings (audience, objective, pin count, angles, tone, style, language, keyword, CTA, season, variety, template) → angles (edit/deselect/regenerate) → pins → review → export. The draft and its inputs are saved before any AI call, so a failed generation can be retried without re-entering anything. |
| Pin editing | Live preview rendered by the same server renderer as exports; edit title, description, keywords, overlay text, CTA, link, alt text, filename, template, colours, typography, image placement. Regenerate copy or creative for one pin while keeping hand-edited fields. Duplicate, delete, approve, approve-all, mark as published (manual). |
| Rendering & export | Six deterministic 1000×1500 templates in a print/craft style (paper grain, taped photos, sticky notes, notebook paper, hand-drawn marks with small per-pin variations), rendered with satori + resvg, bundled OFL fonts, text fitting + line clamping and a contrast guard. Single PNG, ZIP of approved pins (+ `pins.csv` + `campaign-summary.md`, Growth+), CSV (formula-injection safe), Markdown summary. Filenames like `product-name_campaign-angle_01.png`. |
| Calendar (Growth+) | Month grid, unplanned approved pins, date assignment, manual "published" marking, product/status filters. Never implies automatic posting. |
| Analytics (Growth+) | Manually reported metrics per pin and period (history kept), totals and rates with explicit formulas and null-safe maths, outbound-click-rate chart + tables, campaign comparison (angle comparison on Pro), evidence-citing suggestions or an explicit "not enough data". No sales attribution. |
| Billing | Central plan config, Stripe Checkout, Customer Portal, verified + idempotent webhooks that re-fetch subscription state from Stripe (safe against out-of-order delivery), documented status → access policy, upgrade prompts, server-side quota and feature enforcement. |
| Security | RLS on every table, composite ownership foreign keys, service role server-only, Zod at every boundary, SSRF-free URL handling (URLs are never fetched), upload sniffing, per-user generation rate limit, atomic quota reservation, security headers + production CSP, generic user-facing errors, redacted logging. |

### Routes

Public: `/`, `/pricing`, `/help`, `/privacy`, `/terms`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback`
App: `/dashboard`, `/onboarding`, `/products`, `/products/new`, `/products/[id]`, `/campaigns`, `/campaigns/new`, `/campaigns/[id]`, `/calendar`, `/analytics`, `/settings`, `/billing/success`, `/billing/cancel`
API: `/api/pins/[id]/image`, `/api/pins/[id]/preview`, `/api/products/[id]/images/[index]`, `/api/campaigns/[id]/export`, `/api/account/export`, `/api/webhooks/stripe`

---

## Architecture

- **Visual style:** editorial and print-inspired (Newsreader serif headings, Instrument Sans UI, square corners, flat colour blocks, grid-paper illustrations). Tokens live in `app/globals.css`.
- **Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS v4**, Radix primitives (shadcn-style components in `components/ui`), Lucide icons, Recharts, Zod, sonner.
- **Rendering model:** classic dynamic rendering (`cacheComponents: false`). Almost every page is per-user and reads the session, so explicit dynamic data access is simpler and more predictable here than Cache Components.
- **Mutations** go through Server Actions (`app/actions/*`) wrapped by `withUser()` (auth + error mapping). Binary responses and webhooks are Route Handlers.
- **Data layer** (`lib/data`): one `UserRepository` interface with two implementations:
  - `supabase-repo.ts` — uses the signed-in user's Supabase client, so **RLS applies to every query**, plus explicit `user_id` filters as defence in depth.
  - `local-repo.ts` — a JSON file + uploads folder for credential-free local demo mode (single process, not for production).
  - `AdminRepository` holds privileged operations (quota reservation, webhook writes, account deletion) and uses the service role in Supabase mode.
- **AI** (`lib/ai`): `CopyProvider` interface; `anthropic-provider.ts` (official SDK, structured JSON output, typed error mapping, timeouts, retries, cost estimates) and `demo-provider.ts` (deterministic sample content, always stored with `generation_source = 'demo'` and labelled in the UI). Generated JSON is validated and normalized (`lib/ai/schemas.ts`) before it is ever persisted.
- **Rendering** (`lib/render`): React → SVG (satori) → PNG (resvg). Previews and exports use the same function. An in-memory LRU cache avoids re-rendering unchanged pins. A future image-generation provider would plug in alongside, not replace, the template renderer.
- **Billing** (`lib/billing`): `plans.ts` (single source of prices/limits/features), `entitlements.ts` (status policy), `usage.ts` (quota + rate limit + feature gates), `stripe.ts`, `webhooks.ts`.
- **Brand** (`lib/brand`): name, tagline, disclaimer, colours and public URL.

```
app/            routes, layouts, server actions, route handlers
components/     ui primitives + feature components (campaigns, pins, products, …)
lib/            ai, analytics, auth, billing, brand, campaigns, data, export, render, storage, validations
supabase/       config.toml + migrations (schema, RLS, storage bucket, quota function)
tests/unit      fast unit tests (no services)
tests/integration  Supabase RLS, Stripe route, AI SDK, paid-plan export
e2e/            Playwright tests against a production build
assets/fonts    OFL fonts bundled for server-side rendering
```

### Subscription status → access policy

| Stripe status | Access |
| --- | --- |
| `active`, `trialing` | Subscribed plan |
| `past_due` | Subscribed plan (grace while Stripe retries) + payment banner |
| `canceled` with `cancel_at_period_end` and period not ended | Subscribed plan until period end |
| `incomplete` (checkout not finished) | Free |
| `canceled`, `incomplete_expired`, `unpaid`, `paused`, none | Free (data is kept; Free limits apply) |

Entitlements are derived only from the `subscriptions` table, which users can read but never write (RLS) — it is written only by verified webhooks or by the success page after re-reading the Checkout Session from the Stripe API.

### Plans (edit `lib/billing/plans.ts`)

| | Free | Starter €9.99 | Growth €14.99 | Pro €24.99 |
| --- | --- | --- | --- | --- |
| Products | 3 | 25 | 100 | 500 |
| Campaign generations / month | 2 | 10 | 30 | 80 |
| Pins per campaign / angles | 6 / 2 | 10 / 3 | 15 / 5 | 20 / 6 |
| Regenerations / month | 10 | 60 | 200 | 600 |
| Templates | 3 | 6 + custom colours | all + typography | all |
| ZIP export, calendar, analytics, saved preferences | – | – | ✓ | ✓ (+ angle comparison) |

Usage resets on the first day of each calendar month (UTC). Quotas are reserved atomically in Postgres (`consume_usage`, advisory lock per user) **before** calling the AI provider and refunded if the call fails.

---

## Prerequisites

- Node.js 20.9+ (developed on Node 22) and npm
- For Supabase mode locally: Docker + the Supabase CLI (installed as a dev dependency: `npx supabase`)
- Optional: an Anthropic API key, a Stripe account in test mode and the Stripe CLI

---

## Quick start (local demo mode, no credentials)

```bash
npm install
npm run dev
```

Open http://localhost:3000 → **Get started** → **Continue in local demo**.

With no `.env.local`, PinNudge runs in **local demo mode**: data is stored in `./.data/` on the server, there's a single demo account, campaign copy comes from the demo generator (labelled *Sample content*), and billing is disabled. Banners in the app say so. Local mode is refused in production builds unless `PINNUDGE_ALLOW_LOCAL_MODE_IN_PRODUCTION=true`.

---

## Supabase setup

### Local stack

```bash
cp .env.example .env.local
npx supabase start          # first run downloads Docker images
npx supabase status         # copy API URL, anon key and service_role key into .env.local
npm run db:reset            # applies supabase/migrations (also run after pulling new migrations)
npm run dev
```

Local auth emails (sign-up confirmation, password reset) are captured by Mailpit at http://127.0.0.1:54324.

### Hosted project

1. Create a project at supabase.com.
2. Apply the migrations:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
   This creates all tables, RLS policies, the `consume_usage` function, the signup trigger and the private `product-images` storage bucket (PNG/JPEG, 5 MB).
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` (server-only) in your environment.

The schema lives in `supabase/migrations/20261014000000_initial_schema.sql` and is documented inline.

---

## Authentication

In the Supabase dashboard → **Authentication**:

- **Providers → Email:** enabled, **Confirm email** on (the local `config.toml` mirrors this).
- **URL Configuration:** set **Site URL** to your `NEXT_PUBLIC_APP_URL` and add `https://<your-domain>/auth/callback` to **Redirect URLs**.
- Configure a production SMTP provider before launch (Supabase's default sender is rate-limited).
- Minimum password length is 8 (enforced by the app; set the same in Supabase).

---

## AI configuration

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...      # your own API key (Claude Code access is not an API key)
AI_MODEL=claude-opus-5-5          # explicit model id; required
AI_EFFORT=low                     # low | medium | high | xhigh | max
```

- Generation runs only on the server, uses structured JSON output, and every response is validated (counts, lengths, allowed templates, distinct angles, non-repetitive titles) before saving.
- Only product/campaign details are sent to the provider — never emails, URLs, payment data or images.
- `AI_REFUSAL_FALLBACK=on` enables Anthropic's server-side refusal fallback on models that support it.
- Cost estimates are written to `usage_events.cost_estimate_usd`; override prices with `AI_INPUT_COST_PER_MTOK` / `AI_OUTPUT_COST_PER_MTOK` if you use another model.
- Without a key (or with `AI_PROVIDER=demo`) the app uses the demo generator, and everything it produces is labelled as sample content in the UI, CSV and summary.
- To add a provider, implement `CopyProvider` (`lib/ai/types.ts`) and select it in `lib/ai/index.ts`.

---

## Stripe (test mode)

1. In the Stripe Dashboard (test mode) create three **recurring monthly EUR prices** matching `lib/billing/plans.ts` (€9.99, €14.99, €24.99).
2. Enable the **Customer Portal** (Settings → Billing → Customer portal): allow plan switching between those prices, payment-method updates and cancellation.
3. Set:
   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PRICE_STARTER=price_...
   STRIPE_PRICE_GROWTH=price_...
   STRIPE_PRICE_PRO=price_...
   STRIPE_WEBHOOK_SECRET=whsec_...   # see below
   ```
4. Webhooks locally:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   # copy the printed whsec_... into STRIPE_WEBHOOK_SECRET and restart the dev server
   ```
   Deployed: add an endpoint `https://<your-domain>/api/webhooks/stripe` with events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`.
5. Test: Settings → Plan & billing → Upgrade → pay with `4242 4242 4242 4242`. Try `4000 0000 0000 0341` (attaches, then fails on renewal) and cancellation from the portal. `stripe trigger invoice.payment_failed` exercises the past-due path.

If keys or prices are missing, the app shows "Live billing isn't connected on this server" and disables checkout. It never simulates a successful payment.

---

## Testing

```bash
npm run typecheck          # TypeScript
npm run lint               # ESLint
npm test                   # unit tests (no services needed)
npm run test:integration   # Supabase RLS/storage tests run if Supabase is reachable (.env.local or env vars), otherwise skip;
                           # Stripe route, AI SDK and paid-plan export tests always run
npm run build && npm run test:e2e   # Playwright against `next start` in local demo mode
```

In a fresh environment, install a browser once for Playwright: `npx playwright install chromium`.

Coverage highlights:

- **Unit:** URL/filename/schema validation, entitlement policy for every status, quota maths, metric maths (null/zero safe), insights, status transitions, CSV escaping/formula injection, upload sniffing, AI output normalization, demo provider, renderer (all templates at 1000×1500, determinism, contrast), webhook idempotency and out-of-order handling, local-store isolation, server-side plan limits and quota rejection, regeneration preserving edits.
- **Integration (real Supabase):** a second authenticated user trying to read/update/delete/attach to another user's products, campaigns, angles, pins and metrics; self-granting a plan; editing usage; calling the quota function; reading/listing/uploading into another user's storage folder; anonymous access; bucket type restrictions; concurrent quota reservation; account deletion cascade.
- **Integration (no network):** the real webhook route (missing/forged signature, tampered body, duplicates, disabled billing); the Anthropic SDK against a local fake API (valid output, non-JSON, rule-violating JSON, refusal, truncation, 429 retries, transient 529, auth failure without leaking details).
- **E2E:** first-time flow through export, sign-out/in persistence, Free-plan generation limit, gated features, data export, access control and security headers, mobile layout.

---

## Production build & deployment

```bash
npm run build
npm start
```

**Vercel (recommended):**

1. Import the repository; framework preset Next.js.
2. Set environment variables from `.env.example` (Production and Preview). `NEXT_PUBLIC_APP_URL` must be the deployed URL.
3. Apply migrations to the production Supabase project (`npx supabase db push`).
4. Configure Supabase auth URLs and the Stripe webhook endpoint for the deployed domain.
5. Generation and export routes set `maxDuration` (60–120 s); make sure your plan allows it.

`@resvg/resvg-js` is a native module with prebuilt binaries and is excluded from bundling via `serverExternalPackages`; fonts in `assets/fonts` are included in the API routes' output trace.

---

## Integrations requiring third-party approval

| Integration | Status |
| --- | --- |
| Anthropic API | Implemented; needs your API key. |
| Stripe | Implemented; needs your account, prices, portal configuration and webhook secret. |
| Pinterest API (publishing, analytics import) | **Not implemented.** Requires a Pinterest developer app, approval for the needed scopes, OAuth and token storage. The `integrations` table and `pinterest_api` metric source exist for this. Verify current Pinterest API docs, scopes and rate limits before building it. Until then, exports + manual posting + manual metrics. |
| Etsy API (listing import) | **Not implemented.** Requires an approved Etsy app. PinNudge never scrapes Etsy; sellers enter product details. |

---

## Known limitations

- **Not tested with live services in this environment:** real Anthropic generations (the SDK path is tested against a fake API), real Stripe Checkout/Portal/webhooks (webhook logic and the route are tested with signed test payloads), hosted Supabase (tested against the local Supabase stack), Vercel deployment.
- Local demo mode is single-user and single-process; don't deploy it for customers.
- Demo-mode sample copy is English-only.
- WebP uploads are not accepted (the renderer can't embed them); PNG/JPEG only.
- Pinterest bulk-upload CSVs need public media URLs, which PinNudge doesn't host; the CSV is a reference sheet.
- The preview endpoint renders on every edit (debounced) without a separate rate limit.
- CSP allows `'unsafe-inline'` scripts (Next.js bootstrap); nonce-based CSP is a possible hardening step.
- No dark mode, no annual billing, no team accounts.

### Before accepting real customers

1. Trademark clearance for "PinNudge" (EUIPO/TMview; USPTO if targeting the US), domain and social-handle checks.
2. Legal review of Terms and Privacy; business entity, VAT/tax setup in Stripe, cookie/consent review.
3. Production Supabase with backups, SMTP, auth URL configuration; production Stripe with portal and webhooks.
4. Live end-to-end runs of AI generation (quality review on real listings in each supported language) and the full Stripe lifecycle.
5. Error monitoring and log retention policy; support inbox (`NEXT_PUBLIC_SUPPORT_EMAIL`).

---

## Brand configuration & renaming

The name, tagline, disclaimer, colours, slug and URL logic live in **`lib/brand/index.ts`**. UI copy, metadata, exports and legal pages read from it. If a trademark or domain check requires a rename:

1. Update `brand.name`, `brand.tagline` and `brand.slug` in `lib/brand/index.ts`.
2. Update the mark in `components/brand/logo.tsx` and `app/icon.svg`.
3. UI copy reads `brand.name`; the remaining literal mentions are in code comments, tests, the README and `supabase/config.toml`. Find them with `grep -rn "PinNudge" .  --exclude-dir=node_modules --exclude-dir=.next`.
4. Set `NEXT_PUBLIC_APP_URL` to the new domain and update Supabase/Stripe URLs.
