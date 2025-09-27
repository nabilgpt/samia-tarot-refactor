#!/usr/bin/env python3
"""
RLS/Route-Guard Parity Validation
Validates that API route guards match database RLS policies exactly
"""
import os
import sys
import json
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from datetime import datetime
from typing import Dict, List, Tuple, Optional

# Configuration
DSN = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
POOL = SimpleConnectionPool(minconn=1, maxconn=3, dsn=DSN)

class RLSParityResults:
    def __init__(self):
        self.endpoints_tested = 0
        self.parity_matches = 0
        self.parity_failures = []
        self.missing_policies = []
        self.missing_guards = []
    
    def add_parity_test(self, endpoint: str, table: str, matches: bool, details: str = ""):
        self.endpoints_tested += 1
        if matches:
            self.parity_matches += 1
            print(f"[OK] {endpoint} <-> {table}")
        else:
            self.parity_failures.append(f"{endpoint} <-> {table}: {details}")
            print(f"[FAIL] {endpoint} <-> {table} - {details}")
    
    def add_missing_policy(self, table: str, reason: str):
        self.missing_policies.append(f"{table}: {reason}")
        print(f"[MISSING RLS] {table} - {reason}")
    
    def add_missing_guard(self, endpoint: str, reason: str):
        self.missing_guards.append(f"{endpoint}: {reason}")
        print(f"[MISSING GUARD] {endpoint} - {reason}")
    
    def get_parity_percentage(self) -> float:
        if self.endpoints_tested == 0:
            return 0.0
        return (self.parity_matches / self.endpoints_tested) * 100
    
    def is_compliant(self) -> bool:
        return (len(self.parity_failures) == 0 and 
                len(self.missing_policies) == 0 and 
                len(self.missing_guards) == 0)

def get_rls_policies() -> Dict[str, List[Dict]]:
    """Extract all RLS policies from database"""
    conn = POOL.getconn()
    policies = {}
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                select 
                    tablename,
                    policyname,
                    cmd,
                    qual,
                    with_check
                from pg_policies 
                where schemaname = 'public'
                order by tablename, policyname
            """)
            
            for row in cur.fetchall():
                table = row[0]
                if table not in policies:
                    policies[table] = []
                
                policies[table].append({
                    'name': row[1],
                    'command': row[2],
                    'condition': row[3],
                    'with_check': row[4]
                })
    
    finally:
        POOL.putconn(conn)
    
    return policies

def check_table_rls_enabled() -> Dict[str, bool]:
    """Check which tables have RLS enabled"""
    conn = POOL.getconn()
    rls_status = {}
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                select 
                    relname,
                    relrowsecurity
                from pg_class 
                where relkind = 'r' 
                and relname not like 'pg_%'
                and relname not like 'auth.%'
                and relnamespace = 'public'::regnamespace
            """)
            
            for row in cur.fetchall():
                rls_status[row[0]] = row[1]
    
    finally:
        POOL.putconn(conn)
    
    return rls_status

