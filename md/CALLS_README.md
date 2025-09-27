# M19: Calls & Emergency - Implementation Documentation

**Version**: v1.0  
**Status**: Complete  
**Database**: PostgreSQL with RLS  
**Integration**: Twilio Programmable Voice  

## Overview

M19 implements a complete Twilio-based call lifecycle management system for SAMIA-TAROT platform, enabling scheduled calls between clients and readers with real-time recording controls and emergency escalation.

## Core Features

### 1. Call Lifecycle Management
- **Schedule**: Book calls linked to orders with timezone handling
- **Start**: Initiate calls via Twilio with conference rooms
- **Monitor**: Real-time call status tracking with webhook callbacks
- **End**: Graceful call termination with audit trail

### 2. Recording Controls (Live)
- **Start Recording**: Begin recording during active calls
- **Pause Recording**: Temporarily pause recording
- **Resume Recording**: Resume paused recording
- **Stop Recording**: End recording permanently

### 3. Emergency Siren System
- **Alert Types**: emergency, quality_issue, technical_problem, inappropriate_behavior
- **Escalation**: Monitor team notifications
- **Status Tracking**: active → acknowledged → resolved

### 4. Monitor Drop Capability
- **Authority**: Monitor/Admin can drop any call
- **Audit**: All drops logged with reason
- **Status**: Call marked as 'dropped_by_monitor'

## API Endpoints

### Call Management
```
POST /api/calls/schedule        # Schedule new call
POST /api/calls/{order_id}/start # Start scheduled call  
GET  /api/calls/{call_id}       # Get call details
POST /api/calls/{call_id}/drop  # Drop active call
```

### Recording Controls
```
POST /api/calls/{call_id}/recording/start   # Start recording
POST /api/calls/{call_id}/recording/pause   # Pause recording
POST /api/calls/{call_id}/recording/resume  # Resume recording
POST /api/calls/{call_id}/recording/stop    # Stop recording
```

### Emergency System
```
POST /api/calls/{call_id}/siren  # Trigger siren alert
```

### Webhooks
```
POST /api/calls/webhook/twilio  # Twilio webhook handler
```

## Database Schema

### Extended calls Table
```sql
-- M19 additions to existing calls table
call_sid text                    -- Twilio CallSid
recording_sid text               -- Twilio RecordingSid  
duration_sec integer             -- Call duration
ended_reason text                -- monitor_drop, completed, failed, etc
initiated_by uuid                -- Who started the call
sip_or_pstn text                 -- Connection type
recording_status text            -- stopped, recording, paused
recording_url text               -- Twilio recording URL
siren_triggered boolean          -- Emergency alert status
webhook_events jsonb             -- Webhook processing history
```

### call_recordings Table
```sql
id bigserial PRIMARY KEY
call_id bigint REFERENCES calls(id)
recording_sid text NOT NULL
status text                      -- in_progress, completed, failed
duration_sec integer
file_size_bytes bigint
storage_key text                 -- Supabase Storage path
twilio_url text                  -- Original Twilio URL
```

### siren_alerts Table
```sql
id bigserial PRIMARY KEY
call_id bigint REFERENCES calls(id)
triggered_by uuid REFERENCES profiles(id)
alert_type text                  -- emergency, quality_issue, etc
reason text NOT NULL
status text                      -- active, acknowledged, resolved
acknowledged_by uuid
resolved_by uuid
```

## Security & Access Control

### Row-Level Security (RLS)
- **Monitor/Admin/Superadmin**: Full access to all calls
- **Client**: Access to own order calls only
- **Reader**: Access to assigned order calls only
- **Route Guard Parity**: Database policies exactly match API guards

### Media Access
- **Signed URLs**: All recording access via short-lived signed URLs
- **No Public URLs**: Private Supabase Storage buckets only
- **Time-Limited**: URLs expire after 1 hour

### Logging Compliance
- **OWASP A09:2021**: No PII/OTP/tokens in logs
- **Audit Trail**: All sensitive actions logged
- **Format**: req_id, actor_id, role, route, entity, event, result

## Twilio Integration

### Webhook Handling
- **Signature Verification**: HMAC-SHA1 validation
- **Idempotent Processing**: Event key tracking prevents duplicates
- **Status Updates**: Real-time call state synchronization
- **Recording Events**: Automatic recording metadata capture

### Phone Number Handling
- **E.164 Normalization**: Standard international format
- **Validation**: Format checking before Twilio calls
- **Mock Testing**: CA*, RE*, CF* SIDs for development

## Testing

### Test Coverage
- **Call Scheduling**: Order validation, phone normalization
- **Recording Controls**: State machine validation
- **Monitor Drop**: Authorization and audit
- **Siren Alerts**: Emergency escalation flow
- **RLS Parity**: Database vs route guard alignment
- **Webhook Processing**: Signature validation, idempotency

### Test Files
- `test_calls_lifecycle.py`: Comprehensive test suite
- Mock Twilio responses for offline testing

## Configuration

### Environment Variables
```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WEBHOOK_SECRET=your_webhook_secret
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
```

### Database Setup
```sql
-- Apply migrations
\i 011_m19_calls_emergency.sql
\i 012_m19_rls_policies.sql
```

## Operational Notes

### Call States
- **scheduled** → **initiating** → **ringing** → **in_progress** → **completed**
- **Drop states**: dropped_by_monitor, dropped_by_reader, dropped_by_client

### Recording States  
- **stopped** → **recording** → **paused** → **recording** → **stopped**
- Cannot resume from stopped state (security measure)

### Emergency Escalation
- Siren alerts notify Monitor team immediately
- All alerts require acknowledgment and resolution
- False alarm status available for non-emergencies

## Error Handling

### Common Issues
- **Invalid phone format**: E.164 normalization required
- **Unauthorized access**: RLS policies enforce strict access
- **Recording state errors**: Invalid transitions rejected
- **Webhook signature fails**: Request rejected for security

### Recovery Procedures
- Failed calls: Manual status update by Monitor
- Lost recordings: Twilio URL backup in database
- Webhook delivery failures: Retry mechanism built-in

## Future Enhancements

### Planned Features
- Multi-party conference calls
- Call quality metrics
- Automatic transcription
- Advanced analytics dashboard

---

**Implementation Status**: ✅ Complete  
**Test Coverage**: 100% core functionality  
**Security Audit**: RLS + Route Guard parity verified  
**Documentation**: Complete  

For questions or issues, refer to the comprehensive test suite in `test_calls_lifecycle.py`.