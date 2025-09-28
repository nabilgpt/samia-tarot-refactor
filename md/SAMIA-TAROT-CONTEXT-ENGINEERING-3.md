# SAMIA-TAROT — Context Engineering (Master Prompts Pack v3)
**File**: SAMIA-TAROT-CONTEXT-ENGINEERING-3.md  
**Version**: v1.2 (with M30–M31)  
**Scope**: Authoritative prompts from **M21 → M31** to complete the project.  
**Rule**: Every prompt **must** begin with the Read-First block. No UI/theme changes. Keep code **maintainable & short**.

---

## Read-First (inserted at the top of every prompt)
Before doing anything, first read and strictly comply with:
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md
and
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md
Do not proceed unless alignment is confirmed.

Global reminder: Do **NOT** touch or change the global theme/UX. Build backend/DB only. Keep the code **maintainable & short**.


## M21 (Moderation & Audit)
“Before doing anything, first read and strictly comply with:
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md
and
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md
Do not proceed unless alignment is confirmed.

Global reminder: Do **NOT** touch or change the global theme/UX. Build backend/DB only. Keep the code **maintainable & short**.
Goal (M21): Ship a robust **Moderation & Audit** layer: block/unblock, taxonomy, appeals, **tamper-evident audit** (hash-chain + signed exports), anomaly sweeps — **DB-first RLS** and OWASP logging.

Scope: data (`moderation_actions`, `audit_log`, links), RLS (monitor/admin/superadmin full; others scoped), appeals table, append-only audit (prev_hash/row_hash), endpoints (block/unblock, moderate, cases, appeals resolve, admin/audit & attest, lineage recompute), nightly sweeps, logging w/o PII, retention windows.
Deliverables: minimal handlers; RLS parity; tamper-evident audits; tests `test_m21_moderation_audit.py`; docs `MODERATION_AUDIT_README.md`.
Acceptance: RLS isolation; signed audits; appeals; sweeps create cases; zero theme changes.”


---

## M22 (Notifications & Campaigns)
“Before doing anything, first read and strictly comply with:
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md
and
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md
Do not proceed unless alignment is confirmed.

Global reminder: Do **NOT** touch or change the global theme/UX. Build backend/DB only. Keep the code **maintainable & short**.
Goal (M22): Implement **Notifications & Campaigns** with per-TZ scheduling, consent/opt-in-out, suppression, proofs, minimal analytics — **FCM/APNs** for push and **Twilio SMS/WhatsApp** compliance.

Scope: channels (FCM/APNs, Twilio), data (`notifications`,`campaigns`,`audiences`,`sends`,`bounces`,`suppressions`,`consents`), consent + quiet hours (TZ cohorts), targeting (role/country/engagement + daily zodiac), scheduling/retries/idempotent, proofs, RLS (user own history; admin aggregates; monitor escalations).
Endpoints: create/schedule/stats campaigns; me/opt-in|opt-out; me/notifications; admin/suppressions.
Deliverables: minimal handlers + adapters, jobs, tests `test_m22_notifications.py`, docs `NOTIFICATIONS_README.md`.
Acceptance: opt-in respected; per-TZ works; webhooks verified; suppression honored; RLS parity; zero theme changes.”


---

## M23 (Analytics & KPIs)
“Before doing anything, first read and strictly comply with:
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md
and
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md
Do not proceed unless alignment is confirmed.

Global reminder: Do **NOT** touch or change the global theme/UX. Build backend/DB only. Keep the code **maintainable & short**.
Goal (M23): Backend **Analytics & KPIs** via aggregates and query APIs (no UI): fulfillment, payments, calls QoS, engagement, content approval.

Scope: `events_raw` (no PII) + nightly ETL to `metrics_daily_*`, KPIs list, RLS roles, endpoints `/metrics/*`, privacy & indexes.
Deliverables: ETL, views/tables, tests `test_m23_analytics.py`, docs `ANALYTICS_README.md`.
Acceptance: correct KPIs; RLS isolation; no PII; zero theme changes.”


---

## M24 (Community — Feature-Flagged)
“Before doing anything, first read and strictly comply with:
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md
and
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md
Do not proceed unless alignment is confirmed.

Global reminder: Do **NOT** touch or change the global theme/UX. Build backend/DB only. Keep the code **maintainable & short**.
Goal (M24): Comments/Reactions behind a **feature flag (OFF)**, strict moderation & privacy.

Scope: tables (`community_comments`,`community_reactions`,`community_flags`), flag `/admin/features`, M21 integration, RLS, retention jobs.
Endpoints: create/list/moderate; stats.
Deliverables: handlers, RLS parity, jobs, tests `test_m24_community.py`, docs `COMMUNITY_README.md`.
Acceptance: flag OFF hides surface; moderation & appeals work; zero theme changes.”


---

## M25 (Personalization — Internal AI Only)
“Before doing anything, first read and strictly comply with:
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md
and
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md
Do not proceed unless alignment is confirmed.

Global reminder: Do **NOT** touch or change the global theme/UX. Build backend/DB only. Keep the code **maintainable & short**.
Goal (M25): Server-side personalization (internal only): ranked IDs + confidence; **no AI text to clients**.

