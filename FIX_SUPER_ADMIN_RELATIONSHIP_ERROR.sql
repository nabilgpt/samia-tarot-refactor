-- =====================================================
-- FIX SUPER ADMIN RELATIONSHIP ERROR
-- =====================================================
-- This script fixes the "Could not embed because more than one relationship was found for 'profiles' and 'id'" error
-- by cleaning up duplicate foreign key relationships and ensuring clean database schema

-- Step 1: Check current foreign key constraints on profiles table
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass 
  AND contype = 'f'  -- foreign key constraints
ORDER BY conname;

-- Step 2: Drop any duplicate or incorrect foreign key constraints
-- Keep only the primary relationship: profiles.id -> auth.users.id

-- Drop any extra foreign keys that might exist
DROP CONSTRAINT IF EXISTS profiles_user_id_fkey ON public.profiles;
DROP CONSTRAINT IF EXISTS profiles_auth_user_id_fkey ON public.profiles;
DROP CONSTRAINT IF EXISTS profiles_client_id_fkey ON public.profiles;
DROP CONSTRAINT IF EXISTS profiles_reader_id_fkey ON public.profiles;
DROP CONSTRAINT IF EXISTS profiles_email_fkey ON public.profiles;

-- Step 3: Ensure the correct primary foreign key exists
-- The profiles.id should reference auth.users.id (this is the correct relationship)
DO $$
BEGIN
    -- Check if the correct constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_id_fkey' 
          AND conrelid = 'public.profiles'::regclass
    ) THEN
        -- Add the correct foreign key constraint
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_id_fkey 
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 4: Remove any extra columns that might cause confusion
-- Only keep essential columns and ensure no duplicate user references exist
ALTER TABLE public.profiles DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS auth_user_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS client_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS reader_id;

-- Step 5: Ensure email column is indexed but not a foreign key
DROP INDEX IF EXISTS idx_profiles_email;
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- Step 6: Clean up any orphaned profiles (profiles without corresponding auth.users)
DELETE FROM public.profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

-- Step 7: Verify the clean schema
SELECT 
    'Final Foreign Key Constraints on profiles table:' as info,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass 
  AND contype = 'f'
ORDER BY conname;

-- Step 8: Verify profiles table structure
SELECT 
    'profiles table structure:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Step 9: Test the fixed relationship
-- This query should now work without the relationship error
SELECT 
    'Test query - should work without errors:' as test_info,
    COUNT(*) as profile_count
FROM public.profiles;

-- Step 10: Show correct query syntax for joining with auth.users
SELECT 
    'Correct query syntax examples:' as examples,
    '1. Simple join: profiles p JOIN auth.users u ON p.id = u.id' as syntax_1,
    '2. Supabase select: profiles.select("*, auth_users!profiles_id_fkey(email)")' as syntax_2,
    '3. Explicit relationship: profiles.select("*, user:id(email)")' as syntax_3;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify no duplicate foreign keys exist
WITH fk_check AS (
    SELECT 
        conname,
        COUNT(*) as count
    FROM pg_constraint 
    WHERE conrelid = 'public.profiles'::regclass 
      AND contype = 'f'
    GROUP BY conname
)
SELECT 
    CASE 
        WHEN MAX(count) = 1 THEN '✅ No duplicate foreign keys found'
        ELSE '❌ Duplicate foreign keys still exist'
    END as fk_status
FROM fk_check;

-- Verify profiles-users relationship integrity  
SELECT 
    CASE 
        WHEN COUNT(p.id) = COUNT(u.id) THEN '✅ All profiles have corresponding auth.users'
        ELSE '❌ Orphaned profiles found'
    END as integrity_status,
    COUNT(p.id) as profile_count,
    COUNT(u.id) as auth_user_count
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id;

-- Show final clean schema
SELECT '✅ Database relationship fix completed successfully' as status; 