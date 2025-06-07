-- ============================================================
-- SAMIA TAROT - DATABASE VERIFICATION SCRIPT
-- Check which tables exist and which are missing
-- Execute this in Supabase SQL Editor to see current status
-- ============================================================

-- Query to check existing tables
SELECT 
    '🔍 CURRENT TABLES IN DATABASE' as status,
    COUNT(*) as total_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';

-- List all existing tables
SELECT 
    table_name as existing_tables,
    '✅' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ============================================================
-- CHECK CRITICAL TABLES STATUS
-- ============================================================

-- Core System Tables Check
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') 
        THEN '✅ profiles' 
        ELSE '❌ profiles' 
    END as core_tables
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') 
        THEN '✅ bookings' 
        ELSE '❌ bookings' 
    END
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'services') 
        THEN '✅ services' 
        ELSE '❌ services' 
    END
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') 
        THEN '✅ notifications' 
        ELSE '❌ notifications' 
    END;

-- Payment System Tables Check
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_methods') 
        THEN '✅ payment_methods' 
        ELSE '❌ payment_methods (CRITICAL)' 
    END as payment_tables
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallet_transactions') 
        THEN '✅ wallet_transactions' 
        ELSE '❌ wallet_transactions (CRITICAL)' 
    END
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_receipts') 
        THEN '✅ payment_receipts' 
        ELSE '❌ payment_receipts (CRITICAL)' 
    END;

-- Chat System Tables Check
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_sessions') 
        THEN '✅ chat_sessions' 
        ELSE '❌ chat_sessions (CRITICAL)' 
    END as chat_tables
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') 
        THEN '✅ chat_messages' 
        ELSE '❌ chat_messages (CRITICAL)' 
    END
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'voice_notes') 
        THEN '✅ voice_notes' 
        ELSE '❌ voice_notes (CRITICAL)' 
    END;

-- Analytics Tables Check
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_analytics') 
        THEN '✅ daily_analytics' 
        ELSE '❌ daily_analytics (CRITICAL)' 
    END as analytics_tables
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reader_analytics') 
        THEN '✅ reader_analytics' 
        ELSE '❌ reader_analytics (CRITICAL)' 
    END
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_activity_logs') 
        THEN '✅ user_activity_logs' 
        ELSE '❌ user_activity_logs (CRITICAL)' 
    END;

-- AI System Tables Check
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_learning_data') 
        THEN '✅ ai_learning_data' 
        ELSE '❌ ai_learning_data' 
    END as ai_tables
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_reading_results') 
        THEN '✅ ai_reading_results' 
        ELSE '❌ ai_reading_results' 
    END;

-- Reader Application Tables Check
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reader_applications') 
        THEN '✅ reader_applications' 
        ELSE '❌ reader_applications (CRITICAL)' 
    END as application_tables;

-- Tarot System Tables Check
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tarot_decks') 
        THEN '✅ tarot_decks' 
        ELSE '❌ tarot_decks' 
    END as tarot_tables
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tarot_spreads') 
        THEN '✅ tarot_spreads' 
        ELSE '❌ tarot_spreads' 
    END;

-- Call System Tables Check
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_sessions') 
        THEN '✅ call_sessions' 
        ELSE '❌ call_sessions' 
    END as call_tables
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_recordings') 
        THEN '✅ call_recordings' 
        ELSE '❌ call_recordings' 
    END
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'emergency_call_logs') 
        THEN '✅ emergency_call_logs' 
        ELSE '❌ emergency_call_logs' 
    END;

-- Working Hours System Check
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reader_schedule') 
        THEN '✅ reader_schedule' 
        ELSE '❌ reader_schedule' 
    END as schedule_tables
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'working_hours_requests') 
        THEN '✅ working_hours_requests' 
        ELSE '❌ working_hours_requests' 
    END;

-- System Configuration Check
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_settings') 
        THEN '✅ system_settings' 
        ELSE '❌ system_settings' 
    END as config_tables
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_config') 
        THEN '✅ app_config' 
        ELSE '❌ app_config' 
    END;

-- ============================================================
-- MISSING TABLES SUMMARY
-- ============================================================

WITH required_tables AS (
    SELECT unnest(ARRAY[
        'profiles', 'bookings', 'services', 'notifications',
        'payment_methods', 'wallet_transactions', 'payment_receipts',
        'chat_sessions', 'chat_messages', 'voice_notes',
        'daily_analytics', 'reader_analytics', 'user_activity_logs',
        'ai_learning_data', 'ai_reading_results', 'reader_applications',
        'tarot_decks', 'tarot_spreads', 'call_sessions', 
        'call_recordings', 'emergency_call_logs', 'reader_schedule',
        'working_hours_requests', 'system_settings', 'app_config'
    ]) AS table_name
),
existing_tables AS (
    SELECT table_name
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
),
missing_tables AS (
    SELECT r.table_name
    FROM required_tables r
    LEFT JOIN existing_tables e ON r.table_name = e.table_name
    WHERE e.table_name IS NULL
)
SELECT 
    '🚨 MISSING CRITICAL TABLES' as status,
    COUNT(*) as missing_count,
    string_agg(table_name, ', ') as missing_tables
FROM missing_tables;

-- ============================================================
-- COMPLETION PERCENTAGE
-- ============================================================

WITH required_tables AS (
    SELECT unnest(ARRAY[
        'profiles', 'bookings', 'services', 'notifications',
        'payment_methods', 'wallet_transactions', 'payment_receipts',
        'chat_sessions', 'chat_messages', 'voice_notes',
        'daily_analytics', 'reader_analytics', 'user_activity_logs',
        'ai_learning_data', 'ai_reading_results', 'reader_applications',
        'tarot_decks', 'tarot_spreads', 'call_sessions', 
        'call_recordings', 'emergency_call_logs', 'reader_schedule',
        'working_hours_requests', 'system_settings', 'app_config'
    ]) AS table_name
),
existing_tables AS (
    SELECT table_name
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
),
table_status AS (
    SELECT 
        r.table_name,
        CASE WHEN e.table_name IS NOT NULL THEN 1 ELSE 0 END as exists
    FROM required_tables r
    LEFT JOIN existing_tables e ON r.table_name = e.table_name
)
SELECT 
    '📊 DATABASE COMPLETION STATUS' as metric,
    ROUND((SUM(exists)::numeric / COUNT(*)) * 100, 1) || '%' as completion_percentage,
    SUM(exists) || '/' || COUNT(*) as tables_ratio
FROM table_status;

-- ============================================================
-- RECOMMENDATIONS
-- ============================================================

SELECT 
    '💡 NEXT STEPS' as recommendations,
    CASE 
        WHEN (
            SELECT COUNT(*) 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            AND table_name IN ('payment_methods', 'wallet_transactions', 'chat_sessions', 'chat_messages')
        ) < 4 
        THEN '🔴 CRITICAL: Execute COMPLETE_DATABASE_SETUP.sql immediately'
        ELSE '🟢 GOOD: Most critical tables exist, check specific missing ones'
    END as action_required; 