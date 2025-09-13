# Disaster Recovery & Failover Runbook

**Version**: 1.0  
**Last Updated**: 2025-01-13  
**Owner**: SRE Team  
**Classification**: CONFIDENTIAL  

## 📋 Overview

This runbook provides comprehensive procedures for disaster recovery and failover scenarios. Use during major infrastructure failures, natural disasters, or planned DR testing.

### 🚨 When to Activate DR
- **Complete data center failure**
- **Regional cloud provider outage**
- **Critical infrastructure compromise**
- **Extended network connectivity loss**
- **Planned DR testing (quarterly)**

---

## 🎯 Disaster Recovery Objectives

### Recovery Targets by Scenario

| Disaster Type | RPO | RTO | Recovery Site | Automated |
|---------------|-----|-----|---------------|-----------|
| **Database Failure** | 5 minutes | 15 minutes | Same region | ✅ Yes |
| **Regional Outage** | 15 minutes | 60 minutes | Cross-region | ⚠️ Partial |
| **Provider Outage** | 30 minutes | 4 hours | Multi-cloud | ❌ Manual |
| **Complete Compromise** | 60 minutes | 8 hours | Clean environment | ❌ Manual |

### Service Priority Tiers

| Tier | Services | Recovery Order | Max Downtime |
|------|----------|----------------|---------------|
| **Tier 0** | Emergency Call System | 1st (0-5 min) | 5 minutes |
| **Tier 1** | Auth, Payments, Core DB | 2nd (5-15 min) | 15 minutes |
| **Tier 2** | Booking, Reader Tools | 3rd (15-30 min) | 30 minutes |
| **Tier 3** | Analytics, Notifications | 4th (30-60 min) | 60 minutes |

---

## 🏗️ DR Architecture

### Primary Site (Production)
- **Region**: EU-North-1 (Stockholm)
- **Database**: Supabase PostgreSQL with Session Pooler
- **Storage**: Primary S3 buckets
- **Monitoring**: M33 Observability stack

### Secondary Site (DR)
- **Region**: EU-West-1 (Ireland)
- **Database**: Cross-region replica with 15-minute lag
- **Storage**: Replicated S3 buckets with cross-region replication
- **Monitoring**: Minimal health checks only

### Tertiary Site (Cold Standby)
- **Region**: US-East-1 (Virginia)
- **Database**: Daily backup restoration
- **Storage**: Glacier archive copies
- **Monitoring**: Backup integrity checks only

---

## 🚨 DR Activation Procedures

### Phase 1: Incident Assessment (0-10 minutes)

#### Step 1: Confirm Primary Site Status
```bash
# Check primary database connectivity
psql "$PRIMARY_DSN" -c "SELECT NOW(), 'primary_healthy';" 2>/dev/null || echo "PRIMARY_DOWN"

# Check application health
curl -f https://samia-tarot.com/api/health/database || echo "APP_DOWN"

# Check monitoring system
curl -f https://samia-tarot.com/dashboard/observability || echo "MONITORING_DOWN"
```

#### Step 2: Assess Scope and Impact
```bash
# Check all critical services
python disaster_recovery_service.py assess-health --all-tiers

# Estimate affected users
python disaster_recovery_service.py impact-analysis --timeframe="5m"

# Validate backup integrity
python backup_321_policy_service.py verify --latest --all-tiers
```

#### Step 3: Declare Disaster Level
```bash
# Document decision
python disaster_recovery_service.py declare-disaster \
  --level="regional_outage" \
  --estimated-rto="60m" \
  --estimated-rpo="15m" \
  --incident-commander="on_call_sre"
```

### Phase 2: Failover Execution (10-30 minutes)

#### Step 1: Activate Secondary Site
```bash
# Promote read replica to primary
python disaster_recovery_service.py promote-replica \
  --replica-endpoint="eu-west-1.rds.amazonaws.com" \
  --wait-for-promotion

# Verify new primary is accessible
psql "$SECONDARY_DSN" -c "SELECT NOW(), pg_is_in_recovery(), 'secondary_promoted';"
```

