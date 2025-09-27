# M29: SRE & Cost Guards

Google SRE-compliant monitoring with golden signals, token bucket rate limiting, circuit breakers for external providers, and FinOps-aligned cost management with automated budget tracking.

## Overview

M29 provides protective measures against load and costs with industry-standard SRE practices:
- **Golden Signals**: Latency, Traffic, Errors, Saturation monitoring per Google SRE guidelines
- **Rate Limiting**: Token bucket algorithm with HTTP 429 semantics and database persistence
- **Circuit Breakers**: Microsoft-pattern circuit breakers for external provider resilience
- **Cost Management**: FinOps Foundation-aligned budget tracking with threshold alerts
- **Incident Management**: SRE incident declaration, escalation, and resolution tracking
- **Health Monitoring**: Continuous service health checks with automated status tracking

## Architecture

### Golden Signals Monitoring

Google SRE's Four Golden Signals implemented with time-windowed aggregation:

```sql
-- Core metrics collection
sre_golden_signals:
  latency_p95_ms: Response time 95th percentile
  request_count: Traffic volume per window  
  error_rate: Error percentage (4xx/5xx responses)
  cpu_usage_percent: Resource saturation metric
```

**Collection Windows**: 1-minute, 5-minute, 1-hour, 1-day aggregations
**Retention**: 1 day (1-min), 7 days (5-min), 30 days (1-hour), 365 days (1-day)

### Token Bucket Rate Limiting

RFC 6585-compliant rate limiting with database-backed token buckets:

```python
class TokenBucket:
    def consume(self, tokens=1):
        now = time.time()
        elapsed = now - self.last_refill
        self.tokens = min(self.bucket_size, 
                         self.tokens + elapsed * self.refill_rate)
        
        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False
```

**Identifier Types**: `ip_address`, `user_id`, `client_id`, `api_key`
**Scopes**: `api_calls`, `file_uploads`, `data_exports`, `admin_operations`
**HTTP 429 Response**: Includes `Retry-After` header with reset time

### Circuit Breaker Pattern

Microsoft Circuit Breaker pattern for external provider protection:

**States**:
- **Closed**: Normal operation, failures tracked
- **Open**: All requests blocked, periodic reset attempts
- **Half-Open**: Limited requests allowed to test recovery

**Thresholds**:
- Failure Threshold: 5 consecutive failures
- Reset Timeout: 300 seconds (5 minutes)
- Half-Open Test Requests: 3 successful calls to close

### FinOps Cost Management

FinOps Foundation-aligned cost tracking with automated budget enforcement:

```sql
-- Budget configuration with alerts
finops_cost_budgets:
  budget_period: monthly, weekly, daily
  budget_amount_cents: Financial limit in cents
  alert_thresholds: [0.8, 0.9, 1.0] (80%, 90%, 100%)
  
-- Real-time usage tracking  
finops_cost_usage:
  service_name: Service generating costs
  cost_type: compute, storage, api_calls, bandwidth
  cost_cents: Actual cost in cents for precision
```

## Rate Limiting Implementation

### Policy Configuration

```http
POST /admin/limits/policy
{
  "identifier_type": "client_id",
  "identifier_value": "mobile_app_v2",
  "scope": "api_calls", 
  "requests_per_minute": 100,
  "burst_allowance": 20,
  "window_minutes": 1
}
```

### Rate Limit Enforcement

```python
# Automatic middleware enforcement
@rate_limit('api_calls')
def api_endpoint():
    # Protected endpoint logic
    return jsonify({"status": "success"})

# Manual checking
result = check_rate_limit('ip_address', client_ip, 'api_calls', 1)
if not result['allowed']:
    return jsonify({
        "error": "Rate limit exceeded", 
        "retry_after": result['retry_after_seconds']
    }), 429
```

### Rate Limit Scopes

| Scope | Default Limit | Burst | Use Case |
|-------|---------------|-------|----------|
| `api_calls` | 1000/hour | 50 | General API access |
| `file_uploads` | 10/minute | 3 | File upload operations |
| `data_exports` | 5/hour | 2 | Large data operations |
| `admin_operations` | 100/hour | 10 | Admin panel actions |
| `auth_attempts` | 5/minute | 0 | Login/registration |

## Circuit Breaker Usage

### Provider Configuration

```sql
-- Configure circuit breaker for external provider
INSERT INTO sre_circuit_breaker_state
(service_name, provider_name, state, failure_threshold, reset_timeout_seconds)
VALUES ('payment', 'stripe', 'closed', 5, 300);
```

