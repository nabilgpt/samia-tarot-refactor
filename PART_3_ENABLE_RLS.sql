-- ============================================================
-- PART 3: ENABLE ROW LEVEL SECURITY
-- Enables RLS on all newly created tables
-- ============================================================

-- Enable RLS on Payment System Tables
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;

-- Enable RLS on Chat Enhancement Tables
ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;

-- Enable RLS on Analytics Tables
ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on AI System Tables
ALTER TABLE ai_learning_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reading_results ENABLE ROW LEVEL SECURITY;

-- Enable RLS on Admin System Tables
ALTER TABLE reader_applications ENABLE ROW LEVEL SECURITY;

-- Verification
DO $$
DECLARE
    table_rec RECORD;
    rls_enabled_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Checking RLS status for new tables:';
    
    FOR table_rec IN (
        SELECT schemaname, tablename, rowsecurity 
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
        IF table_rec.rowsecurity THEN
            RAISE NOTICE '✅ %: RLS enabled', table_rec.tablename;
            rls_enabled_count := rls_enabled_count + 1;
        ELSE
            RAISE NOTICE '❌ %: RLS disabled', table_rec.tablename;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ PART 3 COMPLETED: RLS enabled on % tables', rls_enabled_count;
END $$; 