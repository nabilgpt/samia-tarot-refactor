# M28: Secrets & Providers Operations

OWASP-compliant secrets management and provider operations with automated health monitoring, circuit breakers, and secure rotation workflows.

## Overview

M28 provides operational foundation for secure secrets management and provider resilience:
- **Secrets Management**: NIST-aligned key lifecycle with automated rotation scheduling
- **Provider Health**: Continuous monitoring with circuit breaker protection
- **Operational Controls**: Safe provider toggles and maintenance mode
- **Audit Trail**: Complete audit logging for security and compliance
- **Access Control**: Role-based operations management with RLS enforcement

## Architecture

### Secrets Management
- **Centralized Configuration**: All secrets in `secrets_config` with lifecycle metadata
- **Rotation Scheduling**: Automated based on NIST guidelines (daily/weekly/monthly/quarterly/annual)
- **Audit Trail**: Complete rotation history in `secrets_rotation_log`
- **Zero-Downtime**: Rolling rotation with service update tracking

### Provider Operations
- **Health Monitoring**: Continuous health checks with status tracking
- **Circuit Breaker**: Automatic failure protection with configurable thresholds
- **Operational Events**: Incident tracking and operational timeline
- **Safe Toggles**: Emergency disable/enable with audit trail

## Secrets Management

### Configuration Schema

```sql
-- Secrets lifecycle configuration
secrets_config:
  scope: provider name (stripe, twilio, fcm, etc.)
  key_name: specific key identifier
  key_type: api_key, secret_key, private_key, certificate, token, password
  rotation_schedule: daily, weekly, monthly, quarterly, annual, manual
  next_rotation_at: calculated rotation time
  data_classification: public, internal, confidential, restricted
```

### Rotation Schedules (NIST-Aligned)

| Key Type | Default Schedule | Classification | Notes |
|----------|------------------|----------------|-------|
| API Keys | Quarterly | Confidential | External service access |
| Secret Keys | Quarterly | Restricted | Payment/signing keys |
| Private Keys | Annual | Restricted | Certificates and cryptographic keys |
| Tokens | Monthly | Restricted | JWT signing, OAuth tokens |
| Passwords | Quarterly | Restricted | Database and service passwords |

### Rotation Workflow

#### 1. Initiate Rotation
```http
POST /admin/secrets/rotate
{
  "scope": "stripe",
  "key_name": "secret_key",
  "rotation_type": "scheduled",
  "force_rotation": false
}
```

#### 2. Manual Steps (External)
1. Generate new secret using provider's method
2. Update provider configuration with new secret
3. Test new secret functionality
4. Verify services are operational

#### 3. Complete Rotation
```sql
SELECT complete_secret_rotation(
  rotation_id,
  'v2.1', -- new version
  'sha256_hash_of_key', -- fingerprint (not the key itself)
  ARRAY['api_service', 'webhook_handler'], -- affected services
  0 -- downtime in seconds
);
```

### Rotation Security Controls

- **No Secrets in Database**: Only metadata, schedules, and fingerprints stored
- **Audit Trail**: Who rotated what, when, and why
- **Rollback Support**: Track old versions for emergency rollback
- **Service Impact**: Monitor which services use each secret

## Provider Health Monitoring

### Health Status Levels

| Status | Description | Circuit Breaker | Actions |
|--------|-------------|-----------------|---------|
| **healthy** | All checks passing | closed | Normal operations |
| **degraded** | Partial failures | closed | Monitor closely |
| **unhealthy** | Consistent failures | may trip | Investigate immediately |
| **maintenance** | Planned maintenance | open | Use fallbacks |
| **disabled** | Manually disabled | open | Emergency override |

### Circuit Breaker Configuration

```sql
-- Default thresholds (per provider)
circuit_breaker_failure_threshold: 5 failures
circuit_breaker_reset_timeout: 300 seconds (5 minutes)
health_check_interval: 300 seconds (5 minutes)
```

### Circuit Breaker States

1. **Closed** (Normal): Requests pass through, failures tracked
2. **Open** (Failing): All requests blocked, periodic reset attempts
3. **Half-Open** (Testing): Limited requests allowed to test recovery

### Health Check Implementation

```python
# Provider health check with circuit breaker
def check_provider_with_circuit_breaker(provider_name, service_type):
    breaker = get_circuit_breaker(provider_name, service_type)
    
    if not breaker.is_available():
        return {"available": False, "reason": "circuit_breaker_open"}
    
    try:
        response = provider_health_check(provider_name, service_type)
        if response.success:
            breaker.record_success()
            return {"available": True, "response_time": response.time_ms}
        else:
            breaker.record_failure()
            return {"available": False, "error": response.error}
    except Exception as e:
        breaker.record_failure()
        return {"available": False, "error": str(e)}
```

## API Endpoints

### Provider Health Management

