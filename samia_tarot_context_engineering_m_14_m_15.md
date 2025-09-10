# SAMIA‑TAROT — Context Engineering (M14 Payments & M15 Notifications)

> **Agent**: Claude Code CLI  
> **Model policy**: “Opus 4.1 in plan mode, Sonnet 4 otherwise.”  
> **Prime directive**: Ship **Payments/Billing** and **Notifications** end‑to‑end while preserving the existing theme/UX.  
> **DB access (always)**: **Python + psycopg2** (pooling) to Supabase **Session Pooler** DSN:
>
> `postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres`

---

## 1) Mission & Non‑Negotiables

1. **Zero Theme Drift**: no UI/CSS edits; backend only (DB, routes, integrations).  
2. **No Mocks/Test Data**: if a provider isn’t configured → **HTTP 503**.  
3. **Psycopg2‑only** for all DB I/O (connect, migrate, execute, audit).  
4. **Few files**: append logic to existing `api.py`; add minimal idempotent migrations.  
5. **Role gates**: `client, reader, monitor, admin, superadmin` enforced per endpoint.  
6. **Audit everything**: all sensitive actions logged to `audit_log` (+ moderation where relevant).  
7. **RLS stays enabled** (M8); API uses service‑role via Session Pooler.

---

## 2) Scope of This Module

- **M14 Payments & Billing**: payment intents, webhooks, invoices/receipts (PDF in Storage), refunds/disputes, VAT fields, promo codes (optional).  
- **M15 Notifications**: Email/SMS/WhatsApp notifications for lifecycle events (verify, order create, status changes, delivery, call reminders); daily/weekly digests (optional).

> **Out of scope**: UI redesign, new dashboards, or seeded/demo data.

---

## 3) Environment Variables (hard‑fail if missing)

### Payments (provider‑agnostic)
```
PAY_PROVIDER=stripe|checkout|tap|other     # choose actual value
PAY_API_KEY=__SET_ME__                     # secret key
PAY_WEBHOOK_SECRET=__SET_ME__              # for HMAC signature verify
PAY_CURRENCY=USD                           # default currency code
INVOICE_FROM_NAME="Samia Tarot"
INVOICE_FROM_EMAIL=billing@samiatarot.com
INVOICE_VAT_RATE=0                         # percentage (0–100), can be 0
```

### Notifications
```
SMTP_HOST=__SET_ME__       SMTP_PORT=587
SMTP_USER=__SET_ME__       SMTP_PASS=__SET_ME__
SMTP_FROM=Samia Tarot <no-reply@samiatarot.com>

TWILIO_ACCOUNT_SID=__SET_ME__
TWILIO_AUTH_TOKEN=__SET_ME__
TWILIO_WHATSAPP_FROM=whatsapp:+1XXXXXXXXXX  # optional
TWILIO_SMS_FROM=+1XXXXXXXXXX                # optional
```

> Missing vars ⇒ endpoints that depend on them return **503 Service Unavailable**; never simulate success.

---

## 4) Database DDL (idempotent) — New Migrations

> Create **two** migrations and register them in `migrate.py`: `007_payments.sql`, `008_notifications.sql`.

### 4.1 `007_payments.sql`
```sql
-- Payment primitives (provider-agnostic)
create table if not exists payment_intents (
  id bigserial primary key,
  order_id bigint not null references orders(id) on delete cascade,
  provider text not null,                 -- e.g. 'stripe','checkout','tap'
  provider_intent_id text unique,        -- external reference
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null,                -- ISO 4217
  status text not null check (status in ('created','requires_action','processing','succeeded','failed','canceled')),
  client_secret text,                    -- if applicable (never expose in logs)
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists invoices (
  id bigserial primary key,
  order_id bigint not null references orders(id) on delete cascade,
  payment_intent_id bigint references payment_intents(id) on delete set null,
  number text unique,                     -- e.g. SAMIA-2025-000123
  subtotal_cents bigint not null,
  vat_cents bigint not null default 0,
  total_cents bigint not null,
  currency text not null,
  pdf_media_id bigint references media_assets(id),
  billing_name text,
  billing_email text,
  billing_country text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists refunds (
  id bigserial primary key,
  order_id bigint not null references orders(id) on delete cascade,
  payment_intent_id bigint references payment_intents(id) on delete set null,
  provider_refund_id text unique,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null,
  reason text,
  status text not null check (status in ('requested','processing','succeeded','failed')),
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists promo_codes (
  id bigserial primary key,
  code text unique not null,
  percent_off int check (percent_off between 1 and 100),
  active boolean default true,
  valid_from date,
  valid_to date,
  max_redemptions int,
  redemptions int default 0
);

create table if not exists payment_events (
  id bigserial primary key,
  provider text not null,
  event_type text not null,
  payload jsonb not null,
  signature_valid boolean,
  received_at timestamptz default now()
);

create index if not exists idx_payment_intents_order on payment_intents(order_id);
create index if not exists idx_invoices_order on invoices(order_id);
create index if not exists idx_refunds_order on refunds(order_id);
```

