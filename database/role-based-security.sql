-- =====================================================
-- SAMIA TAROT - ROLE-BASED SECURITY IMPLEMENTATION
-- Row Level Security (RLS) Policies for Complete Data Protection
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- First, update the profiles table to include super_admin role
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('client', 'reader', 'admin', 'monitor', 'super_admin'));

-- =====================================================
-- HELPER FUNCTIONS FOR ROLE CHECKING
-- =====================================================

-- Function to get current user's role
CREATE OR REPLACE FUNCTION auth.get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM public.profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has admin privileges
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.get_user_role() IN ('admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has monitor privileges
CREATE OR REPLACE FUNCTION auth.is_monitor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.get_user_role() IN ('monitor', 'admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has reader privileges
CREATE OR REPLACE FUNCTION auth.is_reader()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.get_user_role() = 'reader';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has client privileges
CREATE OR REPLACE FUNCTION auth.is_client()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.get_user_role() = 'client';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PROFILES TABLE POLICIES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles viewable by all" ON profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND role = OLD.role); -- Prevent role self-modification

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
FOR SELECT USING (auth.is_admin());

-- Admins can update any profile (including roles)
CREATE POLICY "Admins can manage all profiles" ON profiles
FOR ALL USING (auth.is_admin());

-- Readers can view client profiles for their bookings
CREATE POLICY "Readers can view client profiles" ON profiles
FOR SELECT USING (
  auth.is_reader() AND 
  role = 'client' AND 
  id IN (
    SELECT user_id FROM bookings WHERE reader_id = auth.uid()
  )
);

-- Monitors can view all profiles (read-only)
CREATE POLICY "Monitors can view all profiles" ON profiles
FOR SELECT USING (auth.is_monitor());

-- =====================================================
-- SERVICES TABLE POLICIES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Services are viewable by all authenticated users" ON services;
DROP POLICY IF EXISTS "Admins and super admins can manage services" ON services;

-- All authenticated users can view active services
CREATE POLICY "Authenticated users can view active services" ON services
FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Admins can manage all services
CREATE POLICY "Admins can manage all services" ON services
FOR ALL USING (auth.is_admin());

-- =====================================================
-- BOOKINGS TABLE POLICIES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;

-- Clients can view and manage their own bookings
CREATE POLICY "Clients can view own bookings" ON bookings
FOR SELECT USING (
  auth.is_client() AND user_id = auth.uid()
);

CREATE POLICY "Clients can create own bookings" ON bookings
FOR INSERT WITH CHECK (
  auth.is_client() AND user_id = auth.uid()
);

CREATE POLICY "Clients can update own bookings" ON bookings
FOR UPDATE USING (
  auth.is_client() AND user_id = auth.uid()
) WITH CHECK (
  auth.is_client() AND user_id = auth.uid()
);

-- Readers can view and update their assigned bookings
CREATE POLICY "Readers can view assigned bookings" ON bookings
FOR SELECT USING (
  auth.is_reader() AND reader_id = auth.uid()
);

CREATE POLICY "Readers can update assigned bookings" ON bookings
FOR UPDATE USING (
  auth.is_reader() AND reader_id = auth.uid()
) WITH CHECK (
  auth.is_reader() AND reader_id = auth.uid()
);

-- Admins can view and manage all bookings
CREATE POLICY "Admins can manage all bookings" ON bookings
FOR ALL USING (auth.is_admin());

-- Monitors can view all bookings (read-only)
CREATE POLICY "Monitors can view all bookings" ON bookings
FOR SELECT USING (auth.is_monitor());

-- =====================================================
-- PAYMENTS TABLE POLICIES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "Users can create own payments" ON payments;

-- Clients can view and create their own payments
CREATE POLICY "Clients can view own payments" ON payments
FOR SELECT USING (
  auth.is_client() AND user_id = auth.uid()
);

CREATE POLICY "Clients can create own payments" ON payments
FOR INSERT WITH CHECK (
  auth.is_client() AND user_id = auth.uid()
);

-- Readers can view payments for their bookings
CREATE POLICY "Readers can view booking payments" ON payments
FOR SELECT USING (
  auth.is_reader() AND 
  booking_id IN (
    SELECT id FROM bookings WHERE reader_id = auth.uid()
  )
);

-- Admins can manage all payments
CREATE POLICY "Admins can manage all payments" ON payments
FOR ALL USING (auth.is_admin());

-- Monitors can view all payments (read-only)
CREATE POLICY "Monitors can view all payments" ON payments
FOR SELECT USING (auth.is_monitor());

-- =====================================================
-- WALLETS TABLE POLICIES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own wallet" ON wallets;
DROP POLICY IF EXISTS "Admins can view all wallets" ON wallets;
DROP POLICY IF EXISTS "System can create wallets" ON wallets;
DROP POLICY IF EXISTS "Admins can update wallets" ON wallets;

-- Users can view their own wallet
CREATE POLICY "Users can view own wallet" ON wallets
FOR SELECT USING (user_id = auth.uid());

-- Admins can view and manage all wallets
CREATE POLICY "Admins can manage all wallets" ON wallets
FOR ALL USING (auth.is_admin());

-- System can create wallets (for new user registration)
CREATE POLICY "System can create wallets" ON wallets
FOR INSERT WITH CHECK (true); -- Handled by triggers/functions

-- =====================================================
-- TRANSACTIONS TABLE POLICIES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
DROP POLICY IF EXISTS "System can create transactions" ON transactions;

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions" ON transactions
FOR SELECT USING (user_id = auth.uid());

-- Admins can view all transactions
CREATE POLICY "Admins can view all transactions" ON transactions
FOR SELECT USING (auth.is_admin());

-- System can create transactions (for automated processes)
CREATE POLICY "System can create transactions" ON transactions
FOR INSERT WITH CHECK (true); -- Handled by triggers/functions

-- =====================================================
-- RECEIPT UPLOADS TABLE POLICIES
-- =====================================================

-- Users can view and upload their own receipts
CREATE POLICY "Users can manage own receipts" ON receipt_uploads
FOR ALL USING (user_id = auth.uid());

-- Admins can view and manage all receipts
CREATE POLICY "Admins can manage all receipts" ON receipt_uploads
FOR ALL USING (auth.is_admin());

-- =====================================================
-- MESSAGES TABLE POLICIES
-- =====================================================

-- Users can view messages in their bookings
CREATE POLICY "Users can view booking messages" ON messages
FOR SELECT USING (
  booking_id IN (
    SELECT id FROM bookings 
    WHERE user_id = auth.uid() OR reader_id = auth.uid()
  )
);

-- Users can send messages in their bookings
CREATE POLICY "Users can send booking messages" ON messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  booking_id IN (
    SELECT id FROM bookings 
    WHERE user_id = auth.uid() OR reader_id = auth.uid()
  )
);

-- Admins can view all messages
CREATE POLICY "Admins can view all messages" ON messages
FOR SELECT USING (auth.is_admin());

-- Monitors can view all messages (read-only)
CREATE POLICY "Monitors can view all messages" ON messages
FOR SELECT USING (auth.is_monitor());

-- =====================================================
-- REVIEWS TABLE POLICIES
-- =====================================================

-- Clients can view and create reviews for their completed bookings
CREATE POLICY "Clients can manage own reviews" ON reviews
FOR ALL USING (
  auth.is_client() AND client_id = auth.uid()
);

-- Readers can view reviews about them
CREATE POLICY "Readers can view their reviews" ON reviews
FOR SELECT USING (
  auth.is_reader() AND reader_id = auth.uid()
);

-- Public reviews are viewable by all authenticated users
CREATE POLICY "Public reviews viewable by all" ON reviews
FOR SELECT USING (
  auth.role() = 'authenticated' AND is_public = true
);

-- Admins can manage all reviews
CREATE POLICY "Admins can manage all reviews" ON reviews
FOR ALL USING (auth.is_admin());

-- =====================================================
-- NOTIFICATIONS TABLE POLICIES
-- =====================================================

-- Users can view and update their own notifications
CREATE POLICY "Users can manage own notifications" ON notifications
FOR ALL USING (user_id = auth.uid());

-- Admins can create system notifications for any user
CREATE POLICY "Admins can create system notifications" ON notifications
FOR INSERT WITH CHECK (
  auth.is_admin() AND type = 'system'
);

-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications" ON notifications
FOR SELECT USING (auth.is_admin());

-- =====================================================
-- SECURITY VALIDATION FUNCTION
-- =====================================================

-- Function to validate user role access
CREATE OR REPLACE FUNCTION validate_role_access(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Super admin has access to everything
  IF auth.get_user_role() = 'super_admin' THEN
    RETURN true;
  END IF;
  
  -- Admin has access to admin, monitor, reader, client
  IF auth.get_user_role() = 'admin' AND required_role IN ('admin', 'monitor', 'reader', 'client') THEN
    RETURN true;
  END IF;
  
  -- Monitor has access to monitor only
  IF auth.get_user_role() = 'monitor' AND required_role = 'monitor' THEN
    RETURN true;
  END IF;
  
  -- Reader has access to reader only
  IF auth.get_user_role() = 'reader' AND required_role = 'reader' THEN
    RETURN true;
  END IF;
  
  -- Client has access to client only
  IF auth.get_user_role() = 'client' AND required_role = 'client' THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- REFRESH MATERIALIZED VIEWS (if any exist)
-- =====================================================

-- This would refresh any materialized views that depend on these policies
-- Add REFRESH MATERIALIZED VIEW commands here if you have any

-- =====================================================
-- GRANT APPROPRIATE PERMISSIONS
-- =====================================================

-- Grant execute permissions on utility functions
GRANT EXECUTE ON FUNCTION auth.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.is_monitor() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.is_reader() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.is_client() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_role_access(TEXT) TO authenticated; 