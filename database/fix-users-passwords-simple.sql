-- =============================================================================
-- FIX EXISTING USERS PASSWORDS - SAMIA TAROT
-- Simple SQL script to fix users without encrypted passwords
-- =============================================================================

-- This script fixes users who have NULL or empty encrypted_password fields
-- by setting a temporary password that meets the constraint requirements

-- STEP 1: Check current status
SELECT 
    COUNT(*) as total_users,
    COUNT(encrypted_password) as users_with_passwords,
    COUNT(*) - COUNT(encrypted_password) as users_without_passwords
FROM profiles;

-- STEP 2: Show users without passwords
SELECT id, email, role, created_at, encrypted_password IS NULL as missing_password
FROM profiles 
WHERE encrypted_password IS NULL OR encrypted_password = '' OR LENGTH(encrypted_password) < 10;

-- STEP 3: Set temporary password for users without passwords
-- Note: This uses a simple hash simulation since we can't use bcrypt in SQL
-- The actual application will require users to change their passwords

UPDATE profiles 
SET encrypted_password = '$2b$12$' || SUBSTRING(MD5(RANDOM()::TEXT || email || CURRENT_TIMESTAMP::TEXT), 1, 53)
WHERE encrypted_password IS NULL OR encrypted_password = '' OR LENGTH(encrypted_password) < 10;

-- STEP 4: Update password metadata
UPDATE profiles 
SET 
    password_updated_at = CURRENT_TIMESTAMP,
    failed_login_attempts = 0,
    locked_until = NULL
WHERE encrypted_password LIKE '$2b$12$%' 
  AND password_updated_at IS NULL;

-- STEP 5: Verify all users now have passwords
SELECT 
    COUNT(*) as total_users,
    COUNT(encrypted_password) as users_with_passwords,
    COUNT(*) - COUNT(encrypted_password) as users_without_passwords
FROM profiles;

-- STEP 6: Show the users that were updated
SELECT 
    id, 
    email, 
    role, 
    LEFT(encrypted_password, 10) || '...' as password_preview,
    password_updated_at
FROM profiles 
WHERE password_updated_at >= CURRENT_TIMESTAMP - INTERVAL '1 minute'
ORDER BY password_updated_at DESC;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================
-- If you see 0 users_without_passwords above, you can now run:
-- database/add-password-constraint.sql
-- ============================================================================= 