### 4.2 `008_notifications.sql`
```sql
-- Notification templates and logs
create table if not exists notif_templates (
  id bigserial primary key,
  channel text not null check (channel in ('email','sms','whatsapp')),
  code text unique not null,             -- e.g. 'order_created','order_delivered'
  subject text,                          -- for email
  body text not null                     -- handlebars-like placeholders
);

create table if not exists notif_log (
  id bigserial primary key,
  user_id uuid references profiles(id),
  channel text not null check (channel in ('email','sms','whatsapp')),
  template_code text,
  target text not null,                  -- email or phone
  payload jsonb,
  status text not null check (status in ('queued','sent','failed')),
  provider_ref text,
  error text,
  created_at timestamptz default now()
);

-- Optional: user-level opt-outs (defaults allow)
create table if not exists notif_prefs (
  user_id uuid primary key references profiles(id) on delete cascade,
  email_enabled boolean default true,
  sms_enabled boolean default true,
  whatsapp_enabled boolean default true
);

create index if not exists idx_notif_log_user on notif_log(user_id);
```

> Keep both migrations **idempotent** and free of seed/mock data. Policies (RLS) are already in place globally (M8).

---

## 5) Endpoint Plan (append to `api.py`, single‑file approach)

### 5.1 Payments

1) **Create Intent** — `POST /api/payments/intent` (client+, verified & profile complete)  
**Body**: `{ "order_id": 123, "promo_code": "OPTIONAL" }`  
**Flow**:  
- Validate order belongs to caller and `status in ('new','assigned')`.  
- Compute `amount_cents` = base price (from `services`) − promo (if valid + active within dates + caps).  
- Call provider API to create an intent; store row in `payment_intents` with `status`.  
- **Audit**: `payment_intent_create`.  
**Return**: provider client secret/redirect params as needed.

2) **Webhook** — `POST /api/payments/webhook` (public, signature‑verified)  
**Flow**:  
- Verify HMAC signature using `PAY_WEBHOOK_SECRET`; reject **400** if invalid.  
- Upsert `payment_events` (store raw payload, signature_valid).  
- Transition `payment_intents.status` accordingly (`succeeded`/`failed`/`canceled`).  
- On `succeeded`: generate **invoice** (see 5.1.4), set `orders.status → approved` if applicable.  
- **Audit**: `payment_webhook_event`.

3) **Refund** — `POST /api/payments/refund` (admin/superadmin)  
**Body**: `{ "order_id": 123, "amount_cents": 1000, "reason": "..." }`  
**Flow**:  
- Validate order + payment intent `succeeded`.  
- Call provider API; insert `refunds(status='processing')`, then finalize to `succeeded/failed`.  
- **Moderation**: insert `moderation_actions` with `action='approve'` or record `reject` if provider failed.  
- **Audit**: `payment_refund`.

4) **Invoice fetch** — `GET /api/payments/invoice/{id}` (client: own; admin/superadmin: any)  
**Flow**:  
- Verify access; fetch `invoices` row; return **Signed URL** for `pdf_media_id` (Supabase Storage).  
- **Audit**: `invoice_fetch`.

5) **List methods** — `GET /api/payments/methods` (public)  
- Return server‑side computed availability (based on configured provider/currency).  

> **Rate‑limits** (reuse M8): intents 10/hour, refunds 5/hour (admin), invoices 60/hour (per user).

### 5.2 Invoice Generation (backend)

- Build a minimal PDF (text‑first) at webhook success:  
  - Compute subtotal, VAT (from `INVOICE_VAT_RATE`), total; embed order ID, service, date, client name/email.  
  - Upload PDF bytes → Supabase Storage `invoices/{YYYY}/{MM}/{invoiceNumber}.pdf` → `media_assets(kind='pdf')`.  
  - Create `invoices` row with `pdf_media_id`.  
- If PDF engine is not set up → **503** and retry via ops; never fake PDFs.

### 5.3 Notifications

1) **Template upsert** — `POST /api/notif/template` (admin/superadmin)  
Body includes `channel, code, subject?, body`. Placeholders: `{{first_name}}`, `{{order_id}}`, `{{status}}`, `{{invoice_url}}`, etc.

