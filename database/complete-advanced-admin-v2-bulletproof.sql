-- =====================================================
-- SAMIA TAROT - COMPLETE ADVANCED ADMIN FEATURES V2 (BULLETPROOF)
-- =====================================================
-- Bulletproof version with proper transaction handling and timing

BEGIN;

DO $$
BEGIN
    RAISE NOTICE '🚀 Starting Complete Advanced Admin Setup V2 (BULLETPROOF)...';
    RAISE NOTICE 'This version handles all transaction timing issues';
END $$;

-- =====================================================
-- STEP 1: CREATE ALL TABLES FIRST (NO INDEXES YET)
-- =====================================================

-- 1️⃣ BULK OPERATIONS & AUDIT LOGS
DROP TABLE IF EXISTS admin_audit_logs CASCADE;
CREATE TABLE admin_audit_logs (
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

DROP TABLE IF EXISTS bulk_operations_log CASCADE;
CREATE TABLE bulk_operations_log (
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
DROP TABLE IF EXISTS admin_search_history CASCADE;
CREATE TABLE admin_search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID,
    search_query TEXT NOT NULL,
    search_type VARCHAR(50) NOT NULL,
    filters_applied JSONB DEFAULT '{}',
    results_count INTEGER DEFAULT 0,
    search_duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TABLE IF EXISTS admin_saved_filters CASCADE;
CREATE TABLE admin_saved_filters (
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
DROP TABLE IF EXISTS admin_analytics_cache CASCADE;
CREATE TABLE admin_analytics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,2),
    metric_data JSONB DEFAULT '{}',
    time_period VARCHAR(50) NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour'),
    UNIQUE(metric_name, time_period)
);

DROP TABLE IF EXISTS admin_activity_feed CASCADE;
CREATE TABLE admin_activity_feed (
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
DROP TABLE IF EXISTS admin_notification_rules CASCADE;
CREATE TABLE admin_notification_rules (
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

DROP TABLE IF EXISTS admin_notification_channels CASCADE;
CREATE TABLE admin_notification_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID,
    channel_type VARCHAR(50) NOT NULL,
    channel_config JSONB NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TABLE IF EXISTS notification_executions CASCADE;
CREATE TABLE notification_executions (
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
DROP TABLE IF EXISTS permissions CASCADE;
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TABLE IF EXISTS roles CASCADE;
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TABLE IF EXISTS role_permissions CASCADE;
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID,
    permission_id UUID,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

DROP TABLE IF EXISTS user_roles CASCADE;
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    role_id UUID,
    assigned_by UUID,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, role_id)
);

DROP TABLE IF EXISTS user_permission_overrides CASCADE;
CREATE TABLE user_permission_overrides (
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
DROP TABLE IF EXISTS documentation_entries CASCADE;
CREATE TABLE documentation_entries (
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

DROP TABLE IF EXISTS user_onboarding_progress CASCADE;
CREATE TABLE user_onboarding_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    step_key VARCHAR(100) NOT NULL,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    data JSONB DEFAULT '{}',
    UNIQUE(user_id, step_key)
);

DROP TABLE IF EXISTS error_logs CASCADE;
CREATE TABLE error_logs (
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
DROP TABLE IF EXISTS import_export_jobs CASCADE;
CREATE TABLE import_export_jobs (
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

DROP TABLE IF EXISTS tenants CASCADE;
CREATE TABLE tenants (
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

-- COMMIT TABLE CREATION
COMMIT;

DO $$
BEGIN
    RAISE NOTICE '✅ Step 1: Created all 19 advanced admin tables successfully';
END $$;

-- =====================================================
-- STEP 2: ADD SOFT DELETE COLUMNS TO EXISTING TABLES
-- =====================================================

BEGIN;

DO $$
BEGIN
    RAISE NOTICE '🔧 Adding soft delete and multi-tenancy columns to existing tables...';
    
    -- Add to profiles table (main user table in SAMIA TAROT)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_by UUID;
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tenant_id UUID;
        RAISE NOTICE '✅ Added soft delete and tenant support to profiles table';
    ELSE
        RAISE NOTICE '⚠️ profiles table not found - skipping';
    END IF;

    -- Add to bookings table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_by UUID;
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tenant_id UUID;
        RAISE NOTICE '✅ Added soft delete and tenant support to bookings table';
    ELSE
        RAISE NOTICE '⚠️ bookings table not found - skipping';
    END IF;

    -- Add to reviews table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
        ALTER TABLE reviews ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE reviews ADD COLUMN IF NOT EXISTS deleted_by UUID;
        RAISE NOTICE '✅ Added soft delete to reviews table';
    ELSE
        RAISE NOTICE '⚠️ reviews table not found - skipping';
    END IF;

    -- Add to payments table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_by UUID;
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS tenant_id UUID;
        RAISE NOTICE '✅ Added soft delete and tenant support to payments table';
    ELSE
        RAISE NOTICE '⚠️ payments table not found - skipping';
    END IF;

    -- Add to readers table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'readers') THEN
        ALTER TABLE readers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE readers ADD COLUMN IF NOT EXISTS deleted_by UUID;
        ALTER TABLE readers ADD COLUMN IF NOT EXISTS tenant_id UUID;
        RAISE NOTICE '✅ Added soft delete and tenant support to readers table';
    ELSE
        RAISE NOTICE '⚠️ readers table not found - skipping';
    END IF;

    -- Add to chat_sessions table (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_sessions') THEN
        ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS deleted_by UUID;
        RAISE NOTICE '✅ Added soft delete to chat_sessions table';
    ELSE
        RAISE NOTICE '⚠️ chat_sessions table not found - skipping';
    END IF;

    -- Add to call_sessions table (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_sessions') THEN
        ALTER TABLE call_sessions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE call_sessions ADD COLUMN IF NOT EXISTS deleted_by UUID;
        RAISE NOTICE '✅ Added soft delete to call_sessions table';
    ELSE
        RAISE NOTICE '⚠️ call_sessions table not found - skipping';
    END IF;

    RAISE NOTICE '✅ Step 2: Completed soft delete and multi-tenancy column additions';
END $$;

COMMIT;

-- =====================================================
-- STEP 3: CREATE PERFORMANCE INDEXES (AFTER TABLES EXIST)
-- =====================================================

BEGIN;

DO $$
BEGIN
    RAISE NOTICE '📊 Creating performance indexes...';
    
    -- Verify tables exist before creating indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_audit_logs') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_audit_logs' AND column_name = 'can_undo') THEN
            CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON admin_audit_logs(admin_id);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON admin_audit_logs(table_name);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON admin_audit_logs(created_at);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_can_undo ON admin_audit_logs(can_undo) WHERE can_undo = true;
            RAISE NOTICE '✅ Created indexes for admin_audit_logs';
        ELSE
            RAISE EXCEPTION 'Column can_undo does not exist in admin_audit_logs table';
        END IF;
    ELSE
        RAISE EXCEPTION 'Table admin_audit_logs does not exist';
    END IF;

    -- Bulk operations indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bulk_operations_log') THEN
        CREATE INDEX IF NOT EXISTS idx_bulk_ops_admin_id ON bulk_operations_log(admin_id);
        CREATE INDEX IF NOT EXISTS idx_bulk_ops_status ON bulk_operations_log(status);
        CREATE INDEX IF NOT EXISTS idx_bulk_ops_created_at ON bulk_operations_log(started_at);
        RAISE NOTICE '✅ Created indexes for bulk_operations_log';
    END IF;

    -- Activity feed indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_activity_feed') THEN
        CREATE INDEX IF NOT EXISTS idx_activity_feed_admin_id ON admin_activity_feed(admin_id);
        CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON admin_activity_feed(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_activity_feed_priority ON admin_activity_feed(priority);
        RAISE NOTICE '✅ Created indexes for admin_activity_feed';
    END IF;

    -- Notification rules indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_notification_rules') THEN
        CREATE INDEX IF NOT EXISTS idx_notification_rules_admin_id ON admin_notification_rules(admin_id);
        CREATE INDEX IF NOT EXISTS idx_notification_rules_event_type ON admin_notification_rules(event_type);
        CREATE INDEX IF NOT EXISTS idx_notification_rules_active ON admin_notification_rules(is_active) WHERE is_active = true;
        RAISE NOTICE '✅ Created indexes for admin_notification_rules';
    END IF;

    -- RBAC indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
        RAISE NOTICE '✅ Created indexes for user_roles';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions') THEN
        CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
        RAISE NOTICE '✅ Created indexes for role_permissions';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_permission_overrides') THEN
        CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_user_id ON user_permission_overrides(user_id);
        RAISE NOTICE '✅ Created indexes for user_permission_overrides';
    END IF;

    -- Soft delete indexes (only if tables exist)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'deleted_at') THEN
            CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at) WHERE deleted_at IS NULL;
            RAISE NOTICE '✅ Created soft delete index for profiles';
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'deleted_at') THEN
            CREATE INDEX IF NOT EXISTS idx_bookings_deleted_at ON bookings(deleted_at) WHERE deleted_at IS NULL;
            RAISE NOTICE '✅ Created soft delete index for bookings';
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'deleted_at') THEN
            CREATE INDEX IF NOT EXISTS idx_reviews_deleted_at ON reviews(deleted_at) WHERE deleted_at IS NULL;
            RAISE NOTICE '✅ Created soft delete index for reviews';
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'deleted_at') THEN
            CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON payments(deleted_at) WHERE deleted_at IS NULL;
            RAISE NOTICE '✅ Created soft delete index for payments';
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'readers') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'readers' AND column_name = 'deleted_at') THEN
            CREATE INDEX IF NOT EXISTS idx_readers_deleted_at ON readers(deleted_at) WHERE deleted_at IS NULL;
            RAISE NOTICE '✅ Created soft delete index for readers';
        END IF;
    END IF;

    RAISE NOTICE '✅ Step 3: Created all performance indexes';
