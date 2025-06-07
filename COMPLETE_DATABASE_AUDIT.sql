-- ============================================================
-- COMPLETE DATABASE AUDIT FOR SAMIA TAROT
-- Comprehensive check of all tables, structures, and issues
-- ============================================================

DO $$
DECLARE
    audit_rec RECORD;
    table_count INTEGER := 0;
    missing_count INTEGER := 0;
    extra_count INTEGER := 0;
    issue_count INTEGER := 0;
    policy_count INTEGER := 0;
    index_count INTEGER := 0;
    
    -- Expected core tables from Supabase auth + our custom tables
    expected_tables TEXT[] := ARRAY[
        -- Supabase Auth Tables (should exist)
        'auth.users',
        'auth.sessions', 
        'auth.refresh_tokens',
        
        -- SAMIA TAROT Core Tables
        'profiles',
        'readers', 
        'bookings',
        'chat_sessions',
        'chat_messages',
        'payments',
        'reviews',
        'admin_users',
        'emergency_escalations',
        
        -- Payment System (Part 1)
        'payment_methods',
        'wallet_transactions', 
        'payment_receipts',
        
        -- Chat Enhancement
        'voice_notes',
        
        -- Analytics System
        'daily_analytics',
        'reader_analytics',
        'user_activity_logs',
        
        -- AI System  
        'ai_learning_data',
        'ai_reading_results',
        
        -- Admin System
        'reader_applications'
    ];
