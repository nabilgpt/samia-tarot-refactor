# WhatsApp Operations & 24h Policy (M41)

## 24-Hour Window Policy

### Business Messaging Window

**WhatsApp Business Rules:**
- **Within 24h**: Free-form messages allowed after customer contact
- **Outside 24h**: Approved templates only
- **Window Reset**: Each customer message restarts 24h timer
- **Template Categories**: MARKETING, UTILITY, AUTHENTICATION

### Database Tracking

**Conversation Window Status:**
```sql
-- Check 24h window status for all conversations
SELECT
    phone_e164,
    last_customer_message_at,
    last_business_message_at,
    is_within_24h,
    CASE
        WHEN is_within_24h THEN '✅ FREE_FORM_ALLOWED'
        ELSE '📋 TEMPLATES_ONLY'
    END as messaging_status,
    EXTRACT(EPOCH FROM (last_customer_message_at + INTERVAL '24 hours' - NOW())) / 3600 as hours_remaining
FROM wa_conversations
WHERE last_customer_message_at IS NOT NULL
ORDER BY last_customer_message_at DESC;
```

**24h Window Validation:**
```sql
-- Function to check messaging permissions
SELECT
    phone_e164,
    can_send_freeform_wa(phone_e164) as can_send_freeform,
    CASE
        WHEN can_send_freeform_wa(phone_e164) THEN 'Use /api/whatsapp/send with message text'
        ELSE 'Use /api/whatsapp/send with template_name and template_params'
    END as api_usage
FROM wa_conversations
WHERE phone_e164 = '+15551234567';
```

## Template Management

### Approved Templates

**Current Template Status:**
```sql
-- List all approved templates
SELECT
    name,
    category,
    language,
    approval_status,
    provider_template_id,
    body_text,
    parameters
FROM wa_templates
WHERE approval_status = 'approved'
ORDER BY category, name;
```

**Template Usage Analytics:**
```sql
-- Template usage in last 7 days
SELECT
    template_name,
    COUNT(*) as usage_count,
    COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful_sends,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_sends,
    ROUND(
        COUNT(CASE WHEN status = 'sent' THEN 1 END)::numeric /
        COUNT(*)::numeric * 100, 2
    ) as success_rate
FROM wa_messages
WHERE direction = 'outbound'
AND template_name IS NOT NULL
AND created_at > NOW() - INTERVAL '7 days'
GROUP BY template_name
ORDER BY usage_count DESC;
```

### Template Approval Process

**Submit New Template:**
```sql
-- Insert new template for approval
INSERT INTO wa_templates (
    name, category, language, body_text, parameters, created_by
) VALUES (
    'ORDER_CONFIRMATION',
    'UTILITY',
    'en',
    'Hi {{1}}, your order {{2}} has been confirmed. We will contact you shortly to schedule your reading. Order details: {{3}}',
    '[{"name": "customer_name", "type": "text"}, {"name": "order_id", "type": "text"}, {"name": "order_details", "type": "text"}]'::jsonb,
    (SELECT id FROM profiles WHERE role_id = 'admin' LIMIT 1)
);
```

**Template Approval Workflow:**
1. Submit template via API or direct SQL
2. WhatsApp Business review (external process)
3. Update approval status and provider_template_id
4. Enable for use in automation flows

### Template Compliance

**WhatsApp Business Policy Compliance:**
- **No promotional content** in UTILITY templates
- **Clear opt-out instructions** for MARKETING
- **Accurate category classification** required
- **24h rule enforcement** automated

## Messaging Operations

### Send Messages

**Free-form Message (within 24h):**
```bash
# Send free-form message
curl -X POST "https://samiatarot.com/api/whatsapp/send" \
  -H "X-User-ID: admin-user" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+15551234567",
    "message": "Thank you for your inquiry! How can I help you today?"
  }'
```

**Template Message (outside 24h):**
```bash
# Send approved template
curl -X POST "https://samiatarot.com/api/whatsapp/send" \
  -H "X-User-ID: admin-user" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+15551234567",
    "template_name": "PAYMENT_REMINDER",
    "template_params": ["John Doe", "$50.00", "ORD123", "https://pay.stripe.com/abc123"]
  }'
```

