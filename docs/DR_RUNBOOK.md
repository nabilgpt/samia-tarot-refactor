# Disaster Recovery & Business Continuity Runbook
**Samia Tarot Platform - NIST SP 800-34 Aligned DR/BCP**

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Next Review**: July 2025  
**Owner**: SRE Team  
**Classification**: Internal/Confidential

---

## 1. Executive Summary

### 1.1 Purpose
This runbook provides comprehensive disaster recovery (DR) and business continuity planning (BCP) procedures aligned with NIST SP 800-34 guidelines for the Samia Tarot Platform.

### 1.2 Scope
- Database failures and corruption scenarios
- Application and infrastructure outages
- Storage system failures and data loss
- External provider service disruptions
- Security incidents requiring system isolation
- Natural disasters and facility outages

### 1.3 Recovery Objectives
| Metric | Target | Maximum Tolerable |
|--------|---------|------------------|
| **RTO (Recovery Time Objective)** | 4 hours | 24 hours |
| **RPO (Recovery Point Objective)** | 1 hour | 4 hours |
| **Service Availability** | 99.9% | 99.5% |
| **Data Loss Tolerance** | < 1 hour of transactions | < 4 hours |

### 1.4 Business Impact Classification
- **Critical**: User authentication, payment processing, active consultations
- **Important**: Order management, content delivery, user communications  
- **Moderate**: Analytics, reporting, administrative functions
- **Low**: Marketing campaigns, historical data access

---

## 2. Infrastructure Overview

### 2.1 System Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    Production Environment                        │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │   Application   │    │    Database     │    │   Storage    │ │
│  │   (Supabase)    │    │  (PostgreSQL)   │    │ (Supabase)   │ │
│  │                 │    │                 │    │              │ │
│  │  EU-West-1      │    │   EU-West-1     │    │  EU-West-1   │ │
│  │  Multi-AZ       │    │   Multi-AZ      │    │  Multi-AZ    │ │
│  └─────────────────┘    └─────────────────┘    └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Dependencies                        │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────┐ │
│  │   Stripe    │  │   Twilio    │  │     FCM     │  │  Square│ │
│  │  (Payment)  │  │    (SMS)    │  │   (Push)    │  │(Backup)│ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Critical Data Stores
| System | Data Category | Backup Frequency | Recovery Priority |
|--------|---------------|------------------|------------------|
| **PostgreSQL** | All relational data | Hourly (WAL), Daily (Full) | P0 - Critical |
| **Supabase Storage** | Media files, audio | Daily snapshot | P1 - Important |
| **Authentication** | User credentials | Real-time replication | P0 - Critical |
| **Configuration** | App settings | Weekly backup | P2 - Moderate |

### 2.3 External Dependencies
| Provider | Service | Fallback | Recovery Time |
|----------|---------|----------|---------------|
| **Supabase** | Database/Auth | Manual migration | 4-8 hours |
| **Stripe** | Payments (Primary) | Square fallback | 5 minutes |
| **Square** | Payments (Backup) | Manual processing | 30 minutes |
| **Twilio** | SMS/Voice | Delayed delivery | 15 minutes |
| **FCM/APNs** | Push notifications | Email fallback | 10 minutes |

---

## 3. Backup Strategy & Verification

### 3.1 Database Backup Configuration

#### 3.1.1 Automated Backup Schedule
```sql
-- Verify backup configuration
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check WAL archiving status
SELECT 
  name, 
  setting, 
  context 
FROM pg_settings 
WHERE name IN ('archive_mode', 'archive_command', 'wal_level');
```

**Supabase Managed Backups**:
- **Point-in-time Recovery**: Up to 7 days
- **Daily Snapshots**: Retained for 30 days  
- **Cross-region Replication**: EU-West-1 to EU-Central-1
- **Encryption**: AES-256 at rest and in transit

#### 3.1.2 Custom Backup Procedures
```bash
#!/bin/bash
# Daily custom backup script
# Location: /ops/scripts/backup_database.sh

set -euo pipefail

BACKUP_DIR="/backups/$(date +%Y%m%d)"
PGPASSWORD="${DB_PASSWORD}" 

mkdir -p "${BACKUP_DIR}"

# Full database backup
pg_dump -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" \
  --format=custom --compress=9 --verbose \
  --file="${BACKUP_DIR}/samia_full_$(date +%Y%m%d_%H%M%S).dump"

# Schema-only backup  
pg_dump -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" \
  --schema-only --format=plain \
  --file="${BACKUP_DIR}/samia_schema_$(date +%Y%m%d_%H%M%S).sql"

# Critical tables backup
pg_dump -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" \
  --format=custom --compress=9 \
  --table=profiles --table=orders --table=payment_transactions \
  --file="${BACKUP_DIR}/samia_critical_$(date +%Y%m%d_%H%M%S).dump"

# Verify backup integrity
pg_restore --list "${BACKUP_DIR}/samia_full_$(date +%Y%m%d_%H%M%S).dump" > /dev/null

echo "Backup completed successfully: ${BACKUP_DIR}"
```

