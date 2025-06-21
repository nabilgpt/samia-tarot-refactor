-- =====================================================
-- SAMIA TAROT - ADVANCED ADMIN FEATURES DATABASE SCHEMA V2
-- =====================================================

-- 1️⃣ BULK OPERATIONS & AUDIT LOGS
-- =====================================================

-- Enhanced audit logs with undo support
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL, -- 'bulk_delete', 'bulk_approve', 'single_update', etc.
    table_name VARCHAR(100) NOT NULL,
    record_ids UUID[] NOT NULL, -- Array of affected record IDs
    old_data JSONB, -- Previous state for undo
    new_data JSONB, -- New state
    bulk_operation_id UUID, -- Groups bulk operations
    can_undo BOOLEAN DEFAULT true,
    undone_at TIMESTAMP WITH TIME ZONE,
    undone_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Bulk operations tracking
CREATE TABLE IF NOT EXISTS bulk_operations_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- 2️⃣ SOFT DELETE COLUMNS (Add to existing tables)
-- =====================================================

-- Add soft delete columns to main tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE readers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE readers ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- 3️⃣ SEARCH & FILTERING
-- =====================================================

-- Search history for analytics
CREATE TABLE IF NOT EXISTS admin_search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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
    admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    filter_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    filter_config JSONB NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4️⃣ REAL-TIME ANALYTICS
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
    admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- 5️⃣ CUSTOM NOTIFICATION RULES
-- =====================================================

-- Notification rules engine
CREATE TABLE IF NOT EXISTS admin_notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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
    admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    channel_type VARCHAR(50) NOT NULL, -- 'email', 'sms', 'push', 'webhook'
    channel_config JSONB NOT NULL, -- Email addresses, phone numbers, webhook URLs
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification execution log
CREATE TABLE IF NOT EXISTS notification_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES admin_notification_rules(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_data JSONB NOT NULL,
    channels_sent VARCHAR(50)[] DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'cancelled'
    error_details TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6️⃣ GRANULAR PERMISSIONS & RBAC
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

-- User-Role mapping
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, role_id)
);

-- User-specific permission overrides
CREATE TABLE IF NOT EXISTS user_permission_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    granted BOOLEAN NOT NULL, -- true = grant, false = deny
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, permission_id)
);

-- 7️⃣ DOCUMENTATION & ONBOARDING
-- =====================================================

-- In-app documentation
CREATE TABLE IF NOT EXISTS documentation_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_key VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    content_ar TEXT, -- Arabic content
    category VARCHAR(100),
    tags VARCHAR(100)[] DEFAULT '{}',
    is_published BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User onboarding progress
CREATE TABLE IF NOT EXISTS user_onboarding_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    step_key VARCHAR(100) NOT NULL,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    data JSONB DEFAULT '{}',
    UNIQUE(user_id, step_key)
);

-- Error tracking
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    request_url TEXT,
    request_method VARCHAR(10),
    request_data JSONB,
    user_agent TEXT,
    ip_address INET,
    severity VARCHAR(20) DEFAULT 'error', -- 'info', 'warning', 'error', 'critical'
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8️⃣ IMPORT/EXPORT & MARKETPLACE
-- =====================================================

-- Import/Export operations
CREATE TABLE IF NOT EXISTS import_export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL, -- 'import', 'export'
    data_type VARCHAR(100) NOT NULL, -- 'users', 'bookings', 'payments', etc.
    file_name VARCHAR(255),
    file_path TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
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

-- Marketplace preparation (vendors/tenants)
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

-- Add tenant_id to main tables for multi-tenancy
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE readers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

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

-- Soft delete indexes
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_deleted_at ON bookings(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_deleted_at ON reviews(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON payments(deleted_at) WHERE deleted_at IS NULL;

-- Search indexes
CREATE INDEX IF NOT EXISTS idx_users_search ON users USING gin(to_tsvector('english', coalesce(full_name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(phone, '')));
CREATE INDEX IF NOT EXISTS idx_bookings_search ON bookings USING gin(to_tsvector('english', coalesce(booking_code, '') || ' ' || coalesce(service_type, '')));

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
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_operations_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_saved_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentation_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_export_jobs ENABLE ROW LEVEL SECURITY;

-- Admin access policies (admins can see all data)
CREATE POLICY admin_audit_logs_policy ON admin_audit_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('super_admin', 'admin')
        )
    );

CREATE POLICY bulk_operations_policy ON bulk_operations_log
    FOR ALL USING (
        admin_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('super_admin', 'admin')
        )
    );

-- Similar policies for other tables...
CREATE POLICY admin_search_history_policy ON admin_search_history
    FOR ALL USING (admin_id = auth.uid());

CREATE POLICY admin_saved_filters_policy ON admin_saved_filters
    FOR ALL USING (admin_id = auth.uid());

CREATE POLICY admin_notification_rules_policy ON admin_notification_rules
    FOR ALL USING (admin_id = auth.uid());

