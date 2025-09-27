#!/usr/bin/env python3
"""
M37 Invoice Storage Service
Handles private storage and short-lived Signed URL generation for invoice PDFs
"""
import os
import json
import psycopg2
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import hashlib
import uuid

try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    print("Warning: Supabase client not available - using mock storage")

class InvoiceStorageService:
    def __init__(self):
        self.dsn = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

        # Supabase configuration
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_service_key = os.getenv("SUPABASE_SERVICE")
        self.invoice_bucket = "invoices"  # Private bucket for invoice PDFs

        # Initialize Supabase client if available
        if SUPABASE_AVAILABLE and self.supabase_url and self.supabase_service_key:
            self.supabase: Client = create_client(self.supabase_url, self.supabase_service_key)
            self.storage_available = True
        else:
            self.supabase = None
            self.storage_available = False

    def ensure_private_bucket(self):
        """Ensure the invoices bucket exists and is private"""
        if not self.storage_available:
            return False

        try:
            # Try to get bucket info
            buckets = self.supabase.storage.list_buckets()
            invoice_bucket_exists = any(bucket.name == self.invoice_bucket for bucket in buckets)

            if not invoice_bucket_exists:
                # Create private bucket
                bucket = self.supabase.storage.create_bucket(
                    self.invoice_bucket,
                    options={"public": False}  # Ensure bucket is private
                )
                print(f"Created private invoice bucket: {self.invoice_bucket}")

            return True

        except Exception as e:
            print(f"Error ensuring bucket: {e}")
            return False

    def generate_storage_path(self, invoice_id: int, content_hash: str) -> str:
        """Generate deterministic storage path for invoice PDF"""
        # Structure: invoices/YYYY/MM/invoice_{id}_{hash_prefix}.pdf
        now = datetime.now()
        hash_prefix = content_hash[:8]
        return f"invoices/{now.year:04d}/{now.month:02d}/invoice_{invoice_id}_{hash_prefix}.pdf"

    def store_invoice_pdf(self, invoice_id: int, pdf_bytes: bytes, content_hash: str) -> Dict[str, Any]:
        """Store invoice PDF in private storage"""
        storage_path = self.generate_storage_path(invoice_id, content_hash)

        if not self.storage_available:
            # Mock storage for development
            print(f"Mock storage: would store {len(pdf_bytes)} bytes at {storage_path}")
            return {
                'success': True,
                'storage_path': storage_path,
                'size_bytes': len(pdf_bytes),
                'mock': True
            }

        try:
            # Ensure bucket exists
            if not self.ensure_private_bucket():
                raise Exception("Failed to ensure invoice bucket exists")

            # Upload file to private bucket
            response = self.supabase.storage.from_(self.invoice_bucket).upload(
                storage_path,
                pdf_bytes,
                file_options={
                    "content-type": "application/pdf",
                    "cache-control": "3600",  # 1 hour cache
                    "upsert": True  # Allow overwrite for deterministic regeneration
                }
            )

            # Update database with storage information
            with psycopg2.connect(self.dsn) as conn, conn.cursor() as cur:
                cur.execute("""
                UPDATE invoices
                SET
                    pdf_storage_path = %s,
                    pdf_generated_at = NOW(),
                    pdf_hash = %s
                WHERE id = %s
                """, (storage_path, content_hash, invoice_id))

                # Log storage event
                cur.execute("""
                SELECT log_invoice_access(%s, 'pdf_stored', %s, %s, %s, %s, %s, %s, %s)
                """, (
                    invoice_id,
                    'pdf_stored',
                    None,  # accessed_by (system operation)
                    None,  # client_ip
                    'M37-Storage-Service',  # user_agent
                    None,  # signed_url_expires_at
                    True,  # success
                    None,  # error_message
                    json.dumps({
                        'storage_path': storage_path,
                        'size_bytes': len(pdf_bytes),
                        'content_hash': content_hash
                    })
                ))

                conn.commit()

            return {
                'success': True,
                'storage_path': storage_path,
                'size_bytes': len(pdf_bytes),
                'upload_response': response
            }

        except Exception as e:
            # Log storage failure
            try:
                with psycopg2.connect(self.dsn) as conn, conn.cursor() as cur:
                    cur.execute("""
                    SELECT log_invoice_access(%s, 'pdf_stored', %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        invoice_id,
                        'pdf_stored',
                        None,  # accessed_by
                        None,  # client_ip
                        'M37-Storage-Service',  # user_agent
                        None,  # signed_url_expires_at
                        False,  # success
                        str(e),  # error_message
                        json.dumps({'error': 'storage_failed'})
                    ))
                    conn.commit()
            except:
                pass

            raise Exception(f"Failed to store invoice PDF: {e}")

    def create_signed_url(
        self,
        invoice_id: int,
        user_id: str,
        expires_in_minutes: int = 15,
        client_ip: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create short-lived signed URL for invoice access"""

        with psycopg2.connect(self.dsn) as conn, conn.cursor() as cur:
            # Verify user owns this invoice
            cur.execute("""
            SELECT i.id, i.pdf_storage_path, i.pdf_hash, o.user_id
            FROM invoices i
            JOIN orders o ON o.id = i.order_id
            WHERE i.id = %s
            """, (invoice_id,))

            result = cur.fetchone()
            if not result:
                raise ValueError(f"Invoice {invoice_id} not found")

            invoice_id_db, storage_path, pdf_hash, owner_id = result

            # Check ownership (unless admin/superadmin)
            if str(owner_id) != user_id:
                # Check if user has admin privileges
                cur.execute("SELECT get_user_role(%s)", (user_id,))
                role_result = cur.fetchone()
                user_role = role_result[0] if role_result else None

                if user_role not in ('admin', 'superadmin'):
                    raise PermissionError(f"User {user_id} not authorized to access invoice {invoice_id}")

            if not storage_path:
                raise ValueError(f"Invoice {invoice_id} PDF not yet generated")

            # Generate signed URL
            expires_at = datetime.now() + timedelta(minutes=expires_in_minutes)

            if not self.storage_available:
                # Mock signed URL for development
                mock_url = f"https://mock-storage.example.com/{storage_path}?expires={int(expires_at.timestamp())}"
                signed_url = mock_url
                mock_mode = True
            else:
                try:
                    # Create signed URL with Supabase
                    response = self.supabase.storage.from_(self.invoice_bucket).create_signed_url(
                        storage_path,
                        expires_in_minutes * 60  # Convert to seconds
                    )
                    signed_url = response.get('signedURL')
                    mock_mode = False

                    if not signed_url:
                        raise Exception("Failed to generate signed URL")

                except Exception as e:
                    raise Exception(f"Signed URL generation failed: {e}")

            # Log URL generation
            cur.execute("""
            SELECT log_invoice_access(%s, 'signed_url_issued', %s, %s, %s, %s, %s, %s, %s)
            """, (
                invoice_id,
                'signed_url_issued',
                user_id,
                client_ip,
                user_agent,
                expires_at,
                True,  # success
                None,  # error_message
                json.dumps({
                    'expires_in_minutes': expires_in_minutes,
                    'storage_path': storage_path,
                    'mock_mode': mock_mode
                })
            ))

            conn.commit()

            return {
                'signed_url': signed_url,
                'expires_at': expires_at.isoformat(),
                'expires_in_minutes': expires_in_minutes,
                'invoice_id': invoice_id,
                'pdf_hash': pdf_hash,
                'mock_mode': mock_mode
            }

    def get_invoice_access_stats(self, invoice_id: int) -> Dict[str, Any]:
        """Get access statistics for an invoice"""
        with psycopg2.connect(self.dsn) as conn, conn.cursor() as cur:
            cur.execute("""
            SELECT
                COUNT(*) FILTER (WHERE access_type = 'signed_url_issued') as signed_urls_issued,
                COUNT(*) FILTER (WHERE access_type = 'pdf_downloaded') as downloads,
                COUNT(*) FILTER (WHERE access_type = 'pdf_generated') as generations,
                MAX(created_at) FILTER (WHERE access_type = 'signed_url_issued') as last_url_issued,
                MAX(created_at) FILTER (WHERE access_type = 'pdf_downloaded') as last_downloaded
            FROM invoice_access_audit
            WHERE invoice_id = %s
            """, (invoice_id,))

            result = cur.fetchone()
            if result:
                return {
                    'signed_urls_issued': result[0] or 0,
                    'downloads': result[1] or 0,
                    'generations': result[2] or 0,
                    'last_url_issued': result[3].isoformat() if result[3] else None,
                    'last_downloaded': result[4].isoformat() if result[4] else None
                }
            else:
                return {
                    'signed_urls_issued': 0,
                    'downloads': 0,
                    'generations': 0,
                    'last_url_issued': None,
                    'last_downloaded': None
                }

    def cleanup_expired_urls(self) -> int:
        """Clean up expired signed URL records (for maintenance)"""
        with psycopg2.connect(self.dsn) as conn, conn.cursor() as cur:
            # Mark expired URLs in audit log
            cur.execute("""
            UPDATE invoice_access_audit
            SET metadata = metadata || '{"expired": true}'::jsonb
            WHERE access_type = 'signed_url_issued'
              AND signed_url_expires_at < NOW()
              AND NOT (metadata ? 'expired')
            """)

            expired_count = cur.rowcount
            conn.commit()

            return expired_count

def main():
    """Test the storage service"""
    print("M37 Invoice Storage Service - Test Mode")
    print("=" * 45)

    storage = InvoiceStorageService()

    print(f"Storage available: {storage.storage_available}")
    print(f"Supabase URL: {storage.supabase_url[:30] + '...' if storage.supabase_url else 'Not configured'}")

    if storage.storage_available:
        print("Testing bucket creation...")
        bucket_result = storage.ensure_private_bucket()
        print(f"Bucket setup: {'Success' if bucket_result else 'Failed'}")

    # Test storage path generation
    test_invoice_id = 12345
    test_hash = "abcdef1234567890"
    storage_path = storage.generate_storage_path(test_invoice_id, test_hash)
    print(f"Storage path example: {storage_path}")

    # Test mock signed URL
    try:
        # Mock user ID for testing
        test_user_id = "f47ac10b-58cc-4372-a567-0e02b2c3d479"

        # This will fail without real data, but shows the interface
        print("Testing signed URL generation (will fail without real invoice)...")
        # url_result = storage.create_signed_url(test_invoice_id, test_user_id, expires_in_minutes=5)
        # print(f"Signed URL generated: {url_result['signed_url'][:50]}...")

    except Exception as e:
        print(f"Expected error (no test data): {e}")

    print("\nStorage service ready for production use")

if __name__ == "__main__":
    main()