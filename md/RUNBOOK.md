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