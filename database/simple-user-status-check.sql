-- ============================================================================
-- SIMPLE USER STATUS CHECK
-- This script checks the current status of users in the database
-- ============================================================================

-- Check current users
SELECT 
    '=== CURRENT USERS STATUS ===' as status_header;

SELECT 
    id,
    email,
    name,
    role,
    is_active,
    CASE 
        WHEN encrypted_password IS NOT NULL AND encrypted_password != '' THEN 'YES'
        ELSE 'NO'
    END as has_encrypted_password,
    created_at,
    updated_at
FROM profiles 
WHERE is_active = true
ORDER BY 
    CASE role 
        WHEN 'super_admin' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'monitor' THEN 3
        WHEN 'reader' THEN 4
        ELSE 5
    END,
    email;

-- Summary statistics
SELECT 
    '=== SUMMARY STATISTICS ===' as summary_header;

SELECT 
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_profiles,
    COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_profiles,
    COUNT(CASE WHEN email IS NULL OR email = '' THEN 1 END) as invalid_emails,
    COUNT(CASE WHEN encrypted_password IS NULL OR encrypted_password = '' THEN 1 END) as no_password
FROM profiles;

-- Role distribution
SELECT 
    '=== ROLE DISTRIBUTION ===' as role_header;

SELECT 
    role,
    COUNT(*) as count,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
FROM profiles 
GROUP BY role
ORDER BY 
    CASE role 
        WHEN 'super_admin' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'monitor' THEN 3
        WHEN 'reader' THEN 4
        ELSE 5
    END;

-- Check for duplicates
SELECT 
    '=== DUPLICATE CHECK ===' as duplicate_header;

SELECT 
    email,
    COUNT(*) as count
FROM profiles 
WHERE email IS NOT NULL AND email != ''
GROUP BY email
HAVING COUNT(*) > 1;

-- Expected enterprise users check
SELECT 
    '=== ENTERPRISE USERS CHECK ===' as enterprise_header;

WITH expected_users AS (
    SELECT unnest(ARRAY[
        'info@samiatarot.com',
        'saeeeel@gmail.com', 
        'nabilzein@gmail.com',
        'nabilgpt.en@gmail.com',
        'sara@sara.com'
    ]) as email
)
SELECT 
    eu.email as expected_email,
    CASE 
        WHEN p.email IS NOT NULL THEN 'EXISTS'
        ELSE 'MISSING'
    END as status,
    p.role,
    p.is_active,
    CASE 
        WHEN p.encrypted_password IS NOT NULL AND p.encrypted_password != '' THEN 'YES'
        ELSE 'NO'
    END as has_password
FROM expected_users eu
LEFT JOIN profiles p ON eu.email = p.email
ORDER BY eu.email; 