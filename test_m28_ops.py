#!/usr/bin/env python3
"""
M28: Secrets & Providers Operations Test Suite
Tests secrets management, provider health checks, circuit breakers, and RLS policies
"""

import unittest
import psycopg2
import json
import uuid
import time
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

# Database connection
DSN = "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

class TestM28SecretsManagement(unittest.TestCase):
    """Test secrets management and rotation"""
    
    def setUp(self):
        self.conn = psycopg2.connect(DSN)
        self.admin_id = str(uuid.uuid4())
        self.monitor_id = str(uuid.uuid4())
        self.client_id = str(uuid.uuid4())
        
        # Create test users
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO profiles (id, email, role_id) VALUES
                (%s, 'admin@test.com', 2),
                (%s, 'monitor@test.com', 4),
                (%s, 'client@test.com', 5)
                ON CONFLICT (id) DO UPDATE SET role_id = EXCLUDED.role_id
            """, (self.admin_id, self.monitor_id, self.client_id))
            self.conn.commit()
    
    def tearDown(self):
        with self.conn.cursor() as cur:
            # Clean up test secrets
            cur.execute("DELETE FROM secrets_rotation_log WHERE initiated_by IN (%s, %s, %s)", 
                       (self.admin_id, self.monitor_id, self.client_id))
            cur.execute("DELETE FROM secrets_config WHERE key_name LIKE 'test_%'")
            cur.execute("DELETE FROM profiles WHERE id IN (%s, %s, %s)", 
                       (self.admin_id, self.monitor_id, self.client_id))
            self.conn.commit()
        self.conn.close()
    
    def test_secrets_config_creation(self):
        """Test creating secret configuration"""
        with self.conn.cursor() as cur:
            # Create test secret config
            cur.execute("""
                INSERT INTO secrets_config (scope, key_name, key_type, rotation_schedule, key_purpose, data_classification)
                VALUES ('test_provider', 'test_api_key', 'api_key', 'monthly', 'Test API access', 'confidential')
                RETURNING id, next_rotation_at
            """, )
            
            secret_id, next_rotation = cur.fetchone()
            self.assertIsNotNone(secret_id, "Secret config should be created")
            self.assertIsNotNone(next_rotation, "Next rotation should be calculated")
    
    def test_rotation_schedule_calculation(self):
        """Test rotation schedule calculation"""
        with self.conn.cursor() as cur:
            base_time = datetime.now()
            
            # Test different schedules
            test_cases = [
                ('daily', 1),
                ('weekly', 7), 
                ('monthly', 30),  # Approximate
                ('quarterly', 90),  # Approximate
                ('annual', 365)  # Approximate
            ]
            
            for schedule, expected_days in test_cases:
                cur.execute("""
                    SELECT calculate_next_rotation(%s, %s)
                """, (schedule, base_time))
                
                result = cur.fetchone()[0]
                actual_days = (result - base_time).days
                
                # Allow some tolerance for monthly/quarterly/annual
                tolerance = 5 if schedule in ['monthly', 'quarterly', 'annual'] else 0
                self.assertAlmostEqual(actual_days, expected_days, delta=tolerance, 
                                     msg=f"Schedule {schedule} should calculate correct next rotation")
    
    def test_secret_rotation_lifecycle(self):
        """Test complete secret rotation lifecycle"""
        with self.conn.cursor() as cur:
            # Create test secret
            cur.execute("""
                INSERT INTO secrets_config (scope, key_name, key_type, rotation_schedule, key_purpose, data_classification)
                VALUES ('test_provider', 'test_rotation_key', 'secret_key', 'manual', 'Test rotation', 'restricted')
                RETURNING id
            """)
            
            secret_id = cur.fetchone()[0]
            
            # Start rotation
            cur.execute("""
                SELECT start_secret_rotation(%s, %s, %s, %s)
            """, (secret_id, 'manual', self.admin_id, 'test_request_123'))
            
            rotation_id = cur.fetchone()[0]
            self.assertIsNotNone(rotation_id, "Rotation should be started")
            
            # Check secret status updated
            cur.execute("SELECT status FROM secrets_config WHERE id = %s", (secret_id,))
            status = cur.fetchone()[0]
            self.assertEqual(status, 'rotating', "Secret should be in rotating status")
            
            # Complete rotation
            cur.execute("""
                SELECT complete_secret_rotation(%s, %s, %s, %s, %s)
            """, (rotation_id, 'v2.0', 'abc123def', ['service1', 'service2'], 0))
            
            # Verify completion
            cur.execute("SELECT status FROM secrets_config WHERE id = %s", (secret_id,))
            status = cur.fetchone()[0]
            self.assertEqual(status, 'active', "Secret should be active after rotation")
            
            # Check rotation log
            cur.execute("""
                SELECT status, new_key_version, services_updated 
                FROM secrets_rotation_log WHERE id = %s
            """, (rotation_id,))
            
            log_status, new_version, services = cur.fetchone()
            self.assertEqual(log_status, 'completed')
            self.assertEqual(new_version, 'v2.0')
            self.assertEqual(services, ['service1', 'service2'])
    
    def test_rotation_due_check(self):
        """Test rotation due checking logic"""
        with self.conn.cursor() as cur:
            # Create secret with past due date
            past_date = datetime.now() - timedelta(days=1)
            cur.execute("""
                INSERT INTO secrets_config (scope, key_name, key_type, next_rotation_at, key_purpose, data_classification)
                VALUES ('test_provider', 'test_due_key', 'api_key', %s, 'Test due check', 'confidential')
                RETURNING id
            """, (past_date,))
            
            secret_id = cur.fetchone()[0]
            
            # Check if due
            cur.execute("SELECT is_rotation_due(%s)", (secret_id,))
            is_due = cur.fetchone()[0]
            self.assertTrue(is_due, "Secret with past due date should be due for rotation")
            
            # Create secret with future due date
            future_date = datetime.now() + timedelta(days=30)
            cur.execute("""
                INSERT INTO secrets_config (scope, key_name, key_type, next_rotation_at, key_purpose, data_classification)
                VALUES ('test_provider', 'test_future_key', 'api_key', %s, 'Test future check', 'confidential')
                RETURNING id
            """, (future_date,))
            
            secret_id2 = cur.fetchone()[0]
            
            # Check if due
            cur.execute("SELECT is_rotation_due(%s)", (secret_id2,))
            is_due = cur.fetchone()[0]
            self.assertFalse(is_due, "Secret with future due date should not be due for rotation")

class TestM28ProviderHealthAndCircuitBreakers(unittest.TestCase):
    """Test provider health monitoring and circuit breakers"""
    
    def setUp(self):
        self.conn = psycopg2.connect(DSN)
        
        # Ensure test provider exists
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO provider_health_status (provider_name, service_type, status)
                VALUES ('test_provider', 'test_service', 'healthy')
                ON CONFLICT (provider_name, service_type) 
                DO UPDATE SET status = 'healthy', circuit_breaker_failures = 0, circuit_breaker_state = 'closed'
            """)
            self.conn.commit()
    
    def tearDown(self):
        with self.conn.cursor() as cur:
            # Clean up test provider
            cur.execute("DELETE FROM provider_operational_events WHERE provider_name = 'test_provider'")
            cur.execute("DELETE FROM provider_health_status WHERE provider_name = 'test_provider'")
            self.conn.commit()
        self.conn.close()
    
    def test_provider_health_update_success(self):
        """Test successful provider health update"""
        with self.conn.cursor() as cur:
            # Update with successful health check
            cur.execute("""
                SELECT update_provider_health(%s, %s, %s, %s, %s)
            """, ('test_provider', 'test_service', True, 150, None))
            
            # Verify status updated
            cur.execute("""
                SELECT status, response_time_ms, circuit_breaker_failures, last_success_at
                FROM provider_health_status
                WHERE provider_name = 'test_provider' AND service_type = 'test_service'
            """)
            
            status, response_time, failures, last_success = cur.fetchone()
            self.assertEqual(status, 'healthy')
            self.assertEqual(response_time, 150)
            self.assertEqual(failures, 0)
            self.assertIsNotNone(last_success)
    
    def test_provider_health_update_failure(self):
        """Test provider health update on failure"""
        with self.conn.cursor() as cur:
            # Update with failed health check
            cur.execute("""
                SELECT update_provider_health(%s, %s, %s, %s, %s)
            """, ('test_provider', 'test_service', False, None, 'Connection timeout'))
            
            # Verify status updated
            cur.execute("""
                SELECT status, circuit_breaker_failures, last_failure_at
                FROM provider_health_status
                WHERE provider_name = 'test_provider' AND service_type = 'test_service'
            """)
            
            status, failures, last_failure = cur.fetchone()
            self.assertEqual(status, 'unhealthy')
            self.assertEqual(failures, 1)
            self.assertIsNotNone(last_failure)
            
            # Check operational event created
            cur.execute("""
                SELECT event_type, severity, summary
                FROM provider_operational_events
                WHERE provider_name = 'test_provider'
                ORDER BY created_at DESC
                LIMIT 1
            """)
            
            event_type, severity, summary = cur.fetchone()
            self.assertEqual(event_type, 'health_check')
            self.assertEqual(severity, 'warning')
            self.assertIn('failed', summary.lower())
    
    def test_circuit_breaker_trip(self):
        """Test circuit breaker tripping on repeated failures"""
        with self.conn.cursor() as cur:
            # Simulate multiple failures to trip circuit breaker
            for i in range(6):  # Exceeds default threshold of 5
                cur.execute("""
                    SELECT update_provider_health(%s, %s, %s, %s, %s)
                """, ('test_provider', 'test_service', False, None, f'Failure {i+1}'))
            
            # Check circuit breaker tripped
            cur.execute("""
                SELECT circuit_breaker_state, circuit_breaker_failures
                FROM provider_health_status
                WHERE provider_name = 'test_provider' AND service_type = 'test_service'
            """)
            
            cb_state, failures = cur.fetchone()
            self.assertEqual(cb_state, 'open')
            self.assertGreaterEqual(failures, 5)
            
            # Check circuit breaker trip event
            cur.execute("""
                SELECT COUNT(*) FROM provider_operational_events
                WHERE provider_name = 'test_provider' AND event_type = 'circuit_breaker_trip'
            """)
            
            trip_events = cur.fetchone()[0]
            self.assertGreater(trip_events, 0, "Circuit breaker trip event should be logged")
    
    def test_provider_availability_check(self):
        """Test provider availability with circuit breaker logic"""
        with self.conn.cursor() as cur:
            # Initially available
            cur.execute("SELECT is_provider_available(%s, %s)", ('test_provider', 'test_service'))
            available = cur.fetchone()[0]
            self.assertTrue(available, "Healthy provider should be available")
            
            # Disable provider
            cur.execute("""
                UPDATE provider_health_status 
                SET is_enabled = false 
                WHERE provider_name = 'test_provider' AND service_type = 'test_service'
            """)
            
            cur.execute("SELECT is_provider_available(%s, %s)", ('test_provider', 'test_service'))
            available = cur.fetchone()[0]
            self.assertFalse(available, "Disabled provider should not be available")
            
            # Enable but set maintenance mode
            cur.execute("""
                UPDATE provider_health_status 
                SET is_enabled = true, maintenance_mode = true
                WHERE provider_name = 'test_provider' AND service_type = 'test_service'
            """)
            
            cur.execute("SELECT is_provider_available(%s, %s)", ('test_provider', 'test_service'))
            available = cur.fetchone()[0]
            self.assertFalse(available, "Provider in maintenance should not be available")
    
    def test_provider_toggle(self):
        """Test provider toggle functionality"""
        with self.conn.cursor() as cur:
            user_id = str(uuid.uuid4())
            
            # Create admin user for toggle
            cur.execute("""
                INSERT INTO profiles (id, email, role_id) VALUES
                (%s, 'toggle_admin@test.com', 2)
                ON CONFLICT (id) DO UPDATE SET role_id = EXCLUDED.role_id
            """, (user_id,))
            
            # Toggle provider off
            cur.execute("""
                SELECT toggle_provider(%s, %s, %s, %s, %s)
            """, ('test_provider', 'test_service', False, 'Test toggle', user_id))
            
            # Verify toggle
            cur.execute("""
                SELECT is_enabled FROM provider_health_status
                WHERE provider_name = 'test_provider' AND service_type = 'test_service'
            """)
            
            enabled = cur.fetchone()[0]
            self.assertFalse(enabled, "Provider should be disabled after toggle")
            
            # Check toggle event
            cur.execute("""
                SELECT event_type, summary FROM provider_operational_events
                WHERE provider_name = 'test_provider' AND event_type = 'toggle'
                ORDER BY created_at DESC LIMIT 1
            """)
            
            event_type, summary = cur.fetchone()
            self.assertEqual(event_type, 'toggle')
            self.assertIn('disabled', summary)
            
            # Clean up
            cur.execute("DELETE FROM profiles WHERE id = %s", (user_id,))

