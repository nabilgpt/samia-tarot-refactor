#!/usr/bin/env python3
"""
SAMIA TAROT DATABASE VERIFICATION - FIXED VERSION
=================================================
"""

import psycopg2
import psycopg2.extras
from datetime import datetime

class DatabaseVerificationFixed:
    def __init__(self):
        self.connection_string = "postgresql://postgres.uuseflmielktdcltzwzt:mam!1!2009Sirine@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
        self.conn = None
        self.cursor = None

    def connect_to_database(self) -> bool:
        try:
            print("[CONNECT] Connecting to Supabase...")
            self.conn = psycopg2.connect(
                self.connection_string,
                cursor_factory=psycopg2.extras.RealDictCursor
            )
            self.cursor = self.conn.cursor()
            return True
        except Exception as e:
            print(f"[ERROR] Connection failed: {str(e)}")
            return False

    def check_critical_policies_simple(self):
        """Check policies on critical tables (simplified)"""
        print("\n[VERIFY] Critical Table Policies...")
        
        critical_tables = [
            'tarot_v2_card_selections',
            'tarot_v2_audit_logs', 
            'deck_cards',
            'call_consent_logs',
            'call_emergency_extensions',
            'reader_availability',
            'payment_transactions',
            'user_wallets'
        ]
        
        for table in critical_tables:
            try:
                # Check if RLS is enabled
                self.cursor.execute("""
                    SELECT relrowsecurity 
                    FROM pg_class 
                    WHERE relname = %s
                """, (table,))
                rls_result = self.cursor.fetchone()
                
                # Get policy count
                self.cursor.execute("""
                    SELECT COUNT(*) as policy_count
                    FROM pg_policies 
                    WHERE tablename = %s
                """, (table,))
                policy_result = self.cursor.fetchone()
                
                rls_status = "ENABLED" if rls_result and rls_result['relrowsecurity'] else "DISABLED"
                policy_count = policy_result['policy_count'] if policy_result else 0
                
                print(f"  - {table}: RLS {rls_status}, Policies: {policy_count}")
                
            except Exception as e:
                print(f"  - {table}: ERROR - {str(e)}")

    def check_ai_isolation_simple(self):
        """Check AI isolation policies (simplified)"""
        print("\n[VERIFY] AI Content Isolation...")
        
        # Check if tarot_v2_readings has the critical isolation column
        try:
            self.cursor.execute("""
                SELECT column_name, column_default
                FROM information_schema.columns
                WHERE table_name = 'tarot_v2_readings' 
                AND column_name = 'ai_draft_visible_to_client'
            """)
            result = self.cursor.fetchone()
            
            if result:
                print(f"  [SUCCESS] AI isolation column found: {result['column_name']}")
                print(f"  [DEFAULT] Default value: {result['column_default']}")
            else:
                print("  [WARNING] AI isolation column not found")
                
        except Exception as e:
            print(f"  [ERROR] AI isolation check failed: {str(e)}")

    def check_consent_logging_complete(self):
        """Complete consent logging verification"""
        print("\n[VERIFY] Consent Logging Structure...")
        
        try:
            self.cursor.execute("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'call_consent_logs'
                ORDER BY ordinal_position
            """)
            columns = self.cursor.fetchall()
            
            required_columns = {
                'session_id': 'uuid',
                'user_id': 'uuid', 
                'consent_given': 'boolean',
                'ip_address': 'inet',
                'timestamp': 'timestamp'
            }
            
            print(f"  [STRUCTURE] Found {len(columns)} columns:")
            found_required = {}
            
            for col in columns:
                col_name = col['column_name']
                nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
                default = f" DEFAULT {col['column_default']}" if col['column_default'] else ""
                
                status = "[REQUIRED]" if col_name in required_columns else "[OPTIONAL]"
                print(f"    {status} {col_name}: {col['data_type']} {nullable}{default}")
                
                if col_name in required_columns:
                    found_required[col_name] = col['data_type']
            
            # Check for missing required columns
            missing = set(required_columns.keys()) - set(found_required.keys())
            if missing:
                print(f"  [WARNING] Missing required: {missing}")
            else:
                print(f"  [SUCCESS] All required consent columns present")
                
        except Exception as e:
            print(f"  [ERROR] Consent logging check failed: {str(e)}")

    def check_permanent_recording_setting(self):
        """Verify permanent recording setting"""
        print("\n[VERIFY] Permanent Recording Setting...")
        
        try:
            self.cursor.execute("""
                SELECT column_name, column_default
                FROM information_schema.columns
                WHERE table_name = 'call_recordings' 
                AND column_name = 'is_permanently_stored'
            """)
            result = self.cursor.fetchone()
            
            if result:
                print(f"  [FOUND] Column: {result['column_name']}")
                print(f"  [DEFAULT] Default value: {result['column_default']}")
                
                if 'true' in str(result['column_default']).lower():
                    print("  [SUCCESS] Permanent storage is DEFAULT TRUE (as required)")
                else:
                    print("  [WARNING] Default value should be TRUE for permanent storage")
            else:
                print("  [ERROR] Permanent recording column not found")
                
        except Exception as e:
            print(f"  [ERROR] Recording check failed: {str(e)}")

    def check_emergency_extension_structure(self):
        """Check emergency extension table structure"""
        print("\n[VERIFY] Emergency Extension Structure...")
        
        try:
            self.cursor.execute("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'call_emergency_extensions'
                ORDER BY ordinal_position
            """)
            columns = self.cursor.fetchall()
            
            required_fields = ['session_id', 'additional_minutes', 'cost', 'approval_status']
            
            print(f"  [STRUCTURE] Found {len(columns)} columns:")
            found_required = []
            
            for col in columns:
                nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
                status = "[REQUIRED]" if col['column_name'] in required_fields else "[OPTIONAL]"
                print(f"    {status} {col['column_name']}: {col['data_type']} {nullable}")
                
                if col['column_name'] in required_fields:
                    found_required.append(col['column_name'])
            
            missing = set(required_fields) - set(found_required)
            if missing:
                print(f"  [WARNING] Missing required: {missing}")
            else:
                print(f"  [SUCCESS] All emergency extension fields present")
                
        except Exception as e:
            print(f"  [ERROR] Emergency extension check failed: {str(e)}")

    def final_security_check(self):
        """Final security and compliance check"""
        print("\n[VERIFY] Final Security & Compliance Check...")
        
        security_checks = [
            {
                'name': 'AI Draft Isolation',
                'table': 'tarot_v2_readings',
                'column': 'ai_draft_visible_to_client',
                'expected_default': 'false'
            },
            {
                'name': 'Permanent Recording',
                'table': 'call_recordings', 
                'column': 'is_permanently_stored',
                'expected_default': 'true'
            }
        ]
        
        for check in security_checks:
            try:
                self.cursor.execute("""
                    SELECT column_default
                    FROM information_schema.columns
                    WHERE table_name = %s AND column_name = %s
                """, (check['table'], check['column']))
                
                result = self.cursor.fetchone()
                if result and result['column_default']:
                    default_val = str(result['column_default']).lower()
                    expected = check['expected_default'].lower()
                    
                    if expected in default_val:
                        print(f"  [SUCCESS] {check['name']}: DEFAULT {result['column_default']} ✓")
                    else:
                        print(f"  [WARNING] {check['name']}: DEFAULT {result['column_default']} (expected {check['expected_default']})")
                else:
                    print(f"  [ERROR] {check['name']}: Column not found or no default")
                    
            except Exception as e:
                print(f"  [ERROR] {check['name']} check failed: {str(e)}")

    def run_fixed_verification(self):
        """Run fixed verification checks"""
        print("[VERIFY] SAMIA TAROT - FIXED VERIFICATION")
        print("=" * 50)
        
        try:
            if not self.connect_to_database():
                return
            
            self.check_critical_policies_simple()
            self.check_ai_isolation_simple()
            self.check_consent_logging_complete()
            self.check_permanent_recording_setting()
            self.check_emergency_extension_structure()
            self.final_security_check()
            
            print(f"\n[SUCCESS] Fixed verification completed successfully")
            
        except Exception as e:
            print(f"[ERROR] Verification failed: {str(e)}")
        
        finally:
            if self.cursor:
                self.cursor.close()
            if self.conn:
                self.conn.close()

if __name__ == "__main__":
    verifier = DatabaseVerificationFixed()
    verifier.run_fixed_verification()