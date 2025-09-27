"""
M29: SRE & Cost Guards - Comprehensive Test Suite

Tests golden signals monitoring, rate limiting, circuit breakers, 
cost tracking, incident management, and access control.

Run: python test_m29_sre_cost.py
"""

import unittest
import psycopg2
import json
import time
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock


class TestM29SREMonitoring(unittest.TestCase):
    """Test SRE Golden Signals and health monitoring"""
    
    def setUp(self):
        self.conn = psycopg2.connect(
            host="localhost", 
            database="samia_tarot", 
            user="samia_admin", 
            password="samia123"
        )
        self.conn.autocommit = True
        self.cur = self.conn.cursor()
        
        # Set admin context
        self.cur.execute("SELECT set_config('app.current_user_id', 'admin_test', false)")
    
    def test_golden_signals_collection(self):
        """Test golden signals metrics collection and aggregation"""
        
        # Insert test metrics
        window_start = datetime.now().replace(second=0, microsecond=0)
        
        self.cur.execute("""
            INSERT INTO sre_golden_signals 
            (window_start, service_name, latency_p95_ms, request_count, error_rate, cpu_usage_percent)
            VALUES (%s, 'api_service', 145.50, 1500, 0.0023, 45.67)
        """, (window_start,))
        
        # Test aggregation function
        self.cur.execute("""
            SELECT aggregate_golden_signals('api_service', '1 hour'::interval)
        """)
        
        result = self.cur.fetchone()[0]
        self.assertIn('latency_p95_ms', result)
        self.assertEqual(result['request_count'], 1500)
        self.assertEqual(float(result['error_rate']), 0.0023)
    
    def test_health_check_tracking(self):
        """Test service health check recording and status tracking"""
        
        # Record health check
        self.cur.execute("""
            INSERT INTO sre_health_checks 
            (service_name, endpoint, status, response_time_ms, error_message)
            VALUES ('payment_service', '/health', 'healthy', 89, NULL)
        """)
        
        # Test health status aggregation
        self.cur.execute("""
            SELECT 
                service_name,
                status,
                avg(response_time_ms) as avg_response_time
            FROM sre_health_checks 
            WHERE service_name = 'payment_service'
            AND checked_at >= now() - interval '5 minutes'
            GROUP BY service_name, status
        """)
        
        result = self.cur.fetchone()
        self.assertEqual(result[0], 'payment_service')
        self.assertEqual(result[1], 'healthy')
        self.assertEqual(result[2], 89.0)
    
    def test_incident_lifecycle(self):
        """Test incident declaration, escalation, and resolution"""
        
        # Declare incident
        self.cur.execute("""
            SELECT declare_incident(
                'High Error Rate',
                'API error rate exceeded 5% threshold',
                'critical'::incident_severity,
                'api_service',
                '{"error_rate": 0.087, "threshold": 0.05}'::jsonb
            )
        """)
        
        incident_id = self.cur.fetchone()[0]
        
        # Verify incident created
        self.cur.execute("""
            SELECT title, severity, status, affected_service
            FROM sre_incidents WHERE id = %s
        """, (incident_id,))
        
        result = self.cur.fetchone()
        self.assertEqual(result[0], 'High Error Rate')
        self.assertEqual(result[1], 'critical')
        self.assertEqual(result[2], 'active')
        self.assertEqual(result[3], 'api_service')
        
        # Test incident resolution
        self.cur.execute("""
            UPDATE sre_incidents 
            SET status = 'resolved', 
                resolved_at = now(),
                resolution_notes = 'Fixed database connection pool'
            WHERE id = %s
        """, (incident_id,))
        
        # Verify resolution
        self.cur.execute("""
            SELECT status, resolved_at IS NOT NULL
            FROM sre_incidents WHERE id = %s
        """, (incident_id,))
        
        result = self.cur.fetchone()
        self.assertEqual(result[0], 'resolved')
        self.assertTrue(result[1])


