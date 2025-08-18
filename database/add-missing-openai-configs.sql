-- Add Missing OpenAI Configurations
-- This script adds OPENAI_API_KEY and OPENAI_ORG_ID to system_configurations table

-- Step 1: Add OPENAI_API_KEY configuration
INSERT INTO system_configurations (
    id,
    config_key, 
    config_value, 
    category, 
    subcategory,
    description, 
    is_sensitive, 
    is_encrypted,
    created_at,
    updated_at
)
VALUES (
    gen_random_uuid(),
    'OPENAI_API_KEY', 
    '', 
    'ai_services',
    'openai_services', 
    'OpenAI API key for GPT models', 
    true, 
    true,
    NOW(),
    NOW()
)
ON CONFLICT (config_key) DO UPDATE SET
    category = EXCLUDED.category,
    subcategory = EXCLUDED.subcategory,
    description = EXCLUDED.description,
    is_sensitive = EXCLUDED.is_sensitive,
    is_encrypted = EXCLUDED.is_encrypted,
    updated_at = NOW();

-- Step 2: Add OPENAI_ORG_ID configuration  
INSERT INTO system_configurations (
    id,
    config_key, 
    config_value, 
    category, 
    subcategory,
    description, 
    is_sensitive, 
    is_encrypted,
    created_at,
    updated_at
)
VALUES (
    gen_random_uuid(),
    'OPENAI_ORG_ID', 
    '', 
    'ai_services',
    'openai_services',
    'OpenAI organization identifier', 
    true, 
    true,
    NOW(),
    NOW()
)
ON CONFLICT (config_key) DO UPDATE SET
    category = EXCLUDED.category,
    subcategory = EXCLUDED.subcategory,
    description = EXCLUDED.description,
    is_sensitive = EXCLUDED.is_sensitive,
    is_encrypted = EXCLUDED.is_encrypted,
    updated_at = NOW();

-- Step 3: Verify the configurations were added
SELECT 
    config_key, 
    category, 
    subcategory,
    description, 
    is_sensitive, 
    is_encrypted,
    created_at
FROM system_configurations 
WHERE config_key IN ('OPENAI_API_KEY', 'OPENAI_ORG_ID')
ORDER BY config_key;

SELECT 'OpenAI configurations added successfully!' as result; 