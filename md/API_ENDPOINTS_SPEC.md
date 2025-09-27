# API Endpoints Specification

## Base URL
```
http://localhost:5000/api
```

## Authentication
All authenticated endpoints require:
- Valid Supabase JWT token in `Authorization: Bearer <token>` header
- Role extracted from `user_metadata.role`

## Error Response Format
```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {}, // Optional additional context
  "correlation_id": "uuid-v4" // For tracing
}
```

## HTTP Status Codes
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing/invalid auth
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded (includes `Retry-After` header)
- `503 Service Unavailable` - Provider unavailable (payments, notifications)

---

## Public Endpoints

### GET /api/horoscopes/daily
**Description:** Fetch today's approved daily horoscopes

**Auth:** None (public)

**Response:**
```json
{
  "horoscopes": [
    {
      "id": "uuid",
      "zodiac": "aries",
      "scope": "daily",
      "content_preview": "Today brings new opportunities...",
      "ref_date": "2025-09-27"
    }
  ],
  "date": "2025-09-27",
  "count": 12
}
```

**Business Rules:**
- Returns only `scope='daily'`
- Returns only `ref_date = TODAY`
- Returns only `approved_at IS NOT NULL`
- RLS enforced at database level

---

## Auth Endpoints

### POST /api/auth/sync
**Description:** Sync user profile after Supabase auth

**Auth:** Required

**Request:**
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "role": "client"
}
```

**Response:**
```json
{
  "profile_id": "uuid",
  "synced": true
}
```

---

## Order Endpoints

### POST /api/orders
**Description:** Create new order

**Auth:** Required (client, admin, superadmin)

**Request:**
```json
{
  "service_code": "tarot_basic",
  "amount": 25.00,
  "client_notes": "Optional notes"
}
```

**Response:**
```json
{
  "order_id": "uuid",
  "status": "pending",
  "amount": 25.00,
  "created_at": "2025-09-27T12:00:00Z"
}
```

---

### GET /api/orders/{order_id}
**Description:** Get order details

**Auth:** Required
- Client: own orders only
- Reader: assigned orders only
- Admin/Superadmin: all orders

**Response:**
```json
{
  "order_id": "uuid",
  "service_name": "Tarot Reading",
  "status": "completed",
  "amount": 25.00,
  "created_at": "2025-09-27T12:00:00Z",
  "assigned_to": "reader-id",
  "result_available": true
}
```

---

### POST /api/orders/{order_id}/result
**Description:** Upload reading result (audio)

**Auth:** Required (reader, admin, superadmin)

**Request:** multipart/form-data
```
audio: file (audio/mpeg, max 50MB)
notes: string (optional)
```

**Response:**
```json
{
  "uploaded": true,
  "media_id": "uuid",
  "status": "awaiting_approval"
}
```

**Business Rules:**
- Reader can only upload to assigned orders
- File stored in private Supabase Storage bucket
- Triggers notification to client
- Creates audit log entry

---

### POST /api/orders/{order_id}/approve
**Description:** Approve order result

**Auth:** Required (monitor, admin, superadmin)

**Request:**
```json
{
  "notes": "Quality approved"
}
```

**Response:**
```json
{
  "approved": true,
  "status": "approved",
  "approved_at": "2025-09-27T12:30:00Z"
}
```

---

## Payment Endpoints

### POST /api/payments/intent
**Description:** Create payment intent

**Auth:** Required (client, admin, superadmin)

**Request:**
```json
{
  "order_id": "uuid",
  "amount": 25.00,
  "currency": "USD",
  "payment_method": "card"
}
```

**Response:**
```json
{
  "intent_id": "uuid",
  "client_secret": "pi_xxx_secret_yyy",
  "status": "requires_payment_method"
}
```

**Error Handling:**
- Returns `503` if payment provider env vars missing
- Never pretends success when provider unavailable

---

### GET /api/payments/invoice/{order_id}
**Description:** Get invoice PDF via Signed URL

**Auth:** Required
- Client: own orders only
- Admin/Superadmin: all orders

**Response:**
```json
{
  "signedUrl": "https://storage.supabase.co/...",
  "expiresAt": "2025-09-27T12:15:00Z",
  "fileName": "invoice-ORD-123.pdf"
}
```

**Business Rules:**
- Signed URL TTL: 15 minutes
- Never cached on client
- Opened in new tab with `noopener,noreferrer`
- PDF generated deterministically (same inputs → same PDF)

---

## Horoscope Management Endpoints

### POST /api/horoscopes/ingest
**Description:** Admin upload horoscope content

**Auth:** Required (admin, superadmin)

**Request:** multipart/form-data
```
zodiac: string (aries, taurus, etc.)
scope: string (daily, monthly)
ref_date: string (ISO date)
content: string
audio: file (optional, audio/mpeg)
```

**Response:**
```json
{
  "horoscope_id": "uuid",
  "status": "pending_approval"
}
```

---

### GET /api/horoscopes/{horoscope_id}/media
**Description:** Get horoscope media via Signed URL

**Auth:** Required (reader, monitor, admin, superadmin)

**Response:**
```json
{
  "signedUrl": "https://storage.supabase.co/...",
  "expiresAt": "2025-09-27T12:15:00Z",
  "mediaType": "audio/mpeg"
}
```

**Business Rules:**
- Only horoscopes ≤60 days old
- Signed URL TTL: 15 minutes
- Never cached on client

---

## Monitoring & Operations Endpoints

### GET /api/ops/health
**Description:** Health check

**Auth:** None (public)

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-27T12:00:00Z",
  "version": "1.0.0"
}
```

