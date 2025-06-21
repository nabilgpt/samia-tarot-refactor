-- =====================================================
-- SAMIA TAROT - BULLETPROOF ADVANCED ADMIN SETUP
-- =====================================================
-- This script fixes the "column table_name does not exist" error
-- by ensuring proper table creation order and transaction handling

-- Start with a clean transaction
BEGIN;

DO $$
BEGIN
    RAISE NOTICE '🚀 Starting Bulletproof Advanced Admin Setup...';
    RAISE NOTICE 'Checking database connection...';
END $$;

-- =====================================================
-- STEP 1: DROP EXISTING PROBLEMATIC INDEXES
-- =====================================================

DO $$
BEGIN
    -- Drop any existing problematic indexes first
    DROP INDEX IF EXISTS idx_admin_audit_logs_table_name;
    DROP INDEX IF EXISTS idx_admin_audit_logs_admin_id;
    DROP INDEX IF EXISTS idx_admin_audit_logs_created_at;
    
    RAISE NOTICE '🧹 Cleaned up existing indexes';
END $$;

-- =====================================================
-- STEP 2: CREATE TABLES FIRST (NO INDEXES YET)
-- =====================================================

-- Admin audit logs (with explicit column definition)
DROP TABLE IF EXISTS admin_audit_logs CASCADE;
CREATE TABLE admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID,
    action_type VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,  -- Explicitly ensure this column exists
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verify the table was created with the column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_audit_logs' 
        AND column_name = 'table_name'
    ) THEN
        RAISE EXCEPTION 'FATAL: admin_audit_logs table was not created with table_name column';
    END IF;
    
    RAISE NOTICE '✅ admin_audit_logs table created with table_name column';
END $$;

-- Admin search history
DROP TABLE IF EXISTS admin_search_history CASCADE;
CREATE TABLE admin_search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID,
    search_query TEXT NOT NULL,
    search_type VARCHAR(50) NOT NULL,
    results_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin activity feed
DROP TABLE IF EXISTS admin_activity_feed CASCADE;
CREATE TABLE admin_activity_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID,
    activity_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin notification rules
DROP TABLE IF EXISTS admin_notification_rules CASCADE;
CREATE TABLE admin_notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID,
    rule_name VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    conditions JSONB DEFAULT '{}',
    actions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permissions table
DROP TABLE IF EXISTS permissions CASCADE;
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Roles table
DROP TABLE IF EXISTS roles CASCADE;
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User roles table
DROP TABLE IF EXISTS user_roles CASCADE;
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    role_id UUID,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

DO $$
BEGIN
    RAISE NOTICE '✅ All tables created successfully';
END $$;

-- =====================================================
-- STEP 3: VERIFY ALL TABLES EXIST BEFORE CREATING INDEXES
-- =====================================================

DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check each table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_audit_logs') THEN
        missing_tables := array_append(missing_tables, 'admin_audit_logs');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_search_history') THEN
        missing_tables := array_append(missing_tables, 'admin_search_history');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_activity_feed') THEN
        missing_tables := array_append(missing_tables, 'admin_activity_feed');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_notification_rules') THEN
        missing_tables := array_append(missing_tables, 'admin_notification_rules');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') THEN
        missing_tables := array_append(missing_tables, 'permissions');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
        missing_tables := array_append(missing_tables, 'roles');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        missing_tables := array_append(missing_tables, 'user_roles');
    END IF;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'FATAL: Missing tables: %', array_to_string(missing_tables, ', ');
    END IF;
    
    RAISE NOTICE '✅ All required tables verified to exist';
END $$;

-- =====================================================
-- STEP 4: CREATE INDEXES (AFTER TABLES ARE CONFIRMED)
-- =====================================================

DO $$
BEGIN
    -- Verify table_name column exists before creating index
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_audit_logs' 
        AND column_name = 'table_name'
    ) THEN
        CREATE INDEX idx_admin_audit_logs_table_name ON admin_audit_logs(table_name);
        RAISE NOTICE '✅ Created index on admin_audit_logs.table_name';
    ELSE
        RAISE EXCEPTION 'FATAL: table_name column does not exist in admin_audit_logs';
    END IF;
    
    -- Create other admin_audit_logs indexes
    CREATE INDEX idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
    CREATE INDEX idx_admin_audit_logs_created_at ON admin_audit_logs(created_at);
    
    -- Create indexes for other tables
    CREATE INDEX idx_admin_search_history_admin_id ON admin_search_history(admin_id);
    CREATE INDEX idx_admin_activity_feed_admin_id ON admin_activity_feed(admin_id);
    CREATE INDEX idx_admin_notification_rules_admin_id ON admin_notification_rules(admin_id);
    CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
    CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
    
    RAISE NOTICE '✅ All indexes created successfully';
END $$;

-- =====================================================
-- STEP 5: ADD SOFT DELETE TO EXISTING TABLES (SAFELY)
-- =====================================================

