# SAMIA TAROT — Backend & Core (Consolidated Master)

*Version: 2025‑09‑28*

> Scope: The definitive backend/infrastructure context for SAMIA TAROT. Includes data model references, payments, wallet & rewards, auth & security, i18n, n8n orchestration, Edge Functions contracts, recording & realtime, daily zodiac service, push, observability, CSP, environment & secrets, and runbook/policies. **This file governs all non‑frontend work.**

---

## 0) Guiding Principles

- **Security first**: Supabase **RLS** is mandatory on every table exposed to the client; service‑role is server‑only.
- **Idempotency everywhere** on mutating POSTs; webhooks are **source of truth** for financial state transitions.
- **Always‑USD** billing; local currency display is informational only (FX timestamped).
- **Short & maintainable** code; small, focused modules; no files outside the structure below without prior approval.

---

## 1) Monorepo & Folders (non‑FE portions)

```
/ (repo root)
  /sql                 # migrations (M011..M0xx), no seed/mock data
  /functions           # Supabase Edge Functions (Deno)
  /md                  # runbooks, policies, ops docs (non‑code)
  /packages
    /backend           # server code (API routes, adapters, providers)
    /realtime          # SFU/livekit adapters, signaling helpers (no secrets in FE)
    /payments          # orchestration, providers, webhooks consumers (idempotent)
    /i18n               # translators, hash, upserts
    /shared            # contracts, types, schemas, utils
```

> The **/apps** (frontend) folders are defined in the separate Frontend master file.

---

## 2) Data Model (reference to SQL PR)

**SQL migrations live under **``** and must be applied in order.**

- **M011\_wallet\_payouts.sql**: `payout_accounts`, `cashout_requests` (+RLS) — non‑client cashouts.
- **M012\_rewards.sql**: `reward_balances`, `reward_events` (+RLS).
- **M013\_i18n\_translations.sql**: `content_translations` (+RLS).
- **M015\_auth\_profiles.sql**: `profiles` (+RLS) — signup mandatory fields, `zodiac_sun`, `time_zone` (default `Asia/Riyadh`).
- **M016\_auth\_verifications.sql**: email/WhatsApp verification tables (+RLS).
- **M017\_auth\_mfa.sql**: TOTP/WebAuthn enrollments (+RLS).
- **M018\_daily\_zodiac.sql**: daily text/audio pointers (+RLS) — **KSA day boundary**.
- **M019\_rls\_policies.sql**: common indexes/policies.

**Indexes** (examples): `profiles(user_id)`, `daily_zodiac(date_key,lang,sign)`, cashout composite indices.

---

## 3) Payments Orchestration (Cards, USDT, Offline)

- **Cards**: Stripe **Payment Intents** primary (SCA/3DS auto). **Auto‑switch to Square** after **two consecutive failures** in the same checkout session. Unified states via webhooks.
- **USDT**: single network **TRC20 via Bybit** ops wallet. Confirmations: **2** (standard), **6** (high‑value). Admin can rotate.
- **Manual remittances**: Western Union / OMT / Whish / BOB Finance → proof upload → OCR → Admin review.
- **Idempotency**: All POSTs include `Idempotency-Key`. **Webhooks** are authoritative: Stripe `payment_intent.*`; Square `payment.updated`. Both consumers are **idempotent** and **replay‑safe**.
- **Refund policy (scheduled calls)**: refundable if **≥2h** before appointment; else admin review.

**Webhook verification**

- Stripe: verify signature on **raw body** via `constructEvent()`; reject on mismatch.
- Square: compute **HMAC‑SHA256** over **notification URL + raw body** and compare to `x-square-hmacsha256-signature`.

---

## 4) Wallet & Cashouts

- **Client wallet = store credit only** (no cashout). Recognize revenue on delivery; liability until consumed.
- **Eligible for cashout**: Readers (50% share credited post‑delivery), Staff (salary credits by Super‑Admin).
- **Flow**: `pending_review_admin → pending_execution_superadmin → settled/rejected`. Settlement triggers ledger move in a single transaction.

## 5) Rewards

- Points are **not cash**; require **rating/comment gate** (rating=50%, comment=50%, both=100%).
- Redeem at checkout (contra‑revenue). Expiry configurable; reversal on refund/cancel.

