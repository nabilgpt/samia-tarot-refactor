-- ============================================================================
-- SAMIA TAROT - DEFAULT CONFIGURATION VALUES
-- Populate system_configurations with all settings from env.template
-- ============================================================================
-- Date: 2025-01-16
-- Purpose: Insert all configuration keys with default/empty values
-- ============================================================================

-- ============================================================================
-- 1. INFRASTRUCTURE SETTINGS
-- ============================================================================

INSERT INTO system_configurations (
    config_key, config_category, config_subcategory, display_name, description,
    data_type, is_sensitive, is_encrypted, is_required, access_level,
    config_value_plain, default_value, environment
) VALUES 
-- Supabase Configuration
('SUPABASE_URL', 'infrastructure', 'database', 'Supabase Project URL', 'Main Supabase project URL', 'string', true, true, true, 'super_admin', '', 'CONFIGURE_VIA_DASHBOARD', 'all'),
('SUPABASE_ANON_KEY', 'infrastructure', 'database', 'Supabase Anonymous Key', 'Supabase anonymous/public key', 'string', true, true, true, 'super_admin', '', 'CONFIGURE_VIA_DASHBOARD', 'all'),
('SUPABASE_SERVICE_ROLE_KEY', 'infrastructure', 'database', 'Supabase Service Role Key', 'Supabase service role key (full access)', 'string', true, true, true, 'super_admin', '', 'CONFIGURE_VIA_DASHBOARD', 'all'),

-- Storage Configuration
('BACKBLAZE_KEY_ID', 'infrastructure', 'storage', 'Backblaze B2 Key ID', 'Backblaze B2 access key ID', 'string', true, true, false, 'super_admin', '', 'CONFIGURE_VIA_DASHBOARD', 'all'),
('BACKBLAZE_APP_KEY', 'infrastructure', 'storage', 'Backblaze B2 App Key', 'Backblaze B2 application key', 'string', true, true, false, 'super_admin', '', 'CONFIGURE_VIA_DASHBOARD', 'all'),
('BACKBLAZE_BUCKET_NAME', 'infrastructure', 'storage', 'Backblaze B2 Bucket Name', 'Backblaze B2 storage bucket name', 'string', false, false, false, 'admin', 'samia-tarot-dev', 'samia-tarot-dev', 'all'),
('BACKBLAZE_BUCKET_ID', 'infrastructure', 'storage', 'Backblaze B2 Bucket ID', 'Backblaze B2 bucket identifier', 'string', true, true, false, 'super_admin', '', 'CONFIGURE_VIA_DASHBOARD', 'all')

ON CONFLICT (config_key) DO NOTHING;

-- ============================================================================
-- 2. SECURITY SETTINGS
-- ============================================================================

INSERT INTO system_configurations (
    config_key, config_category, config_subcategory, display_name, description,
    data_type, is_sensitive, is_encrypted, is_required, access_level,
    config_value_plain, default_value, environment
) VALUES 
('JWT_SECRET', 'security', 'authentication', 'JWT Secret Key', 'Secret key for JWT token signing (min 64 chars)', 'string', true, true, true, 'super_admin', '', 'CONFIGURE_VIA_DASHBOARD', 'all'),
('BCRYPT_ROUNDS', 'security', 'hashing', 'BCrypt Rounds', 'Number of BCrypt hashing rounds', 'number', false, false, true, 'admin', '12', '12', 'all'),
('RATE_LIMIT_WINDOW_MS', 'security', 'rate_limiting', 'Rate Limit Window (ms)', 'Rate limiting window in milliseconds', 'number', false, false, true, 'admin', '900000', '900000', 'all'),
('RATE_LIMIT_MAX_REQUESTS', 'security', 'rate_limiting', 'Rate Limit Max Requests', 'Maximum requests per window', 'number', false, false, true, 'admin', '1000', '1000', 'all'),
('CORS_ORIGIN', 'security', 'cors', 'CORS Origin', 'Allowed CORS origin', 'string', false, false, true, 'admin', 'http://localhost:3000', 'http://localhost:3000', 'development')

ON CONFLICT (config_key) DO NOTHING;

-- ============================================================================
-- 3. PAYMENT GATEWAY SETTINGS
-- ============================================================================