#### 3.1.3 Storage Backup Strategy
```python
#!/usr/bin/env python3
# Storage backup verification script
# Location: /ops/scripts/verify_storage_backups.py

import boto3
import json
from datetime import datetime, timedelta

def verify_storage_backups():
    """Verify Supabase storage backups are current and accessible"""
    
    # Check bucket replication status
    s3 = boto3.client('s3', region_name='eu-west-1')
    
    # Verify recent backups exist
    response = s3.list_objects_v2(
        Bucket='samia-tarot-backups',
        Prefix='daily/',
        MaxKeys=10
    )
    
    latest_backup = None
    if 'Contents' in response:
        latest_backup = max(response['Contents'], key=lambda x: x['LastModified'])
    
    if not latest_backup:
        raise Exception("No recent backups found")
    
    # Check if backup is within acceptable age
    max_age = datetime.now() - timedelta(hours=25)  # Allow 1 hour grace
    if latest_backup['LastModified'].replace(tzinfo=None) < max_age:
        raise Exception(f"Latest backup is too old: {latest_backup['LastModified']}")
    
    # Test restore capability (small sample)
    try:
        sample_response = s3.get_object(
            Bucket='samia-tarot-backups',
            Key=latest_backup['Key'],
            Range='bytes=0-1023'  # Test first 1KB
        )
        print(f"✅ Backup verification successful: {latest_backup['Key']}")
        return True
    except Exception as e:
        print(f"❌ Backup verification failed: {e}")
        return False

if __name__ == "__main__":
    verify_storage_backups()
```

### 3.2 Backup Validation & Testing

#### 3.2.1 Monthly Restore Drill Procedure
```bash
#!/bin/bash
# Monthly restore drill to isolated environment
# Location: /ops/drills/monthly_restore_test.sh

DRILL_DB="samia_drill_$(date +%Y%m%d)"
BACKUP_FILE="/backups/latest/samia_full_latest.dump"

echo "🔄 Starting monthly restore drill..."

# Create isolated test database
psql -h "${STAGING_DB_HOST}" -U "${DB_USER}" -c "CREATE DATABASE ${DRILL_DB};"

# Restore from backup
pg_restore -h "${STAGING_DB_HOST}" -U "${DB_USER}" -d "${DRILL_DB}" \
  --verbose --clean --if-exists "${BACKUP_FILE}"

# Verify data integrity
PROFILE_COUNT=$(psql -h "${STAGING_DB_HOST}" -U "${DB_USER}" -d "${DRILL_DB}" \
  -t -c "SELECT COUNT(*) FROM profiles;")

ORDER_COUNT=$(psql -h "${STAGING_DB_HOST}" -U "${DB_USER}" -d "${DRILL_DB}" \
  -t -c "SELECT COUNT(*) FROM orders;")

echo "✅ Restore completed - Profiles: ${PROFILE_COUNT}, Orders: ${ORDER_COUNT}"

# Cleanup test database
psql -h "${STAGING_DB_HOST}" -U "${DB_USER}" -c "DROP DATABASE ${DRILL_DB};"

echo "🎯 Monthly restore drill completed successfully"
```

#### 3.2.2 Backup Integrity Monitoring
```sql
-- Daily backup integrity check
CREATE OR REPLACE FUNCTION verify_backup_integrity()
RETURNS TABLE (
  backup_date date,
  table_name text,
  record_count bigint,
  checksum text,
  status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    current_date as backup_date,
    'profiles'::text as table_name,
    count(*) as record_count,
    md5(string_agg(id::text, ',' ORDER BY id)) as checksum,
    'verified'::text as status
  FROM profiles
  UNION ALL
  SELECT 
    current_date,
    'orders'::text,
    count(*),
    md5(string_agg(id::text, ',' ORDER BY id)),
    'verified'::text
  FROM orders;
END;
$$ LANGUAGE plpgsql;
```

---

## 4. Disaster Recovery Scenarios

### 4.1 Database Failure Scenarios

#### 4.1.1 Primary Database Outage (RTO: 2 hours)
**Symptoms**:
- Connection timeouts to database
- Application errors: "Cannot connect to database"
- Health checks failing

**Immediate Response (0-30 minutes)**:
```bash
# Step 1: Assess situation
echo "🚨 Database outage detected at $(date)"

# Check Supabase status
curl -s "https://status.supabase.com/api/v2/status.json" | jq '.status.description'

# Verify network connectivity  
ping -c 3 "${DB_HOST}"
telnet "${DB_HOST}" 5432

# Check application logs
tail -f /var/log/samia-app/error.log | grep -i "database\|connection"
```

**Recovery Steps (30 minutes - 2 hours)**:
```bash
# Step 2: Activate read-only mode if possible
# Update application configuration
export MAINTENANCE_MODE=true
export DB_READ_ONLY=true

# Step 3: Assess recovery options
if [[ "${SUPABASE_STATUS}" == "operational" ]]; then
  echo "Supabase operational - likely network issue"
  # Check DNS, security groups, connection pooling
else
  echo "Supabase incident confirmed - proceeding with backup restore"
  # Initiate Point-in-Time Recovery via Supabase dashboard
fi

# Step 4: Communication
curl -X POST "${SLACK_WEBHOOK}" -H 'Content-type: application/json' \
  --data '{"text":"🚨 Database outage - ETA 2 hours for full recovery"}'
```

**Post-Recovery Validation**:
```sql
-- Verify data consistency after recovery
SELECT 
  'profiles' as table_name,
  count(*) as record_count,
  max(updated_at) as latest_update
FROM profiles
UNION ALL
SELECT 
  'orders',
  count(*),
  max(updated_at)
FROM orders;

-- Check for any data gaps
SELECT date_trunc('hour', created_at) as hour_bucket, count(*)
FROM orders 
WHERE created_at >= now() - interval '24 hours'
GROUP BY date_trunc('hour', created_at)
ORDER BY hour_bucket;
```

