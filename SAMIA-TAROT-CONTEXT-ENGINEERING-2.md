# SAMIA-TAROT — Context Engineering (Master Constraints & Orchestration)
**File**: SAMIA-TAROT-CONTEXT-ENGINEERING-2.md  
**Version**: v1.0 (Post-M18A policy baseline)  
**Prime Rule**: **Do NOT touch or change the global theme/UX**. Build backend/DB/services only. Keep code **maintainable & short**.  
**Language**: Prompts in this file are **English-only**. App remains bilingual (EN/AR) with no theme changes.

---

## 0) Purpose
This file is the **master constraints** & **orchestration spec** for daily horoscopes and adjacent services. Any coding agent must read and strictly comply with this file **before any work**. It complements SAMIA-TAROT-CONTEXT-ENGINEERING.md.

> **Read-first requirement (ALL prompts must begin with this):**  
> “Before doing anything, first read and strictly comply with:  
> C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md  
> and  
> C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md  
> Do not proceed unless alignment is confirmed.”

---

## 1) Authoritative Decisions (Daily Horoscopes — Admin-only)
- **Source of truth**: **Admin uploads original audio** (voice of Samia) — a monthly batch (12 signs). **No TikTok ingestion**. No scraping.  
- **Visibility**: **Public = today only** and only after **Monitor approval**. Older items become **non-public immediately** once a new day goes live.  
- **Retention**: Keep non-public items for **60 days**:  
  - **Admin**: full access (read/manage/delete).  
  - **Reader**: **listen-only** via **short-lived Signed URLs** (no permanent links).  
  After 60 days → **hard-delete** from **DB** and **Storage**.  
- **Access control**: **Postgres RLS first**, then route-guards (exact parity, deny-by-default).  
- **Storage**: **Supabase private buckets**; client playback via **Signed URLs** (time-limited).  
- **Timezones**: Orchestrate via **n8n** with **8–12 timezone cohorts**, each seeding at **local midnight**.  
- **Logging/Audit**: No PII/OTP/tokens in logs. **Audit** upload/approve/reject/delete/seeding/retention.  
- **Consent**: Maintain a **Consent Registry** entry for Samia’s voice usage (scope, start date, renewal, revocation path).

---

## 2) RLS & Policy Intent (plain language)
- **Public** may select `horoscopes` only when: `scope='daily'` **AND** `ref_date = today` **AND** `approved_at IS NOT NULL`.  
- **Reader** may select **last 60 days** (non-public) for review/training, but **audio access** is always via **server-issued short-lived Signed URLs**.  
- **Admin/Superadmin** full manage/read for ≤60 days, and may trigger archive/purge routines.  
- After **60 days**: records + media are **deleted** (not merely hidden).

> Implement these as **RLS policies** on `horoscopes` (and any linking tables), and mirror them at the API layer with explicit guards.

---

## 3) Orchestration Model (n8n)
- **Cohorts**: Define 8–12 regional TZ cohorts (e.g., GMT, CET, EET, IST, MSK, JST, AET, PST, EST…).  
- **Daily Seeding**: For each cohort at **local midnight**, **upsert** the 12 signs for `ref_date=today` as **pending** (idempotent).  
- **Monitor Gate**: Nothing becomes public until **approved**.  
- **Retention Job** (nightly): delete DB rows and Storage objects **older than 60 days**.  
- **Monthly Reminder**: T−3 days before the next month, remind Admin to upload the new batch.

---

## 4) Storage & Media Discipline
- Buckets are **private**.  
- Media playback uses **Signed URLs** (short-lived). No permanent public URLs.  
- Optionally allow JWT-authenticated downloads with RLS on `storage.objects` for internal tools.  
- On replace: update `audio_media_id`, keep lineage (`sha256`, `duration_sec`, `bytes`, `source_kind='original_upload'`).

---

## 5) Logging & Audit
- **Do not** log PII/OTP/tokens/URLs with sensitive query params.  
- Log: `req_id`, `actor_id`, `role`, `route`, `entity`, `entity_id`, `event`, `result`, `latency_ms`.  
- **Audit** entries for: upload, approve, reject, retention delete, and seeding actions.

---

## 6) Role Access Summary (Daily Horoscopes)
| Role          | Today (approved) | ≤60 days (non-public)               | >60 days |
|---------------|------------------|--------------------------------------|---------|
| Public/Client | Read (stream)    | No                                   | N/A     |
| Reader        | No               | Read (server-validated, Signed URLs) | No      |
| Admin         | No               | Full manage/read/delete              | No      |
| Monitor       | Approve/Reject   | Read (for review)                    | No      |
| Superadmin    | All of the above | All of the above                     | No      |

