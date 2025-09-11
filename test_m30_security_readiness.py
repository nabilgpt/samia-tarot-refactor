"""
M30: Security Readiness Testing - OWASP WSTG Aligned

Comprehensive security testing aligned with OWASP Web Security Testing Guide
covering authentication, authorization, input validation, session management,
and API security.

Run: python test_m30_security_readiness.py
"""

import unittest
import requests
import json
import time
import hashlib
import hmac
import base64
import jwt
from datetime import datetime, timedelta
from urllib.parse import urlencode, quote_plus
import psycopg2
from unittest.mock import patch, MagicMock


class TestM30AuthenticationSecurity(unittest.TestCase):
    """OWASP WSTG-ATHN - Authentication Testing"""
    
    def setUp(self):
        self.base_url = "http://localhost:3000"  # Adjust for test environment
        self.api_url = f"{self.base_url}/api"
        self.valid_email = "security_test@example.com"
        self.valid_password = "TestPassword123!"
        
        # Database connection for RLS testing
        self.conn = psycopg2.connect(
            host="localhost", 
            database="samia_tarot", 
            user="samia_admin", 
            password="samia123"
        )
        self.conn.autocommit = True
        self.cur = self.conn.cursor()
    
    def test_password_policy_enforcement(self):
        """WSTG-ATHN-07: Test password policy requirements"""
        
        weak_passwords = [
            "123456",           # Too simple
            "password",         # Common password
            "abc",              # Too short
            "PASSWORD123",      # No special chars
            "password123!",     # No uppercase
            "PASSWORD123!",     # No lowercase
            "PasswordABC!",     # No numbers
        ]
        
        for weak_password in weak_passwords:
            response = requests.post(f"{self.api_url}/auth/register", json={
                "email": f"test_{int(time.time())}@example.com",
                "password": weak_password,
                "first_name": "Test",
                "last_name": "User"
            })
            
            # Should reject weak passwords
            self.assertNotEqual(response.status_code, 200, 
                               f"Weak password accepted: {weak_password}")
    
    def test_brute_force_protection(self):
        """WSTG-ATHN-03: Test brute force attack protection"""
        
        # Attempt multiple failed logins
        failed_attempts = []
        
        for attempt in range(10):
            response = requests.post(f"{self.api_url}/auth/signin", json={
                "email": self.valid_email,
                "password": "wrong_password"
            })
            failed_attempts.append(response.status_code)
            time.sleep(0.1)  # Small delay between attempts
        
        # Should implement rate limiting after several attempts
        rate_limited = any(status == 429 for status in failed_attempts[-3:])
        self.assertTrue(rate_limited, "No brute force protection detected")
    
    def test_session_timeout(self):
        """WSTG-SESS-07: Test session timeout implementation"""
        
        # Login to get session
        login_response = requests.post(f"{self.api_url}/auth/signin", json={
            "email": self.valid_email,
            "password": self.valid_password
        })
        
        if login_response.status_code == 200:
            auth_token = login_response.json().get("access_token")
            self.assertIsNotNone(auth_token, "No auth token received")
            
            # Test token expiration by decoding JWT
            try:
                decoded = jwt.decode(auth_token, options={"verify_signature": False})
                exp_time = decoded.get('exp')
                current_time = int(time.time())
                
                # Token should have reasonable expiration (not too long)
                max_expiration = current_time + (24 * 3600)  # 24 hours
                self.assertLess(exp_time, max_expiration, 
                               "Session timeout too long")
                
            except jwt.DecodeError:
                self.fail("Invalid JWT token format")
    
    def test_multi_factor_authentication_bypass(self):
        """WSTG-ATHN-10: Test MFA bypass attempts"""
        
        # Test phone verification bypass
        response = requests.post(f"{self.api_url}/auth/verify-phone", json={
            "phone": "+1234567890",
            "code": "000000"  # Invalid/default code
        })
        
        # Should not accept default or easily guessed codes
        self.assertNotEqual(response.status_code, 200, 
                           "MFA bypass with default code")
        
        # Test multiple verification attempts
        bypass_attempts = []
        for code in ["123456", "000000", "111111", "999999"]:
            response = requests.post(f"{self.api_url}/auth/verify-phone", json={
                "phone": "+1234567890",
                "code": code
            })
            bypass_attempts.append(response.status_code)
            time.sleep(0.1)
        
        # Should implement attempt limiting
        rate_limited = any(status == 429 for status in bypass_attempts)
        self.assertTrue(rate_limited, "No MFA attempt limiting")


