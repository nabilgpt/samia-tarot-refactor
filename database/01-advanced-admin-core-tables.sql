-- =====================================================
-- SAMIA TAROT - ADVANCED ADMIN FEATURES - PART 1
-- CORE ADMIN TABLES (NO DEPENDENCIES)
-- =====================================================

-- 1️⃣ BULK OPERATIONS & AUDIT LOGS
-- =====================================================

-- Enhanced audit logs with undo support
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID, -- Will reference auth.users(id) when available
    action_type VARCHAR(100) NOT NULL, -- 'bulk_delete', 'bulk_approve', 'single_update', etc.
    table_name VARCHAR(100) NOT NULL,
    record_ids UUID[] NOT NULL, -- Array of affected record IDs
    old_data JSONB, -- Previous state for undo
    new_data JSONB, -- New state
    bulk_operation_id UUID, -- Groups bulk operations
    can_undo BOOLEAN DEFAULT true,
    undone_at TIMESTAMP WITH TIME ZONE,
    undone_by UUID, -- Will reference auth.users(id) when available
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Bulk operations tracking
CREATE TABLE IF NOT EXISTS bulk_operations_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID, -- Will reference auth.users(id) when available
    operation_type VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    total_records INTEGER NOT NULL,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'processing', -- 'processing', 'completed', 'failed', 'cancelled'
    error_details JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    can_undo BOOLEAN DEFAULT true,
    undone_at TIMESTAMP WITH TIME ZONE
);

-- 2️⃣ SEARCH & FILTERING
-- =====================================================

-- Search history for analytics
CREATE TABLE IF NOT EXISTS admin_search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID, -- Will reference auth.users(id) when available
    search_query TEXT NOT NULL,
    search_type VARCHAR(50) NOT NULL, -- 'universal', 'users', 'bookings', etc.
    filters_applied JSONB DEFAULT '{}',
    results_count INTEGER DEFAULT 0,
    search_duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved search filters
CREATE TABLE IF NOT EXISTS admin_saved_filters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID, -- Will reference auth.users(id) when available
    filter_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    filter_config JSONB NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3️⃣ REAL-TIME ANALYTICS
-- =====================================================

-- Analytics cache for fast dashboard loading
CREATE TABLE IF NOT EXISTS admin_analytics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,2),
    metric_data JSONB DEFAULT '{}',
    time_period VARCHAR(50) NOT NULL, -- 'today', 'week', 'month', 'year'
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour'),
    UNIQUE(metric_name, time_period)
);

-- Real-time activity feed
CREATE TABLE IF NOT EXISTS admin_activity_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID, -- Will reference auth.users(id) when available
    activity_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    entity_type VARCHAR(100), -- 'user', 'booking', 'payment', etc.
    entity_id UUID,
    metadata JSONB DEFAULT '{}',
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
    read_by UUID[] DEFAULT '{}', -- Array of admin IDs who read this
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4️⃣ CUSTOM NOTIFICATION RULES
-- =====================================================

-- Notification rules engine
CREATE TABLE IF NOT EXISTS admin_notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID, -- Will reference auth.users(id) when available
    rule_name VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL, -- 'new_booking', 'low_rating', 'high_payment', etc.
    conditions JSONB NOT NULL, -- Complex condition logic
    actions JSONB NOT NULL, -- Array of actions (email, sms, push, webhook)
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification channels configuration
CREATE TABLE IF NOT EXISTS admin_notification_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID, -- Will reference auth.users(id) when available
    channel_type VARCHAR(50) NOT NULL, -- 'email', 'sms', 'push', 'webhook'
    channel_config JSONB NOT NULL, -- Email addresses, phone numbers, webhook URLs
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification execution log
CREATE TABLE IF NOT EXISTS notification_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES admin_notification_rules(id) ON DELETE CASCADE,
    admin_id UUID, -- Will reference auth.users(id) when available
    event_data JSONB NOT NULL,
    channels_sent VARCHAR(50)[] DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'cancelled'
    error_details TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5️⃣ GRANULAR PERMISSIONS & RBAC
-- =====================================================

-- Permissions system
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    resource VARCHAR(100) NOT NULL, -- 'users', 'bookings', 'payments', etc.
    action VARCHAR(100) NOT NULL, -- 'create', 'read', 'update', 'delete', 'approve', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Roles system
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role-Permission mapping
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- User-Role mapping (no foreign key constraint yet)
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- Will reference auth.users(id) when available
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by UUID, -- Will reference auth.users(id) when available
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, role_id)
);

-- User permission overrides
CREATE TABLE IF NOT EXISTS user_permission_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- Will reference auth.users(id) when available
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    is_granted BOOLEAN NOT NULL,
    granted_by UUID, -- Will reference auth.users(id) when available
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, permission_id)
);

-- 6️⃣ DOCUMENTATION & ERROR TRACKING
-- =====================================================

