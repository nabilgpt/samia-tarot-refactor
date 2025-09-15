# SAMIA-TAROT — Comprehensive Context Engineering (Unified Master)

> **Purpose**: Single authoritative document consolidating all context engineering specifications, modules, prompts, and guardrails from M1 through M46.
> **Prime Directive**: Build backend/DB only. **Do NOT change the cosmic/neon theme**. Keep all code **maintainable & short**.

---

## 0) Non-Negotiable Guardrails

### Core Constraints
- **Zero Theme Changes**: Never touch or change the cosmic/neon theme. Any new page must match existing theme exactly
- **Backend Only**: All work is database, APIs, and integrations - no UI/CSS modifications allowed
- **Maintainable & Short Code**: Prefer small, composable modules with explicit contracts
- **DB-First Security**: RLS policies enforced at database level before route guards
- **Private Storage Only**: Short-lived Signed URLs (≤15 min default, invoices ≤60 min)
- **No Mocks/Test Data**: Real providers or HTTP 503 responses
- **Complete Auditability**: All sensitive actions logged with immutable trail

### Database Connection (Always)
- **Database**: PostgreSQL via Supabase Session Pooler
- **DSN**: `postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres`
- **Access Method**: Python + psycopg2 (direct SQL, no ORM)
- **Migration Runner**: `python migrate.py audit|up` (idempotent)

---

## 1) Architecture Stack

### Technology Stack
- **Backend**: FastAPI (Python) with uvicorn
- **Database**: PostgreSQL (Supabase) with strict RLS
- **Auth**: Supabase Auth + JWT with role-based access
- **Storage**: Supabase Storage (private buckets only)
- **Payments**: Stripe with webhook HMAC verification
- **Communications**: Twilio (SMS/calls), SMTP, FCM (push notifications)
- **Monitoring**: Golden Signals (latency, traffic, errors, saturation)

### Role Matrix
| Role | Permissions |
|------|-------------|
| `client` | Create orders, view own data, pay, fetch invoices via Signed URLs |
| `reader` | Read assigned orders, upload results, manage availability |
| `monitor` | Approve/reject content, terminate calls, moderate users |
| `admin` | User management, exports, notification templates, rate limits |
| `superadmin` | Full access including raw PII exports (audited) |

---

## 2) Module Roadmap (M1-M46)

### Foundation Phase (M1-M13)
- **M1-M2**: Core schema, migrations, psycopg2 runner
- **M3**: Auth sync, phone verification via Twilio Verify
- **M4**: Orders workflow (create → assign → approve → deliver)
- **M5**: TikTok horoscope ingestion with monitor approval
- **M6**: Astro service with human-voiced audio results
- **M7**: Voice calls via Twilio with monitor controls
- **M8**: Security hardening with RLS policies and rate limiting
- **M9**: Countries metadata and profile completeness
- **M10**: Internal AI assist (for readers only)
- **M11**: Ops monitoring, CSV exports, metrics
- **M12**: Knowledge base and search functionality
- **M13**: Complete order lifecycle testing

### Core Services Phase (M14-M20)
- **M14**: Payments & billing (Stripe integration, invoices, refunds)
- **M15**: Notifications (email, SMS, push via templates)
- **M16-M17**: Voice calls scheduling and security
- **M18**: Moderation system with blocking/approval
- **M19**: Immutable audit trail with hash-chaining
- **M20**: Daily horoscopes with strict approval workflow

### Advanced Features Phase (M21-M31)
- **M21**: Moderation & audit layer with appeals
- **M22**: Notifications & campaigns with timezone scheduling
- **M23**: Analytics & KPIs (no PII)
- **M24**: Community features (feature-flagged OFF)
- **M25**: Personalization (internal AI only)
- **M26**: AR experiments (optional backend)
- **M27**: i18n deepening with ICU MessageFormat
- **M28**: Secrets & providers ops hardening
- **M29**: SRE & cost guards with rate limiting
- **M30**: Go-live readiness & compliance pack
- **M31**: Production cutover & D0-D7 monitoring

