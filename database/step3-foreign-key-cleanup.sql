-- =====================================================================================
-- STEP 3: FOREIGN KEY CLEANUP
-- =====================================================================================
-- Version: 2.0
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
            ('SCRIPT_VERSION', '2.0', 'Script version for audit purposes');
    END IF;
END $$;

-- Step 3: Foreign Key Cleanup
DO $$
DECLARE
    cleanup_count INTEGER := 0;
    total_updated INTEGER := 0;
    table_name TEXT;
    column_name TEXT;
    sql_cmd TEXT;
    rec RECORD;
    
BEGIN
    -- Step 3: Foreign Key Cleanup
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'STEP 3: FOREIGN KEY CLEANUP';
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
    
    RAISE NOTICE '🔍 Found duplicate profile - starting foreign key cleanup...';
    
    -- Dynamic foreign key cleanup
    -- This will find all tables that reference the duplicate profile
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'SCANNING FOR FOREIGN KEY REFERENCES:';
    RAISE NOTICE '==========================================';
    
    -- Method 1: Check specific known tables first
    RAISE NOTICE '📋 Checking known tables...';
    
    -- Check tarot_spreads table
    SELECT COUNT(*) INTO cleanup_count 
    FROM tarot_spreads 
    WHERE approved_by = (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID');
    
    IF cleanup_count > 0 THEN
        RAISE NOTICE '⚠️ Found % references in tarot_spreads.approved_by', cleanup_count;
        
        -- Update references to point to main admin
        UPDATE tarot_spreads 
        SET approved_by = (SELECT value::uuid FROM script_config WHERE key = 'MAIN_ADMIN_ID')
        WHERE approved_by = (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID');
        
        GET DIAGNOSTICS cleanup_count = ROW_COUNT;
        total_updated := total_updated + cleanup_count;
        
        RAISE NOTICE '✅ Updated % rows in tarot_spreads.approved_by', cleanup_count;
    END IF;
    
    -- Check other common tables
    -- Note: Add more tables as needed based on your schema
    
    -- Check user_activities table
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
    END IF;
    
    -- Check bookings table
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
    END IF;
    
    -- Check reader_assignments table
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
    END IF;
    
    -- Check notifications table
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
    END IF;
    
    -- Method 2: Dynamic discovery of foreign key references
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'DYNAMIC FOREIGN KEY DISCOVERY:';
    RAISE NOTICE '==========================================';
    
    -- Query to find all foreign key columns that might reference profiles
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
        RAISE NOTICE '🔍 Checking %: %', rec.table_name, rec.column_name;
        
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
        END IF;
    END LOOP;
    
    -- Final verification
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'CLEANUP VERIFICATION:';
    RAISE NOTICE '==========================================';
    
    -- Check if any references still exist
    cleanup_count := 0;
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
        EXECUTE format('SELECT COUNT(*) FROM %I WHERE %I = %L', 
                      rec.table_name, rec.column_name, 
                      (SELECT value::uuid FROM script_config WHERE key = 'DUPLICATE_ID'))
        INTO cleanup_count;
        
        IF cleanup_count > 0 THEN
            RAISE NOTICE '⚠️ WARNING: Still found % references in %.%', cleanup_count, rec.table_name, rec.column_name;
        END IF;
    END LOOP;
    
    -- Log the results
    INSERT INTO reset_audit_log (step_number, step_name, status, affected_rows, details)
    VALUES (3, 'Foreign Key Cleanup', 'SUCCESS', total_updated, 
            format('Updated %s total foreign key references', total_updated));
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'STEP 3 COMPLETE';
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
SELECT 'Step 3: Foreign Key Cleanup completed successfully. Ready for Step 4: Duplicate Profile Deletion.' AS status; 