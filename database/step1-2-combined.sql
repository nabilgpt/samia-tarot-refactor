-- =====================================================================================
-- COMBINED STEPS 1 & 2: CONFIGURATION AND CURRENT STATE ANALYSIS
-- =====================================================================================
-- Version: 2.0
-- Purpose: Set up configuration and analyze current user state
-- Author: AI Assistant + Nabil Recommendations
-- Date: 2025-01-17
-- 
-- SECURITY NOTICE: This script performs destructive operations. Use only in development/staging.
-- =====================================================================================

-- Begin transaction to ensure everything happens in one go
BEGIN;

-- Drop any existing temporary tables to ensure clean state
DROP TABLE IF EXISTS script_config;
DROP TABLE IF EXISTS reset_audit_log;

-- Create script_config table for storing configuration variables
CREATE TEMP TABLE script_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT NOT NULL
);

-- Create audit log table for tracking steps
CREATE TEMP TABLE reset_audit_log (
    step_number INTEGER,
    step_name TEXT,
    status TEXT,
    affected_rows INTEGER,
    timestamp TIMESTAMP DEFAULT NOW(),
    details TEXT
);

-- Configuration Variables (Modify these as needed)
DO $$
DECLARE
    MAIN_ADMIN_ID TEXT := 'c3922fea-329a-4d6e-800c-3e03c9fe341d';
    DUPLICATE_ID TEXT := '0a28e972-9cc9-479b-aa1e-fafc5856af18';
    ENVIRONMENT TEXT := 'development';  -- Change to 'production' if needed
    rec RECORD;
    
BEGIN
    -- Step 1: Configuration Setup
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'STEP 1: CONFIGURATION SETUP';
    RAISE NOTICE '==========================================';
    
    -- Safety check - prevent running in production
    IF ENVIRONMENT = 'production' THEN
        RAISE EXCEPTION 'SAFETY CHECK: This script is blocked in production environment. Change ENVIRONMENT variable to continue.';
    END IF;
    
    -- Insert configuration values
    INSERT INTO script_config (key, value, description) VALUES
        ('MAIN_ADMIN_ID', MAIN_ADMIN_ID, 'Primary admin profile ID to keep'),
        ('DUPLICATE_ID', DUPLICATE_ID, 'Duplicate profile ID to remove'),
        ('ENVIRONMENT', ENVIRONMENT, 'Current environment (development/staging/production)'),
        ('SCRIPT_VERSION', '2.0', 'Script version for audit purposes'),
        ('CREATED_BY', 'Enterprise User Reset Script', 'Script identifier'),
        ('CREATED_AT', NOW()::TEXT, 'Script execution timestamp');
    
    -- Audit log for step 1
    INSERT INTO reset_audit_log (step_number, step_name, status, affected_rows)
    VALUES (1, 'Configuration Setup', 'SUCCESS', 6);
    
    RAISE NOTICE '✅ Configuration variables stored successfully';
    
    -- Show all stored configuration
    RAISE NOTICE '------------------------------------------';
    RAISE NOTICE 'STORED CONFIGURATION:';
    RAISE NOTICE '------------------------------------------';
    
    FOR rec IN SELECT key, value, description FROM script_config ORDER BY key LOOP
        RAISE NOTICE '- %: % (%)', rec.key, rec.value, rec.description;
    END LOOP;
    
END $$;

-- Step 2: Current State Analysis
DO $$
DECLARE
    profile_count INTEGER;
    user_count INTEGER;
    duplicate_count INTEGER;
    null_email_count INTEGER;
    inactive_count INTEGER;
    main_admin_exists BOOLEAN := FALSE;
    duplicate_exists BOOLEAN := FALSE;
    main_admin_info RECORD;
    duplicate_info RECORD;
    analysis_result TEXT;
    
