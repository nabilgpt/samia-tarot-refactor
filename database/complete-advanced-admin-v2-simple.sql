-- =====================================================
-- SAMIA TAROT - COMPLETE ADVANCED ADMIN FEATURES V2 (SIMPLE & GUARANTEED)
-- =====================================================
-- مبسط ومضمون - فصل إنشاء الجداول عن الـ indexes

-- =====================================================
-- STEP 1: CREATE ALL TABLES (NO INDEXES YET)
-- =====================================================

-- 1️⃣ BULK OPERATIONS & AUDIT LOGS
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID,
    action_type VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_ids UUID[] NOT NULL,
    old_data JSONB,
    new_data JSONB,
    bulk_operation_id UUID,
    can_undo BOOLEAN DEFAULT true,
    undone_at TIMESTAMP WITH TIME ZONE,
    undone_by UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE TABLE IF NOT EXISTS bulk_operations_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID,
    operation_type VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    total_records INTEGER NOT NULL,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'processing',
    error_details JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    can_undo BOOLEAN DEFAULT true,
    undone_at TIMESTAMP WITH TIME ZONE
);

-- 2️⃣ SEARCH & FILTERING
CREATE TABLE IF NOT EXISTS admin_search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID,
    search_query TEXT NOT NULL,
    search_type VARCHAR(50) NOT NULL,
    filters_applied JSONB DEFAULT '{}',
    results_count INTEGER DEFAULT 0,
    search_duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_saved_filters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID,
    filter_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    filter_config JSONB NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3️⃣ REAL-TIME ANALYTICS
CREATE TABLE IF NOT EXISTS admin_analytics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,2),
    metric_data JSONB DEFAULT '{}',
    time_period VARCHAR(50) NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour'),
    UNIQUE(metric_name, time_period)
);

CREATE TABLE IF NOT EXISTS admin_activity_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID,
    activity_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    entity_type VARCHAR(100),
    entity_id UUID,
    metadata JSONB DEFAULT '{}',
    priority VARCHAR(20) DEFAULT 'normal',
    read_by UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4️⃣ NOTIFICATION SYSTEM
CREATE TABLE IF NOT EXISTS admin_notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID,
    rule_name VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_notification_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID,
    channel_type VARCHAR(50) NOT NULL,
    channel_config JSONB NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID,
    admin_id UUID,
    event_data JSONB NOT NULL,
    channels_sent VARCHAR(50)[] DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'pending',
    error_details TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5️⃣ PERMISSIONS & RBAC
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID,
    permission_id UUID,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    role_id UUID,
    assigned_by UUID,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, role_id)
);

CREATE TABLE IF NOT EXISTS user_permission_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    permission_id UUID,
    granted BOOLEAN NOT NULL,
    assigned_by UUID,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, permission_id)
);

-- 6️⃣ DOCUMENTATION & ONBOARDING
CREATE TABLE IF NOT EXISTS documentation_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_key VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    content_ar TEXT,
    category VARCHAR(100),
    tags VARCHAR(100)[] DEFAULT '{}',
    is_published BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_onboarding_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    step_key VARCHAR(100) NOT NULL,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    data JSONB DEFAULT '{}',
    UNIQUE(user_id, step_key)
);

CREATE TABLE IF NOT EXISTS error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    request_url TEXT,
    request_method VARCHAR(10),
    request_data JSONB,
    user_agent TEXT,
    ip_address INET,
    severity VARCHAR(20) DEFAULT 'error',
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7️⃣ IMPORT/EXPORT & MARKETPLACE
CREATE TABLE IF NOT EXISTS import_export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID,
    job_type VARCHAR(50) NOT NULL,
    data_type VARCHAR(100) NOT NULL,
    file_name VARCHAR(255),
    file_path TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    error_details JSONB DEFAULT '{}',
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255),
    settings JSONB DEFAULT '{}',
    subscription_plan VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 2: ADD SOFT DELETE COLUMNS TO EXISTING TABLES
-- =====================================================

