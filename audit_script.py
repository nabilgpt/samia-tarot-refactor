#!/usr/bin/env python3
"""
Comprehensive Audit Script for Samia Tarot Platform
Connects to Supabase database and performs detailed analysis
"""

import psycopg2
import psycopg2.extras
import json
import sys
from datetime import datetime
from tabulate import tabulate
import pandas as pd

# Database connection parameters
DB_CONNECTION = "postgresql://postgres.uuseflmielktdcltzwzt:mam!1!2009Sirine@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

class TarotPlatformAuditor:
    def __init__(self, connection_string):
        self.connection_string = connection_string
        self.conn = None
        self.audit_results = {
            'timestamp': datetime.now().isoformat(),
            'database_info': {},
            'tables': {},
            'relationships': {},
            'indexes': {},
            'constraints': {},
            'security': {},
            'data_analysis': {},
            'performance': {},
            'recommendations': []
        }
    
    def connect(self):
        """Establish database connection"""
        try:
            self.conn = psycopg2.connect(self.connection_string)
            self.conn.set_session(autocommit=True)
            print("[SUCCESS] Successfully connected to Supabase database")
            return True
        except Exception as e:
            print(f"[ERROR] Database connection failed: {e}")
            return False
    
    def execute_query(self, query, params=None):
        """Execute SQL query safely"""
        try:
            with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
                cursor.execute(query, params)
                return cursor.fetchall()
        except Exception as e:
            print(f"Query error: {e}")
            return None
    
    def get_database_info(self):
        """Get basic database information"""
        print("\n[INFO] Gathering database information...")
        
        # Database version and settings
        version_info = self.execute_query("SELECT version();")
        db_size = self.execute_query("""
            SELECT pg_size_pretty(pg_database_size(current_database())) as size;
        """)
        
        # Connection info
        connection_info = self.execute_query("""
            SELECT count(*) as active_connections 
            FROM pg_stat_activity 
            WHERE state = 'active';
        """)
        
        self.audit_results['database_info'] = {
            'version': version_info[0]['version'] if version_info else 'Unknown',
            'size': db_size[0]['size'] if db_size else 'Unknown',
            'active_connections': connection_info[0]['active_connections'] if connection_info else 0
        }
        
        print(f"  Database Version: {self.audit_results['database_info']['version']}")
        print(f"  Database Size: {self.audit_results['database_info']['size']}")
        print(f"  Active Connections: {self.audit_results['database_info']['active_connections']}")
    
    def analyze_tables(self):
        """Analyze all tables in the database"""
        print("\n[ANALYSIS] Analyzing database tables...")
        
        # Get all tables
        tables_query = """
            SELECT 
                schemaname,
                tablename,
                tableowner,
                hasindexes,
                hasrules,
                hastriggers,
                rowsecurity
            FROM pg_tables 
            WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
            ORDER BY schemaname, tablename;
        """
        
        tables = self.execute_query(tables_query)
        
        if tables:
            self.audit_results['tables']['count'] = len(tables)
            self.audit_results['tables']['list'] = []
            
            print(f"  Found {len(tables)} tables")
            
            # Analyze each table
            for table in tables:
                table_name = f"{table['schemaname']}.{table['tablename']}"
                
                # Get column information
                columns_query = """
                    SELECT 
                        column_name,
                        data_type,
                        is_nullable,
                        column_default,
                        character_maximum_length
                    FROM information_schema.columns 
                    WHERE table_schema = %s AND table_name = %s
                    ORDER BY ordinal_position;
                """
                
                columns = self.execute_query(columns_query, (table['schemaname'], table['tablename']))
                
                # Get row count
                try:
                    row_count_query = f"SELECT COUNT(*) as count FROM {table_name};"
                    row_count = self.execute_query(row_count_query)
                    rows = row_count[0]['count'] if row_count else 0
                except:
                    rows = 'Error'
                
                # Get table size
                table_size_query = """
                    SELECT pg_size_pretty(pg_total_relation_size(%s)) as size;
                """
                size_result = self.execute_query(table_size_query, (table_name,))
                size = size_result[0]['size'] if size_result else 'Unknown'
                
                table_info = {
                    'name': table_name,
                    'schema': table['schemaname'],
                    'owner': table['tableowner'],
                    'columns': len(columns) if columns else 0,
                    'rows': rows,
                    'size': size,
                    'has_indexes': table['hasindexes'],
                    'has_triggers': table['hastriggers'],
                    'row_security': table['rowsecurity'],
                    'column_details': [dict(col) for col in columns] if columns else []
                }
                
                self.audit_results['tables']['list'].append(table_info)
                
                print(f"    {table_name}: {len(columns) if columns else 0} columns, {rows} rows, {size}")
    
    def analyze_relationships(self):
        """Analyze foreign key relationships"""
        print("\n[RELATIONSHIPS] Analyzing table relationships...")
        
        fk_query = """
            SELECT
                tc.table_schema,
                tc.constraint_name,
                tc.table_name,
                kcu.column_name,
                ccu.table_schema AS foreign_table_schema,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_schema NOT IN ('information_schema', 'pg_catalog');
        """
        
        relationships = self.execute_query(fk_query)
        
        if relationships:
            self.audit_results['relationships']['count'] = len(relationships)
            self.audit_results['relationships']['list'] = [dict(rel) for rel in relationships]
            
            print(f"  Found {len(relationships)} foreign key relationships")
            
            # Group by table for better understanding
            table_relationships = {}
            for rel in relationships:
                table = f"{rel['table_schema']}.{rel['table_name']}"
                if table not in table_relationships:
                    table_relationships[table] = []
                table_relationships[table].append({
                    'column': rel['column_name'],
                    'references': f"{rel['foreign_table_schema']}.{rel['foreign_table_name']}.{rel['foreign_column_name']}"
                })
            
            for table, rels in table_relationships.items():
                print(f"    {table} has {len(rels)} foreign key(s)")
    
    def analyze_indexes(self):
        """Analyze database indexes"""
        print("\n[INDEXES] Analyzing indexes...")
        
        indexes_query = """
            SELECT
                schemaname,
                tablename,
                indexname,
                indexdef,
                pg_size_pretty(pg_relation_size(indexname::regclass)) as size
            FROM pg_indexes
            WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
            ORDER BY schemaname, tablename, indexname;
        """
        
        indexes = self.execute_query(indexes_query)
        
        if indexes:
            self.audit_results['indexes']['count'] = len(indexes)
            self.audit_results['indexes']['list'] = [dict(idx) for idx in indexes]
            
            print(f"  Found {len(indexes)} indexes")
            
            # Group by table
            table_indexes = {}
            for idx in indexes:
                table = f"{idx['schemaname']}.{idx['tablename']}"
                if table not in table_indexes:
                    table_indexes[table] = 0
                table_indexes[table] += 1
            
            for table, count in table_indexes.items():
                print(f"    {table}: {count} indexes")
    
    def analyze_security(self):
        """Analyze RLS policies and security settings"""
        print("\n[SECURITY] Analyzing security settings...")
        
        # RLS policies
        rls_query = """
            SELECT
                schemaname,
                tablename,
                policyname,
                permissive,
                roles,
                cmd,
                qual,
                with_check
            FROM pg_policies
            WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
            ORDER BY schemaname, tablename, policyname;
        """
        
        policies = self.execute_query(rls_query)
        
        # Tables with RLS enabled
        rls_tables_query = """
            SELECT
                schemaname,
                tablename,
                rowsecurity
            FROM pg_tables
            WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
                AND rowsecurity = true
            ORDER BY schemaname, tablename;
        """
        
        rls_tables = self.execute_query(rls_tables_query)
        
        self.audit_results['security'] = {
            'rls_policies_count': len(policies) if policies else 0,
            'rls_enabled_tables': len(rls_tables) if rls_tables else 0,
            'policies': [dict(pol) for pol in policies] if policies else [],
            'rls_tables': [dict(tbl) for tbl in rls_tables] if rls_tables else []
        }
        
        print(f"  RLS Policies: {len(policies) if policies else 0}")
        print(f"  Tables with RLS: {len(rls_tables) if rls_tables else 0}")
    
    def analyze_data_patterns(self):
        """Analyze data patterns and quality"""
        print("\n[DATA] Analyzing data patterns...")
        
        # Check for common tarot platform tables
        important_tables = [
            'users', 'profiles', 'readers', 'bookings', 'sessions',
            'tarot_spreads', 'tarot_cards', 'readings', 'payments',
            'notifications', 'reviews', 'wallet_transactions'
        ]
        
        found_tables = []
        missing_tables = []
        
        for table in important_tables:
            # Check if table exists (case insensitive)
            check_query = """
                SELECT table_name 
                FROM information_schema.tables 
                WHERE LOWER(table_name) LIKE %s 
                    AND table_schema NOT IN ('information_schema', 'pg_catalog');
            """
            
            result = self.execute_query(check_query, (f'%{table.lower()}%',))
            
            if result:
                found_tables.extend([r['table_name'] for r in result])
            else:
                missing_tables.append(table)
        
        self.audit_results['data_analysis'] = {
            'important_tables_found': found_tables,
            'potentially_missing_tables': missing_tables
        }
        
        print(f"  Found important tables: {len(found_tables)}")
        print(f"  Potentially missing: {len(missing_tables)}")
        
        if found_tables:
            print("    Found:", ", ".join(found_tables[:10]))  # Show first 10
        if missing_tables:
            print("    Missing:", ", ".join(missing_tables))
    
    def generate_recommendations(self):
        """Generate audit recommendations"""
        print("\n[RECOMMENDATIONS] Generating recommendations...")
        
        recommendations = []
        
        # Check table count
        table_count = self.audit_results['tables']['count']
        if table_count > 100:
            recommendations.append({
                'type': 'Architecture',
                'priority': 'Medium',
                'message': f'Large number of tables ({table_count}). Consider database normalization review.'
            })
        
        # Check RLS coverage
        total_tables = table_count
        rls_tables = self.audit_results['security']['rls_enabled_tables']
        if total_tables > 0 and (rls_tables / total_tables) < 0.8:
            recommendations.append({
                'type': 'Security',
                'priority': 'High',
                'message': f'Only {rls_tables}/{total_tables} tables have RLS enabled. Review security policies.'
            })
        
        # Check for missing important tables
        missing_tables = self.audit_results['data_analysis']['potentially_missing_tables']
        if missing_tables:
            recommendations.append({
                'type': 'Data Model',
                'priority': 'Medium',
                'message': f'Consider implementing missing core tables: {", ".join(missing_tables[:5])}'
            })
        
        # Check index coverage
        total_tables = table_count
        indexed_tables = len([t for t in self.audit_results['tables']['list'] if t['has_indexes']])
        if total_tables > 0 and (indexed_tables / total_tables) < 0.7:
            recommendations.append({
                'type': 'Performance',
                'priority': 'Medium',
                'message': 'Consider adding indexes to improve query performance.'
            })
        
        self.audit_results['recommendations'] = recommendations
        
        print(f"  Generated {len(recommendations)} recommendations")
        for rec in recommendations:
            print(f"    [{rec['priority']}] {rec['type']}: {rec['message']}")
    
    def save_report(self, filename="tarot_platform_audit_report.json"):
        """Save comprehensive audit report"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(self.audit_results, f, indent=2, ensure_ascii=False, default=str)
            print(f"\n[SAVE] Audit report saved to: {filename}")
            return filename
        except Exception as e:
            print(f"[ERROR] Failed to save report: {e}")
            return None
    
    def print_summary(self):
        """Print audit summary"""
        print("\n" + "="*60)
        print("TAROT PLATFORM AUDIT SUMMARY")
        print("="*60)
        
        db_info = self.audit_results['database_info']
        print(f"Database Size: {db_info.get('size', 'Unknown')}")
        print(f"Active Connections: {db_info.get('active_connections', 0)}")
        
        tables_info = self.audit_results['tables']
        print(f"Total Tables: {tables_info.get('count', 0)}")
        
        relationships_info = self.audit_results['relationships']
        print(f"Foreign Key Relationships: {relationships_info.get('count', 0)}")
        
        indexes_info = self.audit_results['indexes']
        print(f"Database Indexes: {indexes_info.get('count', 0)}")
        
        security_info = self.audit_results['security']
        print(f"RLS Policies: {security_info.get('rls_policies_count', 0)}")
        print(f"Tables with RLS: {security_info.get('rls_enabled_tables', 0)}")
        
        print(f"Recommendations: {len(self.audit_results['recommendations'])}")
        
        print("="*60)
    
    def run_audit(self):
        """Run complete audit"""
        print("[START] Starting Comprehensive Tarot Platform Audit...")
        
        if not self.connect():
            return False
        
        try:
            self.get_database_info()
            self.analyze_tables()
            self.analyze_relationships()
            self.analyze_indexes()
            self.analyze_security()
            self.analyze_data_patterns()
            self.generate_recommendations()
            
            self.print_summary()
            report_file = self.save_report()
            
            print(f"\n[SUCCESS] Audit completed successfully!")
            return True
            
        except Exception as e:
            print(f"[ERROR] Audit failed: {e}")
            return False
        finally:
            if self.conn:
                self.conn.close()

if __name__ == "__main__":
    auditor = TarotPlatformAuditor(DB_CONNECTION)
    success = auditor.run_audit()
    
    if not success:
        sys.exit(1)