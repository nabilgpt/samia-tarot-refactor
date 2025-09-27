# test_payments_matrix.py - M20 Payments Matrix + Fallback Tests
# Comprehensive test coverage for payment provider routing, auto-fallback, and compliance

import pytest
import psycopg2
from psycopg2.pool import SimpleConnectionPool
import json
import uuid
import hashlib
import hmac
import base64
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

# Database connection for testing
DSN = "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

class TestPaymentMatrix:
    """Test country-aware payment provider routing and matrix logic"""
    
    @classmethod
    def setup_class(cls):
        """Set up test database connection"""
        cls.pool = SimpleConnectionPool(minconn=1, maxconn=3, dsn=DSN)
        cls.setup_test_data()
    
    @classmethod
    def setup_test_data(cls):
        """Create test users and orders for payment testing"""
        conn = cls.pool.getconn()
        try:
            with conn.cursor() as cur:
                # Create test client user
                test_user_id = str(uuid.uuid4())
                cur.execute("""
                    INSERT INTO profiles (id, email, role_id) 
                    VALUES (%s, 'test_client@example.com', 5)
                    ON CONFLICT (id) DO NOTHING
                """, (test_user_id,))
                cls.test_user_id = test_user_id
                
                # Create test service
                cur.execute("""
                    INSERT INTO services (id, code, name) 
                    VALUES (999, 'test_service', 'Test Service') 
                    ON CONFLICT (code) DO NOTHING
                """)
                
                # Create test order
                cur.execute("""
                    INSERT INTO orders (id, user_id, service_id, status) 
                    VALUES (999, %s, 999, 'new') 
                    ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id
                """, (test_user_id,))
                
                conn.commit()
        finally:
            cls.pool.putconn(conn)
    
    @classmethod
    def teardown_class(cls):
        """Clean up test data"""
        conn = cls.pool.getconn()
        try:
            with conn.cursor() as cur:
                # Clean up test data
                cur.execute("DELETE FROM payment_attempts WHERE order_id = 999")
                cur.execute("DELETE FROM manual_transfers WHERE order_id = 999")
                cur.execute("DELETE FROM orders WHERE id = 999")
                cur.execute("DELETE FROM services WHERE id = 999")
                cur.execute("DELETE FROM profiles WHERE id = %s", (cls.test_user_id,))
                conn.commit()
        finally:
            cls.pool.putconn(conn)
            cls.pool.closeall()
    
    def db_fetchone(self, sql, params=None):
        """Execute SQL and return first row"""
        conn = self.pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute(sql, params or ())
                return cur.fetchone()
        finally:
            self.pool.putconn(conn)
    
    def db_exec(self, sql, params=None):
        """Execute SQL with params"""
        conn = self.pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute(sql, params or ())
                conn.commit()
                return cur.rowcount
        finally:
            self.pool.putconn(conn)
    
    def test_country_provider_routing(self):
        """Test that correct providers are chosen by country"""
        
        # Test default EU countries → Stripe
        result = self.db_fetchone("SELECT get_payment_provider('DE')")
        assert result[0] == 'stripe', "Germany should use Stripe"
        
        result = self.db_fetchone("SELECT get_payment_provider('GB')")
        assert result[0] == 'stripe', "UK should use Stripe"
        
        result = self.db_fetchone("SELECT get_payment_provider('AE')")
        assert result[0] == 'stripe', "UAE should use Stripe"
        
        # Test US/CA/AU/NZ countries → Square
        result = self.db_fetchone("SELECT get_payment_provider('US')")
        assert result[0] == 'square', "US should use Square"
        
        result = self.db_fetchone("SELECT get_payment_provider('CA')")
        assert result[0] == 'square', "Canada should use Square"
        
        result = self.db_fetchone("SELECT get_payment_provider('AU')")
        assert result[0] == 'square', "Australia should use Square"
        
        # Test fallback for unknown country
        result = self.db_fetchone("SELECT get_payment_provider('XX')")
        assert result[0] == 'stripe', "Unknown country should default to Stripe"
    
    def test_fallback_provider_logic(self):
        """Test fallback provider selection"""
        
        # Test Stripe → Square
        result = self.db_fetchone("SELECT get_fallback_provider('DE', 'stripe')")
        assert result[0] == 'square', "Stripe should fallback to Square"
        
        # Test Square → Stripe
        result = self.db_fetchone("SELECT get_fallback_provider('US', 'square')")
        assert result[0] == 'stripe', "Square should fallback to Stripe"
    
    def test_consecutive_failure_detection(self):
        """Test detection of consecutive payment failures for fallback"""
        
        test_order_id = 999
        
        # Clean up any existing attempts
        self.db_exec("DELETE FROM payment_attempts WHERE order_id = %s", (test_order_id,))
        
        # Should not trigger fallback with no failures
        result = self.db_fetchone("SELECT check_consecutive_failures(%s, 'stripe')", (test_order_id,))
        assert result[0] == False, "No failures should not trigger fallback"
        
        # Add one failure - should not trigger
        self.db_exec("""
            INSERT INTO payment_attempts (order_id, provider, attempt_number, status)
            VALUES (%s, 'stripe', 1, 'failed')
        """, (test_order_id,))
        
        result = self.db_fetchone("SELECT check_consecutive_failures(%s, 'stripe')", (test_order_id,))
        assert result[0] == False, "One failure should not trigger fallback"
        
        # Add second consecutive failure - should trigger
        self.db_exec("""
            INSERT INTO payment_attempts (order_id, provider, attempt_number, status)
            VALUES (%s, 'stripe', 2, 'failed')
        """, (test_order_id,))
        
        result = self.db_fetchone("SELECT check_consecutive_failures(%s, 'stripe')", (test_order_id,))
        assert result[0] == True, "Two consecutive failures should trigger fallback"
        
        # Add success - should reset counter
        self.db_exec("""
            INSERT INTO payment_attempts (order_id, provider, attempt_number, status)
            VALUES (%s, 'stripe', 3, 'succeeded')
        """, (test_order_id,))
        
        result = self.db_fetchone("SELECT check_consecutive_failures(%s, 'stripe')", (test_order_id,))
        assert result[0] == False, "Success should reset failure counter"


