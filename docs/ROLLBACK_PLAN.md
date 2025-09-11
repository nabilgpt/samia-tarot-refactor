# Production Rollback Plan
**Samia Tarot Platform - Emergency Rollback Procedures**

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Owner**: Release Management Team  
**Emergency Contact**: [Release Manager Phone]

---

## Rollback Decision Matrix

### Immediate Rollback Triggers (0-15 minutes)
| Condition | Threshold | Action | Decision Maker |
|-----------|-----------|---------|----------------|
| **Complete Service Down** | >30 minutes | Execute immediate rollback | Release Manager |
| **Critical Security Breach** | Data exposure confirmed | Execute immediate rollback | Security Lead + Release Manager |
| **Data Corruption** | Data integrity compromised | Execute immediate rollback | DBA + Release Manager |
| **Payment Processing Failure** | >10% failure rate for >10 minutes | Execute immediate rollback | Product Owner + Release Manager |

### Considered Rollback Triggers (15-30 minutes)
| Condition | Threshold | Action | Decision Maker |
|-----------|-----------|---------|----------------|
| **High Error Rate** | >5% for >15 minutes | Assess for rollback | Technical Lead + Release Manager |
| **Performance Degradation** | P95 >2000ms for >15 minutes | Assess for rollback | SRE Lead + Release Manager |
| **High Support Volume** | >20 critical tickets in 1 hour | Assess for rollback | Support Lead + Product Owner |
| **User Registration Failure** | >20% failure rate for >20 minutes | Assess for rollback | Product Owner + Technical Lead |

---

## Rollback Procedures

### Phase 1: Immediate Response (0-10 minutes)

#### 1.1 Emergency Assessment
**Time Limit**: 5 minutes maximum

```bash
# Quick system health check
curl -f https://samia-tarot.com/health || echo "APPLICATION DOWN"
curl -f https://samia-tarot.com/api/health/database || echo "DATABASE ISSUES"
curl -f https://samia-tarot.com/api/health/providers || echo "PROVIDER ISSUES"

# Check error rates
tail -n 100 /var/log/samia-app/error.log | grep ERROR | wc -l

# Check response times (if monitoring available)
# Review monitoring dashboard for golden signals
```

**Assessment Checklist**:
- [ ] Confirm issue is widespread (not isolated to specific users/features)
- [ ] Verify issue started after deployment
- [ ] Check if issue can be resolved with quick fix (<10 minutes)
- [ ] Assess business impact and user experience

#### 1.2 Rollback Decision
**Decision Makers**: Release Manager + Technical Lead (minimum)  
**Communication**: Immediately notify all stakeholders

```bash
# Emergency team notification
curl -X POST $SLACK_EMERGENCY_WEBHOOK \
  -H 'Content-type: application/json' \
  --data '{
    "text": "🚨 PRODUCTION ROLLBACK INITIATED",
    "blocks": [
      {
        "type": "section", 
        "text": {
          "type": "mrkdwn",
          "text": "*EMERGENCY ROLLBACK IN PROGRESS*\nIssue: [ISSUE_DESCRIPTION]\nDecision: [ROLLBACK_REASON]"
        }
      }
    ]
  }'
```

### Phase 2: Application Rollback (10-20 minutes)

#### 2.1 Stop Current Application
```bash
# Stop current application servers
sudo systemctl stop samia-tarot-app

# Verify application stopped
curl https://samia-tarot.com/health && echo "WARNING: App still responding"

# Clear any cached content
sudo systemctl restart nginx
```

#### 2.2 Deploy Previous Version
```bash
# Navigate to deployment directory
cd /opt/samia-tarot

# Identify previous stable version
PREVIOUS_VERSION=$(git log --oneline -n 10 | grep "STABLE" | head -1 | cut -d' ' -f1)
echo "Rolling back to: $PREVIOUS_VERSION"

# Rollback application code
git checkout $PREVIOUS_VERSION

# Restore previous configuration if needed
if [ -f "config/production.env.backup" ]; then
    cp config/production.env.backup config/production.env
fi

# Rebuild application (if necessary)
npm install --production
npm run build

# Start application with previous version
sudo systemctl start samia-tarot-app

# Verify rollback successful
sleep 30
curl -f https://samia-tarot.com/health || echo "ROLLBACK FAILED - ESCALATE"
```