INSERT INTO system_configurations (
    config_key, config_category, config_subcategory, display_name, description,
    data_type, is_sensitive, is_encrypted, is_required, access_level,
    config_value_plain, default_value, environment
) VALUES 
-- Stripe Configuration
('STRIPE_SECRET_KEY', 'payments', 'stripe', 'Stripe Secret Key', 'Stripe secret API key', 'string', true, true, false, 'super_admin', '', 'CONFIGURE_VIA_DASHBOARD', 'all'),
('STRIPE_PUBLISHABLE_KEY', 'payments', 'stripe', 'Stripe Publishable Key', 'Stripe publishable API key', 'string', true, true, false, 'super_admin', '', 'CONFIGURE_VIA_DASHBOARD', 'all'),
('STRIPE_WEBHOOK_SECRET', 'payments', 'stripe', 'Stripe Webhook Secret', 'Stripe webhook endpoint secret', 'string', true, true, false, 'super_admin', '', 'CONFIGURE_VIA_DASHBOARD', 'all'),

-- Square Configuration
('SQUARE_ACCESS_TOKEN', 'payments', 'square', 'Square Access Token', 'Square API access token', 'string', true, true, false, 'super_admin', '', 'CONFIGURE_VIA_DASHBOARD', 'all'),
('SQUARE_APPLICATION_ID', 'payments', 'square', 'Square Application ID', 'Square application identifier', 'string', true, true, false, 'super_admin', '', 'CONFIGURE_VIA_DASHBOARD', 'all'),
('SQUARE_LOCATION_ID', 'payments', 'square', 'Square Location ID', 'Square business location ID', 'string', true, true, false, 'super_admin', '', 'CONFIGURE_VIA_DASHBOARD', 'all'),
('SQUARE_WEBHOOK_SIGNATURE_KEY', 'payments', 'square', 'Square Webhook Signature Key', 'Square webhook signature key', 'string', true, true, false, 'super_admin', '', 'CONFIGURE_VIA_DASHBOARD', 'all'),

-- Cryptocurrency Configuration
('USDT_API_KEY', 'payments', 'crypto', 'USDT API Key', 'USDT/Tether API key', 'string', true, true, false, 'super_admin', '', 'CONFIGURE_VIA_DASHBOARD', 'all'),
('USDT_WALLET_ADDRESS', 'payments', 'crypto', 'USDT Wallet Address', 'USDT wallet address for payments', 'string', true, true, false, 'super_admin', '', 'CONFIGURE_VIA_DASHBOARD', 'all'),
('TRON_API_KEY', 'payments', 'crypto', 'TRON API Key', 'TRON network API key', 'string', true, true, false, 'super_admin', '', 'CONFIGURE_VIA_DASHBOARD', 'all'),
('TRON_NETWORK', 'payments', 'crypto', 'TRON Network', 'TRON network environment', 'string', false, false, false, 'admin', 'testnet', 'testnet', 'all')

ON CONFLICT (config_key) DO NOTHING;

-- ============================================================================
-- 4. AI SERVICES SETTINGS
-- ============================================================================

INSERT INTO system_configurations (
    config_key, config_category, config_subcategory, display_name, description,
    data_type, is_sensitive, is_encrypted, is_required, access_level,
    config_value_plain, default_value, environment
) VALUES 
-- OpenAI Configuration
('OPENAI_API_KEY', 'ai_services', 'openai', 'OpenAI API Key', 'OpenAI API key for GPT models', 'string', true, true, false, 'super_admin', '', 'CONFIGURE_VIA_DASHBOARD', 'all'),
('OPENAI_ORG_ID', 'ai_services', 'openai', 'OpenAI Organization ID', 'OpenAI organization identifier', 'string', true, true, false, 'super_admin', '', 'CONFIGURE_VIA_DASHBOARD', 'all'),

-- ElevenLabs Configuration
('ELEVENLABS_API_KEY', 'ai_services', 'elevenlabs', 'ElevenLabs API Key', 'ElevenLabs text-to-speech API key', 'string', true, true, false, 'super_admin', '', 'CONFIGURE_VIA_DASHBOARD', 'all'),
('ELEVENLABS_VOICE_ID', 'ai_services', 'elevenlabs', 'ElevenLabs Voice ID', 'Default voice ID for text-to-speech', 'string', false, false, false, 'admin', '', 'CONFIGURE_VIA_DASHBOARD', 'all'),

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
-- 5. COMMUNICATION SETTINGS
-- ============================================================================

INSERT INTO system_configurations (
    config_key, config_category, config_subcategory, display_name, description,
    data_type, is_sensitive, is_encrypted, is_required, access_level,
    config_value_plain, default_value, environment
) VALUES 
-- Video Call Configuration
('AGORA_APP_ID', 'communication', 'video_calls', 'Agora App ID', 'Agora.io application ID for video calls', 'string', true, true, false, 'super_admin', '', 'CONFIGURE_VIA_DASHBOARD', 'all'),
('AGORA_APP_CERTIFICATE', 'communication', 'video_calls', 'Agora App Certificate', 'Agora.io app certificate for security', 'string', true, true, false, 'super_admin', '', 'CONFIGURE_VIA_DASHBOARD', 'all'),

