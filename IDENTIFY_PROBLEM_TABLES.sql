-- ============================================================
-- IDENTIFY PROBLEM TABLES - Find the 76+ extra tables
-- ============================================================

-- 1. SHOW ALL TABLES (to see the full list)
SELECT 
    'ALL TABLES' as category,
    table_name,
    pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = table_name AND rowsecurity = true)
        THEN '✅ RLS' 
        ELSE '❌ NO RLS' 
    END as rls_status
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. EXPECTED TABLES CHECK
WITH expected_tables AS (
    SELECT unnest(ARRAY[
        'admin_users', 'ai_learning_data', 'ai_reading_results', 'bookings', 
        'chat_messages', 'chat_sessions', 'daily_analytics', 'emergency_escalations',
        'payment_methods', 'payment_receipts', 'payments', 'profiles', 
        'reader_analytics', 'reader_applications', 'readers', 'reviews',
        'user_activity_logs', 'voice_notes', 'wallet_transactions'
    ]) as expected_table
)
SELECT 
    'EXPECTED TABLES' as category,
    expected_table as table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = expected_table)
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status
FROM expected_tables
ORDER BY expected_table;

-- 3. IDENTIFY PROBLEMATIC PATTERNS
SELECT 
    'SUSPICIOUS PATTERNS' as category,
    table_name,
    CASE 
        WHEN table_name LIKE '%_test%' THEN '🧪 TEST TABLE'
        WHEN table_name LIKE '%_temp%' THEN '🗂️ TEMP TABLE'
        WHEN table_name LIKE '%_backup%' THEN '💾 BACKUP TABLE'
        WHEN table_name LIKE '%_old%' THEN '📰 OLD TABLE'
        WHEN table_name LIKE '%_copy%' THEN '📋 COPY TABLE'
        WHEN table_name LIKE '%_new%' THEN '🆕 NEW TABLE'
        WHEN table_name ~ '.*_[0-9]+$' THEN '🔢 NUMBERED TABLE'
        WHEN table_name LIKE '%duplicate%' THEN '👥 DUPLICATE TABLE'
        WHEN table_name LIKE '%tmp%' THEN '📁 TMP TABLE'
        ELSE '❓ UNKNOWN PATTERN'
    END as issue_type,
    pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND (
    table_name LIKE '%_test%' OR table_name LIKE '%_temp%' OR 
    table_name LIKE '%_backup%' OR table_name LIKE '%_old%' OR
    table_name LIKE '%_copy%' OR table_name LIKE '%_new%' OR
    table_name ~ '.*_[0-9]+$' OR table_name LIKE '%duplicate%' OR
    table_name LIKE '%tmp%'
)
ORDER BY table_name;

-- 4. TABLES WITHOUT RLS (SECURITY ISSUE)
SELECT 
    'SECURITY ISSUES' as category,
    tablename as table_name,
    '🔓 NO ROW LEVEL SECURITY' as issue,
    pg_size_pretty(pg_total_relation_size(quote_ident(tablename))) as size
FROM pg_tables 
WHERE schemaname = 'public' 
AND NOT rowsecurity
ORDER BY tablename;

-- 5. TABLES WITH VERY FEW COLUMNS (LIKELY INCOMPLETE)
SELECT 
    'INCOMPLETE TABLES' as category,
    table_name,
    column_count,
    '📋 TOO FEW COLUMNS' as issue
FROM (
    SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
    FROM information_schema.tables t
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
) sub
WHERE column_count <= 2
ORDER BY table_name;

-- 6. GENERATE CLEANUP COMMANDS
SELECT 
    'CLEANUP COMMANDS' as category,
    'DROP TABLE ' || table_name || ' CASCADE;' as command,
    table_name as target_table
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND (
    table_name LIKE '%_test%' OR table_name LIKE '%_temp%' OR 
    table_name LIKE '%_backup%' OR table_name LIKE '%_old%' OR
    table_name LIKE '%_copy%' OR table_name LIKE '%tmp%'
)
ORDER BY table_name;

-- 7. SUMMARY COUNT
SELECT 
    'SUMMARY' as category,
    'Problem Tables Identified' as metric,
    COUNT(*)::text as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND (
    table_name LIKE '%_test%' OR table_name LIKE '%_temp%' OR 
    table_name LIKE '%_backup%' OR table_name LIKE '%_old%' OR
    table_name LIKE '%_copy%' OR table_name LIKE '%tmp%' OR
    table_name ~ '.*_[0-9]+$'
); 