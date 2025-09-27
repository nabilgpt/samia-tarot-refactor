SAMIA TAROT — Unified Context Engineering (Master v2025‑09‑27)

Last updated: 2025‑09‑27 (UTC+3)

Non‑negotiables

Do NOT touch or change the global theme/UX (cosmic/neon). If you create a new page, it must exactly copy the existing theme.

Keep code maintainable & short. Prefer tiny, composable modules with explicit contracts. Keep the repo lean (no 1000 files).

DB‑first security: Row‑Level Security (RLS) strictly enforced in DB before any route guards.

Private storage only via short‑lived Signed URLs (≤15 minutes by default). No public permanent links. Never cache or log Signed URLs on the client.

Determinism: same inputs ⇒ same outputs (esp. personalization). No randomness in user‑facing content.

Auditability: every sensitive action is logged to an append‑only, hash‑chained audit log.

Table of Contents

Architecture & Components

Roles & Permissions (RBAC)

Data Model (ER overview) & Storage Policy

RLS & Retention (Daily Horoscopes hard policy)

API Surface (Route Map) — incl. M14 Payments & M15 Notifications

Core Workflows (Orders, Horoscopes, Calls, Payments, Notifications, DSR)

Observability & Operations (Golden Signals, 429, Alerts, Runbook)

Security & Compliance (18+, GDPR/DSR, Immutable Audit)

Mobile Packaging (M39)

Automations Matrix (n8n & event‑driven)

Personalization (Internal‑only)

Community (Feature‑flag OFF)

Analytics & KPIs (M23)

Delta Merge for SAMIA TAROT DEV (what to add from Full APP)

Acceptance Criteria (E2E)

Front‑End Execution Spec (Theme‑Locked UI)

Diff Boundaries & Code Review Checklist

Routes × Roles Matrix

Page ↔ API Wiring Matrix (Contracts)

CI/CD & Edge (Nginx/Cloudflare) Gate

Risk Notes & Mitigations

Ready‑to‑Use Engineering Prompts

Change Log

1) Architecture & Components

Backend: FastAPI (single service), SQL‑first via psycopg2 (no heavy ORM). JWT auth + role checks. Strict input validation.

Database: PostgreSQL (Supabase Session Pooler). Extensions: pgcrypto, pgvector (optional for KB), pg_partman (optional for partitioning).

Storage: Supabase Storage private buckets. Server issues short‑lived Signed URLs (≤15m default).

Automations/Jobs: n8n for timers & webhooks; optional internal AI pipelines for internal use only.

Voice/Calls: Twilio webhooks (HMAC signature + IP allowlist).

Front‑end: React app(s) consuming APIs only. Theme immutable; all pages render inside a single AppLayout mounting the one background.

Observability: /api/ops/health, /api/ops/snapshot, /api/ops/metrics (+ alerts on SLOs & 429).

2) Roles & Permissions (RBAC)

Roles: client, reader, monitor, admin, superadmin.

client: create orders; view own orders & deliveries; fetch invoices via Signed URL.

reader: view assigned orders only; upload results (audio); use internal assist tools.

monitor: approve/reject content & horoscopes; terminate calls; block users (unblock is admin+).

admin: manage users (unblock only), ops (snapshot/metrics/export), adjust rate limits.

superadmin: full access incl. raw PII exports under documented legal basis.

Principle: Least privilege everywhere. Route guards must not exceed DB RLS scope.

3) Data Model (ER overview) & Storage Policy

Core tables: roles, profiles, services, orders, order_events, media_assets.

Horoscopes: horoscopes (scope: daily/monthly), inline approvals via approved_at/by or horoscope_approvals table.

Calls: calls, call_events.

Security/Moderation: moderation_actions, blocked_profiles, audit_log (append‑only, hash‑chained), api_rate_limits, app_settings.

Payments (M14): payment_intents, payment_events, invoices, invoice_items, refunds, (optional) promo_codes.