-- Twilio Configuration
('TWILIO_ACCOUNT_SID', 'communication', 'twilio', 'Twilio Account SID', 'Twilio account identifier', 'string', true, true, false, 'super_admin', '', 'CONFIGURE_VIA_DASHBOARD', 'all'),
('TWILIO_AUTH_TOKEN', 'communication', 'twilio', 'Twilio Auth Token', 'Twilio authentication token', 'string', true, true, false, 'super_admin', '', 'CONFIGURE_VIA_DASHBOARD', 'all'),
('TWILIO_PHONE_NUMBER', 'communication', 'twilio', 'Twilio Phone Number', 'Twilio phone number for SMS/voice', 'string', false, false, false, 'admin', '+1234567890', '+1234567890', 'all'),

-- SMTP Configuration
('SMTP_HOST', 'communication', 'email', 'SMTP Host', 'SMTP server hostname', 'string', false, false, false, 'admin', 'smtp.gmail.com', 'smtp.gmail.com', 'all'),
('SMTP_USER', 'communication', 'email', 'SMTP Username', 'SMTP authentication username', 'string', true, true, false, 'super_admin', '', 'CONFIGURE_VIA_DASHBOARD', 'all'),
('SMTP_PASS', 'communication', 'email', 'SMTP Password', 'SMTP authentication password', 'string', true, true, false, 'super_admin', '', 'CONFIGURE_VIA_DASHBOARD', 'all'),

-- SendGrid Configuration
('SENDGRID_API_KEY', 'communication', 'sendgrid', 'SendGrid API Key', 'SendGrid email service API key', 'string', true, true, false, 'super_admin', '', 'CONFIGURE_VIA_DASHBOARD', 'all'),
('SENDGRID_FROM_EMAIL', 'communication', 'sendgrid', 'SendGrid From Email', 'Default from email address', 'string', false, false, false, 'admin', 'noreply@your-domain.com', 'noreply@your-domain.com', 'all')

ON CONFLICT (config_key) DO NOTHING;

-- ============================================================================
-- 6. SYSTEM SETTINGS
-- ============================================================================

INSERT INTO system_configurations (
    config_key, config_category, config_subcategory, display_name, description,
    data_type, is_sensitive, is_encrypted, is_required, access_level,
    config_value_plain, default_value, environment
) VALUES 
-- Core System
('NODE_ENV', 'system', 'environment', 'Node Environment', 'Node.js environment mode', 'string', false, false, true, 'public', 'development', 'development', 'all'),
('LOG_LEVEL', 'system', 'logging', 'Log Level', 'Application logging level', 'string', false, false, true, 'admin', 'debug', 'debug', 'all'),

-- Currency & Localization
('DEFAULT_CURRENCY', 'system', 'localization', 'Default Currency', 'Default platform currency', 'string', false, false, true, 'public', 'USD', 'USD', 'all'),
('SUPPORTED_CURRENCIES', 'system', 'localization', 'Supported Currencies', 'Comma-separated list of supported currencies', 'string', false, false, true, 'public', 'USD,EUR,GBP,AED,SAR,LBP', 'USD,EUR,GBP,AED,SAR,LBP', 'all'),
('SUPPORTED_LANGUAGES', 'system', 'localization', 'Supported Languages', 'Comma-separated list of supported languages', 'string', false, false, true, 'public', 'en,ar,fr,es', 'en,ar,fr,es', 'all'),

-- Admin Configuration
('ADMIN_DEFAULT_EMAIL', 'system', 'admin', 'Admin Default Email', 'Default admin email address', 'string', false, false, true, 'admin', 'admin@your-domain.com', 'admin@your-domain.com', 'all'),
('SUPER_ADMIN_SECRET', 'system', 'admin', 'Super Admin Secret', 'Secret key for super admin access', 'string', true, true, true, 'super_admin', '', 'CONFIGURE_VIA_DASHBOARD', 'all')

ON CONFLICT (config_key) DO NOTHING;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ DEFAULT CONFIGURATION VALUES INSERTED SUCCESSFULLY';
    RAISE NOTICE '📊 Categories: Infrastructure, Security, Payments, AI Services, Communication, System';
    RAISE NOTICE '🔑 Total configurations: ~50+ settings covering all env.template variables';
    RAISE NOTICE '🔐 Sensitive values marked for encryption';
    RAISE NOTICE '📝 Next step: Create SuperAdmin Dashboard UI';
END $$;
