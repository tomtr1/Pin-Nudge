-- PinNudge initial schema
--
-- Ownership model: every private row carries user_id referencing auth.users
-- (ON DELETE CASCADE, so deleting an auth user removes all of their data).
-- Child rows reference their parent through composite (id, user_id) foreign
-- keys, so a user can never attach a row to another user's product, campaign
-- or pin even if they forge IDs. Row Level Security restricts every table to
-- the owner; billing and usage tables are read-only for users and written only
-- by the server using the service role.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  store_name text check (char_length(store_name) <= 120),
  etsy_shop_url text check (char_length(etsy_shop_url) <= 500),
  pinterest_profile_url text check (char_length(pinterest_profile_url) <= 500),
  product_types text[] not null default '{}',
  visual_style text check (char_length(visual_style) <= 60),
  target_audience text check (char_length(target_audience) <= 300),
  marketing_goals text[] not null default '{}',
  preferred_language text not null default 'en' check (char_length(preferred_language) <= 10),
  destination_behavior text not null default 'product_url'
    check (destination_behavior in ('product_url', 'shop_url', 'ask')),
  campaign_defaults jsonb not null default '{}'::jsonb,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile row when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 140),
  description text not null default '' check (char_length(description) <= 2000),
  category text not null default 'other' check (char_length(category) <= 60),
  target_audience text not null default '' check (char_length(target_audience) <= 300),
  main_benefit text not null default '' check (char_length(main_benefit) <= 300),
  keywords text[] not null default '{}' check (cardinality(keywords) <= 25),
  destination_url text check (char_length(destination_url) <= 2048),
  -- Array of {path, contentType, width, height, alt}. Paths live in the
  -- private "product-images" bucket under "<user_id>/...".
  images jsonb not null default '[]'::jsonb check (jsonb_typeof(images) = 'array'),
  visual_style text not null default '' check (char_length(visual_style) <= 60),
  price numeric(10, 2) check (price is null or price >= 0),
  currency text check (currency is null or char_length(currency) = 3),
  tags text[] not null default '{}' check (cardinality(tags) <= 15),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index products_user_created_idx on public.products (user_id, created_at desc);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Campaigns
-- ---------------------------------------------------------------------------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid,
  name text not null check (char_length(name) between 1 and 160),
  objective text not null default 'traffic' check (char_length(objective) <= 60),
  target_audience text not null default '' check (char_length(target_audience) <= 300),
  language text not null default 'en' check (char_length(language) <= 10),
  -- Validated campaign configuration (tone, pin count, CTA, keyword, season...)
  config jsonb not null default '{}'::jsonb,
  -- Snapshot of the product details used for generation, so a campaign stays
  -- readable even if the product is later edited or deleted.
  product_snapshot jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'ready', 'planned', 'published', 'archived')),
  -- 'ai' = live provider output, 'demo' = clearly labelled sample content.
  generation_source text check (generation_source in ('ai', 'demo')),
  ai_model text check (char_length(ai_model) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (product_id, user_id) references public.products (id, user_id)
    on delete set null (product_id)
);

create index campaigns_user_created_idx on public.campaigns (user_id, created_at desc);
create index campaigns_product_idx on public.campaigns (product_id);
create trigger campaigns_updated_at before update on public.campaigns
  for each row execute function public.set_updated_at();

create table public.campaign_angles (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  position smallint not null default 0,
  name text not null check (char_length(name) between 1 and 120),
  audience text not null default '' check (char_length(audience) <= 300),
  problem text not null default '' check (char_length(problem) <= 500),
  message text not null default '' check (char_length(message) <= 500),
  visual_concept text not null default '' check (char_length(visual_concept) <= 500),
  keywords text[] not null default '{}' check (cardinality(keywords) <= 15),
  selected boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (campaign_id, user_id) references public.campaigns (id, user_id) on delete cascade
);

create index campaign_angles_campaign_idx on public.campaign_angles (campaign_id, position);

-- ---------------------------------------------------------------------------
-- Pins
-- ---------------------------------------------------------------------------
create table public.pins (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid,
  angle_id uuid,
  position smallint not null default 0,
  title text not null default '' check (char_length(title) <= 100),
  description text not null default '' check (char_length(description) <= 500),
  primary_keyword text not null default '' check (char_length(primary_keyword) <= 80),
  keywords text[] not null default '{}' check (cardinality(keywords) <= 15),
  creative_concept text not null default '' check (char_length(creative_concept) <= 500),
  headline text not null default '' check (char_length(headline) <= 90),
  subheadline text not null default '' check (char_length(subheadline) <= 140),
  bullets text[] not null default '{}' check (cardinality(bullets) <= 5),
  cta text not null default '' check (char_length(cta) <= 40),
  destination_url text check (char_length(destination_url) <= 2048),
  alt_text text not null default '' check (char_length(alt_text) <= 500),
  filename text not null default '' check (char_length(filename) <= 120),
  design jsonb not null default '{}'::jsonb,
  -- Field names the user edited by hand; regeneration preserves them.
  edited_fields text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'approved', 'published', 'archived')),
  planned_for date,
  -- Only ever set by an explicit user action ("mark as published"); PinNudge
  -- does not publish to Pinterest in this release.
  published_at timestamptz,
  published_method text check (published_method in ('manual')),
  rendered_image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (campaign_id, user_id) references public.campaigns (id, user_id) on delete cascade,
  foreign key (product_id, user_id) references public.products (id, user_id) on delete set null (product_id),
  foreign key (angle_id, user_id) references public.campaign_angles (id, user_id) on delete set null (angle_id)
);