class TestPaymentCheckout:
    """Test payment checkout endpoint with provider matrix"""
    
    @classmethod
    def setup_class(cls):
        """Set up test environment"""
        cls.pool = SimpleConnectionPool(minconn=1, maxconn=3, dsn=DSN)
        cls.setup_test_data()
    
    @classmethod
    def setup_test_data(cls):
        """Create test data"""
        conn = cls.pool.getconn()
        try:
            with conn.cursor() as cur:
                cls.test_user_id = str(uuid.uuid4())
                cur.execute("""
                    INSERT INTO profiles (id, email, role_id) 
                    VALUES (%s, 'checkout_test@example.com', 5)
                    ON CONFLICT (id) DO NOTHING
                """, (cls.test_user_id,))
                
                cur.execute("""
                    INSERT INTO orders (id, user_id, service_id, status) 
                    VALUES (998, %s, 999, 'new') 
                    ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id
                """, (cls.test_user_id,))
                
                conn.commit()
        finally:
            cls.pool.putconn(conn)
    
    @classmethod
    def teardown_class(cls):
        """Clean up"""
        conn = cls.pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM payment_attempts WHERE order_id = 998")
                cur.execute("DELETE FROM orders WHERE id = 998")
                cur.execute("DELETE FROM profiles WHERE id = %s", (cls.test_user_id,))
                conn.commit()
        finally:
            cls.pool.putconn(conn)
            cls.pool.closeall()
    
    def db_fetchone(self, sql, params=None):
        conn = self.pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute(sql, params or ())
                return cur.fetchone()
        finally:
            self.pool.putconn(conn)
    
    @patch('api.STRIPE_SECRET_KEY', 'sk_test_mock')
    def test_checkout_stripe_country(self):
        """Test checkout with Stripe for EU country"""
        from api import payment_checkout, PaymentCheckoutRequest
        
        request = PaymentCheckoutRequest(
            order_id=998,
            amount_cents=5000,
            currency="EUR",
            country_code="DE"
        )
        
        # Mock the checkout call
        with patch('api.get_user_role', return_value='client'):
            result = payment_checkout(request, x_user_id=self.test_user_id)
        
        assert result["provider"] == "stripe", "Germany should use Stripe"
        assert result["amount_cents"] == 5000
        assert result["currency"] == "EUR"
        assert "client_secret" in result["client_params"]
    
    @patch('api.SQUARE_ACCESS_TOKEN', 'sq_test_mock')
    @patch('api.SQUARE_APPLICATION_ID', 'app_mock')
    def test_checkout_square_country(self):
        """Test checkout with Square for US country"""
        from api import payment_checkout, PaymentCheckoutRequest
        
        request = PaymentCheckoutRequest(
            order_id=998,
            amount_cents=3000,
            currency="USD",
            country_code="US"
        )
        
        # Mock the checkout call
        with patch('api.get_user_role', return_value='client'):
            result = payment_checkout(request, x_user_id=self.test_user_id)
        
        assert result["provider"] == "square", "US should use Square"
        assert result["amount_cents"] == 3000
        assert result["currency"] == "USD"
        assert "payment_id" in result["client_params"]


