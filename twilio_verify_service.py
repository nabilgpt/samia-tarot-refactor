#!/usr/bin/env python3
"""
Twilio Verify Service - End-to-end SMS/Voice/WhatsApp/Email OTP
Implements secure verification with SendGrid email integration
"""
import os
import re
import json
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import hashlib
import psycopg2
from twilio.rest import Client
from twilio.base.exceptions import TwilioException

class TwilioVerifyService:
    def __init__(self):
        # Environment variables - required for operation
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.verify_sid = os.getenv("TWILIO_VERIFY_SID")
        self.voice_caller_id = os.getenv("TWILIO_VOICE_CALLER_ID")
        self.sendgrid_api_key = os.getenv("SENDGRID_API_KEY")
        self.sendgrid_template_id = os.getenv("SENDGRID_TEMPLATE_ID")
        self.email_from_address = os.getenv("EMAIL_FROM_ADDRESS")
        self.email_from_name = os.getenv("EMAIL_FROM_NAME", "SAMIA TAROT")

        # Database connection
        self.dsn = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

        # Validate required credentials
        if not all([self.account_sid, self.auth_token]):
            raise ValueError("Missing required Twilio credentials: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN")

        # Initialize Twilio client
        self.client = Client(self.account_sid, self.auth_token)

        # Rate limiting configuration
        self.rate_limits = {
            "attempts_per_window": 5,
            "window_minutes": 15,
            "max_daily_attempts": 20
        }

    def validate_phone_e164(self, phone: str) -> bool:
        """Validate E.164 phone number format"""
        e164_pattern = r'^\+[1-9]\d{1,14}$'
        return bool(re.match(e164_pattern, phone))

    def normalize_phone_e164(self, phone: str) -> str:
        """Normalize phone number to E.164 format"""
        if not phone:
            return None

        # Remove all non-digit characters except +
        normalized = re.sub(r'[^\d+]', '', phone)

        # Ensure it starts with +
        if not normalized.startswith('+'):
            # Try to add + if it looks like an international number
            if len(normalized) > 10:
                normalized = '+' + normalized
            else:
                return None  # Can't normalize without country code

        # Validate the result
        if self.validate_phone_e164(normalized):
            return normalized
        else:
            return None

    def validate_email(self, email: str) -> bool:
        """Validate email format"""
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(email_pattern, email))

    def hash_identifier(self, identifier: str, ip: str = None) -> str:
        """Hash identifier for rate limiting without storing PII"""
        salt = os.getenv("RATE_LIMIT_SALT", "samia-verify-salt")
        combined = f"{salt}:{identifier}:{ip or 'no-ip'}"
        return hashlib.sha256(combined.encode()).hexdigest()

    def check_rate_limit(self, identifier: str, ip_address: str = None) -> Dict[str, Any]:
        """Check if user has exceeded rate limits"""
        try:
            hashed_id = self.hash_identifier(identifier, ip_address)
            window_start = datetime.now() - timedelta(minutes=self.rate_limits["window_minutes"])
            day_start = datetime.now() - timedelta(days=1)

            with psycopg2.connect(self.dsn) as conn, conn.cursor() as cur:
                # Check window rate limit
                cur.execute("""
                    SELECT COUNT(*) FROM verification_attempts
                    WHERE hashed_identifier = %s
                    AND created_at >= %s
                """, (hashed_id, window_start))

                window_attempts = cur.fetchone()[0]

                # Check daily rate limit
                cur.execute("""
                    SELECT COUNT(*) FROM verification_attempts
                    WHERE hashed_identifier = %s
                    AND created_at >= %s
                """, (hashed_id, day_start))

                daily_attempts = cur.fetchone()[0]

                # Check if rate limited
                if window_attempts >= self.rate_limits["attempts_per_window"]:
                    return {
                        "allowed": False,
                        "reason": "rate_limit_window",
                        "retry_after": self.rate_limits["window_minutes"] * 60,
                        "attempts": window_attempts
                    }

                if daily_attempts >= self.rate_limits["max_daily_attempts"]:
                    return {
                        "allowed": False,
                        "reason": "rate_limit_daily",
                        "retry_after": 24 * 3600,
                        "attempts": daily_attempts
                    }

                return {
                    "allowed": True,
                    "remaining_window": self.rate_limits["attempts_per_window"] - window_attempts,
                    "remaining_daily": self.rate_limits["max_daily_attempts"] - daily_attempts
                }

        except Exception as e:
            # Log error but allow verification to proceed (fail-open for rate limiting)
            print(f"Rate limit check failed: {str(e)}")
            return {"allowed": True, "error": "rate_limit_check_failed"}

    def log_verification_attempt(self, identifier: str, channel: str, action: str,
                                status: str, twilio_sid: str = None,
                                ip_address: str = None, error_code: str = None):
        """Log verification attempt for audit and rate limiting"""
        try:
            hashed_id = self.hash_identifier(identifier, ip_address)

            with psycopg2.connect(self.dsn) as conn, conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO verification_attempts (
                        hashed_identifier, channel, action, status,
                        twilio_sid, error_code, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, NOW())
                """, (hashed_id, channel, action, status, twilio_sid, error_code))

                conn.commit()

        except Exception as e:
            # Log error but don't fail the verification process
            print(f"Verification logging failed: {str(e)}")

    def ensure_verify_service(self) -> str:
        """Ensure Verify service exists, create if needed"""
        if self.verify_sid:
            try:
                # Test if service exists
                service = self.client.verify.v2.services(self.verify_sid).fetch()
                return self.verify_sid
            except TwilioException as e:
                if e.status == 404:
                    print("Verify service not found, creating new one...")
                else:
                    raise

        # Create new Verify service
        try:
            service = self.client.verify.v2.services.create(
                friendly_name="SAMIA TAROT Verification Service",
                code_length=6,
                lookup_enabled=True,
                psd2_enabled=False,
                skip_sms_to_landlines=True
            )

            print(f"Created Verify Service: {service.sid}")
            return service.sid

        except TwilioException as e:
            raise ValueError(f"Failed to create Verify service: {str(e)}")

    def start_verification(self, to: str, channel: str, locale: str = "en",
                          ip_address: str = None) -> Dict[str, Any]:
        """Start verification process"""
        try:
            # Validate channel
            valid_channels = ["sms", "voice", "whatsapp", "email"]
            if channel not in valid_channels:
                return {
                    "success": False,
                    "error": "invalid_channel",
                    "message": f"Channel must be one of: {', '.join(valid_channels)}"
                }

            # Validate recipient format
            if channel == "email":
                if not self.validate_email(to):
                    return {
                        "success": False,
                        "error": "invalid_email",
                        "message": "Invalid email format"
                    }
            else:
                if not self.validate_phone_e164(to):
                    return {
                        "success": False,
                        "error": "invalid_phone",
                        "message": "Phone number must be in E.164 format (+1234567890)"
                    }

            # Check rate limits
            rate_check = self.check_rate_limit(to, ip_address)
            if not rate_check.get("allowed", False):
                self.log_verification_attempt(to, channel, "start", "rate_limited",
                                             ip_address=ip_address)
                return {
                    "success": False,
                    "error": "rate_limited",
                    "message": f"Rate limit exceeded: {rate_check['reason']}",
                    "retry_after": rate_check.get("retry_after", 900)
                }

            # Ensure verify service exists
            verify_sid = self.ensure_verify_service()

            # Prepare verification parameters
            verification_params = {
                "to": to,
                "channel": channel,
                "locale": locale
            }

            # Add channel-specific parameters
            if channel == "voice" and self.voice_caller_id:
                # For voice calls, use configured caller ID
                verification_params["from_"] = self.voice_caller_id

            # Start verification via Twilio Verify
            verification = self.client.verify.v2.services(verify_sid).verifications.create(
                **verification_params
            )

            # Log successful attempt
            self.log_verification_attempt(to, channel, "start", "sent",
                                        verification.sid, ip_address)

            return {
                "success": True,
                "sid": verification.sid,
                "status": verification.status,
                "to": verification.to,
                "channel": verification.channel,
                "date_created": verification.date_created.isoformat() if verification.date_created else None
            }

        except TwilioException as e:
            # Map Twilio errors to safe responses
            error_mapping = {
                20003: {"error": "authentication_failed", "message": "Service temporarily unavailable"},
                20404: {"error": "service_not_found", "message": "Verification service not configured"},
                21211: {"error": "invalid_phone", "message": "Invalid phone number format"},
                21408: {"error": "permission_denied", "message": "Unable to send to this number"},
                21610: {"error": "rate_limited", "message": "Too many attempts, please try again later"},
                21611: {"error": "rate_limited", "message": "Rate limit exceeded for this number"},
                30001: {"error": "queue_full", "message": "Service busy, please try again"},
                30006: {"error": "landline_unreachable", "message": "Unable to reach landline number"},
            }

            error_info = error_mapping.get(e.code, {
                "error": "verification_failed",
                "message": "Unable to send verification code"
            })

            # Log error (code only, no sensitive data)
            self.log_verification_attempt(to, channel, "start", "failed",
                                        ip_address=ip_address, error_code=str(e.code))

            return {
                "success": False,
                **error_info,
                "twilio_code": e.code
            }

        except Exception as e:
            # Log unexpected errors
            self.log_verification_attempt(to, channel, "start", "error",
                                        ip_address=ip_address, error_code="system_error")

            return {
                "success": False,
                "error": "system_error",
                "message": "Verification service temporarily unavailable"
            }

    def check_verification(self, to: str, code: str, ip_address: str = None) -> Dict[str, Any]:
        """Check verification code"""
        try:
            # Validate inputs
            if not code or len(code.strip()) < 4:
                return {
                    "success": False,
                    "valid": False,
                    "error": "invalid_code",
                    "message": "Invalid verification code format"
                }

            # Ensure verify service exists
            verify_sid = self.ensure_verify_service()

            # Check code via Twilio Verify
            verification_check = self.client.verify.v2.services(verify_sid).verification_checks.create(
                to=to,
                code=code.strip()
            )

            # Log attempt
            self.log_verification_attempt(to, "check", "check", verification_check.status,
                                        verification_check.sid, ip_address)

            is_valid = verification_check.status == "approved"

            return {
                "success": True,
                "valid": is_valid,
                "status": verification_check.status,
                "sid": verification_check.sid,
                "to": verification_check.to,
                "date_updated": verification_check.date_updated.isoformat() if verification_check.date_updated else None
            }

        except TwilioException as e:
            # Map Twilio errors for code checking
            error_mapping = {
                20404: {"error": "verification_not_found", "message": "No pending verification found"},
                60200: {"error": "verification_not_found", "message": "No pending verification found"},
                60202: {"error": "max_attempts_reached", "message": "Maximum check attempts reached"},
                60205: {"error": "verification_expired", "message": "Verification code expired"},
            }

            error_info = error_mapping.get(e.code, {
                "error": "check_failed",
                "message": "Unable to verify code"
            })

            # Log error
            self.log_verification_attempt(to, "check", "check", "failed",
                                        ip_address=ip_address, error_code=str(e.code))

            return {
                "success": False,
                "valid": False,
                **error_info,
                "twilio_code": e.code
            }

        except Exception as e:
            # Log system errors
            self.log_verification_attempt(to, "check", "check", "error",
                                        ip_address=ip_address, error_code="system_error")

            return {
                "success": False,
                "valid": False,
                "error": "system_error",
                "message": "Verification service temporarily unavailable"
            }

    def get_verification_stats(self, hours: int = 24) -> Dict[str, Any]:
        """Get verification statistics for monitoring"""
        try:
            time_threshold = datetime.now() - timedelta(hours=hours)

            with psycopg2.connect(self.dsn) as conn, conn.cursor() as cur:
                # Overall stats
                cur.execute("""
                    SELECT
                        action,
                        channel,
                        status,
                        COUNT(*) as count
                    FROM verification_attempts
                    WHERE created_at >= %s
                    GROUP BY action, channel, status
                    ORDER BY action, channel, status
                """, (time_threshold,))

                stats = cur.fetchall()

                # Error distribution
                cur.execute("""
                    SELECT
                        error_code,
                        COUNT(*) as count
                    FROM verification_attempts
                    WHERE created_at >= %s
                    AND error_code IS NOT NULL
                    GROUP BY error_code
                    ORDER BY count DESC
                """, (time_threshold,))

                errors = cur.fetchall()

                return {
                    "time_period_hours": hours,
                    "stats": [
                        {
                            "action": row[0],
                            "channel": row[1],
                            "status": row[2],
                            "count": row[3]
                        }
                        for row in stats
                    ],
                    "error_distribution": [
                        {
                            "error_code": row[0],
                            "count": row[1]
                        }
                        for row in errors
                    ]
                }

        except Exception as e:
            return {
                "error": "stats_unavailable",
                "message": str(e)
            }

# Database initialization
def init_verification_tables():
    """Initialize verification tables if they don't exist"""
    dsn = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

    with psycopg2.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS verification_attempts (
                id BIGSERIAL PRIMARY KEY,
                hashed_identifier VARCHAR(64) NOT NULL,
                channel VARCHAR(20) NOT NULL,
                action VARCHAR(20) NOT NULL,
                status VARCHAR(20) NOT NULL,
                twilio_sid VARCHAR(50),
                error_code VARCHAR(20),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)

        # Create indexes separately
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_verification_attempts_hash_time
            ON verification_attempts(hashed_identifier, created_at)
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_verification_attempts_time
            ON verification_attempts(created_at)
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_verification_attempts_error
            ON verification_attempts(error_code)
        """)

        conn.commit()

def main():
    """Test the verification service"""
    print("Twilio Verify Service - Test Mode")
    print("=" * 40)

    try:
        # Initialize tables
        init_verification_tables()
        print("✓ Database tables initialized")

        # Test service initialization
        service = TwilioVerifyService()
        print("✓ Service initialized")

        # Test verify service creation/validation
        verify_sid = service.ensure_verify_service()
        print(f"✓ Verify Service ID: {verify_sid}")

        # Test validation methods
        print(f"✓ Phone validation (+1234567890): {service.validate_phone_e164('+1234567890')}")
        print(f"✓ Email validation: {service.validate_email('test@example.com')}")

        print("\nService ready for production use!")

    except Exception as e:
        print(f"✗ Service test failed: {str(e)}")

if __name__ == "__main__":
    main()