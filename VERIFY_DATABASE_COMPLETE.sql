-- ============================================================
-- SAMIA TAROT - COMPREHENSIVE DATABASE VERIFICATION
-- ============================================================
-- Run this script in your Supabase SQL Editor to verify database status
-- The user can run this independently to check everything

-- ============================================================
-- 1. LIST ALL EXISTING TABLES
-- ============================================================
SELECT 
    'TABLE_INVENTORY' AS check_type,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================================
-- 2. CHECK CORE REQUIRED TABLES
-- ============================================================
WITH required_tables AS (
    SELECT unnest(ARRAY[
        'profiles', 'services', 'bookings', 'payments', 'reviews', 'notifications',
        'chat_sessions', 'chat_messages', 'voice_notes',
        'payment_methods', 'wallet_transactions', 'payment_receipts', 
        'daily_analytics', 'reader_analytics', 'user_activity_logs',
        'ai_learning_data', 'ai_reading_results', 'reader_applications',
        'admin_users', 'emergency_escalations'
    ]) AS table_name
),
existing_tables AS (
    SELECT table_name
    FROM information_schema.tables 
    WHERE table_schema = 'public'
)
SELECT 
    'MISSING_TABLES_CHECK' AS check_type,
    rt.table_name,
    CASE 
        WHEN et.table_name IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END AS status
FROM required_tables rt
LEFT JOIN existing_tables et ON rt.table_name = et.table_name
ORDER BY rt.table_name;

-- ============================================================
-- 3. COUNT RECORDS IN EACH TABLE
-- ============================================================
DO $$
DECLARE
    table_record RECORD;
    table_count INTEGER;
    query_text TEXT;
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'TABLE RECORD COUNTS';
    RAISE NOTICE '============================================================';
    
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    LOOP
        BEGIN
            query_text := 'SELECT COUNT(*) FROM ' || quote_ident(table_record.table_name);
            EXECUTE query_text INTO table_count;
            RAISE NOTICE '% has % records', table_record.table_name, table_count;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '% - ERROR: %', table_record.table_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================================
-- 4. CHECK RLS (ROW LEVEL SECURITY) STATUS
-- ============================================================
SELECT 
    'RLS_STATUS' AS check_type,
    schemaname,
    tablename,
    rowsecurity AS rls_enabled,
    CASE WHEN rowsecurity THEN '✅ RLS ON' ELSE '❌ RLS OFF' END AS status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================
-- 5. CHECK RLS POLICIES COUNT
-- ============================================================
SELECT 
    'RLS_POLICIES_COUNT' AS check_type,
    schemaname,
    tablename,
    COUNT(*) AS policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ============================================================
-- 6. CHECK INDEXES COUNT  
-- ============================================================
SELECT 
    'INDEXES_COUNT' AS check_type,
    schemaname,
    tablename,
    COUNT(*) AS index_count
FROM pg_indexes 
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ============================================================
-- 7. FINAL DATABASE SUMMARY
-- ============================================================
WITH table_stats AS (
    SELECT COUNT(*) AS total_tables
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
),
rls_stats AS (
    SELECT COUNT(*) AS tables_with_rls
    FROM pg_tables 
    WHERE schemaname = 'public' AND rowsecurity = true
),
policy_stats AS (
    SELECT COUNT(*) AS total_policies
    FROM pg_policies 
    WHERE schemaname = 'public'
),
index_stats AS (
    SELECT COUNT(*) AS total_indexes
    FROM pg_indexes 
    WHERE schemaname = 'public'
)
SELECT 
    'DATABASE_SUMMARY' AS check_type,
    total_tables,
    tables_with_rls,
    total_policies,
    total_indexes,
    CASE 
        WHEN total_tables >= 19 THEN '✅ SUFFICIENT TABLES'
        ELSE '⚠️ MISSING TABLES'
    END AS table_status,
    CASE 
        WHEN tables_with_rls >= 15 THEN '✅ GOOD RLS COVERAGE'
        ELSE '⚠️ NEED MORE RLS'
    END AS security_status
FROM table_stats, rls_stats, policy_stats, index_stats;

-- ============================================================
-- 8. API COMPATIBILITY CHECK
-- ============================================================
WITH api_required_tables AS (
    SELECT unnest(ARRAY[
        'profiles', 'bookings', 'services', 'payments', 
        'chat_sessions', 'chat_messages'
    ]) AS table_name
),
existing_tables AS (
    SELECT table_name
    FROM information_schema.tables 
    WHERE table_schema = 'public'
)
SELECT 
    'API_COMPATIBILITY' AS check_type,
    COUNT(*) AS required_tables,
    COUNT(et.table_name) AS existing_tables,
    CASE 
        WHEN COUNT(*) = COUNT(et.table_name) THEN '✅ API READY'
        ELSE '❌ API NOT READY'
    END AS api_status
FROM api_required_tables art
LEFT JOIN existing_tables et ON art.table_name = et.table_name;

-- ============================================================
-- 9. EMERGENCY MISSING TABLES CREATION (IF NEEDED)
-- ============================================================
-- Create critical missing tables if they don't exist

-- Admin Users Table (Critical for Admin APIs)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_level VARCHAR(50) DEFAULT 'admin' CHECK (admin_level IN ('admin', 'super_admin', 'monitor')),
    permissions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Emergency Escalations Table (Critical for Emergency System)
CREATE TABLE IF NOT EXISTS emergency_escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    escalation_type VARCHAR(50) DEFAULT 'emergency_call',
    priority_level VARCHAR(20) DEFAULT 'high' CHECK (priority_level IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    description TEXT,
    escalated_to UUID REFERENCES auth.users(id),
    escalated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on critical tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_escalations ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
CREATE POLICY "Admin users can view admin_users" ON admin_users
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Users can view their escalations" ON emergency_escalations
    FOR SELECT USING (
        auth.uid() = client_id OR 
        auth.uid() = reader_id OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_admin_level ON admin_users(admin_level);
CREATE INDEX IF NOT EXISTS idx_emergency_escalations_booking_id ON emergency_escalations(booking_id);
CREATE INDEX IF NOT EXISTS idx_emergency_escalations_status ON emergency_escalations(status);
CREATE INDEX IF NOT EXISTS idx_emergency_escalations_priority ON emergency_escalations(priority_level);

-- ============================================================
-- 10. FINAL STATUS MESSAGE
-- ============================================================
SELECT 
    'VERIFICATION_COMPLETE' AS check_type,
    'Database verification completed. Check results above.' AS message,
    NOW() AS completed_at; 