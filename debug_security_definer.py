#!/usr/bin/env python3
import os
import psycopg2

def debug_security_definer():
    dsn = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

    try:
        with psycopg2.connect(dsn) as conn:
            with conn.cursor() as cur:

                print("COMPREHENSIVE SECURITY DEFINER INVESTIGATION")
                print("=" * 50)

                # Check all views in the database
                print("1. ALL VIEWS IN PUBLIC SCHEMA:")
                cur.execute("""
                SELECT schemaname, viewname, viewowner
                FROM pg_views
                WHERE schemaname = 'public'
                ORDER BY viewname;
                """)

                for schema, view, owner in cur.fetchall():
                    print(f"  {view} (owner: {owner})")

                # Check specifically for v_profile_roles
                print("\n2. v_profile_roles VIEW DETAILS:")
                cur.execute("""
                SELECT
                    schemaname,
                    viewname,
                    definition,
                    viewowner
                FROM pg_views
                WHERE viewname = 'v_profile_roles';
                """)

                result = cur.fetchall()
                for schema, view, definition, owner in result:
                    print(f"  Schema: {schema}")
                    print(f"  Owner: {owner}")
                    print(f"  Definition: {definition[:200]}...")

                # Check for functions with security definer
                print("\n3. FUNCTIONS WITH SECURITY DEFINER:")
                cur.execute("""
                SELECT
                    n.nspname as schema_name,
                    p.proname as function_name,
                    p.prosecdef as security_definer,
                    pg_get_userbyid(p.proowner) as owner
                FROM pg_proc p
                JOIN pg_namespace n ON p.pronamespace = n.oid
                WHERE n.nspname = 'public'
                AND p.prosecdef = true
                ORDER BY p.proname;
                """)

                functions = cur.fetchall()
                if functions:
                    for schema, func, secdef, owner in functions:
                        print(f"  {func} (schema: {schema}, owner: {owner})")
                else:
                    print("  No functions with SECURITY DEFINER found")

                # Check for any object named v_profile_roles
                print("\n4. ALL OBJECTS NAMED v_profile_roles:")
                cur.execute("""
                SELECT
                    schemaname,
                    tablename,
                    tableowner,
                    'table' as object_type
                FROM pg_tables
                WHERE tablename = 'v_profile_roles'
                UNION ALL
                SELECT
                    schemaname,
                    viewname,
                    viewowner,
                    'view' as object_type
                FROM pg_views
                WHERE viewname = 'v_profile_roles'
                UNION ALL
                SELECT
                    n.nspname,
                    p.proname,
                    pg_get_userbyid(p.proowner),
                    'function' as object_type
                FROM pg_proc p
                JOIN pg_namespace n ON p.pronamespace = n.oid
                WHERE p.proname = 'v_profile_roles';
                """)

                objects = cur.fetchall()
                for schema, name, owner, obj_type in objects:
                    print(f"  {obj_type}: {schema}.{name} (owner: {owner})")

                # Check view definition directly from catalog
                print("\n5. DIRECT CATALOG CHECK:")
                cur.execute("""
                SELECT
                    c.relname,
                    c.relkind,
                    pg_get_viewdef(c.oid) as view_definition
                FROM pg_class c
                JOIN pg_namespace n ON c.relnamespace = n.oid
                WHERE n.nspname = 'public'
                AND c.relname = 'v_profile_roles'
                AND c.relkind = 'v';
                """)

                view_def = cur.fetchall()
                for name, kind, definition in view_def:
                    print(f"  Name: {name}")
                    print(f"  Kind: {kind} (v=view)")
                    print(f"  Definition: {definition}")

                print("\n6. ATTEMPTING COMPLETE CLEANUP:")

                # Drop everything that might be named v_profile_roles
                cleanup_commands = [
                    "DROP VIEW IF EXISTS public.v_profile_roles CASCADE;",
                    "DROP FUNCTION IF EXISTS public.v_profile_roles() CASCADE;",
                    "DROP TABLE IF EXISTS public.v_profile_roles CASCADE;"
                ]

                for cmd in cleanup_commands:
                    try:
                        cur.execute(cmd)
                        print(f"  Executed: {cmd}")
                    except Exception as e:
                        print(f"  Error with {cmd}: {e}")

                conn.commit()
                print("\nCOMPLETE CLEANUP PERFORMED")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_security_definer()