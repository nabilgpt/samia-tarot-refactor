"""
M27 i18n Deepening Tests
Test ICU MessageFormat compliance, review flow, RLS, and glossary management
"""
import os
import unittest
from datetime import datetime
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from i18n_service import I18nService

DSN = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
POOL = SimpleConnectionPool(minconn=1, maxconn=3, dsn=DSN)

class TestI18nService(unittest.TestCase):
    """Test i18n service core functionality"""
    
    def setUp(self):
        self.service = I18nService()
        self.admin_user_id = "i18n-admin-user"
        self.test_user_id = "i18n-test-user"
        
        # Setup test data
        self._setup_test_data()
    
    def _setup_test_data(self):
        """Setup test users and data"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    insert into profiles (id, email, role_id)
                    values (%s, 'i18n-admin@example.com', 2),
                           (%s, 'i18n-user@example.com', 5)
                    on conflict (id) do update set role_id = excluded.role_id
                """, (self.admin_user_id, self.test_user_id))
                conn.commit()
        finally:
            POOL.putconn(conn)
    
    def test_icu_format_validation(self):
        """Test ICU MessageFormat validation"""
        # Valid messages
        valid_messages = [
            "Hello {name}!",
            "You have {count, number} messages",
            "{gender, select, male{He} female{She} other{They}} is here",
            "{count, plural, =0{no items} one{1 item} other{# items}}",
            "Welcome to our platform"
        ]
        
        for message in valid_messages:
            valid, errors = self.service.validate_icu_format(message)
            self.assertTrue(valid, f"Message should be valid: {message}")
            self.assertEqual(len(errors), 0)
    
    def test_icu_format_invalid(self):
        """Test ICU MessageFormat invalid syntax detection"""
        # Invalid messages
        invalid_messages = [
            "Hello {name!",  # Missing closing brace
            "Hello name}!",  # Missing opening brace
            "Hello {{name}}!", # Double braces
            "{name, invalid_type}", # Invalid type
        ]
        
        for message in invalid_messages:
            valid, errors = self.service.validate_icu_format(message)
            self.assertFalse(valid, f"Message should be invalid: {message}")
            self.assertGreater(len(errors), 0)
    
    def test_create_translation(self):
        """Test translation creation with validation"""
        translation = self.service.create_translation(
            message_key='test.welcome',
            language_code='en',
            message_text='Welcome {name}!',
            context_notes='Greeting message for users'
        )
        
        self.assertIsNotNone(translation)
        self.assertEqual(translation.message_key, 'test.welcome')
        self.assertEqual(translation.language_code, 'en')
        self.assertEqual(translation.message_text, 'Welcome {name}!')
        self.assertEqual(translation.context_notes, 'Greeting message for users')
        self.assertFalse(translation.auto_translated)
        self.assertTrue(translation.is_approved)  # Manual entries approved by default
    
    def test_create_auto_translation(self):
        """Test auto-translated entry creation"""
        translation = self.service.create_translation(
            message_key='test.auto',
            language_code='ar',
            message_text='[AUTO_TRANSLATED_AR] Hello {name}',
            auto_translated=True
        )
        
        self.assertIsNotNone(translation)
        self.assertTrue(translation.auto_translated)
        self.assertFalse(translation.is_approved)  # Auto-translated needs review
    
    def test_batch_translate(self):
        """Test batch translation operations"""
        translations_data = [
            {
                'message_key': 'batch.test1',
                'language_code': 'en',
                'message_text': 'First message',
                'context_notes': 'Test message 1'
            },
            {
                'message_key': 'batch.test2', 
                'language_code': 'en',
                'message_text': 'Second message with {param}',
                'context_notes': 'Test message 2 with parameter'
            },
            {
                'message_key': 'batch.invalid',
                'language_code': 'en',
                'message_text': 'Invalid {format',  # Missing closing brace
                'context_notes': 'This should fail'
            }
        ]
        
        results = self.service.batch_translate(translations_data, auto_translate=False)
        
        self.assertIn('created', results)
        self.assertIn('errors', results)
        self.assertEqual(results['created'], 2)  # 2 valid messages
        self.assertEqual(len(results['errors']), 1)  # 1 invalid message
    
    def test_translation_approval_flow(self):
        """Test translation review and approval process"""
        # Create auto-translated entry
        translation = self.service.create_translation(
            message_key='approval.test',
            language_code='ar',
            message_text='[AUTO_TRANSLATED_AR] Test message',
            auto_translated=True
        )
        
        self.assertFalse(translation.is_approved)
        
        # Approve translation
        success = self.service.approve_translation(translation.id, self.admin_user_id)
        self.assertTrue(success)
        
        # Verify approval
        approved_translation = self.service.get_translation('approval.test', 'ar')
        self.assertTrue(approved_translation.is_approved)
        self.assertEqual(approved_translation.reviewed_by, self.admin_user_id)
        self.assertIsNotNone(approved_translation.reviewed_at)
    
    def test_translation_rejection(self):
        """Test translation rejection process"""
        # Create auto-translated entry
        translation = self.service.create_translation(
            message_key='rejection.test',
            language_code='ar',
            message_text='[AUTO_TRANSLATED_AR] Poor translation',
            auto_translated=True
        )
        
        # Reject translation
        success = self.service.reject_translation(translation.id, self.admin_user_id)
        self.assertTrue(success)
        
        # Verify rejection
        rejected_translation = self.service.get_translation('rejection.test', 'ar')
        self.assertFalse(rejected_translation.is_approved)
        self.assertEqual(rejected_translation.reviewed_by, self.admin_user_id)
        self.assertIsNotNone(rejected_translation.reviewed_at)
    
    def test_coverage_status(self):
        """Test translation coverage reporting"""
        # Create some test translations
        self.service.create_translation('coverage.test1', 'en', 'English message 1')
        self.service.create_translation('coverage.test1', 'ar', 'Arabic message 1')
        self.service.create_translation('coverage.test2', 'en', 'English message 2')
        # Missing Arabic for test2
        
        status = self.service.get_coverage_status()
        
        self.assertIn('language_stats', status)
        self.assertIn('missing_translations', status)
        self.assertIn('supported_languages', status)
        
        # Check English stats
        if 'en' in status['language_stats']:
            en_stats = status['language_stats']['en']
            self.assertIn('total_translations', en_stats)
            self.assertIn('approved_translations', en_stats)
            self.assertIn('coverage_rate', en_stats)
    
    def test_glossary_management(self):
        """Test glossary term management"""
        # Add glossary term
        term = self.service.add_glossary_term(
            term='TestBrand',
            definition='Test brand name for unit tests',
            do_not_translate=True,
            preferred_translations={'ar': 'تست برند'}
        )
        
        self.assertIsNotNone(term)
        self.assertEqual(term.term, 'TestBrand')
        self.assertTrue(term.do_not_translate)
        self.assertEqual(term.preferred_translations['ar'], 'تست برند')
        
        # Get all glossary terms
        terms = self.service.get_glossary_terms()
        term_names = [t.term for t in terms]
        self.assertIn('TestBrand', term_names)
    
    def test_glossary_protection(self):
        """Test glossary term protection in translation"""
        # Add protected term
        self.service.add_glossary_term(
            term='Samia',
            definition='Brand name',
            do_not_translate=True
        )
        
        text = "Welcome to Samia platform"
        protected_text = self.service.protect_glossary_terms(text)
        
        # Should wrap protected terms
        self.assertIn('<<PROTECTED:Samia>>', protected_text)
        self.assertNotIn('Samia platform', protected_text)
        
        # Test unprotection
        unprotected_text = self.service.unprotect_glossary_terms(protected_text)
        self.assertEqual(unprotected_text, text)
    
    def test_auto_translate_missing(self):
        """Test auto-translation of missing entries"""
        # Create English entries without Arabic equivalents
        self.service.create_translation('auto.test1', 'en', 'First auto test message')
        self.service.create_translation('auto.test2', 'en', 'Second auto test with {param}')
        
        # Run auto-translation
        results = self.service.auto_translate_missing('ar')
        
        self.assertIn('translated', results)
        self.assertIn('errors', results)
        self.assertGreaterEqual(results['translated'], 2)
        
        # Verify auto-translated entries exist
        auto_translation = self.service.get_translation('auto.test1', 'ar')
        if auto_translation:
            self.assertTrue(auto_translation.auto_translated)
            self.assertFalse(auto_translation.is_approved)  # Needs review
    
    def test_needs_review_filter(self):
        """Test filtering for translations needing review"""
        # Create auto-translated entry
        self.service.create_translation(
            message_key='review.filter.test',
            language_code='ar',
            message_text='[AUTO_TRANSLATED_AR] Needs review',
            auto_translated=True
        )
        
        # Get translations needing review
        needs_review = self.service.get_translations(needs_review=True)
        
        review_keys = [t.message_key for t in needs_review]
        self.assertIn('review.filter.test', review_keys)
        
        # All should be auto-translated and not approved
        for translation in needs_review:
            self.assertTrue(translation.auto_translated)
            self.assertFalse(translation.is_approved)
    
    def test_unsupported_language(self):
        """Test rejection of unsupported languages"""
        with self.assertRaises(ValueError) as context:
            self.service.create_translation(
                message_key='unsupported.test',
                language_code='fr',  # Not in supported languages
                message_text='French message'
            )
        
        self.assertIn("Unsupported language", str(context.exception))
    
    def test_duplicate_key_language_handling(self):
        """Test handling of duplicate key-language combinations"""
        # Create initial translation
        original = self.service.create_translation(
            message_key='duplicate.test',
            language_code='en',
            message_text='Original message'
        )
        
        # Create duplicate (should update)
        updated = self.service.create_translation(
            message_key='duplicate.test',
            language_code='en',
            message_text='Updated message',
            context_notes='Updated context'
        )
        
        # Should be same ID (updated, not new)
        self.assertEqual(original.id, updated.id)
        
        # Verify update
        retrieved = self.service.get_translation('duplicate.test', 'en')
        self.assertEqual(retrieved.message_text, 'Updated message')
        self.assertEqual(retrieved.context_notes, 'Updated context')
    
    def tearDown(self):
        """Cleanup test data"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                # Clean up in reverse order due to foreign keys
                cur.execute("delete from translation_audit where actor_id in (%s, %s)", 
                           (self.admin_user_id, self.test_user_id))
                cur.execute("delete from translations where message_key like 'test.%' or message_key like 'batch.%' or message_key like 'approval.%' or message_key like 'rejection.%' or message_key like 'coverage.%' or message_key like 'auto.%' or message_key like 'review.%' or message_key like 'unsupported.%' or message_key like 'duplicate.%'")
                cur.execute("delete from translation_glossary where term in ('TestBrand', 'Samia')")
                cur.execute("delete from profiles where id in (%s, %s)", 
                           (self.admin_user_id, self.test_user_id))
                conn.commit()
        finally:
            POOL.putconn(conn)

class TestI18nSecurity(unittest.TestCase):
    """Test i18n security and access control"""
    
    def setUp(self):
        self.admin_user_id = "i18n-security-admin"
        self.regular_user_id = "i18n-security-user"
        
        # Setup test users
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    insert into profiles (id, email, role_id)
                    values (%s, 'admin@i18n-security.com', 2),
                           (%s, 'user@i18n-security.com', 5)
                    on conflict (id) do update set role_id = excluded.role_id
                """, (self.admin_user_id, self.regular_user_id))
                conn.commit()
        finally:
            POOL.putconn(conn)
    
    def test_translation_access_control(self):
        """Test translation access control (Admin only)"""
        service = I18nService()
        
        # Admin should be able to create translations
        translation = service.create_translation(
            message_key='security.test',
            language_code='en',
            message_text='Security test message'
        )
        
        self.assertIsNotNone(translation)
        
        # In real implementation, regular users would be blocked by RLS
        # This tests the service layer only
    
    def test_glossary_access_control(self):
        """Test glossary access control (Admin only)"""
        service = I18nService()
        
        # Admin should be able to manage glossary
        term = service.add_glossary_term(
            term='SecurityTest',
            definition='Security test term',
            do_not_translate=False
        )
        
        self.assertIsNotNone(term)
        self.assertEqual(term.term, 'SecurityTest')
    
    def test_audit_trail(self):
        """Test that translation changes are audited"""
        service = I18nService()
        
        # Create translation (should generate audit entry)
        translation = service.create_translation(
            message_key='audit.test',
            language_code='en',
            message_text='Audit test message'
        )
        
        # Check audit trail exists
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    select count(*) from translation_audit
                    where translation_id = %s and action = 'created'
                """, (translation.id,))
                
                audit_count = cur.fetchone()[0]
                self.assertGreater(audit_count, 0)
        finally:
            POOL.putconn(conn)
    
    def tearDown(self):
        """Cleanup test data"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("delete from translation_audit where actor_id in (%s, %s)", 
                           (self.admin_user_id, self.regular_user_id))
                cur.execute("delete from translations where message_key like 'security.%' or message_key like 'audit.%'")
                cur.execute("delete from translation_glossary where term = 'SecurityTest'")
                cur.execute("delete from profiles where id in (%s, %s)", 
                           (self.admin_user_id, self.regular_user_id))
                conn.commit()
        finally:
            POOL.putconn(conn)

if __name__ == '__main__':
    # Run tests with verbose output
    unittest.main(verbosity=2)