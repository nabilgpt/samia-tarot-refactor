#!/usr/bin/env python3
"""
Fix function search_path security warnings by setting secure search_path
This prevents SQL injection via search_path manipulation
"""
import os
import psycopg2

def fix_function_search_path():
    dsn = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

    # Functions that need search_path fixed
    functions_to_fix = [
        'horo_public_readable',
        'audit_translation_change',
        'is_mod_or_admin',
        'get_user_role',
        'calc_zodiac',
        'cleanup_expired_rankings',
        'rate_try_consume',
        'update_call_duration',
        'validate_ar_file_type',
        'profiles_zodiac_trg',
        'update_updated_at',
        'extract_user_features'
    ]

    try:
        with psycopg2.connect(dsn) as conn:
            with conn.cursor() as cur:

                print("FIXING FUNCTION SEARCH_PATH SECURITY")
                print("=" * 45)

                fixed_count = 0

                for func_name in functions_to_fix:
                    print(f"\nProcessing function: {func_name}")

                    # Get current function definition
                    cur.execute("""
                    SELECT pg_get_functiondef(p.oid) as definition
                    FROM pg_proc p
                    JOIN pg_namespace n ON p.pronamespace = n.oid
                    WHERE n.nspname = 'public'
                    AND p.proname = %s;
                    """, (func_name,))

                    result = cur.fetchone()
                    if not result:
                        print(f"  Function {func_name} not found, skipping")
                        continue

                    definition = result[0]

                    # Check if it already has SET search_path
                    if 'SET search_path' in definition:
                        print(f"  Already has search_path set, skipping")
                        continue

                    # Extract the function signature and body
                    try:
                        # This is a simplified approach - we'll add SET search_path TO public
                        # Right before the function body starts

                        # Find where to insert the SET clause
                        if 'LANGUAGE' in definition:
                            # Find the position right before LANGUAGE
                            lang_pos = definition.find('\n LANGUAGE')
                            if lang_pos > 0:
                                # Insert the SET clause
                                new_definition = (
                                    definition[:lang_pos] +
                                    '\n SET search_path TO public' +
                                    definition[lang_pos:]
                                )

                                # Drop and recreate the function
                                cur.execute(f"DROP FUNCTION IF EXISTS public.{func_name} CASCADE;")
                                cur.execute(new_definition)
                                fixed_count += 1
                                print(f"  Fixed: Added SET search_path TO public")

                            else:
                                print(f"  Could not locate insertion point")
                        else:
                            print(f"  Unsupported function format")

                    except Exception as e:
                        print(f"  Error fixing function: {e}")

                conn.commit()

                print(f"\nSUMMARY:")
                print(f"  Functions processed: {len(functions_to_fix)}")
                print(f"  Functions fixed: {fixed_count}")

                # Verify remaining functions with mutable search_path
                cur.execute("""
                SELECT COUNT(*)
                FROM pg_proc p
                JOIN pg_namespace n ON p.pronamespace = n.oid
                WHERE n.nspname = 'public'
                AND p.prosecdef = false  -- Only non-security definer functions
                AND NOT EXISTS (
                    SELECT 1 FROM pg_proc_config pc
                    WHERE pc.prooid = p.oid
                    AND pc.proconfig[1] LIKE 'search_path=%'
                );
                """)

                remaining = cur.fetchone()[0]
                print(f"  Functions still needing search_path fix: {remaining}")

                print("\nFUNCTION SEARCH_PATH SECURITY FIX COMPLETE")
                return True

    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    fix_function_search_path()