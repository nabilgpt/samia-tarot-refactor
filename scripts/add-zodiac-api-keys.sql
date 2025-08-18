-- ============================================================================
-- SAMIA TAROT - ADD DEDICATED ZODIAC API KEYS
-- Add dedicated OpenAI and ElevenLabs API keys for Daily Zodiac System only
-- ============================================================================
-- Date: 2025-06-24
-- Purpose: Add ZODIAC_OPENAI_API_KEY and ZODIAC_ELEVENLABS_API_KEY
-- Security: These keys are ONLY for zodiac system, never fallback to global keys
-- ============================================================================

-- Add dedicated OpenAI API key for Daily Zodiac System
INSERT INTO system_configurations (
    config_key, config_category, config_subcategory, display_name, description,
    data_type, is_sensitive, is_encrypted, is_required, access_level,
    config_value_plain, default_value, environment, created_at, updated_at
) VALUES 
(
    'ZODIAC_OPENAI_API_KEY', 
    'ai_services', 
    'zodiac_system', 
    'Dedicated OpenAI API Key for Zodiac', 
    'Dedicated OpenAI API Key for Daily Zodiac readings and TTS generation. This key is ONLY used for zodiac system, never shared with other services.', 
    'string', 
    true,     -- is_sensitive
    true,     -- is_encrypted
    false,    -- is_required (optional, but shows error if missing when needed)
    'super_admin', 
    '',       -- empty by default
    'CONFIGURE_VIA_DASHBOARD_ONLY', 
    'all',
    NOW(),
    NOW()
),
(
    'ZODIAC_ELEVENLABS_API_KEY', 
    'ai_services', 
    'zodiac_system', 
    'Dedicated ElevenLabs API Key for Zodiac', 
    'Dedicated ElevenLabs API Key for Daily Zodiac audio generation. This key is ONLY used for zodiac system, never shared with other services.', 
    'string', 
    true,     -- is_sensitive
    true,     -- is_encrypted
    false,    -- is_required (optional, but shows error if missing when needed)
    'super_admin', 
    '',       -- empty by default
    'CONFIGURE_VIA_DASHBOARD_ONLY', 
    'all',
    NOW(),
    NOW()
)
ON CONFLICT (config_key) DO UPDATE SET
    description = EXCLUDED.description,
    is_sensitive = EXCLUDED.is_sensitive,
    is_encrypted = EXCLUDED.is_encrypted,
    access_level = EXCLUDED.access_level,
    updated_at = NOW();

-- ============================================================================
-- AUDIT LOG ENTRY (OPTIONAL - Skip if admin_actions table has issues)
-- ============================================================================

-- Log the addition of zodiac API keys for audit purposes (if possible)
DO $$
DECLARE
    super_admin_id UUID;
BEGIN
    -- Try to get a super admin ID
    SELECT id INTO super_admin_id 
    FROM profiles 
    WHERE role = 'super_admin' 
    LIMIT 1;
    
    -- Only insert audit log if we found a super admin and admin_actions table exists
    IF super_admin_id IS NOT NULL THEN
        BEGIN
            INSERT INTO admin_actions (
                admin_id,
                action_type,
                target_type,
                target_id,
                action_details,
                ip_address,
                user_agent,
                created_at
            ) VALUES (
                super_admin_id,
                'system_config_add',
                'zodiac_api_keys',
                NULL, -- Set to NULL since we're adding multiple configs
                jsonb_build_object(
                    'action', 'Added dedicated API key fields for Daily Zodiac System',
                    'keys_added', ARRAY['ZODIAC_OPENAI_API_KEY', 'ZODIAC_ELEVENLABS_API_KEY'],
                    'security_level', 'super_admin_only',
                    'purpose', 'Dedicated zodiac system credentials - no fallback to global keys'
                ),
                '127.0.0.1',
                'SAMIA-TAROT-SYSTEM',
                NOW()
            );
            RAISE NOTICE '✅ Audit log entry added successfully';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Warning: Could not add audit log entry: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '⚠️ Warning: No super admin found for audit log';
    END IF;
END $$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ DEDICATED ZODIAC API KEYS ADDED SUCCESSFULLY';
    RAISE NOTICE '🔮 Added: ZODIAC_OPENAI_API_KEY (for OpenAI TTS/Generation)';
    RAISE NOTICE '🔮 Added: ZODIAC_ELEVENLABS_API_KEY (for ElevenLabs TTS)';
    RAISE NOTICE '🔐 Security Level: super_admin only, encrypted, sensitive';
    RAISE NOTICE '🚫 NO FALLBACK: These keys are ONLY for zodiac system';
    RAISE NOTICE '📝 Next: Update frontend UI and backend services';
    RAISE NOTICE '⚠️  CRITICAL: Never use .env for these credentials!';
END $$; 