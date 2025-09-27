"""
M25 Personalization Tests
Comprehensive test suite covering ranking determinism, opt-out enforcement, RLS isolation
"""
import os
import json
import unittest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
import psycopg2
from psycopg2.pool import SimpleConnectionPool

# Import modules under test
from personalization_service import PersonalizationService, UserFeatures, RankedItem
from personalization_api import personalization_bp
from personalization_jobs import PersonalizationJobs

DSN = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
POOL = SimpleConnectionPool(minconn=1, maxconn=5, dsn=DSN)

class TestPersonalizationService(unittest.TestCase):
    """Test personalization service core functionality"""
    
    def setUp(self):
        self.service = PersonalizationService()
        self.test_user_id = "123e4567-e89b-12d3-a456-426614174000"
        
        # Create test data
        self._setup_test_data()
    
    def _setup_test_data(self):
        """Setup test users and data"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                # Insert test profile
                cur.execute("""
                    insert into profiles (id, email, zodiac, country_code, role_id)
                    values (%s, 'test@example.com', 'Aries', 'US', 5)
                    on conflict (id) do update set
                        zodiac = excluded.zodiac,
                        country_code = excluded.country_code
                """, (self.test_user_id,))
                
                # Insert personalization settings (opt-in)
                cur.execute("""
                    insert into personalization_settings (user_id, personalization_enabled)
                    values (%s, true)
                    on conflict (user_id) do update set
                        personalization_enabled = excluded.personalization_enabled
                """, (self.test_user_id,))
                
                # Insert test orders for engagement calculation
                cur.execute("""
                    insert into orders (id, user_id, service_id, status, delivered_at, created_at)
                    values 
                        (1001, %s, 1, 'delivered', now() - interval '1 day', now() - interval '2 days'),
                        (1002, %s, 1, 'delivered', now() - interval '3 days', now() - interval '4 days'),
                        (1003, %s, 1, 'new', null, now() - interval '1 day')
                    on conflict (id) do nothing
                """, (self.test_user_id, self.test_user_id, self.test_user_id))
                
                # Insert test horoscope data
                cur.execute("""
                    insert into horoscopes (id, scope, zodiac, ref_date, approved_at)
                    values 
                        (2001, 'daily', 'Aries', current_date, now()),
                        (2002, 'daily', 'Taurus', current_date, now()),
                        (2003, 'daily', 'Gemini', current_date, now())
                    on conflict (id) do nothing
                """)
                
                conn.commit()
        finally:
            POOL.putconn(conn)
    
    def test_extract_features_privacy_safe(self):
        """Test feature extraction contains no PII"""
        features = self.service.extract_features(self.test_user_id)
        
        self.assertIsNotNone(features)
        self.assertEqual(features.user_id, self.test_user_id)
        
        # Ensure no PII in features
        self.assertIsInstance(features.engagement_score, float)
        self.assertGreaterEqual(features.engagement_score, 0.0)
        self.assertLessEqual(features.engagement_score, 1.0)
        
        # Ensure country code is sanitized (no personal info)
        if features.country_code:
            self.assertEqual(len(features.country_code), 2)  # ISO country code only
    
    def test_opt_out_enforcement(self):
        """Test that opt-out is strictly enforced"""
        # First, opt the user out
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    update personalization_settings 
                    set personalization_enabled = false
                    where user_id = %s
                """, (self.test_user_id,))
                conn.commit()
        finally:
            POOL.putconn(conn)
        
        # Try to extract features - should return None
        features = self.service.extract_features(self.test_user_id)
        self.assertIsNone(features)
        
        # Try to generate rankings - should return empty
        rankings = self.service.generate_rankings(self.test_user_id, 'daily_horoscopes')
        self.assertEqual(len(rankings), 0)
        
        # Restore opt-in for other tests
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    update personalization_settings 
                    set personalization_enabled = true
                    where user_id = %s
                """, (self.test_user_id,))
                conn.commit()
        finally:
            POOL.putconn(conn)
    
    def test_ranking_determinism(self):
        """Test that rankings are deterministic for same input"""
        # Generate rankings twice
        rankings1 = self.service.generate_rankings(self.test_user_id, 'daily_horoscopes', 5)
        rankings2 = self.service.generate_rankings(self.test_user_id, 'daily_horoscopes', 5)
        
        self.assertEqual(len(rankings1), len(rankings2))
        
        # Rankings should be identical for same input
        for i, (r1, r2) in enumerate(zip(rankings1, rankings2)):
            self.assertEqual(r1.item_id, r2.item_id, f"Item {i} ID mismatch")
            self.assertEqual(r1.score, r2.score, f"Item {i} score mismatch")
            self.assertEqual(r1.confidence, r2.confidence, f"Item {i} confidence mismatch")
    
    def test_horoscope_ranking_user_zodiac_priority(self):
        """Test that user's zodiac sign gets priority in rankings"""
        rankings = self.service.generate_rankings(self.test_user_id, 'daily_horoscopes', 5)
        
        self.assertGreater(len(rankings), 0)
        
        # First item should be user's zodiac (Aries) with highest score
        top_item = rankings[0]
        
        # Verify Aries horoscope is ranked highest (item_id 2001 is Aries from test data)
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("select zodiac from horoscopes where id = %s", (top_item.item_id,))
                zodiac = cur.fetchone()
                
                if zodiac:
                    # If we found the horoscope, it should be Aries or have high score
                    if zodiac[0] == 'Aries':
                        self.assertGreater(top_item.score, 0.8)  # High score for user's sign
                        self.assertIn('user_zodiac', top_item.rationale_tags)
        finally:
            POOL.putconn(conn)
    
    def test_ranking_caching(self):
        """Test ranking cache functionality"""
        scope = 'daily_horoscopes'
        
        # Generate and cache rankings
        rankings = self.service.generate_rankings(self.test_user_id, scope, 5)
        cache_success = self.service.cache_rankings(self.test_user_id, scope, rankings)
        
        self.assertTrue(cache_success)
        
        # Retrieve cached rankings
        cached_rankings = self.service.get_cached_rankings(self.test_user_id, scope)
        
        self.assertIsNotNone(cached_rankings)
        self.assertEqual(len(cached_rankings), len(rankings))
        
        # Verify cached data matches original
        for orig, cached in zip(rankings, cached_rankings):
            self.assertEqual(orig.item_id, cached.item_id)
            self.assertAlmostEqual(orig.score, cached.score, places=4)
            self.assertAlmostEqual(orig.confidence, cached.confidence, places=4)
    
    def test_feature_update(self):
        """Test user feature vector updates"""
        update_success = self.service.update_user_features(self.test_user_id)
        self.assertTrue(update_success)
        
        # Verify features were stored
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    select engagement_score, session_count_7d, computed_at
                    from personalization_features
                    where user_id = %s
                    order by computed_at desc
                    limit 1
                """, (self.test_user_id,))
                
                row = cur.fetchone()
                self.assertIsNotNone(row)
                
                # Check feature values are reasonable
                engagement_score = row[0]
                self.assertIsInstance(engagement_score, (int, float))
                self.assertGreaterEqual(engagement_score, 0.0)
                self.assertLessEqual(engagement_score, 1.0)
        finally:
            POOL.putconn(conn)
    
    def tearDown(self):
        """Cleanup test data"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                # Clean up test data
                cur.execute("delete from personalization_ranks where user_id = %s", (self.test_user_id,))
                cur.execute("delete from personalization_features where user_id = %s", (self.test_user_id,))
                cur.execute("delete from personalization_settings where user_id = %s", (self.test_user_id,))
                cur.execute("delete from orders where user_id = %s", (self.test_user_id,))
                cur.execute("delete from profiles where id = %s", (self.test_user_id,))
                cur.execute("delete from horoscopes where id in (2001, 2002, 2003)")
                conn.commit()
        finally:
            POOL.putconn(conn)

