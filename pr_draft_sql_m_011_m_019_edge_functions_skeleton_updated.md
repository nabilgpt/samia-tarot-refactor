# PR Draft — SQL (M011–M019) + Edge Functions Skeleton — UPDATED

> **Note:** Real schemas, real RLS, no seed/mock data. Keep code maintainable & short. Do **not** create files outside this structure without approval.

---

## `/sql/M011_wallet_payouts.sql`

```sql
-- Helpers (idempotent)
create or replace function app_role() returns text language sql stable as $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'app_role', 'client');
$$;
create or replace function is_staff() returns boolean language sql stable as $$ select app_role() in ('reader','monitor','admin','superadmin'); $$;
create or replace function is_admin() returns boolean language sql stable as $$ select app_role() in ('admin','superadmin'); $$;
create or replace function is_super_admin() returns boolean language sql stable as $$ select app_role() = 'superadmin'; $$;

-- payout method enum (idempotent)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'payout_method') then
    create type payout_method as enum ('bank_transfer','western_union','whish','al_haram');
  end if;
end $$;

create table if not exists payout_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  method payout_method not null,
  details jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table payout_accounts enable row level security;
create index if not exists idx_payout_accounts_user on payout_accounts(user_id);

-- Owner can CRUD own records; admins read all; monitors read-only
create policy "payout_accounts_owner_select" on payout_accounts for select using (auth.uid() = user_id or is_admin() or app_role() = 'monitor');
create policy "payout_accounts_owner_cud"    on payout_accounts for all    using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- cashout status enum (idempotent)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'cashout_status') then
    create type cashout_status as enum ('pending_review_admin','pending_execution_superadmin','settled','rejected');
  end if;
end $$;

create table if not exists cashout_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  payout_account_id uuid not null references payout_accounts(id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'USD',
  status cashout_status not null default 'pending_review_admin',
  admin_reviewer uuid,
  superadmin_executor uuid,
  proof_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table cashout_requests enable row level security;
create index if not exists idx_cashout_requests_requester on cashout_requests(requester_id);
create index if not exists idx_cashout_requests_status on cashout_requests(status);
create index if not exists idx_cashout_requests_created on cashout_requests(created_at);

-- Policies: owner read & create; admin can transition; superadmin settles; monitor read-only
create policy "cashout_owner_read"    on cashout_requests for select using (auth.uid() = requester_id or is_admin() or app_role() = 'monitor');
create policy "cashout_owner_create"  on cashout_requests for insert with check (auth.uid() = requester_id);
create policy "cashout_admin_update"  on cashout_requests for update using (is_admin()) with check (is_admin());
create policy "cashout_super_settle"  on cashout_requests for update using (is_super_admin()) with check (is_super_admin());
```

---

## `/sql/M012_rewards.sql`

```sql
-- reward enums (idempotent)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'reward_reason') then
    create type reward_reason as enum ('earn','redeem','reversal');
  end if;
end $$;

create table if not exists reward_balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  points bigint not null default 0
);
alter table reward_balances enable row level security;
create policy "rb_owner_ro"   on reward_balances for select using (auth.uid() = user_id or is_admin());
create policy "rb_admin_upd"  on reward_balances for update using (is_admin()) with check (is_admin());

create table if not exists reward_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  points_delta bigint not null,
  reason reward_reason not null,
  order_id uuid,
  created_at timestamptz not null default now()
);
alter table reward_events enable row level security;
create index if not exists idx_reward_events_user on reward_events(user_id);
create policy "re_owner_ro"   on reward_events for select using (auth.uid() = user_id or is_admin());
create policy "re_admin_ins"  on reward_events for insert with check (is_admin());
```

---

## `/sql/M013_i18n_translations.sql`

```sql
create table if not exists content_translations (
  id bigserial primary key,
  entity_table text not null,
  entity_id text not null,
  field text not null,
  locale text not null,
  value text not null,
  is_machine boolean not null default true,
  source text,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  constraint uq_content_trans unique(entity_table, entity_id, field, locale)
);

alter table content_translations enable row level security;
create policy "ct_select_any" on content_translations for select using (true);
create policy "ct_admin_ins"  on content_translations for insert with check (is_admin());
create policy "ct_admin_upd"  on content_translations for update using (is_admin()) with check (is_admin());
```

---

## `/sql/M014_processed_events.sql`