Notifications (M15): notif_templates, notif_prefs, notif_log with pluggable providers (Email/SMS/WhatsApp).

Knowledge Base (optional): kb_docs, kb_chunks (pgvector).

Storage Policy: all media (order results, horoscope audio, invoices PDF) in private buckets; access only via server‑issued short‑lived Signed URLs; no public links; client must not cache/store/relay these URLs.

4) RLS & Retention (Daily Horoscopes hard policy)

Source: Admin‑only uploads (no social ingestion without review).

Visibility:

Public: today’s daily records only where approved_at IS NOT NULL and scope='daily'.

Internal (reader/admin/superadmin): access up to 60 days via Signed URLs.

Retention: > 60 days ⇒ hard‑delete from DB + Storage (scheduled job).

Parity: Route guards mirror DB policy. Include tests that unauthorized DB reads fail even if a route is misconfigured.

5) API Surface (Route Map)

Auth & Verify

POST /api/auth/sync — sync user & role metadata.

POST /api/verify/phone — issue/confirm OTP (rate‑limited).

Profiles & Meta

GET /api/meta/countries, GET /api/meta/zodiacs.

POST /api/profile/complete — compute zodiac from DOB/country.

Orders

POST /api/orders — create.

GET /api/orders/{id} — details.

POST /api/orders/{id}/assign — admin/ops.

POST /api/orders/{id}/result — reader upload.

POST /api/orders/{id}/approve | /reject — monitor.

POST /api/orders/{id}/deliver — finalize & notify.

Horoscopes

POST /api/horoscopes/ingest — Admin‑only upload.

POST /api/horoscopes/{id}/approve | /reject — monitor.

GET /api/horoscopes/daily — public: today only (approved).

GET /api/horoscopes/{id}/media — internal Signed URL.

Calls

POST /api/calls/schedule — check availability/create slot.

POST /api/calls/initiate — start (HMAC handshake).

POST /api/calls/terminate — monitor/admin can drop.

POST /api/calls/webhook — Twilio callbacks.

Payments (M14)

POST /api/payments/intent — create/confirm intent (validate order & price).

POST /api/payments/webhook — verify HMAC; upsert payment_events; transition statuses.

POST /api/payments/refund — admin‑only.

GET /api/payments/invoice/{order_id} — returns Signed URL to PDF invoice.

Guard: Missing provider env ⇒ 503 (fail‑safe), never “pretend success”.

Notifications (M15)

POST /api/notifs/templates/upsert — admin.

POST /api/notifs/send — internal triggers with rate‑limits.

GET/POST /api/notifs/prefs — per user/channel.

Guard: Missing provider config ⇒ 503.

Assist (Internal)

POST /api/assist/draft (internal only), POST /api/assist/search, POST /api/assist/knowledge/upsert (admin).

Moderation & Ops

POST /api/moderation/block | /unblock.

POST /api/moderation/review — decisions → moderation_actions + audit_log.

GET /api/ops/health | /snapshot | /metrics.

POST /api/ops/export — admin/superadmin.

6) Core Workflows

Order lifecycle: client creates → admin/ops may assign → reader uploads result → monitor approves/rejects → deliver (+ notifications). All transitions are audited.

Daily Horoscopes: admin upload → monitor approval → public endpoint serves today only; internal ≤60d via Signed URLs; scheduled purge >60d.

Calls: schedule → initiate → terminate; monitor can force‑drop; all events audited.

Payments: intent → provider webhook (HMAC‑verified state transitions) → generate invoice PDF (private) → client fetch via Signed URL.

Notifications: event‑driven on order states, payment outcomes, call reminders, plus emergency siren.

DSR (GDPR): export & erasure requests with verification and grace periods; all actions audited.

7) Observability & Operations

Golden Signals: latency, errors, traffic, saturation.

429 discipline: always return Retry-After; expose counters in /api/ops/metrics.

Alerts: wire thresholds to Email/Slack; add synthetics for /horoscopes/daily and payment webhook reachability.

