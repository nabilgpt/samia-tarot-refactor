-- =====================================================
-- CLEAN FIX: Drop ALL existing policies and recreate
-- =====================================================

-- Drop ALL existing policies for profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles viewable by all" ON profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Create clean, comprehensive policies
CREATE POLICY "users_can_view_own_profile" ON profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_can_update_own_profile" ON profiles 
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "public_readers_viewable" ON profiles 
  FOR SELECT USING (role = 'reader' AND is_active = true);

-- CRITICAL: Super admin policy with unique name
CREATE POLICY "super_admin_full_access" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- Verify super admin user exists
SELECT 
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