2) **Send (programmatic)** — internal helpers + hooks on events:  
- **Events**: `verify_phone_sent`, `order_created`, `order_assigned`, `order_awaiting_approval`, `order_delivered`, `call_reminder`, `refund_succeeded`.  
- Read `notif_prefs`; check channel availability (SMTP/Twilio).  
- Insert `notif_log(status='queued'→'sent'/'failed')` with provider refs.

3) **Manual test** — `POST /api/notif/test` (admin)  
- Attempts one email and one SMS to provided targets; returns 503 if providers missing.

> **Rate‑limits**: test 5/hour, per user; auto hooks capped to 60/min global via simple counter in DB (or reuse M8 token bucket by `endpoint='notif_auto'`).

---

## 6) Security & Compliance

- **Webhook security**: verify signatures; optionally IP allowlist at Edge (M13.1).  
- **PII**: never store raw PANs or secrets; store provider IDs only.  
- **Exports**: use existing `/api/ops/export` (M11) for monthly VAT/export; invoices PDF serve via signed URLs.  
- **RLS**: client can fetch only **own** invoices; admins can fetch all.

---

## 7) UI Integration (zero theme change)

- **Checkout button/flow** calls `POST /api/payments/intent`, then redirects/handles provider.  
- On return/webhook success: show "Payment confirmed"; backend sends notifications and generates invoice.  
- **Orders**: creation is already gated by profile completeness + verification (M9).

---

## 8) Acceptance Checklist (per module)

**M14 Payments**
- [ ] Migrations `007_payments.sql` applied idempotently.  
- [ ] Create intent → provider intent created; DB rows present; audit written.  
- [ ] Webhook with valid signature flips `status → succeeded` and creates invoice PDF.  
- [ ] Refund endpoint updates provider + DB; moderation/audit entries exist.  
- [ ] Client can fetch **own** invoice via signed URL; admins any.

**M15 Notifications**
- [ ] Templates upserted; placeholders rendered correctly.  
- [ ] Lifecycle hooks emit notifications (when providers configured).  
- [ ] Rate‑limits enforced; failures logged to `notif_log` with error.  
- [ ] No notifications emitted when providers missing (503 returned).

---

## 9) Self‑Verification (no seed/mocks)

- Re‑run `python migrate.py up` → all previous migrations show **skip**, new ones apply once.  
- Call payment webhook with **invalid signature** → **400** and `payment_events.signature_valid=false`.  
- Call `/api/notif/test` without SMTP/Twilio → **503**.  
- Confirm **no UI files** touched and **no test rows** inserted except logs/events created by explicit calls.

---

## 10) Execution Guidance (Claude)

