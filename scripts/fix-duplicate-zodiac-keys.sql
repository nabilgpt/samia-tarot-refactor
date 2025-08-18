-- ============================================================================
-- FIX DUPLICATE ZODIAC API KEYS
-- ============================================================================
-- This script removes duplicate zodiac API key records and ensures clean state

-- 1. Check current duplicates
SELECT 
    config_key, 
    COUNT(*) as count,
    STRING_AGG(id::text, ', ') as duplicate_ids
FROM system_configurations 
WHERE config_key IN ('ZODIAC_OPENAI_API_KEY', 'ZODIAC_ELEVENLABS_API_KEY') 
GROUP BY config_key 
HAVING COUNT(*) > 1;

-- 2. Delete ALL existing zodiac API key records (we'll recreate them properly)
DELETE FROM system_configurations 
WHERE config_key IN ('ZODIAC_OPENAI_API_KEY', 'ZODIAC_ELEVENLABS_API_KEY');

-- 3. Insert clean zodiac API key configurations
INSERT INTO system_configurations (
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
    environment,
    is_active
) VALUES 
-- ZODIAC OpenAI API Key
(
    'ZODIAC_OPENAI_API_KEY',
    'ai_services',
    'zodiac_system',
    NULL, -- Will be encrypted when user sets value
    NULL, -- Will be set by user in dashboard
    true,
    'Zodiac OpenAI API Key',
    'Dedicated OpenAI API key for zodiac horoscope generation. Required for daily zodiac system.',
    'string',
    true,
    true,
    false,
    'super_admin',
    '{"minLength": 10, "pattern": "^sk-"}',
    'all',
    true
),
-- ZODIAC ElevenLabs API Key
(
    'ZODIAC_ELEVENLABS_API_KEY',
    'ai_services',
    'zodiac_system',
    NULL, -- Will be encrypted when user sets value
    NULL, -- Will be set by user in dashboard
    true,
    'Zodiac ElevenLabs API Key',
    'Dedicated ElevenLabs API key for zodiac audio generation. Required for daily zodiac TTS.',
    'string',
    true,
    true,
    false,
    'super_admin',
    '{"minLength": 10}',
    'all',
    true
);

-- 4. Verify the fix
SELECT 
    config_key,
    config_category,
    config_subcategory,
    display_name,
    is_sensitive,
    access_level,
    is_active
FROM system_configurations 
WHERE config_key IN ('ZODIAC_OPENAI_API_KEY', 'ZODIAC_ELEVENLABS_API_KEY')
ORDER BY config_key; 