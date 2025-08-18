-- Check Verification Status for Enterprise User Reset
-- This script will show us exactly why the verification failed

\echo '🔍 ENTERPRISE USER RESET VERIFICATION STATUS'
\echo '============================================='
\echo ''

-- Test 1: User Count Verification
\echo '📊 Test 1: User Count Verification'
\echo '-----------------------------------'
SELECT 
    'Current active users: ' || COUNT(*) as user_count_status,
    CASE 
        WHEN COUNT(*) = 5 THEN '✅ PASSED'
        ELSE '❌ FAILED - Expected 5 users, got ' || COUNT(*)
    END as test_result
FROM profiles 
WHERE is_active = true;

\echo ''

-- Test 2: Expected Users Check
\echo '👥 Test 2: Expected Users Verification'
\echo '--------------------------------------'
WITH expected_users AS (
    SELECT unnest(ARRAY[
        'info@samiatarot.com',
        'saeeeel@gmail.com',
        'nabilzein@gmail.com',
        'nabilgpt.en@gmail.com',
        'sara@sara.com'
    ]) as email,
    unnest(ARRAY[
        'super_admin',
        'admin', 
        'monitor',
        'reader',
        'reader'
    ]) as expected_role
)
SELECT 
    e.email,
    e.expected_role,
    CASE 
        WHEN p.email IS NULL THEN '❌ MISSING'
        WHEN p.role = e.expected_role THEN '✅ FOUND'
        ELSE '❌ WRONG ROLE (' || p.role || ')'
    END as status,
    p.is_active
FROM expected_users e
LEFT JOIN profiles p ON e.email = p.email
ORDER BY e.email;

\echo ''

-- Test 3: Password Encryption Check
\echo '🔐 Test 3: Password Encryption Verification'
\echo '-------------------------------------------'
SELECT 
    email,
    CASE 
        WHEN encrypted_password IS NULL THEN '❌ NO PASSWORD'
        WHEN encrypted_password LIKE '$2b$%' THEN '✅ BCRYPT'
        ELSE '❌ NOT BCRYPT'
    END as encryption_status,
    LEFT(encrypted_password, 10) || '...' as password_preview
FROM profiles 
WHERE is_active = true
ORDER BY email;

\echo ''

-- Test 4: Duplicate Check
\echo '🔄 Test 4: Duplicate Profile Check'
\echo '----------------------------------'
SELECT 
    email,
    COUNT(*) as profile_count,
    CASE 
        WHEN COUNT(*) = 1 THEN '✅ UNIQUE'
        ELSE '❌ DUPLICATE'
    END as duplicate_status
FROM profiles 
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;

-- If no duplicates, show success message
SELECT 
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM profiles 
            WHERE email IS NOT NULL
            GROUP BY email 
            HAVING COUNT(*) > 1
        ) THEN '✅ No duplicates found'
        ELSE '❌ Duplicates exist (see above)'
    END as duplicate_check_result;

\echo ''

-- Test 5: Database Integrity Check
\echo '🔧 Test 5: Database Integrity Check'
\echo '-----------------------------------'
SELECT 
    'Total profiles: ' || COUNT(*) as total_profiles,
    'Active profiles: ' || COUNT(*) FILTER (WHERE is_active = true) as active_profiles,
    'Inactive profiles: ' || COUNT(*) FILTER (WHERE is_active = false) as inactive_profiles,
    'Profiles with email: ' || COUNT(*) FILTER (WHERE email IS NOT NULL) as profiles_with_email,
    'Profiles with passwords: ' || COUNT(*) FILTER (WHERE encrypted_password IS NOT NULL) as profiles_with_passwords
FROM profiles;

\echo ''

-- Detailed User List
\echo '📋 Current Active Users'
\echo '----------------------'
SELECT 
    email,
    role,
    is_active,
    id,
    created_at::date as created_date,
    CASE 
        WHEN encrypted_password IS NULL THEN 'NO PASSWORD'
        WHEN encrypted_password LIKE '$2b$%' THEN 'BCRYPT'
        ELSE 'OTHER'
    END as password_type
FROM profiles 
WHERE is_active = true
ORDER BY email;

\echo ''

-- Inactive Users
\echo '🗑️ Inactive Users'
\echo '----------------'
SELECT 
    COALESCE(email, 'NULL') as email,
    role,
    is_active,
    id,
    created_at::date as created_date
FROM profiles 
WHERE is_active = false
ORDER BY created_at DESC;

\echo ''
\echo '📝 SUMMARY'
\echo '----------'
\echo 'Please review the results above to identify why the verification failed.'
\echo 'The most common issues are:'
\echo '1. Incorrect user count (should be exactly 5 active users)'
\echo '2. Missing expected users or wrong roles'
\echo '3. Passwords not properly encrypted with bcrypt'
\echo '4. Duplicate profiles still exist'
\echo '' 