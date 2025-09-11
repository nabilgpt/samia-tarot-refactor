#!/usr/bin/env python3
"""
M24: Community Features Test Suite
Tests feature flags, comments, reactions, moderation, RLS policies, retention, and rate limits
"""

import unittest
import psycopg2
import json
import uuid
import time
from datetime import datetime, timedelta
from unittest.mock import patch
import requests

# Database connection
DSN = "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

class TestM24FeatureFlags(unittest.TestCase):
    """Test feature flag system"""
    
    def setUp(self):
        self.conn = psycopg2.connect(DSN)
        self.admin_id = str(uuid.uuid4())
        self.client_id = str(uuid.uuid4())
        
        # Create test users
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO profiles (id, email, role_id) VALUES
                (%s, 'admin@test.com', 2),
                (%s, 'client@test.com', 5)
                ON CONFLICT (id) DO UPDATE SET role_id = EXCLUDED.role_id
            """, (self.admin_id, self.client_id))
            self.conn.commit()
    
    def tearDown(self):
        with self.conn.cursor() as cur:
            cur.execute("DELETE FROM profiles WHERE id IN (%s, %s)", (self.admin_id, self.client_id))
            self.conn.commit()
        self.conn.close()
    
    def test_feature_flag_default_disabled(self):
        """Test that community features are disabled by default"""
        with self.conn.cursor() as cur:
            cur.execute("SELECT is_community_enabled()")
            enabled = cur.fetchone()[0]
            self.assertFalse(enabled, "Community should be disabled by default")
    
    def test_feature_flag_toggle(self):
        """Test feature flag toggle functionality"""
        with self.conn.cursor() as cur:
            # Enable community
            cur.execute("""
                UPDATE feature_flags 
                SET is_enabled = true 
                WHERE feature_key = 'community_enabled'
            """)
            
            cur.execute("SELECT is_community_enabled()")
            enabled = cur.fetchone()[0]
            self.assertTrue(enabled, "Community should be enabled after toggle")
            
            # Disable community
            cur.execute("""
                UPDATE feature_flags 
                SET is_enabled = false 
                WHERE feature_key = 'community_enabled'
            """)
            
            cur.execute("SELECT is_community_enabled()")
            enabled = cur.fetchone()[0]
            self.assertFalse(enabled, "Community should be disabled after toggle")

class TestM24CommunityComments(unittest.TestCase):
    """Test community comments functionality"""
    
    def setUp(self):
        self.conn = psycopg2.connect(DSN)
        self.user_id = str(uuid.uuid4())
        self.reader_id = str(uuid.uuid4())
        self.admin_id = str(uuid.uuid4())
        self.order_id = None
        
        # Create test users and order
        with self.conn.cursor() as cur:
            # Enable community features
            cur.execute("""
                UPDATE feature_flags 
                SET is_enabled = true 
                WHERE feature_key = 'community_enabled'
            """)
            
            # Create profiles
            cur.execute("""
                INSERT INTO profiles (id, email, role_id) VALUES
                (%s, 'user@test.com', 5),
                (%s, 'reader@test.com', 3),
                (%s, 'admin@test.com', 2)
                ON CONFLICT (id) DO UPDATE SET role_id = EXCLUDED.role_id
            """, (self.user_id, self.reader_id, self.admin_id))
            
            # Create test service and order
            cur.execute("""
                INSERT INTO services (code, name) VALUES ('test_service', 'Test Service')
                ON CONFLICT (code) DO NOTHING
            """)
            
            cur.execute("""
                INSERT INTO orders (user_id, service_id, status) 
                SELECT %s, id, 'delivered' FROM services WHERE code = 'test_service'
                RETURNING id
            """, (self.user_id,))
            
            self.order_id = cur.fetchone()[0]
            self.conn.commit()
    
    def tearDown(self):
        with self.conn.cursor() as cur:
            # Clean up
            cur.execute("DELETE FROM community_comments WHERE subject_ref LIKE %s", (f"order:{self.order_id}%",))
            cur.execute("DELETE FROM orders WHERE id = %s", (self.order_id,))
            cur.execute("DELETE FROM profiles WHERE id IN (%s, %s, %s)", (self.user_id, self.reader_id, self.admin_id))
            
            # Disable community features
            cur.execute("""
                UPDATE feature_flags 
                SET is_enabled = false 
                WHERE feature_key = 'community_enabled'
            """)
            self.conn.commit()
        self.conn.close()
    
    def test_comment_validation(self):
        """Test comment validation rules"""
        with self.conn.cursor() as cur:
            subject_ref = f"order:{self.order_id}"
            
            # Test subject validation
            self.assertTrue(self._validate_subject(subject_ref), "Valid delivered order should pass validation")
            
            # Test invalid subject
            self.assertFalse(self._validate_subject("order:99999"), "Non-existent order should fail validation")
            
            # Test non-delivered order
            cur.execute("""
                INSERT INTO orders (user_id, service_id, status) 
                SELECT %s, id, 'new' FROM services WHERE code = 'test_service'
                RETURNING id
            """, (self.user_id,))
            
            new_order_id = cur.fetchone()[0]
            self.assertFalse(self._validate_subject(f"order:{new_order_id}"), "Non-delivered order should fail validation")
            
            # Clean up
            cur.execute("DELETE FROM orders WHERE id = %s", (new_order_id,))
            self.conn.commit()
    
    def test_comment_creation_and_moderation(self):
        """Test comment creation and moderation flow"""
        with self.conn.cursor() as cur:
            subject_ref = f"order:{self.order_id}"
            comment_body = "This was a great reading! Very insightful."
            
            # Create comment
            cur.execute("""
                INSERT INTO community_comments (subject_ref, author_id, body, lang, status)
                VALUES (%s, %s, %s, 'en', 'pending')
                RETURNING id, moderation_case_id
            """, (subject_ref, self.user_id, comment_body))
            
            comment_id, case_id = cur.fetchone()
            self.assertIsNotNone(comment_id, "Comment should be created")
            self.assertIsNotNone(case_id, "Moderation case should be auto-created")
            
            # Verify moderation case exists
            cur.execute("""
                SELECT subject_ref, case_type, status
                FROM community_moderation_cases
                WHERE id = %s
            """, (case_id,))
            
            case_info = cur.fetchone()
            self.assertEqual(case_info[0], f"comment:{comment_id}")
            self.assertEqual(case_info[1], "comment")
            self.assertEqual(case_info[2], "pending")
            
            # Apply moderation decision
            cur.execute("""
                SELECT apply_community_moderation_decision(%s, %s, %s, %s)
            """, (case_id, 'approve', self.admin_id, 'Comment approved for public viewing'))
            
            # Verify comment status updated
            cur.execute("SELECT status FROM community_comments WHERE id = %s", (comment_id,))
            status = cur.fetchone()[0]
            self.assertEqual(status, "approved", "Comment should be approved after moderation")
    
    def test_comment_rls_policies(self):
        """Test RLS policies for comments"""
        with self.conn.cursor() as cur:
            subject_ref = f"order:{self.order_id}"
            
            # Create approved comment
            cur.execute("""
                INSERT INTO community_comments (subject_ref, author_id, body, status)
                VALUES (%s, %s, 'Test comment', 'approved')
                RETURNING id
            """, (subject_ref, self.user_id))
            
            comment_id = cur.fetchone()[0]
            
            # Test author can see their own comment
            cur.execute("SET app.current_user_id = %s", (self.user_id,))
            cur.execute("SELECT COUNT(*) FROM community_comments WHERE id = %s", (comment_id,))
            count = cur.fetchone()[0]
            self.assertEqual(count, 1, "Author should see their own comment")
            
            # Test client can see approved comment
            cur.execute("SET app.current_user_id = %s", (self.reader_id,))
            cur.execute("SELECT COUNT(*) FROM community_comments WHERE id = %s AND status = 'approved'", (comment_id,))
            count = cur.fetchone()[0]
            self.assertEqual(count, 1, "Client should see approved comments")
            
            # Test admin can see all comments
            cur.execute("SET app.current_user_id = %s", (self.admin_id,))
            cur.execute("SELECT COUNT(*) FROM community_comments WHERE id = %s", (comment_id,))
            count = cur.fetchone()[0]
            self.assertEqual(count, 1, "Admin should see all comments")
    
    def _validate_subject(self, subject_ref):
        """Helper to validate subject reference"""
        with self.conn.cursor() as cur:
            cur.execute("SELECT validate_community_subject(%s)", (subject_ref,))
            return cur.fetchone()[0]

class TestM24CommunityReactions(unittest.TestCase):
    """Test community reactions functionality"""
    
    def setUp(self):
        self.conn = psycopg2.connect(DSN)
        self.user_id = str(uuid.uuid4())
        self.other_user_id = str(uuid.uuid4())
        self.order_id = None
        
        with self.conn.cursor() as cur:
            # Enable community features
            cur.execute("""
                UPDATE feature_flags 
                SET is_enabled = true 
                WHERE feature_key = 'community_enabled'
            """)
            
            # Create profiles
            cur.execute("""
                INSERT INTO profiles (id, email, role_id) VALUES
                (%s, 'user1@test.com', 5),
                (%s, 'user2@test.com', 5)
                ON CONFLICT (id) DO UPDATE SET role_id = EXCLUDED.role_id
            """, (self.user_id, self.other_user_id))
            
            # Create test order
            cur.execute("""
                INSERT INTO orders (user_id, service_id, status) 
                SELECT %s, id, 'delivered' FROM services WHERE code = 'test_service'
                RETURNING id
            """, (self.user_id,))
            
            self.order_id = cur.fetchone()[0]
            self.conn.commit()
    
    def tearDown(self):
        with self.conn.cursor() as cur:
            cur.execute("DELETE FROM community_reactions WHERE subject_ref LIKE %s", (f"order:{self.order_id}%",))
            cur.execute("DELETE FROM orders WHERE id = %s", (self.order_id,))
            cur.execute("DELETE FROM profiles WHERE id IN (%s, %s)", (self.user_id, self.other_user_id))
            
            # Disable community features
            cur.execute("""
                UPDATE feature_flags 
                SET is_enabled = false 
                WHERE feature_key = 'community_enabled'
            """)
            self.conn.commit()
        self.conn.close()
    
    def test_reaction_creation_and_uniqueness(self):
        """Test reaction creation and uniqueness constraints"""
        with self.conn.cursor() as cur:
            subject_ref = f"order:{self.order_id}"
            
            # Create first reaction
            cur.execute("""
                INSERT INTO community_reactions (subject_ref, author_id, kind)
                VALUES (%s, %s, 'like')
                RETURNING id
            """, (subject_ref, self.user_id))
            
            reaction_id = cur.fetchone()[0]
            self.assertIsNotNone(reaction_id, "First reaction should be created")
            
            # Try to create duplicate reaction (should fail or be ignored)
            try:
                cur.execute("""
                    INSERT INTO community_reactions (subject_ref, author_id, kind)
                    VALUES (%s, %s, 'like')
                """, (subject_ref, self.user_id))
                self.fail("Duplicate reaction should not be allowed")
            except psycopg2.IntegrityError:
                # Expected behavior
                self.conn.rollback()
            
            # Create different reaction type from same user
            cur.execute("""
                INSERT INTO community_reactions (subject_ref, author_id, kind)
                VALUES (%s, %s, 'insightful')
                RETURNING id
            """, (subject_ref, self.user_id))
            
            reaction_id2 = cur.fetchone()[0]
            self.assertIsNotNone(reaction_id2, "Different reaction type should be allowed")
            
            # Create same reaction type from different user
            cur.execute("""
                INSERT INTO community_reactions (subject_ref, author_id, kind)
                VALUES (%s, %s, 'like')
                RETURNING id
            """, (subject_ref, self.other_user_id))
            
            reaction_id3 = cur.fetchone()[0]
            self.assertIsNotNone(reaction_id3, "Same reaction from different user should be allowed")

class TestM24CommunityFlags(unittest.TestCase):
    """Test community flagging functionality"""
    
    def setUp(self):
        self.conn = psycopg2.connect(DSN)
        self.user_id = str(uuid.uuid4())
        self.monitor_id = str(uuid.uuid4())
        self.comment_id = None
        
        with self.conn.cursor() as cur:
            # Enable community features
            cur.execute("""
                UPDATE feature_flags 
                SET is_enabled = true 
                WHERE feature_key = 'community_enabled'
            """)
            
            # Create profiles
            cur.execute("""
                INSERT INTO profiles (id, email, role_id) VALUES
                (%s, 'user@test.com', 5),
                (%s, 'monitor@test.com', 4)
                ON CONFLICT (id) DO UPDATE SET role_id = EXCLUDED.role_id
            """, (self.user_id, self.monitor_id))
            
            # Create test comment
            cur.execute("""
                INSERT INTO community_comments (subject_ref, author_id, body, status)
                VALUES ('test:123', %s, 'Test comment', 'approved')
                RETURNING id
            """, (self.user_id,))
            
            self.comment_id = cur.fetchone()[0]
            self.conn.commit()
    
    def tearDown(self):
        with self.conn.cursor() as cur:
            cur.execute("DELETE FROM community_flags WHERE subject_ref LIKE %s", (f"comment:{self.comment_id}%",))
            cur.execute("DELETE FROM community_moderation_cases WHERE subject_ref LIKE %s", (f"comment:{self.comment_id}%",))
            cur.execute("DELETE FROM community_comments WHERE id = %s", (self.comment_id,))
            cur.execute("DELETE FROM profiles WHERE id IN (%s, %s)", (self.user_id, self.monitor_id))
            
            # Disable community features
            cur.execute("""
                UPDATE feature_flags 
                SET is_enabled = false 
                WHERE feature_key = 'community_enabled'
            """)
            self.conn.commit()
        self.conn.close()
    
    def test_flag_creation_and_moderation_case(self):
        """Test flag creation automatically creates moderation case"""
        with self.conn.cursor() as cur:
            subject_ref = f"comment:{self.comment_id}"
            
            # Create flag
            cur.execute("""
                INSERT INTO community_flags (subject_ref, reason, severity, created_by, description)
                VALUES (%s, 'inappropriate', 'medium', %s, 'This comment contains inappropriate content')
                RETURNING id
            """, (subject_ref, self.user_id))
            
            flag_id = cur.fetchone()[0]
            self.assertIsNotNone(flag_id, "Flag should be created")
            
            # Check if moderation case was auto-created
            cur.execute("""
                SELECT id, case_type, taxonomy_reason, priority
                FROM community_moderation_cases
                WHERE subject_ref = %s AND case_type = 'flag'
            """, (subject_ref,))
            
            case_info = cur.fetchone()
            self.assertIsNotNone(case_info, "Moderation case should be auto-created")
            self.assertEqual(case_info[1], "flag")
            self.assertEqual(case_info[2], "inappropriate")
            self.assertEqual(case_info[3], "medium")

class TestM24ModerationIntegration(unittest.TestCase):
    """Test integration with M21 moderation pipeline"""
    
    def setUp(self):
        self.conn = psycopg2.connect(DSN)
        self.monitor_id = str(uuid.uuid4())
        self.user_id = str(uuid.uuid4())
        
        with self.conn.cursor() as cur:
            # Enable community features
            cur.execute("""
                UPDATE feature_flags 
                SET is_enabled = true 
                WHERE feature_key = 'community_enabled'
            """)
            
            # Create profiles
            cur.execute("""
                INSERT INTO profiles (id, email, role_id) VALUES
                (%s, 'monitor@test.com', 4),
                (%s, 'user@test.com', 5)
                ON CONFLICT (id) DO UPDATE SET role_id = EXCLUDED.role_id
            """, (self.monitor_id, self.user_id))
            self.conn.commit()
    
    def tearDown(self):
        with self.conn.cursor() as cur:
            cur.execute("DELETE FROM community_moderation_cases WHERE created_at > now() - INTERVAL '1 hour'")
            cur.execute("DELETE FROM profiles WHERE id IN (%s, %s)", (self.monitor_id, self.user_id))
            
            # Disable community features
            cur.execute("""
                UPDATE feature_flags 
                SET is_enabled = false 
                WHERE feature_key = 'community_enabled'
            """)
            self.conn.commit()
        self.conn.close()
    
    def test_moderation_decision_application(self):
        """Test applying moderation decisions"""
        with self.conn.cursor() as cur:
            # Create moderation case
            cur.execute("""
                SELECT create_community_moderation_case(%s, %s, %s, %s)
            """, ('test:123', 'comment', 'inappropriate_content', 'medium'))
            
            case_id = cur.fetchone()[0]
            self.assertIsNotNone(case_id, "Moderation case should be created")
            
            # Apply decision
            cur.execute("""
                SELECT apply_community_moderation_decision(%s, %s, %s, %s)
            """, (case_id, 'remove', self.monitor_id, 'Content violates community guidelines'))
            
            # Verify case status
            cur.execute("""
                SELECT status, decision, decided_by, decision_notes
                FROM community_moderation_cases
                WHERE id = %s
            """, (case_id,))
            
            case_info = cur.fetchone()
            self.assertEqual(case_info[0], "resolved")
            self.assertEqual(case_info[1], "remove")
            self.assertEqual(case_info[2], self.monitor_id)
            self.assertIn("guidelines", case_info[3])

class TestM24RetentionAndCleanup(unittest.TestCase):
    """Test retention policies and cleanup jobs"""
    
    def setUp(self):
        self.conn = psycopg2.connect(DSN)
        self.user_id = str(uuid.uuid4())
        
        with self.conn.cursor() as cur:
            # Enable community features
            cur.execute("""
                UPDATE feature_flags 
                SET is_enabled = true 
                WHERE feature_key = 'community_enabled'
            """)
            
            # Create profile
            cur.execute("""
                INSERT INTO profiles (id, email, role_id) VALUES
                (%s, 'user@test.com', 5)
                ON CONFLICT (id) DO UPDATE SET role_id = EXCLUDED.role_id
            """, (self.user_id,))
            self.conn.commit()
    
    def tearDown(self):
        with self.conn.cursor() as cur:
            cur.execute("DELETE FROM profiles WHERE id = %s", (self.user_id,))
            
            # Disable community features
            cur.execute("""
                UPDATE feature_flags 
                SET is_enabled = false 
                WHERE feature_key = 'community_enabled'
            """)
            self.conn.commit()
        self.conn.close()
    
    def test_retention_cleanup_job(self):
        """Test retention cleanup removes old content"""
        with self.conn.cursor() as cur:
            # Create old comment
            old_date = datetime.now() - timedelta(days=400)
            cur.execute("""
                INSERT INTO community_comments (subject_ref, author_id, body, status, created_at)
                VALUES ('test:old', %s, 'Old comment', 'approved', %s)
                RETURNING id
            """, (self.user_id, old_date))
            
            old_comment_id = cur.fetchone()[0]
            
            # Create recent comment
            cur.execute("""
                INSERT INTO community_comments (subject_ref, author_id, body, status)
                VALUES ('test:new', %s, 'New comment', 'approved')
                RETURNING id
            """, (self.user_id,))
            
            new_comment_id = cur.fetchone()[0]
            
            # Run retention cleanup (365 days)
            cur.execute("SELECT run_community_retention_cleanup(365)")
            result = cur.fetchone()[0]
            
            # Verify old comment was deleted
            cur.execute("SELECT COUNT(*) FROM community_comments WHERE id = %s", (old_comment_id,))
            old_count = cur.fetchone()[0]
            self.assertEqual(old_count, 0, "Old comment should be deleted")
            
            # Verify new comment was kept
            cur.execute("SELECT COUNT(*) FROM community_comments WHERE id = %s", (new_comment_id,))
            new_count = cur.fetchone()[0]
            self.assertEqual(new_count, 1, "New comment should be kept")
            
            # Verify result structure
            self.assertIn("deleted_counts", result)
            self.assertIn("comments", result["deleted_counts"])
    
    def test_anomaly_detection(self):
        """Test anomaly detection for spam patterns"""
        with self.conn.cursor() as cur:
            # Create multiple comments from same user (potential spam)
            for i in range(60):  # Above threshold of 50
                cur.execute("""
                    INSERT INTO community_comments (subject_ref, author_id, body, status)
                    VALUES (%s, %s, %s, 'pending')
                """, (f"test:spam{i}", self.user_id, f"Spam comment {i}"))
            
            # Run anomaly detection
            cur.execute("SELECT detect_community_anomalies(24)")
            result = cur.fetchone()[0]
            
            # Verify anomalies were detected
            self.assertIn("detected_anomalies", result)
            detected = result["detected_anomalies"]
            
            # Should detect spam user
            self.assertGreater(detected.get("spam_users", 0), 0, "Should detect spam users")

class TestM24RateLimiting(unittest.TestCase):
    """Test rate limiting functionality"""
    
    def setUp(self):
        self.conn = psycopg2.connect(DSN)
        self.user_id = str(uuid.uuid4())
        
        with self.conn.cursor() as cur:
            # Enable community features
            cur.execute("""
                UPDATE feature_flags 
                SET is_enabled = true 
                WHERE feature_key = 'community_enabled'
            """)
            
            # Create profile
            cur.execute("""
                INSERT INTO profiles (id, email, role_id) VALUES
                (%s, 'user@test.com', 5)
                ON CONFLICT (id) DO UPDATE SET role_id = EXCLUDED.role_id
            """, (self.user_id,))
            self.conn.commit()
    
    def tearDown(self):
        with self.conn.cursor() as cur:
            cur.execute("DELETE FROM community_comments WHERE author_id = %s", (self.user_id,))
            cur.execute("DELETE FROM profiles WHERE id = %s", (self.user_id,))
            
            # Disable community features
            cur.execute("""
                UPDATE feature_flags 
                SET is_enabled = false 
                WHERE feature_key = 'community_enabled'
            """)
            self.conn.commit()
        self.conn.close()
    
    def test_rate_limiting_comments(self):
        """Test rate limiting for comments"""
        with self.conn.cursor() as cur:
            # Check initial rate limit (should be allowed)
            cur.execute("SELECT check_community_rate_limit(%s, %s, %s, %s)", 
                       (self.user_id, 'comment', 60, 5))  # 5 comments per hour
            allowed = cur.fetchone()[0]
            self.assertTrue(allowed, "Should be allowed initially")
            
            # Create comments up to limit
            for i in range(5):
                cur.execute("""
                    INSERT INTO community_comments (subject_ref, author_id, body, status)
                    VALUES (%s, %s, %s, 'pending')
                """, (f"test:rate{i}", self.user_id, f"Rate test comment {i}"))
            
            # Check rate limit after reaching limit
            cur.execute("SELECT check_community_rate_limit(%s, %s, %s, %s)", 
                       (self.user_id, 'comment', 60, 5))
            allowed = cur.fetchone()[0]
            self.assertFalse(allowed, "Should be blocked after reaching limit")

class TestM24HealthMetrics(unittest.TestCase):
    """Test community health metrics"""
    
    def setUp(self):
        self.conn = psycopg2.connect(DSN)
        
        with self.conn.cursor() as cur:
            # Enable community features
            cur.execute("""
                UPDATE feature_flags 
                SET is_enabled = true 
                WHERE feature_key = 'community_enabled'
            """)
            self.conn.commit()
    
    def tearDown(self):
        with self.conn.cursor() as cur:
            # Disable community features
            cur.execute("""
                UPDATE feature_flags 
                SET is_enabled = false 
                WHERE feature_key = 'community_enabled'
            """)
            self.conn.commit()
        self.conn.close()
    
    def test_health_metrics_structure(self):
        """Test health metrics function returns proper structure"""
        with self.conn.cursor() as cur:
            cur.execute("SELECT get_community_health_metrics(24)")
            metrics = cur.fetchone()[0]
            
            # Verify structure
            self.assertIn("period_hours", metrics)
            self.assertIn("comments", metrics)
            self.assertIn("reactions", metrics)
            self.assertIn("flags", metrics)
            self.assertIn("moderation", metrics)
            self.assertIn("users", metrics)
            
            # Verify comment metrics structure
            comment_metrics = metrics["comments"]
            self.assertIn("total", comment_metrics)
            self.assertIn("pending", comment_metrics)
            self.assertIn("approved", comment_metrics)
            self.assertIn("approval_rate", comment_metrics)

if __name__ == '__main__':
    # Run all tests
    unittest.main(verbosity=2)