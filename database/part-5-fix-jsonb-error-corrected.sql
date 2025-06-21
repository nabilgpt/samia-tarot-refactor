-- ============================================================
-- PART 5: FIX JSONB TYPE MISMATCH ERROR (CORRECTED)
-- Properly handle JSONB column insertions with correct casting
-- Fixed: Ensure table exists before inserting data
-- ============================================================

-- ============================================================
-- DROP AND RECREATE SYSTEM SETTINGS TABLE SAFELY
-- ============================================================
DROP TABLE IF EXISTS system_settings CASCADE;

CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Setting identification
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_category VARCHAR(50) NOT NULL,
    
    -- Setting value (properly typed as JSONB)
    value JSONB NOT NULL,
    
    -- Setting metadata
    display_name VARCHAR(200),
    description TEXT,
    data_type VARCHAR(50) DEFAULT 'string', -- string, number, boolean, array, object
    
    -- Validation and constraints
    is_required BOOLEAN DEFAULT false,
    validation_rules JSONB DEFAULT '{}'::jsonb,
    default_value JSONB DEFAULT 'null'::jsonb,
    
    -- Access control
    is_public BOOLEAN DEFAULT false,
    requires_admin BOOLEAN DEFAULT true,
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- INSERT SYSTEM SETTINGS DIRECTLY (NO FUNCTION NEEDED)
-- ============================================================

-- Database completion status (fix the original error)
INSERT INTO system_settings (
    setting_key, 
    setting_category, 
    value, 
    display_name, 
    description
) VALUES (
    'database_completion_status',
    'system',
    jsonb_build_object(
        'status', 'completed',
        'tables_created', 18,
        'version', '1.1',
        'completed_at', timezone('utc'::text, now())
    ),
    'Database Completion Status',
    'Tracks the completion status of database setup'
) ON CONFLICT (setting_key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = timezone('utc'::text, now());

-- AI system settings
INSERT INTO system_settings (setting_key, setting_category, value, display_name, description) VALUES 
('ai_default_model', 'ai', '"gpt-4"'::jsonb, 'Default AI Model', 'The default AI model to use for tarot readings')
ON CONFLICT (setting_key) DO UPDATE SET value = EXCLUDED.value, updated_at = timezone('utc'::text, now());

INSERT INTO system_settings (setting_key, setting_category, value, display_name, description) VALUES 
('ai_confidence_threshold', 'ai', '0.75'::jsonb, 'AI Confidence Threshold', 'Minimum confidence score for AI responses')
ON CONFLICT (setting_key) DO UPDATE SET value = EXCLUDED.value, updated_at = timezone('utc'::text, now());

-- Payment system settings
INSERT INTO system_settings (setting_key, setting_category, value, display_name, description) VALUES 
('payment_methods_enabled', 'payments', 
 jsonb_build_array('stripe', 'square', 'usdt', 'apple_pay', 'google_pay'), 
 'Enabled Payment Methods', 'List of currently enabled payment methods')
ON CONFLICT (setting_key) DO UPDATE SET value = EXCLUDED.value, updated_at = timezone('utc'::text, now());

-- Emergency system settings
INSERT INTO system_settings (setting_key, setting_category, value, display_name, description) VALUES 
('emergency_escalation_timeout', 'emergency', '300'::jsonb, 'Emergency Escalation Timeout', 'Time in seconds before emergency escalation triggers')
ON CONFLICT (setting_key) DO UPDATE SET value = EXCLUDED.value, updated_at = timezone('utc'::text, now());

-- Call system settings
INSERT INTO system_settings (setting_key, setting_category, value, display_name, description) VALUES 
('max_call_duration', 'calls', '7200'::jsonb, 'Maximum Call Duration', 'Maximum call duration in seconds (2 hours)')
ON CONFLICT (setting_key) DO UPDATE SET value = EXCLUDED.value, updated_at = timezone('utc'::text, now());

-- Platform settings
INSERT INTO system_settings (setting_key, setting_category, value, display_name, description) VALUES 
('platform_maintenance_mode', 'system', 'false'::jsonb, 'Maintenance Mode', 'Enable/disable platform maintenance mode')
ON CONFLICT (setting_key) DO UPDATE SET value = EXCLUDED.value, updated_at = timezone('utc'::text, now());

INSERT INTO system_settings (setting_key, setting_category, value, display_name, description) VALUES 
('max_concurrent_users', 'system', '1000'::jsonb, 'Max Concurrent Users', 'Maximum number of concurrent users allowed')
ON CONFLICT (setting_key) DO UPDATE SET value = EXCLUDED.value, updated_at = timezone('utc'::text, now());

-- Notification settings
INSERT INTO system_settings (setting_key, setting_category, value, display_name, description) VALUES 
('email_notifications_enabled', 'notifications', 'true'::jsonb, 'Email Notifications', 'Enable/disable email notifications')
ON CONFLICT (setting_key) DO UPDATE SET value = EXCLUDED.value, updated_at = timezone('utc'::text, now());

INSERT INTO system_settings (setting_key, setting_category, value, display_name, description) VALUES 
('sms_notifications_enabled', 'notifications', 'true'::jsonb, 'SMS Notifications', 'Enable/disable SMS notifications')
ON CONFLICT (setting_key) DO UPDATE SET value = EXCLUDED.value, updated_at = timezone('utc'::text, now());

-- ============================================================
-- INDEXES FOR SYSTEM SETTINGS
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(setting_category);
CREATE INDEX IF NOT EXISTS idx_system_settings_public ON system_settings(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

-- ============================================================
-- RLS POLICIES FOR SYSTEM SETTINGS
-- ============================================================
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Public settings can be read by anyone
DROP POLICY IF EXISTS "Anyone can read public settings" ON system_settings;
CREATE POLICY "Anyone can read public settings" ON system_settings
    FOR SELECT USING (is_public = true);

-- Admins can manage all settings
DROP POLICY IF EXISTS "Admins can manage all settings" ON system_settings;
CREATE POLICY "Admins can manage all settings" ON system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Users can read non-sensitive settings
DROP POLICY IF EXISTS "Users can read basic settings" ON system_settings;
CREATE POLICY "Users can read basic settings" ON system_settings
    FOR SELECT USING (
        setting_category IN ('ai', 'notifications') AND
        requires_admin = false
    );

-- ============================================================
-- CREATE UPDATE TRIGGER FOR SYSTEM SETTINGS
-- ============================================================
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_system_settings_updated_at();

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
SELECT 
    '✅ PART 5 COMPLETED: System Settings & JSONB Fixed (Corrected)' as status,
    'System settings table created with proper JSONB handling and 10 default settings' as result,
    (SELECT COUNT(*) FROM system_settings) as total_settings,
    timezone('utc'::text, now()) as completed_at; 