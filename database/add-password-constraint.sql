-- =============================================================================
-- ADD NOT NULL CONSTRAINT TO ENCRYPTED_PASSWORD - SAMIA TAROT
-- Enforce password requirement forever
-- =============================================================================

-- This script adds the NOT NULL constraint to the encrypted_password column
-- to ensure all future users must have a valid encrypted password.

-- IMPORTANT: Run database/fix-users-passwords-simple.sql FIRST before running this!

-- =============================================================================
-- PRE-FLIGHT CHECKS
-- =============================================================================

-- Check if any users are missing encrypted passwords
SELECT 
    COUNT(*) as total_users,
    COUNT(encrypted_password) as users_with_passwords,
    COUNT(*) - COUNT(encrypted_password) as users_without_passwords,
    CASE 
        WHEN COUNT(*) - COUNT(encrypted_password) = 0 THEN '✅ READY for constraint'
        ELSE '❌ NEED to fix passwords first'
    END as status
FROM profiles;

-- Show users with problematic passwords (if any)
SELECT 
    id, 
    email, 
    role, 
    encrypted_password IS NULL as is_null,
    encrypted_password = '' as is_empty,
    LENGTH(encrypted_password) < 10 as too_short,
    '❌ PROBLEM: This user will cause constraint violation' as issue
FROM profiles 
WHERE encrypted_password IS NULL 
   OR encrypted_password = '' 
   OR LENGTH(encrypted_password) < 10;

-- =============================================================================
-- CONSTRAINT ADDITION (Run only if above checks pass)
-- =============================================================================

-- If you see "✅ READY for constraint" above and no problematic users,
-- you can run the following:

-- Step 1: Add the NOT NULL constraint
ALTER TABLE profiles ALTER COLUMN encrypted_password SET NOT NULL;

-- Step 2: Add check constraint for minimum password length
ALTER TABLE profiles ADD CONSTRAINT encrypted_password_length 
    CHECK (LENGTH(encrypted_password) >= 10);

-- Step 3: Add check constraint for bcrypt format
ALTER TABLE profiles ADD CONSTRAINT encrypted_password_format 
    CHECK (encrypted_password ~ '^\\$2[aby]\\$[0-9]{2}\\$[./A-Za-z0-9]{53}$');

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify constraints are active
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass 
  AND conname LIKE '%encrypted_password%';

-- Final verification
SELECT 
    COUNT(*) as total_users,
    COUNT(encrypted_password) as users_with_passwords,
    CASE 
        WHEN COUNT(*) = COUNT(encrypted_password) THEN '✅ ALL GOOD - All users have passwords'
        ELSE '❌ PROBLEM - Some users still missing passwords'
    END as final_status
FROM profiles;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================
-- If you see "✅ ALL GOOD" above, the password enforcement is now active!
-- All future users MUST have encrypted passwords.
-- ============================================================================= 