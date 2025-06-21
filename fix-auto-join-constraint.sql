-- =============================================================================
-- FIX SUPABASE AUTO-JOIN: profiles <-> auth.users
-- =============================================================================
-- This script enables auto-joining between profiles and auth.users tables
-- using the correct foreign key naming convention for PostgREST

-- Step 1: Drop any existing FK constraints
-- ========================================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS fk_profiles_user_id;

-- Step 2: Create the FK with the required naming convention
-- =========================================================
-- The naming pattern MUST be: {table}_{referenced_table}_{column}_fkey
-- This allows PostgREST to auto-detect the relationship for REST joins

ALTER TABLE profiles
ADD CONSTRAINT profiles_auth_users_id_fkey
FOREIGN KEY (id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Step 3: Verify the constraint was created
-- =========================================
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as referenced_table,
    a.attname as column_name,
    af.attname as referenced_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE c.contype = 'f' 
AND conrelid::regclass::text = 'profiles'
AND conname = 'profiles_auth_users_id_fkey';

-- Step 4: Test data integrity
-- ===========================
-- Check for any orphan records that might cause issues
SELECT 
    COUNT(*) as total_profiles,
    COUNT(au.id) as profiles_with_valid_auth_users,
    COUNT(*) - COUNT(au.id) as orphan_profiles
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id;

-- If there are orphan profiles, they need to be handled
-- (This query will show which profiles don't have corresponding auth.users)
SELECT p.id, p.email, p.first_name, p.last_name
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE au.id IS NULL;

-- =============================================================================
-- TESTING THE AUTO-JOIN FUNCTIONALITY
-- =============================================================================

-- Test 1: Basic auto-join (this should work after the constraint is created)
-- Note: This is just for reference - actual testing should be done via REST API
/*
Example REST API calls that should now work:

GET /rest/v1/profiles?select=*,auth_users(email,created_at)
GET /rest/v1/profiles?select=id,first_name,last_name,auth_users(email)
GET /rest/v1/profiles?select=*,auth_users(*)

*/

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================
SELECT 'Auto-join constraint created successfully! Test via REST API.' as status; 