# SAMIA‑TAROT — Context Engineering Protocol
**Version**: v3 (Post‑M16.1 onward)  
**Audience**: Coding agents (Claude/ChatGPT‑compatible) & infra operators  
**Prime Rule**: **Do NOT touch or change the global theme/UX**. Only backend/DB/services. Keep code **maintainable & short**.

---

## 0) Checkpoint (baseline after M16.1)
System is restored to **post‑M16.1** completion state:

- ✅ `009_privacy.sql` created & applied
- ✅ Account deletion endpoints with PII redaction
- ✅ Data export endpoints with ZIP generation
- ✅ Policy serving endpoints for `privacy.md`, `terms.md`, `refund.md`
- ✅ Privacy tables verified: `deletion_requests`, `export_jobs`
- ✅ Ready for next modules

> **Theme Guard**: No CSS/layout/animation changes. Expose only minimal hooks the current UI needs.

---

## 1) Decisions Locked (from clarifications)
- **Auth + RLS**: End‑to‑end coupling. Enforce row‑level policies at Postgres and mirror them in route guards.  
- **Payments routing (auto‑matrix)**:  
  - **Default**: `Stripe` for **EU / UAE / Israel**, `Square` for **other countries**.  
  - **Auto‑fallback**: if provider `P` fails **2 consecutive attempts** for the same order, auto‑switch to `Q`; if `Q` also fails twice, switch back to `P` and continue alternating until success or user selects **manual transfer**.  
  - **Manual & crypto**: support **international/local transfers** and **USDT** (plus in‑app wallet). Manual transfers require **proof upload** + admin approval.
- **Phone verification**: **Twilio Verify** (+ **Twilio Lookup** for E.164 normalization / validation).  
- **Calls & recording**: use **Twilio Programmable Voice**; start/pause/stop recording via API; siren/escalation handled at app layer; all events audited.  
- **TikTok ingestion** (daily horoscopes): **Compliance‑first**. Prefer **original audio upload** via Admin; optionally link **official TikTok post**. If API integration is used, rely on official TikTok developer/business endpoints. Publishing gated by **Monitor approval**.  
- **Admin i18n**: Full **AR/EN** including **auto‑translate of admin‑entered fields** on toggle (no theme change).  
- **Storage & media**: audio delivered via **Supabase signed URLs**; private buckets with RLS‑consistent access. Default formats: **m4a/mp3**. **Retention**: “permanent until Admin deletes”.

---

## 2) Roadmap (Post‑M16.1)
1. **M16.2 — RLS & Route Guards** (enable RLS; authoring policies; parity guards).  
2. **M17 — Orders Workflow** (assign → produce → approve → deliver).  
3. **M18 — TikTok Ingestion** (official endpoints or original uploads + monitor gate).  
4. **M19 — Calls & Emergency** (sessions, siren, monitor drop, escalation).  
5. **M20 — Payments Matrix** (Stripe/Square + manual/USDT + wallet + fallback).  
6. **M21 — Moderation & Audit** (block/unblock, lineage, sweeps).  
7. **M22 — Notifications & Campaigns** (scheduler, targeting, proofs, stats).  
8. **M23 — Analytics & KPIs** (dashboards per role; QoS & finance).  
9. **M24 — Community (optional, gated)**.  
10. **M25 — Personalization (internal‑AI only)**.  
11. **M26 — AR experiments**.  
12. **M27 — i18n deepening**.  
13. **M28 — Secrets/Providers ops**.  
14. **M29 — SRE & Cost guards**.

---

## 3) Database DDL (delta after M16.1)
> Apply idempotently via psycopg2 runner. Enable RLS **after seeding**.

```sql
-- 010_core_delta.sql

-- Payments routing rules (country → default provider)
create table if not exists payment_provider_rules (
  id bigserial primary key,
  country_code text not null,          -- ISO-3166 alpha-2
  provider text not null check (provider in ('stripe','square','manual','usdt')),
  created_at timestamptz default now(),
  unique (country_code)
);

-- Payment attempts per order to drive auto-fallback
create table if not exists payment_attempts (
  id bigserial primary key,
  order_id bigint not null references orders(id),
  provider text not null check (provider in ('stripe','square','manual','usdt')),
  status text not null check (status in ('init','failed','succeeded','aborted')) default 'init',
  attempt_no int not null,
  error_code text,
  idempotency_key text,                -- for Stripe/Square safety
  created_at timestamptz default now()
);

-- Wallet (optional but wired in)
create table if not exists wallets (
  id bigserial primary key,
  user_id uuid not null references profiles(id),
  balance_cents bigint not null default 0,
  currency text not null default 'USD',
  updated_at timestamptz default now(),
  unique (user_id)
);

create table if not exists wallet_ledger (
  id bigserial primary key,
  wallet_id bigint not null references wallets(id),
  delta_cents bigint not null,
  reason text not null,                -- 'topup','order_charge','refund','promo'
  provider text,                       -- 'stripe','square','manual','usdt','system'
  ref text,                            -- provider reference / proof URL
  created_at timestamptz default now()
);

-- TikTok lineage for horoscopes (compliance)
alter table if exists horoscopes
  add column if not exists source_kind text check (source_kind in ('original_upload','tiktok_api','tiktok_linked')) default 'original_upload',
  add column if not exists source_ref text;     -- URL / API id / proof
```

