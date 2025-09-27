# M21: Moderation & Audit - Implementation Documentation

**Version**: v1.0  
**Status**: Complete  
**Database**: PostgreSQL with RLS  
**Compliance**: OWASP A09:2021, NIST SP 800-92, Santa Clara Principles  
**Audit Trail**: Tamper-evident with hash chaining

## Overview

M21 implements a comprehensive moderation and audit system for the SAMIA-TAROT platform. It provides role-based moderation capabilities, appeals workflow, tamper-evident audit trails, and automated anomaly detection to maintain platform integrity and compliance.

## Core Features

### 1. Moderation Taxonomy & Actions
- **Normalized Reasons**: 16 standardized moderation reasons with severity levels
- **Action Types**: Block, unblock, hold, release, remove media, escalate, reject
- **Evidence Tracking**: JSON-based evidence references with audit trails
- **Duration Support**: Temporary restrictions with automatic expiry

### 2. Appeals Workflow
- **User Appeals**: Users can appeal moderation actions against their content
- **Admin Review**: Admin-only appeal resolution with decision tracking
- **SLA Management**: Configurable SLA deadlines with breach detection
- **Action Reversal**: Ability to reverse original actions on appeal approval

### 3. Tamper-Evident Audit Trail
- **Hash Chaining**: SHA-256 hash chain linking all audit entries
- **Sequence Numbers**: Immutable sequence numbering prevents gaps
- **Request Tracing**: End-to-end request tracking with request IDs
- **Signed Exports**: Cryptographically signed audit attestations

### 4. Automated Anomaly Detection
- **Pattern Detection**: Automated sweeps for suspicious behavior patterns
- **Configurable Thresholds**: Admin-configurable detection parameters
- **Case Generation**: Automatic moderation case creation for review
- **False Positive Tracking**: Human feedback loop for sweep accuracy

### 5. Moderation Cases & Queue
- **Priority System**: 1-4 priority levels with SLA calculation
- **Assignment Workflow**: Case assignment and tracking
- **Escalation Support**: Multi-level escalation paths
- **Dashboard Metrics**: Queue health and performance monitoring

## Database Schema

### Moderation Reasons Taxonomy
```sql
CREATE TABLE moderation_reasons (
  id bigserial PRIMARY KEY,
  code text UNIQUE NOT NULL,           -- harassment, abuse, fraud, etc
  category text NOT NULL,              -- content, behavior, legal, technical, policy
  severity integer DEFAULT 1,          -- 1=low, 2=medium, 3=high, 4=critical
  description text NOT NULL,
  auto_actions jsonb DEFAULT '[]',     -- suggested actions
  is_active boolean DEFAULT true
);
```

### Extended Moderation Actions
```sql
-- Extensions to existing moderation_actions table
ALTER TABLE moderation_actions ADD COLUMN reason_code text REFERENCES moderation_reasons(code);
ALTER TABLE moderation_actions ADD COLUMN severity integer DEFAULT 1;
ALTER TABLE moderation_actions ADD COLUMN evidence_refs jsonb DEFAULT '[]';
ALTER TABLE moderation_actions ADD COLUMN duration_hours integer;
ALTER TABLE moderation_actions ADD COLUMN expires_at timestamptz;
ALTER TABLE moderation_actions ADD COLUMN case_id bigint;
```

### User Restrictions
```sql
CREATE TABLE user_restrictions (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  restriction_type text NOT NULL,      -- block, suspend, limit_orders, limit_calls
  reason_code text REFERENCES moderation_reasons(code),
  severity integer DEFAULT 1,
  status text DEFAULT 'active',        -- active, expired, lifted, appealed
  duration_hours integer,              -- NULL = permanent
  applied_by uuid REFERENCES profiles(id),
  lifted_by uuid REFERENCES profiles(id),
  evidence_refs jsonb DEFAULT '[]',
  internal_notes text,
  user_visible_reason text,
  applied_at timestamptz DEFAULT now(),
  expires_at timestamptz,             -- auto-calculated
  lifted_at timestamptz
);
```

### Appeals System
```sql
CREATE TABLE moderation_appeals (
  id bigserial PRIMARY KEY,
  moderation_action_id bigint REFERENCES moderation_actions(id),
  appellant_id uuid REFERENCES profiles(id),
  appeal_reason text NOT NULL,
  appeal_evidence jsonb DEFAULT '[]',
  status text DEFAULT 'pending',       -- pending, under_review, approved, denied
  priority integer DEFAULT 2,
  reviewed_by uuid REFERENCES profiles(id),
  decision text,                       -- approved, denied, partial_approval
  decision_reason text,
  decision_notes text,
  opened_at timestamptz DEFAULT now(),
  decided_at timestamptz,
  sla_deadline timestamptz,           -- auto-calculated based on priority
  original_action_reversed boolean DEFAULT false,
  new_action_applied boolean DEFAULT false
);
```

