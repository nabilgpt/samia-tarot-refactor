# SAMIA TAROT — Context Engineering Playbook

> **Golden rule:** Do **not** change the existing Theme/UX. Any **new** page must exactly match the current **cosmic/neon** theme. Copy the theme **as-is** from the Windows project: `C:\Users\saeee\OneDrive\Documents\project\samia-tarot - Copy`. Keep all code **maintainable & short**.

---

## 0) TL;DR (Executive Summary)
- Backend is strong and nearly complete: DB + routes + security + payments + notifications + ops.
- Main gap: **Frontend** (primary React app + Admin/Monitor dashboards) and productionization (CI/CD, containers).
- Close 4 critical ops/security items: RLS gaps, default ≤15m Signed URL TTL, webhook timing‑safe HMAC, and standardized error schema.
- Six‑phase plan to reach 100% with acceptance criteria per phase.

---

## 1) Architecture Overview
- **Backend:** FastAPI (single service) + psycopg2 pooling (SQL‑first, no ORM). JWT guards and role checks.
- **DB:** PostgreSQL (Supabase Session Pooler). Extensions: pgcrypto, (optional pgvector for KB).
- **Storage:** Supabase Buckets **Private‑only** + short‑lived Signed URLs.
- **Jobs/Automations:** n8n (timers/webhooks) + optional internal AI (server‑side only).
- **Voice/Calls:** Twilio webhooks (HMAC + IP allowlisting).
- **Observability:** `/api/ops/health|snapshot|metrics` + Golden Signals + Alerts.
- **Frontend:** API consumer only. **Do not alter** Theme/UX. Every new page must use the exact tokens/spacing/radius/neon accents from the Windows project path.

**Risk Notes**
- Public UI is missing → we must bind cleanly to existing APIs without touching the theme.
- Multi‑provider comms/payments require circuit breakers + consistent `503` guards.

---

## 2) Roles & Permissions (RBAC)
- Roles: `client, reader, monitor, admin, superadmin`.
- **Least Privilege** and strict **RLS parity**: no endpoint may exceed DB policies.

**Role Capabilities**
- Client: create orders, receive deliveries, invoices via Signed URL.
- Reader: see assigned orders only, upload audio, use internal assist tools.
- Monitor: approve/reject content, drop live calls, block profiles.
- Admin: manage users, unblock, ops snapshots/exports, adjust rate limits.
- Superadmin: full access + raw PII (with legal justification) + sensitive changes.

---

## 3) Data Model (ERD – condensed)
**Core:** roles, profiles, services, orders, order_events, media_assets

**Horoscopes:** horoscopes, (approvals inline via `approved_at/by` or a separate table)

**Calls:** calls, call_events

**Security/Moderation:** moderation_actions, blocked_profiles, audit_log (hash‑chained), api_rate_limits, app_settings

**Payments:** payment_intents, payment_events, invoices, refunds, promo_codes

**Notifications:** notif_templates, notif_prefs, notif_log

**Knowledge Base (optional):** kb_docs, kb_chunks (pgvector)

**Storage Policy:** Private buckets only; access via short‑lived Signed URLs ≤15 minutes, centrally enforced.

---

## 4) RLS & Retention (Daily Horoscopes)
- Public: **today only** + **approved** items.
- Internal (reader/admin/superadmin): access to **≤60 days** via server‑issued short‑lived Signed URLs.
- `>60` days: **hard‑delete** from DB and Storage by scheduled job (cron/n8n).
- Route guards must mirror RLS exactly (**parity tests required**).

**Checks to close**
- Ensure all policies active; no broad selects that bypass `scope/time` constraints.
- Add indexes on predicates (`scope, zodiac, ref_date`).

---

## 5) API Surface (Operational Route Map)
### Auth & Verify
- `POST /api/auth/sync` — sync user/role
- `POST /api/verify/phone` — OTP via Twilio (rate‑limited)

### Profiles & Meta
- `GET /api/meta/countries`, `GET /api/meta/zodiacs`
- `POST /api/profile/complete` — compute zodiac from DOB

### Orders Workflow
- `POST /api/orders` (create)
- `GET /api/orders/{id}` (details)
- `POST /api/orders/{id}/assign` (admin)
- `POST /api/orders/{id}/result` (reader uploads audio)
- `POST /api/orders/{id}/approve|reject` (monitor)
- `POST /api/orders/{id}/deliver` (finalize + notify)

