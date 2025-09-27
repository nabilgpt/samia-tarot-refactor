# SAMIA-TAROT Launch Checklist

**Pre-Launch Validation**: Complete all items before production cutover. Check each item and initial/date when verified.

## Secrets & Environment Configuration

### Required Environment Variables
- [ ] **DB_DSN**: Supabase Session Pooler connection string configured
- [ ] **SUPABASE_URL**: https://ciwddvprfhlqidfzklaq.supabase.co
- [ ] **SUPABASE_SERVICE**: Service role key configured (required for storage operations)
- [ ] **SUPABASE_BUCKET**: Set to `audio` (private bucket for media assets)

### Twilio Configuration (Required)
- [ ] **TWILIO_ACCOUNT_SID**: Account SID configured
- [ ] **TWILIO_AUTH_TOKEN**: Auth token configured  
- [ ] **TWILIO_VERIFY_SID**: Verify service SID configured
- [ ] **TWILIO_VOICE_CALLER_ID**: Verified caller ID for voice calls
- [ ] **TWILIO_WEBHOOK_BASE**: Public API URL for webhooks (https://yourdomain.com)

### Optional Services (503 response if missing)
- [ ] **YTDLP_BIN**: Path to yt-dlp binary for TikTok ingestion
- [ ] **VOICE_PROVIDER**: Voice synthesis provider (elevenlabs/azure)
- [ ] **VOICE_API_KEY**: Voice synthesis API key
- [ ] **DEEPCONF_API_URL**: Internal AI assist endpoint
- [ ] **DEEPCONF_API_KEY**: Internal AI assist API key
- [ ] **SEMANTIC_API_URL**: Semantic search endpoint  
- [ ] **SEMANTIC_API_KEY**: Semantic search API key

### Security Tokens
- [ ] **JOB_TOKEN**: Generated with `openssl rand -hex 32`
- [ ] **JOB_TOKEN**: Stored securely in server environment
- [ ] **JOB_TOKEN**: Updated in cron XML templates

**Initial**: _______ **Date**: _______

## Database & Storage Security

### Database Configuration
- [ ] **Migration Status**: Run `python migrate.py audit` - all 6 migrations applied
- [ ] **Connection Test**: Database connectivity verified via Session Pooler
- [ ] **RLS Policies**: Row Level Security enabled on 7 critical tables
- [ ] **Service Role**: API bypasses RLS using service role (documented behavior)

### Storage Security
- [ ] **Bucket Privacy**: `audio` bucket configured as private (no public access)
- [ ] **Signed URLs**: Media delivery exclusively via signed URLs
- [ ] **CORS Configuration**: Bucket CORS limited to frontend domains only
- [ ] **Upload Limits**: File size limits configured (audio files)

**Initial**: _______ **Date**: _______

## Rate Limiting & Production Values

### Default Rate Limits (verify via `/api/ops/rate_limits`)
- [ ] **Orders**: 10 per hour per user
- [ ] **Phone Verification**: 5 per hour per user  
- [ ] **AI Assist Drafts**: 10 per hour per reader
- [ ] **AI Assist Search**: 20 per hour per reader
- [ ] **Knowledge Add**: 5 per hour per admin

### Production Rate Limit Tuning
```bash
curl -X POST https://yourdomain.com/api/ops/rate_limits \
  -H "X-User-ID: <admin-uuid>" \
  -H "Content-Type: application/json" \
  -d '{
    "rate_orders_per_hour": 15,
    "rate_phone_verify_per_hour": 3,
    "rate_assist_draft_per_hour": 8
  }'
```

**Initial**: _______ **Date**: _______

## Network & Edge Security

### CORS Configuration
- [ ] **Frontend Domains**: CORS allowlist configured for web domains only
- [ ] **API Endpoints**: No wildcard (*) origins in production
- [ ] **Credentials**: CORS configured to include credentials if needed

### TLS & HTTPS
- [ ] **TLS Certificate**: Valid SSL certificate installed
- [ ] **HTTP Redirect**: HTTP → HTTPS redirect enabled
- [ ] **HSTS Headers**: Strict-Transport-Security header configured

### Edge Protection (Optional)
- [ ] **CDN/WAF**: Cloudflare or equivalent WAF configured
- [ ] **Bot Protection**: Basic bot blocking rules enabled
- [ ] **Admin Endpoints**: `/api/ops/*` restricted to admin IPs/networks
- [ ] **Rate Limiting**: Edge-level rate limiting for DDoS protection

**Initial**: _______ **Date**: _______

## Scheduled Jobs & Automation

### Cron Job Installation
- [ ] **Daily Purge**: `cron_purge_daily.xml` imported to Task Scheduler
- [ ] **Monthly Voice**: `cron_voice_monthly.xml` imported to Task Scheduler
- [ ] **Job Tokens**: Both jobs configured with `X-Job-Token` header
- [ ] **Placeholders**: Replaced `<API_BASE_URL>`, `<ADMIN_USER_UUID>`, `<SUPERADMIN_USER_UUID>`

### Cron Job Testing (Dry Run)
```bash
# Test daily purge (should return 200/204)
curl -X POST https://yourdomain.com/api/cron/purge_old \
  -H "X-User-ID: <admin-uuid>" \
  -H "X-Job-Token: <job-token>"

# Test voice refresh (should return 200/503)  
curl -X POST https://yourdomain.com/api/cron/voice/refresh \
  -H "X-User-ID: <superadmin-uuid>" \
  -H "X-Job-Token: <job-token>"
```

**Initial**: _______ **Date**: _______

## Third-Party Provider Validation

### Twilio Services
- [ ] **Phone Verification**: Test SMS delivery via `/api/verify/phone/start`
- [ ] **Caller ID**: Verified phone number for voice calls
- [ ] **Webhooks**: Webhook endpoints accessible from Twilio servers
- [ ] **Conference Calls**: Test conference creation and management

### TikTok Integration  
- [ ] **yt-dlp Binary**: Available on system PATH
- [ ] **Download Test**: Can extract audio from sample TikTok URL
- [ ] **Storage Upload**: Can upload extracted audio to Supabase storage

### Voice Synthesis (Optional)
- [ ] **Provider Available**: Voice provider API responds (or 503 acceptable)
- [ ] **Model Refresh**: Monthly voice model refresh endpoint works
- [ ] **Audio Generation**: Test voice synthesis if provider configured

**Initial**: _______ **Date**: _______

## Backup & Disaster Recovery

### Database Backup
- [ ] **Pre-Cutover Snapshot**: Full database snapshot taken before launch
- [ ] **Backup Verification**: Backup file integrity verified
- [ ] **Restore Process**: Restore procedure documented and tested
- [ ] **Recovery Time**: RTO/RPO requirements defined and achievable

### Storage Backup
- [ ] **Media Assets**: Audio files backed up separately from database
- [ ] **Retention Policy**: Backup retention policy defined (50+ days)
- [ ] **Archive Strategy**: Old media archival process documented

### Quota & Resource Monitoring
- [ ] **Storage Limits**: Monitor Supabase storage quota
- [ ] **API Limits**: Track Twilio/provider API usage
- [ ] **Database Size**: Monitor database growth and limits
- [ ] **Connection Limits**: Session Pooler connection limits understood

**Initial**: _______ **Date**: _______

---

# Cutover & Rollback Plan

## Pre-Cutover Final Checks (T-30 minutes)

1. **Final Migration Check**
   ```bash
   python migrate.py up
   # Expected: All migrations show [=] skip (already applied)
   ```

2. **Production Rate Limits** 
   ```bash
   curl -X POST https://yourdomain.com/api/ops/rate_limits \
     -H "X-User-ID: <admin-uuid>" \
     -d '{"rate_orders_per_hour": 15, "rate_phone_verify_per_hour": 3}'
   ```

3. **Enable Scheduled Jobs**
   - Import both cron XML templates to Task Scheduler
   - Verify jobs are enabled and scheduled correctly

**Cutover Team Present**: [ ] Database Admin [ ] DevOps [ ] Network Admin

## Cutover Steps (T-0)

### Step 1: DNS/Load Balancer Switch
- [ ] **DNS Update**: Point domain to new API server (low TTL configured)
- [ ] **Load Balancer**: Update upstream servers to new backend
- [ ] **Health Check**: Verify load balancer health checks pass

### Step 2: Enable Monitoring
- [ ] **Cron Jobs**: Enable Task Scheduler cron jobs
- [ ] **Health Checks**: External monitoring hitting `/api/ops/health`
- [ ] **Alert Channels**: Confirm alerts are routing correctly

### Step 3: Smoke Tests Execution
```bash
# Windows
.\smoke_readonly.ps1 -BaseUrl "https://yourdomain.com" -AdminUserId "<admin-uuid>"

# Linux  
./smoke_readonly.sh "https://yourdomain.com" "<admin-uuid>"
```

**Expected Results**: All tests PASS, exit code 0

**Cutover Complete Time**: _______ **By**: _______

## Rollback Plan (≤10 minutes)

### Immediate Rollback (if smoke tests fail)

1. **Revert DNS/Load Balancer** (2 minutes)
   - Point DNS back to previous backend
   - Update load balancer upstream servers
   - Verify traffic routing to old system

2. **Disable New Cron Jobs** (1 minute)
   - Disable Task Scheduler jobs temporarily
   - Prevent new system from processing scheduled tasks

3. **Database State** (No Action Required)
   - Keep database intact - no destructive migrations in M1-M13
   - New system migrations are all additive/idempotent
   - Data remains accessible to old system

4. **Communication**
   - Notify stakeholders of rollback
   - Document rollback reason for post-mortem
   - Plan remediation before next cutover attempt

**Rollback Trigger Conditions**:
- Smoke tests fail (any endpoint returns non-2xx)
- Database connectivity issues
- Critical third-party provider failures
- Performance degradation >50% from baseline

**Rollback Authority**: Any member of cutover team can initiate rollback

**Rollback Complete Time**: _______ **By**: _______

## Post-Cutover Verification (T+30 minutes)

- [ ] **User Registration**: Test complete user signup flow
- [ ] **Order Creation**: Verify orders can be created and assigned  
- [ ] **Phone Verification**: Test SMS verification end-to-end
- [ ] **Admin Functions**: Verify ops endpoints accessible
- [ ] **Monitoring Data**: Confirm metrics collection working

**Production Launch Certified**: _______ **Date**: _______ **By**: _______