"""
Timing-Safe HMAC Verification for Webhooks
Secure webhook signature verification with constant-time comparison
"""

import hmac
import hashlib
import time
from typing import Optional, Dict, Any, Union
from datetime import datetime, timezone

class WebhookSecurityError(Exception):
    """Custom exception for webhook security issues"""
    pass

class TimingSafeHMAC:
    """Timing-safe HMAC verification for webhooks"""

    @staticmethod
    def verify_signature(
        payload: bytes,
        signature: str,
        secret: str,
        algorithm: str = 'sha256',
        prefix: str = 'sha256='
    ) -> bool:
        """
        Verify webhook signature using timing-safe comparison

        Args:
            payload: Raw webhook payload bytes
            signature: Signature header from webhook
            secret: Webhook secret key
            algorithm: Hash algorithm (sha256, sha1, etc.)
            prefix: Signature prefix (e.g., 'sha256=', 'sha1=')

        Returns:
            bool: True if signature is valid
        """
        try:
            # Remove prefix if present
            if signature.startswith(prefix):
                signature = signature[len(prefix):]

            # Generate expected signature
            expected_signature = hmac.new(
                secret.encode('utf-8'),
                payload,
                getattr(hashlib, algorithm)
            ).hexdigest()

            # Timing-safe comparison
            return hmac.compare_digest(signature, expected_signature)

        except (AttributeError, ValueError):
            return False

    @staticmethod
    def verify_stripe_signature(
        payload: bytes,
        signature_header: str,
        webhook_secret: str,
        tolerance_seconds: int = 300
    ) -> bool:
        """
        Verify Stripe webhook signature with timestamp validation

        Args:
            payload: Raw webhook payload
            signature_header: Stripe-Signature header
            webhook_secret: Stripe webhook secret
            tolerance_seconds: Maximum age in seconds (default: 5 minutes)

        Returns:
            bool: True if signature and timestamp are valid
        """
        try:
            # Parse Stripe signature header
            # Format: "t=timestamp,v1=signature1,v1=signature2"
            elements = signature_header.split(',')
            timestamp = None
            signatures = []

            for element in elements:
                key, value = element.split('=', 1)
                if key == 't':
                    timestamp = int(value)
                elif key.startswith('v'):
                    signatures.append(value)

            if not timestamp or not signatures:
                return False

            # Check timestamp tolerance
            current_time = int(time.time())
            if abs(current_time - timestamp) > tolerance_seconds:
                return False

            # Create signed payload
            signed_payload = f"{timestamp}.{payload.decode('utf-8')}"

            # Verify at least one signature
            for signature in signatures:
                expected_signature = hmac.new(
                    webhook_secret.encode('utf-8'),
                    signed_payload.encode('utf-8'),
                    hashlib.sha256
                ).hexdigest()

                if hmac.compare_digest(signature, expected_signature):
                    return True

            return False

        except (ValueError, AttributeError):
            return False

    @staticmethod
    def verify_twilio_signature(
        url: str,
        payload: Union[str, bytes],
        signature: str,
        auth_token: str
    ) -> bool:
        """
        Verify Twilio webhook signature

        Args:
            url: Complete webhook URL
            payload: Form-encoded payload or bytes
            signature: X-Twilio-Signature header
            auth_token: Twilio auth token

        Returns:
            bool: True if signature is valid
        """
        try:
            if isinstance(payload, bytes):
                payload = payload.decode('utf-8')

            # Create signature base string
            signature_base = url + payload

            # Generate expected signature
            expected_signature = hmac.new(
                auth_token.encode('utf-8'),
                signature_base.encode('utf-8'),
                hashlib.sha1
            ).digest()

            import base64
            expected_signature_b64 = base64.b64encode(expected_signature).decode('utf-8')

            # Timing-safe comparison
            return hmac.compare_digest(signature, expected_signature_b64)

        except (ValueError, AttributeError):
            return False

    @staticmethod
    def verify_square_signature(
        payload: bytes,
        signature_header: str,
        webhook_signature_key: str,
        notification_url: str
    ) -> bool:
        """
        Verify Square webhook signature

        Args:
            payload: Raw webhook payload
            signature_header: X-Square-Signature header
            webhook_signature_key: Square webhook signature key
            notification_url: Webhook notification URL

        Returns:
            bool: True if signature is valid
        """
        try:
            # Square signature format: base64-encoded HMAC-SHA256
            # Signature is computed over: notification_url + request_body
            signature_base = notification_url + payload.decode('utf-8')

            expected_signature = hmac.new(
                webhook_signature_key.encode('utf-8'),
                signature_base.encode('utf-8'),
                hashlib.sha256
            ).digest()

            import base64
            expected_signature_b64 = base64.b64encode(expected_signature).decode('utf-8')

            # Timing-safe comparison
            return hmac.compare_digest(signature_header, expected_signature_b64)

        except (ValueError, AttributeError):
            return False