class TestWebhookHandlers:
    """Test webhook signature verification and idempotency"""
    
    @classmethod
    def setup_class(cls):
        """Set up test environment"""
        cls.pool = SimpleConnectionPool(minconn=1, maxconn=3, dsn=DSN)
        cls.setup_test_data()
    
    @classmethod
    def setup_test_data(cls):
        """Create test data"""
        conn = cls.pool.getconn()
        try:
            with conn.cursor() as cur:
                cls.test_user_id = str(uuid.uuid4())
                cur.execute("""
                    INSERT INTO profiles (id, email, role_id) 
                    VALUES (%s, 'webhook_test@example.com', 5)
                    ON CONFLICT (id) DO NOTHING
                """, (cls.test_user_id,))
                
                cur.execute("""
                    INSERT INTO orders (id, user_id, service_id, status) 
                    VALUES (997, %s, 999, 'new') 
                    ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id
                """, (cls.test_user_id,))
                
                # Create payment attempt for webhook testing
                cur.execute("""
                    INSERT INTO payment_attempts (order_id, provider, attempt_number, status, provider_intent_id, amount_cents)
                    VALUES (997, 'stripe', 1, 'processing', 'pi_test_webhook_123', 2000)
                    ON CONFLICT DO NOTHING
                """)
                
                conn.commit()
        finally:
            cls.pool.putconn(conn)
    
    @classmethod
    def teardown_class(cls):
        """Clean up"""
        conn = cls.pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM payment_events WHERE provider IN ('stripe', 'square')")
                cur.execute("DELETE FROM payment_attempts WHERE order_id = 997")
                cur.execute("DELETE FROM orders WHERE id = 997")
                cur.execute("DELETE FROM profiles WHERE id = %s", (cls.test_user_id,))
                conn.commit()
        finally:
            cls.pool.putconn(conn)
            cls.pool.closeall()
    
    def test_stripe_signature_verification(self):
        """Test Stripe webhook signature verification"""
        from api import verify_stripe_signature
        
        secret = "whsec_test_secret"
        payload = b'{"test": "data"}'
        
        # Create valid signature
        import hmac
        import hashlib
        valid_signature = f"sha256={hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()}"
        
        # Test valid signature
        assert verify_stripe_signature(payload, valid_signature, secret) == True
        
        # Test invalid signature
        assert verify_stripe_signature(payload, "invalid_signature", secret) == False
    
    def test_square_signature_verification(self):
        """Test Square webhook signature verification"""
        from api import verify_square_signature
        
        secret = "sq_test_secret"
        payload = '{"test": "data"}'
        signature = "test_signature"
        
        # Create valid signature  
        import hmac
        import base64
        expected_sig = base64.b64encode(
            hmac.new(
                secret.encode('utf-8'),
                (signature + payload).encode('utf-8'), 
                hashlib.sha1
            ).digest()
        ).decode()
        
        # Test valid signature
        assert verify_square_signature(payload, expected_sig, secret) == True
        
        # Test invalid signature
        assert verify_square_signature(payload, "invalid_signature", secret) == False
    
    @patch('api.STRIPE_WEBHOOK_SECRET', 'whsec_test')
    def test_stripe_webhook_idempotency(self):
        """Test Stripe webhook idempotency"""
        from api import stripe_webhook_handler
        
        webhook_payload = {
            "id": "evt_test_idempotency_123",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_test_webhook_123",
                    "amount": 2000,
                    "currency": "usd",
                    "status": "succeeded"
                }
            }
        }
        
        # Mock signature verification
        with patch('api.verify_stripe_signature', return_value=True):
            # First call should process
            result1 = stripe_webhook_handler(webhook_payload, stripe_signature="valid_sig")
            assert result1["message"] == "Webhook processed successfully"
            
            # Second call should be idempotent
            result2 = stripe_webhook_handler(webhook_payload, stripe_signature="valid_sig")
            assert result2["message"] == "Event already processed"


