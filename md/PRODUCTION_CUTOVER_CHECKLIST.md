# M31 Production Cutover Checklist

**Release Version**: v1.0.0  
**Cutover Date**: ________________  
**Release Manager**: ________________  
**On-Call Engineer**: ________________  

**Emergency Contacts**: [See M30 Release Checklist]  
**Rollback Decision Maker**: ________________  

---

## Pre-Flight Gates Validation ✅

**Timeframe**: T-24 to T-4 Hours

### 1. Code & Testing Readiness
- [ ] **All M16.1-M31 modules completed and tested**
  - [ ] M16.1: Privacy & Account Management ✓
  - [ ] M17-M18: Orders & TikTok Ingestion ✓
  - [ ] M19-M20: Calls & Payments ✓
  - [ ] M21-M24: Moderation, Notifications, Analytics, Community ✓
  - [ ] M25: Personalization (Internal AI) ✓
  - [ ] M26-M27: AR Experiments & i18n Deepening ✓
  - [ ] M28-M29: Secrets & SRE Cost Guards ✓
  - [ ] M30: Go-Live Readiness & Compliance ✓
  - [ ] M31: Production Cutover & Monitoring ✓

- [ ] **Security Testing (OWASP WSTG) - Smoke Tests**
  ```bash
  # Run security validation suite
  python test_m30_security_readiness.py
  # Expected: >95% pass rate
  ```
  **Result**: _______ passes / _______ total (**Pass Rate**: ____%)

- [ ] **RLS/Route-Guard Parity Validation**
  ```bash
  # Validate RLS policies match API guards
  python validate_rls_parity.py --comprehensive
  # Expected: 100% parity across all endpoints
  ```
  **Result**: _______ endpoints validated (**Parity**: ____%)

- [ ] **Database Migration Dry Run**
  ```bash
  # Test migrations on staging clone
  python migrate.py up --dry-run --verbose
  # Expected: All migrations idempotent, no errors
  ```
  **Result**: [ ] Success [ ] Failed - **Notes**: ________________

### 2. DPIA & Compliance Sign-Off
- [ ] **Data Protection Impact Assessment (DPIA) approved**
  - **DPO Sign-off**: ________________ **Date**: ________
  - **Legal Review**: ________________ **Date**: ________
  - **Security Review**: ________________ **Date**: ________

- [ ] **GDPR Compliance Verified**
  - [ ] Data mapping complete (M30)
  - [ ] Retention policies active
  - [ ] Right to erasure implemented
  - [ ] Consent management operational

### 3. Backup & Recovery Validation
- [ ] **Production Backup Created** (< 2 hours old)
  ```bash
  # Create pre-cutover backup
  pg_dump -h $PROD_DB_HOST -U $DB_USER -d $DB_NAME \
    --format=custom > pre_cutover_backup_$(date +%Y%m%d_%H%M%S).sql
  ```
  **Backup File**: ________________ **Size**: _______ GB

- [ ] **Recovery Drill Validated (Non-Destructive)**
  ```bash
  # Test restore on staging
  pg_restore -h $STAGING_DB_HOST -U $DB_USER -d $TEST_DB \
    --clean --if-exists pre_cutover_backup.sql
  ```
  **Result**: [ ] Success [ ] Failed - **RTO Achieved**: _______ minutes

### 4. Monitoring & Alerting Readiness
- [ ] **Golden Signals Dashboards Active**
  - [ ] Latency monitoring (P50, P95, P99)
  - [ ] Traffic monitoring (requests/sec, active users)
  - [ ] Error rate monitoring (4xx, 5xx)
  - [ ] Saturation monitoring (CPU, memory, DB connections)

- [ ] **SLO Alert Rules Configured**
  - [ ] API latency P95 < 500ms (5min window)
  - [ ] Error rate < 1% (5min window)  
  - [ ] Payment success > 99% (15min window)
  - [ ] DB latency < 100ms (5min window)

- [ ] **Circuit Breakers Initialized**
  ```bash
  # Verify circuit breaker setup
  python -c "
  from production_monitoring_service import ProductionMonitoringService
  svc = ProductionMonitoringService()
  breakers = svc.get_all_circuit_breakers()
  print(f'Circuit breakers: {len(breakers)}')
  for cb in breakers:
      print(f'  {cb.provider_name}: {cb.state.value}')
  "
  ```
  **Breakers Active**: Stripe _____, Square _____, Twilio _____, FCM _____, APNs _____

