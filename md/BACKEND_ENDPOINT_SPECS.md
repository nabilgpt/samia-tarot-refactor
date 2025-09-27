# Backend API Endpoint Specifications

## Overview
Complete implementation specifications for all backend endpoints following the unified context engineering master.

---

## 1. GET /api/horoscopes/daily

### Purpose
Public endpoint returning **today-only approved** daily horoscopes for all zodiac signs.

### Authorization
- Public (no auth required)

### RLS Policy
```sql
CREATE POLICY horoscopes_public_today ON horoscopes
    FOR SELECT
    TO anon
    USING (
        scope = 'daily' AND
        approved_at IS NOT NULL AND
        DATE(created_at) = CURRENT_DATE
    );
```

### Response (200)
```json
{
  "horoscopes": [
    {
      "id": "uuid",
      "zodiac_sign": "aries",
      "content": "Today brings new opportunities...",
      "date": "2025-09-27",
      "scope": "daily",
      "approved_at": "2025-09-27T08:00:00Z"
    }
  ],
  "count": 12
}
```

### Error Responses
```json
{
  "code": "SERVICE_UNAVAILABLE",
  "message": "Database temporarily unavailable",
  "correlation_id": "uuid-v4"
}
```

### Implementation (Python/FastAPI)
```python
@router.get("/horoscopes/daily")
async def get_daily_horoscopes(db: Database = Depends(get_db)):
    try:
        query = """
            SELECT id, zodiac_sign, content, created_at::date as date, scope, approved_at
            FROM horoscopes
            WHERE scope = 'daily'
              AND approved_at IS NOT NULL
              AND DATE(created_at) = CURRENT_DATE
            ORDER BY zodiac_sign
        """

        results = await db.fetch_all(query)

        return {
            "horoscopes": [dict(r) for r in results],
            "count": len(results)
        }
    except Exception as e:
        logger.error(f"Failed to fetch daily horoscopes", exc_info=True)
        raise StandardHTTPException(
            status_code=503,
            code="SERVICE_UNAVAILABLE",
            message="Unable to fetch horoscopes at this time"
        )
```

### Cache Headers
```
Cache-Control: public, max-age=3600
Expires: [1 hour from now]
```

---

## 2. GET /api/horoscopes/{id}/media

### Purpose
Return short-lived Signed URL (≤15m) for horoscope audio/media.

### Authorization
- Internal roles only: `reader`, `monitor`, `admin`, `superadmin`

### RLS Policy
```sql
CREATE POLICY horoscopes_internal_media ON horoscopes
    FOR SELECT
    TO authenticated
    USING (
        get_user_role() IN ('reader', 'monitor', 'admin', 'superadmin') AND
        created_at > NOW() - INTERVAL '60 days'
    );
```

### Response (200)
```json
{
  "signedUrl": "https://storage.supabase.co/...[token]",
  "expiresAt": "2025-09-27T12:15:00Z",
  "mediaType": "audio",
  "ttl": 900
}
```

### Error Responses
```json
{
  "code": "RESOURCE_NOT_FOUND",
  "message": "Horoscope not found or you do not have access",
  "correlation_id": "uuid-v4"
}
```

```json
{
  "code": "MEDIA_NOT_AVAILABLE",
  "message": "No media associated with this horoscope",
  "correlation_id": "uuid-v4"
}
```

### Implementation
```python
SIGNED_URL_TTL = 900

@router.get("/horoscopes/{horoscope_id}/media")
async def get_horoscope_media(
    horoscope_id: str,
    user: User = Depends(require_auth),
    db: Database = Depends(get_db)
):
    if user.role not in ['reader', 'monitor', 'admin', 'superadmin']:
        raise StandardHTTPException(
            status_code=403,
            code="INSUFFICIENT_PERMISSIONS",
            message="Access denied"
        )

    query = """
        SELECT storage_path, media_type
        FROM horoscopes
        WHERE id = $1
          AND created_at > NOW() - INTERVAL '60 days'
    """

    result = await db.fetch_one(query, horoscope_id)

    if not result or not result['storage_path']:
        raise StandardHTTPException(
            status_code=404,
            code="MEDIA_NOT_AVAILABLE",
            message="No media found for this horoscope"
        )

    signed_url = await storage.create_signed_url(
        bucket='private-media',
        path=result['storage_path'],
        expires_in=SIGNED_URL_TTL
    )

    expires_at = datetime.utcnow() + timedelta(seconds=SIGNED_URL_TTL)

    return {
        "signedUrl": signed_url,
        "expiresAt": expires_at.isoformat() + 'Z',
        "mediaType": result['media_type'] or 'audio',
        "ttl": SIGNED_URL_TTL
    }
```

