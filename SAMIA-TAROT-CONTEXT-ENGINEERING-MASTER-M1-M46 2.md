# SAMIA-TAROT — Context Engineering Master (M1 → M46)
_Last updated: 2025-09-13 10:53:58 (UTC+3)_

> **Non‑negotiables**
> - **Do NOT touch or change the theme/UX** of the whole project. If a *new* page is created, it **must** match the existing theme.
> - Keep code **maintainable & short**. Prefer small, composable modules and explicit contracts.
> - **DB‑first security**: Row‑Level Security (RLS) enforced **before** route guards.
> - **Private storage only** with **short‑lived Signed URLs**; no public permanent links.
> - **Determinism**: same inputs ⇒ same outputs (esp. personalization).
> - **Auditability**: every sensitive action is logged (tamper‑evident).

---

## Table of Contents
1. Architecture & Components
2. Roles & Permissions
3. Data Model (ER overview) & Storage
4. RLS & Retention (with daily horoscopes policy)
5. API Surface (Routes) — including new M14/M15
6. Core Workflows (Orders, Horoscopes, Calls, Payments, Notifications, DSR)
7. Observability & Operations (Golden Signals, Alerts, Runbook)
8. Security & Compliance (M38: 18+, GDPR DSR, Immutable Audit)
9. Mobile Packaging (M39)
10. Automations Matrix (n8n/Dify)
11. Personalization (M25 — Internal AI only)
12. Community (M24 — Feature‑flagged)
13. Analytics & KPIs (M23)
14. Roadmap M1→M46 (Status)
15. Acceptance Criteria & E2E Tests (high‑level)
16. Engineering Prompts (for agents)
17. Change Log

---

## 1) Architecture & Components
- **Backend**: FastAPI + psycopg2 (SQL‑first, no heavy ORM). JWT auth. Strict input validation.
- **Database**: PostgreSQL (Supabase). Extensions: pgcrypto, pg_partman (if needed), pgvector (for knowledge base).
- **Storage**: Supabase Storage buckets (private). Signed URL issuance server‑side only.
- **Jobs/Automations**: n8n (timers, webhooks), optional Dify for internal assist pipelines.
- **Voice/Calls**: Twilio (webhooks secured with HMAC and IP allowlisting).
- **Front‑end**: Consumes APIs only. **Theme is immutable**. Any new page must mirror style system.
- **Observability**: `/api/ops/health`, `/api/ops/snapshot`, `/api/ops/metrics` (+ alerts).

## 2) Roles & Permissions
`client, reader, monitor, admin, superadmin`
- **client**: create orders, view deliveries, view own invoices via signed URL.
- **reader**: receive assigned orders, upload results (audio), use internal assist tools.
- **monitor**: approve/reject content & horoscopes; drop/terminate calls; block users (unblock is admin+).
- **admin**: user admin, unblock, ops (snapshot/metrics/export), rate‑limits config.
- **superadmin**: full access, including **raw PII exports** under legal basis.
- Principle: **Least privilege**. All routes double‑checked versus **RLS parity**.

## 3) Data Model (ER overview) & Storage
**Core tables (illustrative)**
- `roles`, `profiles`, `services`, `orders`, `order_events`, `media_assets`
- `horoscopes` (scope: daily/monthly), `horoscope_approvals`
- `calls`, `call_events`
- `moderation_actions`, `blocked_profiles`, `audit_log`
- `app_settings`, `phone_verifications`, `api_rate_limits`
- `kb_docs`, `kb_chunks` (pgvector)

**Payments (M14 — NEW)**
- `payment_intents`, `payment_events`, `invoices`, `invoice_items`, `refunds`

**Notifications (M15 — NEW)**
- `notif_templates`, `notif_prefs`, `notif_log`

**Community (M24 — NEW, Feature‑flag)**
- `posts`, `post_comments`, `post_reacts` (all RLS‑guarded), moderation hooks