#### 2.3 Immediate Verification
```bash
# Test critical paths
curl -f https://samia-tarot.com/api/auth/health
curl -f https://samia-tarot.com/api/orders/health  
curl -f https://samia-tarot.com/api/payments/health

# Check error logs for new issues
tail -f /var/log/samia-app/error.log | head -20
```

### Phase 3: Database Rollback (20-60 minutes)

⚠️ **CRITICAL WARNING**: Database rollback is high-risk and may result in data loss

#### 3.1 Database Rollback Decision
**Required Approvals**: DBA + Technical Lead + Product Owner  
**Data Loss Assessment**: Estimate data loss impact (orders, users, transactions)

#### 3.2 Database Migration Rollback
```bash
# Create emergency database backup BEFORE rollback
BACKUP_FILE="/backups/emergency_rollback_$(date +%Y%m%d_%H%M%S).sql"
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME --format=custom > $BACKUP_FILE

# Identify last stable migration
LAST_STABLE_MIGRATION="025_m28_secrets_providers_schema"  # Example

# Execute rollback migrations
cd /opt/samia-tarot
python migrate.py rollback --target=$LAST_STABLE_MIGRATION

# Verify database integrity
python migrate.py audit

# Check critical data consistency
psql -h $DB_HOST -U $DB_USER -d $DB_NAME <<EOF
SELECT 'profiles' as table_name, count(*) as record_count FROM profiles
UNION ALL
SELECT 'orders', count(*) FROM orders
UNION ALL  
SELECT 'payment_transactions', count(*) FROM payment_transactions;
EOF
```

#### 3.3 Data Loss Assessment & Communication
```bash
# Calculate data loss impact
psql -h $DB_HOST -U $DB_USER -d $DB_NAME <<EOF
-- Orders lost in rollback window
SELECT COUNT(*) as lost_orders 
FROM orders 
WHERE created_at > '$(date -d "1 hour ago" --iso-8601)';

-- Users registered during deployment
SELECT COUNT(*) as lost_registrations
FROM profiles 
WHERE created_at > '$(date -d "1 hour ago" --iso-8601)';

-- Transactions potentially affected
SELECT COUNT(*) as affected_transactions,
       SUM(amount_cents) as affected_amount_cents
FROM payment_transactions 
WHERE created_at > '$(date -d "1 hour ago" --iso-8601)';
EOF
```

### Phase 4: External Service Rollback (30-45 minutes)

#### 4.1 Webhook Endpoint Rollback
```bash
# Update webhook endpoints with payment providers
# Stripe webhook rollback
curl -X POST https://api.stripe.com/v1/webhook_endpoints/$STRIPE_WEBHOOK_ID \
  -u $STRIPE_SECRET_KEY: \
  -d url="https://samia-tarot.com/webhooks/stripe/v1" \  # Previous version
  -d "enabled_events[]"="payment_intent.succeeded"

# Square webhook rollback  
curl -X PUT https://connect.squareup.com/v2/webhooks/$SQUARE_WEBHOOK_ID \
  -H "Authorization: Bearer $SQUARE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "notification_url": "https://samia-tarot.com/webhooks/square/v1",
      "event_types": ["payment.created", "payment.updated"]
    }
  }'
```

#### 4.2 DNS/CDN Rollback (if needed)
```bash
# Rollback CDN configuration
# This depends on your CDN provider (CloudFlare, AWS CloudFront, etc.)

# Example: CloudFlare API rollback
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/always_online" \
  -H "Authorization: Bearer $CLOUDFLARE_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"value":"on"}'  # Enable always online during issues
```

---

## Post-Rollback Procedures

### Phase 5: Stabilization & Monitoring (60-120 minutes)