---

## 6) Auth & Security

- **Signup mandatory**: first/last name, gender, marital status, email, WhatsApp (E.164), country, time zone/city, DOB, language.
- **Dual verification**: Email (link/OTP) + WhatsApp OTP (fallback **SMS** if WA fails). Rate limits & lockout: **5 tries/10m, lock 15m**.
- **Age Gate**: ≥18 (all countries).
- **MFA**: Staff **required** (TOTP/WebAuthn; enforce ≥1 factor). Clients optional.
- **Passkeys**: supported across apps.
- Cookies: `Secure`/`HttpOnly`/`SameSite`; device & session hygiene.

---

## 7) i18n (System Fields Translation)

- Source content in domain tables; machine translations via **n8n → Google Translation v3**.
- Storage: `content_translations(entity_table, entity_id, field, locale, value, is_machine, source, updated_by, updated_at)`.
- Upsert via PostgREST with `Prefer: resolution=merge-duplicates`.
- Admin overrides flip `is_machine=false`.
- Reads accept `?locale=`; fallback to source locale.

---

## 8) n8n Orchestration & Ops (Queue Mode)

- **Topology**: Main + **Redis** + **1..N Workers**; **GENERIC\_TIMEZONE=Asia/Beirut**.
- **Triggers**: **Supabase Database Webhooks** (post‑commit) → n8n webhook; **Scheduled** jobs for content (e.g., daily zodiac), OCR, notifications.
- **Security**: credentials encrypted with `N8N_ENCRYPTION_KEY`; prefer backend‑mediated vendor calls; secrets live in **Supabase Vault**.
- **DR/Backup**: back up n8n DB + encryption key; monthly restore test.
- **Alerts**: failures → Ops channel (Telegram bot, no sensitive payloads); include `$execution.resumeUrl` for approvals.

---

## 9) Edge Functions — Contracts (Deno)

**auth**: `/auth/signup`, `/auth/verify-email`, `/auth/verify-wa`, `/auth/mfa/enroll`.

**i18n**: `/i18n/translate` (service/automation), `/i18n/override` (admin).

**webrtc**: `/webrtc/token`, `/webrtc/egress/start`, `/webrtc/egress/stop`.

**payments**: `/payments/checkout`, `/payments/usdt/address`, `/payments/manual/submit`, webhooks `/webhooks/stripe`, `/webhooks/square` (public, signed + idempotent).

**wallet**: `/wallet/cashout`, `/wallet/cashout/approve`, `/wallet/cashout/settle`.

**zodiac**: `/zodiac/today`, `/zodiac/audio-url` (signed URL TTL to KSA midnight; on‑demand audio generation if missing).

**push**: `/push/register`.

**admin**: `/admin/ai/execute`, `/admin/rate-limits`.

Cross‑cutting: request IDs, Sentry + OTEL spans, CSP allowlists, strict input schemas.

---

## 10) Realtime & Recording

- LiveKit Cloud with region pinning. **Egress (Composite / RoomComposite)** for server‑side unified recordings. Upload to Storage with metadata.

---

## 11) Daily Zodiac Service (KSA boundary)

- **Day definition**: **Asia/Riyadh** for everyone.
- **Client access**: **own sign only**, `archived=false` for today; staff see last **60 days**.
- **Generation**: daily snapshots (AR/EN), audio assets (MP3/OGG) into private bucket `zodiac-audio/YYYY/MM/DD/{lang}/{sign}.mp3`.
- **Signed URLs**: TTL until **next KSA midnight**. If audio missing → **generate on‑demand** then sign.
- **Cleanup**: purge rows/files older than **60 days**.

---

## 12) Push Notifications

- Web Push (VAPID), Android (FCM), iOS (APNs). Topic routing by role/app; quiet hours per locale.

---

## 13) Observability & Security Headers

- **Sentry + OpenTelemetry** (logs/traces). 30–90d retention; PII scrubbing.
- **CSP**: Cloudflare + strict allowlists; no `unsafe-inline`; narrow `connect-src` and `media-src` as needed.

---

## 14) Environment & Secrets

