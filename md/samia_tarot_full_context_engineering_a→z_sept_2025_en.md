# SAMIA TAROT — Full Context Engineering (A→Z)

> English reference copy, ready to boot the project from zero. **Do NOT change the theme/UX. Keep code maintainable & short.** All sensitive flows are server‑led.

---

## 0) Non‑negotiables
- **Zero Theme Change**: never touch the global theme/UX. If a *new* page is created, it must match the existing theme.
- **Maintainable & short code** across all modules (small, composable, explicit contracts).
- **Server‑led security**: FastAPI is the gateway for sensitive logic & secrets.
- **Supabase**: Postgres + Auth + Storage (private). **RLS first** at DB layer.
- **Short‑lived Signed URLs** for any sensitive media (invoices, audio, results). Issued server‑side only.
- **Determinism**: same inputs ⇒ same outputs (esp. personalization).
- **Auditability**: append‑only logs with hash‑chaining for tamper evidence.
- **Token expiry + usage tracking** enabled (Supabase dashboard). Static CDN cache for **public** assets only; sensitive links remain short‑lived.

---

## 1) Stack
- **Frontend**: React/Next.js client **without changing the theme**; consumes APIs only.
- **Backend**: FastAPI (Python). Services: Payments, Notifications, Assist (internal), Moderation, Ops, DSR.
- **Database**: Supabase Postgres with strict **RLS**.
- **Auth**: Supabase Auth; phone/OTP via server if used.
- **Storage**: Supabase Storage (private buckets); Signed URL issuance on server.
- **Integrations**: Stripe (payments), SMTP/SMS/WhatsApp (pluggable), Twilio (calls), n8n (automations).
- **Observability**: /api/ops/health, /api/ops/snapshot, /api/ops/metrics (+ alerts).

---

## 2) Roles & Permissions
`client, reader, monitor, admin, superadmin`
- **client**: create orders, pay, view own deliveries & invoices via short Signed URLs.
- **reader**: receive assigned orders, upload results (no direct publish).
- **monitor**: approve/reject content & horoscopes; terminate calls; block users.
- **admin**: user admin, exports, notif templates/providers, rate‑limit configs.
- **superadmin**: full access including raw PII exports under legal basis.
> Enforce **least privilege**. Route guards must mirror DB‑level RLS.

---

## 3) Data Model (ER) & RLS (essentials)
**Core tables**: `profiles, services, orders, order_events, reader_results, media_assets, moderation_actions, audit_log, blocked_profiles, app_settings, api_rate_limits`.
**Horoscopes**: `horoscopes, horoscope_approvals` (public = today+approved only; internal ≤60d).
**Calls**: `calls, call_events`.
**Payments (M14)**: `payment_intents, payment_events, invoices, invoice_items, refunds`.
**Notifications (M15)**: `notif_templates, notif_prefs, notif_log`.
**Community (M24, flag)**: `posts, post_comments, post_reacts`.
**Analytics (M23)**: `events_raw, metrics_daily_*`.
**DSR (GDPR)**: `gdpr_requests`.
**WhatsApp (post‑M46)**: `whatsapp_contacts, whatsapp_threads, whatsapp_messages, whatsapp_optins`.

**RLS patterns**:
- client → `uid() = owner_id` row access only.
- reader → assigned slices; no cross‑tenant reads.
- monitor/admin → scoped reads/writes as needed.
- superadmin → elevated with audited access.

**Retention**:
- Horoscopes: internal history ≤60 days; >60d hard delete (DB+storage).
- Media & invoices: private buckets, minimal TTL Signed URLs; every issuance is audited.

---

