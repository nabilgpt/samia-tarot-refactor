-- ============================================================
-- DIAGNOSE USER_ID COLUMN ERROR
-- Run this to identify which table is causing the user_id error
-- ============================================================

-- Check if auth schema and users table exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
        RAISE NOTICE '✅ Auth schema exists';
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
            RAISE NOTICE '✅ auth.users table exists';
            
            -- Check auth.users columns
            RAISE NOTICE 'Auth.users columns:';
            FOR rec IN (SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' ORDER BY ordinal_position)
            LOOP
                RAISE NOTICE '  - %: %', rec.column_name, rec.data_type;
            END LOOP;
        ELSE
            RAISE NOTICE '❌ auth.users table does NOT exist';
        END IF;
    ELSE
        RAISE NOTICE '❌ Auth schema does NOT exist';
    END IF;
END $$;

-- Check existing tables that should have user_id
DO $$
DECLARE
    table_rec RECORD;
    has_user_id BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Checking existing tables for user_id column:';
    
    FOR table_rec IN (
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name IN ('profiles', 'bookings', 'chat_sessions', 'chat_messages')
    )
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = table_rec.table_name 
            AND column_name = 'user_id'
        ) INTO has_user_id;
        
        IF has_user_id THEN
            RAISE NOTICE '✅ % has user_id column', table_rec.table_name;
        ELSE
            RAISE NOTICE '❌ % missing user_id column', table_rec.table_name;
        END IF;
    END LOOP;
END $$;

-- Check what tables already exist from our creation attempts
DO $$
DECLARE
    table_rec RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Tables that may have been partially created:';
    
    FOR table_rec IN (
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name IN (
            'payment_methods', 'wallet_transactions', 'payment_receipts',
            'voice_notes', 'daily_analytics', 'reader_analytics', 
            'user_activity_logs', 'ai_learning_data', 'ai_reading_results',
            'reader_applications'
        )
        ORDER BY table_name
    )
    LOOP
        RAISE NOTICE '  📋 % exists', table_rec.table_name;
    END LOOP;
END $$;

-- Test specific problematic references
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Testing specific references that might be causing issues:';
    
    -- Test auth.users reference
    BEGIN
        PERFORM 1 FROM auth.users LIMIT 1;
        RAISE NOTICE '✅ Can query auth.users successfully';
    EXCEPTION WHEN others THEN
        RAISE NOTICE '❌ Cannot query auth.users: %', SQLERRM;
    END;
    
    -- Test profiles table reference
    BEGIN
        PERFORM 1 FROM profiles LIMIT 1;
        RAISE NOTICE '✅ Can query profiles table successfully';
    EXCEPTION WHEN others THEN
        RAISE NOTICE '❌ Cannot query profiles table: %', SQLERRM;
    END;
    
    -- Test bookings table reference  
    BEGIN
        PERFORM 1 FROM bookings LIMIT 1;
        RAISE NOTICE '✅ Can query bookings table successfully';
    EXCEPTION WHEN others THEN
        RAISE NOTICE '❌ Cannot query bookings table: %', SQLERRM;
    END;
END $$; 