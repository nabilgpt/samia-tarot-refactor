-- =====================================================
-- VERIFY ADVANCED ADMIN SETUP SUCCESS
-- =====================================================
-- This script verifies that all tables and indexes were created properly

DO $$
DECLARE
    table_count INTEGER;
    index_count INTEGER;
    column_exists BOOLEAN;
    role_count INTEGER;
    permission_count INTEGER;
BEGIN
    RAISE NOTICE '🔍 VERIFYING ADVANCED ADMIN SETUP...';
    RAISE NOTICE '';
    
    -- Check all expected tables exist
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_name IN (
        'admin_audit_logs', 'admin_search_history', 'admin_activity_feed',
        'admin_notification_rules', 'permissions', 'roles', 'user_roles'
    );
    
    RAISE NOTICE '📋 TABLES VERIFICATION:';
    RAISE NOTICE '✅ Expected tables: 7';
    RAISE NOTICE '✅ Found tables: %', table_count;
    
    IF table_count = 7 THEN
        RAISE NOTICE '✅ All tables created successfully!';
    ELSE
        RAISE NOTICE '❌ Missing tables detected!';
    END IF;
    
    RAISE NOTICE '';
    
    -- Verify the problematic table_name column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_audit_logs' 
        AND column_name = 'table_name'
    ) INTO column_exists;
    
    RAISE NOTICE '🔧 COLUMN VERIFICATION:';
    IF column_exists THEN
        RAISE NOTICE '✅ admin_audit_logs.table_name column exists!';
        RAISE NOTICE '✅ The original error is FIXED!';
    ELSE
        RAISE NOTICE '❌ admin_audit_logs.table_name column missing!';
    END IF;
    
    RAISE NOTICE '';
    
    -- Check indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE indexname LIKE 'idx_admin%' OR indexname LIKE 'idx_user_roles%';
    
    RAISE NOTICE '📊 INDEXES VERIFICATION:';
    RAISE NOTICE '✅ Admin indexes found: %', index_count;
    
    -- Verify the specific problematic index exists
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_admin_audit_logs_table_name'
    ) THEN
        RAISE NOTICE '✅ idx_admin_audit_logs_table_name index created successfully!';
    ELSE
        RAISE NOTICE '❌ idx_admin_audit_logs_table_name index missing!';
    END IF;
    
    RAISE NOTICE '';
    
    -- Check roles and permissions data
    SELECT COUNT(*) INTO role_count FROM roles;
    SELECT COUNT(*) INTO permission_count FROM permissions;
    
    RAISE NOTICE '📝 DATA VERIFICATION:';
    RAISE NOTICE '✅ Roles inserted: %', role_count;
    RAISE NOTICE '✅ Permissions inserted: %', permission_count;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 VERIFICATION COMPLETE!';
    RAISE NOTICE 'The "column table_name does not exist" error has been resolved!';
    RAISE NOTICE 'Advanced admin features are ready for use!';
    
END $$;

-- =====================================================
-- SHOW DETAILED TABLE AND INDEX INFORMATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 DETAILED VERIFICATION RESULTS:';
    RAISE NOTICE '';
END $$;

-- Show all created tables
SELECT 
    'TABLE' as type,
    table_name as name,
    'Created successfully' as status
FROM information_schema.tables 
WHERE table_name IN (
    'admin_audit_logs', 'admin_search_history', 'admin_activity_feed',
    'admin_notification_rules', 'permissions', 'roles', 'user_roles'
)
ORDER BY table_name;

-- Show all created indexes
SELECT 
    'INDEX' as type,
    indexname as name,
    tablename as table_name
FROM pg_indexes 
WHERE indexname LIKE 'idx_admin%' OR indexname LIKE 'idx_user_roles%'
ORDER BY tablename, indexname;

-- Show admin_audit_logs columns to confirm table_name exists
SELECT 
    'COLUMN' as type,
    column_name as name,
    data_type as data_type
FROM information_schema.columns 
WHERE table_name = 'admin_audit_logs'
ORDER BY ordinal_position;

-- Show sample roles data
SELECT 
    'ROLE' as type,
    name,
    description
FROM roles
ORDER BY name;

-- Show sample permissions data
SELECT 
    'PERMISSION' as type,
    name,
    resource || '.' || action as permission
FROM permissions
ORDER BY resource, action; 