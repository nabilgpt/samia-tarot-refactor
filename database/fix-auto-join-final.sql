-- =============================================================================
-- 🔧 FIX AUTO-JOIN: profiles <-> auth.users (FINAL VERSION)
-- =============================================================================
-- Run this script in Supabase SQL Editor to enable auto-joining
-- between profiles and auth.users tables using PostgREST

-- Step 1: Drop any existing foreign key constraints
-- =================================================
DO $$
BEGIN
    -- Drop existing constraints if they exist
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_fkey') THEN
        ALTER TABLE profiles DROP CONSTRAINT profiles_user_id_fkey;
        RAISE NOTICE 'Dropped constraint: profiles_user_id_fkey';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_fkey') THEN
        ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
        RAISE NOTICE 'Dropped constraint: profiles_id_fkey';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_profiles_user_id') THEN
        ALTER TABLE profiles DROP CONSTRAINT fk_profiles_user_id;
        RAISE NOTICE 'Dropped constraint: fk_profiles_user_id';
    END IF;
    
    RAISE NOTICE 'Step 1 completed: Existing constraints dropped';
END $$;

-- Step 2: Create the foreign key with the EXACT naming convention
-- ==============================================================
-- PostgREST requires this specific naming pattern: {table}_{referenced_table}_{column}_fkey
-- This enables automatic relationship detection for REST API joins

DO $$
BEGIN
    -- Check if the constraint already exists with correct name
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_auth_users_id_fkey') THEN
        ALTER TABLE profiles
        ADD CONSTRAINT profiles_auth_users_id_fkey
        FOREIGN KEY (id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Created constraint: profiles_auth_users_id_fkey';
    ELSE
        RAISE NOTICE 'Constraint profiles_auth_users_id_fkey already exists';
    END IF;
    
    RAISE NOTICE 'Step 2 completed: Auto-join constraint created';
END $$;

-- Step 3: Verify the constraint was created correctly
-- ===================================================
SELECT 
    'Constraint Verification' as check_type,
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

-- Step 4: Check data integrity
-- ============================
SELECT 
    'Data Integrity Check' as check_type,
    COUNT(*) as total_profiles,
    COUNT(au.id) as profiles_with_valid_auth_users,
    COUNT(*) - COUNT(au.id) as orphan_profiles,
    CASE 
        WHEN COUNT(*) - COUNT(au.id) = 0 THEN '✅ All profiles have valid auth.users'
        ELSE '⚠️ Some profiles missing auth.users - check orphan_profiles count'
    END as status
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id;

-- Step 5: Show orphan profiles (if any)
-- =====================================
SELECT 
    'Orphan Profiles' as check_type,
    p.id, 
    p.email, 
    p.first_name, 
    p.last_name,
    p.role,
    '⚠️ No corresponding auth.users record' as issue
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE au.id IS NULL;

-- Step 6: Final status message
-- ============================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 AUTO-JOIN FIX COMPLETED!';
    RAISE NOTICE '================================';
    RAISE NOTICE '✅ Foreign key constraint created with correct naming pattern';
    RAISE NOTICE '✅ PostgREST should now detect the relationship automatically';
    RAISE NOTICE '✅ Auto-join queries should work in REST API';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 You can now use these REST API patterns:';
    RAISE NOTICE '   • GET /rest/v1/profiles?select=*,auth_users(email)';
    RAISE NOTICE '   • GET /rest/v1/profiles?select=*,auth_users(email,created_at)';
    RAISE NOTICE '   • GET /rest/v1/profiles?select=id,first_name,auth_users(*)';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Next steps:';
    RAISE NOTICE '   1. Test with: node test-auto-join.js';
    RAISE NOTICE '   2. If still failing, refresh Supabase schema cache';
    RAISE NOTICE '   3. Clear browser cache and test your application';
    RAISE NOTICE '';
END $$;

-- =============================================================================
-- COMPLETION VERIFICATION
-- =============================================================================
SELECT 
    '🎯 AUTO-JOIN STATUS' as final_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'profiles_auth_users_id_fkey'
            AND conrelid::regclass::text = 'profiles'
        ) THEN '✅ READY - Auto-join constraint is properly configured'
        ELSE '❌ FAILED - Constraint not found, please re-run this script'
    END as status; 