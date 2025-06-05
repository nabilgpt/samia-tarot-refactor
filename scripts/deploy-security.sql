-- =====================================================
-- SAMIA TAROT - SECURITY DEPLOYMENT SCRIPT
-- Execute this script in your Supabase SQL Editor to apply role-based security
-- =====================================================

-- Step 1: Enable Row Level Security on all tables
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

-- Step 2: Update profiles table to include super_admin role
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('client', 'reader', 'admin', 'monitor', 'super_admin'));

-- Step 3: Create helper functions for role checking
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

CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.get_user_role() IN ('admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.is_monitor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.get_user_role() IN ('monitor', 'admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.is_reader()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.get_user_role() = 'reader';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.is_client()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.get_user_role() = 'client';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles viewable by all" ON profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Readers can view client profiles" ON profiles;
DROP POLICY IF EXISTS "Monitors can view all profiles" ON profiles;

DROP POLICY IF EXISTS "Services are viewable by all authenticated users" ON services;
DROP POLICY IF EXISTS "Admins and super admins can manage services" ON services;
DROP POLICY IF EXISTS "Authenticated users can view active services" ON services;
DROP POLICY IF EXISTS "Admins can manage all services" ON services;

DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;
DROP POLICY IF EXISTS "Clients can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Clients can create own bookings" ON bookings;
DROP POLICY IF EXISTS "Clients can update own bookings" ON bookings;
DROP POLICY IF EXISTS "Readers can view assigned bookings" ON bookings;
DROP POLICY IF EXISTS "Readers can update assigned bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can manage all bookings" ON bookings;
DROP POLICY IF EXISTS "Monitors can view all bookings" ON bookings;

-- Step 5: Create comprehensive RLS policies

-- PROFILES TABLE POLICIES
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND role = OLD.role);

CREATE POLICY "Admins can view all profiles" ON profiles
FOR SELECT USING (auth.is_admin());

CREATE POLICY "Admins can manage all profiles" ON profiles
FOR ALL USING (auth.is_admin());

CREATE POLICY "Readers can view client profiles" ON profiles
FOR SELECT USING (
  auth.is_reader() AND 
  role = 'client' AND 
  id IN (
    SELECT user_id FROM bookings WHERE reader_id = auth.uid()
  )
);

CREATE POLICY "Monitors can view all profiles" ON profiles
FOR SELECT USING (auth.is_monitor());

-- SERVICES TABLE POLICIES
CREATE POLICY "Authenticated users can view active services" ON services
FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

CREATE POLICY "Admins can manage all services" ON services
FOR ALL USING (auth.is_admin());

-- BOOKINGS TABLE POLICIES
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

CREATE POLICY "Admins can manage all bookings" ON bookings
FOR ALL USING (auth.is_admin());

CREATE POLICY "Monitors can view all bookings" ON bookings
FOR SELECT USING (auth.is_monitor());

-- PAYMENTS TABLE POLICIES
CREATE POLICY "Clients can view own payments" ON payments
FOR SELECT USING (
  auth.is_client() AND user_id = auth.uid()
);

CREATE POLICY "Clients can create own payments" ON payments
FOR INSERT WITH CHECK (
  auth.is_client() AND user_id = auth.uid()
);

