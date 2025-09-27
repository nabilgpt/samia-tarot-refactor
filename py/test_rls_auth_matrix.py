#!/usr/bin/env python3
"""
M16.2 RLS Auth Matrix Tests
Minimal tests to verify RLS policies and route guards match
"""
import pytest
import os
from unittest.mock import patch, MagicMock
from api import (
    can_access_profile, can_delete_profile, can_access_order,
    can_access_media_asset, can_access_horoscope, can_access_call,
    can_access_admin_data, can_access_wallet, get_user_role
)

# Mock database responses
@pytest.fixture
def mock_db():
    with patch('api.db_fetchone') as mock_fetch:
        yield mock_fetch

class TestRLSAuthMatrix:
    """Test route guards mirror RLS policies exactly"""
    
    def test_profile_access_self(self, mock_db):
        """User can access own profile"""
        mock_db.return_value = ('user',)  # get_user_role returns 'user'
        
        user_id = "user123"
        assert can_access_profile(user_id, user_id) == True
    
    def test_profile_access_other_denied(self, mock_db):
        """User cannot access other's profile"""
        mock_db.return_value = ('user',)
        
        user_id = "user123"
        other_id = "user456"
        assert can_access_profile(user_id, other_id) == False
    
    def test_profile_access_admin_allowed(self, mock_db):
        """Admin can access any profile"""
        mock_db.return_value = ('admin',)
        
        admin_id = "admin123"
        user_id = "user456"
        assert can_access_profile(admin_id, user_id) == True
    
    def test_profile_delete_superadmin_only(self, mock_db):
        """Only superadmin can delete profiles"""
        # Test regular user
        mock_db.return_value = ('user',)
        assert can_delete_profile("user123") == False
        
        # Test admin  
        mock_db.return_value = ('admin',)
        assert can_delete_profile("admin123") == False
        
        # Test superadmin
        mock_db.return_value = ('superadmin',)
        assert can_delete_profile("superadmin123") == True
    
    def test_order_access_owner(self, mock_db):
        """User can access own orders"""
        mock_db.side_effect = [
            ('user',),  # get_user_role
            (1,)        # order exists and user owns it
        ]
        
        user_id = "user123"
        order_id = 100
        assert can_access_order(user_id, order_id) == True
    
    def test_order_access_assigned_reader(self, mock_db):
        """Reader can access assigned orders"""
        mock_db.side_effect = [
            ('reader',),  # get_user_role
            (1,)          # order exists and user is assigned reader
        ]
        
        reader_id = "reader123"
        order_id = 100
        assert can_access_order(reader_id, order_id) == True
    
    def test_order_access_monitor_full(self, mock_db):
        """Monitor has full order access"""
        mock_db.return_value = ('monitor',)
        
        monitor_id = "monitor123"
        order_id = 100
        assert can_access_order(monitor_id, order_id) == True
    
    def test_order_access_denied(self, mock_db):
        """User cannot access unrelated orders"""
        mock_db.side_effect = [
            ('user',),  # get_user_role
            None        # no matching order
        ]
        
        user_id = "user123"
        order_id = 100
        assert can_access_order(user_id, order_id) == False
    
    def test_media_asset_owner_access(self, mock_db):
        """Media asset owner can access"""
        mock_db.side_effect = [
            ('user',),  # get_user_role
            (1,)        # user owns asset
        ]
        
        user_id = "user123"
        asset_id = 50
        assert can_access_media_asset(user_id, asset_id) == True
    
    def test_media_asset_admin_access(self, mock_db):
        """Admin has full media access"""
        mock_db.return_value = ('admin',)
        
        admin_id = "admin123"
        asset_id = 50
        assert can_access_media_asset(admin_id, asset_id) == True
    
    def test_horoscope_public_approved(self, mock_db):
        """Public can access approved horoscopes"""
        mock_db.side_effect = [
            ('user',),  # get_user_role
            (1,)        # horoscope is approved
        ]
        
        user_id = "user123"
        horoscope_id = 10
        assert can_access_horoscope(user_id, horoscope_id) == True
    
    def test_horoscope_public_unapproved_denied(self, mock_db):
        """Public cannot access unapproved horoscopes"""
        mock_db.side_effect = [
            ('user',),  # get_user_role
            None        # horoscope not approved
        ]
        
        user_id = "user123"
        horoscope_id = 10
        assert can_access_horoscope(user_id, horoscope_id) == False
    
    def test_horoscope_management_monitor_only(self, mock_db):
        """Only monitor+ can manage horoscopes"""
        # Test regular user
        mock_db.return_value = ('user',)
        assert can_access_horoscope("user123", for_management=True) == False
        
        # Test reader
        mock_db.return_value = ('reader',)
        assert can_access_horoscope("reader123", for_management=True) == False
        
        # Test monitor
        mock_db.return_value = ('monitor',)
        assert can_access_horoscope("monitor123", for_management=True) == True
    
    def test_admin_data_access_restricted(self, mock_db):
        """Admin data access restricted to monitor+"""
        # Test regular user
        mock_db.return_value = ('user',)
        assert can_access_admin_data("user123") == False
        
        # Test reader
        mock_db.return_value = ('reader',)
        assert can_access_admin_data("reader123") == False
        
        # Test monitor
        mock_db.return_value = ('monitor',)
        assert can_access_admin_data("monitor123") == True
    
    def test_wallet_owner_access(self, mock_db):
        """User can access own wallet"""
        mock_db.return_value = ('user',)
        
        user_id = "user123"
        assert can_access_wallet(user_id, user_id) == True
    
    def test_wallet_other_denied(self, mock_db):
        """User cannot access other's wallet"""
        mock_db.return_value = ('user',)
        
        user_id = "user123"
        other_id = "user456"
        assert can_access_wallet(user_id, other_id) == False
    
    def test_wallet_admin_full_access(self, mock_db):
        """Admin has full wallet access"""
        mock_db.return_value = ('admin',)
        
        admin_id = "admin123"
        user_id = "user456"
        assert can_access_wallet(admin_id, user_id) == True