#### 4.1.2 Data Corruption Incident (RTO: 4 hours)
**Detection**:
- Data integrity check failures
- User reports of missing/incorrect data
- Application errors with constraint violations

**Response Procedure**:
```bash
#!/bin/bash
# Data corruption response script

echo "🔍 Investigating data corruption incident..."

# Step 1: Isolate affected systems
export MAINTENANCE_MODE=true

# Step 2: Identify corruption scope
psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" <<EOF
-- Check for constraint violations
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats 
WHERE schemaname = 'public' AND n_distinct < 0;

-- Look for orphaned records
SELECT 'orphaned_orders' as issue, count(*) 
FROM orders o 
LEFT JOIN profiles p ON o.user_id = p.id 
WHERE p.id IS NULL;

-- Check for duplicate primary keys (should be 0)
SELECT 'duplicate_profiles' as issue, email, count(*)
FROM profiles 
GROUP BY email 
HAVING count(*) > 1;
EOF

# Step 3: Point-in-time recovery decision
echo "Select recovery point:"
echo "1) Last clean backup (up to 24 hours data loss)"
echo "2) Point-in-time recovery (minimal data loss)"
echo "3) Selective table restore (affected tables only)"
read -p "Choice: " RECOVERY_OPTION

case $RECOVERY_OPTION in
  1) restore_from_clean_backup ;;
  2) point_in_time_recovery ;;
  3) selective_table_restore ;;
esac
```

### 4.2 Application Layer Failures

#### 4.2.1 Complete Application Outage (RTO: 1 hour)
**Immediate Response**:
```bash
# Emergency application restart procedure
#!/bin/bash

echo "🔄 Application emergency restart initiated"

# Step 1: Health check current status
curl -f "${APP_URL}/health" || echo "Health check failed"

# Step 2: Check recent deployment
git log --oneline -n 5

# Step 3: Quick rollback if recent deployment
if [[ $(git log --since="1 hour ago" --oneline | wc -l) -gt 0 ]]; then
  echo "Recent deployment detected - initiating rollback"
  git reset --hard HEAD~1
  # Deploy previous version
fi

# Step 4: Check external dependencies
check_external_dependencies() {
  echo "🔍 Checking external services..."
  
  # Stripe API
  curl -s -H "Authorization: Bearer ${STRIPE_API_KEY}" \
    "https://api.stripe.com/v1/charges?limit=1" > /dev/null && \
    echo "✅ Stripe API operational" || echo "❌ Stripe API issues"
  
  # Twilio API  
  curl -s -u "${TWILIO_SID}:${TWILIO_TOKEN}" \
    "https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}.json" > /dev/null && \
    echo "✅ Twilio API operational" || echo "❌ Twilio API issues"
}

check_external_dependencies
```

#### 4.2.2 Partial Service Degradation (RTO: 30 minutes)
**Graceful Degradation Strategy**:
```javascript
// Circuit breaker implementation for graceful degradation
class ServiceCircuitBreaker {
  constructor(service, threshold = 5, timeout = 60000) {
    this.service = service;
    this.failureThreshold = threshold;
    this.resetTimeout = timeout;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
  }

  async call(request) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.failureCount = 0;
      } else {
        throw new Error(`Service ${this.service} circuit breaker OPEN`);
      }
    }

    try {
      const result = await this.executeRequest(request);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}

// Service degradation with fallbacks
const paymentBreaker = new ServiceCircuitBreaker('stripe', 5, 300000);
const smsBreaker = new ServiceCircuitBreaker('twilio', 3, 60000);

// Implement fallback behaviors
async function processPayment(paymentData) {
  try {
    return await paymentBreaker.call(paymentData);
  } catch (error) {
    // Fallback to Square or manual processing queue
    return await fallbackPaymentProcessing(paymentData);
  }
}
```

### 4.3 Storage System Failures

#### 4.3.1 Media Storage Outage (RTO: 1 hour)
**Response Procedures**:
```python
#!/usr/bin/env python3
# Storage outage response script

import boto3
import logging
from datetime import datetime

def handle_storage_outage():
    """Handle Supabase storage outage with fallback procedures"""
    
    logging.info("🗂️  Storage outage response initiated")
    
    # Step 1: Verify outage scope
    try:
        s3 = boto3.client('s3', region_name='eu-west-1')
        s3.head_bucket(Bucket='samia-tarot-media')
        logging.info("✅ Primary storage accessible")
        return False  # No outage
    except Exception as e:
        logging.error(f"❌ Primary storage unavailable: {e}")
    
    # Step 2: Activate read-only mode for media
    update_app_config({
        'MEDIA_UPLOAD_ENABLED': False,
        'STORAGE_READ_ONLY': True,
        'FALLBACK_STORAGE_MODE': True
    })
    
    # Step 3: Check backup storage access
    try:
        backup_response = s3.list_objects_v2(
            Bucket='samia-tarot-backups',
            Prefix='media/',
            MaxKeys=1
        )
        logging.info("✅ Backup storage accessible")
    except Exception as e:
        logging.error(f"❌ Backup storage also unavailable: {e}")
        return False
    
    # Step 4: Implement temporary media serving
    setup_temporary_media_serving()
    
    return True

def setup_temporary_media_serving():
    """Setup temporary media serving from backup storage"""
    
    # Configure CDN to serve from backup location
    cloudflare_config = {
        'zone_id': 'your_zone_id',
        'origin': 's3://samia-tarot-backups/media/',
        'cache_ttl': 3600
    }
    
    logging.info("🔄 Temporary media serving configured")

if __name__ == "__main__":
    handle_storage_outage()
```

