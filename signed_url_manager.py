"""
Signed URL Manager with consistent 15-minute TTL enforcement
Centralized management of all signed URL generation for SAMIA-TAROT
"""

import os
import time
import hmac
import hashlib
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Union
from urllib.parse import urlencode, quote

class SignedURLConfig:
    """Configuration for signed URL generation"""

    # Default TTL values (in seconds)
    DEFAULT_TTL = 15 * 60  # 15 minutes
    INVOICE_TTL = 60 * 60  # 60 minutes for invoices
    ADMIN_TTL = 30 * 60    # 30 minutes for admin operations
    HOROSCOPE_TTL = 15 * 60  # 15 minutes for horoscopes

    # Maximum TTL allowed
    MAX_TTL = 60 * 60  # 1 hour maximum

    # URL signing secret
    URL_SIGNING_SECRET = os.getenv("URL_SIGNING_SECRET", "default_secret_change_in_production")

class SignedURLManager:
    """Centralized signed URL management"""

    def __init__(self, supabase_url: str, supabase_service_key: str, bucket_name: str = "audio"):
        self.supabase_url = supabase_url
        self.service_key = supabase_service_key
        self.bucket_name = bucket_name

    def generate_supabase_signed_url(
        self,
        file_path: str,
        ttl_seconds: Optional[int] = None,
        resource_type: str = "media"
    ) -> Dict[str, Any]:
        """
        Generate Supabase signed URL with enforced TTL

        Args:
            file_path: Path to file in storage bucket
            ttl_seconds: TTL in seconds (defaults based on resource type)
            resource_type: Type of resource (media, invoice, horoscope, admin)

        Returns:
            Dict with signed URL and metadata
        """

        # Determine TTL based on resource type
        if ttl_seconds is None:
            ttl_map = {
                "invoice": SignedURLConfig.INVOICE_TTL,
                "horoscope": SignedURLConfig.HOROSCOPE_TTL,
                "admin": SignedURLConfig.ADMIN_TTL,
                "media": SignedURLConfig.DEFAULT_TTL
            }
            ttl_seconds = ttl_map.get(resource_type, SignedURLConfig.DEFAULT_TTL)

        # Enforce maximum TTL
        ttl_seconds = min(ttl_seconds, SignedURLConfig.MAX_TTL)

        # Generate timestamp and signature
        expires_at = int(time.time()) + ttl_seconds

        # Create signature payload
        signature_payload = f"{file_path}:{expires_at}:{resource_type}"
        signature = hmac.new(
            SignedURLConfig.URL_SIGNING_SECRET.encode(),
            signature_payload.encode(),
            hashlib.sha256
        ).hexdigest()

        # Construct signed URL
        base_url = f"{self.supabase_url}/storage/v1/object/sign/{self.bucket_name}/{quote(file_path)}"

        params = {
            'token': self.service_key,
            'expires': expires_at,
            'signature': signature,
            'type': resource_type
        }

        signed_url = f"{base_url}?{urlencode(params)}"

        return {
            "signed_url": signed_url,
            "expires_at": expires_at,
            "expires_at_iso": datetime.utcfromtimestamp(expires_at).isoformat() + "Z",
            "ttl_seconds": ttl_seconds,
            "resource_type": resource_type,
            "file_path": file_path
        }

    def verify_signed_url_signature(self, file_path: str, expires_at: int, signature: str, resource_type: str) -> bool:
        """Verify signed URL signature"""

        signature_payload = f"{file_path}:{expires_at}:{resource_type}"
        expected_signature = hmac.new(
            SignedURLConfig.URL_SIGNING_SECRET.encode(),
            signature_payload.encode(),
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(signature, expected_signature)

    def is_url_expired(self, expires_at: int) -> bool:
        """Check if signed URL has expired"""
        return int(time.time()) > expires_at

class SignedURLAuditor:
    """Audit signed URL generation and access"""

    def __init__(self, db_connection):
        self.db = db_connection

    def log_url_generation(
        self,
        user_id: str,
        resource_type: str,
        file_path: str,
        ttl_seconds: int,
        access_reason: str = "user_request"
    ):
        """Log signed URL generation"""

        query = """
        INSERT INTO signed_url_audit (
            user_id, resource_type, file_path, ttl_seconds,
            access_reason, generated_at, expires_at
        ) VALUES (%s, %s, %s, %s, %s, NOW(), NOW() + INTERVAL %s SECOND)
        """

        with self.db.cursor() as cur:
            cur.execute(query, (
                user_id, resource_type, file_path, ttl_seconds,
                access_reason, ttl_seconds
            ))
        self.db.commit()

    def log_url_access(self, signed_url: str, user_agent: str, ip_address: str, success: bool):
        """Log signed URL access attempt"""

        query = """
        INSERT INTO signed_url_access_log (
            signed_url_hash, user_agent, ip_address, success, accessed_at
        ) VALUES (%s, %s, %s, %s, NOW())
        """

        url_hash = hashlib.sha256(signed_url.encode()).hexdigest()

        with self.db.cursor() as cur:
            cur.execute(query, (url_hash, user_agent, ip_address, success))
        self.db.commit()

    def get_url_statistics(self, days: int = 7) -> Dict[str, Any]:
        """Get signed URL usage statistics"""

        query = """
        SELECT
            resource_type,
            COUNT(*) as total_generated,
            AVG(ttl_seconds) as avg_ttl,
            MAX(ttl_seconds) as max_ttl,
            MIN(ttl_seconds) as min_ttl
        FROM signed_url_audit
        WHERE generated_at >= NOW() - INTERVAL %s DAY
        GROUP BY resource_type
        ORDER BY total_generated DESC
        """

        with self.db.cursor() as cur:
            cur.execute(query, (days,))
            results = cur.fetchall()

        return {
            "period_days": days,
            "statistics": [
                {
                    "resource_type": row[0],
                    "total_generated": row[1],
                    "avg_ttl_minutes": round(row[2] / 60, 1),
                    "max_ttl_minutes": round(row[3] / 60, 1),
                    "min_ttl_minutes": round(row[4] / 60, 1)
                }
                for row in results
            ]
        }

class MediaAccessManager:
    """High-level interface for media access with signed URLs"""

    def __init__(self, url_manager: SignedURLManager, auditor: SignedURLAuditor):
        self.url_manager = url_manager
        self.auditor = auditor

    def get_horoscope_audio_url(
        self,
        horoscope_id: int,
        file_path: str,
        user_id: str,
        user_role: str
    ) -> Dict[str, Any]:
        """Get signed URL for horoscope audio with role-based TTL"""

        # Determine TTL based on role
        if user_role in ['admin', 'superadmin']:
            ttl_seconds = SignedURLConfig.ADMIN_TTL
            resource_type = "admin"
        else:
            ttl_seconds = SignedURLConfig.HOROSCOPE_TTL
            resource_type = "horoscope"

        # Generate signed URL
        url_data = self.url_manager.generate_supabase_signed_url(
            file_path=file_path,
            ttl_seconds=ttl_seconds,
            resource_type=resource_type
        )

        # Audit logging
        self.auditor.log_url_generation(
            user_id=user_id,
            resource_type=resource_type,
            file_path=file_path,
            ttl_seconds=ttl_seconds,
            access_reason=f"horoscope_audio_access:role:{user_role}"
        )

        return url_data

    def get_invoice_pdf_url(
        self,
        invoice_id: str,
        file_path: str,
        user_id: str
    ) -> Dict[str, Any]:
        """Get signed URL for invoice PDF"""

        url_data = self.url_manager.generate_supabase_signed_url(
            file_path=file_path,
            ttl_seconds=SignedURLConfig.INVOICE_TTL,
            resource_type="invoice"
        )

        # Audit logging
        self.auditor.log_url_generation(
            user_id=user_id,
            resource_type="invoice",
            file_path=file_path,
            ttl_seconds=SignedURLConfig.INVOICE_TTL,
            access_reason=f"invoice_pdf_access:{invoice_id}"
        )

        return url_data

    def get_order_result_audio_url(
        self,
        order_id: str,
        file_path: str,
        user_id: str
    ) -> Dict[str, Any]:
        """Get signed URL for order result audio"""

        url_data = self.url_manager.generate_supabase_signed_url(
            file_path=file_path,
            ttl_seconds=SignedURLConfig.DEFAULT_TTL,
            resource_type="media"
        )

        # Audit logging
        self.auditor.log_url_generation(
            user_id=user_id,
            resource_type="media",
            file_path=file_path,
            ttl_seconds=SignedURLConfig.DEFAULT_TTL,
            access_reason=f"order_result_audio:{order_id}"
        )

        return url_data

# Database schema for audit tables
AUDIT_SCHEMA_SQL = """
-- Signed URL audit table
CREATE TABLE IF NOT EXISTS signed_url_audit (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    resource_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    ttl_seconds INTEGER NOT NULL,
    access_reason TEXT,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Signed URL access log
CREATE TABLE IF NOT EXISTS signed_url_access_log (
    id BIGSERIAL PRIMARY KEY,
    signed_url_hash TEXT NOT NULL,
    user_agent TEXT,
    ip_address INET,
    success BOOLEAN NOT NULL,
    accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_signed_url_audit_user_id ON signed_url_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_signed_url_audit_resource_type ON signed_url_audit(resource_type);
CREATE INDEX IF NOT EXISTS idx_signed_url_audit_generated_at ON signed_url_audit(generated_at);
CREATE INDEX IF NOT EXISTS idx_signed_url_access_log_hash ON signed_url_access_log(signed_url_hash);
CREATE INDEX IF NOT EXISTS idx_signed_url_access_log_accessed_at ON signed_url_access_log(accessed_at);
"""

# FastAPI middleware for signed URL validation
"""
from fastapi import Request, HTTPException
from urllib.parse import parse_qs

@app.middleware("http")
async def validate_signed_urls(request: Request, call_next):
    # Only validate signed URLs
    if "/storage/v1/object/sign/" in str(request.url):
        query_params = dict(request.query_params)

        expires = query_params.get('expires')
        signature = query_params.get('signature')
        resource_type = query_params.get('type')

        if not all([expires, signature, resource_type]):
            return JSONResponse(
                status_code=400,
                content={"error": "Invalid signed URL parameters"}
            )

        try:
            expires_at = int(expires)
        except ValueError:
            return JSONResponse(
                status_code=400,
                content={"error": "Invalid expiration timestamp"}
            )

        # Check expiration
        if url_manager.is_url_expired(expires_at):
            return JSONResponse(
                status_code=410,
                content={"error": "Signed URL has expired"}
            )

        # Log access attempt
        auditor.log_url_access(
            signed_url=str(request.url),
            user_agent=request.headers.get('user-agent', ''),
            ip_address=request.client.host,
            success=True
        )

    return await call_next(request)
"""

if __name__ == "__main__":
    # Test signed URL generation
    manager = SignedURLManager(
        supabase_url="https://example.supabase.co",
        supabase_service_key="test_key",
        bucket_name="test_bucket"
    )

    # Test horoscope URL
    horoscope_url = manager.generate_supabase_signed_url(
        file_path="horoscopes/2025/09/25/leo_daily.mp3",
        resource_type="horoscope"
    )

    print("Generated signed URL:")
    print(json.dumps(horoscope_url, indent=2))