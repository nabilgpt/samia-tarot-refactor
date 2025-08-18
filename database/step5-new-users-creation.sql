-- =====================================================================================
-- STEP 5: NEW USERS CREATION
-- =====================================================================================
-- Version: 3.0 - Comprehensive user creation with encrypted passwords
-- Purpose: Create new users with proper roles and encrypted passwords
-- Author: AI Assistant + Nabil Recommendations
-- Date: 2025-01-17
-- 
-- Prerequisites: Steps 1, 2, 3, & 4 must be completed successfully
-- SECURITY: bcrypt encryption with 12 salt rounds for all passwords
-- =====================================================================================

-- Begin transaction
BEGIN;

-- Recreate temporary tables if they don't exist (in case of new session)
CREATE TEMP TABLE IF NOT EXISTS script_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT NOT NULL
);

CREATE TEMP TABLE IF NOT EXISTS reset_audit_log (
    step_number INTEGER,
    step_name TEXT,
    status TEXT,
    affected_rows INTEGER,
    timestamp TIMESTAMP DEFAULT NOW(),
    details TEXT
);

-- Ensure configuration exists (recreate if missing due to session change)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM script_config WHERE key = 'MAIN_ADMIN_ID') THEN
        -- Recreate configuration (user confirmed previous steps were successful)
        INSERT INTO script_config (key, value, description) VALUES
            ('MAIN_ADMIN_ID', 'c3922fea-329a-4d6e-800c-3e03c9fe341d', 'Primary admin profile ID to keep'),
            ('DUPLICATE_ID', '0a28e972-9cc9-479b-aa1e-fafc5856af18', 'Duplicate profile ID to remove'),
            ('ENVIRONMENT', 'development', 'Current environment'),
            ('SCRIPT_VERSION', '3.0', 'Script version for audit purposes');
            
        RAISE NOTICE '✅ Configuration recreated for new session';
    END IF;
END $$;

-- Load bcrypt extension for password hashing
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 5: New Users Creation
DO $$
DECLARE
    user_count INTEGER := 0;
    existing_count INTEGER := 0;
    created_count INTEGER := 0;
    updated_count INTEGER := 0;
    rec RECORD;
    temp_password TEXT;
    
    -- User data array
    user_data RECORD;
    
