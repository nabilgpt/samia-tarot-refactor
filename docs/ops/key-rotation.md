# Key Rotation & Security Maintenance (M35)

## Rotation Schedule

| Key Type | Frequency | Overlap Window | Auto/Manual |
|----------|-----------|----------------|-------------|
| **Supabase JWT** | 90 days | 7 days | Manual |
| **Stripe API Keys** | 180 days | 14 days | Manual |
| **Twilio Credentials** | 180 days | 7 days | Manual |
| **WhatsApp Tokens** | 365 days | 30 days | Manual |
| **Database Passwords** | 90 days | 24 hours | Manual |
| **GitHub Tokens** | 90 days | 7 days | Manual |

## Rotation Procedures

### 1. Supabase JWT Secret Rotation

**Preparation:**
```bash
# 1. Generate new secret in Supabase dashboard
# 2. Update GitHub Secrets
gh secret set SUPABASE_JWT_SECRET --body "new_secret_here"

# 3. Update production environment
# (Done via GitHub Actions deployment)
```

**Validation:**
```bash
# Test new key
curl -H "Authorization: Bearer $NEW_JWT_TOKEN" \
  "https://samiatarot.com/api/auth/sync"

# Monitor error rates
curl "https://samiatarot.com/api/metrics" | grep "auth_errors"
```

**Rollback (if needed):**
```bash
# Restore previous secret
gh secret set SUPABASE_JWT_SECRET --body "previous_secret"
```

### 2. Stripe Key Rotation

**Preparation:**
```bash
# 1. Create new restricted key in Stripe dashboard
# Permissions: read/write payments, customers, payment_intents

# 2. Update GitHub Secrets
gh secret set STRIPE_SECRET_KEY --body "sk_live_new_key"
gh secret set STRIPE_PUBLISHABLE_KEY --body "pk_live_new_key"
```

**Testing:**
```bash
# Test payment creation
curl -X POST "https://samiatarot.com/api/whatsapp/payment-link" \
  -H "X-User-ID: admin-user" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "currency": "USD",
    "description": "Test Payment",
    "customer_name": "Test User",
    "customer_phone": "+15551234567"
  }'
```

**Monitoring:**
```bash
# Watch for payment failures
tail -f logs/payment_errors.log
grep "stripe.*error" logs/application.log | tail -20
```

### 3. Twilio Credentials Rotation

**Preparation:**
```bash
# 1. Generate new Auth Token in Twilio console
# 2. Update GitHub Secrets
gh secret set TWILIO_AUTH_TOKEN --body "new_auth_token"

# Note: Account SID remains the same
```

**Testing:**
```bash
# Test SMS sending
curl -X POST "https://samiatarot.com/api/whatsapp/send" \
  -H "X-User-ID: admin-user" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+15551234567",
    "message": "Test message",
    "template_name": "PAYMENT_REMINDER",
    "template_params": ["Test", "$1.00", "TEST123", "https://example.com"]
  }'
```

### 4. WhatsApp Access Token Rotation

**Preparation:**
```bash
# 1. Generate new permanent token in Meta Business
# 2. Update GitHub Secrets
gh secret set WHATSAPP_ACCESS_TOKEN --body "new_permanent_token"
```

**Testing:**
```bash
# Test webhook verification
curl "https://samiatarot.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=test&hub.challenge=123"

# Test message sending capability
curl -X POST "https://samiatarot.com/api/whatsapp/send" \
  -H "X-User-ID: admin-user" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+15551234567",
    "message": "Key rotation test successful"
  }'
```

## Emergency Key Rotation

### Compromised Key Response

**Immediate Actions (0-15 minutes):**
1. **Disable** compromised key in provider dashboard
2. **Generate** new key with different permissions if possible
3. **Update** GitHub Secrets with new key
4. **Deploy** emergency update
5. **Monitor** for continued malicious activity

**Example Emergency Script:**
```bash
#!/bin/bash
# Emergency key rotation script

KEY_TYPE=$1
NEW_KEY_VALUE=$2

case $KEY_TYPE in
  "stripe")
    gh secret set STRIPE_SECRET_KEY --body "$NEW_KEY_VALUE"
    ;;
  "twilio")
    gh secret set TWILIO_AUTH_TOKEN --body "$NEW_KEY_VALUE"
    ;;
  "supabase")
    gh secret set SUPABASE_JWT_SECRET --body "$NEW_KEY_VALUE"
    ;;
  *)
    echo "Unknown key type: $KEY_TYPE"
    exit 1
    ;;
esac

# Trigger emergency deployment
gh workflow run deploy.yml --ref main
echo "Emergency rotation initiated for $KEY_TYPE"
```

### Breach Containment

