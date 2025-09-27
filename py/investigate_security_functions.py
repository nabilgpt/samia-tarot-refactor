#!/usr/bin/env python3
import os
import psycopg2

def investigate_security_functions():
    dsn = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

    try:
        with psycopg2.connect(dsn) as conn:
            with conn.cursor() as cur:

                print("INVESTIGATING SECURITY DEFINER FUNCTIONS")
                print("=" * 45)

                # Get details of the SECURITY DEFINER functions
                cur.execute("""
                SELECT
                    n.nspname as schema_name,
                    p.proname as function_name,
                    pg_get_functiondef(p.oid) as function_definition,
                    pg_get_userbyid(p.proowner) as owner
                FROM pg_proc p
                JOIN pg_namespace n ON p.pronamespace = n.oid
                WHERE n.nspname = 'public'
                AND p.prosecdef = true
                ORDER BY p.proname;
                """)

                functions = cur.fetchall()
                for schema, func, definition, owner in functions:
                    print(f"\nFUNCTION: {func}")
                    print(f"Owner: {owner}")
                    print("Definition:")
                    print(definition)
                    print("-" * 40)

                # Check if any of these functions are related to v_profile_roles
                print("\nCHECKING FUNCTION DEPENDENCIES:")
                for schema, func, definition, owner in functions:
                    if 'v_profile_roles' in definition.lower():
                        print(f"  {func} references v_profile_roles")
                    else:
                        print(f"  {func} does NOT reference v_profile_roles")

                # Let's also check what the linter is actually looking for
                print("\nCHECKING FOR ANY VIEW WITH SECURITY DEFINER PROPERTIES:")

                # This query checks for views that might have security definer properties
                cur.execute("""
                SELECT
                    c.relname,
                    c.relkind,
                    c.relowner,
                    pg_get_userbyid(c.relowner) as owner_name,
                    CASE WHEN c.relkind = 'v' THEN pg_get_viewdef(c.oid) END as view_def
                FROM pg_class c
                JOIN pg_namespace n ON c.relnamespace = n.oid
                WHERE n.nspname = 'public'
                AND c.relkind IN ('v', 'f')  -- views and functions
                AND c.relname ILIKE '%profile%role%'
                ORDER BY c.relname;
                """)

                related_objects = cur.fetchall()
                for name, kind, owner_id, owner_name, view_def in related_objects:
                    print(f"  Object: {name}")
                    print(f"  Type: {kind}")
                    print(f"  Owner: {owner_name}")
                    if view_def:
                        print(f"  Definition: {view_def[:100]}...")
                    print()

                # Final status check
                print("CURRENT STATUS:")
                cur.execute("SELECT COUNT(*) FROM information_schema.views WHERE table_name = 'v_profile_roles';")
                view_count = cur.fetchone()[0]
                print(f"  Views named v_profile_roles: {view_count}")

                cur.execute("""
                SELECT COUNT(*) FROM pg_proc p
                JOIN pg_namespace n ON p.pronamespace = n.oid
                WHERE n.nspname = 'public' AND p.prosecdef = true;
                """)
                secdef_count = cur.fetchone()[0]
                print(f"  Functions with SECURITY DEFINER: {secdef_count}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    investigate_security_functions()