```sql
-- Idempotent consumer table for webhooks (Stripe/Square/etc.)
create table if not exists processed_events (
  provider text not null,
  event_id text primary key,
  processed_at timestamptz not null default now()
);

alter table processed_events enable row level security;
-- Administrators only (service role/edge functions)
create policy "pe_admin_all" on processed_events for all using (is_admin()) with check (is_admin());
```

---

## `/sql/M015_auth_profiles.sql`

```sql
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name  text not null,
  gender text not null check (gender in ('male','female','other')),
  marital_status text not null check (marital_status in ('single','married','divorced','widowed','on_relation','its_complicated')),
  email text not null,
  whatsapp_e164 text not null,
  country_iso2 text not null,
  city text,
  time_zone text not null default 'Asia/Riyadh',
  dob date not null check (dob <= (current_date - interval '18 years')),
  zodiac_sun text not null,
  language text not null check (language in ('ar','en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;
create index if not exists idx_profiles_user_id on profiles(user_id);

create policy "profiles_owner_sel" on profiles for select using (auth.uid() = user_id or is_staff());
create policy "profiles_owner_upd" on profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profiles_admin_all" on profiles for all    using (is_admin()) with check (is_admin());
```

---

## `/sql/M016_auth_verifications.sql`

```sql
-- verification channels (idempotent)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'verify_channel') then
    create type verify_channel as enum ('email','whatsapp','sms');
  end if;
end $$;

create table if not exists verification_attempts (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  identifier text not null, -- email or phone
  channel verify_channel not null,
  failed_count int not null default 0,
  locked_until timestamptz,
  last_attempt_at timestamptz,
  created_at timestamptz default now(),
  constraint uq_verif unique(user_id, identifier, channel)
);

alter table verification_attempts enable row level security;
create policy "verif_owner_all" on verification_attempts for all using (auth.uid() = user_id or is_admin()) with check (auth.uid() = user_id or is_admin());
```

---

## `/sql/M017_auth_mfa.sql`

```sql
-- mfa types (idempotent)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'mfa_type') then
    create type mfa_type as enum ('totp','webauthn');
  end if;
end $$;

create table if not exists mfa_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type mfa_type not null,
  secret jsonb not null,
  active boolean not null default true,
  created_at timestamptz default now(),
  last_used_at timestamptz
);

alter table mfa_enrollments enable row level security;
create policy "mfa_owner_ro" on mfa_enrollments for select using (auth.uid() = user_id or is_admin());
create policy "mfa_owner_cud" on mfa_enrollments for all    using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

---

## `/sql/M018_daily_zodiac.sql`

```sql
-- enums (idempotent)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'lang_enum') then
    create type lang_enum as enum ('ar','en');
  end if;
  if not exists (select 1 from pg_type where typname = 'zodiac_sign') then
    create type zodiac_sign as enum ('aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces');
  end if;
end $$;

create or replace function ksa_today() returns date language sql stable as $$
  select (timezone('Asia/Riyadh', now()))::date;
$$;

create table if not exists daily_zodiac (
  id bigserial primary key,
  date_key date not null,
  lang lang_enum not null,
  sign zodiac_sign not null,
  title text not null,
  teaser text,
  body text not null,
  audio_path text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique(date_key, lang, sign)
);

alter table daily_zodiac enable row level security;
create index if not exists idx_daily_zodiac_key on daily_zodiac(date_key, lang, sign);

-- RLS: client sees own sign for today (KSA), staff see last 60 days
create policy "dz_client_today_own_sign" on daily_zodiac for select using (
  app_role() = 'client' and archived = false and date_key = ksa_today() and sign = (
    select p.zodiac_sun::zodiac_sign from profiles p where p.user_id = auth.uid()
  )
);

create policy "dz_staff_last_60d" on daily_zodiac for select using (
  is_staff() and date_key >= (ksa_today() - 60)
);

create policy "dz_admin_ins" on daily_zodiac for insert with check (is_admin());
create policy "dz_admin_upd" on daily_zodiac for update using (is_admin()) with check (is_admin());
```

---

## `/sql/M019_common_policies.sql`

```sql
-- Placeholder for future shared helpers/policies
-- (app_role(), is_admin(), etc. already created earlier idempotently)
```

---

# Edge Functions — Skeletons (Deno)

> All endpoints must be idempotent where applicable. Verify webhook signatures on **raw** bodies. Keep code maintainable & short.

## `/functions/webhooks/stripe/index.ts`

```ts
// Raw-body Stripe webhook with signature verification (constructEvent)
import Stripe from 'https://esm.sh/stripe@16?target=deno';

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });

