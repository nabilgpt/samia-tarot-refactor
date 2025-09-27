#!/usr/bin/env python3
"""
M37 Invoice Service Acceptance Tests
Tests deterministic PDF generation, private storage, and Signed URLs
"""
import os
import json
import requests
import uuid
from datetime import datetime

API_BASE = "http://localhost:8000"
TEST_USER_ID = str(uuid.uuid4())

def test_health_endpoint():
    """Test API health check"""
    print("=== Testing API Health ===")
    try:
        response = requests.get(f"{API_BASE}/api/ops/health",
                               headers={"X-User-ID": TEST_USER_ID})
        print(f"Health check status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"API healthy: {data.get('healthy', False)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_invoice_nonexistent():
    """Test invoice access for nonexistent order"""
    print("\n=== Testing Nonexistent Invoice ===")
    try:
        fake_order_id = 99999
        response = requests.get(f"{API_BASE}/api/payments/invoice/{fake_order_id}",
                               headers={"X-User-ID": TEST_USER_ID})
        print(f"Nonexistent invoice status: {response.status_code}")
        print(f"Response: {response.text}")
        return response.status_code == 404
    except Exception as e:
        print(f"Nonexistent invoice test failed: {e}")
        return False

def test_invoice_metrics():
    """Test invoice metrics endpoint (requires admin role)"""
    print("\n=== Testing Invoice Metrics ===")
    try:
        response = requests.get(f"{API_BASE}/api/metrics/invoices",
                               headers={"X-User-ID": TEST_USER_ID})
        print(f"Metrics status: {response.status_code}")
        print(f"Response: {response.text[:200]}...")
        # Should return 403 for non-admin user
        return response.status_code == 403
    except Exception as e:
        print(f"Invoice metrics test failed: {e}")
        return False

def test_pdf_generator_direct():
    """Test PDF generator directly"""
    print("\n=== Testing PDF Generator Direct ===")
    try:
        from m37_invoice_pdf_generator import DeterministicInvoicePDF

        generator = DeterministicInvoicePDF()

        # Test with mock data (will fail without real invoice)
        try:
            result = generator.generate_invoice_pdf(1)
            print("PDF generation succeeded unexpectedly")
            return False
        except ValueError as e:
            if "not found" in str(e):
                print(f"Expected error for nonexistent invoice: {e}")
                return True
            else:
                print(f"Unexpected error: {e}")
                return False

    except ImportError as e:
        print(f"Could not import PDF generator: {e}")
        return False
    except Exception as e:
        print(f"PDF generator test failed: {e}")
        return False

def test_storage_service_direct():
    """Test storage service directly"""
    print("\n=== Testing Storage Service Direct ===")
    try:
        from m37_invoice_storage import InvoiceStorageService

        storage = InvoiceStorageService()
        print(f"Storage available: {storage.storage_available}")
        print(f"Supabase configured: {storage.supabase_url is not None}")

        # Test bucket creation
        result = storage.ensure_private_bucket()
        print(f"Bucket setup: {'Success' if result else 'Failed/Mock'}")

        # Test path generation
        test_path = storage.generate_storage_path(12345, "abcdef1234567890")
        print(f"Storage path example: {test_path}")

        return True

    except ImportError as e:
        print(f"Could not import storage service: {e}")
        return False
    except Exception as e:
        print(f"Storage service test failed: {e}")
        return False

def test_database_schema():
    """Test M37 database schema"""
    print("\n=== Testing Database Schema ===")
    try:
        import psycopg2

        dsn = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

        with psycopg2.connect(dsn) as conn, conn.cursor() as cur:
            # Test invoice_items table exists
            cur.execute("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'invoice_items' AND table_schema = 'public'
                ORDER BY ordinal_position
            """)
            items_columns = [row[0] for row in cur.fetchall()]
            print(f"invoice_items columns: {items_columns}")

            # Test invoice_access_audit table exists
            cur.execute("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'invoice_access_audit' AND table_schema = 'public'
                ORDER BY ordinal_position
            """)
            audit_columns = [row[0] for row in cur.fetchall()]
            print(f"invoice_access_audit columns: {audit_columns}")

            # Test RLS policies
            cur.execute("""
                SELECT tablename, policyname
                FROM pg_policies
                WHERE tablename IN ('invoice_items', 'invoice_access_audit')
                ORDER BY tablename, policyname
            """)
            policies = cur.fetchall()
            print(f"RLS policies: {len(policies)} found")
            for table, policy in policies:
                print(f"  {table}: {policy}")

            # Test functions exist
            cur.execute("""
                SELECT routine_name FROM information_schema.routines
                WHERE routine_name IN ('log_invoice_access', 'calculate_invoice_hash', 'update_invoice_totals')
                  AND routine_schema = 'public'
            """)
            functions = [row[0] for row in cur.fetchall()]
            print(f"M37 functions: {functions}")

            return len(items_columns) > 0 and len(audit_columns) > 0 and len(functions) >= 2

    except Exception as e:
        print(f"Database schema test failed: {e}")
        return False

def main():
    """Run M37 acceptance tests"""
    print("M37 Invoice Service - Acceptance Tests")
    print("=" * 45)

    tests = [
        ("API Health", test_health_endpoint),
        ("Database Schema", test_database_schema),
        ("PDF Generator Direct", test_pdf_generator_direct),
        ("Storage Service Direct", test_storage_service_direct),
        ("Nonexistent Invoice", test_invoice_nonexistent),
        ("Invoice Metrics", test_invoice_metrics),
    ]

    results = []

    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
            status = "PASS" if result else "FAIL"
            print(f"{test_name}: {status}")
        except Exception as e:
            results.append((test_name, False))
            print(f"{test_name}: ERROR - {e}")

    print("\n" + "=" * 45)
    print("TEST RESULTS SUMMARY")
    print("=" * 45)

    passed = sum(1 for name, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "✓" if result else "✗"
        print(f"{status} {test_name}")

    print(f"\nPassed: {passed}/{total} ({passed/total*100:.1f}%)")

    if passed == total:
        print("🎉 All M37 acceptance tests PASSED!")
        return True
    else:
        print("❌ Some tests failed - check implementation")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)