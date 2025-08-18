#!/usr/bin/env python3
"""
SAMIA TAROT DATABASE COMPREHENSIVE AUDIT & MIGRATION TOOL
=========================================================

This script performs a complete audit of the Supabase database, validates
all tables, columns, policies, and executes necessary migrations.

Features:
- Connect to Supabase via Session Pooler
- Audit all existing tables and structure
- Validate RLS policies
- Execute missing migrations
- Generate comprehensive audit report
- Fix database inconsistencies
"""

import psycopg2
import psycopg2.extras
import json
import sys
import traceback
from datetime import datetime
from typing import Dict, List, Any, Optional

class SupabaseDatabaseAuditor:
    def __init__(self):
        # Supabase connection via Session Pooler
        self.connection_string = "postgresql://postgres.uuseflmielktdcltzwzt:mam!1!2009Sirine@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
        self.conn = None
        self.cursor = None
        
        # Audit results
        self.audit_results = {
            "timestamp": datetime.now().isoformat(),
            "connection_status": False,
            "tables_found": [],
            "tables_missing": [],
            "policies_found": [],
            "policies_missing": [],
            "columns_issues": [],
            "migration_status": {},
            "recommendations": [],
            "critical_issues": [],
            "warnings": []
        }
        
        # Expected tables based on all our migrations
        self.expected_tables = {
            # Core Authentication & Users
            "profiles": {
                "required_columns": ["id", "email", "full_name", "role", "phone", "created_at", "updated_at"],
                "critical": True
            },
            "users": {
                "required_columns": ["id", "email", "created_at"],
                "critical": True
            },
            
            # Tarot System
            "tarot_cards": {
                "required_columns": ["id", "name", "description", "image_url", "meaning_upright", "meaning_reversed"],
                "critical": True
            },
            "tarot_spreads": {
                "required_columns": ["id", "name", "description", "layout", "visibility_mode", "target_readers"],
                "critical": True
            },
            "tarot_readings": {
                "required_columns": ["id", "client_id", "reader_id", "spread_id", "status", "created_at"],
                "critical": True
            },
            
            # Tarot V2 System (AI Draft Isolation)
            "tarot_v2_readings": {
                "required_columns": ["id", "client_id", "reader_id", "status", "ai_draft_visible_to_client", "created_at"],
                "critical": True
            },
            "tarot_v2_card_selections": {
                "required_columns": ["id", "reading_id", "card_id", "position", "is_revealed"],
                "critical": True
            },
            "tarot_v2_audit_logs": {
                "required_columns": ["id", "reading_id", "action", "user_id", "timestamp"],
                "critical": True
            },
            
            # Deck Management
            "deck_types": {
                "required_columns": ["id", "name", "description", "is_active", "card_count"],
                "critical": True
            },
            "deck_cards": {
                "required_columns": ["id", "deck_type_id", "card_number", "image_url", "name"],
                "critical": True
            },
            "deck_uploads": {
                "required_columns": ["id", "deck_type_id", "upload_session_id", "status", "progress"],
                "critical": True
            },
            
            # Calls & WebRTC System
            "call_sessions": {
                "required_columns": ["id", "client_id", "reader_id", "status", "max_duration_minutes", "recording_enabled"],
                "critical": True
            },
            "call_recordings": {
                "required_columns": ["id", "session_id", "file_url", "duration_seconds", "is_permanently_stored"],
                "critical": True
            },
            "call_consent_logs": {
                "required_columns": ["id", "session_id", "user_id", "consent_type", "consent_given", "ip_address"],
                "critical": True
            },
            "call_emergency_extensions": {
                "required_columns": ["id", "session_id", "additional_minutes", "cost", "approval_status"],
                "critical": True
            },
            
            # Reader Availability System
            "reader_availability": {
                "required_columns": ["id", "reader_id", "day_of_week", "start_time", "end_time", "is_active"],
                "critical": True
            },
            "reader_emergency_requests": {
                "required_columns": ["id", "reader_id", "client_id", "status", "requested_at"],
                "critical": True
            },
            "reader_availability_overrides": {
                "required_columns": ["id", "reader_id", "date", "start_time", "end_time", "is_available"],
                "critical": True
            },
            
            # Daily Zodiac System
            "daily_zodiac": {
                "required_columns": ["id", "date", "zodiac_sign", "content_en", "content_ar", "audio_url"],
                "critical": True
            },
            "zodiac_generation_logs": {
                "required_columns": ["id", "date", "status", "generation_type", "started_at", "completed_at"],
                "critical": False
            },
            
            # Bookings & Services
            "bookings": {
                "required_columns": ["id", "client_id", "reader_id", "service_type", "status", "scheduled_at"],
                "critical": True
            },
            "services": {
                "required_columns": ["id", "name", "description", "price", "duration_minutes", "is_active"],
                "critical": True
            },
            
            # Payment System
            "payment_transactions": {
                "required_columns": ["id", "user_id", "amount", "currency", "status", "payment_method"],
                "critical": True
            },
            "payment_methods": {
                "required_columns": ["id", "name", "type", "is_active", "configuration"],
                "critical": True
            },
            "user_wallets": {
                "required_columns": ["id", "user_id", "balance", "currency", "updated_at"],
                "critical": True
            },
            
            # Admin & Analytics
            "admin_audit_logs": {
                "required_columns": ["id", "admin_id", "action", "table_name", "record_id", "timestamp"],
                "critical": True
            },
            "analytics_events": {
                "required_columns": ["id", "event_type", "user_id", "data", "timestamp"],
                "critical": False
            },
            
            # Configuration & Settings
            "system_configurations": {
                "required_columns": ["id", "key", "value", "is_encrypted", "updated_at"],
                "critical": True
            },
            "system_secrets": {
                "required_columns": ["id", "key", "value", "category", "is_encrypted"],
                "critical": True
            },
            
            # Notifications
            "notifications": {
                "required_columns": ["id", "user_id", "title", "message", "type", "is_read", "created_at"],
                "critical": True
            },
            
            # Feedback & Reviews
            "service_feedback": {
                "required_columns": ["id", "booking_id", "client_id", "reader_id", "rating", "comment"],
                "critical": False
            },
            
            # Chat System
            "chat_sessions": {
                "required_columns": ["id", "client_id", "reader_id", "status", "created_at"],
                "critical": True
            },
            "chat_messages": {
                "required_columns": ["id", "session_id", "sender_id", "message", "message_type", "timestamp"],
                "critical": True
            }
        }
        
        # Expected RLS policies
        self.expected_policies = {
            "call_sessions": ["client_reader_access"],
            "call_recordings": ["participant_access"],
            "call_consent_logs": ["user_access"],
            "tarot_v2_readings": ["client_reader_access", "ai_draft_isolation"],
            "tarot_spreads": ["visibility_control"],
            "deck_uploads": ["creator_admin_access"],
            "reader_availability": ["reader_modification"],
            "daily_zodiac": ["public_read_admin_write"],
            "profiles": ["user_access"],
            "bookings": ["client_reader_access"],
            "payment_transactions": ["user_access"],
            "admin_audit_logs": ["admin_access"],
            "notifications": ["user_access"],
            "chat_sessions": ["participant_access"],
            "chat_messages": ["session_participant_access"]
        }

    def connect_to_database(self) -> bool:
        """Establish connection to Supabase database"""
        try:
            print("🔌 Connecting to Supabase database...")
            self.conn = psycopg2.connect(
                self.connection_string,
                cursor_factory=psycopg2.extras.RealDictCursor
            )
            self.cursor = self.conn.cursor()
            
            # Test connection
            self.cursor.execute("SELECT version();")
            version = self.cursor.fetchone()
            print(f"✅ Connected successfully to PostgreSQL: {version['version']}")
            
            self.audit_results["connection_status"] = True
            return True
            
        except Exception as e:
            print(f"❌ Database connection failed: {str(e)}")
            self.audit_results["connection_status"] = False
            self.audit_results["critical_issues"].append(f"Database connection failed: {str(e)}")
            return False

    def audit_existing_tables(self) -> None:
        """Audit all existing tables and their structure"""
        print("\n📊 Auditing existing tables...")
        
        try:
            # Get all tables in public schema
            self.cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
                ORDER BY table_name;
            """)
            
            existing_tables = [row['table_name'] for row in self.cursor.fetchall()]
            self.audit_results["tables_found"] = existing_tables
            
            print(f"📋 Found {len(existing_tables)} existing tables:")
            for table in existing_tables:
                print(f"  ✓ {table}")
            
            # Check for missing critical tables
            for table_name, config in self.expected_tables.items():
                if table_name not in existing_tables:
                    if config["critical"]:
                        self.audit_results["critical_issues"].append(f"Critical table missing: {table_name}")
                        print(f"  ❌ CRITICAL: Missing table {table_name}")
                    else:
                        self.audit_results["warnings"].append(f"Optional table missing: {table_name}")
                        print(f"  ⚠️ WARNING: Missing table {table_name}")
                    
                    self.audit_results["tables_missing"].append(table_name)
            
            # Audit column structure for existing tables
            self.audit_table_columns(existing_tables)
            
        except Exception as e:
            error_msg = f"Error auditing tables: {str(e)}"
            print(f"❌ {error_msg}")
            self.audit_results["critical_issues"].append(error_msg)

    def audit_table_columns(self, existing_tables: List[str]) -> None:
        """Audit column structure for each table"""
        print("\n🔍 Auditing table columns...")
        
        for table_name in existing_tables:
            if table_name in self.expected_tables:
                try:
                    # Get table columns
                    self.cursor.execute("""
                        SELECT column_name, data_type, is_nullable
                        FROM information_schema.columns 
                        WHERE table_schema = 'public' 
                        AND table_name = %s
                        ORDER BY ordinal_position;
                    """, (table_name,))
                    
                    columns = {row['column_name']: row for row in self.cursor.fetchall()}
                    required_columns = self.expected_tables[table_name]["required_columns"]
                    
                    missing_columns = []
                    for required_col in required_columns:
                        if required_col not in columns:
                            missing_columns.append(required_col)
                    
                    if missing_columns:
                        issue = f"Table {table_name} missing columns: {', '.join(missing_columns)}"
                        self.audit_results["columns_issues"].append(issue)
                        if self.expected_tables[table_name]["critical"]:
                            self.audit_results["critical_issues"].append(issue)
                            print(f"  ❌ CRITICAL: {issue}")
                        else:
                            self.audit_results["warnings"].append(issue)
                            print(f"  ⚠️ WARNING: {issue}")
                    else:
                        print(f"  ✅ {table_name} - All required columns present")
                        
                except Exception as e:
                    error_msg = f"Error auditing columns for {table_name}: {str(e)}"
                    print(f"❌ {error_msg}")
                    self.audit_results["warnings"].append(error_msg)

    def audit_rls_policies(self) -> None:
        """Audit Row Level Security policies"""
        print("\n🔒 Auditing RLS policies...")
        
        try:
            # Get all RLS policies
            self.cursor.execute("""
                SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
                FROM pg_policies 
                WHERE schemaname = 'public'
                ORDER BY tablename, policyname;
            """)
            
            policies = self.cursor.fetchall()
            policies_by_table = {}
            
            for policy in policies:
                table_name = policy['tablename']
                if table_name not in policies_by_table:
                    policies_by_table[table_name] = []
                policies_by_table[table_name].append(policy['policyname'])
            
            self.audit_results["policies_found"] = policies_by_table
            
            print(f"🛡️ Found RLS policies on {len(policies_by_table)} tables:")
            for table, table_policies in policies_by_table.items():
                print(f"  ✓ {table}: {len(table_policies)} policies")
                for policy_name in table_policies:
                    print(f"    - {policy_name}")
            
            # Check for missing policies on critical tables
            for table_name, expected_policies in self.expected_policies.items():
                if table_name not in policies_by_table:
                    issue = f"Table {table_name} has no RLS policies"
                    self.audit_results["critical_issues"].append(issue)
                    self.audit_results["policies_missing"].append(table_name)
                    print(f"  ❌ CRITICAL: {issue}")
                else:
                    # Check if table has RLS enabled
                    self.cursor.execute("""
                        SELECT relrowsecurity 
                        FROM pg_class 
                        WHERE relname = %s AND relnamespace = (
                            SELECT oid FROM pg_namespace WHERE nspname = 'public'
                        );
                    """, (table_name,))
                    
                    result = self.cursor.fetchone()
                    if not result or not result['relrowsecurity']:
                        issue = f"Table {table_name} has policies but RLS is not enabled"
                        self.audit_results["critical_issues"].append(issue)
                        print(f"  ❌ CRITICAL: {issue}")
                    else:
                        print(f"  ✅ {table_name} - RLS enabled with policies")
            
        except Exception as e:
            error_msg = f"Error auditing RLS policies: {str(e)}"
            print(f"❌ {error_msg}")
            self.audit_results["critical_issues"].append(error_msg)

    def execute_migration_files(self) -> None:
        """Execute migration files if needed"""
        print("\n🔄 Checking and executing migrations...")
        
        migration_files = [
            "database/migrations/001_spread_visibility_system.sql",
            "database/migrations/002_deck_bulk_upload_system.sql", 
            "database/migrations/003_reader_availability_system.sql",
            "database/migrations/004_tarot_v2_system.sql",
            "database/migrations/005_calls_webrtc_system.sql"
        ]
        
        for migration_file in migration_files:
            try:
                # Check if migration file exists
                import os
                if not os.path.exists(migration_file):
                    self.audit_results["warnings"].append(f"Migration file not found: {migration_file}")
                    continue
                
                # Read migration file
                with open(migration_file, 'r', encoding='utf-8') as f:
                    migration_sql = f.read()
                
                # Execute migration (in transaction)
                print(f"📜 Executing migration: {migration_file}")
                
                try:
                    self.cursor.execute(migration_sql)
                    self.conn.commit()
                    self.audit_results["migration_status"][migration_file] = "success"
                    print(f"  ✅ Migration executed successfully")
                except Exception as e:
                    self.conn.rollback()
                    if "already exists" in str(e).lower():
                        self.audit_results["migration_status"][migration_file] = "already_exists"
                        print(f"  ℹ️ Migration already applied")
                    else:
                        self.audit_results["migration_status"][migration_file] = f"error: {str(e)}"
                        print(f"  ❌ Migration failed: {str(e)}")
                        self.audit_results["warnings"].append(f"Migration failed {migration_file}: {str(e)}")
                
            except Exception as e:
                error_msg = f"Error processing migration {migration_file}: {str(e)}"
                print(f"❌ {error_msg}")
                self.audit_results["warnings"].append(error_msg)

    def create_missing_critical_tables(self) -> None:
        """Create any missing critical tables with basic structure"""
        print("\n🔧 Creating missing critical tables...")
        
        # Basic table creation SQL for critical missing tables
        table_creation_sql = {
            "profiles": """
                CREATE TABLE IF NOT EXISTS profiles (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    email VARCHAR(255) UNIQUE NOT NULL,
                    full_name VARCHAR(255),
                    role VARCHAR(50) DEFAULT 'client',
                    phone VARCHAR(20),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                
                ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
                
                CREATE POLICY "users_can_view_own_profile" ON profiles 
                FOR SELECT USING (auth.uid() = id);
                
                CREATE POLICY "users_can_update_own_profile" ON profiles 
                FOR UPDATE USING (auth.uid() = id);
            """,
            
            "tarot_v2_readings": """
                CREATE TABLE IF NOT EXISTS tarot_v2_readings (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    client_id UUID NOT NULL,
                    reader_id UUID,
                    status VARCHAR(50) DEFAULT 'pending',
                    ai_draft_visible_to_client BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                
                ALTER TABLE tarot_v2_readings ENABLE ROW LEVEL SECURITY;
                
                CREATE POLICY "ai_draft_isolation" ON tarot_v2_readings 
                FOR ALL USING (
                    CASE 
                        WHEN auth.jwt() ->> 'role' = 'client' THEN 
                            client_id = auth.uid() AND ai_draft_visible_to_client = FALSE
                        WHEN auth.jwt() ->> 'role' IN ('reader', 'admin', 'super_admin') THEN 
                            TRUE
                        ELSE FALSE
                    END
                );
            """,
            
            "call_sessions": """
                CREATE TABLE IF NOT EXISTS call_sessions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    client_id UUID NOT NULL,
                    reader_id UUID NOT NULL,
                    status VARCHAR(50) DEFAULT 'scheduled',
                    max_duration_minutes INTEGER DEFAULT 30,
                    recording_enabled BOOLEAN DEFAULT TRUE,
                    client_consent_given BOOLEAN DEFAULT FALSE,
                    reader_consent_given BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                
                ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;
                
                CREATE POLICY "participant_access" ON call_sessions 
                FOR ALL USING (client_id = auth.uid() OR reader_id = auth.uid());
            """,
            
            "call_recordings": """
                CREATE TABLE IF NOT EXISTS call_recordings (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    session_id UUID NOT NULL,
                    file_url TEXT NOT NULL,
                    duration_seconds INTEGER,
                    is_permanently_stored BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                
                ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;
                
                CREATE POLICY "recording_participant_access" ON call_recordings 
                FOR SELECT USING (
                    session_id IN (
                        SELECT id FROM call_sessions 
                        WHERE client_id = auth.uid() OR reader_id = auth.uid()
                    )
                );
            """
        }
        
        for table_name in self.audit_results["tables_missing"]:
            if table_name in table_creation_sql and self.expected_tables.get(table_name, {}).get("critical", False):
                try:
                    print(f"🔨 Creating critical table: {table_name}")
                    self.cursor.execute(table_creation_sql[table_name])
                    self.conn.commit()
                    print(f"  ✅ Table {table_name} created successfully")
                    
                    # Remove from missing list
                    if table_name in self.audit_results["tables_missing"]:
                        self.audit_results["tables_missing"].remove(table_name)
                        self.audit_results["tables_found"].append(table_name)
                        
                except Exception as e:
                    self.conn.rollback()
                    error_msg = f"Failed to create table {table_name}: {str(e)}"
                    print(f"  ❌ {error_msg}")
                    self.audit_results["warnings"].append(error_msg)

    def generate_recommendations(self) -> None:
        """Generate recommendations based on audit results"""
        print("\n💡 Generating recommendations...")
        
        recommendations = []
        
        # Critical issues recommendations
        if self.audit_results["critical_issues"]:
            recommendations.append("🚨 URGENT: Address all critical issues immediately before production deployment")
        
        # Missing tables recommendations
        if self.audit_results["tables_missing"]:
            critical_missing = [t for t in self.audit_results["tables_missing"] 
                             if self.expected_tables.get(t, {}).get("critical", False)]
            if critical_missing:
                recommendations.append(f"🔧 Create missing critical tables: {', '.join(critical_missing)}")
        
        # RLS policy recommendations
        tables_without_rls = self.audit_results["policies_missing"]
        if tables_without_rls:
            recommendations.append(f"🛡️ Implement RLS policies for: {', '.join(tables_without_rls)}")
        
        # Column issues recommendations
        if self.audit_results["columns_issues"]:
            recommendations.append("📋 Fix column structure issues in affected tables")
        
        # Performance recommendations
        recommendations.extend([
            "📊 Run ANALYZE on all tables after fixes to update statistics",
            "🔍 Consider adding indexes on frequently queried columns",
            "🧹 Set up automated vacuum and maintenance schedules",
            "📈 Implement monitoring for database performance"
        ])
        
        # Security recommendations
        recommendations.extend([
            "🔐 Review and test all RLS policies thoroughly",
            "🔒 Ensure sensitive data is properly encrypted",
            "📝 Implement comprehensive audit logging",
            "🚨 Set up alerting for security policy violations"
        ])
        
        self.audit_results["recommendations"] = recommendations
        
        print("📋 Recommendations generated:")
        for i, rec in enumerate(recommendations, 1):
            print(f"  {i}. {rec}")

    def generate_audit_report(self) -> None:
        """Generate comprehensive audit report"""
        print("\n📄 Generating comprehensive audit report...")
        
        # Summary statistics
        total_tables_expected = len(self.expected_tables)
        total_tables_found = len(self.audit_results["tables_found"])
        critical_tables_missing = len([t for t in self.audit_results["tables_missing"] 
                                     if self.expected_tables.get(t, {}).get("critical", False)])
        
        report = {
            "audit_summary": {
                "timestamp": self.audit_results["timestamp"],
                "connection_status": self.audit_results["connection_status"],
                "total_tables_expected": total_tables_expected,
                "total_tables_found": total_tables_found,
                "tables_missing_count": len(self.audit_results["tables_missing"]),
                "critical_tables_missing": critical_tables_missing,
                "critical_issues_count": len(self.audit_results["critical_issues"]),
                "warnings_count": len(self.audit_results["warnings"]),
                "overall_status": "CRITICAL" if self.audit_results["critical_issues"] else 
                                "WARNING" if self.audit_results["warnings"] else "HEALTHY"
            },
            "detailed_results": self.audit_results,
            "next_steps": self.audit_results["recommendations"]
        }
        
        # Save report to file
        report_filename = f"database_audit_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        try:
            with open(report_filename, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, default=str)
            print(f"📄 Audit report saved to: {report_filename}")
        except Exception as e:
            print(f"❌ Failed to save report: {str(e)}")
        
        # Print summary
        print(f"\n📊 AUDIT SUMMARY")
        print(f"=" * 50)
        print(f"🔌 Connection Status: {'✅ Connected' if report['audit_summary']['connection_status'] else '❌ Failed'}")
        print(f"📋 Tables Found: {total_tables_found}/{total_tables_expected}")
        print(f"❌ Critical Issues: {report['audit_summary']['critical_issues_count']}")
        print(f"⚠️ Warnings: {report['audit_summary']['warnings_count']}")
        print(f"🎯 Overall Status: {report['audit_summary']['overall_status']}")
        
        if self.audit_results["critical_issues"]:
            print(f"\n🚨 CRITICAL ISSUES:")
            for issue in self.audit_results["critical_issues"]:
                print(f"  • {issue}")
        
        if self.audit_results["warnings"]:
            print(f"\n⚠️ WARNINGS:")
            for warning in self.audit_results["warnings"]:
                print(f"  • {warning}")

    def run_comprehensive_audit(self) -> None:
        """Run complete database audit"""
        print("🔍 SAMIA TAROT DATABASE COMPREHENSIVE AUDIT")
        print("=" * 60)
        print(f"Started at: {datetime.now().isoformat()}")
        
        try:
            # Step 1: Connect to database
            if not self.connect_to_database():
                return
            
            # Step 2: Audit existing tables
            self.audit_existing_tables()
            
            # Step 3: Audit RLS policies
            self.audit_rls_policies()
            
            # Step 4: Execute migrations if needed
            self.execute_migration_files()
            
            # Step 5: Create missing critical tables
            self.create_missing_critical_tables()
            
            # Step 6: Re-audit after fixes
            print("\n🔄 Re-auditing after fixes...")
            self.audit_existing_tables()
            self.audit_rls_policies()
            
            # Step 7: Generate recommendations
            self.generate_recommendations()
            
            # Step 8: Generate final report
            self.generate_audit_report()
            
        except Exception as e:
            print(f"❌ Audit failed with error: {str(e)}")
            print(traceback.format_exc())
        
        finally:
            # Clean up connections
            if self.cursor:
                self.cursor.close()
            if self.conn:
                self.conn.close()
            print(f"\n✅ Audit completed at: {datetime.now().isoformat()}")

if __name__ == "__main__":
    print("[ROCKET] Starting SAMIA TAROT Database Audit...")
    
    # Check if psycopg2 is available
    try:
        import psycopg2
        import psycopg2.extras
    except ImportError:
        print("[ERROR] psycopg2 not found. Installing...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"])
        import psycopg2
        import psycopg2.extras
    
    # Run the audit
    auditor = SupabaseDatabaseAuditor()
    auditor.run_comprehensive_audit()