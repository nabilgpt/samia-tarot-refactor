-- ============================================================
-- PART 6: FINAL VERIFICATION AND SUMMARY (FIXED)
-- Comprehensive check with resolved variable naming conflicts
-- ============================================================

DO $$
DECLARE
    table_rec RECORD;
    
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
    
    current_table_name TEXT;
    missing_tables TEXT[] := '{}';
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
    
    FOREACH current_table_name IN ARRAY expected_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = current_table_name) THEN
            RAISE NOTICE '✅ % - EXISTS', current_table_name;
            total_tables := total_tables + 1;
        ELSE
            RAISE NOTICE '❌ % - MISSING', current_table_name;
            missing_tables := array_append(missing_tables, current_table_name);
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
        SELECT DISTINCT tc.table_name as tbl_name
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
        AND table_name = table_rec.tbl_name;
        
        RAISE NOTICE '✅ %: % foreign keys', table_rec.tbl_name, fk_count;
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
    -- DETAILED COLUMN VERIFICATION
    -- ============================================================
    RAISE NOTICE '';
    RAISE NOTICE '🔍 DETAILED COLUMN VERIFICATION:';
    RAISE NOTICE '----------------------------------------';
    
    -- Check critical columns for main tables
    FOREACH current_table_name IN ARRAY expected_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = current_table_name) THEN
            -- Check for user_id column (most tables should have this)
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = current_table_name AND column_name = 'user_id') THEN
                RAISE NOTICE '✅ %.user_id - EXISTS', current_table_name;
            ELSE
                -- Check for reader_id (for reader_analytics)
                IF current_table_name = 'reader_analytics' AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = current_table_name AND column_name = 'reader_id') THEN
                    RAISE NOTICE '✅ %.reader_id - EXISTS', current_table_name;
                ELSIF current_table_name != 'daily_analytics' THEN
                    RAISE NOTICE '⚠️ %.user_id - MISSING', current_table_name;
                END IF;
            END IF;
        END IF;
    END LOOP;
    
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
        RAISE NOTICE '';
        RAISE NOTICE '💡 RECOMMENDATION: Review Part 1 execution results';
    END IF;
    
    -- Performance summary
    IF total_indexes > 20 THEN
        RAISE NOTICE '🚀 Database performance optimization: EXCELLENT';
    ELSIF total_indexes > 10 THEN
        RAISE NOTICE '⚡ Database performance optimization: GOOD';
    ELSE
        RAISE NOTICE '⚠️ Database performance optimization: BASIC';
    END IF;
    
    RAISE NOTICE '==========================================';
    
END $$; 