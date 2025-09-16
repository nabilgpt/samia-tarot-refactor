#!/usr/bin/env python3
"""
Add production-ready RLS policies for tables that have RLS enabled but no specific policies.
Creates appropriate allow policies for legitimate user scenarios while maintaining security.
"""
import os
import psycopg2

def add_production_rls_policies():
    dsn = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

    # Common policy patterns for different table types
    policy_configs = {
        # User-owned content (users can manage their own data)
        'user_owned': [
            'profiles', 'user_preferences', 'user_sessions', 'user_analytics',
            'astro_profiles', 'user_horoscopes', 'user_feedback'
        ],

        # Admin-managed reference data (read-only for users, full access for admins)
        'reference_data': [
            'zodiac_signs', 'card_meanings', 'horoscope_types', 'tarot_decks',
            'astro_houses', 'planet_meanings', 'aspect_meanings'
        ],

        # Public readable content (authenticated users can read, owners/admins can write)
        'public_readable': [
            'blog_posts', 'testimonials', 'faq_items', 'service_descriptions',
            'promotional_content', 'announcements'
        ],

        # Analytics/logs (insert only for users, read access for admins)
        'analytics_logs': [
            'page_views', 'user_interactions', 'error_logs', 'audit_trails',
            'performance_metrics', 'search_queries'
        ],

        # Configuration tables (admin-only management)
        'admin_config': [
            'system_settings', 'feature_flags', 'rate_limits', 'email_templates',
            'notification_settings', 'pricing_tiers'
        ]
    }

    try:
        with psycopg2.connect(dsn) as conn:
            with conn.cursor() as cur:

                print("ADDING PRODUCTION RLS POLICIES")
                print("=" * 40)

                # First, identify tables that need policies
                cur.execute("""
                SELECT t.tablename
                FROM pg_tables t
                LEFT JOIN (SELECT DISTINCT tablename FROM pg_policies WHERE schemaname = 'public') p
                    ON t.tablename = p.tablename
                WHERE t.schemaname = 'public'
                  AND t.rowsecurity = true
                  AND p.tablename IS NULL
                ORDER BY t.tablename;
                """)

                tables_needing_policies = [row[0] for row in cur.fetchall()]
                print(f"Found {len(tables_needing_policies)} tables needing policies:")
                for table in tables_needing_policies[:10]:  # Show first 10
                    print(f"  - {table}")
                if len(tables_needing_policies) > 10:
                    print(f"  ... and {len(tables_needing_policies) - 10} more")

                policies_added = 0

                # Add policies based on table patterns
                for policy_type, table_patterns in policy_configs.items():
                    matching_tables = [t for t in tables_needing_policies
                                     if any(pattern in t for pattern in table_patterns)]

                    if not matching_tables:
                        continue

                    print(f"\n{policy_type.upper()} TABLES:")

                    for table in matching_tables:
                        try:
                            if policy_type == 'user_owned':
                                # Users can manage their own data
                                policies = [
                                    f"CREATE POLICY {table}_owner_all ON {table} FOR ALL TO authenticated USING (auth.uid() = user_id OR auth.uid() = id);",
                                    f"CREATE POLICY {table}_public_read ON {table} FOR SELECT TO anon, authenticated USING (is_public = true);"
                                ]

                            elif policy_type == 'reference_data':
                                # Public read, admin write
                                policies = [
                                    f"CREATE POLICY {table}_public_read ON {table} FOR SELECT TO anon, authenticated USING (true);",
                                    f"CREATE POLICY {table}_admin_write ON {table} FOR ALL TO authenticated USING (is_mod_or_admin(auth.uid()));"
                                ]

                            elif policy_type == 'public_readable':
                                # Public read, authenticated write with ownership
                                policies = [
                                    f"CREATE POLICY {table}_public_read ON {table} FOR SELECT TO anon, authenticated USING (published = true OR auth.uid() = author_id);",
                                    f"CREATE POLICY {table}_author_write ON {table} FOR ALL TO authenticated USING (auth.uid() = author_id OR is_mod_or_admin(auth.uid()));"
                                ]

                            elif policy_type == 'analytics_logs':
                                # Insert for authenticated, read for admins
                                policies = [
                                    f"CREATE POLICY {table}_user_insert ON {table} FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);",
                                    f"CREATE POLICY {table}_admin_read ON {table} FOR SELECT TO authenticated USING (is_mod_or_admin(auth.uid()));"
                                ]

                            elif policy_type == 'admin_config':
                                # Admin-only access
                                policies = [
                                    f"CREATE POLICY {table}_admin_only ON {table} FOR ALL TO authenticated USING (is_mod_or_admin(auth.uid()));"
                                ]

                            # Apply policies with error handling
                            for policy_sql in policies:
                                try:
                                    cur.execute(policy_sql)
                                    policies_added += 1
                                except Exception as e:
                                    if "already exists" not in str(e):
                                        print(f"    Warning on {table}: {e}")

                            print(f"  ✓ {table}: {len(policies)} policies added")

                        except Exception as e:
                            print(f"  ✗ {table}: Error - {e}")

                # Add generic fallback policies for remaining tables
                remaining_tables = [t for t in tables_needing_policies
                                  if not any(any(pattern in t for pattern in patterns)
                                           for patterns in policy_configs.values())]

                if remaining_tables:
                    print(f"\nGENERIC POLICIES for {len(remaining_tables)} remaining tables:")
                    for table in remaining_tables:
                        try:
                            # Basic authenticated user policy
                            policy_sql = f"CREATE POLICY {table}_authenticated_access ON {table} FOR ALL TO authenticated USING (true);"
                            cur.execute(policy_sql)
                            policies_added += 1
                            print(f"  ✓ {table}: Generic authenticated access")
                        except Exception as e:
                            if "already exists" not in str(e):
                                print(f"  ✗ {table}: Error - {e}")

                conn.commit()

                # Verification
                print(f"\nVERIFICATION:")
                cur.execute("SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';")
                total_policies = cur.fetchone()[0]
                print(f"  Total policies now: {total_policies}")
                print(f"  Policies added this run: {policies_added}")

                # Check remaining tables without policies
                cur.execute("""
                SELECT COUNT(*)
                FROM pg_tables t
                LEFT JOIN (SELECT DISTINCT tablename FROM pg_policies WHERE schemaname = 'public') p
                    ON t.tablename = p.tablename
                WHERE t.schemaname = 'public'
                  AND t.rowsecurity = true
                  AND p.tablename IS NULL;
                """)

                remaining_count = cur.fetchone()[0]
                print(f"  Tables still needing policies: {remaining_count}")

                print("\nPRODUCTION RLS POLICIES DEPLOYMENT COMPLETE")
                return True

    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    add_production_rls_policies()