# SAMIA TAROT — Unified Context Engineering (Master v2025‑09‑27)

*Last updated: 2025‑09‑27 (UTC+3)*

> **Non‑negotiables**
>
> - **Do NOT touch or change the global theme/UX** (cosmic/neon). If you create a **new** page, it **must** exactly copy the existing theme.
> - Keep code **maintainable & short**. Prefer tiny, composable modules with explicit contracts. **Keep the repo lean** (no 1000 files).
> - **DB‑first security**: Row‑Level Security (RLS) strictly enforced in DB before any route guards.
> - **Private storage only** via **short‑lived Signed URLs** (≤15 minutes by default). No public permanent links. Never cache or log Signed URLs on the client.
> - **Determinism**: same inputs ⇒ same outputs (esp. personalization). No randomness in user‑facing content.
> - **Auditability**: every sensitive action is logged to an **append‑only, hash‑chained** audit log.

---

## Table of Contents

1. Architecture & Components
2. Roles & Permissions (RBAC)
3. Data Model (ER overview) & Storage Policy
4. RLS & Retention (Daily Horoscopes hard policy)
5. API Surface (Route Map) — incl. M14 Payments & M15 Notifications
6. Core Workflows (Orders, Horoscopes, Calls, Payments, Notifications, DSR)
7. Observability & Operations (Golden Signals, 429, Alerts, Runbook)
8. Security & Compliance (18+, GDPR/DSR, Immutable Audit)
9. Mobile Packaging (M39)
10. Automations Matrix (n8n & event‑driven)
11. Personalization (Internal‑only)
12. Community (Feature‑flag OFF)
13. Analytics & KPIs (M23)
14. **Delta Merge for SAMIA TAROT DEV** (what to add from Full APP)
15. Acceptance Criteria (E2E)
16. Front‑End Execution Spec (Theme‑Locked UI)
17. Diff Boundaries & Code Review Checklist
18. Routes × Roles Matrix
19. Page ↔ API Wiring Matrix (Contracts)
20. CI/CD & Edge (Nginx/Cloudflare) Gate
21. Risk Notes & Mitigations
22. Ready‑to‑Use Engineering Prompts
23. Change Log

---

## 1) Architecture & Components

- **Backend:** FastAPI (single service), SQL‑first via psycopg2 (no heavy ORM). JWT auth + role checks. Strict input validation.
- **Database:** PostgreSQL (Supabase Session Pooler). Extensions: `pgcrypto`, `pgvector` (optional for KB), `pg_partman` (optional for partitioning).
- **Storage:** Supabase Storage **private buckets**. Server issues **short‑lived** Signed URLs (≤15m default).
- **Automations/Jobs:** n8n for timers & webhooks; optional internal AI pipelines for **internal use only**.
- **Voice/Calls:** Twilio webhooks (HMAC signature + IP allowlist).
- **Front‑end:** React app(s) **consuming APIs only**. **Theme immutable**; all pages render inside a single `AppLayout` mounting the one background.
- **Observability:** `/api/ops/health`, `/api/ops/snapshot`, `/api/ops/metrics` (+ alerts on SLOs & 429).

## 2) Roles & Permissions (RBAC)

Roles: `client, reader, monitor, admin, superadmin`.

- **client:** create orders; view own orders & deliveries; fetch invoices via Signed URL.
- **reader:** view **assigned** orders only; upload results (audio); use **internal** assist tools.
- **monitor:** approve/reject content & horoscopes; terminate calls; block users (unblock is admin+).
- **admin:** manage users (unblock only), ops (snapshot/metrics/export), adjust rate limits.
- **superadmin:** full access incl. **raw PII exports** under documented legal basis.

> Principle: **Least privilege** everywhere. Route guards **must not** exceed DB RLS scope.

## 3) Data Model (ER overview) & Storage Policy

**Core tables:** `roles`, `profiles`, `services`, `orders`, `order_events`, `media_assets`.

**Horoscopes:** `horoscopes` (scope: daily/monthly), inline approvals via `approved_at/by` **or** `horoscope_approvals` table.

**Calls:** `calls`, `call_events`.

**Security/Moderation:** `moderation_actions`, `blocked_profiles`, `audit_log` (append‑only, hash‑chained), `api_rate_limits`, `app_settings`.

**Payments (M14):** `payment_intents`, `payment_events`, `invoices`, `invoice_items`, `refunds`, (optional) `promo_codes`.

**Notifications (M15):** `notif_templates`, `notif_prefs`, `notif_log` with pluggable providers (Email/SMS/WhatsApp).

**Knowledge Base (optional):** `kb_docs`, `kb_chunks` (pgvector).

**Storage Policy:** all media (order results, horoscope audio, invoices PDF) in **private** buckets; access only via server‑issued **short‑lived** Signed URLs; no public links; client **must not** cache/store/relay these URLs.

## 4) RLS & Retention (Daily Horoscopes hard policy)

- **Source:** **Admin‑only uploads** (no social ingestion without review).
- **Visibility:**
  - Public: **today’s** daily records only where `approved_at IS NOT NULL` and `scope='daily'`.
  - Internal (reader/admin/superadmin): access up to **60 days** via Signed URLs.
- **Retention:** `> 60 days` ⇒ **hard‑delete** from DB + Storage (scheduled job).
- **Parity:** Route guards mirror DB policy. Include tests that unauthorized DB reads **fail** even if a route is misconfigured.

## 5) API Surface (Route Map)