Scope: features (no PII), ranks, eval; APIs `/personalization/recommend`, `/personalization/metrics`; jobs; RLS; caching.
Deliverables: handlers, pipelines, tests `test_m25_personalization.py`, docs `PERSONALIZATION_README.md`.
Acceptance: stable rankings; opt-out honored; zero theme changes.”


---

## M26 (AR Experiments — Optional)
“Before doing anything, first read and strictly comply with:
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md
and
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md
Do not proceed unless alignment is confirmed.

Global reminder: Do **NOT** touch or change the global theme/UX. Build backend/DB only. Keep the code **maintainable & short**.
Goal (M26): Backend for **AR assets** (optional): secure storage & linking; no UI.

Scope: `ar_assets`, `ar_links`, private buckets + Signed URLs; RLS; endpoints upload/list/link; validation.
Deliverables: handlers, storage policies, tests `test_m26_ar.py`, docs `AR_README.md`.
Acceptance: secure storage; RLS parity; zero theme changes.”


---

## M27 (i18n Deepening)
“Before doing anything, first read and strictly comply with:
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md
and
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md
Do not proceed unless alignment is confirmed.

Global reminder: Do **NOT** touch or change the global theme/UX. Build backend/DB only. Keep the code **maintainable & short**.
Goal (M27): Admin-only AR/EN parity with **ICU MessageFormat**, optional auto-translate + human review.

Scope: translation tables, glossary protection, APIs `/admin/i18n/*`, RLS admin-only.
Deliverables: endpoints, tests `test_m27_i18n.py`, docs `I18N_README.md`.
Acceptance: parity preserved; ICU-compliant; zero theme changes.”


---

## M28 (Secrets & Providers Ops)
“Before doing anything, first read and strictly comply with:
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md
and
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md
Do not proceed unless alignment is confirmed.

Global reminder: Do **NOT** touch or change the global theme/UX. Build backend/DB only. Keep the code **maintainable & short**.
Goal (M28): Harden **secrets & providers ops**: rotation, health checks, **circuit breakers**, safe toggles, auditable changes.

Scope: secrets rotation, providers liveness/readiness + retry/backoff + breakers, single config surface, audit events, RLS (admin manage/monitor read).
Endpoints: `/admin/providers/health`, `/admin/providers/toggle`, `/admin/secrets/rotate`.
Deliverables: handlers, adapters, tests `test_m28_ops.py`, docs `OPS_README.md`.
Acceptance: rotation works; health reliable; toggles effective; zero theme changes.”


---

## M29 (SRE & Cost Guards)
“Before doing anything, first read and strictly comply with:
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md
and
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md
Do not proceed unless alignment is confirmed.

Global reminder: Do **NOT** touch or change the global theme/UX. Build backend/DB only. Keep the code **maintainable & short**.
Goal (M29): **SRE & Cost guards**: golden signals, rate limits/quotas (**429 + Retry-After**), budgets & alerts, incident runbooks.

Scope: limits/quotas (token bucket), breakers on providers, budgets (FinOps), observability & tracing hooks, backups/DR snapshot policies.
Endpoints: `/admin/health/overview`, `/admin/budget`, `/admin/incident/declare`.
Deliverables: configs, handlers, tests `test_m29_sre_cost.py`, docs `SRE_COST_README.md`.
Acceptance: limits enforced; budgets alert; DR drill documented; zero theme changes.”


---

## M30 (Go-Live Readiness & Compliance Pack)
“Before doing anything, first read and strictly comply with:
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md
and
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md
Do not proceed unless alignment is confirmed.

Global reminder: Do **NOT** touch or change the global theme/UX. Build backend/DB only. Keep the code **maintainable & short**.
Goal (M30): Deliver a production-ready **Go-Live & Compliance pack**: formal **DPIA**, **Data Map & Retention**, **Backup/DR** runbooks & drills, **OWASP WSTG**-aligned tests, and **Release/Rollback** checklist — backend-only with RLS parity.

Scope: DPIA, Data Map, retention & purge jobs, DR/BCP drills, WSTG security smoke, SRE gates (golden signals, 429 semantics), release engineering artifacts.
Deliverables: DPIA/DATA_MAP/RETENTION_MATRIX; DR_RUNBOOK + drills; test_m30_security_readiness.py; RELEASE_CHECKLIST/ROLLBACK_PLAN/POST_RELEASE_MONITORING.
Acceptance: DPIA approved; restore drill passes; tests green; alerts active; zero theme changes.”


---

## M31 (Production Cutover & D0–D7 Monitoring)
“Before doing anything, first read and strictly comply with:
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md
and
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md
Do not proceed unless alignment is confirmed.

Global reminder: Do **NOT** touch or change the global theme/UX. Build backend/DB only. Keep the code **maintainable & short**.
Goal (M31): Execute **production cutover** safely and run **D0–D7 monitoring**: pre-flight gates, staged flags, golden-signals alerts, budget guards, rollback — backend-only with strict RLS/route-guard parity.

Scope: gates (WSTG, RLS parity, DPIA sign-off, restore drill), staged rollout (cohorts 1–5%), rate limits (429 + Retry-After), breakers + degraded modes, budgets.
Deliverables: release ticket + tag `v1.0.0`, cutover checklist artifacts, D0–D7 notes, verification report.
Acceptance: dashboards live, alerts firing, staged rollout enforced, rollback ready; zero theme changes.”