### 5. Feature Flags Pre-Configuration
- [ ] **Critical Feature Flags Set**
  ```bash
  # Verify feature flag initial state
  psql -c "
  SELECT flag_key, is_enabled, rollout_percentage 
  FROM feature_flags 
  WHERE flag_key IN ('community_enabled', 'notifications_enabled', 'rate_limiting_enabled')
  ORDER BY flag_key;
  "
  ```
  **Expected State**:
  - `community_enabled`: OFF (0%)
  - `notifications_enabled`: OFF (1% initial)
  - `rate_limiting_enabled`: ON (100%)
  - `circuit_breakers_enabled`: ON (100%)
  - `budget_guards_enabled`: ON (100%)

**Pre-Flight Gates Sign-Off**: ________________ **Time**: ________

---

## Production Cutover Execution

**Timeframe**: T-Hour (Deployment Window)

### 6. Release Tagging & Freeze
- [ ] **Git Tag Created**
  ```bash
  # Tag release version
  git tag -a v1.0.0 -m "Production Release v1.0.0 - Samia Tarot Platform"
  git push origin v1.0.0
  ```
  **Tag**: ________________ **Commit SHA**: ________________

- [ ] **Release Notes Published**
  - **Internal**: ________________
  - **External**: ________________  
  - **Support Team**: ________________

- [ ] **Code Freeze Activated**
  - **Branch Protection**: ________________
  - **PR Restrictions**: ________________
  - **Emergency Contact**: ________________

### 7. Database Cutover
- [ ] **Final Backup Created**
  ```bash
  FINAL_BACKUP="final_pre_cutover_$(date +%Y%m%d_%H%M%S).sql"
  pg_dump $PROD_CONNECTION --format=custom > $FINAL_BACKUP
  ```
  **Final Backup**: ________________ **Time**: ________

- [ ] **Production Migrations Executed**
  ```bash
  # Apply M31 production schema
  python migrate.py up --target=004_production_cutover_schema.sql
  ```
  **Migration Result**: [ ] Success [ ] Failed
  **Execution Time**: _______ seconds
  **Tables Added**: _______ **Functions Added**: _______

- [ ] **Migration Verification**
  ```bash
  # Verify schema integrity
  python migrate.py audit
  psql -c "SELECT count(*) FROM feature_flags;"
  psql -c "SELECT count(*) FROM circuit_breakers;"
  ```
  **Feature Flags**: _______ **Circuit Breakers**: _______ **Budget Categories**: _______

### 8. Application Deployment
- [ ] **Application Updated**
  ```bash
  # Deploy application with M31 monitoring
  # This would typically be via CI/CD pipeline
  git checkout v1.0.0
  # Build and deploy commands here
  ```
  **Deployment Status**: [ ] Success [ ] Failed
  **Deployment Time**: _______ minutes

- [ ] **Health Check Validation**
  ```bash
  # Verify application health
  curl -f https://samia-tarot.com/health
  curl -f https://samia-tarot.com/api/health/database
  curl -f https://samia-tarot.com/api/health/providers
  ```
  **Health Check Results**: 
  - Application: [ ] Healthy [ ] Degraded [ ] Unhealthy
  - Database: [ ] Healthy [ ] Degraded [ ] Unhealthy
  - Providers: [ ] Healthy [ ] Degraded [ ] Unhealthy

### 9. Monitoring Activation
- [ ] **Golden Signals Recording Started**
  ```bash
  # Verify monitoring service active
  python -c "
  from production_monitoring_service import ProductionMonitoringService
  svc = ProductionMonitoringService()
  dashboard = svc.get_golden_signals_dashboard(5)
  print(f'Monitoring active: {len(dashboard.get(\"golden_signals\", []))} signals')
  "
  ```
  **Monitoring Active**: [ ] Yes [ ] No **Signal Count**: _______

- [ ] **Budget Guards Activated**
  ```bash
  # Verify budget monitoring
  python -c "
  from production_monitoring_service import ProductionMonitoringService
  svc = ProductionMonitoringService()
  budgets = svc.get_budget_dashboard()
  print(f'Budget categories active: {len(budgets.get(\"budgets\", []))}')
  "
  ```
  **Budget Categories Active**: _______

**Cutover Execution Sign-Off**: ________________ **Time**: ________

---

## Post-Cutover Validation

**Timeframe**: T+15 to T+60 Minutes