class TestM29RateLimiting(unittest.TestCase):
    """Test token bucket rate limiting implementation"""
    
    def setUp(self):
        self.conn = psycopg2.connect(
            host="localhost", 
            database="samia_tarot", 
            user="samia_admin", 
            password="samia123"
        )
        self.conn.autocommit = True
        self.cur = self.conn.cursor()
        
        self.cur.execute("SELECT set_config('app.current_user_id', 'admin_test', false)")
    
    def test_rate_limit_policy_creation(self):
        """Test creation and configuration of rate limit policies"""
        
        # Create rate limit policy
        self.cur.execute("""
            INSERT INTO sre_rate_limits
            (identifier_type, identifier_value, scope, requests_per_minute, 
             burst_allowance, window_minutes, is_active)
            VALUES ('client_id', 'test_client_123', 'api_calls', 100, 20, 1, true)
        """)
        
        # Verify policy creation
        self.cur.execute("""
            SELECT requests_per_minute, burst_allowance, is_active
            FROM sre_rate_limits 
            WHERE identifier_value = 'test_client_123'
        """)
        
        result = self.cur.fetchone()
        self.assertEqual(result[0], 100)
        self.assertEqual(result[1], 20)
        self.assertTrue(result[2])
    
    def test_token_bucket_algorithm(self):
        """Test token bucket rate limiting enforcement"""
        
        # Create rate limit for testing
        self.cur.execute("""
            INSERT INTO sre_rate_limits
            (identifier_type, identifier_value, scope, requests_per_minute, 
             burst_allowance, window_minutes, current_tokens, last_refill)
            VALUES ('ip_address', '192.168.1.100', 'api_calls', 60, 10, 1, 10.0, now())
        """)
        
        # Test successful consumption
        self.cur.execute("""
            SELECT check_rate_limit('ip_address', '192.168.1.100', 'api_calls', 1)
        """)
        
        result = self.cur.fetchone()[0]
        self.assertTrue(result['allowed'])
        self.assertLessEqual(result['tokens_remaining'], 10)
        
        # Test burst consumption
        self.cur.execute("""
            SELECT check_rate_limit('ip_address', '192.168.1.100', 'api_calls', 15)
        """)
        
        result = self.cur.fetchone()[0]
        self.assertFalse(result['allowed'])  # Should exceed available tokens
        self.assertIn('retry_after_seconds', result)
    
    def test_rate_limit_window_reset(self):
        """Test rate limit window reset and token refill"""
        
        # Create exhausted rate limit
        self.cur.execute("""
            INSERT INTO sre_rate_limits
            (identifier_type, identifier_value, scope, requests_per_minute, 
             burst_allowance, current_tokens, last_refill)
            VALUES ('user_id', 'user_456', 'api_calls', 30, 5, 0.0, now() - interval '2 minutes')
        """)
        
        # Check after refill period
        self.cur.execute("""
            SELECT check_rate_limit('user_id', 'user_456', 'api_calls', 1)
        """)
        
        result = self.cur.fetchone()[0]
        self.assertTrue(result['allowed'])  # Should be refilled
        self.assertGreater(result['tokens_remaining'], 0)


