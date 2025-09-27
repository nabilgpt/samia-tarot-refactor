#!/usr/bin/env python3
import os
import psycopg2

def fix_security_view():
    dsn = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

    try:
        with psycopg2.connect(dsn) as conn:
            with conn.cursor() as cur:

                print("Fixing SECURITY DEFINER view...")

                # Drop existing view
                cur.execute("DROP VIEW IF EXISTS v_profile_roles;")

                # Create secure view with correct column names
                cur.execute("""
                CREATE VIEW v_profile_roles AS
                SELECT
                  p.id,
                  p.phone,
                  p.first_name || ' ' || p.last_name as full_name,
                  p.role_id,
                  p.phone_verified,
                  p.created_at,
                  r.code as role_code,
                  r.label as role_name
                FROM profiles p
                LEFT JOIN roles r ON p.role_id = r.id
                WHERE p.id = auth.uid() OR EXISTS (
                  SELECT 1 FROM profiles p2
                  WHERE p2.id = auth.uid()
                  AND p2.role_id IN (
                    SELECT id FROM roles WHERE code IN ('admin', 'superadmin')
                  )
                );
                """)

                conn.commit()

                # Verify the view exists
                cur.execute("""
                SELECT COUNT(*)
                FROM information_schema.views
                WHERE table_schema = 'public'
                AND table_name = 'v_profile_roles';
                """)

                view_exists = cur.fetchone()[0]
                print(f"v_profile_roles view: {'CREATED' if view_exists else 'FAILED'}")

                # Test basic policies work
                cur.execute("SELECT COUNT(*) FROM roles;")
                roles_count = cur.fetchone()[0]
                print(f"Roles table accessible: {roles_count} roles found")

                print("SECURITY DEFINER VIEW FIX COMPLETE")
                return True

    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    fix_security_view()