# SAMIA-TAROT — Context Engineering Protocol (Claude Opus Plan Mode, English Refactor)

> **Agent**: Claude Code CLI
> **Model policy**: “Opus 4.1 in plan mode, Sonnet 4 otherwise.”
> **Prime directive**: Build **database, migrations, backend routes, services & ops** while **preserving the existing theme/UX** already in code.
> **DB access (always)**: use **Python + psycopg2** (with pooling) to connect/migrate/execute/audit against Supabase **Session Pooler**:
> `postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres`

---

## 1) Identity & Mission

You are a **hands-on engineering agent**. Your job is to **plan → implement → verify** the SAMIA-TAROT platform incrementally. You never over-fragment code or the repo; you keep artifacts compact. You **do not** touch or re-skin front-end theme—only wire the back of house (DB, routes, integrations) and expose minimal view hooks needed by the existing UI.

---

## 2) Operating Protocol (non-negotiable)

1. **Foundation first**: produce a product roadmap & data contract before writing/altering code.
2. **Module loop**: build one functional module at a time; don’t advance until verified.
3. **Safe-Edit**: for any existing artifact:

   * **Read** it,
   * **Think** & pick a precise anchor,
   * **Act** with a surgical edit.
4. **Context-aware**: keep the current app’s theme/layout intact; you add endpoints & DB only.
5. **Code-minimalism**: fewer files, denser modules, clear boundaries.
6. **DB I/O rule**: **psyocpg2 only** (with pooling) against the **Session Pooler** DSN above—**for all**: connect, migrate, execute, seed, audit, backfill.
7. **Privacy & safety**: never echo secrets beyond operational need; prefer env var, but you **may** use the DSN explicitly as provided by the owner.

---

## 3) Hard Constraints & Preferences

* **Keep theme/design exactly as-is.**
* **Roles**: `superadmin, admin, reader, monitor, client` with dashboards already themed.
* **Features to support** (back of house):

  * **Daily horoscopes** (ingest Samia’s TikTok audio; internal approval before publish).
  * **Phone & email verification** (email by Supabase Auth; phone via Twilio Verify).
  * **Services**: tarot readings, coffee cup, **Astro natal chart** (as **audio**), **Healing Energy** (call with pre-ritual), **Direct Call**.
  * **Monitor powers**: drop/terminate call, approve/reject audio before it reaches client, **block** reader/client (unblock by admin only).
* **Data ergonomics**: zodiac auto-computed from DOB; country code set from chosen country; optional birth place/time fields.

---

## 4) Product Roadmap (prioritized modules)

1. **Core Schema & Policies** (Supabase / Postgres): users & profiles (extended), roles & permissions, services, orders/bookings, media assets, horoscopes, calls, moderation, verification, audit.
2. **Migrations & Seeds** (idempotent): Python/psycopg2 migration runner + seeders.
3. **Auth & Verification glue**: sync Supabase `auth.users` → `profiles`; phone OTP logs via Twilio; email verification via Supabase.
4. **Orders Workflow**: create → assign → produce → approve (monitor) → deliver; golden priority; archive.
5. **TikTok Ingestion**: fetch newest clips from Samia’s account, extract audio, queue for monitor approval, attach to horoscope sign/day.
6. **Astro Service**: accept birth data; compute chart server-side; store summary; generate **audio** response (human-recorded flow supported).
7. **Calls**: schedule/immediate; session record; monitor “cut/ban”; unblock flow (admin-gated).
8. **Moderation & Audit**: action log, RLS, blocklists, data lineage, config toggles.
9. **Ops-Runbooks**: migrate/rollback, seed/backfill, healthcheck, data QA, cost guards.

> **Advance gate**: do not proceed to the next module until the current module’s **DB + endpoints** are green and callable by the existing UI without theme edits.

---

## 5) Database: canonical DDL (idempotent)

> Run these via the **Migration Runner** (below). All tables are **RLS-ready**; enable RLS after seeding roles.

