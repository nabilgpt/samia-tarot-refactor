# 429 Rate Limiting Implementation

## Overview
Implement rate limiting to protect against abuse and ensure fair resource allocation across all API endpoints.

## Rate Limit Tiers

### Public (Unauthenticated)
- **Limit:** 100 requests/minute per IP
- **Applies to:** `/api/horoscopes/daily`, `/api/ops/health`, `/api/auth/sync`
- **Window:** Sliding 60-second window
- **Key:** Client IP address

### Authenticated (Client/Reader)
- **Limit:** 300 requests/minute per user
- **Applies to:** All authenticated endpoints
- **Window:** Sliding 60-second window
- **Key:** User ID from JWT

### Admin/Superadmin
- **Limit:** 1000 requests/minute per user
- **Applies to:** All endpoints including ops/export
- **Window:** Sliding 60-second window
- **Key:** User ID from JWT

### Special Endpoints
- **POST /api/verify/phone:** 5 requests/hour per phone number
- **POST /api/orders:** 20 requests/hour per user
- **POST /api/payments/intent:** 10 requests/hour per user

## Response Format

### 429 Response Body
```json
{
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please try again later.",
  "details": {
    "limit": 100,
    "window": "1 minute",
    "retry_after": 45
  },
  "correlation_id": "uuid-v4"
}
```

### 429 Response Headers
```
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1695822345
Retry-After: 45
```

## Implementation

### Python (FastAPI)
```python
from fastapi import Request, HTTPException
from datetime import datetime, timedelta
import redis

redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

async def rate_limit_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)

    user_id = request.state.user_id if hasattr(request.state, 'user_id') else None
    ip = request.client.host

    key = f"rate_limit:{user_id or ip}"
    limit, window = get_limit_for_user(request)

    current = redis_client.incr(key)

    if current == 1:
        redis_client.expire(key, window)

    ttl = redis_client.ttl(key)

    if current > limit:
        raise HTTPException(
            status_code=429,
            detail={
                "code": "RATE_LIMIT_EXCEEDED",
                "message": "Too many requests",
                "details": {
                    "limit": limit,
                    "window": f"{window} seconds",
                    "retry_after": ttl
                }
            },
            headers={
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int(datetime.now().timestamp()) + ttl),
                "Retry-After": str(ttl)
            }
        )

    remaining = limit - current
    response = await call_next(request)

    response.headers["X-RateLimit-Limit"] = str(limit)
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    response.headers["X-RateLimit-Reset"] = str(int(datetime.now().timestamp()) + ttl)

    return response

def get_limit_for_user(request: Request) -> tuple[int, int]:
    if hasattr(request.state, 'user_role'):
        role = request.state.user_role
        if role in ['admin', 'superadmin']:
            return (1000, 60)
        elif role in ['client', 'reader', 'monitor']:
            return (300, 60)

    path = request.url.path
    if path == "/api/verify/phone":
        return (5, 3600)
    elif path == "/api/orders" and request.method == "POST":
        return (20, 3600)
    elif path == "/api/payments/intent" and request.method == "POST":
        return (10, 3600)

    return (100, 60)
```

### Nginx Rate Limiting (Defense in Depth)
```nginx
http {
    limit_req_zone $binary_remote_addr zone=public:10m rate=100r/m;
    limit_req_zone $http_authorization zone=authenticated:10m rate=300r/m;

    limit_req_status 429;

    server {
        location /api/horoscopes/daily {
            limit_req zone=public burst=20 nodelay;
            proxy_pass http://backend:5000;
        }

        location /api/ {
            limit_req zone=authenticated burst=50 nodelay;
            proxy_pass http://backend:5000;
        }
    }
}
```

## Monitoring & Metrics

### Expose 429 Counters in /api/ops/metrics
```json
{
  "rate_limits": {
    "total_429_today": 156,
    "total_429_last_hour": 23,
    "top_limited_ips": [
      {"ip": "192.168.1.1", "count": 45},
      {"ip": "10.0.0.5", "count": 32}
    ],
    "top_limited_users": [
      {"user_id": "uuid-1", "count": 12},
      {"user_id": "uuid-2", "count": 8}
    ]
  }
}
```