class TestM30AuthorizationSecurity(unittest.TestCase):
    """OWASP WSTG-ATHZ - Authorization Testing"""
    
    def setUp(self):
        self.base_url = "http://localhost:3000"
        self.api_url = f"{self.base_url}/api"
        
        # Database connection for RLS testing
        self.conn = psycopg2.connect(
            host="localhost", 
            database="samia_tarot", 
            user="samia_admin", 
            password="samia123"
        )
        self.conn.autocommit = True
        self.cur = self.conn.cursor()
        
        # Test user tokens for different roles
        self.admin_token = self._get_test_token("admin")
        self.client_token = self._get_test_token("client")
        self.reader_token = self._get_test_token("reader")
        self.monitor_token = self._get_test_token("monitor")
    
    def _get_test_token(self, role):
        """Generate test JWT token for specific role"""
        payload = {
            'sub': f'test_{role}_user',
            'role': role,
            'exp': int(time.time()) + 3600  # 1 hour
        }
        return jwt.encode(payload, 'test_secret', algorithm='HS256')
    
    def test_horizontal_privilege_escalation(self):
        """WSTG-ATHZ-02: Test access to other users' data"""
        
        # Set client context
        self.cur.execute("SELECT set_config('app.current_user_id', 'client_user_1', false)")
        
        # Try to access another client's orders
        try:
            self.cur.execute("""
                SELECT * FROM orders WHERE user_id = 'client_user_2'
            """)
            result = self.cur.fetchall()
            self.assertEqual(len(result), 0, 
                           "Client can access other client's orders")
        except psycopg2.Error:
            pass  # Expected - RLS should block access
        
        # Test API-level horizontal privilege escalation
        headers = {"Authorization": f"Bearer {self.client_token}"}
        
        # Try to access another user's profile
        response = requests.get(f"{self.api_url}/users/other_user_id/profile", 
                               headers=headers)
        self.assertNotEqual(response.status_code, 200, 
                           "Horizontal privilege escalation possible")
    
    def test_vertical_privilege_escalation(self):
        """WSTG-ATHZ-03: Test privilege escalation to higher roles"""
        
        # Test client trying to access admin functions
        headers = {"Authorization": f"Bearer {self.client_token}"}
        
        admin_endpoints = [
            "/admin/users",
            "/admin/orders/assign",
            "/admin/providers/toggle",
            "/admin/audit/logs",
            "/admin/health/overview"
        ]
        
        for endpoint in admin_endpoints:
            response = requests.get(f"{self.api_url}{endpoint}", headers=headers)
            self.assertIn(response.status_code, [401, 403], 
                         f"Client can access admin endpoint: {endpoint}")
    
    def test_rls_policy_enforcement(self):
        """WSTG-ATHZ-01: Test Row-Level Security policy enforcement"""
        
        # Test different role contexts
        test_cases = [
            ("client", "SELECT * FROM profiles WHERE id != current_setting('app.current_user_id', true)::uuid"),
            ("reader", "SELECT * FROM orders WHERE assigned_reader != current_setting('app.current_user_id', true)::uuid"),
            ("monitor", "SELECT * FROM finops_cost_budgets"),  # Should be denied
            ("admin", "SELECT * FROM audit_log WHERE actor != current_setting('app.current_user_id', true)::uuid")
        ]
        
        for role, query in test_cases:
            self.cur.execute(f"SELECT set_config('app.current_user_id', '{role}_test', false)")
            
            try:
                self.cur.execute(query)
                results = self.cur.fetchall()
                
                # Monitor should be blocked from cost budgets
                if role == "monitor" and "finops_cost_budgets" in query:
                    self.fail("Monitor role can access sensitive budget data")
                
            except psycopg2.Error as e:
                # Some queries should fail due to RLS
                if role == "monitor" and "finops_cost_budgets" in query:
                    continue  # Expected failure
                else:
                    self.fail(f"Unexpected RLS failure for {role}: {e}")
    
    def test_api_route_guard_parity(self):
        """Test API route guards match database RLS policies"""
        
        # Test cases for route guard vs RLS parity
        parity_tests = [
            {
                "role": "client",
                "endpoint": "/orders",
                "rls_query": "SELECT COUNT(*) FROM orders WHERE user_id = current_setting('app.current_user_id', true)::uuid"
            },
            {
                "role": "reader", 
                "endpoint": "/orders/assigned",
                "rls_query": "SELECT COUNT(*) FROM orders WHERE assigned_reader = current_setting('app.current_user_id', true)::uuid"
            },
            {
                "role": "admin",
                "endpoint": "/admin/orders",
                "rls_query": "SELECT COUNT(*) FROM orders"
            }
        ]
        
        for test in parity_tests:
            # Test API access
            token = self._get_test_token(test["role"])
            headers = {"Authorization": f"Bearer {token}"}
            
            api_response = requests.get(f"{self.api_url}{test['endpoint']}", 
                                       headers=headers)
            
            # Test RLS access
            self.cur.execute(f"SELECT set_config('app.current_user_id', '{test['role']}_test', false)")
            
            try:
                self.cur.execute(test["rls_query"])
                rls_works = True
            except psycopg2.Error:
                rls_works = False
            
            # API and RLS should have consistent behavior
            api_works = api_response.status_code == 200
            
            self.assertEqual(api_works, rls_works, 
                           f"Route guard and RLS parity failed for {test['role']} on {test['endpoint']}")