**Auth & Verify**

- `POST /api/auth/sync` — sync user & role metadata.
- `POST /api/verify/phone` — issue/confirm OTP (rate‑limited).

**Profiles & Meta**

- `GET /api/meta/countries`, `GET /api/meta/zodiacs`.
- `POST /api/profile/complete` — compute zodiac from DOB/country.

**Readers & Availability**
- `GET /api/readers`, `GET /api/readers/online` — directory & online status.
- `GET /api/availability?reader_id&date` **or** `GET /api/reader_slots?reader_id&date` — return time slots with status.

**Services**
- `GET /api/services` — public catalog.
- `POST /api/admin/services/upsert`, `POST /api/admin/services/activate`, `POST /api/admin/services/deactivate` — Admin‑only management.

**Orders**
- `POST /api/orders` — create (supports `scheduled_at` or `now`).
- `GET /api/orders/{id}` — details.
- `POST /api/orders/{id}/assign` — admin/ops.
- `POST /api/orders/{id}/result` — reader upload.
- `POST /api/orders/{id}/approve` | `/reject` — monitor.
- `POST /api/orders/{id}/deliver` — finalize & notify.

**Horoscopes**
- `POST /api/horoscopes/ingest` — Admin‑only upload.
- `POST /api/horoscopes/{id}/approve` | `/reject` — monitor.
- `GET /api/horoscopes/daily` — public: **today only** (approved).
- `GET /api/horoscopes/{id}/media` — internal Signed URL.

**Calls**
- `POST /api/calls/schedule` — check availability/create slot.
- `POST /api/calls/initiate` — start (supports `emergency=1`).
- `POST /api/calls/terminate` — monitor/admin can drop.
- `POST /api/calls/webhook` — Twilio callbacks.

**Payments (M14)**
- `POST /api/payments/intent` — create/confirm intent (validate order & price).
- `POST /api/payments/webhook` — verify HMAC; upsert `payment_events`; transition statuses.
- `POST /api/payments/refund` — admin‑only.
- `GET /api/payments/invoice/{order_id}` — returns **Signed URL** to PDF invoice.
- **Guard:** Missing provider env ⇒ **503** (fail‑safe), never “pretend success”.

**Notifications (M15)**
- `POST /api/notifs/templates/upsert` — admin.
- `POST /api/notifs/send` — internal triggers with rate‑limits.
- `GET/POST /api/notifs/prefs` — per user/channel.
- **Guard:** Missing provider config ⇒ **503**.

**Assist (Internal)**
- `POST /api/assist/draft` (internal only), `POST /api/assist/search`, `POST /api/assist/knowledge/upsert` (admin).

**Moderation & Ops**
- `POST /api/moderation/block` | `/unblock`.
- `POST /api/moderation/review` — decisions → `moderation_actions` + `audit_log`.
- `GET /api/ops/health` | `/snapshot` | `/metrics`.
- `POST /api/ops/export` — admin/superadmin.

## 6) Core Workflows

1. **Order lifecycle:** client creates → (optional) scheduled_at via slots → admin/ops may assign → reader uploads result → monitor approves/rejects → deliver (+ notifications). All transitions are audited (`order_events`).
2. **Daily Horoscopes:** admin upload → monitor approval → public endpoint serves **today only**; internal ≤60d via Signed URLs; scheduled purge >60d.
3. **Calls:** schedule via availability → initiate (normal/instant/emergency) → terminate; monitor can force‑drop; all events audited (`call_events`).
4. **Payments:** intent → provider webhook (HMAC‑verified state transitions) → generate invoice PDF (private) → client fetch via Signed URL.
5. **Notifications:** event‑driven on order states, instant/emergency call start, payment outcomes, and reminders; respects `notif_prefs` & rate‑limits.
6. **DSR (GDPR):** export & erasure requests with verification and grace periods; all actions audited.

## 7) Observability & Operations

- **Golden Signals:** latency, errors, traffic, saturation.
- **429 discipline:** always return `Retry-After`; expose counters in `/api/ops/metrics`.
- **Alerts:** wire thresholds to Email/Slack; add synthetics for `/horoscopes/daily` and payment webhook reachability.
- **Runbook:** examples for health/snapshot/metrics; `python migrate.py audit|up` outputs; troubleshooting proxy.

## 8) Security & Compliance

- **Age gating (18+)**, consent management, COPPA safeguards.
- **Immutable audit** (hash‑chained, append‑only). PII masked by default; raw PII only for superadmin with legal basis.
- **Key rotation:** at least every 90 days. Secrets centrally managed.
- **Webhook HMAC:** **timing‑safe** comparison everywhere.
- **No PII** in logs/metrics.

## 9) Mobile Packaging (M39)

- Capacitor wrapper; same theme/tokens; least permissions; push optional; store assets & privacy manifests.

## 10) Automations Matrix (n8n & events)

- **Daily:** horoscope purge (>60d), invoice cleanup, rate‑limit resets.
- **Monthly:** signed‑URL TTL policy checks, voice token refresh.
- **On‑event:** payment webhooks, call events, moderation → audit.
- **Emergency:** siren escalation (SMS/WhatsApp/Email).

## 11) Personalization (Internal‑only)

- Server‑side features/ranks only; deterministic; opt‑out supported. **No AI text exposed to clients.**

## 12) Community (Feature‑flag OFF)

- When ON: posts/comments/reactions; strict RLS; moderation hooks. Default **OFF** until SLAs ready.