### Integration Pattern

```python
def call_external_provider(service, provider, operation):
    if not is_circuit_breaker_available(service, provider):
        raise ServiceUnavailableError(f"{provider} circuit breaker open")
    
    try:
        response = external_api_call(provider, operation)
        update_circuit_breaker(service, provider, True, None)
        return response
    except Exception as e:
        update_circuit_breaker(service, provider, False, str(e))
        raise
```

### Provider Resilience

Circuit breakers protect against:
- **Cascade Failures**: Prevent downstream failures from propagating
- **Resource Exhaustion**: Avoid wasting resources on failing services  
- **Response Time Degradation**: Fast-fail when providers are slow
- **Thundering Herd**: Controlled recovery prevents overloading recovering services

## Golden Signals Monitoring

### Metrics Collection

Automated collection via background job:

```python
def collect_golden_signals():
    services = ['api_service', 'payment_service', 'notification_service']
    
    for service in services:
        metrics = {
            'latency_p95_ms': calculate_p95_latency(service),
            'request_count': count_requests(service), 
            'error_rate': calculate_error_rate(service),
            'cpu_usage_percent': get_cpu_usage(service)
        }
        
        store_golden_signals(service, metrics)
```

### Alert Thresholds

| Signal | Warning | Critical | Duration |
|--------|---------|----------|----------|
| **Latency P95** | >500ms | >2000ms | 5 minutes |
| **Error Rate** | >1% | >5% | 2 minutes |
| **CPU Usage** | >70% | >90% | 5 minutes |
| **Request Drop** | -50% | -80% | 3 minutes |

### Service Health Matrix

```sql
-- Service health overview
SELECT 
  service_name,
  CASE 
    WHEN latency_p95_ms > 2000 OR error_rate > 0.05 THEN 'critical'
    WHEN latency_p95_ms > 500 OR error_rate > 0.01 THEN 'warning'  
    ELSE 'healthy'
  END as health_status,
  latency_p95_ms,
  error_rate,
  cpu_usage_percent
FROM sre_golden_signals
WHERE window_start >= now() - interval '5 minutes';
```

## Cost Management

### Budget Planning

```http
POST /admin/budget
{
  "budget_name": "Q1 API Infrastructure",
  "service_name": "api_service",
  "budget_period": "monthly", 
  "budget_amount_cents": 500000,
  "alert_thresholds": [0.75, 0.90, 1.0]
}
```

### Cost Tracking

```python
# Track API usage costs
def track_api_cost(service, request_count, compute_time_ms):
    cost_per_request = 0.001  # $0.001 per request
    cost_per_compute_ms = 0.00001  # $0.00001 per ms
    
    total_cost_cents = int(
        (request_count * cost_per_request + 
         compute_time_ms * cost_per_compute_ms) * 100
    )
    
    update_cost_usage(service, 'api_calls', total_cost_cents, {
        'requests': request_count,
        'compute_time_ms': compute_time_ms
    })
```

### Budget Alerts

Automatic alert generation when thresholds are exceeded:

```sql
-- Alert on budget threshold breach
CREATE OR REPLACE FUNCTION check_budget_thresholds() 
RETURNS void AS $$
DECLARE
  budget_record record;
  current_usage bigint;
  threshold_percent decimal;
BEGIN
  FOR budget_record IN 
    SELECT * FROM finops_cost_budgets WHERE is_active = true
  LOOP
    -- Calculate current period usage
    SELECT COALESCE(SUM(cost_cents), 0) INTO current_usage
    FROM finops_cost_usage 
    WHERE service_name = budget_record.service_name
    AND usage_date >= date_trunc(budget_record.budget_period, now());
    
    -- Check each threshold
    FOREACH threshold_percent IN ARRAY budget_record.alert_thresholds
    LOOP
      IF current_usage >= (budget_record.budget_amount_cents * threshold_percent) THEN
        INSERT INTO finops_cost_alerts 
        (budget_name, service_name, severity, current_usage_cents, 
         budget_amount_cents, threshold_percent)
        VALUES (
          budget_record.budget_name,
          budget_record.service_name,
          CASE WHEN threshold_percent >= 1.0 THEN 'critical'
               WHEN threshold_percent >= 0.9 THEN 'warning'  
               ELSE 'info' END,
          current_usage,
          budget_record.budget_amount_cents,
          threshold_percent
        )
        ON CONFLICT (budget_name, threshold_percent) DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

## Incident Management

### Incident Declaration

```http
POST /admin/incident/declare
{
  "title": "High API Error Rate",
  "description": "API error rate exceeded 5% threshold for 10 minutes",
  "severity": "critical",
  "affected_service": "api_service",
  "context": {
    "error_rate": 0.087,
    "threshold": 0.05,
    "duration_minutes": 10
  }
}
```

### Incident Lifecycle

1. **Declaration**: Automatic or manual incident creation
2. **Escalation**: Severity-based notification routing
3. **Investigation**: Timeline tracking and status updates
4. **Resolution**: Root cause analysis and resolution notes
5. **Post-Mortem**: Lessons learned and improvement actions

### Severity Levels

| Severity | Response Time | Escalation | Examples |
|----------|---------------|------------|----------|
| **Critical** | 15 minutes | Immediate | Service down, data loss, security breach |
| **Major** | 1 hour | 30 minutes | Feature broken, performance degraded |
| **Minor** | 4 hours | 2 hours | Cosmetic issues, minor bugs |
| **Info** | 24 hours | None | Maintenance notices, upgrades |

## API Endpoints

### Health Overview

```http
GET /admin/health/overview
Authorization: Admin/Superadmin

Response:
{
  "golden_signals": [
    {
      "service": "api_service", 
      "latency_p95_ms": 145.5,
      "request_count": 15000,
      "error_rate": 0.0023,
      "cpu_usage": 45.67,
      "health_status": "healthy"
    }
  ],
  "circuit_breakers": [
    {
      "service": "payment",
      "provider": "stripe", 
      "state": "closed",
      "failure_count": 0,
      "available": true
    }
  ],
  "active_incidents": [
    {
      "id": "INC-2024-001",
      "title": "Database Connection Pool Exhaustion", 
      "severity": "major",
      "affected_service": "api_service",
      "created_at": "2024-01-15T14:30:00Z"
    }
  ]
}
```

### Budget Management

```http
GET /admin/budget
Authorization: Admin/Superadmin

Response:
{
  "budgets": [
    {
      "budget_name": "API Service Monthly",
      "service_name": "api_service",
      "budget_period": "monthly",
      "budget_amount_cents": 50000,
      "current_usage_cents": 32000,
      "utilization_percent": 64.0,
      "alert_thresholds": [0.8, 0.9, 1.0],
      "status": "healthy"
    }
  ],
  "total_budget_cents": 200000,
  "total_usage_cents": 145000,
  "overall_utilization": 72.5
}
```

### Rate Limit Testing

```http
POST /admin/limits/test
Authorization: Admin/Superadmin
{
  "identifier_type": "ip_address",
  "identifier_value": "192.168.1.100", 
  "scope": "api_calls",
  "requests": 5
}

Response:
{
  "allowed": true,
  "tokens_remaining": 45.0,
  "reset_time": "2024-01-15T15:01:00Z",
  "retry_after_seconds": null
}
```

### Incident Operations

```http
POST /admin/incident/declare
Authorization: Admin/Superadmin
{
  "title": "Database Performance Degradation",
  "description": "Query response times increased 300%",
  "severity": "major", 
  "affected_service": "database",
  "context": {"avg_response_ms": 450, "normal_ms": 150}
}

Response:
{
  "incident_id": "INC-2024-002",
  "status": "created",
  "escalation_level": "major",
  "assigned_to": null
}

