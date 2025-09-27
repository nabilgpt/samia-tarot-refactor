# Rate Limiting Implementation with Headers

## Overview
Implement 429 rate limiting with mandatory `Retry-After` headers and optional `RateLimit-*` draft headers for transparency.

---

## Response Headers (429)

### Mandatory Headers
```
HTTP/1.1 429 Too Many Requests
Retry-After: 45
Content-Type: application/json
```

### Optional Draft Headers (RFC Draft)
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1695822345
```

---

## Python/FastAPI Implementation

### Rate Limit Decorator
```python
import time
import redis
from functools import wraps
from fastapi import Request, HTTPException
from typing import Callable

redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def rate_limit(limit: int, window: int):
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            user_id = getattr(request.state, 'user_id', None)
            ip = request.client.host
            key = f"rate_limit:{user_id or ip}:{request.url.path}"

            current = redis_client.incr(key)

            if current == 1:
                redis_client.expire(key, window)

            ttl = redis_client.ttl(key)
            remaining = max(0, limit - current)

            if current > limit:
                raise HTTPException(
                    status_code=429,
                    detail={
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": "Too many requests. Please try again later.",
                        "details": {
                            "limit": limit,
                            "window": f"{window} seconds",
                            "retry_after": ttl
                        },
                        "correlation_id": str(uuid4())
                    },
                    headers={
                        "Retry-After": str(ttl),
                        "X-RateLimit-Limit": str(limit),
                        "X-RateLimit-Remaining": str(remaining),
                        "X-RateLimit-Reset": str(int(time.time()) + ttl)
                    }
                )

            response = await func(request, *args, **kwargs)

            response.headers["X-RateLimit-Limit"] = str(limit)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            response.headers["X-RateLimit-Reset"] = str(int(time.time()) + ttl)

            return response

        return wrapper
    return decorator
```

### Usage
```python
@router.post("/notifs/send")
@rate_limit(limit=50, window=3600)
async def send_notification(
    payload: NotificationSend,
    request: Request,
    user: User = Depends(require_auth)
):
    # Implementation
    pass
```

---

## Middleware Approach

### Global Rate Limit Middleware
```python
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

RATE_LIMITS = {
    '/api/verify/phone': (5, 3600),
    '/api/orders': (20, 3600),
    '/api/payments/intent': (10, 3600),
    '/api/notifs/send': (50, 3600),
    'default': (300, 60)
}

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path
        limit, window = RATE_LIMITS.get(path, RATE_LIMITS['default'])

        user_id = getattr(request.state, 'user_id', None)
        role = getattr(request.state, 'user_role', None)

        if role in ['admin', 'superadmin']:
            limit = 1000

        ip = request.client.host
        key = f"rate_limit:{user_id or ip}:{path}"

        current = redis_client.incr(key)

        if current == 1:
            redis_client.expire(key, window)

        ttl = redis_client.ttl(key)
        remaining = max(0, limit - current)

        if current > limit:
            await log_rate_limit_violation(user_id, ip, path)

            return JSONResponse(
                status_code=429,
                content={
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": "Too many requests. Please try again later.",
                    "details": {
                        "limit": limit,
                        "window": f"{window} seconds",
                        "retry_after": ttl
                    },
                    "correlation_id": str(uuid4())
                },
                headers={
                    "Retry-After": str(ttl),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time()) + ttl)
                }
            )

        response = await call_next(request)

        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + ttl)

        return response

app.add_middleware(RateLimitMiddleware)
```

---

## Metrics & Monitoring

### Expose 429 Counters in /api/ops/metrics
```python
from prometheus_client import Counter

rate_limit_exceeded = Counter(
    'rate_limit_exceeded_total',
    'Total rate limit violations',
    ['endpoint', 'role']
)

async def log_rate_limit_violation(user_id, ip, path):
    role = await get_user_role(user_id) if user_id else 'anonymous'

    rate_limit_exceeded.labels(endpoint=path, role=role).inc()

    await db.execute(
        """
        INSERT INTO rate_limit_violations (user_id, ip_address, endpoint, timestamp)
        VALUES ($1, $2, $3, NOW())
        """,
        user_id, ip, path
    )

