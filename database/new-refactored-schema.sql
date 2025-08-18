-- ============================================================================
-- SAMIA TAROT - REFACTORED DATABASE SCHEMA
-- Complete separation of System Secrets and Bilingual Settings
-- ============================================================================
-- Date: 2025-07-13
-- Purpose: Clean architecture with proper separation of concerns
-- Security: Enhanced encryption, audit trails, role-based access
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. SYSTEM SECRETS MANAGEMENT
-- All sensitive data, API keys, and credentials
-- ============================================================================

-- Core secrets table - encrypted storage only
CREATE TABLE IF NOT EXISTS system_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Secret Identity
    secret_key VARCHAR(100) NOT NULL UNIQUE,
    secret_category VARCHAR(50) NOT NULL CHECK (secret_category IN (
        'infrastructure', 'ai_services', 'payments', 'communications', 'communication',
        'security', 'analytics', 'storage', 'integrations', 'system'
    )),
    secret_subcategory VARCHAR(50),
    
    -- Secret Value (always encrypted)
    secret_value_encrypted TEXT NOT NULL,
    secret_salt VARCHAR(100) NOT NULL,
    encryption_method VARCHAR(50) DEFAULT 'AES-256-GCM',
    
    -- Metadata
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    provider_name VARCHAR(100), -- Associated provider name
    
    -- Security & Access
    access_level VARCHAR(20) DEFAULT 'super_admin' CHECK (access_level IN ('super_admin')),
    is_required BOOLEAN DEFAULT false,
    requires_restart BOOLEAN DEFAULT false,
    last_tested_at TIMESTAMP WITH TIME ZONE,
    test_status VARCHAR(20) DEFAULT 'untested' CHECK (test_status IN ('untested', 'valid', 'invalid', 'expired')),
    
    -- Environment
    environment VARCHAR(20) DEFAULT 'all' CHECK (environment IN ('development', 'staging', 'production', 'all')),
    is_active BOOLEAN DEFAULT true,
    
    -- Audit Trail
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    accessed_by UUID REFERENCES profiles(id),
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Secrets access log - comprehensive audit trail
CREATE TABLE IF NOT EXISTS secrets_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    secret_id UUID REFERENCES system_secrets(id) ON DELETE CASCADE,
    accessed_by UUID REFERENCES profiles(id),
    access_type VARCHAR(30) NOT NULL CHECK (access_type IN (
        'read', 'decrypt', 'update', 'delete', 'test', 'export', 'import'
    )),
    access_method VARCHAR(50) NOT NULL, -- 'api', 'dashboard', 'system', 'backup'
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. PROVIDER MANAGEMENT SYSTEM
-- All AI, translation, and service providers
-- ============================================================================

-- Master providers table
CREATE TABLE IF NOT EXISTS providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Provider Identity
    provider_key VARCHAR(100) NOT NULL UNIQUE,
    provider_name VARCHAR(200) NOT NULL,
    provider_type VARCHAR(50) NOT NULL CHECK (provider_type IN (
        'ai_language', 'ai_tts', 'ai_vision', 'translation', 'storage', 
        'payment', 'communication', 'analytics', 'monitoring'
    )),
    
    -- Provider Details
    company_name VARCHAR(200),
    homepage_url TEXT,
    documentation_url TEXT,
    api_base_url TEXT,
    
    -- Capabilities
    supported_languages TEXT[] DEFAULT '{}',
    supported_features TEXT[] DEFAULT '{}',
    
    -- Technical Specs
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_hour INTEGER DEFAULT 3600,
    max_requests_per_day INTEGER,
    timeout_seconds INTEGER DEFAULT 30,
    
    -- Pricing (per request or per 1K tokens)
    pricing_model VARCHAR(30) DEFAULT 'per_request' CHECK (pricing_model IN ('per_request', 'per_token', 'subscription', 'free')),
    cost_per_request DECIMAL(10,6) DEFAULT 0,
    cost_per_1k_tokens DECIMAL(10,6) DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    health_status VARCHAR(20) DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'down', 'unknown', 'success', 'failed', 'untested')),
    last_health_check TIMESTAMP WITH TIME ZONE,
    
    -- Configuration Schema
    config_schema JSONB DEFAULT '{}',
    default_config JSONB DEFAULT '{}',
    
    -- Metadata
    description TEXT,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    
    -- Audit
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Provider configurations (non-sensitive settings)
CREATE TABLE IF NOT EXISTS provider_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    
    -- Configuration
    config_key VARCHAR(100) NOT NULL,
    config_value JSONB NOT NULL,
    config_type VARCHAR(30) DEFAULT 'setting' CHECK (config_type IN ('setting', 'parameter', 'feature_flag', 'limit')),
    
    -- Metadata
    display_name VARCHAR(200),
    description TEXT,
    is_required BOOLEAN DEFAULT false,
    is_user_configurable BOOLEAN DEFAULT false,
    
    -- Validation
    validation_rules JSONB DEFAULT '{}',
    default_value JSONB,
    
    -- Environment
    environment VARCHAR(20) DEFAULT 'all' CHECK (environment IN ('development', 'staging', 'production', 'all')),
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(provider_id, config_key, environment)
);

