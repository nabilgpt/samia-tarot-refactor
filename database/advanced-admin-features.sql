-- =====================================================
-- SAMIA TAROT - ADVANCED ADMIN FEATURES DATABASE SCHEMA
-- =====================================================

-- 1. Quick Actions & Command Palette
CREATE TABLE IF NOT EXISTS admin_quick_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    search_query TEXT,
    target_entity_type VARCHAR(50),
    target_entity_id UUID,
    execution_time TIMESTAMP DEFAULT NOW(),
    response_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Live Activity Feed / System Timeline
CREATE TABLE IF NOT EXISTS system_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    actor_name VARCHAR(255),
    actor_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    entity_name VARCHAR(255),
    old_value JSONB,
    new_value JSONB,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    tenant_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Audit Logs & Undo Actions
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    before_state JSONB,
    after_state JSONB,
    changes_diff JSONB,
    is_undoable BOOLEAN DEFAULT false,
    is_undone BOOLEAN DEFAULT false,
    undo_admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    undo_timestamp TIMESTAMP,
    undo_reason TEXT,
    session_id VARCHAR(255),
    ip_address INET,
    tenant_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Notification Rules
CREATE TABLE IF NOT EXISTS admin_notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    channels JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1,
    execution_count INTEGER DEFAULT 0,
    last_executed TIMESTAMP,
    tenant_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Bulk Operations
CREATE TABLE IF NOT EXISTS bulk_operations_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    operation_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    total_items INTEGER NOT NULL,
    processed_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    file_path TEXT,
    error_log JSONB,
    metadata JSONB,
    tenant_id UUID,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- 6. Permissions & Roles
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    conditions JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT false,
    tenant_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. Documentation
CREATE TABLE IF NOT EXISTS documentation_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_path VARCHAR(255) NOT NULL,
    section_key VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'markdown',
    language VARCHAR(5) DEFAULT 'en',
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    tenant_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 8. AI Suggestions
CREATE TABLE IF NOT EXISTS ai_suggestion_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    suggestion_type VARCHAR(100) NOT NULL,
    context_entity_type VARCHAR(50),
    context_entity_id UUID,
    suggestion_data JSONB NOT NULL,
    confidence_score DECIMAL(3,2),
    action_taken VARCHAR(100),
    feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
    feedback_notes TEXT,
    tenant_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 9. Multi-Tenant Support
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    primary_domain VARCHAR(255),
    settings JSONB DEFAULT '{}',
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    limits JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 10. Referral System
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    referred_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    referral_code VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    points_awarded_referrer INTEGER DEFAULT 0,
    points_awarded_referred INTEGER DEFAULT 0,
    conversion_date TIMESTAMP,
    tenant_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Reward Settings
CREATE TABLE IF NOT EXISTS reward_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_type VARCHAR(100) NOT NULL,
    points_value INTEGER NOT NULL,
    conditions JSONB,
    is_active BOOLEAN DEFAULT true,
    tenant_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_log_actor ON system_activity_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON system_activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON system_activity_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON admin_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_undoable ON admin_audit_logs(is_undoable, is_undone);

CREATE INDEX IF NOT EXISTS idx_quick_actions_user ON admin_quick_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_rules_admin ON admin_notification_rules(admin_id);
CREATE INDEX IF NOT EXISTS idx_bulk_admin ON bulk_operations_log(admin_id);

-- Insert default permissions
INSERT INTO permissions (name, description, resource, action) VALUES
('users.read', 'View user profiles and data', 'users', 'read'),
('users.write', 'Create and edit user profiles', 'users', 'write'),
('users.delete', 'Delete user accounts', 'users', 'delete'),
('bookings.read', 'View booking information', 'bookings', 'read'),
('bookings.write', 'Create and modify bookings', 'bookings', 'write'),
('bookings.approve', 'Approve or reject bookings', 'bookings', 'approve'),
('payments.read', 'View payment information', 'payments', 'read'),
('payments.write', 'Process and modify payments', 'payments', 'write'),
('analytics.read', 'View analytics and reports', 'analytics', 'read'),
('system.admin', 'Full system administration access', 'system', 'admin')
ON CONFLICT (name) DO NOTHING;

-- Insert default roles
INSERT INTO roles (name, description, is_system_role) VALUES
('super_admin', 'Full system access', true),
('admin', 'Administrative access', true),
('moderator', 'Content moderation access', true),
('support', 'Customer support access', true)
ON CONFLICT (name) DO NOTHING; 