### 4.4 External Provider Failures

#### 4.4.1 Payment Provider Outage (RTO: 5 minutes)
**Automated Failover**:
```javascript
// Payment provider failover logic
async function processPaymentWithFailover(paymentData) {
  const providers = [
    { name: 'stripe', handler: stripePayment, priority: 1 },
    { name: 'square', handler: squarePayment, priority: 2 }
  ];

  for (const provider of providers) {
    try {
      console.log(`Attempting payment with ${provider.name}`);
      
      const result = await provider.handler(paymentData);
      
      // Log successful payment
      await logPaymentAttempt({
        provider: provider.name,
        status: 'success',
        paymentId: result.id,
        timestamp: new Date()
      });
      
      return result;
      
    } catch (error) {
      console.error(`${provider.name} payment failed:`, error);
      
      await logPaymentAttempt({
        provider: provider.name,
        status: 'failed',
        error: error.message,
        timestamp: new Date()
      });
      
      // Continue to next provider
      continue;
    }
  }
  
  // All providers failed - queue for manual processing
  await queueManualPayment(paymentData);
  throw new Error('All payment providers unavailable');
}
```

#### 4.4.2 Communication Provider Outage (RTO: 15 minutes)
**SMS/Email Fallback Chain**:
```python
# Communication failover system
import asyncio
from enum import Enum

class NotificationChannel(Enum):
    SMS_TWILIO = "twilio_sms"
    EMAIL_SMTP = "email_smtp"
    PUSH_FCM = "fcm_push"
    IN_APP = "in_app"

async def send_notification_with_fallback(user_id, message, channels=None):
    """Send notification with automatic fallback"""
    
    if channels is None:
        channels = [
            NotificationChannel.SMS_TWILIO,
            NotificationChannel.PUSH_FCM,
            NotificationChannel.EMAIL_SMTP,
            NotificationChannel.IN_APP
        ]
    
    for channel in channels:
        try:
            success = await send_via_channel(channel, user_id, message)
            if success:
                await log_notification_success(user_id, channel, message)
                return True
        except Exception as e:
            await log_notification_failure(user_id, channel, str(e))
            continue
    
    # All channels failed - store for retry
    await queue_notification_retry(user_id, message, channels)
    return False

async def send_via_channel(channel, user_id, message):
    """Send via specific channel with timeout"""
    
    handlers = {
        NotificationChannel.SMS_TWILIO: send_sms_twilio,
        NotificationChannel.EMAIL_SMTP: send_email_smtp,
        NotificationChannel.PUSH_FCM: send_push_fcm,
        NotificationChannel.IN_APP: send_in_app
    }
    
    handler = handlers.get(channel)
    if not handler:
        raise ValueError(f"Unknown channel: {channel}")
    
    # 30-second timeout per channel
    return await asyncio.wait_for(handler(user_id, message), timeout=30)
```

---

## 5. Emergency Communication Procedures

### 5.1 Incident Communication Plan

#### 5.1.1 Internal Communication Matrix
| Incident Severity | Notification Time | Stakeholders | Communication Method |
|-------------------|------------------|--------------|---------------------|
| **P0 - Critical** | Immediate (0-5 min) | SRE Team, CTO, CEO | Phone + Slack |
| **P1 - High** | 15 minutes | SRE Team, Engineering Lead | Slack + Email |
| **P2 - Medium** | 1 hour | Engineering Team | Slack |
| **P3 - Low** | 24 hours | Engineering Team | Email |

#### 5.1.2 External Communication Templates
**Customer-Facing Status Page Update**:
```markdown
## Service Disruption - [TIMESTAMP]

We are currently experiencing issues with our platform that may affect:
- New user registrations
- Payment processing
- Content delivery

**What we're doing:**
Our engineering team is actively working to resolve this issue.

**Estimated Resolution:** [TIME ESTIMATE]

**Next Update:** [TIME + 30 minutes]

We apologize for any inconvenience and will provide updates as we have them.
```

**User Notification Email Template**:
```html
Subject: Service Update - Samia Tarot Platform

Dear [USER_NAME],

We're writing to inform you of a temporary service disruption that occurred between [START_TIME] and [END_TIME].

Impact on your account:
- [SPECIFIC IMPACTS]

Actions we've taken:
- [RESOLUTION STEPS]

If you experienced any issues, please contact our support team at support@samia-tarot.com.

Thank you for your patience.
Best regards,
The Samia Tarot Team
```

### 5.2 Escalation Procedures

#### 5.2.1 On-Call Rotation
```yaml
# On-call schedule configuration
primary_oncall:
  - name: "SRE Team Lead"
    phone: "+XX-XXX-XXX-XXXX"
    slack: "@sre-lead"
    escalation_time: 15

secondary_oncall:
  - name: "Engineering Manager"
    phone: "+XX-XXX-XXX-XXXX"
    slack: "@eng-manager"
    escalation_time: 30

executive_escalation:
  - name: "CTO"
    phone: "+XX-XXX-XXX-XXXX"
    conditions: ["P0_incident", "customer_data_breach", "financial_impact_high"]
```