```sql
-- 001_core.sql  (idempotent guards)
create extension if not exists "uuid-ossp";

-- Roles
create table if not exists roles (
  id smallserial primary key,
  code text unique not null check (code in ('superadmin','admin','reader','monitor','client')),
  label text not null
);

-- Profiles (mirror of auth.users with extra fields)
create table if not exists profiles (
  id uuid primary key,                  -- equals auth.users.id
  email text unique,
  phone text,
  first_name text,
  last_name text,
  dob date,
  zodiac text,                          -- computed from dob
  country text,
  country_code text,
  birth_place text,
  birth_time time,
  role_id smallint references roles(id) default 5, -- client
  email_verified boolean default false,
  phone_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Services
create table if not exists services (
  id bigserial primary key,
  code text unique not null,            -- e.g. 'tarot','coffee','astro','healing','direct_call'
  name text not null,
  is_premium boolean default false,
  is_active boolean default true,
  base_price numeric(12,2) default 0,
  meta jsonb default '{}'::jsonb
);

-- Orders / Bookings
create type order_status as enum ('new','assigned','in_progress','awaiting_approval','approved','rejected','delivered','cancelled');

create table if not exists orders (
  id bigserial primary key,
  user_id uuid not null references profiles(id),
  service_id bigint not null references services(id),
  is_gold boolean default false,
  status order_status default 'new',
  question_text text,
  input_media_id bigint,                -- e.g. coffee cup image, voice note
  output_media_id bigint,               -- final audio for client
  assigned_reader uuid references profiles(id),
  scheduled_at timestamptz,             -- for direct calls
  delivered_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint gold_implies_priority check ( (is_gold = true and status in ('new','assigned','in_progress','awaiting_approval','approved')) or is_gold = false )
);

-- Media store (audio/image/pdf)
create table if not exists media_assets (
  id bigserial primary key,
  owner_id uuid references profiles(id),
  kind text check (kind in ('audio','image','pdf','other')) not null,
  url text not null,                    -- Supabase storage public/signed
  duration_sec int,
  bytes bigint,
  sha256 text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Daily/Monthly Horoscopes (link to ingested TikTok audio)
create table if not exists horoscopes (
  id bigserial primary key,
  scope text check (scope in ('daily','monthly')) not null,
  zodiac text not null,
  ref_date date not null,
  audio_media_id bigint references media_assets(id),
  text_content text,                    -- optional textual summary
  tiktok_post_url text,
  approved_by uuid references profiles(id),  -- monitor/admin
  approved_at timestamptz,
  unique (scope, zodiac, ref_date)
);

-- Calls + Moderation
create table if not exists calls (
  id bigserial primary key,
  order_id bigint references orders(id) unique,
  started_at timestamptz,
  ended_at timestamptz,
  end_reason text check (end_reason in ('completed','dropped_by_monitor','dropped_by_reader','dropped_by_client','failed','other'))
);

create table if not exists moderation_actions (
  id bigserial primary key,
  actor_id uuid references profiles(id),         -- monitor/admin
  target_kind text check (target_kind in ('order','profile','media','horoscope','call')) not null,
  target_id text not null,
  action text check (action in ('approve','reject','block','unblock','drop_call')) not null,
  reason text,
  created_at timestamptz default now(),
  unique (target_kind, target_id, action, created_at)
);

-- Phone OTP log (Twilio)
create table if not exists phone_verifications (
  id bigserial primary key,
  profile_id uuid references profiles(id),
  phone text not null,
  status text check (status in ('sent','verified','failed')) not null,
  provider_ref text,
  created_at timestamptz default now()
);

-- Audit
create table if not exists audit_log (
  id bigserial primary key,
  actor uuid,
  actor_role text,
  event text not null,
  entity text,
  entity_id text,
  meta jsonb,
  created_at timestamptz default now()
);

-- Zodiac from DOB (immutable function + trigger)
create or replace function calc_zodiac(d date) returns text language sql immutable as $$
  select case
    when d is null then null
    when (extract(month from d)=3 and extract(day from d)>=21) or (extract(month from d)=4 and extract(day from d)<=19) then 'Aries'
    when (extract(month from d)=4 and extract(day from d)>=20) or (extract(month from d)=5 and extract(day from d)<=20) then 'Taurus'
    when (extract(month from d)=5 and extract(day from d)>=21) or (extract(month from d)=6 and extract(day from d)<=20) then 'Gemini'
    when (extract(month from d)=6 and extract(day from d)>=21) or (extract(month from d)=7 and extract(day from d)<=22) then 'Cancer'
    when (extract(month from d)=7 and extract(day from d)>=23) or (extract(month from d)=8 and extract(day from d)<=22) then 'Leo'
    when (extract(month from d)=8 and extract(day from d)>=23) or (extract(month from d)=9 and extract(day from d)<=22) then 'Virgo'
    when (extract(month from d)=9 and extract(day from d)>=23) or (extract(month from d)=10 and extract(day from d)<=22) then 'Libra'
    when (extract(month from d)=10 and extract(day from d)>=23) or (extract(month from d)=11 and extract(day from d)<=21) then 'Scorpio'
    when (extract(month from d)=11 and extract(day from d)>=22) or (extract(month from d)=12 and extract(day from d)<=21) then 'Sagittarius'
    when (extract(month from d)=12 and extract(day from d)>=22) or (extract(month from d)=1 and extract(day from d)<=19) then 'Capricorn'
    when (extract(month from d)=1 and extract(day from d)>=20) or (extract(month from d)=2 and extract(day from d)<=18) then 'Aquarius'
    else 'Pisces'
  end;
$$;

create or replace function profiles_zodiac_trg() returns trigger language plpgsql as $$
begin
  new.zodiac := calc_zodiac(new.dob);
  return new;
end $$;

drop trigger if exists trg_profiles_zodiac on profiles;
create trigger trg_profiles_zodiac before insert or update of dob on profiles
for each row execute procedure profiles_zodiac_trg();

-- Seeds
insert into roles(code,label) values
('superadmin','Super Admin'),('admin','Admin'),('reader','Reader'),
('monitor','Monitor'),('client','Client')
on conflict (code) do nothing;

insert into services(code,name,is_premium,base_price) values
('tarot','Tarot Reading',false,0),
('coffee','Coffee Cup Reading',false,0),
('astro','Astro Natal Chart (Audio)',false,0),
('healing','Healing Energy (Call)',true,0),
('direct_call','Direct Call with Samia',true,0)
on conflict (code) do nothing;
```

