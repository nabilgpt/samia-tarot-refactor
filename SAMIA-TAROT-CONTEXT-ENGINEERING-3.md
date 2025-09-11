# SAMIA-TAROT — Context Engineering (Master Prompts Pack v3)
**File**: SAMIA-TAROT-CONTEXT-ENGINEERING-3.md  
**Version**: v1.1 (regenerated)  
**Scope**: Authoritative prompts from **M21 → M29** to complete the project.  
**Rule**: Every prompt **must** begin with the Read-First block. No UI/theme changes. Keep code **maintainable & short**.

---

## Read-First (inserted at the top of every prompt)
Before doing anything, first read and strictly comply with:
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md
and
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md
Do not proceed unless alignment is confirmed.

Global reminder: Do **NOT** touch or change the global theme/UX. Build backend/DB only. Keep the code **maintainable & short**.

---

## M21 (Moderation & Audit)
“Before doing anything, first read and strictly comply with:
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md
and
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md
Do not proceed unless alignment is confirmed.

Global reminder: Do **NOT** touch or change the global theme/UX. Build backend/DB only. Keep the code **maintainable & short**.

Goal (M21): Ship a robust **Moderation & Audit** layer: block/unblock, case taxonomy, escalation and appeals, **tamper-evident audit trail** (hash-chained + signed periodic exports), automated anomaly sweeps — all with **DB-first RLS** and OWASP-aligned logging.

Scope:
- Data & RLS (no UI changes):
  * Use/extend: `moderation_actions`, `audit_log`, linkages to `orders`, `media_assets`, `calls`.
  * RLS: Monitor/Admin/Superadmin full moderation visibility; Readers/Clients restricted to own scope; public = none.
  * Taxonomy: normalized reasons (harassment, abuse, fraud, copyright, safety, …) + severity.
  * Appeals: `appeals(id, subject_ref, opened_at, decided_at, decision, decided_by, notes)`.
  * Audit integrity: **append-only** `audit_log` with `prev_hash`, `row_hash`; **monthly signed export** (detached signature).
- Endpoints (JWT, deny-by-default):
  * POST /monitor/block-user | POST /monitor/unblock-user — reason, duration, evidence refs.
  * POST /monitor/moderate/order/:id — actions (hold, unlist, remove_media, escalate), reason/evidence.
  * GET /monitor/cases — queue (pending + auto-sweeps).
  * POST /monitor/appeals/:id/open | /resolve — decision + rationale.
  * GET /admin/audit — filterable; POST /admin/audit/attest — signed snapshot.
  * POST /monitor/lineage/recompute — rebuild order↔media↔calls evidence.
- Automated sweeps (jobs): nightly rules for abnormal reject rates, refund loops, high call-drop %, payment fallback spikes, spam/bulk orders.
- Logging: **no PII/OTP/tokens**; concise fields only; sanitized errors.
- Retention: fixed windows for audit/moderation/appeals; auto-purge on schedule.
Deliverables: minimal handlers; RLS+guards parity; audit integrity mechanism; tests (`test_m21_moderation_audit.py`); docs (`MODERATION_AUDIT_README.md`).
Acceptance: RLS isolation; tamper-evident + signed audits; working appeals; sweeps produce cases; zero theme changes.”

---

## M22 (Notifications & Campaigns)
“Before doing anything, first read and strictly comply with:
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md
and
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md
Do not proceed unless alignment is confirmed.

Global reminder: Do **NOT** touch or change the global theme/UX. Build backend/DB only. Keep the code **maintainable & short**.
Goal (M22): Implement **Notifications & Campaigns** with per-TZ scheduling, consent/opt-in-out discipline, suppression lists, proofs, and minimal analytics — fully aligned with FCM/APNs push standards and Twilio SMS/WhatsApp compliance.

Scope:
- Channels & Providers:
  * Push: **FCM** (Android/Web) and **APNs** (iOS); follow HTTP/2/TLS requirements and FCM HTTP v1.  
  * Messaging: **Twilio SMS & WhatsApp**; enable standard **STOP/UNSTOP/HELP** and **Advanced Opt-Out** as needed.
- Data Model:
  * `notifications` (single events), `campaigns` (bulk), `audiences`, `sends`, `bounces`, `suppressions`, `consents`.  
  * Store provider message IDs and delivery states; no PII payloads in logs.
- Consent & Compliance:
  * Per-channel **opt-in/opt-out** flags; record lawful basis; support **quiet hours** by **timezone cohorts** (reuse M18A cohorts).  
  * Enforce suppression on complaints/hard-bounces automatically; admin can add manual suppressions.
- Targeting:
  * By role, country, engagement segments (e.g., last-7-day listeners), and “daily zodiac push” hook to M18A seeding.
- Scheduling & Delivery:
  * Cron-like jobs per **TZ cohort**; retries with backoff; idempotent send ops; request-scoped audit entries.  
  * Track delivery/open/click when supported by the provider.
- RLS/Guards:
  * Users can view **their own** notification history; Admin/Superadmin aggregate stats; Monitor can view escalations only.  
  * Deny-by-default; DB-first policies with route-guard parity.

