-- =====================================================
-- FIX ALL RLS POLICIES TO INCLUDE SUPER_ADMIN ROLE
-- =====================================================
-- This script updates all Row Level Security policies to include 'super_admin' role
-- Super Admin should have access to everything that 'admin' role has access to

-- =====================================================
-- 1. PROFILES TABLE POLICIES
-- =====================================================

-- Drop existing policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles viewable by all" ON profiles;

-- Recreate with super_admin support
CREATE POLICY "Users can view own profile" ON profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles 
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public profiles viewable by all" ON profiles 
  FOR SELECT USING (role = 'reader' AND is_active = true);

-- Allow super_admin to view and manage all profiles
CREATE POLICY "Super admins can manage all profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- =====================================================
-- 2. SERVICES TABLE POLICIES  
-- =====================================================

DROP POLICY IF EXISTS "Services are viewable by all authenticated users" ON services;
DROP POLICY IF EXISTS "Only admins can manage services" ON services;

CREATE POLICY "Services are viewable by all authenticated users" ON services 
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

CREATE POLICY "Admins and super admins can manage services" ON services 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- 3. BOOKINGS TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;

CREATE POLICY "Users can view own bookings" ON bookings 
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() = reader_id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'monitor', 'super_admin')
    )
  );

CREATE POLICY "Users can create own bookings" ON bookings 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings" ON bookings 
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    auth.uid() = reader_id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'monitor', 'super_admin')
    )
  );

-- =====================================================
-- 4. PAYMENTS TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "Users can create own payments" ON payments;

CREATE POLICY "Users can view own payments" ON payments 
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'monitor', 'super_admin')
    )
  );

CREATE POLICY "Users can create own payments" ON payments 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 5. WALLETS TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own wallet" ON wallets;
DROP POLICY IF EXISTS "Admins can view all wallets" ON wallets;
DROP POLICY IF EXISTS "System can create wallets" ON wallets;
DROP POLICY IF EXISTS "Admins can update wallets" ON wallets;

CREATE POLICY "Users can view own wallet" ON wallets 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all wallets" ON wallets 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'monitor', 'super_admin')
    )
  );

CREATE POLICY "System can create wallets" ON wallets 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update wallets" ON wallets 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- 6. TRANSACTIONS TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
DROP POLICY IF EXISTS "System can create transactions" ON transactions;

CREATE POLICY "Users can view own transactions" ON transactions 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions" ON transactions 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'monitor', 'super_admin')
    )
  );

CREATE POLICY "System can create transactions" ON transactions 
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- 7. EMERGENCY ALERTS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admins can view all emergency alerts" ON emergency_alerts;
DROP POLICY IF EXISTS "Admins can update all emergency alerts" ON emergency_alerts;

CREATE POLICY "Admins can view all emergency alerts" ON emergency_alerts
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update all emergency alerts" ON emergency_alerts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- 8. MONITORING TABLES POLICIES
-- =====================================================

-- Update all monitoring-related policies to include super_admin
DROP POLICY IF EXISTS "Admins can view all call recordings" ON call_recordings;
DROP POLICY IF EXISTS "Monitors can view all call recordings" ON call_recordings;
DROP POLICY IF EXISTS "Admins and monitors can update call recordings" ON call_recordings;
DROP POLICY IF EXISTS "Only admins can delete call recordings" ON call_recordings;

CREATE POLICY "Admins can view all call recordings" ON call_recordings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Monitors can view all call recordings" ON call_recordings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('monitor', 'admin', 'super_admin')
    )
  );

CREATE POLICY "Admins and monitors can update call recordings" ON call_recordings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('monitor', 'admin', 'super_admin')
    )
  );

CREATE POLICY "Only admins can delete call recordings" ON call_recordings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- 9. APP CONFIG POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admin can manage app config" ON app_config;

CREATE POLICY "Admin can manage app config" ON app_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- 10. AI PROVIDERS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admin can manage AI providers" ON ai_providers;

CREATE POLICY "Admin can manage AI providers" ON ai_providers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- 11. SYSTEM CONFIGURATIONS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admin can manage system configurations" ON system_configurations;

CREATE POLICY "Admin can manage system configurations" ON system_configurations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- 12. NOTIFICATION LOGS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admin can manage notification logs" ON notification_logs;

CREATE POLICY "Admin can manage notification logs" ON notification_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- 13. ADMIN REPORTS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage reports" ON admin_reports;

CREATE POLICY "Admins can manage reports" ON admin_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- 14. PLATFORM ANALYTICS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admins can view platform analytics" ON platform_analytics;

CREATE POLICY "Admins can view platform analytics" ON platform_analytics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- 15. READER ANALYTICS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admins can view all analytics" ON reader_analytics;

CREATE POLICY "Admins can view all analytics" ON reader_analytics
  FOR ALL USING (
    auth.uid() = reader_id OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================

-- Check if super_admin user exists and verify policies
SELECT 
  'Super Admin User Status' as check_type,
  id, 
  email, 
  first_name, 
  last_name, 
  role, 
  is_active,
  created_at,
  updated_at
FROM profiles 
WHERE email = 'info@samiatarot.com' 
  AND role = 'super_admin';

-- List all policies that should now include super_admin
SELECT 
  'RLS Policies Updated' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND qual LIKE '%super_admin%'
ORDER BY tablename, policyname; 