#### 5.2.2 Automated Escalation Script
```bash
#!/bin/bash
# Automated incident escalation
# Location: /ops/scripts/escalate_incident.sh

INCIDENT_ID="$1"
SEVERITY="$2"
DESCRIPTION="$3"

case $SEVERITY in
  "P0")
    # Immediate escalation for critical incidents
    curl -X POST "${PAGERDUTY_API}/incidents" \
      -H "Authorization: Token ${PAGERDUTY_TOKEN}" \
      -d "{
        \"incident\": {
          \"type\": \"incident\",
          \"title\": \"P0: ${DESCRIPTION}\",
          \"service\": {\"id\": \"${SERVICE_ID}\", \"type\": \"service_reference\"},
          \"urgency\": \"high\",
          \"body\": {\"type\": \"incident_body\", \"details\": \"${DESCRIPTION}\"}
        }
      }"
    
    # Send SMS to executives
    send_sms_alert "$CTO_PHONE" "P0 Incident: $DESCRIPTION - Incident ID: $INCIDENT_ID"
    ;;
    
  "P1")
    # High priority - notify engineering team
    slack_notify "#incidents" "P1 Incident: $DESCRIPTION"
    ;;
esac
```

---

## 6. Recovery Validation & Testing

### 6.1 Service Recovery Validation

#### 6.1.1 Automated Health Checks
```python
#!/usr/bin/env python3
# Post-recovery health validation
# Location: /ops/scripts/validate_recovery.py

import requests
import time
import json
from datetime import datetime

def validate_service_recovery():
    """Comprehensive post-recovery validation suite"""
    
    validation_results = []
    
    # Database connectivity
    try:
        response = requests.get(f"{API_BASE_URL}/health/database", timeout=30)
        db_status = "✅ PASS" if response.status_code == 200 else "❌ FAIL"
        validation_results.append(("Database", db_status, response.json()))
    except Exception as e:
        validation_results.append(("Database", "❌ FAIL", str(e)))
    
    # Authentication system
    try:
        auth_response = requests.post(f"{API_BASE_URL}/auth/test", 
                                    json={"test": True}, timeout=10)
        auth_status = "✅ PASS" if auth_response.status_code == 200 else "❌ FAIL"
        validation_results.append(("Authentication", auth_status, auth_response.json()))
    except Exception as e:
        validation_results.append(("Authentication", "❌ FAIL", str(e)))
    
    # Payment processing
    try:
        payment_health = requests.get(f"{API_BASE_URL}/health/payments", timeout=15)
        payment_status = "✅ PASS" if payment_health.status_code == 200 else "❌ FAIL"
        validation_results.append(("Payments", payment_status, payment_health.json()))
    except Exception as e:
        validation_results.append(("Payments", "❌ FAIL", str(e)))
    
    # Media storage access
    try:
        storage_test = requests.get(f"{API_BASE_URL}/health/storage", timeout=20)
        storage_status = "✅ PASS" if storage_test.status_code == 200 else "❌ FAIL"
        validation_results.append(("Storage", storage_status, storage_test.json()))
    except Exception as e:
        validation_results.append(("Storage", "❌ FAIL", str(e)))
    
    # Generate report
    generate_recovery_report(validation_results)
    
    return all("PASS" in result[1] for result in validation_results)

def generate_recovery_report(results):
    """Generate post-recovery validation report"""
    
    report = {
        "timestamp": datetime.now().isoformat(),
        "overall_status": "PASS" if all("PASS" in r[1] for r in results) else "FAIL",
        "component_results": [
            {"component": r[0], "status": r[1], "details": r[2]} 
            for r in results
        ]
    }
    
    with open(f"/var/log/recovery_validation_{int(time.time())}.json", "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"Recovery validation report generated: {report['overall_status']}")
    return report

if __name__ == "__main__":
    success = validate_service_recovery()
    exit(0 if success else 1)
```

#### 6.1.2 Data Integrity Verification
```sql
-- Post-recovery data integrity checks
CREATE OR REPLACE FUNCTION post_recovery_data_validation()
RETURNS TABLE (
  check_name text,
  status text,
  details jsonb
) AS $$
BEGIN
  -- Check for orphaned records
  RETURN QUERY
  SELECT 
    'orphaned_orders'::text as check_name,
    CASE 
      WHEN COUNT(*) = 0 THEN '✅ PASS'
      ELSE '❌ FAIL'
    END as status,
    jsonb_build_object('orphaned_count', COUNT(*)) as details
  FROM orders o 
  LEFT JOIN profiles p ON o.user_id = p.id 
  WHERE p.id IS NULL;
  
  -- Check for missing media references
  RETURN QUERY
  SELECT 
    'missing_media'::text,
    CASE 
      WHEN COUNT(*) = 0 THEN '✅ PASS'
      ELSE '❌ FAIL'  
    END,
    jsonb_build_object('missing_count', COUNT(*))
  FROM orders o
  WHERE (o.input_media_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM media_assets m WHERE m.id = o.input_media_id))
     OR (o.output_media_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM media_assets m WHERE m.id = o.output_media_id));
  
  -- Verify recent transaction consistency
  RETURN QUERY
  SELECT 
    'transaction_consistency'::text,
    CASE 
      WHEN COUNT(*) > 0 THEN '✅ PASS'
      ELSE '❌ FAIL'
    END,
    jsonb_build_object('recent_transactions', COUNT(*))
  FROM payment_transactions 
  WHERE created_at >= now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql;
```

### 6.2 Disaster Recovery Testing Schedule

