-- ============================================================================
-- SAMIA TAROT - SETTINGS & SECRETS MANAGEMENT SYSTEM
-- Centralized configuration management with SuperAdmin Dashboard
-- ============================================================================
-- Date: 2025-01-16
-- Purpose: Replace .env files with secure database-driven configuration
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. SYSTEM_CONFIGURATIONS TABLE
-- Master table for all system configuration and secrets
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Configuration Identity
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_category VARCHAR(50) NOT NULL,
    config_subcategory VARCHAR(50),
    
    -- Configuration Value (encrypted for sensitive data)
    config_value_encrypted TEXT,
    config_value_plain TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    
    -- Configuration Metadata
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    data_type VARCHAR(20) DEFAULT 'string' CHECK (data_type IN ('string', 'number', 'boolean', 'json', 'array')),
    
    -- Security & Access
    is_sensitive BOOLEAN DEFAULT false,
    is_required BOOLEAN DEFAULT false,
    requires_restart BOOLEAN DEFAULT false,
    access_level VARCHAR(20) DEFAULT 'super_admin' CHECK (access_level IN ('public', 'admin', 'super_admin')),
    
    -- Validation
    validation_rules JSONB DEFAULT '{}',
    default_value TEXT,
    possible_values TEXT[], -- For dropdown/select options
    
    -- Environment & Status
    environment VARCHAR(20) DEFAULT 'all' CHECK (environment IN ('development', 'staging', 'production', 'all')),
    is_active BOOLEAN DEFAULT true,
    
    -- Audit Trail
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    last_accessed_by UUID REFERENCES profiles(id),
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. CONFIGURATION_CHANGE_LOG TABLE
-- Complete audit trail for all configuration changes
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuration_change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference to configuration
    config_id UUID NOT NULL REFERENCES system_configurations(id) ON DELETE CASCADE,
    config_key VARCHAR(100) NOT NULL,
    
    -- Change Details
    change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('create', 'update', 'delete', 'access', 'encrypt', 'decrypt')),
    old_value_hash TEXT, -- Hash of old value for comparison
    new_value_hash TEXT, -- Hash of new value for comparison
    
    -- Change Context
    changed_by UUID NOT NULL REFERENCES profiles(id),
    change_reason TEXT,
    ip_address INET,
    user_agent TEXT,
    
    -- Security
    requires_approval BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 3. CONFIGURATION_CATEGORIES TABLE
-- Predefined categories for organization
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuration_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_key VARCHAR(50) NOT NULL UNIQUE,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 4. CONFIGURATION_ACCESS_LOG TABLE
-- Track who accessed what configuration when
-- ============================================================================

CREATE TABLE IF NOT EXISTS configuration_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES system_configurations(id) ON DELETE CASCADE,
    config_key VARCHAR(100) NOT NULL,
    accessed_by UUID REFERENCES profiles(id), -- Made nullable for system access
    access_type VARCHAR(20) NOT NULL CHECK (access_type IN ('read', 'decrypt', 'export', 'system_read', 'system_decrypt')),
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    failure_reason TEXT,
    is_system_access BOOLEAN DEFAULT false, -- New column for system access tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 5. INDEXES FOR PERFORMANCE
-- ============================================================================

-- System Configurations
CREATE INDEX IF NOT EXISTS idx_system_configurations_category ON system_configurations(config_category);
CREATE INDEX IF NOT EXISTS idx_system_configurations_subcategory ON system_configurations(config_subcategory);
CREATE INDEX IF NOT EXISTS idx_system_configurations_sensitive ON system_configurations(is_sensitive);
CREATE INDEX IF NOT EXISTS idx_system_configurations_active ON system_configurations(is_active);
CREATE INDEX IF NOT EXISTS idx_system_configurations_environment ON system_configurations(environment);
CREATE INDEX IF NOT EXISTS idx_system_configurations_access_level ON system_configurations(access_level);

-- Change Log
CREATE INDEX IF NOT EXISTS idx_configuration_change_log_config_id ON configuration_change_log(config_id);
CREATE INDEX IF NOT EXISTS idx_configuration_change_log_changed_by ON configuration_change_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_configuration_change_log_created_at ON configuration_change_log(created_at);
CREATE INDEX IF NOT EXISTS idx_configuration_change_log_change_type ON configuration_change_log(change_type);

-- Access Log
CREATE INDEX IF NOT EXISTS idx_configuration_access_log_config_id ON configuration_access_log(config_id);
CREATE INDEX IF NOT EXISTS idx_configuration_access_log_accessed_by ON configuration_access_log(accessed_by);
CREATE INDEX IF NOT EXISTS idx_configuration_access_log_created_at ON configuration_access_log(created_at);

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE system_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuration_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuration_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuration_access_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Super Admin can manage all configurations" ON system_configurations;
DROP POLICY IF EXISTS "Admin can read non-sensitive configurations" ON system_configurations;
DROP POLICY IF EXISTS "Public configurations are readable by authenticated users" ON system_configurations;
DROP POLICY IF EXISTS "Super Admin can view all change logs" ON configuration_change_log;
DROP POLICY IF EXISTS "Users can view their own change logs" ON configuration_change_log;
DROP POLICY IF EXISTS "Anyone can read active categories" ON configuration_categories;
DROP POLICY IF EXISTS "Super Admin can manage categories" ON configuration_categories;
DROP POLICY IF EXISTS "Super Admin can view all access logs" ON configuration_access_log;
DROP POLICY IF EXISTS "Users can view their own access logs" ON configuration_access_log;

