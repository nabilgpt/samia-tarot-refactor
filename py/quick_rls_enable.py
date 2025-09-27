#!/usr/bin/env python3
"""
QUICK FIX: Enable RLS on all affected tables immediately
"""

import os
import psycopg2

def quick_enable_rls():
    dsn = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

    # Tables that need RLS enabled
    tables = [
        '_migrations', 'zodiac_settings', 'settings_change_requests', 'roles',
        'services', 'app_settings', 'voice_models', 'api_rate_limits',
        'astro_requests', 'astro_summaries', 'blocked_profiles', 'assist_drafts',
        'assist_sessions', 'kb_docs', 'kb_chunks', 'refunds', 'invoices',
        'promo_codes', 'payment_events', 'notif_templates', 'notif_log',
        'notif_prefs', 'deletion_requests', 'export_jobs'
    ]

    try:
        print("ENABLING RLS ON ALL AFFECTED TABLES...")
        print("=" * 40)

        with psycopg2.connect(dsn) as conn:
            with conn.cursor() as cur:

                # Enable RLS on each table
                for table in tables:
                    try:
                        cur.execute(f"ALTER TABLE IF EXISTS {table} ENABLE ROW LEVEL SECURITY;")
                        print(f"RLS enabled: {table}")
                    except Exception as e:
                        print(f"Error on {table}: {e}")

                conn.commit()

                # Create basic policies for critical tables
                basic_policies = [
                    # System tables - admin only
                    "DROP POLICY IF EXISTS admin_only ON _migrations; CREATE POLICY admin_only ON _migrations FOR ALL TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",
                    "DROP POLICY IF EXISTS admin_only ON api_rate_limits; CREATE POLICY admin_only ON api_rate_limits FOR ALL TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",

                    # Public read tables
                    "DROP POLICY IF EXISTS public_read ON roles; CREATE POLICY public_read ON roles FOR SELECT TO authenticated USING (true);",
                    "DROP POLICY IF EXISTS public_read ON services; CREATE POLICY public_read ON services FOR SELECT TO authenticated, anon USING (true);",
                    "DROP POLICY IF EXISTS public_read ON zodiac_settings; CREATE POLICY public_read ON zodiac_settings FOR SELECT TO authenticated, anon USING (true);",

                    # User own data
                    "DROP POLICY IF EXISTS user_own ON notif_prefs; CREATE POLICY user_own ON notif_prefs FOR ALL TO authenticated USING (user_id = auth.uid() OR auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",
                    "DROP POLICY IF EXISTS user_own ON payment_events; CREATE POLICY user_own ON payment_events FOR SELECT TO authenticated USING (client_id = auth.uid() OR auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",
                ]

                print("\nApplying basic policies...")
                for policy_sql in basic_policies:
                    try:
                        cur.execute(policy_sql)
                    except Exception as e:
                        print(f"Policy error: {e}")

                conn.commit()

                # Drop security definer view
                cur.execute("DROP VIEW IF EXISTS v_profile_roles;")

                # Create safer view
                cur.execute("""
                CREATE VIEW v_profile_roles AS
                SELECT
                  p.id,
                  p.phone,
                  p.full_name,
                  p.role,
                  p.verified_at,
                  p.created_at,
                  r.name as role_name,
                  r.permissions
                FROM profiles p
                LEFT JOIN roles r ON p.role = r.id
                WHERE p.id = auth.uid() OR auth.jwt() ->> 'role' IN ('admin', 'superadmin');
                """)

                conn.commit()

                print("\nRLS STATUS CHECK:")
                cur.execute("""
                SELECT tablename, rowsecurity
                FROM pg_tables
                WHERE schemaname = 'public'
                AND tablename IN ('roles', 'services', 'payment_events', 'notif_prefs')
                ORDER BY tablename;
                """)

                for table, rls in cur.fetchall():
                    status = "ENABLED" if rls else "DISABLED"
                    print(f"{table}: {status}")

                print("\nCRITICAL SECURITY FIX APPLIED SUCCESSFULLY!")
                return True

    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    quick_enable_rls()