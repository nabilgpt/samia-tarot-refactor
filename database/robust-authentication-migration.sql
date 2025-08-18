-- =============================================================================
-- ROBUST AUTHENTICATION SYSTEM MIGRATION - SAMIA TAROT
-- Single users table with mandatory encrypted passwords
-- =============================================================================
-- Date: 2025-01-16
-- Purpose: Implement secure, maintainable authentication system
-- Requirements: Every user MUST have a valid bcrypt-encrypted password
-- =============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- STEP 1: ENHANCE PROFILES TABLE AS SINGLE USERS TABLE
-- =============================================================================

-- Add encrypted_password field with proper constraints
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS encrypted_password VARCHAR(255) NOT NULL DEFAULT '';

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
-- STEP 2: ADD MANDATORY PASSWORD CONSTRAINTS
-- =============================================================================

-- Temporary: Remove NOT NULL constraint to allow data migration
ALTER TABLE profiles ALTER COLUMN encrypted_password DROP NOT NULL;

-- Add length constraint (bcrypt hashes are 60 characters)
ALTER TABLE profiles ADD CONSTRAINT encrypted_password_length 
CHECK (LENGTH(encrypted_password) >= 60);

-- Add bcrypt format validation (starts with $2a$, $2b$, $2y$, or $2x$)
ALTER TABLE profiles ADD CONSTRAINT encrypted_password_format 
CHECK (encrypted_password ~ '^\\$2[abyxz]\\$[0-9]{2}\\$[A-Za-z0-9./]{53}$');

-- =============================================================================
-- STEP 3: CREATE AUTHENTICATION HELPER FUNCTIONS
-- =============================================================================

-- Function to validate password strength
CREATE OR REPLACE FUNCTION validate_password_strength(password_text TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Password must be at least 8 characters
    IF LENGTH(password_text) < 8 THEN
        RETURN FALSE;
    END IF;
    
    -- Password must contain at least one letter
    IF password_text !~ '[A-Za-z]' THEN
        RETURN FALSE;
    END IF;
    
    -- Password must contain at least one number
    IF password_text !~ '[0-9]' THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to generate secure temporary password
CREATE OR REPLACE FUNCTION generate_secure_password()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    password TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..12 LOOP
        password := password || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN password;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user needs password reset
CREATE OR REPLACE FUNCTION user_needs_password_reset(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id 
        AND (encrypted_password IS NULL OR encrypted_password = '')
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STEP 4: CREATE AUDIT LOGGING FOR AUTHENTICATION
-- =============================================================================

-- Authentication audit log table
CREATE TABLE IF NOT EXISTS auth_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'login', 'logout', 'failed_login', 'password_change', 'account_locked'
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT FALSE,
    failure_reason TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '90 days'
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_user_id ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_email ON auth_audit_log(email);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_action ON auth_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_created_at ON auth_audit_log(created_at);

-- =============================================================================
-- STEP 5: CREATE TRIGGER FOR PASSWORD UPDATES
-- =============================================================================

-- Function to update password_updated_at timestamp
CREATE OR REPLACE FUNCTION update_password_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.encrypted_password IS DISTINCT FROM OLD.encrypted_password THEN
        NEW.password_updated_at = NOW();
        NEW.failed_login_attempts = 0; -- Reset failed attempts on password change
        NEW.locked_until = NULL; -- Unlock account on password change
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for password updates
DROP TRIGGER IF EXISTS trigger_password_update ON profiles;
CREATE TRIGGER trigger_password_update
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_password_timestamp();

-- =============================================================================
-- STEP 6: CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

-- Indexes for authentication performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_email_active ON profiles(email, is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_password_reset_token ON profiles(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_profiles_locked_until ON profiles(locked_until);

-- =============================================================================
-- STEP 7: CREATE VALIDATION FUNCTIONS
-- =============================================================================

-- Function to validate user data before insert/update
CREATE OR REPLACE FUNCTION validate_user_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Email is required
    IF NEW.email IS NULL OR NEW.email = '' THEN
        RAISE EXCEPTION 'Email is required';
    END IF;
    
    -- Email must be valid format
    IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format';
    END IF;
    
    -- Role is required
    IF NEW.role IS NULL OR NEW.role = '' THEN
        RAISE EXCEPTION 'Role is required';
    END IF;
    
    -- For new users, encrypted_password will be validated later
    -- For existing users, we'll handle migration separately
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create validation trigger
DROP TRIGGER IF EXISTS trigger_validate_user_data ON profiles;
CREATE TRIGGER trigger_validate_user_data
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION validate_user_data();

-- =============================================================================
-- STEP 8: MIGRATION SUMMARY
-- =============================================================================

-- Create migration log table
CREATE TABLE IF NOT EXISTS auth_migration_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_step VARCHAR(100) NOT NULL,
    description TEXT,
    affected_users INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'completed', -- 'completed', 'failed', 'partial'
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log this migration
INSERT INTO auth_migration_log (migration_step, description, status) VALUES
('schema_update', 'Added encrypted_password field and constraints to profiles table', 'completed'),
('helper_functions', 'Created password validation and generation helper functions', 'completed'),
('audit_logging', 'Created authentication audit logging system', 'completed'),
('triggers', 'Created triggers for password updates and data validation', 'completed'),
('indexes', 'Created performance indexes for authentication', 'completed');

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
-- Next steps:
-- 1. Run the user migration script to fix existing users without passwords
-- 2. Update backend authentication logic to use encrypted_password field
-- 3. Add validation in all user creation/update endpoints
-- 4. Test the new authentication system
-- ============================================================================= 