**If Key Compromise Suspected:**
```sql
-- Audit recent API usage
SELECT actor, event, created_at, meta
FROM audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
AND (
  event LIKE '%payment%' OR
  event LIKE '%auth%' OR
  event LIKE '%admin%'
)
ORDER BY created_at DESC;

-- Check for unusual patterns
SELECT actor, COUNT(*) as event_count
FROM audit_log
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY actor
HAVING COUNT(*) > 100
ORDER BY event_count DESC;
```

## Automation & Monitoring

### Rotation Reminders

**GitHub Actions Workflow:**
```yaml
# .github/workflows/key-rotation-reminder.yml
name: Key Rotation Reminder

on:
  schedule:
    - cron: '0 9 * * MON'  # Weekly Monday 9 AM

jobs:
  check_key_ages:
    runs-on: ubuntu-latest
    steps:
      - name: Check Key Rotation Status
        run: |
          # Check secret ages and create issues for expiring keys
          echo "Checking key rotation schedule..."
          # Implementation would check last rotation dates
```

### Validation Monitoring

**Automated Health Checks:**
```bash
#!/bin/bash
# Monitor key health post-rotation

# Test critical API endpoints
ENDPOINTS=(
  "/api/auth/sync"
  "/api/payments/test"
  "/api/whatsapp/metrics"
  "/api/siren/metrics"
)

for endpoint in "${ENDPOINTS[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://samiatarot.com$endpoint")
  if [ "$STATUS" -ne 200 ]; then
    echo "ALERT: $endpoint returned $STATUS"
    # Trigger siren alert
    curl -X POST "https://samiatarot.com/api/siren/trigger" \
      -H "X-User-ID: system" \
      -H "Content-Type: application/json" \
      -d "{
        \"incident_type\": \"key_rotation_failure\",
        \"severity\": 1,
        \"source\": \"automated_check\",
        \"policy_name\": \"Critical\",
        \"context\": {\"endpoint\": \"$endpoint\", \"status\": \"$STATUS\"},
        \"variables\": {}
      }"
  else
    echo "OK: $endpoint"
  fi
done
```

## Rollback Procedures

### Safe Rollback Process

**Pre-rollback Validation:**
```bash
# 1. Verify previous key is still valid
# 2. Check overlap window hasn't expired
# 3. Confirm new key is causing issues
```

**Rollback Steps:**
```bash
# 1. Restore previous key value
gh secret set KEY_NAME --body "$PREVIOUS_KEY_VALUE"

# 2. Deploy rollback
gh workflow run deploy.yml --ref main

# 3. Monitor recovery
watch 'curl -s https://samiatarot.com/api/health | jq .'

# 4. Document incident
echo "Rollback completed at $(date)" >> key_rotation_log.txt
```

## Audit & Compliance

### Rotation Documentation

**Required Records:**
- Rotation timestamp
- Personnel involved
- Reason for rotation (scheduled/emergency)
- Validation results
- Any issues encountered

**Audit Trail:**
```sql
-- Log key rotation events
INSERT INTO audit_log (actor, event, entity, entity_id, meta)
VALUES (
  'admin-user',
  'key_rotation_completed',
  'security',
  'stripe_secret_key',
  jsonb_build_object(
    'rotation_type', 'scheduled',
    'previous_key_last_4', 'sk_live_****1234',
    'new_key_last_4', 'sk_live_****5678',
    'rotation_timestamp', NOW()
  )
);
```

### Compliance Checks

**Monthly Rotation Audit:**
```sql
-- Check rotation compliance
SELECT
  meta->>'key_type' as key_type,
  COUNT(*) as rotations_count,
  MAX(created_at) as last_rotation,
  CASE
    WHEN MAX(created_at) > NOW() - INTERVAL '90 days' THEN '✅ COMPLIANT'
    WHEN MAX(created_at) > NOW() - INTERVAL '120 days' THEN '⚠️ OVERDUE'
    ELSE '❌ CRITICAL'
  END as compliance_status
FROM audit_log
WHERE event = 'key_rotation_completed'
AND created_at > NOW() - INTERVAL '1 year'
GROUP BY meta->>'key_type'
ORDER BY last_rotation DESC;
```

## Security Best Practices

### Key Generation
- **Entropy**: Use cryptographically secure random generators
- **Length**: Follow provider recommendations
- **Scope**: Minimum required permissions only
- **Environment**: Separate keys for staging/production

### Storage Security
- **GitHub Secrets**: Encrypted at rest
- **Access Control**: Repository admin only
- **Audit Trail**: All access logged
- **Backup**: Secure offline backup of recovery keys

### Validation Protocol
- **Functional Testing**: Test all affected workflows
- **Performance Monitoring**: Watch for latency increases
- **Error Monitoring**: Monitor error rates and types
- **User Impact**: Verify no customer-facing issues

### Documentation Standards
- **Change Records**: Document all rotations
- **Process Updates**: Keep runbooks current
- **Contact Info**: Maintain emergency contacts
- **Recovery Procedures**: Test rollback procedures regularly