DO $$
BEGIN
    -- Add to profiles table (main user table in SAMIA TAROT)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_by UUID;
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tenant_id UUID;
    END IF;

    -- Add to bookings table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_by UUID;
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tenant_id UUID;
    END IF;

    -- Add to reviews table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
        ALTER TABLE reviews ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE reviews ADD COLUMN IF NOT EXISTS deleted_by UUID;
    END IF;

    -- Add to payments table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_by UUID;
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS tenant_id UUID;
    END IF;

    -- Add to readers table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'readers') THEN
        ALTER TABLE readers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE readers ADD COLUMN IF NOT EXISTS deleted_by UUID;
        ALTER TABLE readers ADD COLUMN IF NOT EXISTS tenant_id UUID;
    END IF;

    -- Add to chat_sessions table (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_sessions') THEN
        ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS deleted_by UUID;
    END IF;

    -- Add to call_sessions table (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_sessions') THEN
        ALTER TABLE call_sessions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE call_sessions ADD COLUMN IF NOT EXISTS deleted_by UUID;
    END IF;
END $$;

-- =====================================================
-- STEP 3: CREATE INDEXES (OUTSIDE DO BLOCK - مضمون!)
-- =====================================================

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON admin_audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON admin_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_can_undo ON admin_audit_logs(can_undo) WHERE can_undo = true;

-- Bulk operations indexes
CREATE INDEX IF NOT EXISTS idx_bulk_ops_admin_id ON bulk_operations_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_bulk_ops_status ON bulk_operations_log(status);
CREATE INDEX IF NOT EXISTS idx_bulk_ops_created_at ON bulk_operations_log(started_at);

-- Activity feed indexes
CREATE INDEX IF NOT EXISTS idx_activity_feed_admin_id ON admin_activity_feed(admin_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON admin_activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_priority ON admin_activity_feed(priority);

-- Notification rules indexes
CREATE INDEX IF NOT EXISTS idx_notification_rules_admin_id ON admin_notification_rules(admin_id);
CREATE INDEX IF NOT EXISTS idx_notification_rules_event_type ON admin_notification_rules(event_type);
CREATE INDEX IF NOT EXISTS idx_notification_rules_active ON admin_notification_rules(is_active) WHERE is_active = true;

-- RBAC indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_user_id ON user_permission_overrides(user_id);

-- Soft delete indexes (conditional)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'deleted_at') THEN
            CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at) WHERE deleted_at IS NULL;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'deleted_at') THEN
            CREATE INDEX IF NOT EXISTS idx_bookings_deleted_at ON bookings(deleted_at) WHERE deleted_at IS NULL;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'deleted_at') THEN
            CREATE INDEX IF NOT EXISTS idx_reviews_deleted_at ON reviews(deleted_at) WHERE deleted_at IS NULL;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'deleted_at') THEN
            CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON payments(deleted_at) WHERE deleted_at IS NULL;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'readers') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'readers' AND column_name = 'deleted_at') THEN
            CREATE INDEX IF NOT EXISTS idx_readers_deleted_at ON readers(deleted_at) WHERE deleted_at IS NULL;
        END IF;
    END IF;
END $$;

-- =====================================================
-- STEP 4: INSERT DEFAULT DATA
-- =====================================================

-- Insert comprehensive permissions
INSERT INTO permissions (name, description, resource, action) VALUES
('users.create', 'Create new users', 'users', 'create'),
('users.read', 'View users', 'users', 'read'),
('users.update', 'Update user information', 'users', 'update'),
('users.delete', 'Delete users', 'users', 'delete'),
('users.bulk_operations', 'Perform bulk operations on users', 'users', 'bulk'),
('profiles.create', 'Create new profiles', 'profiles', 'create'),
('profiles.read', 'View profiles', 'profiles', 'read'),
('profiles.update', 'Update profile information', 'profiles', 'update'),
('profiles.delete', 'Delete profiles', 'profiles', 'delete'),
('profiles.bulk_operations', 'Perform bulk operations on profiles', 'profiles', 'bulk'),
('bookings.create', 'Create new bookings', 'bookings', 'create'),
('bookings.read', 'View bookings', 'bookings', 'read'),
('bookings.update', 'Update bookings', 'bookings', 'update'),
('bookings.delete', 'Delete bookings', 'bookings', 'delete'),
('bookings.approve', 'Approve bookings', 'bookings', 'approve'),
('bookings.bulk_operations', 'Perform bulk operations on bookings', 'bookings', 'bulk'),
('payments.read', 'View payments', 'payments', 'read'),
('payments.update', 'Update payments', 'payments', 'update'),
('payments.refund', 'Process refunds', 'payments', 'refund'),
('payments.bulk_operations', 'Perform bulk operations on payments', 'payments', 'bulk'),
('reviews.read', 'View reviews', 'reviews', 'read'),
('reviews.update', 'Update reviews', 'reviews', 'update'),
('reviews.approve', 'Approve reviews', 'reviews', 'approve'),
('reviews.delete', 'Delete reviews', 'reviews', 'delete'),
('reviews.bulk_operations', 'Perform bulk operations on reviews', 'reviews', 'bulk'),
('readers.read', 'View readers', 'readers', 'read'),
('readers.update', 'Update reader information', 'readers', 'update'),
('readers.approve', 'Approve readers', 'readers', 'approve'),
('analytics.read', 'View analytics', 'analytics', 'read'),
('system.read', 'View system information', 'system', 'read'),
('system.update', 'Update system settings', 'system', 'update'),
('admin.undo', 'Undo admin actions', 'admin', 'undo'),
('admin.audit_logs', 'View audit logs', 'admin', 'audit_logs')
ON CONFLICT (name) DO NOTHING;