-- ============================================================================
-- 3. BILINGUAL SETTINGS SYSTEM
-- Pure translation and language configuration (no secrets)
-- ============================================================================

-- Translation system settings
CREATE TABLE IF NOT EXISTS translation_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Setting Identity
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_category VARCHAR(50) NOT NULL CHECK (setting_category IN (
        'general', 'providers', 'quality', 'caching', 'fallback', 'analytics'
    )),
    
    -- Setting Value
    setting_value JSONB NOT NULL,
    setting_type VARCHAR(30) DEFAULT 'config' CHECK (setting_type IN ('config', 'mode', 'threshold', 'toggle')),
    
    -- Metadata
    display_name_en VARCHAR(200) NOT NULL,
    display_name_ar VARCHAR(200) NOT NULL,
    description_en TEXT,
    description_ar TEXT,
    
    -- Configuration
    is_user_configurable BOOLEAN DEFAULT true,
    is_required BOOLEAN DEFAULT false,
    default_value JSONB,
    validation_rules JSONB DEFAULT '{}',
    
    -- UI Display
    ui_component VARCHAR(50) DEFAULT 'input' CHECK (ui_component IN ('input', 'select', 'toggle', 'slider', 'textarea')),
    ui_options JSONB DEFAULT '{}',
    display_order INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);

-- Translation provider assignments (links to providers table)
CREATE TABLE IF NOT EXISTS translation_provider_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Provider Assignment
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    assignment_type VARCHAR(30) NOT NULL CHECK (assignment_type IN ('primary', 'secondary', 'fallback')),
    
    -- Assignment Details
    is_default BOOLEAN DEFAULT false,
    priority_order INTEGER DEFAULT 0,
    
    -- Language Support
    supported_source_languages TEXT[] DEFAULT '{}',
    supported_target_languages TEXT[] DEFAULT '{}',
    
    -- Quality & Performance
    quality_score DECIMAL(3,2) DEFAULT 0.80, -- 0.00 to 1.00
    average_response_time_ms INTEGER DEFAULT 1000,
    success_rate DECIMAL(3,2) DEFAULT 0.95,
    
    -- Retry Configuration
    max_retries INTEGER DEFAULT 3,
    retry_delay_seconds INTEGER DEFAULT 2,
    enable_fallback BOOLEAN DEFAULT true,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(provider_id, assignment_type)
);

-- ============================================================================
-- 4. SYSTEM INTEGRATION ASSIGNMENTS
-- Feature-to-provider mappings
-- ============================================================================

-- Feature assignments (what provider handles what)
CREATE TABLE IF NOT EXISTS feature_provider_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Feature Identity
    feature_name VARCHAR(100) NOT NULL,
    feature_category VARCHAR(50) NOT NULL CHECK (feature_category IN (
        'translation', 'tts', 'ai_chat', 'ai_reading', 'image_generation', 
        'content_moderation', 'analytics', 'storage', 'communication'
    )),
    
    -- Provider Assignment
    primary_provider_id UUID REFERENCES providers(id),
    backup_provider_id UUID REFERENCES providers(id),
    
    -- Configuration
    feature_config JSONB DEFAULT '{}',
    
    -- Failover Settings
    enable_failover BOOLEAN DEFAULT true,
    max_retries INTEGER DEFAULT 3,
    retry_delay_seconds INTEGER DEFAULT 5,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(feature_name)
);

-- ============================================================================
-- 5. ANALYTICS & MONITORING
-- Usage tracking and performance monitoring
-- ============================================================================

