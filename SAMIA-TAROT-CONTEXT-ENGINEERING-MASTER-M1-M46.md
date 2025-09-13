# SAMIA‑TAROT — Context Engineering MASTER (M1 → M46, Unified)

> **Purpose**: Single authoritative spec consolidating all context-engineering documents, prompts, guardrails, and runbooks from M1 through M46.  
> **Style**: Exactly the same structure and tone as existing context engineering MDs.  
> **Theme Rule**: Do **not** change the cosmic/neon theme. Keep all code **maintainable & short**.  
> **Pre‑Read Requirement**: Before executing any prompt/job, the Agent must **read** and load guardrails from all four master context files located on the user’s machine (Windows paths listed within), then proceed.

---

> **Navigation**: This file embeds the original sources in order with clear begin/end markers. Use this MASTER for day‑to‑day execution; do not edit the original sources unless explicitly instructed.



<!-- BEGIN SOURCE: README.md -->

# SAMIA-TAROT Platform

Production-ready backend API for the SAMIA-TAROT platform with complete database schema, authentication, order workflow, horoscope ingestion, voice calls, moderation, and ops monitoring.

## Overview

**Zero Theme Changes**: This backend implementation preserves the existing front-end theme/design completely. All work is "back-of-house" - database, APIs, and integrations only.

**Architecture**: Single FastAPI application (`api.py`) with PostgreSQL via psycopg2 connection pooling to Supabase Session Pooler. No ORM - direct SQL for performance and simplicity.

### Modules Implemented (M1-M11)

- **M1-M2**: Core schema, migrations, psycopg2 runner (`migrate.py`)
- **M3**: Auth sync, phone verification via Twilio Verify
- **M4**: Orders workflow (create → assign → approve → deliver)
- **M5**: TikTok horoscope ingestion with monitor approval
- **M6**: Astro service with human-voiced audio results
- **M7**: Voice calls via Twilio with monitor controls and blocking
- **M8**: Security hardening with RLS policies and rate limiting
- **M9**: Countries metadata and profile completeness enforcement
- **M10**: Internal AI assist (DeepConf/Semantic Galaxy) for readers
- **M11**: Ops monitoring, CSV exports, metrics, admin config

## Quick Start

### Requirements

- Python 3.9+
- PostgreSQL access (Supabase Session Pooler configured)
- Environment variables configured (see `.env.example`)

### Windows

```powershell
# Copy and configure environment
copy .env.example .env
# Edit .env with your credentials

# Run migrations
python migrate.py up

# Start API server
.\run_api.ps1
```

### Linux/macOS

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your credentials

# Run migrations
python migrate.py up

# Start API server
./run_api.sh
```

### Verify Installation

```bash
# Check database status
python migrate.py audit