> **RLS** (enable after initial wiring; sketch):
>
> * Allow each `client` to read/write **their own** orders & media;
> * `reader` can read assigned orders & write outputs;
> * `monitor` can read all + write moderation;
> * `admin/superadmin` full access.

---

## 6) Python psycopg2: Connection, Pool, Migration Runner (always use this)

> Use the **Session Pooler DSN**. Prefer env var `DB_DSN`; fallback to explicit DSN below if env is missing.

```python
# migrate.py  (run: python migrate.py up|down|audit)
import os, sys, hashlib, time
import psycopg2
from psycopg2.pool import SimpleConnectionPool

DSN = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

POOL = SimpleConnectionPool(minconn=1, maxconn=5, dsn=DSN)

MIGRATIONS = [
    ("001_core.sql", open(__file__.replace("migrate.py","001_core.sql")).read() if os.path.exists(__file__.replace("migrate.py","001_core.sql")) else """-- place 001_core.sql above here if running inline"""),
]

def exec_sql(sql: str):
    conn = POOL.getconn()
    try:
        with conn, conn.cursor() as cur:
            cur.execute(sql)
    finally:
        POOL.putconn(conn)

def ensure_table():
    exec_sql("""
      create table if not exists _migrations (
        id serial primary key,
        name text unique not null,
        checksum text not null,
        applied_at timestamptz default now()
      );
    """)

def up():
    ensure_table()
    conn = POOL.getconn()
    try:
        with conn, conn.cursor() as cur:
            for name, body in MIGRATIONS:
                checksum = hashlib.sha256(body.encode("utf-8")).hexdigest()
                cur.execute("select 1 from _migrations where name=%s and checksum=%s", (name, checksum))
                if cur.fetchone():
                    print(f"[=] skip {name} (already applied)")
                    continue
                print(f"[+] apply {name}")
                cur.execute(body)
                cur.execute("insert into _migrations(name,checksum) values (%s,%s)", (name, checksum))
    finally:
        POOL.putconn(conn)

def down():  # simplistic demo: truncate created tables safely if needed
    print("[!] down not implemented (use targeted SQL rollback)")

def audit():
    conn = POOL.getconn()
    try:
        with conn, conn.cursor() as cur:
            cur.execute("select table_name from information_schema.tables where table_schema='public' order by 1;")
            tables = [r[0] for r in cur.fetchall()]
            print("Public tables:", tables)
            cur.execute("select count(*) from orders;")
            print("Orders count:", cur.fetchone()[0])
            cur.execute("select count(*) from moderation_actions;")
            print("Moderation actions:", cur.fetchone()[0])
    finally:
        POOL.putconn(conn)

if __name__ == "__main__":
    cmd = (sys.argv[1] if len(sys.argv)>1 else "up").lower()
    {"up": up, "down": down, "audit": audit}.get(cmd, up)()
```

**Usage**

* `python migrate.py up` → create/alter schema idempotently and seed roles/services.
* `python migrate.py audit` → quick health stats.
* For **ad-hoc exec** (read/update/seed/backfill), write one-off Python snippets using the same pool.

---

## 7) Auth & Verification Glue

* **Supabase Auth** holds primary identities in `auth.users`. Create/update a **`profiles`** row on sign-up/login trigger (edge function or periodic sync job) using psycopg2.
* **Email verification**: handled by Supabase Auth—mirror into `profiles.email_verified`.
* **Phone verification**: store Twilio Verify lifecycle in `phone_verifications` and set `profiles.phone_verified=true` on success. Use audit\_log for traceability.

---

## 8) Orders Workflow (Reader/Monitor/Admin)

