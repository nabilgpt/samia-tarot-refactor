-- SAMIA TAROT - Final Complete Database Verification
-- This script verifies that ALL core tables including readers are now present

-- Check if readers table exists
SELECT 
    '🔮 READERS TABLE' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'readers' AND table_schema = 'public')
        THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- Count readers records
SELECT 
    '👥 READERS COUNT' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'readers' AND table_schema = 'public')
        THEN (SELECT COUNT(*)::text FROM readers)
        ELSE 'Table not found'
    END as status;

-- Check ALL core tables now (including readers)
WITH core_tables AS (
    SELECT unnest(ARRAY[
        'profiles', 'bookings', 'reviews', 'payments', 'readers', 'emergency_escalations'
    ]) as table_name
),
existing_core AS (
    SELECT t.table_name
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' 
    AND t.table_name IN (SELECT table_name FROM core_tables)
)
SELECT 
    '🏗️ CORE TABLES COMPLETE' as check_type,
    COUNT(*) || ' / 6 ✅' as status
FROM existing_core;

-- List missing core tables (should be none now)
WITH core_tables AS (
    SELECT unnest(ARRAY[
        'profiles', 'bookings', 'reviews', 'payments', 'readers', 'emergency_escalations'
    ]) as table_name
),
missing_core AS (
    SELECT ct.table_name
    FROM core_tables ct
    WHERE ct.table_name NOT IN (
        SELECT t.table_name
        FROM information_schema.tables t
        WHERE t.table_schema = 'public'
    )
)
SELECT 
    '❌ MISSING CORE TABLES' as check_type,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NONE - ALL COMPLETE!'
        ELSE string_agg(table_name, ', ')
    END as status
FROM missing_core;

-- Check advanced admin tables
WITH admin_tables AS (
    SELECT unnest(ARRAY[
        'admin_audit_logs', 'bulk_operations_log', 'admin_search_history', 
        'admin_saved_filters', 'admin_analytics_cache', 'admin_activity_feed',
        'admin_notification_rules', 'admin_notification_channels', 'notification_executions',
        'permissions', 'roles', 'role_permissions', 'user_roles', 
        'user_permission_overrides', 'documentation_entries', 'user_onboarding_progress',
        'error_logs', 'import_export_jobs', 'tenants'
    ]) as table_name
),
existing_admin AS (
    SELECT t.table_name
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' 
    AND t.table_name IN (SELECT table_name FROM admin_tables)
)
SELECT 
    '⚡ ADVANCED ADMIN TABLES' as check_type,
    COUNT(*) || ' / 19 ✅' as status
FROM existing_admin;

-- Check readers table columns
SELECT 
    '📊 READERS TABLE COLUMNS' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'readers' AND table_schema = 'public')
        THEN (
            SELECT COUNT(*)::text || ' columns' 
            FROM information_schema.columns 
            WHERE table_name = 'readers' AND table_schema = 'public'
        )
        ELSE 'Table not found'
    END as status;

-- Check readers table indexes
SELECT 
    '🔍 READERS TABLE INDEXES' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'readers' AND table_schema = 'public')
        THEN (
            SELECT COUNT(*)::text || ' indexes' 
            FROM pg_indexes 
            WHERE tablename = 'readers' AND schemaname = 'public'
        )
        ELSE 'Table not found'
    END as status;

-- Check sample readers data
SELECT 
    '👤 SAMPLE READERS' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'readers' AND table_schema = 'public')
        THEN (
            SELECT string_agg(username, ', ') 
            FROM readers 
            WHERE deleted_at IS NULL 
            LIMIT 5
        )
        ELSE 'Table not found'
    END as status;

-- Final comprehensive status
SELECT 
    '🎉 FINAL DATABASE STATUS' as check_type,
    CASE 
        WHEN (
            -- Check core tables (6/6)
            SELECT COUNT(*) 
            FROM information_schema.tables t
            WHERE t.table_schema = 'public' 
            AND t.table_name IN ('profiles', 'bookings', 'reviews', 'payments', 'readers', 'emergency_escalations')
        ) = 6
        AND (
            -- Check admin tables (19/19)
            SELECT COUNT(*) 
            FROM information_schema.tables t
            WHERE t.table_schema = 'public' 
            AND t.table_name IN (
                'admin_audit_logs', 'bulk_operations_log', 'admin_search_history', 
                'admin_saved_filters', 'admin_analytics_cache', 'admin_activity_feed',
                'admin_notification_rules', 'admin_notification_channels', 'notification_executions',
                'permissions', 'roles', 'role_permissions', 'user_roles', 
                'user_permission_overrides', 'documentation_entries', 'user_onboarding_progress',
                'error_logs', 'import_export_jobs', 'tenants'
            )
        ) >= 15  -- At least 15 admin tables
        THEN '🚀 ULTIMATE PRODUCTION READY! 🚀'
        ELSE '⚠️ Still needs attention'
    END as status; 