-- In-app documentation
CREATE TABLE IF NOT EXISTS documentation_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    tags VARCHAR(50)[] DEFAULT '{}',
    is_published BOOLEAN DEFAULT false,
    created_by UUID, -- Will reference auth.users(id) when available
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User onboarding progress
CREATE TABLE IF NOT EXISTS user_onboarding_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- Will reference auth.users(id) when available
    step_name VARCHAR(100) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    skipped_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, step_name)
);

-- Error tracking
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- Will reference auth.users(id) when available
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT,
    stack_trace TEXT,
    request_data JSONB DEFAULT '{}',
    user_agent TEXT,
    ip_address INET,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID, -- Will reference auth.users(id) when available
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7️⃣ IMPORT/EXPORT & MARKETPLACE PREP
-- =====================================================

-- Import/Export job tracking
CREATE TABLE IF NOT EXISTS import_export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID, -- Will reference auth.users(id) when available
    job_type VARCHAR(50) NOT NULL, -- 'import', 'export'
    table_name VARCHAR(100) NOT NULL,
    file_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    error_details JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Multi-tenant preparation
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenant-User mapping
CREATE TABLE IF NOT EXISTS tenant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID, -- Will reference auth.users(id) when available
    role_in_tenant VARCHAR(100) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
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

-- =====================================================
-- INSERT DEFAULT PERMISSIONS AND ROLES
-- =====================================================

-- Insert default permissions
INSERT INTO permissions (name, description, resource, action) VALUES
    -- User management
    ('users.read', 'View users', 'users', 'read'),
    ('users.create', 'Create users', 'users', 'create'),
    ('users.update', 'Update users', 'users', 'update'),
    ('users.delete', 'Delete users', 'users', 'delete'),
    ('users.bulk', 'Bulk operations on users', 'users', 'bulk'),
    
    -- Booking management
    ('bookings.read', 'View bookings', 'bookings', 'read'),
    ('bookings.create', 'Create bookings', 'bookings', 'create'),
    ('bookings.update', 'Update bookings', 'bookings', 'update'),
    ('bookings.delete', 'Delete bookings', 'bookings', 'delete'),
    ('bookings.approve', 'Approve bookings', 'bookings', 'approve'),
    ('bookings.bulk', 'Bulk operations on bookings', 'bookings', 'bulk'),
    
    -- Payment management
    ('payments.read', 'View payments', 'payments', 'read'),
    ('payments.create', 'Create payments', 'payments', 'create'),
    ('payments.update', 'Update payments', 'payments', 'update'),
    ('payments.delete', 'Delete payments', 'payments', 'delete'),
    ('payments.refund', 'Refund payments', 'payments', 'refund'),
    ('payments.bulk', 'Bulk operations on payments', 'payments', 'bulk'),
    
    -- Review management
    ('reviews.read', 'View reviews', 'reviews', 'read'),
    ('reviews.update', 'Update reviews', 'reviews', 'update'),
    ('reviews.delete', 'Delete reviews', 'reviews', 'delete'),
    ('reviews.approve', 'Approve reviews', 'reviews', 'approve'),
    ('reviews.bulk', 'Bulk operations on reviews', 'reviews', 'bulk'),
    
    -- Analytics and reporting
    ('analytics.read', 'View analytics', 'analytics', 'read'),
    ('reports.generate', 'Generate reports', 'reports', 'generate'),
    ('audit.read', 'View audit logs', 'audit', 'read'),
    
    -- System administration
    ('system.configure', 'Configure system settings', 'system', 'configure'),
    ('notifications.manage', 'Manage notifications', 'notifications', 'manage'),
    ('roles.manage', 'Manage roles and permissions', 'roles', 'manage')
ON CONFLICT (name) DO NOTHING;

-- Insert default roles
INSERT INTO roles (name, description, is_default) VALUES
    ('super_admin', 'Super Administrator with full access', false),
    ('admin', 'Administrator with most permissions', true),
    ('moderator', 'Moderator with limited admin permissions', false),
    ('support', 'Support staff with read-only access', false)
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to super_admin role (all permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'super_admin'),
    id
FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to admin role (most permissions except system.configure)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'admin'),
    id
FROM permissions
WHERE name != 'system.configure' AND name != 'roles.manage'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to moderator role (limited permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'moderator'),
    id
FROM permissions
WHERE action IN ('read', 'update', 'approve') AND resource IN ('users', 'bookings', 'reviews')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to support role (read-only)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'support'),
    id
FROM permissions
WHERE action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMENT ON TABLE admin_audit_logs IS 'Comprehensive audit logging for all admin actions with undo support';
COMMENT ON TABLE bulk_operations_log IS 'Tracking and monitoring of bulk operations';
COMMENT ON TABLE admin_notification_rules IS 'Custom notification rules engine for admins';
COMMENT ON TABLE permissions IS 'Granular permission system for RBAC';
COMMENT ON TABLE roles IS 'Role definitions for RBAC system'; 