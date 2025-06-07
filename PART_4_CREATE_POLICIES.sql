-- ============================================================
-- PART 4: CREATE RLS SECURITY POLICIES
-- Creates safe security policies that handle missing references
-- ============================================================

-- ============================================================
-- PAYMENT SYSTEM POLICIES
-- ============================================================

-- Payment Methods Policies
DROP POLICY IF EXISTS "Users can view their own payment methods" ON payment_methods;
CREATE POLICY "Users can view their own payment methods" ON payment_methods
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own payment methods" ON payment_methods;
CREATE POLICY "Users can insert their own payment methods" ON payment_methods
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own payment methods" ON payment_methods;
CREATE POLICY "Users can update their own payment methods" ON payment_methods
    FOR UPDATE USING (auth.uid() = user_id);

-- Wallet Transactions Policies
DROP POLICY IF EXISTS "Users can view their own wallet transactions" ON wallet_transactions;
CREATE POLICY "Users can view their own wallet transactions" ON wallet_transactions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own wallet transactions" ON wallet_transactions;
CREATE POLICY "Users can insert their own wallet transactions" ON wallet_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Payment Receipts Policies
DROP POLICY IF EXISTS "Users can view their own receipts" ON payment_receipts;
CREATE POLICY "Users can view their own receipts" ON payment_receipts
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own receipts" ON payment_receipts;
CREATE POLICY "Users can insert their own receipts" ON payment_receipts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- CHAT ENHANCEMENT POLICIES
-- ============================================================

-- Voice Notes Policies
DROP POLICY IF EXISTS "Users can view their own voice notes" ON voice_notes;
CREATE POLICY "Users can view their own voice notes" ON voice_notes
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own voice notes" ON voice_notes;
CREATE POLICY "Users can insert their own voice notes" ON voice_notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- ANALYTICS SYSTEM POLICIES
-- ============================================================

-- Daily Analytics Policies (Admin only)
DROP POLICY IF EXISTS "Admins can view daily analytics" ON daily_analytics;
CREATE POLICY "Admins can view daily analytics" ON daily_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Admins can manage daily analytics" ON daily_analytics;
CREATE POLICY "Admins can manage daily analytics" ON daily_analytics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Reader Analytics Policies
DROP POLICY IF EXISTS "Readers can view their own analytics" ON reader_analytics;
CREATE POLICY "Readers can view their own analytics" ON reader_analytics
    FOR SELECT USING (
        auth.uid() = reader_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "System can insert reader analytics" ON reader_analytics;
CREATE POLICY "System can insert reader analytics" ON reader_analytics
    FOR INSERT WITH CHECK (true);

-- User Activity Logs Policies
DROP POLICY IF EXISTS "Users can view their own activity" ON user_activity_logs;
CREATE POLICY "Users can view their own activity" ON user_activity_logs
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "System can log user activity" ON user_activity_logs;
CREATE POLICY "System can log user activity" ON user_activity_logs
    FOR INSERT WITH CHECK (true);

-- ============================================================
-- AI SYSTEM POLICIES
-- ============================================================

-- AI Learning Data Policies
DROP POLICY IF EXISTS "Users can view their own AI data" ON ai_learning_data;
CREATE POLICY "Users can view their own AI data" ON ai_learning_data
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own AI data" ON ai_learning_data;
CREATE POLICY "Users can insert their own AI data" ON ai_learning_data
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- AI Reading Results Policies
DROP POLICY IF EXISTS "Users can view their own AI results" ON ai_reading_results;
CREATE POLICY "Users can view their own AI results" ON ai_reading_results
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own AI results" ON ai_reading_results;
CREATE POLICY "Users can insert their own AI results" ON ai_reading_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- ADMIN SYSTEM POLICIES
-- ============================================================

-- Reader Applications Policies
DROP POLICY IF EXISTS "Users can view their own applications" ON reader_applications;
CREATE POLICY "Users can view their own applications" ON reader_applications
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Users can submit applications" ON reader_applications;
CREATE POLICY "Users can submit applications" ON reader_applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update applications" ON reader_applications;
CREATE POLICY "Admins can update applications" ON reader_applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- ============================================================
-- VERIFICATION
-- ============================================================

DO $$
DECLARE
    table_rec RECORD;
    policy_count INTEGER;
    total_policies INTEGER := 0;
BEGIN
    RAISE NOTICE 'Checking RLS policies for new tables:';
    
    FOR table_rec IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'payment_methods', 'wallet_transactions', 'payment_receipts',
            'voice_notes', 'daily_analytics', 'reader_analytics', 
            'user_activity_logs', 'ai_learning_data', 'ai_reading_results',
            'reader_applications'
        )
        ORDER BY tablename
    )
    LOOP
        SELECT COUNT(*) INTO policy_count
        FROM pg_policies 
        WHERE tablename = table_rec.tablename;
        
        RAISE NOTICE '✅ %: % policies created', table_rec.tablename, policy_count;
        total_policies := total_policies + policy_count;
    END LOOP;
    
    RAISE NOTICE '✅ PART 4 COMPLETED: Created % total security policies', total_policies;
END $$; 