## 4) API Surface (FastAPI)
**Auth & Verify**: `POST /api/auth/sync`, `POST /api/verify/phone` (rate‑limited).
**Meta**: `GET /api/meta/countries`, `GET /api/meta/zodiacs`, `POST /api/profile/complete` (computes zodiac).
**Orders**: `POST /api/orders`, `GET /api/orders/{id}`, `POST /api/orders/{id}/assign`, `POST /api/orders/{id}/result`, `POST /api/orders/{id}/approve|reject`, `POST /api/orders/{id}/deliver`.
**Horoscopes**: `POST /api/horoscopes/ingest` (admin‑only), `POST /api/horoscopes/{id}/approve|reject`, `GET /api/horoscopes/daily` (public: today only), `GET /api/horoscopes/{id}/media` (internal via Signed URL).
**Calls**: `POST /api/calls/schedule|initiate|terminate`, `POST /api/calls/webhook` (HMAC/IP allowlist).
**Payments (M14)**: `POST /api/payments/intent`, `POST /api/payments/webhook` (HMAC), `POST /api/payments/refund` (admin), `GET /api/payments/invoice/{order_id}` (Signed URL).
**Notifications (M15)**: `POST /api/notifs/send`, `POST /api/notifs/templates/upsert`, `GET/POST /api/notifs/prefs`.
**Assist (Internal)**: `POST /api/assist/draft|search|knowledge/upsert`.
**Moderation**: `POST /api/moderation/block|unblock|review`.
**Ops**: `GET /api/ops/health|snapshot|metrics`, `POST /api/ops/export`.

**Guards**: missing provider keys ⇒ **503** fail‑safe. Webhooks require HMAC verification; reject invalid signatures.

---

## 5) Core Workflows
1) **Order lifecycle**: client order → reader result → monitor approval → delivery (+ notifications on each transition).
2) **Daily horoscopes**: admin upload → monitor approve → public sees **today only** → retention jobs prune >60d.
3) **Calls**: schedule → initiate → terminate (monitor can drop). All events audited.
4) **Payments**: intent → webhook transitions → invoice PDF stored (private) → client fetch via short Signed URL.
5) **Notifications**: triggers on order state, payment outcomes, call reminders, emergency siren.
6) **DSR (GDPR)**: access/erasure requests with verification and grace periods.

---

## 6) Security & Compliance
- **Webhook signatures** verified + optional IP allowlist.
- **PII hygiene**: store provider IDs; mask exports by default; raw PII only for superadmin with legal basis.
- **Age gating (18+)**, COPPA safeguards, consent management.
- **Immutable audit** (hash‑chain). **Key rotation ≥90 days**. Central secret management.
- **Server‑issued Signed URLs** only; minimal TTL; every issuance logged.

---

## 7) Observability & Operations
- **Golden Signals**: latency, errors, traffic, saturation.
- **429 semantics**: include `Retry‑After`; export counters via `/api/ops/metrics`.
- **Alerts**: wire metrics to Email/Slack; thresholds aligned with SLOs.
- **Runbook**: examples for health/snapshot/metrics; migrations `python migrate.py audit|up`.
- **Synthetics**: minimal probes for daily horoscope endpoint and payments webhook reachability.

---

## 8) Automations (n8n / Dify)
- **Daily**: prune horoscopes (>60d), invoice cleanup, reset rate‑limit counters (if any).
- **Monthly**: TTL checks on Signed URLs, voice token refresh.
- **On‑event**: payment webhooks, call events, moderation decisions → audit log.
- **Emergency**: siren escalation via SMS/WhatsApp/Email.
- **Post‑M46**: WhatsApp channel workflows (inbound, reminders, payments follow‑ups, media) with opt‑in, 24h window & approved templates.

---

## 9) Interfaces & Dashboards (by role)
**Public**: Home/Explore (today‑only horoscopes), Pricing/Checkout.
**Client dashboard**: My Orders, Invoices (fetch via short Signed URLs), Notification Prefs.
**Reader dashboard**: Assigned Orders, upload results, manage call slots.
**Monitor dashboard**: Approval Queue, Call Control (terminate), Moderation.
**Admin dashboard**: Notif Templates/Providers, Ops Exports, DSR queue.
**Superadmin**: all of the above + lawful raw PII exports (audited).

---

## 10) Performance & Cost Policy
- Use CDN cache **only for public static assets**.
- Keep sensitive content behind short‑lived Signed URLs (no long cache).
- Measure with `/api/ops/metrics`; iterate cautiously.

---

