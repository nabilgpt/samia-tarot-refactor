-- ============================================================
-- COMPREHENSIVE TABLE VERIFICATION - SAMIA TAROT PROJECT
-- Complete analysis of current database state
-- ============================================================

-- 1. OVERVIEW: Total table count
SELECT '📊 DATABASE OVERVIEW' as section;
SELECT 
    COUNT(*) as total_tables,
    'Tables found in public schema' as description
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- 2. LIST ALL EXISTING TABLES
SELECT '📋 ALL EXISTING TABLES' as section;
SELECT 
    ROW_NUMBER() OVER (ORDER BY table_name) as "#",
    table_name,
    '✅' as status
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 3. CORE SYSTEM TABLES CHECK
SELECT '🏗️ CORE SYSTEM TABLES' as section;
WITH core_tables AS (
    SELECT unnest(ARRAY[
        'profiles', 'services', 'bookings', 'payments', 
        'notifications', 'reviews', 'wallets', 'transactions'
    ]) AS table_name
)
SELECT 
    c.table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = c.table_name) 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status,
    CASE 
        WHEN c.table_name = 'profiles' THEN 'User management & authentication'
        WHEN c.table_name = 'services' THEN 'Available tarot services'
        WHEN c.table_name = 'bookings' THEN 'Appointment booking system'
        WHEN c.table_name = 'payments' THEN 'Payment processing'
        WHEN c.table_name = 'notifications' THEN 'System notifications'
        WHEN c.table_name = 'reviews' THEN 'User reviews & ratings'
        WHEN c.table_name = 'wallets' THEN 'In-app wallet system'
        WHEN c.table_name = 'transactions' THEN 'Transaction logs'
    END as purpose
FROM core_tables c
ORDER BY c.table_name;

-- 4. PAYMENT SYSTEM TABLES CHECK
SELECT '💳 PAYMENT SYSTEM TABLES' as section;
WITH payment_tables AS (
    SELECT unnest(ARRAY[
        'payment_methods', 'wallet_transactions', 'payment_receipts',
        'payment_gateway_configs', 'platform_commissions', 'reader_earnings'
    ]) AS table_name
)
SELECT 
    p.table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = p.table_name) 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status,
    CASE 
        WHEN p.table_name = 'payment_methods' THEN 'Stored payment methods'
        WHEN p.table_name = 'wallet_transactions' THEN 'Wallet operations'
        WHEN p.table_name = 'payment_receipts' THEN 'Receipt management'
        WHEN p.table_name = 'payment_gateway_configs' THEN 'Payment gateway setup'
        WHEN p.table_name = 'platform_commissions' THEN 'Commission tracking'
        WHEN p.table_name = 'reader_earnings' THEN 'Reader earnings'
    END as purpose
FROM payment_tables p
ORDER BY p.table_name;

-- 5. CHAT SYSTEM TABLES CHECK (Now Fixed!)
SELECT '💬 CHAT SYSTEM TABLES' as section;
WITH chat_tables AS (
    SELECT unnest(ARRAY[
        'chat_sessions', 'chat_messages', 'voice_notes',
        'chat_participants', 'message_reactions'
    ]) AS table_name
)
SELECT 
    c.table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = c.table_name) 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status,
    CASE 
        WHEN c.table_name = 'chat_sessions' THEN 'Chat session management'
        WHEN c.table_name = 'chat_messages' THEN 'Message storage (FIXED!)'
        WHEN c.table_name = 'voice_notes' THEN 'Voice message support'
        WHEN c.table_name = 'chat_participants' THEN 'Chat participants'
        WHEN c.table_name = 'message_reactions' THEN 'Message reactions'
    END as purpose
FROM chat_tables c
ORDER BY c.table_name;

-- 6. ANALYTICS TABLES CHECK
SELECT '📈 ANALYTICS TABLES' as section;
WITH analytics_tables AS (
    SELECT unnest(ARRAY[
        'daily_analytics', 'reader_analytics', 'user_activity_logs',
        'business_analytics', 'revenue_analytics'
    ]) AS table_name
)
SELECT 
    a.table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = a.table_name) 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status,
    CASE 
        WHEN a.table_name = 'daily_analytics' THEN 'Daily system metrics'
        WHEN a.table_name = 'reader_analytics' THEN 'Reader performance'
        WHEN a.table_name = 'user_activity_logs' THEN 'User behavior tracking'
        WHEN a.table_name = 'business_analytics' THEN 'Business intelligence'
        WHEN a.table_name = 'revenue_analytics' THEN 'Revenue tracking'
    END as purpose