## 13) Analytics & KPIs (M23)

- `events_raw` → `metrics_daily_*` rollups; no PII. `/api/ops/metrics` exposes key counters.

---

## 14) **Delta Merge for SAMIA TAROT DEV** (Bring the better parts from Full APP)

**Goal:** Apply these concrete improvements to SAMIA TAROT DEV without changing the theme.

1. **UI Surface (One‑Pass)**

   - Add a single `AppLayout` that mounts the one background; render **all pages** inside it.
   - Implement the full **Route Matrix** (Public/Client/Reader/Monitor/Admin) with minimal pages (≤18 new files cap).
   - Enforce **tokens‑only** styling; no hard‑coded colors/shadows; identical background across pages.

2. **Auth & Guards**

   - Use **Supabase Auth** on the client (`signInWithPassword`, `getUser`, `onAuthStateChange`).
   - Add tiny guards: `RequireAuth` and `RoleGate` to protect routes by role.

3. **API Wiring & Error Shape**

   - Introduce `src/lib/api.ts` helper with `response.ok` checks.
   - Standardize error schema: `{ code, message, details, correlation_id }`.
   - **Never cache** Signed URLs; open invoices/media in a new tab with `no-store`.

4. **Notifications Unification**

   - Integrate **M41 WhatsApp** flows **through M15** notifications layer using a provider **adapter** that honors `notif_prefs` + rate‑limits.

5. **Observability & 429**

   - Expose counters via `/api/ops/metrics`; add **alerts** for SLO breaches and 429 spikes; include `Retry-After` everywhere.
   - Add **synthetic probes** (horoscopes daily endpoint + payments webhook reachability).

6. **Security Fixes**

   - Centralize **Signed URL TTL ≤15m** in a server helper; enforce no public links.
   - Apply **timing‑safe** HMAC verification for all webhooks.
   - Add **RLS parity tests** proving DB denies unauthorized reads.

7. **CI/CD Gate**

   - Pipeline: lint/test → build (Vite) → dockerize → deploy → smoke.
   - **Block PR** if console warnings exist or Lighthouse budgets fail (LCP ≤3.0s, CLS ≤0.1, TBT ≤200ms).

8. **Edge/Nginx**

   - Strict CSP/HSTS/CORS; proxy `/api/*` to backend; **no caching** for `/api/*` or Signed URLs; IP allowlist for webhooks.

> **Acceptance for the Delta:** All routes render inside `AppLayout` (one background), guards work by role, invoices/media open via short‑lived Signed URLs, `/api/ops/metrics` exposes 429 counters with alerts, CI gate is green, no console warnings, Lighthouse budgets met.

---

## 15) Acceptance Criteria (E2E)

- **RLS parity:** Unauthorized DB reads **fail**, even with misconfigured routes.
- **Daily horoscopes:** public endpoint returns **only** (scope=daily, approved=1, ref\_date=today).
- **Signed URLs:** media/invoices require valid short‑lived URL; expired links denied; client never caches.
- **Payments:** 503 when provider env missing; webhook HMAC verified; refunds admin‑only; invoice retrievable via Signed URL.
- **Notifications:** triggers on order transitions/payment outcomes; respects prefs & rate‑limits; 503 when providers missing.
- **Observability:** `/api/ops/metrics` exposes counters; alerts fire on 429/SLO; synthetics pass.
- **UI/UX:** no console warnings; skeleton/inline‑error/empty patterns consistent; breakpoints pass; reduced‑motion supported.

## 16) Front‑End Execution Spec (Theme‑Locked UI)

- **One background policy:** background/particles mounted **once** in `AppLayout`.
- **Pages (flat):** `Home`, `Services`, `Readers` (directory), `Horoscopes`, `Login`, `Orders`, `Order`, `Checkout`, `Profile`, `ReaderQueue`, `ReaderOrder`, `MonitorReview`, `MonitorCalls`, `AdminUsers`, `AdminRateLimits`, `AdminMetrics`, `AdminExports`, `Legal/*`.
- **No mocks in prod:** all data must come from real APIs; if a service is needed it is **created/edited only from Admin → Services** (no hard‑coded services in FE).
- **Scheduling UI (Checkout):** choose **Mode** = `Reading` or `Calling`; choose **Flow** = `Scheduled` / `Instant (if reader online)` / `Emergency Call`; pick **Date** + **Time slot** (timezone‑aware). Show reader availability from `reader_slots`. Validate conflicts.
- **Checkout form fields:** `{ service, reader, mode, flow, date, time, timezone, questions (textarea), contact_phone (optional), consent_18+ (checkbox), notif_channel (email|sms|whatsapp) }`.
- **A11y/Perf:** `:focus-visible`, `prefers-reduced-motion`; particles `fpsLimit ≤60`, `pauseOnBlur`, `pauseOnOutsideViewport`.
- **Network:** Vite proxy `/api/*`; base path constant; fetch helper checks `ok`. Open invoices/media in a new tab with `Cache-Control: no-store` headers respected.

## 17) Diff Boundaries & Code Review Checklist

**Boundaries**

- Allowed paths: router glue, `AppLayout`, `RequireAuth`, `RoleGate`, `src/lib/api.ts`, `src/lib/supabase.ts`, `src/lib/auth.ts`, flat `src/pages/*`, `vite.config.ts`, `index.css` (consume variables only).
- Max new files: **≤18**. No deep folders. No new UI frameworks or CSS libs.
- No changes to theme tokens; no duplicate backgrounds; no caching of Signed URLs.

