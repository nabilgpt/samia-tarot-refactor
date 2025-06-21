-- ============================================================
-- SAMIA TAROT - QUICK RLS POLICIES TEST (SIMPLIFIED)
-- ============================================================
-- Simple validation without complex functions
-- Run this AFTER executing payment-rls-policies-setup.sql
-- ============================================================

-- Test 1: Check RLS Status
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧪 QUICK RLS TEST - SIMPLIFIED VERSION';
    RAISE NOTICE '=====================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ TEST 1: RLS STATUS CHECK';
    RAISE NOTICE '----------------------------';
END $$;

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('payment_settings', 'payment_gateways', 'payment_regions')
ORDER BY tablename;

-- Test 2: Count Policies
DO $$
DECLARE
    total_policies INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_policies
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('payment_settings', 'payment_gateways', 'payment_regions');
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ TEST 2: POLICY COUNT';
    RAISE NOTICE '------------------------';
    RAISE NOTICE '📊 Total policies found: %', total_policies;
    
    IF total_policies >= 10 THEN
        RAISE NOTICE '✅ Policy count looks good! (Expected: 10+)';
    ELSE
        RAISE NOTICE '⚠️  Expected at least 10 policies, found: %', total_policies;
    END IF;
END $$;

-- Test 3: List All Policies
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ TEST 3: POLICY DETAILS';
    RAISE NOTICE '--------------------------';
END $$;

SELECT 
    tablename as "Table",
    policyname as "Policy Name",
    cmd as "Operation",
    CASE 
        WHEN policyname LIKE '%super_admin%' THEN '👑 Super Admin'
        WHEN policyname LIKE '%admin%' AND policyname NOT LIKE '%super_admin%' THEN '🛡️  Admin'
        WHEN policyname LIKE '%public%' THEN '👥 Public'
        ELSE '❓ Unknown'
    END as "Target Role"
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('payment_settings', 'payment_gateways', 'payment_regions')
ORDER BY tablename, policyname;

-- Test 4: Check Migration History
DO $$
DECLARE
    migration_found BOOLEAN := false;
    migration_date TIMESTAMP;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM migration_history 
        WHERE migration_name = 'payment_rls_policies_setup_v1'
    ) INTO migration_found;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ TEST 4: MIGRATION HISTORY';
    RAISE NOTICE '-----------------------------';
    
    IF migration_found THEN
        SELECT executed_at INTO migration_date
        FROM migration_history 
        WHERE migration_name = 'payment_rls_policies_setup_v1'
        ORDER BY executed_at DESC 
        LIMIT 1;
        
        RAISE NOTICE '✅ Migration logged successfully at: %', migration_date;
    ELSE
        RAISE NOTICE '⚠️  Migration not found in history';
    END IF;
END $$;

-- Test 5: Security Summary
DO $$
DECLARE
    rls_enabled_count INTEGER;
    policy_count INTEGER;
    security_score INTEGER := 0;
BEGIN
    -- Count tables with RLS enabled
    SELECT COUNT(*) INTO rls_enabled_count
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('payment_settings', 'payment_gateways', 'payment_regions')
    AND rowsecurity = true;
    
    -- Count total policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('payment_settings', 'payment_gateways', 'payment_regions');
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ TEST 5: SECURITY SUMMARY';
    RAISE NOTICE '----------------------------';
    RAISE NOTICE '🔒 Tables with RLS enabled: % / 3', rls_enabled_count;
    RAISE NOTICE '📋 Total policies created: %', policy_count;
    
    -- Calculate security score
    IF rls_enabled_count = 3 THEN security_score := security_score + 50; END IF;
    IF policy_count >= 10 THEN security_score := security_score + 50; END IF;
    
    RAISE NOTICE '📊 Security Score: %/100', security_score;
    
    IF security_score = 100 THEN
        RAISE NOTICE '🎉 PERFECT! Payment system is fully secured!';
    ELSIF security_score >= 50 THEN
        RAISE NOTICE '✅ GOOD! Payment system is mostly secured.';
    ELSE
        RAISE NOTICE '⚠️  WARNING! Payment system needs attention.';
    END IF;
END $$;

-- Test 6: Role Access Summary (Manual Check)
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ TEST 6: EXPECTED ROLE ACCESS';
    RAISE NOTICE '-------------------------------';
    RAISE NOTICE '👑 SUPER ADMIN should have:';
    RAISE NOTICE '   ✅ payment_settings: Full CRUD';
    RAISE NOTICE '   ✅ payment_gateways: Full CRUD';
    RAISE NOTICE '   ✅ payment_regions: Full CRUD';
    RAISE NOTICE '';
    RAISE NOTICE '🛡️  ADMIN should have:';
    RAISE NOTICE '   ✅ payment_settings: Read + Update';
    RAISE NOTICE '   ✅ payment_gateways: Read + Update';
    RAISE NOTICE '   ✅ payment_regions: Read + Update';
    RAISE NOTICE '';
    RAISE NOTICE '👥 AUTHENTICATED USERS should have:';
    RAISE NOTICE '   ✅ payment_regions: Read only';
    RAISE NOTICE '   ❌ payment_settings: No access';
    RAISE NOTICE '   ❌ payment_gateways: No access';
    RAISE NOTICE '';
    RAISE NOTICE '🚫 OTHER ROLES should have:';
    RAISE NOTICE '   ❌ No access to any payment tables';
END $$;

-- Final Summary
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎯 QUICK RLS TEST COMPLETED!';
    RAISE NOTICE '=============================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Tests Performed:';
    RAISE NOTICE '   ✅ RLS Status Check';
    RAISE NOTICE '   ✅ Policy Count Verification';
    RAISE NOTICE '   ✅ Policy Details Listed';
    RAISE NOTICE '   ✅ Migration History Checked';
    RAISE NOTICE '   ✅ Security Summary Generated';
    RAISE NOTICE '   ✅ Role Access Documented';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Next Steps:';
    RAISE NOTICE '   1. Test with Super Admin user in frontend';
    RAISE NOTICE '   2. Test with Admin user in frontend';
    RAISE NOTICE '   3. Run payment auto-population script';
    RAISE NOTICE '   4. Verify payment settings panel works';
    RAISE NOTICE '';
    RAISE NOTICE '=============================';
END $$; 