PUT /admin/incident/{incident_id}/resolve  
{
  "resolution_notes": "Optimized slow queries and added indexes",
  "root_cause": "Missing database index on user_sessions.created_at"
}
```

## Access Control (RLS)

### Role-Based Access Matrix

| Table | Admin/Superadmin | Monitor | Reader | Client |
|-------|------------------|---------|--------|--------|
| `sre_golden_signals` | Full access | Read-only | Public services only | None |
| `sre_rate_limits` | Full access | Read-only | None | None |
| `sre_circuit_breaker_state` | Full access | Read-only | None | None |
| `finops_cost_budgets` | Full access | None | None | None |
| `finops_cost_usage` | Full access | Read-only | None | None |
| `finops_cost_alerts` | Full access | Read-only | None | None |
| `sre_incidents` | Full access | Read-only | None | None |
| `sre_health_checks` | Full access | Read-only | None | None |

### Security Controls

- **Sensitive Financial Data**: Budget configurations restricted to Admin+ only
- **Operational Oversight**: Monitor role can view health and incidents
- **Public Metrics**: Reader can access non-sensitive service metrics
- **System Automation**: System user can update metrics and health status
- **Audit Trail**: All operations logged with actor, timestamp, and reason

## Operational Procedures

### Daily SRE Health Check

```sql
-- Golden signals health summary
SELECT 
  service_name,
  avg(latency_p95_ms) as avg_latency,
  sum(request_count) as total_requests,
  avg(error_rate) as avg_error_rate,
  avg(cpu_usage_percent) as avg_cpu,
  CASE 
    WHEN avg(error_rate) > 0.05 THEN 'CRITICAL'
    WHEN avg(latency_p95_ms) > 500 THEN 'WARNING'
    WHEN avg(cpu_usage_percent) > 80 THEN 'WARNING'
    ELSE 'HEALTHY'
  END as health_status
FROM sre_golden_signals 
WHERE window_start >= now() - interval '1 hour'
GROUP BY service_name
ORDER BY health_status DESC, service_name;
```

### Circuit Breaker Monitoring

```sql
-- Check circuit breaker states
SELECT 
  service_name,
  provider_name,
  state,
  failure_count,
  last_failure_at,
  CASE 
    WHEN state = 'open' AND next_attempt_at < now() THEN 'READY_FOR_RETRY'
    WHEN state = 'open' THEN 'BLOCKED'
    WHEN failure_count >= failure_threshold * 0.8 THEN 'WARNING'
    ELSE 'HEALTHY'
  END as status
FROM sre_circuit_breaker_state
ORDER BY status DESC, last_failure_at DESC;
```

### Weekly Budget Review

```sql  
-- Budget utilization report
SELECT 
  cb.budget_name,
  cb.service_name,
  cb.budget_amount_cents / 100.0 as budget_dollars,
  COALESCE(usage.current_usage_cents, 0) / 100.0 as spent_dollars,
  ROUND(
    COALESCE(usage.current_usage_cents, 0)::decimal / 
    cb.budget_amount_cents * 100, 2
  ) as utilization_percent,
  CASE 
    WHEN COALESCE(usage.current_usage_cents, 0) >= cb.budget_amount_cents THEN 'OVER_BUDGET'
    WHEN COALESCE(usage.current_usage_cents, 0) >= cb.budget_amount_cents * 0.9 THEN 'HIGH_USAGE'
    WHEN COALESCE(usage.current_usage_cents, 0) >= cb.budget_amount_cents * 0.75 THEN 'MODERATE_USAGE'
    ELSE 'LOW_USAGE'
  END as status
FROM finops_cost_budgets cb
LEFT JOIN (
  SELECT 
    service_name,
    SUM(cost_cents) as current_usage_cents
  FROM finops_cost_usage
  WHERE usage_date >= date_trunc('month', now())
  GROUP BY service_name
) usage ON cb.service_name = usage.service_name
WHERE cb.is_active = true
ORDER BY utilization_percent DESC;
```

### Emergency Procedures

#### Circuit Breaker Recovery

```sql
-- Force reset circuit breaker after fixing issue
UPDATE sre_circuit_breaker_state 
SET 
  state = 'closed',
  failure_count = 0,
  last_failure_at = NULL,
  next_attempt_at = NULL
WHERE service_name = 'payment' AND provider_name = 'stripe';
```

#### Emergency Rate Limit Adjustment

```sql
-- Temporarily increase rate limits during high load
UPDATE sre_rate_limits
SET 
  requests_per_minute = requests_per_minute * 2,
  burst_allowance = burst_allowance * 2  
WHERE scope = 'api_calls'
AND identifier_type = 'client_id'
AND identifier_value = 'mobile_app_v2';
```

#### Budget Emergency Override

```sql
-- Temporarily increase budget for critical operations
UPDATE finops_cost_budgets
SET 
  budget_amount_cents = budget_amount_cents * 1.5,
  alert_thresholds = ARRAY[0.9, 0.95, 1.2] -- Adjust thresholds
