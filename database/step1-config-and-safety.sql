-- =====================================================================================
-- STEP 1: CONFIGURATION VARIABLES AND SAFETY CHECK
-- =====================================================================================
-- Version: 2.0
-- Purpose: Set up configuration variables and perform safety checks
-- Author: AI Assistant + Nabil Recommendations
-- Date: 2025-01-17
-- 
-- SECURITY NOTICE: This script performs destructive operations. Use only in development/staging.
-- =====================================================================================

-- Configuration Variables (Modify these as needed)
DO $$
DECLARE
    MAIN_ADMIN_ID TEXT := 'c3922fea-329a-4d6e-800c-3e03c9fe341d';
    DUPLICATE_ID TEXT := '0a28e972-9cc9-479b-aa1e-fafc5856af18';
    ENVIRONMENT TEXT := 'development';  -- Change to 'staging' or 'production' as needed
BEGIN
    -- Safety Check: Prevent execution in production
    IF ENVIRONMENT = 'production' THEN
        RAISE EXCEPTION 'SAFETY: This script is blocked from running in production environment';
    END IF;
    
    -- Store variables in temporary table for use throughout the script
    CREATE TEMP TABLE IF NOT EXISTS script_config (
        key TEXT PRIMARY KEY,
        value TEXT
    );
    
    INSERT INTO script_config (key, value) VALUES
        ('MAIN_ADMIN_ID', MAIN_ADMIN_ID),
        ('DUPLICATE_ID', DUPLICATE_ID),
        ('ENVIRONMENT', ENVIRONMENT)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
    
    -- Log configuration
    RAISE NOTICE '🔧 Configuration Variables Set:';
    RAISE NOTICE '  - Main Admin ID: %', MAIN_ADMIN_ID;
    RAISE NOTICE '  - Duplicate ID: %', DUPLICATE_ID;
    RAISE NOTICE '  - Environment: %', ENVIRONMENT;
    
    -- Verify the configuration was stored
    IF NOT EXISTS (SELECT 1 FROM script_config WHERE key = 'MAIN_ADMIN_ID') THEN
        RAISE EXCEPTION 'Failed to store configuration variables';
    END IF;
    
    RAISE NOTICE '✅ Step 1 completed successfully: Configuration variables set and safety checks passed';
    RAISE NOTICE '🎯 Next: Run step2-audit-and-logging.sql';
END $$; 