-- =====================================================
-- SAMIA TAROT - SIMPLE ADVANCED ADMIN SETUP (FIXED)
-- =====================================================
-- This script creates advanced admin tables step by step
-- Fixed: table_name column error and execution order issues

DO $$
BEGIN
    RAISE NOTICE '🚀 Starting Simple Advanced Admin Setup...';
END $$;

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

DO $$
BEGIN
    RAISE NOTICE '✅ Step 1: Created basic admin tables';
END $$;

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

DO $$
BEGIN
    RAISE NOTICE '✅ Step 2: Created RBAC tables';
END $$;

-- =====================================================
-- STEP 3: ADD BASIC INDEXES (AFTER TABLES ARE CREATED)
-- =====================================================

DO $$
BEGIN
    -- Only create indexes if tables exist
    
    -- Admin audit logs indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_audit_logs') THEN
        CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
        CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_table_name ON admin_audit_logs(table_name);
        CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at);
        RAISE NOTICE 'Created indexes for admin_audit_logs';
    END IF;

    -- Other admin table indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_search_history') THEN
        CREATE INDEX IF NOT EXISTS idx_admin_search_history_admin_id ON admin_search_history(admin_id);
        RAISE NOTICE 'Created indexes for admin_search_history';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_activity_feed') THEN
        CREATE INDEX IF NOT EXISTS idx_admin_activity_feed_admin_id ON admin_activity_feed(admin_id);
        RAISE NOTICE 'Created indexes for admin_activity_feed';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_notification_rules') THEN
        CREATE INDEX IF NOT EXISTS idx_admin_notification_rules_admin_id ON admin_notification_rules(admin_id);
        RAISE NOTICE 'Created indexes for admin_notification_rules';
    END IF;

    -- RBAC table indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
        RAISE NOTICE 'Created indexes for user_roles';
    END IF;

    RAISE NOTICE '✅ Step 3: Created all indexes safely';
END $$;

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
            CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at) WHERE deleted_at IS NULL;
            RAISE NOTICE 'Added soft delete to profiles table';
        ELSE
            RAISE NOTICE 'Profiles table already has soft delete columns';
        END IF;
    ELSE
        RAISE NOTICE 'Profiles table does not exist - skipping soft delete';
    END IF;

    -- Add soft delete to bookings table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'deleted_at') THEN
            ALTER TABLE bookings ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
            ALTER TABLE bookings ADD COLUMN deleted_by UUID;
            CREATE INDEX IF NOT EXISTS idx_bookings_deleted_at ON bookings(deleted_at) WHERE deleted_at IS NULL;
            RAISE NOTICE 'Added soft delete to bookings table';
        ELSE
            RAISE NOTICE 'Bookings table already has soft delete columns';
        END IF;
    ELSE
        RAISE NOTICE 'Bookings table does not exist - skipping soft delete';
    END IF;

    -- Add soft delete to payments table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'deleted_at') THEN
            ALTER TABLE payments ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
            ALTER TABLE payments ADD COLUMN deleted_by UUID;
            CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON payments(deleted_at) WHERE deleted_at IS NULL;
            RAISE NOTICE 'Added soft delete to payments table';
        ELSE
            RAISE NOTICE 'Payments table already has soft delete columns';
        END IF;
    ELSE
        RAISE NOTICE 'Payments table does not exist - skipping soft delete';
    END IF;

    -- Add soft delete to reviews table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'deleted_at') THEN
            ALTER TABLE reviews ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
            ALTER TABLE reviews ADD COLUMN deleted_by UUID;
            CREATE INDEX IF NOT EXISTS idx_reviews_deleted_at ON reviews(deleted_at) WHERE deleted_at IS NULL;
            RAISE NOTICE 'Added soft delete to reviews table';
        ELSE
            RAISE NOTICE 'Reviews table already has soft delete columns';
        END IF;
    ELSE
        RAISE NOTICE 'Reviews table does not exist - skipping soft delete';
    END IF;

    RAISE NOTICE '✅ Step 4: Processed soft delete functionality';
END $$;

-- =====================================================
-- STEP 5: CREATE SEARCH INDEXES (SAFELY)
-- =====================================================

DO $$
BEGIN
    -- Add search indexes only if tables exist and have the required columns
    
    -- Profiles search index
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        -- Check if required columns exist
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'first_name') THEN
            CREATE INDEX IF NOT EXISTS idx_profiles_search ON profiles USING gin(
                to_tsvector('english', 
                    coalesce(first_name, '') || ' ' || 
                    coalesce(last_name, '') || ' ' || 
                    coalesce(bio, '')
                )
            );
            RAISE NOTICE 'Added search index to profiles table';
        ELSE
            RAISE NOTICE 'Profiles table missing required columns for search index';
        END IF;
    END IF;

    -- Bookings search index (safe version)
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

    -- Reviews search index (safe version)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
        -- Check if feedback column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'feedback') THEN
            CREATE INDEX IF NOT EXISTS idx_reviews_search ON reviews USING gin(
                to_tsvector('english', coalesce(feedback, ''))
            );
            RAISE NOTICE 'Added search index to reviews table';
        ELSE
            RAISE NOTICE 'Reviews table missing feedback column for search index';
        END IF;
    END IF;

    RAISE NOTICE '✅ Step 5: Processed search indexes safely';
END $$;

-- =====================================================
-- STEP 6: INSERT DEFAULT ROLES AND PERMISSIONS
-- =====================================================

DO $$
BEGIN
    -- Insert default roles (only if roles table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
        INSERT INTO roles (name, description, is_default) VALUES 
        ('super_admin', 'Super Administrator with full access', false),
        ('admin', 'Administrator with limited access', false),
        ('moderator', 'Moderator with content management access', false),
        ('client', 'Regular client user', true),
        ('reader', 'Tarot reader', false)
        ON CONFLICT (name) DO NOTHING;
        RAISE NOTICE 'Inserted default roles';
    END IF;

    -- Insert basic permissions (only if permissions table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') THEN
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
        RAISE NOTICE 'Inserted default permissions';
    END IF;

    RAISE NOTICE '✅ Step 6: Inserted default roles and permissions';
END $$;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 SIMPLE ADVANCED ADMIN SETUP COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '✅ Created basic admin tables and added soft delete functionality';
    RAISE NOTICE '✅ Added search indexes and default roles/permissions';
    RAISE NOTICE '✅ All tables are now ready for basic admin operations';
    RAISE NOTICE '✅ Fixed: table_name column reference errors';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '- admin_audit_logs';
    RAISE NOTICE '- admin_search_history'; 
    RAISE NOTICE '- admin_activity_feed';
    RAISE NOTICE '- admin_notification_rules';
    RAISE NOTICE '- permissions';
    RAISE NOTICE '- roles';
    RAISE NOTICE '- user_roles';
    RAISE NOTICE '';
END $$; 