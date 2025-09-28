
# SAMIA-TAROT — Context Engineering Protocol (Phase 4: Launch & Ops)

> **Agent**: AI Coding Agent (Runbook & Ops Finisher)  
> **Phase**: **M32 → M46** (Post–M31 Production Cutover)  
> **Prime directive**: Ship launch-grade **Ops, Compliance, Monitoring, Mobile packaging, AI-safety** while **preserving the existing cosmic/neon theme** and keeping all changes **maintainable & short**.

---

## 0) Non-Negotiable Guardrails

1) **Theme Preservation**: Absolutely **no** changes to the existing **cosmic/neon** theme or layout.  
   - If a *new* page/view is strictly required, **mirror the exact theme** (tokens, spacing, radii, neon accents, RTL parity).  
2) **AI Separation** (hard rule): AI readings and drafts are **internal to Readers/Admin/Monitor only**; **clients never see raw AI content**.  
3) **Security First**: RLS-parity between DB and route guards; zero over-privilege.  
4) **Minimal Surface**: Backend/DB first. Frontend: only surface hooks & links into existing components.  
5) **Maintainable & Short**: Fewer files, surgical diffs, documented acceptance checks.  
6) **Secrets**: **Never** hardcode. Load from dynamic admin-managed config.  
7) **Adults-Only**: Enforce 18+ access and country-aware payment gating.  
8) **Auditability**: Every sensitive action is logged; immutable trail is exportable.

9) **Pre-Execution Context Load**: Before executing **any** prompt, job, or module, the agent must **read** all master context files to synchronize constraints and guardrails. Abort if any is missing/out-of-date:
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-3.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-4.md`


---

## 1) Phase Scope & Outcomes

This protocol converts the M32–M46 roadmap into precise, testable **execution modules**. Each module has: **Goal → Deliverables → Acceptance → Notes**.  
Advance **sequentially**; stop after each module once acceptance passes.

### Prompt Preamble (Mandatory)
- Always **read** all master context files below before any action:
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-3.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-4.md`
- Do **not** change the theme; keep code **maintainable & short**.
- Enforce **AI separation** (no client exposure of drafts) and **RLS parity** at all times.



---

## M32 — Launch Runbooks & On-Call Activation

**Pre-Execution Requirement**: Before taking any action for this module, **read** all master context files below and load their guardrails. If any file is missing or appears out-of-date, **abort** and report:

`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-3.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-4.md`

**Goal**: Publish complete runbooks and activate 24/7 on-call with escalation.  
**Deliverables**
- `RUNBOOKS/` directory: *Deploy*, *Rollback*, *Incident SEV1-SEV3*, *Triage Checklist*, *Comms templates*, *Post-mortem template*.
- On-call rota & escalation: **Monitor → Admin → Super Admin**, quiet-hours exceptions for **Emergency Call**.
- Admin links: Runbooks are opened from Admin dashboard (no theme edits; reuse components).  
**Acceptance**
- Runbooks reviewed and linked. Test page triggers escalation end-to-end.  
**Notes**: Keep files concise; cross-link to SRE Golden Signals dashboards.

---

## M33 — Observability Dashboards & Alert Rules (Golden Signals → SLOs)

**Pre-Execution Requirement**: Before taking any action for this module, **read** all master context files below and load their guardrails. If any file is missing or appears out-of-date, **abort** and report:

`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-3.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-4.md`

**Goal**: Golden Signals dashboards with SLOs and alert rules.  
**Deliverables**
- Latency/Traffic/Errors/Saturation dashboards per service.
- SLO definitions (e.g., p95 latency, error rate), alert policies, budget-burn (FinOps) for provider cost/model usage.
- Admin link: “Observability” landing.  
**Acceptance**
- Dashboards show real data; synthetic events trigger alerts; SLO page accessible from Admin.  
**Notes**: Prefer black-box checks for client journeys; avoid noisy alerts.

---

## M34 — Backups, Disaster Recovery & GameDays

**Pre-Execution Requirement**: Before taking any action for this module, **read** all master context files below and load their guardrails. If any file is missing or appears out-of-date, **abort** and report:

`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-3.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-4.md`

**Goal**: Encrypted automated backups, restore drills, DR runbooks, and quarterly GameDays.  
**Deliverables**
- Nightly full + hourly incremental/WAL; 30-day retention; integrity checks.
- DR tiers with RPO/RTO; Regional failover checklist.
- GameDay scripts: DB loss, provider outage, storage failure.  
**Acceptance**
- Restore validated on staging; GameDay passes with documented timings.

---

