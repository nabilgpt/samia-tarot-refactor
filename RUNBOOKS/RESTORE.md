# PostgreSQL Point-in-Time Recovery (PITR) Runbook

**Version**: 1.0  
**Last Updated**: 2025-01-13  
**Owner**: SRE Team  
**Classification**: INTERNAL  

## 📋 Overview

This runbook provides step-by-step procedures for restoring PostgreSQL databases using Point-in-Time Recovery (PITR). Follow these procedures during data loss incidents, corruption events, or planned recovery drills.

### ⚠️ Emergency Contacts
- **On-Call SRE**: Use emergency escalation system
- **Database Admin**: Contact via M32 on-call rotation
- **Incident Commander**: Auto-assigned via M32 escalation

---

## 🎯 Recovery Point & Time Objectives (RPO/RTO)

### Service Tier Targets

| Service Tier | RPO (Data Loss) | RTO (Downtime) | Use Cases |
|-------------|----------------|----------------|-----------|
| **Critical** | ≤ 1 minute | ≤ 5 minutes | Emergency calls, live payments |
| **High** | ≤ 5 minutes | ≤ 15 minutes | User authentication, booking |
| **Standard** | ≤ 15 minutes | ≤ 30 minutes | Analytics, reporting |
| **Archive** | ≤ 60 minutes | ≤ 2 hours | Historical data, logs |

### Backup Schedule
- **Full Backups**: Daily at 02:00 UTC
- **WAL Archiving**: Continuous (every 16MB or 60 seconds)
- **Retention**: 30 days for production, 7 days for staging

---

## 🚨 Pre-Recovery Assessment

### Step 1: Incident Classification
1. **Determine incident severity**:
   - SEV-1: Complete data loss, production down
   - SEV-2: Partial data corruption, degraded service
   - SEV-3: Historical data issue, no service impact

2. **Identify affected scope**:
   ```bash
   # Check database connectivity
   psql -h [HOST] -U postgres -c "SELECT NOW(), version();"
   
   # Assess data integrity
   psql -h [HOST] -U postgres -c "SELECT COUNT(*) FROM profiles WHERE created_at > NOW() - INTERVAL '1 hour';"
   ```

3. **Document incident timeline**:
   - When was the issue first detected?
   - What was the last known good state?
   - What changes occurred before the issue?

### Step 2: Recovery Point Selection
1. **Identify target recovery point**:
   ```sql
   -- Find the last transaction before corruption
   SELECT pg_current_wal_lsn();
   
   -- Check for recent problematic transactions
   SELECT NOW() - INTERVAL '15 minutes' AS suggested_recovery_point;
   ```

2. **Validate backup availability**:
   ```bash
   python postgres_pitr_service.py status
   ```

---

## 🔧 Recovery Procedures

### Option A: Point-in-Time Recovery (PITR)

#### Prerequisites
- [ ] Incident declared and escalated
- [ ] Maintenance window established
- [ ] Backup integrity verified
- [ ] Recovery target time confirmed

#### Step 1: Prepare Recovery Environment
```bash
# Stop the PostgreSQL service
sudo systemctl stop postgresql

# Backup current data directory (if accessible)
sudo mv /var/lib/postgresql/14/main /var/lib/postgresql/14/main.backup.$(date +%Y%m%d_%H%M%S)

# Create new data directory
sudo mkdir -p /var/lib/postgresql/14/main
sudo chown postgres:postgres /var/lib/postgresql/14/main
```

#### Step 2: Restore Base Backup
```bash
# Find appropriate base backup
python postgres_pitr_service.py find-backup --before="2025-01-13 10:00:00"

# Download and extract base backup
aws s3 cp s3://samia-tarot-backups/base-20250113-020000.tar.gz.enc /tmp/
python backup_encryption_service.py decrypt /tmp/base-20250113-020000.tar.gz.enc /tmp/base-backup.tar.gz

# Extract to data directory
sudo tar -xzf /tmp/base-backup.tar.gz -C /var/lib/postgresql/14/main --strip-components=1
sudo chown -R postgres:postgres /var/lib/postgresql/14/main
```