### Launch Operations Phase (M32-M46)
- **M32-M34**: Launch runbooks, observability, backup/DR
- **M35-M37**: E2E testing, performance hardening, accessibility
- **M38-M39**: Legal compliance, mobile packaging
- **M40-M42**: Emergency systems, AI monitoring, payments QA
- **M43-M44**: Data freeze, daily zodiac pipeline
- **M45-M46**: Admin guardrails, documentation & handover

---

## 3) Database Schema & RLS Policies

### Core Tables
```sql
-- Core user and business logic
profiles, roles, services, orders, order_events, media_assets
horoscopes, horoscope_approvals
calls, call_events, call_recordings
moderation_actions, blocked_profiles, audit_log
app_settings, api_rate_limits

-- Payments (M14)
payment_intents, payment_events, invoices, invoice_items, refunds
promo_codes, wallets, wallet_ledger

-- Notifications (M15)
notif_templates, notif_prefs, notif_log

-- Advanced Features
posts, post_comments, post_reacts (M24 - feature flagged)
personalization_features, personalization_ranks (M25)
ar_assets, ar_links (M26)
translations, translation_glossary (M27)
```

### Daily Horoscopes RLS Policy (Critical)
```sql
-- Public access: TODAY + APPROVED only
CREATE POLICY "public_daily_horoscopes" ON horoscopes FOR SELECT
TO anon, authenticated
USING (
  scope = 'daily'
  AND ref_date = CURRENT_DATE
  AND approved_at IS NOT NULL
);

-- Internal access: ≤60 days for readers/admin via Signed URLs
CREATE POLICY "internal_horoscope_access" ON horoscopes FOR SELECT
TO authenticated
USING (
  ref_date >= CURRENT_DATE - INTERVAL '60 days'
  AND (
    auth.jwt() ->> 'role' IN ('reader', 'admin', 'superadmin')
    OR uid() = uploader_id
  )
);

-- Hard deletion: >60 days removed by scheduled job
-- Retention job removes both DB records AND storage objects
```

### RLS Enforcement Pattern
- **Client**: `uid() = owner_id` row access only
- **Reader**: Assigned orders/results only
- **Monitor**: Approval queue and moderation actions
- **Admin**: Scoped management operations
- **Superadmin**: Elevated access with audit trail

---

## 4) API Specifications

### Authentication & Profile
```
POST /api/auth/sync              # Supabase auth → profiles sync
POST /api/verify/phone           # Phone verification via Twilio
POST /api/profile/complete       # Complete profile with zodiac calculation
GET  /api/meta/countries         # Country metadata
GET  /api/meta/zodiacs          # Zodiac signs data
```

### Orders Workflow
```
POST /api/orders                 # Create new order (client)
GET  /api/orders/{id}           # Fetch order details
POST /api/orders/{id}/assign     # Assign to reader (admin)
POST /api/orders/{id}/result     # Upload result (reader)
POST /api/orders/{id}/approve    # Approve result (monitor)
POST /api/orders/{id}/reject     # Reject result (monitor)
POST /api/orders/{id}/deliver    # Finalize delivery (admin)
```

### Daily Horoscopes (M18A Policy)
```
POST /api/horoscopes/upload      # Admin-only monthly audio upload
GET  /api/horoscopes/daily       # Public: today + approved only
POST /api/horoscopes/{id}/approve # Monitor approval
POST /api/horoscopes/{id}/reject  # Monitor rejection
GET  /api/horoscopes/{id}/media   # Internal: Signed URL (≤60 days)
```

### Payments (M14)
```
POST /api/payments/intent        # Create payment intent
POST /api/payments/webhook       # Stripe webhook (HMAC verified)
POST /api/payments/refund        # Process refund (admin only)
GET  /api/payments/invoice/{id}  # Fetch invoice via Signed URL
GET  /api/payments/methods       # Available payment methods
```

### Notifications (M15)
```
POST /api/notifications/send     # Send notification
POST /api/notifications/templates # Upsert templates (admin)
GET  /api/notifications/prefs    # User preferences
POST /api/notifications/prefs    # Update preferences
```

### Voice Calls
```
POST /api/calls/schedule         # Schedule call
POST /api/calls/initiate         # Start call
POST /api/calls/terminate        # End call (monitor can drop)
POST /api/calls/webhook          # Twilio webhook (HMAC + IP allowlist)
```

