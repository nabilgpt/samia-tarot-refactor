-- ============================================================================
-- ADD OPENAI_API_KEY CONFIGURATION TO SYSTEM_CONFIGURATIONS TABLE
-- ============================================================================
-- This script adds the missing OPENAI_API_KEY configuration that the test endpoint expects

-- Insert OPENAI_API_KEY configuration
INSERT INTO system_configurations (
    config_key, 
    config_category, 
    config_subcategory, 
    display_name, 
    description,
    data_type, 
    is_sensitive, 
    is_encrypted, 
    is_required, 
    access_level,
    config_value_plain, 
    default_value, 
    environment,
    is_active
) VALUES (
    'OPENAI_API_KEY', 
    'ai_services', 
    'openai', 
    'OpenAI API Key', 
    'API key for OpenAI GPT models',
    'string', 
    true, 
    false, 
    false, 
    'super_admin',
    '', 
    'CONFIGURE_VIA_DASHBOARD', 
    'all',
    true
) ON CONFLICT (config_key) DO UPDATE SET
    updated_at = NOW();

-- Insert OPENAI_ORG_ID configuration
INSERT INTO system_configurations (
    config_key, 
    config_category, 
    config_subcategory, 
    display_name, 
    description,
    data_type, 
    is_sensitive, 
    is_encrypted, 
    is_required, 
    access_level,
    config_value_plain, 
    default_value, 
    environment,
    is_active
) VALUES (
    'OPENAI_ORG_ID', 
    'ai_services', 
    'openai', 
    'OpenAI Organization ID', 
    'Organization ID for OpenAI API (optional)',
    'string', 
    true, 
    false, 
    false, 
    'super_admin',
    '', 
    'CONFIGURE_VIA_DASHBOARD', 
    'all',
    true
) ON CONFLICT (config_key) DO UPDATE SET
    updated_at = NOW();

-- Verify the configurations were added
SELECT 
    config_key, 
    config_category, 
    display_name, 
    is_active,
    created_at
FROM system_configurations 
WHERE config_key IN ('OPENAI_API_KEY', 'OPENAI_ORG_ID')
ORDER BY config_key; 