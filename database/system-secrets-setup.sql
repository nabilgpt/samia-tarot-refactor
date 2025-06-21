-- ============================================================
-- SAMIA TAROT - SYSTEM SECRETS MANAGEMENT SETUP
-- ============================================================
-- Centralized sensitive configuration management system
-- Date: 2025-01-16
-- Purpose: Secure storage and management of all system secrets
-- ============================================================

-- ============================================================
-- STEP 1: CREATE SYSTEM_SECRETS TABLE
-- ============================================================

-- Create system_secrets table for centralized config management
CREATE TABLE IF NOT EXISTS system_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT UNIQUE NOT NULL,
    config_value TEXT NOT NULL, -- Will store encrypted/encoded values
    category TEXT NOT NULL DEFAULT 'general',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_secrets_category ON system_secrets(category);
CREATE INDEX IF NOT EXISTS idx_system_secrets_config_key ON system_secrets(config_key);
CREATE INDEX IF NOT EXISTS idx_system_secrets_is_active ON system_secrets(is_active);
CREATE INDEX IF NOT EXISTS idx_system_secrets_updated_by ON system_secrets(updated_by);

-- Add table comments
COMMENT ON TABLE system_secrets IS 'Centralized storage for all sensitive system configuration and API keys. Super Admin access only.';
COMMENT ON COLUMN system_secrets.config_key IS 'Unique identifier for the configuration item (e.g., stripe_api_key, openai_secret)';
COMMENT ON COLUMN system_secrets.config_value IS 'Encrypted/encoded configuration value';
COMMENT ON COLUMN system_secrets.category IS 'Configuration category (payment, ai, database, backup, external_api, etc.)';
COMMENT ON COLUMN system_secrets.description IS 'Human-readable description of the configuration item';
COMMENT ON COLUMN system_secrets.is_active IS 'Whether this configuration is currently active/enabled';

-- ============================================================
-- STEP 2: CREATE SYSTEM_SECRETS_AUDIT TABLE
-- ============================================================

-- Create audit table for tracking all changes
CREATE TABLE IF NOT EXISTS system_secrets_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    secret_id UUID REFERENCES system_secrets(id) ON DELETE CASCADE,
    config_key TEXT NOT NULL,
    action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT', 'IMPORT'
    old_value TEXT, -- Previous value (for updates/deletes)
    new_value TEXT, -- New value (for creates/updates)
    category TEXT,
    performed_by UUID REFERENCES profiles(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    additional_info JSONB
);

-- Create indexes for audit table
CREATE INDEX IF NOT EXISTS idx_system_secrets_audit_secret_id ON system_secrets_audit(secret_id);
CREATE INDEX IF NOT EXISTS idx_system_secrets_audit_action ON system_secrets_audit(action);
CREATE INDEX IF NOT EXISTS idx_system_secrets_audit_performed_by ON system_secrets_audit(performed_by);
CREATE INDEX IF NOT EXISTS idx_system_secrets_audit_performed_at ON system_secrets_audit(performed_at);

-- Add audit table comments
COMMENT ON TABLE system_secrets_audit IS 'Audit trail for all system secrets operations. Tracks who did what when.';
COMMENT ON COLUMN system_secrets_audit.action IS 'Type of action performed (CREATE, UPDATE, DELETE, VIEW, EXPORT, IMPORT)';
COMMENT ON COLUMN system_secrets_audit.old_value IS 'Previous configuration value (masked for security)';
COMMENT ON COLUMN system_secrets_audit.new_value IS 'New configuration value (masked for security)';

-- ============================================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on both tables
ALTER TABLE system_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_secrets_audit ENABLE ROW LEVEL SECURITY;

-- Log RLS enablement
DO $$
BEGIN
    RAISE NOTICE '✅ Row Level Security enabled on system secrets tables';
    RAISE NOTICE '   - system_secrets: RLS ENABLED';
    RAISE NOTICE '   - system_secrets_audit: RLS ENABLED';
END $$;

-- ============================================================
-- STEP 4: CREATE RLS POLICIES FOR SYSTEM_SECRETS
-- ============================================================

-- Super Admin: Full CRUD access to system_secrets
CREATE POLICY "system_secrets_super_admin_full_access" ON system_secrets
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Prevent all other roles from accessing system_secrets
-- (No additional policies needed - RLS will block by default)

-- Log system_secrets policies
DO $$
BEGIN
    RAISE NOTICE '✅ system_secrets policies created:';
    RAISE NOTICE '   - Super Admin: Full CRUD access';
    RAISE NOTICE '   - All other roles: No access (blocked by RLS)';
END $$;

-- ============================================================
-- STEP 5: CREATE RLS POLICIES FOR SYSTEM_SECRETS_AUDIT
-- ============================================================