- `.env.example` in root for **local placeholders** only.
- **Supabase Vault** is the source of truth for provider keys (Stripe, Square, Bybit, LiveKit, Postmark, Twilio Verify, APNs, etc.). Never expose service keys to browsers or n8n when avoidable.

---

## 15) Non‑Code Docs (under `/md`)

- `WALLET_POLICY.md`, `PAYOUT_CHANNELS.md`, `REWARDS_POLICY.md`, `N8N_OPERATIONS.md`, `N8N_SECURITY.md`, `CONTENT_TRANSLATION.md`, `DAILY_ZODIAC.md`, `PAYMENTS_ORCHESTRATION.md`, `AUTH_POLICY.md`, `PUSH_NOTIFICATIONS.md`, `OBSERVABILITY.md`, `SECURITY_HEADERS_CSP.md`.

---

## 16) Prompts (Backend)

> **Always add:** “Keep code maintainable & short. Do not create files not listed in the context without approval.”

- **P‑PAY‑01** — *Stripe/Square Webhooks* "Implement Stripe (`/webhooks/stripe`) with raw‑body signature verification via `constructEvent()` and an idempotent consumer table; implement Square (`/webhooks/square`) with HMAC‑SHA256 over notification URL + raw body and idempotent consumption. Keep code maintainable & short."

- **P‑ZOD‑URL‑01** — *Signed URL TTL* "Expose `/zodiac/audio-url` that returns a signed URL with `expiresIn = secondsUntilNextKsaMidnight()`; if audio is missing, generate on‑demand, upload, then sign. Keep code maintainable & short."

- **P‑I18N‑01** — *Translate on publish & save* "Build `/i18n/translate` to upsert machine translations via PostgREST with `Prefer: resolution=merge-duplicates`; hash source to dedupe; `/i18n/override` flips `is_machine=false`. Keep code maintainable & short."

- **P‑AUTH‑01** — *Dual Verification & MFA* "Signup requires email and WhatsApp verification (fallback SMS), lockout 15m after 5 attempts/10m; MFA required for staff (TOTP/WebAuthn); Age≥18 enforced. Keep code maintainable & short."



---

# 🔧 Patch Update — Close Blockers (UPSERT + On‑Demand Audio)

> This section amends the earlier skeletons by **implementing**: (1) idempotent UPSERT into `processed_events` inside Stripe/Square webhooks, and (2) on‑demand audio generation + signed URL from Supabase Storage for the daily zodiac endpoint. Keep code short & maintainable.

## SQL — `processed_events` (composite PK)

```sql
-- Ensure composite primary key to avoid cross‑provider ID collisions
create table if not exists processed_events (
  provider text not null,
  event_id text not null,
  processed_at timestamptz not null default now(),
  primary key (provider, event_id)
);

alter table processed_events enable row level security;
create policy "pe_admin_all" on processed_events for all using (is_admin()) with check (is_admin());
```

## Edge — `/functions/webhooks/stripe/index.ts`

```ts
// Verify signature on RAW body + idempotent insert into processed_events
import Stripe from 'https://esm.sh/stripe@16?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

export default async (req: Request): Promise<Response> => {
  const sig = req.headers.get('stripe-signature') ?? '';
  const rawBody = await req.text();
  try {
    const event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);

    // Idempotent consume (provider,event_id PK) — ignore duplicates gracefully
    const { error: peErr } = await supabase
      .from('processed_events')
      .insert({ provider: 'stripe', event_id: event.id });
    if (peErr && !peErr.message?.includes('duplicate key')) {
      return new Response('db error', { status: 500 });
    }
    if (peErr) return new Response('ok'); // already processed

    switch (event.type) {
      case 'payment_intent.succeeded':
      case 'payment_intent.processing':
      case 'payment_intent.payment_failed':
        // TODO: update unified ledger from event.data.object (PI)
        break;
      default:
        break;
    }
    return new Response('ok');
  } catch {
    return new Response('signature verification failed', { status: 400 });
  }
};
```

## Edge — `/functions/webhooks/square/index.ts`