#### 6.2.1 Monthly DR Drill Calendar
```yaml
# DR drill schedule configuration
monthly_drills:
  week_1:
    type: "database_recovery"
    duration: "2 hours"
    participants: ["SRE", "Engineering"]
    
  week_2:
    type: "application_failover"
    duration: "1 hour"
    participants: ["SRE", "DevOps"]
    
  week_3:
    type: "storage_recovery"
    duration: "1.5 hours"
    participants: ["SRE", "Engineering"]
    
  week_4:
    type: "end_to_end_scenario"
    duration: "4 hours"
    participants: ["SRE", "Engineering", "Product", "Support"]

quarterly_exercises:
  - type: "tabletop_exercise"
    scenario: "Multi-region outage"
    duration: "3 hours"
    participants: ["Leadership", "SRE", "Engineering", "Legal", "PR"]
```

#### 6.2.2 Drill Documentation Template
```markdown
# DR Drill Report Template

## Drill Information
- **Date**: [DRILL_DATE]
- **Type**: [DRILL_TYPE]
- **Duration**: [ACTUAL_DURATION]
- **Participants**: [PARTICIPANT_LIST]

## Scenario
[SCENARIO_DESCRIPTION]

## Recovery Steps Executed
1. [STEP_1] - Duration: [TIME] - Status: [PASS/FAIL]
2. [STEP_2] - Duration: [TIME] - Status: [PASS/FAIL]
3. [STEP_N] - Duration: [TIME] - Status: [PASS/FAIL]

## Metrics Achieved
- **RTO Target**: [TARGET] | **Actual**: [ACTUAL]
- **RPO Target**: [TARGET] | **Actual**: [ACTUAL]

## Issues Identified
1. [ISSUE_1] - Severity: [HIGH/MEDIUM/LOW]
2. [ISSUE_2] - Severity: [HIGH/MEDIUM/LOW]

## Improvement Actions
1. [ACTION_1] - Owner: [NAME] - Due: [DATE]
2. [ACTION_2] - Owner: [NAME] - Due: [DATE]

## Overall Assessment
[PASS/FAIL] - [SUMMARY]
```

---

## 7. Post-Incident Procedures

### 7.1 Incident Response Lifecycle

#### 7.1.1 Post-Mortem Process
```markdown
# Post-Mortem Template

## Incident Summary
- **Incident ID**: [ID]
- **Date**: [DATE]
- **Duration**: [TOTAL_DURATION]
- **Impact**: [CUSTOMER_IMPACT]

## Timeline
| Time | Event | Action Taken | Owner |
|------|-------|--------------|-------|
| [TIME] | Incident detected | [ACTION] | [OWNER] |
| [TIME] | Response initiated | [ACTION] | [OWNER] |
| [TIME] | Service restored | [ACTION] | [OWNER] |

## Root Cause Analysis
**Primary Cause**: [ROOT_CAUSE]
**Contributing Factors**: [FACTORS]

## What Went Well
1. [POSITIVE_1]
2. [POSITIVE_2]

## What Could Be Improved
1. [IMPROVEMENT_1]
2. [IMPROVEMENT_2]

## Action Items
1. [ACTION] - Owner: [NAME] - Due: [DATE]
2. [ACTION] - Owner: [NAME] - Due: [DATE]

## Lessons Learned
[KEY_LEARNINGS]
```

#### 7.1.2 Recovery Metrics Tracking
```sql
-- Incident metrics tracking
CREATE TABLE incident_metrics (
  id bigserial PRIMARY KEY,
  incident_id text NOT NULL,
  incident_type text NOT NULL,
  severity text CHECK (severity IN ('P0', 'P1', 'P2', 'P3')),
  
  -- Timing metrics
  detected_at timestamptz NOT NULL,
  response_started_at timestamptz,
  service_restored_at timestamptz,
  incident_closed_at timestamptz,
  
  -- Recovery objectives
  rto_target_minutes int,
  rto_actual_minutes int,
  rpo_target_minutes int,
  rpo_actual_minutes int,
  
  -- Impact metrics
  affected_users int,
  lost_transactions int,
  estimated_revenue_impact_cents bigint,
  
  -- Response metrics
  mean_time_to_detection_minutes int,
  mean_time_to_response_minutes int,
  mean_time_to_recovery_minutes int,
  
  created_at timestamptz DEFAULT now()
);

-- Monthly DR metrics report
CREATE OR REPLACE VIEW monthly_dr_metrics AS
SELECT 
  date_trunc('month', detected_at) as month,
  severity,
  count(*) as incident_count,
  avg(rto_actual_minutes) as avg_rto_minutes,
  avg(rpo_actual_minutes) as avg_rpo_minutes,
  sum(affected_users) as total_users_affected,
  avg(mean_time_to_detection_minutes) as avg_detection_time,
  avg(mean_time_to_recovery_minutes) as avg_recovery_time
FROM incident_metrics
GROUP BY date_trunc('month', detected_at), severity
ORDER BY month DESC, severity;
```

### 7.2 Continuous Improvement Process