class TestManualPayments:
    """Test manual payment submission and AML/KYC compliance"""
    
    @classmethod
    def setup_class(cls):
        """Set up test environment"""
        cls.pool = SimpleConnectionPool(minconn=1, maxconn=3, dsn=DSN)
        cls.setup_test_data()
    
    @classmethod
    def setup_test_data(cls):
        """Create test data"""
        conn = cls.pool.getconn()
        try:
            with conn.cursor() as cur:
                cls.test_user_id = str(uuid.uuid4())
                cur.execute("""
                    INSERT INTO profiles (id, email, role_id) 
                    VALUES (%s, 'manual_test@example.com', 5)
                    ON CONFLICT (id) DO NOTHING
                """, (cls.test_user_id,))
                
                cur.execute("""
                    INSERT INTO orders (id, user_id, service_id, status) 
                    VALUES (996, %s, 999, 'new') 
                    ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id
                """, (cls.test_user_id,))
                
                conn.commit()
        finally:
            cls.pool.putconn(conn)
    
    @classmethod
    def teardown_class(cls):
        """Clean up"""
        conn = cls.pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM aml_kyc_checks WHERE user_id = %s", (cls.test_user_id,))
                cur.execute("DELETE FROM manual_transfers WHERE order_id = 996")
                cur.execute("DELETE FROM orders WHERE id = 996")
                cur.execute("DELETE FROM profiles WHERE id = %s", (cls.test_user_id,))
                conn.commit()
        finally:
            cls.pool.putconn(conn)
            cls.pool.closeall()
    
    def test_manual_transfer_submission(self):
        """Test manual transfer submission with AML/KYC"""
        from api import manual_payment_submission, ManualTransferRequest
        
        request = ManualTransferRequest(
            order_id=996,
            amount_cents=10000,
            currency="USD",
            transfer_type="usdt",
            transaction_ref="0x1234567890abcdef"
        )
        
        with patch('api.get_user_role', return_value='client'):
            result = manual_payment_submission(request, x_user_id=self.test_user_id)
        
        assert result["status"] == "pending_review"
        assert result["transfer_id"] is not None
        assert result["aml_kyc_id"] is not None
        assert "submitted for admin review" in result["message"]
    
    def test_invalid_transfer_type(self):
        """Test rejection of invalid transfer types"""
        from api import manual_payment_submission, ManualTransferRequest
        from fastapi import HTTPException
        
        request = ManualTransferRequest(
            order_id=996,
            amount_cents=5000,
            currency="USD",
            transfer_type="invalid_type",
            transaction_ref="test_ref"
        )
        
        with patch('api.get_user_role', return_value='client'):
            with pytest.raises(HTTPException) as exc_info:
                manual_payment_submission(request, x_user_id=self.test_user_id)
            
            assert exc_info.value.status_code == 400
            assert "Invalid transfer_type" in str(exc_info.value.detail)