### 10. Immediate System Validation
- [ ] **Feature Flags Operational**
  ```bash
  # Test feature flag system
  python -c "
  from production_monitoring_service import ProductionMonitoringService  
  svc = ProductionMonitoringService()
  print(f'Rate limiting: {svc.check_feature_flag(\"rate_limiting_enabled\")}')
  print(f'Community: {svc.check_feature_flag(\"community_enabled\")}')
  "
  ```
  **Feature Flags Working**: [ ] Yes [ ] No

- [ ] **Circuit Breakers Responsive**
  ```bash
  # Test circuit breaker functionality
  curl -X POST /test/circuit-breaker/stripe/fail
  curl -X POST /test/circuit-breaker/stripe/success  
  ```
  **Circuit Breaker Test**: [ ] Pass [ ] Fail

- [ ] **HTTP 429 Rate Limiting**
  ```bash
  # Test rate limiting with proper headers
  for i in {1..10}; do
    curl -w "%{http_code}\n" -o /dev/null -s https://samia-tarot.com/api/test-rate-limit
  done
  # Expected: Some 429 responses with Retry-After header
  ```
  **Rate Limiting Active**: [ ] Yes [ ] No
  **Retry-After Header Present**: [ ] Yes [ ] No

### 11. End-to-End Flow Validation
- [ ] **User Registration Flow**
  ```bash
  # Test complete registration (using test data)
  curl -X POST https://samia-tarot.com/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"cutover-test@example.com","password":"Test123!"}'
  ```
  **Registration**: [ ] Success [ ] Failed **Response Time**: _______ms

- [ ] **Order Creation Flow**  
  ```bash
  # Test order creation (with test user)
  curl -X POST https://samia-tarot.com/api/orders \
    -H "Authorization: Bearer $TEST_JWT" \
    -H "Content-Type: application/json" \
    -d '{"service_id":1,"question_text":"Test order"}'
  ```
  **Order Creation**: [ ] Success [ ] Failed **Response Time**: _______ms

- [ ] **Payment Processing Test**
  ```bash  
  # Test with Stripe test mode
  curl -X POST https://samia-tarot.com/api/payments/process \
    -H "Authorization: Bearer $TEST_JWT" \
    -d '{"payment_method":"pm_card_visa","amount":1000}'
  ```
  **Payment Processing**: [ ] Success [ ] Failed **Provider**: _______

### 12. Performance Baseline Establishment
- [ ] **Golden Signals Baseline**
  ```bash
  # Capture initial performance metrics
  python -c "
  from production_monitoring_service import ProductionMonitoringService
  svc = ProductionMonitoringService()
  dashboard = svc.get_golden_signals_dashboard(15)
  
  for signal in dashboard['golden_signals']:
      print(f'{signal[\"service\"]}_{signal[\"metric_type\"]}: avg={signal[\"avg_value\"]:.2f}')
  "
  ```
  **Baseline Metrics Captured**: [ ] Yes [ ] No

- [ ] **SLO Compliance Check**
  ```bash
  # Check initial SLO status
  python -c "
  from production_monitoring_service import ProductionMonitoringService
  svc = ProductionMonitoringService()
  dashboard = svc.get_golden_signals_dashboard(15)
  
  breached = [slo for slo in dashboard['slo_status'] if slo['is_breached']]
  print(f'SLO breaches: {len(breached)}')
  for breach in breached:
      print(f'  BREACH: {breach[\"slo_name\"]} - {breach[\"current_value\"]} vs {breach[\"target_value\"]}')
  "
  ```
  **SLO Breaches**: _______ **Breached SLOs**: ________________

**Post-Cutover Validation Sign-Off**: ________________ **Time**: ________

---

## Rollback Readiness Verification

### 13. Rollback Mechanisms Tested
- [ ] **Feature Flag Rollback**
  ```bash
  # Test emergency feature disable
  python -c "
  from production_monitoring_service import ProductionMonitoringService
  svc = ProductionMonitoringService()
  result = svc.toggle_feature_flag('rate_limiting_enabled', False)
  print(f'Feature flag toggle: {result}')
  # Re-enable after test
  svc.toggle_feature_flag('rate_limiting_enabled', True)
  "
  ```
  **Feature Flag Rollback**: [ ] Working [ ] Failed

- [ ] **Circuit Breaker Manual Trip**
  ```bash
  # Test manual circuit breaker control
  curl -X POST /admin/circuit-breakers/test-provider/trip
  curl -X GET /admin/circuit-breakers/test-provider/status
  # Reset after test
  curl -X POST /admin/circuit-breakers/test-provider/reset
  ```
  **Manual Circuit Breaker Control**: [ ] Working [ ] Failed