---

### GET /api/ops/metrics
**Description:** Platform metrics

**Auth:** Required (admin, superadmin)

**Response:**
```json
{
  "golden_signals": {
    "latency_p50": 45,
    "latency_p95": 120,
    "latency_p99": 250,
    "error_rate": 0.02,
    "requests_per_minute": 450
  },
  "business_metrics": {
    "orders_pending": 12,
    "orders_completed_today": 156,
    "total_revenue_today": 4280.50
  },
  "rate_limits": {
    "total_429_today": 8,
    "top_limited_ips": ["192.168.1.1", "10.0.0.5"]
  }
}
```

**Business Rules:**
- No PII in metrics
- Includes 429 counters for monitoring
- Used by alerting system

---

### GET /api/ops/snapshot
**Description:** Current platform state

**Auth:** Required (admin, superadmin)

**Response:**
```json
{
  "active_orders": 23,
  "active_calls": 2,
  "pending_reviews": 5,
  "system_load": 0.45,
  "storage_used_mb": 12450
}
```

---

### POST /api/ops/export
**Description:** Export data (CSV)

**Auth:** Required (admin=limited, superadmin=full)

**Request:**
```json
{
  "resource": "orders",
  "start_date": "2025-09-01",
  "end_date": "2025-09-30",
  "include_pii": false
}
```

**Response:**
```json
{
  "export_id": "uuid",
  "signedUrl": "https://storage.supabase.co/...",
  "expiresAt": "2025-09-27T13:00:00Z",
  "records": 1250
}
```

**Business Rules:**
- Superadmin can set `include_pii: true` with legal basis
- Export URL expires in 1 hour
- All exports audited

---

## Notification Endpoints

### POST /api/notifs/send
**Description:** Send notification (internal trigger)

**Auth:** Required (system, admin, superadmin)

**Request:**
```json
{
  "user_id": "uuid",
  "template_code": "order_completed",
  "channel": "email",
  "variables": {
    "order_id": "ORD-123",
    "service_name": "Tarot Reading"
  }
}
```

**Response:**
```json
{
  "sent": true,
  "notification_id": "uuid",
  "channel": "email"
}
```

**Error Handling:**
- Returns `503` if notification provider unavailable
- Respects user preferences (`notif_prefs` table)
- Rate limited per user/channel

---

### GET /api/notifs/prefs
**Description:** Get user notification preferences

**Auth:** Required (own prefs only)

**Response:**
```json
{
  "email": true,
  "sms": false,
  "whatsapp": true,
  "push": false
}
```

---

## Rate Limiting

All endpoints subject to rate limiting:
- **Public:** 100 req/min per IP
- **Authenticated:** 300 req/min per user
- **Admin:** 1000 req/min per user

**429 Response:**
```json
{
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests",
  "details": {
    "limit": 100,
    "window": "1 minute",
    "retry_after": 45
  }
}
```

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1695822345
Retry-After: 45
```

---

## Webhook Endpoints

### POST /api/payments/webhook
**Description:** Payment provider webhook

**Auth:** HMAC signature verification

**Headers:**
```
X-Provider-Signature: sha256=...
```

**Request:** Provider-specific payload

**Response:**
```json
{
  "received": true
}
```

**Business Rules:**
- HMAC verified using timing-safe comparison
- IP allowlist enforced
- Idempotent processing
- All events logged to audit_log

---

### POST /api/calls/webhook
**Description:** Twilio webhook

**Auth:** HMAC signature verification

**Headers:**
```
X-Twilio-Signature: ...
```

**Request:** Twilio StatusCallback payload

**Response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>
```

**Business Rules:**
- HMAC verified
- IP allowlist enforced
- Call state transitions audited

---

## Testing Endpoints

**Note:** Only available in development/staging environments

### POST /api/test/reset
**Description:** Reset test data

**Auth:** Required (superadmin only)

**Response:**
```json
{
  "reset": true,
  "tables_cleared": ["orders", "payments", "notifications"]
}
```