class TestWalletSystem:
    """Test wallet balance management and ledger consistency"""
    
    @classmethod
    def setup_class(cls):
        """Set up test environment"""
        cls.pool = SimpleConnectionPool(minconn=1, maxconn=3, dsn=DSN)
        cls.setup_test_data()
    
    @classmethod
    def setup_test_data(cls):
        """Create test data"""
        conn = cls.pool.getconn()
        try:
            with conn.cursor() as cur:
                cls.test_user_id = str(uuid.uuid4())
                cur.execute("""
                    INSERT INTO profiles (id, email, role_id) 
                    VALUES (%s, 'wallet_test@example.com', 5)
                    ON CONFLICT (id) DO NOTHING
                """, (cls.test_user_id,))
                
                conn.commit()
        finally:
            cls.pool.putconn(conn)
    
    @classmethod
    def teardown_class(cls):
        """Clean up"""
        conn = cls.pool.getconn()
        try:
            with conn.cursor() as cur:
                # Clean up wallet data
                cur.execute("""
                    DELETE FROM wallet_ledger 
                    WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id = %s)
                """, (cls.test_user_id,))
                cur.execute("DELETE FROM wallets WHERE user_id = %s", (cls.test_user_id,))
                cur.execute("DELETE FROM profiles WHERE id = %s", (cls.test_user_id,))
                conn.commit()
        finally:
            cls.pool.putconn(conn)
            cls.pool.closeall()
    
    def test_wallet_creation_and_balance(self):
        """Test wallet creation and balance retrieval"""
        from api import get_user_wallet, add_wallet_transaction
        
        # Get or create wallet
        wallet_id, initial_balance = get_user_wallet(self.test_user_id, "USD")
        
        assert wallet_id is not None
        assert initial_balance == 0, "New wallet should have zero balance"
        
        # Add transaction
        new_balance = add_wallet_transaction(
            wallet_id, 5000, 'topup',
            description="Test topup",
            created_by=self.test_user_id
        )
        
        assert new_balance == 5000, "Balance should reflect topup"
        
        # Verify wallet balance updated
        _, current_balance = get_user_wallet(self.test_user_id, "USD")
        assert current_balance == 5000, "Wallet balance should match ledger"
    
    def test_insufficient_balance_prevention(self):
        """Test that withdrawals are prevented when balance is insufficient"""
        from api import get_user_wallet, add_wallet_transaction
        from fastapi import HTTPException
        
        wallet_id, _ = get_user_wallet(self.test_user_id, "EUR")
        
        # Attempt to withdraw more than available
        with pytest.raises(HTTPException) as exc_info:
            add_wallet_transaction(
                wallet_id, -10000, 'payment',  # Negative amount for withdrawal
                description="Test overdraft attempt"
            )
        
        assert exc_info.value.status_code == 400
        assert "Insufficient wallet balance" in str(exc_info.value.detail)
    
    def test_wallet_ledger_consistency(self):
        """Test that ledger entries maintain balance consistency"""
        from api import get_user_wallet, add_wallet_transaction
        
        wallet_id, _ = get_user_wallet(self.test_user_id, "GBP")
        
        # Series of transactions
        transactions = [
            (2000, 'topup', "Initial topup"),
            (1500, 'topup', "Second topup"),
            (-500, 'payment', "Payment deduction"),
            (300, 'refund', "Refund credit")
        ]
        
        expected_balance = 0
        for amount, tx_type, desc in transactions:
            expected_balance += amount
            actual_balance = add_wallet_transaction(
                wallet_id, amount, tx_type, description=desc
            )
            assert actual_balance == expected_balance, f"Balance mismatch after {desc}"


