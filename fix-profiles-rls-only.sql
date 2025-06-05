-- =====================================================
-- MINIMAL FIX: ONLY PROFILES TABLE RLS POLICIES
-- =====================================================
-- This script only fixes the essential profiles table policies
-- to allow super_admin access

-- Drop existing profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles viewable by all" ON profiles;

-- Recreate profiles policies with super_admin support
CREATE POLICY "Users can view own profile" ON profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles 
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public profiles viewable by all" ON profiles 
  FOR SELECT USING (role = 'reader' AND is_active = true);

-- CRITICAL: Allow super_admin to view and manage all profiles
CREATE POLICY "Super admins can manage all profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- Verify the super_admin user exists
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