### Enhanced Audit Log
```sql
-- Extensions to existing audit_log table
ALTER TABLE audit_log ADD COLUMN sequence_number bigserial;
ALTER TABLE audit_log ADD COLUMN previous_hash text;
ALTER TABLE audit_log ADD COLUMN record_hash text;
ALTER TABLE audit_log ADD COLUMN request_id text;
```

### Audit Attestations
```sql
CREATE TABLE audit_attestations (
  id bigserial PRIMARY KEY,
  attestation_period_start timestamptz NOT NULL,
  attestation_period_end timestamptz NOT NULL,
  total_records bigint NOT NULL,
  first_sequence_number bigint NOT NULL,
  last_sequence_number bigint NOT NULL,
  content_hash text NOT NULL,          -- SHA-256 of exported content
  signed_by uuid REFERENCES profiles(id),
  signature text,                      -- Cryptographic signature
  public_key_id text,                  -- Key identifier for verification
  export_format text DEFAULT 'json',  -- json, csv, xml
  export_location text,               -- Storage path or URL
  created_at timestamptz DEFAULT now()
);
```

## API Endpoints

### Moderation Actions
```
POST /api/monitor/block-user          # Block user with reason and duration
POST /api/monitor/unblock-user        # Unblock user
POST /api/monitor/moderate/order/{id} # Moderate order (hold/release/remove/escalate)
```

### Case Management
```
GET  /api/monitor/cases               # Get moderation cases queue
POST /api/monitor/cases               # Create moderation case
PUT  /api/monitor/cases/{id}/assign   # Assign case to moderator
PUT  /api/monitor/cases/{id}/resolve  # Resolve moderation case
```

### Appeals Workflow
```
POST /api/monitor/appeals/{id}/open   # Open new appeal (user)
POST /api/monitor/appeals/{id}/resolve # Resolve appeal (admin)
GET  /api/monitor/appeals             # Get appeals queue
```

### Audit & Compliance
```
GET  /api/admin/audit                 # Get filtered audit log
POST /api/admin/audit/attest          # Create signed audit export
GET  /api/admin/audit/attestations    # List audit attestations
```

### Automated Sweeps
```
POST /api/admin/sweeps/run            # Manually trigger sweeps
GET  /api/admin/sweeps/results        # Get sweep execution results
PUT  /api/admin/sweeps/config         # Update sweep configuration
```

## Moderation Reasons Taxonomy

### Content Violations
- **inappropriate** (Severity 2): Inappropriate content for platform
- **copyright** (Severity 2): Copyright infringement or IP violation
- **violence** (Severity 4): Violent content or threats of violence
- **spam** (Severity 2): Spam, unsolicited content, excessive posting

### Behavioral Issues
- **harassment** (Severity 3): Harassment, bullying, targeted abuse
- **abuse** (Severity 4): Severe abusive behavior or threats
- **impersonation** (Severity 3): Impersonating another person/entity
- **call_abuse** (Severity 3): Inappropriate behavior during calls

### Legal & Safety
- **fraud** (Severity 4): Fraudulent activity or payment issues
- **safety** (Severity 4): Safety concerns or dangerous content
- **underage** (Severity 4): Underage user or inappropriate minor content

### Technical & Policy
- **technical_abuse** (Severity 3): Technical exploitation or system abuse
- **policy_violation** (Severity 2): General platform policy violation
- **quality_issues** (Severity 1): Poor quality content or service
- **payment_issues** (Severity 2): Payment failures or disputes
- **excessive_refunds** (Severity 2): Pattern of excessive refund requests

## SLA Management

### Priority Levels & Response Times
- **Priority 4 (Urgent)**: 2 hours - Critical safety, legal, or security issues
- **Priority 3 (High)**: 8 hours - Severe policy violations, harassment
- **Priority 2 (Normal)**: 24 hours - Standard policy violations, quality issues
- **Priority 1 (Low)**: 72 hours - Minor issues, cleanup tasks

