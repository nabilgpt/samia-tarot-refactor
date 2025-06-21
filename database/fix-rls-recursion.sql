-- ===============================================
-- FIX RLS INFINITE RECURSION ISSUE
-- ===============================================

-- Temporarily disable RLS to fix policies
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies that might be causing recursion
DROP POLICY IF EXISTS profiles_select_policy ON profiles;
DROP POLICY IF EXISTS profiles_insert_policy ON profiles;
DROP POLICY IF EXISTS profiles_update_policy ON profiles;
DROP POLICY IF EXISTS profiles_delete_policy ON profiles;

-- Create safe, non-recursive policies
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT USING (
    auth.uid() = id OR 
    auth.role() = 'service_role'
  );

CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id OR 
    auth.role() = 'service_role'
  );

CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE USING (
    auth.uid() = id OR 
    auth.role() = 'service_role'
  );

CREATE POLICY "profiles_delete_policy" ON profiles
  FOR DELETE USING (
    auth.role() = 'service_role'
  );

-- Re-enable RLS with safe policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Success message
SELECT 'RLS policies fixed - infinite recursion resolved!' as message; 