CREATE POLICY "Readers can view booking payments" ON payments
FOR SELECT USING (
  auth.is_reader() AND 
  booking_id IN (
    SELECT id FROM bookings WHERE reader_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all payments" ON payments
FOR ALL USING (auth.is_admin());

CREATE POLICY "Monitors can view all payments" ON payments
FOR SELECT USING (auth.is_monitor());

-- WALLETS TABLE POLICIES
CREATE POLICY "Users can view own wallet" ON wallets
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all wallets" ON wallets
FOR ALL USING (auth.is_admin());

CREATE POLICY "System can create wallets" ON wallets
FOR INSERT WITH CHECK (true);

-- TRANSACTIONS TABLE POLICIES
CREATE POLICY "Users can view own transactions" ON transactions
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all transactions" ON transactions
FOR SELECT USING (auth.is_admin());

CREATE POLICY "System can create transactions" ON transactions
FOR INSERT WITH CHECK (true);

-- RECEIPT UPLOADS TABLE POLICIES
CREATE POLICY "Users can manage own receipts" ON receipt_uploads
FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all receipts" ON receipt_uploads
FOR ALL USING (auth.is_admin());

-- MESSAGES TABLE POLICIES
CREATE POLICY "Users can view booking messages" ON messages
FOR SELECT USING (
  booking_id IN (
    SELECT id FROM bookings 
    WHERE user_id = auth.uid() OR reader_id = auth.uid()
  )
);

CREATE POLICY "Users can send booking messages" ON messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  booking_id IN (
    SELECT id FROM bookings 
    WHERE user_id = auth.uid() OR reader_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all messages" ON messages
FOR SELECT USING (auth.is_admin());

CREATE POLICY "Monitors can view all messages" ON messages
FOR SELECT USING (auth.is_monitor());

-- REVIEWS TABLE POLICIES
CREATE POLICY "Clients can manage own reviews" ON reviews
FOR ALL USING (
  auth.is_client() AND client_id = auth.uid()
);

CREATE POLICY "Readers can view their reviews" ON reviews
FOR SELECT USING (
  auth.is_reader() AND reader_id = auth.uid()
);

CREATE POLICY "Public reviews viewable by all" ON reviews
FOR SELECT USING (
  auth.role() = 'authenticated' AND is_public = true
);

CREATE POLICY "Admins can manage all reviews" ON reviews
FOR ALL USING (auth.is_admin());

-- NOTIFICATIONS TABLE POLICIES
CREATE POLICY "Users can manage own notifications" ON notifications
FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can create system notifications" ON notifications
FOR INSERT WITH CHECK (
  auth.is_admin() AND type = 'system'
);

CREATE POLICY "Admins can view all notifications" ON notifications
FOR SELECT USING (auth.is_admin());

-- Step 6: Grant permissions on utility functions
GRANT EXECUTE ON FUNCTION auth.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.is_monitor() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.is_reader() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.is_client() TO authenticated;

-- Step 7: Create a test user for each role (optional - for testing)
-- Note: Uncomment these if you want to create test users
/*
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at) 
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'client@test.com', crypt('password', gen_salt('bf')), NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002', 'reader@test.com', crypt('password', gen_salt('bf')), NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'monitor@test.com', crypt('password', gen_salt('bf')), NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000004', 'admin@test.com', crypt('password', gen_salt('bf')), NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000005', 'superadmin@test.com', crypt('password', gen_salt('bf')), NOW(), NOW(), NOW());

INSERT INTO public.profiles (id, first_name, last_name, email, role) 
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Test', 'Client', 'client@test.com', 'client'),
  ('00000000-0000-0000-0000-000000000002', 'Test', 'Reader', 'reader@test.com', 'reader'),
  ('00000000-0000-0000-0000-000000000003', 'Test', 'Monitor', 'monitor@test.com', 'monitor'),
  ('00000000-0000-0000-0000-000000000004', 'Test', 'Admin', 'admin@test.com', 'admin'),
  ('00000000-0000-0000-0000-000000000005', 'Test', 'SuperAdmin', 'superadmin@test.com', 'super_admin');
*/

-- =====================================================
-- DEPLOYMENT COMPLETE
-- =====================================================

-- Verify the security setup
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check if RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
AND rowsecurity = true;

-- Test the role functions
SELECT 
  'auth.get_user_role()' as function_name,
  auth.get_user_role() as result
UNION ALL
SELECT 
  'auth.is_admin()',
  auth.is_admin()::text
UNION ALL
SELECT 
  'auth.is_monitor()',
  auth.is_monitor()::text
UNION ALL
SELECT 
  'auth.is_reader()',
  auth.is_reader()::text
UNION ALL
SELECT 
  'auth.is_client()',
  auth.is_client()::text; 