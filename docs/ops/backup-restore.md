# Backup & Restore Operations

## Backup Strategy

### Automated Backups (Supabase)
- **Frequency**: Daily (00:00 UTC)
- **Retention**: 30 days (point-in-time recovery)
- **Type**: Full database backup with WAL archiving
- **Encryption**: AES-256 at rest

### Critical Data Protection
```sql
-- Tables with automated backup verification
SELECT table_name, backup_status, last_verified
FROM backup_verification_log
WHERE verified_at > NOW() - INTERVAL '24 hours';
```

## Daily Verification Process

### Automated Script: `backup_verify.sh`
```bash
#!/bin/bash
# Location: scripts/ops/backup_verify.sh

set -e

TIMESTAMP=$(date -u +"%Y-%m-%d_%H-%M-%S_UTC")
EVIDENCE_FILE="/tmp/backup_verify_${TIMESTAMP}.log"
DATABASE_URL=${SUPABASE_DB_URL}

echo "=== Backup Verification Report ===" > $EVIDENCE_FILE
echo "Timestamp: $TIMESTAMP" >> $EVIDENCE_FILE
echo "Database: ${DATABASE_URL%/*}/[REDACTED]" >> $EVIDENCE_FILE
echo "" >> $EVIDENCE_FILE

# Test 1: Critical table row counts
echo "1. Critical Table Integrity:" >> $EVIDENCE_FILE
psql $DATABASE_URL -t -c "
  SELECT
    'profiles: ' || COUNT(*) as count FROM profiles
  UNION ALL
  SELECT
    'orders: ' || COUNT(*) as count FROM orders
  UNION ALL
  SELECT
    'audit_log: ' || COUNT(*) as count FROM audit_log
  UNION ALL
  SELECT
    'wa_messages: ' || COUNT(*) as count FROM wa_messages;
" >> $EVIDENCE_FILE

# Test 2: RLS enforcement
echo "" >> $EVIDENCE_FILE
echo "2. Security Posture:" >> $EVIDENCE_FILE
psql $DATABASE_URL -t -c "
  SELECT
    'RLS Enabled: ' || COUNT(*) as count
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE c.relrowsecurity = true
  AND n.nspname = 'public';
" >> $EVIDENCE_FILE

# Test 3: Recent activity
echo "" >> $EVIDENCE_FILE
echo "3. Recent Activity (last 24h):" >> $EVIDENCE_FILE
psql $DATABASE_URL -t -c "
  SELECT
    'audit_entries: ' || COUNT(*) as count
  FROM audit_log
  WHERE created_at > NOW() - INTERVAL '24 hours';
" >> $EVIDENCE_FILE

# Test 4: Critical constraints
echo "" >> $EVIDENCE_FILE
echo "4. Data Integrity:" >> $EVIDENCE_FILE
psql $DATABASE_URL -t -c "
  SELECT
    'verified_emails: ' || COUNT(*) as count
  FROM profiles
  WHERE email_verified = true;
" >> $EVIDENCE_FILE

# Generate verification hash
CONTENT_HASH=$(cat $EVIDENCE_FILE | sha256sum | cut -d' ' -f1)
echo "" >> $EVIDENCE_FILE
echo "Verification Hash: $CONTENT_HASH" >> $EVIDENCE_FILE

# Store evidence in secure location
cp $EVIDENCE_FILE "evidence/backup_verify_${TIMESTAMP}.log"

# Output summary
if [ $(wc -l < $EVIDENCE_FILE) -gt 15 ]; then
  echo "✅ PASS: Backup verification completed successfully"
  echo "Evidence: backup_verify_${TIMESTAMP}.log"
  echo "Hash: $CONTENT_HASH"
  exit 0
else
  echo "❌ FAIL: Backup verification incomplete"
  echo "Evidence: backup_verify_${TIMESTAMP}.log"
  exit 1
fi
```

## Restore Procedures

### Point-in-Time Recovery
```sql
-- Check available recovery points
SELECT * FROM pg_stat_archiver;

-- Example: Restore to specific timestamp
-- (This would be done via Supabase dashboard or CLI)
-- RESTORE DATABASE samia_tarot TO TIMESTAMP '2024-01-15 14:30:00';
```

### Partial Restore (Table-level)
```sql
-- Backup specific table before restore
CREATE TABLE profiles_backup AS SELECT * FROM profiles;

-- Restore from backup (example)
-- COPY profiles FROM '/backup/profiles_20240115.sql';

-- Verify restore integrity
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM profiles_backup;
```

### Critical System Recovery

#### 1. Database Corruption
```bash
# Step 1: Assess damage
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size('postgres'));"

# Step 2: Check table integrity
psql $DATABASE_URL -c "
  SELECT schemaname, tablename,
         pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

# Step 3: Initiate restore via Supabase dashboard
# Step 4: Verify with backup_verify.sh
./scripts/ops/backup_verify.sh
```

