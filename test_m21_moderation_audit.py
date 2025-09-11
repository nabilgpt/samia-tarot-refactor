# test_m21_moderation_audit.py - M21 Moderation & Audit Tests
# Comprehensive test coverage for moderation actions, appeals, audit integrity, and automated sweeps

import pytest
import psycopg2
from psycopg2.pool import SimpleConnectionPool
import json
import uuid
import hashlib
import hmac
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

# Database connection for testing
DSN = "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

class TestModerationActions:
    """Test moderation action system with role-based permissions"""
    
    @classmethod
    def setup_class(cls):
        """Set up test database connection"""
        cls.pool = SimpleConnectionPool(minconn=1, maxconn=3, dsn=DSN)
        cls.setup_test_data()
    
    @classmethod
    def setup_test_data(cls):
        """Create test users and data for moderation testing"""
        conn = cls.pool.getconn()
        try:
            with conn.cursor() as cur:
                # Create test users with different roles
                cls.monitor_user_id = str(uuid.uuid4())
                cls.admin_user_id = str(uuid.uuid4()) 
                cls.client_user_id = str(uuid.uuid4())
                cls.reader_user_id = str(uuid.uuid4())
                cls.target_user_id = str(uuid.uuid4())
                
                # Insert test users
                cur.execute("""
                    INSERT INTO profiles (id, email, role_id) VALUES 
                    (%s, 'monitor@example.com', 4),
                    (%s, 'admin@example.com', 2),
                    (%s, 'client@example.com', 5),
                    (%s, 'reader@example.com', 3),
                    (%s, 'target@example.com', 5)
                    ON CONFLICT (id) DO NOTHING
                """, (cls.monitor_user_id, cls.admin_user_id, cls.client_user_id, 
                      cls.reader_user_id, cls.target_user_id))
                
                # Create test service and order
                cur.execute("""
                    INSERT INTO services (id, code, name) 
                    VALUES (998, 'test_moderation', 'Test Moderation Service') 
                    ON CONFLICT (code) DO NOTHING
                """)
                
                cur.execute("""
                    INSERT INTO orders (id, user_id, service_id, status, assigned_reader) 
                    VALUES (998, %s, 998, 'in_progress', %s) 
                    ON CONFLICT (id) DO UPDATE SET 
                    user_id = EXCLUDED.user_id, assigned_reader = EXCLUDED.assigned_reader
                """, (cls.client_user_id, cls.reader_user_id))
                
                conn.commit()
        finally:
            cls.pool.putconn(conn)
    
    @classmethod 
    def teardown_class(cls):
        """Clean up test data"""
        conn = cls.pool.getconn()
        try:
            with conn.cursor() as cur:
                # Clean up moderation data
                cur.execute("DELETE FROM user_restrictions WHERE user_id IN (%s, %s, %s, %s, %s)", 
                           (cls.monitor_user_id, cls.admin_user_id, cls.client_user_id, 
                            cls.reader_user_id, cls.target_user_id))
                cur.execute("DELETE FROM moderation_actions WHERE actor_id IN (%s, %s) OR target_id IN (%s, %s, %s, %s, %s)",
                           (cls.monitor_user_id, cls.admin_user_id, cls.monitor_user_id, cls.admin_user_id, 
                            cls.client_user_id, cls.reader_user_id, cls.target_user_id))
                cur.execute("DELETE FROM orders WHERE id = 998")
                cur.execute("DELETE FROM services WHERE id = 998")
                cur.execute("DELETE FROM profiles WHERE id IN (%s, %s, %s, %s, %s)",
                           (cls.monitor_user_id, cls.admin_user_id, cls.client_user_id, 
                            cls.reader_user_id, cls.target_user_id))
                conn.commit()
        finally:
            cls.pool.putconn(conn)
            cls.pool.closeall()
    
    def db_fetchone(self, sql, params=None):
        """Execute SQL and return first row"""
        conn = self.pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute(sql, params or ())
                return cur.fetchone()
        finally:
            self.pool.putconn(conn)
    
    def db_exec(self, sql, params=None):
        """Execute SQL with params"""
        conn = self.pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute(sql, params or ())
                conn.commit()
                return cur.rowcount
        finally:
            self.pool.putconn(conn)
    
    def test_block_user_permissions(self):
        """Test user blocking with proper permission checks"""
        from api import block_user, ModerationActionRequest
        
        # Test monitor can block users
        request = ModerationActionRequest(
            target_type="profile",
            target_id=self.target_user_id,
            action="block",
            reason_code="harassment",
            severity=3,
            duration_hours=24,
            internal_notes="Test blocking",
            user_visible_reason="Policy violation"
        )
        
        with patch('api.get_user_role', return_value='monitor'):
            result = block_user(request, x_user_id=self.monitor_user_id)
            
        assert result["restriction_type"] == "block"
        assert result["target_id"] == self.target_user_id
        assert "expires_at" in result
        
        # Verify restriction was created
        restriction = self.db_fetchone("""
            SELECT restriction_type, reason_code, severity, user_visible_reason
            FROM user_restrictions 
            WHERE user_id = %s AND status = 'active'
        """, (self.target_user_id,))
        
        assert restriction is not None
        assert restriction[0] == "block"
        assert restriction[1] == "harassment"
        assert restriction[2] == 3
        assert restriction[3] == "Policy violation"
    
    def test_block_user_authorization_failure(self):
        """Test that non-monitor users cannot block"""
        from api import block_user, ModerationActionRequest
        from fastapi import HTTPException
        
        request = ModerationActionRequest(
            target_type="profile",
            target_id=self.target_user_id,
            action="block",
            reason_code="spam",
            severity=2
        )
        
        # Test client cannot block
        with patch('api.get_user_role', return_value='client'):
            with pytest.raises(HTTPException) as exc_info:
                block_user(request, x_user_id=self.client_user_id)
            
            assert exc_info.value.status_code == 403
            assert "Insufficient permissions" in str(exc_info.value.detail)
    
    def test_unblock_user(self):
        """Test user unblocking functionality"""
        from api import unblock_user, ModerationActionRequest
        
        # First create a block to unblock
        self.db_exec("""
            INSERT INTO user_restrictions 
            (user_id, restriction_type, reason_code, applied_by, status)
            VALUES (%s, 'block', 'spam', %s, 'active')
        """, (self.target_user_id, self.monitor_user_id))
        
        request = ModerationActionRequest(
            target_type="profile",
            target_id=self.target_user_id,
            action="unblock",
            reason_code="resolved"
        )
        
        with patch('api.get_user_role', return_value='admin'):
            result = unblock_user(request, x_user_id=self.admin_user_id)
        
        assert result["target_id"] == self.target_user_id
        assert "User unblocked successfully" in result["message"]
        
        # Verify restriction was lifted
        restriction = self.db_fetchone("""
            SELECT status FROM user_restrictions 
            WHERE user_id = %s AND restriction_type = 'block'
            ORDER BY applied_at DESC LIMIT 1
        """, (self.target_user_id,))
        
        assert restriction[0] == "lifted"
    
    def test_moderate_order_actions(self):
        """Test various order moderation actions"""
        from api import moderate_order, ModerationActionRequest
        
        # Test order hold action
        request = ModerationActionRequest(
            target_type="order",
            target_id="998",
            action="hold",
            reason_code="quality_issues",
            severity=2,
            internal_notes="Needs review"
        )
        
        with patch('api.get_user_role', return_value='monitor'):
            result = moderate_order(998, request, x_user_id=self.monitor_user_id)
        
        assert result["action"] == "hold"
        assert result["order_id"] == 998
        assert "previous_status" in result["action_details"]
        
        # Verify order status was updated
        order_status = self.db_fetchone("""
            SELECT status FROM orders WHERE id = 998
        """)[0]
        
        assert order_status == "awaiting_approval"


