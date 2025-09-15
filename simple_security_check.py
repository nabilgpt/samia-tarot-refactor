#!/usr/bin/env python3
"""
Simplified security verification - ASCII only
"""
import os
import psycopg2

def simple_security_check():
    dsn = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

    try:
        with psycopg2.connect(dsn) as conn:
            with conn.cursor() as cur:

                print("SECURITY STATUS VERIFICATION")
                print("=" * 35)

                # 1. RLS Status
                cur.execute("""
                SELECT COUNT(*) as total_tables,
                       COUNT(*) FILTER (WHERE rowsecurity = true) as rls_enabled
                FROM pg_tables
                WHERE schemaname = 'public';
                """)
                total, rls_enabled = cur.fetchone()
                print(f"RLS Coverage: {rls_enabled}/{total} tables ({100*rls_enabled//total}%)")

                # 2. FORCE RLS on sensitive tables
                cur.execute("""
                SELECT c.relname, c.relforcerowsecurity
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'public'
                  AND c.relname IN ('invoices', 'orders', 'payment_events', 'profiles', 'refunds');
                """)
                force_results = cur.fetchall()
                force_count = sum(1 for _, force in force_results if force)
                print(f"FORCE RLS: {force_count}/{len(force_results)} sensitive tables")

                # 3. RLS Policies
                cur.execute("SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';")
                policy_count = cur.fetchone()[0]
                print(f"Active Policies: {policy_count}")

                # 4. SECURITY DEFINER functions
                cur.execute("""
                SELECT COUNT(*) as total,
                       COUNT(*) FILTER (WHERE proconfig IS NOT NULL) as secure
                FROM pg_proc p
                JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname = 'public' AND p.prosecdef = TRUE;
                """)
                total_secdef, secure_secdef = cur.fetchone()
                print(f"SECURITY DEFINER: {secure_secdef}/{total_secdef} functions secure")

                # 5. Overall assessment
                print("\nOVERALL STATUS:")
                if rls_enabled == total and force_count >= 4 and secure_secdef == total_secdef:
                    print("SECURE - Production ready security baseline achieved")
                    return True
                else:
                    print("NEEDS ATTENTION - Some security gaps remain")
                    return False

    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    simple_security_check()