-- Provider usage analytics
CREATE TABLE IF NOT EXISTS provider_usage_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Provider & Feature
    provider_id UUID REFERENCES providers(id),
    feature_name VARCHAR(100),
    
    -- Request Details
    request_type VARCHAR(50) DEFAULT 'api_call',
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    
    -- Performance Metrics
    response_time_ms INTEGER,
    success BOOLEAN DEFAULT false,
    error_code VARCHAR(50),
    error_message TEXT,
    
    -- Usage Context
    user_id UUID REFERENCES profiles(id),
    session_id VARCHAR(100),
    ip_address INET,
    
    -- Billing
    tokens_used INTEGER DEFAULT 0,
    estimated_cost DECIMAL(10,6) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System health monitoring
CREATE TABLE IF NOT EXISTS system_health_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Check Details
    check_type VARCHAR(50) NOT NULL CHECK (check_type IN (
        'provider_health', 'secret_validation', 'service_availability', 'performance_check'
    )),
    target_id UUID, -- provider_id or secret_id
    target_type VARCHAR(50),
    
    -- Results
    status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'degraded', 'down', 'error')),
    response_time_ms INTEGER,
    error_message TEXT,
    
    -- Metadata
    check_details JSONB DEFAULT '{}',
    performed_by VARCHAR(50) DEFAULT 'system',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 6. SECURITY & AUDIT ENHANCEMENTS
-- ============================================================================

-- Enhanced audit log for all system changes
CREATE TABLE IF NOT EXISTS system_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Action Details
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'secret_created', 'secret_updated', 'secret_deleted', 'secret_accessed',
        'provider_created', 'provider_updated', 'provider_deleted',
        'setting_updated', 'assignment_changed', 'config_updated',
        'backup_created', 'backup_restored', 'system_health_check'
    )),
    
    -- Target Information
    target_type VARCHAR(50) NOT NULL,
    target_id UUID,
    target_name VARCHAR(200),
    
    -- Actor Information
    actor_id UUID REFERENCES profiles(id),
    actor_role VARCHAR(50),
    
    -- Change Details
    old_values JSONB DEFAULT '{}',
    new_values JSONB DEFAULT '{}',
    change_description TEXT,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================================================

-- System Secrets indexes
CREATE INDEX IF NOT EXISTS idx_system_secrets_category ON system_secrets(secret_category);
CREATE INDEX IF NOT EXISTS idx_system_secrets_active ON system_secrets(is_active);
CREATE INDEX IF NOT EXISTS idx_system_secrets_provider ON system_secrets(provider_name);
CREATE INDEX IF NOT EXISTS idx_system_secrets_test_status ON system_secrets(test_status);

-- Provider indexes
CREATE INDEX IF NOT EXISTS idx_providers_type ON providers(provider_type);
CREATE INDEX IF NOT EXISTS idx_providers_active ON providers(is_active);
CREATE INDEX IF NOT EXISTS idx_providers_health ON providers(health_status);

-- Translation Settings indexes
CREATE INDEX IF NOT EXISTS idx_translation_settings_category ON translation_settings(setting_category);
CREATE INDEX IF NOT EXISTS idx_translation_settings_active ON translation_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_translation_settings_order ON translation_settings(display_order);

-- Provider Assignments indexes
CREATE INDEX IF NOT EXISTS idx_provider_assignments_provider ON translation_provider_assignments(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_assignments_type ON translation_provider_assignments(assignment_type);
CREATE INDEX IF NOT EXISTS idx_provider_assignments_active ON translation_provider_assignments(is_active);

-- Feature Assignments indexes  
CREATE INDEX IF NOT EXISTS idx_feature_assignments_feature ON feature_provider_assignments(feature_name);
CREATE INDEX IF NOT EXISTS idx_feature_assignments_category ON feature_provider_assignments(feature_category);
CREATE INDEX IF NOT EXISTS idx_feature_assignments_provider ON feature_provider_assignments(primary_provider_id);

-- Provider Usage Analytics indexes
CREATE INDEX IF NOT EXISTS idx_provider_usage_provider_id ON provider_usage_analytics(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_usage_created_at ON provider_usage_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_provider_usage_success ON provider_usage_analytics(success);

-- System Health Checks indexes
CREATE INDEX IF NOT EXISTS idx_health_checks_target ON system_health_checks(target_id, target_type);
CREATE INDEX IF NOT EXISTS idx_health_checks_created_at ON system_health_checks(created_at);
CREATE INDEX IF NOT EXISTS idx_health_checks_status ON system_health_checks(status);

-- System Audit Log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_action_type ON system_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON system_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON system_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON system_audit_log(target_type, target_id);

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE system_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE secrets_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_provider_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_provider_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Super Admin only for sensitive operations
CREATE POLICY "Super Admin Full Access - Secrets" ON system_secrets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'super_admin'
        )
    );