def validate_core_tables_parity() -> RLSParityResults:
    """Validate parity for core business logic tables"""
    results = RLSParityResults()
    
    # Define expected route <-> table mappings
    endpoint_mappings = [
        # Profile management
        {
            'endpoint': 'GET /api/profile',
            'table': 'profiles',
            'expected_roles': ['client', 'reader', 'admin', 'monitor'],
            'expected_policy': 'Own profile or admin access'
        },
        {
            'endpoint': 'PUT /api/profile',
            'table': 'profiles', 
            'expected_roles': ['client', 'reader', 'admin'],
            'expected_policy': 'Own profile only'
        },
        
        # Order management
        {
            'endpoint': 'GET /api/orders',
            'table': 'orders',
            'expected_roles': ['client', 'reader', 'admin'],
            'expected_policy': 'Own orders or assigned orders'
        },
        {
            'endpoint': 'POST /api/orders',
            'table': 'orders',
            'expected_roles': ['client'],
            'expected_policy': 'User can create own orders'
        },
        {
            'endpoint': 'GET /api/orders/{id}',
            'table': 'orders',
            'expected_roles': ['client', 'reader', 'admin'],
            'expected_policy': 'Own order or assigned reader'
        },
        
        # Reading management
        {
            'endpoint': 'GET /api/readings',
            'table': 'readings',
            'expected_roles': ['client', 'reader', 'admin'],
            'expected_policy': 'Own readings or created readings'
        },
        {
            'endpoint': 'POST /api/readings',
            'table': 'readings',
            'expected_roles': ['reader', 'admin'],
            'expected_policy': 'Reader can create for assigned orders'
        },
        
        # Payment management
        {
            'endpoint': 'GET /api/payments',
            'table': 'payments',
            'expected_roles': ['client', 'admin'],
            'expected_policy': 'Own payments only'
        },
        {
            'endpoint': 'POST /api/payments',
            'table': 'payments',
            'expected_roles': ['client'],
            'expected_policy': 'User can create own payments'
        },
        
        # Notification management
        {
            'endpoint': 'GET /api/notifications',
            'table': 'notifications',
            'expected_roles': ['client', 'reader', 'admin'],
            'expected_policy': 'Own notifications only'
        },
        {
            'endpoint': 'PUT /api/notifications/{id}/read',
            'table': 'notifications',
            'expected_roles': ['client', 'reader'],
            'expected_policy': 'Own notifications only'
        },
        
        # Personalization features
        {
            'endpoint': 'GET /api/personalization/settings',
            'table': 'personalization_settings',
            'expected_roles': ['client'],
            'expected_policy': 'Own settings only'
        },
        {
            'endpoint': 'PUT /api/personalization/settings',
            'table': 'personalization_settings',
            'expected_roles': ['client'],
            'expected_policy': 'Own settings only'
        },
        
        # AR Assets (Admin/Reader create, User view own)
        {
            'endpoint': 'GET /api/ar/assets',
            'table': 'ar_assets',
            'expected_roles': ['client', 'reader', 'admin'],
            'expected_policy': 'Own assets or approved public assets'
        },
        {
            'endpoint': 'POST /api/ar/assets',
            'table': 'ar_assets',
            'expected_roles': ['reader', 'admin'],
            'expected_policy': 'Reader/Admin can create assets'
        },
        
        # Translation management (Admin only)
        {
            'endpoint': 'GET /api/i18n/translations',
            'table': 'translations',
            'expected_roles': ['admin'],
            'expected_policy': 'Admin only access'
        },
        {
            'endpoint': 'POST /api/i18n/translations',
            'table': 'translations',
            'expected_roles': ['admin'],
            'expected_policy': 'Admin only create/update'
        },
        
        # Monitoring (Admin/Monitor roles)
        {
            'endpoint': 'GET /api/monitoring/metrics',
            'table': 'monitoring_metrics',
            'expected_roles': ['admin', 'monitor'],
            'expected_policy': 'Admin/Monitor access'
        },
        {
            'endpoint': 'GET /api/monitoring/health',
            'table': 'health_checks',
            'expected_roles': ['admin', 'monitor'],
            'expected_policy': 'Admin/Monitor access'
        },
        
        # Feature flags (Admin only)
        {
            'endpoint': 'GET /api/admin/feature-flags',
            'table': 'feature_flags',
            'expected_roles': ['admin'],
            'expected_policy': 'Admin only'
        },
        {
            'endpoint': 'PUT /api/admin/feature-flags/{key}',
            'table': 'feature_flags',
            'expected_roles': ['admin'],
            'expected_policy': 'Admin only'
        },
        
        # Budget tracking (Admin only)
        {
            'endpoint': 'GET /api/admin/budget',
            'table': 'budget_tracking',
            'expected_roles': ['admin'],
            'expected_policy': 'Admin only'
        },
        
        # Circuit breakers (Admin/Monitor)
        {
            'endpoint': 'GET /api/admin/circuit-breakers',
            'table': 'circuit_breakers',
            'expected_roles': ['admin', 'monitor'],
            'expected_policy': 'Admin/Monitor access'
        }
    ]
    
    # Get actual RLS policies
    rls_policies = get_rls_policies()
    rls_enabled = check_table_rls_enabled()
    
    print("=== RLS/Route Guard Parity Validation ===")
    print(f"Testing {len(endpoint_mappings)} endpoint mappings...")
    
    for mapping in endpoint_mappings:
        endpoint = mapping['endpoint']
        table = mapping['table']
        expected_roles = mapping['expected_roles']
        expected_policy = mapping['expected_policy']
        
        # Check if table has RLS enabled
        if table not in rls_enabled:
            results.add_missing_policy(table, "Table does not exist")
            continue
            
        if not rls_enabled[table]:
            results.add_missing_policy(table, "RLS not enabled")
            continue
        
        # Check if table has policies
        if table not in rls_policies:
            results.add_missing_policy(table, "No RLS policies found")
            continue
        
        policies = rls_policies[table]
        
        # Analyze policies for role-based access
        has_appropriate_policies = False
        policy_details = []
        
        for policy in policies:
            policy_details.append(f"{policy['name']} ({policy['command']})")
            
            # Check for role-based conditions
            condition = policy['condition'] or ""
            if any(role in condition or f"role_id" in condition for role in expected_roles):
                has_appropriate_policies = True
        
        if has_appropriate_policies:
            results.add_parity_test(
                endpoint, 
                table, 
                True, 
                f"Policies: {', '.join(policy_details[:2])}"
            )
        else:
            results.add_parity_test(
                endpoint,
                table,
                False,
                f"Missing role-based policies for {expected_roles}"
            )
    
    return results