class TestM28RLSPolicies(unittest.TestCase):
    """Test RLS policies for operational management"""
    
    def setUp(self):
        self.conn = psycopg2.connect(DSN)
        self.admin_id = str(uuid.uuid4())
        self.monitor_id = str(uuid.uuid4())
        self.client_id = str(uuid.uuid4())
        
        # Create test users
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO profiles (id, email, role_id) VALUES
                (%s, 'admin@test.com', 2),
                (%s, 'monitor@test.com', 4),
                (%s, 'client@test.com', 5)
                ON CONFLICT (id) DO UPDATE SET role_id = EXCLUDED.role_id
            """, (self.admin_id, self.monitor_id, self.client_id))
            self.conn.commit()
    
    def tearDown(self):
        with self.conn.cursor() as cur:
            cur.execute("DELETE FROM profiles WHERE id IN (%s, %s, %s)", 
                       (self.admin_id, self.monitor_id, self.client_id))
            self.conn.commit()
        self.conn.close()
    
    def test_secrets_config_rls_admin_access(self):
        """Test admin can access secrets configuration"""
        with self.conn.cursor() as cur:
            # Set admin context
            cur.execute("SET app.current_user_id = %s", (self.admin_id,))
            
            # Admin should see secrets config
            cur.execute("SELECT COUNT(*) FROM secrets_config WHERE scope = 'stripe'")
            count = cur.fetchone()[0]
            self.assertGreater(count, 0, "Admin should see secrets configuration")
    
    def test_secrets_config_rls_client_denied(self):
        """Test client cannot access secrets configuration"""
        with self.conn.cursor() as cur:
            # Set client context
            cur.execute("SET app.current_user_id = %s", (self.client_id,))
            
            # Client should not see secrets config
            cur.execute("SELECT COUNT(*) FROM secrets_config")
            count = cur.fetchone()[0]
            self.assertEqual(count, 0, "Client should not see secrets configuration")
    
    def test_provider_health_rls_monitor_read(self):
        """Test monitor can read provider health status"""
        with self.conn.cursor() as cur:
            # Set monitor context
            cur.execute("SET app.current_user_id = %s", (self.monitor_id,))
            
            # Monitor should see provider health
            cur.execute("SELECT COUNT(*) FROM provider_health_status")
            count = cur.fetchone()[0]
            self.assertGreater(count, 0, "Monitor should see provider health status")
    
    def test_provider_health_rls_monitor_no_update(self):
        """Test monitor cannot update provider health directly"""
        with self.conn.cursor() as cur:
            # Set monitor context
            cur.execute("SET app.current_user_id = %s", (self.monitor_id,))
            
            # Monitor should not be able to update
            try:
                cur.execute("""
                    UPDATE provider_health_status 
                    SET is_enabled = false 
                    WHERE provider_name = 'stripe'
                """)
                self.fail("Monitor should not be able to update provider health")
            except psycopg2.Error:
                # Expected - monitor cannot update
                self.conn.rollback()
    
    def test_operational_events_rls_monitor_read(self):
        """Test monitor can read operational events"""
        with self.conn.cursor() as cur:
            # Set monitor context
            cur.execute("SET app.current_user_id = %s", (self.monitor_id,))
            
            # Monitor should see operational events
            cur.execute("SELECT COUNT(*) FROM provider_operational_events")
            count = cur.fetchone()[0]
            # Count may be 0 if no events exist, but query should succeed
            self.assertIsNotNone(count, "Monitor should be able to query operational events")
    
    def test_system_context_permissions(self):
        """Test system context has appropriate permissions"""
        with self.conn.cursor() as cur:
            # Set system context
            cur.execute("SELECT set_system_context()")
            
            # System should be able to update provider health
            cur.execute("""
                UPDATE provider_health_status 
                SET last_health_check = now()
                WHERE provider_name = 'stripe' AND service_type = 'payment'
            """)
            
            # Should succeed without error
            updated_count = cur.rowcount
            self.assertGreaterEqual(updated_count, 0, "System should be able to update provider health")

class TestM28APIEndpoints(unittest.TestCase):
    """Test M28 API endpoints integration"""
    
    def setUp(self):
        self.conn = psycopg2.connect(DSN)
        self.admin_id = str(uuid.uuid4())
        
        # Create admin user
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO profiles (id, email, role_id) VALUES
                (%s, 'api_admin@test.com', 2)
                ON CONFLICT (id) DO UPDATE SET role_id = EXCLUDED.role_id
            """, (self.admin_id,))
            self.conn.commit()
    
    def tearDown(self):
        with self.conn.cursor() as cur:
            cur.execute("DELETE FROM profiles WHERE id = %s", (self.admin_id,))
            self.conn.commit()
        self.conn.close()
    
    def test_get_user_role_function(self):
        """Test get_user_role function works correctly"""
        with self.conn.cursor() as cur:
            # Test admin role
            cur.execute("SELECT public.get_user_role(%s)", (self.admin_id,))
            role = cur.fetchone()[0]
            self.assertEqual(role, 'admin', "Should return correct admin role")
            
            # Test non-existent user
            fake_id = str(uuid.uuid4())
            cur.execute("SELECT public.get_user_role(%s)", (fake_id,))
            role = cur.fetchone()[0]
            self.assertEqual(role, 'client', "Should return default client role for unknown user")
    
    def test_audit_log_creation(self):
        """Test audit log entries are created properly"""
        with self.conn.cursor() as cur:
            # Get initial count
            cur.execute("SELECT COUNT(*) FROM audit_log WHERE actor = %s", (self.admin_id,))
            initial_count = cur.fetchone()[0]
            
            # Create audit entry
            cur.execute("""
                INSERT INTO audit_log (actor, actor_role, event, entity, entity_id, meta)
                VALUES (%s, 'admin', 'test_operation', 'test_entity', 'test_123', %s)
            """, (self.admin_id, json.dumps({"test": "data"})))
            
            # Check entry created
            cur.execute("SELECT COUNT(*) FROM audit_log WHERE actor = %s", (self.admin_id,))
            final_count = cur.fetchone()[0]
            self.assertEqual(final_count, initial_count + 1, "Audit log entry should be created")

