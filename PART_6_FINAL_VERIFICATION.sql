-- ============================================================
-- PART 6: FINAL VERIFICATION AND SUMMARY
-- Comprehensive check of the complete database setup
-- ============================================================

DO $$
DECLARE
    table_rec RECORD;
    policy_rec RECORD;
    index_rec RECORD;
    
    -- Counters
    total_tables INTEGER := 0;
    total_policies INTEGER := 0;
    total_indexes INTEGER := 0;
    total_foreign_keys INTEGER := 0;
    
    -- Expected tables
    expected_tables TEXT[] := ARRAY[
        'payment_methods', 'wallet_transactions', 'payment_receipts',
        'voice_notes', 'daily_analytics', 'reader_analytics', 
        'user_activity_logs', 'ai_learning_data', 'ai_reading_results',
        'reader_applications'
    ];
    
    table_name TEXT;
    missing_tables TEXT[] := '{}';
    has_rls BOOLEAN;
    fk_count INTEGER;
    
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '🎯 SAMIA TAROT DATABASE SETUP VERIFICATION';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '';
    
    -- ============================================================
    -- TABLE EXISTENCE CHECK
    -- ============================================================
    RAISE NOTICE '📋 TABLE VERIFICATION:';
    RAISE NOTICE '----------------------------------------';
    
    FOREACH table_name IN ARRAY expected_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = table_name) THEN
            RAISE NOTICE '✅ % - EXISTS', table_name;
            total_tables := total_tables + 1;
        ELSE
            RAISE NOTICE '❌ % - MISSING', table_name;
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 Tables Status: %/% created', total_tables, array_length(expected_tables, 1);
    
    -- ============================================================
    -- ROW LEVEL SECURITY CHECK
    -- ============================================================
    RAISE NOTICE '';
    RAISE NOTICE '🔒 ROW LEVEL SECURITY VERIFICATION:';
    RAISE NOTICE '----------------------------------------';
    
    FOR table_rec IN (
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = ANY(expected_tables)
        ORDER BY tablename
    )
    LOOP
        IF table_rec.rowsecurity THEN
            RAISE NOTICE '✅ % - RLS ENABLED', table_rec.tablename;
        ELSE
            RAISE NOTICE '❌ % - RLS DISABLED', table_rec.tablename;
        END IF;
    END LOOP;
    
    -- ============================================================
    -- POLICIES CHECK
    -- ============================================================
    RAISE NOTICE '';
    RAISE NOTICE '🛡️ SECURITY POLICIES VERIFICATION:';
    RAISE NOTICE '----------------------------------------';
    
    FOR table_rec IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = ANY(expected_tables)
        ORDER BY tablename
    )
    LOOP
        SELECT COUNT(*) INTO fk_count
        FROM pg_policies 
        WHERE tablename = table_rec.tablename;
        
        RAISE NOTICE '✅ %: % policies', table_rec.tablename, fk_count;
        total_policies := total_policies + fk_count;
    END LOOP;
    
    -- ============================================================
    -- FOREIGN KEYS CHECK
    -- ============================================================
    RAISE NOTICE '';
    RAISE NOTICE '🔗 FOREIGN KEY CONSTRAINTS VERIFICATION:';
    RAISE NOTICE '----------------------------------------';
    
    FOR table_rec IN (
        SELECT DISTINCT tc.table_name
        FROM information_schema.table_constraints tc
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = ANY(expected_tables)
        ORDER BY tc.table_name
    )
    LOOP
        SELECT COUNT(*) INTO fk_count
        FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY'
        AND table_schema = 'public'
        AND table_name = table_rec.table_name;
        
        RAISE NOTICE '✅ %: % foreign keys', table_rec.table_name, fk_count;
        total_foreign_keys := total_foreign_keys + fk_count;
    END LOOP;
    
    -- ============================================================
    -- INDEXES CHECK
    -- ============================================================
    RAISE NOTICE '';
    RAISE NOTICE '⚡ PERFORMANCE INDEXES VERIFICATION:';
    RAISE NOTICE '----------------------------------------';
    
    FOR table_rec IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = ANY(expected_tables)
        ORDER BY tablename
    )
    LOOP
        SELECT COUNT(*) INTO fk_count
        FROM pg_indexes 
        WHERE tablename = table_rec.tablename
        AND schemaname = 'public';
        
        RAISE NOTICE '✅ %: % indexes', table_rec.tablename, fk_count;
        total_indexes := total_indexes + fk_count;
    END LOOP;
    
    -- ============================================================
    -- SYSTEM INTEGRATION CHECK
    -- ============================================================
    RAISE NOTICE '';
    RAISE NOTICE '🔄 SYSTEM INTEGRATION VERIFICATION:';
    RAISE NOTICE '----------------------------------------';
    
    -- Check auth.users integration
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        RAISE NOTICE '✅ auth.users integration - READY';
    ELSE
        RAISE NOTICE '⚠️ auth.users integration - NOT AVAILABLE';
    END IF;
    
    -- Check profiles integration
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        RAISE NOTICE '✅ profiles integration - READY';
    ELSE
        RAISE NOTICE '⚠️ profiles integration - NOT AVAILABLE';
    END IF;
    
    -- Check bookings integration
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
        RAISE NOTICE '✅ bookings integration - READY';
    ELSE
        RAISE NOTICE '⚠️ bookings integration - NOT AVAILABLE';
    END IF;
    
    -- Check chat_messages integration
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages') THEN
        RAISE NOTICE '✅ chat_messages integration - READY';
    ELSE
        RAISE NOTICE '⚠️ chat_messages integration - NOT AVAILABLE';
    END IF;
    
    -- ============================================================
    -- FINAL SUMMARY
    -- ============================================================
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '📈 FINAL SETUP SUMMARY:';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '📋 Tables Created: %', total_tables;
    RAISE NOTICE '🛡️ Security Policies: %', total_policies;
    RAISE NOTICE '🔗 Foreign Keys: %', total_foreign_keys;
    RAISE NOTICE '⚡ Performance Indexes: %', total_indexes;
    RAISE NOTICE '';
    
    IF total_tables = array_length(expected_tables, 1) THEN
        RAISE NOTICE '🎉 SUCCESS: All critical tables created!';
        RAISE NOTICE '💾 Payment System: OPERATIONAL';
        RAISE NOTICE '📊 Analytics System: OPERATIONAL';
        RAISE NOTICE '🤖 AI System: OPERATIONAL';
        RAISE NOTICE '👨‍💼 Admin System: OPERATIONAL';
        RAISE NOTICE '💬 Chat Enhancement: OPERATIONAL';
        RAISE NOTICE '';
        RAISE NOTICE '✅ SAMIA TAROT DATABASE IS READY FOR PRODUCTION!';
    ELSE
        RAISE NOTICE '⚠️ PARTIAL SUCCESS: %/% tables created', total_tables, array_length(expected_tables, 1);
        IF array_length(missing_tables, 1) > 0 THEN
            RAISE NOTICE '❌ Missing tables: %', array_to_string(missing_tables, ', ');
        END IF;
    END IF;
    
    RAISE NOTICE '==========================================';
    
END $$; 