### Conversation Management

**Get Conversation History:**
```bash
# Retrieve conversation
curl "https://samiatarot.com/api/whatsapp/conversations/+15551234567?limit=20" \
  -H "X-User-ID: admin-user"
```

**Reset 24h Window (simulate customer message):**
```sql
-- Manually reset 24h window (for testing)
SELECT update_wa_conversation('+15551234567', 'user-uuid', true);
```

## Media Handling

### Secure Media Delivery

**Media Upload Process:**
1. WhatsApp Cloud API provides temporary URL (~5 minutes)
2. System downloads and stores in private storage
3. Original URL expires automatically
4. Access via signed URLs only

**Create Signed URL:**
```python
# Generate signed URL for media access
signed_url = whatsapp_service.create_media_signature(
    message_id=123,
    max_access=1,      # Single use
    ttl_minutes=60     # 1 hour expiry
)
print(f"Signed URL: {signed_url}")
```

**Verify Media Access:**
```bash
# Access media via signed URL
curl "https://samiatarot.com/api/whatsapp/media/uuid-123?token=access-token-456"
```

### Media Cleanup

**Automated Cleanup:**
```sql
-- Clean up expired media signatures
SELECT cleanup_expired_wa_media();

-- Manual cleanup of old media files
DELETE FROM wa_media_signatures
WHERE expires_at < NOW() - INTERVAL '7 days';
```

## Payment Link Automation

### Create Payment Link with WhatsApp Follow-up

**API Call:**
```bash
# Create payment link with automation
curl -X POST "https://samiatarot.com/api/whatsapp/payment-link" \
  -H "X-User-ID: admin-user" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "currency": "USD",
    "description": "Tarot Reading Session",
    "customer_name": "Jane Smith",
    "customer_phone": "+15551234567",
    "customer_email": "jane@example.com",
    "order_id": "ORD456"
  }'
```

**Automation Flow Status:**
```sql
-- Check automation flow status
SELECT
    id,
    phone_e164,
    flow_type,
    current_step,
    status,
    next_action_at,
    trigger_data->>'payment_link_url' as payment_url
FROM wa_automation_flows
WHERE phone_e164 = '+15551234567'
AND status = 'active'
ORDER BY created_at DESC;
```

### Manual Flow Processing

**Process Pending Flows:**
```bash
# Trigger manual flow processing
curl -X POST "https://samiatarot.com/api/whatsapp/process-flows?batch_size=10" \
  -H "X-User-ID: admin-user"
```

## Monitoring & Metrics

### WhatsApp System Health

**Check System Status:**
```bash
# Get comprehensive metrics
curl "https://samiatarot.com/api/whatsapp/metrics" \
  -H "X-User-ID: monitor-user"
```

**Key Metrics to Monitor:**
```sql
-- Daily WhatsApp metrics
SELECT
    DATE(created_at) as date,
    direction,
    COUNT(*) as message_count,
    COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful_sends,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_sends
FROM wa_messages
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), direction
ORDER BY date DESC, direction;
```

### Compliance Monitoring

**24h Rule Violations:**
```sql
-- Check for potential 24h rule violations
SELECT
    phone_e164,
    message_type,
    content_text,
    template_name,
    created_at,
    CASE
        WHEN message_type = 'text' AND template_name IS NULL THEN 'FREE_FORM'
        WHEN template_name IS NOT NULL THEN 'TEMPLATE'
        ELSE 'OTHER'
    END as message_classification
FROM wa_messages
WHERE direction = 'outbound'
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Verify 24h window compliance
WITH message_context AS (
    SELECT
        m.*,
        c.is_within_24h as window_status_at_send
    FROM wa_messages m
    LEFT JOIN wa_conversations c ON c.phone_e164 = m.phone_e164
    WHERE m.direction = 'outbound'
    AND m.created_at > NOW() - INTERVAL '24 hours'
)
SELECT
    phone_e164,
    message_type,
    template_name,
    window_status_at_send,
    CASE
        WHEN template_name IS NULL AND window_status_at_send = false THEN '❌ VIOLATION'
        WHEN template_name IS NOT NULL AND window_status_at_send = false THEN '✅ COMPLIANT'
        WHEN window_status_at_send = true THEN '✅ COMPLIANT'
        ELSE '⚠️ UNKNOWN'
    END as compliance_status
FROM message_context
ORDER BY compliance_status, created_at DESC;
```