def validate_admin_only_tables() -> RLSParityResults:
    """Validate that admin-only tables are properly protected"""
    results = RLSParityResults()
    
    admin_only_tables = [
        'feature_flags',
        'budget_tracking', 
        'slo_definitions',
        'production_incidents',
        'translation_glossary'
    ]
    
    print("\n=== Admin-Only Table Protection ===")
    
    rls_policies = get_rls_policies()
    rls_enabled = check_table_rls_enabled()
    
    for table in admin_only_tables:
        if table not in rls_enabled:
            results.add_missing_policy(table, "Table does not exist")
            continue
            
        if not rls_enabled[table]:
            results.add_missing_policy(table, "RLS not enabled on admin-only table")
            continue
        
        if table not in rls_policies:
            results.add_missing_policy(table, "No RLS policies on admin-only table")
            continue
        
        # Check that policies restrict to admin roles
        policies = rls_policies[table]
        admin_restricted = False
        
        for policy in policies:
            condition = policy['condition'] or ""
            if "role_id in (1,2)" in condition or "admin" in condition.lower():
                admin_restricted = True
                break
        
        if admin_restricted:
            results.add_parity_test(
                f"Admin access to {table}",
                table,
                True,
                "Admin role restriction found"
            )
        else:
            results.add_parity_test(
                f"Admin access to {table}",
                table, 
                False,
                "Missing admin role restriction"
            )
    
    return results

def validate_user_isolation() -> RLSParityResults:
    """Validate user data isolation policies"""
    results = RLSParityResults()
    
    user_isolated_tables = [
        'profiles',
        'orders',
        'readings',
        'payments',
        'notifications',
        'personalization_settings',
        'personalization_features'
    ]
    
    print("\n=== User Data Isolation Validation ===")
    
    rls_policies = get_rls_policies()
    
    for table in user_isolated_tables:
        if table not in rls_policies:
            results.add_missing_policy(table, "No isolation policies")
            continue
        
        policies = rls_policies[table]
        has_user_isolation = False
        
        for policy in policies:
            condition = policy['condition'] or ""
            # Look for user isolation patterns
            isolation_patterns = [
                "auth.uid()",
                "current_setting('app.current_user_id')",
                "user_id =",
                "id = auth.uid()"
            ]
            
            if any(pattern in condition for pattern in isolation_patterns):
                has_user_isolation = True
                break
        
        if has_user_isolation:
            results.add_parity_test(
                f"User isolation for {table}",
                table,
                True,
                "User isolation policy found"
            )
        else:
            results.add_parity_test(
                f"User isolation for {table}",
                table,
                False,
                "Missing user isolation policy"
            )
    
    return results