```http
GET /admin/providers/health
# Returns: provider status, circuit breaker state, recent events

GET /admin/providers/health?provider=stripe
# Returns: specific provider health details

POST /admin/providers/toggle
{
  "provider_name": "stripe",
  "service_type": "payment", 
  "enabled": false,
  "reason": "Emergency maintenance",
  "maintenance_mode": true
}
```

### Secrets Operations

```http
GET /admin/secrets/status
# Returns: all secrets rotation status and schedules

GET /admin/secrets/status?scope=stripe
# Returns: specific provider secrets

POST /admin/secrets/rotate
{
  "scope": "twilio",
  "key_name": "auth_token",
  "rotation_type": "emergency",
  "force_rotation": true
}
```

### Response Examples

#### Provider Health Response
```json
{
  "providers": [
    {
      "provider": "stripe",
      "service_type": "payment",
      "status": "healthy",
      "circuit_breaker_state": "closed",
      "enabled": true,
      "maintenance_mode": false,
      "response_time_ms": 145,
      "success_rate": 0.9987,
      "failure_count": 0,
      "last_health_check": "2024-01-15T10:30:00Z",
      "available": true
    }
  ],
  "summary": {
    "total_providers": 6,
    "healthy": 5,
    "unhealthy": 0,
    "maintenance": 1,
    "disabled": 0
  }
}
```

#### Secrets Status Response
```json
{
  "secrets": [
    {
      "scope": "stripe",
      "key_name": "secret_key",
      "key_type": "secret_key",
      "rotation_schedule": "quarterly",
      "status": "active",
      "last_rotated_at": "2024-01-01T00:00:00Z",
      "next_rotation_at": "2024-04-01T00:00:00Z",
      "data_classification": "restricted",
      "rotation_due": false
    }
  ],
  "summary": {
    "total_secrets": 9,
    "active": 8,
    "rotating": 1,
    "due_for_rotation": 2
  }
}
```

## Access Control (RLS)

### Role-Based Access Matrix

| Table | Admin/Superadmin | Monitor | Reader | Client |
|-------|------------------|---------|--------|--------|
| `secrets_config` | Full access | None | None | None |
| `secrets_rotation_log` | Full access | Completed only | None | None |
| `provider_health_status` | Full access | Read-only | None | None |
| `provider_operational_events` | Full access | Read-only | None | None |
| `provider_config` | Full access | None | None | None |
| `operational_metrics` | Full access | Read-only | None | None |

### Security Controls

- **Secrets Never Stored**: Database contains only metadata and fingerprints
- **Admin-Only Configuration**: Secrets and provider configs require Admin+ access
- **Monitor Oversight**: Operations team can view health and events
- **System Context**: Automated processes use `system` user context
- **Audit Everything**: All operations logged with actor, timestamp, reason

## Operational Procedures

### Daily Health Monitoring

```sql
-- Check provider health summary
SELECT 
  provider_name,
  service_type,
  status,
  circuit_breaker_state,
  last_health_check,
  CASE 
    WHEN last_health_check < now() - INTERVAL '10 minutes' THEN 'STALE'
    WHEN status != 'healthy' THEN 'ATTENTION'
    ELSE 'OK'
  END as health_status
FROM provider_health_status
ORDER BY health_status DESC, provider_name;

-- Check recent operational events
SELECT 
  provider_name,
  event_type,
  severity,
  summary,
  created_at
FROM provider_operational_events
WHERE created_at >= now() - INTERVAL '24 hours'
AND severity IN ('error', 'critical')
ORDER BY created_at DESC;
```

### Weekly Secrets Review

```sql
-- Check rotation schedule compliance
SELECT 
  scope,
  key_name,
  rotation_schedule,
  last_rotated_at,
  next_rotation_at,
  CASE 
    WHEN next_rotation_at < now() THEN 'OVERDUE'
    WHEN next_rotation_at < now() + INTERVAL '7 days' THEN 'DUE_SOON'
    ELSE 'OK'
  END as rotation_status
FROM secrets_config
WHERE status = 'active'
ORDER BY next_rotation_at;

-- Review recent rotations
SELECT 
  sc.scope,
  sc.key_name,
  srl.rotation_type,
  srl.status,
  srl.initiated_at,
  srl.completed_at,
  srl.downtime_seconds
FROM secrets_rotation_log srl
JOIN secrets_config sc ON sc.id = srl.secret_config_id
WHERE srl.initiated_at >= now() - INTERVAL '7 days'
ORDER BY srl.initiated_at DESC;
```

### Emergency Procedures

#### Provider Emergency Disable

```sql
-- Emergency disable failing provider
SELECT toggle_provider(
  'stripe',           -- provider_name
  'payment',          -- service_type  
  false,              -- enabled
  'Emergency: High error rate detected', -- reason
  'admin_user_id'     -- toggled_by
);

-- Check impact
SELECT COUNT(*) as affected_operations
FROM audit_log 
WHERE entity = 'payment_attempt'
AND created_at >= now() - INTERVAL '1 hour'
AND meta->>'provider' = 'stripe';
```