export default async (req: Request): Promise<Response> => {
  const sig = req.headers.get('stripe-signature') ?? '';
  const rawBody = await req.text(); // do NOT JSON.parse before verification
  try {
    const event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    // Idempotent consume
    // INSERT INTO processed_events(provider,event_id) VALUES ('stripe', event.id) ON CONFLICT DO NOTHING;
    // TODO: handle payment_intent.succeeded / .processing / .payment_failed, etc.
    return new Response('ok');
  } catch {
    return new Response('signature verification failed', { status: 400 });
  }
};
```

## `/functions/webhooks/square/index.ts`

```ts
// HMAC-SHA256 over notification URL + raw body, compare to x-square-hmacsha256-signature
const SIGNATURE_KEY = Deno.env.get('SQUARE_WEBHOOK_SIGNATURE_KEY')!;

async function hmacBase64(key: string, data: string) {
  const cryptoKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export default async (req: Request): Promise<Response> => {
  const given = req.headers.get('x-square-hmacsha256-signature') ?? '';
  const raw = await req.text();
  // NOTE: Make sure this URL matches Square's configured notification URL EXACTLY (scheme/host/path/query)
  const url = new URL(req.url).toString();
  const computed = await hmacBase64(SIGNATURE_KEY, url + raw);
  if (computed !== given) return new Response('unauthorized', { status: 401 });
  // Idempotent consume: INSERT ... ON CONFLICT DO NOTHING
  // Handle payment.updated transitions → unified ledger
  return new Response('ok');
};
```

## `/functions/zodiac/audio-url/index.ts`

```ts
// Returns signed URL for today's audio (KSA day boundary). If missing, generate on-demand.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

function secondsUntilNextKsaMidnight(): number {
  const now = new Date();
  const ksaNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
  const midnight = new Date(ksaNow); midnight.setHours(24, 0, 0, 0);
  return Math.max(1, Math.ceil((midnight.getTime() - ksaNow.getTime()) / 1000));
}

export default async (req: Request): Promise<Response> => {
  const { sign, lang } = await req.json();
  // Query today's row (KSA)
  const { data, error } = await supabase
    .from('daily_zodiac')
    .select('audio_path')
    .eq('date_key', new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' }))
    .eq('sign', sign)
    .eq('lang', lang)
    .single();
  if (error) return new Response('not found', { status: 404 });

  let path = (data as any).audio_path as string | null;
  if (!path) {
    // TODO: generate audio on-demand (TTS), upload to private bucket `zodiac-audio`, update row
    return new Response('audio missing (generation not implemented)', { status: 501 });
  }

  const expiresIn = secondsUntilNextKsaMidnight();
  // TODO: create signed URL via Storage: e.g., supabase.storage.from('zodiac-audio').createSignedUrl(path, expiresIn)
  return new Response(JSON.stringify({ url: path, expiresIn }), { headers: { 'content-type': 'application/json' } });
};
```

## `/functions/i18n/translate/index.ts`

```ts
// Upsert machine translations via PostgREST with Prefer: resolution=merge-duplicates
// Keep code short; secrets via backend/Vault only (not in FE/n8n)
export default async (req: Request): Promise<Response> => {
  // TODO: call Google Translation v3 (server-side), then POST to /rest/v1/content_translations
  // with headers: Authorization: Bearer <SERVICE_ROLE_KEY>, Prefer: resolution=merge-duplicates
  return new Response('not implemented', { status: 501 });
};
```

## `/functions/i18n/override/index.ts`

```ts
// Admin override: flips is_machine=false and updates value
export default async (req: Request): Promise<Response> => {
  // TODO: validate admin role via JWT, then PATCH content_translations row
  return new Response('not implemented', { status: 501 });
};
```

---

## Notes
- Webhooks must consume events **idempotently** using `processed_events` (M014).
- `content_translations` upserts should use PostgREST header `Prefer: resolution=merge-duplicates`.
- `ksa_today()` defines the global boundary as **Asia/Riyadh** (KSA) for the daily zodiac.
- Keep code maintainable & short. Do not create files not listed in the context without approval.