1. **Create**: client places an order (tarot/coffee/astro/healing/direct\_call) → insert `orders`.
2. **Assign**: admin auto/manually sets `assigned_reader`.
3. **Produce**: reader uploads output **audio** → `media_assets` → set `orders.output_media_id`.
4. **Moderate**: monitor reviews; **approve** (`status='approved'`) or **reject** (send back).
5. **Deliver**: on approval, flip to `delivered` and notify client.
6. **Block**: monitor may `block` a profile or drop a call; only **admin** may `unblock`.

> All actions must write a record into `moderation_actions` + `audit_log`.

---

## 9) TikTok Ingestion (Daily Horoscopes, Samia’s voice)

* **Ingest job** (Python): fetch latest posts from Samia’s TikTok (official API or compliant scraper), extract **audio**, upload to Supabase Storage, register in `media_assets`, then create/update `horoscopes(scope='daily', zodiac, ref_date, audio_media_id, tiktok_post_url)` with `approved_by/at` **only after monitor approval**.
* **Mapping**: a control table (optional) can map post captions → zodiac & date; or manual classification by monitor.
* **Client** never sees “AI/ingest tech” signals; they only see/play approved audio.

---

## 10) Astro Service (Audio result)

* Accept `birth_place` (optional), `birth_time` (optional), `dob` (required).
* Server-side compute a **chart summary** (procedural or library), store analysis text, and support **human-voiced** audio upload as the final artifact → `media_assets` → link on the order.
* For future: auto-script suggestions are **internal only** (DeepConf/Semantic Galaxy), never shown to the client.

---

## 11) Calls (Direct, with Monitor control)

* Schedule (or immediate) session for `direct_call`.
* Store lifecycle in `calls` (start/stop & reason).
* Monitor API to **drop** a live call and to **block** misbehaving party; unblock requires **admin**.

---

## 12) Moderation & Audit

* Every sensitive action → `moderation_actions` + `audit_log`.
* Add lightweight **RLS policies** per role after initial bring-up; test with psycopg2 queries for access windows.

---

## 13) Ops Runbooks (psycoPG2-only)

### A) Healthcheck

```python
# health.py
import os, psycopg2
dsn = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
with psycopg2.connect(dsn) as conn, conn.cursor() as cur:
    cur.execute("select now(), current_user, current_database();")
    print(cur.fetchone())
    cur.execute("select count(*) from profiles;")
    print("profiles:", cur.fetchone()[0])
```

### B) Seed/Backfill examples

```python
# seed_services.py
import os, psycopg2
dsn = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
with psycopg2.connect(dsn) as conn, conn.cursor() as cur:
    cur.execute("""
      insert into services(code,name,is_premium,base_price) values
      ('tarot','Tarot Reading',false,0),
      ('coffee','Coffee Cup Reading',false,0),
      ('astro','Astro Natal Chart (Audio)',false,0),
      ('healing','Healing Energy (Call)',true,0),
      ('direct_call','Direct Call with Samia',true,0)
      on conflict (code) do nothing;
    """)
    conn.commit()
```

### C) Data QA / Audit sweep

```python
# audit_sweep.py
import os, psycopg2, json
dsn = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
with psycopg2.connect(dsn) as conn, conn.cursor() as cur:
    checks = {
      "profiles_without_role": "select count(*) from profiles where role_id is null;",
      "orders_without_service": "select count(*) from orders o left join services s on s.id=o.service_id where s.id is null;",
      "media_orphans": "select count(*) from media_assets m left join orders o on m.id=o.output_media_id where o.id is null;"
    }
    for name, sql in checks.items():
        cur.execute(sql); print(name, cur.fetchone()[0])
```

### D) Rollback (targeted)

Use one-off psycopg2 scripts to `drop table ...` or `alter table ...`—never a blind teardown. Always snapshot with `select * from _migrations` first.

---

## 14) Module Execution Loop (for Claude)

**Think**: state the precise delta (DB rows, columns, endpoints).
**Act**: run psycopg2 scripts/migrations; wire minimal endpoints needed by the existing UI (no theme change).
**Verify**: query back with psycopg2 (and, if applicable, hit the route) to prove green.

**Stop after each module** and await confirmation before proceeding.

---

## 15) Acceptance Checklist (per module)

* DB objects present & idempotent (re-running `up` yields “skip”).
* Minimal endpoints callable from current UI without visual edits.
* Role gates enforced in SQL or route guards.
* Monitor powers function (approve/reject, drop call, block).
* Audit entries recorded for every sensitive action.
* No new theme/layout files introduced.

---

### Final Note

All database work—**every** connection, migration, execution, audit—**must** go through **Python + psycopg2** to the **Session Pooler** DSN provided above. Use environment variables where possible; if missing, fall back to the explicit DSN included at the top per owner instruction.
