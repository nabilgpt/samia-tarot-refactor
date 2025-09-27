#!/usr/bin/env python3
"""
Add safe RLS policies with proper column validation - ASCII only output
"""
import os
import psycopg2

def add_safe_rls_policies():
    dsn = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

    try:
        with psycopg2.connect(dsn) as conn:
            with conn.cursor() as cur:

                print("ADDING SAFE RLS POLICIES - TARGETED APPROACH")
                print("=" * 50)

                # Get tables needing policies with their column info
                cur.execute("""
                SELECT DISTINCT t.tablename
                FROM pg_tables t
                LEFT JOIN (SELECT DISTINCT tablename FROM pg_policies WHERE schemaname = 'public') p
                    ON t.tablename = p.tablename
                WHERE t.schemaname = 'public'
                  AND t.rowsecurity = true
                  AND p.tablename IS NULL
                ORDER BY t.tablename;
                """)

                tables_needing_policies = [row[0] for row in cur.fetchall()]
                print(f"Found {len(tables_needing_policies)} tables needing policies")

                # Safe generic policies that work for most tables
                policies_added = 0
                successful_tables = []

                for table in tables_needing_policies:
                    print(f"\nProcessing table: {table}")

                    # Check if table has common columns
                    cur.execute("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = %s
                      AND column_name IN ('user_id', 'id', 'created_by', 'owner_id');
                    """, (table,))

                    available_columns = [row[0] for row in cur.fetchall()]
                    print(f"  Available identity columns: {available_columns}")

                    try:
                        # Strategy 1: If table has user_id, use owner-based policy
                        if 'user_id' in available_columns:
                            policy_sql = f"""
                            CREATE POLICY {table}_user_access ON {table}
                            FOR ALL TO authenticated
                            USING (auth.uid() = user_id);
                            """
                            cur.execute(policy_sql)
                            policies_added += 1
                            print(f"  Added: user_id based policy")

                        # Strategy 2: If table has created_by, use creator-based policy
                        elif 'created_by' in available_columns:
                            policy_sql = f"""
                            CREATE POLICY {table}_creator_access ON {table}
                            FOR ALL TO authenticated
                            USING (auth.uid() = created_by);
                            """
                            cur.execute(policy_sql)
                            policies_added += 1
                            print(f"  Added: created_by based policy")

                        # Strategy 3: Admin-only access for system tables
                        elif table.startswith('_') or 'settings' in table or 'config' in table:
                            policy_sql = f"""
                            CREATE POLICY {table}_admin_only ON {table}
                            FOR ALL TO authenticated
                            USING (get_user_role(auth.uid()) = 'admin');
                            """
                            cur.execute(policy_sql)
                            policies_added += 1
                            print(f"  Added: admin-only policy")

                        # Strategy 4: Read-only for reference data
                        elif any(keyword in table for keyword in ['lookup', 'reference', 'template', 'type']):
                            policy_sql = f"""
                            CREATE POLICY {table}_read_only ON {table}
                            FOR SELECT TO authenticated, anon
                            USING (true);
                            """
                            cur.execute(policy_sql)
                            policies_added += 1
                            print(f"  Added: read-only policy")

                        # Strategy 5: Authenticated access (safest fallback)
                        else:
                            policy_sql = f"""
                            CREATE POLICY {table}_authenticated_access ON {table}
                            FOR ALL TO authenticated
                            USING (true);
                            """
                            cur.execute(policy_sql)
                            policies_added += 1
                            print(f"  Added: authenticated access policy")

                        successful_tables.append(table)

                    except Exception as e:
                        print(f"  Error on {table}: {str(e)}")
                        # Rollback the failed transaction for this table
                        conn.rollback()

                # Commit all successful policies
                conn.commit()

                print(f"\nSUMMARY:")
                print(f"  Tables processed: {len(tables_needing_policies)}")
                print(f"  Policies added successfully: {policies_added}")
                print(f"  Successful tables: {len(successful_tables)}")

                # Final verification
                cur.execute("SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';")
                total_policies = cur.fetchone()[0]
                print(f"  Total policies in database: {total_policies}")

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

                if remaining_count == 0:
                    print("\nSUCCESS: All tables now have RLS policies")
                else:
                    print(f"\nINFO: {remaining_count} tables may need custom policies")

                return True

    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    add_safe_rls_policies()