### Horoscopes
- `POST /api/horoscopes/ingest` (admin‑only upload)
- `POST /api/horoscopes/{id}/approve|reject` (monitor)
- `GET /api/horoscopes/daily` (Public: today only)
- `GET /api/horoscopes/{id}/media` (Internal via Signed URL)

### Calls (Twilio)
- `POST /api/calls/schedule`
- `POST /api/calls/initiate`
- `POST /api/calls/terminate` (monitor/admin)
- `POST /api/calls/webhook` (HMAC + allowlist)

### Payments (M14)
- `POST /api/payments/intent` (client)
- `POST /api/payments/webhook` (public, HMAC verify)
- `POST /api/payments/refund` (admin/superadmin)
- `GET /api/payments/invoice/{order_id}` (Signed URL)

### Notifications (M15)
- `POST /api/notifs/templates/upsert` (admin)
- `POST /api/notifs/send` (internal triggers)
- `GET/POST /api/notifs/prefs`

### Assist (Internal)
- `POST /api/assist/draft`, `POST /api/assist/search`, `POST /api/assist/knowledge/upsert`

### Moderation
- `POST /api/moderation/block|unblock`
- `POST /api/moderation/review`

### Ops
- `GET /api/ops/health`, `/snapshot`, `/metrics`
- `POST /api/ops/export`

---

## 6) Core Workflows
- **Order lifecycle:** client → assign → reader upload → monitor approve → deliver (+notifications).
- **Daily Horoscope:** admin upload → monitor approval → public (today only) → retention purge at 60 days.
- **Calls:** schedule/initiate/terminate (monitor can drop) + audit trail.
- **Payments:** intent → webhook state transitions → invoice PDF (private) → Signed URL delivery to client.
- **Notifications:** event‑driven (order states, payment outcomes, call reminders, emergencies).
- **DSR/GDPR:** export/delete via dedicated service + audit + grace windows.

---

## 7) Observability & Ops
- **Golden Signals:** latency, errors, traffic, saturation.
- **429 discipline:** always include `Retry-After`; expose counters in `/api/ops/metrics`.
- Alerts wired to SLOs + synthetic probes for public endpoints and webhooks.
- Runbooks: health/snapshot/metrics usage + migrate.py (audit|up).

---

## 8) Security & Compliance (18+)
- Age gate 18+, consent management, COPPA safeguards.
- **Immutable audit** (hash‑chained). PII masked by default; raw PII exposed to Superadmin only with legal reason.
- Key rotation ≤90 days.

---

## 9) Mobile (M39)
- Packaging/manifests/release channels + crash reporting + versioning.

---

## 10) Automations (n8n / internal)
- **Daily:** horoscope pruning (>60d), invoice cleanup, rate‑limit resets.
- **Monthly:** TTL policy checks, voice token refresh.
- **On‑event:** payment webhooks, call events, moderation → audit.
- **Emergency:** siren escalation (SMS/WhatsApp/Email).

---

## 11) Personalization (M25 — internal only)
- Server‑side features/ranks; **no client‑facing AI text**. Deterministic; opt‑out supported.

---

## 12) Community (M24 — Feature Flag OFF)
- Comments/Reactions with RLS + moderation. Keep feature OFF by default.

---

## 13) Analytics & KPIs (M23)
- `events_raw` → `metrics_daily_*` (no PII). `/api/ops/metrics` exposes key counters.

---

## 14) Execution Status (Roadmap M1→M46)
- Specs/acceptance exist for M14/15/23/24/25/38/39/40 with ready‑to‑run prompts.

---

## 15) High‑Level Acceptance Checklist
- RLS parity.
- Daily Horoscopes **today‑only** for public.
- Media/Invoices via **short‑lived Signed URLs**.
- Payments: `503` when env missing, HMAC webhooks, admin‑only refunds, invoice PDF by Signed URL.
- Notifications: rate‑limited, prefs honored, `503` when providers missing.
- `/api/ops/metrics` exposes counters; Alerts wired; 429 `Retry-After` consistent.
- Audit trail is tamper‑evident (hash‑chained).

