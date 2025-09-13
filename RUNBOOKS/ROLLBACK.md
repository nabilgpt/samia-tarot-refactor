# Rollback Runbook

**Version**: 1.0  
**Owner**: Engineering Team  
**Last Updated**: 2025-01-13  

## Quick Reference

- **Emergency Rollback Script**: `python rollback_mechanisms.py emergency`
- **Rollback Channel**: `#samia-incident-response`
- **Decision Maker**: On-Call Engineer or Incident Commander

---

## Rollback Decision Matrix

### When to Rollback Immediately 🚨

| Condition | Threshold | Action |
|-----------|-----------|---------|
| **Service Down** | Health endpoints failing | ROLLBACK NOW |
| **Critical Errors** | Error rate >5% for >2 minutes | ROLLBACK NOW |
| **Payment Failures** | Payment success rate <90% | ROLLBACK NOW |
| **Database Issues** | Connection failures or data corruption | ROLLBACK NOW |
| **Security Breach** | Any suspected security incident | ROLLBACK NOW |

### When to Investigate First ⚠️

| Condition | Threshold | Timeline |
|-----------|-----------|----------|
| **Performance Degradation** | P95 latency >1000ms | Investigate 10 min, then rollback |
| **Moderate Errors** | Error rate 1-5% | Investigate 15 min, then rollback |
| **Feature Issues** | Specific feature broken | Consider feature flag disable |
| **User Complaints** | <10 complaints in 30 min | Investigate 20 min, then decide |

---

## Emergency Rollback Procedure

### Step 1: Immediate Safety (Execute within 2 minutes)
```bash
# Trip all circuit breakers for protection
python rollback_mechanisms.py emergency

# Disable risky feature flags
python -c "
from production_monitoring_service import ProductionMonitoringService
svc = ProductionMonitoringService()
svc.toggle_feature_flag('community_enabled', False)
svc.toggle_feature_flag('notifications_enabled', False)
"

# Notify team immediately
echo "🚨 EMERGENCY ROLLBACK INITIATED - $(date)" | slack-notify #samia-incident-response
```

### Step 2: Assess Rollback Scope (Within 5 minutes)
```bash
# Check current application version
git describe --tags

# Check last known good version
git tag --sort=-version:refname | head -5

# Check database migration status
python migrate.py audit
```

### Step 3: Execute Rollback
Choose the appropriate rollback level based on the issue:

#### A) Feature Flag Rollback Only (Fastest - 30 seconds)
```bash
python rollback_mechanisms.py emergency
# This disables all non-essential features while keeping core functionality
```

#### B) Application Version Rollback (2-5 minutes)
```bash
# Rollback to previous application version
python rollback_mechanisms.py full --application=v2025.01.12

# Verify rollback success
curl -f https://samia-tarot.com/health
```

#### C) Database + Application Rollback (5-15 minutes)
```bash
# Only if database corruption detected
python rollback_mechanisms.py full --database=backup_20250113_0200 --application=v2025.01.12

# Verify database integrity
python migrate.py audit
```

---

## Rollback Validation Checklist

### Immediate Validation (T+2 minutes)
- [ ] **Health endpoints responding**: `/health` returns 200
- [ ] **Database connectivity**: Can query basic tables
- [ ] **Feature flags in safe state**: Community OFF, rate limiting ON
- [ ] **Circuit breakers protective**: Providers isolated if needed

### Extended Validation (T+10 minutes)
- [ ] **User registration working**: Test signup flow
- [ ] **Payment processing**: Test payment validation (no charges)
- [ ] **Core APIs responding**: Orders, readings, profile endpoints
- [ ] **Error rate normalized**: <1% error rate sustained

### Success Criteria
- All health checks green for 10 minutes
- Error rate below normal levels (<1%)
- Core user journeys functional
- No data loss detected

---

## Data Recovery Procedures

### Database Point-in-Time Recovery
```bash
# List available backups
ls -la /backups/

# Restore to specific point in time (if needed)
pg_restore -h $PROD_DB_HOST -U $DB_USER -d $DB_NAME \
  --clean --if-exists backup_20250113_0200.sql

# Verify data integrity
python -c "
import psycopg2
conn = psycopg2.connect('$DB_DSN')
with conn.cursor() as cur:
    cur.execute('select count(*) from profiles')
    print(f'Profiles: {cur.fetchone()[0]}')
    cur.execute('select count(*) from orders')
    print(f'Orders: {cur.fetchone()[0]}')
"
```

