-- ============================================================
-- PART 5: CREATE PERFORMANCE INDEXES
-- Creates indexes to optimize database performance
-- ============================================================

-- ============================================================
-- PAYMENT SYSTEM INDEXES
-- ============================================================

-- Payment Methods Indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_type ON payment_methods(type);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_default ON payment_methods(is_default);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_active ON payment_methods(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_methods_provider ON payment_methods(provider);

-- Wallet Transactions Indexes
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_booking_id ON wallet_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at);

-- Payment Receipts Indexes
CREATE INDEX IF NOT EXISTS idx_payment_receipts_user_id ON payment_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_booking_id ON payment_receipts(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_receipt_number ON payment_receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_is_verified ON payment_receipts(is_verified);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_created_at ON payment_receipts(created_at);

-- ============================================================
-- CHAT ENHANCEMENT INDEXES
-- ============================================================

-- Voice Notes Indexes
CREATE INDEX IF NOT EXISTS idx_voice_notes_user_id ON voice_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_notes_message_id ON voice_notes(message_id);
CREATE INDEX IF NOT EXISTS idx_voice_notes_created_at ON voice_notes(created_at);

-- ============================================================
-- ANALYTICS SYSTEM INDEXES
-- ============================================================

-- Daily Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_daily_analytics_date ON daily_analytics(date);
CREATE INDEX IF NOT EXISTS idx_daily_analytics_created_at ON daily_analytics(created_at);

-- Reader Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_reader_analytics_reader_id ON reader_analytics(reader_id);
CREATE INDEX IF NOT EXISTS idx_reader_analytics_date ON reader_analytics(date);
CREATE INDEX IF NOT EXISTS idx_reader_analytics_reader_date ON reader_analytics(reader_id, date);
CREATE INDEX IF NOT EXISTS idx_reader_analytics_earnings ON reader_analytics(total_earnings);

-- User Activity Logs Indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity_type ON user_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_action ON user_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);

-- ============================================================
-- AI SYSTEM INDEXES
-- ============================================================

-- AI Learning Data Indexes
CREATE INDEX IF NOT EXISTS idx_ai_learning_data_user_id ON ai_learning_data(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_learning_data_interaction_type ON ai_learning_data(interaction_type);
CREATE INDEX IF NOT EXISTS idx_ai_learning_data_feedback_score ON ai_learning_data(feedback_score);
CREATE INDEX IF NOT EXISTS idx_ai_learning_data_created_at ON ai_learning_data(created_at);

-- AI Reading Results Indexes
CREATE INDEX IF NOT EXISTS idx_ai_reading_results_user_id ON ai_reading_results(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_reading_results_reading_type ON ai_reading_results(reading_type);
CREATE INDEX IF NOT EXISTS idx_ai_reading_results_confidence ON ai_reading_results(ai_confidence);
CREATE INDEX IF NOT EXISTS idx_ai_reading_results_rating ON ai_reading_results(user_rating);
CREATE INDEX IF NOT EXISTS idx_ai_reading_results_created_at ON ai_reading_results(created_at);

-- ============================================================
-- ADMIN SYSTEM INDEXES
-- ============================================================

-- Reader Applications Indexes
CREATE INDEX IF NOT EXISTS idx_reader_applications_user_id ON reader_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_reader_applications_status ON reader_applications(status);
CREATE INDEX IF NOT EXISTS idx_reader_applications_type ON reader_applications(application_type);
CREATE INDEX IF NOT EXISTS idx_reader_applications_reviewed_by ON reader_applications(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_reader_applications_created_at ON reader_applications(created_at);

-- ============================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================================

-- Payment system composite indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_type_active ON payment_methods(user_id, type, is_active);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_status_date ON wallet_transactions(user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_user_verified_date ON payment_receipts(user_id, is_verified, created_at);

-- Analytics composite indexes
CREATE INDEX IF NOT EXISTS idx_reader_analytics_date_earnings ON reader_analytics(date, total_earnings);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_type_date ON user_activity_logs(user_id, activity_type, created_at);

-- AI system composite indexes
CREATE INDEX IF NOT EXISTS idx_ai_learning_user_type_date ON ai_learning_data(user_id, interaction_type, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_results_user_type_rating ON ai_reading_results(user_id, reading_type, user_rating);

-- Admin composite indexes
CREATE INDEX IF NOT EXISTS idx_reader_apps_status_date ON reader_applications(status, created_at);

-- ============================================================
-- VERIFICATION
-- ============================================================

DO $$
DECLARE
    table_rec RECORD;
    index_count INTEGER;
    total_indexes INTEGER := 0;
BEGIN
    RAISE NOTICE 'Checking indexes for new tables:';
    
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
        SELECT COUNT(*) INTO index_count
        FROM pg_indexes 
        WHERE tablename = table_rec.tablename
        AND schemaname = 'public';
        
        RAISE NOTICE '✅ %: % indexes created', table_rec.tablename, index_count;
        total_indexes := total_indexes + index_count;
    END LOOP;
    
    RAISE NOTICE '✅ PART 5 COMPLETED: Created % total performance indexes', total_indexes;
    RAISE NOTICE '🚀 Database optimization complete - queries will be faster!';
END $$; 