BEGIN
    -- Step 2: Current State Analysis
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'STEP 2: CURRENT STATE ANALYSIS';
    RAISE NOTICE '==========================================';
    
    -- Validate configuration exists
    IF NOT EXISTS (SELECT 1 FROM script_config WHERE key = 'MAIN_ADMIN_ID') THEN
        RAISE EXCEPTION 'Configuration not found. Step 1 must be completed first.';
    END IF;
    
    -- Get total profile count
    SELECT COUNT(*) INTO profile_count FROM profiles;
    RAISE NOTICE '📊 Total profiles in database: %', profile_count;
    
    -- Analyze target profiles
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'TARGET PROFILES ANALYSIS:';
    RAISE NOTICE '==========================================';
    
    -- Check main admin profile
    SELECT COUNT(*) INTO user_count 
    FROM profiles 
    WHERE id = (SELECT value::uuid FROM script_config WHERE key = 'MAIN_ADMIN_ID');
    
    IF user_count > 0 THEN
        main_admin_exists := TRUE;
        SELECT * INTO main_admin_info 
        FROM profiles 
        WHERE id = (SELECT value::uuid FROM script_config WHERE key = 'MAIN_ADMIN_ID');
        
        RAISE NOTICE '✅ Main Admin Profile Found:';
        RAISE NOTICE '   - ID: %', main_admin_info.id;
        RAISE NOTICE '   - Email: %', COALESCE(main_admin_info.email, 'NULL');
        RAISE NOTICE '   - Role: %', COALESCE(main_admin_info.role, 'NULL');
        RAISE NOTICE '   - Active: %', main_admin_info.is_active;
        RAISE NOTICE '   - Has Password: %', CASE WHEN main_admin_info.encrypted_password IS NOT NULL THEN 'YES' ELSE 'NO' END;
    ELSE
        RAISE NOTICE '❌ Main Admin Profile NOT FOUND';
    END IF;
    
    -- Check duplicate profile
    SELECT COUNT(*) INTO user_count 
    FROM profiles 
    WHERE id = (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID');
    
    IF user_count > 0 THEN
        duplicate_exists := TRUE;
        SELECT * INTO duplicate_info 
        FROM profiles 
        WHERE id = (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID');
        
        RAISE NOTICE '⚠️ Duplicate Profile Found:';
        RAISE NOTICE '   - ID: %', duplicate_info.id;
        RAISE NOTICE '   - Email: %', COALESCE(duplicate_info.email, 'NULL');
        RAISE NOTICE '   - Role: %', COALESCE(duplicate_info.role, 'NULL');
        RAISE NOTICE '   - Active: %', duplicate_info.is_active;
        RAISE NOTICE '   - Has Password: %', CASE WHEN duplicate_info.encrypted_password IS NOT NULL THEN 'YES' ELSE 'NO' END;
    ELSE
        RAISE NOTICE '✅ Duplicate Profile NOT FOUND (already cleaned)';
    END IF;
    
    -- Check for profiles with null email
    SELECT COUNT(*) INTO null_email_count FROM profiles WHERE email IS NULL;
    RAISE NOTICE '🔍 Profiles with NULL email: %', null_email_count;
    
    -- Check for inactive profiles
    SELECT COUNT(*) INTO inactive_count FROM profiles WHERE is_active = FALSE;
    RAISE NOTICE '🔍 Inactive profiles: %', inactive_count;
    
    -- Foreign key dependencies check
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'FOREIGN KEY DEPENDENCIES:';
    RAISE NOTICE '==========================================';
    
    -- Check if duplicate profile is referenced anywhere
    IF duplicate_exists THEN
        -- Check some common tables for foreign key references
        SELECT COUNT(*) INTO user_count FROM tarot_spreads 
        WHERE approved_by = (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID');
        
        IF user_count > 0 THEN
            RAISE NOTICE '⚠️ Duplicate profile referenced in tarot_spreads.approved_by: % rows', user_count;
        END IF;
        
        -- Add more foreign key checks as needed
        -- Note: Add specific checks for your database schema
    END IF;
    
    -- Generate analysis summary
    analysis_result := format(
        'ANALYSIS SUMMARY: Total Profiles: %s, Main Admin: %s, Duplicate: %s, NULL Email: %s, Inactive: %s',
        profile_count,
        CASE WHEN main_admin_exists THEN 'EXISTS' ELSE 'MISSING' END,
        CASE WHEN duplicate_exists THEN 'EXISTS' ELSE 'MISSING' END,
        null_email_count,
        inactive_count
    );
    
    -- Log analysis results
    INSERT INTO reset_audit_log (step_number, step_name, status, affected_rows, details)
    VALUES (2, 'Current State Analysis', 'SUCCESS', profile_count, analysis_result);
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'ANALYSIS COMPLETE';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '%', analysis_result;
    
    -- Recommendations
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'RECOMMENDATIONS:';
    RAISE NOTICE '==========================================';
    
    IF NOT main_admin_exists THEN
        RAISE NOTICE '🚨 CRITICAL: Main admin profile missing - will need to be created';
    END IF;
    
    IF duplicate_exists THEN
        RAISE NOTICE '⚠️ WARNING: Duplicate profile exists - will need foreign key cleanup before deletion';
    END IF;
    
    IF null_email_count > 0 THEN
        RAISE NOTICE '⚠️ WARNING: % profile(s) have NULL email - will need cleanup', null_email_count;
    END IF;
    
    RAISE NOTICE '✅ Ready for Step 3: Foreign Key Cleanup';
    
END $$;

-- Commit the transaction
COMMIT;

-- Final message
SELECT 'Steps 1 & 2 completed successfully. Review the analysis above and proceed to Step 3 when ready.' AS status; 