# Monitoring & Alerts Configuration

## Overview
Comprehensive monitoring strategy based on Google's Golden Signals plus business-specific metrics.

## Golden Signals

### 1. Latency
**Metric:** Response time distribution (p50, p95, p99)

**Targets:**
- p50 ≤ 45ms
- p95 ≤ 120ms
- p99 ≤ 250ms

**Implementation:**
```python
from prometheus_client import Histogram

api_latency = Histogram(
    'api_request_duration_seconds',
    'API request duration',
    ['endpoint', 'method', 'status'],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

@app.middleware("http")
async def track_latency(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start

    api_latency.labels(
        endpoint=request.url.path,
        method=request.method,
        status=response.status_code
    ).observe(duration)

    return response
```

**Alerts:**
```yaml
- alert: HighP95Latency
  expr: histogram_quantile(0.95, api_request_duration_seconds) > 0.250
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "p95 latency exceeds 250ms"

- alert: HighP99Latency
  expr: histogram_quantile(0.99, api_request_duration_seconds) > 0.500
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "p99 latency exceeds 500ms"
```

---

### 2. Traffic
**Metric:** Requests per minute

**Target:** Monitor for anomalies (sudden spikes or drops)

**Implementation:**
```python
from prometheus_client import Counter

api_requests = Counter(
    'api_requests_total',
    'Total API requests',
    ['endpoint', 'method', 'status']
)

@app.middleware("http")
async def track_traffic(request: Request, call_next):
    response = await call_next(request)

    api_requests.labels(
        endpoint=request.url.path,
        method=request.method,
        status=response.status_code
    ).inc()

    return response
```

**Alerts:**
```yaml
- alert: TrafficSpike
  expr: rate(api_requests_total[5m]) > 1000
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Traffic spike detected (>1000 req/min)"

- alert: TrafficDrop
  expr: rate(api_requests_total[5m]) < 10
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "Traffic drop detected (<10 req/min)"
```

---

### 3. Errors
**Metric:** Error rate (4xx, 5xx responses)

**Targets:**
- 4xx rate ≤ 5%
- 5xx rate ≤ 1%

**Implementation:**
```python
from prometheus_client import Counter

api_errors = Counter(
    'api_errors_total',
    'Total API errors',
    ['endpoint', 'status']
)

@app.middleware("http")
async def track_errors(request: Request, call_next):
    response = await call_next(request)

    if response.status_code >= 400:
        api_errors.labels(
            endpoint=request.url.path,
            status=response.status_code
        ).inc()

    return response
```

**Alerts:**
```yaml
- alert: HighErrorRate
  expr: |
    sum(rate(api_errors_total{status=~"5.."}[5m])) /
    sum(rate(api_requests_total[5m])) > 0.01
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "5xx error rate exceeds 1%"

- alert: High4xxRate
  expr: |
    sum(rate(api_errors_total{status=~"4.."}[5m])) /
    sum(rate(api_requests_total[5m])) > 0.05
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "4xx error rate exceeds 5%"
```

---

### 4. Saturation
**Metric:** Resource utilization (CPU, memory, disk, connections)

**Targets:**
- CPU ≤ 70%
- Memory ≤ 80%
- DB connections ≤ 80% pool size

**Implementation:**
```python
from prometheus_client import Gauge

cpu_usage = Gauge('system_cpu_usage_percent', 'CPU usage percentage')
memory_usage = Gauge('system_memory_usage_percent', 'Memory usage percentage')
db_connections = Gauge('db_active_connections', 'Active database connections')
```

**Alerts:**
```yaml
- alert: HighCPUUsage
  expr: system_cpu_usage_percent > 70
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "CPU usage exceeds 70%"

- alert: HighMemoryUsage
  expr: system_memory_usage_percent > 80
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Memory usage exceeds 80%"

- alert: DBConnectionSaturation
  expr: db_active_connections / db_max_connections > 0.8
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Database connection pool near saturation"
```

---

## Business Metrics

### Orders
```python
from prometheus_client import Gauge

orders_pending = Gauge('orders_pending_total', 'Pending orders')
orders_completed_today = Gauge('orders_completed_today', 'Orders completed today')
orders_revenue_today = Gauge('orders_revenue_today_usd', 'Revenue today (USD)')
```

**Alerts:**
```yaml
- alert: OrderBacklog
  expr: orders_pending_total > 50
  for: 30m
  labels:
    severity: warning
  annotations:
    summary: "Order backlog exceeds 50"

- alert: NoOrdersCompleted
  expr: rate(orders_completed_today[1h]) == 0
  for: 2h
  labels:
    severity: warning
  annotations:
    summary: "No orders completed in last 2 hours"
```

### Rate Limiting
```python
rate_limit_429 = Counter(
    'rate_limit_exceeded_total',
    'Rate limit violations',
    ['endpoint', 'role']
)
```

**Alerts:**
```yaml
- alert: RateLimitSpike
  expr: sum(rate(rate_limit_exceeded_total[5m])) > 10
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Rate limit violations spike (>10/sec)"

- alert: SustainedRateLimitAbuse
  expr: sum(rate(rate_limit_exceeded_total[15m])) > 5
  for: 15m
  labels:
    severity: critical
  annotations:
    summary: "Sustained rate limit abuse for 15+ minutes"
```

