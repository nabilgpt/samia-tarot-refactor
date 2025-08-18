-- ============================================================================
-- ADD ZODIAC SYSTEM CONFIGURATIONS TO SECRETS MANAGEMENT
-- ============================================================================
-- Date: 2025-01-16
-- Purpose: Add Daily Zodiac System configurations to AI Services category
-- ============================================================================

-- Add Daily Zodiac System Configuration entries
INSERT INTO system_configurations (
    config_key, config_category, config_subcategory, display_name, description,
    data_type, is_sensitive, is_encrypted, is_required, access_level,
    config_value_plain, default_value, environment
) VALUES 
-- Daily Zodiac System Configuration
('ZODIAC_DEFAULT_TTS_PROVIDER', 'ai_services', 'zodiac_system', 'Default TTS Provider for Zodiac', 'Default text-to-speech provider for daily zodiac readings (openai/elevenlabs)', 'string', false, false, true, 'admin', 'openai', 'openai', 'all'),
('ZODIAC_OPENAI_VOICE_AR', 'ai_services', 'zodiac_system', 'OpenAI Arabic Voice for Zodiac', 'OpenAI voice model for Arabic zodiac readings', 'string', false, false, true, 'admin', 'nova', 'nova', 'all'),
('ZODIAC_OPENAI_VOICE_EN', 'ai_services', 'zodiac_system', 'OpenAI English Voice for Zodiac', 'OpenAI voice model for English zodiac readings', 'string', false, false, true, 'admin', 'alloy', 'alloy', 'all'),
('ZODIAC_ELEVENLABS_VOICE_AR', 'ai_services', 'zodiac_system', 'ElevenLabs Arabic Voice for Zodiac', 'ElevenLabs voice ID for Arabic zodiac readings', 'string', false, false, false, 'admin', 'samia_ar', 'samia_ar', 'all'),
('ZODIAC_ELEVENLABS_VOICE_EN', 'ai_services', 'zodiac_system', 'ElevenLabs English Voice for Zodiac', 'ElevenLabs voice ID for English zodiac readings', 'string', false, false, false, 'admin', 'samia_en', 'samia_en', 'all'),
('ZODIAC_AUTO_GENERATION_ENABLED', 'ai_services', 'zodiac_system', 'Auto Generation Enabled', 'Enable automatic daily zodiac generation', 'boolean', false, false, true, 'admin', 'true', 'true', 'all'),
('ZODIAC_GENERATION_TIMEZONE', 'ai_services', 'zodiac_system', 'Generation Timezone', 'Timezone for automatic zodiac generation scheduling', 'string', false, false, true, 'admin', 'UTC', 'UTC', 'all'),
('ZODIAC_SAMIA_PROMPT', 'ai_services', 'zodiac_system', 'Samia AI Personality Prompt', 'AI personality prompt for Samia character in zodiac readings', 'string', false, false, true, 'admin', 'You are Samia, a wise and mystical tarot reader with deep knowledge of astrology. Speak with warmth, wisdom, and spiritual insight.', 'You are Samia, a wise and mystical tarot reader with deep knowledge of astrology. Speak with warmth, wisdom, and spiritual insight.', 'all')

ON CONFLICT (config_key) DO NOTHING;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ ZODIAC SYSTEM CONFIGURATIONS ADDED TO SECRETS MANAGEMENT';
    RAISE NOTICE '🔮 Added 8 zodiac-specific configurations to ai_services category';
    RAISE NOTICE '🎙️ TTS Provider settings: OpenAI & ElevenLabs voice configurations';
    RAISE NOTICE '⚙️ System settings: Auto-generation, timezone, Samia AI prompt';
    RAISE NOTICE '📝 Next step: Access via Super Admin Dashboard → System Secrets → AI Services';
END $$; 