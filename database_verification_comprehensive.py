#!/usr/bin/env python3
"""
SAMIA TAROT DATABASE VERIFICATION PACK
=====================================

Comprehensive SQL verification to ensure database structure matches
production requirements and security policies.
"""

import psycopg2
import psycopg2.extras
import json
from datetime import datetime

class DatabaseVerificationPack:
    def __init__(self):
        self.connection_string = "postgresql://postgres.uuseflmielktdcltzwzt:mam!1!2009Sirine@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
        self.conn = None
        self.cursor = None
        self.verification_results = {}

    def connect_to_database(self) -> bool:
        """Establish connection to Supabase database"""
        try:
            print("[CONNECT] Connecting to Supabase for verification...")
            self.conn = psycopg2.connect(
                self.connection_string,
                cursor_factory=psycopg2.extras.RealDictCursor
            )
            self.cursor = self.conn.cursor()
            print("[SUCCESS] Connected successfully")
            return True
        except Exception as e:
            print(f"[ERROR] Connection failed: {str(e)}")
            return False

    def verify_new_tables_existence(self):
        """2.1 Check existence of 11 new tables"""
        print("\n[VERIFY] 2.1 - Checking existence of 11 new tables...")
        
        new_tables = [
            'tarot_v2_card_selections',
            'tarot_v2_audit_logs', 
            'deck_cards',
            'deck_uploads',
            'call_consent_logs',
            'call_emergency_extensions',
            'reader_availability',
            'reader_emergency_requests',
            'reader_availability_overrides',
            'payment_transactions',
            'user_wallets'
        ]
        
        sql = """
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_name IN %s
        ORDER BY table_schema, table_name;
        """
        
        try:
            self.cursor.execute(sql, (tuple(new_tables),))
            results = self.cursor.fetchall()
            
            print(f"[FOUND] {len(results)} tables found:")
            for row in results:
                print(f"  - {row['table_schema']}.{row['table_name']}")
            
            self.verification_results['new_tables'] = {
                'expected': len(new_tables),
                'found': len(results),
                'tables': [f"{r['table_schema']}.{r['table_name']}" for r in results]
            }
            
        except Exception as e:
            print(f"[ERROR] Table existence check failed: {str(e)}")

    def verify_critical_table_columns(self):
        """2.2 Check column definitions for critical tables"""
        print("\n[VERIFY] 2.2 - Checking critical table columns...")
        
        critical_tables = ['deck_cards', 'call_consent_logs', 'tarot_v2_card_selections']
        
        for table_name in critical_tables:
            try:
                sql = """
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = %s
                ORDER BY ordinal_position;
                """
                
                self.cursor.execute(sql, (table_name,))
                columns = self.cursor.fetchall()
                
                print(f"\n[TABLE] {table_name} columns ({len(columns)}):")
                for col in columns:
                    nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
                    print(f"  - {col['column_name']}: {col['data_type']} {nullable}")
                
                self.verification_results[f'{table_name}_columns'] = [
                    {
                        'name': c['column_name'],
                        'type': c['data_type'],
                        'nullable': c['is_nullable'] == 'YES'
                    } for c in columns
                ]
                
            except Exception as e:
                print(f"[ERROR] Column check for {table_name} failed: {str(e)}")

    def verify_indexes_and_constraints(self):
        """2.3 Check indexes and constraints on critical tables"""
        print("\n[VERIFY] 2.3 - Checking indexes and constraints...")
        
        critical_tables = ['deck_cards', 'call_emergency_extensions']
        
        for table_name in critical_tables:
            try:
                sql = """
                SELECT i.relname AS index_name, pg_get_indexdef(ix.indexrelid) AS index_def
                FROM pg_index ix
                JOIN pg_class t ON t.oid = ix.indrelid
                JOIN pg_class i ON i.oid = ix.indexrelid
                JOIN pg_namespace n ON n.oid = t.relnamespace
                WHERE t.relname = %s
                ORDER BY 1;
                """
                
                self.cursor.execute(sql, (table_name,))
                indexes = self.cursor.fetchall()
                
                print(f"\n[INDEXES] {table_name} ({len(indexes)}):")
                for idx in indexes:
                    print(f"  - {idx['index_name']}")
                    print(f"    {idx['index_def']}")
                
                self.verification_results[f'{table_name}_indexes'] = [
                    {'name': idx['index_name'], 'definition': idx['index_def']}
                    for idx in indexes
                ]
                
            except Exception as e:
                print(f"[ERROR] Index check for {table_name} failed: {str(e)}")

    def verify_rls_coverage(self):
        """2.4 Check RLS coverage and policy counts"""
        print("\n[VERIFY] 2.4 - Checking RLS coverage...")
        
        sql = """
        SELECT
          n.nspname  AS schema,
          c.relname  AS table_name,
          c.relrowsecurity AS rls_on,
          COALESCE((
            SELECT COUNT(*) FROM pg_policies p
            WHERE p.schemaname = n.nspname AND p.tablename = c.relname
          ), 0) AS policy_count
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'  -- tables only
          AND n.nspname NOT IN ('pg_catalog','information_schema')
        ORDER BY rls_on DESC, policy_count DESC, schema, table_name;
        """
        
        try:
            self.cursor.execute(sql)
            rls_summary = self.cursor.fetchall()
            
            tables_with_rls = [r for r in rls_summary if r['rls_on']]
            tables_without_rls = [r for r in rls_summary if not r['rls_on']]
            
            print(f"\n[RLS] Summary:")
            print(f"  - Tables with RLS: {len(tables_with_rls)}")
            print(f"  - Tables without RLS: {len(tables_without_rls)}")
            print(f"  - Total policies: {sum(r['policy_count'] for r in rls_summary)}")
            
            # Show tables without RLS that might need it
            print(f"\n[RLS] Tables without RLS (sample):")
            for table in tables_without_rls[:10]:
                print(f"  - {table['schema']}.{table['table_name']}")
            
            self.verification_results['rls_coverage'] = {
                'total_tables': len(rls_summary),
                'tables_with_rls': len(tables_with_rls),
                'tables_without_rls': len(tables_without_rls),
                'total_policies': sum(r['policy_count'] for r in rls_summary),
                'tables_with_rls_list': [f"{r['schema']}.{r['table_name']}" for r in tables_with_rls]
            }
            
        except Exception as e:
            print(f"[ERROR] RLS coverage check failed: {str(e)}")

    def verify_critical_table_policies(self):
        """Check detailed policies on critical tables"""
        print("\n[VERIFY] 2.4b - Checking policies on critical tables...")
        
        critical_tables = [
            ('public', 'tarot_v2_card_selections'),
            ('public', 'tarot_v2_audit_logs'),
            ('public', 'deck_cards'),
            ('public', 'call_consent_logs'),
            ('public', 'call_emergency_extensions'),
            ('public', 'reader_availability'),
            ('public', 'reader_emergency_requests'),
            ('public', 'reader_availability_overrides'),
            ('public', 'payment_transactions'),
            ('public', 'user_wallets')
        ]
        
        sql = """
        SELECT schemaname, tablename, policyname, permissive, roles, cmd,
               pg_get_expr(qual, (SELECT oid FROM pg_class WHERE relname = tablename LIMIT 1)) AS using_expr,
               pg_get_expr(with_check, (SELECT oid FROM pg_class WHERE relname = tablename LIMIT 1)) AS check_expr
        FROM pg_policies
        WHERE (schemaname, tablename) IN %s
        ORDER BY schemaname, tablename, policyname;
        """
        
        try:
            self.cursor.execute(sql, (tuple(critical_tables),))
            policies = self.cursor.fetchall()
            
            print(f"\n[POLICIES] Critical table policies ({len(policies)}):")
            for policy in policies:
                print(f"  - {policy['tablename']}.{policy['policyname']}")
                print(f"    Command: {policy['cmd']}")
                print(f"    Using: {policy['using_expr']}")
                if policy['check_expr']:
                    print(f"    Check: {policy['check_expr']}")
                print()
            
            self.verification_results['critical_policies'] = [
                {
                    'table': f"{p['schemaname']}.{p['tablename']}", 
                    'policy': p['policyname'],
                    'command': p['cmd'],
                    'using': p['using_expr'],
                    'check': p['check_expr']
                } for p in policies
            ]
            
        except Exception as e:
            print(f"[ERROR] Critical policies check failed: {str(e)}")

    def verify_ai_isolation_policies(self):
        """2.5 Check AI content isolation"""
        print("\n[VERIFY] 2.5 - Checking AI content isolation...")
        
        ai_tables = ['tarot_v2_audit_logs', 'ai_reading_audit_log', 'ai_content_access_log']
        
        sql = """
        SELECT schemaname, tablename, policyname, roles, cmd
        FROM pg_policies
        WHERE tablename = ANY(%s)
        ORDER BY tablename, policyname;
        """
        
        try:
            self.cursor.execute(sql, (ai_tables,))
            ai_policies = self.cursor.fetchall()
            
            print(f"\n[AI_ISOLATION] AI table policies ({len(ai_policies)}):")
            for policy in ai_policies:
                print(f"  - {policy['tablename']}.{policy['policyname']}")
                print(f"    Roles: {policy['roles']}")
                print(f"    Command: {policy['cmd']}")
            
            self.verification_results['ai_isolation'] = [
                {
                    'table': p['tablename'],
                    'policy': p['policyname'], 
                    'roles': p['roles'],
                    'command': p['cmd']
                } for p in ai_policies
            ]
            
        except Exception as e:
            print(f"[ERROR] AI isolation check failed: {str(e)}")

    def verify_consent_logging_structure(self):
        """2.6 Check consent logging structure"""
        print("\n[VERIFY] 2.6 - Checking consent logging structure...")
        
        sql = """
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'call_consent_logs'
        ORDER BY ordinal_position;
        """
        
        try:
            self.cursor.execute(sql)
            consent_columns = self.cursor.fetchall()
            
            print(f"\n[CONSENT] call_consent_logs structure ({len(consent_columns)} columns):")
            required_columns = ['session_id', 'user_id', 'consent_given', 'ip_address', 'created_at']
            
            found_columns = [col['column_name'] for col in consent_columns]
            
            for col in consent_columns:
                status = "[REQUIRED]" if col['column_name'] in required_columns else "[OPTIONAL]"
                print(f"  {status} {col['column_name']}: {col['data_type']}")
            
            missing = set(required_columns) - set(found_columns)
            if missing:
                print(f"\n[WARNING] Missing required columns: {missing}")
            
            self.verification_results['consent_structure'] = {
                'total_columns': len(consent_columns),
                'found_columns': found_columns,
                'required_columns': required_columns,
                'missing_columns': list(missing)
            }
            
        except Exception as e:
            print(f"[ERROR] Consent structure check failed: {str(e)}")

    def generate_verification_report(self):
        """Generate comprehensive verification report"""
        print("\n[REPORT] Generating verification report...")
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'verification_results': self.verification_results,
            'summary': {
                'tables_verified': len([k for k in self.verification_results.keys() if '_columns' in k]),
                'rls_tables': self.verification_results.get('rls_coverage', {}).get('tables_with_rls', 0),
                'critical_policies': len(self.verification_results.get('critical_policies', [])),
                'ai_policies': len(self.verification_results.get('ai_isolation', [])),
            }
        }
        
        # Save detailed JSON report
        report_filename = f"database_verification_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        try:
            with open(report_filename, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, default=str)
            print(f"[SAVE] Detailed report saved to: {report_filename}")
        except Exception as e:
            print(f"[ERROR] Failed to save report: {str(e)}")
        
        # Print summary
        print(f"\n[SUMMARY] VERIFICATION RESULTS")
        print(f"=" * 50)
        print(f"New Tables Found: {self.verification_results.get('new_tables', {}).get('found', 0)}/11")
        print(f"RLS Protected Tables: {self.verification_results.get('rls_coverage', {}).get('tables_with_rls', 0)}")
        print(f"Critical Policies: {len(self.verification_results.get('critical_policies', []))}")
        print(f"AI Isolation Policies: {len(self.verification_results.get('ai_isolation', []))}")
        
        missing_consent_cols = self.verification_results.get('consent_structure', {}).get('missing_columns', [])
        if missing_consent_cols:
            print(f"Missing Consent Columns: {missing_consent_cols}")
        else:
            print("Consent Logging: Complete")

    def run_comprehensive_verification(self):
        """Run all verification checks"""
        print("[VERIFY] SAMIA TAROT DATABASE VERIFICATION PACK")
        print("=" * 60)
        
        try:
            if not self.connect_to_database():
                return
            
            # Run all verification steps
            self.verify_new_tables_existence()
            self.verify_critical_table_columns()
            self.verify_indexes_and_constraints()
            self.verify_rls_coverage()
            self.verify_critical_table_policies()
            self.verify_ai_isolation_policies()
            self.verify_consent_logging_structure()
            
            # Generate final report
            self.generate_verification_report()
            
        except Exception as e:
            print(f"[ERROR] Verification failed: {str(e)}")
        
        finally:
            if self.cursor:
                self.cursor.close()
            if self.conn:
                self.conn.close()
            print(f"\n[COMPLETE] Verification completed at: {datetime.now().isoformat()}")

if __name__ == "__main__":
    print("[START] Database Verification Pack...")
    verifier = DatabaseVerificationPack()
    verifier.run_comprehensive_verification()