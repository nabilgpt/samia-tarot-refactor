-- =====================================================================================
-- STEP 4: DUPLICATE PROFILE DELETION
-- =====================================================================================
-- Version: 3.0 - Safe version with comprehensive verification
-- Purpose: Safely delete duplicate profile after foreign key cleanup
-- Author: AI Assistant + Nabil Recommendations
-- Date: 2025-01-17
-- 
-- Prerequisites: Steps 1, 2, & 3 must be completed successfully
-- SAFETY: Multiple verification layers before deletion
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

-- Check if configuration exists (from previous steps)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM script_config WHERE key = 'MAIN_ADMIN_ID') THEN
        -- If config doesn't exist, recreate it
        INSERT INTO script_config (key, value, description) VALUES
            ('MAIN_ADMIN_ID', 'c3922fea-329a-4d6e-800c-3e03c9fe341d', 'Primary admin profile ID to keep'),
            ('DUPLICATE_ID', '0a28e972-9cc9-479b-aa1e-fafc5856af18', 'Duplicate profile ID to remove'),
            ('ENVIRONMENT', 'development', 'Current environment'),
            ('SCRIPT_VERSION', '3.0', 'Script version for audit purposes');
    END IF;
END $$;

-- Step 4: Duplicate Profile Deletion
DO $$
DECLARE
    duplicate_count INTEGER := 0;
    main_admin_count INTEGER := 0;
    foreign_key_count INTEGER := 0;
    rec RECORD;
    
