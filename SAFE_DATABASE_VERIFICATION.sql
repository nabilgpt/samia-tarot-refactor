-- ============================================================
-- SAFE DATABASE VERIFICATION - SAMIA TAROT
-- ============================================================
-- This version safely checks database without assuming column names

-- ============================================================
-- 1. LIST ALL EXISTING TABLES
-- ============================================================
SELECT 
    'TABLE_INVENTORY' AS check_type,
    table_name,
    table_type,
    'EXISTS' AS status
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================================
-- 2. CHECK CORE REQUIRED TABLES (SAFE VERSION)
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
        WHEN et.table_name IS NOT NULL THEN 'EXISTS ✅'
        ELSE 'MISSING ❌'
    END AS status
FROM required_tables rt
LEFT JOIN existing_tables et ON rt.table_name = et.table_name
ORDER BY rt.table_name;

-- ============================================================
-- 3. SAFE TABLE RECORD COUNTS
-- ============================================================
SELECT 
    'RECORD_COUNTS' AS check_type,
    t.table_name,
    CASE 
        WHEN t.table_name = 'profiles' THEN (SELECT COUNT(*)::TEXT FROM profiles)
        WHEN t.table_name = 'bookings' THEN (SELECT COUNT(*)::TEXT FROM bookings)
        WHEN t.table_name = 'services' THEN (SELECT COUNT(*)::TEXT FROM services)
        WHEN t.table_name = 'payments' THEN (SELECT COUNT(*)::TEXT FROM payments)
        WHEN t.table_name = 'reviews' THEN (SELECT COUNT(*)::TEXT FROM reviews)
        WHEN t.table_name = 'notifications' THEN (SELECT COUNT(*)::TEXT FROM notifications)
        ELSE 'N/A (Table may not exist)'
    END AS record_count
FROM (
    SELECT unnest(ARRAY['profiles', 'bookings', 'services', 'payments', 'reviews', 'notifications']) AS table_name
) t;

-- ============================================================
-- 4. CHECK TABLE COLUMNS STRUCTURE
-- ============================================================
SELECT 
    'COLUMN_STRUCTURE' AS check_type,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
    AND table_name IN ('profiles', 'bookings', 'services', 'payments')
ORDER BY table_name, ordinal_position;

-- ============================================================
-- 5. CHECK RLS STATUS (SAFE)
-- ============================================================
SELECT 
    'RLS_STATUS' AS check_type,
    tablename,
    CASE WHEN rowsecurity THEN 'RLS ENABLED ✅' ELSE 'RLS DISABLED ❌' END AS status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================
-- 6. COUNT POLICIES (SAFE)
-- ============================================================
SELECT 
    'POLICY_COUNT' AS check_type,
    tablename,
    COUNT(*) AS policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================================
-- 7. DATABASE SUMMARY (SAFE)
-- ============================================================
SELECT 
    'DATABASE_SUMMARY' AS check_type,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS total_tables,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true) AS tables_with_rls,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') AS total_policies,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') AS total_indexes;

-- ============================================================
-- 8. CREATE ONLY MISSING CRITICAL TABLES (SAFE)
-- ============================================================

-- Check if admin_users exists, create if not
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_users' AND table_schema = 'public') THEN
        CREATE TABLE admin_users (
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
        
        -- Enable RLS
        ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
        
        -- Create policy
        CREATE POLICY "Admin users can view admin_users" ON admin_users
            FOR SELECT USING (
                auth.role() = 'authenticated' AND 
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.role IN ('admin', 'super_admin')
                )
            );
        
        -- Create index
        CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);
        
        RAISE NOTICE 'Created admin_users table ✅';
    ELSE
        RAISE NOTICE 'admin_users table already exists ✅';
    END IF;
END $$;

-- Check if emergency_escalations exists, create if not
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'emergency_escalations' AND table_schema = 'public') THEN
        CREATE TABLE emergency_escalations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            booking_id UUID,  -- Made optional in case bookings table has different structure
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- Use generic user_id instead of client_id
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
        
        -- Enable RLS
        ALTER TABLE emergency_escalations ENABLE ROW LEVEL SECURITY;
        
        -- Create policy
        CREATE POLICY "Users can view their escalations" ON emergency_escalations
            FOR SELECT USING (
                auth.uid() = user_id OR 
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.role IN ('admin', 'super_admin')
                )
            );
        
        -- Create indexes
        CREATE INDEX idx_emergency_escalations_user_id ON emergency_escalations(user_id);
        CREATE INDEX idx_emergency_escalations_status ON emergency_escalations(status);
        
        RAISE NOTICE 'Created emergency_escalations table ✅';
    ELSE
        RAISE NOTICE 'emergency_escalations table already exists ✅';
    END IF;
END $$;

-- ============================================================
-- 9. FINAL STATUS CHECK
-- ============================================================
SELECT 
    'VERIFICATION_COMPLETE' AS check_type,
    'Safe database verification completed successfully!' AS message,
    NOW() AS completed_at; 