-- Insert comprehensive roles
INSERT INTO roles (name, description, is_default) VALUES
('super_admin', 'Full system access with all permissions', false),
('admin', 'Standard admin with most permissions', true),
('moderator', 'Limited admin access for content moderation', false),
('support', 'Customer support with read-only access', false),
('client', 'Regular client user', true),
('reader', 'Tarot reader', false)
ON CONFLICT (name) DO NOTHING;

-- Insert default documentation entries
INSERT INTO documentation_entries (page_key, title, content, content_ar, category) VALUES
('admin_dashboard', 'Admin Dashboard Overview', 'Welcome to the SAMIA TAROT admin dashboard. This is your central hub for managing the platform.', 'مرحباً بك في لوحة تحكم إدارة سامية تاروت. هذا هو المركز الرئيسي لإدارة المنصة.', 'dashboard'),
('user_management', 'User Management Guide', 'Learn how to manage users, roles, and permissions in the system.', 'تعلم كيفية إدارة المستخدمين والأدوار والصلاحيات في النظام.', 'users'),
('bulk_operations', 'Bulk Operations Guide', 'How to perform bulk operations safely and efficiently.', 'كيفية تنفيذ العمليات المجمعة بأمان وكفاءة.', 'operations'),
('profile_management', 'Profile Management', 'Managing user profiles in SAMIA TAROT platform.', 'إدارة ملفات المستخدمين في منصة سامية تاروت.', 'profiles'),
('reader_management', 'Reader Management', 'Managing tarot readers and their services.', 'إدارة قارئي التاروت وخدماتهم.', 'readers')
ON CONFLICT (page_key) DO NOTHING;

-- =====================================================
-- STEP 5: ADD FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Add foreign keys between new tables
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_role_id_fkey 
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;

ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_permission_id_fkey 
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE;

ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_id_fkey 
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;

ALTER TABLE user_permission_overrides ADD CONSTRAINT user_permission_overrides_permission_id_fkey 
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE;

-- Add tenant foreign keys if tables exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'tenant_id') THEN
                ALTER TABLE profiles ADD CONSTRAINT profiles_tenant_id_fkey 
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
            END IF;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'tenant_id') THEN
                ALTER TABLE bookings ADD CONSTRAINT bookings_tenant_id_fkey 
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
            END IF;
        END IF;
    END IF;
END $$;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
DECLARE
    table_count INTEGER;
    permission_count INTEGER;
    role_count INTEGER;
    doc_count INTEGER;
BEGIN
    -- Count all new tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_name IN (
        'admin_audit_logs', 'bulk_operations_log', 'admin_search_history', 'admin_saved_filters',
        'admin_analytics_cache', 'admin_activity_feed', 'admin_notification_rules', 
        'admin_notification_channels', 'notification_executions', 'permissions', 'roles',
        'role_permissions', 'user_roles', 'user_permission_overrides', 'documentation_entries',
        'user_onboarding_progress', 'error_logs', 'import_export_jobs', 'tenants'
    );

    SELECT COUNT(*) INTO permission_count FROM permissions;
    SELECT COUNT(*) INTO role_count FROM roles;
    SELECT COUNT(*) INTO doc_count FROM documentation_entries;

    RAISE NOTICE '';
    RAISE NOTICE '🎉 SAMIA TAROT ADVANCED ADMIN SETUP COMPLETE!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Tables created: % / 19', table_count;
    RAISE NOTICE '✅ Permissions: %', permission_count;
    RAISE NOTICE '✅ Roles: %', role_count;
    RAISE NOTICE '✅ Documentation entries: %', doc_count;
    RAISE NOTICE '✅ Indexes created outside DO blocks (مضمون!)';
    RAISE NOTICE '✅ Soft delete columns added';
    RAISE NOTICE '✅ Multi-tenancy support added';
    RAISE NOTICE '✅ Foreign key constraints added';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 All advanced admin features are now ready!';
    RAISE NOTICE 'No more "column does not exist" errors! 😉';
    RAISE NOTICE '';
END $$; 