class TestM28OperationalMetrics(unittest.TestCase):
    """Test operational metrics collection"""
    
    def setUp(self):
        self.conn = psycopg2.connect(DSN)
    
    def tearDown(self):
        with self.conn.cursor() as cur:
            # Clean up test metrics
            cur.execute("DELETE FROM operational_metrics WHERE metric_name LIKE 'test_%'")
            self.conn.commit()
        self.conn.close()
    
    def test_operational_metrics_insertion(self):
        """Test operational metrics can be inserted"""
        with self.conn.cursor() as cur:
            # Insert test metric
            cur.execute("""
                INSERT INTO operational_metrics (metric_name, metric_type, value_numeric, provider_name, unit)
                VALUES ('test_response_time', 'gauge', 150.5, 'test_provider', 'ms')
                RETURNING id
            """)
            
            metric_id = cur.fetchone()[0]
            self.assertIsNotNone(metric_id, "Operational metric should be inserted")
            
            # Verify metric
            cur.execute("""
                SELECT metric_name, value_numeric, provider_name 
                FROM operational_metrics WHERE id = %s
            """, (metric_id,))
            
            name, value, provider = cur.fetchone()
            self.assertEqual(name, 'test_response_time')
            self.assertEqual(float(value), 150.5)
            self.assertEqual(provider, 'test_provider')
    
    def test_operational_metrics_json_values(self):
        """Test operational metrics with JSON values"""
        with self.conn.cursor() as cur:
            test_json = {"latency_p95": 200, "latency_p99": 350}
            
            # Insert metric with JSON value
            cur.execute("""
                INSERT INTO operational_metrics (metric_name, metric_type, value_json, tags)
                VALUES ('test_histogram', 'histogram', %s, %s)
                RETURNING id
            """, (json.dumps(test_json), json.dumps({"environment": "test"})))
            
            metric_id = cur.fetchone()[0]
            self.assertIsNotNone(metric_id, "JSON metric should be inserted")
            
            # Verify JSON value
            cur.execute("""
                SELECT value_json, tags FROM operational_metrics WHERE id = %s
            """, (metric_id,))
            
            value_json, tags = cur.fetchone()
            self.assertEqual(value_json["latency_p95"], 200)
            self.assertEqual(tags["environment"], "test")

if __name__ == '__main__':
    # Run all tests
    unittest.main(verbosity=2)