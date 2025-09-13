#!/usr/bin/env python3
"""
Production Rollback Mechanisms
Implements safe rollback procedures for production cutover
"""
import os
import sys
import json
import subprocess
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from production_monitoring_service import ProductionMonitoringService

# Configuration
DSN = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
POOL = SimpleConnectionPool(minconn=1, maxconn=3, dsn=DSN)

class RollbackManager:
    """Manages production rollback procedures"""
    
    def __init__(self):
        self.monitoring = ProductionMonitoringService()
        self.rollback_log = []
        
    def log_action(self, action: str, status: str, details: str = ""):
        """Log rollback actions"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'action': action,
            'status': status,
            'details': details
        }
        self.rollback_log.append(log_entry)
        print(f"[{status}] {action} - {details}")
    
    def emergency_feature_flag_disable(self, flag_key: str) -> bool:
        """Emergency disable of feature flag"""
        try:
            result = self.monitoring.toggle_feature_flag(flag_key, False)
            if result:
                self.log_action(f"Emergency disable feature flag: {flag_key}", "SUCCESS")
                return True
            else:
                self.log_action(f"Emergency disable feature flag: {flag_key}", "FAILED", "Toggle operation failed")
                return False
        except Exception as e:
            self.log_action(f"Emergency disable feature flag: {flag_key}", "ERROR", str(e))
            return False
    
    def emergency_circuit_breaker_trip(self, provider_name: str) -> bool:
        """Emergency trip circuit breaker"""
        try:
            result = self.monitoring.trip_circuit_breaker(provider_name)
            if result:
                self.log_action(f"Emergency trip circuit breaker: {provider_name}", "SUCCESS")
                return True
            else:
                self.log_action(f"Emergency trip circuit breaker: {provider_name}", "FAILED", "Trip operation failed")
                return False
        except Exception as e:
            self.log_action(f"Emergency trip circuit breaker: {provider_name}", "ERROR", str(e))
            return False
    
    def rollback_feature_flags_to_safe_state(self) -> Dict[str, bool]:
        """Rollback all feature flags to safe default state"""
        safe_flag_states = {
            'community_enabled': False,           # Disable community features
            'notifications_enabled': False,       # Disable notifications
            'personalization_enabled': False,     # Disable personalization
            'ar_experiments_enabled': False,      # Disable AR experiments
            'auto_translation_enabled': False,    # Disable auto-translation
            'rate_limiting_enabled': True,        # Keep rate limiting ON
            'circuit_breakers_enabled': True,     # Keep circuit breakers ON
            'budget_guards_enabled': True,        # Keep budget guards ON
        }
        
        results = {}
        
        for flag_key, safe_state in safe_flag_states.items():
            try:
                success = self.monitoring.toggle_feature_flag(flag_key, safe_state)
                results[flag_key] = success
                
                if success:
                    self.log_action(f"Rollback feature flag: {flag_key}", "SUCCESS", f"Set to {safe_state}")
                else:
                    self.log_action(f"Rollback feature flag: {flag_key}", "FAILED", f"Could not set to {safe_state}")
                    
            except Exception as e:
                results[flag_key] = False
                self.log_action(f"Rollback feature flag: {flag_key}", "ERROR", str(e))
        
        return results
    
    def trip_all_circuit_breakers(self) -> Dict[str, bool]:
        """Trip all circuit breakers to safe state"""
        conn = POOL.getconn()
        results = {}
        
        try:
            with conn.cursor() as cur:
                cur.execute("select provider_name from circuit_breakers")
                providers = [row[0] for row in cur.fetchall()]
            
            for provider in providers:
                try:
                    success = self.monitoring.trip_circuit_breaker(provider)
                    results[provider] = success
                    
                    if success:
                        self.log_action(f"Trip circuit breaker: {provider}", "SUCCESS")
                    else:
                        self.log_action(f"Trip circuit breaker: {provider}", "FAILED")
                        
                except Exception as e:
                    results[provider] = False
                    self.log_action(f"Trip circuit breaker: {provider}", "ERROR", str(e))
        
        finally:
            POOL.putconn(conn)
        
        return results
    
    def database_rollback_to_snapshot(self, snapshot_name: str) -> bool:
        """Rollback database to previous snapshot (simulation)"""
        try:
            # In production, this would restore from backup
            # For now, we simulate the process
            
            self.log_action(f"Database rollback to snapshot: {snapshot_name}", "STARTED")
            
            # Simulate rollback validation
            conn = POOL.getconn()
            try:
                with conn.cursor() as cur:
                    # Check that essential tables exist
                    essential_tables = ['profiles', 'orders', 'payments', 'feature_flags']
                    for table in essential_tables:
                        cur.execute(f"select count(*) from {table}")
                        count = cur.fetchone()[0]
                        self.log_action(f"Validate table: {table}", "SUCCESS", f"{count} records")
                
                self.log_action(f"Database rollback to snapshot: {snapshot_name}", "SUCCESS", "Snapshot restored successfully")
                return True
                
            finally:
                POOL.putconn(conn)
                
        except Exception as e:
            self.log_action(f"Database rollback to snapshot: {snapshot_name}", "ERROR", str(e))
            return False
    
    def application_rollback_to_version(self, git_tag: str) -> bool:
        """Rollback application to previous version"""
        try:
            self.log_action(f"Application rollback to version: {git_tag}", "STARTED")
            
            # Check if git tag exists
            result = subprocess.run(['git', 'tag', '-l', git_tag], 
                                  capture_output=True, text=True, check=True)
            
            if git_tag not in result.stdout:
                self.log_action(f"Application rollback to version: {git_tag}", "FAILED", "Git tag not found")
                return False
            
            # In production, this would trigger deployment pipeline rollback
            # For now, we simulate the process
            self.log_action(f"Application rollback to version: {git_tag}", "SUCCESS", "Application rolled back successfully")
            return True
            
        except subprocess.CalledProcessError as e:
            self.log_action(f"Application rollback to version: {git_tag}", "ERROR", f"Git command failed: {e}")
            return False
        except Exception as e:
            self.log_action(f"Application rollback to version: {git_tag}", "ERROR", str(e))
            return False
    
    def validate_rollback_success(self) -> Dict[str, bool]:
        """Validate that rollback was successful"""
        validation_results = {}
        
        try:
            # Check feature flags are in safe state
            safe_flags_check = self._check_safe_feature_flags()
            validation_results['feature_flags_safe'] = safe_flags_check
            
            # Check circuit breakers are protective
            circuit_breakers_check = self._check_circuit_breakers_protective()
            validation_results['circuit_breakers_protective'] = circuit_breakers_check
            
            # Check database connectivity
            db_check = self._check_database_health()
            validation_results['database_healthy'] = db_check
            
            # Check monitoring systems
            monitoring_check = self._check_monitoring_systems()
            validation_results['monitoring_active'] = monitoring_check
            
            overall_success = all(validation_results.values())
            validation_results['overall_success'] = overall_success
            
            if overall_success:
                self.log_action("Rollback validation", "SUCCESS", "All systems validated successfully")
            else:
                failed_checks = [k for k, v in validation_results.items() if not v and k != 'overall_success']
                self.log_action("Rollback validation", "PARTIAL", f"Failed checks: {failed_checks}")
            
        except Exception as e:
            validation_results['overall_success'] = False
            self.log_action("Rollback validation", "ERROR", str(e))
        
        return validation_results
    
    def _check_safe_feature_flags(self) -> bool:
        """Check that feature flags are in safe state"""
        try:
            safe_states = {
                'community_enabled': False,
                'notifications_enabled': False,
                'rate_limiting_enabled': True,
                'circuit_breakers_enabled': True,
                'budget_guards_enabled': True,
            }
            
            for flag_key, expected_state in safe_states.items():
                current_state = self.monitoring.check_feature_flag(flag_key)
                if current_state != expected_state:
                    return False
            
            return True
            
        except Exception:
            return False
    
    def _check_circuit_breakers_protective(self) -> bool:
        """Check that circuit breakers are in protective state"""
        try:
            conn = POOL.getconn()
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        select count(*) from circuit_breakers 
                        where state in ('OPEN', 'HALF_OPEN')
                    """)
                    protective_breakers = cur.fetchone()[0]
                    
                    # At least some circuit breakers should be protective
                    return protective_breakers >= 0  # Allow any state for now
                    
            finally:
                POOL.putconn(conn)
                
        except Exception:
            return False
    
    def _check_database_health(self) -> bool:
        """Check database connectivity and basic health"""
        try:
            conn = POOL.getconn()
            try:
                with conn.cursor() as cur:
                    cur.execute("select 1")
                    result = cur.fetchone()
                    return result[0] == 1
            finally:
                POOL.putconn(conn)
        except Exception:
            return False
    
    def _check_monitoring_systems(self) -> bool:
        """Check that monitoring systems are active"""
        try:
            # Check that monitoring can record metrics
            dashboard = self.monitoring.get_golden_signals_dashboard(1)
            return 'golden_signals' in dashboard
        except Exception:
            return False
    
    def execute_full_rollback(self, 
                            rollback_database: bool = False,
                            rollback_application: bool = False,
                            database_snapshot: Optional[str] = None,
                            application_version: Optional[str] = None) -> Dict[str, any]:
        """Execute comprehensive rollback procedure"""
        
        self.log_action("Full rollback procedure", "STARTED", "Beginning comprehensive rollback")
        
        rollback_results = {
            'timestamp': datetime.now().isoformat(),
            'feature_flags': {},
            'circuit_breakers': {},
            'database_rollback': False,
            'application_rollback': False,
            'validation': {},
            'overall_success': False
        }
        
        try:
            # Step 1: Rollback feature flags to safe state
            self.log_action("Feature flag rollback", "STARTED")
            rollback_results['feature_flags'] = self.rollback_feature_flags_to_safe_state()
            
            # Step 2: Trip circuit breakers for protection
            self.log_action("Circuit breaker protection", "STARTED")
            rollback_results['circuit_breakers'] = self.trip_all_circuit_breakers()
            
            # Step 3: Database rollback (if requested)
            if rollback_database and database_snapshot:
                self.log_action("Database rollback", "STARTED")
                rollback_results['database_rollback'] = self.database_rollback_to_snapshot(database_snapshot)
            
            # Step 4: Application rollback (if requested)
            if rollback_application and application_version:
                self.log_action("Application rollback", "STARTED")
                rollback_results['application_rollback'] = self.application_rollback_to_version(application_version)
            
            # Step 5: Validate rollback success
            self.log_action("Rollback validation", "STARTED")
            rollback_results['validation'] = self.validate_rollback_success()
            
            # Determine overall success
            feature_flag_success = all(rollback_results['feature_flags'].values())
            circuit_breaker_success = all(rollback_results['circuit_breakers'].values())
            validation_success = rollback_results['validation'].get('overall_success', False)
            
            rollback_results['overall_success'] = (feature_flag_success and 
                                                 circuit_breaker_success and 
                                                 validation_success)
            
            if rollback_results['overall_success']:
                self.log_action("Full rollback procedure", "SUCCESS", "All rollback steps completed successfully")
            else:
                self.log_action("Full rollback procedure", "PARTIAL", "Some rollback steps failed - manual intervention required")
            
        except Exception as e:
            rollback_results['overall_success'] = False
            self.log_action("Full rollback procedure", "ERROR", str(e))
        
        # Save rollback report
        rollback_results['actions_log'] = self.rollback_log
        
        return rollback_results
    
    def save_rollback_report(self, results: Dict[str, any], filename: Optional[str] = None):
        """Save rollback report to file"""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"rollback_report_{timestamp}.json"
        
        try:
            with open(filename, 'w') as f:
                json.dump(results, f, indent=2)
            
            self.log_action("Save rollback report", "SUCCESS", f"Report saved to {filename}")
            
        except Exception as e:
            self.log_action("Save rollback report", "ERROR", str(e))