**Storage policy**
- All media (order results, horoscope audio, invoices PDF) in **private** buckets.
- Access via **short‑lived Signed URLs** only.
- Retention: see §4.3.

## 4) RLS & Retention
### 4.1 General
- **Enforce RLS at DB layer first**. Routes must not broaden scope beyond RLS.
- Public queries return **only explicitly allowed slices**.

### 4.2 Daily Horoscopes (HARD POLICY)
- **Source**: **Admin‑only uploads** (no TikTok ingestion).
- **Visibility**:
  - Public: **today’s** records only where `approved_at IS NOT NULL` and `scope='daily'`.
  - Internal (reader/admin/superadmin): up to **60 days** history via **server‑issued Signed URLs**.
- **Retention**:
  - `> 60 days`: **hard‑delete** from DB and storage by scheduled job.
- **Parity**: Route guards mirror DB policy. Add tests to prove DB denial on unauthorized access.

### 4.3 Media & Invoices
- All links are **ephemeral** Signed URLs; embed durations minimal (≤15 min default).
- No permanent public URLs. Audit every issuance.

## 5) API Surface (Routes)
**Auth & Verify**
- `POST /api/auth/sync` — sync user & roles.
- `POST /api/verify/phone` — issue & confirm OTP (rate‑limited).

**Profiles & Meta**
- `GET /api/meta/countries`, `GET /api/meta/zodiacs`
- `POST /api/profile/complete` — computes zodiac from DOB/country.

**Orders**
- `POST /api/orders` — create.
- `GET /api/orders/{id}` — details.
- `POST /api/orders/{id}/assign` — admin/ops.
- `POST /api/orders/{id}/result` — reader upload media, link to order.
- `POST /api/orders/{id}/approve|reject` — monitor.
- `POST /api/orders/{id}/deliver` — finalize & notify.

**Horoscopes**
- `POST /api/horoscopes/ingest` — **Admin‑only upload**.
- `POST /api/horoscopes/{id}/approve|reject` — monitor.
- `GET /api/horoscopes/daily` — public: **today only** (approved).
- `GET /api/horoscopes/{id}/media` — internal via Signed URL.

**Calls**
- `POST /api/calls/schedule` — create slot/check availability.
- `POST /api/calls/initiate` — start; Twilio webhook handshake (HMAC).
- `POST /api/calls/terminate` — monitor/admin can force drop.
- `POST /api/calls/webhook` — Twilio callbacks (secured).

**Payments (M14 — NEW)**
- **DDL**: `007_payments.sql` (idempotent).
- **Endpoints**:
  - `POST /api/payments/intent` — create/confirm intent (validate order & price).
  - `POST /api/payments/webhook` — provider webhook (verify HMAC; upsert `payment_events`; transition statuses).
  - `POST /api/payments/refund` — admin‑only refund path.
  - `GET /api/payments/invoice/{order_id}` — returns **Signed URL** of PDF invoice.
- **Guards**: If any provider ENV vars are missing ⇒ **503** (fail‑safe).

**Notifications (M15 — NEW)**
- **DDL**: `008_notifications.sql`.
- **Channels**: Email, SMS, WhatsApp (pluggable providers).
- **Endpoints**:
  - `POST /api/notifs/send` — internal triggers (with rate limits).
  - `POST /api/notifs/templates/upsert`
  - `GET /api/notifs/prefs` / `POST /api/notifs/prefs`
- **Guards**: Missing provider config ⇒ **503**.

**Assist (Internal)**
- `POST /api/assist/draft` — internal AI only (not user‑facing).
- `POST /api/assist/search` — KB search.
- `POST /api/assist/knowledge/upsert` — admin.

**Moderation**
- `POST /api/moderation/block|unblock`
- `POST /api/moderation/review` — decisions into `moderation_actions` + `audit_log`.