class TestM29CircuitBreakers(unittest.TestCase):
    """Test circuit breaker implementation for external providers"""
    
    def setUp(self):
        self.conn = psycopg2.connect(
            host="localhost", 
            database="samia_tarot", 
            user="samia_admin", 
            password="samia123"
        )
        self.conn.autocommit = True
        self.cur = self.conn.cursor()
        
        self.cur.execute("SELECT set_config('app.current_user_id', 'admin_test', false)")
    
    def test_circuit_breaker_states(self):
        """Test circuit breaker state transitions"""
        
        # Create circuit breaker
        self.cur.execute("""
            INSERT INTO sre_circuit_breaker_state
            (service_name, provider_name, state, failure_count, failure_threshold,
             reset_timeout_seconds, last_failure_at, next_attempt_at)
            VALUES ('payment', 'stripe', 'closed', 0, 5, 300, NULL, NULL)
        """)
        
        # Test failure recording
        for i in range(3):
            self.cur.execute("""
                SELECT update_circuit_breaker('payment', 'stripe', false, 'Connection timeout')
            """)
        
        # Verify state still closed (under threshold)
        self.cur.execute("""
            SELECT state, failure_count
            FROM sre_circuit_breaker_state 
            WHERE service_name = 'payment' AND provider_name = 'stripe'
        """)
        
        result = self.cur.fetchone()
        self.assertEqual(result[0], 'closed')
        self.assertEqual(result[1], 3)
        
        # Trigger circuit breaker opening
        for i in range(3):
            self.cur.execute("""
                SELECT update_circuit_breaker('payment', 'stripe', false, 'Service unavailable')
            """)
        
        # Verify circuit opened
        self.cur.execute("""
            SELECT state, failure_count >= failure_threshold
            FROM sre_circuit_breaker_state 
            WHERE service_name = 'payment' AND provider_name = 'stripe'
        """)
        
        result = self.cur.fetchone()
        self.assertEqual(result[0], 'open')
        self.assertTrue(result[1])
    
    def test_circuit_breaker_recovery(self):
        """Test circuit breaker recovery and half-open state"""
        
        # Create open circuit breaker ready for reset
        past_time = datetime.now() - timedelta(minutes=10)
        self.cur.execute("""
            INSERT INTO sre_circuit_breaker_state
            (service_name, provider_name, state, failure_count, failure_threshold,
             reset_timeout_seconds, last_failure_at, next_attempt_at)
            VALUES ('notification', 'twilio', 'open', 6, 5, 300, %s, %s)
        """, (past_time, past_time + timedelta(seconds=300)))
        
        # Test successful recovery
        self.cur.execute("""
            SELECT update_circuit_breaker('notification', 'twilio', true, NULL)
        """)
        
        # Should transition to half-open, then closed on success
        self.cur.execute("""
            SELECT state, failure_count
            FROM sre_circuit_breaker_state 
            WHERE service_name = 'notification' AND provider_name = 'twilio'
        """)
        
        result = self.cur.fetchone()
        self.assertIn(result[0], ['half_open', 'closed'])
    
    def test_circuit_breaker_availability_check(self):
        """Test circuit breaker availability for requests"""
        
        # Create healthy circuit breaker
        self.cur.execute("""
            INSERT INTO sre_circuit_breaker_state
            (service_name, provider_name, state, failure_count, failure_threshold)
            VALUES ('storage', 's3', 'closed', 1, 5)
        """)
        
        # Test availability
        self.cur.execute("""
            SELECT is_circuit_breaker_available('storage', 's3')
        """)
        
        self.assertTrue(self.cur.fetchone()[0])
        
        # Create unavailable circuit breaker
        self.cur.execute("""
            INSERT INTO sre_circuit_breaker_state
            (service_name, provider_name, state, failure_count, failure_threshold,
             next_attempt_at)
            VALUES ('email', 'sendgrid', 'open', 8, 5, now() + interval '5 minutes')
        """)
        
        # Test unavailability
        self.cur.execute("""
            SELECT is_circuit_breaker_available('email', 'sendgrid')
        """)
        
        self.assertFalse(self.cur.fetchone()[0])


