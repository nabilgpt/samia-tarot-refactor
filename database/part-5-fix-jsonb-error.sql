-- ============================================================
-- PART 5: FIX JSONB TYPE MISMATCH ERROR
-- Properly handle JSONB column insertions with correct casting
-- ============================================================

-- ============================================================
-- SYSTEM SETTINGS TABLE WITH PROPER JSONB HANDLING
-- ============================================================
CREATE TABLE IF NOT EXISTS system_settings (
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
-- FUNCTION TO SAFELY INSERT SYSTEM SETTINGS
-- ============================================================
CREATE OR REPLACE FUNCTION insert_system_setting(
    p_key VARCHAR(100),
    p_category VARCHAR(50),
    p_value JSONB,
    p_display_name VARCHAR(200) DEFAULT NULL,
    p_description TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO system_settings (
        setting_key, 
        setting_category, 
        value, 
        display_name, 
        description
    ) VALUES (
        p_key,
        p_category,
        p_value,
        p_display_name,
        p_description
    ) ON CONFLICT (setting_key) DO UPDATE SET
        value = EXCLUDED.value,
        display_name = COALESCE(EXCLUDED.display_name, system_settings.display_name),
        description = COALESCE(EXCLUDED.description, system_settings.description),
        updated_at = timezone('utc'::text, now());
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- INSERT SYSTEM SETTINGS WITH PROPER JSONB CASTING
-- ============================================================

-- Database completion status (fix the original error)
SELECT insert_system_setting(
    'database_completion_status',
    'system',
    jsonb_build_object(
        'status', 'completed',
        'tables_created', 18,
        'version', '1.1',
        'completed_at', timezone('utc'::text, now())
    )::jsonb,
    'Database Completion Status',
    'Tracks the completion status of database setup'
);

-- AI system settings
SELECT insert_system_setting(
    'ai_default_model',
    'ai',
    '"gpt-4"'::jsonb,
    'Default AI Model',
    'The default AI model to use for tarot readings'
);

SELECT insert_system_setting(
    'ai_confidence_threshold',
    'ai',
    '0.75'::jsonb,
    'AI Confidence Threshold',
    'Minimum confidence score for AI responses'
);

-- Payment system settings
SELECT insert_system_setting(
    'payment_methods_enabled',
    'payments',
    jsonb_build_array('stripe', 'square', 'usdt', 'apple_pay', 'google_pay'),
    'Enabled Payment Methods',
    'List of currently enabled payment methods'
);

-- Emergency system settings
SELECT insert_system_setting(
    'emergency_escalation_timeout',
    'emergency',
    '300'::jsonb,
    'Emergency Escalation Timeout',
    'Time in seconds before emergency escalation triggers'
);

-- Call system settings
SELECT insert_system_setting(
    'max_call_duration',
    'calls',
    '7200'::jsonb,
    'Maximum Call Duration',
    'Maximum call duration in seconds (2 hours)'
);

-- ============================================================
-- INDEXES FOR SYSTEM SETTINGS
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(setting_category);
CREATE INDEX IF NOT EXISTS idx_system_settings_public ON system_settings(is_public) WHERE is_public = true;

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

-- ============================================================
-- CLEAN UP FUNCTION
-- ============================================================
DROP FUNCTION IF EXISTS insert_system_setting(VARCHAR(100), VARCHAR(50), JSONB, VARCHAR(200), TEXT);

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
SELECT 
    '✅ PART 5 COMPLETED: JSONB Type Mismatch Fixed' as status,
    'System settings table created with proper JSONB handling' as result,
    timezone('utc'::text, now()) as completed_at; 