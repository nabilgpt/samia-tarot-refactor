-- ============================================================
-- PART 5: CREATE PERFORMANCE INDEXES (FIXED)
-- Creates indexes only if tables and columns exist
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE 'Starting performance index creation...';
    
    -- ============================================================
    -- PAYMENT METHODS INDEXES
    -- ============================================================
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_methods') THEN
        RAISE NOTICE '✅ payment_methods table found, creating indexes...';
        
        -- Basic indexes
        CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
        
        -- Check for specific columns before creating indexes
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_methods' AND column_name = 'type') THEN
            CREATE INDEX IF NOT EXISTS idx_payment_methods_type ON payment_methods(type);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_methods' AND column_name = 'is_default') THEN
            CREATE INDEX IF NOT EXISTS idx_payment_methods_is_default ON payment_methods(is_default);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_methods' AND column_name = 'is_active') THEN
            CREATE INDEX IF NOT EXISTS idx_payment_methods_is_active ON payment_methods(is_active);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_methods' AND column_name = 'provider') THEN
            CREATE INDEX IF NOT EXISTS idx_payment_methods_provider ON payment_methods(provider);
        END IF;
        
        RAISE NOTICE '✅ payment_methods indexes created';
    ELSE
        RAISE NOTICE '❌ payment_methods table not found, skipping indexes';
    END IF;
    
    -- ============================================================
    -- WALLET TRANSACTIONS INDEXES
    -- ============================================================
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wallet_transactions') THEN
        RAISE NOTICE '✅ wallet_transactions table found, creating indexes...';
        
        CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wallet_transactions' AND column_name = 'booking_id') THEN
            CREATE INDEX IF NOT EXISTS idx_wallet_transactions_booking_id ON wallet_transactions(booking_id);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wallet_transactions' AND column_name = 'transaction_type') THEN
            CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(transaction_type);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wallet_transactions' AND column_name = 'status') THEN
            CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wallet_transactions' AND column_name = 'created_at') THEN
            CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at);
        END IF;
        
        RAISE NOTICE '✅ wallet_transactions indexes created';
    ELSE
        RAISE NOTICE '❌ wallet_transactions table not found, skipping indexes';
    END IF;
    
    -- ============================================================
    -- PAYMENT RECEIPTS INDEXES
    -- ============================================================
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_receipts') THEN
        RAISE NOTICE '✅ payment_receipts table found, creating indexes...';
        
        CREATE INDEX IF NOT EXISTS idx_payment_receipts_user_id ON payment_receipts(user_id);
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_receipts' AND column_name = 'booking_id') THEN
            CREATE INDEX IF NOT EXISTS idx_payment_receipts_booking_id ON payment_receipts(booking_id);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_receipts' AND column_name = 'receipt_number') THEN
            CREATE INDEX IF NOT EXISTS idx_payment_receipts_receipt_number ON payment_receipts(receipt_number);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_receipts' AND column_name = 'is_verified') THEN
            CREATE INDEX IF NOT EXISTS idx_payment_receipts_is_verified ON payment_receipts(is_verified);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_receipts' AND column_name = 'created_at') THEN
            CREATE INDEX IF NOT EXISTS idx_payment_receipts_created_at ON payment_receipts(created_at);
        END IF;
        
        RAISE NOTICE '✅ payment_receipts indexes created';
    ELSE
        RAISE NOTICE '❌ payment_receipts table not found, skipping indexes';
    END IF;
    
    -- ============================================================
    -- VOICE NOTES INDEXES
    -- ============================================================
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'voice_notes') THEN
        RAISE NOTICE '✅ voice_notes table found, creating indexes...';
        
        CREATE INDEX IF NOT EXISTS idx_voice_notes_user_id ON voice_notes(user_id);
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'voice_notes' AND column_name = 'message_id') THEN
            CREATE INDEX IF NOT EXISTS idx_voice_notes_message_id ON voice_notes(message_id);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'voice_notes' AND column_name = 'created_at') THEN
            CREATE INDEX IF NOT EXISTS idx_voice_notes_created_at ON voice_notes(created_at);
        END IF;
        
        RAISE NOTICE '✅ voice_notes indexes created';
    ELSE
        RAISE NOTICE '❌ voice_notes table not found, skipping indexes';
    END IF;
    
    -- ============================================================
    -- ANALYTICS INDEXES
    -- ============================================================
    
    -- Daily Analytics
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_analytics') THEN
        RAISE NOTICE '✅ daily_analytics table found, creating indexes...';
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_analytics' AND column_name = 'date') THEN
            CREATE INDEX IF NOT EXISTS idx_daily_analytics_date ON daily_analytics(date);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_analytics' AND column_name = 'created_at') THEN
            CREATE INDEX IF NOT EXISTS idx_daily_analytics_created_at ON daily_analytics(created_at);
        END IF;
        
        RAISE NOTICE '✅ daily_analytics indexes created';
    END IF;
    
    -- Reader Analytics
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reader_analytics') THEN
        RAISE NOTICE '✅ reader_analytics table found, creating indexes...';
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reader_analytics' AND column_name = 'reader_id') THEN
            CREATE INDEX IF NOT EXISTS idx_reader_analytics_reader_id ON reader_analytics(reader_id);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reader_analytics' AND column_name = 'date') THEN
            CREATE INDEX IF NOT EXISTS idx_reader_analytics_date ON reader_analytics(date);
        END IF;
        
        RAISE NOTICE '✅ reader_analytics indexes created';
    END IF;
    
    -- User Activity Logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_activity_logs') THEN
        RAISE NOTICE '✅ user_activity_logs table found, creating indexes...';
        
        CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_activity_logs' AND column_name = 'activity_type') THEN
            CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity_type ON user_activity_logs(activity_type);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_activity_logs' AND column_name = 'created_at') THEN
            CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);
        END IF;
        
        RAISE NOTICE '✅ user_activity_logs indexes created';
    END IF;
    
    -- ============================================================
    -- AI SYSTEM INDEXES
    -- ============================================================
    
    -- AI Learning Data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_learning_data') THEN
        RAISE NOTICE '✅ ai_learning_data table found, creating indexes...';
        
        CREATE INDEX IF NOT EXISTS idx_ai_learning_data_user_id ON ai_learning_data(user_id);
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_learning_data' AND column_name = 'interaction_type') THEN
            CREATE INDEX IF NOT EXISTS idx_ai_learning_data_interaction_type ON ai_learning_data(interaction_type);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_learning_data' AND column_name = 'created_at') THEN
            CREATE INDEX IF NOT EXISTS idx_ai_learning_data_created_at ON ai_learning_data(created_at);
        END IF;
        
        RAISE NOTICE '✅ ai_learning_data indexes created';
    END IF;
    
    -- AI Reading Results
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_reading_results') THEN
        RAISE NOTICE '✅ ai_reading_results table found, creating indexes...';
        
        CREATE INDEX IF NOT EXISTS idx_ai_reading_results_user_id ON ai_reading_results(user_id);
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_reading_results' AND column_name = 'reading_type') THEN
            CREATE INDEX IF NOT EXISTS idx_ai_reading_results_reading_type ON ai_reading_results(reading_type);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_reading_results' AND column_name = 'created_at') THEN
            CREATE INDEX IF NOT EXISTS idx_ai_reading_results_created_at ON ai_reading_results(created_at);
        END IF;
        
        RAISE NOTICE '✅ ai_reading_results indexes created';
    END IF;
    
    -- ============================================================
    -- ADMIN SYSTEM INDEXES
    -- ============================================================
    
    -- Reader Applications
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reader_applications') THEN
        RAISE NOTICE '✅ reader_applications table found, creating indexes...';
        
        CREATE INDEX IF NOT EXISTS idx_reader_applications_user_id ON reader_applications(user_id);
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reader_applications' AND column_name = 'status') THEN
            CREATE INDEX IF NOT EXISTS idx_reader_applications_status ON reader_applications(status);
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reader_applications' AND column_name = 'created_at') THEN
            CREATE INDEX IF NOT EXISTS idx_reader_applications_created_at ON reader_applications(created_at);
        END IF;
        
        RAISE NOTICE '✅ reader_applications indexes created';
    END IF;
    
    RAISE NOTICE '✅ PART 5 COMPLETED: Performance indexes created for available tables';
END $$; 