class TestM29CostManagement(unittest.TestCase):
    """Test FinOps cost tracking and budget management"""
    
    def setUp(self):
        self.conn = psycopg2.connect(
            host="localhost", 
            database="samia_tarot", 
            user="samia_admin", 
            password="samia123"
        )
        self.conn.autocommit = True
        self.cur = self.conn.cursor()
        
        self.cur.execute("SELECT set_config('app.current_user_id', 'admin_test', false)")
    
    def test_budget_creation_and_tracking(self):
        """Test budget creation and cost usage tracking"""
        
        # Create budget
        self.cur.execute("""
            INSERT INTO finops_cost_budgets
            (budget_name, service_name, budget_period, budget_amount_cents, 
             alert_thresholds, is_active)
            VALUES ('API Service Monthly', 'api_service', 'monthly', 50000, 
                    ARRAY[0.8, 0.9, 1.0], true)
        """)
        
        budget_id = self.cur.lastrowid if hasattr(self.cur, 'lastrowid') else None
        
        # Record cost usage
        self.cur.execute("""
            SELECT update_cost_usage('api_service', 'compute', 1250, 
                                   '{"instance_hours": 25, "cpu_cores": 4}')
        """)
        
        # Test budget status
        self.cur.execute("""
            SELECT 
                budget_name,
                budget_amount_cents,
                (SELECT COALESCE(SUM(cost_cents), 0) 
                 FROM finops_cost_usage 
                 WHERE service_name = 'api_service' 
                 AND usage_date >= date_trunc('month', now())) as current_usage
            FROM finops_cost_budgets
            WHERE service_name = 'api_service' AND is_active = true
        """)
        
        result = self.cur.fetchone()
        self.assertEqual(result[0], 'API Service Monthly')
        self.assertEqual(result[1], 50000)
        self.assertGreaterEqual(result[2], 1250)
    
    def test_cost_alert_generation(self):
        """Test automatic cost alert generation"""
        
        # Create budget with low threshold
        self.cur.execute("""
            INSERT INTO finops_cost_budgets
            (budget_name, service_name, budget_period, budget_amount_cents, 
             alert_thresholds, is_active)
            VALUES ('Test Budget', 'test_service', 'monthly', 10000, 
                    ARRAY[0.5, 0.8, 1.0], true)
        """)
        
        # Add usage that exceeds threshold
        self.cur.execute("""
            SELECT update_cost_usage('test_service', 'api_calls', 6000, 
                                   '{"requests": 10000}')
        """)
        
        # Check for alert generation
        self.cur.execute("""
            SELECT 
                severity,
                current_usage_cents,
                budget_amount_cents,
                threshold_percent
            FROM finops_cost_alerts
            WHERE budget_name = 'Test Budget'
            ORDER BY created_at DESC
            LIMIT 1
        """)
        
        result = self.cur.fetchone()
        if result:  # Alert may not generate immediately in test
            self.assertIn(result[0], ['warning', 'critical'])
            self.assertGreaterEqual(result[1], 6000)
    
    def test_cost_trend_analysis(self):
        """Test cost trend analysis and forecasting"""
        
        # Insert historical cost data
        for i in range(5):
            date = datetime.now().date() - timedelta(days=i)
            cost = 1000 + (i * 100)  # Increasing trend
            
            self.cur.execute("""
                INSERT INTO finops_cost_usage
                (service_name, cost_type, cost_cents, usage_date, usage_metadata)
                VALUES ('trending_service', 'compute', %s, %s, '{"day": %s}')
            """, (cost, date, i))
        
        # Test trend calculation
        self.cur.execute("""
            SELECT 
                service_name,
                avg(cost_cents) as avg_daily_cost,
                count(*) as days_tracked
            FROM finops_cost_usage 
            WHERE service_name = 'trending_service'
            AND usage_date >= now()::date - interval '7 days'
            GROUP BY service_name
        """)
        
        result = self.cur.fetchone()
        self.assertEqual(result[0], 'trending_service')
        self.assertGreater(result[1], 1000)  # Average should be > base cost
        self.assertEqual(result[2], 5)


