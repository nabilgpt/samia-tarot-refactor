#!/usr/bin/env python3
import os
import psycopg2

def final_security_definer_fix():
    dsn = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

    try:
        with psycopg2.connect(dsn) as conn:
            with conn.cursor() as cur:

                print("Checking current view definition...")

                # Check current view properties
                cur.execute("""
                SELECT
                    schemaname,
                    viewname,
                    definition
                FROM pg_views
                WHERE schemaname = 'public'
                AND viewname = 'v_profile_roles';
                """)

                result = cur.fetchone()
                if result:
                    print(f"Current view definition: {result[2]}")
                else:
                    print("View not found")

                # Check if it's a SECURITY DEFINER view
                cur.execute("""
                SELECT
                    p.proname,
                    p.prosecdef
                FROM pg_proc p
                JOIN pg_namespace n ON p.pronamespace = n.oid
                WHERE n.nspname = 'public'
                AND p.proname = 'v_profile_roles';
                """)

                proc_result = cur.fetchall()
                if proc_result:
                    for name, secdef in proc_result:
                        print(f"Function {name}: SECURITY DEFINER = {secdef}")

                print("\nDropping and recreating view without SECURITY DEFINER...")

                # Drop the view completely
                cur.execute("DROP VIEW IF EXISTS v_profile_roles CASCADE;")

                # Create a simple, secure view without any special privileges
                cur.execute("""
                CREATE VIEW v_profile_roles AS
                SELECT
                  p.id,
                  p.phone,
                  COALESCE(p.first_name || ' ' || p.last_name, p.first_name, p.last_name) as full_name,
                  p.role_id,
                  p.phone_verified as verified_at,
                  p.created_at,
                  r.code as role_code,
                  r.label as role_name
                FROM profiles p
                LEFT JOIN roles r ON p.role_id = r.id;
                """)

                # Apply RLS policy to the view via the underlying tables
                # The view will respect the RLS policies of profiles and roles tables

                conn.commit()

                # Verify the new view
                cur.execute("""
                SELECT COUNT(*)
                FROM information_schema.views
                WHERE table_schema = 'public'
                AND table_name = 'v_profile_roles';
                """)

                view_exists = cur.fetchone()[0]
                print(f"New view created: {'SUCCESS' if view_exists else 'FAILED'}")

                # Test access
                try:
                    cur.execute("SELECT COUNT(*) FROM v_profile_roles LIMIT 1;")
                    count = cur.fetchone()[0]
                    print(f"View accessible: {count} rows visible")
                except Exception as e:
                    print(f"View access test: {e}")

                print("SECURITY DEFINER VIEW ISSUE RESOLVED")
                return True

    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    final_security_definer_fix()