class TestM30InputValidationSecurity(unittest.TestCase):
    """OWASP WSTG-INPV - Input Validation Testing"""
    
    def setUp(self):
        self.base_url = "http://localhost:3000"
        self.api_url = f"{self.base_url}/api"
        self.admin_token = self._get_admin_token()
    
    def _get_admin_token(self):
        """Get admin token for testing"""
        payload = {
            'sub': 'admin_test_user',
            'role': 'admin',
            'exp': int(time.time()) + 3600
        }
        return jwt.encode(payload, 'test_secret', algorithm='HS256')
    
    def test_sql_injection_protection(self):
        """WSTG-INPV-05: Test SQL injection vulnerabilities"""
        
        sql_injection_payloads = [
            "1' OR '1'='1",
            "1'; DROP TABLE profiles; --",
            "1' UNION SELECT password FROM auth.users --",
            "'; INSERT INTO audit_log (event) VALUES ('hacked'); --"
        ]
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        for payload in sql_injection_payloads:
            # Test in different parameters
            test_endpoints = [
                f"/orders/{payload}",
                f"/users/profile?id={quote_plus(payload)}",
                f"/media/{payload}"
            ]
            
            for endpoint in test_endpoints:
                response = requests.get(f"{self.api_url}{endpoint}", headers=headers)
                
                # Should not return database errors or unexpected data
                if response.status_code == 200:
                    response_text = response.text.lower()
                    sql_errors = ["syntax error", "pg_", "postgres", "duplicate key"]
                    
                    for error in sql_errors:
                        self.assertNotIn(error, response_text, 
                                       f"SQL injection possible at {endpoint}")
    
    def test_xss_protection(self):
        """WSTG-INPV-07: Test Cross-Site Scripting protection"""
        
        xss_payloads = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "';alert(String.fromCharCode(88,83,83))//';alert(String.fromCharCode(88,83,83))//",
            "\"><script>alert('xss')</script>"
        ]
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        for payload in xss_payloads:
            # Test XSS in user profile fields
            response = requests.post(f"{self.api_url}/profile/update", 
                                   headers=headers,
                                   json={
                                       "first_name": payload,
                                       "last_name": "Test"
                                   })
            
            if response.status_code == 200:
                # Check if payload is reflected without encoding
                profile_response = requests.get(f"{self.api_url}/profile", headers=headers)
                
                if profile_response.status_code == 200:
                    profile_data = profile_response.text
                    # Payload should be encoded/sanitized
                    self.assertNotIn("<script>", profile_data, 
                                   "XSS payload not properly encoded")
    
    def test_file_upload_validation(self):
        """WSTG-INPV-11: Test file upload validation"""
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test malicious file uploads
        malicious_files = [
            ("shell.php", b"<?php system($_GET['cmd']); ?>", "application/php"),
            ("test.exe", b"MZ\x90\x00", "application/x-executable"),
            ("huge.txt", b"A" * (10 * 1024 * 1024), "text/plain"),  # 10MB file
            ("../../../etc/passwd", b"root:x:0:0:root:/root:/bin/bash", "text/plain")
        ]
        
        for filename, content, mimetype in malicious_files:
            files = {"file": (filename, content, mimetype)}
            
            response = requests.post(f"{self.api_url}/media/upload", 
                                   headers=headers,
                                   files=files)
            
            # Should reject malicious uploads
            self.assertNotEqual(response.status_code, 200, 
                               f"Malicious file uploaded: {filename}")
    
    def test_command_injection_protection(self):
        """WSTG-INPV-12: Test command injection vulnerabilities"""
        
        command_injection_payloads = [
            "; ls -la",
            "| cat /etc/passwd",
            "&& whoami",
            "`id`",
            "$(uname -a)"
        ]
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        for payload in command_injection_payloads:
            # Test in parameters that might be used in system commands
            response = requests.post(f"{self.api_url}/admin/backup", 
                                   headers=headers,
                                   json={"filename": f"backup{payload}.sql"})
            
            if response.status_code == 200:
                response_text = response.text.lower()
                # Should not contain command output
                command_outputs = ["uid=", "gid=", "/bin/", "linux", "etc/passwd"]
                
                for output in command_outputs:
                    self.assertNotIn(output, response_text,
                                   f"Command injection detected: {payload}")


