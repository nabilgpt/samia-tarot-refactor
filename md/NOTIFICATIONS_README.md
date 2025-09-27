# M22: Notifications & Campaigns - Implementation Documentation

**Version**: v1.0  
**Status**: Complete  
**Channels**: FCM/APNs Push, Twilio SMS/WhatsApp  
**Compliance**: GDPR, TCPA, CAN-SPAM with consent discipline  
**Languages**: Bilingual (EN/AR) message templates

## Overview

M22 implements a comprehensive notifications and campaigns system for the SAMIA-TAROT platform. It provides multi-channel messaging with per-timezone scheduling, consent management, suppression lists, and compliance with international messaging regulations.

## Core Features

### 1. Multi-Channel Support
- **Push Notifications**: FCM (Android/Web) and APNs (iOS)
- **SMS Messaging**: Twilio SMS with STOP/UNSTOP compliance
- **WhatsApp Business**: Twilio WhatsApp API integration
- **Email** (ready for future implementation)

### 2. Consent Management
- **Per-Channel Opt-In/Out**: Users control preferences for each channel
- **Lawful Basis Tracking**: GDPR-compliant consent recording
- **Quiet Hours**: User-configurable do-not-disturb periods
- **Timezone Awareness**: Automatic timezone cohort assignment
- **Granular Controls**: Channel-specific preferences and scheduling

### 3. Campaign Management
- **Bilingual Templates**: EN/AR message templates with variable substitution
- **Audience Targeting**: Role, country, and engagement-based targeting
- **Timezone Scheduling**: Per-cohort campaign delivery timing
- **Draft/Schedule/Run Workflow**: Controlled campaign lifecycle
- **Statistics & Analytics**: Delivery, engagement, and conversion tracking

### 4. Suppression Lists
- **Automatic Suppression**: Hard bounces, complaints, opt-outs
- **Manual Management**: Admin-controlled suppression entries
- **Temporary/Permanent**: Configurable expiration dates
- **Cross-Channel Support**: Channel-specific suppression rules

### 5. Provider Integrations
- **FCM HTTP v1 API**: Firebase Cloud Messaging with JWT authentication
- **APNs HTTP/2**: Apple Push Notification service with token-based auth
- **Twilio Messaging**: SMS and WhatsApp with webhook verification
- **Webhook Security**: HMAC signature verification and replay protection

## Database Schema

### Consent & Device Management
```sql
-- Per-user, per-channel consent preferences
notification_consents (
  user_id, channel, opted_in, lawful_basis, consent_timestamp,
  quiet_hours_start, quiet_hours_end, timezone_cohort
)

-- Push notification device tokens
device_tokens (
  user_id, token, provider, platform, is_active
)
```

### Campaign & Notifications
```sql
-- Campaign definitions with targeting
campaigns (
  name, channel, message_template, target_audience,
  timezone_cohorts, scheduled_start, status
)

-- Individual notification instances
notifications (
  campaign_id, user_id, channel, message_content,
  scheduled_at, status, provider_message_id, timezone_cohort
)
```

### Suppression & Analytics
```sql
-- Suppression list entries
notification_suppressions (
  identifier, channel, reason, applied_by, expires_at
)

-- Delivery and engagement tracking
notification_events (
  notification_id, event_type, event_timestamp, provider_data
)
```

## API Endpoints

### User Consent Management
```http
POST /api/me/notifications/device-token
POST /api/me/notifications/opt-in
POST /api/me/notifications/opt-out
GET  /api/me/notifications
```

### Campaign Management (Admin Only)
```http
POST /api/admin/campaigns
POST /api/admin/campaigns/{id}/schedule
GET  /api/admin/campaigns/{id}/stats
```

### Suppression Management (Admin Only)
```http
POST /api/admin/suppressions
```

## Provider Configuration

### Firebase Cloud Messaging (FCM)
```bash
# Environment Variables
FCM_PROJECT_ID=your-firebase-project-id
FCM_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
```

