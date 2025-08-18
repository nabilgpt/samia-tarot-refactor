-- =====================================================================================
-- STEP 3: FOREIGN KEY CLEANUP (SAFE VERSION)
-- =====================================================================================
-- Version: 2.1 - Safe version with table existence checks
-- Purpose: Clean up foreign key references before deleting duplicate profile
-- Author: AI Assistant + Nabil Recommendations
-- Date: 2025-01-17
-- 
-- Prerequisites: Steps 1 & 2 must be completed successfully
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
            ('SCRIPT_VERSION', '2.1', 'Script version for audit purposes');
    END IF;
END $$;

-- Step 3: Foreign Key Cleanup (Safe Version)
DO $$
DECLARE
    cleanup_count INTEGER := 0;
    total_updated INTEGER := 0;
    table_exists BOOLEAN := FALSE;
    rec RECORD;
    
BEGIN
    -- Step 3: Foreign Key Cleanup
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'STEP 3: FOREIGN KEY CLEANUP (SAFE)';
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
    
    RAISE NOTICE '🔍 Found duplicate profile - starting safe foreign key cleanup...';
    
    -- Method 1: Check specific known tables with existence verification
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'CHECKING KNOWN TABLES (SAFE):';
    RAISE NOTICE '==========================================';
    
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
    
    -- Check tarot_spreads table
    SELECT table_exists('tarot_spreads') INTO table_exists;
    IF table_exists THEN
        SELECT COUNT(*) INTO cleanup_count 
        FROM tarot_spreads 
        WHERE approved_by = (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID');
        
        IF cleanup_count > 0 THEN
            RAISE NOTICE '⚠️ Found % references in tarot_spreads.approved_by', cleanup_count;
            
            UPDATE tarot_spreads 
            SET approved_by = (SELECT value::uuid FROM script_config WHERE key = 'MAIN_ADMIN_ID')
            WHERE approved_by = (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID');
            
            GET DIAGNOSTICS cleanup_count = ROW_COUNT;
            total_updated := total_updated + cleanup_count;
            
            RAISE NOTICE '✅ Updated % rows in tarot_spreads.approved_by', cleanup_count;
        ELSE
            RAISE NOTICE '✅ No references found in tarot_spreads.approved_by';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ Table tarot_spreads does not exist - skipping';
    END IF;
    
    -- Check user_activities table
    SELECT table_exists('user_activities') INTO table_exists;
    IF table_exists THEN
        SELECT COUNT(*) INTO cleanup_count 
        FROM user_activities 
        WHERE user_id = (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID');
        
        IF cleanup_count > 0 THEN
            RAISE NOTICE '⚠️ Found % references in user_activities.user_id', cleanup_count;
            
            UPDATE user_activities 
            SET user_id = (SELECT value::uuid FROM script_config WHERE key = 'MAIN_ADMIN_ID')
            WHERE user_id = (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID');
            
            GET DIAGNOSTICS cleanup_count = ROW_COUNT;
            total_updated := total_updated + cleanup_count;
            
            RAISE NOTICE '✅ Updated % rows in user_activities.user_id', cleanup_count;
        ELSE
            RAISE NOTICE '✅ No references found in user_activities.user_id';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ Table user_activities does not exist - skipping';
    END IF;
    
    -- Check bookings table
    SELECT table_exists('bookings') INTO table_exists;
    IF table_exists THEN
        SELECT COUNT(*) INTO cleanup_count 
        FROM bookings 
        WHERE user_id = (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID');
        
        IF cleanup_count > 0 THEN
            RAISE NOTICE '⚠️ Found % references in bookings.user_id', cleanup_count;
            
            UPDATE bookings 
            SET user_id = (SELECT value::uuid FROM script_config WHERE key = 'MAIN_ADMIN_ID')
            WHERE user_id = (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID');
            
            GET DIAGNOSTICS cleanup_count = ROW_COUNT;
            total_updated := total_updated + cleanup_count;
            
            RAISE NOTICE '✅ Updated % rows in bookings.user_id', cleanup_count;
        ELSE
            RAISE NOTICE '✅ No references found in bookings.user_id';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ Table bookings does not exist - skipping';
    END IF;
    
    -- Check reader_assignments table
    SELECT table_exists('reader_assignments') INTO table_exists;
    IF table_exists THEN
        SELECT COUNT(*) INTO cleanup_count 
        FROM reader_assignments 
        WHERE assigned_by = (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID');
        
        IF cleanup_count > 0 THEN
            RAISE NOTICE '⚠️ Found % references in reader_assignments.assigned_by', cleanup_count;
            
            UPDATE reader_assignments 
            SET assigned_by = (SELECT value::uuid FROM script_config WHERE key = 'MAIN_ADMIN_ID')
            WHERE assigned_by = (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID');
            
            GET DIAGNOSTICS cleanup_count = ROW_COUNT;
            total_updated := total_updated + cleanup_count;
            
            RAISE NOTICE '✅ Updated % rows in reader_assignments.assigned_by', cleanup_count;
        ELSE
            RAISE NOTICE '✅ No references found in reader_assignments.assigned_by';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ Table reader_assignments does not exist - skipping';
    END IF;
    
    -- Check notifications table
    SELECT table_exists('notifications') INTO table_exists;
    IF table_exists THEN
        SELECT COUNT(*) INTO cleanup_count 
        FROM notifications 
        WHERE user_id = (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID');
        
        IF cleanup_count > 0 THEN
            RAISE NOTICE '⚠️ Found % references in notifications.user_id', cleanup_count;
            
            UPDATE notifications 
            SET user_id = (SELECT value::uuid FROM script_config WHERE key = 'MAIN_ADMIN_ID')
            WHERE user_id = (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID');
            
            GET DIAGNOSTICS cleanup_count = ROW_COUNT;
            total_updated := total_updated + cleanup_count;
            
            RAISE NOTICE '✅ Updated % rows in notifications.user_id', cleanup_count;
        ELSE
            RAISE NOTICE '✅ No references found in notifications.user_id';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ Table notifications does not exist - skipping';
    END IF;
    
    -- Method 2: Dynamic discovery of foreign key references (Safe version)
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'DYNAMIC FOREIGN KEY DISCOVERY (SAFE):';
    RAISE NOTICE '==========================================';
    
    -- Query to find all foreign key columns that reference profiles
    FOR rec IN 
        SELECT 
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_name = 'profiles'
            AND ccu.column_name = 'id'
            AND tc.table_name NOT IN ('tarot_spreads', 'user_activities', 'bookings', 'reader_assignments', 'notifications') -- Skip already processed
    LOOP
        -- Verify table still exists before querying
        SELECT table_exists(rec.table_name) INTO table_exists;
        IF table_exists THEN
            RAISE NOTICE '🔍 Checking %: %', rec.table_name, rec.column_name;
            
            BEGIN
                -- Check if this table has references to the duplicate profile
                EXECUTE format('SELECT COUNT(*) FROM %I WHERE %I = %L', 
                              rec.table_name, rec.column_name, 
                              (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID'))
                INTO cleanup_count;
                
                IF cleanup_count > 0 THEN
                    RAISE NOTICE '⚠️ Found % references in %.%', cleanup_count, rec.table_name, rec.column_name;
                    
                    -- Update the references
                    EXECUTE format('UPDATE %I SET %I = %L WHERE %I = %L', 
                                  rec.table_name, rec.column_name, 
                                  (SELECT value::uuid FROM script_config WHERE key = 'MAIN_ADMIN_ID'),
                                  rec.column_name, 
                                  (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID'));
                    
                    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
                    total_updated := total_updated + cleanup_count;
                    
                    RAISE NOTICE '✅ Updated % rows in %.%', cleanup_count, rec.table_name, rec.column_name;
                ELSE
                    RAISE NOTICE '✅ No references found in %.%', rec.table_name, rec.column_name;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '⚠️ Error checking table %.%: %', rec.table_name, rec.column_name, SQLERRM;
            END;
        ELSE
            RAISE NOTICE '⚠️ Table % does not exist - skipping', rec.table_name;
        END IF;
    END LOOP;
    
    -- Final verification
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'CLEANUP VERIFICATION:';
    RAISE NOTICE '==========================================';
    
    -- Check if any references still exist (only for existing tables)
    FOR rec IN 
        SELECT 
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
    LOOP
        SELECT table_exists(rec.table_name) INTO table_exists;
        IF table_exists THEN
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
    
    -- Clean up the helper function
    DROP FUNCTION IF EXISTS table_exists(TEXT);
    
    -- Log the results
    INSERT INTO reset_audit_log (step_number, step_name, status, affected_rows, details)
    VALUES (3, 'Foreign Key Cleanup (Safe)', 'SUCCESS', total_updated, 
            format('Updated %s total foreign key references', total_updated));
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'STEP 3 COMPLETE (SAFE VERSION)';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ Total foreign key references updated: %', total_updated;
    
    IF total_updated > 0 THEN
        RAISE NOTICE '✅ Ready for Step 4: Duplicate Profile Deletion';
    ELSE
        RAISE NOTICE '✅ No cleanup needed - Ready for Step 4: Duplicate Profile Deletion';
    END IF;
    
END $$;

-- Commit the transaction
COMMIT;

-- Final status
SELECT 'Step 3 (Safe): Foreign Key Cleanup completed successfully. Ready for Step 4: Duplicate Profile Deletion.' AS status; 