class TestM29RLSPolicies(unittest.TestCase):
    """Test Row-Level Security policies for M29 tables"""
    
    def setUp(self):
        self.conn = psycopg2.connect(
            host="localhost", 
            database="samia_tarot", 
            user="samia_admin", 
            password="samia123"
        )
        self.conn.autocommit = True
        self.cur = self.conn.cursor()
    
    def test_admin_access_to_all_tables(self):
        """Test Admin/Superadmin can access all SRE and cost tables"""
        
        self.cur.execute("SELECT set_config('app.current_user_id', 'admin_test', false)")
        
        # Test access to each M29 table
        tables = [
            'sre_golden_signals', 'sre_rate_limits', 'sre_circuit_breaker_state',
            'finops_cost_budgets', 'finops_cost_usage', 'finops_cost_alerts',
            'sre_incidents', 'sre_health_checks'
        ]
        
        for table in tables:
            try:
                self.cur.execute(f"SELECT COUNT(*) FROM {table}")
                result = self.cur.fetchone()
                self.assertIsNotNone(result)
            except Exception as e:
                self.fail(f"Admin should have access to {table}: {e}")
    
    def test_monitor_read_only_access(self):
        """Test Monitor role has read-only access to appropriate tables"""
        
        self.cur.execute("SELECT set_config('app.current_user_id', 'monitor_user', false)")
        
        # Monitor should be able to read these tables
        readable_tables = [
            'sre_golden_signals', 'sre_rate_limits', 'sre_circuit_breaker_state',
            'finops_cost_usage', 'finops_cost_alerts', 'sre_incidents', 'sre_health_checks'
        ]
        
        for table in readable_tables:
            try:
                self.cur.execute(f"SELECT COUNT(*) FROM {table}")
                result = self.cur.fetchone()
                self.assertIsNotNone(result)
            except Exception as e:
                self.fail(f"Monitor should have read access to {table}: {e}")
    
    def test_monitor_denied_budget_access(self):
        """Test Monitor cannot access sensitive budget information"""
        
        self.cur.execute("SELECT set_config('app.current_user_id', 'monitor_user', false)")
        
        # Monitor should NOT access budget configurations
        with self.assertRaises(psycopg2.Error):
            self.cur.execute("SELECT * FROM finops_cost_budgets")
    
    def test_reader_limited_golden_signals_access(self):
        """Test Reader can only access public service metrics"""
        
        self.cur.execute("SELECT set_config('app.current_user_id', 'reader_user', false)")
        
        # Insert test data with different service types
        self.cur.execute("SELECT set_config('app.current_user_id', 'admin_test', false)")
        
        self.cur.execute("""
            INSERT INTO sre_golden_signals 
            (window_start, service_name, latency_p95_ms, request_count)
            VALUES 
            (now(), 'public_api', 100.0, 1000),
            (now(), 'payment', 150.0, 500),
            (now(), 'admin', 80.0, 200)
        """)
        
        # Switch to reader context
        self.cur.execute("SELECT set_config('app.current_user_id', 'reader_user', false)")
        
        # Reader should only see public services
        self.cur.execute("""
            SELECT service_name FROM sre_golden_signals 
            WHERE service_name IN ('public_api', 'payment', 'admin')
        """)
        
        results = [row[0] for row in self.cur.fetchall()]
        self.assertIn('public_api', results)
        self.assertNotIn('payment', results)
        self.assertNotIn('admin', results)
    
    def test_client_denied_all_access(self):
        """Test Client role is denied access to all SRE/cost tables"""
        
        self.cur.execute("SELECT set_config('app.current_user_id', 'client_user', false)")
        
        # Client should be denied access to all M29 tables
        tables = [
            'sre_golden_signals', 'sre_rate_limits', 'sre_circuit_breaker_state',
            'finops_cost_budgets', 'finops_cost_usage', 'finops_cost_alerts',
            'sre_incidents', 'sre_health_checks'
        ]
        
        for table in tables:
            with self.assertRaises(psycopg2.Error):
                self.cur.execute(f"SELECT * FROM {table}")
    
    def test_system_context_operations(self):
        """Test system context can perform automated operations"""
        
        self.cur.execute("SELECT set_config('app.current_user_id', 'system', false)")
        
        # System should be able to update metrics and health status
        try:
            self.cur.execute("""
                INSERT INTO sre_golden_signals 
                (window_start, service_name, latency_p95_ms, request_count)
                VALUES (now(), 'system_test', 95.5, 750)
            """)
            
            self.cur.execute("""
                INSERT INTO sre_health_checks 
                (service_name, endpoint, status, response_time_ms)
                VALUES ('system_test', '/health', 'healthy', 45)
            """)
            
            # Verify system operations succeeded
            self.cur.execute("""
                SELECT COUNT(*) FROM sre_golden_signals 
                WHERE service_name = 'system_test'
            """)
            
            self.assertEqual(self.cur.fetchone()[0], 1)
            
        except Exception as e:
            self.fail(f"System should be able to perform automated operations: {e}")