---

## 16) Ready‑to‑Use Prompts (for internal agents)
> **Reminder:** Do **not** touch the global Theme/UX. If you create a **new page**, it must **copy** the theme exactly from `C:\Users\saeee\OneDrive\Documents\project\samia-tarot - Copy`. Keep code **maintainable & short**.

**P1 — Lock Daily Horoscope RLS & Signed URLs**
"Before doing anything, first read and strictly comply with all SAMIA‑TAROT master context files. Do NOT touch the global theme. Keep the code maintainable & short.
Task: Enforce DB‑first RLS for `horoscopes` (public today+approved; internal ≤60d via server‑issued short‑lived Signed URLs; >60d hard‑delete DB+Storage). Mirror parity in route guards. Add concise tests for DB denial and media access via Signed URLs. Keep edits surgical."

**P2 — Observability & 429**
"Read all master context docs. Do NOT change the theme. Keep code maintainable & short.
Task: Expose key metrics at `/api/ops/metrics`, wire alert rules for golden signals and 429 Retry‑After, add a short synthetic probe, and provide a minimal runbook."

**P3 — Payments M14 Minimal**
"Read all master context docs. Do NOT change the theme. Keep code maintainable & short.
Task: Implement `007_payments.sql` and endpoints (intent, webhook with timing‑safe HMAC verify, refund admin‑only, invoice Signed URL). Enforce `503` on missing env. Add minimal tests and runbook notes."

**P4 — Notifications M15 Minimal**
"Read all master context docs. Do NOT change the theme. Keep code maintainable & short.
Task: Implement `008_notifications.sql` and endpoints for templates, prefs, and send with rate‑limits. Providers missing ⇒ `503`. Trigger on order transitions and payment outcomes."

---

## 17) Gap Analysis
### 17.1 Backend
- **RLS gaps:** expand/verify policies (especially secondary joins).
- **Webhook HMAC:** enforce constant‑time comparisons everywhere.
- **Signed URL TTL:** centralize and enforce default ≤15 minutes.
- **Error Schema:** unify error shape (code/message/details/correlation_id).

### 17.2 Frontend
- Currently **0% implemented**: need primary React app + Admin/Monitor dashboards **matching the exact theme**.
- Bind to APIs with Auth headers; ensure RTL/AR parity.

### 17.3 DevOps/Prod
- **Containerization:** Docker multi‑stage + healthchecks + runtime envs.
- **CI/CD:** GitHub Actions: lint/test/migrate/deploy + secrets.
- **Load Balancer/Edge:** Nginx/Cloudflare rules (CSP/HSTS/CORS) + IP allowlist for webhooks.

### 17.4 Docs
- Full OpenAPI/Swagger + User/Operator manuals + Release/Rollback guides.

---

## 18) Plan to 100% (Six Phases)
**Phase 1 — Backend Fixes (1–2 days)**
1) Close RLS policies (targeted tables) + parity tests.
2) Retention job for horoscopes (>60d) + Storage purge.
3) Standardize error schema + consistent `Retry-After` for rate limits.
4) Timing‑safe HMAC verification for all webhooks.
5) Enforce Signed URL TTL ≤15m via a central helper.

**Phase 2 — Frontend (5–7 days)**
- **React app** using the **exact** theme from `C:\Users\saeee\OneDrive\Documents\project\samia-tarot - Copy`.
- Routes: `/` (home + daily zodiac audio), `/orders`, `/checkout`, `/profile`, `/invoices`.
- Auth + Profile completion + Order creation/tracking + Payments UI + Daily Horoscope page.

**Phase 3 — Admin Dashboard (2–3 days)**
- Login + Orders management + Horoscope ingest/approval + Moderation tools + Metrics/Exports.

**Phase 4 — Mobile (3–5 days)**
- Capacitor packaging + Push handling + Offline basics + Store assets.

**Phase 5 — Production (2–3 days)**
- Dockerfiles + CI/CD + LB/Edge config + Monitoring dashboards.

**Phase 6 — Docs & Tests (1–2 days)**
- OpenAPI + Runbooks + User manuals + Perf benchmarks + Security audit docs.

---

## 19) Operational Guides by Role
### Client
- Sign up/verify (Email/Twilio) → complete profile → create order (tarot/coffee/astro/healing/direct_call) → pay → receive audio/invoice via Signed URL.