-- System Configurations Policies
CREATE POLICY "Super Admin can manage all configurations" ON system_configurations
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Admin can read non-sensitive configurations" ON system_configurations
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
        AND (access_level IN ('public', 'admin') OR 
             (access_level = 'super_admin' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')))
    );

CREATE POLICY "Public configurations are readable by authenticated users" ON system_configurations
    FOR SELECT USING (access_level = 'public' AND is_active = true);

-- Change Log Policies
CREATE POLICY "Super Admin can view all change logs" ON configuration_change_log
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Users can view their own change logs" ON configuration_change_log
    FOR SELECT USING (changed_by = auth.uid());

-- Categories Policies
CREATE POLICY "Anyone can read active categories" ON configuration_categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Super Admin can manage categories" ON configuration_categories
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- Access Log Policies (updated to handle system access)
CREATE POLICY "Super Admin can view all access logs" ON configuration_access_log
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Users can view their own access logs" ON configuration_access_log
    FOR SELECT USING (accessed_by = auth.uid() AND accessed_by IS NOT NULL);

CREATE POLICY "System can insert access logs" ON configuration_access_log
    FOR INSERT WITH CHECK (true); -- Allow system to insert logs

-- ============================================================================
-- 7. FUNCTIONS FOR CONFIGURATION MANAGEMENT
-- ============================================================================

-- Function to encrypt sensitive configuration values
CREATE OR REPLACE FUNCTION encrypt_config_value(
    p_config_key VARCHAR(100),
    p_value TEXT
) RETURNS TEXT AS $$
DECLARE
    v_encryption_key TEXT;
    v_encrypted_value TEXT;
BEGIN
    -- Get encryption key (in production, this should be from a secure key management service)
    v_encryption_key := 'samia_tarot_config_encryption_key_2025'; -- This should be from environment
    
    -- Encrypt the value
    v_encrypted_value := encode(
        encrypt(p_value::bytea, v_encryption_key::bytea, 'aes'),
        'base64'
    );
    
    RETURN v_encrypted_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt sensitive configuration values
CREATE OR REPLACE FUNCTION decrypt_config_value(
    p_config_key VARCHAR(100),
    p_encrypted_value TEXT
) RETURNS TEXT AS $$
DECLARE
    v_encryption_key TEXT;
    v_decrypted_value TEXT;
BEGIN
    -- Get encryption key
    v_encryption_key := 'samia_tarot_config_encryption_key_2025';
    
    -- Decrypt the value
    v_decrypted_value := convert_from(
        decrypt(decode(p_encrypted_value, 'base64'), v_encryption_key::bytea, 'aes'),
        'UTF8'
    );
    
    RETURN v_decrypted_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely get configuration value
CREATE OR REPLACE FUNCTION get_config_value(
    p_config_key VARCHAR(100)
) RETURNS TEXT AS $$
DECLARE
    v_config RECORD;
    v_user_role TEXT;
    v_decrypted_value TEXT;
BEGIN
    -- Get user role
    SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();
    
    -- Get configuration
    SELECT * INTO v_config 
    FROM system_configurations 
    WHERE config_key = p_config_key 
    AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- Check access permissions
    IF v_config.access_level = 'super_admin' AND v_user_role != 'super_admin' THEN
        RAISE EXCEPTION 'Access denied: Super Admin access required';
    END IF;
    
    IF v_config.access_level = 'admin' AND v_user_role NOT IN ('admin', 'super_admin') THEN
        RAISE EXCEPTION 'Access denied: Admin access required';
    END IF;
    
    -- Log access (only if user is authenticated)
    IF auth.uid() IS NOT NULL THEN
    INSERT INTO configuration_access_log (
        config_id, config_key, accessed_by, access_type
    ) VALUES (
        v_config.id, p_config_key, auth.uid(), 'read'
    );
    END IF;
    
    -- Return appropriate value
    IF v_config.is_encrypted THEN
        -- Log decryption access (only if user is authenticated)
        IF auth.uid() IS NOT NULL THEN
        INSERT INTO configuration_access_log (
            config_id, config_key, accessed_by, access_type
        ) VALUES (
            v_config.id, p_config_key, auth.uid(), 'decrypt'
            );
        END IF;
        
        RETURN decrypt_config_value(p_config_key, v_config.config_value_encrypted);
    ELSE
        RETURN v_config.config_value_plain;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get configuration value for system use (bypasses user auth)
CREATE OR REPLACE FUNCTION get_system_config_value(
    p_config_key VARCHAR(100)
) RETURNS TEXT AS $$
DECLARE
    v_config RECORD;
BEGIN
    -- Get configuration
    SELECT * INTO v_config 
    FROM system_configurations 
    WHERE config_key = p_config_key 
    AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- Log system access (no user required)
    INSERT INTO configuration_access_log (
        config_id, config_key, access_type, is_system_access
    ) VALUES (
        v_config.id, p_config_key, 'system_read', true
    );
    
    -- Return appropriate value
    IF v_config.is_encrypted THEN
        -- Log system decryption access
        INSERT INTO configuration_access_log (
            config_id, config_key, access_type, is_system_access
        ) VALUES (
            v_config.id, p_config_key, 'system_decrypt', true
        );
        
        RETURN decrypt_config_value(p_config_key, v_config.config_value_encrypted);
    ELSE
        RETURN v_config.config_value_plain;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely set configuration value
CREATE OR REPLACE FUNCTION set_config_value(
    p_config_key VARCHAR(100),
    p_value TEXT,
    p_change_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_config RECORD;
    v_user_role TEXT;
    v_old_value_hash TEXT;
    v_new_value_hash TEXT;
    v_encrypted_value TEXT;
BEGIN
    -- Get user role
    SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();
    
    -- Only super admin can modify configurations
    IF v_user_role != 'super_admin' THEN
        RAISE EXCEPTION 'Access denied: Only Super Admin can modify configurations';
    END IF;
    
    -- Get existing configuration
    SELECT * INTO v_config 
    FROM system_configurations 
    WHERE config_key = p_config_key;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Configuration key not found: %', p_config_key;
    END IF;
    
    -- Calculate hashes for audit
    IF v_config.is_encrypted THEN
        v_old_value_hash := encode(digest(v_config.config_value_encrypted, 'sha256'), 'hex');
        v_new_value_hash := encode(digest(p_value, 'sha256'), 'hex');
        v_encrypted_value := encrypt_config_value(p_config_key, p_value);
        
        -- Update encrypted value
        UPDATE system_configurations 
        SET 
            config_value_encrypted = v_encrypted_value,
            updated_by = auth.uid(),
            updated_at = NOW()
        WHERE config_key = p_config_key;
    ELSE
        v_old_value_hash := encode(digest(COALESCE(v_config.config_value_plain, ''), 'sha256'), 'hex');
        v_new_value_hash := encode(digest(p_value, 'sha256'), 'hex');
        
        -- Update plain value
        UPDATE system_configurations 
        SET 
            config_value_plain = p_value,
            updated_by = auth.uid(),
            updated_at = NOW()
        WHERE config_key = p_config_key;
    END IF;
    
    -- Log the change
    INSERT INTO configuration_change_log (
        config_id, config_key, change_type, old_value_hash, new_value_hash,
        changed_by, change_reason
    ) VALUES (
        v_config.id, p_config_key, 'update', v_old_value_hash, v_new_value_hash,
        auth.uid(), p_change_reason
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. TRIGGERS
-- ============================================================================

-- Update timestamp trigger for system_configurations
CREATE OR REPLACE FUNCTION update_configuration_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_configuration_timestamp ON system_configurations;
CREATE TRIGGER trigger_update_configuration_timestamp
    BEFORE UPDATE ON system_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_configuration_timestamp();

-- ============================================================================
-- 9. INSERT CONFIGURATION CATEGORIES
-- ============================================================================

INSERT INTO configuration_categories (category_key, category_name, description, icon, sort_order) VALUES
('infrastructure', 'Infrastructure', 'Core infrastructure settings (Database, Storage, etc.)', 'Database', 1),
('security', 'Security', 'Security and authentication settings', 'Shield', 2),
('payments', 'Payment Gateways', 'Payment processing and gateway configurations', 'CreditCard', 3),
('ai_services', 'AI Services', 'AI and machine learning service configurations', 'Brain', 4),
('communication', 'Communication', 'Email, SMS, and communication service settings', 'Mail', 5),
('notifications', 'Notifications', 'Push notifications and alert configurations', 'Bell', 6),
('analytics', 'Analytics & Monitoring', 'Analytics and monitoring service settings', 'BarChart', 7),
('emergency', 'Emergency System', 'Emergency call and escalation settings', 'AlertTriangle', 8),
('system', 'System Settings', 'General system and application settings', 'Settings', 9),
('development', 'Development', 'Development and debugging settings', 'Code', 10)
ON CONFLICT (category_key) DO NOTHING;

-- ============================================================================
-- 10. SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ SETTINGS & SECRETS MANAGEMENT SCHEMA CREATED SUCCESSFULLY';
    RAISE NOTICE '📊 Tables created: system_configurations, configuration_change_log, configuration_categories, configuration_access_log';
    RAISE NOTICE '🔐 Security: RLS enabled with role-based access control';
    RAISE NOTICE '🔧 Functions: encrypt_config_value, decrypt_config_value, get_config_value, set_config_value';
    RAISE NOTICE '📝 Next step: Insert default configuration values';
END $$;