**Setup Steps:**
1. Create Firebase project and enable FCM
2. Generate service account key (JSON format)
3. Extract private key and project ID for environment variables
4. Configure HTTP v1 endpoint with JWT authentication

### Apple Push Notification Service (APNs)
```bash
# Environment Variables
APNS_KEY_ID=your-apns-key-id
APNS_TEAM_ID=your-apple-team-id
APNS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
```

**Setup Steps:**
1. Generate APNs authentication key in Apple Developer Console
2. Note Key ID and Team ID from Apple Developer account
3. Download .p8 private key file
4. Configure HTTP/2 endpoint with token-based authentication

### Twilio Messaging
```bash
# Environment Variables (reuse from existing Twilio setup)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_MESSAGING_SID=your-messaging-service-sid
```

**Setup Steps:**
1. Configure Messaging Service in Twilio Console
2. Add phone numbers and/or WhatsApp sender
3. Set up webhooks for delivery status callbacks
4. Configure HMAC signature verification

## Timezone Cohorts

M22 reuses and extends the timezone cohorts from M18A for global scheduling:

| Cohort | Timezone | UTC Offset | Countries |
|--------|----------|------------|-----------|
| GMT | Europe/London | +0 | GB, IE |
| CET | Europe/Berlin | +1 | DE, FR, IT, ES |
| EET | Europe/Athens | +2 | GR, FI, RO |
| AST | Asia/Riyadh | +3 | SA, KW, BH, QA |
| GST | Asia/Dubai | +4 | AE, OM |
| IST | Asia/Kolkata | +5.5 | IN, LK |
| JST | Asia/Tokyo | +9 | JP |
| AET | Australia/Sydney | +10 | AU |
| PST | America/Los_Angeles | -8 | US (West) |
| EST | America/New_York | -5 | US (East), CA |

### Cohort-Based Scheduling
- Campaigns can target specific timezone cohorts
- Each cohort gets localized send times (e.g., 9 AM local time)
- Quiet hours respected per user's timezone
- Automatic user assignment based on country profile

## Message Templates

### Bilingual Template Structure
```json
{
  "en": {
    "title": "Daily Horoscope Ready!",
    "body": "Your {zodiac} reading for {date} is available."
  },
  "ar": {
    "title": "برجك اليومي جاهز!",
    "body": "قراءة برج {zodiac} لتاريخ {date} متاحة الآن."
  }
}
```

### Variable Substitution
Templates support variable substitution using `{variable_name}` syntax:
- `{user_name}` - User's first name
- `{zodiac}` - User's zodiac sign
- `{date}` - Formatted date
- `{service_name}` - Service being promoted

### Language Selection
Language is automatically selected based on user's country:
- **Arabic**: SA, AE, QA, KW, BH, OM
- **English**: All other countries (fallback)

## Campaign Workflow

### 1. Campaign Creation
```bash
POST /api/admin/campaigns
{
  "name": "Daily Horoscope Push",
  "channel": "push",
  "message_template": { /* bilingual templates */ },
  "target_audience": {
    "roles": ["client"],
    "countries": ["SA", "AE"],
    "segments": ["active_7d"]
  },
  "timezone_cohorts": ["AST", "GST"],
  "scheduled_start": "2024-01-16T09:00:00Z"
}
```

### 2. Campaign Scheduling
- Campaign moves from `draft` to `scheduled` status
- Individual `notifications` records created for each target user
- Timezone-specific send times calculated
- Quiet hours and consent checked for each user

### 3. Campaign Execution
- Background jobs process `pending` notifications
- Provider-specific adapters handle message delivery
- Delivery receipts and engagement events tracked
- Failed sends retried with exponential backoff

### 4. Statistics & Analytics
```bash
GET /api/admin/campaigns/{id}/stats
{
  "notifications": {
    "total": 15420,
    "sent": 15200,
    "delivered": 14800,
    "failed": 220,
    "suppressed": 200
  },
  "engagement": {
    "opened": 8900,
    "clicked": 2100,
    "bounced": 45,
    "complained": 12
  }
}
```