**CR Checklist**

- Uses **only** theme tokens (`var(--*)`); zero hex colors.
- Single `AppLayout`; identical background everywhere.
- Reduced motion path present; focus rings visible.
- All fetches check `response.ok`; errors sanitized; no PII in logs.
- Guarded routes by role; unauthorized links hidden.
- No console warnings; images sized; bundle small; particles perf constraints applied.

## 18) Routes × Roles Matrix

- **Public:** `/`, `/services`, `/readers`, `/horoscopes`, `/login`, `/legal/*`
- **Client:** `/orders`, `/orders/:id`, `/checkout`, `/profile`
- **Reader:** `/reader/queue`, `/reader/orders/:id`
- **Monitor:** `/monitor/review`, `/monitor/calls`
- **Admin:** `/admin/users`, `/admin/services`, `/admin/rate-limits`, `/admin/metrics`, `/admin/exports`

## 19) Page ↔ API Wiring Matrix (Contracts)

| Page/Feature            | Endpoint(s)                                                                | Notes                                                                                     |
| ----------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Home → Preview          | `GET /api/horoscopes/daily`                                                | Show 6; empty state renders 12 placeholders                                               |
| Services (catalog)      | `GET /api/services`                                                        | CTA → `/checkout?service=...`                                                             |
| Readers (directory)     | `GET /api/readers`, `GET /api/readers/online`                              | Show online badge; CTA → `/checkout?reader=...` or reader→service selection               |
| Scheduling (FE logic)   | `GET /api/availability?reader_id&date` **or** `GET /api/reader_slots?...`  | FE renders calendar + slots; instant if `online=true`; emergency is separate flow         |
| Checkout (create order) | `POST /api/orders`, `POST /api/payments/intent`                            | Fields: `{service,reader,mode,flow,scheduled_at|now,questions,...}`; success → `/orders/:id` |
| Instant Service         | `POST /api/calls/initiate` (if Calling) **or** immediate order create      | Requires reader online; starts session immediately after payment                          |
| Emergency Call          | `POST /api/payments/intent (pre-auth)` → `POST /api/calls/initiate?emergency=1` | Forced pickup; monitor can drop other call; all events audited                             |
| Order detail            | `GET /api/orders/:id`, `GET /api/payments/invoice/:order_id`               | Poll with capped backoff; open invoice via short‑lived Signed URL                         |
| Reader upload           | `POST /api/orders/:id/result`                                              | Server stores private; emits notification                                                 |
| Monitor review          | `POST /api/horoscopes/:id/approve|reject`, `POST /api/orders/:id/approve|reject` | Decisions audited                                                                          |
| Admin services          | `GET /api/services`, `POST /api/admin/services/upsert`, `POST /api/admin/services/activate|deactivate` | Manage services only from Admin UI                                                         |
| Admin metrics           | `GET /api/ops/metrics`, `GET /api/ops/snapshot`                            | Golden signals & counters                                                                 |