## Troubleshooting

### Common Issues

**Message Delivery Failures:**
```sql
-- Check recent failed messages
SELECT
    phone_e164,
    message_type,
    template_name,
    status,
    error_message,
    created_at
FROM wa_messages
WHERE status = 'failed'
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

**Template Issues:**
```sql
-- Check template approval status
SELECT
    name,
    approval_status,
    provider_template_id,
    CASE
        WHEN approval_status = 'pending' THEN 'Awaiting WhatsApp approval'
        WHEN approval_status = 'rejected' THEN 'Template rejected - review content'
        WHEN approval_status = 'approved' AND provider_template_id IS NULL THEN 'Missing provider ID'
        ELSE 'Ready for use'
    END as action_needed
FROM wa_templates
WHERE approval_status != 'approved' OR provider_template_id IS NULL;
```

### Debug Commands

**Test WhatsApp Connectivity:**
```bash
# Test webhook verification
curl "https://samiatarot.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=test&hub.challenge=123"

# Check API credentials
curl -H "Authorization: Bearer $WHATSAPP_ACCESS_TOKEN" \
  "https://graph.facebook.com/v18.0/$PHONE_NUMBER_ID"
```

**Validate Phone Numbers:**
```python
# Test E.164 normalization
from whatsapp_service import whatsapp_service

test_numbers = [
    "+15551234567",
    "15551234567",
    "+1 (555) 123-4567",
    "invalid_number"
]

for number in test_numbers:
    normalized = whatsapp_service.normalize_phone_e164(number)
    print(f"{number} -> {normalized}")
```

## Emergency Procedures

### Disable WhatsApp Integration

**Emergency Shutdown:**
```sql
-- Temporarily disable all outbound WhatsApp messages
UPDATE wa_automation_flows
SET status = 'cancelled'
WHERE status = 'active';

-- Mark all pending events as cancelled
UPDATE siren_events
SET status = 'cancelled'
WHERE status = 'pending'
AND template_id IN (
    SELECT id FROM siren_templates
    WHERE name LIKE '%WHATSAPP%'
);
```

### Policy Violation Response

**If 24h Rule Violated:**
1. **Immediate**: Stop all automation flows
2. **Investigate**: Review recent message logs
3. **Report**: Document violation details
4. **Remediate**: Update code to prevent recurrence
5. **Monitor**: Increase compliance checking

**Violation Documentation:**
```sql
-- Log policy violation
INSERT INTO audit_log (actor, event, entity, entity_id, meta)
VALUES (
    'compliance_officer',
    'whatsapp_policy_violation',
    'compliance',
    'wa_24h_rule',
    jsonb_build_object(
        'violation_type', '24h_rule',
        'affected_numbers', ARRAY['+15551234567'],
        'corrective_action', 'automation_suspended',
        'investigation_status', 'ongoing'
    )
);
```

## Best Practices

### Template Design
- **Clear and concise** messaging
- **Accurate parameter** placeholders
- **Appropriate category** selection
- **Compliance review** before submission

### 24h Window Management
- **Track customer** interactions accurately
- **Respect the window** boundaries strictly
- **Use templates** for important notifications outside window
- **Monitor compliance** continuously

### Media Security
- **Never expose** direct media URLs
- **Use signed URLs** with short TTL
- **Implement access** logging
- **Clean up expired** signatures regularly

### Automation Best Practices
- **Test flows** thoroughly before production
- **Monitor success** rates and failures
- **Implement retry** logic with backoff
- **Provide manual** override capabilities