-- 🔍 SAMIA TAROT - DATABASE VERIFICATION SCRIPT
-- Run this after executing CRITICAL_DATABASE_SETUP.sql

-- ==============================================================================
-- TABLE EXISTENCE VERIFICATION
-- ==============================================================================

DO $$
DECLARE
    table_count INTEGER;
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    existing_tables TEXT[] := ARRAY[]::TEXT[];
    table_name TEXT;
    critical_tables TEXT[] := ARRAY[
        'payment_methods',
        'wallet_transactions', 
        'payment_receipts',
        'chat_sessions',
        'chat_messages',
        'voice_notes',
        'daily_analytics',
        'reader_analytics',
        'user_activity_logs',
        'reader_applications',
        'ai_learning_data',
        'ai_reading_results'
    ];
BEGIN
    RAISE NOTICE '🔍 VERIFYING CRITICAL DATABASE TABLES...';
    RAISE NOTICE '';
    
    -- Check each critical table
    FOREACH table_name IN ARRAY critical_tables
    LOOP
        SELECT COUNT(*) INTO table_count
        FROM information_schema.tables 
        WHERE information_schema.tables.table_name = table_name AND table_schema = 'public';
        
        IF table_count > 0 THEN
            existing_tables := array_append(existing_tables, table_name);
            RAISE NOTICE '✅ %', table_name;
        ELSE
            missing_tables := array_append(missing_tables, table_name);
            RAISE NOTICE '❌ % (MISSING)', table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 VERIFICATION SUMMARY:';
    RAISE NOTICE '✅ Existing Tables: % / %', array_length(existing_tables, 1), array_length(critical_tables, 1);
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE '❌ Missing Tables: %', array_length(missing_tables, 1);
        RAISE NOTICE '🚨 Missing: %', array_to_string(missing_tables, ', ');
        RAISE NOTICE '';
        RAISE NOTICE '⚠️ INCOMPLETE SETUP - Please re-run CRITICAL_DATABASE_SETUP.sql';
    ELSE
        RAISE NOTICE '🎉 ALL CRITICAL TABLES EXIST!';
        RAISE NOTICE '';
        RAISE NOTICE '🚀 READY FOR TESTING:';
        RAISE NOTICE '1. Payment Processing System';
        RAISE NOTICE '2. Enhanced Chat System';
        RAISE NOTICE '3. Analytics Dashboard';
        RAISE NOTICE '4. Reader Applications';
        RAISE NOTICE '5. AI Features';
    END IF;
END $$;

-- ==============================================================================
-- INDEX VERIFICATION
-- ==============================================================================

DO $$
DECLARE
    index_count INTEGER;
    expected_indexes TEXT[] := ARRAY[
        'idx_payment_methods_user_id',
        'idx_wallet_transactions_wallet_id',
        'idx_chat_sessions_booking_id',
        'idx_chat_messages_session_id',
        'idx_daily_analytics_date',
        'idx_reader_analytics_reader_date'
    ];
    index_name TEXT;
    existing_indexes INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 VERIFYING PERFORMANCE INDEXES...';
    
    FOREACH index_name IN ARRAY expected_indexes
    LOOP
        SELECT COUNT(*) INTO index_count
        FROM pg_indexes 
        WHERE indexname = index_name AND schemaname = 'public';
        
        IF index_count > 0 THEN
            existing_indexes := existing_indexes + 1;
            RAISE NOTICE '✅ %', index_name;
        ELSE
            RAISE NOTICE '❌ % (MISSING)', index_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 INDEX SUMMARY: % / % indexes created', existing_indexes, array_length(expected_indexes, 1);
END $$;

-- ==============================================================================
-- RLS POLICY VERIFICATION
-- ==============================================================================

DO $$
DECLARE
    rls_count INTEGER;
    table_name TEXT;
    critical_tables TEXT[] := ARRAY[
        'payment_methods',
        'chat_sessions',
        'chat_messages',
        'daily_analytics',
        'reader_analytics'
    ];
    rls_enabled INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 VERIFYING ROW LEVEL SECURITY...';
    
    FOREACH table_name IN ARRAY critical_tables
    LOOP
        SELECT COUNT(*) INTO rls_count
        FROM pg_tables 
        WHERE pg_tables.tablename = table_name 
        AND pg_tables.schemaname = 'public'
        AND pg_tables.rowsecurity = true;
        
        IF rls_count > 0 THEN
            rls_enabled := rls_enabled + 1;
            RAISE NOTICE '✅ % (RLS Enabled)', table_name;
        ELSE
            RAISE NOTICE '❌ % (RLS Disabled)', table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 RLS SUMMARY: % / % tables secured', rls_enabled, array_length(critical_tables, 1);
END $$;

-- ==============================================================================
-- FINAL STATUS REPORT
-- ==============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==================================================';
    RAISE NOTICE '🎯 FINAL VERIFICATION STATUS';
    RAISE NOTICE '==================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 NEXT IMMEDIATE STEPS:';
    RAISE NOTICE '';
    RAISE NOTICE '1. 🌐 FRONTEND TESTING:';
    RAISE NOTICE '   - Open http://localhost:3000';
    RAISE NOTICE '   - Test Super Admin Dashboard';
    RAISE NOTICE '   - Verify Analytics sections load';
    RAISE NOTICE '';
    RAISE NOTICE '2. 💳 PAYMENT TESTING:';
    RAISE NOTICE '   - Test booking creation';
    RAISE NOTICE '   - Test payment processing';
    RAISE NOTICE '   - Verify wallet operations';
    RAISE NOTICE '';
    RAISE NOTICE '3. 💬 CHAT TESTING:';
    RAISE NOTICE '   - Test chat sessions';
    RAISE NOTICE '   - Test voice messages';
    RAISE NOTICE '   - Verify real-time updates';
    RAISE NOTICE '';
    RAISE NOTICE '4. 👥 READER MANAGEMENT:';
    RAISE NOTICE '   - Test reader applications';
    RAISE NOTICE '   - Test approval workflow';
    RAISE NOTICE '   - Verify reader analytics';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 STATUS: READY FOR PRODUCTION TESTING!';
END $$; 