class TestRLSPolicyParity:
    """Test that RLS policies match route guard authorization exactly"""
    
    @classmethod
    def setup_class(cls):
        """Set up test environment"""
        cls.pool = SimpleConnectionPool(minconn=1, maxconn=3, dsn=DSN)
        cls.setup_test_users()
    
    @classmethod
    def setup_test_users(cls):
        """Create test users with different roles"""
        conn = cls.pool.getconn()
        try:
            with conn.cursor() as cur:
                cls.client_user_id = str(uuid.uuid4())
                cls.admin_user_id = str(uuid.uuid4())
                cls.other_client_id = str(uuid.uuid4())
                
                # Create client user
                cur.execute("""
                    INSERT INTO profiles (id, email, role_id) 
                    VALUES (%s, 'rls_client@example.com', 5)
                    ON CONFLICT (id) DO NOTHING
                """, (cls.client_user_id,))
                
                # Create admin user  
                cur.execute("""
                    INSERT INTO profiles (id, email, role_id) 
                    VALUES (%s, 'rls_admin@example.com', 2)
                    ON CONFLICT (id) DO NOTHING
                """, (cls.admin_user_id,))
                
                # Create other client
                cur.execute("""
                    INSERT INTO profiles (id, email, role_id) 
                    VALUES (%s, 'rls_other@example.com', 5)
                    ON CONFLICT (id) DO NOTHING
                """, (cls.other_client_id,))
                
                # Create test orders
                cur.execute("""
                    INSERT INTO orders (id, user_id, service_id) 
                    VALUES (995, %s, 999), (994, %s, 999)
                    ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id
                """, (cls.client_user_id, cls.other_client_id))
                
                conn.commit()
        finally:
            cls.pool.putconn(conn)
    
    @classmethod
    def teardown_class(cls):
        """Clean up"""
        conn = cls.pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM payment_attempts WHERE order_id IN (995, 994)")
                cur.execute("DELETE FROM orders WHERE id IN (995, 994)")
                cur.execute("DELETE FROM profiles WHERE id IN (%s, %s, %s)", 
                           (cls.client_user_id, cls.admin_user_id, cls.other_client_id))
                conn.commit()
        finally:
            cls.pool.putconn(conn)
            cls.pool.closeall()
    
    def test_client_can_only_see_own_payments(self):
        """Test client can only see their own payment attempts"""
        conn = self.pool.getconn()
        try:
            with conn.cursor() as cur:
                # Set user context for client
                cur.execute("SET app.current_user_id = %s", (self.client_user_id,))
                
                # Create payment attempt for client's order
                cur.execute("""
                    INSERT INTO payment_attempts (order_id, provider, attempt_number, status, amount_cents, idempotency_key)
                    VALUES (995, 'stripe', 1, 'processing', 5000, 'test_client_key')
                    ON CONFLICT DO NOTHING
                """)
                
                # Create payment attempt for other client's order
                cur.execute("""
                    INSERT INTO payment_attempts (order_id, provider, attempt_number, status, amount_cents, idempotency_key)
                    VALUES (994, 'stripe', 1, 'processing', 3000, 'test_other_key')
                    ON CONFLICT DO NOTHING
                """)
                
                # Client should only see their own attempts
                cur.execute("SELECT COUNT(*) FROM payment_attempts WHERE order_id = 995")
                own_count = cur.fetchone()[0]
                assert own_count == 1, "Client should see their own payment attempts"
                
                cur.execute("SELECT COUNT(*) FROM payment_attempts WHERE order_id = 994")
                other_count = cur.fetchone()[0] 
                assert other_count == 0, "Client should not see other client's payment attempts"
                
        finally:
            self.pool.putconn(conn)
    
    def test_admin_can_see_all_payments(self):
        """Test admin can see all payment attempts"""
        conn = self.pool.getconn()
        try:
            with conn.cursor() as cur:
                # Set user context for admin
                cur.execute("SET app.current_user_id = %s", (self.admin_user_id,))
                
                # Admin should see all attempts
                cur.execute("SELECT COUNT(*) FROM payment_attempts WHERE order_id IN (995, 994)")
                total_count = cur.fetchone()[0]
                assert total_count >= 1, "Admin should see all payment attempts"
                
        finally:
            self.pool.putconn(conn)
    
    def test_wallet_rls_parity(self):
        """Test wallet RLS matches authorization logic"""
        conn = self.pool.getconn()
        try:
            with conn.cursor() as cur:
                # Create wallets for both users
                cur.execute("SET app.current_user_id = %s", (self.client_user_id,))
                cur.execute("""
                    INSERT INTO wallets (user_id, currency, balance_cents) 
                    VALUES (%s, 'USD', 1000)
                    ON CONFLICT (user_id, currency) DO NOTHING
                """, (self.client_user_id,))
                
                cur.execute("SET app.current_user_id = %s", (self.other_client_id,))
                cur.execute("""
                    INSERT INTO wallets (user_id, currency, balance_cents) 
                    VALUES (%s, 'USD', 2000)
                    ON CONFLICT (user_id, currency) DO NOTHING
                """, (self.other_client_id,))
                
                # Client should only see their own wallet
                cur.execute("SET app.current_user_id = %s", (self.client_user_id,))
                cur.execute("SELECT COUNT(*) FROM wallets WHERE user_id = %s", (self.client_user_id,))
                own_wallet = cur.fetchone()[0]
                assert own_wallet == 1, "Client should see their own wallet"
                
                cur.execute("SELECT COUNT(*) FROM wallets WHERE user_id = %s", (self.other_client_id,))
                other_wallet = cur.fetchone()[0] 
                assert other_wallet == 0, "Client should not see other wallets"
                
                # Admin should see all wallets
                cur.execute("SET app.current_user_id = %s", (self.admin_user_id,))
                cur.execute("SELECT COUNT(*) FROM wallets WHERE user_id IN (%s, %s)", 
                           (self.client_user_id, self.other_client_id))
                admin_count = cur.fetchone()[0]
                assert admin_count >= 1, "Admin should see all wallets"
                
        finally:
            self.pool.putconn(conn)


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])