#### Emergency Secret Rotation

```sql
-- Force immediate rotation (compromise response)
SELECT start_secret_rotation(
  (SELECT id FROM secrets_config WHERE scope = 'stripe' AND key_name = 'secret_key'),
  'emergency',        -- rotation_type
  'admin_user_id',    -- initiated_by
  'INCIDENT_12345'    -- request_id
);

-- After manual key update at provider:
SELECT complete_secret_rotation(
  rotation_id,
  'emergency_v1.0',
  'new_key_fingerprint',
  ARRAY['payment_service', 'webhook_handler'],
  120 -- downtime_seconds during switchover
);
```

### Circuit Breaker Recovery

```sql
-- Check circuit breaker status
SELECT 
  provider_name,
  service_type,
  circuit_breaker_state,
  circuit_breaker_failures,
  circuit_breaker_next_attempt
FROM provider_health_status
WHERE circuit_breaker_state != 'closed';

-- Force circuit breaker reset (after fixing issue)
UPDATE provider_health_status 
SET 
  circuit_breaker_state = 'closed',
  circuit_breaker_failures = 0,
  status = 'healthy'
WHERE provider_name = 'stripe' AND service_type = 'payment';
```

## Monitoring & Alerting

### Key Metrics to Monitor

1. **Provider Availability**
   - Circuit breaker state changes
   - Health check failure rates
   - Response time degradation

2. **Secrets Compliance**
   - Overdue rotations
   - Failed rotation attempts
   - Rotation frequency compliance

3. **Operational Events**
   - Critical/error event volume
   - Provider toggle frequency
   - Manual interventions

### Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|---------|
| Health Check Failures | 3 in 5 min | 5 in 5 min | Investigate/disable |
| Circuit Breaker Trips | Any trip | Multiple trips | Check provider |
| Overdue Rotations | 1 day late | 7 days late | Rotate immediately |
| Response Time | >2s avg | >5s avg | Performance investigation |

### Integration with External Monitoring

```python
# Export metrics for monitoring systems
def export_provider_metrics():
    metrics = []
    
    for provider in get_provider_health_status():
        metrics.extend([
            f"provider_available{{provider=\"{provider.name}\", service=\"{provider.service}\"}} {1 if provider.available else 0}",
            f"provider_response_time{{provider=\"{provider.name}\", service=\"{provider.service}\"}} {provider.response_time_ms}",
            f"provider_circuit_breaker_failures{{provider=\"{provider.name}\", service=\"{provider.service}\"}} {provider.failure_count}"
        ])
    
    return "\n".join(metrics)
```

## Compliance & Security

### OWASP Compliance

- **Secrets Management Cheat Sheet**: All secrets handled per OWASP guidelines
- **No secrets in logs**: Only IDs and fingerprints recorded
- **Least privilege**: Role-based access to operational functions
- **Defense in depth**: Multiple layers of access control

### NIST Key Management

- **Key lifecycle**: Proper generation, distribution, storage, rotation, revocation
- **Key length**: Appropriate lengths per key type and classification
- **Rotation frequency**: Based on NIST SP 800-57 recommendations
- **Audit trail**: Complete lifecycle tracking

### Data Classification

| Classification | Examples | Rotation | Access |
|----------------|----------|----------|---------|
| **Restricted** | Payment keys, signing keys | Quarterly | Superadmin only |
| **Confidential** | API keys, service tokens | Quarterly | Admin+ |
| **Internal** | Config values, non-sensitive tokens | Annual | Admin+ |
| **Public** | Public keys, certificates | Manual | Admin+ |

## Testing

### Test Suite Coverage

Run comprehensive tests:
```bash
python test_m28_ops.py
```

Test classes:
- `TestM28SecretsManagement` - Rotation lifecycle and scheduling
- `TestM28ProviderHealthAndCircuitBreakers` - Health monitoring and circuit breakers
- `TestM28RLSPolicies` - Access control enforcement
- `TestM28APIEndpoints` - API integration and security
- `TestM28OperationalMetrics` - Metrics collection and storage

### Manual Testing Checklist

**Secrets Management:**
- [ ] Rotation schedules calculate correctly
- [ ] Rotation workflow completes successfully
- [ ] Audit trail captures all operations
- [ ] No secrets stored in database

**Provider Health:**
- [ ] Health checks update status correctly
- [ ] Circuit breakers trip on failures
- [ ] Circuit breakers reset after timeout
- [ ] Provider toggles work with audit

**Access Control:**
- [ ] Admin can access all operations
- [ ] Monitor has read-only access to health
- [ ] Clients denied access to ops tables
- [ ] System context works for automation

## Files

- `025_m28_secrets_providers_schema.sql` - Core schema and functions
- `026_m28_ops_rls.sql` - Row-level security policies
- `api.py:9414-9905` - Operations API endpoints
- `test_m28_ops.py` - Comprehensive test suite