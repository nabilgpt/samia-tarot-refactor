-- =====================================================
-- EMERGENCY PROFILE FIX
-- =====================================================
-- Quick fix for profile loading issues causing 500 errors
-- Run this script immediately to resolve the loading issue

-- 1. Temporarily disable RLS to allow profile operations
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. Ensure the profiles table has the minimum required columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Create a profile for the current failing user (from the error logs)
-- User ID: c1a12781-5fef-46df-a1fc-2bf4e4cb6356
INSERT INTO profiles (id, first_name, last_name, email, role, is_active)
VALUES (
  'c1a12781-5fef-46df-a1fc-2bf4e4cb6356',
  'Reader',
  'User',
  'reader@samiatarot.com',
  'reader',
  true
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 4. Re-enable RLS with simple policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 5. Create simple, permissive policies that work
DROP POLICY IF EXISTS "emergency_allow_all_select" ON profiles;
DROP POLICY IF EXISTS "emergency_allow_all_insert" ON profiles;
DROP POLICY IF EXISTS "emergency_allow_all_update" ON profiles;

-- Allow all authenticated users to select profiles (temporary)
CREATE POLICY "emergency_allow_all_select" ON profiles
  FOR SELECT TO authenticated USING (true);

-- Allow all authenticated users to insert their own profile
CREATE POLICY "emergency_allow_all_insert" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Allow all authenticated users to update their own profile
CREATE POLICY "emergency_allow_all_update" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 6. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;

-- 7. Verify the fix by checking if the user profile exists
SELECT 
  'Emergency fix applied - Profile found:' as status,
  id, 
  first_name, 
  last_name, 
  email, 
  role 
FROM profiles 
WHERE id = 'c1a12781-5fef-46df-a1fc-2bf4e4cb6356';

-- 8. Show all profiles to verify table is working
SELECT 
  'All profiles in table:' as info,
  COUNT(*) as total_profiles
FROM profiles; 