---

## 4) RLS Policies (M16.2) — SQL Sketch
> Deliver as `010_rls.sql` (idempotent). Mirror in route guards.

- **profiles**:  
  - user: `select/update` self only.  
  - admin/superadmin: `select` all.  
  - delete: **superadmin only**.
- **orders**:  
  - client: `select/insert/update` own orders; no viewing others.  
  - reader: `select/update` orders where `assigned_reader = auth.uid()`.  
  - monitor/admin/superadmin: full access.
- **media_assets**:  
  - owner: `select`.  
  - reader: `select` if asset referenced by assigned order.  
  - admin/monitor: full.
- **horoscopes**:  
  - public: `select` only when `approved_at is not null`.  
  - create/update: monitor/admin/superadmin.
- **calls**:  
  - client/reader on same order + monitor/admin: `select`.  
- **moderation_actions, audit_log, payment_attempts, wallets, wallet_ledger**: monitor/admin/superadmin only (wallet owner can `select` own wallet/ledger).

---

## 5) REST API Surface (v1) — Post‑M16.1
> Prefix `/api`. JWT unless noted.

**Auth & Profile**  
- `POST /auth/register` (public), `POST /auth/login` (public)  
- `GET/PUT /me`  
- `POST /me/phone/send-otp` → Twilio Verify  
- `POST /me/phone/verify`

**Policies & Privacy**  
- `GET /policies/:name` (public)  
- `POST /privacy/export`  
- `POST /privacy/delete`

**Content & Services**  
- `GET /services` (public)  
- `GET /horoscopes?scope=daily&zodiac=…&date=YYYY-MM-DD` (public, approved only)  
- `GET /card-of-the-day` (public)

**Orders & Media**  
- `POST /orders` (question/input media)  
- `GET /orders` (mine / admin filter)  
- `GET /orders/:id`  
- `POST /orders/:id/assign` (admin)  
- `POST /orders/:id/output` (reader) → status `awaiting_approval`  
- `POST /orders/:id/approve|reject` (monitor)  
- `POST /orders/:id/deliver` (system)  
- `POST /media/upload` → signed upload URL → register `media_assets`

**Calls**  
- `POST /calls/schedule` → create `direct_call` order + time  
- `POST /calls/:orderId/start|stop` (system)  
- `POST /calls/:orderId/drop` (monitor)

**Payments (auto‑matrix + fallback)**  
- `POST /pay/checkout`  
  - picks provider by `country_code` (rules table) or default matrix;  
  - records `payment_attempts` with **idempotency_key**;  
  - returns provider client secret / checkout URL.  
- `POST /pay/webhook/stripe` & `POST /pay/webhook/square` (verify signatures; settle orders; upsert wallet ledger).  
- `POST /pay/manual` (proof upload → admin review)  
- `POST /wallet/topup` (provider or manual)  
- `GET /wallet` & `GET /wallet/ledger`

**Admin/Monitor**  
- `GET /admin/stats`  
- `GET /admin/users` + `PUT /admin/users/:id` (edit roles/flags; no delete)  
- `POST /admin/notify` (broadcast)  
- `GET /monitor/review` (orders awaiting approval + pending horoscopes)  
- `POST /monitor/horoscope/:id/approve|reject`

---

## 6) Payments Auto‑Routing — Algorithm
> Implement in service layer. Keep code short and side‑effect free.

**Inputs**: `order_id`, `user.country_code`, service price.  
**Steps**:  
1. Resolve default provider: `payment_provider_rules.country_code` → `provider`; else matrix default (EU/UAE/IL → Stripe, other → Square).  
2. Generate `idempotency_key = hash(order_id + attempt_no + provider)`.  
3. Create `payment_attempts` row with `status='init'`.  
4. Create provider intent/checkout (Stripe PaymentIntent / Square Payment) and return client params.  
5. On provider callback/webhook:  
   - Verify signature; enforce idempotency; mark attempt `succeeded` or `failed(error_code)`.  
   - If **failed** and same provider has **2 consecutive fails for this order**, enqueue **fallback** (switch provider) and return fresh client params; persist audit.  
   - If **succeeded**, settle order, issue wallet top‑ups/refunds as needed.  
6. Manual transfer path: accept proof, lock order to `awaiting_admin_review` until approved.

**Notes**:  
- Always set idempotency keys for POST requests to providers.  
- Store provider refs only (no PAN/PII).  
- Expose retry-safe UI states; do **not** duplicate charges.

---