> “No” above 60 days means **data is deleted** (not archived indefinitely).

---

## 7) Acceptance & Tests (must hold Green)
- **RLS** enforced (deny-by-default) and **route-guards parity** confirmed.  
- **Public endpoint** never returns unapproved or non-today rows.  
- **Reader/Admin** access to ≤60-day items works **only** via **Signed URLs**.  
- **Retention** deletes DB rows + Storage objects older than 60 days.  
- **n8n** seeding at local midnight for each cohort; idempotent; no duplicates.  
- **Logging/Audit** present for all sensitive actions.

---

## 8) Prompts (verbatim, no code)
> **Each prompt must begin with the Read-first requirement at the top of this file.**  
> Global reminder in every prompt: *Do **NOT** touch or change the global theme/UX. Keep code maintainable & short.*

### M18A — Admin-only Daily Orchestrator (Seeding, TZ, Retention)
“Before doing anything, first read and strictly comply with:  
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md  
and  
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md  
Do not proceed unless alignment is confirmed.

Global reminder: Do **NOT** touch or change the global theme/UX. Build backend/DB only. Keep the code **maintainable & short**.

Goal (M18A): Ship an **Admin-only** daily horoscope pipeline: monthly admin uploads of original audio (12 signs), n8n seeding at **local midnight per timezone cohort**, strict Monitor approval before public visibility, and **60-day retention** with **hard-delete** after expiry.

Scope:  
- Orchestrator (n8n):  
  * **Daily Seeding** per cohort → upsert `(scope='daily', zodiac, ref_date)` as **pending** (idempotent).  
  * **Retention Job** nightly → remove DB rows and Storage objects older than 60 days.  
  * **Monthly Reminder** (T−3 days) for Admin to upload next batch.  
- API discipline: public endpoint returns **today+approved** only; Reader/Admin access to last-60-days gated by server and **Signed URLs**.  
- Security: RLS as primary guard; route-guards must match; no PII/secrets in logs; audit upload/approve/reject/delete.

Deliverables:  
1) n8n workflow exports (Seeding, Retention, Reminder).  
2) Minimal server endpoints/hooks for seeding & signed URL issuance (no UI changes).  
3) Tests: idempotency (no duplicates), approval gate, RLS parity, signed-URL discipline, retention deletion.  
4) Short runbook with TZ cohorts and failure/retry policy.

Acceptance:  
- Public API never exposes unapproved or non-today rows.  
- Reader/Admin access to ≤60-day items works via Signed URLs only.  
- Items >60 days are fully removed (DB + Storage).  
- Zero theme/UX changes.”

### M18A-Policy-Enforcement — RLS, Storage Access, Logging
“Before doing anything, first read and strictly comply with:  
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md  
and  
C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING-2.md  
Do not proceed unless alignment is confirmed.

Global reminder: Do **NOT** touch or change the global theme/UX. Build backend/DB only. Keep the code **maintainable & short**.

Goal: Enforce **DB-first access control** and **Storage discipline** for the daily horoscope pipeline.

Scope:  
- RLS: enable on `horoscopes` and relevant tables; write policies for (public today+approved), Reader 60-day read, Admin full manage; mirror in route-guards.  
- Storage: private buckets only; **server-issued Signed URLs** for media access; no permanent public URLs.  
- Logging/Audit: OWASP-aligned logs (no PII/secrets); compact audit for upload/approve/reject/delete.  
- Performance: add indexes for policy predicates (`scope, zodiac, ref_date`) and owner/role joins.

Deliverables & Acceptance:  
- Policies active and tested; unauthorized access fails at DB level; route-guards match.  
- Media is only reachable via Signed URLs; link-leakage tests pass.  
- Logs contain IDs/statuses only; audit trail complete.  
- Zero theme/UX changes.”

---

## 9) Future Hooks (for later modules)
- **M19 — Calls & Emergency**: Twilio-based call lifecycle (record/pause/resume/stop), siren hooks, monitor drop, permanent retention (admin delete only).  
- **M20 — Payments matrix**: country-based provider choice (Stripe/Square), failover, manual/USDT, wallet ledger, verified webhooks.  
- **M22 — Notifications**: daily zodiac push, status updates, promos (bilingual payloads).

---

## 10) Notes
- All code must be **short, maintainable**, and **idempotent** where applicable.  
- No UI/theme edits. No CSS/layout changes.  
- Read **this** file and the main context file **before any work**, always.
