# M24: Community Features (Feature-Flagged)

Feature-flagged community system for comments and reactions on delivered readings with strict moderation, privacy controls, and retention policies.

## Overview

M24 provides community engagement features that are **OFF by default** and controlled via feature flags:
- **Comments**: User comments on delivered orders and approved horoscopes
- **Reactions**: Like, insightful, helpful, inspiring reactions on community content
- **Flagging**: User-generated content moderation flags
- **Moderation**: Integration with M21 moderation pipeline
- **Appeals**: Appeal system for moderation decisions

## Feature Flag Control

### Default State: DISABLED

Community features are **disabled by default** and require explicit activation:

```sql
-- Check current state
SELECT is_community_enabled(); -- Returns false by default

-- View all feature flags
SELECT feature_key, is_enabled, description 
FROM feature_flags 
WHERE feature_key = 'community_enabled';
```

### Admin Control

Only Admin/Superadmin can toggle community features:

```http
GET /admin/features
POST /admin/features/community_enabled/toggle
```

When disabled:
- All community endpoints return 403 "Community features are disabled"
- Existing data remains intact (no destructive changes)
- RLS policies remain active (no security gaps)

## Data Schema

### Core Tables

#### `community_comments`
```sql
id, subject_ref, author_id, body, lang, status
created_at, updated_at
moderation_case_id, moderated_at, moderated_by, moderation_reason
```

#### `community_reactions`
```sql
id, subject_ref, author_id, kind, created_at
-- Unique constraint: (subject_ref, author_id, kind)
```

#### `community_flags`
```sql
id, subject_ref, reason, severity, created_by, description, evidence_refs
status, reviewed_by, reviewed_at, review_notes, created_at
```

#### `community_moderation_cases`
```sql
id, subject_ref, case_type, priority, taxonomy_reason, severity
status, assigned_to, assigned_at
decision, decided_by, decided_at, decision_notes
appeal_id, is_appealed, created_at, updated_at
```

#### `community_appeals`
```sql
id, moderation_case_id, appellant_id, reason, description, evidence_refs
status, reviewed_by, reviewed_at, decision, decision_notes
created_at, updated_at
```

### Subject Reference Format

Content references use standardized format:
- `order:123` - Comments on delivered orders
- `horoscope:456` - Comments on approved horoscopes  
- `comment:789` - Reactions on specific comments

## Access Control (RLS)

### Role-Based Access Matrix

| Role | Comments | Reactions | Flags | Moderation Cases | Appeals |
|------|----------|-----------|-------|------------------|---------|
| **Client** | Own + approved public | Own + public content | Own flags | None | Own appeals |
| **Reader** | Own comments only | Own + public content | Own flags | None | Own appeals |
| **Monitor** | Pending/flagged content | Public content | Pending flags | Assigned cases | All for review |
| **Admin** | Full access | Full access | Full access | Full access | Full access |
| **Superadmin** | Full access | Full access | Full access | Full access | Full access |

### Privacy Controls

- **No PII in payloads**: Comments contain no personal identifiers
- **Author isolation**: Users see only their own content by default
- **Approve-first**: Public visibility requires explicit approval
- **Evidence sanitization**: Flag evidence contains IDs only, no raw media

## API Endpoints

### Community Content

```http
POST /community/comments
{
  "subject_ref": "order:123",
  "body": "Great reading, very insightful!",
  "lang": "en"
}

GET /community/threads?subject_ref=order:123
# Returns comments and reactions for subject (role-aware)

POST /community/reactions
{
  "subject_ref": "comment:456", 
  "kind": "insightful"
}

POST /community/flags
{
  "subject_ref": "comment:789",
  "reason": "inappropriate",
  "severity": "medium",
  "description": "Contains offensive language"
}
```

### Moderation

```http
POST /monitor/community/{case_id}/moderate
{
  "decision": "approve|hold|unlist|remove|escalate|dismiss",
  "notes": "Moderation reasoning"
}

GET /admin/community/stats?start_date=2024-01-01&end_date=2024-01-31
# Returns community metrics and aggregates
```

### Feature Management

```http
GET /admin/features
# List all feature flags

POST /admin/features/community_enabled/toggle
{
  "enabled": true
}
```

## Moderation Integration (M21)

### Auto-Moderation Flow

