## ⬇️ FULL CONTEXT PROMPT (paste into Claude CLI)

**Agent**: Claude Code CLI — *Opus 4.1 (Plan Mode), fallback Sonnet 4*
**Prime Directive**: Build database, migrations, backend routes, services, and ops **without any visual changes** to the existing theme/design in the project. Wire the already-built front end cleanly to a solid backend and data layer.

### 0) Operating Rules (non-negotiable)

* **Zero theme drift**: Do **not** alter any existing styles or UI components. All work is “back-of-house.”
* **Code minimalism**: Keep the number of new files as low as possible (target ≤ 12 compact, clear files).
* **DB I/O**: **All** connect/migrate/execute/audit is done via **Python + psycopg2** against Supabase **Session Pooler** DSN.
* **Module loop**: Build one module at a time (Schema → Migrations → Auth/Verify → Orders → Ingestion → Astro → Calls → Moderation → Ops). After each module: run **Self-Verify** before moving on.
* **Safe-Edit**: Before editing any existing file: read it, pick a precise anchor, then perform a surgical edit.
* **No AI exposure to clients**: Any AI/trust signals (DeepConf/metrics) are **internal** to reader/monitor only; the client should not see them.

### 1) Environment

Set environment variables **before** any code:

```
# Database (Session Pooler – REQUIRED)
DB_DSN=postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres

# Supabase (optional if needed by frontend)
SUPABASE_URL=https://ciwddvprfhlqidfzklaq.supabase.co
SUPABASE_ANON=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpd2RkdnByZmhscWlkZnprbGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNDg4MTAsImV4cCI6MjA3MjgyNDgxMH0.YnLFjyQ-m3QzOZzmuKkDYOiXpqBXOPuaHgwoIZ5m5Zc
SUPABASE_SERVICE=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpd2RkdnByZmhscWlkZnprbGFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzI0ODgxMCwiZXhwIjoyMDcyODI0ODEwfQ.g6s6ximZccEgqgxN5nBoSMptkBgMS4zJIvuCGiXX5ew

# Phone verification (Twilio Verify)
TWILIO_ACCOUNT_SID=<set>
TWILIO_AUTH_TOKEN=<set>
TWILIO_VERIFY_SID=<set>

# TikTok Ingestion (if API used)
TIKTOK_CLIENT_ID=<set>
TIKTOK_CLIENT_SECRET=<set>
```

> Production secrets stay in server env, not in the repo.

### 2) Scope & Roles

* **Roles**: `superadmin, admin, reader, monitor, client`.
* **Monitor Powers**: can terminate/drop live call, approve/reject audio before it reaches client, **block** reader/client; **only admin** can unblock.
* **Services**: `tarot`, `coffee`, `astro (audio)`, `healing (call + pre-ritual)`, `direct_call`.
* **Horoscopes**: **Daily only** with **Samia’s TikTok voice**, visible after monitor approval.
* **Signup & Booking** (all mandatory): first/last name, email, country, phone, date of birth, marital status, gender.

  * **Optional**: place of birth, time of birth.
  * **Auto-fill**: `zodiac` from DOB; `country_code` from selected country.
  * Social login (Google/Apple/Facebook/Snapchat): on first login, force **complete profile** (all fields).
  * Verify **email + phone** (Supabase email; Twilio phone).
  * Countries list: **all** countries sorted by **dial code**; UI consumes this data **without** changing theme.

### 3) Module Plan (A→Z)

#### M1 — Schema (Postgres on Supabase)

Create idempotent tables/relations/constraints:

* `roles`, `profiles` (mirror of `auth.users` + extra: phone/dob/zodiac/country/country\_code/birth\_place/birth\_time/…)
* `services`
* `orders` (workflow: `new → assigned → in_progress → awaiting_approval → approved → delivered/rejected/cancelled`)
* `media_assets` (audio/image/pdf; signed/public URLs)
* `horoscopes` (**daily only**: `zodiac, ref_date, audio_media_id, tiktok_post_url, approved_by/at`)
* `calls`
* `moderation_actions`
* `phone_verifications`
* `audit_log`

Functions/Triggers:

* `calc_zodiac(date) -> text` + trigger on `profiles` to auto-populate `zodiac`.

Indexes & CHECK constraints for state integrity.

**RLS** after seeding:

* client: read/write own profile/orders/media.
* reader: read assigned orders, write results.
* monitor: read all + write moderation.
* admin/superadmin: full access.

#### M2 — Python/psycopg2 Migration Runner

Two small Python artifacts:

* `migrate.py` (pool + `_migrations` table + `up|audit`)
* `001_core.sql` (all DDL/Seeds)

Commands:

* `python migrate.py up`  (idempotent)
* `python migrate.py audit`

#### M3 — Auth & Profile Sync

* Lightweight Python/psycopg2 job: sync `auth.users` → `profiles` on sign-up/update.
* Mirror `email_verified` from Supabase into `profiles.email_verified`.
* Twilio Verify:

  * `POST /api/verify/phone/start` → log `phone_verifications(status='sent')`.
  * `POST /api/verify/phone/check` → on success: set `profiles.phone_verified=true` + write audit.

