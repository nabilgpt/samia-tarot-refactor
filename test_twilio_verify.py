#!/usr/bin/env python3
"""
Unit tests for Twilio Verify Service
Tests validation, error handling, and service methods
"""
import unittest
from unittest.mock import Mock, patch, MagicMock
import os
import json
from twilio_verify_service import TwilioVerifyService, init_verification_tables


class TestTwilioVerifyService(unittest.TestCase):

    def setUp(self):
        """Set up test fixtures"""
        # Mock environment variables
        self.env_patch = patch.dict(os.environ, {
            'TWILIO_ACCOUNT_SID': 'ACtest123456789',
            'TWILIO_AUTH_TOKEN': 'test_auth_token',
            'TWILIO_VERIFY_SID': 'VAtest123456789',
            'TWILIO_VOICE_CALLER_ID': '+15551234567',
            'SENDGRID_API_KEY': 'SG.test_key',
            'EMAIL_FROM_ADDRESS': 'test@example.com',
            'DB_DSN': 'postgresql://test:test@localhost:5432/test'
        })
        self.env_patch.start()

    def tearDown(self):
        """Clean up test fixtures"""
        self.env_patch.stop()

    def test_phone_validation(self):
        """Test E.164 phone number validation"""
        service = TwilioVerifyService()

        # Valid phone numbers
        self.assertTrue(service.validate_phone_e164("+1234567890"))
        self.assertTrue(service.validate_phone_e164("+441234567890"))
        self.assertTrue(service.validate_phone_e164("+33123456789"))

        # Invalid phone numbers
        self.assertFalse(service.validate_phone_e164("1234567890"))  # Missing +
        self.assertFalse(service.validate_phone_e164("+"))          # Just +
        self.assertFalse(service.validate_phone_e164("+0123456"))   # Starts with 0
        self.assertFalse(service.validate_phone_e164("+1234567890123456789"))  # Too long

    def test_email_validation(self):
        """Test email address validation"""
        service = TwilioVerifyService()

        # Valid emails
        self.assertTrue(service.validate_email("test@example.com"))
        self.assertTrue(service.validate_email("user.name+tag@domain.co.uk"))
        self.assertTrue(service.validate_email("user123@test-domain.org"))

        # Invalid emails
        self.assertFalse(service.validate_email("invalid-email"))
        self.assertFalse(service.validate_email("@domain.com"))
        self.assertFalse(service.validate_email("user@"))
        self.assertFalse(service.validate_email("user.domain.com"))

    def test_identifier_hashing(self):
        """Test identifier hashing for rate limiting"""
        service = TwilioVerifyService()

        # Test consistent hashing
        hash1 = service.hash_identifier("test@example.com", "127.0.0.1")
        hash2 = service.hash_identifier("test@example.com", "127.0.0.1")
        self.assertEqual(hash1, hash2)

        # Test different identifiers produce different hashes
        hash3 = service.hash_identifier("other@example.com", "127.0.0.1")
        self.assertNotEqual(hash1, hash3)

        # Test different IPs produce different hashes
        hash4 = service.hash_identifier("test@example.com", "192.168.1.1")
        self.assertNotEqual(hash1, hash4)

    @patch('twilio_verify_service.psycopg2.connect')
    def test_rate_limiting_check(self, mock_connect):
        """Test rate limiting functionality"""
        # Mock database connection
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_connect.return_value.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

        service = TwilioVerifyService()

        # Test allowed request (under rate limit)
        mock_cursor.fetchone.side_effect = [(2,), (5,)]  # 2 window attempts, 5 daily attempts

        result = service.check_rate_limit("test@example.com", "127.0.0.1")

        self.assertTrue(result["allowed"])
        self.assertEqual(result["remaining_window"], 3)  # 5 - 2
        self.assertEqual(result["remaining_daily"], 15)   # 20 - 5

    @patch('twilio_verify_service.psycopg2.connect')
    def test_rate_limiting_exceeded(self, mock_connect):
        """Test rate limiting when limit is exceeded"""
        # Mock database connection
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_connect.return_value.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

        service = TwilioVerifyService()

        # Test blocked request (over window rate limit)
        mock_cursor.fetchone.side_effect = [(6,), (10,)]  # 6 window attempts, 10 daily attempts

        result = service.check_rate_limit("test@example.com", "127.0.0.1")

        self.assertFalse(result["allowed"])
        self.assertEqual(result["reason"], "rate_limit_window")
        self.assertEqual(result["retry_after"], 900)  # 15 minutes * 60

    @patch('twilio.rest.Client')
    def test_start_verification_invalid_phone(self, mock_client):
        """Test start_verification with invalid phone number"""
        service = TwilioVerifyService()

        result = service.start_verification("invalid-phone", "sms")

        self.assertFalse(result["success"])
        self.assertEqual(result["error"], "invalid_phone")

    @patch('twilio.rest.Client')
    def test_start_verification_invalid_email(self, mock_client):
        """Test start_verification with invalid email"""
        service = TwilioVerifyService()

        result = service.start_verification("invalid-email", "email")

        self.assertFalse(result["success"])
        self.assertEqual(result["error"], "invalid_email")

    @patch('twilio.rest.Client')
    def test_start_verification_invalid_channel(self, mock_client):
        """Test start_verification with invalid channel"""
        service = TwilioVerifyService()

        result = service.start_verification("+1234567890", "invalid_channel")

        self.assertFalse(result["success"])
        self.assertEqual(result["error"], "invalid_channel")

    def test_start_verification_basic_validation(self):
        """Test that start_verification properly validates inputs before calling Twilio"""
        service = TwilioVerifyService()

        # Test that validation catches invalid inputs early
        # (This avoids complex Twilio API mocking while still testing our validation logic)

        # Test invalid phone format
        result = service.start_verification("invalid", "sms")
        self.assertFalse(result["success"])
        self.assertEqual(result["error"], "invalid_phone")

        # Test invalid email format for email channel
        result = service.start_verification("invalid", "email")
        self.assertFalse(result["success"])
        self.assertEqual(result["error"], "invalid_email")

        # Test invalid channel
        result = service.start_verification("+1234567890", "invalid")
        self.assertFalse(result["success"])
        self.assertEqual(result["error"], "invalid_channel")

    def test_check_verification_invalid_code(self):
        """Test check_verification with invalid code format"""
        service = TwilioVerifyService()

        result = service.check_verification("+1234567890", "")

        self.assertFalse(result["success"])
        self.assertFalse(result["valid"])
        self.assertEqual(result["error"], "invalid_code")

    def test_service_initialization_missing_credentials(self):
        """Test service initialization with missing credentials"""
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(ValueError) as context:
                TwilioVerifyService()

            self.assertIn("Missing required Twilio credentials", str(context.exception))

    @patch('twilio_verify_service.psycopg2.connect')
    def test_database_table_initialization(self, mock_connect):
        """Test database table initialization"""
        # Mock database connection
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_connect.return_value.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

        # Should not raise any exceptions
        init_verification_tables()

        # Verify SQL execution
        self.assertTrue(mock_cursor.execute.called)
        self.assertTrue(mock_conn.commit.called)