Endpoints (JWT, deny-by-default):
- `POST /admin/campaigns` — create campaign (metadata, audience, channel, schedule window).  
- `POST /admin/campaigns/:id/schedule` — activate; compute TZ cohort runs; idempotent.  
- `GET /admin/campaigns/:id/stats` — aggregates (sends/delivered/open/click/bounce/opt-out).  
- `POST /me/notifications/opt-in` | `POST /me/notifications/opt-out` — per-channel updates.  
- `GET /me/notifications` — user’s own sends (last N).  
- `POST /admin/suppressions` — add/remove suppression entries.

Validation & Security:
- Enforce **consent** before send; block if user opted-out; respect **quiet hours**.  
- Use provider **HMAC/signature verification** for webhooks; store only message IDs/state.  
- Logs: IDs/status/timestamps only; **no PII** or message bodies.

Deliverables:
1) Minimal, readable handlers for endpoints above.  
2) Provider adapters (FCM/APNs/Twilio) with signature/credential verification.  
3) Jobs: per-TZ scheduler, retries/backoff, suppression enforcement.  
4) Tests: `test_m22_notifications.py` — consent/opt-out, per-TZ sends, idempotent dispatch, webhook verification, suppression flows, RLS parity.  
5) Docs: `NOTIFICATIONS_README.md` — provider setup, cohort map, quiet hours, failure modes.

Acceptance Criteria:
- Campaigns send **only** to opted-in users; opt-outs honored instantly.  
- Per-TZ cohort scheduling works; no cross-TZ leaks; retries are idempotent.  
- Twilio/FCM/APNs webhooks/signatures verified; delivery states accurate.  
- Suppressions applied automatically on complaint/hard-bounce; manual overrides respected.  
- RLS prevents unauthorized reads; route-guards match DB policies.  
- Zero theme/UX changes.

Rollback Plan:
- Disable campaigns/scheduler; keep data intact.  
- Provider configs can be turned off via env/feature flags.  
- No destructive schema rollback required.

Reminder: Keep implementations concise and maintainable. Do not over-fragment files or introduce any theme/UI edits.”
---

## M23 (Analytics & KPIs)
“Before doing anything, first read and strictly comply with:
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md
and
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md
Do not proceed unless alignment is confirmed.

Global reminder: Do **NOT** touch or change the global theme/UX. Build backend/DB only. Keep the code **maintainable & short**.

Goal (M23): Deliver **Analytics & KPIs** via backend aggregates and query APIs (no UI work): fulfillment, payments, QoS for calls, engagement, content approval.

Scope:
- Events: compact server events (no PII) → `events_raw` with schema versioning.
- Aggregation: nightly jobs to roll-up into `metrics_daily_*` tables (materialized views allowed).
- KPIs (non-exhaustive): TTF-Response, TTF-Delivery, approval rate, refund rate, payment success by provider/country, fallback rate, call answer/drop %, DAU/WAU/MAU, retention cohorts, notification CTR, listen-through.
- Access: RLS — Admin/Superadmin wide; Monitor scoped to moderation-relevant; Reader scoped to own performance.
- APIs: GET /metrics/overview?date=…, GET /metrics/fulfillment, /payments, /calls, /engagement, /content.
- Privacy: minimize fields; keep IDs/hashes; retention windows for raw vs aggregates.
Deliverables: ETL jobs; aggregate tables/views; tests (`test_m23_analytics.py`); docs (`ANALYTICS_README.md`).
Acceptance: metrics compute correctly; RLS isolation; no PII leakage; zero theme changes.”

---

## M24 (Community — Optional, Feature-Flagged)
“Before doing anything, first read and strictly comply with:
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md
and
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md
Do not proceed unless alignment is confirmed.

Global reminder: Do **NOT** touch or change the global theme/UX. Build backend/DB only. Keep the code **maintainable & short**.

Goal (M24): Add **Community features** behind a feature flag (OFF by default): comments/reactions on delivered readings, with strict moderation & privacy.

Scope:
- Data: `comments`, `reactions`, `community_flags`.
- RLS: author sees own; reader/admin/monitor per policy; public = none unless explicitly approved (default OFF).
- Moderation: auto-queue to M21 pipeline; appeals supported.
- Privacy: no personal identifiers in payloads; redact media in flags.
- Feature Flag: /admin/features toggles; default OFF.
Endpoints: POST /community/comments, POST /community/reactions, GET /community/threads (scoped), POST /monitor/community/:id/moderate.
Deliverables: minimal handlers; tests (`test_m24_community.py`); docs (`COMMUNITY_README.md`).
Acceptance: isolation via flag; moderation works; zero theme changes.”

---

## M25 (Personalization — Internal AI Only)
“Before doing anything, first read and strictly comply with:
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md
and
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md
Do not proceed unless alignment is confirmed.

Global reminder: Do **NOT** touch or change the global theme/UX. Build backend/DB only. Keep the code **maintainable & short**.