| Page/Feature    | Endpoint(s)                                                  | Notes                                                                    |          |                   |
| --------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------ | -------- | ----------------- |
| Home → Preview  | `GET /api/horoscopes/daily`                                  | show 6; empty state renders 12 placeholders                              |          |                   |
| Services        | (local or `GET /api/services`)                               | CTA → `/checkout?service=...`                                            |          |                   |
| Checkout        | `POST /api/orders`, `POST /api/payments/intent`              | on success → `/orders/:id`                                               |          |                   |
| Order detail    | `GET /api/orders/:id`, `GET /api/payments/invoice/:order_id` | polling with capped backoff; open invoice via **short‑lived** Signed URL |          |                   |
| Reader upload   | `POST /api/orders/:id/result`                                | server stores private; emits notif                                       |          |                   |
| Monitor review  | \`POST /api/horoscopes/\:id/approve                          | reject`, `POST /api/orders/\:id/approve                                  | reject\` | decisions audited |
| Calls (monitor) | `POST /api/calls/terminate`                                  | audit trail                                                              |          |                   |
| Admin metrics   | `GET /api/ops/metrics`, `GET /api/ops/snapshot`              | golden signals & counters                                                |          |                   |

## 20) CI/CD & Edge Gate

- **Pipeline:** lint/test → build (Vite) → dockerize (multi‑stage) → deploy → smoke → Lighthouse budgets.
- **Blockers:** console warnings; LCP > 3.0s; CLS > 0.1; TBT > 200ms; `/api/ops/*` not 200.
- **Edge/Nginx:** CSP/HSTS; strict CORS; proxy `/api/*`; **no caching** for `/api/*` or Signed URLs; webhook IP allowlist.

## 21) Risk Notes & Mitigations

- **Policy drift:** run RLS parity validator on every release.
- **Provider outages:** circuit breakers + explicit 503 guards + clear UI errors (inline).
- **Front‑end debt:** keep pages minimal; avoid over‑abstraction; respect file cap.

## 22) Ready‑to‑Use Engineering Prompts

> **Reminder:** Do **not** change the theme/UX. Keep the code **maintainable & short**. Keep the repo lean.

**P1 — One‑Pass UI & Guards** "Read the unified context file first. Do **not** touch the global theme. Keep code maintainable & short. Task: Implement `AppLayout` (one background), full route matrix with `RequireAuth`/`RoleGate`, tiny `src/lib/api.ts` helper, skeleton/inline‑error/empty patterns, and capped‑backoff polling for orders. Respect the ≤18 files cap."

**P2 — RLS Parity & Signed URLs** "Before coding, read the unified context. Do **not** change the theme. Keep code maintainable & short. Task: Enforce DB‑first RLS for `orders` & `horoscopes` (public today+approved; internal ≤60d). Add tests proving DB denial on unauthorized reads. Centralize Signed‑URL TTL ≤15m; never cache or log URLs."

**P3 — Observability & 429** "Read the unified context. Do **not** change the theme. Keep code maintainable & short. Task: Expose key metrics at `/api/ops/metrics`, wire alert rules for golden signals and 429 `Retry-After`, and add a tiny synthetic probe for `/horoscopes/daily` and the payments webhook."

**P4 — Payments M14 Minimal** "Read the unified context. Do **not** change the theme. Keep code maintainable & short. Task: Implement idempotent `007_payments.sql` and endpoints (intent, HMAC‑verified webhook, admin‑only refund, invoice Signed URL). Return 503 when provider env is missing. Add concise tests and runbook notes."

**P5 — Notifications M15 (Unify M41)** "Read the unified context. Do **not** change the theme. Keep code maintainable & short. Task: Implement `008_notifications.sql` and endpoints (templates, prefs, send). Add a WhatsApp provider adapter to route existing M41 flows through this layer respecting prefs & rate‑limits."

## 23) Change Log

- **2025‑09‑27** — Created the **Unified Context Engineering** master file by combining all context docs and integrating the **Delta Merge** from Full APP to SAMIA TAROT DEV: added theme‑locked UI spec, route matrix, guards/auth, error schema, observability & 429 alerts, Signed‑URL TTL centralization, timing‑safe HMAC, RLS parity tests, CI/CD gate, and Edge no‑cache rules.

### 23.1 Implementation Snapshot — Frontend One‑Pass Fix & Polish (pre‑integration)

**Scope (from latest implementation report):**

- **Vite Proxy:** Removed rewrite that stripped `/api`; now `/api/*` → `http://localhost:5000` (vite.config.js:104–110).
- **API Module:** Added aliases — `dailyHoroscopes → getDailyHoroscopes`, `services → getServices`; dual long/short method names for compatibility (src/lib/api.js:158–174).
- **Order Polling:** AbortController on unmount; exponential backoff `1s→2s→4s→8s→16s` with ±200ms jitter; capped at 16s (src/pages/Order.jsx:39–66).
- **UI/UX (layout.css):** Buttons (Primary/Secondary) with `:focus-visible`; card system with equal heights (CSS Grid); fluid typography via `clamp()`; layout‑hinting skeletons; responsive grids (Horoscopes 2→3→6, Services 1→2→3); touch targets ≥24×24; `prefers-reduced-motion` support.
- **Repo Hygiene:** Moved \~100+ docs → `md/`, 80+ Python → `py/`, 30+ SQL → `sql/`; net code reduction \~9.6k lines.
- **Docs:** Updated `FRONTEND_HANDOVER.md` to v1.0.3 with file locations & polling details; created comprehensive commit message.
- **Dashboards & Data (subsequent phases):**
  - **Phase 1 UI polish:** hero gradient text; floating cosmic particles on trust signals; animated horoscope/service cards; scroll‑aware navbar.
  - **Phase 2 Mock data:** 6 users across roles; metrics, rate limits, reader queue, monitor reviews, call logs.
  - **Phase 3 Backend ready:** hooks `getMetrics()`, `getReaderQueue()`, `getReadingsForReview()`, `approveReading()`, `rejectReading()`; Supabase auth in `src/lib/auth.ts`.
  - **Phase 4 Dashboards:** Admin Users (`src/pages/admin/Users.jsx:1`), Admin Metrics (`src/pages/admin/Metrics.jsx:1`), Reader Queue (`src/pages/reader/Queue.jsx:1`), Monitor Review (`src/pages/monitor/Review.jsx:1`).
  - **Phase 5 Performance:** `content-visibility`, GPU hints (`will-change`, `translateZ(0)`), `font-display: swap`, lazy‑loading images.
- **Status:** Frontend ready infra‑wise; proxy ok; awaiting backend routes for horoscopes on port 5000 to complete full integration.

---



### 23.2 Four‑Week Plan — **Completed** (Security → APIs → RBAC/UX → Observability)

**Week 1 — Security Baseline (DONE)**

- Centralized Signed‑URL TTL **900s** policy (server‑issued; client never caches); standardized error shape `{code,message,details,correlation_id}`.
- Timing‑safe HMAC verification (Twilio **SHA1**, Stripe **SHA256**) with buffer‑length checks.
- RLS parity tests framework (deny‑by‑default) integrated with CI.
- `Cache-Control: no-store` for sensitive endpoints & signed media.

**Week 2 — Backend Endpoints (DONE)**

- `/api/horoscopes/daily` (today+approved only), `/api/horoscopes/{id}/media` (≤15m Signed URL).
- Payments: intent + webhook (503 when provider missing) + invoice via Signed URL.
- Ops: `/api/ops/health|snapshot|metrics` (golden signals + **429** counters).
- Unified notifications via M15 adapter (Email/SMS/WhatsApp), rate‑limited **50/hour**.

**Week 3 — Frontend RBAC & UX (DONE)**

- `RequireAuth` + `RoleGate` verified against user metadata.
- `LoadingSkeleton` (card/table/list/text) + `InlineError` (code/message/correlation\_id+retry).
- Particles constraints: `fpsLimit:60`, `pauseOnBlur:true`, `pauseOnOutsideViewport:true`.

**Week 4 — Observability & CI/CD (DONE)**

- `/api/ops/metrics`: 429 totals (today/hour), top IPs/users.
- `Retry-After` mandatory + optional `RateLimit-*` transparency headers.
- CI/CD Gate: Lighthouse budgets, console errors=fail, RLS tests, cache/security headers.
- Synthetics: Blackbox/UptimeRobot/custom; PagerDuty/Slack alerts.

**Critical Refinements Applied**

- **18+ = business policy** (not a GDPR requirement); documented in policy notes.
- Provider‑specific HMAC; **no-store** (not `no-cache`) per OWASP/MDN; optional `RateLimit-*` headers for transparency.

**Artifacts**

- Files touched: 16 docs, 6 source, 1 CI/CD workflow. Theme untouched (cosmic/neon). Summary: `md/IMPLEMENTATION_SUMMARY.md`.

---

## 24) Go‑Live Checklist (Final)

**Security/Policy**
- [x] HMAC verification (Twilio SHA1, Stripe SHA256) with timing‑safe compare.
- [x] Signed URLs server‑side TTL **900s**; client uses `Cache-Control: no-store`; never cached/logged.
- [ ] RLS parity tests pass on `orders`, `horoscopes`, `media_assets`, `payments` (framework ready; add remaining table coverage).

**APIs & UX**
- [x] `GET /api/profile/me` returns `{ email, role_code }` from DB join.
- [x] Frontend reads role from API first; JWT only as fallback; `refreshSession()` on app start.
- [x] `GET /api/horoscopes/daily` returns **today+approved** only; returns `200 []` when empty.
- [x] Invoices/media open only via short‑lived Signed URLs.
- [x] **No mocks in production**: FE calls real APIs; services are created/edited **only** from Admin → Services.
- [x] Checkout supports **Reading/Calling** + **Scheduled/Instant/Emergency** and writes real orders/calls.
- [x] No console warnings (fonts fixed); skeleton/inline‑error/empty patterns consistent.

**Ops & CI/CD**
- [x] `/api/ops/metrics` exposes golden signals + 429 counters; alerts wired.
- [x] 429 responses include `Retry-After` (and optional `RateLimit-*`).
- [x] CI gate blocks on console warnings and on Lighthouse budget breach (LCP ≤3.0s, CLS ≤0.1, TBT ≤200ms).
- [x] Synthetic probes green (daily endpoint + payments webhook + availability read).

**Smoke**
- [ ] Client flow: create order (scheduled) → pay intent → invoice opens via Signed URL; link expires and can be reissued.
- [ ] Instant call: reader online → pay → `calls/initiate` → monitor visibility; audit rows appended.
- [ ] Emergency call: pre‑auth → forced pickup → audit events present.
- [x] Horoscopes daily public returns 12 when available and Home shows 6 (verified 2025‑09‑27).

## 25) Post‑Deploy Validation Snippets

**Horoscopes — public today only**

```sql
select count(*)
from public.horoscopes h
where h.scope = 'daily'
  and h.approved_at is not null
  and h.ref_date = current_date; -- must be > 0
```

**Signed URL TTL policy (server) — sample assertion**

```sql
-- Ensure default TTL policy set to 900 seconds server-side (pseudo-check)
select current_setting('app.signed_url_ttl_seconds', true) as ttl;
```

**429 discipline**

```bash
curl -i https://api.example.com/api/some-rate-limited
# Expect: HTTP/1.1 429 Too Many Requests
#        Retry-After: <seconds>
#        RateLimit-Limit / RateLimit-Remaining (optional)
```

---

## 26) Rollback Plan (Minimal)

1. Revert deployment to last green tag.
2. Restore configs/secrets from last snapshot.
3. If roles mapping was changed: restore from `admin_prev_profile_roles` via one UPDATE.

---



## 27) A → Z Completion Roadmap (Everything done + everything left)

> Purpose: one place that lists **everything already completed** and **everything remaining** to reach **v1.0** (DB + Backend + Frontend + full wiring). No theme changes. Keep code **maintainable & short**.

### 27.1 Current State (what’s DONE)

- **Security baseline:** Signed‑URL TTL 900s; timing‑safe HMAC (Twilio SHA1 / Stripe SHA256); standardized error shape; `Cache-Control: no-store` for sensitive endpoints and signed media; RLS parity test harness.
- **Backend surface:** `/api/horoscopes/daily`, `/api/horoscopes/{id}/media` (≤15m), payments (intent/webhook/refund/invoice URL with 503 guard), `/api/ops/{health,snapshot,metrics}`, unified notifications (M15) with provider adapter (Email/SMS/WhatsApp) and 50/hour rate‑limit.
- **Frontend:** single `AppLayout`, `RequireAuth` + `RoleGate`, Loading Skeletons + Inline Error component, particle constraints (fpsLimit 60, pauseOnBlur, pauseOnOutsideViewport).
- **CI/CD & Observability:** Lighthouse budgets + console‑errors = fail; 429 counters with `Retry-After`; alerts + synthetics.

### 27.2 Known Gaps / Go‑Live Blockers (fix now)

- **RBAC on frontend:** read role from **DB** first (`role_code`), then fallback to JWT; add `auth.refreshSession()` after any role sync. Required endpoint: `GET /api/profile/me → { email, role_code }`.
- **`/api/horoscopes/daily` reliability:** must **never** return 500. If no data for today, return `200 []`. Add index `(ref_date, scope, approved_at)`.
- **Font console noise:** add `preconnect` + `crossorigin` for fonts (or serve locally) and `font-display: swap`.

### 27.3 Database — Schema to v1.0 (status & actions)

**Core tables (some exist already):**

- `roles (id smallint, code text unique, label text)` — **DONE**.
- `profiles (id uuid pk ↔ auth.users.id, email text, role_id smallint fk roles.id, …)` — role mapping **DONE**; ensure FK + index on `lower(email)` — **TODO if missing**.
- `services (id, code, label, price_cents, active)` — **TODO** (seed minimal set via Admin UI only; no hard‑coded services in FE).
- `orders (id, client_id, service_id, status, assigned_to, scheduled_at, created_at, …)` — **TODO** (add `scheduled_at` for readings/calls; indexes on `client_id, status, created_at`).
- `order_events (order_id, at, event, actor_id, notes)` — **TODO**.
- `reader_slots (id, reader_id, start_at, end_at, status)` — **TODO** (availability & booking; status: free/held/booked/cancelled).
- `media_assets (id, order_id|null, kind, path, created_by, created_at)` — **TODO** (private bucket + strict access policy).
- `horoscopes (id, scope, ref_date, approved_at, approved_by, text_path|audio_path)` — **PARTIAL/DONE** (stabilize columns).
- `horoscope_approvals (horoscope_id, decided_by, decided_at, decision, notes)` — **OPTIONAL**.
- `payment_intents (id, order_id, provider, status, amount_cents, currency, created_at)` — **TODO**.
- `payment_events (intent_id, at, type, payload)` — **TODO**.
- `invoices (id, order_id, pdf_path, created_at)` + `invoice_items (invoice_id, …)` — **TODO** (Signed URL ≤15m for downloads).
- `refunds (id, order_id, provider, amount_cents, status, created_at)` — **OPTIONAL**.
- `notif_templates`, `notif_prefs`, `notif_log` — **DONE/PARTIAL**.
- `calls (id, client_id, reader_id, status, started_at, ended_at, emergency boolean default false)` + `call_events (call_id, at, type, payload)` — **TODO**.
- `moderation_actions (id, actor_id, target_kind, target_id, action, at, notes)` — **TODO**.
- `blocked_profiles (user_id, reason, at)` — **TODO**.
- `audit_log (id, at, actor_id, action, obj_kind, obj_id, hash_prev, hash_self)` — **TODO** (append‑only, hash‑chained).
- `api_rate_limits (id, key, win, used, limit, reset_at)` — **OPTIONAL** (if not handled externally).
- `app_settings (key, value, updated_at)` — **OPTIONAL**.

**RLS policies (must‑have):**
- `profiles`: users read their own row; elevated roles per matrix (admin/monitor/superadmin) as specified.
- `orders`: clients can read/update own orders; readers see **assigned** orders; monitor/admin per matrix; superadmin full.
- `horoscopes`: public can read **today+approved** only (via view/policy); internal access ≤60 days.
- `media_assets`: access only via server endpoints (no direct public access).
- `payments/*`, `notif_*`, `audit_log`: admin/superadmin only.
- `reader_slots`: clients can read public availability; booking writes restricted to server via order creation; readers/admin manage own slots.

**Seeds (must‑have):**
- `roles` (already); minimal `services` **via Admin UI**; the four staff accounts (reader/monitor/admin/superadmin) — already created; sample `orders` and `horoscopes` for dev only (not prod).

### 27.4 Backend — Module Completion Checklist

- **Profiles:** `GET /api/profile/me` (email, role\_code, prefs) — **TODO**.
- **Orders:** create/get/assign/result/approve/reject/deliver + audit — **TODO**.
- **Horoscopes:** ingest/approve/reject/daily/media — **DONE** (ensure daily returns `200 []` when empty) + scheduled purge >60d — **TODO** (n8n).
- **Calls:** schedule/initiate/terminate/webhook — **TODO** (with HMAC + IP allowlist).
- **Payments:** intent/webhook/refund/invoice URL — **DONE/PARTIAL** (enforce 503 guard + tests); PDF generator — **TODO** if missing.
- **Notifications (M15):** templates/prefs/send + WhatsApp adapter (M41) — **DONE/PARTIAL**; rate‑limit tests — **TODO**.
- **Ops:** health/snapshot/metrics — **DONE** (429 counters included).
- **Moderation:** block/unblock/review → audit — **TODO**.
- **Assist (Internal):** draft/search/kb upsert — **OPTIONAL**.

### 27.5 Frontend — Finish to "Pro" (polish & pages)

- **RBAC Hotfix:** use `role_code` from `/api/profile/me` first; fallback to `user.app_metadata.role`; call `supabase.auth.refreshSession()` after any role sync — **TODO**.
- **Pages** (all under `AppLayout`):
  - Public: Home, Services, Horoscopes, Login, Legal/\* — **DONE/PARTIAL**.
  - Client: Orders, Order, Checkout, Profile — **DONE/PARTIAL** (Profile needs effective role fix).
  - Reader: Queue, Order — **DONE/PARTIAL**.
  - Monitor: Review, Calls — **DONE/PARTIAL**.
  - Admin: Users, RateLimits, Metrics, Exports — **DONE/PARTIAL**.
- **Final UI polish:** InlineError shows `correlation_id`; skeletons match final layout; touch targets ≥24px; RTL‑safe icons; **zero console warnings** (fonts) — **TODO**.
- **Performance:** confirm `content-visibility`, lazy images, code‑split heavy pages — **DONE/PARTIAL**.

### 27.6 Wiring & Contracts (must‑have)

- Add light **contract tests** (Pact‑style or schema assertions) for: Order detail ↔ `/api/orders/:id`, Invoice ↔ Signed URL, Horoscopes ↔ daily/media.
- Provide a unified **error map** on the frontend (503 providers, 401 auth, 403 RLS, 404 not found, 429 rate‑limited).

### 27.7 Environments & Secrets

- `SUPABASE_URL`, `SERVICE_ROLE_KEY`, `JWT_SECRET`, payment/WhatsApp/email providers, Twilio keys for voice/calls, per‑provider `HMAC_*`, `ALLOWED_WEBHOOK_IPS`.

### 27.8 Release Plan → v1.0

1. Close blockers (RBAC `role_code` + `/daily` 200[] + fonts).
2. Freeze schema (`007_payments.sql`, `008_notifications.sql`, `009_orders.sql`, `010_media.sql`, `011_audit.sql`, …).
3. E2E smoke: Orders→Payment→Invoice, Reader→Monitor→Deliver, Horoscopes daily public.
4. Tag & Release: attach `md/IMPLEMENTATION_SUMMARY.md` and run §25 validation snippets.

### 27.9 Post‑Launch

- **SLAs:** uptime 99.9%, API P95 < 400ms, order turnaround < 24h.
- **Rotations:** keys every 90 days; on‑call runbook; weekly purge >60d.

---

## 28) Hotfix Playbook (RBAC & `/daily` endpoint)

**A) `GET /api/profile/me`** → return `{ email, role_code }` from `profiles.role_id → roles.code` join.

**B) RoleGate/Profile** → prefer `role_code` from API; fallback to `user.app_metadata.role ?? 'client'`; after any sync call `supabase.auth.refreshSession()`.

**C) `GET /api/horoscopes/daily`** → always `200 []` when empty; query `scope='daily' AND approved_at IS NOT NULL AND ref_date=CURRENT_DATE`; add index `(ref_date, scope, approved_at)`.

**D) Fonts** → `preconnect` + `crossorigin` (or self‑hosted); `font-display: swap`.

---

## 29) QA / E2E Suites (what to automate)

- **Auth/RBAC:** sign‑in for each role → navigation visibility and hard denials.
- **Orders:** create → status transitions → deliver → invoice via short‑lived Signed URL that expires.
- **Horoscopes:** admin ingest → monitor approve → public daily returns today only.
- **Payments:** webhook HMAC (valid/invalid); 503 when provider missing.
- **Notifications:** respect per‑user prefs and per‑user/channel rate limits; WhatsApp adapter flows through M15.
- **Ops:** 429 headers present; metrics counters increase under load.

---

## 30) Nice‑to‑Have (post‑v1.0 backlog)

- Dark‑intensity toggle for visual sensitivity (same theme, lower intensity option).
- Client self‑service export (time‑bound Signed URL).
- Monthly PDF management reports.
- Internal reader quality dashboard.

---

## 31) Client Journey — Real Data (Service↔Reader, Scheduling, Instant, Emergency)

> **Goal:** lock the exact client experience with **no mocks** — all UI uses real APIs. Any new service must be added via **Admin → Services** (not hard‑coded).

### 31.1 Flow A — Service → Reader → Schedule
1) Home → **Services** → choose service → **Select**.
2) (Optional) pick **Reader**.
3) Choose **Mode** = Reading/Calling; choose **Flow** = Scheduled.
4) Pick **Date** & **Time** (timezone‑aware) from availability.
5) **Checkout** → `POST /api/orders` → `POST /api/payments/intent` → success → **Order Detail**.

### 31.2 Flow B — Reader → Service → Schedule
1) Home → **Readers** → pick reader (see **Online** badge).
2) Choose **Service** with that reader.
3) Choose **Mode = Reading/Calling**; **Flow = Scheduled**.
4) Pick **Date/Time** → **Checkout** → Pay → **Order Detail**.

### 31.3 Flow C — Instant Service (Reader Online)
1) Home/Readers → reader has **Online**.
2) Choose **Instant** flow; if Calling, session starts right after payment; if Reading, instant session opens.
3) **Checkout** (quick) → Pay → session starts immediately.

### 31.4 Flow D — Emergency Call (Forced Pickup)
1) Reader page → **Emergency Call**.
2) Warning dialog (pricing + terms) → **Pay** (pre‑auth) → `POST /api/calls/initiate?emergency=1`.
3) Reader must pick up immediately (monitor can force‑drop other call). All events recorded.

### 31.5 Checkout — Field Spec (FE)
- `{ service, reader, mode (reading|calling), flow (scheduled|instant|emergency), date, time, timezone, questions, contact_phone?, consent_18+, notif_channel }`.
- Validation: required pairs (date+time for scheduled), phone for calling when needed, consent_18+.

### 31.6 Delivery & Invoice
- Order Detail shows status & timeline; delivery via short‑lived **Signed URLs**.
- Invoice PDF via `GET /api/payments/invoice/:order_id` (≤15m); client may reissue link.

### 31.7 Admin‑Only Surface
- **Admin → Services** to add/edit/deactivate services.
- **Admin/Monitor** dashboards unchanged; emergency siren/force‑drop handled under Calls.

---

