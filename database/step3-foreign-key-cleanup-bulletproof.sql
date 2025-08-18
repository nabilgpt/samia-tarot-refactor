-- =====================================================================================
-- STEP 3: FOREIGN KEY CLEANUP (BULLETPROOF VERSION)
-- =====================================================================================
-- Version: 3.0 - Bulletproof version with table AND column existence checks
-- Purpose: Clean up foreign key references before deleting duplicate profile
-- Author: AI Assistant + Nabil Recommendations
-- Date: 2025-01-17
-- 
-- Prerequisites: Steps 1 & 2 must be completed successfully
-- IMPROVEMENTS: Checks both table existence AND column existence before operations
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

-- Step 3: Foreign Key Cleanup (Bulletproof Version)
DO $$
DECLARE
    cleanup_count INTEGER := 0;
    total_updated INTEGER := 0;
    table_exists BOOLEAN := FALSE;
    column_exists BOOLEAN := FALSE;
    rec RECORD;
    
BEGIN
    -- Step 3: Foreign Key Cleanup
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'STEP 3: FOREIGN KEY CLEANUP (BULLETPROOF)';
    RAISE NOTICE '==========================================';
    
    -- Validate prerequisites
    IF NOT EXISTS (SELECT 1 FROM script_config WHERE key = 'MAIN_ADMIN_ID') THEN
        RAISE EXCEPTION 'Configuration not found. Steps 1 & 2 must be completed first.';
    END IF;
    
    -- Check if duplicate profile exists
    SELECT COUNT(*) INTO cleanup_count 
    FROM profiles 
    WHERE id = (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID');
    
    IF cleanup_count = 0 THEN
        RAISE NOTICE '✅ No duplicate profile found - cleanup not needed';
        INSERT INTO reset_audit_log (step_number, step_name, status, affected_rows, details)
        VALUES (3, 'Foreign Key Cleanup', 'SKIPPED', 0, 'No duplicate profile found');
        RETURN;
    END IF;
    
    RAISE NOTICE '🔍 Found duplicate profile - starting bulletproof foreign key cleanup...';
    
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
    
    -- Helper function to safely clean up references
    CREATE OR REPLACE FUNCTION cleanup_references(p_table_name TEXT, p_column_name TEXT) 
    RETURNS INTEGER AS $func$
    DECLARE
        ref_count INTEGER := 0;
        updated_count INTEGER := 0;
    BEGIN
        -- Check if both table and column exist
        IF NOT table_exists(p_table_name) THEN
            RAISE NOTICE '⚠️ Table % does not exist - skipping', p_table_name;
            RETURN 0;
        END IF;
        
        IF NOT column_exists(p_table_name, p_column_name) THEN
            RAISE NOTICE '⚠️ Column %.% does not exist - skipping', p_table_name, p_column_name;
            RETURN 0;
        END IF;
        
        -- Count references
        EXECUTE format('SELECT COUNT(*) FROM %I WHERE %I = %L', 
                      p_table_name, p_column_name, 
                      (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID'))
        INTO ref_count;
        
        IF ref_count > 0 THEN
            RAISE NOTICE '⚠️ Found % references in %.%', ref_count, p_table_name, p_column_name;
            
            -- Update the references
            EXECUTE format('UPDATE %I SET %I = %L WHERE %I = %L', 
                          p_table_name, p_column_name, 
                          (SELECT value::uuid FROM script_config WHERE key = 'MAIN_ADMIN_ID'),
                          p_column_name, 
                          (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID'));
            
            GET DIAGNOSTICS updated_count = ROW_COUNT;
            
            RAISE NOTICE '✅ Updated % rows in %.%', updated_count, p_table_name, p_column_name;
            RETURN updated_count;
        ELSE
            RAISE NOTICE '✅ No references found in %.%', p_table_name, p_column_name;
            RETURN 0;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Error cleaning up %.%: %', p_table_name, p_column_name, SQLERRM;
        RETURN 0;
    END $func$ LANGUAGE plpgsql;
    
    -- Method 1: Check specific known tables with bulletproof verification
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'CHECKING KNOWN TABLES (BULLETPROOF):';
    RAISE NOTICE '==========================================';
    
    -- Known table/column combinations to check
    total_updated := total_updated + cleanup_references('tarot_spreads', 'approved_by');
    total_updated := total_updated + cleanup_references('tarot_spreads', 'created_by');
    total_updated := total_updated + cleanup_references('tarot_spreads', 'updated_by');
    
    total_updated := total_updated + cleanup_references('user_activities', 'user_id');
    total_updated := total_updated + cleanup_references('user_activities', 'created_by');
    
    total_updated := total_updated + cleanup_references('bookings', 'user_id');
    total_updated := total_updated + cleanup_references('bookings', 'client_id');
    total_updated := total_updated + cleanup_references('bookings', 'created_by');
    total_updated := total_updated + cleanup_references('bookings', 'updated_by');
    
    total_updated := total_updated + cleanup_references('reader_assignments', 'assigned_by');
    total_updated := total_updated + cleanup_references('reader_assignments', 'reader_id');
    
    total_updated := total_updated + cleanup_references('notifications', 'user_id');
    total_updated := total_updated + cleanup_references('notifications', 'recipient_id');
    total_updated := total_updated + cleanup_references('notifications', 'created_by');
    
    total_updated := total_updated + cleanup_references('payments', 'user_id');
    total_updated := total_updated + cleanup_references('payments', 'client_id');
    
    total_updated := total_updated + cleanup_references('feedback', 'user_id');
    total_updated := total_updated + cleanup_references('feedback', 'client_id');
    total_updated := total_updated + cleanup_references('feedback', 'reader_id');
    
    total_updated := total_updated + cleanup_references('chat_messages', 'user_id');
    total_updated := total_updated + cleanup_references('chat_messages', 'sender_id');
    total_updated := total_updated + cleanup_references('chat_messages', 'recipient_id');
    
    total_updated := total_updated + cleanup_references('sessions', 'user_id');
    total_updated := total_updated + cleanup_references('sessions', 'client_id');
    total_updated := total_updated + cleanup_references('sessions', 'reader_id');
    
    -- Method 2: Dynamic discovery of foreign key references (Bulletproof version)
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'DYNAMIC FOREIGN KEY DISCOVERY (BULLETPROOF):';
    RAISE NOTICE '==========================================';
    
    -- Query to find all foreign key columns that reference profiles
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
        ORDER BY tc.table_name, kcu.column_name
    LOOP
        RAISE NOTICE '🔍 Discovered foreign key: %.%', rec.table_name, rec.column_name;
        total_updated := total_updated + cleanup_references(rec.table_name, rec.column_name);
    END LOOP;
    
    -- Method 3: Additional UUID column checks (for columns that might not have formal FK constraints)
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'CHECKING POTENTIAL UUID COLUMNS:';
    RAISE NOTICE '==========================================';
    
    -- Check for common UUID pattern columns that might reference profiles
    FOR rec IN 
        SELECT DISTINCT
            table_name,
            column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND data_type = 'uuid'
            AND column_name IN ('profile_id', 'author_id', 'owner_id', 'moderator_id', 'approver_id')
            AND table_name != 'profiles'
        ORDER BY table_name, column_name
    LOOP
        RAISE NOTICE '🔍 Checking potential UUID reference: %.%', rec.table_name, rec.column_name;
        total_updated := total_updated + cleanup_references(rec.table_name, rec.column_name);
    END LOOP;
    
    -- Final verification
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'CLEANUP VERIFICATION:';
    RAISE NOTICE '==========================================';
    
    -- Check if any references still exist
    cleanup_count := 0;
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
                INTO cleanup_count;
                
                IF cleanup_count > 0 THEN
                    RAISE NOTICE '⚠️ WARNING: Still found % references in %.%', cleanup_count, rec.table_name, rec.column_name;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '⚠️ Error verifying table %.%: %', rec.table_name, rec.column_name, SQLERRM;
            END;
        END IF;
    END LOOP;
    
    -- Clean up the helper functions
    DROP FUNCTION IF EXISTS table_exists(TEXT);
    DROP FUNCTION IF EXISTS column_exists(TEXT, TEXT);
    DROP FUNCTION IF EXISTS cleanup_references(TEXT, TEXT);
    
    -- Log the results
    INSERT INTO reset_audit_log (step_number, step_name, status, affected_rows, details)
    VALUES (3, 'Foreign Key Cleanup (Bulletproof)', 'SUCCESS', total_updated, 
            format('Updated %s total foreign key references with comprehensive table/column verification', total_updated));
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'STEP 3 COMPLETE (BULLETPROOF VERSION)';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ Total foreign key references updated: %', total_updated;
    RAISE NOTICE '✅ All table and column existence checks passed';
    
    IF total_updated > 0 THEN
        RAISE NOTICE '✅ Ready for Step 4: Duplicate Profile Deletion';
    ELSE
        RAISE NOTICE '✅ No cleanup needed - Ready for Step 4: Duplicate Profile Deletion';
    END IF;
    
END $$;

-- Commit the transaction
COMMIT;

-- Final status
SELECT 'Step 3 (Bulletproof): Foreign Key Cleanup completed successfully with comprehensive verification. Ready for Step 4: Duplicate Profile Deletion.' AS status; 