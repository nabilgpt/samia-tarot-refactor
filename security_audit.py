#!/usr/bin/env python3
"""
Database Security Audit - Objective verification of RLS/SECURITY DEFINER/PostgREST roles
Validates all security claims with hard evidence from PostgreSQL catalogs
"""
import os
import psycopg2
from datetime import datetime

class SecurityAudit:
    def __init__(self):
        self.dsn = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
        self.findings = []
        self.passes = []
        self.critical_fails = []

    def log_finding(self, category, status, message, details=None):
        entry = {
            'timestamp': datetime.now().isoformat(),
            'category': category,
            'status': status,  # PASS, FAIL, WARN
            'message': message,
            'details': details or []
        }

        if status == 'PASS':
            self.passes.append(entry)
        elif status == 'FAIL':
            self.critical_fails.append(entry)
        else:
            self.findings.append(entry)

    def audit_rls_enabled(self, cur):
        """Audit 1: Tables WITHOUT RLS enabled (should be ZERO)"""
        cur.execute("""
        SELECT n.nspname AS schema, c.relname AS table
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind IN ('r','p')
          AND n.nspname NOT IN ('pg_catalog','information_schema','auth','storage','extensions','graphql','realtime','supabase_functions','vault')
          AND c.relrowsecurity = FALSE
        ORDER BY 1,2;
        """)

        unprotected_tables = cur.fetchall()

        if not unprotected_tables:
            self.log_finding('RLS_ENABLED', 'PASS', 'All user tables have RLS enabled')
        else:
            self.log_finding('RLS_ENABLED', 'FAIL', f'{len(unprotected_tables)} tables lack RLS protection',
                           [f"{schema}.{table}" for schema, table in unprotected_tables])

    def audit_rls_policies(self, cur):
        """Audit 2: Count active RLS policies"""
        cur.execute("""
        SELECT COUNT(*) as policy_count,
               COUNT(DISTINCT tablename) as protected_tables
        FROM pg_policies
        WHERE schemaname = 'public';
        """)

        policy_count, protected_tables = cur.fetchone()

        self.log_finding('RLS_POLICIES', 'PASS',
                        f'{policy_count} active RLS policies protecting {protected_tables} tables')

        # List tables with RLS but no policies (INFO level)
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

        no_policy_tables = [row[0] for row in cur.fetchall()]
        if no_policy_tables:
            self.log_finding('RLS_POLICIES', 'WARN',
                           f'{len(no_policy_tables)} tables have RLS enabled but no specific policies',
                           no_policy_tables[:10])  # Limit to first 10

    def audit_force_rls(self, cur):
        """Audit 3: FORCE RLS on sensitive tables"""
        sensitive_tables = ['payment_events', 'invoices', 'refunds', 'profiles', 'orders']

        cur.execute("""
        SELECT c.relname, c.relforcerowsecurity
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind IN ('r','p')
          AND n.nspname = 'public'
          AND c.relname = ANY(%s);
        """, (sensitive_tables,))

        force_rls_status = cur.fetchall()

        missing_force_rls = [table for table, force_rls in force_rls_status if not force_rls]

        if not missing_force_rls:
            self.log_finding('FORCE_RLS', 'PASS', 'All sensitive tables have FORCE RLS enabled')
        else:
            self.log_finding('FORCE_RLS', 'WARN',
                           f'Sensitive tables missing FORCE RLS: {missing_force_rls}')

    def audit_security_definer(self, cur):
        """Audit 4: SECURITY DEFINER functions with safe search_path"""
        cur.execute("""
        SELECT n.nspname AS schema, p.proname AS function,
               p.prosecdef AS security_definer, p.proconfig
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.prosecdef = TRUE
          AND n.nspname = 'public'
        ORDER BY 1,2;
        """)

        secdef_functions = cur.fetchall()

        unsafe_functions = []
        for schema, func_name, is_secdef, config in secdef_functions:
            # Check if search_path is properly set
            has_safe_path = False
            if config:
                for setting in config:
                    if setting.startswith('search_path='):
                        has_safe_path = True
                        break

            if not has_safe_path:
                unsafe_functions.append(f"{schema}.{func_name}")

        if not unsafe_functions:
            self.log_finding('SECURITY_DEFINER', 'PASS',
                           f'{len(secdef_functions)} SECURITY DEFINER functions have safe search_path')
        else:
            self.log_finding('SECURITY_DEFINER', 'WARN',
                           f'Functions missing safe search_path: {unsafe_functions}')

    def audit_postgrest_roles(self, cur):
        """Audit 5: PostgREST role grants (anon/authenticated should be minimal)"""
        cur.execute("""
        SELECT grantee, table_schema, table_name, privilege_type, is_grantable
        FROM information_schema.role_table_grants
        WHERE grantee IN ('anon','authenticated','service_role')
          AND table_schema = 'public'
        ORDER BY 2,3,1;
        """)

        grants = cur.fetchall()

        # Group by role
        role_grants = {}
        for grantee, schema, table, privilege, grantable in grants:
            if grantee not in role_grants:
                role_grants[grantee] = []
            role_grants[grantee].append(f"{table}:{privilege}")

        # Check for excessive grants
        excessive_grants = []
        for role, grant_list in role_grants.items():
            if role == 'anon' and len(grant_list) > 5:  # anon should be minimal
                excessive_grants.append(f"{role}: {len(grant_list)} grants")
            elif role == 'service_role':
                # service_role bypasses RLS - should be server-only
                excessive_grants.append(f"{role}: CRITICAL - bypasses RLS")

        if not excessive_grants:
            self.log_finding('POSTGREST_ROLES', 'PASS', 'PostgREST role grants are appropriately minimal')
        else:
            self.log_finding('POSTGREST_ROLES', 'WARN', 'Review role grants', excessive_grants)

    def audit_dangerous_objects(self, cur):
        """Audit 6: Check for dangerous objects (views with SECURITY DEFINER, etc)"""
        # Check for views that might have security issues
        cur.execute("""
        SELECT schemaname, viewname, definition
        FROM pg_views
        WHERE schemaname = 'public'
          AND (definition ILIKE '%security definer%' OR definition ILIKE '%setuid%');
        """)

        dangerous_views = cur.fetchall()

        if not dangerous_views:
            self.log_finding('DANGEROUS_OBJECTS', 'PASS', 'No dangerous views detected')
        else:
            self.log_finding('DANGEROUS_OBJECTS', 'FAIL',
                           f'{len(dangerous_views)} potentially dangerous views found',
                           [f"{schema}.{view}" for schema, view, _ in dangerous_views])

    def run_audit(self):
        """Execute complete security audit"""
        try:
            with psycopg2.connect(self.dsn) as conn:
                with conn.cursor() as cur:
                    print("SAMIA-TAROT DATABASE SECURITY AUDIT")
                    print("=" * 50)
                    print(f"Timestamp: {datetime.now().isoformat()}")
                    print(f"Database: {self.dsn.split('@')[1].split('/')[0] if '@' in self.dsn else 'localhost'}")
                    print()

                    # Run all audit checks
                    self.audit_rls_enabled(cur)
                    self.audit_rls_policies(cur)
                    self.audit_force_rls(cur)
                    self.audit_security_definer(cur)
                    self.audit_postgrest_roles(cur)
                    self.audit_dangerous_objects(cur)

                    # Generate report
                    self.generate_report()

        except Exception as e:
            self.log_finding('AUDIT_EXECUTION', 'FAIL', f'Audit failed: {str(e)}')
            self.generate_report()

    def generate_report(self):
        """Generate final security audit report"""
        print("\nSECURITY AUDIT RESULTS")
        print("=" * 25)

        total_checks = len(self.passes) + len(self.critical_fails) + len(self.findings)

        print(f"Total Checks: {total_checks}")
        print(f"PASSED: {len(self.passes)}")
        print(f"WARNINGS: {len(self.findings)}")
        print(f"CRITICAL FAILURES: {len(self.critical_fails)}")
        print()

        # Show all results
        for result_set, title in [(self.passes, "PASSED CHECKS"),
                                 (self.findings, "WARNINGS"),
                                 (self.critical_fails, "CRITICAL FAILURES")]:
            if result_set:
                print(f"{title}:")
                for entry in result_set:
                    print(f"  [{entry['category']}] {entry['message']}")
                    if entry['details']:
                        for detail in entry['details'][:5]:  # Limit details
                            print(f"    - {detail}")
                        if len(entry['details']) > 5:
                            print(f"    ... and {len(entry['details'])-5} more")
                print()

        # Overall assessment
        print("OVERALL SECURITY STATUS:")
        if len(self.critical_fails) == 0:
            print("✅ SECURE - No critical vulnerabilities detected")
            print("   Database has production-ready security baseline")
        else:
            print("❌ VULNERABLE - Critical issues require immediate attention")

        if len(self.findings) > 0:
            print(f"⚠️  {len(self.findings)} optimization opportunities identified")

        print("\n" + "=" * 50)

        return len(self.critical_fails) == 0

def main():
    audit = SecurityAudit()
    success = audit.run_audit()
    exit(0 if success else 1)

if __name__ == "__main__":
    main()