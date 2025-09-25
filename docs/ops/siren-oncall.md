# Siren On-Call & Emergency Response (M40)

## Quick Actions

| Situation | Action | API Endpoint |
|-----------|--------|--------------|
| **Acknowledge Alert** | `POST /api/siren/acknowledge/{id}` | Cancels pending notifications |
| **Resolve Incident** | `POST /api/siren/resolve/{id}` | Closes incident, stops all alerts |
| **Test Policy** | `POST /api/siren/test` | Validates escalation flow |
| **Trigger Manual** | `POST /api/siren/trigger` | Creates incident (use `force: true` to bypass cooldown) |

## Escalation Flow

### L1 → L2 → L3 Timing
```
L1: Immediate (0s)    → Email + SMS
L2: +5 minutes (300s) → WhatsApp
L3: +10 minutes (600s) → Voice Call
```

### Deduplication & Cooldown
- **Deduplication Window**: 5 minutes (same incident type + context)
- **Policy Cooldown**: 1 hour (prevents policy spam)
- **Override**: Use `force: true` in trigger payload

## Common Incidents

### Payment Failures
```bash
# Trigger payment failure alert
curl -X POST "https://samiatarot.com/api/siren/trigger" \
  -H "X-User-ID: monitor-user" \
  -H "Content-Type: application/json" \
  -d '{
    "incident_type": "payment_failure",
    "severity": 1,
    "source": "stripe_gateway",
    "policy_name": "Critical",
    "context": {"order_id": "123", "error": "card_declined"},
    "variables": {"customer_id": "cust_123", "amount": "$50.00"}
  }'
```

### SLO Breaches
```bash
# Trigger SLO breach alert
curl -X POST "https://samiatarot.com/api/siren/trigger" \
  -H "X-User-ID: monitor-user" \
  -H "Content-Type: application/json" \
  -d '{
    "incident_type": "slo_breach",
    "severity": 2,
    "source": "performance_monitor",
    "policy_name": "Critical",
    "context": {"metric": "p95_latency", "threshold": "2.5s", "actual": "4.2s"},
    "variables": {"service": "api", "region": "us-east-1"}
  }'
```

## Response Procedures

### 1. Acknowledge (Required within 15 minutes)
```bash
# Acknowledge incident
curl -X POST "https://samiatarot.com/api/siren/acknowledge/{incident_id}" \
  -H "X-User-ID: admin-user"
```

### 2. Investigate
- Check incident context and variables
- Review related metrics and logs
- Determine root cause

### 3. Communicate
- Update incident with findings
- Notify stakeholders if customer-facing
- Document resolution steps

### 4. Resolve
```bash
# Resolve incident
curl -X POST "https://samiatarot.com/api/siren/resolve/{incident_id}" \
  -H "X-User-ID: admin-user"
```

## Monitoring

### Check Active Incidents
```bash
# List open incidents
curl "https://samiatarot.com/api/siren/incidents?status=open" \
  -H "X-User-ID: monitor-user"

# Get incident details
curl "https://samiatarot.com/api/siren/incidents/{id}/events" \
  -H "X-User-ID: monitor-user"
```

### System Health
```bash
# Get siren metrics
curl "https://samiatarot.com/api/siren/metrics" \
  -H "X-User-ID: monitor-user"
```

## Emergency Procedures

### Silence All Alerts (Emergency Only)
```sql
-- Emergency: Cancel all pending events
UPDATE siren_events
SET status = 'cancelled'
WHERE status = 'pending';
```

### Policy Management
```sql
-- Disable policy temporarily
UPDATE siren_policies
SET enabled = false
WHERE name = 'Critical';

-- Re-enable policy
UPDATE siren_policies
SET enabled = true
WHERE name = 'Critical';
```

## Troubleshooting

### Common Issues

**No Notifications Received**
1. Check if policy is enabled
2. Verify escalation steps configuration
3. Check notification processor status
4. Review template approval status

**Duplicate Alerts**
1. Verify deduplication window settings
2. Check root_hash generation
3. Review incident context consistency

**Failed Notifications**
1. Check notification processor logs
2. Verify Twilio credentials
3. Review template parameters
4. Check phone number E.164 format

### Debug Commands
```bash
# Test escalation policy
curl -X POST "https://samiatarot.com/api/siren/test" \
  -H "X-User-ID: admin-user" \
  -H "Content-Type: application/json" \
  -d '{"policy_name": "Critical"}'

# Process pending notifications manually
curl -X POST "https://samiatarot.com/api/siren/process" \
  -H "X-User-ID: admin-user"
```

## Escalation Contacts

| Level | Method | Contact | Response Time |
|-------|--------|---------|---------------|
| L1 | Email + SMS | admin@samiatarot.com, +1234567890 | 15 minutes |
| L2 | WhatsApp | +1234567890 | 30 minutes |
| L3 | Voice Call | +1234567890 | 45 minutes |

## Metrics & SLAs

- **Acknowledgment SLA**: 15 minutes
- **Resolution SLA**: 4 hours (Critical), 24 hours (High)
- **Availability Target**: 99.9% uptime
- **Notification Delivery**: 95% within 30 seconds

## Audit Trail

All siren activities are logged in `audit_log` table:
- Incident creation, acknowledgment, resolution
- Policy changes and template updates
- Notification delivery status
- Emergency overrides and manual interventions