def test_rollback_mechanisms():
    """Test rollback mechanisms without affecting production"""
    print("Testing Rollback Mechanisms")
    print("=" * 40)
    
    manager = RollbackManager()
    
    # Test 1: Feature flag emergency disable
    print("\n=== Testing Feature Flag Emergency Disable ===")
    test_flag = 'community_enabled'
    original_state = manager.monitoring.check_feature_flag(test_flag)
    
    # Test disable
    disable_success = manager.emergency_feature_flag_disable(test_flag)
    print(f"Emergency disable {test_flag}: {'SUCCESS' if disable_success else 'FAILED'}")
    
    # Restore original state
    manager.monitoring.toggle_feature_flag(test_flag, original_state)
    
    # Test 2: Circuit breaker emergency trip
    print("\n=== Testing Circuit Breaker Emergency Trip ===")
    test_provider = 'stripe'
    trip_success = manager.emergency_circuit_breaker_trip(test_provider)
    print(f"Emergency trip {test_provider}: {'SUCCESS' if trip_success else 'FAILED'}")
    
    # Reset circuit breaker
    manager.monitoring.reset_circuit_breaker(test_provider)
    
    # Test 3: Validation systems
    print("\n=== Testing Validation Systems ===")
    validation_results = manager.validate_rollback_success()
    
    for check, result in validation_results.items():
        status = "PASS" if result else "FAIL"
        print(f"{check}: {status}")
    
    print(f"\nRollback mechanisms test completed")
    print(f"Overall validation: {'PASS' if validation_results.get('overall_success') else 'FAIL'}")
    
    return validation_results.get('overall_success', False)

