#!/usr/bin/env python3
"""
Apply M38 Legal Compliance migration directly
"""
import os
import psycopg2

dsn = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

# Read migration file with UTF-8 encoding
with open('migrations/014_m38_legal_compliance.sql', 'r', encoding='utf-8') as f:
    migration_sql = f.read()

try:
    with psycopg2.connect(dsn) as conn, conn.cursor() as cur:
        print("Applying M38 Legal Compliance migration...")
        cur.execute(migration_sql)
        conn.commit()
        print("SUCCESS: M38 migration applied successfully!")

        # Verify tables were created
        cur.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('legal_texts', 'user_consents', 'age_verifications', 'legal_compliance_audit')
            ORDER BY table_name
        """)
        tables = [row[0] for row in cur.fetchall()]
        print(f"Created tables: {tables}")

        # Verify functions were created
        cur.execute("""
            SELECT routine_name FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_name IN ('check_user_consent', 'check_age_verification', 'log_legal_compliance')
            ORDER BY routine_name
        """)
        functions = [row[0] for row in cur.fetchall()]
        print(f"Created functions: {functions}")

        # Check RLS policies
        cur.execute("""
            SELECT tablename, COUNT(*) as policy_count
            FROM pg_policies
            WHERE tablename IN ('legal_texts', 'user_consents', 'age_verifications', 'legal_compliance_audit')
            GROUP BY tablename
            ORDER BY tablename
        """)
        policies = cur.fetchall()
        print("RLS policies:")
        for table, count in policies:
            print(f"  {table}: {count} policies")

except Exception as e:
    print(f"ERROR: Migration failed: {e}")
    exit(1)