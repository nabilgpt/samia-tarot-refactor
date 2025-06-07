-- Show ALL tables (simple list)
SELECT table_name, 'TABLE' as type
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Show tables with suspicious patterns
SELECT table_name, 'PROBLEM' as type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND (
    table_name LIKE '%_test%' OR 
    table_name LIKE '%_temp%' OR 
    table_name LIKE '%_backup%' OR 
    table_name LIKE '%_old%' OR
    table_name LIKE '%_copy%' OR 
    table_name LIKE '%tmp%'
)
ORDER BY table_name;

-- Show expected tables status
SELECT 'admin_users' as expected_table, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_users') 
            THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 'profiles' as expected_table,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') 
            THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 'bookings' as expected_table,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') 
            THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 'voice_notes' as expected_table,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'voice_notes') 
            THEN 'EXISTS' ELSE 'MISSING' END as status; 