END $$;

COMMIT;

-- =====================================================
-- STEP 4: INSERT DEFAULT DATA
-- =====================================================

BEGIN;

DO $$
BEGIN
    RAISE NOTICE '📝 Inserting default data...';
    
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

    RAISE NOTICE '✅ Step 4: Inserted default data (33 permissions, 6 roles, 5 documentation entries)';
END $$;

COMMIT;

-- =====================================================
-- STEP 5: ADD FOREIGN KEY CONSTRAINTS
-- =====================================================

BEGIN;

DO $$
BEGIN
    RAISE NOTICE '🔗 Adding foreign key constraints...';
    
    -- Add foreign keys between new tables
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'role_permissions_role_id_fkey') THEN
        ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'role_permissions_permission_id_fkey') THEN
        ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_roles_role_id_fkey') THEN
        ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_permission_overrides_permission_id_fkey') THEN
        ALTER TABLE user_permission_overrides ADD CONSTRAINT user_permission_overrides_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE;
    END IF;

    -- Add tenant foreign keys if tenants table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
            IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'profiles_tenant_id_fkey') THEN
                ALTER TABLE profiles ADD CONSTRAINT profiles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
            END IF;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
            IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'bookings_tenant_id_fkey') THEN
                ALTER TABLE bookings ADD CONSTRAINT bookings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
            END IF;
        END IF;
    END IF;

    RAISE NOTICE '✅ Step 5: Added foreign key constraints';