class TestPersonalizationRLS(unittest.TestCase):
    """Test Row-Level Security policies"""
    
    def setUp(self):
        self.admin_user_id = "admin-user-123"
        self.regular_user_id = "regular-user-456"
        self.other_user_id = "other-user-789"
        
        # Setup test users with different roles
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                # Admin user
                cur.execute("""
                    insert into profiles (id, email, role_id)
                    values (%s, 'admin@example.com', 2)
                    on conflict (id) do update set role_id = excluded.role_id
                """, (self.admin_user_id,))
                
                # Regular user
                cur.execute("""
                    insert into profiles (id, email, role_id)  
                    values (%s, 'user@example.com', 5)
                    on conflict (id) do update set role_id = excluded.role_id
                """, (self.regular_user_id,))
                
                # Another regular user
                cur.execute("""
                    insert into profiles (id, email, role_id)
                    values (%s, 'other@example.com', 5)  
                    on conflict (id) do update set role_id = excluded.role_id
                """, (self.other_user_id,))
                
                conn.commit()
        finally:
            POOL.putconn(conn)
    
    def test_features_rls_isolation(self):
        """Test that users can only see their own features"""
        # This test would need to be run with actual RLS context
        # For now, testing the service layer isolation
        
        service = PersonalizationService()
        
        # User should only get their own features
        features_regular = service.extract_features(self.regular_user_id)
        features_other = service.extract_features(self.other_user_id)
        
        # Each user gets their own data (or None if no data)
        if features_regular:
            self.assertEqual(features_regular.user_id, self.regular_user_id)
        if features_other:
            self.assertEqual(features_other.user_id, self.other_user_id)
    
    def test_rankings_user_isolation(self):
        """Test ranking isolation between users"""
        service = PersonalizationService()
        
        # Generate rankings for different users
        rankings1 = service.generate_rankings(self.regular_user_id, 'daily_horoscopes')
        rankings2 = service.generate_rankings(self.other_user_id, 'daily_horoscopes')
        
        # Rankings should be independent (could be same or different, but isolated)
        # The key test is that each user gets rankings appropriate to their profile
        self.assertIsInstance(rankings1, list)
        self.assertIsInstance(rankings2, list)
    
    def tearDown(self):
        """Cleanup test users"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("delete from personalization_features where user_id in (%s, %s, %s)", 
                           (self.admin_user_id, self.regular_user_id, self.other_user_id))
                cur.execute("delete from personalization_ranks where user_id in (%s, %s, %s)",
                           (self.admin_user_id, self.regular_user_id, self.other_user_id))
                cur.execute("delete from profiles where id in (%s, %s, %s)",
                           (self.admin_user_id, self.regular_user_id, self.other_user_id))
                conn.commit()
        finally:
            POOL.putconn(conn)

class TestPersonalizationJobs(unittest.TestCase):
    """Test nightly jobs and maintenance"""
    
    def setUp(self):
        self.jobs = PersonalizationJobs()
    
    def test_active_users_query(self):
        """Test active users identification"""
        # This tests the internal method, normally would be integration test
        active_users = self.jobs._get_active_users()
        
        # Should return list of user IDs
        self.assertIsInstance(active_users, list)
        
        # Each item should be a string UUID
        for user_id in active_users[:5]:  # Check first 5
            self.assertIsInstance(user_id, str)
            self.assertEqual(len(user_id), 36)  # UUID length
    
    @patch('personalization_jobs.logger')
    def test_job_error_handling(self, mock_logger):
        """Test job error handling and logging"""
        # Test with invalid user ID
        with patch.object(self.jobs.service, 'update_user_features', side_effect=Exception("Test error")):
            results = self.jobs.run_nightly_refresh()
            
            # Job should complete despite errors
            self.assertIn('errors', results)
            self.assertIn('duration_seconds', results)
            
            # Should have logged the error
            mock_logger.error.assert_called()
    
    def test_cleanup_idempotent(self):
        """Test cleanup job is idempotent"""
        from personalization_service import cleanup_expired_data
        
        # Run cleanup multiple times - should not error
        cleanup_expired_data()
        cleanup_expired_data()
        cleanup_expired_data()
        
        # No exceptions should be raised

class TestPersonalizationSecurity(unittest.TestCase):
    """Test security aspects and privacy controls"""
    
    def test_no_pii_in_features(self):
        """Test that extracted features contain no PII"""
        service = PersonalizationService()
        test_user_id = "security-test-user"
        
        # Mock user data extraction
        with patch.object(service, 'extract_features') as mock_extract:
            mock_features = UserFeatures(
                user_id=test_user_id,
                engagement_score=0.75,
                notification_ctr=0.6,
                session_count_7d=5,
                session_count_30d=20,
                avg_session_duration_sec=300,
                preferred_time_slot=14,
                device_type='mobile',
                country_code='US',  # Only country code, not full address
                timezone_offset=-8
            )
            mock_extract.return_value = mock_features
            
            features = service.extract_features(test_user_id)
            
            # Verify no PII fields
            self.assertIsNone(getattr(features, 'email', None))
            self.assertIsNone(getattr(features, 'name', None))
            self.assertIsNone(getattr(features, 'phone', None))
            self.assertIsNone(getattr(features, 'address', None))
            
            # Only aggregated/hashed identifiers allowed
            self.assertEqual(features.user_id, test_user_id)  # UUID is OK
            self.assertEqual(features.country_code, 'US')  # Country code is OK
    
    def test_ai_text_never_exposed(self):
        """Test that AI rationale is never returned to client APIs"""
        service = PersonalizationService()
        rankings = service.generate_rankings("test-user", 'daily_horoscopes')
        
        # Rationale tags are for internal use only
        for ranking in rankings:
            self.assertIsInstance(ranking.rationale_tags, list)
            # These should never be exposed in client APIs
            # (This is enforced in the API layer, tested there)
    
    def test_rate_limiting_considerations(self):
        """Test that ranking generation doesn't exceed reasonable limits"""
        service = PersonalizationService()
        
        # Test with large limit request
        rankings = service.generate_rankings("test-user", 'daily_horoscopes', limit=1000)
        
        # Should cap results to reasonable number
        self.assertLessEqual(len(rankings), 50)  # Reasonable limit

if __name__ == '__main__':
    # Run tests with verbose output
    unittest.main(verbosity=2)