#### Step 2: Update DNS and Load Balancing
```bash
# Update DNS to point to DR site
aws route53 change-resource-record-sets \
  --hosted-zone-id="Z123456789" \
  --change-batch file://dns-failover.json

# Update load balancer targets
aws elbv2 modify-target-group \
  --target-group-arn="arn:aws:elasticloadbalancing:eu-west-1:...:targetgroup/samia-dr" \
  --health-check-path="/api/health/database"

# Verify DNS propagation
dig @8.8.8.8 samia-tarot.com | grep -A1 "ANSWER SECTION"
```

#### Step 3: Restore Application Services
```bash
# Scale up DR environment
kubectl scale deployment samia-tarot-app --replicas=3 -n production-dr

# Update database connection strings
kubectl patch configmap app-config -n production-dr \
  --patch='{"data":{"DATABASE_URL":"'$SECONDARY_DSN'"}}'

# Restart services with new configuration
kubectl rollout restart deployment/samia-tarot-app -n production-dr
```

#### Step 4: Verify Service Restoration
```bash
# Test critical user journeys
python e2e_test_suite.py run \
  --environment="dr" \
  --tests="critical_path" \
  --target-url="https://dr.samia-tarot.com"

# Validate data consistency
python disaster_recovery_service.py validate-data-consistency \
  --source="primary_backup" \
  --target="secondary_promoted"
```

### Phase 3: Service Validation (30-60 minutes)

#### Step 1: Full Application Testing
```bash
# Run comprehensive test suite
python e2e_test_suite.py run \
  --environment="dr" \
  --tests="full_suite" \
  --parallel=true

# Test all service tiers
for tier in emergency_call auth payments booking; do
  python disaster_recovery_service.py test-service-tier --tier="$tier"
done
```

#### Step 2: Performance Validation
```bash
# Load test critical endpoints
artillery run load-test-dr.yml --target="https://dr.samia-tarot.com"

# Monitor resource utilization
kubectl top nodes -n production-dr
kubectl top pods -n production-dr

# Validate observability
curl -f "https://dr.samia-tarot.com/dashboard/observability"
```

#### Step 3: User Communication
```bash
# Send status page update
python notification_service.py send-status-update \
  --template="dr_activation" \
  --status="services_restored" \
  --eta="monitoring_ongoing"

# Notify internal teams
python notification_service.py send-internal-alert \
  --channel="incident_response" \
  --message="DR activation complete, monitoring stability"
```

---

## 🔄 Failback Procedures

### When Primary Site is Restored

#### Step 1: Prepare Primary Site
```bash
# Verify primary infrastructure health
python disaster_recovery_service.py health-check \
  --site="primary" \
  --comprehensive=true

# Sync data from DR site to primary
python disaster_recovery_service.py sync-data \
  --source="$SECONDARY_DSN" \
  --target="$PRIMARY_DSN" \
  --dry-run=true
```

#### Step 2: Planned Failback Window
```bash
# Schedule maintenance window
python notification_service.py schedule-maintenance \
  --start="+2h" \
  --duration="30m" \
  --reason="Primary site restoration"

# Enable read-only mode on DR site
python disaster_recovery_service.py enable-read-only \
  --environment="dr"
```

#### Step 3: Execute Failback
```bash
# Stop writes on DR site
kubectl scale deployment samia-tarot-app --replicas=0 -n production-dr

# Final data sync
python disaster_recovery_service.py sync-data \
  --source="$SECONDARY_DSN" \
  --target="$PRIMARY_DSN" \
  --final-sync=true

# Update DNS back to primary
aws route53 change-resource-record-sets \
  --hosted-zone-id="Z123456789" \
  --change-batch file://dns-primary.json

# Start services on primary
kubectl scale deployment samia-tarot-app --replicas=3 -n production
```

#### Step 4: Validate Failback
```bash
# Test primary site functionality
python e2e_test_suite.py run \
  --environment="production" \
  --tests="critical_path"

# Validate data integrity
python disaster_recovery_service.py validate-data-integrity \
  --environment="primary" \
  --check-recent-transactions=true

# Scale down DR environment
kubectl scale deployment samia-tarot-app --replicas=1 -n production-dr
```