1. **Comment created** → Auto-creates moderation case with status 'pending'
2. **Flag submitted** → Auto-creates moderation case with taxonomy mapping
3. **Monitor reviews** → Applies decision (approve/hold/unlist/remove/escalate)
4. **Content updated** → Status reflects moderation decision
5. **Appeals possible** → Users can appeal moderation decisions

### Taxonomy Mapping

| Flag Reason | M21 Taxonomy | Default Priority |
|-------------|--------------|------------------|
| harassment | user_behavior_harassment | high |
| spam | content_spam_detection | medium |
| inappropriate | content_inappropriate | medium |
| copyright | content_copyright | high |
| fraud | payment_fraud_detection | critical |
| safety | user_safety_concern | critical |

### Decision Actions

- **approve**: Make content publicly visible
- **hold**: Keep in pending state for further review
- **unlist**: Hide from public but keep for appeals
- **remove**: Mark as removed (audit trail preserved)
- **escalate**: Promote to higher priority/different team
- **dismiss**: Close case without action (for flags)

## Validation Rules

### Comment Validation
- **Length**: 1-2000 characters
- **Language**: 'en' or 'ar' only
- **Subject**: Must reference delivered/approved content
- **Rate limits**: Max 10 comments per hour per user

### Reaction Validation
- **Types**: like, insightful, helpful, inspiring
- **Uniqueness**: One reaction per user per subject per type
- **Rate limits**: Max 200 reactions per hour per user

### Flag Validation
- **Reasons**: harassment, spam, inappropriate, copyright, fraud, safety
- **Severity**: low, medium, high, critical
- **Rate limits**: Max 10 flags per hour per user

## Retention & Cleanup

### Data Retention Policy

| Data Type | Retention Period | Notes |
|-----------|------------------|-------|
| Comments (approved) | 365 days | Normal content lifecycle |
| Comments (removed) | 2 years | Extended for audit/appeals |
| Reactions | 365 days | Standard engagement data |
| Flags (resolved) | 365 days | Moderation evidence |
| Flags (high severity) | 2 years | Extended for patterns |
| Moderation cases | 365 days | Operational records |
| Appeals | 365 days | User rights compliance |
| Audit logs | 2 years | Security and compliance |

### Automated Jobs

#### Daily Maintenance
```sql
SELECT run_daily_community_maintenance();
-- Executes: retention cleanup + anomaly detection + health metrics
```

#### Weekly Deep Cleanup  
```sql
SELECT run_weekly_community_deep_cleanup();
-- Executes: extended retention (6 months) + audit log cleanup
```

#### Anomaly Detection
```sql
SELECT detect_community_anomalies(24); -- Last 24 hours
-- Detects: spam users, excessive flagging, duplicate content, reaction bombing
```

## Rate Limiting

### Server-Side Protection

Rate limits are enforced at the database level:

```sql
-- Check if user can perform action
SELECT check_community_rate_limit(user_id, 'comment', 60, 10);
-- Returns: boolean (true = allowed, false = blocked)
```

### Default Limits

| Action | Window | Limit | Escalation |
|--------|--------|-------|------------|
| Comments | 60 minutes | 10 | Auto-flag after 50/hour |
| Reactions | 60 minutes | 200 | Auto-flag after 500/hour |
| Flags | 60 minutes | 10 | Auto-flag after 20/hour |

### Rate Limit Responses

When limits exceeded:
- HTTP 429 "Too Many Requests"
- Safe error messages (no internal details)
- Audit log entry for monitoring

## Privacy & Compliance

### No PII Storage
- User IDs are UUIDs (no direct personal info)
- Comment bodies are user-generated content only
- Evidence references are sanitized (IDs only)
- Author names displayed via profile joins (not stored)

### GDPR Compliance
- **Right to erasure**: Delete all user community content
- **Data minimization**: Only essential fields stored
- **Purpose limitation**: Community engagement only
- **Retention limitation**: Automated cleanup per schedule

### Audit Requirements
- All moderation decisions logged
- Feature flag changes tracked
- User actions recorded (no PII)
- System jobs monitored

## Monitoring & Observability

### Health Metrics

```sql
SELECT get_community_health_metrics(24);
```

Returns:
- Comment counts by status
- Reaction engagement rates  
- Flag volume and reasons
- Moderation performance (avg resolution time)
- Active user counts