class TestRoleHierarchy:
    """Test role hierarchy matches RLS policies"""
    
    def test_role_hierarchy_levels(self, mock_db):
        """Verify role hierarchy: superadmin > admin > monitor > reader > user"""
        roles = ['user', 'reader', 'monitor', 'admin', 'superadmin']
        
        # Test increasing privileges
        for i, role in enumerate(roles):
            mock_db.return_value = (role,)
            
            # Profile access to others
            if role in ('admin', 'superadmin'):
                assert can_access_profile("user123", "other456") == True
            else:
                assert can_access_profile("user123", "other456") == False
            
            # Admin data access
            if role in ('monitor', 'admin', 'superadmin'):
                assert can_access_admin_data("user123") == True
            else:
                assert can_access_admin_data("user123") == False
            
            # Profile deletion
            if role == 'superadmin':
                assert can_delete_profile("user123") == True
            else:
                assert can_delete_profile("user123") == False

if __name__ == "__main__":
    # Run basic smoke tests
    print("Running RLS Auth Matrix smoke tests...")
    
    # Mock the database for smoke test
    with patch('api.db_fetchone') as mock_db:
        mock_db.return_value = ('user',)
        
        # Test basic functionality
        assert can_access_profile("user123", "user123") == True
        print("✓ Profile self-access works")
        
        mock_db.return_value = ('admin',)
        assert can_access_admin_data("admin123") == True
        print("✓ Admin data access works")
        
        mock_db.return_value = ('superadmin',)
        assert can_delete_profile("super123") == True
        print("✓ Superadmin delete works")
    
    print("\nSmoke tests passed! Run with pytest for full test suite.")
    print("Usage: pytest test_rls_auth_matrix.py -v")