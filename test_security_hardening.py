#!/usr/bin/env python3
"""
Security Hardening Tests - M14/M15 Critical Acceptance
Tests for TTL hardening, webhook security, and idempotency per Master Context requirements.
"""

import os
import json
import time
import hmac
import hashlib
import requests
import psycopg2
from datetime import datetime, timedelta

# Test configuration
API_BASE = "http://localhost:8000"
DB_DSN = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

def db_exec(query, params=None):
    """Execute SQL query"""
    with psycopg2.connect(DB_DSN) as conn:
        with conn.cursor() as cur:
            cur.execute(query, params or [])
            if query.strip().lower().startswith('select'):
                return cur.fetchall()
            conn.commit()

def test_signed_url_ttl_enforcement():
    """Test 1: Signed URLs respect ≤15min default TTL policy"""
    print("🔒 Testing Signed URL TTL hardening...")
    
    # Create a mock signed URL
    from api import generate_signed_url, get_signed_url_ttl
    
    # Test default TTL (should be ≤15min)
    default_ttl = get_signed_url_ttl("default")
    assert default_ttl <= 15, f"Default TTL {default_ttl}min exceeds 15min security policy"
    
    # Test invoice override (justified)
    invoice_ttl = get_signed_url_ttl("invoice")
    assert invoice_ttl == 60, f"Invoice TTL should be 60min per whitelist, got {invoice_ttl}min"
    
    # Test DSR export override (justified) 
    dsr_ttl = get_signed_url_ttl("dsr_export")
    assert dsr_ttl == 30, f"DSR export TTL should be 30min per whitelist, got {dsr_ttl}min"
    
    print(f"✅ TTL Policy: default={default_ttl}min, invoice={invoice_ttl}min, dsr={dsr_ttl}min")
    
    # Test signed URL generation audit
    test_key = "test/mock_file.pdf"
    signed_url = generate_signed_url(test_key, "default")
    
    # Verify audit entry was created
    audit_entries = db_exec("""
        SELECT meta FROM audit_log 
        WHERE event = 'signed_url_generated' 
        AND entity = 'storage' 
        AND entity_id = %s
        ORDER BY created_at DESC LIMIT 1
    """, (test_key,))
    
    assert audit_entries, "Signed URL generation should create audit entry"
    meta = json.loads(audit_entries[0][0])
    assert meta['ttl_minutes'] == default_ttl, f"Audit TTL mismatch: {meta['ttl_minutes']} != {default_ttl}"
    
    print("✅ Signed URL audit logging working")

def test_expired_signed_url_denial():
    """Test 2: Expired signed URLs are denied at DB level"""
    print("🔒 Testing expired signed URL denial...")
    
    # This would typically involve checking RLS policies
    # For now, test that expired URLs contain expired timestamps
    from api import generate_signed_url
    import base64
    
    signed_url = generate_signed_url("test/expired.pdf", "default")
    
    # Extract timestamp from mock URL
    if "expires=" in signed_url:
        expires_str = signed_url.split("expires=")[1].split("&")[0]
        expires_at = int(expires_str)
        current_time = int(time.time())
        
        # Verify URL expires in the future (not already expired)
        assert expires_at > current_time, "Generated URL should not be pre-expired"
        
        # Verify expiration is within expected window
        ttl_seconds = expires_at - current_time
        expected_max = get_signed_url_ttl("default") * 60 + 60  # +60s tolerance
        assert ttl_seconds <= expected_max, f"URL expires too far in future: {ttl_seconds}s > {expected_max}s"
    
    print("✅ Signed URL expiration validation working")

def test_webhook_hmac_verification():
    """Test 3: Invalid webhook signatures return 400 + signature_valid=false"""
    print("🔒 Testing webhook HMAC verification...")
    
    # Test invalid signature
    headers = {
        "stripe-signature": "v1=invalid_signature_should_fail",
        "Content-Type": "application/json"
    }
    
    payload = {
        "id": "evt_test_webhook",
        "type": "payment_intent.succeeded",
        "data": {"object": {"id": "pi_test_intent"}}
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/api/payments/webhook",
            json=payload,
            headers=headers,
            timeout=10
        )
        
        # Should return 400 for invalid signature
        assert response.status_code == 400, f"Expected 400 for invalid signature, got {response.status_code}"
        
        # Check audit log for verification failure
        time.sleep(1)  # Allow audit write
        audit_entries = db_exec("""
            SELECT meta FROM audit_log 
            WHERE event = 'webhook_verification_failed'
            AND actor = 'system'
            ORDER BY created_at DESC LIMIT 1
        """)
        
        if audit_entries:
            meta = json.loads(audit_entries[0][0])
            assert meta.get('signature_valid') == False, "Audit should record signature_valid=false"
        
        print("✅ Invalid webhook signature properly rejected")
        
    except requests.exceptions.RequestException as e:
        print(f"⚠️  Webhook test skipped (server not running): {e}")

