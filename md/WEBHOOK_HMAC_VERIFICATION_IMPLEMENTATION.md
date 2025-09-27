# Webhook HMAC Verification - Timing-Safe Implementation

## Overview
Implement timing-safe HMAC verification for webhooks from different providers (Twilio, Stripe) with provider-specific hash algorithms and constant-time comparison.

## Critical Security Requirements

### 1. Timing-Safe Comparison
**MUST** use constant-time comparison to prevent timing attacks. Standard `===` or string comparison is vulnerable.

### 2. Provider-Specific Algorithms
- **Twilio:** HMAC-SHA1 via `X-Twilio-Signature`
- **Stripe:** HMAC-SHA256 via `Stripe-Signature`
- **Square:** HMAC-SHA256 via `X-Square-Signature`

### 3. Buffer Length Verification
Check buffer lengths BEFORE comparison to prevent exceptions and timing leaks.

---

## Node.js/JavaScript Implementation

### Timing-Safe HMAC Verification
```javascript
const crypto = require('crypto');

const WEBHOOK_SECRETS = {
  twilio: process.env.TWILIO_WEBHOOK_SECRET,
  stripe: process.env.STRIPE_WEBHOOK_SECRET,
  square: process.env.SQUARE_WEBHOOK_SECRET
};

function verifyTwilioSignature(payload, signature, url) {
  if (!WEBHOOK_SECRETS.twilio) {
    throw new Error('Twilio webhook secret not configured');
  }

  const data = Object.keys(payload)
    .sort()
    .map(key => `${key}${payload[key]}`)
    .join('');

  const expected = crypto
    .createHmac('sha1', WEBHOOK_SECRETS.twilio)
    .update(url + data)
    .digest('base64');

  const expectedBuffer = Buffer.from(expected, 'utf8');
  const signatureBuffer = Buffer.from(signature, 'utf8');

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

function verifyStripeSignature(payload, signature, timestamp) {
  if (!WEBHOOK_SECRETS.stripe) {
    throw new Error('Stripe webhook secret not configured');
  }

  const signedPayload = `${timestamp}.${payload}`;

  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRETS.stripe)
    .update(signedPayload)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected, 'utf8');
  const signatureBuffer = Buffer.from(signature, 'utf8');

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  const timestampAge = Math.floor(Date.now() / 1000) - parseInt(timestamp);
  if (timestampAge > 300) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

function verifySquareSignature(payload, signature, url) {
  if (!WEBHOOK_SECRETS.square) {
    throw new Error('Square webhook secret not configured');
  }

  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRETS.square)
    .update(url + payload)
    .digest('base64');

  const expectedBuffer = Buffer.from(expected, 'utf8');
  const signatureBuffer = Buffer.from(signature, 'utf8');

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}
```

