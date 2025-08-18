# SAMIA TAROT — Go-Live Checklist (Staging → Canary → Production)

**Backend API Alignment Package**: ✅ Ready  
**Test Accounts**: ✅ Available  
**Zero Downtime Strategy**: ✅ Planned  

> **Golden Rule**: Never touch the theme/branding. Keep code maintainable & short.

## 🚀 Pre-Go-Live Setup

### 1. Create Test Accounts (One-Time)
```bash
# Set your Service Role Key (keep it secret!)
export SERVICE_ROLE_KEY="your-service-role-key-here"

# Create/update test accounts
chmod +x scripts/setup-test-accounts.sh
./scripts/setup-test-accounts.sh

# Update profiles in database
psql -f database/test-accounts-profiles.sql
```

### 2. Feature Flag Setup
```bash
# In Admin Settings, add/enable:
backend.flatTables = ON

# Optional flags for gradual rollout:
backend.flatTables.canaryPercentage = 10  # Start with 10%
```

### 3. Safety Net (Optional - Instant Rollback)
```sql
-- Apply compatibility views for zero-downtime rollback
psql -f backend_api_alignment_pkg/db/compat_views.sql
```

## 🧪 Smoke Tests (Pre-Production)

### Quick Manual Tests
```bash
# Get fresh JWT tokens for all roles
chmod +x scripts/get-test-jwts.sh
./scripts/get-test-jwts.sh

# Run comprehensive smoke tests
chmod +x scripts/smoke-tests.sh
API_BASE="https://your-staging-api.com" ./scripts/smoke-tests.sh
```

### Critical Test Cases

**A. Spreads Visibility (RLS Enforcement)**
```bash
# Reader should NOT see targeted spreads for other readers
curl -H "Authorization: Bearer $reader_test_app_JWT" \
  https://api.yourapp.com/spreads
# Response should exclude spreads with target_reader_id != reader_id
```

**B. Deck 78+1 Validation**
```bash
# Check deck completeness with proper card ordering
curl -H "Authorization: Bearer $admin_test_app_JWT" \
  https://api.yourapp.com/admin/decks/test-deck-id/cards
# Verify: is_back=true cards first, then card_index 1-78
```

**C. Tarot V2 AI Draft Isolation**
```bash
# Client MUST NOT access AI drafts (403/404)
curl -H "Authorization: Bearer $client_test_app_JWT" \
  https://api.yourapp.com/readings/test-reading-id/draft
# Expected: HTTP 403 Forbidden

# Reader SHOULD access AI drafts + create audit log
curl -H "Authorization: Bearer $reader_test_app_JWT" \
  https://api.yourapp.com/readings/test-reading-id/draft
# Expected: HTTP 200 + audit_logs entry
```

**D. Card Reveal Sequence Enforcement**
```bash
# Try revealing card 2 before card 1 (should fail)
curl -X POST -H "Authorization: Bearer $client_test_app_JWT" \
  -H "Content-Type: application/json" \
  -d '{"card_position":2}' \
  https://api.yourapp.com/readings/test-reading-id/reveals
# Expected: HTTP 400 "Must reveal cards in sequence"
```

**E. Call Consent IP Logging**
```bash
# Consent without IP address (should fail)
curl -X POST -H "Authorization: Bearer $reader_test_app_JWT" \
  -d '{"sessionId":"test","consentGiven":true}' \
  https://api.yourapp.com/calls/test-booking/start
# Expected: HTTP 400 "IP address required"

# Consent with IP (should succeed)
curl -X POST -H "Authorization: Bearer $reader_test_app_JWT" \
  -d '{"sessionId":"test","clientIp":"1.2.3.4","consentGiven":true}' \
  https://api.yourapp.com/calls/test-booking/start
# Expected: HTTP 200 + consent logged
```

**F. Emergency Extension Progressive Pricing**
```bash
# First extension (base price)
curl -X POST -H "Authorization: Bearer $client_test_app_JWT" \
  https://api.yourapp.com/calls/test-session/extend
# Expected: $5.00 for 5min

# Fourth extension (2x multiplier)  
# Expected: $10.00 for 5min (progressive pricing)
```

**G. Daily Zodiac Manual Trigger**
```bash
# Admin manual zodiac generation
curl -X POST -H "Authorization: Bearer $admin_test_app_JWT" \
  https://api.yourapp.com/admin/zodiac/run
# Expected: 12 audio files generated for all signs
```

## 📊 Production Monitoring (Must Be Green)

### Key Metrics
- **Emergency Response P90**: < 15 seconds ✅
- **Call Setup P95**: < 3 seconds ✅  
- **Payment Success Rate**: > 95% ✅
- **Daily Zodiac Success**: 12/12 audio files at 07:00 Beirut ✅
- **RLS Violations**: = 0 (Any 403 not by design?) ✅

### RLS Coverage Report
```bash
# Run GitHub Action: "Security — RLS Coverage Report"
# Verify all critical tables have 100% RLS coverage
```

## 🚦 Canary Deployment Strategy

### Phase 1: Staging (100% Traffic)
- Run full smoke test suite
- Verify all 8 production features work
- Check RLS policies enforce correctly
- Validate JWT authentication flows

### Phase 2: Canary 10%
```bash
# Feature flag update
backend.flatTables.canaryPercentage = 10
```
- Monitor error rates < 1%
- Check latency within SLO
- Verify no RLS violations
- **Duration**: 2 hours minimum

### Phase 3: Canary 25%
```bash
backend.flatTables.canaryPercentage = 25
```
- Continue monitoring
- **Duration**: 4 hours minimum

### Phase 4: Canary 50%
```bash
backend.flatTables.canaryPercentage = 50
```
- **Duration**: 8 hours minimum

### Phase 5: Full Production (100%)
```bash
backend.flatTables = ON
backend.flatTables.canaryPercentage = 100  # or remove flag
```

## 🚨 Rollback Plan (< 2 minutes)

If any issues arise:

1. **Immediate**: Disable flat tables
   ```bash
   backend.flatTables = OFF
   ```

2. **Safety Net**: Compatibility views (if applied)
   ```sql
   -- Views automatically redirect old schema queries to flat tables
   -- No code changes needed for instant rollback
   ```

3. **Full Rollback**: Revert commit
   ```bash
   git revert <commit-hash>
   # Deploy previous version
   ```

## ✅ Go-Live Success Criteria

**All must be ✅ before proceeding to next phase:**

- [ ] All smoke tests pass (100%)
- [ ] RLS policies enforce correctly (0 violations)
- [ ] AI draft isolation maintained (clients can't access)
- [ ] Card reveal sequence enforced (no skipping)
- [ ] Call consent logging includes IP addresses
- [ ] Emergency extensions work with progressive pricing
- [ ] Daily zodiac generates 12 audio files
- [ ] Payment transactions logged correctly
- [ ] Error rate < 1%
- [ ] Latency within SLO targets
- [ ] No theme/branding changes detected

## 🎯 Post Go-Live

### Cleanup (After 30 days)
- Remove compatibility views if no longer needed
- Archive test accounts (keep for future testing)
- Update documentation with new table structure
- Remove old schema-based code references

### Performance Monitoring
- Track query performance improvements
- Monitor flat table query efficiency  
- Validate RLS policy performance impact

---

**Remember**: Keep code maintainable & short. Never touch the theme/branding.