class TestModerationCases:
    """Test moderation cases and queue management"""
    
    @classmethod
    def setup_class(cls):
        """Set up test environment"""
        cls.pool = SimpleConnectionPool(minconn=1, maxconn=3, dsn=DSN)
        cls.setup_test_data()
    
    @classmethod
    def setup_test_data(cls):
        """Create test data"""
        conn = cls.pool.getconn()
        try:
            with conn.cursor() as cur:
                cls.monitor_user_id = str(uuid.uuid4())
                cls.admin_user_id = str(uuid.uuid4())
                
                cur.execute("""
                    INSERT INTO profiles (id, email, role_id) VALUES 
                    (%s, 'monitor2@example.com', 4),
                    (%s, 'admin2@example.com', 2)
                    ON CONFLICT (id) DO NOTHING
                """, (cls.monitor_user_id, cls.admin_user_id))
                
                conn.commit()
        finally:
            cls.pool.putconn(conn)
    
    @classmethod
    def teardown_class(cls):
        """Clean up"""
        conn = cls.pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM moderation_cases WHERE opened_by IN (%s, %s)",
                           (cls.monitor_user_id, cls.admin_user_id))
                cur.execute("DELETE FROM profiles WHERE id IN (%s, %s)",
                           (cls.monitor_user_id, cls.admin_user_id))
                conn.commit()
        finally:
            cls.pool.putconn(conn)
            cls.pool.closeall()
    
    def db_fetchone(self, sql, params=None):
        conn = self.pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute(sql, params or ())
                return cur.fetchone()
        finally:
            self.pool.putconn(conn)
    
    def test_get_moderation_cases(self):
        """Test moderation cases queue retrieval"""
        from api import get_moderation_cases
        
        # Create test cases
        conn = self.pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO moderation_cases
                    (subject_type, subject_id, priority, reason_code, description, opened_by)
                    VALUES 
                    ('profile', %s, 3, 'harassment', 'Test case 1', %s),
                    ('order', '999', 2, 'quality_issues', 'Test case 2', %s)
                """, (self.monitor_user_id, self.admin_user_id, self.admin_user_id))
                conn.commit()
        finally:
            self.pool.putconn(conn)
        
        # Test monitor can view cases
        with patch('api.get_user_role', return_value='monitor'):
            result = get_moderation_cases(x_user_id=self.monitor_user_id)
        
        assert "cases" in result
        assert len(result["cases"]) >= 2
        assert "overdue_cases" in result
        assert result["total_results"] >= 2
        
        # Check case structure
        case = result["cases"][0]
        required_fields = ["id", "case_type", "subject_type", "subject_id", "priority", 
                          "status", "reason_code", "description", "sla_deadline"]
        for field in required_fields:
            assert field in case
    
    def test_cases_authorization(self):
        """Test that only monitor+ can view cases"""
        from api import get_moderation_cases
        from fastapi import HTTPException
        
        with patch('api.get_user_role', return_value='client'):
            with pytest.raises(HTTPException) as exc_info:
                get_moderation_cases(x_user_id="client_user")
            
            assert exc_info.value.status_code == 403


class TestModerationAppeals:
    """Test appeals workflow system"""
    
    @classmethod
    def setup_class(cls):
        """Set up test environment"""
        cls.pool = SimpleConnectionPool(minconn=1, maxconn=3, dsn=DSN)
        cls.setup_test_data()
    
    @classmethod
    def setup_test_data(cls):
        """Create test data"""
        conn = cls.pool.getconn()
        try:
            with conn.cursor() as cur:
                cls.admin_user_id = str(uuid.uuid4())
                cls.appellant_user_id = str(uuid.uuid4())
                
                cur.execute("""
                    INSERT INTO profiles (id, email, role_id) VALUES 
                    (%s, 'admin3@example.com', 2),
                    (%s, 'appellant@example.com', 5)
                    ON CONFLICT (id) DO NOTHING
                """, (cls.admin_user_id, cls.appellant_user_id))
                
                # Create a moderation action to appeal
                cur.execute("""
                    INSERT INTO moderation_actions 
                    (id, actor_id, target_kind, target_id, action, reason, reason_code)
                    VALUES (9999, %s, 'profile', %s, 'block', 'Test block', 'spam')
                    ON CONFLICT (id) DO UPDATE SET target_id = EXCLUDED.target_id
                """, (cls.admin_user_id, cls.appellant_user_id))
                
                conn.commit()
        finally:
            cls.pool.putconn(conn)
    
    @classmethod
    def teardown_class(cls):
        """Clean up"""
        conn = cls.pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM moderation_appeals WHERE appellant_id = %s", 
                           (cls.appellant_user_id,))
                cur.execute("DELETE FROM moderation_actions WHERE id = 9999")
                cur.execute("DELETE FROM profiles WHERE id IN (%s, %s)",
                           (cls.admin_user_id, cls.appellant_user_id))
                conn.commit()
        finally:
            cls.pool.putconn(conn)
            cls.pool.closeall()
    
    def db_fetchone(self, sql, params=None):
        conn = self.pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute(sql, params or ())
                return cur.fetchone()
        finally:
            self.pool.putconn(conn)
    
    def test_resolve_appeal_approved(self):
        """Test appeal resolution with approval"""
        from api import resolve_appeal, AppealDecisionRequest
        
        # Create test appeal
        conn = self.pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO moderation_appeals 
                    (moderation_action_id, appellant_id, appeal_reason, status)
                    VALUES (9999, %s, 'This was a mistake', 'pending')
                    RETURNING id
                """, (self.appellant_user_id,))
                appeal_id = cur.fetchone()[0]
                conn.commit()
        finally:
            self.pool.putconn(conn)
        
        # Test admin resolving appeal
        request = AppealDecisionRequest(
            decision="approved",
            decision_reason="Upon review, action was excessive",
            reverse_original=True
        )
        
        with patch('api.get_user_role', return_value='admin'):
            result = resolve_appeal(appeal_id, request, x_user_id=self.admin_user_id)
        
        assert result["appeal_id"] == appeal_id
        assert result["decision"] == "approved"
        assert result["original_action_reversed"] == True
        
        # Verify appeal was updated
        appeal_status = self.db_fetchone("""
            SELECT status, decision FROM moderation_appeals WHERE id = %s
        """, (appeal_id,))
        
        assert appeal_status[0] == "approved"
        assert appeal_status[1] == "approved"