## M35 — E2E Test Suite V2 + Synthetic Monitoring

**Pre-Execution Requirement**: Before taking any action for this module, **read** all master context files below and load their guardrails. If any file is missing or appears out-of-date, **abort** and report:

`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-3.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-4.md`

**Goal**: Expand E2E to all critical journeys and add uptime synthetics.  
**Deliverables**
- Flows: signup (social + OTP), booking (all services), payments (Stripe/Square/USDT/manual), **Emergency Call**, AI-separation, Reader tools, Admin approvals, Monitor join/flag.
- Synthetics: login, checkout, emergency route, API health.  
**Acceptance**
- >90% coverage of critical paths; nightly CI green; synthetics visible in dashboards.

---

## M36 — Performance Hardening & Web Vitals

**Pre-Execution Requirement**: Before taking any action for this module, **read** all master context files below and load their guardrails. If any file is missing or appears out-of-date, **abort** and report:

`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-3.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-4.md`

**Goal**: Meet Core Web Vitals on mobile/desktop.  
**Deliverables**
- Lighthouse ≥90; p75 LCP ≤2.5s; INP ≤200ms.
- CDN & image optimization; code-split; prefetch critical data; bundle budget.  
**Acceptance**
- Performance budget gates in CI; report attached to release artifacts.

---

## M37 — Accessibility (WCAG 2.2 AA) & i18n Polish

**Pre-Execution Requirement**: Before taking any action for this module, **read** all master context files below and load their guardrails. If any file is missing or appears out-of-date, **abort** and report:

`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-3.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-4.md`

**Goal**: Achieve **WCAG 2.2 AA** and finalize full EN/AR parity with RTL.  
**Deliverables**
- Fix focus order, keyboard traps, aria roles/labels, contrast.
- 100% localization of pages/tooltips/modals; preserve field data across language switching.  
**Acceptance**
- Automated a11y tests pass; manual audit OK; i18n parity checklist at 100%.

---

## M38 — Legal/Compliance & 18+ Enforcement

**Pre-Execution Requirement**: Before taking any action for this module, **read** all master context files below and load their guardrails. If any file is missing or appears out-of-date, **abort** and report:

`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-3.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-4.md`

**Goal**: Finalize ToS/Privacy (AR/EN), consent flows, retention, adults-only gates.  
**Deliverables**
- Age gate 18+, country-aware disclosures; cookie/consent banner.
- Export/Delete requests UX wired to backend jobs; admin approval & audit logs.  
**Acceptance**
- Legal pages live; rights requests tested; immutable audit checks pass.

---

## M39 — Mobile Packaging & Store Submission (Android/iOS)

**Pre-Execution Requirement**: Before taking any action for this module, **read** all master context files below and load their guardrails. If any file is missing or appears out-of-date, **abort** and report:

`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-3.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-4.md`

**Goal**: Store-ready builds, metadata, screenshots, privacy manifests, CI release pipelines.  
**Deliverables**
- App icons/splash/adaptive icons; deep links; notification permissions.
- CI jobs for beta/prod; Play Console & App Store Connect checklists; privacy labels/data-safety entries.
- Store metadata (EN/AR), screenshots (mobile/RTL).  
**Acceptance**
- Beta tracks live; submission checklists all green.

---

## M40 — Reader Availability, Emergency Call Finalization & Monitor Flows

**Pre-Execution Requirement**: Before taking any action for this module, **read** all master context files below and load their guardrails. If any file is missing or appears out-of-date, **abort** and report:

`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-3.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-4.md`

**Goal**: Enforce reader instant-availability windows (admin-approved), finalize **Emergency siren**, and Monitor join/flag UX.  
**Deliverables**
- Constraint: Reader can’t flip unavailable during approved instant-call window unless **on a call**.
- Siren: persistent, overrides silent, escalates to admin if unanswered; all events logged.
- Monitor: silent join, flag categories, full audit trail.  
**Acceptance**
- E2E covers edge cases; audit/reporting views reflect all events.

---

## M41 — AI Live Monitoring & Safety Guardrails

**Pre-Execution Requirement**: Before taking any action for this module, **read** all master context files below and load their guardrails. If any file is missing or appears out-of-date, **abort** and report:

`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-3.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-4.md`

**Goal**: Real-time AI moderation over calls/chats with human-in-the-loop escalation.  
**Deliverables**
- Streaming analysis; thresholds; auto-flags; PII redaction in transcripts.
- Escalation to Monitor/Admin; incident tickets; retention controls.
- Strict **client-no-AI-drafts** enforcement.  
**Acceptance**
- Simulated incidents trigger correct escalations; logs retained and reviewable.