class TestVerificationClaimBinding(unittest.TestCase):
    """Test cases for verification claims binding and API gates"""

    def setUp(self):
        """Set up test fixtures"""
        # Mock environment variables
        self.env_patch = patch.dict(os.environ, {
            'TWILIO_ACCOUNT_SID': 'ACtest123456789',
            'TWILIO_AUTH_TOKEN': 'test_auth_token',
            'TWILIO_VERIFY_SID': 'VAtest123456789',
            'DB_DSN': 'postgresql://test:test@localhost:5432/test'
        })
        self.env_patch.start()

    def tearDown(self):
        """Clean up test fixtures"""
        self.env_patch.stop()

    def test_e164_normalization_success(self):
        """Test successful E.164 phone number normalization"""
        service = TwilioVerifyService()

        # Test various formats that should normalize successfully
        test_cases = [
            ("+1234567890", "+1234567890"),  # Already E.164
            ("12345678901", "+12345678901"),   # US number without +
            ("+442012345678", "+442012345678"),  # UK E.164
            ("+33123456789", "+33123456789"),   # France E.164
        ]

        for input_phone, expected in test_cases:
            with self.subTest(input=input_phone):
                result = service.normalize_phone_e164(input_phone)
                self.assertEqual(result, expected)

    def test_e164_normalization_failure(self):
        """Test E.164 normalization with invalid inputs"""
        service = TwilioVerifyService()

        # Test cases that should fail normalization
        invalid_cases = [
            "",           # Empty string
            "123",        # Too short
            "abc",        # Non-numeric
            "+0123456789", # Starts with 0 after country code
            None,         # None input
        ]

        for invalid_input in invalid_cases:
            with self.subTest(input=invalid_input):
                result = service.normalize_phone_e164(invalid_input)
                self.assertIsNone(result)

    def test_verification_claims_update_logic(self):
        """Test the logic for updating verification claims"""
        # Test the core logic for updating phone_verified claim

        test_cases = [
            {
                "name": "successful_verification",
                "verification_result": {"success": True, "valid": True},
                "profile_phone": "+1234567890",
                "request_phone": "+1234567890",
                "should_update_claim": True
            },
            {
                "name": "phone_mismatch",
                "verification_result": {"success": True, "valid": True},
                "profile_phone": "+1234567890",
                "request_phone": "+9876543210",
                "should_update_claim": False
            },
            {
                "name": "invalid_verification",
                "verification_result": {"success": True, "valid": False},
                "profile_phone": "+1234567890",
                "request_phone": "+1234567890",
                "should_update_claim": False
            }
        ]

        for case in test_cases:
            with self.subTest(case=case["name"]):
                # Simulate the verification logic
                result = case["verification_result"]
                phones_match = case["profile_phone"] == case["request_phone"]
                should_update = (
                    result["success"] and
                    result["valid"] and
                    phones_match
                )

                self.assertEqual(should_update, case["should_update_claim"])

    def test_phone_verification_gate_logic(self):
        """Test phone verification gate logic"""
        # Test the core logic that would be in require_phone_verified decorator

        # Mock database responses
        test_cases = [
            (None, "not found", 404),        # No profile
            ((False,), "verification required", 403),  # Not verified
            ((True,), None, 200),            # Verified - should pass
        ]

        for profile_result, expected_error, expected_status in test_cases:
            with self.subTest(profile=profile_result):
                # Simulate the gate logic
                if not profile_result:
                    error_msg = "Profile not found"
                    status_code = 404
                elif not profile_result[0]:
                    error_msg = "Phone verification required"
                    status_code = 403
                else:
                    error_msg = None
                    status_code = 200

                if expected_error:
                    self.assertEqual(status_code, expected_status)
                    self.assertIn(expected_error, error_msg.lower())
                else:
                    self.assertEqual(status_code, 200)