- [ ] **Database Rollback Plan Verified**
  ```bash
  # Verify rollback scripts exist and are tested
  ls -la rollback_scripts/
  # Test rollback on staging (if needed)
  ```
  **Rollback Scripts Present**: [ ] Yes [ ] No
  **Rollback Tested on Staging**: [ ] Yes [ ] No [ ] N/A

### 14. Emergency Contact Verification
- [ ] **On-Call Rotation Active**
  - **Primary**: ________________ **Phone**: ________  
  - **Secondary**: ________________ **Phone**: ________
  - **Escalation**: ________________ **Phone**: ________

- [ ] **Communication Channels Ready**
  - **Emergency Slack**: #emergency-production ________________
  - **Status Page**: https://status.samia-tarot.com ________________
  - **Incident Bridge**: ________________

**Rollback Readiness Sign-Off**: ________________ **Time**: ________

---

## D0–D7 Monitoring Setup

### 15. Continuous Monitoring Activation
- [ ] **Automated Health Checks Scheduled**
  ```bash
  # Setup cron jobs for health monitoring
  cat > /etc/cron.d/samia-health-checks << EOF
  # Every 5 minutes: system health check
  */5 * * * * app /opt/samia-tarot/scripts/health_check.sh
  
  # Every hour: golden signals summary
  0 * * * * app /opt/samia-tarot/scripts/golden_signals_summary.sh
  
  # Daily: budget and cost analysis
  0 2 * * * app /opt/samia-tarot/scripts/daily_cost_analysis.sh
  EOF
  ```
  **Monitoring Jobs Active**: [ ] Yes [ ] No

- [ ] **Alert Routing Configured**
  - **Critical Alerts** → On-Call Engineer (PagerDuty/SMS)
  - **Warning Alerts** → Team Slack Channel  
  - **Budget Alerts** → Finance + Engineering Leads
  - **Security Alerts** → Security Team + On-Call

### 16. D0 (Launch Day) Monitoring Plan
- [ ] **Hour 0-2: Intensive Monitoring**
  - [ ] Monitor every 5 minutes
  - [ ] All team leads available
  - [ ] Real-time dashboard observation
  
- [ ] **Hour 2-8: Active Monitoring**
  - [ ] Monitor every 15 minutes
  - [ ] On-call engineer primary
  - [ ] Escalation path defined

- [ ] **Hour 8-24: Standard Monitoring**  
  - [ ] Automated alerts active
  - [ ] Hourly summary reports
  - [ ] Daily metrics review scheduled

**D0-D7 Monitoring Sign-Off**: ________________ **Time**: ________

---

## Final Checklist Summary

### Critical Success Criteria
- [ ] **All pre-flight gates passed** (Security, RLS, Backups, DPIA)
- [ ] **Database migrations completed successfully** (Schema v004)
- [ ] **Golden signals monitoring active** (Latency, Traffic, Errors, Saturation)  
- [ ] **Circuit breakers operational** (All external providers protected)
- [ ] **Feature flags controlling rollout** (Community OFF, Gradual notifications)
- [ ] **Rate limiting active with HTTP 429** (Retry-After headers present)
- [ ] **Budget guards alerting** (All categories monitored)
- [ ] **End-to-end flows validated** (Registration, Orders, Payments)
- [ ] **Rollback mechanisms tested** (Feature flags, Circuit breakers ready)
- [ ] **D0-D7 monitoring scheduled** (Automated health checks active)

### Go/No-Go Decision

**Final Go-Live Decision**: [ ] GO [ ] NO-GO

**Decision Maker**: ________________ **Time**: ________

**Decision Rationale**: ________________

---

### Post-Cutover Actions (Within 2 Hours)

- [ ] **Success announcement sent** (Internal team, stakeholders)
- [ ] **Monitoring dashboard URLs shared** (Team, management)  
- [ ] **First golden signals report generated** (Baseline established)
- [ ] **Incident response team briefed** (On-call, escalation paths)
- [ ] **Change freeze lifted** (Emergency-only until D+1)

**Cutover Completion**: ________________ **Time**: ________

---

**Document Control**:
- **Checklist ID**: M31-CUTOVER-001
- **Version**: 1.0
- **Used For Release**: v1.0.0
- **Completion Date**: ________________
- **Archive Location**: ________________