class TestAuditIntegrity:
    """Test tamper-evident audit trail system"""
    
    @classmethod
    def setup_class(cls):
        """Set up test environment"""
        cls.pool = SimpleConnectionPool(minconn=1, maxconn=3, dsn=DSN)
        cls.admin_user_id = str(uuid.uuid4())
        
        # Create admin user
        conn = cls.pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO profiles (id, email, role_id) 
                    VALUES (%s, 'admin_audit@example.com', 2)
                    ON CONFLICT (id) DO NOTHING
                """, (cls.admin_user_id,))
                conn.commit()
        finally:
            cls.pool.putconn(conn)
    
    @classmethod
    def teardown_class(cls):
        """Clean up"""
        conn = cls.pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM audit_attestations WHERE signed_by = %s", 
                           (cls.admin_user_id,))
                cur.execute("DELETE FROM profiles WHERE id = %s", (cls.admin_user_id,))
                conn.commit()
        finally:
            cls.pool.putconn(conn)
            cls.pool.closeall()
    
    def db_fetchall(self, sql, params=None):
        conn = self.pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute(sql, params or ())
                return cur.fetchall()
        finally:
            self.pool.putconn(conn)
    
    def test_audit_hash_chain_integrity(self):
        """Test that audit log maintains hash chain integrity"""
        from api import write_audit_m21
        
        # Write several audit entries
        test_entries = [
            ("user1", "action1", "entity1", "id1", {"data": "test1"}),
            ("user2", "action2", "entity2", "id2", {"data": "test2"}), 
            ("user3", "action3", "entity3", "id3", {"data": "test3"})
        ]
        
        for actor, event, entity, entity_id, meta in test_entries:
            write_audit_m21(actor, event, entity, entity_id, meta)
        
        # Verify hash chain integrity
        entries = self.db_fetchall("""
            SELECT sequence_number, previous_hash, record_hash
            FROM audit_log 
            ORDER BY sequence_number DESC 
            LIMIT 5
        """)
        
        assert len(entries) >= 3
        
        # Check chain integrity (reverse order since we got DESC)
        for i in range(len(entries) - 1):
            current_entry = entries[i]
            next_entry = entries[i + 1]
            
            # Current entry's previous_hash should match next entry's record_hash
            assert current_entry[1] == next_entry[2], \
                f"Hash chain broken between sequence {current_entry[0]} and {next_entry[0]}"
    
    def test_create_audit_attestation(self):
        """Test audit attestation creation and signing"""
        from api import create_audit_attestation, AuditExportRequest
        
        # Define a recent time period
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=1)
        
        request = AuditExportRequest(
            period_start=start_time.isoformat() + "Z",
            period_end=end_time.isoformat() + "Z",
            export_format="json",
            include_signatures=True
        )
        
        with patch('api.get_user_role', return_value='admin'):
            result = create_audit_attestation(request, x_user_id=self.admin_user_id)
        
        assert "attestation_id" in result
        assert "content_hash" in result
        assert "signature" in result
        assert result["export_format"] == "json"
        assert "total_records" in result
    
    def test_get_audit_log_with_verification(self):
        """Test audit log retrieval with hash verification"""
        from api import get_audit_log
        
        with patch('api.get_user_role', return_value='admin'):
            result = get_audit_log(x_user_id=self.admin_user_id, limit=10)
        
        assert "entries" in result
        assert "hash_verification" in result
        assert isinstance(result["hash_verification"]["verified"], bool)
        
        # Check entries structure
        if result["entries"]:
            entry = result["entries"][0]
            required_fields = ["sequence_number", "actor", "event", "entity", 
                             "record_hash", "previous_hash", "created_at"]
            for field in required_fields:
                assert field in entry


class TestAutomatedSweeps:
    """Test automated anomaly detection sweeps"""
    
    @classmethod
    def setup_class(cls):
        """Set up test environment"""
        cls.pool = SimpleConnectionPool(minconn=1, maxconn=3, dsn=DSN)
        cls.admin_user_id = str(uuid.uuid4())
        
        conn = cls.pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO profiles (id, email, role_id) 
                    VALUES (%s, 'admin_sweeps@example.com', 2)
                    ON CONFLICT (id) DO NOTHING
                """, (cls.admin_user_id,))
                conn.commit()
        finally:
            cls.pool.putconn(conn)
    
    @classmethod
    def teardown_class(cls):
        """Clean up"""
        conn = cls.pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM moderation_sweep_results WHERE 1=1")
                cur.execute("DELETE FROM profiles WHERE id = %s", (cls.admin_user_id,))
                conn.commit()
        finally:
            cls.pool.putconn(conn)
            cls.pool.closeall()
    
    def test_run_moderation_sweeps(self):
        """Test manual execution of moderation sweeps"""
        from api import run_moderation_sweeps
        
        with patch('api.get_user_role', return_value='admin'):
            result = run_moderation_sweeps(x_user_id=self.admin_user_id)
        
        assert "sweep_results" in result
        assert "total_cases_created" in result
        assert "total_anomalies_found" in result
        
        # Check individual sweep results
        sweep_results = result["sweep_results"]
        expected_sweeps = ["excessive_rejections", "rapid_refunds", "high_call_drops"]
        
        for sweep_name in expected_sweeps:
            assert sweep_name in sweep_results
            sweep_result = sweep_results[sweep_name]
            assert "message" in sweep_result
            
            # Either successful execution or configuration not found
            assert ("completed" in sweep_result["message"] or 
                   "configuration not found" in sweep_result["message"])
    
    def test_sweep_authorization(self):
        """Test that only admin+ can run sweeps"""
        from api import run_moderation_sweeps
        from fastapi import HTTPException
        
        with patch('api.get_user_role', return_value='monitor'):
            with pytest.raises(HTTPException) as exc_info:
                run_moderation_sweeps(x_user_id="monitor_user")
            
            assert exc_info.value.status_code == 403