create index pins_campaign_idx on public.pins (campaign_id, position);
create index pins_user_planned_idx on public.pins (user_id, planned_for);
create trigger pins_updated_at before update on public.pins
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Pin metrics (append-only reporting periods)
-- ---------------------------------------------------------------------------
create table public.pin_metrics (
  id uuid primary key default gen_random_uuid(),
  pin_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- 'manual' = typed in by the user; 'pinterest_api' = imported through an
  -- authorized integration (not implemented in this release).
  source text not null check (source in ('manual', 'pinterest_api')),
  period_start date not null,
  period_end date not null,
  impressions integer check (impressions is null or impressions >= 0),
  saves integer check (saves is null or saves >= 0),
  pin_clicks integer check (pin_clicks is null or pin_clicks >= 0),
  outbound_clicks integer check (outbound_clicks is null or outbound_clicks >= 0),
  notes text check (char_length(notes) <= 1000),
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (period_end >= period_start),
  foreign key (pin_id, user_id) references public.pins (id, user_id) on delete cascade
);

create index pin_metrics_pin_idx on public.pin_metrics (pin_id, period_start);
create index pin_metrics_user_idx on public.pin_metrics (user_id, period_start);

-- ---------------------------------------------------------------------------
-- Billing (written only by the server via the service role)
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  plan text not null default 'free' check (plan in ('free', 'starter', 'growth', 'pro')),
  status text not null default 'none'
    check (status in ('none', 'incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  -- Stripe "created" timestamp of the newest applied event; older events are ignored.
  last_event_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Idempotency log for Stripe webhook deliveries.
create table public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Usage events (quota enforcement, cost analysis, support)
-- ---------------------------------------------------------------------------
create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in (
    'campaign_generation', 'pin_generation', 'regeneration', 'image_export', 'zip_export', 'csv_export'
  )),
  quantity integer not null default 1 check (quantity > 0),
  metadata jsonb not null default '{}'::jsonb,
  cost_estimate_usd numeric(10, 5),
  created_at timestamptz not null default now()
);

create index usage_events_user_kind_idx on public.usage_events (user_id, kind, created_at desc);

-- Atomically reserve quota. Returns the new event id, or null if the limit
-- would be exceeded. A per-user advisory lock serialises concurrent requests
-- so parallel calls cannot overshoot the limit.
create or replace function public.consume_usage(
  p_user_id uuid,
  p_kind text,
  p_quantity integer,
  p_limit integer,
  p_period_start timestamptz,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  used integer;
  new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_kind, 0));
  select coalesce(sum(quantity), 0) into used
  from public.usage_events
  where user_id = p_user_id and kind = p_kind and created_at >= p_period_start;

  if used + p_quantity > p_limit then
    return null;
  end if;

  insert into public.usage_events (user_id, kind, quantity, metadata)
  values (p_user_id, p_kind, p_quantity, coalesce(p_metadata, '{}'::jsonb))
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.consume_usage(uuid, text, integer, integer, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.consume_usage(uuid, text, integer, integer, timestamptz, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Integrations (connection metadata only; tokens never stored in this table)
-- ---------------------------------------------------------------------------
create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('pinterest', 'etsy')),
  status text not null default 'disconnected' check (status in ('disconnected', 'connected', 'error', 'revoked')),
  external_account_id text,
  scopes text[] not null default '{}',
  -- Reference to a secret held in a secure store (e.g. Supabase Vault), never the token itself.
  credential_ref text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create trigger integrations_updated_at before update on public.integrations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_angles enable row level security;
alter table public.pins enable row level security;
alter table public.pin_metrics enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;
alter table public.usage_events enable row level security;
alter table public.integrations enable row level security;

-- Profiles: owner can read, create and update their own row.
create policy "profiles_select_own" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "profiles_insert_own" on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Owner-scoped CRUD tables.
do $$
declare
  t text;
begin
  foreach t in array array['products', 'campaigns', 'campaign_angles', 'pins', 'pin_metrics'] loop
    execute format('create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))', t || '_select_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t || '_insert_own', t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t || '_update_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t || '_delete_own', t);
  end loop;
end;
$$;

-- Read-only for owners; all writes happen server-side with the service role.
create policy "subscriptions_select_own" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "usage_events_select_own" on public.usage_events for select to authenticated
  using (user_id = (select auth.uid()));
create policy "integrations_select_own" on public.integrations for select to authenticated
  using (user_id = (select auth.uid()));
-- stripe_events: no policies; only the service role can access it.

-- Defence in depth: anonymous visitors get no table privileges at all.
revoke all on all tables in schema public from anon;

-- ---------------------------------------------------------------------------
-- Storage: private product image bucket, one folder per user
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', false, 5242880, array['image/png', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "product_images_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "product_images_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "product_images_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "product_images_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