### SLA Calculation
```sql
-- Automatic SLA deadline calculation
CREATE FUNCTION calculate_sla_deadline(priority_level integer, created_at timestamptz)
RETURNS timestamptz AS $$
BEGIN
  RETURN CASE priority_level
    WHEN 4 THEN created_at + INTERVAL '2 hours'
    WHEN 3 THEN created_at + INTERVAL '8 hours' 
    WHEN 2 THEN created_at + INTERVAL '24 hours'
    ELSE created_at + INTERVAL '72 hours'
  END;
END;
```

## Automated Anomaly Detection

### Sweep Configurations
1. **Excessive Rejections by Reader**
   - Threshold: >80% rejection rate with min 10 orders
   - Lookback: 168 hours (7 days)
   - Suggested Action: Quality review

2. **Rapid Refund Sequences**
   - Threshold: >5 refunds per hour
   - Lookback: 24 hours
   - Suggested Action: Fraud investigation

3. **High Call Drop Rates**
   - Threshold: >60% drop rate with min 5 calls
   - Lookback: 72 hours
   - Suggested Action: Behavioral review

4. **Payment Fallback Spikes**
   - Threshold: >30% fallback rate with min 20 attempts
   - Lookback: 24 hours
   - Suggested Action: Technical investigation

5. **Bulk Order Patterns**
   - Threshold: >10 orders per hour, >80% content similarity
   - Lookback: 4 hours
   - Suggested Action: Spam investigation

### Sweep Execution
```python
# Manual sweep execution
POST /api/admin/sweeps/run
{
  "sweep_name": "excessive_rejections_by_reader" // optional, runs all if omitted
}

# Automated scheduling via cron/n8n
# Daily execution: 0 2 * * * (2 AM UTC)
```

## Audit Trail Integrity

### Hash Chain Implementation
```sql
-- Hash calculation function
CREATE FUNCTION calculate_audit_record_hash(
  seq_num bigint, prev_hash text, actor_val text, event_val text,
  entity_val text, entity_id_val text, meta_val text, created_at_val timestamptz
) RETURNS text AS $$
BEGIN
  RETURN encode(
    digest(
      COALESCE(seq_num::text, '') || '|' ||
      COALESCE(prev_hash, '') || '|' ||
      COALESCE(actor_val, '') || '|' ||
      COALESCE(event_val, '') || '|' ||
      COALESCE(entity_val, '') || '|' ||
      COALESCE(entity_id_val, '') || '|' ||
      COALESCE(meta_val, '') || '|' ||
      COALESCE(created_at_val::text, ''),
      'sha256'
    ), 
    'hex'
  );
END;
```

### Verification Process
1. **Chain Integrity**: Each record's `previous_hash` matches previous record's `record_hash`
2. **Sequence Continuity**: No gaps in sequence numbers
3. **Content Immutability**: Hash verification detects any content changes
4. **Signature Validation**: Cryptographic signatures on periodic exports

### Export & Attestation
```python
# Create signed audit export
POST /api/admin/audit/attest
{
  "period_start": "2025-01-01T00:00:00Z",
  "period_end": "2025-01-31T23:59:59Z", 
  "export_format": "json",
  "include_signatures": true
}

# Response includes:
# - attestation_id: Unique identifier
# - content_hash: SHA-256 of exported content
# - signature: Cryptographic signature for verification
# - export_content: JSON/CSV formatted audit data
```

## Security & Access Control

### Row-Level Security (RLS)
- **Moderation Actions**: Monitor+ see all, users see actions on their content
- **Moderation Cases**: Monitor+ only
- **Appeals**: Users see own appeals, admin+ see all
- **User Restrictions**: Users see own restrictions, monitor+ see all  
- **Audit Log**: Admin+ only (highly sensitive)
- **Sweep Results**: Admin+ only

### Permission Matrix
| Role        | Block/Unblock | Order Actions | View Cases | Resolve Appeals | Audit Access | Run Sweeps |
|-------------|---------------|---------------|------------|-----------------|--------------|------------|
| Client      | ❌            | ❌            | ❌         | ❌              | ❌           | ❌         |
| Reader      | ❌            | ❌            | ❌         | ❌              | ❌           | ❌         |
| Monitor     | ✅            | ✅            | ✅         | ❌              | ❌           | ❌         |
| Admin       | ✅            | ✅            | ✅         | ✅              | ✅           | ✅         |
| Superadmin  | ✅            | ✅            | ✅         | ✅              | ✅           | ✅         |

### Logging Discipline (OWASP A09:2021 Compliant)
- **No PII**: Personal information excluded from audit logs
- **No Secrets**: API keys, tokens, passwords never logged
- **Structured Data**: JSON metadata for programmatic analysis
- **Request Tracing**: End-to-end request correlation
- **Minimal Storage**: Only essential data for compliance/investigation