### Payments
```python
payment_failures = Counter(
    'payment_failures_total',
    'Failed payment attempts',
    ['reason']
)
```

**Alerts:**
```yaml
- alert: PaymentProviderDown
  expr: sum(rate(payment_failures_total{reason="provider_unavailable"}[5m])) > 1
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Payment provider appears to be down"

- alert: HighPaymentFailureRate
  expr: |
    sum(rate(payment_failures_total[10m])) /
    sum(rate(payment_attempts_total[10m])) > 0.1
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "Payment failure rate exceeds 10%"
```

---

## API Endpoints for Monitoring

### GET /api/ops/health
**Purpose:** Liveness check (K8s/Docker health probe)

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-27T12:00:00Z",
  "version": "1.0.0"
}
```

**Alert:**
```yaml
- alert: ServiceDown
  expr: up{job="api"} == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "API service is down"
```

---

### GET /api/ops/snapshot
**Purpose:** Real-time platform state

**Auth:** admin, superadmin

**Response:**
```json
{
  "active_orders": 23,
  "active_calls": 2,
  "pending_reviews": 5,
  "system_load": 0.45,
  "storage_used_mb": 12450,
  "timestamp": "2025-09-27T12:00:00Z"
}
```

---

### GET /api/ops/metrics
**Purpose:** Detailed golden signals + business metrics

**Auth:** admin, superadmin

**Response:**
```json
{
  "golden_signals": {
    "latency_p50_ms": 45,
    "latency_p95_ms": 120,
    "latency_p99_ms": 250,
    "error_rate_4xx": 0.03,
    "error_rate_5xx": 0.005,
    "requests_per_minute": 450,
    "cpu_usage_percent": 55,
    "memory_usage_percent": 68,
    "db_connections_active": 12,
    "db_connections_max": 20
  },
  "business_metrics": {
    "orders_pending": 12,
    "orders_completed_today": 156,
    "total_revenue_today_usd": 4280.50,
    "active_calls": 2
  },
  "rate_limits": {
    "total_429_today": 8,
    "total_429_last_hour": 2,
    "top_limited_ips": [
      {"ip": "192.168.1.1", "count": 3},
      {"ip": "10.0.0.5", "count": 2}
    ]
  },
  "timestamp": "2025-09-27T12:00:00Z"
}
```

---

## Alerting Channels

### PagerDuty (Critical Alerts)
- Service down
- p99 latency > 500ms
- 5xx error rate > 1%
- DB connection saturation
- Payment provider down

### Slack (Warning Alerts)
- p95 latency > 250ms
- 4xx error rate > 5%
- Traffic spike/drop
- Rate limit spike
- Order backlog > 50

### Email (Daily Digest)
- Summary of 24h metrics
- Total 429 count
- Top endpoints by latency
- Revenue summary

---

## Dashboard Layout (Grafana)

### Overview Dashboard
- **Row 1:** Golden Signals (Latency, Traffic, Errors, Saturation)
- **Row 2:** Business Metrics (Orders, Revenue, Active Calls)
- **Row 3:** Rate Limiting (429 counters, top violators)

### Endpoint Detail Dashboard
- Per-endpoint latency distribution
- Per-endpoint error rates
- Per-endpoint traffic volume
- Slowest endpoints table

### Infrastructure Dashboard
- CPU/Memory usage
- DB connection pool
- Storage usage
- Network I/O

---

## Retention Policies

### Prometheus
- Raw metrics: 30 days
- Aggregated (5m): 90 days
- Aggregated (1h): 1 year

### Logs
- Application logs: 30 days
- Audit logs: 7 years (immutable)
- Access logs: 90 days

---

## Runbook Links

All alerts MUST include runbook links:
```yaml
annotations:
  summary: "High p95 latency"
  runbook_url: "https://wiki.example.com/runbooks/high-latency"
```

---

## Testing Monitoring

### Simulate High Latency
```bash
# Add artificial delay to test alert
curl -X POST http://localhost:5000/api/test/delay -d '{"seconds": 2}'
```

### Simulate 5xx Errors
```bash
# Trigger 500 response
curl -X POST http://localhost:5000/api/test/error -d '{"status": 500}'
```

### Verify Alerts Fire
```bash
# Check Prometheus rules
curl http://localhost:9090/api/v1/rules | jq '.data.groups[].rules[] | select(.alerts | length > 0)'
```

---

## Checklist

- [ ] Golden Signals instrumented (Latency, Traffic, Errors, Saturation)
- [ ] Business metrics exposed (/api/ops/metrics)
- [ ] Prometheus scraping configured
- [ ] Grafana dashboards created
- [ ] Alerting rules defined
- [ ] PagerDuty integration configured
- [ ] Slack integration configured
- [ ] Runbook links added to all alerts
- [ ] Retention policies configured
- [ ] Health check endpoint responds < 100ms
- [ ] Metrics endpoint requires authentication
- [ ] No PII in metrics or logs