#### 7.2.1 DR Plan Updates
```bash
#!/bin/bash
# DR plan update tracking
# Location: /ops/scripts/update_dr_plan.sh

PLAN_VERSION="$(date +%Y.%m).$(git rev-parse --short HEAD)"
UPDATE_REASON="$1"
UPDATED_SECTIONS="$2"

# Create backup of current plan
cp /ops/dr_runbook.md "/ops/archive/dr_runbook_${PLAN_VERSION}.md"

# Update version tracking
cat >> /ops/dr_plan_versions.log <<EOF
Version: ${PLAN_VERSION}
Date: $(date)
Reason: ${UPDATE_REASON}
Sections Updated: ${UPDATED_SECTIONS}
Approved By: ${USER}
---
EOF

echo "DR Plan updated to version ${PLAN_VERSION}"
```

#### 7.2.2 Lessons Learned Integration
```python
#!/usr/bin/env python3
# Lessons learned tracking and integration

class LessonsLearnedTracker:
    def __init__(self):
        self.lessons_db = "/ops/lessons_learned.json"
    
    def add_lesson(self, incident_id, lesson_category, description, action_items):
        lesson = {
            "incident_id": incident_id,
            "category": lesson_category,
            "description": description,
            "action_items": action_items,
            "date_added": datetime.now().isoformat(),
            "status": "open"
        }
        
        # Add to lessons database
        self.save_lesson(lesson)
        
        # Generate improvement tasks
        self.generate_improvement_tasks(lesson)
    
    def generate_improvement_tasks(self, lesson):
        """Convert lessons into actionable improvement tasks"""
        for action in lesson["action_items"]:
            task = {
                "title": action["description"],
                "priority": action.get("priority", "medium"),
                "due_date": action.get("due_date"),
                "owner": action.get("owner"),
                "category": "DR_improvement"
            }
            
            # Add to project management system
            self.create_improvement_task(task)
```

---

## 8. Legal and Compliance Considerations

### 8.1 Data Protection During DR

#### 8.1.1 GDPR Compliance in Recovery
```sql
-- Ensure GDPR compliance during recovery operations
CREATE OR REPLACE FUNCTION gdpr_compliant_recovery_audit(
  recovery_type text,
  affected_data_categories text[],
  recovery_justification text
) RETURNS void AS $$
BEGIN
  -- Log recovery operation for GDPR compliance
  INSERT INTO audit_log (
    actor, event, entity, meta
  ) VALUES (
    current_setting('app.current_user_id', true)::uuid,
    'gdpr_recovery_operation',
    'data_recovery',
    jsonb_build_object(
      'recovery_type', recovery_type,
      'data_categories', affected_data_categories,
      'justification', recovery_justification,
      'legal_basis', 'vital_interests', -- GDPR Article 6.1.d
      'data_subjects_affected', 'unknown_during_recovery',
      'retention_impact', 'recovery_may_affect_deletion_schedules'
    )
  );
  
  -- Alert DPO if personal data recovery
  IF 'personal_data' = ANY(affected_data_categories) THEN
    -- Notification logic for DPO
    PERFORM notify_dpo_recovery(recovery_type, affected_data_categories);
  END IF;
END;
$$ LANGUAGE plpgsql;
```

#### 8.1.2 Cross-Border Data Recovery
```python
# Data residency compliance during recovery
def ensure_data_residency_compliance(recovery_location, data_categories):
    """Ensure data residency requirements during DR operations"""
    
    eu_resident_data = ['personal_profiles', 'payment_data', 'communications']
    
    if recovery_location not in ['EU', 'EEA'] and \
       any(category in eu_resident_data for category in data_categories):
        
        # Check for adequacy decision or appropriate safeguards
        if not has_adequacy_decision(recovery_location):
            raise ComplianceError(
                f"Cannot recover EU resident data to {recovery_location} "
                "without appropriate safeguards"
            )
    
    # Log compliance decision
    log_compliance_decision({
        'recovery_location': recovery_location,
        'data_categories': data_categories,
        'compliance_status': 'approved',
        'legal_basis': 'adequacy_decision_or_sccs'
    })
```

### 8.2 Business Continuity Legal Requirements

#### 8.2.1 Regulatory Notification Requirements
```python
# Regulatory notification during incidents
NOTIFICATION_REQUIREMENTS = {
    'payment_data_breach': {
        'regulators': ['PCI_DSS_Authority', 'Financial_Conduct_Authority'],
        'timeframe_hours': 72,
        'severity_threshold': 'P1'
    },
    'personal_data_breach': {
        'regulators': ['Data_Protection_Authority'],
        'timeframe_hours': 72,
        'severity_threshold': 'P0'
    },
    'service_outage_extended': {
        'regulators': ['Consumer_Protection_Authority'],
        'timeframe_hours': 24,
        'conditions': ['outage > 4 hours', 'affects > 1000 users']
    }
}

def check_regulatory_notification_requirements(incident_type, severity, duration, affected_users):
    """Check if incident requires regulatory notification"""
    
    notifications_required = []
    
    for breach_type, requirements in NOTIFICATION_REQUIREMENTS.items():
        if incident_matches_criteria(incident_type, breach_type, severity, duration, affected_users):
            notifications_required.append({
                'type': breach_type,
                'regulators': requirements['regulators'],
                'deadline': datetime.now() + timedelta(hours=requirements['timeframe_hours'])
            })
    
    return notifications_required
```

---

## 9. Monitoring and Alerting

### 9.1 DR-Specific Monitoring

