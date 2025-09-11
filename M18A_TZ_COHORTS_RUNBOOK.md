# M18A TZ Cohorts & Orchestration Runbook

**Version**: 1.0  
**Purpose**: Operational guide for daily horoscope orchestration via n8n with timezone cohorts, retention policies, and failure recovery.  
**Audience**: DevOps, Admin, Monitor roles  

---

## 1) Timezone Cohorts Definition

The system operates with **12 regional timezone cohorts** that trigger daily seeding at their local midnight:

| Cohort | UTC Offset | Regions | Local Midnight (UTC) | Example Cities |
|--------|------------|---------|---------------------|----------------|
| **GMT** | +0 | UK, Portugal | 00:00 UTC | London, Lisbon |
| **CET** | +1 | France, Germany, Italy | 23:00 UTC | Paris, Berlin, Rome |
| **EET** | +2 | Greece, Turkey, Egypt | 22:00 UTC | Athens, Cairo |
| **AST** | +3 | Saudi, Kuwait, Iraq | 21:00 UTC | Riyadh, Kuwait City |
| **GST** | +4 | UAE, Oman | 20:00 UTC | Dubai, Muscat |
| **PKT** | +5 | Pakistan | 19:00 UTC | Karachi |
| **IST** | +5.5 | India | 18:30 UTC | Mumbai, Delhi |
| **JST** | +9 | Japan | 15:00 UTC | Tokyo |
| **AET** | +11 | Australia East | 13:00 UTC | Sydney |
| **PST** | -8 | US West | 08:00 UTC | Los Angeles |
| **EST** | -5 | US East | 05:00 UTC | New York |
| **BRT** | -3 | Brazil | 03:00 UTC | São Paulo |

### DST Handling
- **Winter/Summer offsets are pre-calculated** in n8n workflows
- **Review twice yearly** (March/October) for DST transitions
- **Update cohort offsets** in n8n workflow JavaScript if needed

---

## 2) Daily Orchestration Flow

### 2.1) n8n Workflow: Daily Seeding
**File**: `n8n_workflow_daily_seeding.json`  
**Trigger**: Every hour (cron: `0 * * * *`)  
**Logic**:
1. Check current UTC hour
2. Calculate which cohorts are at local midnight
3. For each midnight cohort → seed 12 zodiac signs
4. POST to `/api/admin/horoscopes/seed-daily` per zodiac
5. Log results and errors

### 2.2) API Endpoint Details
```http
POST /api/admin/horoscopes/seed-daily
Headers:
  X-User-Id: system-n8n
  X-Job-Token: ${JOB_TOKEN}
  Content-Type: application/json
Body:
{
  "zodiac": "Aries",
  "ref_date": "2025-01-15", 
  "cohort": "GMT",
  "source_ref": "n8n-seeding-GMT-2025-01-15"
}
```

### 2.3) Idempotency Guarantee
- Uses `ON CONFLICT (scope, zodiac, ref_date) DO NOTHING`
- Multiple cohorts can seed same date safely
- Response: `{"action": "created"}` or `{"action": "exists"}`

---

## 3) Retention & Cleanup

### 3.1) n8n Workflow: 60-Day Retention
**File**: `n8n_workflow_retention_cleanup.json`  
**Trigger**: Daily at 02:00 UTC (cron: `0 2 * * *`)  
**Logic**:
1. Calculate cutoff date (60 days ago)
2. GET `/api/admin/horoscopes/retention-audit` for preview
3. DELETE `/api/admin/horoscopes/retention-cleanup` to execute
4. Delete both DB records AND Supabase Storage objects

### 3.2) Retention Policy
- **Items older than 60 days**: **Hard delete** (DB + Storage)
- **No archiving**: Once deleted, data is gone permanently
- **Storage cleanup**: Removes orphaned audio files from Supabase
- **Audit logs**: Retention actions are logged in `audit_log`

### 3.3) Pre-Delete Safety
```http
GET /api/admin/horoscopes/retention-audit?cutoff_date=2024-11-20
# Returns preview of items to be deleted
{
  "cutoff_date": "2024-11-20",
  "items_to_delete": 156,
  "storage_objects": 134, 
  "zodiac_breakdown": {"Aries": 13, "Taurus": 13, ...}
}
```