**Ops**
- `GET /api/ops/health`
- `GET /api/ops/snapshot`
- `GET /api/ops/metrics` — includes rate‑limit counters & 429 Retry‑After semantics.
- `POST /api/ops/export` — admin/superadmin only.

## 6) Core Workflows
- **Client order → Reader result → Monitor approval → Delivery** (+ notifications on each transition).
- **Daily horoscopes**: Admin uploads; Monitor approves; Public sees **today only**; retention jobs prune old content.
- **Calls**: schedule → initiate → terminate (monitor can drop). Events audited.
- **Payments**: intent → provider webhook (state transitions) → invoice PDF generated & stored (private) → client fetch via Signed URL.
- **Notifications**: triggered on order state changes, payment outcomes, call reminders, and emergency siren.
- **DSR (GDPR)**: access/erasure requests handled by dedicated service with verification & grace periods.

## 7) Observability & Operations
- **Golden Signals**: latency, errors, traffic, saturation.
- **429 semantics**: return `Retry-After` header; count & export breaches.
- **Alerts**: wire from `/api/ops/metrics` to Email/Slack with thresholds tied to SLOs.
- **Runbook**: include examples for health/snapshot/metrics; migration commands `python migrate.py audit|up` and expected outputs.
- **Synthetics**: minimal checks for public daily horoscope endpoint and payments webhook reachability.

## 8) Security & Compliance (M38)
- **Age gating (18+)**, COPPA safeguards, consent management.
- **DSR service**: Article 15/17 (export & deletion) with verification, grace periods.
- **Immutable audit**: append‑only with hash‑chaining for tamper‑evidence.
- **PII handling**: exports masked by default; raw allowed only for superadmin with legal basis.
- **Key rotation**: ≥ every 90 days. Secrets managed centrally.

## 9) Mobile Packaging (M39)
- Store metadata, privacy manifests, release channels.
- Network permissions least‑privilege; background tasks restricted.
- Versioning & changelog discipline; crash reporting wired to alerts.

## 10) Automations Matrix (n8n/Dify)
- **Daily**: horoscope pruning (>60d), invoice cleanup, rate‑limit counters reset (if applicable).
- **Monthly**: signed URL TTL policy checks, voice token refresh.
- **On‑event**: payment webhooks, call events, moderation decisions to audit.
- **Emergency**: siren escalation chain (SMS/WhatsApp/email).

## 11) Personalization (M25 — Internal‑only)
- ID‑based features vectors; **no AI text exposed** to clients.
- Deterministic rankings; cache TTL 24h; strict opt‑out supported.
- Enforced via server‑side compute only.

## 12) Community (M24 — Feature‑flag)
- OFF by default. When ON: comments/reactions with strict RLS and moderation.
- All community content goes through `moderation_actions` + `audit_log`.
- Abuse rate‑limits + reporting channel to monitor.

## 13) Analytics & KPIs (M23)
- `events_raw` ingestion → `metrics_daily_*` rollups.
- `/api/ops/metrics` exposes key business counters (orders, conversions, refunds) without UI change.
- Data minimization: no PII in metrics.

## 14) Roadmap M1→M46 (Status snapshot)
- **M14 Payments** — **ADDED** (spec & DDL; implement & test).
- **M15 Notifications** — **ADDED** (spec & DDL; implement & test).
- **M23 Analytics** — **ADDED** (spec; implement exporters & alerts).
- **M24 Community (flag)** — **ADDED** (spec; keep OFF until moderation SLAs ready).
- **M25 Personalization (internal)** — **ADDED** (spec; server‑side only).
- **M38 Legal/Compliance 18+** — Delivered (service & policies).
- **M39 Mobile Packaging** — **Verified**.
- **M40 Emergency & Availability** — **ADDED** (siren, on‑call, escalation).
- **M41 Performance & Resilience** — **DELIVERED** (circuit breakers, load testing, metrics, runbook).
- **M45 Admin Links-Only Validation Panel** — **DELIVERED** (store validation summary endpoints).