Goal (M25): Implement **server-side personalization** (internal-AI only): ranking/suggestions for content ordering, **no AI text surfaced to clients**.

Scope:
- Inputs: past engagement (listen-through, notifications CTR), cohort, country, device.
- Outputs: ranked list of content IDs or notification candidates; confidence & rationale stored internally.
- Privacy: no PII in models; opt-out respected.
- Evaluation: offline A/B buckets; metrics only (no UI changes).
- RLS: Admin/Superadmin metrics; Reader sees own analytics; clients unaffected.
Endpoints: POST /personalization/recommend (internal), GET /personalization/metrics.
Deliverables: lightweight service; tests (`test_m25_personalization.py`); docs (`PERSONALIZATION_README.md`).
Acceptance: stable rankings; no client-visible AI text; KPIs measurable; zero theme changes.”

---

## M26 (AR Experiments — Optional)
“Before doing anything, first read and strictly comply with:
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md
and
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md
Do not proceed unless alignment is confirmed.

Global reminder: Do **NOT** touch or change the global theme/UX. Build backend/DB only. Keep the code **maintainable & short**.

Goal (M26): Prepare backend for **AR assets** experiments (optional): store/retrieve AR overlays/effects linked to readings, with no UI dependency.

Scope:
- Data: `ar_assets`, linking table to orders or horoscopes.
- Storage: private buckets + Signed URLs; lineage fields (sha256, bytes, duration/frame count).
- RLS: Admin/Superadmin manage; Reader read if linked to assigned orders; public = none.
Endpoints: POST /admin/ar/assets, GET /admin/ar/assets, POST /admin/ar/assets/link.
Deliverables: minimal handlers; tests (`test_m26_ar.py`); docs (`AR_README.md`).
Acceptance: secure storage; RLS parity; zero theme changes.”

---

## M27 (i18n Deepening)
“Before doing anything, first read and strictly comply with:
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md
and
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md
Do not proceed unless alignment is confirmed.

Global reminder: Do **NOT** touch or change the global theme/UX. Build backend/DB only. Keep the code **maintainable & short**.

Goal (M27): Deepen **i18n** coverage for Admin flows only (no theme changes): ensure AR/EN parity, with optional **auto-translate toggle** for admin-edited fields.

Scope:
- Data: extend translation tables; flag translatable fields; store `source_lang` + `auto_translated` markers.
- APIs: POST /admin/i18n/translate (batch), GET /admin/i18n/status.
- Quality: glossary and protected terms; admin review pipeline; do-not-translate rules.
- RLS: Admin/Superadmin only.
Deliverables: endpoints + docs (`I18N_README.md`); tests (`test_m27_i18n.py`).
Acceptance: AR/EN parity preserved; no theme changes.”

---

## M28 (Secrets & Providers Ops)
“Before doing anything, first read and strictly comply with:
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md
and
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md
Do not proceed unless alignment is confirmed.

Global reminder: Do **NOT** touch or change the global theme/UX. Build backend/DB only. Keep the code **maintainable & short**.

Goal (M28): Harden **Secrets management & Providers ops**: rotation, health checks, circuit breakers, and configuration hygiene.

Scope:
- Secrets: rotation schedule; versioned keys; least-privilege env scoping; no secrets in logs.
- Providers: liveness/readiness checks; backoff/retry; circuit breaker for repeated failures.
- Config: one place for provider toggles; safe defaults; immutable builds.
- Audit: record key rotations and provider state changes.
Endpoints: GET /admin/providers/health, POST /admin/providers/toggle, POST /admin/secrets/rotate (admin-gated).
Deliverables: ops scripts; tests (`test_m28_ops.py`); docs (`OPS_README.md`).
Acceptance: rotation works; health checks reliable; toggles effective; zero theme changes.”

---

## M29 (SRE & Cost Guards)
“Before doing anything, first read and strictly comply with:
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md
and
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md
Do not proceed unless alignment is confirmed.

Global reminder: Do **NOT** touch or change the global theme/UX. Build backend/DB only. Keep the code **maintainable & short**.

Goal (M29): Establish **SRE & Cost guards**: rate limits, quotas, budgets, alerting, and incident runbooks.

Scope:
- Rate limiting/Quotas: per IP/user/route; burst + sustained; safe error responses.
- Budgets: provider usage & storage/egress budget alarms; fallback to degraded modes.
- Observability: golden signals (latency, errors, saturation, traffic); tracing hooks.
- Incident: on-call rotation metadata, escalation matrix, runbooks (paginated), post-mortems.
- Backups/DR: snapshot policies; restore drills.
Endpoints: GET /admin/health/overview, GET /admin/budget, POST /admin/incident/declare.
Deliverables: configs & jobs; tests (`test_m29_sre_cost.py`); docs (`SRE_COST_README.md`).
Acceptance: protective limits enforced; budgets alert; DR drill documented; zero theme changes.”

---

**Notes**
- Every deliverable must preserve: **No theme/UX edits**, **short & maintainable code**, **idempotency where applicable**, **RLS first** with exact route-guard parity.