FROM analytics_tables a
ORDER BY a.table_name;

-- 7. ADMIN SYSTEM TABLES CHECK
SELECT '👨‍💼 ADMIN SYSTEM TABLES' as section;
WITH admin_tables AS (
    SELECT unnest(ARRAY[
        'reader_applications', 'approval_requests', 'admin_actions',
        'audit_logs', 'user_feedback'
    ]) AS table_name
)
SELECT 
    a.table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = a.table_name) 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status,
    CASE 
        WHEN a.table_name = 'reader_applications' THEN 'Reader approval workflow'
        WHEN a.table_name = 'approval_requests' THEN 'General approval system'
        WHEN a.table_name = 'admin_actions' THEN 'Admin action logging'
        WHEN a.table_name = 'audit_logs' THEN 'System audit trail'
        WHEN a.table_name = 'user_feedback' THEN 'User feedback collection'
    END as purpose
FROM admin_tables a
ORDER BY a.table_name;

-- 8. AI SYSTEM TABLES CHECK
SELECT '🤖 AI SYSTEM TABLES' as section;
WITH ai_tables AS (
    SELECT unnest(ARRAY[
        'ai_learning_data', 'ai_reading_results', 'ai_models',
        'ai_prompts', 'ai_sessions'
    ]) AS table_name
)
SELECT 
    a.table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = a.table_name) 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status,
    CASE 
        WHEN a.table_name = 'ai_learning_data' THEN 'AI training data'
        WHEN a.table_name = 'ai_reading_results' THEN 'AI reading outputs'
        WHEN a.table_name = 'ai_models' THEN 'AI model management'
        WHEN a.table_name = 'ai_prompts' THEN 'AI prompt templates'
        WHEN a.table_name = 'ai_sessions' THEN 'AI interaction tracking'
    END as purpose
FROM ai_tables a
ORDER BY a.table_name;

-- 9. TAROT SYSTEM TABLES CHECK
SELECT '🔮 TAROT SYSTEM TABLES' as section;
WITH tarot_tables AS (
    SELECT unnest(ARRAY[
        'tarot_decks', 'tarot_spreads', 'tarot_spread_positions',
        'reader_spreads', 'client_tarot_sessions'
    ]) AS table_name
)
SELECT 
    t.table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t.table_name) 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status,
    CASE 
        WHEN t.table_name = 'tarot_decks' THEN 'Tarot deck management'
        WHEN t.table_name = 'tarot_spreads' THEN 'Tarot spread definitions'
        WHEN t.table_name = 'tarot_spread_positions' THEN 'Spread positions'
        WHEN t.table_name = 'reader_spreads' THEN 'Reader-specific spreads'
        WHEN t.table_name = 'client_tarot_sessions' THEN 'Client reading sessions'
    END as purpose
FROM tarot_tables t
ORDER BY t.table_name;

-- 10. CALL/VIDEO SYSTEM TABLES CHECK
SELECT '📞 CALL/VIDEO SYSTEM TABLES' as section;
WITH call_tables AS (
    SELECT unnest(ARRAY[
        'call_sessions', 'call_recordings', 'emergency_call_logs',
        'call_participants', 'reader_availability'
    ]) AS table_name
)
SELECT 
    c.table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = c.table_name) 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status,
    CASE 
        WHEN c.table_name = 'call_sessions' THEN 'Video/voice call management'
        WHEN c.table_name = 'call_recordings' THEN 'Call recording storage'
        WHEN c.table_name = 'emergency_call_logs' THEN 'Emergency call tracking'
        WHEN c.table_name = 'call_participants' THEN 'Call participant management'
        WHEN c.table_name = 'reader_availability' THEN 'Reader availability status'
    END as purpose
FROM call_tables c
ORDER BY c.table_name;

