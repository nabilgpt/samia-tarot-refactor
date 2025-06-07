-- ============================================================
-- CHECK CURRENT DATABASE TABLES AND STRUCTURE
-- Run this first to see what we actually have
-- ============================================================

-- 1. List ALL existing tables
SELECT '🔍 ALL EXISTING TABLES IN DATABASE' as check_type;
SELECT 
    table_name,
    '✅' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Check CHAT-related tables specifically  
SELECT '💬 CHAT SYSTEM TABLES CHECK' as check_type;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_sessions') 
        THEN '✅ chat_sessions EXISTS'
        ELSE '❌ chat_sessions MISSING'
    END as chat_tables
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') 
        THEN '✅ chat_messages EXISTS'
        ELSE '❌ chat_messages MISSING'
    END
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') 
        THEN '✅ messages EXISTS (old table)'
        ELSE '❌ messages MISSING'
    END;

-- 3. Check CHAT_SESSIONS table structure if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_sessions') THEN
        RAISE NOTICE '📋 CHAT_SESSIONS TABLE STRUCTURE:';
        
        -- List all columns in chat_sessions
        FOR rec IN 
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'chat_sessions'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  - %: % (nullable: %, default: %)', 
                rec.column_name, rec.data_type, rec.is_nullable, COALESCE(rec.column_default, 'none');
        END LOOP;
    ELSE
        RAISE NOTICE '❌ chat_sessions table does not exist';
    END IF;
END $$;

-- 4. Check CHAT_MESSAGES table structure if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
        RAISE NOTICE '📋 CHAT_MESSAGES TABLE STRUCTURE:';
        
        -- List all columns in chat_messages
        FOR rec IN 
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'chat_messages'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  - %: % (nullable: %, default: %)', 
                rec.column_name, rec.data_type, rec.is_nullable, COALESCE(rec.column_default, 'none');
        END LOOP;
    ELSE
        RAISE NOTICE '❌ chat_messages table does not exist';
    END IF;
END $$;

-- 5. Check MESSAGES table structure if it exists (might be old structure)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
        RAISE NOTICE '📋 MESSAGES TABLE STRUCTURE (OLD):';
        
        -- List all columns in messages
        FOR rec IN 
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'messages'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  - %: % (nullable: %, default: %)', 
                rec.column_name, rec.data_type, rec.is_nullable, COALESCE(rec.column_default, 'none');
        END LOOP;
    ELSE
        RAISE NOTICE '❌ messages table does not exist';
    END IF;
END $$;

-- 6. Check for foreign key relationships
SELECT '🔗 FOREIGN KEY RELATIONSHIPS' as check_type;
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('chat_sessions', 'chat_messages', 'messages')
ORDER BY tc.table_name, kcu.column_name;

-- 7. Check critical missing tables
SELECT '🚨 CRITICAL TABLES STATUS' as check_type;
WITH critical_tables AS (
    SELECT unnest(ARRAY[
        'profiles', 'bookings', 'services', 'notifications', 'payments',
        'payment_methods', 'wallet_transactions', 
        'chat_sessions', 'chat_messages', 'voice_notes',
        'daily_analytics', 'reader_analytics', 'user_activity_logs',
        'reader_applications'
    ]) AS table_name
),
existing_tables AS (
    SELECT table_name
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
)
SELECT 
    c.table_name,
    CASE 
        WHEN e.table_name IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM critical_tables c
LEFT JOIN existing_tables e ON c.table_name = e.table_name
ORDER BY c.table_name;

-- 8. Count total tables
SELECT '📊 SUMMARY' as summary;
SELECT 
    'Total tables in database: ' || COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- 9. Specific column checks for the error
SELECT '🔍 SPECIFIC COLUMN CHECKS FOR ERROR' as check_type;

-- Check if chat_messages table has session_id column
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'chat_messages' AND column_name = 'session_id'
        ) THEN '✅ chat_messages.session_id EXISTS'
        ELSE '❌ chat_messages.session_id MISSING'
    END as session_id_check
UNION ALL
-- Check what ID columns chat_messages actually has
SELECT 
    'chat_messages has these ID columns: ' || string_agg(column_name, ', ')
FROM information_schema.columns 
WHERE table_name = 'chat_messages' 
AND column_name LIKE '%id%'
HAVING COUNT(*) > 0
UNION ALL
-- Check if it's using booking_id instead
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'chat_messages' AND column_name = 'booking_id'
        ) THEN '📝 chat_messages uses booking_id instead of session_id'
        ELSE '📝 chat_messages does not use booking_id either'
    END;

-- 10. Show exact column structure for debugging
SELECT '📋 EXACT CHAT_MESSAGES COLUMNS (if exists)' as debug_info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'chat_messages'
ORDER BY ordinal_position; 