Runbook: examples for health/snapshot/metrics; python migrate.py audit|up outputs; troubleshooting proxy.

8) Security & Compliance

Age gating (18+), consent management, COPPA safeguards.

Immutable audit (hash‑chained, append‑only). PII masked by default; raw PII only for superadmin with legal basis.

Key rotation: at least every 90 days. Secrets centrally managed.

Webhook HMAC: timing‑safe comparison everywhere.

No PII in logs/metrics.

9) Mobile Packaging (M39)

Capacitor wrapper; same theme/tokens; least permissions; push optional; store assets & privacy manifests.

10) Automations Matrix (n8n & events)

Daily: horoscope purge (>60d), invoice cleanup, rate‑limit resets.

Monthly: signed‑URL TTL policy checks, voice token refresh.

On‑event: payment webhooks, call events, moderation → audit.

Emergency: siren escalation (SMS/WhatsApp/Email).

11) Personalization (Internal‑only)

Server‑side features/ranks only; deterministic; opt‑out supported. No AI text exposed to clients.

12) Community (Feature‑flag OFF)

When ON: posts/comments/reactions; strict RLS; moderation hooks. Default OFF until SLAs ready.

13) Analytics & KPIs (M23)

events_raw → metrics_daily_* rollups; no PII. /api/ops/metrics exposes key counters.

14) Delta Merge for SAMIA TAROT DEV (Bring the better parts from Full APP)

Goal: Apply these concrete improvements to SAMIA TAROT DEV without changing the theme.

UI Surface (One‑Pass)

Add a single AppLayout that mounts the one background; render all pages inside it.

Implement the full Route Matrix (Public/Client/Reader/Monitor/Admin) with minimal pages (≤18 new files cap).

Enforce tokens‑only styling; no hard‑coded colors/shadows; identical background across pages.

Auth & Guards

Use Supabase Auth on the client (signInWithPassword, getUser, onAuthStateChange).

Add tiny guards: RequireAuth and RoleGate to protect routes by role.

API Wiring & Error Shape

Introduce src/lib/api.ts helper with response.ok checks.

Standardize error schema: { code, message, details, correlation_id }.

Never cache Signed URLs; open invoices/media in a new tab with no-store.

Notifications Unification

Integrate M41 WhatsApp flows through M15 notifications layer using a provider adapter that honors notif_prefs + rate‑limits.

Observability & 429

Expose counters via /api/ops/metrics; add alerts for SLO breaches and 429 spikes; include Retry-After everywhere.

Add synthetic probes (horoscopes daily endpoint + payments webhook reachability).

Security Fixes

Centralize Signed URL TTL ≤15m in a server helper; enforce no public links.

Apply timing‑safe HMAC verification for all webhooks.

Add RLS parity tests proving DB denies unauthorized reads.

CI/CD Gate

Pipeline: lint/test → build (Vite) → dockerize → deploy → smoke.

Block PR if console warnings exist or Lighthouse budgets fail (LCP ≤3.0s, CLS ≤0.1, TBT ≤200ms).

Edge/Nginx