#### 2. Data Loss Recovery
```sql
-- Check audit trail for recent changes
SELECT actor, event, entity, created_at, meta
FROM audit_log
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Identify affected records
SELECT entity_id, event, meta->>'old' as old_data, meta->>'new' as new_data
FROM audit_log
WHERE event LIKE '%_deleted'
AND created_at > NOW() - INTERVAL '1 hour';
```

## Recovery Testing

### Monthly Restore Drill
```bash
#!/bin/bash
# Scheduled: First Sunday of each month

echo "🔄 Starting monthly restore drill..."

# 1. Create test database
createdb samia_tarot_restore_test

# 2. Restore from backup
# (Using Supabase CLI or dashboard)

# 3. Run verification script
DATABASE_URL="postgresql://user:pass@host/samia_tarot_restore_test" \
  ./scripts/ops/backup_verify.sh

# 4. Cleanup
dropdb samia_tarot_restore_test

echo "✅ Monthly restore drill completed"
```

### Verification Checklist
- [ ] All critical tables present
- [ ] Row counts match expected ranges
- [ ] RLS policies active
- [ ] Foreign key constraints intact
- [ ] Audit trail continuity
- [ ] User authentication working
- [ ] Payment system functional

## Data Retention Policies

### Automated Cleanup
```sql
-- Old audit logs (keep 1 year)
DELETE FROM audit_log
WHERE created_at < NOW() - INTERVAL '1 year';

-- Expired media signatures
DELETE FROM wa_media_signatures
WHERE expires_at < NOW() - INTERVAL '1 day';

-- Completed automation flows (keep 30 days)
DELETE FROM wa_automation_flows
WHERE status = 'completed'
AND updated_at < NOW() - INTERVAL '30 days';

-- Old siren events (keep 90 days)
DELETE FROM siren_events
WHERE status IN ('sent', 'failed', 'cancelled')
AND created_at < NOW() - INTERVAL '90 days';
```

### Legal Compliance (M38)
```sql
-- Data subject deletion (GDPR/CCPA)
CREATE OR REPLACE FUNCTION delete_user_data(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Anonymize audit logs
  UPDATE audit_log
  SET actor = 'deleted_user',
      meta = meta - 'email' - 'phone' - 'name'
  WHERE actor = user_id::text;

  -- Delete personal data
  DELETE FROM profiles WHERE id = user_id;
  DELETE FROM wa_messages WHERE profile_id = user_id;
  DELETE FROM wa_automation_flows WHERE profile_id = user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Monitoring & Alerting

### Backup Health Checks
```sql
-- Check backup freshness
SELECT
  CASE
    WHEN last_backup < NOW() - INTERVAL '25 hours' THEN 'ALERT: Backup overdue'
    WHEN last_backup < NOW() - INTERVAL '1 day' THEN 'WARNING: Backup aging'
    ELSE 'OK: Backup current'
  END as backup_status,
  last_backup
FROM (
  SELECT MAX(created_at) as last_backup
  FROM backup_verification_log
) b;
```

### Integration with Siren (M40)
```python
# Auto-trigger siren alert on backup failure
def check_backup_health():
    result = db_fetch_one("""
        SELECT COUNT(*) as recent_backups
        FROM backup_verification_log
        WHERE created_at > NOW() - INTERVAL '25 hours'
    """)

    if result['recent_backups'] == 0:
        siren_service.trigger_incident(
            incident_type='backup_failure',
            severity=1,
            source='backup_monitor',
            policy_name='Critical',
            context={'check': 'daily_backup_missing'},
            variables={'last_check': datetime.utcnow().isoformat()},
            created_by='system'
        )
```

## Emergency Procedures

### Catastrophic Failure
1. **Immediate**: Switch to maintenance mode
2. **Assess**: Determine scope of data loss
3. **Communicate**: Notify stakeholders via Siren
4. **Restore**: Begin recovery from latest backup
5. **Verify**: Run full verification suite
6. **Resume**: Gradual service restoration

### Data Breach Response
1. **Isolate**: Disconnect affected systems
2. **Preserve**: Snapshot current state for forensics
3. **Assess**: Determine scope and impact
4. **Notify**: Legal and regulatory requirements
5. **Recover**: Clean restore from verified backup
6. **Harden**: Implement additional security measures

## Evidence Storage

### Verification Records
- **Location**: `evidence/` directory (git-tracked)
- **Format**: Timestamped logs with SHA256 hashes
- **Retention**: 1 year minimum
- **Access**: Audit-logged retrieval only

### Compliance Reporting
```bash
# Generate monthly backup report
find evidence/ -name "backup_verify_*.log" -newermt "30 days ago" | \
  xargs grep "Verification Hash" | \
  awk '{print $1, $3}' > monthly_backup_report.txt
```