DO $$
BEGIN
    -- Only modify existing tables if they exist
    
    -- Profiles table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'deleted_at') THEN
            ALTER TABLE profiles ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
            ALTER TABLE profiles ADD COLUMN deleted_by UUID;
            CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at) WHERE deleted_at IS NULL;
            RAISE NOTICE '✅ Added soft delete to profiles table';
        ELSE
            RAISE NOTICE '⚠️ Profiles table already has soft delete columns';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ Profiles table does not exist - skipping soft delete';
    END IF;

    -- Bookings table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'deleted_at') THEN
            ALTER TABLE bookings ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
            ALTER TABLE bookings ADD COLUMN deleted_by UUID;
            CREATE INDEX IF NOT EXISTS idx_bookings_deleted_at ON bookings(deleted_at) WHERE deleted_at IS NULL;
            RAISE NOTICE '✅ Added soft delete to bookings table';
        ELSE
            RAISE NOTICE '⚠️ Bookings table already has soft delete columns';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ Bookings table does not exist - skipping soft delete';
    END IF;

    -- Payments table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'deleted_at') THEN
            ALTER TABLE payments ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
            ALTER TABLE payments ADD COLUMN deleted_by UUID;
            CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON payments(deleted_at) WHERE deleted_at IS NULL;
            RAISE NOTICE '✅ Added soft delete to payments table';
        ELSE
            RAISE NOTICE '⚠️ Payments table already has soft delete columns';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ Payments table does not exist - skipping soft delete';
    END IF;

    -- Reviews table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'deleted_at') THEN
            ALTER TABLE reviews ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
            ALTER TABLE reviews ADD COLUMN deleted_by UUID;
            CREATE INDEX IF NOT EXISTS idx_reviews_deleted_at ON reviews(deleted_at) WHERE deleted_at IS NULL;
            RAISE NOTICE '✅ Added soft delete to reviews table';
        ELSE
            RAISE NOTICE '⚠️ Reviews table already has soft delete columns';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ Reviews table does not exist - skipping soft delete';
    END IF;

    RAISE NOTICE '✅ Soft delete processing completed';
END $$;

-- =====================================================
-- STEP 6: INSERT DEFAULT DATA
-- =====================================================

DO $$
BEGIN
    -- Insert default roles
    INSERT INTO roles (name, description, is_default) VALUES 
    ('super_admin', 'Super Administrator with full access', false),
    ('admin', 'Administrator with limited access', false),
    ('moderator', 'Moderator with content management access', false),
    ('client', 'Regular client user', true),
    ('reader', 'Tarot reader', false)
    ON CONFLICT (name) DO NOTHING;

    -- Insert basic permissions
    INSERT INTO permissions (name, description, resource, action) VALUES 
    ('users.read', 'View users', 'users', 'read'),
    ('users.write', 'Manage users', 'users', 'write'),
    ('bookings.read', 'View bookings', 'bookings', 'read'),
    ('bookings.write', 'Manage bookings', 'bookings', 'write'),
    ('payments.read', 'View payments', 'payments', 'read'),
    ('payments.write', 'Manage payments', 'payments', 'write'),
    ('reviews.read', 'View reviews', 'reviews', 'read'),
    ('reviews.write', 'Manage reviews', 'reviews', 'write'),
    ('admin.access', 'Access admin panel', 'admin', 'access')
    ON CONFLICT (name) DO NOTHING;

    RAISE NOTICE '✅ Default roles and permissions inserted';
END $$;

-- Commit the transaction
COMMIT;

-- =====================================================
-- FINAL VERIFICATION AND SUCCESS MESSAGE
-- =====================================================

DO $$
DECLARE
    table_count INTEGER;
    index_count INTEGER;
BEGIN
    -- Count created tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_name IN (
        'admin_audit_logs', 'admin_search_history', 'admin_activity_feed',
        'admin_notification_rules', 'permissions', 'roles', 'user_roles'
    );
    
    -- Count created indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE indexname LIKE 'idx_admin%' OR indexname LIKE 'idx_user_roles%';
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 BULLETPROOF ADVANCED ADMIN SETUP COMPLETED!';
    RAISE NOTICE '✅ Tables created: %', table_count;
    RAISE NOTICE '✅ Indexes created: %', index_count;
    RAISE NOTICE '✅ Fixed: table_name column reference errors';
    RAISE NOTICE '✅ Added: Soft delete functionality to existing tables';
    RAISE NOTICE '✅ Inserted: Default roles and permissions';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables available:';
    RAISE NOTICE '- admin_audit_logs (with table_name column confirmed)';
    RAISE NOTICE '- admin_search_history';
    RAISE NOTICE '- admin_activity_feed';
    RAISE NOTICE '- admin_notification_rules';
    RAISE NOTICE '- permissions';
    RAISE NOTICE '- roles';
    RAISE NOTICE '- user_roles';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 All table_name column references are now working!';
END $$; 