#### Step 3: Configure Recovery
```bash
# Create recovery configuration
sudo tee /var/lib/postgresql/14/main/postgresql.conf > /dev/null <<EOF
# Recovery Configuration
restore_command = 'python /opt/samia-tarot/postgres_pitr_service.py restore-wal %f %p'
recovery_target_time = '2025-01-13 10:00:00+00'
recovery_target_action = 'promote'
EOF

# Set proper permissions
sudo chown postgres:postgres /var/lib/postgresql/14/main/postgresql.conf
```

#### Step 4: Start Recovery Process
```bash
# Start PostgreSQL in recovery mode
sudo systemctl start postgresql

# Monitor recovery progress
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Wait for recovery completion message:
# "database system is ready to accept connections"
```

#### Step 5: Validate Recovery
```sql
-- Connect and verify recovery point
psql -U postgres -c "SELECT NOW() AS current_time, pg_last_wal_replay_lsn() AS recovery_lsn;"

-- Validate critical data
psql -U postgres -c "SELECT COUNT(*) FROM profiles;"
psql -U postgres -c "SELECT MAX(created_at) FROM orders;"

-- Check for data consistency
psql -U postgres -c "SELECT COUNT(*) FROM backup_metadata WHERE created_at > NOW() - INTERVAL '24 hours';"
```

### Option B: Full Database Restore (Last Resort)

#### When to Use
- PITR fails due to WAL corruption
- Complete database cluster failure
- Recovery target is beyond backup retention

#### Procedure
```bash
# Create new database cluster
sudo pg_createcluster 14 main-restore

# Restore from latest full backup
python postgres_pitr_service.py restore-full --target=/var/lib/postgresql/14/main-restore --latest

# Start restored instance on alternate port
sudo pg_ctlcluster 14 main-restore start -- -p 5433

# Validate and promote if successful
sudo systemctl stop postgresql
sudo mv /var/lib/postgresql/14/main /var/lib/postgresql/14/main.failed
sudo mv /var/lib/postgresql/14/main-restore /var/lib/postgresql/14/main
sudo systemctl start postgresql
```

---

## 🧪 Recovery Testing & Validation

### Data Integrity Checks
```sql
-- Verify table counts match expected values
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes
FROM pg_stat_user_tables
ORDER BY schemaname, tablename;

-- Check referential integrity
SELECT COUNT(*) FROM orders o 
LEFT JOIN profiles p ON o.user_id = p.id 
WHERE p.id IS NULL;

-- Validate recent transactions
SELECT COUNT(*) FROM audit_log 
WHERE created_at BETWEEN '2025-01-13 09:00:00' AND '2025-01-13 10:00:00';
```

### Application Connectivity Test
```bash
# Test database connectivity from application
python -c "
import psycopg2
conn = psycopg2.connect('$DSN')
with conn.cursor() as cur:
    cur.execute('SELECT COUNT(*) FROM profiles;')
    print(f'Profile count: {cur.fetchone()[0]}')
"

# Test application health endpoints
curl -f http://localhost:3000/api/health/database
```

### Performance Baseline
```sql
-- Check for performance degradation
EXPLAIN ANALYZE SELECT * FROM profiles WHERE email = 'test@example.com';

-- Verify indexes are present
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'profiles';

-- Update table statistics
ANALYZE;
```

---

## 📊 Recovery Metrics & Reporting

### Required Metrics
- **Recovery Start Time**: When procedure began
- **Recovery Completion Time**: When database was accessible
- **Actual RPO**: Time between recovery point and incident
- **Actual RTO**: Total downtime duration
- **Data Loss Assessment**: Amount of data lost (if any)

### Metrics Collection
```bash
# Generate recovery report
python postgres_pitr_service.py recovery-report --incident-id="INC-20250113-001"

# Update compliance tracking
python backup_321_policy_service.py record-recovery --success=true --rpo-minutes=5 --rto-minutes=15
```

---

## 🔍 Common Issues & Troubleshooting

### Issue: WAL Files Missing
**Symptoms**: Recovery fails with "requested WAL segment not found"
```bash
# Check WAL archive status
python postgres_pitr_service.py check-wal-continuity --from="2025-01-13 08:00:00" --to="2025-01-13 10:00:00"

# Attempt manual WAL recovery
aws s3 ls s3://samia-tarot-backups/wal-archive/ | grep "00000001000000010000"
```

