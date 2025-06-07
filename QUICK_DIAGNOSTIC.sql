-- ============================================================
-- QUICK DIAGNOSTIC - Basic Database Status Check
-- ============================================================

-- Basic table count
SELECT 'BASIC INFO' as check_type, COUNT(*) as result, 'tables in public schema' as description
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- List all tables (simple)
SELECT 'TABLE LIST' as check_type, table_name as result, 'existing table' as description
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check if we have the expected core tables
SELECT 'CORE TABLES' as check_type, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') 
            THEN 'YES' ELSE 'NO' END as result,
       'profiles table exists' as description
UNION ALL
SELECT 'CORE TABLES' as check_type,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') 
            THEN 'YES' ELSE 'NO' END as result,
       'bookings table exists' as description
UNION ALL
SELECT 'CORE TABLES' as check_type,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'voice_notes') 
            THEN 'YES' ELSE 'NO' END as result,
       'voice_notes table exists' as description;

-- Check RLS status
SELECT 'RLS STATUS' as check_type, COUNT(*) as result, 'tables with RLS enabled' as description
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- Check policies
SELECT 'POLICIES' as check_type, COUNT(*) as result, 'total RLS policies' as description
FROM pg_policies 
WHERE schemaname = 'public';

-- Check indexes
SELECT 'INDEXES' as check_type, COUNT(*) as result, 'total performance indexes' as description
FROM pg_indexes 
WHERE schemaname = 'public'; 