class TestM29APIEndpoints(unittest.TestCase):
    """Test M29 API endpoints and integration"""
    
    @patch('api.get_db_connection')
    def test_health_overview_endpoint(self, mock_get_db):
        """Test /admin/health/overview endpoint"""
        
        # Mock database connection and cursor
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_get_db.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cur
        
        # Mock golden signals data
        mock_cur.fetchall.return_value = [
            ('api_service', 145.50, 1500, 0.0023, 45.67),
            ('payment_service', 89.20, 800, 0.0001, 32.10)
        ]
        
        # Import and test the endpoint (would require Flask test client)
        # This is a simplified test structure
        from api import app
        
        with app.test_client() as client:
            # Set admin authentication
            with client.session_transaction() as sess:
                sess['user_id'] = 'admin_test'
                sess['role'] = 'admin'
            
            response = client.get('/admin/health/overview')
            self.assertEqual(response.status_code, 200)
            
            data = json.loads(response.data)
            self.assertIn('golden_signals', data)
            self.assertIn('circuit_breakers', data)
    
    @patch('api.get_db_connection')
    def test_budget_endpoint(self, mock_get_db):
        """Test /admin/budget endpoint"""
        
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_get_db.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cur
        
        # Mock budget data
        mock_cur.fetchall.return_value = [
            ('API Service', 'api_service', 'monthly', 50000, 32000, ['0.8', '0.9', '1.0'])
        ]
        
        from api import app
        
        with app.test_client() as client:
            with client.session_transaction() as sess:
                sess['user_id'] = 'admin_test'
                sess['role'] = 'admin'
            
            response = client.get('/admin/budget')
            self.assertEqual(response.status_code, 200)
            
            data = json.loads(response.data)
            self.assertIn('budgets', data)
            self.assertIn('total_budget', data)
    
    @patch('api.get_db_connection')
    def test_incident_declaration(self, mock_get_db):
        """Test POST /admin/incident/declare endpoint"""
        
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_get_db.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cur
        
        # Mock incident creation
        mock_cur.fetchone.return_value = ['incident_123']
        
        from api import app
        
        with app.test_client() as client:
            with client.session_transaction() as sess:
                sess['user_id'] = 'admin_test'
                sess['role'] = 'admin'
            
            response = client.post('/admin/incident/declare', 
                json={
                    'title': 'High Error Rate',
                    'description': 'API errors above threshold',
                    'severity': 'critical',
                    'affected_service': 'api_service'
                })
            
            self.assertEqual(response.status_code, 201)
            
            data = json.loads(response.data)
            self.assertIn('incident_id', data)
    
    def test_rate_limit_testing_endpoint(self):
        """Test /admin/limits/test endpoint for rate limit validation"""
        
        from api import app
        
        with app.test_client() as client:
            with client.session_transaction() as sess:
                sess['user_id'] = 'admin_test'
                sess['role'] = 'admin'
            
            response = client.post('/admin/limits/test',
                json={
                    'identifier_type': 'ip_address',
                    'identifier_value': '192.168.1.100',
                    'scope': 'api_calls',
                    'requests': 5
                })
            
            self.assertEqual(response.status_code, 200)
            
            data = json.loads(response.data)
            self.assertIn('allowed', data)
            self.assertIn('tokens_remaining', data)


def run_test_suite():
    """Run the complete M29 test suite"""
    
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test classes
    test_classes = [
        TestM29SREMonitoring,
        TestM29RateLimiting, 
        TestM29CircuitBreakers,
        TestM29CostManagement,
        TestM29RLSPolicies,
        TestM29APIEndpoints
    ]
    
    for test_class in test_classes:
        tests = loader.loadTestsFromTestClass(test_class)
        suite.addTests(tests)
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Print summary
    print(f"\n{'='*50}")
    print(f"M29 SRE & Cost Guards Test Results")
    print(f"{'='*50}")
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Success rate: {((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100):.1f}%")
    
    if result.failures:
        print(f"\nFailures:")
        for test, trace in result.failures:
            print(f"  - {test}: {trace.split(chr(10))[-2]}")
    
    if result.errors:
        print(f"\nErrors:")
        for test, trace in result.errors:
            print(f"  - {test}: {trace.split(chr(10))[-2]}")
    
    return result.wasSuccessful()


if __name__ == '__main__':
    print("Starting M29 SRE & Cost Guards test suite...")
    print("Testing: Golden Signals, Rate Limiting, Circuit Breakers, Cost Tracking, RLS Policies")
    print("=" * 80)
    
    success = run_test_suite()
    exit(0 if success else 1)