@router.get("/ops/metrics")
async def ops_metrics(user: User = Depends(require_admin)):
    today = datetime.utcnow().date()

    total_429_today = await db.fetch_val(
        "SELECT COUNT(*) FROM rate_limit_violations WHERE DATE(timestamp) = $1",
        today
    )

    total_429_last_hour = await db.fetch_val(
        "SELECT COUNT(*) FROM rate_limit_violations WHERE timestamp > NOW() - INTERVAL '1 hour'"
    )

    top_limited_ips = await db.fetch_all(
        """
        SELECT ip_address as ip, COUNT(*) as count
        FROM rate_limit_violations
        WHERE DATE(timestamp) = $1
        GROUP BY ip_address
        ORDER BY count DESC
        LIMIT 5
        """,
        today
    )

    top_limited_users = await db.fetch_all(
        """
        SELECT user_id, COUNT(*) as count
        FROM rate_limit_violations
        WHERE DATE(timestamp) = $1 AND user_id IS NOT NULL
        GROUP BY user_id
        ORDER BY count DESC
        LIMIT 5
        """,
        today
    )

    return {
        "golden_signals": get_golden_signals(),
        "business_metrics": await get_business_metrics(),
        "rate_limits": {
            "total_429_today": total_429_today,
            "total_429_last_hour": total_429_last_hour,
            "top_limited_ips": [dict(r) for r in top_limited_ips],
            "top_limited_users": [dict(r) for r in top_limited_users]
        },
        "timestamp": datetime.utcnow().isoformat() + 'Z'
    }
```

---

## Database Schema

### Rate Limit Violations Table
```sql
CREATE TABLE rate_limit_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    ip_address INET NOT NULL,
    endpoint TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    INDEX idx_violations_timestamp (timestamp),
    INDEX idx_violations_ip (ip_address),
    INDEX idx_violations_user (user_id)
);

CREATE INDEX idx_violations_today ON rate_limit_violations(DATE(timestamp));
```

---

## Frontend Handling

### Automatic Retry with Exponential Backoff
```javascript
const fetchWithRateLimit = async (url, options = {}, maxRetries = 3) => {
  let retries = 0;

  while (retries <= maxRetries) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        const remaining = response.headers.get('X-RateLimit-Remaining');
        const reset = response.headers.get('X-RateLimit-Reset');

        console.warn(`Rate limited. Retry after ${retryAfter}s. Remaining: ${remaining}`);

        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          retries++;
          continue;
        }

        const errorData = await response.json();
        throw new Error(errorData.message || 'Rate limit exceeded');
      }

      return response;
    } catch (err) {
      if (retries >= maxRetries) {
        throw err;
      }
      retries++;
    }
  }
};
```

### Display Rate Limit Info
```javascript
const handleRateLimitError = (error, headers) => {
  const retryAfter = parseInt(headers.get('Retry-After') || '60');
  const remaining = headers.get('X-RateLimit-Remaining');
  const reset = headers.get('X-RateLimit-Reset');

  const resetTime = reset ? new Date(parseInt(reset) * 1000).toLocaleTimeString() : 'unknown';

  showToast(
    `Too many requests. Please wait ${retryAfter} seconds. Limit resets at ${resetTime}.`,
    'warning',
    { duration: retryAfter * 1000 }
  );
};
```

---

## Alerts

### Prometheus Alerts
```yaml
- alert: HighRateLimitViolations
  expr: sum(rate(rate_limit_exceeded_total[5m])) > 10
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High rate limit violations detected"
    description: "More than 10 rate limit violations per second in the last 5 minutes"

- alert: SustainedRateLimitAbuse
  expr: sum(rate(rate_limit_exceeded_total{role="client"}[15m])) > 5
  for: 15m
  labels:
    severity: critical
  annotations:
    summary: "Sustained rate limit abuse from clients"
    description: "Client tier exceeding rate limits consistently for 15+ minutes"
```

---

## Testing

### Unit Test
```python
def test_rate_limit_headers():
    for i in range(100):
        response = client.get("/api/horoscopes/daily")

    assert response.status_code == 200
    assert "X-RateLimit-Limit" in response.headers
    assert "X-RateLimit-Remaining" in response.headers

def test_rate_limit_exceeded():
    for i in range(101):
        response = client.get("/api/horoscopes/daily")

    assert response.status_code == 429
    assert "Retry-After" in response.headers
    assert response.headers["X-RateLimit-Remaining"] == "0"

    data = response.json()
    assert data["code"] == "RATE_LIMIT_EXCEEDED"
    assert "correlation_id" in data
```

---

## Checklist

- [ ] 429 responses always include `Retry-After` header
- [ ] Optional `X-RateLimit-*` headers included
- [ ] Rate limit counters exposed in `/api/ops/metrics`
- [ ] Top violating IPs and users tracked
- [ ] Prometheus metrics for 429 violations
- [ ] Alerts configured for rate limit spikes
- [ ] Frontend handles 429 with automatic retry
- [ ] Redis configured for rate limit storage
- [ ] Database table for violation logging
- [ ] Tests verify headers and limits
- [ ] Admin dashboard shows rate limit stats

---

## References

- **RFC 6585 (429):** https://www.rfc-editor.org/rfc/rfc6585.html
- **MDN Retry-After:** https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After
- **IETF RateLimit Headers Draft:** https://www.ietf.org/archive/id/draft-ietf-httpapi-ratelimit-headers-06.html