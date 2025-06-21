-- ============================================================
-- FIX POLICY ALREADY EXISTS ERROR - SAMIA TAROT
-- حل مشكلة: ERROR: 42710: policy already exists
-- ============================================================

-- Step 1: Drop existing policies if they exist (safe approach)
DO $$
BEGIN
    -- Drop all existing policies for payment_methods table
    DROP POLICY IF EXISTS "Users can view their own payment methods" ON payment_methods;
    DROP POLICY IF EXISTS "Users can insert their own payment methods" ON payment_methods;
    DROP POLICY IF EXISTS "Users can update their own payment methods" ON payment_methods;
    DROP POLICY IF EXISTS "Users can delete their own payment methods" ON payment_methods;
    
    RAISE NOTICE '✅ Existing payment_methods policies dropped (if they existed)';
END $$;

-- Step 2: Drop existing policies for analytics tables (if they exist)
DO $$
BEGIN
    -- Daily Analytics policies
    DROP POLICY IF EXISTS "Only admins can view daily analytics" ON daily_analytics;
    DROP POLICY IF EXISTS "Only super admins can manage daily analytics" ON daily_analytics;
    
    -- Reader Analytics policies
    DROP POLICY IF EXISTS "Readers can view their own analytics" ON reader_analytics;
    DROP POLICY IF EXISTS "Only admins can manage reader analytics" ON reader_analytics;
    
    -- Service Usage Analytics policies
    DROP POLICY IF EXISTS "Admins can view service usage analytics" ON service_usage_analytics;
    DROP POLICY IF EXISTS "Only super admins can manage service usage analytics" ON service_usage_analytics;
    
    -- AI Model Performance policies
    DROP POLICY IF EXISTS "Admins can view AI model performance" ON ai_model_performance;
    DROP POLICY IF EXISTS "Only super admins can manage AI model performance" ON ai_model_performance;
    
    RAISE NOTICE '✅ Existing analytics policies dropped (if they existed)';
END $$;

-- Step 3: Recreate payment_methods policies with conflict-free approach
CREATE POLICY "Users can view their own payment methods" ON payment_methods
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'monitor'))
    );

CREATE POLICY "Users can insert their own payment methods" ON payment_methods
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment methods" ON payment_methods
    FOR UPDATE USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Users can delete their own payment methods" ON payment_methods
    FOR DELETE USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Step 4: Recreate analytics policies with conflict-free approach
-- Daily Analytics policies (Admin/Super Admin only)
CREATE POLICY "Only admins can view daily analytics" ON daily_analytics
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'monitor'))
    );

CREATE POLICY "Only super admins can manage daily analytics" ON daily_analytics
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- Reader Analytics policies
CREATE POLICY "Readers can view their own analytics" ON reader_analytics
    FOR SELECT USING (
        auth.uid() = reader_id OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'monitor'))
    );

CREATE POLICY "Only admins can manage reader analytics" ON reader_analytics
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Service Usage Analytics policies
CREATE POLICY "Admins can view service usage analytics" ON service_usage_analytics
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'monitor'))
    );

CREATE POLICY "Only super admins can manage service usage analytics" ON service_usage_analytics
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- AI Model Performance policies
CREATE POLICY "Admins can view AI model performance" ON ai_model_performance
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'monitor'))
    );

CREATE POLICY "Only super admins can manage AI model performance" ON ai_model_performance
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- Step 5: Verify RLS is enabled on all tables
DO $$
BEGIN
    -- Enable RLS on payment_methods (if not already enabled)
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = 'payment_methods' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS enabled on payment_methods';
    ELSE
        RAISE NOTICE '✅ RLS already enabled on payment_methods';
    END IF;
    
    -- Enable RLS on analytics tables (if not already enabled)
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = 'daily_analytics' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS enabled on daily_analytics';
    ELSE
        RAISE NOTICE '✅ RLS already enabled on daily_analytics';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = 'reader_analytics' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE reader_analytics ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS enabled on reader_analytics';
    ELSE
        RAISE NOTICE '✅ RLS already enabled on reader_analytics';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = 'service_usage_analytics' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE service_usage_analytics ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS enabled on service_usage_analytics';
    ELSE
        RAISE NOTICE '✅ RLS already enabled on service_usage_analytics';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = 'ai_model_performance' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE ai_model_performance ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS enabled on ai_model_performance';
    ELSE
        RAISE NOTICE '✅ RLS already enabled on ai_model_performance';
    END IF;
END $$;

-- Step 6: Verify all policies are created successfully
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    -- Count policies for payment_methods
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'payment_methods';
    
    RAISE NOTICE '✅ payment_methods has % policies', policy_count;
    
    -- Count policies for daily_analytics
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'daily_analytics';
    
    RAISE NOTICE '✅ daily_analytics has % policies', policy_count;
    
    -- Count policies for reader_analytics
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'reader_analytics';
    
    RAISE NOTICE '✅ reader_analytics has % policies', policy_count;
    
    -- Count policies for service_usage_analytics
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'service_usage_analytics';
    
    RAISE NOTICE '✅ service_usage_analytics has % policies', policy_count;
    
    -- Count policies for ai_model_performance
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'ai_model_performance';
    
    RAISE NOTICE '✅ ai_model_performance has % policies', policy_count;
END $$;

-- Step 7: Test policy functionality (optional - uncomment to test)
/*
DO $$
BEGIN
    -- Test if policies are working by checking if we can query the tables
    -- This will only work if you have proper auth context
    
    RAISE NOTICE 'Testing policy functionality...';
    
    -- Test payment_methods access
    IF EXISTS (SELECT 1 FROM payment_methods LIMIT 1) THEN
        RAISE NOTICE '✅ payment_methods policies working - access granted';
    ELSE
        RAISE NOTICE '✅ payment_methods policies working - no data or access restricted';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Policy test failed (this is normal if no auth context): %', SQLERRM;
END $$;
*/

-- ============================================================
-- SUMMARY
-- ============================================================
-- ✅ All existing policies dropped safely using DROP POLICY IF EXISTS
-- ✅ New policies created without conflicts
-- ✅ RLS enabled on all tables (if not already enabled)
-- ✅ Policy counts verified
-- 
-- The "policy already exists" error should now be resolved!
-- You can now run other scripts without policy conflicts.
-- ============================================================

-- Step 8: Final success messages
DO $$
BEGIN
    RAISE NOTICE '🎉 Policy conflicts resolved! All policies recreated successfully.';
    RAISE NOTICE '🚀 You can now run COMPLETE_MISSING_TABLES.sql without policy errors.';
    RAISE NOTICE '✅ All tables are ready with proper RLS policies.';
END $$; 