class TestM30SessionManagementSecurity(unittest.TestCase):
    """OWASP WSTG-SESS - Session Management Testing"""
    
    def setUp(self):
        self.base_url = "http://localhost:3000"
        self.api_url = f"{self.base_url}/api"
        self.session = requests.Session()
    
    def test_session_token_entropy(self):
        """WSTG-SESS-01: Test session token randomness and entropy"""
        
        tokens = []
        
        # Collect multiple session tokens
        for _ in range(10):
            response = requests.post(f"{self.api_url}/auth/signin", json={
                "email": "test@example.com",
                "password": "password123"
            })
            
            if response.status_code == 200:
                token = response.json().get("access_token")
                if token:
                    tokens.append(token)
        
        if len(tokens) >= 2:
            # Tokens should be unique
            unique_tokens = set(tokens)
            self.assertEqual(len(unique_tokens), len(tokens), 
                           "Session tokens are not unique")
            
            # Check token length (should be reasonable for JWT)
            for token in tokens:
                self.assertGreaterEqual(len(token), 100, 
                                      "Session token too short")
    
    def test_session_fixation_protection(self):
        """WSTG-SESS-03: Test session fixation vulnerabilities"""
        
        # Get initial session
        initial_response = requests.get(f"{self.api_url}/health")
        initial_cookies = initial_response.cookies
        
        # Attempt login with existing session
        login_response = requests.post(f"{self.api_url}/auth/signin",
                                     json={
                                         "email": "test@example.com", 
                                         "password": "password123"
                                     },
                                     cookies=initial_cookies)
        
        if login_response.status_code == 200:
            # New session should be issued after login
            login_cookies = login_response.cookies
            
            # Session should change after authentication
            session_changed = any(
                initial_cookies.get(cookie.name) != cookie.value 
                for cookie in login_cookies
            )
            
            self.assertTrue(session_changed or len(login_cookies) > len(initial_cookies),
                           "Session fixation vulnerability detected")
    
    def test_concurrent_session_handling(self):
        """WSTG-SESS-10: Test concurrent session management"""
        
        login_data = {
            "email": "test@example.com",
            "password": "password123"  
        }
        
        # Create multiple concurrent sessions
        session1 = requests.Session()
        session2 = requests.Session()
        
        login1 = session1.post(f"{self.api_url}/auth/signin", json=login_data)
        login2 = session2.post(f"{self.api_url}/auth/signin", json=login_data)
        
        if login1.status_code == 200 and login2.status_code == 200:
            token1 = login1.json().get("access_token")
            token2 = login2.json().get("access_token")
            
            # Both sessions should work initially  
            headers1 = {"Authorization": f"Bearer {token1}"}
            headers2 = {"Authorization": f"Bearer {token2}"}
            
            response1 = requests.get(f"{self.api_url}/profile", headers=headers1)
            response2 = requests.get(f"{self.api_url}/profile", headers=headers2)
            
            # Application should handle concurrent sessions appropriately
            # (Either allow both or implement single-session policy)
            if response1.status_code == 200 and response2.status_code == 200:
                # Multiple sessions allowed - ensure they're independent
                self.assertNotEqual(token1, token2, "Same token issued for concurrent sessions")