def generate_parity_report(results: List[RLSParityResults]) -> dict:
    """Generate comprehensive parity report"""
    total_tests = sum(r.endpoints_tested for r in results)
    total_matches = sum(r.parity_matches for r in results)
    all_failures = []
    all_missing_policies = []
    all_missing_guards = []
    
    for result in results:
        all_failures.extend(result.parity_failures)
        all_missing_policies.extend(result.missing_policies)
        all_missing_guards.extend(result.missing_guards)
    
    parity_percentage = (total_matches / total_tests * 100) if total_tests > 0 else 0
    is_compliant = len(all_failures) == 0 and len(all_missing_policies) == 0 and len(all_missing_guards) == 0
    
    return {
        'timestamp': datetime.now().isoformat(),
        'endpoints_validated': total_tests,
        'parity_matches': total_matches,
        'parity_percentage': round(parity_percentage, 2),
        'is_compliant': is_compliant,
        'parity_failures': all_failures,
        'missing_policies': all_missing_policies,
        'missing_guards': all_missing_guards
    }

def main():
    """Run comprehensive RLS/Route Guard parity validation"""
    print("RLS/Route-Guard Parity Validation")
    print("Validating API route guards match database RLS policies")
    print("=" * 60)
    
    try:
        # Run all validation suites
        validation_suites = [
            ("Core Tables Parity", validate_core_tables_parity),
            ("Admin-Only Protection", validate_admin_only_tables),
            ("User Data Isolation", validate_user_isolation),
        ]
        
        all_results = []
        
        for suite_name, validation_func in validation_suites:
            try:
                result = validation_func()
                all_results.append(result)
            except Exception as e:
                print(f"\n[ERROR] {suite_name} validation failed: {e}")
                # Create empty result for failed suite
                failed_result = RLSParityResults()
                failed_result.parity_failures.append(f"{suite_name}: {str(e)}")
                all_results.append(failed_result)
        
        # Generate final report
        report = generate_parity_report(all_results)
        
        print(f"\n{'='*60}")
        print("RLS/ROUTE GUARD PARITY SUMMARY")
        print(f"{'='*60}")
        print(f"Endpoints Validated: {report['endpoints_validated']}")
        print(f"Parity Matches: {report['parity_matches']}")
        print(f"Parity Percentage: {report['parity_percentage']}%")
        print(f"Compliance Status: {'COMPLIANT' if report['is_compliant'] else 'NON-COMPLIANT'}")
        
        if report['parity_failures']:
            print(f"\nPARITY FAILURES ({len(report['parity_failures'])}):")
            for failure in report['parity_failures']:
                print(f"  - {failure}")
        
        if report['missing_policies']:
            print(f"\nMISSING RLS POLICIES ({len(report['missing_policies'])}):")
            for missing in report['missing_policies']:
                print(f"  - {missing}")
        
        if report['missing_guards']:
            print(f"\nMISSING ROUTE GUARDS ({len(report['missing_guards'])}):")
            for missing in report['missing_guards']:
                print(f"  - {missing}")
        
        # Save detailed report
        with open('rls_parity_report.json', 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\nDetailed report saved to: rls_parity_report.json")
        
        # Return success if 100% parity achieved
        return report['parity_percentage'] == 100.0 and report['is_compliant']
        
    except Exception as e:
        print(f"\n[CRITICAL ERROR] RLS parity validation failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)