### Reader
- See **assigned** orders only → upload audio → use internal Assist → handoff to Monitor.

### Monitor
- Review/approve/reject results + horoscopes → can drop live calls → block abusive users.

### Admin
- User management (unblock only), adjust rate limits, monitor `/ops/*`, run exports.

### Superadmin
- Everything above + raw PII export with legal reason + sensitive config changes.

---

## 20) Screens & Pages (without changing the theme)
- **Public:** Home (daily zodiac today‑only audio cards), Pricing/Services, Legal (Terms/Privacy/Refund).
- **Client:** Orders, Payments/Invoices, Profile.
- **Reader:** Assigned Orders, Uploads, Assist tools.
- **Monitor:** Review queues, Calls control, Moderation.
- **Admin/Superadmin:** Users, Rate Limits, Metrics/Snapshot, Exports, Feature Flags.

> Every new page must exactly reuse the cosmic/neon theme, including RTL.

---

## 21) Acceptance Tests (E2E – examples)
- Public `/horoscopes/daily` returns today+approved only.
- Reader cannot access non‑assigned orders.
- Signed URLs expire within ≤15 minutes; renewal is server‑side only.
- Payment webhook with invalid signature → 400 + logged event.
- Refund is admin‑only and recorded in audit/moderation.
- `/api/ops/metrics` exposes 429 counters; Alerts trigger accordingly.

---

## 22) Risks & Mitigations
- **Front‑end debt:** address via fast scaffolding + strict API binding.
- **Policy drift:** run RLS parity validator on every release (M43).
- **Provider outages:** circuit breakers + degraded modes + clear comms.

---

## 23) Copy‑Paste Prompts (execution)
> Do NOT change the theme/UX. If creating a new page, **copy** the theme from `C:\Users\saeee\OneDrive\Documents\project\samia-tarot - Copy`. Keep code **maintainable & short**. Read all master context files before coding.

### Prompt A — RLS Lock + Signed URLs (Daily Horoscopes)
"Before doing anything, first read and strictly comply with all SAMIA‑TAROT master context files. Do NOT touch the global theme. Keep the code maintainable & short.
Task: Enforce DB‑first RLS for `horoscopes` (public today+approved; internal ≤60d via server‑issued short‑lived Signed URLs; >60d hard‑delete DB+Storage). Mirror parity in route guards. Add concise tests proving DB‑level denial and Signed‑URL‑only media access. Keep edits surgical."

### Prompt B — Observability & 429
"Read all master docs. Do NOT change the theme. Keep code maintainable & short.
Task: Expose key metrics at `/api/ops/metrics`, wire alert rules for golden signals + 429 Retry‑After, add a short synthetic probe, and provide a minimal runbook."

### Prompt C — Payments M14
"Read all master docs. Do NOT change the theme. Keep code maintainable & short.
Task: Implement `007_payments.sql` and endpoints (intent, webhook with timing‑safe HMAC verify, refund admin‑only, invoice Signed URL). Enforce `503` on missing env. Add minimal tests and runbook notes."

### Prompt D — Notifications M15
"Read all master docs. Do NOT change the theme. Keep code maintainable & short.
Task: Implement `008_notifications.sql` and endpoints for templates, prefs, and send with rate‑limits. Providers missing ⇒ `503`. Trigger on order transitions and payment outcomes."

---

## 24) Go‑Live Gate (Pre‑launch Checklist)
- RLS parity validator: **green**.
- Synthetics (login/checkout/emergency/horoscopes): **green**.
- Alerts on golden signals active.
- Docker images signed & scanned.
- CI/CD: migrate → deploy → smoke → rollback plan.
- DPIA/Data Map/Retention Matrix uploaded.

---

## 25) What’s Next
- Execute Phase 1 immediately (RLS/TTL/HMAC/Error schema) and start Frontend binding with the **copied** theme from the Windows project path.
- Prepare CI/CD + Nginx/CF edge + SLO dashboards.
- Run M44 zodiac pipeline in production after M43 data‑freeze.

> **Bottom line:** Backend is ready for binding. After closing the security gaps and building UIs on **the exact existing theme**, we get to a safe, production‑grade launch.