#### M4 — Orders Workflow APIs (minimal endpoints)

> Keep theme intact; just provide endpoints the existing UI can call.

* `POST /api/orders` → create order (service, question\_text, input\_media\_id, is\_gold).
* `GET /api/orders/:id` → order details (role-aware).
* `POST /api/orders/:id/result` (reader) → upload **final audio** → `media_assets` → set `output_media_id`, set status `awaiting_approval`.
* `POST /api/orders/:id/approve` (monitor/admin) → `status=approved` then **deliver**.
* `POST /api/orders/:id/reject` (monitor/admin) → return to reader with reason.

Every step writes to `audit_log` (+ `moderation_actions` when applicable).

#### M5 — TikTok → Daily Horoscopes (Samia’s voice)

* Python job:

  * Fetch newest posts from Samia’s TikTok (official API or manual URL bootstrap).
  * Extract **audio**, upload to Supabase Storage → create `media_assets`.
  * Create/update `horoscopes(scope='daily', zodiac, ref_date, audio_media_id, tiktok_post_url)`.
  * Only **after monitor approval** (`approved_by/at`) does it become visible to clients.

Clients only see **approved** content (gate via API/RLS).

#### M6 — Astro Service (Audio-Only)

* Accept DOB + optional birth place/time.
* Compute a simple server-side natal chart summary.
* **Result is always human-voiced audio** (reader/Samia) → upload to `media_assets` and deliver after monitor approval.

#### M7 — Calls (Direct & Healing)

* `POST /api/calls/schedule` for `direct_call` and `healing`: book session; persist in `calls` linked to `order`.
* `POST /api/calls/terminate` (monitor): drop live call with `end_reason='dropped_by_monitor'` + block if needed.
* **Unblock** endpoints: admin-only.

#### M8 — Moderation & Blocking

* Endpoints:

  * `POST /api/mod/block` (monitor/admin) for profile/order/media.
  * `POST /api/mod/unblock` (admin only).
* All actions append rows to `moderation_actions` + `audit_log`.

#### M9 — Countries & Phone Codes + Forms

* Shared dataset for current UI (no theme changes):

  * Signup and booking forms use **the same fields** (prefill from profile).
  * Countries dataset (ISO + dial codes), **sorted by dial code**.
  * `country_code` auto-fills from country; `zodiac` auto-computes from DOB.
  * Social login: first entry → mandatory profile completion.
  * Require **email + phone** verification before any delivery.

#### M10 — DeepConf & Semantic Galaxy (internal only)

* DeepConf: internal helper for higher-quality drafts—**never** exposed to the client.
* Semantic Galaxy: semantic suggestions/links between symbols/signs/meanings—**for reader only**.

#### M11 — Ops & QA (psycoPG2 only)

* Healthcheck, audit sweeps, backfills: small Python scripts using the same DSN.
* Acceptance for each module:

  * Re-run `migrate up` → **skip** safely.
  * Policies enforce roles properly.
  * Monitor flows (approve/reject/drop/block) work and are audited.
  * **No** new UI assets altering the theme.

### 4) Implementation Contract (what to generate now)

1. Create **`001_core.sql`** (full DDL/Seeds above) + **`migrate.py`** (psycopg2 pool + `_migrations` + `up|audit`).

2. Build a **small Python API** (e.g., FastAPI in a single file) that exposes:

   * `/api/orders` (+ result/approve/reject),

   * `/api/verify/phone/start|check`,

   * `/api/horoscopes/daily` (get approved by zodiac+date) + a separate ingestion job script,

   * `/api/calls/schedule|terminate`,

   * `/api/mod/block|unblock`.

   > Each endpoint uses **direct psycopg2 queries** (no ORM) and writes audit entries.

3. A simple **TikTok ingest** job (stub-swappable): takes API creds or a manual URL list, extracts audio, persists metadata.

4. A server-side **Astro summary** stub + a path to upload the **human-voiced** output.

5. **health.py / audit\_sweep.py** scripts for QA.

6. **Self-Verify**: run migrations, hit endpoints locally, and print SQL snapshots confirming results.

### 5) Don’ts

* Don’t modify, rename, or tweak any existing CSS/HTML/components.
* Don’t create dozens of tiny files; stay compact and clear.
* Don’t surface any AI/“confidence” traces to the client.

### 6) Go / First Action

Start with **M1 + M2** immediately:

* Create `001_core.sql` (roles/profiles/services/orders/media/horoscopes/calls/moderation/phone\_verifications/audit + zodiac fn/trigger + seeds).
* Create `migrate.py` (psycopg2 + pool + `_migrations` + `up|audit`).
* Run `python migrate.py up` then `python migrate.py audit` and print current tables/status.

**After completion and verification**, move to **M3 Auth/Verify**, then **M4 Orders**, and so on in sequence.

---

**Final Notes**

* Any datasets/lists (countries/dial codes) are consumed by the current UI **without** visual changes.
* The provided **Session Pooler DSN** is the single source for DB connectivity. All DB work is done via **Python + psycopg2**.
* If a technical choice must change, it must satisfy: **no theme changes** + **few files** + **all DB via psycopg2**.
