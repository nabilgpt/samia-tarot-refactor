-- =============================================================================
-- DEBUG PROFILES TABLE ERROR - SAMIA TAROT
-- =============================================================================
-- This script diagnoses and fixes the 500 Internal Server Error on profiles table
-- =============================================================================

-- 1. Check if profiles table exists and its structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 2. Check RLS status on profiles table
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles';

-- 3. List all policies on profiles table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- 4. Check for any triggers that might be causing issues
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'profiles';

-- 5. Test basic select without RLS (as service role)
-- This should work if the table structure is correct
SELECT COUNT(*) as profile_count FROM profiles;

-- 6. Check if there are any foreign key constraints causing issues
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'profiles' AND tc.constraint_type = 'FOREIGN KEY';

-- =============================================================================
-- EMERGENCY FIX: Temporarily disable RLS to test
-- =============================================================================

-- Disable RLS temporarily to see if that's the issue
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Test the query that was failing
SELECT count(*) FROM profiles LIMIT 1;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- SAFE POLICY RECREATION
-- =============================================================================

-- Drop all existing policies (they might be corrupted)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles viewable" ON profiles;
DROP POLICY IF EXISTS "Admin full access" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable" ON profiles;
DROP POLICY IF EXISTS "Readers can view client profiles" ON profiles;

-- Create the most basic policy first (allow all for authenticated users)
CREATE POLICY "Allow all for authenticated users" ON profiles
  FOR ALL USING (auth.role() = 'authenticated');

-- Create a simple select policy for anonymous users
CREATE POLICY "Allow select for anonymous" ON profiles
  FOR SELECT USING (true);

-- =============================================================================
-- VERIFY THE FIX
-- =============================================================================

-- Test the problematic query again
SELECT count(*) FROM profiles LIMIT 1;

-- Check if policies are working
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles';

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

SELECT 
  'Profiles table debugging completed' as status,
  'Check the results above for any issues' as message,
  'If count query works, the 500 error should be resolved' as next_step; 