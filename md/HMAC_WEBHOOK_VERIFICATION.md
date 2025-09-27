# HMAC Webhook Verification

## Overview
All webhooks from external providers (payment processors, Twilio, etc.) must use HMAC signature verification with **timing-safe comparison** to prevent timing attacks.

## Security Principle
**Never trust incoming webhook data until signature is verified.**

## Implementation Requirements

### 1. Timing-Safe Comparison
**CRITICAL:** Use constant-time comparison to prevent timing attacks

**Python Example:**
```python
import hmac
import hashlib

def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """
    Verify webhook HMAC signature using timing-safe comparison
    """
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()

    # CRITICAL: Use hmac.compare_digest for timing-safe comparison
    return hmac.compare_digest(signature, expected_signature)
```

**JavaScript/Node.js Example:**
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

    // CRITICAL: Use crypto.timingSafeEqual for constant-time comparison
    const signatureBuffer = Buffer.from(signature, 'utf-8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');

    if (signatureBuffer.length !== expectedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}
```

---

## Payment Provider Webhooks

### Stripe Webhook
**Endpoint:** `POST /api/payments/webhook`

**Signature Header:** `Stripe-Signature`

**Verification:**
```python
import stripe

@router.post("/payments/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')

    try:
        # Stripe SDK handles timing-safe comparison internally
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError:
        # Invalid payload
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        # Invalid signature
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Process event
    await handle_payment_event(event)

    return {"received": True}
```

**Environment Variables:**
```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

---

### Square Webhook
**Endpoint:** `POST /api/payments/webhook`

**Signature Header:** `X-Square-Signature`

**Verification:**
```python
import hmac
import hashlib

@router.post("/payments/webhook")
async def square_webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get('x-square-signature')
    webhook_secret = os.getenv('SQUARE_WEBHOOK_SECRET')

    # Verify signature
    expected_signature = hmac.new(
        webhook_secret.encode('utf-8'),
        request.url.path.encode('utf-8') + payload,
        hashlib.sha256
    ).digest()

    # Timing-safe comparison
    if not hmac.compare_digest(
        signature.encode('utf-8'),
        base64.b64encode(expected_signature)
    ):
        raise HTTPException(status_code=401, detail="Invalid signature")

    # Process webhook
    data = json.loads(payload)
    await handle_payment_event(data)

    return {"received": True}
```

---

## Twilio Webhooks

### Voice Status Callback
**Endpoint:** `POST /api/calls/webhook`

**Signature Header:** `X-Twilio-Signature`

**Verification:**
```python
from twilio.request_validator import RequestValidator

@router.post("/calls/webhook")
async def twilio_webhook(request: Request):
    signature = request.headers.get('x-twilio-signature')
    url = str(request.url)
    params = dict(await request.form())

    auth_token = os.getenv('TWILIO_AUTH_TOKEN')
    validator = RequestValidator(auth_token)

    # Twilio uses timing-safe comparison internally
    if not validator.validate(url, params, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    # Process call event
    await handle_call_event(params)

    # Twilio expects TwiML response
    return Response(content="<Response></Response>", media_type="application/xml")
```

---

## IP Allowlist (Defense in Depth)

In addition to HMAC verification, restrict webhook endpoints to known provider IPs.

**Nginx Configuration:**
```nginx
location /api/payments/webhook {
    # Stripe webhook IPs (example)
    allow 3.18.12.63;
    allow 3.130.192.231;
    allow 13.235.14.237;
    deny all;

    proxy_pass http://backend:5000;
}

location /api/calls/webhook {
    # Twilio webhook IPs (example)
    allow 54.172.60.0/23;
    allow 54.244.51.0/24;
    deny all;

    proxy_pass http://backend:5000;
}
```

**FastAPI Middleware:**
```python
from starlette.middleware.base import BaseHTTPMiddleware

WEBHOOK_IP_ALLOWLIST = {
    '/api/payments/webhook': [
        '3.18.12.63',
        '3.130.192.231',
        '13.235.14.237'
    ],
    '/api/calls/webhook': [
        '54.172.60.0/23',
        '54.244.51.0/24'
    ]
}

class WebhookIPMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        path = request.url.path

        if path in WEBHOOK_IP_ALLOWLIST:
            client_ip = request.client.host
            allowed_ips = WEBHOOK_IP_ALLOWLIST[path]

            if not self.is_ip_allowed(client_ip, allowed_ips):
                return JSONResponse(
                    status_code=403,
                    content={"detail": "IP not allowed"}
                )

        return await call_next(request)

    def is_ip_allowed(self, client_ip: str, allowed_ips: list) -> bool:
        # Implement IP range checking
        return client_ip in allowed_ips
```

---

## Idempotency

Webhooks may be delivered multiple times. Implement idempotent processing.

**Example:**
```python
@router.post("/payments/webhook")
async def payment_webhook(event: dict):
    event_id = event['id']

    # Check if already processed
    existing = await db.fetch_one(
        "SELECT id FROM payment_events WHERE provider_event_id = %s",
        [event_id]
    )

    if existing:
        # Already processed
        return {"received": True, "duplicate": True}

    # Process event
    async with db.transaction():
        # Insert event record
        await db.execute(
            """
            INSERT INTO payment_events (provider_event_id, event_type, payload)
            VALUES (%s, %s, %s)
            """,
            [event_id, event['type'], json.dumps(event)]
        )

        # Update order status
        await update_order_status(event)

        # Audit log
        await audit_log.insert({
            'action': 'payment_webhook_received',
            'resource_id': event['data']['object']['id'],
            'metadata': {'event_type': event['type']}
        })

    return {"received": True}
```

---

## Error Handling

### Missing Secret
```python
webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')

if not webhook_secret:
    # Return 503 to indicate provider misconfiguration
    raise HTTPException(
        status_code=503,
        detail="Webhook processing unavailable"
    )
```

### Invalid Signature
```python
if not verify_signature(payload, signature, secret):
    # Log suspicious activity
    await security_log.warning({
        'event': 'webhook_invalid_signature',
        'ip': request.client.host,
        'path': request.url.path
    })

    raise HTTPException(
        status_code=401,
        detail="Invalid signature"
    )
```

---

## Testing

### Unit Tests
```python
def test_valid_hmac_signature():
    payload = b'{"event": "payment.succeeded"}'
    secret = "test_secret_key"

    signature = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()

    assert verify_webhook_signature(payload, signature, secret) == True

def test_invalid_hmac_signature():
    payload = b'{"event": "payment.succeeded"}'
    secret = "test_secret_key"
    wrong_signature = "wrong_signature"

    assert verify_webhook_signature(payload, wrong_signature, secret) == False

def test_timing_attack_resistance():
    # Ensure comparison time is constant regardless of input
    import time

    payload = b'{"event": "test"}'
    secret = "secret"
    valid_sig = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    invalid_sig = "0" * len(valid_sig)

    # Time valid signature check
    start = time.perf_counter()
    verify_webhook_signature(payload, valid_sig, secret)
    valid_time = time.perf_counter() - start

    # Time invalid signature check
    start = time.perf_counter()
    verify_webhook_signature(payload, invalid_sig, secret)
    invalid_time = time.perf_counter() - start

    # Times should be similar (within 10% for timing-safe comparison)
    assert abs(valid_time - invalid_time) / valid_time < 0.1
```

---

## Monitoring & Alerts

**Metrics:**
```
webhook_requests_total{endpoint, status}
webhook_signature_failures_total{endpoint}
webhook_processing_duration_seconds{endpoint}
```

**Alerts:**
- Alert if `webhook_signature_failures_total` > 10 in 5 minutes
- Alert if webhook endpoint returns 503 (missing config)
- Alert if webhook processing takes > 5 seconds

---

## Audit Logging

All webhook events must be logged:

```python
await audit_log.insert({
    'action': 'webhook_received',
    'resource_type': 'payment',
    'resource_id': payment_id,
    'metadata': {
        'provider': 'stripe',
        'event_type': event['type'],
        'signature_valid': True,
        'ip_address': request.client.host
    }
})
```

---

## Checklist

- [ ] HMAC verification uses timing-safe comparison (`hmac.compare_digest` or `crypto.timingSafeEqual`)
- [ ] Webhook secrets stored in environment variables (never in code)
- [ ] IP allowlist configured for webhook endpoints
- [ ] Idempotent processing prevents duplicate handling
- [ ] Missing secrets return 503 (never pretend success)
- [ ] Invalid signatures return 401 and log security event
- [ ] All webhooks audited in audit_log
- [ ] Unit tests verify timing-safe behavior
- [ ] Monitoring alerts configured
- [ ] Documentation updated with provider-specific details