#!/usr/bin/env python3
"""
Fix remaining RLS policies with correct column names
"""
import os
import psycopg2

def fix_remaining_policies():
    dsn = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

    # Corrected policies based on actual column structure
    corrected_policies = {
        'payment_events': [
            "CREATE POLICY admin_read ON payment_events FOR SELECT TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));"
        ],
        'invoices': [
            # Link via order -> user relationship
            "CREATE POLICY user_via_order ON invoices FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM orders o WHERE o.id = invoices.order_id AND o.user_id = auth.uid()) OR auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",
            "CREATE POLICY admin_modify ON invoices FOR INSERT TO authenticated WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",
            "CREATE POLICY admin_update ON invoices FOR UPDATE TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",
            "CREATE POLICY admin_delete ON invoices FOR DELETE TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));"
        ],
        'refunds': [
            # Link via order -> user relationship
            "CREATE POLICY user_via_order ON refunds FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM orders o WHERE o.id = refunds.order_id AND o.user_id = auth.uid()) OR auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",
            "CREATE POLICY admin_modify ON refunds FOR INSERT TO authenticated WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",
            "CREATE POLICY admin_update ON refunds FOR UPDATE TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",
            "CREATE POLICY admin_delete ON refunds FOR DELETE TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));"
        ],
        'deletion_requests': [
            "CREATE POLICY user_create ON deletion_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());",
            "CREATE POLICY admin_manage ON deletion_requests FOR SELECT TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",
            "CREATE POLICY admin_update ON deletion_requests FOR UPDATE TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));",
            "CREATE POLICY admin_delete ON deletion_requests FOR DELETE TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));"
        ],
        'assist_drafts': [
            # Link via order -> user relationship or created_by
            "CREATE POLICY creator_or_user_via_order ON assist_drafts FOR ALL TO authenticated USING (created_by = auth.uid() OR EXISTS(SELECT 1 FROM orders o WHERE o.id = assist_drafts.order_id AND o.user_id = auth.uid()) OR auth.jwt() ->> 'role' IN ('admin', 'superadmin'));"
        ],
        'assist_sessions': [
            # Link via order -> user relationship or actor
            "CREATE POLICY actor_or_user_via_order ON assist_sessions FOR ALL TO authenticated USING (actor_id = auth.uid() OR EXISTS(SELECT 1 FROM orders o WHERE o.id = assist_sessions.order_id AND o.user_id = auth.uid()) OR auth.jwt() ->> 'role' IN ('admin', 'superadmin'));"
        ],
        'astro_requests': [
            # Need to check actual columns for this table
            "CREATE POLICY user_own ON astro_requests FOR ALL TO authenticated USING (user_id = auth.uid() OR auth.jwt() ->> 'role' IN ('reader', 'admin', 'superadmin'));"
        ],
        'astro_summaries': [
            "CREATE POLICY user_own ON astro_summaries FOR ALL TO authenticated USING (user_id = auth.uid() OR auth.jwt() ->> 'role' IN ('reader', 'admin', 'superadmin'));"
        ],
        'kb_docs': [
            "CREATE POLICY read_all ON kb_docs FOR SELECT TO authenticated USING (true);",
            "CREATE POLICY staff_modify ON kb_docs FOR INSERT TO authenticated WITH CHECK (auth.jwt() ->> 'role' IN ('reader', 'admin', 'superadmin'));",
            "CREATE POLICY staff_update ON kb_docs FOR UPDATE TO authenticated USING (auth.jwt() ->> 'role' IN ('reader', 'admin', 'superadmin'));",
            "CREATE POLICY staff_delete ON kb_docs FOR DELETE TO authenticated USING (auth.jwt() ->> 'role' IN ('reader', 'admin', 'superadmin'));"
        ],
        'kb_chunks': [
            "CREATE POLICY read_all ON kb_chunks FOR SELECT TO authenticated USING (true);",
            "CREATE POLICY staff_modify ON kb_chunks FOR INSERT TO authenticated WITH CHECK (auth.jwt() ->> 'role' IN ('reader', 'admin', 'superadmin'));",
            "CREATE POLICY staff_update ON kb_chunks FOR UPDATE TO authenticated USING (auth.jwt() ->> 'role' IN ('reader', 'admin', 'superadmin'));",
            "CREATE POLICY staff_delete ON kb_chunks FOR DELETE TO authenticated USING (auth.jwt() ->> 'role' IN ('reader', 'admin', 'superadmin'));"
        ],
        'blocked_profiles': [
            "CREATE POLICY staff_only ON blocked_profiles FOR ALL TO authenticated USING (auth.jwt() ->> 'role' IN ('monitor', 'admin', 'superadmin'));"
        ],
        'export_jobs': [
            "CREATE POLICY admin_only ON export_jobs FOR ALL TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));"
        ],
        'promo_codes': [
            "CREATE POLICY admin_only ON promo_codes FOR ALL TO authenticated USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));"
        ],
        'call_recordings': [
            "CREATE POLICY user_via_call ON call_recordings FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM calls c WHERE c.id = call_recordings.call_id AND (c.user_id = auth.uid() OR c.reader_id = auth.uid())) OR auth.jwt() ->> 'role' IN ('admin', 'superadmin'));"
        ],
        'siren_alerts': [
            "CREATE POLICY staff_only ON siren_alerts FOR ALL TO authenticated USING (auth.jwt() ->> 'role' IN ('monitor', 'admin', 'superadmin'));"
        ]
    }

    try:
        with psycopg2.connect(dsn) as conn:
            with conn.cursor() as cur:

                print("FIXING REMAINING RLS POLICIES")
                print("=" * 40)

                policies_created = 0

                for table, table_policies in corrected_policies.items():
                    print(f"\nProcessing table: {table}")

                    for policy_sql in table_policies:
                        try:
                            # Extract policy name
                            policy_name = policy_sql.split(' ON ')[0].split('POLICY ')[1].strip('"')

                            # Drop existing policy if it exists
                            cur.execute(f"DROP POLICY IF EXISTS {policy_name} ON {table};")

                            # Create the policy
                            cur.execute(policy_sql)
                            policies_created += 1
                            print(f"  Created: {policy_name}")

                        except Exception as e:
                            print(f"  Error with {policy_name}: {e}")

                conn.commit()

                # Final summary
                cur.execute("SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';")
                total_policies = cur.fetchone()[0]

                print(f"\nFINAL SUMMARY:")
                print(f"  New policies created: {policies_created}")
                print(f"  Total policies in database: {total_policies}")

                # Check how many tables still need policies
                cur.execute("""
                SELECT COUNT(DISTINCT t.tablename) as tables_with_rls,
                       COUNT(DISTINCT p.tablename) as tables_with_policies
                FROM pg_tables t
                LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
                WHERE t.schemaname = 'public'
                AND t.rowsecurity = true;
                """)

                result = cur.fetchone()
                tables_with_rls, tables_with_policies = result

                print(f"  Tables with RLS enabled: {tables_with_rls}")
                print(f"  Tables with policies: {tables_with_policies}")
                print(f"  Remaining without policies: {tables_with_rls - tables_with_policies}")

                print("\nRLS POLICIES CORRECTION COMPLETE")
                return True

    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    fix_remaining_policies()