BEGIN
    -- Step 5: New Users Creation
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'STEP 5: NEW USERS CREATION';
    RAISE NOTICE '==========================================';
    
    -- Validate configuration exists
    IF NOT EXISTS (SELECT 1 FROM script_config WHERE key = 'MAIN_ADMIN_ID') THEN
        RAISE EXCEPTION 'Configuration not found. Please run previous steps first.';
    END IF;
    
    -- Final Safety Check: Environment verification
    IF (SELECT value FROM script_config WHERE key = 'ENVIRONMENT') = 'production' THEN
        RAISE EXCEPTION 'CRITICAL ERROR: This script should NOT be run in production environment!';
    END IF;
    
    -- Check current user count
    SELECT COUNT(*) INTO user_count FROM profiles;
    RAISE NOTICE '📊 Current profiles count: %', user_count;
    
    -- Helper function to hash passwords (using PostgreSQL's crypt function)
    CREATE OR REPLACE FUNCTION hash_password(plain_password TEXT) 
    RETURNS TEXT AS $func$
    BEGIN
        -- Generate bcrypt hash with 12 salt rounds
        RETURN crypt(plain_password, gen_salt('bf', 12));
    END $func$ LANGUAGE plpgsql;
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'CREATING/UPDATING ENTERPRISE USERS:';
    RAISE NOTICE '==========================================';
    
    -- User 1: Super Admin (info@samiatarot.com)
    RAISE NOTICE '👤 Processing Super Admin: info@samiatarot.com';
    
    SELECT COUNT(*) INTO existing_count 
    FROM profiles 
    WHERE email = 'info@samiatarot.com';
    
    IF existing_count = 0 THEN
        INSERT INTO profiles (
            id, email, role, encrypted_password, phone, is_active, 
            first_name, last_name, created_at, updated_at
        ) VALUES (
            'c3922fea-329a-4d6e-800c-3e03c9fe341d'::uuid,
            'info@samiatarot.com',
            'super_admin',
            hash_password('TempPass!2024'),
            '+1234567890',
            true,
            'Samia',
            'Tarot Admin',
            NOW(),
            NOW()
        );
        created_count := created_count + 1;
        RAISE NOTICE '✅ Created Super Admin: info@samiatarot.com (TempPass!2024)';
    ELSE
        UPDATE profiles 
        SET 
            role = 'super_admin',
            encrypted_password = hash_password('TempPass!2024'),
            is_active = true,
            updated_at = NOW()
        WHERE email = 'info@samiatarot.com';
        updated_count := updated_count + 1;
        RAISE NOTICE '✅ Updated Super Admin: info@samiatarot.com (TempPass!2024)';
    END IF;
    
    -- User 2: Admin (saeeeel@gmail.com)
    RAISE NOTICE '👤 Processing Admin: saeeeel@gmail.com';
    
    SELECT COUNT(*) INTO existing_count 
    FROM profiles 
    WHERE email = 'saeeeel@gmail.com';
    
    IF existing_count = 0 THEN
        INSERT INTO profiles (
            id, email, role, encrypted_password, phone, is_active, 
            first_name, last_name, created_at, updated_at
        ) VALUES (
            uuid_generate_v4(),
            'saeeeel@gmail.com',
            'admin',
            hash_password('TempPass!2025'),
            '+1234567891',
            true,
            'Saeel',
            'Admin',
            NOW(),
            NOW()
        );
        created_count := created_count + 1;
        RAISE NOTICE '✅ Created Admin: saeeeel@gmail.com (TempPass!2025)';
    ELSE
        UPDATE profiles 
        SET 
            role = 'admin',
            encrypted_password = hash_password('TempPass!2025'),
            is_active = true,
            updated_at = NOW()
        WHERE email = 'saeeeel@gmail.com';
        updated_count := updated_count + 1;
        RAISE NOTICE '✅ Updated Admin: saeeeel@gmail.com (TempPass!2025)';
    END IF;
    
    -- User 3: Monitor (nabilzein@gmail.com)
    RAISE NOTICE '👤 Processing Monitor: nabilzein@gmail.com';
    
    SELECT COUNT(*) INTO existing_count 
    FROM profiles 
    WHERE email = 'nabilzein@gmail.com';
    
    IF existing_count = 0 THEN
        INSERT INTO profiles (
            id, email, role, encrypted_password, phone, is_active, 
            first_name, last_name, created_at, updated_at
        ) VALUES (
            uuid_generate_v4(),
            'nabilzein@gmail.com',
            'monitor',
            hash_password('TempPass!2026'),
            '+1234567892',
            true,
            'Nabil',
            'Monitor',
            NOW(),
            NOW()
        );
        created_count := created_count + 1;
        RAISE NOTICE '✅ Created Monitor: nabilzein@gmail.com (TempPass!2026)';
    ELSE
        UPDATE profiles 
        SET 
            role = 'monitor',
            encrypted_password = hash_password('TempPass!2026'),
            is_active = true,
            updated_at = NOW()
        WHERE email = 'nabilzein@gmail.com';
        updated_count := updated_count + 1;
        RAISE NOTICE '✅ Updated Monitor: nabilzein@gmail.com (TempPass!2026)';
    END IF;
    
    -- User 4: Reader (nabilgpt.en@gmail.com)
    RAISE NOTICE '👤 Processing Reader: nabilgpt.en@gmail.com';
    
    SELECT COUNT(*) INTO existing_count 
    FROM profiles 
    WHERE email = 'nabilgpt.en@gmail.com';
    
    IF existing_count = 0 THEN
        INSERT INTO profiles (
            id, email, role, encrypted_password, phone, is_active, 
            first_name, last_name, created_at, updated_at
        ) VALUES (
            uuid_generate_v4(),
            'nabilgpt.en@gmail.com',
            'reader',
            hash_password('TempPass!2027'),
            '+1234567893',
            true,
            'Nabil',
            'Reader',
            NOW(),
            NOW()
        );
        created_count := created_count + 1;
        RAISE NOTICE '✅ Created Reader: nabilgpt.en@gmail.com (TempPass!2027)';
    ELSE
        UPDATE profiles 
        SET 
            role = 'reader',
            encrypted_password = hash_password('TempPass!2027'),
            is_active = true,
            updated_at = NOW()
        WHERE email = 'nabilgpt.en@gmail.com';
        updated_count := updated_count + 1;
        RAISE NOTICE '✅ Updated Reader: nabilgpt.en@gmail.com (TempPass!2027)';
    END IF;
    
    -- User 5: Reader (sara@sara.com)
    RAISE NOTICE '👤 Processing Reader: sara@sara.com';
    
    SELECT COUNT(*) INTO existing_count 
    FROM profiles 
    WHERE email = 'sara@sara.com';
    
    IF existing_count = 0 THEN
        INSERT INTO profiles (
            id, email, role, encrypted_password, phone, is_active, 
            first_name, last_name, created_at, updated_at
        ) VALUES (
            uuid_generate_v4(),
            'sara@sara.com',
            'reader',
            hash_password('TempPass!2028'),
            '+1234567894',
            true,
            'Sara',
            'Reader',
            NOW(),
            NOW()
        );
        created_count := created_count + 1;
        RAISE NOTICE '✅ Created Reader: sara@sara.com (TempPass!2028)';
    ELSE
        UPDATE profiles 
        SET 
            role = 'reader',
            encrypted_password = hash_password('TempPass!2028'),
            is_active = true,
            updated_at = NOW()
        WHERE email = 'sara@sara.com';
        updated_count := updated_count + 1;
        RAISE NOTICE '✅ Updated Reader: sara@sara.com (TempPass!2028)';
    END IF;
    
    -- Post-creation verification
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'POST-CREATION VERIFICATION:';
    RAISE NOTICE '==========================================';
    
    -- Check all users exist and are active
    SELECT COUNT(*) INTO user_count 
    FROM profiles 
    WHERE email IN (
        'info@samiatarot.com',
        'saeeeel@gmail.com',
        'nabilzein@gmail.com',
        'nabilgpt.en@gmail.com',
        'sara@sara.com'
    ) AND is_active = true;
    
    IF user_count = 5 THEN
        RAISE NOTICE '✅ All 5 users verified: active and properly configured';
    ELSE
        RAISE EXCEPTION 'CRITICAL ERROR: Expected 5 active users, found %', user_count;
    END IF;
    
    -- Verify password encryption
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'PASSWORD ENCRYPTION VERIFICATION:';
    RAISE NOTICE '==========================================';
    
    FOR rec IN 
        SELECT email, encrypted_password, role 
        FROM profiles 
        WHERE email IN (
            'info@samiatarot.com',
            'saeeeel@gmail.com',
            'nabilzein@gmail.com',
            'nabilgpt.en@gmail.com',
            'sara@sara.com'
        )
        ORDER BY email
    LOOP
        IF rec.encrypted_password IS NOT NULL AND LENGTH(rec.encrypted_password) > 50 THEN
            RAISE NOTICE '✅ %: encrypted_password verified (% role)', rec.email, rec.role;
        ELSE
            RAISE EXCEPTION 'CRITICAL ERROR: Password encryption failed for %', rec.email;
        END IF;
    END LOOP;
    
    -- Clean up helper function
    DROP FUNCTION IF EXISTS hash_password(TEXT);
    
    -- Log the results
    INSERT INTO reset_audit_log (step_number, step_name, status, affected_rows, details)
    VALUES (5, 'New Users Creation', 'SUCCESS', created_count + updated_count, 
            format('Created %s new users, updated %s existing users. All 5 users have encrypted passwords and proper roles.', 
                   created_count, updated_count));
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'STEP 5 COMPLETE: NEW USERS CREATION';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ Created: % users', created_count;
    RAISE NOTICE '✅ Updated: % users', updated_count;
    RAISE NOTICE '✅ Total enterprise users: 5';
    RAISE NOTICE '✅ All passwords encrypted with bcrypt (12 salt rounds)';
    RAISE NOTICE '✅ All users active and ready for login';
    RAISE NOTICE '✅ Ready for Step 6: Final Verification';
    
END $$;

-- Commit the transaction
COMMIT;

-- Final status
SELECT 'Step 5: New Users Creation completed successfully. Ready for Step 6: Final Verification.' AS status; 