# Test API health
curl http://localhost:8000/api/health
```

## Environment Variables

See `.env.example` for complete list. Key variables:

- `DB_DSN`: Supabase Session Pooler connection string
- `TWILIO_*`: Phone verification and voice calling
- `SUPABASE_*`: Storage for media assets
- `DEEPCONF_*`, `SEMANTIC_*`: Internal AI assist services
- `JOB_TOKEN`: Security token for cron endpoints

## Role Matrix

| Role | Permissions |
|------|-------------|
| `client` | Create orders, view own data, complete profile |
| `reader` | Read assigned orders, upload results, use AI assist |
| `monitor` | Approve/reject content, block users, drop calls |
| `admin` | User management, unblock users, ops monitoring |
| `superadmin` | Full access, raw PII exports, system config |

## API Endpoints

### Authentication & Verification
- `POST /api/auth/sync` - Sync Supabase auth to profiles
- `POST /api/verify/phone/start` - Start phone verification
- `POST /api/verify/phone/check` - Verify phone code

### Orders Workflow
- `POST /api/orders` - Create new order
- `GET /api/orders/{id}` - Get order details
- `POST /api/orders/{id}/assign` - Assign to reader (admin)
- `POST /api/orders/{id}/result` - Upload result (reader)
- `POST /api/orders/{id}/approve` - Approve result (monitor)
- `POST /api/orders/{id}/reject` - Reject with reason (monitor)

### Horoscopes
- `POST /api/horoscopes/ingest` - Ingest TikTok content
- `GET /api/horoscopes/daily/{zodiac}` - Get approved horoscope
- `POST /api/horoscopes/{id}/approve` - Approve horoscope (monitor)
- `POST /api/horoscopes/{id}/regenerate` - Regenerate audio

### Voice Calls
- `POST /api/calls/schedule` - Schedule call session
- `POST /api/calls/initiate` - Start call (reader)
- `POST /api/calls/terminate` - Drop call (monitor)
- `POST /api/voice/twiml/*` - Twilio webhook handlers

### Astro Service
- `POST /api/astro/order` - Create astro reading order
- `POST /api/astro/draft` - Generate astro summary
- `POST /api/media/upload` - Upload audio result

### Moderation
- `POST /api/mod/block` - Block user/reader (monitor)
- `POST /api/mod/unblock` - Unblock user (admin)

### Metadata
- `GET /api/meta/countries` - Countries list with dial codes
- `GET /api/meta/zodiacs` - Zodiac signs list
- `GET /api/profile/requirements` - Profile completion requirements
- `POST /api/profile/complete` - Complete profile (social login)

### Internal AI Assist (Reader/Admin Only)
- `POST /api/assist/draft` - Generate reading draft
- `POST /api/assist/search` - Semantic symbol search
- `POST /api/assist/knowledge/add` - Add knowledge (admin)
- `GET /api/assist/drafts/{order_id}` - Get drafts for order

### Operations (Admin/SuperAdmin Only)
- `GET /api/ops/snapshot` - System status snapshot
- `POST /api/ops/export` - Export data as CSV ZIP
- `GET /api/ops/metrics` - System metrics
- `POST /api/ops/rate_limits` - Update rate limits config

## Cron Schedules

Install via Windows Task Scheduler (templates provided):

### Daily Maintenance (00:10 UTC)
- **Purpose**: Purge old data (50+ days retention)
- **Template**: `cron_purge_daily.xml`
- **Command**: `curl -X POST {API}/api/cron/purge_old`

### Monthly Voice Refresh (1st of month, 01:00 UTC)
- **Purpose**: Refresh voice model cache
- **Template**: `cron_voice_monthly.xml`  
- **Command**: `curl -X POST {API}/api/cron/voice/refresh`

**Security**: Use `X-Job-Token` header for cron authentication.

## Data Flow

1. **Client Registration**: Email/phone verification → Complete profile → Auto-compute zodiac
2. **Order Creation**: Service selection → Reader assignment → Work completion → Monitor approval → Delivery
3. **Horoscope Publishing**: TikTok ingestion → Audio extraction → Monitor approval → Client visibility
4. **Voice Calls**: Scheduling → Conference setup → Monitor controls → Session recording
5. **Moderation**: Content review → Block/unblock → Audit trail

## Key Design Principles

- **No Mocks/Test Data**: All endpoints use real database content
- **psycopg2 Only**: Direct SQL via connection pooling, no ORM overhead
- **Zero Theme Changes**: Backend-only implementation preserving existing UI
- **Comprehensive Auditing**: All actions logged to `audit_log` table
- **Role-Based Security**: RLS policies + application-level permission checks
- **Rate Limiting**: Token bucket algorithm stored in database
- **PII Protection**: Default masking for exports, raw access requires superadmin

## Database Schema

24 tables across 6 migrations:
- Core: `roles`, `profiles`, `services`, `orders`, `media_assets`
- Features: `horoscopes`, `calls`, `astro_requests`, `assist_drafts`
- Security: `moderation_actions`, `blocked_profiles`, `api_rate_limits`
- Metadata: `phone_verifications`, `audit_log`, `app_settings`
- Knowledge: `kb_docs`, `kb_chunks` (with pgvector support)

## Development Notes

**Before making any changes**: Read the context files in this repo:
- `SAMIA-TAROT-CONTEXT-ENGINEERING.md`
- `Full Prompt.md`

**Migration Safety**: All SQL migrations are idempotent with checksum verification.

**Connection Pooling**: Session Pooler DSN required for Supabase compatibility.

**Rate Limiting**: Configurable via `/api/ops/rate_limits` (stored in `app_settings`).

**Monitoring**: Use `/api/ops/snapshot` and `/api/ops/metrics` for system health.

<!-- END SOURCE: README.md -->



<!-- BEGIN SOURCE: RUNBOOK.md -->

# SAMIA-TAROT Operations Runbook

## System Monitoring & Health

### Automated Health Checks

**Primary Endpoint**: `GET /api/ops/health`
- **Frequency**: Every 60 seconds
- **Expected Response**: `200 OK` with JSON health status
- **Authentication**: Requires admin user ID in `X-User-ID` header

### Lightweight Monitoring Dashboard

Poll these endpoints every 5 minutes for basic system metrics:

```bash
# System metrics overview
curl -H "X-User-ID: <admin-uuid>" "https://yourdomain.com/api/ops/metrics?days=1"

# Database snapshot
curl -H "X-User-ID: <admin-uuid>" "https://yourdomain.com/api/ops/snapshot?days=1" 
```

**Key Metrics to Display**:
- `orders_created` / `orders_delivered` - Order flow health
- `rejects` / `regenerates` - Content quality indicators  
- `calls_started` / `calls_ended` - Voice service utilization
- `rate_limit_hits` - API abuse detection
- `avg_sql_latency_ms` - Database performance

### Simple Metrics Dashboard (JSON Response)
```json
{
  "timestamp": "2025-09-10T12:00:00Z",
  "metrics": {
    "period_days": 1,
    "orders_created": 145,
    "orders_delivered": 142, 
    "rejects": 3,
    "regenerates": 8,
    "calls_started": 67,
    "calls_ended": 65,
    "rate_limit_hits": 12,
    "avg_sql_latency_ms": 85.3
  }
}
```

## Alerting Thresholds & Escalation

### Warning Level Alerts

**Database Performance**
- **Trigger**: `avg_sql_latency_ms > 2500` for 10 consecutive minutes
- **Action**: Check database connection pool, Session Pooler status
- **Escalation**: If persists >30 minutes, alert database admin

**API Abuse Detection** 
- **Trigger**: `rate_limit_hits` increases by >100 in 5 minutes
- **Action**: Review rate limiting logs, identify source IPs
- **Response**: Consider temporary IP blocking if abuse confirmed

### Critical Level Alerts

**Scheduled Job Failures**
- **Trigger**: Daily purge job returns HTTP != 2xx 
- **Impact**: Data retention policy not enforced
- **Immediate Action**: Manual purge via `/api/ops/export` and cleanup
- **Escalation**: Must resolve within 24 hours

**Voice Service Outage**
- **Trigger**: `/api/calls/initiate` returns 503 for >3 consecutive attempts
- **Impact**: Voice calls unavailable
- **Immediate Action**: Check Twilio service status and credentials
- **Escalation**: Critical user impact - escalate to on-call immediately

**Database Connectivity**
- **Trigger**: `/api/ops/health` returns 500 or connection timeout
- **Impact**: Complete API outage
- **Immediate Action**: Check Session Pooler status, network connectivity
- **Escalation**: Severe outage - all hands on deck

## Operational Playbooks

### Emergency Call Termination

**Scenario**: Monitor needs to drop problematic live call

```bash
# Get active calls for investigation
curl -H "X-User-ID: <admin-uuid>" "https://yourdomain.com/api/ops/snapshot?days=1"

# Terminate specific call
curl -X POST "https://yourdomain.com/api/calls/terminate" \
  -H "X-User-ID: <monitor-uuid>" \
  -H "Content-Type: application/json" \
  -d '{"order_id": 123, "reason": "dropped_by_monitor"}'
```

**Post-Action**: Review audit logs for context and follow-up

### Security Token Rotation

**Scenario**: Rotate JOB_TOKEN for scheduled tasks

1. **Generate New Token**
   ```bash
   openssl rand -hex 32
   ```

2. **Update Server Environment**
   ```bash
   export JOB_TOKEN="new-token-here"
   # Restart API service
   ```

3. **Update Task Scheduler**
   - Edit both cron XML files
   - Replace `$env:JOB_TOKEN` references  
   - Reimport tasks to Task Scheduler

4. **Verify Scheduled Jobs**
   ```bash
   # Test daily purge with new token
   curl -X POST "https://yourdomain.com/api/cron/purge_old" \
     -H "X-User-ID: <admin-uuid>" \
     -H "X-Job-Token: <new-token>"
   ```

### Storage Pressure Management

**Scenario**: Approaching storage quota limits

1. **Export Old Data** 
   ```bash
   # Export last 30 days for archive
   curl -X POST "https://yourdomain.com/api/ops/export" \
     -H "X-User-ID: <admin-uuid>" \
     -H "Content-Type: application/json" \
     -d '{
       "range": {"from": "2025-08-01", "to": "2025-08-31"},
       "entities": ["orders", "horoscopes", "calls", "audit"],
       "pii": "masked"
     }' --output archive_august_2025.zip
   ```

2. **External Archive**
   - Upload ZIP to external storage (S3, Google Drive, etc.)
   - Verify archive integrity
   - Document archive location

3. **Clean Old Media**
   - Review media assets >50 days old
   - Consider purging unused audio files
   - Update retention policies if needed

### User Blocking Response

**Scenario**: Abuse detected, need to block user/reader

```bash
# Block problematic user  
curl -X POST "https://yourdomain.com/api/mod/block" \
  -H "X-User-ID: <monitor-uuid>" \
  -H "Content-Type: application/json" \
  -d '{
    "target_id": "<user-uuid>",
    "target_kind": "profile", 
    "reason": "Terms of service violation"
  }'

# Review user activity before blocking
curl -H "X-User-ID: <admin-uuid>" \
  "https://yourdomain.com/api/ops/export" \
  -d '{"range": {"from": "2025-09-01", "to": "2025-09-10"}, "entities": ["audit"]}'
```

**Admin Unblock** (when appropriate):
```bash
curl -X POST "https://yourdomain.com/api/mod/unblock" \
  -H "X-User-ID: <admin-uuid>" \  
  -H "Content-Type: application/json" \
  -d '{"target_id": "<user-uuid>", "target_kind": "profile"}'
```

## PII & Compliance Management

### Data Export Guidelines

**Default PII Protection**: All exports mask sensitive data by default
- Emails: `user@example.com` → `us***@example.com`
- Phones: `+1234567890` → `+12***90`

**Raw PII Access Requirements**:
- SuperAdmin role required
- Explicit `"pii": "raw"` request
- Business justification documented
- All raw exports logged in audit trail

### Data Retention Policy

**Audit Logs**: 50+ days retention (configurable via daily purge)
**Media Assets**: Linked to orders, retained with order lifecycle
**Rate Limit Data**: 7-day rolling window

### Compliance Queries

**User Data Deletion Request**:
1. Export user data first: `/api/ops/export` with user_id filter
2. Manual deletion via database (no automated endpoint for compliance)
3. Verify deletion in audit logs

**Data Access Request**: 
1. Use `/api/ops/export` with masked PII (default)
2. SuperAdmin can access raw PII if legally required
3. All access logged for compliance audit

---

# Operator Reference Guide

## Starting/Stopping the API

### Windows (PowerShell)
```powershell
# Start API server
.\run_api.ps1

# Start with custom settings  
.\run_api.ps1 -Host "127.0.0.1" -Port 8080 -Workers 4

# Stop: Ctrl+C or close terminal
```

### Linux/macOS (Bash)
```bash
# Start API server
./run_api.sh

# Start with environment overrides
HOST="127.0.0.1" PORT=8080 WORKERS=4 ./run_api.sh

# Stop: Ctrl+C or kill process
```

## Rate Limits Configuration

**Current Production Defaults**:
- Orders: 15/hour per user
- Phone verification: 3/hour per user  
- AI assist drafts: 8/hour per reader
- AI assist search: 20/hour per reader
- Knowledge additions: 5/hour per admin

**Update Rate Limits**:
```bash
curl -X POST "https://yourdomain.com/api/ops/rate_limits" \
  -H "X-User-ID: <admin-uuid>" \
  -H "Content-Type: application/json" \
  -d '{
    "rate_orders_per_hour": 20,
    "rate_phone_verify_per_hour": 5,
    "rate_assist_draft_per_hour": 12
  }'
```

## Health Check Commands

**Basic Health**:
```bash
curl "https://yourdomain.com/api/ops/health" \
  -H "X-User-ID: <admin-uuid>"
```

**Expected Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-09-10T12:00:00Z",
  "database": true,
  "migrations": 6,
  "services": {
    "twilio": true,
    "storage": true,
    "voice": false
  }
}
```

**Detailed System Status**:
```bash  
curl "https://yourdomain.com/api/ops/snapshot?days=7" \
  -H "X-User-ID: <admin-uuid>"
```

## Scheduled Jobs Management

**View Active Tasks** (Windows):
```cmd
schtasks /Query /TN "SAMIA-TAROT\Daily Purge"
schtasks /Query /TN "SAMIA-TAROT\Voice Refresh"  
```

**Manual Job Execution**:
```bash
# Manual daily purge
curl -X POST "https://yourdomain.com/api/cron/purge_old" \
  -H "X-User-ID: <admin-uuid>" \
  -H "X-Job-Token: <job-token>"

# Manual voice refresh  
curl -X POST "https://yourdomain.com/api/cron/voice/refresh" \
  -H "X-User-ID: <superadmin-uuid>" \
  -H "X-Job-Token: <job-token>"
```

**Check Job Logs**: Windows Event Viewer → Task Scheduler → Task History

## Database Migration Status

**Check Applied Migrations**:
```bash  
python migrate.py audit
```

**Expected Output**:
```
Applied migrations:
  001_core.sql -> 2025-09-07 16:25:11
  002_ops.sql -> 2025-09-07 17:44:26  
  003_astro.sql -> 2025-09-08 11:27:54
  004_calls.sql -> 2025-09-08 11:36:44
  005_security.sql -> 2025-09-08 14:02:47
  006_ai.sql -> 2025-09-09 04:28:33
```

**Apply New Migrations** (if any):
```bash
python migrate.py up
```

## Emergency Contacts & Escalation

**On-Call Priority**:
1. Database connectivity issues → **Critical**
2. Complete API outage → **Critical**  
3. Voice service failures → **High**
4. Scheduled job failures → **Medium**
5. Rate limiting issues → **Low**

**Communication Channels**:
- Slack: #samia-tarot-ops
- Email: ops-team@domain.com  
- PagerDuty: SAMIA-TAROT service

**Runbook Updates**: This document should be updated after any major incident or operational change.

<!-- END SOURCE: RUNBOOK.md -->



<!-- BEGIN SOURCE: SAMIA-TAROT-CONTEXT-ENGINEERING.md -->

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


<!-- END SOURCE: SAMIA-TAROT-CONTEXT-ENGINEERING.md -->



<!-- BEGIN SOURCE: SAMIA-TAROT-CONTEXT-ENGINEERING-2.md -->

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


<!-- END SOURCE: SAMIA-TAROT-CONTEXT-ENGINEERING-2.md -->



<!-- BEGIN SOURCE: SAMIA-TAROT-CONTEXT-ENGINEERING-3.md -->

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


<!-- END SOURCE: SAMIA-TAROT-CONTEXT-ENGINEERING-3.md -->



<!-- BEGIN SOURCE: SAMIA-TAROT-CONTEXT-ENGINEERING-4.md -->


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


<!-- END SOURCE: SAMIA-TAROT-CONTEXT-ENGINEERING-4.md -->



<!-- BEGIN SOURCE: samia_tarot_context_engineering_m_14_m_15.md -->

# SAMIA‑TAROT — Context Engineering (M14 Payments & M15 Notifications)

> **Agent**: Claude Code CLI  
> **Model policy**: “Opus 4.1 in plan mode, Sonnet 4 otherwise.”  
> **Prime directive**: Ship **Payments/Billing** and **Notifications** end‑to‑end while preserving the existing theme/UX.  
> **DB access (always)**: **Python + psycopg2** (pooling) to Supabase **Session Pooler** DSN:
>
> `postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres`

---

## 1) Mission & Non‑Negotiables

1. **Zero Theme Drift**: no UI/CSS edits; backend only (DB, routes, integrations).  
2. **No Mocks/Test Data**: if a provider isn’t configured → **HTTP 503**.  
3. **Psycopg2‑only** for all DB I/O (connect, migrate, execute, audit).  
4. **Few files**: append logic to existing `api.py`; add minimal idempotent migrations.  
5. **Role gates**: `client, reader, monitor, admin, superadmin` enforced per endpoint.  
6. **Audit everything**: all sensitive actions logged to `audit_log` (+ moderation where relevant).  
7. **RLS stays enabled** (M8); API uses service‑role via Session Pooler.

---

## 2) Scope of This Module

- **M14 Payments & Billing**: payment intents, webhooks, invoices/receipts (PDF in Storage), refunds/disputes, VAT fields, promo codes (optional).  
- **M15 Notifications**: Email/SMS/WhatsApp notifications for lifecycle events (verify, order create, status changes, delivery, call reminders); daily/weekly digests (optional).

> **Out of scope**: UI redesign, new dashboards, or seeded/demo data.

---

## 3) Environment Variables (hard‑fail if missing)

### Payments (provider‑agnostic)
```
PAY_PROVIDER=stripe|checkout|tap|other     # choose actual value
PAY_API_KEY=__SET_ME__                     # secret key
PAY_WEBHOOK_SECRET=__SET_ME__              # for HMAC signature verify
PAY_CURRENCY=USD                           # default currency code
INVOICE_FROM_NAME="Samia Tarot"
INVOICE_FROM_EMAIL=billing@samiatarot.com
INVOICE_VAT_RATE=0                         # percentage (0–100), can be 0
```

### Notifications
```
SMTP_HOST=__SET_ME__       SMTP_PORT=587
SMTP_USER=__SET_ME__       SMTP_PASS=__SET_ME__
SMTP_FROM=Samia Tarot <no-reply@samiatarot.com>

TWILIO_ACCOUNT_SID=__SET_ME__
TWILIO_AUTH_TOKEN=__SET_ME__
TWILIO_WHATSAPP_FROM=whatsapp:+1XXXXXXXXXX  # optional
TWILIO_SMS_FROM=+1XXXXXXXXXX                # optional
```

> Missing vars ⇒ endpoints that depend on them return **503 Service Unavailable**; never simulate success.

---

## 4) Database DDL (idempotent) — New Migrations

> Create **two** migrations and register them in `migrate.py`: `007_payments.sql`, `008_notifications.sql`.

### 4.1 `007_payments.sql`
```sql
-- Payment primitives (provider-agnostic)
create table if not exists payment_intents (
  id bigserial primary key,
  order_id bigint not null references orders(id) on delete cascade,
  provider text not null,                 -- e.g. 'stripe','checkout','tap'
  provider_intent_id text unique,        -- external reference
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null,                -- ISO 4217
  status text not null check (status in ('created','requires_action','processing','succeeded','failed','canceled')),
  client_secret text,                    -- if applicable (never expose in logs)
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists invoices (
  id bigserial primary key,
  order_id bigint not null references orders(id) on delete cascade,
  payment_intent_id bigint references payment_intents(id) on delete set null,
  number text unique,                     -- e.g. SAMIA-2025-000123
  subtotal_cents bigint not null,
  vat_cents bigint not null default 0,
  total_cents bigint not null,
  currency text not null,
  pdf_media_id bigint references media_assets(id),
  billing_name text,
  billing_email text,
  billing_country text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists refunds (
  id bigserial primary key,
  order_id bigint not null references orders(id) on delete cascade,
  payment_intent_id bigint references payment_intents(id) on delete set null,
  provider_refund_id text unique,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null,
  reason text,
  status text not null check (status in ('requested','processing','succeeded','failed')),
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists promo_codes (
  id bigserial primary key,
  code text unique not null,
  percent_off int check (percent_off between 1 and 100),
  active boolean default true,
  valid_from date,
  valid_to date,
  max_redemptions int,
  redemptions int default 0
);

create table if not exists payment_events (
  id bigserial primary key,
  provider text not null,
  event_type text not null,
  payload jsonb not null,
  signature_valid boolean,
  received_at timestamptz default now()
);

create index if not exists idx_payment_intents_order on payment_intents(order_id);
create index if not exists idx_invoices_order on invoices(order_id);
create index if not exists idx_refunds_order on refunds(order_id);
```

### 4.2 `008_notifications.sql`
```sql
-- Notification templates and logs
create table if not exists notif_templates (
  id bigserial primary key,
  channel text not null check (channel in ('email','sms','whatsapp')),
  code text unique not null,             -- e.g. 'order_created','order_delivered'
  subject text,                          -- for email
  body text not null                     -- handlebars-like placeholders
);

create table if not exists notif_log (
  id bigserial primary key,
  user_id uuid references profiles(id),
  channel text not null check (channel in ('email','sms','whatsapp')),
  template_code text,
  target text not null,                  -- email or phone
  payload jsonb,
  status text not null check (status in ('queued','sent','failed')),
  provider_ref text,
  error text,
  created_at timestamptz default now()
);

-- Optional: user-level opt-outs (defaults allow)
create table if not exists notif_prefs (
  user_id uuid primary key references profiles(id) on delete cascade,
  email_enabled boolean default true,
  sms_enabled boolean default true,
  whatsapp_enabled boolean default true
);

create index if not exists idx_notif_log_user on notif_log(user_id);
```

> Keep both migrations **idempotent** and free of seed/mock data. Policies (RLS) are already in place globally (M8).

---

## 5) Endpoint Plan (append to `api.py`, single‑file approach)

### 5.1 Payments

1) **Create Intent** — `POST /api/payments/intent` (client+, verified & profile complete)  
**Body**: `{ "order_id": 123, "promo_code": "OPTIONAL" }`  
**Flow**:  
- Validate order belongs to caller and `status in ('new','assigned')`.  
- Compute `amount_cents` = base price (from `services`) − promo (if valid + active within dates + caps).  
- Call provider API to create an intent; store row in `payment_intents` with `status`.  
- **Audit**: `payment_intent_create`.  
**Return**: provider client secret/redirect params as needed.

2) **Webhook** — `POST /api/payments/webhook` (public, signature‑verified)  
**Flow**:  
- Verify HMAC signature using `PAY_WEBHOOK_SECRET`; reject **400** if invalid.  
- Upsert `payment_events` (store raw payload, signature_valid).  
- Transition `payment_intents.status` accordingly (`succeeded`/`failed`/`canceled`).  
- On `succeeded`: generate **invoice** (see 5.1.4), set `orders.status → approved` if applicable.  
- **Audit**: `payment_webhook_event`.

3) **Refund** — `POST /api/payments/refund` (admin/superadmin)  
**Body**: `{ "order_id": 123, "amount_cents": 1000, "reason": "..." }`  
**Flow**:  
- Validate order + payment intent `succeeded`.  
- Call provider API; insert `refunds(status='processing')`, then finalize to `succeeded/failed`.  
- **Moderation**: insert `moderation_actions` with `action='approve'` or record `reject` if provider failed.  
- **Audit**: `payment_refund`.

4) **Invoice fetch** — `GET /api/payments/invoice/{id}` (client: own; admin/superadmin: any)  
**Flow**:  
- Verify access; fetch `invoices` row; return **Signed URL** for `pdf_media_id` (Supabase Storage).  
- **Audit**: `invoice_fetch`.

5) **List methods** — `GET /api/payments/methods` (public)  
- Return server‑side computed availability (based on configured provider/currency).  

> **Rate‑limits** (reuse M8): intents 10/hour, refunds 5/hour (admin), invoices 60/hour (per user).

### 5.2 Invoice Generation (backend)

- Build a minimal PDF (text‑first) at webhook success:  
  - Compute subtotal, VAT (from `INVOICE_VAT_RATE`), total; embed order ID, service, date, client name/email.  
  - Upload PDF bytes → Supabase Storage `invoices/{YYYY}/{MM}/{invoiceNumber}.pdf` → `media_assets(kind='pdf')`.  
  - Create `invoices` row with `pdf_media_id`.  
- If PDF engine is not set up → **503** and retry via ops; never fake PDFs.

### 5.3 Notifications

1) **Template upsert** — `POST /api/notif/template` (admin/superadmin)  
Body includes `channel, code, subject?, body`. Placeholders: `{{first_name}}`, `{{order_id}}`, `{{status}}`, `{{invoice_url}}`, etc.

2) **Send (programmatic)** — internal helpers + hooks on events:  
- **Events**: `verify_phone_sent`, `order_created`, `order_assigned`, `order_awaiting_approval`, `order_delivered`, `call_reminder`, `refund_succeeded`.  
- Read `notif_prefs`; check channel availability (SMTP/Twilio).  
- Insert `notif_log(status='queued'→'sent'/'failed')` with provider refs.

3) **Manual test** — `POST /api/notif/test` (admin)  
- Attempts one email and one SMS to provided targets; returns 503 if providers missing.

> **Rate‑limits**: test 5/hour, per user; auto hooks capped to 60/min global via simple counter in DB (or reuse M8 token bucket by `endpoint='notif_auto'`).

---

## 6) Security & Compliance

- **Webhook security**: verify signatures; optionally IP allowlist at Edge (M13.1).  
- **PII**: never store raw PANs or secrets; store provider IDs only.  
- **Exports**: use existing `/api/ops/export` (M11) for monthly VAT/export; invoices PDF serve via signed URLs.  
- **RLS**: client can fetch only **own** invoices; admins can fetch all.

---

## 7) UI Integration (zero theme change)

- **Checkout button/flow** calls `POST /api/payments/intent`, then redirects/handles provider.  
- On return/webhook success: show "Payment confirmed"; backend sends notifications and generates invoice.  
- **Orders**: creation is already gated by profile completeness + verification (M9).

---

## 8) Acceptance Checklist (per module)

**M14 Payments**
- [ ] Migrations `007_payments.sql` applied idempotently.  
- [ ] Create intent → provider intent created; DB rows present; audit written.  
- [ ] Webhook with valid signature flips `status → succeeded` and creates invoice PDF.  
- [ ] Refund endpoint updates provider + DB; moderation/audit entries exist.  
- [ ] Client can fetch **own** invoice via signed URL; admins any.

**M15 Notifications**
- [ ] Templates upserted; placeholders rendered correctly.  
- [ ] Lifecycle hooks emit notifications (when providers configured).  
- [ ] Rate‑limits enforced; failures logged to `notif_log` with error.  
- [ ] No notifications emitted when providers missing (503 returned).

---

## 9) Self‑Verification (no seed/mocks)

- Re‑run `python migrate.py up` → all previous migrations show **skip**, new ones apply once.  
- Call payment webhook with **invalid signature** → **400** and `payment_events.signature_valid=false`.  
- Call `/api/notif/test` without SMTP/Twilio → **503**.  
- Confirm **no UI files** touched and **no test rows** inserted except logs/events created by explicit calls.

---

## 10) Execution Guidance (Claude)

1) **Read first**:  
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md`  
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\Full Prompt.md`  
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\samia_tarot_context_engineering_m_14_m_15.md`

2) **Plan delta**: list exact SQL objects + endpoints to change.  
3) **Act**: create `007_payments.sql`, `008_notifications.sql`; extend `api.py` minimally; no other files.  
4) **Verify**: show routes, try 503/400 guards, and DB row snapshots (counts only).  
5) **Stop**: await confirmation before touching anything else.

---

### Notes
- Provider choice is abstracted; Stripe/Checkout/Tap/Gateway‑X all work so long as the 503 guardrails and webhook signature checks are implemented.  
- PDFs may be simplified (text‑first) initially; quality can be improved later without schema changes.  
- All storage remains in Supabase; delivery via **signed URLs** only (no public buckets).



---

## 11) Frontend Binding (Zero Theme Changes)

> Bind the existing dashboards to the APIs built in M3…M11 **without** altering the theme or visual structure. All calls are client→API with auth headers already established (X-User-ID), and follow existing rate‑limits and role gates.

### Superadmin/Admin
- **Archive (50 days) & Download**: `GET /api/horoscopes/archive?days=50` → list + signed download URLs.
- **Regenerate per‑zodiac**: `POST /api/horoscopes/regenerate` (body: `{zodiac, ref_date?, source, tiktok_url?, script_text?}`) → instant replace (auto‑publish daily).
- **Zodiac settings governance**: `POST /api/zodiacs/settings/propose` → `POST /api/zodiacs/settings/approve|reject` (superadmin).
- **Exports/Reports**: `POST /api/ops/export` (ZIP CSV, masked PII by default) + `GET /api/ops/snapshot`, `GET /api/ops/metrics`.

### Reader
- **Order flow**: `POST /api/orders/{id}/start` → work; `POST /api/media/upload` → get `media_id`; `POST /api/orders/{id}/result` → submit.
- **Assist (internal)**: `POST /api/assist/draft`, `POST /api/assist/search`, `GET /api/assist/drafts/{order_id}` (no client exposure).

### Monitor
- **Pending moderation**: existing order approval pipeline (M4) + any content queues (where applicable).
- **Live calls**: `POST /api/calls/initiate`, `POST /api/calls/terminate`.
- **Blocks**: `POST /api/mod/block` (monitor/admin) and **unblock** via admin‑only endpoint.

### Client
- **Order creation**: `POST /api/orders` and/or `POST /api/astro/order` (requires verified email/phone + profile completeness).  
- **Daily horoscopes**: `GET /api/horoscopes/daily?zodiac=…&country=…` (auto‑publish at local midnight).

> **Notes**: All dashboard calls inherit M8 RLS + API rate‑limits; UI only wires actions to endpoints—no UI redesign.

---

## 12) Privacy & My Account (User‑Controlled)

Implement safe, auditable self‑service controls—**no UI change required**.

### Endpoints
1) **Request account deletion (soft‑delete first)**  
   `POST /api/account/delete` (client)  
   - Effect: mark profile soft‑deleted, redact PII fields, revoke sessions; enqueue media purge (audio/pdf) via ops job.  
   - Returns a deletion ticket id for follow‑up.  
   - **Audit**: `account_delete_requested`.

2) **Data export (masked by default)**  
   `POST /api/account/export` (client) → schedules export  
   `GET /api/account/export/status` (client) → state  
   `GET /api/account/export/download` (client) → signed ZIP (limited TTL)  
   - Contents: requests/orders/calls/audit for the requester; emails/phones masked unless superadmin override.  
   - **Audit**: `account_export_requested|ready|downloaded`.

3) **Policy pages (Markdown)**  
   Serve static Markdown content consumed by theme (no style changes): Privacy, Terms, Refund Policy.

---

## 13) Edge Hardening & Deployment (Apply M13.1)

- Deploy `edge/nginx.conf` (or reverse proxy equivalent) and `edge/cloudflare-rules.json` (if CF/WAF present).  
- Enforce **strict CORS**, **Security Headers (CSP/HSTS/… )**, and protect `/api/ops/*` & `/api/cron/*` using `X-Job-Token` + optional IP allowlist.  
- TLS/HSTS enabled; body size & timeouts tuned; cache rules: `meta/*` short‑cache, others `no-store`.  
- No backend code/theme changes required.

---

## 14) Monitoring & Operations Wiring

- Hook `/api/ops/metrics` into external alerts (Email/Slack).  
- Schedule crons using existing templates (M12):  
  - **Daily purge** (keep last 50 days): `POST /api/cron/purge_old` @ 00:10 UTC.  
  - **Monthly voice refresh**: `POST /api/cron/voice/refresh` @ 01:00 UTC (1st).  
  - Include `X-Job-Token` header; rotate token every 90 days.  
- **Key rotation** every 90 days: Twilio, Supabase, DeepConf, Semantic Galaxy, JOB_TOKEN (documented in RUNBOOK).

---

## 15) Performance & Security Validation (Pre‑GA)

- **Read‑only Load Test** (no data writes): high‑QPS for `/api/horoscopes/daily` and admin archive listing; watch `avg_sql_latency_ms` and error rates.  
- **Pen Test (focused)**: Auth (M3), Orders (M4), Calls (M7), Assist (M10), Ops (M11).  
- Verify RLS policies remain enabled; API uses service role (bypass by design)—documented and understood.

---

## 16) One‑Week Execution Plan (Condensed)

1) **M14 Payments & Billing**: `create intent`, `webhook`, `refund`; store provider refs; generate invoice PDF (Storage signed delivery).  
2) **M15 Notifications**: templates + rate‑limits + optional opt‑out flags.  
3) **Frontend binding**: wire dashboards to existing APIs (no theme changes).  
4) **Privacy & Account**: implement delete (soft‑delete + purge queue) and masked export.  
5) **Edge hardening**: apply NGINX/Cloudflare rules from M13.1.  
6) **Final Ops**: enable crons, alerts wiring, keys rotation review.  
7) **Go/No‑Go**: run smoke tests, snapshot, cutover/rollback (M13 artifacts).

> **Definition of Done**: payments/refunds working with invoices; notifications emitted within limits; roles’ dashboards fully bound; self‑service privacy live; edge hardened; ops & alerts active; no mocks; psycopg2‑only; zero theme changes.



---

## 17) Global ALWAYS PRE‑READ (for every prompt/action)

Before executing **anything**, the agent must read all three files, then print a 6–10 line memo confirming understanding and zero‑theme‑drift before proceeding:

`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\SAMIA-TAROT-CONTEXT-ENGINEERING.md`  
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\Full Prompt.md`  
`C:\Users\saeee\OneDrive\Documents\project\samia-tarot-refactor\samia_tarot_context_engineering_m_14_m_15.md`

These three files are **mandatory pre‑read** across **all** modules and tasks (M1…M15, M13.x, etc.).



<!-- END SOURCE: samia_tarot_context_engineering_m_14_m_15.md -->



<!-- MISSING SOURCE: SAMIA-TAROT-CONTEXT-ENGINEERING-COMBINED.md -->

