#!/usr/bin/env python3
"""
Apply FORCE RLS to sensitive tables and fix SECURITY DEFINER search_path
Address critical findings from security audit
"""
import os
import psycopg2

def apply_security_fixes():
    dsn = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

    try:
        with psycopg2.connect(dsn) as conn:
            with conn.cursor() as cur:

                print("APPLYING CRITICAL SECURITY FIXES")
                print("=" * 40)

                # 1. Apply FORCE RLS to sensitive tables
                sensitive_tables = ['invoices', 'orders', 'payment_events', 'profiles', 'refunds']

                print("\n1. Applying FORCE RLS to sensitive tables:")
                for table in sensitive_tables:
                    try:
                        cur.execute(f"ALTER TABLE IF EXISTS {table} FORCE ROW LEVEL SECURITY;")
                        print(f"   FORCE RLS applied: {table}")
                    except Exception as e:
                        print(f"   Error on {table}: {e}")

                # 2. Fix SECURITY DEFINER functions search_path
                print("\n2. Fixing SECURITY DEFINER search_path:")

                # Get current function definitions
                secdef_functions = ['extract_user_features', 'get_user_role']

                for func_name in secdef_functions:
                    try:
                        # Get function definition
                        cur.execute("""
                        SELECT pg_get_functiondef(p.oid) as definition
                        FROM pg_proc p
                        JOIN pg_namespace n ON p.pronamespace = n.oid
                        WHERE n.nspname = 'public' AND p.proname = %s;
                        """, (func_name,))

                        result = cur.fetchone()
                        if result:
                            definition = result[0]

                            # Add SET search_path if not present
                            if 'SET search_path' not in definition:
                                # Find insertion point before LANGUAGE
                                if '\n LANGUAGE' in definition:
                                    new_def = definition.replace(
                                        '\n LANGUAGE',
                                        '\n SET search_path TO public, pg_catalog\n LANGUAGE'
                                    )
                                    cur.execute(new_def)
                                    print(f"   Fixed search_path: {func_name}")
                                else:
                                    print(f"   Could not fix: {func_name}")
                            else:
                                print(f"   Already secure: {func_name}")
                        else:
                            print(f"   Function not found: {func_name}")

                    except Exception as e:
                        print(f"   Error fixing {func_name}: {e}")

                conn.commit()

                # 3. Verification
                print("\n3. Verification:")

                # Check FORCE RLS status
                cur.execute("""
                SELECT c.relname, c.relforcerowsecurity
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'public'
                  AND c.relname = ANY(%s)
                ORDER BY c.relname;
                """, (sensitive_tables,))

                force_rls_results = cur.fetchall()
                print("   FORCE RLS Status:")
                for table, force_rls in force_rls_results:
                    status = "ENABLED" if force_rls else "DISABLED"
                    print(f"     {table}: {status}")

                # Check function search_path
                cur.execute("""
                SELECT p.proname, p.proconfig
                FROM pg_proc p
                JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname = 'public'
                  AND p.prosecdef = TRUE
                  AND p.proname = ANY(%s)
                ORDER BY p.proname;
                """, (secdef_functions,))

                func_results = cur.fetchall()
                print("   SECURITY DEFINER search_path:")
                for func_name, config in func_results:
                    has_search_path = any(setting.startswith('search_path=') for setting in (config or []))
                    status = "SECURE" if has_search_path else "NEEDS_FIX"
                    print(f"     {func_name}: {status}")

                print("\nCRITICAL SECURITY FIXES APPLIED")
                return True

    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    apply_security_fixes()