## 11) Acceptance Checklists (high‑level)
- **RLS parity** proven via tests: unauthorized DB reads fail.
- **Horoscopes**: public endpoint returns only (scope=daily, approved=1, ref_date=today).
- **Signed URLs**: media/invoice access works only with valid short URL; expired links denied.
- **Payments**: 503 on missing env; webhook HMAC verified; refunds admin‑only; invoice PDF retrievable via Signed URL.
- **Notifications**: emit on state transitions; respect rate‑limits & prefs; 503 on missing providers.
- **Observability**: metrics exposed; alerts fire on SLO breaches; 429 returns `Retry‑After`.
- **Audit**: all sensitive actions logged; hash‑chain integrity verified in audit mode.

---

## 12) Runbook — Bootstrapping from Zero
1) Create Supabase projects (Prod + Sandbox). No PII in Sandbox.
2) Configure secrets (Stripe, SMTP/Twilio/WhatsApp) **on server only**.
3) Run `python migrate.py up` to apply idempotent DDL, RLS policies, seed minimal data.
4) Deploy FastAPI; connect with scoped Supabase keys.
5) Test Payments: intent → webhook (valid/invalid signature) → PDF invoice → fetch via Signed URL.
6) Seed notification templates; try `/api/notifs/test` (expect 503 if provider not ready).
7) Enable alerts & synthetics.
8) (Post‑M46) connect n8n + WhatsApp; use approved templates; respect 24h window.

---

## Appendix A — Role Guides
**Client**: place orders, pay, track status, fetch own invoices, set notification preferences.
**Reader**: pick up assigned work, upload results, manage availability/calls.
**Monitor**: gatekeeper for quality; approve/reject; terminate risky calls; moderate community when flag is ON.
**Admin**: manage templates/providers, exports, DSR processing, rate‑limit configs.
**Superadmin**: lawful PII exports; operational audits; emergency overrides.

---

## Appendix B — Engineering Prompts (M0 → M46)
> For **every prompt below**, prepend and enforce: **Read the master context first. Do NOT touch or change the global theme/UX. Keep code maintainable & short.** Prefer small, composable modules and explicit contracts.

**M0 — Project Bootstrap & Guardrails**
Goal: scaffold repo, env files, CI checks (black/ruff/mypy minimal), secrets via env, forbid theme edits.

**M1 — Architecture Skeleton**
Goal: FastAPI app factory, routers per domain, settings module, error middleware, 429 handler.

**M2 — Auth & Role Sync**
Goal: `/api/auth/sync` to mirror Supabase auth → profiles + roles; tests for RLS compatibility.

**M3 — Profile Completion**
Goal: `POST /api/profile/complete` computes zodiac, stores country/DOB with validation.

**M4 — Meta Endpoints**
Goal: countries & zodiacs endpoints, deterministic outputs, cache headers.

**M5 — Orders Create/Fetch**
Goal: create order, fetch own orders with RLS parity tests.

**M6 — Assignment Flow**
Goal: admin assigns order to reader; record `order_events`.

**M7 — Reader Result Upload**
Goal: upload media to private bucket; metadata saved; no public links.

**M8 — Monitor Approval**
Goal: approve/reject reader results; reasons recorded; notify on transitions.

**M9 — Delivery**
Goal: finalize order; generate delivery package; notify client.

**M10 — Storage & Signed URLs**
Goal: server‑issued short Signed URLs; audit issuance; TTL ≤ 15 min default.

**M11 — Rate Limits**
Goal: configurable per‑route limits; 429 with `Retry‑After`; metrics exported.

**M12 — Ops Endpoints**
Goal: `/api/ops/health|snapshot|metrics` with minimal runbook docs.

**M13 — Knowledge Base (Assist)**
Goal: KB upsert/search endpoints; internal AI draft endpoint (not user‑facing).

**M14 — Payments (Stripe)**
Goal: idempotent `007_payments.sql`; intent, webhook (HMAC verified), refund (admin‑only), invoice fetch via Signed URL; 503 on missing env; concise tests & runbook.

**M15 — Notifications**
Goal: `008_notifications.sql`; templates, prefs, send with rate‑limits; providers pluggable; 503 guard; triggers on order/payments/calls/emergency.