WHERE service_name = 'api_service' 
AND budget_period = 'monthly';
```

## Monitoring & Alerting

### Key SRE Metrics

1. **Service Level Indicators (SLIs)**
   - Availability: 99.9% uptime target
   - Latency: 95th percentile < 500ms
   - Error Rate: < 0.1% error budget
   - Throughput: Handle expected load + 20%

2. **Rate Limiting Health**
   - HTTP 429 response rate
   - Token bucket exhaustion frequency
   - Client distribution fairness
   - Burst usage patterns

3. **Circuit Breaker Health**
   - Open circuit duration
   - Failure threshold trends
   - Recovery success rates
   - Provider availability correlation

4. **Cost Efficiency**
   - Cost per transaction
   - Budget utilization trends
   - Service cost attribution
   - Waste identification

### Alert Integration

```python
# Export SRE metrics for external monitoring
def export_sre_metrics():
    metrics = []
    
    # Golden signals
    for signal in get_golden_signals():
        metrics.extend([
            f'sre_latency_p95{{service="{signal.service}"}} {signal.latency_p95_ms}',
            f'sre_request_rate{{service="{signal.service}"}} {signal.request_count}',
            f'sre_error_rate{{service="{signal.service}"}} {signal.error_rate}',
            f'sre_cpu_usage{{service="{signal.service}"}} {signal.cpu_usage_percent}'
        ])
    
    # Circuit breakers  
    for cb in get_circuit_breaker_states():
        state_numeric = {'closed': 0, 'half_open': 1, 'open': 2}[cb.state]
        metrics.append(
            f'sre_circuit_breaker_state{{service="{cb.service}",provider="{cb.provider}"}} {state_numeric}'
        )
    
    # Rate limiting
    for limit in get_rate_limit_usage():
        utilization = (limit.used_tokens / limit.bucket_size) if limit.bucket_size > 0 else 0
        metrics.append(
            f'sre_rate_limit_utilization{{scope="{limit.scope}",type="{limit.identifier_type}"}} {utilization}'
        )
    
    return '\n'.join(metrics)
```

## Testing

### Test Suite Coverage

Run comprehensive SRE tests:
```bash
python test_m29_sre_cost.py
```

Test classes:
- `TestM29SREMonitoring` - Golden signals and health monitoring
- `TestM29RateLimiting` - Token bucket algorithm and policy enforcement
- `TestM29CircuitBreakers` - Circuit breaker states and recovery
- `TestM29CostManagement` - Budget tracking and alert generation
- `TestM29RLSPolicies` - Access control enforcement
- `TestM29APIEndpoints` - API integration and security

### Load Testing Checklist

**Rate Limiting:**
- [ ] Token bucket refills correctly under load
- [ ] HTTP 429 responses include proper headers
- [ ] Burst allowance works as expected
- [ ] Different scopes don't interfere

**Circuit Breakers:**
- [ ] Failure threshold triggers opening
- [ ] Half-open state limits requests correctly
- [ ] Recovery transitions to closed state
- [ ] Provider failure doesn't cascade

**Golden Signals:**
- [ ] Metrics collection handles high throughput
- [ ] Aggregation windows calculate correctly  
- [ ] Alert thresholds trigger appropriately
- [ ] Historical data retention works

**Cost Tracking:**
- [ ] Usage recording is accurate and atomic
- [ ] Budget calculations include all services
- [ ] Alert generation matches thresholds
- [ ] Financial precision maintained (cents)

## Files

- `027_m29_sre_cost_schema.sql` - Core schema with golden signals, rate limits, circuit breakers, cost budgets
- `028_m29_sre_rls.sql` - Row-level security policies for SRE operations
- `api.py:9906-10422` - SRE API endpoints for health overview, budget management, incident declaration
- `test_m29_sre_cost.py` - Comprehensive test suite covering all SRE functionality
- `SRE_COST_README.md` - This documentation with operational procedures and runbooks

## Integration

M29 integrates with existing modules:
- **M28 (Secrets & Providers)**: Circuit breakers protect provider operations
- **M21 (Moderation & Audit)**: Rate limiting protects against abuse
- **M20 (Payments Matrix)**: Cost tracking includes payment provider fees
- **M18A (TZ Cohorts)**: Golden signals monitor cohort processing performance

## Compliance

- **Google SRE Practices**: Four golden signals, SLI/SLO methodology, error budgets
- **RFC 6585**: HTTP 429 Too Many Requests with Retry-After headers
- **FinOps Foundation**: Cost visibility, budgets, accountability, optimization
- **Microsoft Circuit Breaker**: State management, failure detection, recovery patterns
- **OWASP Rate Limiting**: Protection against DoS, resource exhaustion, abuse