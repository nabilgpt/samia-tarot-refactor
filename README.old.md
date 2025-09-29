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