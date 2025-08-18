-- Add Missing OPENAI_API_KEY Configuration (Final Version)
-- This script adds OPENAI_API_KEY with correct column names

-- Step 1: Add OPENAI_API_KEY configuration (OPENAI_ORG_ID already exists)
INSERT INTO system_configurations (
    id,
    config_key, 
    config_category, 
    config_subcategory,
    config_value_encrypted,
    config_value_plain,
    is_encrypted,
    display_name,
    description, 
    data_type,
    is_sensitive, 
    is_required,
    requires_restart,
    access_level,
    validation_rules,
    default_value,
    environment,
    is_active,
    display_name_ar,
    display_name_en,
    description_ar,
    description_en,
    created_at,
    updated_at
)
VALUES (
    gen_random_uuid(),
    'OPENAI_API_KEY', 
    'ai_services',
    'openai', 
    NULL,
    '',
    true,
    'OpenAI API Key',
    'OpenAI API key for GPT models', 
    'string',
    true, 
    false,
    false,
    'super_admin',
    '{}'::jsonb,
    'sk-your_openai_api_key',
    'all',
    true,
    'OpenAI API Key',
    'OpenAI API Key',
    'OpenAI API key for GPT models',
    'OpenAI API key for GPT models',
    NOW(),
    NOW()
)
ON CONFLICT (config_key) DO UPDATE SET
    config_category = EXCLUDED.config_category,
    config_subcategory = EXCLUDED.config_subcategory,
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    is_sensitive = EXCLUDED.is_sensitive,
    is_encrypted = EXCLUDED.is_encrypted,
    access_level = EXCLUDED.access_level,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Step 2: Verify the configuration was added
SELECT 
    config_key, 
    config_category, 
    config_subcategory,
    display_name,
    is_active
FROM system_configurations 
WHERE config_key IN ('OPENAI_API_KEY', 'OPENAI_ORG_ID')
ORDER BY config_key;

-- Step 3: Success message
SELECT 'OPENAI_API_KEY configuration added successfully!' as result; 