#### 5.1 System Health Validation
```bash
# Comprehensive health checks
HEALTH_CHECK_RESULTS="/tmp/rollback_health_$(date +%Y%m%d_%H%M%S).log"

{
  echo "=== ROLLBACK HEALTH CHECK REPORT ==="
  echo "Timestamp: $(date)"
  echo "Rollback Reason: [TO_BE_FILLED]"
  echo ""
  
  echo "=== APPLICATION HEALTH ==="
  curl -f https://samia-tarot.com/health && echo "✅ Application: HEALTHY" || echo "❌ Application: FAILED"
  curl -f https://samia-tarot.com/api/health && echo "✅ API: HEALTHY" || echo "❌ API: FAILED"
  
  echo ""
  echo "=== DATABASE HEALTH ==="
  curl -f https://samia-tarot.com/api/health/database && echo "✅ Database: HEALTHY" || echo "❌ Database: FAILED"
  
  echo ""
  echo "=== EXTERNAL PROVIDERS ==="
  curl -f https://samia-tarot.com/api/health/providers && echo "✅ Providers: HEALTHY" || echo "❌ Providers: FAILED"
  
  echo ""
  echo "=== CRITICAL USER FLOWS ==="
  # Test user registration
  REGISTER_TEST=$(curl -X POST https://samia-tarot.com/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"rollback_test@example.com","password":"Test123!","first_name":"Test","last_name":"User"}' \
    -w "%{http_code}" -o /dev/null -s)
  
  if [ "$REGISTER_TEST" = "200" ] || [ "$REGISTER_TEST" = "201" ]; then
    echo "✅ Registration: WORKING"
  else
    echo "❌ Registration: FAILED ($REGISTER_TEST)"
  fi
  
} > $HEALTH_CHECK_RESULTS

cat $HEALTH_CHECK_RESULTS
```

#### 5.2 Performance Baseline Re-establishment
```bash
# Monitor key metrics for 30 minutes post-rollback
for i in {1..30}; do
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  RESPONSE_TIME=$(curl -w "%{time_total}" -s -o /dev/null https://samia-tarot.com/)
  ERROR_COUNT=$(tail -n 50 /var/log/samia-app/error.log | grep ERROR | wc -l)
  
  echo "$TIMESTAMP,Response_Time:${RESPONSE_TIME}s,Recent_Errors:$ERROR_COUNT"
  
  # Alert if metrics are still poor
  if (( $(echo "$RESPONSE_TIME > 2.0" | bc -l) )); then
    echo "WARNING: Response time still high: ${RESPONSE_TIME}s"
  fi
  
  if [ $ERROR_COUNT -gt 10 ]; then
    echo "WARNING: High error count: $ERROR_COUNT"
  fi
  
  sleep 60  # Check every minute
done
```

### Phase 6: Communication & Documentation (Ongoing)

#### 6.1 Stakeholder Communication Templates

**Internal Team Notification**:
```
Subject: PRODUCTION ROLLBACK COMPLETED - Action Required

Team,

We have completed an emergency rollback of the Samia Tarot production deployment.

ROLLBACK DETAILS:
- Time: [ROLLBACK_TIME]
- Reason: [ROLLBACK_REASON] 
- Duration: [TOTAL_DURATION]
- Data Loss: [DATA_LOSS_ASSESSMENT]

CURRENT STATUS:
- Application: [HEALTHY/DEGRADED/DOWN]
- Database: [HEALTHY/DEGRADED/DOWN] 
- External Providers: [HEALTHY/DEGRADED/DOWN]

NEXT STEPS:
1. Root cause analysis meeting at [TIME]
2. Fix development and testing plan
3. Updated deployment plan with additional safeguards

Team leads please confirm your systems are operational.

[Release Manager Name]
```

**Customer Communication** (if customer-facing impact):
```
Subject: Service Update - Resolved

Dear Samia Tarot Users,

We experienced a brief service issue today that has now been resolved. 

Impact: Some users may have experienced [DESCRIBE_IMPACT] between [START_TIME] and [END_TIME].

Resolution: Our team quickly identified and resolved the issue. All services are now operating normally.

If you continue to experience any issues, please contact our support team at support@samia-tarot.com.

We apologize for any inconvenience.

The Samia Tarot Team
```