### Express Middleware
```javascript
const express = require('express');

function twilioWebhookAuth(req, res, next) {
  const signature = req.headers['x-twilio-signature'];
  const url = `https://${req.headers.host}${req.originalUrl}`;

  if (!signature) {
    return res.status(401).json({
      code: 'WEBHOOK_SIGNATURE_MISSING',
      message: 'X-Twilio-Signature header missing'
    });
  }

  try {
    const isValid = verifyTwilioSignature(req.body, signature, url);

    if (!isValid) {
      return res.status(403).json({
        code: 'WEBHOOK_SIGNATURE_INVALID',
        message: 'Invalid webhook signature'
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({
      code: 'WEBHOOK_VERIFICATION_ERROR',
      message: 'Failed to verify webhook signature',
      details: err.message
    });
  }
}

function stripeWebhookAuth(req, res, next) {
  const signature = req.headers['stripe-signature'];

  if (!signature) {
    return res.status(401).json({
      code: 'WEBHOOK_SIGNATURE_MISSING',
      message: 'Stripe-Signature header missing'
    });
  }

  const parts = signature.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    acc[key] = value;
    return acc;
  }, {});

  const timestamp = parts.t;
  const sig = parts.v1;

  if (!timestamp || !sig) {
    return res.status(400).json({
      code: 'WEBHOOK_SIGNATURE_MALFORMED',
      message: 'Invalid Stripe-Signature format'
    });
  }

  try {
    const isValid = verifyStripeSignature(req.rawBody, sig, timestamp);

    if (!isValid) {
      return res.status(403).json({
        code: 'WEBHOOK_SIGNATURE_INVALID',
        message: 'Invalid webhook signature or timestamp too old'
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({
      code: 'WEBHOOK_VERIFICATION_ERROR',
      message: 'Failed to verify webhook signature',
      details: err.message
    });
  }
}

app.use('/webhooks/twilio', express.urlencoded({ extended: false }), twilioWebhookAuth);
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookAuth);
```

---

## Python Implementation

### Timing-Safe HMAC Verification
```python
import hmac
import hashlib
import time
from typing import Dict, Any

WEBHOOK_SECRETS = {
    'twilio': os.getenv('TWILIO_WEBHOOK_SECRET'),
    'stripe': os.getenv('STRIPE_WEBHOOK_SECRET'),
    'square': os.getenv('SQUARE_WEBHOOK_SECRET')
}

def verify_twilio_signature(payload: Dict[str, Any], signature: str, url: str) -> bool:
    if not WEBHOOK_SECRETS['twilio']:
        raise ValueError('Twilio webhook secret not configured')

    data = ''.join(f'{k}{v}' for k, v in sorted(payload.items()))
    message = url + data

    expected = hmac.new(
        WEBHOOK_SECRETS['twilio'].encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha1
    ).digest()

    signature_bytes = signature.encode('utf-8')

    if len(expected) != len(signature_bytes):
        return False

    return hmac.compare_digest(expected, signature_bytes)

def verify_stripe_signature(payload: str, signature: str, timestamp: int) -> bool:
    if not WEBHOOK_SECRETS['stripe']:
        raise ValueError('Stripe webhook secret not configured')

    signed_payload = f'{timestamp}.{payload}'

    expected = hmac.new(
        WEBHOOK_SECRETS['stripe'].encode('utf-8'),
        signed_payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    if len(expected) != len(signature):
        return False

    timestamp_age = int(time.time()) - timestamp
    if timestamp_age > 300:
        return False

    return hmac.compare_digest(expected, signature)

def verify_square_signature(payload: str, signature: str, url: str) -> bool:
    if not WEBHOOK_SECRETS['square']:
        raise ValueError('Square webhook secret not configured')

    message = url + payload

    expected = hmac.new(
        WEBHOOK_SECRETS['square'].encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).digest()

    signature_bytes = signature.encode('utf-8')

    if len(expected) != len(signature_bytes):
        return False

    return hmac.compare_digest(expected, signature_bytes)
```

### FastAPI Middleware
```python
from fastapi import Request, HTTPException, Header
from typing import Optional

async def verify_twilio_webhook(
    request: Request,
    x_twilio_signature: Optional[str] = Header(None)
):
    if not x_twilio_signature:
        raise HTTPException(
            status_code=401,
            detail={
                'code': 'WEBHOOK_SIGNATURE_MISSING',
                'message': 'X-Twilio-Signature header missing'
            }
        )

    url = str(request.url)
    body = await request.form()

    try:
        is_valid = verify_twilio_signature(dict(body), x_twilio_signature, url)

        if not is_valid:
            raise HTTPException(
                status_code=403,
                detail={
                    'code': 'WEBHOOK_SIGNATURE_INVALID',
                    'message': 'Invalid webhook signature'
                }
            )
    except Exception as err:
        raise HTTPException(
            status_code=500,
            detail={
                'code': 'WEBHOOK_VERIFICATION_ERROR',
                'message': 'Failed to verify webhook signature',
                'details': str(err)
            }
        )

async def verify_stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None)
):
    if not stripe_signature:
        raise HTTPException(
            status_code=401,
            detail={
                'code': 'WEBHOOK_SIGNATURE_MISSING',
                'message': 'Stripe-Signature header missing'
            }
        )

    parts = dict(part.split('=') for part in stripe_signature.split(','))
    timestamp = int(parts.get('t', 0))
    sig = parts.get('v1', '')

    if not timestamp or not sig:
        raise HTTPException(
            status_code=400,
            detail={
                'code': 'WEBHOOK_SIGNATURE_MALFORMED',
                'message': 'Invalid Stripe-Signature format'
            }
        )

    body = await request.body()

    try:
        is_valid = verify_stripe_signature(body.decode('utf-8'), sig, timestamp)

        if not is_valid:
            raise HTTPException(
                status_code=403,
                detail={
                    'code': 'WEBHOOK_SIGNATURE_INVALID',
                    'message': 'Invalid webhook signature or timestamp too old'
                }
            )
    except Exception as err:
        raise HTTPException(
            status_code=500,
            detail={
                'code': 'WEBHOOK_VERIFICATION_ERROR',
                'message': 'Failed to verify webhook signature',
                'details': str(err)
            }
        )

@app.post('/webhooks/twilio')
async def twilio_webhook(request: Request, _: None = Depends(verify_twilio_webhook)):
    pass

@app.post('/webhooks/stripe')
async def stripe_webhook(request: Request, _: None = Depends(verify_stripe_webhook)):
    pass
```

---

## IP Allowlist (Defense in Depth)

### Twilio IPs
```python
TWILIO_IPS = [
    '54.172.60.0/23',
    '54.244.51.0/24',
    '54.171.127.192/26'
]

def is_twilio_ip(ip: str) -> bool:
    from ipaddress import ip_address, ip_network
    client_ip = ip_address(ip)
    return any(client_ip in ip_network(cidr) for cidr in TWILIO_IPS)
```

### Stripe IPs
```python
STRIPE_IPS = [
    '3.18.12.0/23',
    '3.130.192.0/22',
    '13.52.14.0/25'
]

def is_stripe_ip(ip: str) -> bool:
    from ipaddress import ip_address, ip_network
    client_ip = ip_address(ip)
    return any(client_ip in ip_network(cidr) for cidr in STRIPE_IPS)
```

---

## Audit Logging

Every webhook verification MUST be logged:
```python
await audit_log.insert({
    'action': 'webhook_verified',
    'resource_type': 'webhook',
    'resource_id': webhook_id,
    'metadata': {
        'provider': 'twilio',
        'signature_valid': is_valid,
        'ip_address': client_ip,
        'timestamp': timestamp
    }
})
```

---

## Testing

### Test Timing-Safe Comparison
```python
def test_timing_safe_comparison():
    secret = 'test_secret'
    payload = 'test_payload'

    valid_sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    invalid_sig = 'invalid_signature'

    assert verify_signature(payload, valid_sig, secret) == True
    assert verify_signature(payload, invalid_sig, secret) == False
```

### Test Length Mismatch
```python
def test_length_mismatch():
    short_sig = 'short'
    long_sig = 'a' * 64

    assert verify_signature('payload', short_sig, 'secret') == False
    assert verify_signature('payload', long_sig, 'secret') == False
```

### Test Timestamp Expiry (Stripe)
```python
def test_timestamp_expiry():
    old_timestamp = int(time.time()) - 400
    recent_timestamp = int(time.time()) - 100

    assert verify_stripe_signature('payload', 'sig', old_timestamp) == False
    assert verify_stripe_signature('payload', 'sig', recent_timestamp) == True
```

---

## Checklist

- [ ] Timing-safe comparison implemented (`crypto.timingSafeEqual` or `hmac.compare_digest`)
- [ ] Buffer/byte length verified before comparison
- [ ] Provider-specific algorithms (Twilio SHA1, Stripe SHA256, Square SHA256)
- [ ] Timestamp validation for Stripe (≤5 minutes old)
- [ ] IP allowlist implemented for Twilio/Stripe
- [ ] Webhook verification failures logged to audit trail
- [ ] 401 for missing signature, 403 for invalid signature
- [ ] Secrets stored in environment variables (never hardcoded)
- [ ] Tests verify timing-safe comparison
- [ ] Tests verify length mismatch rejection
- [ ] Tests verify timestamp expiry (Stripe)

---

## References

- **Twilio Security:** https://www.twilio.com/docs/usage/webhooks/webhooks-security
- **Stripe Webhooks:** https://stripe.com/docs/webhooks/signatures
- **MDN Timing Attacks:** https://developer.mozilla.org/en-US/docs/Web/Security/Timing_attacks
- **Node.js crypto.timingSafeEqual:** https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b
- **Python hmac.compare_digest:** https://docs.python.org/3/library/hmac.html#hmac.compare_digest