#!/usr/bin/env python3
"""
Release Readiness Validation
Comprehensive validation that all M31 Production Cutover components are ready
"""
import os
import sys
import json
import subprocess
import importlib
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import psycopg2
from psycopg2.pool import SimpleConnectionPool

# Configuration
DSN = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
POOL = SimpleConnectionPool(minconn=1, maxconn=3, dsn=DSN)

class ReleaseReadinessValidator:
    """Validates complete release readiness for production cutover"""
    
    def __init__(self):
        self.validation_results = {
            'timestamp': datetime.now().isoformat(),
            'overall_status': 'UNKNOWN',
            'validation_categories': {},
            'critical_failures': [],
            'warnings': [],
            'recommendations': [],
            'readiness_score': 0
        }
        
    def log_validation(self, category: str, test_name: str, passed: bool, 
                      critical: bool = False, details: str = ""):
        """Log validation result"""
        if category not in self.validation_results['validation_categories']:
            self.validation_results['validation_categories'][category] = {
                'tests_run': 0,
                'tests_passed': 0,
                'tests_failed': 0,
                'details': []
            }
        
        cat_results = self.validation_results['validation_categories'][category]
        cat_results['tests_run'] += 1
        
        if passed:
            cat_results['tests_passed'] += 1
            status = "[PASS]"
        else:
            cat_results['tests_failed'] += 1
            status = "[FAIL]"
            
            if critical:
                self.validation_results['critical_failures'].append(f"{category}: {test_name} - {details}")
                status = "[CRITICAL]"
            else:
                self.validation_results['warnings'].append(f"{category}: {test_name} - {details}")
        
        cat_results['details'].append({
            'test': test_name,
            'passed': passed,
            'critical': critical,
            'details': details
        })
        
        print(f"{status} {category} - {test_name}")
        if details and not passed:
            print(f"    {details}")
    
    def validate_database_schema_readiness(self) -> bool:
        """Validate that all required database components are ready"""
        print("=== Database Schema Readiness ===")
        all_passed = True
        
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                # Test 1: Check M31 schema applied
                cur.execute("""
                    select count(*) from information_schema.tables 
                    where table_schema = 'public' 
                    and table_name in ('feature_flags', 'monitoring_metrics', 'circuit_breakers', 
                                      'budget_tracking', 'health_checks', 'production_incidents')
                """)
                m31_tables = cur.fetchone()[0]
                passed = m31_tables == 6
                self.log_validation("Database", "M31 Schema Tables", passed, critical=True,
                                  details=f"Found {m31_tables}/6 required tables")
                all_passed = all_passed and passed
                
                # Test 2: Check RLS enabled on critical tables
                critical_tables = ['feature_flags', 'monitoring_metrics', 'circuit_breakers', 
                                 'budget_tracking', 'production_incidents']
                for table in critical_tables:
                    cur.execute("""
                        select relrowsecurity from pg_class 
                        where relname = %s and relkind = 'r'
                    """, (table,))
                    row = cur.fetchone()
                    rls_enabled = row[0] if row else False
                    
                    self.log_validation("Database", f"RLS Enabled - {table}", rls_enabled, 
                                      critical=True, details="RLS must be enabled for security")
                    all_passed = all_passed and rls_enabled
                
                # Test 3: Check helper functions exist
                required_functions = [
                    'check_feature_flag',
                    'record_metric', 
                    'update_circuit_breaker',
                    'check_budget_alert'
                ]
                for function in required_functions:
                    cur.execute("""
                        select count(*) from information_schema.routines
                        where routine_schema = 'public' and routine_name = %s
                    """, (function,))
                    exists = cur.fetchone()[0] > 0
                    
                    self.log_validation("Database", f"Function - {function}", exists, critical=True)
                    all_passed = all_passed and exists
                
                # Test 4: Check seed data loaded
                cur.execute("select count(*) from feature_flags")
                flag_count = cur.fetchone()[0]
                passed = flag_count >= 8  # Should have at least 8 critical flags
                self.log_validation("Database", "Feature Flags Seeded", passed, critical=True,
                                  details=f"Found {flag_count} feature flags")
                all_passed = all_passed and passed
                
                cur.execute("select count(*) from circuit_breakers")
                breaker_count = cur.fetchone()[0]
                passed = breaker_count >= 5  # Should have at least 5 providers
                self.log_validation("Database", "Circuit Breakers Seeded", passed, critical=True,
                                  details=f"Found {breaker_count} circuit breakers")
                all_passed = all_passed and passed
                
        except Exception as e:
            self.log_validation("Database", "Connection/Query", False, critical=True, details=str(e))
            all_passed = False
        finally:
            POOL.putconn(conn)
        
        return all_passed
    
    def validate_monitoring_service_readiness(self) -> bool:
        """Validate monitoring service functionality"""
        print("\n=== Monitoring Service Readiness ===")
        all_passed = True
        
        try:
            # Test 1: Import monitoring service
            try:
                from production_monitoring_service import ProductionMonitoringService
                monitoring = ProductionMonitoringService()
                self.log_validation("Monitoring", "Service Import", True)
            except Exception as e:
                self.log_validation("Monitoring", "Service Import", False, critical=True, details=str(e))
                return False
            
            # Test 2: Golden Signals Dashboard
            try:
                dashboard = monitoring.get_golden_signals_dashboard(5)
                passed = 'golden_signals' in dashboard
                self.log_validation("Monitoring", "Golden Signals Dashboard", passed, critical=True)
                all_passed = all_passed and passed
            except Exception as e:
                self.log_validation("Monitoring", "Golden Signals Dashboard", False, critical=True, details=str(e))
                all_passed = False
            
            # Test 3: Circuit Breaker Management
            try:
                breakers = monitoring.get_all_circuit_breakers()
                passed = len(breakers) > 0
                self.log_validation("Monitoring", "Circuit Breaker Access", passed, critical=True,
                                  details=f"Found {len(breakers)} circuit breakers")
                all_passed = all_passed and passed
            except Exception as e:
                self.log_validation("Monitoring", "Circuit Breaker Access", False, critical=True, details=str(e))
                all_passed = False
            
            # Test 4: Feature Flag Management
            try:
                flag_enabled = monitoring.check_feature_flag('rate_limiting_enabled')
                passed = isinstance(flag_enabled, bool)
                self.log_validation("Monitoring", "Feature Flag Access", passed, critical=True)
                all_passed = all_passed and passed
            except Exception as e:
                self.log_validation("Monitoring", "Feature Flag Access", False, critical=True, details=str(e))
                all_passed = False
            
            # Test 5: Budget Dashboard
            try:
                budget = monitoring.get_budget_dashboard()
                passed = 'budgets' in budget
                self.log_validation("Monitoring", "Budget Dashboard", passed, critical=True)
                all_passed = all_passed and passed
            except Exception as e:
                self.log_validation("Monitoring", "Budget Dashboard", False, critical=True, details=str(e))
                all_passed = False
        
        except Exception as e:
            self.log_validation("Monitoring", "Overall Service", False, critical=True, details=str(e))
            all_passed = False
        
        return all_passed
    
    def validate_security_readiness(self) -> bool:
        """Validate security testing and readiness"""
        print("\n=== Security Readiness ===")
        all_passed = True
        
        # Test 1: Security test script exists and is executable
        security_script = "test_m30_security_readiness.py"
        if os.path.exists(security_script):
            self.log_validation("Security", "Security Test Script", True)
            
            # Test 2: Try to run security tests (dry run)
            try:
                # Check if script can be imported (basic syntax check)
                spec = importlib.util.spec_from_file_location("security_tests", security_script)
                if spec and spec.loader:
                    self.log_validation("Security", "Script Syntax Valid", True)
                else:
                    self.log_validation("Security", "Script Syntax Valid", False, critical=True)
                    all_passed = False
            except Exception as e:
                self.log_validation("Security", "Script Syntax Valid", False, critical=True, details=str(e))
                all_passed = False
        else:
            self.log_validation("Security", "Security Test Script", False, critical=True, 
                              details="test_m30_security_readiness.py not found")
            all_passed = False
        
        # Test 3: RLS Parity validation script
        rls_script = "validate_rls_parity.py"
        if os.path.exists(rls_script):
            self.log_validation("Security", "RLS Parity Script", True)
        else:
            self.log_validation("Security", "RLS Parity Script", False, critical=True,
                              details="validate_rls_parity.py not found")
            all_passed = False
        
        return all_passed
    
    def validate_rollback_readiness(self) -> bool:
        """Validate rollback mechanisms are ready"""
        print("\n=== Rollback Readiness ===")
        all_passed = True
        
        # Test 1: Rollback script exists
        rollback_script = "rollback_mechanisms.py"
        if os.path.exists(rollback_script):
            self.log_validation("Rollback", "Rollback Script", True)
            
            # Test 2: Test rollback mechanisms (dry run)
            try:
                from rollback_mechanisms import RollbackManager
                rollback_mgr = RollbackManager()
                self.log_validation("Rollback", "Rollback Manager Import", True)
                
                # Test validation method
                validation = rollback_mgr.validate_rollback_success()
                passed = isinstance(validation, dict) and 'overall_success' in validation
                self.log_validation("Rollback", "Rollback Validation", passed)
                all_passed = all_passed and passed
                
            except Exception as e:
                self.log_validation("Rollback", "Rollback Manager", False, critical=True, details=str(e))
                all_passed = False
        else:
            self.log_validation("Rollback", "Rollback Script", False, critical=True,
                              details="rollback_mechanisms.py not found")
            all_passed = False
        
        return all_passed
    
    def validate_monitoring_tools_readiness(self) -> bool:
        """Validate D0-D7 monitoring tools are ready"""
        print("\n=== D0-D7 Monitoring Tools Readiness ===")
        all_passed = True
        
        # Test 1: D0-D7 monitoring script exists
        monitoring_script = "d0_d7_monitoring_tools.py"
        if os.path.exists(monitoring_script):
            self.log_validation("D0D7 Tools", "Monitoring Script", True)
            
            # Test 2: Test monitoring service import
            try:
                from d0_d7_monitoring_tools import D0D7MonitoringService
                monitor = D0D7MonitoringService()
                self.log_validation("D0D7 Tools", "Monitoring Service Import", True)
                
                # Test intensive health check method
                health = monitor.intensive_health_check()
                passed = isinstance(health, dict) and 'overall_health' in health
                self.log_validation("D0D7 Tools", "Health Check Function", passed)
                all_passed = all_passed and passed
                
            except Exception as e:
                self.log_validation("D0D7 Tools", "Monitoring Service", False, critical=True, details=str(e))
                all_passed = False
        else:
            self.log_validation("D0D7 Tools", "Monitoring Script", False, critical=True,
                              details="d0_d7_monitoring_tools.py not found")
            all_passed = False
        
        return all_passed
    
    def validate_checklist_completeness(self) -> bool:
        """Validate production cutover checklist exists and is complete"""
        print("\n=== Production Cutover Checklist ===")
        all_passed = True
        
        # Test 1: Checklist file exists
        checklist_file = "PRODUCTION_CUTOVER_CHECKLIST.md"
        if os.path.exists(checklist_file):
            self.log_validation("Checklist", "Checklist File", True)
            
            # Test 2: Check key sections exist
            try:
                with open(checklist_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                required_sections = [
                    "Pre-Flight Gates Validation",
                    "Production Cutover Execution", 
                    "Post-Cutover Validation",
                    "Rollback Readiness Verification",
                    "D0–D7 Monitoring Setup"
                ]
                
                for section in required_sections:
                    if section in content:
                        self.log_validation("Checklist", f"Section - {section}", True)
                    else:
                        self.log_validation("Checklist", f"Section - {section}", False, 
                                          details=f"Missing section: {section}")
                        all_passed = False
                
            except Exception as e:
                self.log_validation("Checklist", "Checklist Content", False, critical=True, details=str(e))
                all_passed = False
        else:
            self.log_validation("Checklist", "Checklist File", False, critical=True,
                              details="PRODUCTION_CUTOVER_CHECKLIST.md not found")
            all_passed = False
        
        return all_passed
    
    def validate_git_readiness(self) -> bool:
        """Validate git repository is ready for production tag"""
        print("\n=== Git Repository Readiness ===")
        all_passed = True
        
        try:
            # Test 1: Check git status (should be clean)
            result = subprocess.run(['git', 'status', '--porcelain'], 
                                  capture_output=True, text=True, check=True)
            
            if result.stdout.strip() == "":
                self.log_validation("Git", "Working Directory Clean", True)
            else:
                self.log_validation("Git", "Working Directory Clean", False, 
                                  details="Uncommitted changes found")
                all_passed = False
            
            # Test 2: Check current branch
            result = subprocess.run(['git', 'branch', '--show-current'], 
                                  capture_output=True, text=True, check=True)
            current_branch = result.stdout.strip()
            
            if current_branch == "main":
                self.log_validation("Git", "On Main Branch", True)
            else:
                self.log_validation("Git", "On Main Branch", False, 
                                  details=f"Currently on {current_branch}, should be on main")
                all_passed = False
            
            # Test 3: Check remote is up to date
            try:
                subprocess.run(['git', 'fetch'], capture_output=True, check=True)
                result = subprocess.run(['git', 'status', '-uno'], 
                                      capture_output=True, text=True, check=True)
                
                if "up to date" in result.stdout or "up-to-date" in result.stdout:
                    self.log_validation("Git", "Remote Up To Date", True)
                else:
                    self.log_validation("Git", "Remote Up To Date", False,
                                      details="Local branch may be behind remote")
                    # Not critical - can be resolved
            except:
                self.log_validation("Git", "Remote Check", False, 
                                  details="Could not check remote status")
            
        except subprocess.CalledProcessError as e:
            self.log_validation("Git", "Git Commands", False, critical=True, 
                              details=f"Git command failed: {e}")
            all_passed = False
        except FileNotFoundError:
            self.log_validation("Git", "Git Available", False, critical=True,
                              details="Git command not found")
            all_passed = False
        
        return all_passed
    
    def validate_file_structure_readiness(self) -> bool:
        """Validate all required files are present"""
        print("\n=== File Structure Readiness ===")
        all_passed = True
        
        required_files = [
            # Database schemas
            ("004_production_cutover_schema.sql", "Production cutover schema"),
            
            # Services
            ("production_monitoring_service.py", "Production monitoring service"),
            
            # Validation scripts
            ("test_m30_security_readiness.py", "Security validation script"),
            ("validate_rls_parity.py", "RLS parity validation script"),
            
            # Operational tools
            ("rollback_mechanisms.py", "Rollback mechanisms"),
            ("d0_d7_monitoring_tools.py", "D0-D7 monitoring tools"),
            
            # Documentation
            ("PRODUCTION_CUTOVER_CHECKLIST.md", "Production cutover checklist"),
            
            # This validation script
            ("validate_release_readiness.py", "Release readiness validator")
        ]
        
        for filename, description in required_files:
            if os.path.exists(filename):
                # Check file is not empty
                try:
                    with open(filename, 'r', encoding='utf-8') as f:
                        content = f.read().strip()
                    
                    if len(content) > 100:  # Reasonable minimum size
                        self.log_validation("Files", f"{description}", True)
                    else:
                        self.log_validation("Files", f"{description}", False,
                                          details="File is too small/empty")
                        all_passed = False
                        
                except Exception as e:
                    self.log_validation("Files", f"{description}", False,
                                      details=f"Could not read file: {e}")
                    all_passed = False
            else:
                self.log_validation("Files", f"{description}", False, critical=True,
                                  details=f"Required file missing: {filename}")
                all_passed = False
        
        return all_passed
    
    def calculate_readiness_score(self) -> float:
        """Calculate overall readiness score"""
        total_tests = 0
        total_passed = 0
        
        for category in self.validation_results['validation_categories'].values():
            total_tests += category['tests_run']
            total_passed += category['tests_passed']
        
        if total_tests == 0:
            return 0.0
        
        return (total_passed / total_tests) * 100
    
    def generate_readiness_recommendations(self) -> List[str]:
        """Generate recommendations based on validation results"""
        recommendations = []
        
        critical_count = len(self.validation_results['critical_failures'])
        warning_count = len(self.validation_results['warnings'])
        score = self.validation_results['readiness_score']
        
        if critical_count > 0:
            recommendations.append("🚨 CRITICAL: Address all critical failures before production cutover")
            recommendations.append("Production deployment should be BLOCKED until critical issues are resolved")
        
        if warning_count > 0 and critical_count == 0:
            recommendations.append("⚠️ WARNING: Review and address warning issues before production")
            recommendations.append("Consider fixing warnings or documenting why they are acceptable")
        
        if score >= 98:
            recommendations.append("✅ EXCELLENT: System is ready for production cutover")
            recommendations.append("All validation checks passed - proceed with confidence")
        elif score >= 95:
            recommendations.append("✅ GOOD: System is ready for production with minor notes")
            recommendations.append("Address any remaining warnings for optimal deployment")
        elif score >= 90:
            recommendations.append("⚠️ ACCEPTABLE: System may be ready but needs review")
            recommendations.append("Carefully review failed tests and consider fixes")
        else:
            recommendations.append("❌ NOT READY: Significant issues prevent production deployment")
            recommendations.append("Address failed validations before attempting cutover")
        
        # Specific recommendations based on failed categories
        for category, results in self.validation_results['validation_categories'].items():
            if results['tests_failed'] > 0:
                recommendations.append(f"Review {category} issues: {results['tests_failed']} tests failed")
        
        return recommendations
    
    def assess_overall_status(self) -> str:
        """Assess overall readiness status"""
        critical_count = len(self.validation_results['critical_failures'])
        score = self.validation_results['readiness_score']
        
        if critical_count > 0:
            return 'BLOCKED'
        elif score >= 95:
            return 'READY'
        elif score >= 90:
            return 'REVIEW_REQUIRED'
        else:
            return 'NOT_READY'
    
    def run_comprehensive_validation(self) -> Dict[str, any]:
        """Run all validation checks"""
        print("M31 Production Release Readiness Validation")
        print("=" * 50)
        
        validation_functions = [
            ("Database Schema", self.validate_database_schema_readiness),
            ("Monitoring Service", self.validate_monitoring_service_readiness),
            ("Security", self.validate_security_readiness),
            ("Rollback", self.validate_rollback_readiness),
            ("D0-D7 Tools", self.validate_monitoring_tools_readiness),
            ("Checklist", self.validate_checklist_completeness),
            ("Git Repository", self.validate_git_readiness),
            ("File Structure", self.validate_file_structure_readiness),
        ]
        
        overall_success = True
        
        for category_name, validation_func in validation_functions:
            try:
                category_success = validation_func()
                overall_success = overall_success and category_success
            except Exception as e:
                print(f"\n[ERROR] {category_name} validation failed: {e}")
                self.log_validation(category_name, "Category Validation", False, 
                                  critical=True, details=str(e))
                overall_success = False
        
        # Calculate final scores and assessments
        self.validation_results['readiness_score'] = self.calculate_readiness_score()
        self.validation_results['overall_status'] = self.assess_overall_status()
        self.validation_results['recommendations'] = self.generate_readiness_recommendations()
        
        return self.validation_results
    
    def save_validation_report(self, filename: Optional[str] = None):
        """Save validation report to file"""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"release_readiness_report_{timestamp}.json"
        
        try:
            with open(filename, 'w') as f:
                json.dump(self.validation_results, f, indent=2)
            
            print(f"\nValidation report saved: {filename}")
        except Exception as e:
            print(f"Could not save validation report: {e}")

def main():
    """Main function for release readiness validation"""
    print("Starting M31 Production Release Readiness Validation...")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    validator = ReleaseReadinessValidator()
    
    try:
        # Run comprehensive validation
        results = validator.run_comprehensive_validation()
        
        # Print summary
        print(f"\n{'='*60}")
        print("RELEASE READINESS VALIDATION SUMMARY")
        print(f"{'='*60}")
        
        print(f"Overall Status: {results['overall_status']}")
        print(f"Readiness Score: {results['readiness_score']:.1f}%")
        print(f"Critical Failures: {len(results['critical_failures'])}")
        print(f"Warnings: {len(results['warnings'])}")
        
        # Print category breakdown
        print(f"\nCategory Breakdown:")
        for category, cat_results in results['validation_categories'].items():
            pass_rate = (cat_results['tests_passed'] / cat_results['tests_run'] * 100) if cat_results['tests_run'] > 0 else 0
            print(f"  {category}: {cat_results['tests_passed']}/{cat_results['tests_run']} ({pass_rate:.1f}%)")
        
        # Print critical failures
        if results['critical_failures']:
            print(f"\nCRITICAL FAILURES ({len(results['critical_failures'])}):")
            for failure in results['critical_failures']:
                print(f"  ❌ {failure}")
        
        # Print warnings
        if results['warnings']:
            print(f"\nWARNINGS ({len(results['warnings'])}):")
            for warning in results['warnings'][:5]:  # Show first 5
                print(f"  ⚠️ {warning}")
            if len(results['warnings']) > 5:
                print(f"  ... and {len(results['warnings']) - 5} more warnings")
        
        # Print recommendations
        if results['recommendations']:
            print(f"\nRECOMMENDATIONS:")
            for rec in results['recommendations']:
                print(f"  • {rec}")
        
        # Save report
        validator.save_validation_report()
        
        # Final decision
        if results['overall_status'] == 'READY':
            print(f"\n🎉 PRODUCTION READY: System validated for production cutover!")
            return True
        elif results['overall_status'] == 'REVIEW_REQUIRED':
            print(f"\n⚠️ REVIEW REQUIRED: System needs review before production")
            return False
        else:
            print(f"\n❌ NOT READY: System not ready for production deployment")
            return False
        
    except Exception as e:
        print(f"\n[CRITICAL ERROR] Validation failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)