### Cache Headers
```
Cache-Control: no-store, must-revalidate, private
Pragma: no-cache
```

---

## 3. POST /api/payments/intent

### Purpose
Create payment intent with Stripe/Square. Return 503 if provider unavailable.

### Authorization
- Authenticated: `client`

### Request Body
```json
{
  "order_id": "uuid",
  "amount": 25.00,
  "currency": "USD",
  "payment_method": "stripe"
}
```

### Response (200)
```json
{
  "payment_intent_id": "pi_xxx",
  "client_secret": "pi_xxx_secret_yyy",
  "status": "requires_payment_method",
  "amount": 25.00,
  "currency": "USD"
}
```

### Error Responses
```json
{
  "code": "SERVICE_UNAVAILABLE",
  "message": "Payment provider temporarily unavailable",
  "details": {
    "service": "stripe",
    "retry_after": 120
  },
  "correlation_id": "uuid-v4"
}
```

```json
{
  "code": "PAYMENT_AMOUNT_INVALID",
  "message": "Payment amount does not match order total",
  "details": {
    "expected": 25.00,
    "provided": 20.00
  },
  "correlation_id": "uuid-v4"
}
```

### Implementation
```python
@router.post("/payments/intent")
async def create_payment_intent(
    payload: PaymentIntentCreate,
    user: User = Depends(require_auth),
    db: Database = Depends(get_db)
):
    order = await db.fetch_one(
        "SELECT amount, user_id FROM orders WHERE id = $1",
        payload.order_id
    )

    if not order or order['user_id'] != user.id:
        raise StandardHTTPException(
            status_code=404,
            code="RESOURCE_NOT_FOUND",
            message="Order not found"
        )

    if abs(order['amount'] - payload.amount) > 0.01:
        raise StandardHTTPException(
            status_code=400,
            code="PAYMENT_AMOUNT_INVALID",
            message="Amount mismatch",
            details={"expected": order['amount'], "provided": payload.amount}
        )

    try:
        if not STRIPE_SECRET_KEY:
            raise StandardHTTPException(
                status_code=503,
                code="SERVICE_UNAVAILABLE",
                message="Payment service not configured"
            )

        intent = stripe.PaymentIntent.create(
            amount=int(payload.amount * 100),
            currency=payload.currency.lower(),
            metadata={"order_id": payload.order_id}
        )

        await db.execute(
            """
            INSERT INTO payment_intents (id, order_id, user_id, amount, currency, status, provider_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            """,
            str(uuid4()), payload.order_id, user.id, payload.amount,
            payload.currency, intent.status, intent.id
        )

        return {
            "payment_intent_id": intent.id,
            "client_secret": intent.client_secret,
            "status": intent.status,
            "amount": payload.amount,
            "currency": payload.currency
        }

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e}", exc_info=True)
        raise StandardHTTPException(
            status_code=503,
            code="SERVICE_UNAVAILABLE",
            message="Payment provider error",
            details={"service": "stripe", "retry_after": 120}
        )
```

### Cache Headers
```
Cache-Control: no-store, must-revalidate, private
```

---

## 4. GET /api/payments/invoice/{order_id}

### Purpose
Return Signed URL for invoice PDF (≤15m TTL).

### Authorization
- Client (owner) or admin/superadmin

### Response (200)
```json
{
  "signedUrl": "https://storage.supabase.co/...[token]",
  "expiresAt": "2025-09-27T12:15:00Z",
  "fileName": "invoice_ORD-2025-001.pdf",
  "ttl": 900
}
```

### Error Responses
```json
{
  "code": "INVOICE_NOT_GENERATED",
  "message": "Invoice not yet available for this order",
  "correlation_id": "uuid-v4"
}
```

