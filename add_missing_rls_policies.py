#!/usr/bin/env python3
"""
Add comprehensive RLS policies for tables that have RLS enabled but no policies
This addresses the INFO-level warnings from Supabase security linter
"""
import os
import psycopg2

def add_missing_rls_policies():
    dsn = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

    # Define RLS policies for each table based on business logic
    policies = {
        '_migrations': [
            "CREATE POLICY admin_only ON _migrations FOR ALL TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));"
        ],
        'api_rate_limits': [
            "CREATE POLICY admin_only ON api_rate_limits FOR ALL TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));"
        ],
        'app_settings': [
            "CREATE POLICY read_auth ON app_settings FOR SELECT TO authenticated USING (true);",
            "CREATE POLICY admin_modify ON app_settings FOR INSERT TO authenticated WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",
            "CREATE POLICY admin_update ON app_settings FOR UPDATE TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",
            "CREATE POLICY admin_delete ON app_settings FOR DELETE TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));"
        ],
        'roles': [
            "CREATE POLICY read_all ON roles FOR SELECT TO authenticated, anon USING (true);"
        ],
        'services': [
            "CREATE POLICY read_all ON services FOR SELECT TO authenticated, anon USING (true);",
            "CREATE POLICY admin_modify ON services FOR INSERT TO authenticated WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",
            "CREATE POLICY admin_update ON services FOR UPDATE TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",
            "CREATE POLICY admin_delete ON services FOR DELETE TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));"
        ],
        'voice_models': [
            "CREATE POLICY read_auth ON voice_models FOR SELECT TO authenticated USING (true);",
            "CREATE POLICY admin_modify ON voice_models FOR INSERT TO authenticated WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",
            "CREATE POLICY admin_update ON voice_models FOR UPDATE TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",
            "CREATE POLICY admin_delete ON voice_models FOR DELETE TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));"
        ],
        'zodiac_settings': [
            "CREATE POLICY read_all ON zodiac_settings FOR SELECT TO authenticated, anon USING (true);",
            "CREATE POLICY admin_modify ON zodiac_settings FOR INSERT TO authenticated WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",
            "CREATE POLICY admin_update ON zodiac_settings FOR UPDATE TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",
            "CREATE POLICY admin_delete ON zodiac_settings FOR DELETE TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));"
        ],
        'settings_change_requests': [
            "CREATE POLICY admin_only ON settings_change_requests FOR ALL TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));"
        ],
        'notif_templates': [
            "CREATE POLICY read_staff ON notif_templates FOR SELECT TO authenticated USING (auth.jwt() ->> 'role' IN ('reader', 'monitor', 'admin', 'superadmin'));",
            "CREATE POLICY admin_modify ON notif_templates FOR INSERT TO authenticated WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",
            "CREATE POLICY admin_update ON notif_templates FOR UPDATE TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",
            "CREATE POLICY admin_delete ON notif_templates FOR DELETE TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));"
        ],
        'notif_prefs': [
            "CREATE POLICY user_own ON notif_prefs FOR ALL TO authenticated USING (user_id = auth.uid() OR auth.jwt() ->> 'role' IN ('admin', 'superadmin'));"
        ],
        'notif_log': [
            "CREATE POLICY user_own ON notif_log FOR SELECT TO authenticated USING (user_id = auth.uid() OR auth.jwt() ->> 'role' IN ('admin', 'superadmin'));"
        ],
        'payment_events': [
            "CREATE POLICY user_own ON payment_events FOR SELECT TO authenticated USING (user_id = auth.uid() OR auth.jwt() ->> 'role' IN ('admin', 'superadmin'));"
        ],
        'invoices': [
            "CREATE POLICY user_own ON invoices FOR SELECT TO authenticated USING (user_id = auth.uid() OR auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",
            "CREATE POLICY admin_modify ON invoices FOR INSERT TO authenticated WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",
            "CREATE POLICY admin_update ON invoices FOR UPDATE TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",
            "CREATE POLICY admin_delete ON invoices FOR DELETE TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));"
        ],
        'refunds': [
            "CREATE POLICY user_view ON refunds FOR SELECT TO authenticated USING (user_id = auth.uid() OR auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",
            "CREATE POLICY admin_modify ON refunds FOR INSERT TO authenticated WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",
            "CREATE POLICY admin_update ON refunds FOR UPDATE TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",
            "CREATE POLICY admin_delete ON refunds FOR DELETE TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));"
        ],
        'promo_codes': [
            "CREATE POLICY admin_only ON promo_codes FOR ALL TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));"
        ],
        'blocked_profiles': [
            "CREATE POLICY staff_only ON blocked_profiles FOR ALL TO authenticated USING (auth.jwt() ->> 'role' IN ('monitor', 'admin', 'superadmin'));"
        ],
        'deletion_requests': [
            "CREATE POLICY user_create ON deletion_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());",
            "CREATE POLICY admin_manage ON deletion_requests FOR SELECT TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",
            "CREATE POLICY admin_update ON deletion_requests FOR UPDATE TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",
            "CREATE POLICY admin_delete ON deletion_requests FOR DELETE TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));"
        ],
        'export_jobs': [
            "CREATE POLICY admin_only ON export_jobs FOR ALL TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));"
        ]
    }

    try:
        with psycopg2.connect(dsn) as conn:
            with conn.cursor() as cur:

                print("ADDING MISSING RLS POLICIES")
                print("=" * 40)

                policies_created = 0
                for table, table_policies in policies.items():
                    print(f"\nProcessing table: {table}")

                    for policy_sql in table_policies:
                        try:
                            # Drop existing policy if it exists (to handle reruns)
                            policy_name = policy_sql.split(' ON ')[0].split('POLICY ')[1].strip('"')
                            cur.execute(f"DROP POLICY IF EXISTS {policy_name} ON {table};")

                            # Create the policy
                            cur.execute(policy_sql)
                            policies_created += 1
                            print(f"  Created: {policy_name}")

                        except Exception as e:
                            print(f"  Error creating policy: {e}")

                conn.commit()

                # Verify policies were created
                cur.execute("SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';")
                total_policies = cur.fetchone()[0]

                print(f"\nSUMMARY:")
                print(f"  Policies created this run: {policies_created}")
                print(f"  Total policies in database: {total_policies}")

                # Check remaining tables without policies
                cur.execute("""
                SELECT t.tablename
                FROM pg_tables t
                LEFT JOIN (
                    SELECT DISTINCT tablename
                    FROM pg_policies
                    WHERE schemaname = 'public'
                ) p ON t.tablename = p.tablename
                WHERE t.schemaname = 'public'
                AND t.rowsecurity = true
                AND p.tablename IS NULL
                ORDER BY t.tablename;
                """)

                remaining_tables = [row[0] for row in cur.fetchall()]
                print(f"  Tables still needing policies: {len(remaining_tables)}")

                if remaining_tables:
                    for table in remaining_tables[:5]:  # Show first 5
                        print(f"    - {table}")
                    if len(remaining_tables) > 5:
                        print(f"    ... and {len(remaining_tables)-5} more")

                print("\nRLS POLICIES ADDITION COMPLETE")
                return True

    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    add_missing_rls_policies()