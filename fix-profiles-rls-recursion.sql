-- Fix infinite recursion in profiles table RLS policies
-- This script safely handles existing policies

-- Step 1: Temporarily disable RLS
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies that might cause recursion (using IF EXISTS)
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Service role has full access" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON profiles;

-- Step 3: Create new non-recursive policies
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow service role full access
CREATE POLICY "profiles_service_role_access" ON profiles
    FOR ALL USING (
        current_setting('role') = 'service_role' OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Allow authenticated users to view basic profile info for active users
CREATE POLICY "profiles_public_read" ON profiles
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        is_active = true
    );

-- Step 4: Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 5: Ensure proper permissions
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;

-- Step 6: Refresh the table statistics
ANALYZE profiles;

SELECT 'Profiles RLS policies fixed successfully' as result; 