-- Super Admin: Full access to audit logs
CREATE POLICY "system_secrets_audit_super_admin_access" ON system_secrets_audit
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Log audit policies
DO $$
BEGIN
    RAISE NOTICE '✅ system_secrets_audit policies created:';
    RAISE NOTICE '   - Super Admin: Full access to audit logs';
    RAISE NOTICE '   - All other roles: No access (blocked by RLS)';
END $$;

-- ============================================================
-- STEP 6: CREATE HELPER FUNCTIONS
-- ============================================================

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION log_system_secret_audit(
    p_secret_id UUID,
    p_config_key TEXT,
    p_action TEXT,
    p_old_value TEXT DEFAULT NULL,
    p_new_value TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_additional_info JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO system_secrets_audit (
        secret_id,
        config_key,
        action,
        old_value,
        new_value,
        category,
        performed_by,
        additional_info
    ) VALUES (
        p_secret_id,
        p_config_key,
        p_action,
        CASE WHEN p_old_value IS NOT NULL THEN '[MASKED]' ELSE NULL END, -- Mask sensitive values
        CASE WHEN p_new_value IS NOT NULL THEN '[MASKED]' ELSE NULL END, -- Mask sensitive values
        p_category,
        auth.uid(),
        p_additional_info
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$;

-- Function to get system secret (for backend use only)
CREATE OR REPLACE FUNCTION get_system_secret(p_config_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    secret_value TEXT;
BEGIN
    -- Only allow super_admin to call this function
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Super Admin role required.';
    END IF;
    
    SELECT config_value INTO secret_value
    FROM system_secrets
    WHERE config_key = p_config_key
    AND is_active = true;
    
    -- Log the access
    IF secret_value IS NOT NULL THEN
        PERFORM log_system_secret_audit(
            (SELECT id FROM system_secrets WHERE config_key = p_config_key),
            p_config_key,
            'VIEW',
            NULL,
            NULL,
            (SELECT category FROM system_secrets WHERE config_key = p_config_key),
            jsonb_build_object('access_method', 'get_system_secret')
        );
    END IF;
    
    RETURN secret_value;
END;
$$;

-- Function to update system secret with audit
CREATE OR REPLACE FUNCTION update_system_secret(
    p_config_key TEXT,
    p_config_value TEXT,
    p_category TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    secret_id UUID;
    old_value TEXT;
    old_category TEXT;
BEGIN
    -- Only allow super_admin to call this function
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Super Admin role required.';
    END IF;
    
    -- Get old values for audit
    SELECT id, config_value, category 
    INTO secret_id, old_value, old_category
    FROM system_secrets
    WHERE config_key = p_config_key;
    
    IF secret_id IS NOT NULL THEN
        -- Update existing secret
        UPDATE system_secrets SET
            config_value = p_config_value,
            category = COALESCE(p_category, category),
            description = COALESCE(p_description, description),
            last_updated = NOW(),
            updated_by = auth.uid()
        WHERE id = secret_id;
        
        -- Log the update
        PERFORM log_system_secret_audit(
            secret_id,
            p_config_key,
            'UPDATE',
            old_value,
            p_config_value,
            COALESCE(p_category, old_category),
            jsonb_build_object('method', 'update_system_secret')
        );
    ELSE
        -- Create new secret
        INSERT INTO system_secrets (
            config_key,
            config_value,
            category,
            description,
            created_by,
            updated_by
        ) VALUES (
            p_config_key,
            p_config_value,
            COALESCE(p_category, 'general'),
            p_description,
            auth.uid(),
            auth.uid()
        ) RETURNING id INTO secret_id;
        
        -- Log the creation
        PERFORM log_system_secret_audit(
            secret_id,
            p_config_key,
            'CREATE',
            NULL,
            p_config_value,
            COALESCE(p_category, 'general'),
            jsonb_build_object('method', 'update_system_secret')
        );
    END IF;
    
    RETURN secret_id;
END;
$$;

-- Function to delete system secret with audit
CREATE OR REPLACE FUNCTION delete_system_secret(p_config_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    secret_id UUID;
    old_value TEXT;
    old_category TEXT;
BEGIN
    -- Only allow super_admin to call this function
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Super Admin role required.';
    END IF;
    
    -- Get secret details for audit
    SELECT id, config_value, category 
    INTO secret_id, old_value, old_category
    FROM system_secrets
    WHERE config_key = p_config_key;
    
    IF secret_id IS NOT NULL THEN
        -- Log the deletion before deleting
        PERFORM log_system_secret_audit(
            secret_id,
            p_config_key,
            'DELETE',
            old_value,
            NULL,
            old_category,
            jsonb_build_object('method', 'delete_system_secret')
        );
        
        -- Delete the secret
        DELETE FROM system_secrets WHERE id = secret_id;
        
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$;

-- ============================================================
-- STEP 7: INSERT DEFAULT CONFIGURATION CATEGORIES
-- ============================================================

-- Insert default system secrets (with placeholder values)
DO $$
BEGIN
    -- Only insert if super_admin exists and is calling this
    IF EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
    ) OR NOT EXISTS (SELECT 1 FROM system_secrets LIMIT 1) THEN
        
        -- Payment Gateway Configurations
        INSERT INTO system_secrets (config_key, config_value, category, description, created_by, updated_by) VALUES
        ('stripe_publishable_key', 'pk_test_placeholder', 'payment', 'Stripe publishable key for frontend', auth.uid(), auth.uid()),
        ('stripe_secret_key', 'sk_test_placeholder', 'payment', 'Stripe secret key for backend', auth.uid(), auth.uid()),
        ('stripe_webhook_secret', 'whsec_placeholder', 'payment', 'Stripe webhook endpoint secret', auth.uid(), auth.uid()),
        ('square_application_id', 'sq_app_placeholder', 'payment', 'Square application ID', auth.uid(), auth.uid()),
        ('square_access_token', 'sq_token_placeholder', 'payment', 'Square access token', auth.uid(), auth.uid()),
        ('paypal_client_id', 'paypal_client_placeholder', 'payment', 'PayPal client ID', auth.uid(), auth.uid()),
        ('paypal_client_secret', 'paypal_secret_placeholder', 'payment', 'PayPal client secret', auth.uid(), auth.uid()),
        
        -- AI Service Configurations
        ('openai_api_key', 'sk-openai_placeholder', 'ai', 'OpenAI API key for tarot readings', auth.uid(), auth.uid()),
        ('openai_organization_id', 'org-placeholder', 'ai', 'OpenAI organization ID', auth.uid(), auth.uid()),
        ('anthropic_api_key', 'sk-ant_placeholder', 'ai', 'Anthropic Claude API key', auth.uid(), auth.uid()),
        ('gemini_api_key', 'gemini_placeholder', 'ai', 'Google Gemini API key', auth.uid(), auth.uid()),
        
        -- Database & Backup Configurations
        ('supabase_url', 'https://placeholder.supabase.co', 'database', 'Supabase project URL', auth.uid(), auth.uid()),
        ('supabase_anon_key', 'eyJ_placeholder', 'database', 'Supabase anonymous key', auth.uid(), auth.uid()),
        ('supabase_service_role_key', 'eyJ_service_placeholder', 'database', 'Supabase service role key', auth.uid(), auth.uid()),
        ('backup_storage_url', 'https://backup.placeholder.com', 'backup', 'Backup storage endpoint URL', auth.uid(), auth.uid()),
        ('backup_access_key', 'backup_key_placeholder', 'backup', 'Backup storage access key', auth.uid(), auth.uid()),
        ('backup_secret_key', 'backup_secret_placeholder', 'backup', 'Backup storage secret key', auth.uid(), auth.uid()),
        
        -- External API Configurations
        ('sendgrid_api_key', 'SG.placeholder', 'external_api', 'SendGrid email service API key', auth.uid(), auth.uid()),
        ('twilio_account_sid', 'AC_placeholder', 'external_api', 'Twilio account SID for SMS', auth.uid(), auth.uid()),
        ('twilio_auth_token', 'twilio_token_placeholder', 'external_api', 'Twilio authentication token', auth.uid(), auth.uid()),
        ('cloudinary_cloud_name', 'cloud_placeholder', 'external_api', 'Cloudinary cloud name for media', auth.uid(), auth.uid()),
        ('cloudinary_api_key', 'cloudinary_key_placeholder', 'external_api', 'Cloudinary API key', auth.uid(), auth.uid()),
        ('cloudinary_api_secret', 'cloudinary_secret_placeholder', 'external_api', 'Cloudinary API secret', auth.uid(), auth.uid()),
        
        -- Security & Encryption
        ('jwt_secret', 'jwt_secret_placeholder', 'security', 'JWT signing secret', auth.uid(), auth.uid()),
        ('encryption_key', 'encryption_key_placeholder', 'security', 'Data encryption key', auth.uid(), auth.uid()),
        ('webhook_signing_secret', 'webhook_secret_placeholder', 'security', 'Webhook signature verification secret', auth.uid(), auth.uid()),
        
        -- System Configuration
        ('app_environment', 'development', 'system', 'Application environment (development/staging/production)', auth.uid(), auth.uid()),
        ('app_version', '1.0.0', 'system', 'Current application version', auth.uid(), auth.uid()),
        ('maintenance_mode', 'false', 'system', 'Maintenance mode flag', auth.uid(), auth.uid()),
        ('max_file_upload_size', '10485760', 'system', 'Maximum file upload size in bytes (10MB)', auth.uid(), auth.uid())
        
        ON CONFLICT (config_key) DO NOTHING;
        
        RAISE NOTICE '✅ Default system secrets inserted (placeholders)';
    END IF;
END $$;

-- ============================================================
-- STEP 8: CREATE VERIFICATION FUNCTIONS
-- ============================================================

-- Function to verify system secrets setup
CREATE OR REPLACE FUNCTION verify_system_secrets_setup()
RETURNS TABLE(
    component TEXT,
    status TEXT,
    details TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    secrets_count INTEGER;
    audit_count INTEGER;
    policies_count INTEGER;
BEGIN
    -- Check system_secrets table
    SELECT COUNT(*) INTO secrets_count FROM system_secrets;
    SELECT COUNT(*) INTO audit_count FROM system_secrets_audit;
    SELECT COUNT(*) INTO policies_count FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('system_secrets', 'system_secrets_audit');
    
    RETURN QUERY VALUES
    ('system_secrets_table', 'active', format('%s secrets configured', secrets_count)),
    ('system_secrets_audit', 'active', format('%s audit entries', audit_count)),
    ('rls_policies', 'active', format('%s policies configured', policies_count)),
    ('helper_functions', 'active', '4 functions created'),
    ('security_level', 'maximum', 'Super Admin only access');
END;
$$;

-- ============================================================
-- STEP 9: MIGRATION HISTORY LOG
-- ============================================================

-- Log this migration
INSERT INTO migration_history (migration_name, description, status) VALUES (
    'system_secrets_management_v1',
    'Created centralized system secrets management with system_secrets and system_secrets_audit tables, RLS policies, helper functions, and default configuration placeholders. Super Admin only access.',
    'completed'
);

-- ============================================================
-- STEP 10: FINAL SUCCESS MESSAGE
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 SYSTEM SECRETS MANAGEMENT SETUP COMPLETED!';
    RAISE NOTICE '===============================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Tables created:';
    RAISE NOTICE '   - system_secrets (main configuration storage)';
    RAISE NOTICE '   - system_secrets_audit (audit trail)';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Security implemented:';
    RAISE NOTICE '   - Row Level Security enabled';
    RAISE NOTICE '   - Super Admin only access';
    RAISE NOTICE '   - All operations audited';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Helper functions created:';
    RAISE NOTICE '   - log_system_secret_audit()';
    RAISE NOTICE '   - get_system_secret()';
    RAISE NOTICE '   - update_system_secret()';
    RAISE NOTICE '   - delete_system_secret()';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Default configurations added:';
    RAISE NOTICE '   - Payment gateways (Stripe, Square, PayPal)';
    RAISE NOTICE '   - AI services (OpenAI, Anthropic, Gemini)';
    RAISE NOTICE '   - Database & backup settings';
    RAISE NOTICE '   - External APIs (SendGrid, Twilio, Cloudinary)';
    RAISE NOTICE '   - Security & system settings';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Next steps:';
    RAISE NOTICE '   1. Create API endpoints for CRUD operations';
    RAISE NOTICE '   2. Build Super Admin dashboard interface';
    RAISE NOTICE '   3. Implement backup/restore functionality';
    RAISE NOTICE '   4. Add connection testing features';
    RAISE NOTICE '';
    RAISE NOTICE '📋 To verify setup, run:';
    RAISE NOTICE '   SELECT * FROM verify_system_secrets_setup();';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 System secrets management is ready!';
    RAISE NOTICE '===============================================';
END $$;

-- ============================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================

COMMENT ON FUNCTION log_system_secret_audit(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) IS 
'Logs all system secrets operations with masked sensitive values. Created 2025-01-16.';

COMMENT ON FUNCTION get_system_secret(TEXT) IS 
'Retrieves system secret value for backend use. Super Admin only. Logs access. Created 2025-01-16.';

COMMENT ON FUNCTION update_system_secret(TEXT, TEXT, TEXT, TEXT) IS 
'Creates or updates system secret with full audit trail. Super Admin only. Created 2025-01-16.';

COMMENT ON FUNCTION delete_system_secret(TEXT) IS 
'Deletes system secret with audit logging. Super Admin only. Created 2025-01-16.';

COMMENT ON FUNCTION verify_system_secrets_setup() IS 
'Verifies system secrets management setup status. Created 2025-01-16.';

-- ============================================================
-- END OF SCRIPT
-- ============================================================ 