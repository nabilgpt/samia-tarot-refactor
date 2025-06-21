-- COMPREHENSIVE DATABASE DIAGNOSTIC SCRIPT
-- This script will help identify all table structures and column naming issues

-- 1. List all tables in the public schema
SELECT 'TABLES IN DATABASE:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Get detailed column information for all tables
SELECT 'DETAILED COLUMN INFORMATION:' as info;
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
ORDER BY t.table_name, c.ordinal_position;

-- 3. Check for foreign key relationships
SELECT 'FOREIGN KEY RELATIONSHIPS:' as info;
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 4. Check existing RLS policies
SELECT 'EXISTING RLS POLICIES:' as info;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 5. Check for missing common columns across tables
SELECT 'TABLES WITHOUT user_id COLUMN:' as info;
SELECT table_name
FROM information_schema.tables t
WHERE t.table_schema = 'public'
AND NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns c 
    WHERE c.table_name = t.table_name 
    AND c.table_schema = 'public'
    AND c.column_name = 'user_id'
)
ORDER BY table_name;

-- 6. Check for tables with alternative user reference columns
SELECT 'TABLES WITH ALTERNATIVE USER COLUMNS:' as info;
SELECT 
    table_name,
    column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND (column_name LIKE '%user%' OR column_name LIKE '%client%' OR column_name LIKE '%sender%' OR column_name LIKE '%applicant%')
ORDER BY table_name, column_name;

-- 7. Check table row counts
SELECT 'TABLE ROW COUNTS:' as info;
SELECT 
    schemaname,
    relname as table_name,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC; 