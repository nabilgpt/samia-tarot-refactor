# 🎛️ GO LIVE ORCHESTRATION — SAMIA TAROT

**Final Step**: Production deployment orchestration  
**Theme Protection**: ✅ Zero theme/branding changes  
**Code Quality**: ✅ Maintainable & short throughout  

---

## 🔧 **Pre-Prod Readiness (H-24 → H-1)**

### **Environment Secrets Updated**
```bash
# Verify all production secrets are current
SUPABASE_DB_URL="postgresql://postgres.uuseflmielktdcltzwzt:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNDUxMTUsImV4cCI6MjA2MzkyMTExNX0.Qcds_caGg7xbe4rl1Z8Rh4Nox79VJWRDabp5_Bt0YOw"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM0NTExNSwiZXhwIjoyMDYzOTIxMTE1fQ.TNcj0otaeYtl0nDJYn760wSgSuKSYG8s7r-LD04Z9_E"
```

### **Feature Flags Configuration**
```bash
# Core flags (REQUIRED)
backend.flatTables = ON

# Optional production flags
calls.video = OFF  # Enable when WebRTC ready
billing.emergencyProgressivePricing = OFF  # Enable if needed
ui.rtlRefine = ON
uploads.deckBulk = ON
feature.readerInstant = ON
feature.emergencyExtension = ON
feature.tarotV2 = ON
feature.dailyZodiac = ON
```

### **Backup & Snapshot**
- ✅ **Database backup** with timestamp
- ✅ **Storage bucket snapshot** 
- ✅ **RLS Coverage Report** (≤24h from workflow)
- ✅ **Test accounts** protected from real payments

---

## 🧪 **Sanity Checks (Pre-Canary)**

### **SQL Parity & Safety Verification**
```sql
-- maintainable & short — preserve theme integrity

-- 1) Deck cards parity check
SELECT COUNT(*) as total_cards FROM deck_cards;
SELECT 
  COUNT(*) FILTER (WHERE is_back = true) AS back_cards,
  COUNT(*) FILTER (WHERE is_back = false) AS face_cards
FROM deck_cards;

-- 2) Tarot V2 reveal order integrity  
SELECT 
  reading_id, 
  MIN(card_position) = 1 AS starts_at_one,
  MAX(card_position) as max_position
FROM tarot_v2_card_selections 
GROUP BY reading_id
HAVING COUNT(*) > 1;

-- 3) Call consent completeness
SELECT COUNT(*) as missing_ip_logs 
FROM call_consent_logs 
WHERE client_ip IS NULL OR client_ip = '';

-- 4) AI draft isolation verification
SELECT COUNT(*) as exposed_drafts
FROM tarot_v2_readings 
WHERE ai_draft_visible_to_client = true;

-- Expected Results:
-- • back_cards >= 1 per deck, face_cards = 78 per complete deck
-- • starts_at_one = true for all readings  
-- • missing_ip_logs = 0
-- • exposed_drafts = 0
```

### **cURL API Validation**
```bash
# AI isolation test (expect 403/404)
curl -s -H "Authorization: Bearer <CLIENT_JWT>" \
  https://api.yourapp.com/readings/<reading_id>/draft

# Card reveal sequence enforcement (expect 400 if out-of-order)
curl -s -X POST -H "Authorization: Bearer <CLIENT_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"card_position":2}' \
  https://api.yourapp.com/readings/<reading_id>/reveals

# RLS enforcement test (expect 403)
curl -s -H "Authorization: Bearer <CLIENT_JWT>" \
  https://api.yourapp.com/admin/users

# Consent IP requirement (expect 400)
curl -s -X POST -H "Authorization: Bearer <READER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test","consentGiven":true}' \
  https://api.yourapp.com/calls/<booking_id>/start
```

---

## 🟢 **Canary Runbook (10% → 25% → 50% → 100%)**

### **Stage 1: 10% Traffic (Monitor 2 Hours)**
```bash
backend.flatTables.canaryPercentage = 10
```

**Success Metrics (ALL must be GREEN):**
- **API Response P95**: < 2 seconds ✅
- **Database Query P95**: < 500ms ✅
- **Error Rate**: < 1% ✅  
- **RLS Violations**: = 0 ✅
- **Call Setup P95**: < 3 seconds ✅
- **Siren Answer P90**: < 15 seconds ✅
- **Payment Success**: > 95% ✅
- **Daily Zodiac**: 12/12 audio files @ 07:00 Beirut ✅

### **Stage 2-4: Progressive Rollout**
- **25%**: Monitor 4 hours
- **50%**: Monitor 8 hours  
- **100%**: Full production (monitor 24h)

**Escalation Trigger**: ANY metric RED → **Immediate rollback**

---

## 🛡️ **Production Hardening (Optional)**

