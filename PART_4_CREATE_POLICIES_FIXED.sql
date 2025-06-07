-- ============================================================
-- PART 4: CREATE RLS SECURITY POLICIES (FIXED)
-- Creates safe security policies only if tables and columns exist
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE 'Starting security policy creation...';
    
    -- ============================================================
    -- PAYMENT METHODS POLICIES
    -- ============================================================
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_methods') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_methods' AND column_name = 'user_id') THEN
            RAISE NOTICE '✅ payment_methods table found with user_id column, creating policies...';
            
            DROP POLICY IF EXISTS "Users can view their own payment methods" ON payment_methods;
            CREATE POLICY "Users can view their own payment methods" ON payment_methods
                FOR SELECT USING (auth.uid() = user_id);

            DROP POLICY IF EXISTS "Users can insert their own payment methods" ON payment_methods;
            CREATE POLICY "Users can insert their own payment methods" ON payment_methods
                FOR INSERT WITH CHECK (auth.uid() = user_id);

            DROP POLICY IF EXISTS "Users can update their own payment methods" ON payment_methods;
            CREATE POLICY "Users can update their own payment methods" ON payment_methods
                FOR UPDATE USING (auth.uid() = user_id);
                
            RAISE NOTICE '✅ payment_methods policies created';
        ELSE
            RAISE NOTICE '❌ payment_methods.user_id column not found, skipping policies';
        END IF;
    ELSE
        RAISE NOTICE '❌ payment_methods table not found, skipping policies';
    END IF;
    
    -- ============================================================
    -- WALLET TRANSACTIONS POLICIES
    -- ============================================================
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wallet_transactions') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wallet_transactions' AND column_name = 'user_id') THEN
            RAISE NOTICE '✅ wallet_transactions table found with user_id column, creating policies...';
            
            DROP POLICY IF EXISTS "Users can view their own wallet transactions" ON wallet_transactions;
            CREATE POLICY "Users can view their own wallet transactions" ON wallet_transactions
                FOR SELECT USING (auth.uid() = user_id);

            DROP POLICY IF EXISTS "Users can insert their own wallet transactions" ON wallet_transactions;
            CREATE POLICY "Users can insert their own wallet transactions" ON wallet_transactions
                FOR INSERT WITH CHECK (auth.uid() = user_id);
                
            RAISE NOTICE '✅ wallet_transactions policies created';
        ELSE
            RAISE NOTICE '❌ wallet_transactions.user_id column not found, skipping policies';
        END IF;
    ELSE
        RAISE NOTICE '❌ wallet_transactions table not found, skipping policies';
    END IF;
    
    -- ============================================================
    -- PAYMENT RECEIPTS POLICIES
    -- ============================================================
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_receipts') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_receipts' AND column_name = 'user_id') THEN
            RAISE NOTICE '✅ payment_receipts table found with user_id column, creating policies...';
            
            DROP POLICY IF EXISTS "Users can view their own receipts" ON payment_receipts;
            CREATE POLICY "Users can view their own receipts" ON payment_receipts
                FOR SELECT USING (auth.uid() = user_id);

            DROP POLICY IF EXISTS "Users can insert their own receipts" ON payment_receipts;
            CREATE POLICY "Users can insert their own receipts" ON payment_receipts
                FOR INSERT WITH CHECK (auth.uid() = user_id);
                
            RAISE NOTICE '✅ payment_receipts policies created';
        ELSE
            RAISE NOTICE '❌ payment_receipts.user_id column not found, skipping policies';
        END IF;
    ELSE
        RAISE NOTICE '❌ payment_receipts table not found, skipping policies';
    END IF;
    
    -- ============================================================
    -- VOICE NOTES POLICIES
    -- ============================================================
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'voice_notes') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'voice_notes' AND column_name = 'user_id') THEN
            RAISE NOTICE '✅ voice_notes table found with user_id column, creating policies...';
            
            DROP POLICY IF EXISTS "Users can view their own voice notes" ON voice_notes;
            CREATE POLICY "Users can view their own voice notes" ON voice_notes
                FOR SELECT USING (auth.uid() = user_id);

            DROP POLICY IF EXISTS "Users can insert their own voice notes" ON voice_notes;
            CREATE POLICY "Users can insert their own voice notes" ON voice_notes
                FOR INSERT WITH CHECK (auth.uid() = user_id);
                
            RAISE NOTICE '✅ voice_notes policies created';
        ELSE
            RAISE NOTICE '❌ voice_notes.user_id column not found, skipping policies';
        END IF;
    ELSE
        RAISE NOTICE '❌ voice_notes table not found, skipping policies';
    END IF;
    
    -- ============================================================
    -- ANALYTICS POLICIES (ADMIN DEPENDENT)
    -- ============================================================
    
    -- Daily Analytics (requires profiles table)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_analytics') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        RAISE NOTICE '✅ daily_analytics and profiles tables found, creating admin policies...';
        
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
            
        RAISE NOTICE '✅ daily_analytics policies created';
    ELSE
        RAISE NOTICE '❌ daily_analytics or profiles table not found, skipping admin policies';
    END IF;
    
    -- ============================================================
    -- BASIC USER POLICIES (USER_ID ONLY)
    -- ============================================================
    
    -- User Activity Logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_activity_logs') THEN
        RAISE NOTICE '✅ user_activity_logs table found, creating basic policies...';
        
        DROP POLICY IF EXISTS "Users can view their own activity" ON user_activity_logs;
        CREATE POLICY "Users can view their own activity" ON user_activity_logs
            FOR SELECT USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "System can log user activity" ON user_activity_logs;
        CREATE POLICY "System can log user activity" ON user_activity_logs
            FOR INSERT WITH CHECK (true);
            
        RAISE NOTICE '✅ user_activity_logs policies created';
    END IF;
    
    -- AI Learning Data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_learning_data') THEN
        RAISE NOTICE '✅ ai_learning_data table found, creating basic policies...';
        
        DROP POLICY IF EXISTS "Users can view their own AI data" ON ai_learning_data;
        CREATE POLICY "Users can view their own AI data" ON ai_learning_data
            FOR SELECT USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can insert their own AI data" ON ai_learning_data;
        CREATE POLICY "Users can insert their own AI data" ON ai_learning_data
            FOR INSERT WITH CHECK (auth.uid() = user_id);
            
        RAISE NOTICE '✅ ai_learning_data policies created';
    END IF;
    
    -- AI Reading Results
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_reading_results') THEN
        RAISE NOTICE '✅ ai_reading_results table found, creating basic policies...';
        
        DROP POLICY IF EXISTS "Users can view their own AI results" ON ai_reading_results;
        CREATE POLICY "Users can view their own AI results" ON ai_reading_results
            FOR SELECT USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can insert their own AI results" ON ai_reading_results;
        CREATE POLICY "Users can insert their own AI results" ON ai_reading_results
            FOR INSERT WITH CHECK (auth.uid() = user_id);
            
        RAISE NOTICE '✅ ai_reading_results policies created';
    END IF;
    
    -- Reader Applications
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reader_applications') THEN
        RAISE NOTICE '✅ reader_applications table found, creating basic policies...';
        
        DROP POLICY IF EXISTS "Users can view their own applications" ON reader_applications;
        CREATE POLICY "Users can view their own applications" ON reader_applications
            FOR SELECT USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can submit applications" ON reader_applications;
        CREATE POLICY "Users can submit applications" ON reader_applications
            FOR INSERT WITH CHECK (auth.uid() = user_id);
            
        RAISE NOTICE '✅ reader_applications policies created';
    END IF;
    
    RAISE NOTICE '✅ PART 4 COMPLETED: Security policies created for available tables';
END $$; 