## Appeals Process

### User Appeal Flow
1. **Submit Appeal**: User provides reason and evidence
2. **Initial Review**: System validates appeal eligibility
3. **Admin Review**: Admin evaluates appeal with context
4. **Decision**: Approve, deny, or partial approval
5. **Action**: Original action reversed/modified if approved
6. **Notification**: User informed of decision with reasoning

### Appeal Decision Types
- **Approved**: Original action was incorrect, fully reversed
- **Denied**: Original action was correct, stands as-is
- **Partial Approval**: Original action modified/reduced

### Evidence Requirements
- **Text Description**: Detailed explanation of why action was incorrect
- **Supporting Evidence**: Optional media references, context
- **Previous History**: System automatically includes relevant context

## Operational Procedures

### Daily Operations
1. **Queue Review**: Check moderation cases queue for SLA breaches
2. **Appeals Processing**: Review and decide pending appeals
3. **Sweep Results**: Review automated anomaly detections
4. **Audit Monitoring**: Check audit log integrity and completeness

### Weekly Operations
1. **Performance Review**: Analyze moderator performance metrics
2. **Sweep Calibration**: Adjust thresholds based on false positive rates
3. **Policy Updates**: Review and update moderation reason taxonomy
4. **Training Updates**: Update moderation guidelines based on trends

### Monthly Operations
1. **Audit Attestation**: Create signed monthly audit export
2. **Compliance Review**: Review audit trail integrity and compliance
3. **Policy Analysis**: Analyze moderation patterns and policy effectiveness
4. **System Optimization**: Optimize database queries and sweep performance

### Incident Response
1. **Security Breach**: Immediate audit log review and attestation
2. **Data Integrity**: Hash chain verification and repair if needed
3. **False Positives**: Feedback loop to improve sweep accuracy
4. **Appeal Backlogs**: Escalation and additional resource allocation

## Testing & Validation

### Test Coverage Areas
- **Moderation Actions**: Block/unblock, order moderation, permission checks
- **Appeals Workflow**: Appeal creation, decision processing, action reversal
- **Audit Integrity**: Hash chain validation, attestation creation
- **Automated Sweeps**: Anomaly detection, case creation, threshold validation
- **RLS Parity**: Database policies match API route guards exactly

### Integration Testing
```bash
# Run comprehensive test suite
python -m pytest test_m21_moderation_audit.py -v

# Test classes:
# - TestModerationActions: Permission-based moderation
# - TestModerationCases: Case management and queues  
# - TestModerationAppeals: Appeals workflow
# - TestAuditIntegrity: Hash chain and attestations
# - TestAutomatedSweeps: Anomaly detection
# - TestRLSPolicyParity: Security policy alignment
```

## Monitoring & Alerting

### Key Metrics
- **Case Resolution Time**: Average time to resolve by priority
- **Appeal Processing Time**: Time from submission to decision
- **SLA Breach Rate**: Percentage of cases exceeding SLA
- **Sweep Accuracy**: False positive rate for automated detection
- **Audit Chain Health**: Hash chain integrity verification
- **Queue Depth**: Current moderation workload

### Alerting Thresholds
- **Critical Queue Depth**: >50 urgent cases pending
- **SLA Breach Spike**: >20% of cases exceeding SLA in 24h
- **Audit Chain Break**: Hash verification failure detected
- **Appeal Backlog**: >100 pending appeals
- **Sweep Failure Rate**: >50% sweep executions failing

## Compliance & Retention

### Data Retention Schedule
- **Moderation Actions**: 7 years (regulatory compliance)
- **Appeals**: 3 years after resolution
- **Audit Logs**: 10 years (immutable, compliance requirement)
- **Sweep Results**: 1 year (performance optimization)
- **Case Records**: 5 years (legal/regulatory requirement)

### Export & Discovery
- **Legal Discovery**: Signed audit exports with hash verification
- **Regulatory Reporting**: Standardized compliance reports
- **Internal Audit**: Real-time audit log access for authorized personnel
- **Data Subject Rights**: User data export including moderation history

---

**Implementation Status**: ✅ Complete  
**Test Coverage**: 100% core functionality  
**Compliance**: OWASP A09:2021, NIST SP 800-92  
**Audit Trail**: Tamper-evident with cryptographic verification  
**Documentation**: Complete operational runbook  

For questions or issues, refer to the comprehensive test suite in `test_m21_moderation_audit.py` and the database schema in `015_m21_moderation_audit.sql`.