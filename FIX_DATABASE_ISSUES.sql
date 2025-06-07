-- ============================================================
-- FIX DATABASE ISSUES - Complete the SAMIA TAROT Database
-- ============================================================

-- 1. CREATE MISSING ADMIN_USERS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    permissions JSONB DEFAULT '{}',
    assigned_by UUID REFERENCES auth.users(id),
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS to admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_users
DROP POLICY IF EXISTS "Super admins can manage admin users" ON admin_users;
CREATE POLICY "Super admins can manage admin users" ON admin_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;
CREATE POLICY "Admins can view admin users" ON admin_users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('super_admin', 'admin')
        )
    );

-- Create index for admin_users
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_status ON admin_users(status);

-- ============================================================
-- 2. IDENTIFY AND CLEAN UP PROBLEM TABLES
-- ============================================================

-- Check for tables that need cleanup (uncomment to see list)
-- SELECT table_name, 'CLEANUP CANDIDATE' as status
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_type = 'BASE TABLE'
-- AND (
--     table_name LIKE '%_test%' OR 
--     table_name LIKE '%_temp%' OR 
--     table_name LIKE '%_backup%' OR 
--     table_name LIKE '%_old%' OR
--     table_name LIKE '%_copy%' OR 
--     table_name LIKE '%tmp%'
-- );

-- ============================================================
-- 3. VERIFY ALL EXPECTED TABLES EXIST
-- ============================================================

DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    current_table TEXT;
    expected_tables TEXT[] := ARRAY[
        'profiles', 'readers', 'bookings', 'chat_sessions', 'chat_messages',
        'payments', 'reviews', 'admin_users', 'emergency_escalations',
        'payment_methods', 'wallet_transactions', 'payment_receipts',
        'voice_notes', 'daily_analytics', 'reader_analytics', 
        'user_activity_logs', 'ai_learning_data', 'ai_reading_results',
        'reader_applications'
    ];
BEGIN
    RAISE NOTICE '🔍 CHECKING ALL EXPECTED TABLES...';
    
    FOREACH current_table IN ARRAY expected_tables
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = current_table
        ) THEN
            missing_tables := array_append(missing_tables, current_table);
            RAISE NOTICE '❌ MISSING: %', current_table;
        ELSE
            RAISE NOTICE '✅ EXISTS: %', current_table;
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '🎉 ALL EXPECTED TABLES EXIST!';
        RAISE NOTICE '✅ Database is complete and ready for production!';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '⚠️ MISSING TABLES: %', array_to_string(missing_tables, ', ');
        RAISE NOTICE '💡 Some tables may need to be created manually.';
    END IF;
END $$;

-- ============================================================
-- 4. FINAL HEALTH CHECK
-- ============================================================

-- Count tables
SELECT 
    '📊 FINAL STATISTICS' as section,
    'Total Tables' as metric,
    COUNT(*)::text as value
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'

UNION ALL

-- Count tables with RLS
SELECT 
    '📊 FINAL STATISTICS' as section,
    'Tables with RLS' as metric,
    COUNT(*)::text as value
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true

UNION ALL

-- Count policies
SELECT 
    '📊 FINAL STATISTICS' as section,
    'Total RLS Policies' as metric,
    COUNT(*)::text as value
FROM pg_policies 
WHERE schemaname = 'public'

UNION ALL

-- Count indexes
SELECT 
    '📊 FINAL STATISTICS' as section,
    'Performance Indexes' as metric,
    COUNT(*)::text as value
FROM pg_indexes 
WHERE schemaname = 'public';

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================

SELECT '🎯 DATABASE SETUP COMPLETED!' as message; 