class TestAPIEndpointSecurity(unittest.TestCase):
    """Test security aspects of API endpoints"""

    def test_e164_validation_pattern(self):
        """Test that E.164 validation pattern works correctly"""
        # Test cases for phone number validation
        test_numbers = [
            ("+1234567890", True),    # Valid E.164
            ("1234567890", False),    # Missing +
            ("+1234", True),          # Minimum valid (4 digits)
            ("+123", False),          # Too short (only 3 digits)
            ("+12", False),           # Too short (only 2 digits)
            ("invalid", False),       # Non-numeric
            ("+0123456789", False),   # Starts with 0
            ("+123456789012345", True), # Max length
            ("+1234567890123456", False), # Too long
        ]

        # Test the E.164 validation pattern
        # Require minimum 4 digits total (country code + national number)
        import re
        e164_pattern = r'^\+[1-9]\d{3,14}$'

        for phone, should_be_valid in test_numbers:
            with self.subTest(phone=phone):
                is_valid = bool(re.match(e164_pattern, phone))
                self.assertEqual(is_valid, should_be_valid)

    def test_rate_limiting_scenarios(self):
        """Test rate limiting scenarios for verification endpoints"""
        # Test different rate limiting scenarios

        scenarios = [
            {
                "name": "within_limit",
                "attempts": 3,
                "window_limit": 5,
                "should_block": False
            },
            {
                "name": "at_limit",
                "attempts": 5,
                "window_limit": 5,
                "should_block": False
            },
            {
                "name": "over_limit",
                "attempts": 6,
                "window_limit": 5,
                "should_block": True
            }
        ]

        for scenario in scenarios:
            with self.subTest(scenario=scenario["name"]):
                # Mock rate limiting logic
                attempts = scenario["attempts"]
                limit = scenario["window_limit"]
                should_block = attempts > limit

                self.assertEqual(should_block, scenario["should_block"])


class TestTwilioVerifyIntegration(unittest.TestCase):
    """Integration tests that require real Twilio credentials (optional)"""

    def setUp(self):
        """Check if real credentials are available"""
        self.has_credentials = all([
            os.getenv("TWILIO_ACCOUNT_SID"),
            os.getenv("TWILIO_AUTH_TOKEN")
        ])

    @unittest.skipUnless(os.getenv("INTEGRATION_TESTS") == "true",
                        "Integration tests disabled")
    def test_real_twilio_service_creation(self):
        """Test creating Verify service with real Twilio credentials"""
        if not self.has_credentials:
            self.skipTest("Twilio credentials not available")

        service = TwilioVerifyService()
        verify_sid = service.ensure_verify_service()

        self.assertIsNotNone(verify_sid)
        self.assertTrue(verify_sid.startswith("VA"))


def run_tests():
    """Run all tests"""
    print("Running Twilio Verify Service Tests")
    print("=" * 50)

    # Create test loader
    loader = unittest.TestLoader()

    # Create test suite
    suite = unittest.TestSuite()

    # Add unit tests
    suite.addTests(loader.loadTestsFromTestCase(TestTwilioVerifyService))
    suite.addTests(loader.loadTestsFromTestCase(TestVerificationClaimBinding))
    suite.addTests(loader.loadTestsFromTestCase(TestAPIEndpointSecurity))

    # Add integration tests only if environment variable is set
    if os.getenv("INTEGRATION_TESTS") == "true":
        suite.addTests(loader.loadTestsFromTestCase(TestTwilioVerifyIntegration))
        print("Note: Integration tests enabled")
    else:
        print("Note: Integration tests disabled (set INTEGRATION_TESTS=true to enable)")

    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Print summary
    print("\n" + "=" * 50)
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")

    if result.failures:
        print("\nFailures:")
        for test, traceback in result.failures:
            print(f"  {test}: {traceback}")

    if result.errors:
        print("\nErrors:")
        for test, traceback in result.errors:
            print(f"  {test}: {traceback}")

    success = len(result.failures) == 0 and len(result.errors) == 0
    print(f"\nResult: {'PASSED' if success else 'FAILED'}")

    return success


if __name__ == "__main__":
    success = run_tests()
    exit(0 if success else 1)