BEGIN
    RAISE NOTICE '🔍 STARTING COMPLETE DATABASE AUDIT...';
    RAISE NOTICE '====================================================';
    RAISE NOTICE '';
    
    -- ============================================================
    -- SECTION 1: TABLE INVENTORY CHECK
    -- ============================================================
    RAISE NOTICE '📋 SECTION 1: TABLE INVENTORY';
    RAISE NOTICE '────────────────────────────────';
    
    -- Count existing tables in public schema
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    
    RAISE NOTICE '📊 Found % tables in public schema', table_count;
    RAISE NOTICE '';
    
    -- List all existing tables
    RAISE NOTICE '📋 EXISTING TABLES:';
    FOR audit_rec IN (
        SELECT table_name, 
               pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
    )
    LOOP
        RAISE NOTICE '  ✅ % (Size: %)', audit_rec.table_name, audit_rec.size;
    END LOOP;
    RAISE NOTICE '';
    
    -- ============================================================
    -- SECTION 2: MISSING TABLES CHECK
    -- ============================================================
    RAISE NOTICE '🔍 SECTION 2: MISSING TABLES CHECK';
    RAISE NOTICE '────────────────────────────────────';
    
    -- Check for missing expected tables (only public schema tables)
    FOR audit_rec IN (
        SELECT unnest(expected_tables) as expected_table
    )
    LOOP
        -- Skip auth schema tables for missing check
        IF NOT audit_rec.expected_table LIKE 'auth.%' THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = audit_rec.expected_table
            ) THEN
                RAISE NOTICE '❌ MISSING: %', audit_rec.expected_table;
                missing_count := missing_count + 1;
            END IF;
        END IF;
    END LOOP;
    
    IF missing_count = 0 THEN
        RAISE NOTICE '✅ All expected tables are present!';
    ELSE
        RAISE NOTICE '⚠️ Found % missing tables', missing_count;
    END IF;
    RAISE NOTICE '';
    
    -- ============================================================
    -- SECTION 3: UNEXPECTED TABLES CHECK  
    -- ============================================================
    RAISE NOTICE '🔍 SECTION 3: UNEXPECTED/EXTRA TABLES';
    RAISE NOTICE '─────────────────────────────────────';
    
    -- Find tables that exist but aren't in our expected list
    FOR audit_rec IN (
        SELECT table_name
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name != ALL(expected_tables)
        ORDER BY table_name
    )
    LOOP
        RAISE NOTICE '⚠️ UNEXPECTED: % (may need review)', audit_rec.table_name;
        extra_count := extra_count + 1;
    END LOOP;
    
    IF extra_count = 0 THEN
        RAISE NOTICE '✅ No unexpected tables found!';
    ELSE
        RAISE NOTICE '📊 Found % unexpected tables', extra_count;
    END IF;
    RAISE NOTICE '';
    
    -- ============================================================
    -- SECTION 4: TABLE STRUCTURE AUDIT
    -- ============================================================
    RAISE NOTICE '🔍 SECTION 4: TABLE STRUCTURE AUDIT';
    RAISE NOTICE '────────────────────────────────────';
    
    -- Check each expected table's basic structure
    FOR audit_rec IN (
        SELECT table_name, 
               (SELECT COUNT(*) FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
        FROM information_schema.tables t
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    )
    LOOP
        RAISE NOTICE '📋 %:', audit_rec.table_name;
        RAISE NOTICE '   📊 Columns: %', audit_rec.column_count;
        
        -- Check for common required columns
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = audit_rec.table_name 
                  AND column_name = 'id') THEN
            RAISE NOTICE '   ✅ Has id column';
        ELSE
            RAISE NOTICE '   ⚠️ Missing id column';
            issue_count := issue_count + 1;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = audit_rec.table_name 
                  AND column_name = 'created_at') THEN
            RAISE NOTICE '   ✅ Has created_at timestamp';
        ELSE
            RAISE NOTICE '   ⚠️ Missing created_at timestamp';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = audit_rec.table_name 
                  AND column_name = 'updated_at') THEN
            RAISE NOTICE '   ✅ Has updated_at timestamp';
        ELSE
            RAISE NOTICE '   ℹ️ No updated_at timestamp (may be intentional)';
        END IF;
        RAISE NOTICE '';
    END LOOP;
    
    -- ============================================================
    -- SECTION 5: ROW LEVEL SECURITY AUDIT
    -- ============================================================
    RAISE NOTICE '🔍 SECTION 5: ROW LEVEL SECURITY AUDIT';
    RAISE NOTICE '──────────────────────────────────────';
    
    FOR audit_rec IN (
        SELECT tablename,
               rowsecurity
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    )
    LOOP
        IF audit_rec.rowsecurity THEN
            RAISE NOTICE '✅ %: RLS ENABLED', audit_rec.tablename;
        ELSE
            RAISE NOTICE '⚠️ %: RLS DISABLED', audit_rec.tablename;
            issue_count := issue_count + 1;
        END IF;
    END LOOP;
    RAISE NOTICE '';
    
    -- ============================================================
    -- SECTION 6: POLICIES AUDIT
    -- ============================================================
    RAISE NOTICE '🔍 SECTION 6: RLS POLICIES AUDIT';
    RAISE NOTICE '────────────────────────────────';
    
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    RAISE NOTICE '📊 Total RLS policies: %', policy_count;
    RAISE NOTICE '';
    
    FOR audit_rec IN (
        SELECT tablename, COUNT(*) as policy_count
        FROM pg_policies 
        WHERE schemaname = 'public'
        GROUP BY tablename
        ORDER BY tablename
    )
    LOOP
        RAISE NOTICE '📋 %: % policies', audit_rec.tablename, audit_rec.policy_count;
    END LOOP;
    RAISE NOTICE '';
    
    -- ============================================================
    -- SECTION 7: INDEXES AUDIT
    -- ============================================================
    RAISE NOTICE '🔍 SECTION 7: PERFORMANCE INDEXES AUDIT';
    RAISE NOTICE '────────────────────────────────────────';
    
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE schemaname = 'public';
    
    RAISE NOTICE '📊 Total indexes: %', index_count;
    RAISE NOTICE '';
    
    FOR audit_rec IN (
        SELECT tablename, COUNT(*) as index_count
        FROM pg_indexes 
        WHERE schemaname = 'public'
        GROUP BY tablename
        ORDER BY tablename
    )
    LOOP
        RAISE NOTICE '📋 %: % indexes', audit_rec.tablename, audit_rec.index_count;
    END LOOP;
    RAISE NOTICE '';
    
    -- ============================================================
    -- SECTION 8: FOREIGN KEY CONSTRAINTS AUDIT
    -- ============================================================
    RAISE NOTICE '🔍 SECTION 8: FOREIGN KEY CONSTRAINTS AUDIT';
    RAISE NOTICE '───────────────────────────────────────────';
    
    FOR audit_rec IN (
        SELECT 
            tc.table_name,
            tc.constraint_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_name
    )
    LOOP
        RAISE NOTICE '🔗 %.% → %.%', 
            audit_rec.table_name, audit_rec.column_name,
            audit_rec.foreign_table_name, audit_rec.foreign_column_name;
    END LOOP;
    RAISE NOTICE '';
    
    -- ============================================================
    -- SECTION 9: DATA INTEGRITY CHECK
    -- ============================================================
    RAISE NOTICE '🔍 SECTION 9: DATA INTEGRITY CHECK';
    RAISE NOTICE '───────────────────────────────────';
    
    FOR audit_rec IN (
        SELECT 
            table_name,
            (xpath('/row/c/text()', query_to_xml(format('SELECT COUNT(*) as c FROM %I', table_name), false, true, '')))[1]::text::int AS row_count
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    )
    LOOP
        IF audit_rec.row_count > 0 THEN
            RAISE NOTICE '📊 %: % rows', audit_rec.table_name, audit_rec.row_count;
        ELSE
            RAISE NOTICE '📊 %: EMPTY', audit_rec.table_name;
        END IF;
    END LOOP;
    RAISE NOTICE '';
    
    -- ============================================================
    -- FINAL SUMMARY REPORT
    -- ============================================================
    RAISE NOTICE '🎯 FINAL AUDIT SUMMARY';
    RAISE NOTICE '════════════════════════════════════════════════';
    RAISE NOTICE '📊 Database Statistics:';
    RAISE NOTICE '   • Total Tables: %', table_count;
    RAISE NOTICE '   • Missing Tables: %', missing_count;
    RAISE NOTICE '   • Unexpected Tables: %', extra_count;
    RAISE NOTICE '   • Structure Issues: %', issue_count;
    RAISE NOTICE '   • RLS Policies: %', policy_count;
    RAISE NOTICE '   • Performance Indexes: %', index_count;
    RAISE NOTICE '';
    
    -- Overall health assessment
    IF missing_count = 0 AND issue_count = 0 THEN
        RAISE NOTICE '🚀 DATABASE HEALTH: EXCELLENT';
        RAISE NOTICE '✅ All expected tables present with proper structure';
    ELSIF missing_count <= 2 AND issue_count <= 3 THEN
        RAISE NOTICE '👍 DATABASE HEALTH: GOOD';
        RAISE NOTICE '⚠️ Minor issues detected - see details above';
    ELSE
        RAISE NOTICE '⚠️ DATABASE HEALTH: NEEDS ATTENTION';
        RAISE NOTICE '❌ Multiple issues detected - review required';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔍 AUDIT COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '════════════════════════════════════════════════';
    
END $$; 