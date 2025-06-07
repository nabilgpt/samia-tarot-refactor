-- ============================================================
-- CHECK CURRENT DATABASE TABLES AND STRUCTURE (FIXED)
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

-- 3. Show CHAT_SESSIONS table structure if it exists
SELECT '📋 CHAT_SESSIONS TABLE STRUCTURE' as check_type;
SELECT 
    COALESCE(column_name, 'Table does not exist') as column_name,
    COALESCE(data_type, 'N/A') as data_type,
    COALESCE(is_nullable, 'N/A') as nullable,
    COALESCE(column_default, 'none') as default_value
FROM information_schema.columns 
WHERE table_name = 'chat_sessions'
ORDER BY ordinal_position;

-- 4. Show CHAT_MESSAGES table structure if it exists
SELECT '📋 CHAT_MESSAGES TABLE STRUCTURE' as check_type;
SELECT 
    COALESCE(column_name, 'Table does not exist') as column_name,
    COALESCE(data_type, 'N/A') as data_type,
    COALESCE(is_nullable, 'N/A') as nullable,
    COALESCE(column_default, 'none') as default_value
FROM information_schema.columns 
WHERE table_name = 'chat_messages'
ORDER BY ordinal_position;

-- 5. Show MESSAGES table structure if it exists (old structure)
SELECT '📋 MESSAGES TABLE STRUCTURE (OLD)' as check_type;
SELECT 
    COALESCE(column_name, 'Table does not exist') as column_name,
    COALESCE(data_type, 'N/A') as data_type,
    COALESCE(is_nullable, 'N/A') as nullable,
    COALESCE(column_default, 'none') as default_value
FROM information_schema.columns 
WHERE table_name = 'messages'
ORDER BY ordinal_position;

-- 6. Check for foreign key relationships
SELECT '🔗 FOREIGN KEY RELATIONSHIPS' as check_type;
SELECT 
    COALESCE(tc.table_name, 'No relationships found') as table_name,
    COALESCE(kcu.column_name, '') as column_name,
    COALESCE(ccu.table_name, '') as foreign_table_name,
    COALESCE(ccu.column_name, '') as foreign_column_name 
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
    COALESCE(
        'chat_messages has these ID columns: ' || string_agg(column_name, ', '),
        'chat_messages table does not exist or has no ID columns'
    )
FROM information_schema.columns 
WHERE table_name = 'chat_messages' 
AND column_name LIKE '%id%'
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
    COALESCE(column_name, 'Table does not exist') as column_name,
    COALESCE(data_type, 'N/A') as data_type,
    COALESCE(is_nullable, 'N/A') as is_nullable,
    COALESCE(column_default, 'none') as column_default
FROM information_schema.columns 
WHERE table_name = 'chat_messages'
ORDER BY ordinal_position;

-- 11. Simple diagnostic output with DO block (fixed syntax)
DO $$
DECLARE
    table_count INTEGER;
    chat_sessions_exists BOOLEAN;
    chat_messages_exists BOOLEAN;
    messages_exists BOOLEAN;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    
    -- Check specific tables
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_sessions'
    ) INTO chat_sessions_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages'
    ) INTO chat_messages_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'messages'
    ) INTO messages_exists;
    
    -- Output results
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔍 DIAGNOSTIC SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total tables in database: %', table_count;
    RAISE NOTICE 'chat_sessions exists: %', chat_sessions_exists;
    RAISE NOTICE 'chat_messages exists: %', chat_messages_exists;
    RAISE NOTICE 'messages exists: %', messages_exists;
    RAISE NOTICE '========================================';
    
    IF NOT chat_sessions_exists AND NOT chat_messages_exists THEN
        RAISE NOTICE '❌ CRITICAL: No chat system tables found!';
        RAISE NOTICE '📋 ACTION: Run COMPLETE_DATABASE_SETUP.sql to create missing tables';
    ELSIF messages_exists AND NOT chat_messages_exists THEN
        RAISE NOTICE '🔄 MIGRATION NEEDED: Old messages table found, need to migrate to chat_messages';
        RAISE NOTICE '📋 ACTION: Run FIX_CHAT_SESSION_ID_ERROR.sql to migrate';
    ELSIF chat_sessions_exists AND NOT chat_messages_exists THEN
        RAISE NOTICE '⚠️ PARTIAL: chat_sessions exists but chat_messages missing';
        RAISE NOTICE '📋 ACTION: Run FIX_CHAT_SESSION_ID_ERROR.sql to create chat_messages';
    ELSE
        RAISE NOTICE '✅ GOOD: Both chat tables exist - check column structure above';
    END IF;
    
END $$; 