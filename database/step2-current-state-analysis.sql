-- =====================================================================================
-- STEP 2: CURRENT STATE ANALYSIS
-- =====================================================================================
-- Version: 2.0
-- Purpose: Analyze current user state and identify issues
-- Author: AI Assistant + Nabil Recommendations
-- Date: 2025-01-17
-- 
-- Prerequisites: Step 1 must be completed successfully
-- =====================================================================================

DO $$
DECLARE
    profile_count INTEGER;
    user_count INTEGER;
    duplicate_count INTEGER;
    null_email_count INTEGER;
    inactive_count INTEGER;
    analysis_result TEXT;
    
BEGIN
    -- Step 2: Current State Analysis
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'STEP 2: CURRENT STATE ANALYSIS';
    RAISE NOTICE '==========================================';
    
    -- Verify Step 1 completed
    IF NOT EXISTS (SELECT 1 FROM script_config WHERE key = 'MAIN_ADMIN_ID') THEN
        RAISE EXCEPTION 'Step 1 not completed. Please run step1-config-and-safety.sql first.';
    END IF;
    
    -- Insert step info
    INSERT INTO reset_audit_log (step_number, step_name, status, affected_rows)
    VALUES (2, 'Current State Analysis', 'STARTED', 0);
    
    -- 1. Count total profiles
    SELECT COUNT(*) INTO profile_count FROM profiles;
    RAISE NOTICE 'Total profiles in database: %', profile_count;
    
    -- 2. Count users with duplicate IDs
    SELECT COUNT(*) INTO duplicate_count 
    FROM profiles 
    WHERE id IN (
        (SELECT value::uuid FROM script_config WHERE key = 'MAIN_ADMIN_ID'),
        (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID')
    );
    RAISE NOTICE 'Profiles with target IDs: %', duplicate_count;
    
    -- 3. Count users with null email
    SELECT COUNT(*) INTO null_email_count 
    FROM profiles 
    WHERE email IS NULL;
    RAISE NOTICE 'Profiles with null email: %', null_email_count;
    
    -- 4. Count inactive users
    SELECT COUNT(*) INTO inactive_count 
    FROM profiles 
    WHERE is_active = false;
    RAISE NOTICE 'Inactive profiles: %', inactive_count;
    
    -- 5. Analyze specific target profiles
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'TARGET PROFILES ANALYSIS:';
    RAISE NOTICE '==========================================';
    
    -- Main admin profile
    SELECT INTO analysis_result
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = (SELECT value::uuid FROM script_config WHERE key = 'MAIN_ADMIN_ID')
        ) THEN 
            (SELECT format('MAIN_ADMIN_ID exists - Email: %s, Role: %s, Active: %s', 
                          COALESCE(email, 'NULL'), 
                          COALESCE(role, 'NULL'), 
                          COALESCE(is_active::text, 'NULL'))
             FROM profiles 
             WHERE id = (SELECT value::uuid FROM script_config WHERE key = 'MAIN_ADMIN_ID'))
        ELSE 'MAIN_ADMIN_ID does not exist'
    END;
    RAISE NOTICE '%', analysis_result;
    
    -- Duplicate profile
    SELECT INTO analysis_result
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID')
        ) THEN 
            (SELECT format('DUPLICATE_ID exists - Email: %s, Role: %s, Active: %s', 
                          COALESCE(email, 'NULL'), 
                          COALESCE(role, 'NULL'), 
                          COALESCE(is_active::text, 'NULL'))
             FROM profiles 
             WHERE id = (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID'))
        ELSE 'DUPLICATE_ID does not exist'
    END;
    RAISE NOTICE '%', analysis_result;
    
    -- 6. Check for foreign key dependencies
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'FOREIGN KEY DEPENDENCIES:';
    RAISE NOTICE '==========================================';
    
    -- Check tarot_spreads dependencies
    SELECT COUNT(*) INTO user_count 
    FROM tarot_spreads 
    WHERE approved_by = (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID');
    
    IF user_count > 0 THEN
        RAISE NOTICE 'WARNING: % tarot_spreads records reference DUPLICATE_ID', user_count;
    ELSE
        RAISE NOTICE 'No tarot_spreads dependencies found';
    END IF;
    
    -- 7. Summary
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'ANALYSIS SUMMARY:';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Total profiles: %', profile_count;
    RAISE NOTICE 'Problematic profiles: %', duplicate_count;
    RAISE NOTICE 'Null email profiles: %', null_email_count;
    RAISE NOTICE 'Inactive profiles: %', inactive_count;
    RAISE NOTICE 'Foreign key dependencies: %', user_count;
    
    -- Mark step as completed
    UPDATE reset_audit_log 
    SET status = 'COMPLETED', 
        affected_rows = profile_count,
        details = format('Analyzed %s profiles, found %s issues', profile_count, duplicate_count)
    WHERE step_number = 2;
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'STEP 2 COMPLETED SUCCESSFULLY';
    RAISE NOTICE '==========================================';
    
END $$; 