class TestRLSPolicyParity:
    """Test that RLS policies match route guard authorization exactly"""
    
    @classmethod
    def setup_class(cls):
        """Set up test environment"""
        cls.pool = SimpleConnectionPool(minconn=1, maxconn=3, dsn=DSN)
        cls.setup_test_users()
    
    @classmethod
    def setup_test_users(cls):
        """Create test users with different roles"""
        conn = cls.pool.getconn()
        try:
            with conn.cursor() as cur:
                cls.client_user_id = str(uuid.uuid4())
                cls.monitor_user_id = str(uuid.uuid4())
                cls.admin_user_id = str(uuid.uuid4())
                cls.other_client_id = str(uuid.uuid4())
                
                cur.execute("""
                    INSERT INTO profiles (id, email, role_id) VALUES 
                    (%s, 'rls_client@example.com', 5),
                    (%s, 'rls_monitor@example.com', 4),
                    (%s, 'rls_admin@example.com', 2),
                    (%s, 'rls_other@example.com', 5)
                    ON CONFLICT (id) DO NOTHING
                """, (cls.client_user_id, cls.monitor_user_id, cls.admin_user_id, cls.other_client_id))
                
                conn.commit()
        finally:
            cls.pool.putconn(conn)
    
    @classmethod
    def teardown_class(cls):
        """Clean up"""
        conn = cls.pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM moderation_actions WHERE actor_id IN (%s, %s, %s, %s) OR target_id IN (%s, %s, %s, %s)",
                           (cls.client_user_id, cls.monitor_user_id, cls.admin_user_id, cls.other_client_id,
                            cls.client_user_id, cls.monitor_user_id, cls.admin_user_id, cls.other_client_id))
                cur.execute("DELETE FROM user_restrictions WHERE user_id IN (%s, %s, %s, %s)",
                           (cls.client_user_id, cls.monitor_user_id, cls.admin_user_id, cls.other_client_id))
                cur.execute("DELETE FROM profiles WHERE id IN (%s, %s, %s, %s)",
                           (cls.client_user_id, cls.monitor_user_id, cls.admin_user_id, cls.other_client_id))
                conn.commit()
        finally:
            cls.pool.putconn(conn)
            cls.pool.closeall()
    
    def test_moderation_actions_visibility_rls(self):
        """Test moderation actions RLS visibility matches route guards"""
        conn = self.pool.getconn()
        try:
            with conn.cursor() as cur:
                # Create moderation actions for different users
                cur.execute("""
                    INSERT INTO moderation_actions 
                    (actor_id, target_kind, target_id, action, reason, reason_code)
                    VALUES 
                    (%s, 'profile', %s, 'block', 'Test action 1', 'spam'),
                    (%s, 'profile', %s, 'warn', 'Test action 2', 'inappropriate')
                """, (self.monitor_user_id, self.client_user_id, 
                      self.monitor_user_id, self.other_client_id))
                
                # Test client can only see actions against them
                cur.execute("SET app.current_user_id = %s", (self.client_user_id,))
                cur.execute("SELECT COUNT(*) FROM moderation_actions WHERE target_id = %s", 
                           (self.client_user_id,))
                client_own_count = cur.fetchone()[0]
                assert client_own_count >= 1, "Client should see actions against themselves"
                
                cur.execute("SELECT COUNT(*) FROM moderation_actions WHERE target_id = %s", 
                           (self.other_client_id,))
                client_other_count = cur.fetchone()[0]
                assert client_other_count == 0, "Client should not see actions against others"
                
                # Test monitor can see all actions
                cur.execute("SET app.current_user_id = %s", (self.monitor_user_id,))
                cur.execute("SELECT COUNT(*) FROM moderation_actions WHERE target_id IN (%s, %s)",
                           (self.client_user_id, self.other_client_id))
                monitor_count = cur.fetchone()[0]
                assert monitor_count >= 2, "Monitor should see all actions"
                
        finally:
            self.pool.putconn(conn)
    
    def test_user_restrictions_visibility_rls(self):
        """Test user restrictions RLS matches authorization logic"""
        conn = self.pool.getconn()
        try:
            with conn.cursor() as cur:
                # Create restrictions for different users
                cur.execute("""
                    INSERT INTO user_restrictions 
                    (user_id, restriction_type, reason_code, applied_by, status)
                    VALUES 
                    (%s, 'block', 'spam', %s, 'active'),
                    (%s, 'suspend', 'harassment', %s, 'active')
                """, (self.client_user_id, self.monitor_user_id,
                      self.other_client_id, self.monitor_user_id))
                
                # Test client can only see their own restrictions
                cur.execute("SET app.current_user_id = %s", (self.client_user_id,))
                cur.execute("SELECT COUNT(*) FROM user_restrictions WHERE user_id = %s", 
                           (self.client_user_id,))
                client_own_count = cur.fetchone()[0]
                assert client_own_count >= 1, "Client should see their own restrictions"
                
                cur.execute("SELECT COUNT(*) FROM user_restrictions WHERE user_id = %s", 
                           (self.other_client_id,))
                client_other_count = cur.fetchone()[0]
                assert client_other_count == 0, "Client should not see other restrictions"
                
                # Test monitor can see all restrictions
                cur.execute("SET app.current_user_id = %s", (self.monitor_user_id,))
                cur.execute("SELECT COUNT(*) FROM user_restrictions WHERE user_id IN (%s, %s)",
                           (self.client_user_id, self.other_client_id))
                monitor_count = cur.fetchone()[0]
                assert monitor_count >= 2, "Monitor should see all restrictions"
                
        finally:
            self.pool.putconn(conn)
    
    def test_audit_log_admin_only_rls(self):
        """Test audit log is admin-only via RLS"""
        conn = self.pool.getconn()
        try:
            with conn.cursor() as cur:
                # Test client cannot see audit logs
                cur.execute("SET app.current_user_id = %s", (self.client_user_id,))
                cur.execute("SELECT COUNT(*) FROM audit_log")
                client_count = cur.fetchone()[0]
                assert client_count == 0, "Client should not see any audit logs"
                
                # Test monitor cannot see audit logs
                cur.execute("SET app.current_user_id = %s", (self.monitor_user_id,))
                cur.execute("SELECT COUNT(*) FROM audit_log")
                monitor_count = cur.fetchone()[0]
                assert monitor_count == 0, "Monitor should not see audit logs"
                
                # Test admin can see audit logs
                cur.execute("SET app.current_user_id = %s", (self.admin_user_id,))
                cur.execute("SELECT COUNT(*) FROM audit_log")
                admin_count = cur.fetchone()[0]
                assert admin_count > 0, "Admin should see audit logs"
                
        finally:
            self.pool.putconn(conn)


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])