### Application State Recovery
```bash
# Clear caches that might contain stale data
redis-cli FLUSHALL

# Restart application services
systemctl restart samia-tarot-api
systemctl restart samia-tarot-worker

# Verify services are healthy
systemctl status samia-tarot-api
```

---

## Circuit Breaker Management

### Emergency Trip All Breakers
```bash
python -c "
from production_monitoring_service import ProductionMonitoringService
svc = ProductionMonitoringService()

# Trip all external providers
providers = ['stripe', 'square', 'twilio_sms', 'fcm', 'apns']
for provider in providers:
    result = svc.trip_circuit_breaker(provider)
    print(f'{provider}: {'TRIPPED' if result else 'FAILED'}')
"
```

### Gradual Recovery
```bash
# Reset circuit breakers one by one after validation
python -c "
from production_monitoring_service import ProductionMonitoringService
svc = ProductionMonitoringService()

# Test and reset each provider
svc.reset_circuit_breaker('stripe')  # Start with payments
# Monitor for 5 minutes before proceeding to next
"
```

---

## Communication During Rollback

### Initial Alert (Send immediately)
```
🚨 **ROLLBACK IN PROGRESS**
Time: $(date)
Reason: [Brief issue description]
Action: Emergency rollback initiated
ETA: 5-15 minutes
Status: Investigating
```

### Progress Updates (Every 5 minutes)
```
🔄 **ROLLBACK UPDATE**
Status: [Step X of Y complete]
Current: [What's being done now]
Next: [Next action]
ETA: [Updated timeline]
```

### Rollback Complete
```
✅ **ROLLBACK COMPLETE**
Time: $(date)
Action: Successfully rolled back to v[version]
Status: Systems stable
Next: Incident analysis
Postmortem: [Link to be created]
```

---

## Post-Rollback Actions

### Immediate (T+30 minutes)
1. **Validate system stability**: Monitor for additional 30 minutes
2. **Customer communication**: Update status page and support channels
3. **Preserve evidence**: Capture logs, metrics, database snapshots
4. **Start incident investigation**: Assign incident commander

### Follow-up (T+2 hours)
1. **Schedule postmortem**: Use [POSTMORTEM_TEMPLATE.md](./POSTMORTEM_TEMPLATE.md)
2. **Plan fix**: Determine root cause and fix approach
3. **Update deployment process**: Address any process gaps
4. **Consider fix deployment**: Plan remediation deployment

---

## Rollback Testing & Validation

### Pre-Production Testing
```bash
# Test rollback mechanisms on staging
python rollback_mechanisms.py test

# Validate feature flag emergency disable
python -c "
from rollback_mechanisms import RollbackManager
mgr = RollbackManager()
result = mgr.emergency_feature_flag_disable('test_flag')
print(f'Emergency disable test: {'PASS' if result else 'FAIL'}')
"
```

### Rollback Validation Script
```bash
# Validate rollback success
python -c "
from rollback_mechanisms import RollbackManager
mgr = RollbackManager()
validation = mgr.validate_rollback_success()
print('Rollback Validation Results:')
for check, status in validation.items():
    print(f'  {check}: {'PASS' if status else 'FAIL'}')
"
```

---

## Escalation Contacts

- **On-Call Engineer**: Check PagerDuty current rotation
- **Database Admin**: Escalate via PagerDuty after 10 minutes
- **Engineering Manager**: Escalate for prolonged incidents (>30 min)
- **CTO**: Escalate for customer-impacting incidents >1 hour

---

## Common Rollback Scenarios

### Scenario 1: Database Migration Failed
```bash
# Rollback database only
python migrate.py down --target=previous_migration
python rollback_mechanisms.py emergency  # Reset feature flags
```

### Scenario 2: Payment Processing Broken
```bash
# Trip payment circuit breakers immediately
python -c "
from production_monitoring_service import ProductionMonitoringService
svc = ProductionMonitoringService()
svc.trip_circuit_breaker('stripe')
svc.trip_circuit_breaker('square')
"
```

### Scenario 3: Performance Regression
```bash
# Enable rate limiting, disable expensive features
python -c "
from production_monitoring_service import ProductionMonitoringService
svc = ProductionMonitoringService()
svc.toggle_feature_flag('rate_limiting_enabled', True)
svc.toggle_feature_flag('personalization_enabled', False)
"
```

---

**Remember**: When in doubt, rollback. It's easier to redeploy than to recover from extended downtime.