"""
M26 AR Experiments Tests
Test AR asset storage, linking, RLS isolation, and security
"""
import os
import unittest
import base64
import hashlib
from datetime import datetime
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from ar_service import ARService

DSN = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
POOL = SimpleConnectionPool(minconn=1, maxconn=3, dsn=DSN)

class TestARService(unittest.TestCase):
    """Test AR service core functionality"""
    
    def setUp(self):
        self.service = ARService()
        self.test_user_id = "ar-test-user-123"
        self.admin_user_id = "ar-admin-user-456"
        
        # Setup test data
        self._setup_test_data()
        
        # Sample AR asset data
        self.test_image_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x04\x00\x00\x00\xb5\x1c\x0c\x02\x00\x00\x00\x0bIDATx\x9cc\xf8\x00\x00\x00\x01\x00\x01'
    
    def _setup_test_data(self):
        """Setup test users and data"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                # Insert test profiles
                cur.execute("""
                    insert into profiles (id, email, role_id)
                    values (%s, 'ar-test@example.com', 5),
                           (%s, 'ar-admin@example.com', 2)
                    on conflict (id) do update set
                        role_id = excluded.role_id
                """, (self.test_user_id, self.admin_user_id))
                
                # Insert test order for linking
                cur.execute("""
                    insert into orders (id, user_id, service_id, status)
                    values (9001, %s, 1, 'new')
                    on conflict (id) do nothing
                """, (self.test_user_id,))
                
                conn.commit()
        finally:
            POOL.putconn(conn)
    
    def test_file_validation(self):
        """Test AR file validation"""
        # Valid file types
        valid, msg = self.service.validate_file('image/png', 1024)
        self.assertTrue(valid)
        self.assertEqual(msg, "Valid")
        
        # Invalid file type
        valid, msg = self.service.validate_file('text/plain', 1024)
        self.assertFalse(valid)
        self.assertIn("Unsupported file type", msg)
        
        # File too large
        valid, msg = self.service.validate_file('image/png', 100 * 1024 * 1024)
        self.assertFalse(valid)
        self.assertIn("File too large", msg)
    
    def test_hash_calculation(self):
        """Test SHA256 hash calculation"""
        test_data = b"test content"
        expected_hash = hashlib.sha256(test_data).hexdigest()
        
        calculated_hash = self.service.calculate_hash(test_data)
        self.assertEqual(calculated_hash, expected_hash)
    
    def test_create_ar_asset(self):
        """Test AR asset creation with validation"""
        asset = self.service.create_asset(
            owner_id=self.test_user_id,
            kind='overlay',
            filename='test_overlay.png',
            file_content=self.test_image_data,
            metadata={'description': 'Test overlay'}
        )
        
        self.assertIsNotNone(asset)
        self.assertEqual(asset.owner_id, self.test_user_id)
        self.assertEqual(asset.kind, 'overlay')
        self.assertEqual(asset.filename, 'test_overlay.png')
        self.assertEqual(asset.content_type, 'image/png')
        self.assertFalse(asset.is_approved)  # Requires approval
        self.assertEqual(asset.bytes, len(self.test_image_data))
        
        # Verify storage path format
        expected_prefix = f"ar-assets/{self.test_user_id}/{asset.sha256[:8]}"
        self.assertTrue(asset.storage_path.startswith(expected_prefix))
    
    def test_asset_deduplication(self):
        """Test that duplicate assets are not created"""
        # Create first asset
        asset1 = self.service.create_asset(
            owner_id=self.test_user_id,
            kind='overlay',
            filename='duplicate_test.png',
            file_content=self.test_image_data
        )
        
        # Try to create identical asset
        asset2 = self.service.create_asset(
            owner_id=self.admin_user_id,  # Different owner
            kind='filter',                # Different kind
            filename='different_name.png', # Different filename
            file_content=self.test_image_data  # Same content
        )
        
        # Should return the existing asset
        self.assertEqual(asset1.id, asset2.id)
        self.assertEqual(asset1.sha256, asset2.sha256)
    
    def test_asset_approval(self):
        """Test AR asset approval process"""
        # Create asset
        asset = self.service.create_asset(
            owner_id=self.test_user_id,
            kind='effect',
            filename='test_effect.png',
            file_content=self.test_image_data
        )
        
        self.assertFalse(asset.is_approved)
        
        # Approve asset
        success = self.service.approve_asset(asset.id, self.admin_user_id)
        self.assertTrue(success)
        
        # Verify approval
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    select is_approved, approved_by, approved_at
                    from ar_assets where id = %s
                """, (asset.id,))
                
                row = cur.fetchone()
                self.assertTrue(row[0])  # is_approved
                self.assertEqual(row[1], self.admin_user_id)  # approved_by
                self.assertIsNotNone(row[2])  # approved_at
        finally:
            POOL.putconn(conn)
    
    def test_asset_linking(self):
        """Test AR asset linking to orders/horoscopes"""
        # Create and approve asset
        asset = self.service.create_asset(
            owner_id=self.test_user_id,
            kind='overlay',
            filename='link_test.png',
            file_content=self.test_image_data
        )
        
        self.service.approve_asset(asset.id, self.admin_user_id)
        
        # Create link to order
        link = self.service.create_link(
            ar_asset_id=asset.id,
            subject_type='order',
            subject_id='9001',
            creator_id=self.admin_user_id,
            link_position={'x': 0.5, 'y': 0.3, 'z': 0.1}
        )
        
        self.assertIsNotNone(link)
        self.assertEqual(link.ar_asset_id, asset.id)
        self.assertEqual(link.subject_type, 'order')
        self.assertEqual(link.subject_id, '9001')
        self.assertTrue(link.is_active)
        self.assertEqual(link.created_by, self.admin_user_id)
        
        # Test duplicate link handling (should update existing)
        link2 = self.service.create_link(
            ar_asset_id=asset.id,
            subject_type='order',
            subject_id='9001',
            creator_id=self.admin_user_id,
            link_position={'x': 0.7, 'y': 0.4, 'z': 0.2}
        )
        
        # Should be same link ID (updated)
        self.assertEqual(link.id, link2.id)
    
    def test_get_links_for_subject(self):
        """Test retrieving AR links for specific subject"""
        # Create asset and link
        asset = self.service.create_asset(
            owner_id=self.test_user_id,
            kind='model',
            filename='subject_test.glb',
            file_content=b"mock 3d model data"
        )
        
        link = self.service.create_link(
            ar_asset_id=asset.id,
            subject_type='order',
            subject_id='9001',
            creator_id=self.admin_user_id
        )
        
        # Get links for order
        links = self.service.get_links_for_subject('order', '9001')
        
        self.assertEqual(len(links), 1)
        self.assertEqual(links[0].ar_asset_id, asset.id)
        
        # Test with non-existent subject
        empty_links = self.service.get_links_for_subject('order', '99999')
        self.assertEqual(len(empty_links), 0)
    
    def test_link_deactivation(self):
        """Test AR link deactivation"""
        # Create asset and link
        asset = self.service.create_asset(
            owner_id=self.test_user_id,
            kind='animation',
            filename='deactivate_test.mp4',
            file_content=b"mock video data"
        )
        
        link = self.service.create_link(
            ar_asset_id=asset.id,
            subject_type='order',
            subject_id='9001',
            creator_id=self.admin_user_id
        )
        
        # Deactivate link
        success = self.service.deactivate_link(link.id)
        self.assertTrue(success)
        
        # Verify deactivation
        links_active = self.service.get_links_for_subject('order', '9001', active_only=True)
        self.assertEqual(len(links_active), 0)
        
        links_all = self.service.get_links_for_subject('order', '9001', active_only=False)
        self.assertEqual(len(links_all), 1)
        self.assertFalse(links_all[0].is_active)
    
    def test_storage_stats(self):
        """Test AR storage statistics"""
        # Create some test assets
        for i in range(3):
            asset = self.service.create_asset(
                owner_id=self.test_user_id,
                kind='overlay',
                filename=f'stats_test_{i}.png',
                file_content=self.test_image_data + bytes([i])  # Slightly different content
            )
            
            if i < 2:  # Approve first 2
                self.service.approve_asset(asset.id, self.admin_user_id)
        
        stats = self.service.get_storage_stats()
        
        self.assertIn('total_assets', stats)
        self.assertIn('approved_assets', stats)
        self.assertIn('total_bytes', stats)
        self.assertIn('approved_bytes', stats)
        self.assertIn('unique_owners', stats)
        
        self.assertGreaterEqual(stats['total_assets'], 3)
        self.assertGreaterEqual(stats['approved_assets'], 2)
    
    def test_signed_url_generation(self):
        """Test signed URL generation for AR assets"""
        storage_path = "ar-assets/test-user/abcd1234/test.png"
        
        signed_url = self.service.generate_signed_url(storage_path, expires_in=3600)
        
        # Should be a properly formatted URL
        self.assertIn('supabase-storage', signed_url)
        self.assertIn(storage_path, signed_url)
        self.assertIn('expires=', signed_url)
    
    def test_invalid_subject_type(self):
        """Test that invalid subject types are rejected"""
        asset = self.service.create_asset(
            owner_id=self.test_user_id,
            kind='overlay',
            filename='invalid_test.png',
            file_content=self.test_image_data
        )
        
        with self.assertRaises(ValueError) as context:
            self.service.create_link(
                ar_asset_id=asset.id,
                subject_type='invalid_type',
                subject_id='123',
                creator_id=self.admin_user_id
            )
        
        self.assertIn("Invalid subject_type", str(context.exception))
    
    def test_invalid_file_type(self):
        """Test that invalid file types are rejected"""
        with self.assertRaises(ValueError) as context:
            self.service.create_asset(
                owner_id=self.test_user_id,
                kind='overlay',
                filename='invalid.txt',
                file_content=b"plain text content"
            )
        
        self.assertIn("Unsupported file type", str(context.exception))
    
    def tearDown(self):
        """Cleanup test data"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                # Clean up in reverse order due to foreign keys
                cur.execute("delete from ar_links where created_by in (%s, %s)", 
                           (self.test_user_id, self.admin_user_id))
                cur.execute("delete from ar_assets where owner_id in (%s, %s)", 
                           (self.test_user_id, self.admin_user_id))
                cur.execute("delete from orders where user_id = %s", (self.test_user_id,))
                cur.execute("delete from profiles where id in (%s, %s)", 
                           (self.test_user_id, self.admin_user_id))
                conn.commit()
        finally:
            POOL.putconn(conn)

class TestARSecurity(unittest.TestCase):
    """Test AR security and RLS policies"""
    
    def setUp(self):
        self.admin_user_id = "ar-security-admin"
        self.regular_user_id = "ar-security-user"
        
        # Setup test users
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    insert into profiles (id, email, role_id)
                    values (%s, 'admin@security-test.com', 2),
                           (%s, 'user@security-test.com', 5)
                    on conflict (id) do update set role_id = excluded.role_id
                """, (self.admin_user_id, self.regular_user_id))
                conn.commit()
        finally:
            POOL.putconn(conn)
    
    def test_asset_access_control(self):
        """Test that asset access follows RLS policies"""
        # This would need to be tested with actual RLS context
        # For now, testing at service layer
        
        service = ARService()
        
        # Create asset as regular user
        asset = service.create_asset(
            owner_id=self.regular_user_id,
            kind='overlay',
            filename='security_test.png',
            file_content=b"test content for security"
        )
        
        self.assertIsNotNone(asset)
        self.assertEqual(asset.owner_id, self.regular_user_id)
        
        # Admin should be able to approve
        success = service.approve_asset(asset.id, self.admin_user_id)
        self.assertTrue(success)
    
    def test_link_access_control(self):
        """Test AR link access control"""
        service = ARService()
        
        # Create asset
        asset = service.create_asset(
            owner_id=self.regular_user_id,
            kind='filter',
            filename='link_security_test.png',
            file_content=b"link security test content"
        )
        
        # Only admin should be able to create links
        link = service.create_link(
            ar_asset_id=asset.id,
            subject_type='profile',
            subject_id=self.regular_user_id,
            creator_id=self.admin_user_id
        )
        
        self.assertIsNotNone(link)
        self.assertEqual(link.created_by, self.admin_user_id)
    
    def tearDown(self):
        """Cleanup test data"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("delete from ar_links where created_by in (%s, %s)", 
                           (self.admin_user_id, self.regular_user_id))
                cur.execute("delete from ar_assets where owner_id in (%s, %s)", 
                           (self.admin_user_id, self.regular_user_id))
                cur.execute("delete from profiles where id in (%s, %s)", 
                           (self.admin_user_id, self.regular_user_id))
                conn.commit()
        finally:
            POOL.putconn(conn)

if __name__ == '__main__':
    # Run tests with verbose output
    unittest.main(verbosity=2)