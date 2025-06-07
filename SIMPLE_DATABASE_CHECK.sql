-- ============================================================
-- SIMPLE DATABASE CHECK (Uses SELECT for guaranteed output)
-- ============================================================

-- 1. TABLE COUNT AND LIST
SELECT 
    '📊 TABLE INVENTORY' as section,
    COUNT(*) as total_tables
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

SELECT 
    '📋 EXISTING TABLES' as section,
    table_name,
    pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. EXPECTED VS ACTUAL TABLES
WITH expected_tables AS (
    SELECT unnest(ARRAY[
        'profiles', 'readers', 'bookings', 'chat_sessions', 'chat_messages',
        'payments', 'reviews', 'admin_users', 'emergency_escalations',
        'payment_methods', 'wallet_transactions', 'payment_receipts',
        'voice_notes', 'daily_analytics', 'reader_analytics', 
        'user_activity_logs', 'ai_learning_data', 'ai_reading_results',
        'reader_applications'
    ]) as expected_table
),
actual_tables AS (
    SELECT table_name as actual_table
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
)
SELECT 
    '❌ MISSING TABLES' as section,
    expected_table as missing_table
FROM expected_tables e
WHERE NOT EXISTS (
    SELECT 1 FROM actual_tables a 
    WHERE a.actual_table = e.expected_table
);

-- 3. UNEXPECTED TABLES
WITH expected_tables AS (
    SELECT unnest(ARRAY[
        'profiles', 'readers', 'bookings', 'chat_sessions', 'chat_messages',
        'payments', 'reviews', 'admin_users', 'emergency_escalations',
        'payment_methods', 'wallet_transactions', 'payment_receipts',
        'voice_notes', 'daily_analytics', 'reader_analytics', 
        'user_activity_logs', 'ai_learning_data', 'ai_reading_results',
        'reader_applications'
    ]) as expected_table
)
SELECT 
    '⚠️ UNEXPECTED TABLES' as section,
    table_name as unexpected_table
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND NOT EXISTS (
    SELECT 1 FROM expected_tables e 
    WHERE e.expected_table = t.table_name
)
ORDER BY table_name;

-- 4. TABLE STRUCTURE CHECK
SELECT 
    '🔍 TABLE STRUCTURE' as section,
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = t.table_name) as column_count,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_schema = 'public' AND table_name = t.table_name 
                    AND column_name = 'id') 
        THEN '✅ Has ID' 
        ELSE '❌ No ID' 
    END as has_id,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_schema = 'public' AND table_name = t.table_name 
                    AND column_name = 'created_at') 
        THEN '✅ Has created_at' 
        ELSE '❌ No created_at' 
    END as has_created_at
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 5. ROW LEVEL SECURITY STATUS
SELECT 
    '🔒 ROW LEVEL SECURITY' as section,
    tablename as table_name,
    CASE 
        WHEN rowsecurity THEN '✅ RLS ENABLED' 
        ELSE '❌ RLS DISABLED' 
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 6. POLICIES COUNT
SELECT 
    '📋 RLS POLICIES' as section,
    COALESCE(tablename, 'NO TABLES WITH POLICIES') as table_name,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 7. INDEXES COUNT
SELECT 
    '⚡ PERFORMANCE INDEXES' as section,
    COALESCE(tablename, 'NO INDEXES') as table_name,
    COUNT(*) as index_count
FROM pg_indexes 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 8. ROW COUNTS
SELECT 
    '📊 DATA SUMMARY' as section,
    table_name,
    (xpath('/row/c/text()', query_to_xml(format('SELECT COUNT(*) as c FROM %I', table_name), false, true, '')))[1]::text::int AS row_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 9. FINAL SUMMARY
SELECT 
    '🎯 SUMMARY STATISTICS' as section,
    'Total Tables' as metric,
    COUNT(*)::text as value
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'

UNION ALL

SELECT 
    '🎯 SUMMARY STATISTICS' as section,
    'Tables with RLS' as metric,
    COUNT(*)::text as value
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true

UNION ALL

SELECT 
    '🎯 SUMMARY STATISTICS' as section,
    'Total RLS Policies' as metric,
    COUNT(*)::text as value
FROM pg_policies 
WHERE schemaname = 'public'

UNION ALL

SELECT 
    '🎯 SUMMARY STATISTICS' as section,
    'Total Indexes' as metric,
    COUNT(*)::text as value
FROM pg_indexes 
WHERE schemaname = 'public'; 