### Issue: Backup Corruption
**Symptoms**: Base backup extraction fails or corruption detected
```bash
# Verify backup integrity
python backup_321_policy_service.py verify --backup-set-id="set-20250113-020000"

# Try alternative backup location
python postgres_pitr_service.py list-backups --before="2025-01-13 02:00:00" --limit=3
```

### Issue: Insufficient Space
**Symptoms**: Recovery fails due to disk space
```bash
# Check available space
df -h /var/lib/postgresql/

# Clean old backups if necessary
python postgres_pitr_service.py cleanup --dry-run

# Use alternative data directory
sudo mkdir -p /mnt/recovery/postgresql
sudo chown postgres:postgres /mnt/recovery/postgresql
```

### Issue: Permission Errors
**Symptoms**: PostgreSQL fails to start after restoration
```bash
# Fix ownership recursively
sudo chown -R postgres:postgres /var/lib/postgresql/14/main

# Fix permissions
sudo chmod 700 /var/lib/postgresql/14/main
sudo chmod 600 /var/lib/postgresql/14/main/postgresql.conf
```

---

## 📋 Post-Recovery Checklist

### Immediate Actions (Within 1 Hour)
- [ ] Database accessibility confirmed
- [ ] Critical application functions tested
- [ ] Performance baseline established
- [ ] Monitoring alerts re-enabled
- [ ] Stakeholders notified of resolution

### Short-term Actions (Within 24 Hours)
- [ ] Full application regression testing
- [ ] Data integrity audit completed
- [ ] Backup schedule resumed
- [ ] Recovery metrics documented
- [ ] Incident postmortem scheduled

### Medium-term Actions (Within 1 Week)
- [ ] Recovery procedure improvements identified
- [ ] Additional monitoring implemented
- [ ] Team training conducted
- [ ] Documentation updated
- [ ] Recovery drill scheduled

---

## 🎯 GameDay Scenarios

### Scenario 1: Recent Data Corruption
**Objective**: Recover from data corruption in the last hour
**Target**: RPO ≤ 5 minutes, RTO ≤ 15 minutes

### Scenario 2: Partial Table Loss
**Objective**: Restore specific tables from backup
**Target**: RPO ≤ 15 minutes, RTO ≤ 30 minutes

### Scenario 3: Complete Database Loss
**Objective**: Full database restoration from backup
**Target**: RPO ≤ 60 minutes, RTO ≤ 2 hours

### Scenario 4: Cross-Region Failover
**Objective**: Restore from geographically distant backup
**Target**: RTO ≤ 1 hour including network transfer

---

## 📞 Escalation Path

### Level 1: Database Administrator
- Initial assessment and recovery attempt
- Standard PITR procedures
- Timeline: 0-30 minutes

### Level 2: Senior SRE
- Complex recovery scenarios
- Custom recovery procedures
- Timeline: 30-60 minutes

### Level 3: Database Vendor Support
- Deep engine-level issues
- Corruption analysis
- Timeline: 1+ hours

### Level 4: Emergency Response Team
- Complete infrastructure failure
- Business continuity activation
- Timeline: 2+ hours

---

## 📚 Related Documentation

- [M32 Incident Response Runbook](INCIDENT_RESPONSE.md)
- [M33 Observability Dashboard](../src/pages/dashboard/ObservabilityDashboard.jsx)
- [Backup 3-2-1 Policy](../backup_321_policy_service.py)
- [Database Schema Documentation](../SAMIA-TAROT-CONTEXT-ENGINEERING.md)

---

## 🔐 Security Notes

- **Access Control**: Only authorized personnel should perform recovery
- **Audit Trail**: All recovery actions are logged in audit_log table
- **Data Privacy**: Ensure GDPR compliance during recovery testing
- **Encryption**: All backups are encrypted with rotating keys

---

**⚠️ Remember**: Practice makes perfect. Regular GameDay drills ensure this runbook works when it matters most.

**📧 Questions?** Contact the SRE team via the on-call rotation or create a ticket in the incident management system.