```ts
// HMAC-SHA256 over URL+raw body, compare to header; idempotent insert into processed_events
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SIGNATURE_KEY = Deno.env.get('SQUARE_WEBHOOK_SIGNATURE_KEY')!;
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

async function hmacBase64(key: string, data: string) {
  const cryptoKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export default async (req: Request): Promise<Response> => {
  const given = req.headers.get('x-square-hmacsha256-signature') ?? '';
  const raw = await req.text();
  const url = new URL(req.url).toString(); // must match exactly the configured URL in Square
  const computed = await hmacBase64(SIGNATURE_KEY, url + raw);
  if (computed !== given) return new Response('unauthorized', { status: 401 });

  // Extract an event id from payload for idempotency
  let evtId = '';
  try {
    const payload = JSON.parse(raw);
    evtId = payload?.event_id || payload?.id || '';
  } catch {}
  if (!evtId) evtId = crypto.randomUUID();

  const { error: peErr } = await supabase
    .from('processed_events')
    .insert({ provider: 'square', event_id: evtId });
  if (peErr && !peErr.message?.includes('duplicate key')) {
    return new Response('db error', { status: 500 });
  }
  if (peErr) return new Response('ok'); // duplicate

  // TODO: map payment.updated → unified ledger transitions
  return new Response('ok');
};
```

## Edge — `/functions/zodiac/audio-url/index.ts`

```ts
// Signed URL until KSA midnight; if audio missing → generate on-demand, upload, then sign
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const BUCKET = 'zodiac-audio';

function secondsUntilNextKsaMidnight(): number {
  const now = new Date();
  const ksaNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
  const midnight = new Date(ksaNow); midnight.setHours(24, 0, 0, 0);
  return Math.max(1, Math.ceil((midnight.getTime() - ksaNow.getTime()) / 1000));
}
function ksaDate(): string {
  const ksaNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
  const y = ksaNow.getFullYear(); const m = String(ksaNow.getMonth()+1).padStart(2,'0'); const d = String(ksaNow.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function pathFor(sign: string, lang: 'ar'|'en') {
  const today = ksaDate();
  return `${today.replaceAll('-', '/')}/${lang}/${sign}.mp3`; // YYYY/MM/DD/lang/sign.mp3
}
async function generateTTS(text: string, lang: 'ar'|'en') {
  const base = Deno.env.get('PUBLIC_BASE_URL');
  if (!base) throw new Error('PUBLIC_BASE_URL missing');
  const res = await fetch(new URL('/admin/ai/execute', base), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-internal': '1' },
    body: JSON.stringify({ service: 'tts', payload: { text, voice: lang === 'ar' ? 'female_ar' : 'female_en', format: 'mp3' } })
  });
  if (!res.ok) throw new Error('tts-failed');
  const { audioBase64 } = await res.json();
  return Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
}

export default async (req: Request): Promise<Response> => {
  try {
    const { sign, lang } = await req.json();
    if (!sign || !lang) return new Response('bad request', { status: 400 });

    // Load today's row (KSA)
    const { data, error } = await supabase
      .from('daily_zodiac')
      .select('audio_path, body')
      .eq('date_key', ksaDate())
      .eq('sign', sign)
      .eq('lang', lang)
      .single();
    if (error) return new Response('not found', { status: 404 });

    let p = (data as any).audio_path as string | null;
    if (!p) {
      // Create if missing
      const bytes = await generateTTS((data as any).body as string, lang);
      p = pathFor(sign, lang);
      const up = await supabase.storage.from(BUCKET).upload(p, bytes, { contentType: 'audio/mpeg', upsert: true });
      if (up.error) return new Response('upload failed', { status: 500 });
      await supabase.from('daily_zodiac').update({ audio_path: p }).eq('date_key', ksaDate()).eq('sign', sign).eq('lang', lang);
    }

    const expiresIn = secondsUntilNextKsaMidnight();
    const { data: signed, error: sErr } = await supabase.storage.from(BUCKET).createSignedUrl(p, expiresIn);
    if (sErr) return new Response('signing failed', { status: 500 });
    return new Response(JSON.stringify({ url: signed.signedUrl, expiresIn }), { headers: { 'content-type': 'application/json' } });
  } catch {
    return new Response('error', { status: 500 });
  }
};
```