### Prometheus Metrics
```
api_rate_limit_exceeded_total{endpoint, role}
api_rate_limit_remaining{endpoint, role}
```

## Alerts

### Critical Alerts
```yaml
- alert: HighRateLimitViolations
  expr: sum(rate(api_rate_limit_exceeded_total[5m])) > 10
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High rate limit violations detected"
    description: "More than 10 rate limit violations per second in the last 5 minutes"

- alert: SustainedRateLimitAbuse
  expr: sum(rate(api_rate_limit_exceeded_total{role="client"}[15m])) > 5
  for: 15m
  labels:
    severity: critical
  annotations:
    summary: "Sustained rate limit abuse from clients"
    description: "Client tier exceeding rate limits consistently for 15+ minutes"
```

## Business Rules

### Do NOT rate limit:
- Health check endpoint (`/api/ops/health`)
- Webhook endpoints (already IP-restricted)

### Stricter limits for:
- Phone verification (prevents SMS bombing)
- Payment intents (prevents payment spam)
- Order creation (prevents order flooding)

### Exemptions:
- Internal service-to-service calls (use API key bypass)
- Scheduled jobs (use system user bypass)

## Testing

### Unit Tests
```python
def test_rate_limit_enforced():
    for i in range(101):
        response = client.get("/api/horoscopes/daily")
        if i < 100:
            assert response.status_code == 200
        else:
            assert response.status_code == 429
            assert "Retry-After" in response.headers

def test_rate_limit_headers():
    response = client.get("/api/horoscopes/daily")
    assert "X-RateLimit-Limit" in response.headers
    assert "X-RateLimit-Remaining" in response.headers
    assert "X-RateLimit-Reset" in response.headers

def test_rate_limit_reset():
    for i in range(100):
        client.get("/api/horoscopes/daily")

    time.sleep(61)

    response = client.get("/api/horoscopes/daily")
    assert response.status_code == 200
```

## Frontend Handling

### Automatic Retry with Exponential Backoff
```javascript
const fetchWithRateLimit = async (url, options = {}, retries = 3) => {
  try {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60');

      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return fetchWithRateLimit(url, options, retries - 1);
      }

      throw new Error(`Rate limit exceeded. Try again in ${retryAfter} seconds.`);
    }

    return response;
  } catch (err) {
    throw err;
  }
};
```

### Display Rate Limit Info to Users
```javascript
const showRateLimitError = (error) => {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    const retryAfter = error.details?.retry_after || 60;
    showToast(`Too many requests. Please wait ${retryAfter} seconds.`, 'warning');
  }
};
```

## Storage Backend

### Redis Configuration
```redis
# Redis config for rate limiting
maxmemory 256mb
maxmemory-policy allkeys-lru
```

### Alternative: PostgreSQL (if no Redis)
```sql
CREATE TABLE rate_limit_counters (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    window_start TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_rate_limit_expires ON rate_limit_counters(expires_at);
```

## Audit Logging

All 429 responses MUST be logged:
```python
await audit_log.insert({
    'action': 'rate_limit_exceeded',
    'resource_type': 'api_endpoint',
    'resource_id': request.url.path,
    'metadata': {
        'ip': request.client.host,
        'user_id': user_id,
        'limit': limit,
        'retry_after': ttl
    }
})
```

## Checklist

- [ ] Rate limiting middleware implemented
- [ ] Redis/storage backend configured
- [ ] 429 responses include Retry-After header
- [ ] X-RateLimit-* headers included in all responses
- [ ] Metrics exposed in /api/ops/metrics
- [ ] Alerts configured for rate limit spikes
- [ ] Frontend handles 429 with retry logic
- [ ] Exemptions configured for webhooks and health checks
- [ ] Audit logging for all 429 responses
- [ ] Tests verify limits per tier
- [ ] Documentation updated with current limits