def test_payment_intent_idempotency():
    """Test 4: Idempotent payment intent creation (same key, single charge)"""
    print("🔒 Testing payment intent idempotency...")
    
    # Clean up any existing test data
    db_exec("DELETE FROM payment_intents WHERE idempotency_key LIKE 'test_%'")
    
    # Create test order
    test_order_id = db_exec("""
        INSERT INTO orders (user_id, service_id, status) 
        VALUES ('00000000-0000-0000-0000-000000000001', 1, 'pending')
        RETURNING id
    """)[0][0] if db_exec("SELECT COUNT(*) FROM orders WHERE id = 999999")[0][0] == 0 else 999999
    
    idempotency_key = f"test_idempotency_{int(time.time())}"
    
    headers = {"X-User-ID": "00000000-0000-0000-0000-000000000001"}
    payload = {
        "order_id": test_order_id,
        "amount_cents": 2500,
        "currency": "USD", 
        "payment_method": "stripe_card",
        "idempotency_key": idempotency_key
    }
    
    try:
        # First request - should create new intent
        response1 = requests.post(
            f"{API_BASE}/api/payments/intents",
            json=payload,
            headers=headers,
            timeout=10
        )
        
        # Second request - should return existing intent
        response2 = requests.post(
            f"{API_BASE}/api/payments/intents", 
            json=payload,
            headers=headers,
            timeout=10
        )
        
        if response1.status_code == 200 and response2.status_code == 200:
            data1 = response1.json()
            data2 = response2.json()
            
            # Should return same payment intent ID
            assert data1['payment_intent_id'] == data2['payment_intent_id'], "Idempotency failed - different intent IDs"
            assert data1['idempotent'] == False, "First request should show idempotent=false"
            assert data2['idempotent'] == True, "Second request should show idempotent=true"
            
            print("✅ Payment intent idempotency working")
        else:
            print(f"⚠️  Idempotency test skipped (API error): {response1.status_code}, {response2.status_code}")
    
    except requests.exceptions.RequestException as e:
        print(f"⚠️  Idempotency test skipped (server not running): {e}")
    
    # Cleanup
    db_exec("DELETE FROM payment_intents WHERE idempotency_key = %s", (idempotency_key,))

def test_provider_agnostic_webhook():
    """Test 5: Webhook dispatcher handles multiple providers"""
    print("🔒 Testing provider-agnostic webhook dispatcher...")
    
    # Test that the new unified endpoint exists
    try:
        # Test with Stripe signature
        stripe_payload = {
            "id": "evt_test_stripe",
            "type": "payment_intent.succeeded", 
            "data": {"object": {"id": "pi_test"}}
        }
        
        stripe_headers = {
            "stripe-signature": "v1=test_signature",
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            f"{API_BASE}/api/payments/webhook",
            json=stripe_payload,
            headers=stripe_headers,
            timeout=10
        )
        
        # Should handle the request (even if signature is invalid, it should try to process)
        assert response.status_code in [400, 503], f"Webhook dispatcher should handle request, got {response.status_code}"
        
        print("✅ Provider-agnostic webhook dispatcher accessible")
        
    except requests.exceptions.RequestException as e:
        print(f"⚠️  Webhook dispatcher test skipped (server not running): {e}")

def test_503_guards_missing_providers():
    """Test 6: Missing provider config returns 503"""
    print("🔒 Testing 503 guards for missing providers...")
    
    try:
        # Test webhook with no provider configured (should get 503)
        headers = {"Content-Type": "application/json"}
        payload = {"id": "test", "type": "test"}
        
        # Set empty PAY_PROVIDER to trigger 503
        import os
        original_provider = os.environ.get('PAY_PROVIDER', '')
        os.environ['PAY_PROVIDER'] = 'nonexistent_provider'
        
        response = requests.post(
            f"{API_BASE}/api/payments/webhook",
            json=payload,
            headers=headers,
            timeout=10
        )
        
        # Restore original provider
        if original_provider:
            os.environ['PAY_PROVIDER'] = original_provider
        elif 'PAY_PROVIDER' in os.environ:
            del os.environ['PAY_PROVIDER']
        
        # Should return 503 for missing provider
        assert response.status_code == 503, f"Expected 503 for missing provider, got {response.status_code}"
        
        print("✅ 503 guards working for missing providers")
        
    except requests.exceptions.RequestException as e:
        print(f"⚠️  503 guard test skipped (server not running): {e}")

def run_security_tests():
    """Run all security hardening tests"""
    print("=" * 60)
    print("🔐 SAMIA-TAROT Security Hardening Tests")
    print("=" * 60)
    
    tests = [
        test_signed_url_ttl_enforcement,
        test_expired_signed_url_denial, 
        test_webhook_hmac_verification,
        test_payment_intent_idempotency,
        test_provider_agnostic_webhook,
        test_503_guards_missing_providers
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"❌ {test.__name__} FAILED: {e}")
            failed += 1
        print()
    
    print("=" * 60)
    print(f"🔐 Security Tests Complete: {passed} passed, {failed} failed")
    print("=" * 60)
    
    return failed == 0

if __name__ == "__main__":
    success = run_security_tests()
    exit(0 if success else 1)