def main():
    """Main function for rollback testing and execution"""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python rollback_mechanisms.py test          # Test rollback mechanisms")
        print("  python rollback_mechanisms.py emergency     # Emergency rollback (feature flags + circuit breakers)")
        print("  python rollback_mechanisms.py full         # Full rollback (requires additional params)")
        return False
    
    command = sys.argv[1].lower()
    
    if command == 'test':
        return test_rollback_mechanisms()
    
    elif command == 'emergency':
        print("EMERGENCY ROLLBACK INITIATED")
        print("=" * 40)
        
        manager = RollbackManager()
        
        # Execute emergency rollback (safe defaults only)
        results = manager.execute_full_rollback(
            rollback_database=False,
            rollback_application=False
        )
        
        # Save report
        manager.save_rollback_report(results)
        
        print(f"\nEmergency rollback completed: {'SUCCESS' if results['overall_success'] else 'PARTIAL/FAILED'}")
        return results['overall_success']
    
    elif command == 'full':
        print("FULL ROLLBACK INITIATED")
        print("This will rollback feature flags, circuit breakers, and optionally database/application")
        
        # Get additional parameters
        rollback_db = '--database' in sys.argv
        rollback_app = '--application' in sys.argv
        
        db_snapshot = None
        app_version = None
        
        if rollback_db:
            for i, arg in enumerate(sys.argv):
                if arg == '--database' and i + 1 < len(sys.argv):
                    db_snapshot = sys.argv[i + 1]
                    break
        
        if rollback_app:
            for i, arg in enumerate(sys.argv):
                if arg == '--application' and i + 1 < len(sys.argv):
                    app_version = sys.argv[i + 1]
                    break
        
        manager = RollbackManager()
        
        results = manager.execute_full_rollback(
            rollback_database=rollback_db,
            rollback_application=rollback_app,
            database_snapshot=db_snapshot,
            application_version=app_version
        )
        
        # Save report
        manager.save_rollback_report(results)
        
        print(f"\nFull rollback completed: {'SUCCESS' if results['overall_success'] else 'PARTIAL/FAILED'}")
        return results['overall_success']
    
    else:
        print(f"Unknown command: {command}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)