## 7) Phone Verification — Flow
1. `send-otp`: normalize with **Twilio Lookup** (E.164). Persist attempt count; rate‑limit.  
2. `verify`: Twilio Verify check; on success set `phone_verified=true`.  
3. Lockout strategy: after N failed verifications, require cooldown.  
4. Audit all status transitions (without logging OTP codes).

---

## 8) TikTok Ingestion — Compliance Path
- Preferred: **Original audio** uploaded by Samia/team via Admin (becomes `media_assets`), with optional TikTok link (`source_kind='tiktok_linked'`).  
- API option: integrate only **official TikTok developer/business APIs** to fetch metadata; do **not** scrape or strip watermarks; store `source_ref` (post URL / API id).  
- Create `horoscopes` rows in **pending**; **Monitor** must approve before they are publicly selectable.  
- Client UI plays **audio only** (no AI text surfaced to clients).

---

## 9) Calls & Emergency — Lifecycle
- Create **direct_call** order (scheduled or immediate).  
- On start: open Twilio call session; **record** by default; allow **pause/resume/stop** when PII is discussed.  
- **Siren**: app‑level override (local audio/visual) until answered or escalated.  
- **Drop**: Monitor can force‑end; reasons logged in `calls` + `moderation_actions`.  
- **Retention**: recordings/media kept permanently until Admin deletion.

---

## 10) Notifications (M22)
- Push scheduler: daily zodiac, order status changes, promos.  
- Targeting by role/country/engagement.  
- Multi‑language payloads; proof‑of‑send; stats.

---

## 11) Analytics & KPIs (M23)
- **Fulfillment**: time‑to‑first‑response, time‑to‑delivery, approval/ rejection rates.  
- **Payments**: auth/success rates by provider & country; fallback rate; refund rate.  
- **Calls QoS**: answer rate, drop rate (by reason), avg duration.  
- **Engagement**: DAU/WAU/MAU, retention cohorts, notification CTR.  
- **Content**: horoscope approval latency; listen‑through rate.

---

## 12) Observability & Logging
- Never log PII/OTP/card data. Log only IDs, hashed refs, provider status codes.  
- Standard fields: `req_id`, `actor_id`, `role`, `route`, `entity`, `entity_id`, `event`, `result`, `latency_ms`.  
- Sensitive actions → `audit_log` (+ `moderation_actions` where applicable).

---

## 13) Acceptance Checklists (each module)
- DDL idempotent re‑runs cleanly.  
- RLS enabled + policies enforced; route guards mirror policies.  
- Endpoints callable from current UI (no theme edits).  
- Payments: idempotency + verified webhooks + fallback under test.  
- Privacy: export ZIP + delete w/ PII redaction.  
- Audit entries for every sensitive action.  
- Monitor powers: approve/reject/dro p/block; unblock is admin‑gated.  
- Storage: signed URLs only; RLS‑consistent access.

---

## 14) Coding‑Agent Prompts (use verbatim; keep code short)

> **Global reminder**: *Never change the global theme/UX.* Build backend/DB only. Keep code **maintainable & short**.

**Prompt — M16.2 (RLS & Guards)**  
“Before doing anything, first read and strictly comply with: C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md. Do not proceed unless alignment is confirmed. Implement RLS for `profiles`, `orders`, `media_assets`, `horoscopes`, `calls`, `moderation_actions`, `audit_log`, `payment_attempts`, `wallets`, and `wallet_ledger` as per section 4. Ship idempotent `010_rls.sql` and minimal route‑level guards + tests. Don’t touch the theme or UI.”

**Prompt — M17 (Orders Workflow)**  
“Before doing anything, first read and strictly comply with: C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md. Do not proceed unless alignment is confirmed. Wire endpoints in section 5 for Orders & Media, including assign/produce/approve/reject/deliver. Ensure audit writes and RLS parity. Keep code short and maintainable. No theme edits.”

**Prompt — M18 (TikTok Ingestion)**  
“Before doing anything, first read and strictly comply with: C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md. Do not proceed unless alignment is confirmed. Add ingestion job: accept original audio uploads (preferred) + optional TikTok linking; or integrate official TikTok APIs for metadata only. Register `media_assets`, create pending `horoscopes`, expose monitor approval endpoints. Keep code concise. No UI changes.”

**Prompt — M19 (Calls & Emergency)**  
“Before doing anything, first read and strictly comply with: C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md. Do not proceed unless alignment is confirmed. Implement Twilio‑based call lifecycle: start/stop/pause/resume recording via API; siren hooks; monitor drop; escalation & logging. Permanent retention; admin delete only. Code short, maintainable. No theme edits.”

**Prompt — M20 (Payments Matrix + Fallback)**  
“Before doing anything, first read and strictly comply with: C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md. Do not proceed unless alignment is confirmed. Implement auto‑routing by country (Stripe for EU/UAE/IL, Square for others) with 2‑fail fallback switching, manual/USDT options, wallet ledger, verified webhooks, idempotency. Keep code minimal; don’t change the theme.”