---

## M42 — Payments Final QA & Regionalization Rules

**Pre-Execution Requirement**: Before taking any action for this module, **read** all master context files below and load their guardrails. If any file is missing or appears out-of-date, **abort** and report:

`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-3.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-4.md`

**Goal**: Lock country-based payment gating, proof-of-payment uploads, admin approvals, and USDT flows.  
**Deliverables**
- Country filters per method; manual transfer evidence upload & approval queue.
- Refunds/voids; wallet top-ups history & reconciliation.  
**Acceptance**
- E2E green across all payment paths; finance reports reconcile to transactions.

---

## M43 — Data Freeze, RLS Parity Re-Validation & Archival

**Pre-Execution Requirement**: Before taking any action for this module, **read** all master context files below and load their guardrails. If any file is missing or appears out-of-date, **abort** and report:

`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-3.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-4.md`

**Goal**: Execute pre-launch data freeze; re-validate route↔RLS parity; archive legacy data.  
**Deliverables**
- Schema lock; run parity validator; purge/anon test users; archive old logs with retention notes.  
**Acceptance**
- 100% parity confirmed; clean prod dataset; sign-off recorded.

---

## M44 — Daily Zodiac Pipeline → Production

**Pre-Execution Requirement**: Before taking any action for this module, **read** all master context files below and load their guardrails. If any file is missing or appears out-of-date, **abort** and report:

`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-3.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-4.md`

**Goal**: Turn on automated daily zodiac flow (TikTok voice style → AI text → TTS → homepage/audio cards).  
**Deliverables**
- Scheduler, retries, content QA hooks for Readers; label internal drafts **“Assistant Draft – Not for Client Delivery”**.
- Storage/CDN; midnight (Asia/Beirut) cache invalidation.  
**Acceptance**
- 12/12 signs publish daily; audio cached (<300ms); complete audit log.

---

## M45 — Admin/Super-Admin Guardrails & Full Audit Trails

**Pre-Execution Requirement**: Before taking any action for this module, **read** all master context files below and load their guardrails. If any file is missing or appears out-of-date, **abort** and report:

`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-3.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-4.md`

**Goal**: Enforce: Admins cannot create Super Admins; Admins edit users but cannot delete; only Super Admin deletes.  
**Deliverables**
- UI gating + backend policy; immutable change-log (who/when/what) for all role/permission edits.  
**Acceptance**
- Attempted violations blocked and logged; audit exports available.

---

## M46 — Documentation, Handover & Close-Out

**Pre-Execution Requirement**: Before taking any action for this module, **read** all master context files below and load their guardrails. If any file is missing or appears out-of-date, **abort** and report:

`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-3.md`
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-4.md`

**Goal**: Final system docs & role quickstarts; Day-2 Ops guide.  
**Deliverables**
- `/docs` index linking ERDs, API reference, Ops runbooks, SLOs, a11y/i18n, legal, payments, emergency, AI-safety.
- QuickStart for **Client/Reader/Admin/Monitor** (EN/AR); known-issues; V2 roadmap; support contacts.
- PDF export.  
**Acceptance**
- Docs accessible from Admin; exports generated; handover sign-off complete.

---

## 2) Operating Protocol

- **Module loop**: *Think → Act → Verify → Stop*. Don’t advance until acceptance is green.  
- **Safe-Edit**: read → anchor → surgical patch; smallest viable diff.  
- **No theme changes**. Any new view = exact visual parity (including dark/RTL).  
- **RBAC + RLS parity**: route guard policy must match DB RLS; re-validate at M43.  
- **Evidence**: attach test artifacts (CI job IDs, screenshots, logs) to each module’s PR.

---

## 3) Acceptance Checklist (per module)

- Deliverables complete & linked from Admin where applicable.  
- E2E tests green; synthetics and alerts visible for Ops modules.  
- Role/permission gates enforced; audit trails captured.  
- No regressions to performance, a11y, RTL/i18n, or theme visuals.

---

## 4) External Standards & Controls (for reference)

- **Golden Signals (SRE)**: Latency, Traffic, Errors, Saturation.  
- **OWASP WSTG**: comprehensive web security testing framework.  
- **HTTP 429 + Retry-After**: standard rate-limit response semantics.  
- **WCAG 2.2 AA**: accessibility success criteria and guidance.  
- **NIST SP 800-34**: contingency planning, RPO/RTO, DR drills.  
- **Circuit Breaker Pattern**: resilience for unstable dependencies.  
- **Store Compliance**: Google Play **Data safety** form & Apple **Privacy labels**.

> Use these only as **implementation references**—do not copy text verbatim into client-visible UI.

---

## 5) Close Conditions for Phase 4

- All M32–M46 acceptances signed-off.  
- Production dashboards/alerts stable for 7 days with no SEV-1.  
- Store submissions accepted (beta → prod).  
- Docs published; on-call live; GameDay #1 scheduled.

**Exit**: Tag release `v1.0.0` and prepare **Phase 5** (post-launch growth & analytics).

---

# Phase 4.1 — Automation Integrations (Items 1–11)

> **Tools Layout**: **n8n** = Ops backbone (webhooks, schedules, approvals, alerts) · **Dify** = AI-native production layer (agents/workflows/RAG/observability) · **sim.ai** = Lab/Gates for fast prototyping + **Evals**.  
> **Theme**: Do **not** touch the cosmic/neon theme. Any new admin link/widget must mirror the current design. Keep code **maintainable & short**.

## A) Project-Wide Matrix (1–11)

| # | Flow / Capability | Primary Tooling | What It Automates | Acceptance (Evidence) |
|---|-------------------|-----------------|-------------------|------------------------|
| 1 | **Booking & Availability** | n8n (+ DB constraints) | Webhooks `availability.probe`, `booking.hold`, `payment.confirm`; provisional holds (TTL); cleanup; reminders | Two concurrent bookings for same slot → exactly one succeeds (DB constraint). Retries with same idempotency key never double-charge. |
| 2 | **Payments (Cards/USDT/Manual)** | n8n | Unified capture path; idempotency; manual-transfer approval queue (Slack/Email) | Manual approvals logged; duplicate POST does not create duplicate charge. |
| 3 | **Emergency Call & Reader Availability Windows** | n8n | Escalation policy (Monitor→Admin→Super Admin); enforced instant-availability windows | Siren + full escalation trace visible; policy block is enforced. |
| 4 | **Daily Zodiac Pipeline (M44)** | n8n + Dify | Scheduler (Asia/Beirut midnight) + CDN cache; Dify guards content/audio before publish | 12/12 signs published daily; failed guard halts publish with alert. |
| 5 | **Incidents & Observability** | n8n | Ingest alerts → open incident tickets; paging/on-call rotation; runbook links | Alerts map to SLOs; paging works end-to-end; ticket contains runbook links. |
| 6 | **Rate-Limit & Backoff** | n8n + API policy | Return 429 + `Retry-After`; orchestrate retries with backoff | Reduced client errors under bursts; consistent retry behavior. |
| 7 | **Backups & DR (PITR)** | n8n + DB jobs | Nightly full + WAL; restore drills; GameDay scripts | Proven restore to a point-in-time on staging within targets. |
| 8 | **DSR / Privacy (Export/Delete)** | n8n | Orchestrate data export/delete with approvals and immutable audit | DSRs fulfilled within SLA; full audit trail. |
| 9 | **Stores (Android/iOS)** | n8n | Beta→Prod pipelines; metadata/checklists reminders | Store checklists green; artifacts archived. |
|10 | **Comms (Slack/Email/SMS)** | n8n | Channelized notifications per event severity/role | Every critical event posts with structured metadata. |
|11 | **Analytics & KPIs** | n8n | Emit booking/payment/incident events to analytics; tie to SLOs | Dashboards show MTTR, double-booking rate=0, payment first-pass success↑. |

## B) Booking Workflow — Operational Spec

**Objective**: Zero double-booking, safe retries, and clear compensation path without touching client UI.  
**Design**  
1) **Probe**: `availability.probe` webhook → DB/calendar check → return authoritative slots.  
2) **Provisional Hold (TTL)**: Create `reservation` with expiry; propagate a single **Idempotency-Key** across all client→server→PSP calls.  
3) **DB Guard**: Enforce **unique/exclusion** constraint on `(reader_id, timeslot/tsrange)` to atomically block overlaps.  
4) **Payment**: Use the same idempotency key for PSP POSTs (cards/USDT). Manual transfers route to **Approval Queue** (n8n).  
5) **Confirm / Compensate**: On success → confirm; on fail/timeout → release (compensating step); notify user.  
6) **Reminders**: n8n schedules reader/client reminders; emergency escalation if reader no-shows.  
7) **AI Separation**: Dify runs **internal** QA/Policy guards (tone, safety, no AI-draft exposure). **sim.ai** hosts pre-production gates (Evals) before promotion.

**Acceptance**  
- Race test: 2 concurrent holds → exactly one `confirmed`, one `rejected_by_constraint`.  
- PSP retry test: duplicate POST with same idempotency → single charge recorded.  
- Manual transfer: evidence → approval/decline logged; booking state transitions consistent.

## C) API Rate-Limit & Backoff Policy

- Public APIs must return **HTTP 429 + Retry-After** under throttling.  
- n8n orchestrates **exponential backoff with jitter** for downstream retries.  
- Add synthetic load tests; track error-budget burn on related SLOs.

## D) Backups & DR (PITR)

- Nightly full + **WAL archiving**; 30-day retention.  
- Quarterly **restore drill** to staging; record RPO/RTO; GameDay scenarios: DB loss, provider outage, storage failure.

## E) DSR / Privacy Flows

- **Export** and **Delete** orchestrated by n8n with admin approvals and immutable audit.  
- Surface status to Admin dashboard (no theme change—reuse existing components/links).

## F) Stores Automation

- n8n pipelines for Beta→Prod; reminders for privacy forms (Play Data Safety / Apple Privacy).  
- Archive store artifacts (screenshots/metadata) per release.

## G) Communications & Analytics

- Standardize event payloads for Slack/Email/SMS; severity-based routing.  
- Emit analytics events for booking, payment, incidents, moderation decisions; tie to SLO dashboards.

---

# Phase 4.2 — Module Annotations (M32→M46 + Automation Hooks)

> لكل موديول، أضفنا **Automation Hooks** تشير للعنصر/العناصر من المصفوفة أعلاه (1–11).

## M32 — Launch Runbooks & On-Call
**Automation Hooks**: (5,10,11) — Incident intake via n8n; paging & comms templates; analytics on incident lifecycle.

## M33 — Observability Dashboards & Alert Rules
**Automation Hooks**: (5,11,6) — SLO-linked alerts; burn-rate alerting; 429/backoff test runs as synthetic scenarios.

## M34 — Backups, DR & GameDays
**Automation Hooks**: (7) — n8n schedules backups, restore drills, and GameDay scripts with evidence export.

## M35 — E2E Test Suite V2 + Synthetics
**Automation Hooks**: (1,2,3,4,6) — Synthetic probes for booking hold/confirm, payment idempotency, emergency escalation, zodiac publish, and 429/backoff.

## M36 — Performance Hardening & Web Vitals
**Automation Hooks**: (11,6) — Emit perf events; throttle simulations to validate backoff behaviors.

## M37 — Accessibility & i18n
**Automation Hooks**: (10) — Notification templates (EN/AR) validated; no UI/theme changes.

## M38 — Legal/Compliance & 18+
**Automation Hooks**: (8) — DSR flows with approvals/audit; adults-only gate checks in synthetics.

## M39 — Mobile Packaging & Store Submission
**Automation Hooks**: (9,10,11) — Store pipelines, privacy reminders, release analytics.

## M40 — Reader Availability, Emergency & Monitor
**Automation Hooks**: (1,3,10,11) — Availability windows enforcement; emergency siren escalation; comms & analytics.

## M41 — AI Live Monitoring & Safety
**Automation Hooks**: (10,11) — Internal alerts to Monitor/Admin only; analytics on flags/escalations (no client exposure).

## M42 — Payments QA & Regionalization
**Automation Hooks**: (2,10,11) — Payment gating by country; manual evidence approvals; finance analytics.

## M43 — Data Freeze, RLS Parity & Archival
**Automation Hooks**: (11) — Parity results emitted to analytics and stored as immutable reports.

## M44 — Daily Zodiac → Production
**Automation Hooks**: (4,10,11) — Scheduler, guards, CDN invalidation; pre-publish alert if guard fails; metrics on publish latency.

## M45 — Admin/Super-Admin Guardrails
**Automation Hooks**: (10,11) — Violation attempts generate internal alerts + audit analytics.

## M46 — Docs, Handover & Close-Out
**Automation Hooks**: (10) — Link all automation dashboards/runbooks/docs from Admin; notify on handover completion.

---

# Phase 4.3 — Rollout Strategy (Feature Flags)

- Use **short-lived release flags** for each automation stream (1–11).  
- Progressive rollout by cohort/service; remove flags post-stabilization to avoid drift.  
- Gate risky actions (publishing zodiac, emergency siren behavior, payment approvals) behind flags until E2E green.

---

# Phase 4.4 — Quality Gates & Evidence

- For each module and automation item, attach CI job IDs, synthetic screenshots, and logs to PRs.  
- SLO adherence and error-budget consumption must be visible in Admin Observability page (link only; no theme change).