## Suppression Management

### Automatic Suppression Triggers
- **Hard Bounce**: Permanent delivery failure (invalid address/number)
- **Complaint**: User reports message as spam
- **Opt-Out**: User explicitly opts out via STOP command or UI
- **Provider Block**: Device token invalidated or number blocked

### Manual Suppression
Admins can manually add suppression entries:
```bash
POST /api/admin/suppressions
{
  "identifier": "user@example.com",
  "channel": "email",
  "reason": "manual",
  "notes": "Customer service request",
  "expires_at": "2024-06-01T00:00:00Z"
}
```

### Suppression Enforcement
Before sending any notification:
1. Check if recipient is suppressed for the channel
2. Verify suppression hasn't expired
3. Skip delivery and mark as `suppressed` if blocked
4. Log suppression hit for audit purposes

## Webhook Handling

### Security Requirements
- **HMAC Verification**: All webhooks must include valid HMAC-SHA256 signature
- **Timestamp Validation**: Reject webhooks older than 5 minutes (replay protection)
- **IP Allowlisting**: Only accept webhooks from known provider IP ranges

### Webhook Processing
1. **Signature Verification**: Validate HMAC signature using stored secret
2. **Timestamp Check**: Ensure webhook is recent (anti-replay)
3. **Event Processing**: Update notification status and create event records
4. **Suppression Handling**: Auto-suppress on hard bounces/complaints

### Example Webhook Handlers
```python
# FCM delivery status
@app.post("/webhooks/fcm")
def handle_fcm_webhook(request, signature: str = Header(...)):
    # Verify signature, process delivery status
    pass

# Twilio SMS status  
@app.post("/webhooks/twilio/sms")
def handle_twilio_sms_webhook(request, signature: str = Header(...)):
    # Verify signature, handle STOP/START commands
    pass
```

## Quiet Hours Implementation

### User Configuration
Users can set quiet hours per their timezone:
```json
{
  "quiet_hours_start": "22:00",
  "quiet_hours_end": "08:00",
  "timezone_cohort": "AST"
}
```

### Scheduling Logic
1. Calculate user's local time for proposed send time
2. Check if local time falls within quiet hours range
3. If in quiet hours and campaign doesn't override:
   - Delay until end of quiet hours
   - Or skip if outside campaign window

### Cross-Midnight Quiet Hours
Quiet hours spanning midnight (e.g., 22:00-08:00) are handled correctly:
- 22:00-23:59 on day N = quiet
- 00:00-08:00 on day N+1 = quiet
- All other times = not quiet

## Security & Privacy

### Data Protection
- **No PII in Logs**: Only user IDs, status codes, and timestamps logged
- **Message Content Minimal**: Store only rendered final message, not raw templates
- **Provider IDs Only**: Store external message IDs, not content
- **Retention Limits**: Auto-delete old notifications and events per policy

### Access Controls
- **Row-Level Security**: DB policies match API route guards exactly
- **User Isolation**: Users see only their own notifications
- **Admin Oversight**: Admin/Superadmin can view aggregated statistics
- **Deny-by-Default**: All tables protected by RLS policies

### Compliance Features
- **GDPR Consent**: Lawful basis tracking for all notification preferences
- **TCPA Compliance**: STOP/START command handling for SMS
- **CAN-SPAM**: Proper unsubscribe mechanisms and sender identification
- **Data Minimization**: Only essential data stored and processed

## Operational Procedures

### Daily Operations
1. **Monitor Campaign Queues**: Check for stuck notifications
2. **Review Suppression Lists**: Validate new suppression entries
3. **Check Provider Status**: Ensure FCM/APNs/Twilio services healthy
4. **Audit Delivery Rates**: Monitor delivery success percentages