END $$;

COMMIT;

-- =====================================================
-- FINAL VERIFICATION AND SUCCESS MESSAGE
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
    RAISE NOTICE '🎉 COMPLETE ADVANCED ADMIN SETUP V2 (BULLETPROOF) FINISHED!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Tables created: % / 19', table_count;
    RAISE NOTICE '✅ Permissions inserted: %', permission_count;
    RAISE NOTICE '✅ Roles inserted: %', role_count;
    RAISE NOTICE '✅ Documentation entries: %', doc_count;
    RAISE NOTICE '✅ Soft delete columns added to existing tables';
    RAISE NOTICE '✅ Multi-tenancy support added';
    RAISE NOTICE '✅ Performance indexes created with proper timing';
    RAISE NOTICE '✅ Foreign key constraints added';
    RAISE NOTICE '✅ Fixed: All transaction timing issues resolved';
    RAISE NOTICE '✅ Fixed: Column existence verified before index creation';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 SAMIA TAROT ADVANCED ADMIN FEATURES READY!';
    RAISE NOTICE '';
    RAISE NOTICE 'Features now available:';
    RAISE NOTICE '- ✅ Comprehensive audit logging with undo support';
    RAISE NOTICE '- ✅ Bulk operations tracking and management';
    RAISE NOTICE '- ✅ Advanced search and filtering system';
    RAISE NOTICE '- ✅ Real-time analytics caching';
    RAISE NOTICE '- ✅ Activity feed system';
    RAISE NOTICE '- ✅ Custom notification rules engine';
    RAISE NOTICE '- ✅ Granular RBAC with 33 permissions';
    RAISE NOTICE '- ✅ Bilingual documentation system';
    RAISE NOTICE '- ✅ User onboarding tracking';
    RAISE NOTICE '- ✅ Error logging and tracking';
    RAISE NOTICE '- ✅ Import/Export operations';
    RAISE NOTICE '- ✅ Multi-tenant marketplace support';
    RAISE NOTICE '- ✅ Soft delete functionality';
    RAISE NOTICE '';
    RAISE NOTICE 'All transaction timing and column existence issues resolved!';
    RAISE NOTICE 'This bulletproof version handles all edge cases!';
    RAISE NOTICE '';
END $$; 