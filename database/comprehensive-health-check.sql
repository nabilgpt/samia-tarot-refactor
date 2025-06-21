-- =====================================================
-- SAMIA TAROT - COMPREHENSIVE DATABASE HEALTH CHECK
-- =====================================================
-- This script checks all required tables and their schemas

-- =====================================================
-- STEP 1: CHECK ALL EXISTING TABLES
-- =====================================================

DO $$
DECLARE
    table_record RECORD;
    table_count INTEGER := 0;
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    existing_tables TEXT[] := ARRAY[]::TEXT[];
    required_core_tables TEXT[] := ARRAY[
        'profiles', 'bookings', 'payments', 'reviews', 'readers', 
        'chat_sessions', 'call_sessions'
    ];
    required_admin_tables TEXT[] := ARRAY[
        'admin_audit_logs', 'bulk_operations_log', 'admin_search_history', 
        'admin_saved_filters', 'admin_analytics_cache', 'admin_activity_feed',
        'admin_notification_rules', 'admin_notification_channels', 'notification_executions',
        'permissions', 'roles', 'role_permissions', 'user_roles', 
        'user_permission_overrides', 'documentation_entries', 'user_onboarding_progress',
        'error_logs', 'import_export_jobs', 'tenants'
    ];
    all_required_tables TEXT[];
    current_table_name TEXT;
    column_count INTEGER;
    has_issues BOOLEAN := false;