### Weekly Maintenance
1. **Clean Old Notifications**: Archive notifications older than 30 days
2. **Review Campaign Performance**: Analyze engagement trends
3. **Update Suppression Lists**: Process complaint reports
4. **Rotate Webhook Secrets**: Update provider webhook validation keys

### Monthly Tasks
1. **Consent Audit**: Review opt-in/opt-out trends
2. **Provider Cost Review**: Monitor messaging costs and usage
3. **Compliance Reporting**: Generate consent and suppression reports
4. **Performance Optimization**: Review and optimize campaign targeting

## Monitoring & Alerting

### Key Metrics
- **Delivery Rate**: Percentage of notifications successfully delivered
- **Engagement Rate**: Open/click rates for campaigns
- **Suppression Rate**: Percentage of sends blocked by suppression list
- **Consent Rate**: Opt-in vs opt-out trends over time

### Alert Thresholds
- Delivery rate drops below 95%
- Complaint rate exceeds 0.1%
- Provider error rate above 5%
- Webhook processing delays > 5 minutes

### Dashboards
- **Campaign Performance**: Real-time campaign statistics
- **Provider Health**: FCM/APNs/Twilio status monitoring
- **User Engagement**: Consent trends and engagement metrics
- **System Health**: Queue depths, processing times, error rates

## Testing & Validation

### Test Suite Coverage
Run comprehensive M22 tests with:
```bash
python test_m22_notifications.py
```

**Test Categories:**
- ✅ Consent management (opt-in/opt-out workflows)
- ✅ Campaign scheduling and execution
- ✅ Timezone-aware delivery timing
- ✅ Suppression list enforcement
- ✅ RLS policy isolation and security
- ✅ Webhook signature verification
- ✅ Bilingual message rendering
- ✅ Provider adapter functionality

### Manual Testing Checklist
- [ ] User can opt-in/out of each notification channel
- [ ] Quiet hours respected for user's timezone
- [ ] Campaigns deliver to correct audience segments
- [ ] Suppressed users don't receive notifications
- [ ] Message templates render correctly in both languages
- [ ] Webhook signatures validate properly
- [ ] RLS policies prevent cross-user data access

## Troubleshooting

### Common Issues

**Campaign Not Sending**
- Check campaign status is `scheduled`
- Verify target audience has opted-in users
- Ensure timezone cohorts are configured
- Check for suppression list blocks

**Low Delivery Rates**
- Review provider credentials and quotas
- Check suppression list for over-blocking
- Validate message content and format
- Monitor provider status dashboards

**High Complaint Rates**
- Review message content for spam-like characteristics
- Check send frequency and timing
- Validate audience targeting accuracy
- Ensure clear unsubscribe mechanisms

### Error Codes
- `CONSENT_REQUIRED`: User hasn't opted in to channel
- `SUPPRESSED`: User is on suppression list
- `QUIET_HOURS`: Send attempted during user's quiet hours
- `PROVIDER_ERROR`: External provider returned error
- `INVALID_TOKEN`: Device token expired or invalid

## Rollback Procedures

### Emergency Rollback
1. **Disable Campaign Scheduling**: Set all campaigns to `cancelled` status
2. **Stop Background Jobs**: Disable notification processing workers  
3. **Provider Shutdown**: Disable provider API credentials
4. **Data Integrity**: Keep all data intact for investigation

### Partial Rollback
- Individual campaigns can be cancelled without affecting others
- Provider-specific rollback (disable FCM but keep SMS active)
- Feature flags can disable new campaign creation while preserving existing

### Recovery Procedures
1. **Identify Root Cause**: Analyze logs and metrics
2. **Fix Configuration**: Update provider credentials or settings
3. **Resume Operations**: Re-enable scheduling and processing
4. **Validate Recovery**: Test with small campaigns before full restart

---

**M22 (Notifications & Campaigns) implementation is complete and ready for production deployment with full compliance, security, and operational procedures in place.**