-- SAMIA TAROT - Quick Database Status Check
-- This script provides a simple overview of the current database state

-- Check total tables in public schema
SELECT 
    'Total Tables in Database' as check_type,
    COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check core tables
WITH core_tables AS (
    SELECT unnest(ARRAY[
        'profiles', 'users', 'bookings', 'reviews', 'payments', 'readers', 'emergency_escalations'
    ]) as table_name
),
existing_core AS (
    SELECT t.table_name
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' 
    AND t.table_name IN (SELECT table_name FROM core_tables)
)
SELECT 
    'Core Tables Present' as check_type,
    COUNT(*) || ' / 7' as count
FROM existing_core;

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
    'Advanced Admin Tables Present' as check_type,
    COUNT(*) || ' / 19' as count
FROM existing_admin;

-- Check permissions data
SELECT 
    'Permissions Records' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions' AND table_schema = 'public')
        THEN (SELECT COUNT(*)::text FROM permissions)
        ELSE 'Table not found'
    END as count;

-- Check roles data
SELECT 
    'Roles Records' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles' AND table_schema = 'public')
        THEN (SELECT COUNT(*)::text FROM roles)
        ELSE 'Table not found'
    END as count;

-- Check soft delete support
SELECT 
    'Tables with Soft Delete Support' as check_type,
    COUNT(*) as count
FROM information_schema.columns c
WHERE c.table_schema = 'public' 
AND c.column_name = 'deleted_at';

-- Check multi-tenancy support
SELECT 
    'Tables with Multi-Tenancy Support' as check_type,
    COUNT(*) as count
FROM information_schema.columns c
WHERE c.table_schema = 'public' 
AND c.column_name = 'tenant_id';

-- Final status
SELECT 
    '🎉 DATABASE STATUS' as check_type,
    CASE 
        WHEN (
            SELECT COUNT(*) 
            FROM information_schema.tables t
            WHERE t.table_schema = 'public' 
            AND t.table_name IN (
                'profiles', 'users', 'bookings', 'reviews', 'payments', 'readers', 'emergency_escalations',
                'admin_audit_logs', 'bulk_operations_log', 'admin_search_history', 
                'admin_saved_filters', 'admin_analytics_cache', 'admin_activity_feed',
                'admin_notification_rules', 'admin_notification_channels', 'notification_executions',
                'permissions', 'roles', 'role_permissions', 'user_roles', 
                'user_permission_overrides', 'documentation_entries', 'user_onboarding_progress',
                'error_logs', 'import_export_jobs', 'tenants'
            )
        ) >= 20 
        THEN '✅ PRODUCTION READY!'
        ELSE '⚠️ Needs attention'
    END as count; 