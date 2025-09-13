# Deployment Runbook

**Version**: 1.0  
**Owner**: Engineering Team  
**Last Updated**: 2025-01-13  

## Quick Reference

- **Deployment Channel**: `#samia-deployments`
- **Emergency Rollback**: See [ROLLBACK.md](./ROLLBACK.md)
- **Status Page**: https://status.samia-tarot.com

---

## Pre-Deployment Checklist

### Security & Validation ✅
- [ ] Run `python test_m30_security_readiness.py` - **Must pass >95%**
- [ ] Run `python validate_rls_parity.py --comprehensive` - **Must be 100% parity**
- [ ] Verify latest backup exists: `ls -la /backups/$(date +%Y%m%d)*.sql`
- [ ] Check feature flags are in safe state (community OFF, rate limiting ON)

### Infrastructure ✅
- [ ] Golden Signals dashboard green (latency <500ms, errors <1%, saturation <80%)
- [ ] Circuit breakers healthy: `curl /api/admin/circuit-breakers/status`
- [ ] Budget guards active: Check spend <80% of daily limits
- [ ] On-call engineer available for next 2 hours

---

## Zero-Downtime Deployment

### Step 1: Preparation
```bash
# Switch to deployment branch
git checkout main
git pull origin main

# Tag release
git tag -a v$(date +%Y.%m.%d) -m "Production deployment $(date)"
git push origin v$(date +%Y.%m.%d)

# Notify team
echo "🚀 Starting deployment v$(date +%Y.%m.%d)" | slack-notify #samia-deployments
```

### Step 2: Database Migration
```bash
# Test migrations on staging first
python migrate.py up --dry-run --target=staging

# Apply to production (if staging successful)
python migrate.py up --verbose
```

### Step 3: Application Deployment
```bash
# Deploy with health checks
./deploy.sh --health-check --timeout=300

# Verify deployment
curl -f https://samia-tarot.com/health
curl -f https://samia-tarot.com/api/health/database
```

### Step 4: Feature Flag Gradual Rollout
```bash
# Enable new features gradually (if applicable)
python -c "
from production_monitoring_service import ProductionMonitoringService
svc = ProductionMonitoringService()
svc.toggle_feature_flag('new_feature_enabled', True, rollout_percentage=1)
"
```

---

## Post-Deployment Verification

### Immediate Checks (T+5 minutes)
- [ ] **Health endpoints responding**: `/health`, `/api/health/database`, `/api/health/providers`
- [ ] **Error rate <1%**: Check Golden Signals dashboard
- [ ] **Response time P95 <500ms**: Check latency metrics
- [ ] **Payment processing working**: Test payment flow in staging

### Extended Monitoring (T+30 minutes)
- [ ] **User registration flow**: Test complete signup process
- [ ] **Order creation**: Verify booking and assignment works
- [ ] **Notifications**: Check push notification delivery
- [ ] **Database performance**: Monitor query response times

### Success Criteria
- All health checks green for 30 minutes
- Error rate remains <1%
- No customer-impacting issues reported
- Golden Signals within SLO targets

---

## Rollback Decision Matrix

| Condition | Action | Timeline |
|-----------|---------|----------|
| Health endpoints failing | **Immediate rollback** | <5 minutes |
| Error rate >5% | **Immediate rollback** | <5 minutes |
| Payment failures >10% | **Immediate rollback** | <10 minutes |
| Response time P95 >1000ms | Investigate, rollback if not resolved | <15 minutes |
| Customer complaints >5 | Investigate, prepare rollback | <30 minutes |

**Rollback Command**: `python rollback_mechanisms.py emergency`

---

## Communication Templates

### Deployment Start
```
🚀 **DEPLOYMENT STARTING**
Version: v2025.01.13
Duration: ~30 minutes
Status: https://status.samia-tarot.com
```

### Deployment Success
```
✅ **DEPLOYMENT COMPLETE**
Version: v2025.01.13
All systems operational
Monitor: Golden Signals dashboard
```

### Deployment Issues
```
⚠️ **DEPLOYMENT ISSUE**
Version: v2025.01.13
Issue: [Brief description]
Action: [Investigating/Rolling back]
ETA: [Timeline]
```

---

## Emergency Contacts

- **On-Call Engineer**: Check PagerDuty schedule
- **Database Admin**: Check escalation policy  
- **Security Team**: security@samia-tarot.com
- **Incident Commander**: Via escalation policy

---

## Troubleshooting

### Database Connection Issues
```bash
# Check connection
python -c "
import psycopg2
conn = psycopg2.connect('$DB_DSN')
print('DB connection successful')
"

# Check active connections
psql -c "SELECT count(*) FROM pg_stat_activity;"
```

### Application Not Responding
```bash
# Check process status
systemctl status samia-tarot-api

# Check logs
tail -f /var/log/samia-tarot/application.log

# Restart if needed (last resort)
systemctl restart samia-tarot-api
```

### High Error Rate
```bash
# Check recent errors
python -c "
from production_monitoring_service import ProductionMonitoringService
svc = ProductionMonitoringService()
dashboard = svc.get_golden_signals_dashboard(5)
print('Recent errors:', dashboard.get('errors', []))
"
```

---

## Post-Deployment Actions

1. **Monitor for 2 hours**: Watch Golden Signals and error rates
2. **Update status page**: Mark deployment as complete
3. **Generate deployment report**: Include metrics and any issues
4. **Schedule postmortem**: If any issues occurred during deployment

---

**Next Steps**: After successful deployment, see [D0-D7 Monitoring Plan](../d0_d7_monitoring_tools.py)