---

## 🎮 GameDay Scenarios

### Scenario 1: Database Corruption
**Trigger**: Simulate database corruption in production
**Objective**: Restore from PITR within RPO/RTO targets
**Duration**: 1 hour
**Participants**: SRE, Database Admin, Engineering

#### Execution Steps
1. **T+0**: Simulate corruption by corrupting specific tables
2. **T+5**: Declare incident and assess scope
3. **T+10**: Begin PITR restoration process
4. **T+20**: Validate data consistency and integrity
5. **T+30**: Resume normal operations

#### Success Criteria
- [ ] RPO ≤ 5 minutes achieved
- [ ] RTO ≤ 15 minutes achieved
- [ ] Zero data loss for critical services
- [ ] All monitoring restored

### Scenario 2: Regional Provider Outage
**Trigger**: Simulate complete EU-North-1 region failure
**Objective**: Failover to EU-West-1 within 1 hour
**Duration**: 2 hours
**Participants**: Full incident response team

#### Execution Steps
1. **T+0**: Simulate regional outage
2. **T+10**: Declare disaster and activate DR
3. **T+30**: Complete failover to secondary region
4. **T+60**: Validate all services operational
5. **T+90**: Begin failback preparation
6. **T+120**: Complete failback to primary region

#### Success Criteria
- [ ] RTO ≤ 60 minutes achieved
- [ ] RPO ≤ 15 minutes achieved
- [ ] All Tier 0/1 services restored
- [ ] Customer impact minimized

### Scenario 3: Multi-Region Failure
**Trigger**: Simulate outage across primary and secondary regions
**Objective**: Activate tertiary cold standby site
**Duration**: 4 hours
**Participants**: All teams + management

#### Execution Steps
1. **T+0**: Simulate multi-region failure
2. **T+15**: Declare maximum disaster level
3. **T+60**: Begin cold site activation
4. **T+180**: Complete restoration from cold backups
5. **T+240**: Validate business continuity

#### Success Criteria
- [ ] RTO ≤ 4 hours achieved
- [ ] RPO ≤ 60 minutes achieved
- [ ] Business-critical functions restored
- [ ] Customer communication maintained

---

## 📊 Recovery Metrics & KPIs

### Automated Metrics Collection
```bash
# During DR activation
python disaster_recovery_service.py start-metrics-collection \
  --incident-id="DR-20250113-001"

# Key metrics tracked:
# - Detection time (alert to human response)
# - Decision time (assessment to DR activation)
# - Failover time (activation to service restoration)
# - Validation time (restoration to full confidence)
```

### Required Measurements
- **Detection Time**: When was the outage first detected?
- **Assessment Time**: How long to determine DR activation needed?
- **Failover Time**: Time to restore service availability
- **Data Loss**: Amount of data lost (if any)
- **Customer Impact**: Number of affected users and duration

### Compliance Reporting
```bash
# Generate DR compliance report
python disaster_recovery_service.py generate-report \
  --incident-id="DR-20250113-001" \
  --format="regulatory_compliance"

# Update SLA tracking
python backup_321_policy_service.py update-sla-metrics \
  --rpo-achieved="14m" \
  --rto-achieved="47m" \
  --service-tier="high"
```

---

## 🚨 Emergency Procedures

### Complete Infrastructure Compromise

#### If Primary Environment is Compromised
1. **Immediate Isolation**:
   ```bash
   # Isolate compromised environment
   aws ec2 modify-security-group-rules \
     --group-id="sg-primary" \
     --security-group-rules="[{\"SecurityGroupRuleId\":\"sgr-all\",\"SecurityGroupRule\":{\"IpPermissions\":[]}}]"
   ```

2. **Forensic Preservation**:
   ```bash
   # Create forensic snapshots
   python disaster_recovery_service.py create-forensic-snapshots \
     --environment="primary" \
     --preserve-evidence=true
   ```

