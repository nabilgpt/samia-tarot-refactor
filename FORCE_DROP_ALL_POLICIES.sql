-- ============================================================
-- FORCE DROP ALL POLICIES - SAMIA TAROT
-- حل نهائي لمشكلة: ERROR: 42710: policy already exists
-- ============================================================

-- Step 1: Force drop ALL policies for payment_methods using dynamic SQL
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Get all existing policies for payment_methods and drop them
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'payment_methods'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON payment_methods', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
    
    RAISE NOTICE '✅ All payment_methods policies force-dropped';
END $$;

-- Step 2: Force drop ALL policies for analytics tables using dynamic SQL
DO $$
DECLARE
    policy_record RECORD;
    table_name TEXT;
BEGIN
    -- Loop through each analytics table
    FOR table_name IN VALUES ('daily_analytics'), ('reader_analytics'), ('service_usage_analytics'), ('ai_model_performance')
    LOOP
        -- Drop all policies for this table
        FOR policy_record IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = table_name
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_record.policyname, table_name);
            RAISE NOTICE 'Dropped policy: % from table: %', policy_record.policyname, table_name;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '✅ All analytics table policies force-dropped';
END $$;

-- Step 3: Verify all policies are dropped
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename IN ('payment_methods', 'daily_analytics', 'reader_analytics', 'service_usage_analytics', 'ai_model_performance');
    
    RAISE NOTICE 'Remaining policies count: %', policy_count;
    
    IF policy_count = 0 THEN
        RAISE NOTICE '✅ All policies successfully dropped!';
    ELSE
        RAISE NOTICE '⚠️ Some policies still exist - will be handled in next steps';
    END IF;
END $$;

-- Step 4: Disable and re-enable RLS to clear any cached policies
DO $$
BEGIN
    -- Disable RLS temporarily
    ALTER TABLE payment_methods DISABLE ROW LEVEL SECURITY;
    ALTER TABLE daily_analytics DISABLE ROW LEVEL SECURITY;
    ALTER TABLE reader_analytics DISABLE ROW LEVEL SECURITY;
    ALTER TABLE service_usage_analytics DISABLE ROW LEVEL SECURITY;
    ALTER TABLE ai_model_performance DISABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE '✅ RLS disabled on all tables';
    
    -- Re-enable RLS
    ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
    ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;
    ALTER TABLE reader_analytics ENABLE ROW LEVEL SECURITY;
    ALTER TABLE service_usage_analytics ENABLE ROW LEVEL SECURITY;
    ALTER TABLE ai_model_performance ENABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE '✅ RLS re-enabled on all tables';
END $$;

-- Step 5: Wait a moment and verify clean slate
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename IN ('payment_methods', 'daily_analytics', 'reader_analytics', 'service_usage_analytics', 'ai_model_performance');
    
    RAISE NOTICE 'Final policy count after RLS reset: %', policy_count;
    
    IF policy_count = 0 THEN
        RAISE NOTICE '🎉 Clean slate achieved! Ready to create new policies.';
    ELSE
        RAISE NOTICE '⚠️ % policies still exist - will override them', policy_count;
    END IF;
END $$;

-- Step 6: Create payment_methods policies with unique names to avoid conflicts
CREATE POLICY "payment_methods_select_policy" ON payment_methods
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'monitor'))
    );

CREATE POLICY "payment_methods_insert_policy" ON payment_methods
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "payment_methods_update_policy" ON payment_methods
    FOR UPDATE USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "payment_methods_delete_policy" ON payment_methods
    FOR DELETE USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Step 7: Create analytics policies with unique names
-- Daily Analytics policies
CREATE POLICY "daily_analytics_select_policy" ON daily_analytics
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'monitor'))
    );

CREATE POLICY "daily_analytics_manage_policy" ON daily_analytics
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- Reader Analytics policies
CREATE POLICY "reader_analytics_select_policy" ON reader_analytics
    FOR SELECT USING (
        auth.uid() = reader_id OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'monitor'))
    );

CREATE POLICY "reader_analytics_manage_policy" ON reader_analytics
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Service Usage Analytics policies
CREATE POLICY "service_analytics_select_policy" ON service_usage_analytics
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'monitor'))
    );

CREATE POLICY "service_analytics_manage_policy" ON service_usage_analytics
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- AI Model Performance policies
CREATE POLICY "ai_performance_select_policy" ON ai_model_performance
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'monitor'))
    );

CREATE POLICY "ai_performance_manage_policy" ON ai_model_performance
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- Step 8: Final verification
DO $$
DECLARE
    policy_count INTEGER;
    table_name TEXT;
    table_policy_count INTEGER;
BEGIN
    -- Count total policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename IN ('payment_methods', 'daily_analytics', 'reader_analytics', 'service_usage_analytics', 'ai_model_performance');
    
    RAISE NOTICE '✅ Total policies created: %', policy_count;
    
    -- Count policies per table
    FOR table_name IN VALUES ('payment_methods'), ('daily_analytics'), ('reader_analytics'), ('service_usage_analytics'), ('ai_model_performance')
    LOOP
        SELECT COUNT(*) INTO table_policy_count
        FROM pg_policies 
        WHERE tablename = table_name;
        
        RAISE NOTICE '✅ % has % policies', table_name, table_policy_count;
    END LOOP;
END $$;

-- Step 9: Success message
DO $$
BEGIN
    RAISE NOTICE '🎉 FORCE DROP AND RECREATE COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '✅ All policies recreated with unique names to avoid conflicts';
    RAISE NOTICE '✅ RLS properly enabled on all tables';
    RAISE NOTICE '🚀 Database is ready for COMPLETE_MISSING_TABLES.sql';
    RAISE NOTICE '💡 Policy names are now unique and conflict-free';
END $$;

-- ============================================================
-- SUMMARY
-- ============================================================
-- ✅ Force-dropped ALL existing policies using dynamic SQL
-- ✅ Disabled and re-enabled RLS to clear cache
-- ✅ Created new policies with unique names to prevent conflicts
-- ✅ Verified policy creation and counts
-- 
-- Policy names used (conflict-free):
-- - payment_methods: *_select_policy, *_insert_policy, *_update_policy, *_delete_policy
-- - analytics tables: *_select_policy, *_manage_policy
-- 
-- This approach should resolve ANY policy conflict issues permanently!
-- ============================================================ 