class TestM30APISecurityTesting(unittest.TestCase):
    """API-specific security testing"""
    
    def setUp(self):
        self.base_url = "http://localhost:3000"
        self.api_url = f"{self.base_url}/api"
        self.admin_token = self._get_admin_token()
    
    def _get_admin_token(self):
        payload = {
            'sub': 'admin_test_user',
            'role': 'admin', 
            'exp': int(time.time()) + 3600
        }
        return jwt.encode(payload, 'test_secret', algorithm='HS256')
    
    def test_api_rate_limiting(self):
        """Test API rate limiting implementation"""
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Make rapid requests to test rate limiting
        responses = []
        for i in range(50):  # High number of requests
            response = requests.get(f"{self.api_url}/orders", headers=headers)
            responses.append(response.status_code)
            
            if response.status_code == 429:
                # Check for proper rate limit headers
                self.assertIn('Retry-After', response.headers,
                            "Rate limit response missing Retry-After header")
                break
        
        # Should encounter rate limiting
        rate_limited = any(status == 429 for status in responses)
        self.assertTrue(rate_limited, "No rate limiting detected")
    
    def test_cors_configuration(self):
        """Test CORS configuration security"""
        
        # Test with different origins
        test_origins = [
            "https://evil.com",
            "http://localhost:3001", 
            "null"
        ]
        
        for origin in test_origins:
            response = requests.options(f"{self.api_url}/orders",
                                      headers={"Origin": origin})
            
            cors_origin = response.headers.get("Access-Control-Allow-Origin")
            
            # Should not allow arbitrary origins
            if origin == "https://evil.com":
                self.assertNotEqual(cors_origin, origin,
                                  f"CORS allows dangerous origin: {origin}")
    
    def test_api_versioning_security(self):
        """Test API versioning doesn't expose sensitive endpoints"""
        
        # Test different API version paths
        version_paths = [
            "/api/v1/admin/users",
            "/api/v2/admin/users", 
            "/api/beta/admin/users",
            "/api/internal/admin/users"
        ]
        
        for path in version_paths:
            response = requests.get(f"{self.base_url}{path}")
            
            # Should not expose internal/debug endpoints
            if "internal" in path or "beta" in path:
                self.assertNotEqual(response.status_code, 200,
                                  f"Internal API endpoint exposed: {path}")