BEGIN
    -- Combine all required tables
    all_required_tables := required_core_tables || required_admin_tables;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔍 SAMIA TAROT DATABASE HEALTH CHECK REPORT';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    
    -- Get all existing tables in public schema
    RAISE NOTICE '📋 EXISTING TABLES IN PUBLIC SCHEMA:';
    RAISE NOTICE '-----------------------------------';
    
    FOR table_record IN 
        SELECT t.table_name 
        FROM information_schema.tables t
        WHERE t.table_schema = 'public' 
        ORDER BY t.table_name
    LOOP
        existing_tables := array_append(existing_tables, table_record.table_name);
        table_count := table_count + 1;
        
        -- Check if this table is in our required list
        IF table_record.table_name = ANY(all_required_tables) THEN
            RAISE NOTICE '✅ % (REQUIRED)', table_record.table_name;
        ELSE
            RAISE NOTICE '📄 % (additional)', table_record.table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Total tables found: %', table_count;
    RAISE NOTICE '';
    
    -- =====================================================
    -- STEP 2: CHECK CORE TABLES
    -- =====================================================
    
    RAISE NOTICE '🏗️ CORE TABLES STATUS:';
    RAISE NOTICE '---------------------';
    
    FOREACH current_table_name IN ARRAY required_core_tables
    LOOP
        IF current_table_name = ANY(existing_tables) THEN
            -- Get column count for the table
            SELECT COUNT(*) INTO column_count
            FROM information_schema.columns c
            WHERE c.table_name = current_table_name AND c.table_schema = 'public';
            
            RAISE NOTICE '✅ % (% columns)', current_table_name, column_count;
        ELSE
            RAISE NOTICE '❌ % (MISSING)', current_table_name;
            missing_tables := array_append(missing_tables, current_table_name);
            has_issues := true;
        END IF;
    END LOOP;
    
    -- =====================================================
    -- STEP 3: CHECK ADVANCED ADMIN TABLES
    -- =====================================================
    
    RAISE NOTICE '';
    RAISE NOTICE '⚡ ADVANCED ADMIN TABLES STATUS:';
    RAISE NOTICE '-------------------------------';
    
    FOREACH current_table_name IN ARRAY required_admin_tables
    LOOP
        IF current_table_name = ANY(existing_tables) THEN
            -- Get column count for the table
            SELECT COUNT(*) INTO column_count
            FROM information_schema.columns c
            WHERE c.table_name = current_table_name AND c.table_schema = 'public';
            
            RAISE NOTICE '✅ % (% columns)', current_table_name, column_count;
        ELSE
            RAISE NOTICE '❌ % (MISSING)', current_table_name;
            missing_tables := array_append(missing_tables, current_table_name);
            has_issues := true;
        END IF;
    END LOOP;
    
    -- =====================================================
    -- STEP 4: CHECK CRITICAL COLUMNS
    -- =====================================================
    
    RAISE NOTICE '';
    RAISE NOTICE '🔧 CRITICAL COLUMNS CHECK:';
    RAISE NOTICE '--------------------------';
    
    -- Check profiles table critical columns
    IF 'profiles' = ANY(existing_tables) THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_name = 'profiles' AND c.column_name = 'deleted_at') THEN
            RAISE NOTICE '✅ profiles.deleted_at (soft delete support)';
        ELSE
            RAISE NOTICE '⚠️  profiles.deleted_at (missing - soft delete not supported)';
            has_issues := true;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_name = 'profiles' AND c.column_name = 'tenant_id') THEN
            RAISE NOTICE '✅ profiles.tenant_id (multi-tenancy support)';
        ELSE
            RAISE NOTICE '⚠️  profiles.tenant_id (missing - multi-tenancy not supported)';
            has_issues := true;
        END IF;
    END IF;
    
    -- Check permissions table
    IF 'permissions' = ANY(existing_tables) THEN
        SELECT COUNT(*) INTO column_count FROM permissions;
        IF column_count > 0 THEN
            RAISE NOTICE '✅ permissions table has % records', column_count;
        ELSE
            RAISE NOTICE '⚠️  permissions table is empty';
            has_issues := true;
        END IF;
    END IF;
    
    -- Check roles table
    IF 'roles' = ANY(existing_tables) THEN
        SELECT COUNT(*) INTO column_count FROM roles;
        IF column_count > 0 THEN
            RAISE NOTICE '✅ roles table has % records', column_count;
        ELSE
            RAISE NOTICE '⚠️  roles table is empty';
            has_issues := true;
        END IF;
    END IF;
    
    -- Check documentation_entries table
    IF 'documentation_entries' = ANY(existing_tables) THEN
        SELECT COUNT(*) INTO column_count FROM documentation_entries;
        IF column_count > 0 THEN
            RAISE NOTICE '✅ documentation_entries table has % records', column_count;
        ELSE
            RAISE NOTICE '⚠️  documentation_entries table is empty';
            has_issues := true;
        END IF;
    END IF;
    
    -- =====================================================
    -- STEP 5: SUMMARY REPORT
    -- =====================================================
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 HEALTH CHECK SUMMARY:';
    RAISE NOTICE '========================';
    RAISE NOTICE '';
    
    RAISE NOTICE 'Core Tables: % / %', 
        (SELECT COUNT(*) FROM unnest(required_core_tables) AS t WHERE t = ANY(existing_tables)),
        array_length(required_core_tables, 1);
        
    RAISE NOTICE 'Admin Tables: % / %',
        (SELECT COUNT(*) FROM unnest(required_admin_tables) AS t WHERE t = ANY(existing_tables)),
        array_length(required_admin_tables, 1);
        
    RAISE NOTICE 'Total Required: % / %',
        (SELECT COUNT(*) FROM unnest(all_required_tables) AS t WHERE t = ANY(existing_tables)),
        array_length(all_required_tables, 1);
    
    RAISE NOTICE '';
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE '❌ MISSING TABLES:';
        FOREACH current_table_name IN ARRAY missing_tables
        LOOP
            RAISE NOTICE '   - %', current_table_name;
        END LOOP;
        RAISE NOTICE '';
    END IF;
    
    -- Final Status
    IF NOT has_issues AND array_length(missing_tables, 1) IS NULL THEN
        RAISE NOTICE '🎉 STATUS: All tables exist and are healthy! ✅';
        RAISE NOTICE '🚀 SAMIA TAROT database is production ready!';
    ELSE
        RAISE NOTICE '⚠️  STATUS: Database has issues that need attention';
        RAISE NOTICE '🔧 Run the advanced admin setup script to fix missing tables';
        RAISE NOTICE '📝 Script: database/complete-advanced-admin-v2-simple-final.sql';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE '🔍 Health Check Complete';
    RAISE NOTICE '';
    
END $$; 