CREATE POLICY "Super Admin Full Access - Providers" ON providers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('super_admin', 'admin')
        )
    );

CREATE POLICY "Admin Read Access - Settings" ON translation_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('super_admin', 'admin')
        )
    );

CREATE POLICY "Super Admin Write Access - Settings" ON translation_settings
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'super_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'super_admin'
        )
    );

-- ============================================================================
-- 9. UTILITY FUNCTIONS
-- ============================================================================

-- Function to encrypt secrets
CREATE OR REPLACE FUNCTION encrypt_secret(secret_value TEXT, salt_value TEXT DEFAULT NULL)
RETURNS TABLE(encrypted_value TEXT, salt_used TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    final_salt TEXT;
BEGIN
    -- Generate salt if not provided
    IF salt_value IS NULL THEN
        final_salt := gen_salt('bf', 12);
    ELSE
        final_salt := salt_value;
    END IF;
    
    -- Encrypt the value
    RETURN QUERY SELECT 
        crypt(secret_value, final_salt) as encrypted_value,
        final_salt as salt_used;
END;
$$;

-- Function to decrypt secrets (super admin only)
CREATE OR REPLACE FUNCTION decrypt_secret(encrypted_value TEXT, salt_value TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    decrypted_value TEXT;
    user_role TEXT;
BEGIN
    -- Check user role
    SELECT role INTO user_role 
    FROM profiles 
    WHERE id = auth.uid();
    
    -- Only super_admin can decrypt
    IF user_role != 'super_admin' THEN
        RAISE EXCEPTION 'Access denied: Only super_admin can decrypt secrets';
    END IF;
    
    -- Decrypt the value (simplified - in production use proper decryption)
    -- This is a placeholder - implement proper AES-256-GCM decryption
    decrypted_value := encrypted_value;
    
    -- Log access
    INSERT INTO secrets_access_log (
        secret_id, accessed_by, access_type, access_method, success
    ) VALUES (
        NULL, auth.uid(), 'decrypt', 'function', true
    );
    
    RETURN decrypted_value;
END;
$$;

-- Function to get translation setting
CREATE OR REPLACE FUNCTION get_translation_setting(setting_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    setting_value JSONB;
BEGIN
    SELECT ts.setting_value INTO setting_value
    FROM translation_settings ts
    WHERE ts.setting_key = get_translation_setting.setting_key
    AND ts.is_active = true;
    
    RETURN COALESCE(setting_value, '{}');
END;
$$;

-- Function to get active provider by type
CREATE OR REPLACE FUNCTION get_active_provider_by_type(p_type TEXT)
RETURNS TABLE(
    provider_id UUID,
    provider_key TEXT,
    provider_name TEXT,
    api_base_url TEXT,
    default_config JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.provider_key,
        p.provider_name,
        p.api_base_url,
        p.default_config
    FROM providers p
    WHERE p.provider_type = p_type
    AND p.is_active = true
    AND p.health_status IN ('healthy', 'unknown')
    ORDER BY p.created_at
    LIMIT 1;
END;
$$;

-- ============================================================================
-- 10. TRIGGERS
-- ============================================================================

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp trigger to all tables
CREATE TRIGGER trigger_update_timestamp_secrets
    BEFORE UPDATE ON system_secrets
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_timestamp_providers
    BEFORE UPDATE ON providers
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_timestamp_translation_settings
    BEFORE UPDATE ON translation_settings
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Audit trigger for sensitive operations
CREATE OR REPLACE FUNCTION audit_sensitive_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log all changes to secrets
    IF TG_TABLE_NAME = 'system_secrets' THEN
        INSERT INTO system_audit_log (
            action_type, target_type, target_id, target_name,
            actor_id, old_values, new_values, change_description
        ) VALUES (
            CASE TG_OP
                WHEN 'INSERT' THEN 'secret_created'
                WHEN 'UPDATE' THEN 'secret_updated'
                WHEN 'DELETE' THEN 'secret_deleted'
            END,
            'system_secret',
            COALESCE(NEW.id, OLD.id),
            COALESCE(NEW.secret_key, OLD.secret_key),
            auth.uid(),
            CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE '{}' END,
            CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE '{}' END,
            'Automated audit log entry'
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger
CREATE TRIGGER trigger_audit_secrets
    AFTER INSERT OR UPDATE OR DELETE ON system_secrets
    FOR EACH ROW EXECUTE FUNCTION audit_sensitive_changes();

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================

COMMIT; 