1) **Read first**:  
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md`  
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\Full Prompt.md`  
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\samia_tarot_context_engineering_m_14_m_15.md`

2) **Plan delta**: list exact SQL objects + endpoints to change.  
3) **Act**: create `007_payments.sql`, `008_notifications.sql`; extend `api.py` minimally; no other files.  
4) **Verify**: show routes, try 503/400 guards, and DB row snapshots (counts only).  
5) **Stop**: await confirmation before touching anything else.

---

### Notes
- Provider choice is abstracted; Stripe/Checkout/Tap/Gateway‑X all work so long as the 503 guardrails and webhook signature checks are implemented.  
- PDFs may be simplified (text‑first) initially; quality can be improved later without schema changes.  
- All storage remains in Supabase; delivery via **signed URLs** only (no public buckets).



---

## 11) Frontend Binding (Zero Theme Changes)

> Bind the existing dashboards to the APIs built in M3…M11 **without** altering the theme or visual structure. All calls are client→API with auth headers already established (X-User-ID), and follow existing rate‑limits and role gates.

### Superadmin/Admin
- **Archive (50 days) & Download**: `GET /api/horoscopes/archive?days=50` → list + signed download URLs.
- **Regenerate per‑zodiac**: `POST /api/horoscopes/regenerate` (body: `{zodiac, ref_date?, source, tiktok_url?, script_text?}`) → instant replace (auto‑publish daily).
- **Zodiac settings governance**: `POST /api/zodiacs/settings/propose` → `POST /api/zodiacs/settings/approve|reject` (superadmin).
- **Exports/Reports**: `POST /api/ops/export` (ZIP CSV, masked PII by default) + `GET /api/ops/snapshot`, `GET /api/ops/metrics`.

### Reader
- **Order flow**: `POST /api/orders/{id}/start` → work; `POST /api/media/upload` → get `media_id`; `POST /api/orders/{id}/result` → submit.
- **Assist (internal)**: `POST /api/assist/draft`, `POST /api/assist/search`, `GET /api/assist/drafts/{order_id}` (no client exposure).

### Monitor
- **Pending moderation**: existing order approval pipeline (M4) + any content queues (where applicable).
- **Live calls**: `POST /api/calls/initiate`, `POST /api/calls/terminate`.
- **Blocks**: `POST /api/mod/block` (monitor/admin) and **unblock** via admin‑only endpoint.

### Client
- **Order creation**: `POST /api/orders` and/or `POST /api/astro/order` (requires verified email/phone + profile completeness).  
- **Daily horoscopes**: `GET /api/horoscopes/daily?zodiac=…&country=…` (auto‑publish at local midnight).

> **Notes**: All dashboard calls inherit M8 RLS + API rate‑limits; UI only wires actions to endpoints—no UI redesign.

---

## 12) Privacy & My Account (User‑Controlled)

Implement safe, auditable self‑service controls—**no UI change required**.

### Endpoints
1) **Request account deletion (soft‑delete first)**  
   `POST /api/account/delete` (client)  
   - Effect: mark profile soft‑deleted, redact PII fields, revoke sessions; enqueue media purge (audio/pdf) via ops job.  
   - Returns a deletion ticket id for follow‑up.  
   - **Audit**: `account_delete_requested`.

2) **Data export (masked by default)**  
   `POST /api/account/export` (client) → schedules export  
   `GET /api/account/export/status` (client) → state  
   `GET /api/account/export/download` (client) → signed ZIP (limited TTL)  
   - Contents: requests/orders/calls/audit for the requester; emails/phones masked unless superadmin override.  
   - **Audit**: `account_export_requested|ready|downloaded`.

3) **Policy pages (Markdown)**  
   Serve static Markdown content consumed by theme (no style changes): Privacy, Terms, Refund Policy.

---

## 13) Edge Hardening & Deployment (Apply M13.1)

- Deploy `edge/nginx.conf` (or reverse proxy equivalent) and `edge/cloudflare-rules.json` (if CF/WAF present).  
- Enforce **strict CORS**, **Security Headers (CSP/HSTS/… )**, and protect `/api/ops/*` & `/api/cron/*` using `X-Job-Token` + optional IP allowlist.  
- TLS/HSTS enabled; body size & timeouts tuned; cache rules: `meta/*` short‑cache, others `no-store`.  
- No backend code/theme changes required.

---

## 14) Monitoring & Operations Wiring

- Hook `/api/ops/metrics` into external alerts (Email/Slack).  
- Schedule crons using existing templates (M12):  
  - **Daily purge** (keep last 50 days): `POST /api/cron/purge_old` @ 00:10 UTC.  
  - **Monthly voice refresh**: `POST /api/cron/voice/refresh` @ 01:00 UTC (1st).  
  - Include `X-Job-Token` header; rotate token every 90 days.  
- **Key rotation** every 90 days: Twilio, Supabase, DeepConf, Semantic Galaxy, JOB_TOKEN (documented in RUNBOOK).

---

## 15) Performance & Security Validation (Pre‑GA)

- **Read‑only Load Test** (no data writes): high‑QPS for `/api/horoscopes/daily` and admin archive listing; watch `avg_sql_latency_ms` and error rates.  
- **Pen Test (focused)**: Auth (M3), Orders (M4), Calls (M7), Assist (M10), Ops (M11).  
- Verify RLS policies remain enabled; API uses service role (bypass by design)—documented and understood.

---

## 16) One‑Week Execution Plan (Condensed)

1) **M14 Payments & Billing**: `create intent`, `webhook`, `refund`; store provider refs; generate invoice PDF (Storage signed delivery).  
2) **M15 Notifications**: templates + rate‑limits + optional opt‑out flags.  
3) **Frontend binding**: wire dashboards to existing APIs (no theme changes).  
4) **Privacy & Account**: implement delete (soft‑delete + purge queue) and masked export.  
5) **Edge hardening**: apply NGINX/Cloudflare rules from M13.1.  
6) **Final Ops**: enable crons, alerts wiring, keys rotation review.  
7) **Go/No‑Go**: run smoke tests, snapshot, cutover/rollback (M13 artifacts).

> **Definition of Done**: payments/refunds working with invoices; notifications emitted within limits; roles’ dashboards fully bound; self‑service privacy live; edge hardened; ops & alerts active; no mocks; psycopg2‑only; zero theme changes.



---

## 17) Global ALWAYS PRE‑READ (for every prompt/action)

Before executing **anything**, the agent must read all three files, then print a 6–10 line memo confirming understanding and zero‑theme‑drift before proceeding:

`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md`  
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\Full Prompt.md`  
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\samia_tarot_context_engineering_m_14_m_15.md`

These three files are **mandatory pre‑read** across **all** modules and tasks (M1…M15, M13.x, etc.).