-- 11. OVERALL COMPLETION ANALYSIS
SELECT '📊 COMPLETION ANALYSIS' as section;
WITH all_critical_tables AS (
    SELECT unnest(ARRAY[
        -- Core (8 tables)
        'profiles', 'services', 'bookings', 'payments', 
        'notifications', 'reviews', 'wallets', 'transactions',
        -- Payment (6 tables)  
        'payment_methods', 'wallet_transactions', 'payment_receipts',
        'payment_gateway_configs', 'platform_commissions', 'reader_earnings',
        -- Chat (5 tables)
        'chat_sessions', 'chat_messages', 'voice_notes',
        'chat_participants', 'message_reactions',
        -- Analytics (5 tables)
        'daily_analytics', 'reader_analytics', 'user_activity_logs',
        'business_analytics', 'revenue_analytics',
        -- Admin (5 tables)
        'reader_applications', 'approval_requests', 'admin_actions',
        'audit_logs', 'user_feedback',
        -- AI (5 tables)
        'ai_learning_data', 'ai_reading_results', 'ai_models',
        'ai_prompts', 'ai_sessions',
        -- Tarot (5 tables)
        'tarot_decks', 'tarot_spreads', 'tarot_spread_positions',
        'reader_spreads', 'client_tarot_sessions',
        -- Call (5 tables)
        'call_sessions', 'call_recordings', 'emergency_call_logs',
        'call_participants', 'reader_availability'
    ]) AS table_name
),
existing_tables AS (
    SELECT table_name
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
),
completion_stats AS (
    SELECT 
        COUNT(*) as total_required,
        COUNT(e.table_name) as existing_count,
        COUNT(*) - COUNT(e.table_name) as missing_count,
        ROUND((COUNT(e.table_name)::numeric / COUNT(*)) * 100, 1) as completion_percentage
    FROM all_critical_tables a
    LEFT JOIN existing_tables e ON a.table_name = e.table_name
)
SELECT 
    total_required || ' total critical tables required' as metric_1,
    existing_count || ' tables currently exist' as metric_2,
    missing_count || ' tables still missing' as metric_3,
    completion_percentage || '% completion rate' as metric_4,
    CASE 
        WHEN completion_percentage >= 90 THEN '🟢 EXCELLENT - Almost complete!'
        WHEN completion_percentage >= 70 THEN '🟡 GOOD - Majority complete'
        WHEN completion_percentage >= 50 THEN '🟠 FAIR - Halfway there'
        ELSE '🔴 NEEDS WORK - Major gaps'
    END as status_assessment
FROM completion_stats;

-- 12. MISSING TABLES PRIORITY LIST
SELECT '🚨 MISSING TABLES (PRIORITY ORDER)' as section;
WITH all_required_tables AS (
    SELECT table_name, priority, category FROM (VALUES
        -- CRITICAL (Priority 1)
        ('payment_methods', 1, 'Payment'),
        ('wallet_transactions', 1, 'Payment'),
        ('daily_analytics', 1, 'Analytics'),
        ('reader_analytics', 1, 'Analytics'),
        ('reader_applications', 1, 'Admin'),
        -- HIGH (Priority 2)
        ('voice_notes', 2, 'Chat'),
        ('user_activity_logs', 2, 'Analytics'),
        ('ai_learning_data', 2, 'AI'),
        ('ai_reading_results', 2, 'AI'),
        -- MEDIUM (Priority 3)
        ('tarot_decks', 3, 'Tarot'),
        ('tarot_spreads', 3, 'Tarot'),
        ('call_sessions', 3, 'Calls'),
        ('call_recordings', 3, 'Calls')
    ) AS t(table_name, priority, category)
),
existing_tables AS (
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
)
SELECT 
    r.priority,
    r.category,
    r.table_name,
    '❌ MISSING' as status,
    CASE 
        WHEN r.priority = 1 THEN 'CRITICAL - Blocks core functionality'
        WHEN r.priority = 2 THEN 'HIGH - Important features'
        WHEN r.priority = 3 THEN 'MEDIUM - Advanced features'
    END as impact
FROM all_required_tables r
LEFT JOIN existing_tables e ON r.table_name = e.table_name
WHERE e.table_name IS NULL
ORDER BY r.priority, r.category, r.table_name;

-- 13. NEXT ACTIONS RECOMMENDATIONS
SELECT '📋 RECOMMENDED NEXT ACTIONS' as section;
SELECT 
    ROW_NUMBER() OVER () as step,
    action,
    priority,
    estimated_time
FROM (VALUES
    ('Execute COMPLETE_DATABASE_SETUP.sql for critical missing tables', 'CRITICAL', '30 minutes'),
    ('Test chat functionality after session_id fix', 'HIGH', '15 minutes'),
    ('Run payment system tests', 'HIGH', '20 minutes'),
    ('Create analytics tables for admin dashboard', 'HIGH', '20 minutes'),
    ('Set up reader application workflow', 'MEDIUM', '30 minutes'),
    ('Add AI system tables for future features', 'LOW', '15 minutes'),
    ('Complete tarot system tables', 'LOW', '25 minutes')
) AS actions(action, priority, estimated_time)
ORDER BY 
    CASE 
        WHEN priority = 'CRITICAL' THEN 1
        WHEN priority = 'HIGH' THEN 2
        WHEN priority = 'MEDIUM' THEN 3
        ELSE 4
    END; 