### Implementation
```python
@router.get("/payments/invoice/{order_id}")
async def get_invoice(
    order_id: str,
    user: User = Depends(require_auth),
    db: Database = Depends(get_db)
):
    query = """
        SELECT i.storage_path, i.id, o.user_id
        FROM invoices i
        JOIN orders o ON i.order_id = o.id
        WHERE o.id = $1
    """

    result = await db.fetch_one(query, order_id)

    if not result:
        raise StandardHTTPException(
            status_code=404,
            code="INVOICE_NOT_GENERATED",
            message="Invoice not available"
        )

    if user.role not in ['admin', 'superadmin'] and result['user_id'] != user.id:
        raise StandardHTTPException(
            status_code=403,
            code="INSUFFICIENT_PERMISSIONS",
            message="Access denied"
        )

    signed_url = await storage.create_signed_url(
        bucket='invoices',
        path=result['storage_path'],
        expires_in=SIGNED_URL_TTL
    )

    expires_at = datetime.utcnow() + timedelta(seconds=SIGNED_URL_TTL)

    return {
        "signedUrl": signed_url,
        "expiresAt": expires_at.isoformat() + 'Z',
        "fileName": f"invoice_{order_id}.pdf",
        "ttl": SIGNED_URL_TTL
    }
```

---

## 5. GET /api/ops/health

### Purpose
Liveness probe for container orchestration (K8s/Docker).

### Authorization
- Public (no auth)

### Response (200)
```json
{
  "status": "healthy",
  "timestamp": "2025-09-27T12:00:00Z",
  "version": "1.0.0"
}
```

### Response (503)
```json
{
  "status": "unhealthy",
  "timestamp": "2025-09-27T12:00:00Z",
  "details": {
    "database": "down"
  }
}
```

### Implementation
```python
@router.get("/ops/health")
async def health_check(db: Database = Depends(get_db)):
    try:
        await db.fetch_one("SELECT 1")

        return JSONResponse(
            status_code=200,
            content={
                "status": "healthy",
                "timestamp": datetime.utcnow().isoformat() + 'Z',
                "version": os.getenv('APP_VERSION', '1.0.0')
            }
        )
    except Exception as e:
        logger.error("Health check failed", exc_info=True)
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "timestamp": datetime.utcnow().isoformat() + 'Z',
                "details": {"database": "down"}
            }
        )
```

### Cache Headers
```
Cache-Control: no-cache, no-store, must-revalidate
```

---

## 6. GET /api/ops/snapshot

### Purpose
Real-time platform state for admin dashboard.

### Authorization
- `admin`, `superadmin`

### Response (200)
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

### Implementation
```python
@router.get("/ops/snapshot")
async def ops_snapshot(
    user: User = Depends(require_admin),
    db: Database = Depends(get_db)
):
    active_orders = await db.fetch_val("SELECT COUNT(*) FROM orders WHERE status IN ('pending', 'in_progress')")
    active_calls = await db.fetch_val("SELECT COUNT(*) FROM calls WHERE status = 'active'")
    pending_reviews = await db.fetch_val("SELECT COUNT(*) FROM orders WHERE status = 'pending_review'")

    return {
        "active_orders": active_orders,
        "active_calls": active_calls,
        "pending_reviews": pending_reviews,
        "system_load": psutil.cpu_percent() / 100,
        "storage_used_mb": get_storage_usage_mb(),
        "timestamp": datetime.utcnow().isoformat() + 'Z'
    }
```

---

## 7. GET /api/ops/metrics

### Purpose
Golden signals + business metrics + 429 counters for monitoring.

### Authorization
- `admin`, `superadmin`

### Response (200)
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
      {"ip": "192.168.1.1", "count": 3}
    ]
  },
  "timestamp": "2025-09-27T12:00:00Z"
}
```

### Implementation
```python
@router.get("/ops/metrics")
async def ops_metrics(
    user: User = Depends(require_admin),
    db: Database = Depends(get_db)
):
    return {
        "golden_signals": {
            "latency_p50_ms": get_latency_percentile(0.50),
            "latency_p95_ms": get_latency_percentile(0.95),
            "latency_p99_ms": get_latency_percentile(0.99),
            "error_rate_4xx": get_error_rate('4xx'),
            "error_rate_5xx": get_error_rate('5xx'),
            "requests_per_minute": get_request_rate(),
            "cpu_usage_percent": psutil.cpu_percent(),
            "memory_usage_percent": psutil.virtual_memory().percent,
            "db_connections_active": await get_active_connections(db),
            "db_connections_max": 20
        },
        "business_metrics": {
            "orders_pending": await db.fetch_val("SELECT COUNT(*) FROM orders WHERE status = 'pending'"),
            "orders_completed_today": await db.fetch_val("SELECT COUNT(*) FROM orders WHERE status = 'completed' AND DATE(completed_at) = CURRENT_DATE"),
            "total_revenue_today_usd": await db.fetch_val("SELECT COALESCE(SUM(amount), 0) FROM orders WHERE status = 'completed' AND DATE(completed_at) = CURRENT_DATE"),
            "active_calls": await db.fetch_val("SELECT COUNT(*) FROM calls WHERE status = 'active'")
        },
        "rate_limits": get_rate_limit_stats(),
        "timestamp": datetime.utcnow().isoformat() + 'Z'
    }