Strict CSP/HSTS/CORS; proxy /api/* to backend; no caching for /api/* or Signed URLs; IP allowlist for webhooks.

Acceptance for the Delta: All routes render inside AppLayout (one background), guards work by role, invoices/media open via short‑lived Signed URLs, /api/ops/metrics exposes 429 counters with alerts, CI gate is green, no console warnings, Lighthouse budgets met.

15) Acceptance Criteria (E2E)

RLS parity: Unauthorized DB reads fail, even with misconfigured routes.

Daily horoscopes: public endpoint returns only (scope=daily, approved=1, ref_date=today).

Signed URLs: media/invoices require valid short‑lived URL; expired links denied; client never caches.

Payments: 503 when provider env missing; webhook HMAC verified; refunds admin‑only; invoice retrievable via Signed URL.

Notifications: triggers on order transitions/payment outcomes; respects prefs & rate‑limits; 503 when providers missing.

Observability: /api/ops/metrics exposes counters; alerts fire on 429/SLO; synthetics pass.

UI/UX: no console warnings; skeleton/inline‑error/empty patterns consistent; breakpoints pass; reduced‑motion supported.

16) Front‑End Execution Spec (Theme‑Locked UI)

One background policy: background/particles mounted once in AppLayout.

Pages (flat): Home, Services, Horoscopes, Login, Orders, Order, Checkout, Profile, ReaderQueue, ReaderOrder, MonitorReview, MonitorCalls, AdminUsers, AdminRateLimits, AdminMetrics, AdminExports, Legal/*.

A11y/Perf: :focus-visible, prefers-reduced-motion; particles fpsLimit ≤60, pauseOnBlur, pauseOnOutsideViewport.

Network: Vite proxy /api/*; base path constant; fetch helper checks ok.

17) Diff Boundaries & Code Review Checklist

Boundaries

Allowed paths: router glue, AppLayout, RequireAuth, RoleGate, src/lib/api.ts, src/lib/supabase.ts, src/lib/auth.ts, flat src/pages/*, vite.config.ts, index.css (consume variables only).

Max new files: ≤18. No deep folders. No new UI frameworks or CSS libs.

No changes to theme tokens; no duplicate backgrounds; no caching of Signed URLs.

CR Checklist

Uses only theme tokens (var(--*)); zero hex colors.

Single AppLayout; identical background everywhere.

Reduced motion path present; focus rings visible.

All fetches check response.ok; errors sanitized; no PII in logs.

Guarded routes by role; unauthorized links hidden.

No console warnings; images sized; bundle small; particles perf constraints applied.

18) Routes × Roles Matrix

Public: /, /services, /horoscopes, /login, /legal/*

Client: /orders, /orders/:id, /checkout, /profile

Reader: /reader/queue, /reader/orders/:id

Monitor: /monitor/review, /monitor/calls

Admin: /admin/users, /admin/rate-limits, /admin/metrics, /admin/exports

19) Page ↔ API Wiring Matrix (Contracts)

Page/Feature

Endpoint(s)

Notes

Home → Preview

GET /api/horoscopes/daily

show 6; empty state renders 12 placeholders

Services

(local or GET /api/services)

CTA → /checkout?service=...

Checkout

POST /api/orders, POST /api/payments/intent

on success → /orders/:id

Order detail

GET /api/orders/:id, GET /api/payments/invoice/:order_id

polling with capped backoff; open invoice via short‑lived Signed URL

Reader upload

POST /api/orders/:id/result

server stores private; emits notif

Monitor review

`POST /api/horoscopes/:id/approve

reject, POST /api/orders/:id/approve

reject`

decisions audited

Calls (monitor)

POST /api/calls/terminate

audit trail

Admin metrics

GET /api/ops/metrics, GET /api/ops/snapshot

golden signals & counters

20) CI/CD & Edge Gate

Pipeline: lint/test → build (Vite) → dockerize (multi‑stage) → deploy → smoke → Lighthouse budgets.

Blockers: console warnings; LCP > 3.0s; CLS > 0.1; TBT > 200ms; /api/ops/* not 200.

Edge/Nginx: CSP/HSTS; strict CORS; proxy /api/*; no caching for /api/* or Signed URLs; webhook IP allowlist.

21) Risk Notes & Mitigations

Policy drift: run RLS parity validator on every release.

Provider outages: circuit breakers + explicit 503 guards + clear UI errors (inline).

Front‑end debt: keep pages minimal; avoid over‑abstraction; respect file cap.

22) Ready‑to‑Use Engineering Prompts

Reminder: Do not change the theme/UX. Keep the code maintainable & short. Keep the repo lean.

P1 — One‑Pass UI & Guards
"Read the unified context file first. Do not touch the global theme. Keep code maintainable & short. Task: Implement AppLayout (one background), full route matrix with RequireAuth/RoleGate, tiny src/lib/api.ts helper, skeleton/inline‑error/empty patterns, and capped‑backoff polling for orders. Respect the ≤18 files cap."

P2 — RLS Parity & Signed URLs
"Before coding, read the unified context. Do not change the theme. Keep code maintainable & short. Task: Enforce DB‑first RLS for orders & horoscopes (public today+approved; internal ≤60d). Add tests proving DB denial on unauthorized reads. Centralize Signed‑URL TTL ≤15m; never cache or log URLs."

P3 — Observability & 429
"Read the unified context. Do not change the theme. Keep code maintainable & short. Task: Expose key metrics at /api/ops/metrics, wire alert rules for golden signals and 429 Retry-After, and add a tiny synthetic probe for /horoscopes/daily and the payments webhook."

P4 — Payments M14 Minimal
"Read the unified context. Do not change the theme. Keep code maintainable & short. Task: Implement idempotent 007_payments.sql and endpoints (intent, HMAC‑verified webhook, admin‑only refund, invoice Signed URL). Return 503 when provider env is missing. Add concise tests and runbook notes."

P5 — Notifications M15 (Unify M41)
"Read the unified context. Do not change the theme. Keep code maintainable & short. Task: Implement 008_notifications.sql and endpoints (templates, prefs, send). Add a WhatsApp provider adapter to route existing M41 flows through this layer respecting prefs & rate‑limits."

23) Change Log

2025‑09‑27 — Created the Unified Context Engineering master file by combining all context docs and integrating the Delta Merge from Full APP to SAMIA TAROT DEV: added theme‑locked UI spec, route matrix, guards/auth, error schema, observability & 429 alerts, Signed‑URL TTL centralization, timing‑safe HMAC, RLS parity tests, CI/CD gate, and Edge no‑cache rules.

23.1 Implementation Snapshot — Frontend One‑Pass Fix & Polish (pre‑integration)

Scope (from latest implementation report):

Vite Proxy: Removed rewrite that stripped /api; now /api/* → http://localhost:5000 (vite.config.js:104–110).

API Module: Added aliases — dailyHoroscopes → getDailyHoroscopes, services → getServices; dual long/short method names for compatibility (src/lib/api.js:158–174).

Order Polling: AbortController on unmount; exponential backoff 1s→2s→4s→8s→16s with ±200ms jitter; capped at 16s (src/pages/Order.jsx:39–66).

UI/UX (layout.css): Buttons (Primary/Secondary) with :focus-visible; card system with equal heights (CSS Grid); fluid typography via clamp(); layout‑hinting skeletons; responsive grids (Horoscopes 2→3→6, Services 1→2→3); touch targets ≥24×24; prefers-reduced-motion support.

Repo Hygiene: Moved ~100+ docs → md/, 80+ Python → py/, 30+ SQL → sql/; net code reduction ~9.6k lines.

Docs: Updated FRONTEND_HANDOVER.md to v1.0.3 with file locations & polling details; created comprehensive commit message.

Dashboards & Data (subsequent phases):

Phase 1 UI polish: hero gradient text; floating cosmic particles on trust signals; animated horoscope/service cards; scroll‑aware navbar.

Phase 2 Mock data: 6 users across roles; metrics, rate limits, reader queue, monitor reviews, call logs.

Phase 3 Backend ready: hooks getMetrics(), getReaderQueue(), getReadingsForReview(), approveReading(), rejectReading(); Supabase auth in src/lib/auth.ts.

Phase 4 Dashboards: Admin Users (src/pages/admin/Users.jsx:1), Admin Metrics (src/pages/admin/Metrics.jsx:1), Reader Queue (src/pages/reader/Queue.jsx:1), Monitor Review (src/pages/monitor/Review.jsx:1).

Phase 5 Performance: content-visibility, GPU hints (will-change, translateZ(0)), font-display: swap, lazy‑loading images.

Status: Frontend ready infra‑wise; proxy ok; awaiting backend routes for horoscopes on port 5000 to complete full integration.

