-- SAMIA TAROT - Detailed Diagnostic Check
-- This script will identify exactly what's missing

-- Check readers table specifically
SELECT 
    '🔮 READERS TABLE CHECK' as section,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'readers' AND table_schema = 'public')
        THEN '✅ readers table EXISTS'
        ELSE '❌ readers table MISSING'
    END as result;

-- Count core tables one by one
SELECT '🏗️ CORE TABLES INDIVIDUAL CHECK' as section, '---' as result;

SELECT 
    table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_name = core.table_name AND t.table_schema = 'public')
        THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (
    SELECT unnest(ARRAY[
        'profiles', 'users', 'bookings', 'reviews', 'payments', 'readers', 'emergency_escalations'
    ]) as table_name
) core;

-- Count admin tables one by one
SELECT '⚡ ADMIN TABLES INDIVIDUAL CHECK' as section, '---' as result;

SELECT 
    table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_name = admin.table_name AND t.table_schema = 'public')
        THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (
    SELECT unnest(ARRAY[
        'admin_audit_logs', 'bulk_operations_log', 'admin_search_history', 
        'admin_saved_filters', 'admin_analytics_cache', 'admin_activity_feed',
        'admin_notification_rules', 'admin_notification_channels', 'notification_executions',
        'permissions', 'roles', 'role_permissions', 'user_roles', 
        'user_permission_overrides', 'documentation_entries', 'user_onboarding_progress',
        'error_logs', 'import_export_jobs', 'tenants'
    ]) as table_name
) admin;

-- Get exact counts
SELECT '📊 EXACT COUNTS' as section, '---' as result;

WITH core_count AS (
    SELECT COUNT(*) as count
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' 
    AND t.table_name IN ('profiles', 'users', 'bookings', 'reviews', 'payments', 'readers', 'emergency_escalations')
),
admin_count AS (
    SELECT COUNT(*) as count
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
)
SELECT 
    'Core Tables Found: ' || cc.count || ' / 7' as result
FROM core_count cc
UNION ALL
SELECT 
    'Admin Tables Found: ' || ac.count || ' / 19' as result
FROM admin_count ac;

-- List ALL tables in public schema (to see what we actually have)
SELECT '📋 ALL TABLES IN PUBLIC SCHEMA' as section, '---' as result;

SELECT 
    table_name,
    'exists' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name; 