```

---

## 8. POST /api/notifs/send

### Purpose
Unified notification sending via M15 adapter (Email/SMS/WhatsApp).

### Authorization
- Internal roles: `reader`, `monitor`, `admin`, `superadmin`

### Rate Limit
- 50 requests/hour per user

### Request Body
```json
{
  "user_id": "uuid",
  "template": "order_completed",
  "channel": "email",
  "data": {
    "order_id": "ORD-2025-001",
    "client_name": "Sarah Johnson"
  }
}
```

### Response (200)
```json
{
  "notification_id": "uuid",
  "status": "sent",
  "channel": "email",
  "timestamp": "2025-09-27T12:00:00Z"
}
```

### Error Responses
```json
{
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Too many notification requests",
  "details": {
    "limit": 50,
    "window": "1 hour",
    "retry_after": 1800
  },
  "correlation_id": "uuid-v4"
}
```

```json
{
  "code": "NOTIFICATION_DELIVERY_FAILED",
  "message": "Failed to send notification via email",
  "details": {
    "channel": "email",
    "provider_error": "Invalid recipient"
  },
  "correlation_id": "uuid-v4"
}
```

### Implementation
```python
@router.post("/notifs/send")
@rate_limit(limit=50, window=3600)
async def send_notification(
    payload: NotificationSend,
    user: User = Depends(require_internal),
    db: Database = Depends(get_db)
):
    user_prefs = await db.fetch_one(
        "SELECT email, phone, whatsapp FROM notif_prefs WHERE user_id = $1",
        payload.user_id
    )

    if not user_prefs or not user_prefs.get(payload.channel):
        raise StandardHTTPException(
            status_code=400,
            code="NOTIFICATION_CHANNEL_DISABLED",
            message=f"User has not enabled {payload.channel} notifications"
        )

    try:
        notification_id = str(uuid4())

        if payload.channel == 'email':
            await email_provider.send(
                to=user_prefs['email'],
                template=payload.template,
                data=payload.data
            )
        elif payload.channel == 'sms':
            await sms_provider.send(
                to=user_prefs['phone'],
                template=payload.template,
                data=payload.data
            )
        elif payload.channel == 'whatsapp':
            await whatsapp_provider.send(
                to=user_prefs['whatsapp'],
                template=payload.template,
                data=payload.data
            )

        await db.execute(
            """
            INSERT INTO notif_log (id, user_id, channel, template, status, sent_at)
            VALUES ($1, $2, $3, $4, 'sent', NOW())
            """,
            notification_id, payload.user_id, payload.channel, payload.template
        )

        return {
            "notification_id": notification_id,
            "status": "sent",
            "channel": payload.channel,
            "timestamp": datetime.utcnow().isoformat() + 'Z'
        }

    except Exception as e:
        logger.error(f"Notification delivery failed: {e}", exc_info=True)
        raise StandardHTTPException(
            status_code=500,
            code="NOTIFICATION_DELIVERY_FAILED",
            message=f"Failed to send notification via {payload.channel}",
            details={"channel": payload.channel, "provider_error": str(e)}
        )
```

---

## Cache Control Summary

| Endpoint | Cache-Control |
|----------|---------------|
| `/api/horoscopes/daily` | `public, max-age=3600` |
| `/api/horoscopes/{id}/media` | `no-store, must-revalidate, private` |
| `/api/payments/*` | `no-store, must-revalidate, private` |
| `/api/ops/health` | `no-cache, no-store` |
| `/api/ops/snapshot` | `no-store, private` |
| `/api/ops/metrics` | `no-store, private` |
| `/api/notifs/send` | `no-store, private` |

---

## Checklist

- [ ] All endpoints return standardized error shape
- [ ] 503 responses for provider failures (Stripe, storage, email)
- [ ] Signed URLs with ≤15m TTL
- [ ] RLS policies enforce authorization
- [ ] Rate limiting on notification endpoint
- [ ] Golden signals exposed in /api/ops/metrics
- [ ] Health check responds < 100ms
- [ ] Audit logging for sensitive operations
- [ ] Cache-Control headers set appropriately
- [ ] Correlation IDs in all error responses