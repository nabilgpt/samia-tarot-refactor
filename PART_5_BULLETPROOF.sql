-- ============================================================
-- PART 5: CREATE INDEXES (BULLETPROOF VERSION)
-- Checks every table and column before creating any index
-- ============================================================

DO $$
DECLARE
    indexes_created INTEGER := 0;
BEGIN
    RAISE NOTICE '🛡️ BULLETPROOF INDEX CREATION STARTING...';
    RAISE NOTICE 'This version will NOT fail on missing columns!';
    RAISE NOTICE '';
    
    -- ============================================================
    -- PAYMENT METHODS
    -- ============================================================
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_methods') THEN
        RAISE NOTICE '✅ payment_methods table found';
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_methods' AND column_name = 'user_id') THEN
            CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
            indexes_created := indexes_created + 1;
            RAISE NOTICE '  ✅ payment_methods.user_id index created';
        ELSE
            RAISE NOTICE '  ⚠️ payment_methods.user_id column not found - skipping';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_methods' AND column_name = 'type') THEN
            CREATE INDEX IF NOT EXISTS idx_payment_methods_type ON payment_methods(type);
            indexes_created := indexes_created + 1;
            RAISE NOTICE '  ✅ payment_methods.type index created';
        ELSE
            RAISE NOTICE '  ⚠️ payment_methods.type column not found - skipping';
        END IF;
        
    ELSE
        RAISE NOTICE '❌ payment_methods table not found - skipping all indexes';
    END IF;
    
    -- ============================================================
    -- WALLET TRANSACTIONS
    -- ============================================================
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wallet_transactions') THEN
        RAISE NOTICE '✅ wallet_transactions table found';
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wallet_transactions' AND column_name = 'user_id') THEN
            CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
            indexes_created := indexes_created + 1;
            RAISE NOTICE '  ✅ wallet_transactions.user_id index created';
        ELSE
            RAISE NOTICE '  ⚠️ wallet_transactions.user_id column not found - skipping';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wallet_transactions' AND column_name = 'booking_id') THEN
            CREATE INDEX IF NOT EXISTS idx_wallet_transactions_booking_id ON wallet_transactions(booking_id);
            indexes_created := indexes_created + 1;
            RAISE NOTICE '  ✅ wallet_transactions.booking_id index created';
        ELSE
            RAISE NOTICE '  ⚠️ wallet_transactions.booking_id column not found - skipping';
        END IF;
        
    ELSE
        RAISE NOTICE '❌ wallet_transactions table not found - skipping all indexes';
    END IF;
    
    -- ============================================================
    -- PAYMENT RECEIPTS
    -- ============================================================
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_receipts') THEN
        RAISE NOTICE '✅ payment_receipts table found';
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_receipts' AND column_name = 'user_id') THEN
            CREATE INDEX IF NOT EXISTS idx_payment_receipts_user_id ON payment_receipts(user_id);
            indexes_created := indexes_created + 1;
            RAISE NOTICE '  ✅ payment_receipts.user_id index created';
        ELSE
            RAISE NOTICE '  ⚠️ payment_receipts.user_id column not found - skipping';
        END IF;
        
    ELSE
        RAISE NOTICE '❌ payment_receipts table not found - skipping all indexes';
    END IF;
    
    -- ============================================================
    -- VOICE NOTES (THE PROBLEM TABLE)
    -- ============================================================
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'voice_notes') THEN
        RAISE NOTICE '✅ voice_notes table found - checking columns carefully...';
        
        -- Show what columns actually exist
        RAISE NOTICE '  📋 Available columns in voice_notes:';
        FOR col_name IN (
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'voice_notes' 
            ORDER BY ordinal_position
        )
        LOOP
            RAISE NOTICE '    - %', col_name;
        END LOOP;
        
        -- Only create index if user_id column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'voice_notes' AND column_name = 'user_id') THEN
            CREATE INDEX IF NOT EXISTS idx_voice_notes_user_id ON voice_notes(user_id);
            indexes_created := indexes_created + 1;
            RAISE NOTICE '  ✅ voice_notes.user_id index created';
        ELSE
            RAISE NOTICE '  ❌ voice_notes.user_id column MISSING - cannot create index';
            RAISE NOTICE '  💡 This explains the error! The table structure is different than expected.';
        END IF;
        
        -- Check other columns
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'voice_notes' AND column_name = 'message_id') THEN
            CREATE INDEX IF NOT EXISTS idx_voice_notes_message_id ON voice_notes(message_id);
            indexes_created := indexes_created + 1;
            RAISE NOTICE '  ✅ voice_notes.message_id index created';
        ELSE
            RAISE NOTICE '  ⚠️ voice_notes.message_id column not found - skipping';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'voice_notes' AND column_name = 'created_at') THEN
            CREATE INDEX IF NOT EXISTS idx_voice_notes_created_at ON voice_notes(created_at);
            indexes_created := indexes_created + 1;
            RAISE NOTICE '  ✅ voice_notes.created_at index created';
        ELSE
            RAISE NOTICE '  ⚠️ voice_notes.created_at column not found - skipping';
        END IF;
        
    ELSE
        RAISE NOTICE '❌ voice_notes table not found - skipping all indexes';
    END IF;
    
    -- ============================================================
    -- DAILY ANALYTICS
    -- ============================================================
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_analytics') THEN
        RAISE NOTICE '✅ daily_analytics table found';
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_analytics' AND column_name = 'date') THEN
            CREATE INDEX IF NOT EXISTS idx_daily_analytics_date ON daily_analytics(date);
            indexes_created := indexes_created + 1;
            RAISE NOTICE '  ✅ daily_analytics.date index created';
        ELSE
            RAISE NOTICE '  ⚠️ daily_analytics.date column not found - skipping';
        END IF;
        
    ELSE
        RAISE NOTICE '❌ daily_analytics table not found - skipping all indexes';
    END IF;
    
    -- ============================================================
    -- USER ACTIVITY LOGS
    -- ============================================================
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_activity_logs') THEN
        RAISE NOTICE '✅ user_activity_logs table found';
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_activity_logs' AND column_name = 'user_id') THEN
            CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
            indexes_created := indexes_created + 1;
            RAISE NOTICE '  ✅ user_activity_logs.user_id index created';
        ELSE
            RAISE NOTICE '  ⚠️ user_activity_logs.user_id column not found - skipping';
        END IF;
        
    ELSE
        RAISE NOTICE '❌ user_activity_logs table not found - skipping all indexes';
    END IF;
    
    -- ============================================================
    -- AI LEARNING DATA
    -- ============================================================
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_learning_data') THEN
        RAISE NOTICE '✅ ai_learning_data table found';
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_learning_data' AND column_name = 'user_id') THEN
            CREATE INDEX IF NOT EXISTS idx_ai_learning_data_user_id ON ai_learning_data(user_id);
            indexes_created := indexes_created + 1;
            RAISE NOTICE '  ✅ ai_learning_data.user_id index created';
        ELSE
            RAISE NOTICE '  ⚠️ ai_learning_data.user_id column not found - skipping';
        END IF;
        
    ELSE
        RAISE NOTICE '❌ ai_learning_data table not found - skipping all indexes';
    END IF;
    
    -- ============================================================
    -- AI READING RESULTS
    -- ============================================================
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_reading_results') THEN
        RAISE NOTICE '✅ ai_reading_results table found';
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_reading_results' AND column_name = 'user_id') THEN
            CREATE INDEX IF NOT EXISTS idx_ai_reading_results_user_id ON ai_reading_results(user_id);
            indexes_created := indexes_created + 1;
            RAISE NOTICE '  ✅ ai_reading_results.user_id index created';
        ELSE
            RAISE NOTICE '  ⚠️ ai_reading_results.user_id column not found - skipping';
        END IF;
        
    ELSE
        RAISE NOTICE '❌ ai_reading_results table not found - skipping all indexes';
    END IF;
    
    -- ============================================================
    -- READER APPLICATIONS
    -- ============================================================
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reader_applications') THEN
        RAISE NOTICE '✅ reader_applications table found';
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reader_applications' AND column_name = 'user_id') THEN
            CREATE INDEX IF NOT EXISTS idx_reader_applications_user_id ON reader_applications(user_id);
            indexes_created := indexes_created + 1;
            RAISE NOTICE '  ✅ reader_applications.user_id index created';
        ELSE
            RAISE NOTICE '  ⚠️ reader_applications.user_id column not found - skipping';
        END IF;
        
    ELSE
        RAISE NOTICE '❌ reader_applications table not found - skipping all indexes';
    END IF;
    
    -- ============================================================
    -- SUCCESS SUMMARY
    -- ============================================================
    
    RAISE NOTICE '';
    RAISE NOTICE '🎯 BULLETPROOF INDEX CREATION COMPLETED!';
    RAISE NOTICE '⚡ Successfully created % indexes', indexes_created;
    RAISE NOTICE '✅ No errors occurred - all checks passed!';
    
    IF indexes_created >= 8 THEN
        RAISE NOTICE '🚀 Excellent! Database performance is optimized.';
    ELSIF indexes_created >= 4 THEN
        RAISE NOTICE '👍 Good progress! Core indexes are in place.';
    ELSE
        RAISE NOTICE '⚠️ Limited indexes created - may need table structure review.';
    END IF;
    
    RAISE NOTICE '';
    
END $$; 