class WebhookValidator:
    """High-level webhook validation with logging and error handling"""

    def __init__(self, audit_logger=None):
        self.audit_logger = audit_logger

    def validate_stripe_webhook(
        self,
        payload: bytes,
        signature_header: str,
        webhook_secret: str,
        event_id: Optional[str] = None
    ) -> bool:
        """Validate Stripe webhook with audit logging"""

        start_time = time.time()

        try:
            is_valid = TimingSafeHMAC.verify_stripe_signature(
                payload, signature_header, webhook_secret
            )

            # Audit log
            if self.audit_logger:
                self.audit_logger.info({
                    'event': 'stripe_webhook_validation',
                    'event_id': event_id,
                    'valid': is_valid,
                    'validation_time_ms': round((time.time() - start_time) * 1000, 2),
                    'timestamp': datetime.now(timezone.utc).isoformat()
                })

            return is_valid

        except Exception as e:
            if self.audit_logger:
                self.audit_logger.error({
                    'event': 'stripe_webhook_validation_error',
                    'event_id': event_id,
                    'error': str(e),
                    'timestamp': datetime.now(timezone.utc).isoformat()
                })
            return False

    def validate_twilio_webhook(
        self,
        url: str,
        payload: Union[str, bytes],
        signature: str,
        auth_token: str,
        call_sid: Optional[str] = None
    ) -> bool:
        """Validate Twilio webhook with audit logging"""

        start_time = time.time()

        try:
            is_valid = TimingSafeHMAC.verify_twilio_signature(
                url, payload, signature, auth_token
            )

            # Audit log
            if self.audit_logger:
                self.audit_logger.info({
                    'event': 'twilio_webhook_validation',
                    'call_sid': call_sid,
                    'valid': is_valid,
                    'validation_time_ms': round((time.time() - start_time) * 1000, 2),
                    'timestamp': datetime.now(timezone.utc).isoformat()
                })

            return is_valid

        except Exception as e:
            if self.audit_logger:
                self.audit_logger.error({
                    'event': 'twilio_webhook_validation_error',
                    'call_sid': call_sid,
                    'error': str(e),
                    'timestamp': datetime.now(timezone.utc).isoformat()
                })
            return False

# FastAPI integration example
"""
from fastapi import Request, HTTPException, Depends
from webhook_security import WebhookValidator, TimingSafeHMAC

validator = WebhookValidator()

@app.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get("stripe-signature")

    if not signature:
        raise HTTPException(status_code=400, detail="Missing signature")

    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not webhook_secret:
        raise HTTPException(status_code=503, detail="Webhook not configured")

    if not validator.validate_stripe_webhook(payload, signature, webhook_secret):
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Process webhook
    return {"status": "processed"}

@app.post("/webhooks/twilio")
async def twilio_webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get("x-twilio-signature")

    if not signature:
        raise HTTPException(status_code=400, detail="Missing signature")

    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    if not auth_token:
        raise HTTPException(status_code=503, detail="Webhook not configured")

    # Reconstruct full URL
    full_url = str(request.url)

    if not validator.validate_twilio_webhook(full_url, payload, signature, auth_token):
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Process webhook
    return {"status": "processed"}
"""

# Security testing utilities
def test_timing_attack_resistance():
    """Test that HMAC verification is resistant to timing attacks"""

    import random
    import string

    secret = "test_secret_key"
    payload = b"test payload"

    # Generate correct signature
    correct_signature = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()

    # Generate many incorrect signatures of same length
    incorrect_signatures = [
        ''.join(random.choices(string.hexdigits.lower(), k=len(correct_signature)))
        for _ in range(100)
    ]

    # Measure timing for correct signature
    times_correct = []
    for _ in range(100):
        start = time.perf_counter()
        TimingSafeHMAC.verify_signature(payload, f"sha256={correct_signature}", secret)
        times_correct.append(time.perf_counter() - start)

    # Measure timing for incorrect signatures
    times_incorrect = []
    for sig in incorrect_signatures:
        start = time.perf_counter()
        TimingSafeHMAC.verify_signature(payload, f"sha256={sig}", secret)
        times_incorrect.append(time.perf_counter() - start)

    avg_correct = sum(times_correct) / len(times_correct)
    avg_incorrect = sum(times_incorrect) / len(times_incorrect)

    print(f"Average time for correct signatures: {avg_correct:.9f}s")
    print(f"Average time for incorrect signatures: {avg_incorrect:.9f}s")
    print(f"Timing difference: {abs(avg_correct - avg_incorrect):.9f}s")

    # Should be very small difference (timing-safe)
    return abs(avg_correct - avg_incorrect) < 0.001  # Less than 1ms difference

if __name__ == "__main__":
    # Run timing attack resistance test
    print("Testing timing attack resistance...")
    is_resistant = test_timing_attack_resistance()
    print(f"Timing attack resistance: {'PASS' if is_resistant else 'FAIL'}")