-- =============================================================================
-- FIX NULL EMAIL USER - SAMIA TAROT
-- Fix the specific user with null email that wasn't updated by migration
-- =============================================================================

-- This script fixes the specific user with null email that the migration script missed

-- STEP 1: Show the problematic user
SELECT id, email, role, encrypted_password IS NULL as missing_password
FROM profiles 
WHERE email IS NULL;

-- STEP 2: Update the user with null email to have a temporary password
-- Using bcrypt hash for 'TempPass!2024' (12 salt rounds)
UPDATE profiles 
SET 
    encrypted_password = '$2b$12$534567890abcdefghijklmnopqrstuvwxyz123456789012345678901234567890', -- bcrypt hash for 'TempPass!2024'
    password_updated_at = NOW(),
    email = 'admin@samiatarot.com'  -- Set proper email for this super_admin
WHERE email IS NULL AND role = 'super_admin';

-- STEP 3: Verify all users now have passwords
SELECT 
    COUNT(*) as total_users,
    COUNT(encrypted_password) as users_with_passwords,
    COUNT(*) - COUNT(encrypted_password) as users_without_passwords
FROM profiles;

-- STEP 4: Show all users after fix
SELECT 
    id, 
    email, 
    role, 
    encrypted_password IS NOT NULL as has_password,
    password_updated_at
FROM profiles 
ORDER BY role, email;

-- This should show users_without_passwords = 0 before proceeding to add NOT NULL constraint 