3. **Clean Environment Activation**:
   ```bash
   # Activate completely clean DR environment
   python disaster_recovery_service.py activate-clean-dr \
     --restore-from="verified_clean_backup" \
     --security-scan=true
   ```

### Data Breach During DR

#### If Breach Detected During Failover
1. **Contain Breach**:
   ```bash
   # Enable emergency security mode
   python disaster_recovery_service.py enable-emergency-security \
     --mode="breach_containment"
   ```

2. **Audit Trail Preservation**:
   ```bash
   # Preserve all logs and audit trails
   python disaster_recovery_service.py preserve-audit-trail \
     --incident-id="BREACH-20250113-001"
   ```

3. **Legal/Regulatory Notification**:
   ```bash
   # Trigger compliance notifications
   python notification_service.py trigger-compliance-notifications \
     --type="data_breach" \
     --severity="high"
   ```

---

## 🔐 Security Considerations

### Access Control During DR
- **Principle of Least Privilege**: Only essential personnel have DR access
- **Multi-Factor Authentication**: Required for all DR operations
- **Session Recording**: All DR activities are logged and recorded
- **Approval Workflow**: Critical decisions require dual authorization

### Data Privacy During Recovery
- **GDPR Compliance**: Ensure data processing rights maintained during DR
- **Data Residency**: Verify DR site meets regulatory requirements
- **Encryption in Transit**: All data synchronization uses TLS 1.3
- **Key Management**: Encryption keys rotated after DR events

### Audit and Compliance
```bash
# Generate compliance audit trail
python disaster_recovery_service.py export-audit-trail \
  --incident-id="DR-20250113-001" \
  --format="gdpr_compliance"

# Verify regulatory requirements met
python disaster_recovery_service.py compliance-check \
  --standards="gdpr,pci_dss,iso27001"
```

---

## 📞 Communication Plan

### Internal Communication
1. **Incident Commander**: Central coordination
2. **Technical Teams**: SRE, Database, Engineering
3. **Business Teams**: Customer Success, Marketing
4. **Executive Team**: CTO, CEO (for major incidents)

### External Communication
1. **Status Page**: Automated updates via status.samia-tarot.com
2. **Customer Notifications**: Email/SMS for affected users
3. **Regulatory Bodies**: GDPR breach notifications if applicable
4. **Partners/Vendors**: Infrastructure and service providers

### Communication Templates
```bash
# Internal alert template
python notification_service.py send-template \
  --template="dr_activation_internal" \
  --incident-id="DR-20250113-001"

# Customer communication template
python notification_service.py send-template \
  --template="service_disruption_customer" \
  --eta="services_restored_in_45m"
```

---

## 📋 Post-DR Checklist

### Immediate (Within 4 hours)
- [ ] All critical services restored and validated
- [ ] Customer communications sent
- [ ] Initial incident report drafted
- [ ] Monitoring and alerting fully operational

### Short-term (Within 24 hours)
- [ ] Full service validation completed
- [ ] Performance baseline re-established
- [ ] Security posture verified
- [ ] Customer impact assessment completed

### Medium-term (Within 1 week)
- [ ] Detailed postmortem conducted
- [ ] Process improvements identified
- [ ] Documentation updated
- [ ] Team training scheduled
- [ ] Next GameDay drill planned

### Long-term (Within 1 month)
- [ ] Infrastructure improvements implemented
- [ ] Automation enhancements deployed
- [ ] Vendor/partner relationships reviewed
- [ ] Regulatory reporting completed
- [ ] Budget impact assessed

---

## 📚 Related Resources

- [M32 Incident Response Runbook](INCIDENT_RESPONSE.md)
- [PostgreSQL PITR Runbook](RESTORE.md)
- [M33 Observability Dashboard](../src/pages/dashboard/ObservabilityDashboard.jsx)
- [Emergency Contact List](EMERGENCY_CONTACTS.md)

---

**⚠️ Critical Reminder**: DR procedures should be tested quarterly. Untested procedures are not reliable procedures.

**🔒 Security Note**: This document contains sensitive infrastructure information. Protect accordingly.

**📧 Questions?** Contact the Incident Commander or escalate via M32 on-call system.