### Operations & Monitoring
```
GET  /api/ops/health             # Health check with dependencies
GET  /api/ops/snapshot           # System snapshot
GET  /api/ops/metrics            # Prometheus-style metrics
POST /api/ops/export             # Generate data exports
```

### Security Guards
- **Missing providers**: Return HTTP 503 (fail-safe)
- **Webhook verification**: HMAC signature required
- **Rate limiting**: 429 with `Retry-After` header
- **Authentication**: JWT validation on all protected endpoints
- **Input validation**: Strict schemas with error details

---

## 5) Security & Compliance

### Authentication & Authorization
- **JWT tokens** via Supabase Auth with role claims
- **Phone verification** via Twilio Verify API
- **Session management** with secure token rotation
- **Role-based access** with least privilege principle

### Data Protection
- **PII masking** in exports by default
- **Raw PII access** restricted to superadmin with legal basis
- **Audit trail** for all data access and modifications
- **Retention policies** with automated cleanup

### Age & Compliance
- **18+ enforcement** with COPPA safeguards
- **GDPR Article 15/17** export and deletion services
- **Consent management** with versioned agreements
- **Legal basis tracking** for data processing

### Webhook Security
- **HMAC verification** for all external webhooks
- **IP allowlisting** for Twilio callbacks
- **Signature validation** with timing-safe comparison
- **Failed webhook logging** with retry policies

---

## 6) Operations & Monitoring

### Golden Signals Implementation
```python
# Latency: p50, p95, p99 response times
# Traffic: Request rate per endpoint
# Errors: Error rate by status code
# Saturation: Database connections, memory usage
```

### Rate Limiting
```python
# 429 responses include Retry-After header
# Configurable limits per endpoint and role
# Sliding window implementation
# Metrics exported for monitoring
```

### Backup & Recovery
- **Nightly full backups** with 30-day retention
- **WAL archiving** for point-in-time recovery
- **Quarterly restore drills** on staging
- **GameDay scenarios**: DB loss, provider outage, storage failure

### Alerting Thresholds
- **Error rate** >1% sustained for 5 minutes
- **Response time** p95 >500ms for 3 minutes
- **Database connections** >80% of pool
- **Storage usage** >85% of quota

---

## 7) Environment Configuration

### Required Environment Variables
```bash
# Database
DB_DSN=postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres

# Supabase
SUPABASE_URL=https://ciwddvprfhlqidfzklaq.supabase.co
SUPABASE_ANON=[anon_key]
SUPABASE_SERVICE=[service_key]
SUPABASE_BUCKET=audio

# Payments
STRIPE_PUBLISHABLE_KEY=pk_[environment]_[key]
STRIPE_SECRET_KEY=sk_[environment]_[key]
STRIPE_WEBHOOK_SECRET=whsec_[secret]

# Communications
TWILIO_ACCOUNT_SID=[sid]
TWILIO_AUTH_TOKEN=[token]
TWILIO_VERIFY_SID=[verify_sid]

# Notifications
FCM_SERVICE_ACCOUNT_JSON=./fcm-service-account.json
SMTP_HOST=[smtp_server]
SMTP_USER=[smtp_user]
SMTP_PASS=[smtp_password]

# Performance Monitoring
LHCI_GITHUB_APP_TOKEN=[lighthouse_ci_token]

# Security
JOB_TOKEN=[32_byte_hex_token]
PUBLIC_WEBHOOK_BASE=[ngrok_or_domain_url]
```

---

## 8) Module Execution Guidelines

### Pre-Execution Requirements (MANDATORY)
**Before executing ANY prompt or module**, agent must read and confirm alignment with ALL context files:
- `SAMIA-TAROT-CONTEXT-ENGINEERING-MASTER-M1-M46.md`
- `SAMIA-TAROT-CONTEXT-ENGINEERING-MASTER-M1-M46 2.md`
- `SAMIA-TAROT-CONTEXT-ENGINEERING-3.md`
- `SAMIA-TAROT-CONTEXT-ENGINEERING-4.md`