### Key Performance Indicators

- **Approval Rate**: approved / (approved + rejected) comments
- **Response Time**: avg time from comment to moderation decision
- **Flag Accuracy**: dismissed / total flags (lower is better)
- **Appeal Rate**: appeals / moderation decisions
- **User Engagement**: active commenters/reactors per day

## Operational Runbooks

### Feature Flag Emergency Disable

```sql
-- Immediate disable (emergency)
UPDATE feature_flags 
SET is_enabled = false 
WHERE feature_key = 'community_enabled';

-- Verify disabled
SELECT is_community_enabled(); -- Should return false
```

### Moderation Queue Management

```sql
-- Check pending queue
SELECT COUNT(*) as pending_cases
FROM community_moderation_cases 
WHERE status = 'pending';

-- High priority cases
SELECT id, subject_ref, taxonomy_reason, created_at
FROM community_moderation_cases 
WHERE status = 'pending' 
AND priority IN ('high', 'urgent')
ORDER BY created_at;

-- Assign case to monitor
UPDATE community_moderation_cases 
SET assigned_to = 'monitor_user_id', assigned_at = now()
WHERE id = case_id;
```

### Spam Response Procedures

```sql
-- Identify spam users (auto-flagged)
SELECT DISTINCT subject_ref 
FROM community_moderation_cases 
WHERE taxonomy_reason = 'spam_detection'
AND status = 'pending';

-- Bulk moderation for confirmed spam
SELECT apply_community_moderation_decision(
  case_id, 'remove', 'admin_user_id', 'Confirmed spam content'
) FROM community_moderation_cases 
WHERE taxonomy_reason = 'spam_detection' 
AND created_at > now() - INTERVAL '1 hour';
```

### Performance Optimization

```sql
-- Reindex community tables (monthly)
REINDEX TABLE community_comments;
REINDEX TABLE community_reactions; 
REINDEX TABLE community_flags;

-- Analyze for query optimization
ANALYZE community_comments;
ANALYZE community_moderation_cases;

-- Check RLS policy performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM community_comments 
WHERE subject_ref = 'order:123';
```

## Testing

### Test Suite Coverage

Run comprehensive tests:
```bash
python test_m24_community.py
```

Test classes:
- `TestM24FeatureFlags` - Feature flag controls
- `TestM24CommunityComments` - Comment lifecycle
- `TestM24CommunityReactions` - Reaction functionality  
- `TestM24CommunityFlags` - Flagging system
- `TestM24ModerationIntegration` - M21 pipeline integration
- `TestM24RetentionAndCleanup` - Data lifecycle
- `TestM24RateLimiting` - Rate limit enforcement
- `TestM24HealthMetrics` - Monitoring functions

### Manual Testing Checklist

**Feature Flag Control:**
- [ ] Community disabled by default
- [ ] Admin can toggle feature flag
- [ ] All endpoints respect flag state
- [ ] No data loss when disabled

**Access Control:**
- [ ] Authors see own content
- [ ] Clients see approved public content only
- [ ] Monitor sees pending/flagged content
- [ ] Admin has full access

**Moderation Flow:**
- [ ] Comments auto-create moderation cases
- [ ] Flags create appropriate cases
- [ ] Decisions update content status
- [ ] Appeals system works

**Privacy & Security:**
- [ ] No PII in community tables
- [ ] RLS policies enforce access control
- [ ] Rate limits prevent abuse
- [ ] Audit trail complete

## Rollback Plan

### Immediate Rollback (Feature Flag)
1. Disable community features: `UPDATE feature_flags SET is_enabled = false WHERE feature_key = 'community_enabled'`
2. Verify all endpoints return 403
3. Data remains intact for future re-enable

### Full Rollback (Schema)
1. Disable feature flag first
2. Export community data if needed: `pg_dump --table community_* dbname`
3. Drop community tables in reverse dependency order
4. Remove community API endpoints
5. Clean up audit logs if desired

**Important**: Never perform destructive rollback without data backup and stakeholder approval.

## Files

- `022_m24_community_schema.sql` - Core schema and functions
- `023_m24_community_rls.sql` - Row-level security policies  
- `024_m24_community_jobs.sql` - Retention and cleanup jobs
- `api.py:8808-9413` - Community API endpoints
- `test_m24_community.py` - Comprehensive test suite