### **Block Test Accounts from Real Payments**
```sql
-- maintainable & short — RESTRICTIVE policy
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pay_tx_block_tests ON payment_transactions;

CREATE POLICY pay_tx_block_tests
ON payment_transactions AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (
  -- Block test accounts from creating real transactions
  NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND COALESCE(p.is_test, false) = true
  )
);
```

### **Additional Production Guard (Optional)**
```sql
-- Allow only test_mode transactions or amounts < $1.00
DROP POLICY IF EXISTS pay_tx_prod_guard ON payment_transactions;

CREATE POLICY pay_tx_prod_guard  
ON payment_transactions AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (
  -- Production safety: test mode or small amounts only
  (metadata->>'test_mode' = 'true') 
  OR 
  (amount < 100)  -- Less than $1.00 in cents
  OR
  (metadata->>'environment' = 'staging')
);
```

---

## 🧯 **Rollback Playbook (≤ 60 Seconds)**

### **Level 1: Feature Flag (Immediate)**
```bash
# Admin Settings Dashboard
backend.flatTables = OFF
# All old schema-based queries resume immediately
```

### **Level 2: Compatibility Views (If Applied)**
```bash
# Views automatically redirect - no action needed
psql "$SUPABASE_DB_URL" -f backend_api_alignment_pkg/db/compat_views.sql
```

### **Level 3: Full Deployment Revert (Emergency)**
```bash
git revert 506306f  # Revert GO LIVE commit
# Deploy previous stable version
```

---

## 🗣️ **Communication Snippets**

### **Go/No-Go Decision**
```
✅ STAGING PASS: All 8 features validated
🟢 STARTING: 10% canary for 2h monitoring  
📊 KPIs: API P95<2s, Error<1%, RLS=0
🎯 Next: 25% if metrics remain green
```

### **Escalation Alert**  
```
🚨 CANARY BREACH: <metric_name> threshold exceeded
🧯 EXECUTING: Feature flag rollback → compat views → redeploy
⏱️ ETA: Service restoration ≤ 60 seconds
```

### **Success Milestone**
```
🎉 PRODUCTION DEPLOYED: 100% traffic on flat tables
📈 KPIs: All green for 24h monitoring period
✅ FEATURES: All 8 production features operational
🛡️ SECURITY: Zero RLS violations detected
```

---

## 🧾 **Post-Go-Live Activities (H+24)**

### **Validation & Reporting**
- [ ] **Run RLS Coverage Workflow** → collect artifacts
- [ ] **Review sample recordings** (consent IP/timestamp present)  
- [ ] **Generate payments funnel report** 
- [ ] **Analyze reader utilization metrics**
- [ ] **Performance optimization ticket** (latency/indices if needed)

### **Health Check Queries**
```sql
-- Verify production stability
SELECT 
  'API Calls' as metric,
  COUNT(*) as last_24h,
  AVG(response_time_ms) as avg_response
FROM api_logs 
WHERE created_at > NOW() - INTERVAL '24 hours';

SELECT
  'RLS Violations' as metric, 
  COUNT(*) as violations
FROM security_audit_logs
WHERE event_type = 'rls_violation'
AND created_at > NOW() - INTERVAL '24 hours';
```

---

## 📋 **Final Go-Live Checklist**

**Pre-Launch (H-1):**
- [ ] All secrets updated and verified
- [ ] Feature flags configured correctly
- [ ] Database and storage backups completed
- [ ] RLS coverage report generated (≤24h)
- [ ] Test accounts protected from real payments
- [ ] Sanity check SQL queries all pass
- [ ] cURL API validation tests all pass

**During Canary:**
- [ ] 10% traffic metrics all green (2h monitoring)
- [ ] 25% traffic metrics all green (4h monitoring)  
- [ ] 50% traffic metrics all green (8h monitoring)
- [ ] 100% traffic deployment successful
- [ ] 24h post-deployment monitoring complete

**Post-Launch (H+24):**
- [ ] RLS workflow artifacts collected
- [ ] Sample recordings validated (IP/timestamp)
- [ ] Payment funnel report generated
- [ ] Performance optimization tickets created
- [ ] Success communication sent to stakeholders

---

## 🚀 **READY FOR PRODUCTION!**

**SAMIA TAROT** is fully orchestrated for professional production deployment with:
- ✅ **Complete pre-production readiness** validation
- ✅ **Progressive canary rollout** with monitoring thresholds  
- ✅ **Multi-tier rollback strategy** (≤60 seconds)
- ✅ **Production hardening** with payment protection
- ✅ **Professional communication** templates
- ✅ **Post-deployment validation** procedures

**Theme/Branding**: ✅ Completely preserved  
**Code Quality**: ✅ Maintainable & short throughout

**🎯 Execute when ready**: **H-24 Prep** → **Canary 10%** → **Full Production** 🎉