### Execution Loop Pattern
1. **Think**: State the precise delta (DB rows, columns, endpoints)
2. **Act**: Run psycopg2 scripts/migrations; wire minimal endpoints
3. **Verify**: Query back with psycopg2 and test routes to prove functionality
4. **Stop**: Await confirmation before proceeding to next module

### Migration Pattern
```python
# Always use psycopg2 direct connection
import os, psycopg2
dsn = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

with psycopg2.connect(dsn) as conn, conn.cursor() as cur:
    # Idempotent DDL operations
    cur.execute("CREATE TABLE IF NOT EXISTS ...")
    cur.execute("CREATE POLICY IF NOT EXISTS ...")
    conn.commit()
```

### Acceptance Checklist (Per Module)
- [ ] DB objects present & idempotent (re-running yields "skip")
- [ ] Minimal endpoints callable from existing UI without theme changes
- [ ] Role gates enforced in SQL and route guards
- [ ] Monitor powers function correctly
- [ ] Audit entries recorded for sensitive actions
- [ ] No new theme/layout files introduced

---

## 9) Copy-Paste Ready Prompts

### M14 Payments Implementation
```
Before doing anything, read the ENTIRE Master context files and confirm alignment.
Do NOT touch or change the theme/UX. Keep code maintainable & short.

Goal: Implement complete payments system with Stripe integration.

Deliverables:
1. Create 007_payments.sql with payment_intents, payment_events, invoices, refunds tables
2. Add /api/payments/intent, /api/payments/webhook, /api/payments/refund endpoints
3. Implement HMAC webhook verification and invoice PDF generation
4. Add Signed URL access for invoice fetching
5. Return HTTP 503 when Stripe keys missing

Acceptance:
- Payment intents create successfully with idempotency
- Webhooks verify HMAC signatures correctly
- Invoices generate as PDFs in private storage
- Refunds restricted to admin role only
- All payment events logged to audit trail
```

### M15 Notifications Implementation
```
Before doing anything, read the ENTIRE Master context files and confirm alignment.
Do NOT touch or change the theme/UX. Keep code maintainable & short.

Goal: Implement notification system with templates and multi-channel delivery.

Deliverables:
1. Create 008_notifications.sql with notif_templates, notif_prefs, notif_log tables
2. Add template management endpoints for admin role
3. Implement FCM, SMTP, and SMS delivery channels
4. Add user preference management
5. Wire triggers for order state changes and payment events

Acceptance:
- Templates support EN/AR with placeholders
- User preferences respected for channel selection
- Rate limiting prevents notification spam
- Failed deliveries logged with retry logic
- HTTP 503 when provider keys missing
```

---

## 10) Development Environment Setup

### Quick Start Commands
```bash
# Copy environment template
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
python migrate.py audit  # Check current state
python migrate.py up     # Apply pending migrations

# Start API server
uvicorn api:app --reload --port 8000

# Start ngrok for webhook testing
ngrok http 8000

# Test health endpoint
curl -H "X-User-ID: [valid_uuid]" http://localhost:8000/api/ops/health
```

### Verification Steps
1. **Database**: All tables created, RLS policies active
2. **API**: Health endpoint responding with dependency checks
3. **Webhooks**: Payment webhook returning 503 (expected without keys)
4. **Security**: Profile validation enforced on protected endpoints
5. **Storage**: FCM service account configured
6. **Monitoring**: Ready for Lighthouse CI integration

---

## 11) Final Notes

### Development Workflow
- Always use `.env` file for local development
- Database work exclusively through psycopg2 + Session Pooler
- Test webhook integrations via ngrok tunnels
- Maintain audit trail for all sensitive operations
- Follow surgical edit approach - minimal, targeted changes

### Production Readiness
- All sensitive actions logged immutably
- Rate limiting with proper HTTP semantics
- Backup/recovery procedures documented
- Performance monitoring with SLO adherence
- Security hardening with defense in depth

### Theme Preservation
- **Absolute rule**: No changes to cosmic/neon theme
- Backend-only development approach
- Any new admin pages must match existing design exactly
- Links-only integration - no visual modifications

---

**This document serves as the single source of truth for SAMIA-TAROT platform development. All modules, security requirements, and operational procedures are defined herein.**