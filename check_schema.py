#!/usr/bin/env python3
import os
import psycopg2

def check_schema():
    dsn = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cur:

            print("PROFILES TABLE STRUCTURE:")
            cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'profiles'
            AND table_schema = 'public'
            ORDER BY ordinal_position;
            """)

            for col, dtype in cur.fetchall():
                print(f"  {col}: {dtype}")

            print("\nROLES TABLE STRUCTURE:")
            cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'roles'
            AND table_schema = 'public'
            ORDER BY ordinal_position;
            """)

            for col, dtype in cur.fetchall():
                print(f"  {col}: {dtype}")

            print("\nRLS STATUS CHECK:")
            cur.execute("""
            SELECT tablename, rowsecurity
            FROM pg_tables
            WHERE schemaname = 'public'
            AND tablename IN ('_migrations', 'roles', 'services', 'payment_events', 'notif_prefs')
            ORDER BY tablename;
            """)

            for table, rls in cur.fetchall():
                status = "ENABLED" if rls else "DISABLED"
                print(f"  {table}: {status}")

if __name__ == "__main__":
    check_schema()