CREATE POLICY admin_notification_channels_policy ON admin_notification_channels
    FOR ALL USING (admin_id = auth.uid());

-- =====================================================
-- INITIAL DATA SEEDING
-- =====================================================

-- Insert default permissions
INSERT INTO permissions (name, description, resource, action) VALUES
('users.create', 'Create new users', 'users', 'create'),
('users.read', 'View users', 'users', 'read'),
('users.update', 'Update user information', 'users', 'update'),
('users.delete', 'Delete users', 'users', 'delete'),
('users.bulk_operations', 'Perform bulk operations on users', 'users', 'bulk'),
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
('analytics.read', 'View analytics', 'analytics', 'read'),
('system.read', 'View system information', 'system', 'read'),
('system.update', 'Update system settings', 'system', 'update'),
('admin.undo', 'Undo admin actions', 'admin', 'undo'),
('admin.audit_logs', 'View audit logs', 'admin', 'audit_logs')
ON CONFLICT (name) DO NOTHING;

-- Insert default roles
INSERT INTO roles (name, description, is_default) VALUES
('super_admin', 'Full system access with all permissions', false),
('admin', 'Standard admin with most permissions', true),
('moderator', 'Limited admin access for content moderation', false),
('support', 'Customer support with read-only access', false)
ON CONFLICT (name) DO NOTHING;

-- Assign all permissions to super_admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign most permissions to admin role (excluding system updates)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
AND p.name NOT IN ('system.update')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Insert default documentation entries
INSERT INTO documentation_entries (page_key, title, content, content_ar, category) VALUES
('admin_dashboard', 'Admin Dashboard Overview', 'Welcome to the SAMIA TAROT admin dashboard. This is your central hub for managing the platform.', 'مرحباً بك في لوحة تحكم إدارة سامية تاروت. هذا هو المركز الرئيسي لإدارة المنصة.', 'dashboard'),
('user_management', 'User Management Guide', 'Learn how to manage users, roles, and permissions in the system.', 'تعلم كيفية إدارة المستخدمين والأدوار والصلاحيات في النظام.', 'users'),
('bulk_operations', 'Bulk Operations Guide', 'How to perform bulk operations safely and efficiently.', 'كيفية تنفيذ العمليات المجمعة بأمان وكفاءة.', 'operations')
ON CONFLICT (page_key) DO NOTHING;

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to log admin actions automatically
CREATE OR REPLACE FUNCTION log_admin_action()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert audit log entry
    INSERT INTO admin_audit_logs (
        admin_id,
        action_type,
        table_name,
        record_ids,
        old_data,
        new_data,
        metadata
    ) VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN ARRAY[OLD.id]
            ELSE ARRAY[NEW.id]
        END,
        CASE 
            WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
            WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD)
            ELSE NULL
        END,
        CASE 
            WHEN TG_OP = 'DELETE' THEN NULL
            ELSE to_jsonb(NEW)
        END,
        jsonb_build_object('trigger_name', TG_NAME)
    );
    
    RETURN CASE 
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for audit logging on main tables
DROP TRIGGER IF EXISTS audit_users_trigger ON users;
CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION log_admin_action();

DROP TRIGGER IF EXISTS audit_bookings_trigger ON bookings;
CREATE TRIGGER audit_bookings_trigger
    AFTER INSERT OR UPDATE OR DELETE ON bookings
    FOR EACH ROW EXECUTE FUNCTION log_admin_action();

DROP TRIGGER IF EXISTS audit_reviews_trigger ON reviews;
CREATE TRIGGER audit_reviews_trigger
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW EXECUTE FUNCTION log_admin_action();

DROP TRIGGER IF EXISTS audit_payments_trigger ON payments;
CREATE TRIGGER audit_payments_trigger
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION log_admin_action();

-- Function to update analytics cache
CREATE OR REPLACE FUNCTION refresh_analytics_cache()
RETURNS void AS $$
BEGIN
    -- Delete expired cache entries
    DELETE FROM admin_analytics_cache WHERE expires_at < NOW();
    
    -- Update user metrics
    INSERT INTO admin_analytics_cache (metric_name, metric_value, time_period, metric_data)
    VALUES 
        ('total_users', (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL), 'all_time', '{}'),
        ('total_bookings', (SELECT COUNT(*) FROM bookings WHERE deleted_at IS NULL), 'all_time', '{}'),
        ('total_revenue', (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed'), 'all_time', '{}'),
        ('users_today', (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE AND deleted_at IS NULL), 'today', '{}'),
        ('bookings_today', (SELECT COUNT(*) FROM bookings WHERE created_at >= CURRENT_DATE AND deleted_at IS NULL), 'today', '{}'),
        ('revenue_today', (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE created_at >= CURRENT_DATE AND status = 'completed'), 'today', '{}')
    ON CONFLICT (metric_name, time_period) 
    DO UPDATE SET 
        metric_value = EXCLUDED.metric_value,
        calculated_at = NOW(),
        expires_at = NOW() + INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT; 