## 15) Acceptance Criteria & E2E Tests (high‑level)
- **RLS parity**: unauthorized DB reads fail even if routes are mis‑configured.
- **Daily horoscopes**: public endpoint returns only (scope=daily, approved=1, ref_date=today).
- **Signed URLs**: media/invoice access requires valid short‑lived URL; expired links denied.
- **Payments**: 503 when provider env missing; webhook HMAC verified; refunds admin‑only; invoice generated and retrievable via Signed URL.
- **Notifications**: emits on order state transitions; respects rate‑limits and prefs; 503 on missing providers.
- **Observability**: `/api/ops/metrics` exposes counters; alerts fire on SLO breaches; 429 returns `Retry-After`.
- **Audit**: all sensitive actions are logged; hash‑chain integrity verified in audit mode.

## 16) Engineering Prompts (copy‑paste)
> **Reminder:** Do NOT change the theme/UX. Keep the code maintainable & short.

**P1 — Lock Daily Horoscope RLS & Signed URLs**
```
Read all master context files first and confirm alignment.
Task: Enforce DB-first RLS for `horoscopes`: public=today+approved only; internal ≤60d via server-issued short-lived Signed URLs; >60d hard-delete (DB+Storage). Mirror parity in route guards. Add tests proving DB-level denial and that media access works only via Signed URLs. Keep changes surgical and short.
```

**P2 — Wire Observability & Alerts (SLOs + 429)**
```
Expose key metrics via `/api/ops/metrics` and configure alert rules for Golden Signals and 429 rate-limit breaches (include Retry-After). Provide a minimal runbook and a short synthetic probe. Keep code concise.
```

**P3 — Payments M14 Minimal**
```
Implement idempotent `007_payments.sql` (payment_intents, invoices, refunds, events). Endpoints: intent, webhook (HMAC-verified), refund (admin-only), invoice fetch (private bucket Signed URL). Enforce env-var guards returning 503 if missing. Add concise tests and runbook notes.
```

**P4 — Notifications M15 Minimal**
```
Implement `008_notifications.sql` and endpoints for templates, prefs, and sending with rate-limits. Use pluggable Email/SMS/WhatsApp providers. Return 503 when providers are missing. Trigger on order transitions and payment outcomes. Keep it short and maintainable.
```

## 17) Change Log
- 2025-09-13 — **M41 Performance & Resilience → DELIVERED**. Circuit breaker module, k6 load testing, performance metrics (p50/p95/p99 per route), enhanced rate limiting with Retry-After, RUNBOOK_PERF.md. All tests passed.
- 2025-09-13 — **M45 Admin Links-Only Validation Panel → DELIVERED**. Endpoints: `GET/POST /api/admin/store-validation/summary` (Admin-only, audited, with metrics counters). Database tests passed.
- 2025-09-13 — **M40 Emergency & Availability → ADDED**. Siren escalation service, reader availability windows, call termination, database schema with RLS policies applied.
- 2025-09-13 — **M39 Mobile Packaging → Verified**. Screenshots Uploaded + Synthetics PASS (store deployment simulation + evidence artifacts)
- 2025-09-13 — **M39 Mobile Packaging updated to READY FOR SUBMISSION**. Completed: TikTok legacy removal + security hardening validation + store readiness framework + synthetic probes. Evidence linked in verification report.
- 2025-09-13 — Added/updated sections for **M14 Payments, M15 Notifications, M23 Analytics, M24 Community (flag), M25 Personalization (internal), Daily Horoscopes hard policy (Admin-only + RLS + 60d retention), M38 Compliance, M39 Mobile Packaging, M40 Emergency/Siren, Observability & Alerts, Acceptance Criteria, Engineering Prompts**. Created automatic backup: `SAMIA-TAROT-CONTEXT-ENGINEERING-MASTER-M1-M46.backup-20250913-105358.md`.