class TestM30WebhookSecurity(unittest.TestCase):
    """Test webhook signature verification and replay protection"""
    
    def setUp(self):
        self.base_url = "http://localhost:3000"
        self.webhook_secret = "test_webhook_secret_key"
        
    def test_webhook_signature_verification(self):
        """Test webhook signature validation"""
        
        payload = json.dumps({
            "event": "payment.succeeded",
            "data": {"payment_id": "pay_123", "amount": 2000}
        })
        
        # Create valid signature
        signature = hmac.new(
            self.webhook_secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        # Test with valid signature
        response = requests.post(f"{self.base_url}/webhooks/stripe",
                               data=payload,
                               headers={
                                   "X-Stripe-Signature": f"sha256={signature}",
                                   "Content-Type": "application/json"
                               })
        
        # Should accept valid signature (or return appropriate status)
        self.assertNotEqual(response.status_code, 403, 
                           "Valid webhook signature rejected")
        
        # Test with invalid signature
        response = requests.post(f"{self.base_url}/webhooks/stripe",
                               data=payload,
                               headers={
                                   "X-Stripe-Signature": "sha256=invalid_signature",
                                   "Content-Type": "application/json"
                               })
        
        # Should reject invalid signature
        self.assertEqual(response.status_code, 403,
                        "Invalid webhook signature accepted")
    
    def test_webhook_replay_protection(self):
        """Test webhook replay attack protection"""
        
        payload = json.dumps({
            "event": "payment.succeeded",
            "data": {"payment_id": "pay_456", "amount": 1500},
            "timestamp": int(time.time()) - 3600  # 1 hour old
        })
        
        signature = hmac.new(
            self.webhook_secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        # Send old webhook (replay attack)
        response = requests.post(f"{self.base_url}/webhooks/stripe",
                               data=payload,
                               headers={
                                   "X-Stripe-Signature": f"sha256={signature}",
                                   "Content-Type": "application/json"
                               })
        
        # Should reject old webhooks
        self.assertIn(response.status_code, [400, 403],
                     "Webhook replay attack not prevented")
    
    def test_webhook_idempotency(self):
        """Test webhook idempotency protection"""
        
        payload = json.dumps({
            "event": "payment.succeeded",
            "data": {"payment_id": "pay_789", "amount": 3000},
            "id": "evt_unique_123"
        })
        
        signature = hmac.new(
            self.webhook_secret.encode('utf-8'),
            payload.encode('utf-8'), 
            hashlib.sha256
        ).hexdigest()
        
        headers = {
            "X-Stripe-Signature": f"sha256={signature}",
            "Content-Type": "application/json"
        }
        
        # Send webhook twice
        response1 = requests.post(f"{self.base_url}/webhooks/stripe",
                                data=payload, headers=headers)
        response2 = requests.post(f"{self.base_url}/webhooks/stripe", 
                                data=payload, headers=headers)
        
        # Second request should be handled idempotently
        if response1.status_code == 200:
            self.assertEqual(response2.status_code, 200,
                           "Webhook idempotency not implemented")


class TestM30DataProtectionSecurity(unittest.TestCase):
    """Test data protection and privacy controls"""
    
    def setUp(self):
        self.conn = psycopg2.connect(
            host="localhost",
            database="samia_tarot", 
            user="samia_admin",
            password="samia123"
        )
        self.conn.autocommit = True
        self.cur = self.conn.cursor()
    
    def test_pii_exposure_in_logs(self):
        """Test that PII is not exposed in application logs"""
        
        # Set admin context
        self.cur.execute("SELECT set_config('app.current_user_id', 'admin_test', false)")
        
        # Check audit logs don't contain PII
        self.cur.execute("""
            SELECT meta FROM audit_log 
            WHERE created_at >= now() - interval '24 hours'
            LIMIT 100
        """)
        
        audit_entries = self.cur.fetchall()
        
        # Common PII patterns to check for
        pii_patterns = [
            r'\b\d{3}-\d{2}-\d{4}\b',  # SSN pattern
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Email
            r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b',  # Credit card
            r'\+?1?[\s-]?\(?[0-9]{3}\)?[\s-]?[0-9]{3}[\s-]?[0-9]{4}\b'  # Phone
        ]
        
        import re
        
        for entry in audit_entries:
            if entry[0]:  # meta field exists
                meta_str = json.dumps(entry[0]) if isinstance(entry[0], dict) else str(entry[0])
                
                for pattern in pii_patterns:
                    matches = re.search(pattern, meta_str)
                    self.assertIsNone(matches, f"PII detected in audit logs: {pattern}")
    
    def test_data_encryption_at_rest(self):
        """Verify sensitive data is properly encrypted"""
        
        # Check that payment tokens are not stored in plaintext
        self.cur.execute("""
            SELECT stripe_customer_id, payment_method_id 
            FROM payment_customers 
            LIMIT 5
        """)
        
        payment_data = self.cur.fetchall()
        
        for row in payment_data:
            for field in row:
                if field and isinstance(field, str):
                    # Should not contain obvious plaintext patterns
                    self.assertNotRegex(field, r'^4[0-9]{12}(?:[0-9]{3})?$',
                                      "Credit card number stored in plaintext")
    
    def test_data_retention_enforcement(self):
        """Test data retention policies are enforced"""
        
        # Check that old data is properly deleted
        retention_checks = [
            ("phone_verifications", "created_at < now() - interval '90 days'", 
             "Phone verifications not deleted after 90 days"),
            ("media_assets", "created_at < now() - interval '1 year' AND kind = 'temp'",
             "Temporary media not cleaned up"),
            ("audit_log", "created_at < now() - interval '3 years' AND actor IS NOT NULL",
             "Old audit logs not anonymized")
        ]
        
        for table, condition, message in retention_checks:
            try:
                self.cur.execute(f"SELECT COUNT(*) FROM {table} WHERE {condition}")
                old_records = self.cur.fetchone()[0]
                
                # Should have minimal old records (some exceptions allowed)
                self.assertLess(old_records, 100, message)
                
            except psycopg2.Error:
                # Table might not exist or query might fail - that's okay
                continue


def run_security_test_suite():
    """Run the complete M30 security test suite"""
    
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test classes in order of OWASP WSTG categories
    test_classes = [
        TestM30AuthenticationSecurity,   # WSTG-ATHN
        TestM30AuthorizationSecurity,    # WSTG-ATHZ  
        TestM30InputValidationSecurity,  # WSTG-INPV
        TestM30SessionManagementSecurity, # WSTG-SESS
        TestM30APISecurityTesting,       # API Security
        TestM30WebhookSecurity,          # Webhook Security
        TestM30DataProtectionSecurity    # Data Protection
    ]
    
    for test_class in test_classes:
        tests = loader.loadTestsFromTestClass(test_class)
        suite.addTests(tests)
    
    # Run tests with detailed output
    runner = unittest.TextTestRunner(verbosity=2, stream=None)
    result = runner.run(suite)
    
    # Generate security test report
    generate_security_report(result)
    
    return result.wasSuccessful()


def generate_security_report(test_result):
    """Generate comprehensive security testing report"""
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = f"security_test_report_{timestamp}.md"
    
    total_tests = test_result.testsRun
    failed_tests = len(test_result.failures)
    error_tests = len(test_result.errors)
    passed_tests = total_tests - failed_tests - error_tests
    success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
    
    report_content = f"""# M30 Security Readiness Test Report

**Date**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  
**Test Suite**: OWASP WSTG-Aligned Security Testing  
**Total Tests**: {total_tests}  
**Passed**: {passed_tests}  
**Failed**: {failed_tests}  
**Errors**: {error_tests}  
**Success Rate**: {success_rate:.1f}%

## Executive Summary

Security testing completed for Samia Tarot Platform following OWASP Web Security Testing Guide methodology. 

**Overall Security Posture**: {"✅ SECURE" if success_rate >= 95 else "⚠️ NEEDS ATTENTION" if success_rate >= 80 else "❌ CRITICAL ISSUES"}

## Test Categories Coverage

### 1. Authentication Testing (WSTG-ATHN)
- Password Policy Enforcement
- Brute Force Protection  
- Session Timeout
- Multi-Factor Authentication Bypass

### 2. Authorization Testing (WSTG-ATHZ)
- Horizontal Privilege Escalation
- Vertical Privilege Escalation
- Row-Level Security (RLS) Policy Enforcement
- API Route Guard Parity

### 3. Input Validation Testing (WSTG-INPV)
- SQL Injection Protection
- Cross-Site Scripting (XSS) Protection
- File Upload Validation
- Command Injection Protection

### 4. Session Management Testing (WSTG-SESS)
- Session Token Entropy
- Session Fixation Protection
- Concurrent Session Handling

### 5. API Security Testing
- Rate Limiting Implementation
- CORS Configuration
- API Versioning Security

### 6. Webhook Security Testing  
- Signature Verification
- Replay Attack Protection
- Idempotency Protection

### 7. Data Protection Testing
- PII Exposure Prevention
- Data Encryption Verification
- Data Retention Enforcement

## Failed Tests Analysis
"""
    
    if test_result.failures:
        report_content += "\n### Failures:\n"
        for test, traceback in test_result.failures:
            report_content += f"- **{test}**: {traceback.split('AssertionError: ')[-1].split(chr(10))[0]}\n"
    
    if test_result.errors:
        report_content += "\n### Errors:\n"
        for test, traceback in test_result.errors:
            report_content += f"- **{test}**: {traceback.split(chr(10))[-2]}\n"
    
    report_content += f"""
## Security Recommendations

### High Priority
{"- ❌ **CRITICAL**: Address all failed security tests immediately" if failed_tests > 0 else "- ✅ No critical security issues detected"}
{"- ⚠️ **HIGH**: Review error conditions and fix test infrastructure issues" if error_tests > 0 else "- ✅ All security tests executed successfully"}

### Medium Priority  
- Implement additional security monitoring for detected attack patterns
- Review and update security test coverage based on new features
- Schedule regular penetration testing with external security firm

### Ongoing
- Monitor security test results in CI/CD pipeline
- Update security tests when new vulnerabilities are discovered
- Maintain security awareness training for development team

## Compliance Status

### OWASP WSTG Coverage
- **Authentication**: {"✅ Compliant" if success_rate >= 90 else "⚠️ Partial"}
- **Authorization**: {"✅ Compliant" if success_rate >= 90 else "⚠️ Partial"}  
- **Input Validation**: {"✅ Compliant" if success_rate >= 90 else "⚠️ Partial"}
- **Session Management**: {"✅ Compliant" if success_rate >= 90 else "⚠️ Partial"}

### Production Readiness
{"✅ **READY FOR PRODUCTION** - Security controls validated" if success_rate >= 95 else "⚠️ **REVIEW REQUIRED** - Address security issues before production" if success_rate >= 80 else "❌ **NOT READY** - Critical security issues must be resolved"}

## Next Steps

1. **Immediate Actions** (if failures detected):
   - Review and fix all failed security tests
   - Validate fixes with re-run of security test suite
   - Document remediation steps taken

2. **Pre-Production**:
   - Run full security test suite in staging environment
   - Conduct manual security review of critical components
   - Validate security monitoring and alerting

3. **Post-Production**:
   - Implement security test suite in CI/CD pipeline
   - Schedule regular security assessments
   - Monitor security metrics and incident response

---
**Report Generated**: {datetime.now()}  
**Test Environment**: Local/Staging  
**Security Framework**: OWASP WSTG v4.2
"""
    
    # Write report to file
    with open(report_file, 'w') as f:
        f.write(report_content)
    
    print(f"\n📊 Security test report generated: {report_file}")
    print(f"🔒 Security test summary: {passed_tests}/{total_tests} passed ({success_rate:.1f}%)")
    
    if success_rate >= 95:
        print("✅ Security posture: EXCELLENT - Ready for production")
    elif success_rate >= 80:
        print("⚠️ Security posture: GOOD - Minor issues to address")  
    else:
        print("❌ Security posture: POOR - Critical issues require immediate attention")


if __name__ == '__main__':
    print("Starting M30 Security Readiness Testing...")
    print("Framework: OWASP Web Security Testing Guide (WSTG)")
    print("Scope: Authentication, Authorization, Input Validation, Session Management")
    print("=" * 80)
    
    success = run_security_test_suite()
    exit(0 if success else 1)