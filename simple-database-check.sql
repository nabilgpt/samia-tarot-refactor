-- Simple Database Health Check for SAMIA TAROT
-- Compatible with all PostgreSQL environments

-- 1. Count all tables
SELECT 'TOTAL TABLES' as check_type, count(*) as result
FROM information_schema.tables 
WHERE table_schema = 'public';

-- 2. Count all constraints  
SELECT 'TOTAL CONSTRAINTS' as check_type, count(*) as result
FROM information_schema.table_constraints 
WHERE constraint_schema = 'public';

-- 3. Check key tables exist
SELECT 'KEY TABLES CHECK' as check_type, 
       CASE WHEN count(*) >= 10 THEN 'PASS - Core tables exist' 
            ELSE 'FAIL - Missing core tables' END as result
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'bookings', 'payments', 'services', 'reviews', 
                   'chat_sessions', 'call_sessions', 'payment_methods', 
                   'system_settings', 'tarot_spreads');

-- 4. Check foreign keys
SELECT 'FOREIGN KEYS' as check_type, count(*) as result
FROM information_schema.referential_constraints 
WHERE constraint_schema = 'public';

-- 5. Sample data check (profiles table)
SELECT 'PROFILES DATA' as check_type, 
       CASE WHEN count(*) > 0 THEN concat(count(*), ' users found') 
            ELSE 'No users yet' END as result
FROM profiles;

-- 6. Sample data check (services table)  
SELECT 'SERVICES DATA' as check_type,
       CASE WHEN count(*) > 0 THEN concat(count(*), ' services found')
            ELSE 'No services yet' END as result  
FROM services;

-- 7. Payment methods check
SELECT 'PAYMENT METHODS' as check_type,
       CASE WHEN count(*) > 0 THEN concat(count(*), ' payment methods configured')
            ELSE 'No payment methods yet' END as result
FROM payment_methods;

-- 8. System settings check
SELECT 'SYSTEM SETTINGS' as check_type,
       CASE WHEN count(*) > 0 THEN concat(count(*), ' settings configured')
            ELSE 'No system settings yet' END as result
FROM system_settings; 