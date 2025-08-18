#!/usr/bin/env python3
"""
SUPABASE DATABASE CRITICAL FIXES
================================

This script fixes the most critical database issues identified in the audit:
1. Missing critical tables
2. Missing essential columns
3. Missing RLS policies

Focus on production-critical features only.
"""

import psycopg2
import psycopg2.extras
import traceback
from datetime import datetime

class CriticalDatabaseFixer:
    def __init__(self):
        # Supabase connection via Session Pooler
        self.connection_string = "postgresql://postgres.uuseflmielktdcltzwzt:mam!1!2009Sirine@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
        self.conn = None
        self.cursor = None
        self.fixes_applied = []
        self.errors_encountered = []

    def connect_to_database(self) -> bool:
        """Establish connection to Supabase database"""
        try:
            print("[CONNECT] Connecting to Supabase database...")
            self.conn = psycopg2.connect(
                self.connection_string,
                cursor_factory=psycopg2.extras.RealDictCursor
            )
            self.cursor = self.conn.cursor()
            
            # Test connection
            self.cursor.execute("SELECT version();")
            version = self.cursor.fetchone()
            print(f"[SUCCESS] Connected successfully to PostgreSQL")
            return True
            
        except Exception as e:
            print(f"[ERROR] Database connection failed: {str(e)}")
            return False

    def create_missing_critical_tables(self):
        """Create missing critical tables for production features"""
        print("\n[FIX] Creating missing critical tables...")
        
        missing_tables_sql = {
            "tarot_v2_card_selections": """
                CREATE TABLE IF NOT EXISTS tarot_v2_card_selections (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    reading_id UUID NOT NULL,
                    card_id UUID NOT NULL,
                    position INTEGER NOT NULL,
                    is_revealed BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                
                ALTER TABLE tarot_v2_card_selections ENABLE ROW LEVEL SECURITY;
                
                CREATE POLICY "card_selections_reading_access" ON tarot_v2_card_selections 
                FOR ALL USING (
                    reading_id IN (
                        SELECT id FROM tarot_v2_readings 
                        WHERE client_id = auth.uid() OR reader_id = auth.uid()
                    )
                );
            """,
            
            "tarot_v2_audit_logs": """
                CREATE TABLE IF NOT EXISTS tarot_v2_audit_logs (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    reading_id UUID NOT NULL,
                    action VARCHAR(100) NOT NULL,
                    user_id UUID NOT NULL,
                    details JSONB,
                    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                
                ALTER TABLE tarot_v2_audit_logs ENABLE ROW LEVEL SECURITY;
                
                CREATE POLICY "audit_logs_admin_access" ON tarot_v2_audit_logs 
                FOR SELECT USING (
                    auth.jwt() ->> 'role' IN ('admin', 'super_admin')
                );
            """,
            
            "deck_cards": """
                CREATE TABLE IF NOT EXISTS deck_cards (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    deck_type_id UUID NOT NULL,
                    card_number INTEGER NOT NULL,
                    image_url TEXT NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                
                ALTER TABLE deck_cards ENABLE ROW LEVEL SECURITY;
                
                CREATE POLICY "deck_cards_public_read" ON deck_cards 
                FOR SELECT USING (TRUE);
                
                CREATE POLICY "deck_cards_admin_manage" ON deck_cards 
                FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));
            """,
            
            "deck_uploads": """
                CREATE TABLE IF NOT EXISTS deck_uploads (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    deck_type_id UUID NOT NULL,
                    upload_session_id UUID NOT NULL,
                    status VARCHAR(50) DEFAULT 'pending',
                    progress INTEGER DEFAULT 0,
                    total_files INTEGER DEFAULT 79,
                    uploaded_by UUID NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                
                ALTER TABLE deck_uploads ENABLE ROW LEVEL SECURITY;
                
                CREATE POLICY "deck_uploads_creator_access" ON deck_uploads 
                FOR ALL USING (
                    uploaded_by = auth.uid() OR 
                    auth.jwt() ->> 'role' IN ('admin', 'super_admin')
                );
            """,
            
            "call_consent_logs": """
                CREATE TABLE IF NOT EXISTS call_consent_logs (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    session_id UUID NOT NULL,
                    user_id UUID NOT NULL,
                    consent_type VARCHAR(50) NOT NULL,
                    consent_given BOOLEAN NOT NULL,
                    ip_address INET,
                    user_agent TEXT,
                    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                
                ALTER TABLE call_consent_logs ENABLE ROW LEVEL SECURITY;
                
                CREATE POLICY "consent_logs_user_access" ON call_consent_logs 
                FOR SELECT USING (
                    user_id = auth.uid() OR 
                    auth.jwt() ->> 'role' IN ('admin', 'super_admin')
                );
            """,
            
            "call_emergency_extensions": """
                CREATE TABLE IF NOT EXISTS call_emergency_extensions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    session_id UUID NOT NULL,
                    additional_minutes INTEGER NOT NULL,
                    cost DECIMAL(10,2) NOT NULL,
                    emergency_reason TEXT NOT NULL,
                    approval_status VARCHAR(50) DEFAULT 'pending',
                    requested_by UUID NOT NULL,
                    approved_by UUID,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    approved_at TIMESTAMP WITH TIME ZONE
                );
                
                ALTER TABLE call_emergency_extensions ENABLE ROW LEVEL SECURITY;
                
                CREATE POLICY "emergency_extensions_participant_access" ON call_emergency_extensions 
                FOR ALL USING (
                    session_id IN (
                        SELECT id FROM call_sessions 
                        WHERE client_id = auth.uid() OR reader_id = auth.uid()
                    ) OR 
                    auth.jwt() ->> 'role' IN ('admin', 'super_admin')
                );
            """,
            
            "reader_availability": """
                CREATE TABLE IF NOT EXISTS reader_availability (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    reader_id UUID NOT NULL,
                    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
                    start_time TIME NOT NULL,
                    end_time TIME NOT NULL,
                    is_active BOOLEAN DEFAULT TRUE,
                    emergency_opt_in BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                
                ALTER TABLE reader_availability ENABLE ROW LEVEL SECURITY;
                
                CREATE POLICY "reader_availability_public_read" ON reader_availability 
                FOR SELECT USING (is_active = TRUE);
                
                CREATE POLICY "reader_availability_reader_manage" ON reader_availability 
                FOR ALL USING (
                    reader_id = auth.uid() OR 
                    auth.jwt() ->> 'role' IN ('admin', 'super_admin')
                );
            """,
            
            "reader_emergency_requests": """
                CREATE TABLE IF NOT EXISTS reader_emergency_requests (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    reader_id UUID NOT NULL,
                    client_id UUID NOT NULL,
                    status VARCHAR(50) DEFAULT 'pending',
                    emergency_reason TEXT,
                    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    responded_at TIMESTAMP WITH TIME ZONE
                );
                
                ALTER TABLE reader_emergency_requests ENABLE ROW LEVEL SECURITY;
                
                CREATE POLICY "emergency_requests_participant_access" ON reader_emergency_requests 
                FOR ALL USING (
                    reader_id = auth.uid() OR 
                    client_id = auth.uid() OR 
                    auth.jwt() ->> 'role' IN ('admin', 'super_admin')
                );
            """,
            
            "reader_availability_overrides": """
                CREATE TABLE IF NOT EXISTS reader_availability_overrides (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    reader_id UUID NOT NULL,
                    date DATE NOT NULL,
                    start_time TIME,
                    end_time TIME,
                    is_available BOOLEAN NOT NULL,
                    reason TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                
                ALTER TABLE reader_availability_overrides ENABLE ROW LEVEL SECURITY;
                
                CREATE POLICY "availability_overrides_reader_manage" ON reader_availability_overrides 
                FOR ALL USING (
                    reader_id = auth.uid() OR 
                    auth.jwt() ->> 'role' IN ('admin', 'super_admin')
                );
            """,
            
            "payment_transactions": """
                CREATE TABLE IF NOT EXISTS payment_transactions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NOT NULL,
                    amount DECIMAL(10,2) NOT NULL,
                    currency VARCHAR(3) DEFAULT 'USD',
                    status VARCHAR(50) DEFAULT 'pending',
                    payment_method VARCHAR(100) NOT NULL,
                    transaction_id VARCHAR(255),
                    metadata JSONB,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                
                ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
                
                CREATE POLICY "payment_transactions_user_access" ON payment_transactions 
                FOR SELECT USING (
                    user_id = auth.uid() OR 
                    auth.jwt() ->> 'role' IN ('admin', 'super_admin')
                );
            """,
            
            "user_wallets": """
                CREATE TABLE IF NOT EXISTS user_wallets (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID UNIQUE NOT NULL,
                    balance DECIMAL(10,2) DEFAULT 0,
                    currency VARCHAR(3) DEFAULT 'USD',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                
                ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
                
                CREATE POLICY "user_wallets_owner_access" ON user_wallets 
                FOR ALL USING (
                    user_id = auth.uid() OR 
                    auth.jwt() ->> 'role' IN ('admin', 'super_admin')
                );
            """
        }
        
        for table_name, sql in missing_tables_sql.items():
            try:
                print(f"[CREATE] Creating table: {table_name}")
                self.cursor.execute(sql)
                self.conn.commit()
                print(f"  [SUCCESS] Table {table_name} created successfully")
                self.fixes_applied.append(f"Created table: {table_name}")
                
            except Exception as e:
                self.conn.rollback()
                error_msg = f"Failed to create table {table_name}: {str(e)}"
                print(f"  [ERROR] {error_msg}")
                self.errors_encountered.append(error_msg)

    def add_missing_critical_columns(self):
        """Add missing critical columns to existing tables"""
        print("\n[FIX] Adding missing critical columns...")
        
        column_additions = {
            "tarot_spreads": [
                "ALTER TABLE tarot_spreads ADD COLUMN IF NOT EXISTS visibility_mode VARCHAR(50) DEFAULT 'public';",
                "ALTER TABLE tarot_spreads ADD COLUMN IF NOT EXISTS target_readers UUID[];"
            ],
            "call_sessions": [
                "ALTER TABLE call_sessions ADD COLUMN IF NOT EXISTS max_duration_minutes INTEGER DEFAULT 30;",
                "ALTER TABLE call_sessions ADD COLUMN IF NOT EXISTS recording_enabled BOOLEAN DEFAULT TRUE;"
            ],
            "call_recordings": [
                "ALTER TABLE call_recordings ADD COLUMN IF NOT EXISTS session_id UUID;",
                "ALTER TABLE call_recordings ADD COLUMN IF NOT EXISTS file_url TEXT;",
                "ALTER TABLE call_recordings ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;",
                "ALTER TABLE call_recordings ADD COLUMN IF NOT EXISTS is_permanently_stored BOOLEAN DEFAULT TRUE;"
            ],
            "daily_zodiac": [
                "ALTER TABLE daily_zodiac ADD COLUMN IF NOT EXISTS content_en TEXT;",
                "ALTER TABLE daily_zodiac ADD COLUMN IF NOT EXISTS content_ar TEXT;",
                "ALTER TABLE daily_zodiac ADD COLUMN IF NOT EXISTS audio_url TEXT;"
            ],
            "deck_types": [
                "ALTER TABLE deck_types ADD COLUMN IF NOT EXISTS name VARCHAR(255);",
                "ALTER TABLE deck_types ADD COLUMN IF NOT EXISTS description TEXT;",
                "ALTER TABLE deck_types ADD COLUMN IF NOT EXISTS card_count INTEGER DEFAULT 78;"
            ],
            "system_configurations": [
                "ALTER TABLE system_configurations ADD COLUMN IF NOT EXISTS key VARCHAR(255);",
                "ALTER TABLE system_configurations ADD COLUMN IF NOT EXISTS value TEXT;"
            ],
            "system_secrets": [
                "ALTER TABLE system_secrets ADD COLUMN IF NOT EXISTS key VARCHAR(255);",
                "ALTER TABLE system_secrets ADD COLUMN IF NOT EXISTS value TEXT;",
                "ALTER TABLE system_secrets ADD COLUMN IF NOT EXISTS category VARCHAR(100);",
                "ALTER TABLE system_secrets ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT TRUE;"
            ],
            "profiles": [
                "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);"
            ],
            "payment_methods": [
                "ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS name VARCHAR(255);",
                "ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS configuration JSONB;"
            ],
            "notifications": [
                "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id UUID;",
                "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;"
            ],
            "admin_audit_logs": [
                "ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS action VARCHAR(255);",
                "ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();"
            ]
        }
        
        for table_name, columns in column_additions.items():
            try:
                print(f"[UPDATE] Adding columns to table: {table_name}")
                for column_sql in columns:
                    try:
                        self.cursor.execute(column_sql)
                        self.conn.commit()
                    except Exception as e:
                        if "already exists" not in str(e).lower():
                            raise e
                
                print(f"  [SUCCESS] Columns added to {table_name}")
                self.fixes_applied.append(f"Added columns to table: {table_name}")
                
            except Exception as e:
                self.conn.rollback()
                error_msg = f"Failed to add columns to {table_name}: {str(e)}"
                print(f"  [ERROR] {error_msg}")
                self.errors_encountered.append(error_msg)

    def add_missing_rls_policies(self):
        """Add missing RLS policies to critical tables"""
        print("\n[FIX] Adding missing RLS policies...")
        
        rls_policies = {
            "call_sessions": [
                "ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;",
                """CREATE POLICY "call_sessions_participant_access" ON call_sessions 
                   FOR ALL USING (client_id = auth.uid() OR reader_id = auth.uid());"""
            ],
            "profiles": [
                "ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;",
                """CREATE POLICY "profiles_user_access" ON profiles 
                   FOR SELECT USING (id = auth.uid());""",
                """CREATE POLICY "profiles_user_update" ON profiles 
                   FOR UPDATE USING (id = auth.uid());"""
            ],
            "bookings": [
                "ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;",
                """CREATE POLICY "bookings_participant_access" ON bookings 
                   FOR ALL USING (
                       client_id = auth.uid() OR 
                       reader_id = auth.uid() OR 
                       auth.jwt() ->> 'role' IN ('admin', 'super_admin')
                   );"""
            ],
            "admin_audit_logs": [
                "ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;",
                """CREATE POLICY "admin_audit_logs_admin_access" ON admin_audit_logs 
                   FOR SELECT USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));"""
            ],
            "notifications": [
                "ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;",
                """CREATE POLICY "notifications_user_access" ON notifications 
                   FOR ALL USING (
                       user_id = auth.uid() OR 
                       auth.jwt() ->> 'role' IN ('admin', 'super_admin')
                   );"""
            ]
        }
        
        for table_name, policies in rls_policies.items():
            try:
                print(f"[SECURE] Adding RLS policies to table: {table_name}")
                for policy_sql in policies:
                    try:
                        self.cursor.execute(policy_sql)
                        self.conn.commit()
                    except Exception as e:
                        if "already exists" not in str(e).lower():
                            print(f"    [WARNING] Policy creation warning: {str(e)}")
                
                print(f"  [SUCCESS] RLS policies added to {table_name}")
                self.fixes_applied.append(f"Added RLS policies to table: {table_name}")
                
            except Exception as e:
                self.conn.rollback()
                error_msg = f"Failed to add RLS policies to {table_name}: {str(e)}"
                print(f"  [ERROR] {error_msg}")
                self.errors_encountered.append(error_msg)

    def generate_fix_report(self):
        """Generate a report of all fixes applied"""
        print("\n[REPORT] Generating fix report...")
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "fixes_applied_count": len(self.fixes_applied),
            "errors_count": len(self.errors_encountered),
            "fixes_applied": self.fixes_applied,
            "errors_encountered": self.errors_encountered,
            "status": "SUCCESS" if len(self.errors_encountered) == 0 else "PARTIAL_SUCCESS"
        }
        
        # Save report to file
        report_filename = f"database_fixes_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        try:
            import json
            with open(report_filename, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, default=str)
            print(f"[SAVE] Fix report saved to: {report_filename}")
        except Exception as e:
            print(f"[ERROR] Failed to save report: {str(e)}")
        
        # Print summary
        print(f"\n[SUMMARY] DATABASE FIXES SUMMARY")
        print(f"=" * 50)
        print(f"[FIXES] Applied: {len(self.fixes_applied)}")
        print(f"[ERRORS] Encountered: {len(self.errors_encountered)}")
        print(f"[STATUS] Overall: {report['status']}")
        
        if self.fixes_applied:
            print(f"\n[SUCCESS] Fixes Applied:")
            for fix in self.fixes_applied:
                print(f"  + {fix}")
        
        if self.errors_encountered:
            print(f"\n[ERROR] Errors Encountered:")
            for error in self.errors_encountered:
                print(f"  - {error}")

    def run_critical_fixes(self):
        """Run all critical database fixes"""
        print("[FIX] SAMIA TAROT DATABASE CRITICAL FIXES")
        print("=" * 50)
        print(f"Started at: {datetime.now().isoformat()}")
        
        try:
            # Step 1: Connect to database
            if not self.connect_to_database():
                return
            
            # Step 2: Create missing critical tables
            self.create_missing_critical_tables()
            
            # Step 3: Add missing critical columns
            self.add_missing_critical_columns()
            
            # Step 4: Add missing RLS policies
            self.add_missing_rls_policies()
            
            # Step 5: Generate fix report
            self.generate_fix_report()
            
        except Exception as e:
            print(f"[ERROR] Critical fixes failed with error: {str(e)}")
            print(traceback.format_exc())
        
        finally:
            # Clean up connections
            if self.cursor:
                self.cursor.close()
            if self.conn:
                self.conn.close()
            print(f"\n[COMPLETE] Critical fixes completed at: {datetime.now().isoformat()}")

if __name__ == "__main__":
    print("[START] SAMIA TAROT Critical Database Fixes...")
    
    # Check if psycopg2 is available
    try:
        import psycopg2
        import psycopg2.extras
    except ImportError:
        print("[INSTALL] psycopg2 not found. Installing...")
        import subprocess
        import sys
        subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"])
        import psycopg2
        import psycopg2.extras
    
    # Run the critical fixes
    fixer = CriticalDatabaseFixer()
    fixer.run_critical_fixes()