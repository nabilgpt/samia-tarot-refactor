-- =====================================================================================
-- STEP 1: CONFIGURATION VARIABLES AND SAFETY CHECK (FIXED)
-- =====================================================================================
-- Version: 2.1 - FIXED VERSION
-- Purpose: Set up configuration variables and perform safety checks
-- Author: AI Assistant + Nabil Recommendations
-- Date: 2025-01-17
-- 
-- SECURITY NOTICE: This script performs destructive operations. Use only in development/staging.
-- =====================================================================================

-- First, drop any existing temporary tables to ensure clean state
DROP TABLE IF EXISTS script_config;
DROP TABLE IF EXISTS reset_audit_log;

-- Create script_config table for storing configuration variables
CREATE TEMP TABLE script_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create reset_audit_log table for tracking progress
CREATE TEMP TABLE reset_audit_log (
    step_number INTEGER,
    step_name TEXT,
    status TEXT,
    affected_rows INTEGER DEFAULT 0,
    details TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Configuration Variables (Modify these as needed)
DO $$
DECLARE
    MAIN_ADMIN_ID TEXT := 'c3922fea-329a-4d6e-800c-3e03c9fe341d';
    DUPLICATE_ID TEXT := '0a28e972-9cc9-479b-aa1e-fafc5856af18';
    ENVIRONMENT TEXT := 'development';  -- Change to 'production' to prevent execution in production
    
BEGIN
    -- Step 1: Configuration Variables and Safety Check
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'STEP 1: CONFIGURATION VARIABLES AND SAFETY CHECK';
    RAISE NOTICE 'VERSION: 2.1 - FIXED VERSION';
    RAISE NOTICE '==========================================';
    
    -- Safety check - prevent execution in production
    IF ENVIRONMENT = 'production' THEN
        RAISE EXCEPTION 'SAFETY CHECK FAILED: This script is set to production environment. Change ENVIRONMENT variable to development to proceed.';
    END IF;
    
    -- Insert step info
    INSERT INTO reset_audit_log (step_number, step_name, status, affected_rows)
    VALUES (1, 'Configuration Variables and Safety Check', 'STARTED', 0);
    
    -- Insert configuration variables
    INSERT INTO script_config (key, value, description) VALUES
        ('MAIN_ADMIN_ID', MAIN_ADMIN_ID, 'Main admin profile ID to keep and activate'),
        ('DUPLICATE_ID', DUPLICATE_ID, 'Duplicate admin profile ID to remove'),
        ('ENVIRONMENT', ENVIRONMENT, 'Environment setting for safety checks'),
        ('SCRIPT_VERSION', '2.1', 'Script version number'),
        ('CREATED_BY', 'AI Assistant + Nabil', 'Script creator');
    
    -- Verify configuration was stored
    RAISE NOTICE 'Configuration variables stored:';
    RAISE NOTICE '- MAIN_ADMIN_ID: %', MAIN_ADMIN_ID;
    RAISE NOTICE '- DUPLICATE_ID: %', DUPLICATE_ID;
    RAISE NOTICE '- ENVIRONMENT: %', ENVIRONMENT;
    
    -- Verify table exists and has data
    IF NOT EXISTS (SELECT 1 FROM script_config WHERE key = 'MAIN_ADMIN_ID') THEN
        RAISE EXCEPTION 'CONFIGURATION ERROR: Failed to store configuration variables';
    END IF;
    
    -- Mark step as completed
    UPDATE reset_audit_log 
    SET status = 'COMPLETED', 
        affected_rows = (SELECT COUNT(*) FROM script_config),
        details = 'Configuration variables stored successfully'
    WHERE step_number = 1;
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'STEP 1 COMPLETED SUCCESSFULLY';
    RAISE NOTICE 'Configuration table created with % entries', (SELECT COUNT(*) FROM script_config);
    RAISE NOTICE '==========================================';
    
END $$;

-- Final verification
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'FINAL VERIFICATION:';
    RAISE NOTICE '==========================================';
    
    -- Check if script_config table exists and has data
    IF EXISTS (SELECT 1 FROM script_config WHERE key = 'MAIN_ADMIN_ID') THEN
        RAISE NOTICE '✅ script_config table exists and has data';
        RAISE NOTICE '✅ Ready for Step 2: Current State Analysis';
    ELSE
        RAISE EXCEPTION '❌ script_config table verification failed';
    END IF;
    
    -- Show all stored configuration
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'STORED CONFIGURATION:';
    RAISE NOTICE '==========================================';
    
    FOR rec IN SELECT key, value, description FROM script_config ORDER BY key LOOP
        RAISE NOTICE '- %: % (%)', rec.key, rec.value, rec.description;
    END LOOP;
    
    RAISE NOTICE '==========================================';
    
END $$; 