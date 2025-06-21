-- =====================================================
-- SAMIA TAROT - ADVANCED ADMIN FEATURES - PART 1 (FIXED)
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
    subcategory VARCHAR(100),
    tags TEXT[],
    search_keywords TEXT,
    difficulty_level VARCHAR(20) DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
    is_published BOOLEAN DEFAULT false,
    author_id UUID, -- Will reference auth.users(id) when available
    last_updated_by UUID, -- Will reference auth.users(id) when available
    version INTEGER DEFAULT 1,
    view_count INTEGER DEFAULT 0,
    helpful_votes INTEGER DEFAULT 0,
    unhelpful_votes INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User onboarding progress
CREATE TABLE IF NOT EXISTS user_onboarding_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- Will reference auth.users(id) when available
    step_name VARCHAR(100) NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, step_name)
);

-- Error logs for debugging
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- Will reference auth.users(id) when available
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    request_url TEXT,
    request_method VARCHAR(10),
    request_data JSONB,
    user_agent TEXT,
    ip_address INET,
    session_id VARCHAR(100),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID, -- Will reference auth.users(id) when available
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Import/Export jobs tracking
CREATE TABLE IF NOT EXISTS import_export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID, -- Will reference auth.users(id) when available
    job_type VARCHAR(20) NOT NULL CHECK (job_type IN ('import', 'export')),
    entity_type VARCHAR(100) NOT NULL, -- 'users', 'bookings', etc.
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    file_url TEXT,
    file_name VARCHAR(255),
    total_records INTEGER,
    processed_records INTEGER DEFAULT 0,
    error_records INTEGER DEFAULT 0,
    error_details JSONB,
    metadata JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7️⃣ MULTI-TENANCY (Future-proofing)
-- =====================================================

-- Tenants table for multi-tenancy support
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenant user mapping
CREATE TABLE IF NOT EXISTS tenant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID, -- Will reference auth.users(id) when available
    role VARCHAR(50) DEFAULT 'member',
    is_active BOOLEAN DEFAULT true,
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

-- Documentation indexes
CREATE INDEX IF NOT EXISTS idx_documentation_category ON documentation_entries(category);
CREATE INDEX IF NOT EXISTS idx_documentation_published ON documentation_entries(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_documentation_search ON documentation_entries USING gin(to_tsvector('english', title || ' ' || content));

-- Error logs indexes
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ ADVANCED ADMIN CORE TABLES SETUP COMPLETED SUCCESSFULLY!';
    RAISE NOTICE 'Created all admin tables, indexes, and constraints.';
END $$; 