---

## 4) Monthly Upload Reminders

### 4.1) n8n Workflow: T-3 Reminder
**File**: `n8n_workflow_monthly_reminder.json`  
**Trigger**: Daily at 09:00 UTC (cron: `0 9 * * *`)  
**Logic**:
1. Check if today is exactly 3 days before month end
2. GET `/api/admin/horoscopes/upload-status` for next month
3. If missing uploads → POST `/api/admin/notifications/send-reminder`
4. Priority: `high` if >6 signs missing, `normal` otherwise

### 4.2) Upload Status Check
```http
GET /api/admin/horoscopes/upload-status?next_month=2&next_year=2025
# Returns completion status
{
  "uploaded_signs": ["Aries", "Taurus", "Gemini"],
  "missing_signs": ["Cancer", "Leo", ...], 
  "completion_percentage": 25.0
}
```

---

## 5) Access Control & Security

### 5.1) System Authentication
- **n8n workflows** use `X-User-Id: system-n8n` + `X-Job-Token: ${JOB_TOKEN}`
- **JOB_TOKEN** must be set in environment variables
- **Admin/Superadmin** can also access these endpoints (for manual operations)

### 5.2) RLS Policy Summary
| Role | Today (approved) | ≤60 days (non-public) | >60 days |
|------|------------------|------------------------|----------|
| Public/Client | ✅ Read | ❌ No | ❌ N/A |
| Reader | ❌ No | ✅ Signed URLs only | ❌ No |
| Admin | ❌ No | ✅ Full manage/read | ❌ No |
| Monitor | ✅ Approve/Reject | ✅ Read (review) | ❌ No |
| System | ✅ Seed/Cleanup | ✅ Full access | ❌ No |

### 5.3) Signed URL Discipline
- **No permanent public URLs** for non-today horoscopes
- **Reader/Admin access** to ≤60 day items via server-issued signed URLs only
- **Expiry**: 1 hour (3600 seconds) for preview URLs

---

## 6) Failure Scenarios & Recovery

### 6.1) n8n Workflow Failures
**Scenario**: n8n workflow fails or stops  
**Detection**: Missing seeding for multiple cohorts  
**Recovery**:
```bash
# Manual seeding for missed date
curl -X POST "${API_BASE}/api/admin/horoscopes/seed-daily" \
  -H "X-User-Id: admin123" \
  -H "Content-Type: application/json" \
  -d '{"zodiac": "Aries", "ref_date": "2025-01-15", "cohort": "manual"}'

# Repeat for all 12 zodiac signs
```

### 6.2) Database Connection Issues
**Scenario**: Database connection pool exhausted  
**Detection**: HTTP 500 errors from seeding endpoints  
**Recovery**:
1. Check database connection pool in logs
2. Restart API service if needed
3. Re-run failed seedings (idempotent, safe to retry)

### 6.3) Storage Service Unavailable  
**Scenario**: Supabase Storage down during retention cleanup  
**Detection**: Storage deletion errors in cleanup logs  
**Recovery**:
1. Retention cleanup continues with DB deletion
2. Storage errors are logged but don't block the process
3. Orphaned storage objects will be cleaned up on next successful run

### 6.4) Job Token Compromise
**Scenario**: JOB_TOKEN leaked or needs rotation  
**Recovery**:
1. Generate new token: `openssl rand -hex 32`
2. Update `JOB_TOKEN` in environment variables
3. Update n8n workflow credentials
4. Old token becomes invalid immediately

### 6.5) Timezone/DST Issues
**Scenario**: Incorrect seeding due to DST changes  
**Detection**: Missing or double-seeded dates  
**Recovery**:
1. Check n8n workflow timezone cohort logic
2. Update UTC offsets for affected cohorts
3. Manually seed missing dates if needed (idempotent)

---

## 7) Monitoring & Alerts

