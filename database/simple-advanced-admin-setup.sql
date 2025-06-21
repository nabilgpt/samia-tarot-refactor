-- =====================================================
-- SAMIA TAROT - SIMPLE ADVANCED ADMIN SETUP
-- =====================================================
-- This script creates advanced admin tables step by step
-- without complex dependencies that cause errors

-- =====================================================
-- STEP 1: BASIC ADMIN TABLES
-- =====================================================

-- Admin audit logs (simplified)
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID,
    action_type VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin search history
CREATE TABLE IF NOT EXISTS admin_search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID,
    search_query TEXT NOT NULL,
    search_type VARCHAR(50) NOT NULL,
    results_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin activity feed
CREATE TABLE IF NOT EXISTS admin_activity_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID,
    activity_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin notification rules
CREATE TABLE IF NOT EXISTS admin_notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID,
    rule_name VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    conditions JSONB DEFAULT '{}',
    actions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 2: RBAC TABLES
-- =====================================================

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User roles (simplified)
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    role_id UUID,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

-- =====================================================
-- STEP 3: ADD BASIC INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_table_name ON admin_audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_admin_search_history_admin_id ON admin_search_history(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_feed_admin_id ON admin_activity_feed(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_notification_rules_admin_id ON admin_notification_rules(admin_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- =====================================================
-- STEP 4: ADD SOFT DELETE TO EXISTING TABLES
-- =====================================================

DO $$
BEGIN
    -- Add soft delete to profiles table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        -- Check if columns don't already exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'deleted_at') THEN
            ALTER TABLE profiles ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
            ALTER TABLE profiles ADD COLUMN deleted_by UUID;
            CREATE INDEX idx_profiles_deleted_at ON profiles(deleted_at) WHERE deleted_at IS NULL;
            RAISE NOTICE 'Added soft delete to profiles table';
        ELSE
            RAISE NOTICE 'Profiles table already has soft delete columns';
        END IF;
    ELSE
        RAISE NOTICE 'Profiles table does not exist';
    END IF;

    -- Add soft delete to bookings table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'deleted_at') THEN
            ALTER TABLE bookings ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
            ALTER TABLE bookings ADD COLUMN deleted_by UUID;
            CREATE INDEX idx_bookings_deleted_at ON bookings(deleted_at) WHERE deleted_at IS NULL;
            RAISE NOTICE 'Added soft delete to bookings table';
        ELSE
            RAISE NOTICE 'Bookings table already has soft delete columns';
        END IF;
    ELSE
        RAISE NOTICE 'Bookings table does not exist';
    END IF;

    -- Add soft delete to payments table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'deleted_at') THEN
            ALTER TABLE payments ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
            ALTER TABLE payments ADD COLUMN deleted_by UUID;
            CREATE INDEX idx_payments_deleted_at ON payments(deleted_at) WHERE deleted_at IS NULL;
            RAISE NOTICE 'Added soft delete to payments table';
        ELSE
            RAISE NOTICE 'Payments table already has soft delete columns';
        END IF;
    ELSE
        RAISE NOTICE 'Payments table does not exist';
    END IF;

    -- Add soft delete to reviews table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'deleted_at') THEN
            ALTER TABLE reviews ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
            ALTER TABLE reviews ADD COLUMN deleted_by UUID;
            CREATE INDEX idx_reviews_deleted_at ON reviews(deleted_at) WHERE deleted_at IS NULL;
            RAISE NOTICE 'Added soft delete to reviews table';
        ELSE
            RAISE NOTICE 'Reviews table already has soft delete columns';
        END IF;
    ELSE
        RAISE NOTICE 'Reviews table does not exist';
    END IF;

END $$;

-- =====================================================
-- STEP 5: CREATE BASIC SEARCH INDEXES
-- =====================================================

DO $$
BEGIN
    -- Add search indexes only if tables exist and don't have these indexes already
    
    -- Profiles search index
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        CREATE INDEX IF NOT EXISTS idx_profiles_search ON profiles USING gin(
            to_tsvector('english', 
                coalesce(first_name, '') || ' ' || 
                coalesce(last_name, '') || ' ' || 
                coalesce(bio, '')
            )
        );
        RAISE NOTICE 'Added search index to profiles table';
    END IF;

    -- Bookings search index (using actual columns)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
        CREATE INDEX IF NOT EXISTS idx_bookings_search ON bookings USING gin(
            to_tsvector('english', 
                coalesce(id::text, '') || ' ' || 
                coalesce(status, '') || ' ' ||
                coalesce(notes, '')
            )
        );
        RAISE NOTICE 'Added search index to bookings table';
    END IF;

    -- Reviews search index (using actual columns)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
        CREATE INDEX IF NOT EXISTS idx_reviews_search ON reviews USING gin(
            to_tsvector('english', coalesce(feedback, ''))
        );
        RAISE NOTICE 'Added search index to reviews table';
    END IF;

END $$;

-- =====================================================
-- STEP 6: INSERT DEFAULT ROLES AND PERMISSIONS
-- =====================================================

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

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ SIMPLE ADVANCED ADMIN SETUP COMPLETED SUCCESSFULLY!';
    RAISE NOTICE 'Created basic admin tables and added soft delete functionality.';
    RAISE NOTICE 'Added search indexes and default roles/permissions.';
    RAISE NOTICE 'All tables are now ready for basic admin operations.';
END $$; 