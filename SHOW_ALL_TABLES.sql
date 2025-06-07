-- ============================================================
-- SHOW ALL TABLES - Simple list of every table in database
-- ============================================================

-- Show ALL tables with basic info
SELECT 
    table_name as "Table Name",
    pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as "Size",
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = t.table_name) as "Columns",
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t.table_name AND rowsecurity = true)
        THEN '✅ YES' 
        ELSE '❌ NO' 
    END as "Has RLS"
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Quick count
SELECT 
    COUNT(*) as "Total Tables",
    COUNT(CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t.table_name AND rowsecurity = true) THEN 1 END) as "Tables with RLS"
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'; 