### 7.1) Key Metrics to Monitor
- **Daily seeding count**: Should be ~144 operations/day (12 cohorts × 12 signs)
- **Retention cleanup frequency**: Once daily at 02:00 UTC
- **Upload reminder triggers**: Should occur 3 days before month end
- **API error rates**: Monitor 403/500 errors from orchestration endpoints

### 7.2) Alert Thresholds
- **High Priority**: >50 horoscopes deleted in retention cleanup
- **High Priority**: >6 zodiac signs missing 3 days before month end
- **Warning**: Storage deletion errors in retention cleanup
- **Warning**: n8n workflow execution failures

### 7.3) Health Check Endpoints
```bash
# Verify API is responding
curl "${API_BASE}/health"

# Check recent audit logs
curl -H "X-User-Id: admin123" "${API_BASE}/api/admin/audit?limit=20"

# Verify database connectivity
python -c "import psycopg2; print('DB OK' if psycopg2.connect('${DB_DSN}') else 'DB FAIL')"
```

---

## 8) Manual Operations

### 8.1) Force Daily Seeding
```bash
# Seed all 12 signs for specific date
DATE="2025-01-15"
for ZODIAC in Aries Taurus Gemini Cancer Leo Virgo Libra Scorpio Sagittarius Capricorn Aquarius Pisces; do
  curl -X POST "${API_BASE}/api/admin/horoscopes/seed-daily" \
    -H "X-User-Id: admin123" \
    -H "Content-Type: application/json" \
    -d "{\"zodiac\": \"$ZODIAC\", \"ref_date\": \"$DATE\", \"cohort\": \"manual\"}"
done
```

### 8.2) Manual Retention Cleanup
```bash
# Audit first (preview)
CUTOFF="2024-11-20"
curl "${API_BASE}/api/admin/horoscopes/retention-audit?cutoff_date=${CUTOFF}" \
  -H "X-User-Id: admin123"

# Execute cleanup (destructive!)
curl -X DELETE "${API_BASE}/api/admin/horoscopes/retention-cleanup" \
  -H "X-User-Id: admin123" \
  -H "Content-Type: application/json" \
  -d "{\"cutoff_date\": \"$CUTOFF\", \"retention_days\": 60, \"confirm_delete\": true}"
```

### 8.3) Upload Status Check
```bash
# Check next month upload progress
MONTH=2
YEAR=2025
curl "${API_BASE}/api/admin/horoscopes/upload-status?next_month=${MONTH}&next_year=${YEAR}" \
  -H "X-User-Id: admin123"
```

---

## 9) Environment Configuration

### 9.1) Required Environment Variables
```bash
# Database
DB_DSN=postgresql://user:pass@host:5432/dbname

# Supabase
SUPABASE_URL=https://project.supabase.co
SUPABASE_ANON=eyJhbGci...
SUPABASE_SERVICE=eyJhbGci...

# Job token for n8n
JOB_TOKEN=generate_with_openssl_rand_hex_32

# API base URL (for n8n workflows)
SAMIA_API_BASE=https://api.samia-tarot.com
```

### 9.2) n8n Environment Variables
```bash
# In n8n workflow settings
SAMIA_API_BASE=https://api.samia-tarot.com
SAMIA_JOB_TOKEN=your_job_token_here
```

---

## 10) Troubleshooting Quick Reference

| Problem | Likely Cause | Quick Fix |
|---------|--------------|-----------|
| No seeding for GMT cohort | n8n workflow stopped | Restart n8n, manually seed missed date |
| 403 errors from system endpoints | Wrong/missing JOB_TOKEN | Check environment variable |
| Retention cleanup failing | Database connection issues | Check DB pool, restart API |
| Missing upload reminders | Wrong date calculation | Check month-end logic in workflow |
| Double-seeded dates | DST transition issue | Update cohort UTC offsets |
| Storage errors in cleanup | Supabase Storage down | Retry cleanup later (idempotent) |
| Public API returns old horoscopes | RLS not enforcing today-only | Check horoscopes.approved_at + ref_date |

---

**Last Updated**: January 2025  
**Next Review**: March 2025 (DST transition)  
**Contact**: Admin team for operational issues, Monitor team for content issues