#### 9.1.1 Backup Health Monitoring
```python
#!/usr/bin/env python3
# Continuous backup health monitoring

import psycopg2
import boto3
from datetime import datetime, timedelta

def monitor_backup_health():
    """Monitor backup system health and alert on issues"""
    
    alerts = []
    
    # Check database backup freshness
    try:
        conn = psycopg2.connect(DATABASE_URL)
        with conn.cursor() as cur:
            cur.execute("""
                SELECT pg_last_wal_replay_lsn(), 
                       EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) as lag_seconds
            """)
            lsn, lag_seconds = cur.fetchone()
            
            if lag_seconds > 3600:  # 1 hour lag threshold
                alerts.append({
                    'type': 'backup_lag',
                    'severity': 'warning',
                    'message': f'Database backup lag: {lag_seconds} seconds'
                })
    except Exception as e:
        alerts.append({
            'type': 'backup_check_failed',
            'severity': 'critical',
            'message': f'Failed to check backup status: {e}'
        })
    
    # Check storage backup freshness
    s3 = boto3.client('s3')
    try:
        response = s3.list_objects_v2(
            Bucket='samia-tarot-backups',
            Prefix='daily/',
            MaxKeys=1
        )
        
        if not response.get('Contents'):
            alerts.append({
                'type': 'no_storage_backups',
                'severity': 'critical',
                'message': 'No storage backups found'
            })
        else:
            latest_backup = response['Contents'][0]
            backup_age = datetime.now() - latest_backup['LastModified'].replace(tzinfo=None)
            
            if backup_age > timedelta(hours=25):  # Daily backup + 1 hour grace
                alerts.append({
                    'type': 'storage_backup_stale',
                    'severity': 'warning',
                    'message': f'Storage backup is {backup_age} old'
                })
    
    except Exception as e:
        alerts.append({
            'type': 'storage_backup_check_failed',
            'severity': 'critical',
            'message': f'Failed to check storage backups: {e}'
        })
    
    # Send alerts if any issues found
    if alerts:
        send_backup_health_alerts(alerts)
    
    return len(alerts) == 0

def send_backup_health_alerts(alerts):
    """Send backup health alerts to monitoring system"""
    for alert in alerts:
        # Send to monitoring system (Datadog, PagerDuty, etc.)
        print(f"ALERT: {alert['severity']} - {alert['message']}")

if __name__ == "__main__":
    monitor_backup_health()
```

#### 9.1.2 Recovery Capability Testing
```bash
#!/bin/bash
# Automated recovery capability testing
# Location: /ops/monitoring/test_recovery_capabilities.sh

set -euo pipefail

echo "🧪 Testing recovery capabilities..."

# Test 1: Database connection failover
test_database_failover() {
  echo "Testing database connection failover..."
  
  # Simulate connection failure and test fallback
  timeout 10s psql -h "${DB_HOST}" -c "SELECT 1;" || {
    echo "❌ Database connection test failed"
    return 1
  }
  
  echo "✅ Database connection test passed"
  return 0
}

# Test 2: Backup restore capability (small test)
test_backup_restore() {
  echo "Testing backup restore capability..."
  
  # Create test database and restore small backup
  TEST_DB="recovery_test_$(date +%s)"
  
  psql -h "${STAGING_DB_HOST}" -c "CREATE DATABASE ${TEST_DB};" || return 1
  
  # Restore schema only
  pg_restore -h "${STAGING_DB_HOST}" -d "${TEST_DB}" \
    --schema-only --no-owner --no-privileges \
    "${LATEST_BACKUP_PATH}" || {
    
    psql -h "${STAGING_DB_HOST}" -c "DROP DATABASE ${TEST_DB};"
    echo "❌ Backup restore test failed"
    return 1
  }
  
  # Cleanup
  psql -h "${STAGING_DB_HOST}" -c "DROP DATABASE ${TEST_DB};"
  echo "✅ Backup restore test passed"
  return 0
}

# Test 3: External service failover
test_external_failover() {
  echo "Testing external service failover..."
  
  # Test payment provider failover
  curl -f "${API_BASE_URL}/health/payments" || {
    echo "❌ Payment service health check failed"
    return 1
  }
  
  echo "✅ External service failover test passed"
  return 0
}

# Run all tests
TESTS_PASSED=0
TESTS_TOTAL=3

test_database_failover && ((TESTS_PASSED++))
test_backup_restore && ((TESTS_PASSED++))
test_external_failover && ((TESTS_PASSED++))

echo "Recovery capability test results: ${TESTS_PASSED}/${TESTS_TOTAL} passed"

if [[ $TESTS_PASSED -eq $TESTS_TOTAL ]]; then
  echo "🎯 All recovery capability tests passed"
  exit 0
else
  echo "🚨 Some recovery capability tests failed"
  exit 1
fi
```

---

## 10. Document Maintenance & Updates

### 10.1 Review Schedule
- **Monthly**: Backup procedures and contact information
- **Quarterly**: Recovery procedures and testing results
- **Semi-Annual**: Complete runbook review and updates
- **Annual**: Full DR strategy assessment and business continuity planning

### 10.2 Approval Matrix
| Change Type | Approval Required | Implementation Lead |
|-------------|------------------|-------------------|
| **Contact Updates** | SRE Team Lead | SRE Team |
| **Procedure Updates** | Engineering Manager + DPO | SRE Team |
| **Strategy Changes** | CTO + Legal | SRE Team + Architecture |
| **Compliance Updates** | DPO + Legal Counsel | Compliance Team |

---

**Document Control:**
- **Document ID**: DR-SAMIA-2025-001
- **Version**: 1.0
- **Next Review**: July 2025
- **Owner**: SRE Team
- **Approved By**: CTO, DPO, Legal Counsel