# SAMIA-TAROT Security Guide

## Row Level Security (RLS)

### RLS Implementation
The platform uses PostgreSQL Row Level Security policies on 7 critical tables:
- `profiles`, `orders`, `media_assets`, `calls`
- `horoscopes`, `moderation_actions`, `assist_drafts`

### Service Role Bypass
**Important**: The API uses Supabase Session Pooler with Service Role, which **bypasses RLS by design**. Application-level permission checks in `api.py` provide the actual access control:

```python
def get_user_role(user_id: str) -> str:
    # Returns: 'client', 'reader', 'monitor', 'admin', 'superadmin'
```

### Permission Matrix
- **Client**: Own profile/orders only
- **Reader**: Assigned orders + AI assist tools
- **Monitor**: All content + moderation actions
- **Admin**: User management + ops monitoring  
- **SuperAdmin**: Full system access + raw PII exports

## Rate Limiting

### Token Bucket Algorithm
Rate limits stored in `api_rate_limits` table with token bucket implementation:
- **Window-based**: Sliding windows (e.g., 3600 seconds = 1 hour)
- **Per-user**: Separate buckets for each user + endpoint combination
- **Configurable**: Admins can update limits via `/api/ops/rate_limits`

### Default Limits
```
Orders creation: 10/hour
Phone verification: 5/hour  
AI assist drafts: 10/hour
AI assist search: 20/hour
Knowledge additions: 5/hour (admin only)
```

### Rate Limit Tuning
```bash
curl -X POST /api/ops/rate_limits \
  -H "X-User-ID: <admin-uuid>" \
  -d '{"rate_orders_per_hour": 15, "rate_phone_verify_per_hour": 3}'
```

## Secrets Management

### Environment Variables Only
**Never commit secrets to repository**. All sensitive data via OS environment:

```bash
# Required
export DB_DSN="postgresql://..."
export TWILIO_ACCOUNT_SID="AC..."  
export TWILIO_AUTH_TOKEN="..."

# Optional (HTTP 503 if missing)
export DEEPCONF_API_KEY="..."
export SEMANTIC_API_KEY="..."
```

### Credential Rotation
1. Update environment variable
2. Restart API service
3. No code changes required

### Job Token Security
Cron endpoints use `X-Job-Token` header:
```bash
export JOB_TOKEN="$(openssl rand -hex 32)"
```

**Rotation procedure**:
1. Generate new token: `openssl rand -hex 32`
2. Update server environment
3. Update cron templates
4. Restart scheduled tasks

## PII Protection

### Default Masking
All data exports default to masked PII:
- **Emails**: `user@example.com` → `us***@example.com`
- **Phones**: `+1234567890` → `+12***90`

### Raw PII Access
**SuperAdmin only** can request unmasked exports:
```json
{
  "range": {"from": "2025-09-01", "to": "2025-09-07"},
  "entities": ["orders"],
  "pii": "raw"
}
```

**Access Control**:
- Non-admin: 403 Forbidden  
- Admin with `"pii": "raw"`: 403 Forbidden
- SuperAdmin with `"pii": "raw"`: Allowed

### Audit Trail
All PII access logged to `audit_log`:
```json
{
  "event": "ops_export",
  "meta": {
    "pii_mode": "raw",
    "export_counts": {"orders": 150}
  }
}
```

## Access Control

### Header-Based Authentication
All endpoints require `X-User-ID` header:
```bash
curl -H "X-User-ID: <uuid>" /api/orders
```

### Role Validation
Each endpoint checks user role:
```python
role = get_user_role(user_id)
if role not in ['admin', 'superadmin']:
    raise HTTPException(status_code=403, detail="Admin access required")
```

### Internal-Only Endpoints
AI assist endpoints restricted to staff:
- `/api/assist/*` - Reader/Admin/SuperAdmin only
- `/api/ops/*` - Admin/SuperAdmin only  
- `/api/mod/unblock` - Admin/SuperAdmin only

## Blocking & Moderation

### User Blocking
Monitors can block clients/readers:
```bash
POST /api/mod/block
{
  "target_id": "<user-uuid>",
  "target_kind": "profile", 
  "reason": "Inappropriate behavior"
}
```

### Unblocking (Admin Only)
```bash  
POST /api/mod/unblock
{
  "target_id": "<user-uuid>",
  "target_kind": "profile"
}
```

### Call Termination
Monitors can drop live calls:
```bash
POST /api/calls/terminate
{
  "order_id": 123,
  "reason": "dropped_by_monitor"
}
```

## Database Security

### Connection Security
- **Session Pooler**: Encrypted connections via TLS
- **Connection Pooling**: 1-5 connections per worker
- **Query Parameterization**: All queries use `%s` parameters (no SQL injection)

### Audit Logging
All significant actions logged:
```sql
INSERT INTO audit_log(actor, event, entity, entity_id, meta, created_at)
VALUES (%s, %s, %s, %s, %s, %s)
```

**Logged Events**:
- Order lifecycle, content approval, user blocking
- PII exports, config changes, auth events
- Call sessions, moderation actions

### Data Retention
- **Audit logs**: 50+ days (configurable via cron)
- **Rate limit data**: 7 days rolling window
- **Media assets**: Linked to orders (retained with orders)

## Monitoring & Alerting

### Health Checks
```bash
GET /api/ops/snapshot?days=1
GET /api/ops/metrics?days=1
```

### Rate Limit Monitoring
Track rate limit hits:
```sql
SELECT COUNT(*) FROM api_rate_limits 
WHERE last_request >= NOW() - INTERVAL '1 hour' 
AND tokens_available <= 0;
```

### Security Events
Monitor audit log for suspicious patterns:
- Multiple failed auth attempts
- Unusual admin actions
- High-volume API usage

## Incident Response

### User Compromise
1. Block user: `POST /api/mod/block`
2. Review audit trail: `GET /api/ops/export` (audit entity)
3. Reset credentials via Supabase Auth
4. Unblock after verification: `POST /api/mod/unblock`

### API Key Compromise  
1. Rotate affected service keys (Twilio, AI providers)
2. Update environment variables
3. Restart API service
4. Monitor for unauthorized usage

### Database Access
Session Pooler credentials are read-only. For emergency access:
1. Use Supabase dashboard
2. Review audit logs via SQL
3. Apply emergency blocks via direct SQL if needed