**M16 — Calls Scheduling**
Goal: schedule/initiate/terminate; Twilio webhook handshake (HMAC); availability checks.

**M17 — Twilio Security**
Goal: IP allowlist + signature verification; drop invalid callbacks; audit all events.

**M18 — Moderation**
Goal: review endpoint; decisions to `moderation_actions` + `audit_log`; block/unblock.

**M19 — Immutable Audit**
Goal: append‑only audit log with hash‑chaining; verification tool `migrate.py audit`.

**M20 — Daily Horoscopes Policy**
Goal: admin‑only ingest; monitor approve; public endpoint returns **today+approved** only; internal ≤60d; prune job; parity tests.

**M21 — Media Retention Jobs**
Goal: scheduled cleanup for old media/invoices; report summary to Ops.

**M22 — Admin Upload Policy**
Goal: enforce policy gates on uploads; reject unapproved sources; tests.

**M23 — Analytics & KPIs**
Goal: ingest `events_raw` → rollups `metrics_daily_*`; expose counters via metrics; zero PII.

**M24 — Community (Feature‑flag)**
Goal: posts/comments/reactions with strict RLS; OFF by default; moderation hooks.

**M25 — Personalization (Internal‑only)**
Goal: ID‑based feature vectors; deterministic rankings; 24h cache; strict opt‑out; server‑side only.

**M26 — DSR Services**
Goal: GDPR Article 15/17 export/deletion with verification, grace periods, and audit trail.

**M27 — Consent Management**
Goal: capture/manage consents; versioned texts; opt‑in/out recorded with timestamps.

**M28 — Privacy‑safe Exports**
Goal: masked exports by default; raw exports restricted to superadmin with legal basis; auditing.

**M29 — Rate‑limit Config Admin**
Goal: `api_rate_limits` table + admin config endpoints; hot‑reload limits.

**M30 — Alerts Wiring**
Goal: thresholds for golden signals + 429; email/slack integrations; test alerts.

**M31 — Synthetics**
Goal: minimal external probe for `horoscopes/daily` & payments webhook reachability.

**M32 — Mobile Packaging (Base)**
Goal: wire store metadata; privacy manifest; minimal versioning.

**M33 — Release & Crash Reporting**
Goal: channel strategy; crash reports feeding Ops alerts.

**M34 — Changelog Discipline**
Goal: automated CHANGELOG entries on deploy; semver alignment.

**M35 — Key Rotation**
Goal: rotate secrets ≥ every 90 days; track last rotation; smoke tests after rotate.

**M36 — Env Guards**
Goal: fail‑safe 503 when providers missing; clear error payloads; tests.

**M37 — Invoice Service**
Goal: deterministic PDF generator; private storage; Signed URL fetch; audit issuance.

**M38 — Legal/Compliance & 18+**
Goal: age gating, COPPA safeguards; compliance service for checks; block flows on failure.

**M39 — Mobile Packaging (Stores)**
Goal: finalize iOS/Android store deliverables; background task limits; network permissions minimal.

**M40 — Emergency/Siren**
Goal: escalation matrix (SMS/WhatsApp/Email); cooldowns; admin override; audit trail.

**M41 — Automations Matrix (n8n)**
Goal: daily/monthly/on‑event jobs defined and deployed; error alerts; retries.

**M42 — WhatsApp Channel (Blueprint)**
Goal: inbound trigger → parse → Supabase upsert; reminders respecting 24h window; payment follow‑ups via Stripe Payment Links; media via WhatsApp Media API or short Signed URLs. (Execute **post‑M46**.)

**M43 — Payment Links Follow‑ups**
Goal: generate/send Stripe Payment Links; reconcile status; n8n reminders.

**M44 — CDN Cache Policy**
Goal: cache only public static assets; never cache sensitive media; document TTLs.

**M45 — Token Expiry & Tracking**
Goal: enable personal access token expiry and usage tracking; monthly audit job.

**M46 — Acceptance E2E Suite**
Goal: end‑to‑end tests for critical flows (orders, payments, horoscopes, signed URLs, notifications, ops metrics) proving RLS parity and guards.

---

**End of document — print‑ready master reference.**