#### 6.2 Post-Rollback Documentation
```bash
# Create post-rollback report
ROLLBACK_REPORT="/tmp/rollback_report_$(date +%Y%m%d_%H%M%S).md"

cat > $ROLLBACK_REPORT << 'EOF'
# Production Rollback Report

## Summary
- **Date**: $(date)
- **Rollback Duration**: [DURATION]
- **Triggered By**: [TRIGGER_REASON]
- **Decision Makers**: [DECISION_MAKERS]

## Timeline
- [TIME] - Issue first detected
- [TIME] - Rollback decision made
- [TIME] - Application rollback completed
- [TIME] - Database rollback completed (if applicable)
- [TIME] - Services fully restored

## Impact Assessment
- **Users Affected**: [NUMBER/PERCENTAGE]
- **Data Loss**: [DESCRIPTION]
- **Financial Impact**: [AMOUNT]
- **Reputation Impact**: [ASSESSMENT]

## Root Cause Analysis
[TO BE COMPLETED WITHIN 24 HOURS]

## Prevention Measures
[TO BE COMPLETED WITHIN 48 HOURS]

## Lessons Learned
[TO BE COMPLETED WITHIN 72 HOURS]
EOF

echo "Rollback report template created: $ROLLBACK_REPORT"
```

---

## Rollback Testing & Validation

### Monthly Rollback Drills
```bash
#!/bin/bash
# Monthly rollback drill script
# Location: /ops/drills/rollback_drill.sh

DRILL_DATE=$(date +%Y%m%d_%H%M%S)
STAGING_ENV="https://staging.samia-tarot.com"

echo "🔄 Starting rollback drill: $DRILL_DATE"

# Test rollback procedures in staging
echo "1. Testing application rollback..."
# [Rollback simulation steps]

echo "2. Testing database rollback..."
# [Database rollback simulation]

echo "3. Testing health check procedures..."
# [Health validation simulation]

echo "4. Testing communication procedures..."
# [Communication template testing]

echo "✅ Rollback drill completed: $DRILL_DATE"
```

### Rollback Success Criteria
- [ ] **RTO Achievement**: Complete rollback in <60 minutes
- [ ] **System Stability**: No additional errors introduced
- [ ] **Data Integrity**: No corruption during rollback
- [ ] **Communication**: All stakeholders notified within 15 minutes
- [ ] **Documentation**: Complete timeline and impact assessment

---

## Emergency Contacts & Escalation

### Primary Response Team
| Role | Primary Contact | Phone | Backup Contact | Phone |
|------|-----------------|--------|----------------|--------|
| **Release Manager** | _____________ | _________ | _____________ | _________ |
| **Technical Lead** | _____________ | _________ | _____________ | _________ |
| **DBA** | _____________ | _________ | _____________ | _________ |
| **SRE On-Call** | _____________ | _________ | _____________ | _________ |

### Executive Escalation
| Role | Contact | Phone | Escalation Criteria |
|------|---------|--------|-------------------|
| **CTO** | _____________ | _________ | Data loss >$10k impact OR >4 hour outage |
| **CEO** | _____________ | _________ | Regulatory breach OR >$50k impact |
| **Legal** | _____________ | _________ | Data breach OR compliance violation |

### Communication Channels
- **Emergency Slack**: #emergency-response
- **Conference Bridge**: [PHONE_NUMBER] / [CONFERENCE_ID]  
- **Status Page**: https://status.samia-tarot.com
- **Team Email**: emergency@samia-tarot.com

---

## Rollback Prevention & Improvement

### Pre-Deployment Safeguards
- [ ] **Blue-Green Deployment**: Implement zero-downtime deployments
- [ ] **Feature Flags**: Enable instant feature disable without rollback
- [ ] **Canary Releases**: Gradual rollout with automatic rollback triggers
- [ ] **Database Migrations**: Backward-compatible changes only
- [ ] **Monitoring**: Real-time alerts for rollback triggers

### Continuous Improvement
- **Monthly**: Review rollback triggers and thresholds
- **Quarterly**: Update rollback procedures based on incidents
- **Annually**: Complete rollback drill with external stakeholders

---

**Document Control**:
- **Document ID**: RP-SAMIA-2025-001
- **Version**: 1.0
- **Emergency Hotline**: [EMERGENCY_PHONE]
- **Last Tested**: [DATE]