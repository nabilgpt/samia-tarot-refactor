# SAMIA TAROT — Staging Deployment Guide

**Status**: ✅ Ready for Staging Deployment  
**Date**: 2025-08-18  
**Backend API Alignment**: Complete

## 🚀 Quick Staging Deployment

### 1. Enable Feature Flag
In your **Admin Settings** (or environment config):

```bash
# Add or update the feature flag
backend.flatTables = ON

# Optional: Gradual rollout flag
backend.flatTables.canaryPercentage = 100  # Start with 100% for staging
```

### 2. Apply Compatibility Views (Recommended)
For instant rollback capability:

```sql
-- Execute the compatibility views
psql -f backend_api_alignment_pkg/db/compat_views.sql

-- Or via Supabase SQL Editor
\i backend_api_alignment_pkg/db/compat_views.sql
```

### 3. Verify Core Functionality

**Quick Health Check:**
```bash
# Basic API connectivity
curl https://your-staging-api.com/health

# Authentication flow
curl -X POST https://your-staging-api.com/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Table access test
curl -H "Authorization: Bearer <JWT>" \
  https://your-staging-api.com/admin/deck-cards
```

**RLS Policy Validation:**
```bash
# Test that clients can't access AI drafts
curl -H "Authorization: Bearer <CLIENT_JWT>" \
  https://your-staging-api.com/readings/test-id/draft
# Expected: 403 Forbidden

# Test that readers CAN access AI drafts  
curl -H "Authorization: Bearer <READER_JWT>" \
  https://your-staging-api.com/readings/test-id/draft
# Expected: 200 OK with audit log entry
```

### 4. Test All 8 Production Features

**A. Arabic RTL & Compact Lists**
- ✅ Admin settings page loads with RTL support
- ✅ Mobile views show compact list formatting

**B. Admin Spread Visibility**
- ✅ Public spreads visible to all readers
- ✅ Targeted spreads only visible to assigned readers

**C. Deck Bulk Upload (78+1 cards)**  
- ✅ Upload session tracks progress correctly
- ✅ Card validation enforces 78 numbered + 1 back card
- ✅ `is_back=true` cards appear first in ordering

**D. Reader Availability & Emergency Opt-in**
- ✅ Availability windows save/load correctly
- ✅ Emergency opt-in flag toggles properly

**E. Tarot V2 Client Reveal**
- ✅ Card reveal sequence enforced (must reveal 1→2→3...)
- ✅ AI drafts isolated (`ai_draft_visible_to_client = FALSE`)
- ✅ Audit logging captures reader access to AI content

**F. Calls/WebRTC with Consent & Extensions**
- ✅ Call consent requires IP address logging
- ✅ Emergency extensions create new bookings (progressive pricing)
- ✅ Recording status tracked properly

**G. Daily Zodiac Pipeline**
- ✅ Manual trigger works: `POST /admin/zodiac/run`
- ✅ Scheduler set to 07:00 Asia/Beirut timezone
- ✅ Generates 12 audio files (one per zodiac sign)

**H. Security & RLS Coverage**
- ✅ RLS policies enforce role-based access
- ✅ Cross-user data access blocked (403 responses)
- ✅ Payment transactions prevent test account abuse

## 📊 Monitoring Metrics (Staging)

**Success Criteria:**
- **API Response Time P95**: < 2 seconds
- **Database Query Time P95**: < 500ms  
- **Error Rate**: < 0.1% (expect near zero in staging)
- **RLS Violations**: = 0 (any 403 not by design requires investigation)

**Key Endpoints to Monitor:**
```bash
# Core functionality
GET /health
POST /auth/signin
GET /admin/spreads

# Feature-specific
POST /readings/{id}/reveals  # Card reveal sequence
GET /readings/{id}/draft     # AI draft isolation  
POST /calls/{id}/start       # Consent logging
POST /admin/zodiac/run       # Manual zodiac trigger
```

## 🚨 Rollback Plan (< 1 minute)

If any issues arise:

**Option 1: Feature Flag (Immediate)**
```bash
backend.flatTables = OFF
# Old schema-based queries resume immediately
```

**Option 2: Compatibility Views (If applied)**
```bash
# Views automatically redirect old queries to flat tables
# No action needed - rollback is automatic
```

**Option 3: Full Rollback (Emergency)**
```bash
git revert 9d9f0eb  # Revert table alignment commit
# Deploy previous version
```

## ✅ Staging Success Checklist

- [ ] Feature flag `backend.flatTables = ON` enabled
- [ ] Compatibility views applied (optional but recommended)
- [ ] All 8 production features tested and working
- [ ] RLS policies enforcing correctly (no unauthorized access)
- [ ] AI draft isolation verified (clients get 403)
- [ ] Card reveal sequence enforced
- [ ] Call consent IP logging functional
- [ ] Emergency extensions create new bookings
- [ ] Daily Zodiac manual trigger works
- [ ] API response times within targets
- [ ] Zero security violations detected
- [ ] Database performance metrics green
- [ ] Error rates < 0.1%

## 🎯 Ready for Production

Once all staging tests pass:

1. **Update canary percentage**: `backend.flatTables.canaryPercentage = 10`
2. **Monitor for 2 hours** with 10% traffic
3. **Gradually increase**: 10% → 25% → 50% → 100%
4. **Success metrics maintained** at each stage
5. **Full production deployment** when 100% stable

---

**Remember**: Theme/branding untouched. Code maintainable & short.