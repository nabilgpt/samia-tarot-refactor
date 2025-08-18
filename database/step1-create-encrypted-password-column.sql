-- =============================================================================
-- STEP 1: CREATE ENCRYPTED_PASSWORD COLUMN - SAMIA TAROT
-- Just add the column without constraints (we'll add constraints later)
-- =============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted_password field (nullable for now)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS encrypted_password VARCHAR(255);

-- Add password metadata fields
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS password_updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_login_ip INET;

-- Update role constraint to include all required roles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('client', 'reader', 'admin', 'monitor', 'super_admin'));

-- =============================================================================
-- VERIFICATION - Check if column was created successfully
-- =============================================================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'encrypted_password';

-- Show current users status
SELECT 
    COUNT(*) as total_users,
    COUNT(encrypted_password) as users_with_passwords,
    COUNT(*) - COUNT(encrypted_password) as users_without_passwords
FROM profiles;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================
-- If you see the column info above, proceed to STEP 2:
-- Run: database/fix-users-passwords-simple.sql
-- ============================================================================= 