BEGIN
    -- Step 4: Duplicate Profile Deletion
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'STEP 4: DUPLICATE PROFILE DELETION';
    RAISE NOTICE '==========================================';
    
    -- Validate prerequisites
    IF NOT EXISTS (SELECT 1 FROM script_config WHERE key = 'MAIN_ADMIN_ID') THEN
        RAISE EXCEPTION 'Configuration not found. Steps 1, 2, & 3 must be completed first.';
    END IF;
    
    -- Check if Step 3 was completed (should have audit log entry)
    IF NOT EXISTS (SELECT 1 FROM reset_audit_log WHERE step_number = 3 AND status = 'SUCCESS') THEN
        RAISE EXCEPTION 'Step 3 (Foreign Key Cleanup) must be completed successfully before Step 4.';
    END IF;
    
    -- Helper function to check if table exists
    CREATE OR REPLACE FUNCTION table_exists(p_table_name TEXT) 
    RETURNS BOOLEAN AS $func$
    BEGIN
        RETURN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = p_table_name
        );
    END $func$ LANGUAGE plpgsql;
    
    -- Helper function to check if column exists in table
    CREATE OR REPLACE FUNCTION column_exists(p_table_name TEXT, p_column_name TEXT) 
    RETURNS BOOLEAN AS $func$
    BEGIN
        RETURN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = p_table_name
            AND column_name = p_column_name
        );
    END $func$ LANGUAGE plpgsql;
    
    -- Safety Check 1: Verify main admin profile exists
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'SAFETY VERIFICATION:';
    RAISE NOTICE '==========================================';
    
    SELECT COUNT(*) INTO main_admin_count 
    FROM profiles 
    WHERE id = (SELECT value::uuid FROM script_config WHERE key = 'MAIN_ADMIN_ID');
    
    IF main_admin_count = 0 THEN
        RAISE EXCEPTION 'CRITICAL ERROR: Main admin profile not found! Cannot proceed with deletion.';
    END IF;
    
    RAISE NOTICE '✅ Main admin profile exists: % (count: %)', 
                 (SELECT value FROM script_config WHERE key = 'MAIN_ADMIN_ID'), 
                 main_admin_count;
    
    -- Safety Check 2: Verify duplicate profile exists
    SELECT COUNT(*) INTO duplicate_count 
    FROM profiles 
    WHERE id = (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID');
    
    IF duplicate_count = 0 THEN
        RAISE NOTICE '✅ Duplicate profile already removed - deletion not needed';
        INSERT INTO reset_audit_log (step_number, step_name, status, affected_rows, details)
        VALUES (4, 'Duplicate Profile Deletion', 'SKIPPED', 0, 'Duplicate profile already removed');
        
        -- Clean up helper functions
        DROP FUNCTION IF EXISTS table_exists(TEXT);
        DROP FUNCTION IF EXISTS column_exists(TEXT, TEXT);
        
        RETURN;
    END IF;
    
    RAISE NOTICE '⚠️ Duplicate profile found: % (count: %)', 
                 (SELECT value FROM script_config WHERE key = 'DUPLICATE_ID'), 
                 duplicate_count;
    
    -- Safety Check 3: Final foreign key verification
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'FINAL FOREIGN KEY VERIFICATION:';
    RAISE NOTICE '==========================================';
    
    foreign_key_count := 0;
    
    -- Check all foreign key relationships to profiles
    FOR rec IN 
        SELECT DISTINCT
            tc.table_name,
            kcu.column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_name = 'profiles'
            AND ccu.column_name = 'id'
            AND tc.table_schema = 'public'
    LOOP
        IF table_exists(rec.table_name) AND column_exists(rec.table_name, rec.column_name) THEN
            BEGIN
                EXECUTE format('SELECT COUNT(*) FROM %I WHERE %I = %L', 
                              rec.table_name, rec.column_name, 
                              (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID'))
                INTO duplicate_count;
                
                IF duplicate_count > 0 THEN
                    foreign_key_count := foreign_key_count + duplicate_count;
                    RAISE NOTICE '⚠️ WARNING: Found % remaining references in %.%', 
                                 duplicate_count, rec.table_name, rec.column_name;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '⚠️ Error checking %.%: %', rec.table_name, rec.column_name, SQLERRM;
            END;
        END IF;
    END LOOP;
    
    -- Safety Check 4: Block deletion if foreign keys remain
    IF foreign_key_count > 0 THEN
        RAISE EXCEPTION 'CRITICAL ERROR: Found % remaining foreign key references to duplicate profile. Cannot proceed with deletion. Please run Step 3 again.', foreign_key_count;
    END IF;
    
    RAISE NOTICE '✅ Foreign key verification passed: No remaining references found';
    
    -- Safety Check 5: Verify profile details before deletion
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'PROFILE DETAILS VERIFICATION:';
    RAISE NOTICE '==========================================';
    
    -- Show profile details for confirmation
    FOR rec IN 
        SELECT id, email, role, is_active, created_at, updated_at
        FROM profiles 
        WHERE id = (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID')
    LOOP
        RAISE NOTICE 'Profile to DELETE: ID=%, Email=%, Role=%, Active=%, Created=%', 
                     rec.id, rec.email, rec.role, rec.is_active, rec.created_at;
    END LOOP;
    
    -- Show main admin profile for confirmation
    FOR rec IN 
        SELECT id, email, role, is_active, created_at, updated_at
        FROM profiles 
        WHERE id = (SELECT value::uuid FROM script_config WHERE key = 'MAIN_ADMIN_ID')
    LOOP
        RAISE NOTICE 'Profile to KEEP: ID=%, Email=%, Role=%, Active=%, Created=%', 
                     rec.id, rec.email, rec.role, rec.is_active, rec.created_at;
    END LOOP;
    
    -- Final Safety Check: Environment verification
    IF (SELECT value FROM script_config WHERE key = 'ENVIRONMENT') = 'production' THEN
        RAISE EXCEPTION 'CRITICAL ERROR: This script should NOT be run in production environment!';
    END IF;
    
    -- PERFORM THE DELETION
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'PERFORMING SAFE DELETION:';
    RAISE NOTICE '==========================================';
    
    RAISE NOTICE '🗑️ Deleting duplicate profile...';
    
    DELETE FROM profiles 
    WHERE id = (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID');
    
    GET DIAGNOSTICS duplicate_count = ROW_COUNT;
    
    IF duplicate_count = 1 THEN
        RAISE NOTICE '✅ Successfully deleted duplicate profile';
    ELSE
        RAISE EXCEPTION 'CRITICAL ERROR: Expected to delete 1 profile, but deleted %. Operation failed.', duplicate_count;
    END IF;
    
    -- Post-deletion verification
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'POST-DELETION VERIFICATION:';
    RAISE NOTICE '==========================================';
    
    SELECT COUNT(*) INTO duplicate_count 
    FROM profiles 
    WHERE id = (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID');
    
    IF duplicate_count = 0 THEN
        RAISE NOTICE '✅ Verification passed: Duplicate profile successfully removed';
    ELSE
        RAISE EXCEPTION 'CRITICAL ERROR: Duplicate profile still exists after deletion!';
    END IF;
    
    -- Verify main admin profile still exists
    SELECT COUNT(*) INTO main_admin_count 
    FROM profiles 
    WHERE id = (SELECT value::uuid FROM script_config WHERE key = 'MAIN_ADMIN_ID');
    
    IF main_admin_count = 1 THEN
        RAISE NOTICE '✅ Verification passed: Main admin profile preserved';
    ELSE
        RAISE EXCEPTION 'CRITICAL ERROR: Main admin profile missing after deletion!';
    END IF;
    
    -- Clean up helper functions
    DROP FUNCTION IF EXISTS table_exists(TEXT);
    DROP FUNCTION IF EXISTS column_exists(TEXT, TEXT);
    
    -- Log the results
    INSERT INTO reset_audit_log (step_number, step_name, status, affected_rows, details)
    VALUES (4, 'Duplicate Profile Deletion', 'SUCCESS', 1, 
            format('Successfully deleted duplicate profile %s while preserving main admin %s', 
                   (SELECT value FROM script_config WHERE key = 'DUPLICATE_ID'),
                   (SELECT value FROM script_config WHERE key = 'MAIN_ADMIN_ID')));
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'STEP 4 COMPLETE: DUPLICATE PROFILE DELETION';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ Duplicate profile successfully deleted';
    RAISE NOTICE '✅ Main admin profile preserved';
    RAISE NOTICE '✅ All verifications passed';
    RAISE NOTICE '✅ Ready for Step 5: New Users Creation';
    
END $$;

-- Commit the transaction
COMMIT;

-- Final status
SELECT 'Step 4: Duplicate Profile Deletion completed successfully. Ready for Step 5: New Users Creation.' AS status; 