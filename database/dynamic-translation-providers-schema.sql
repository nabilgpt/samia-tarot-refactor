-- =====================================================
-- SAMIA TAROT - DYNAMIC TRANSLATION PROVIDERS SCHEMA
-- Ultimate bilingual translation system with extensible AI providers
-- =====================================================

BEGIN;

-- =====================================================
-- 1. AI TRANSLATION PROVIDERS TABLE
-- Dynamic provider management system
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_translation_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE, -- 'openai', 'google', 'claude', etc.
  display_name_en VARCHAR(200) NOT NULL, -- 'OpenAI GPT'
  display_name_ar VARCHAR(200) NOT NULL, -- 'OpenAI GPT'
  description_en TEXT,
  description_ar TEXT,
  
  -- Provider Configuration
  api_endpoint_url TEXT, -- Base API URL
  authentication_type VARCHAR(50) DEFAULT 'bearer_token', -- 'bearer_token', 'api_key', 'oauth'
  supports_languages TEXT[] DEFAULT '{"en", "ar"}', -- Supported languages
  
  -- Provider Capabilities
  max_tokens_per_request INTEGER DEFAULT 1500,
  supports_batch_translation BOOLEAN DEFAULT false,
  supports_context_preservation BOOLEAN DEFAULT true,
  estimated_cost_per_1k_tokens DECIMAL(10,4) DEFAULT 0.0020,
  
  -- Status and Management
  is_active BOOLEAN DEFAULT true,
  is_default_provider BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  
  -- Provider-specific Configuration Schema (JSON)
  config_schema JSONB DEFAULT '{}', -- Schema for provider-specific settings
  default_config JSONB DEFAULT '{}', -- Default configuration values
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  last_tested_at TIMESTAMP WITH TIME ZONE,
  test_status VARCHAR(50) DEFAULT 'untested' -- 'untested', 'success', 'failed'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_providers_active ON ai_translation_providers(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_providers_default ON ai_translation_providers(is_default_provider);
CREATE INDEX IF NOT EXISTS idx_ai_providers_order ON ai_translation_providers(display_order);

-- =====================================================
-- 2. ENHANCED TRANSLATION SETTINGS TABLE
-- Global bilingual translation configuration
-- =====================================================

CREATE TABLE IF NOT EXISTS translation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  category VARCHAR(100) DEFAULT 'general', -- 'general', 'providers', 'modes', 'features'
  is_system_setting BOOLEAN DEFAULT false, -- System vs user-configurable
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_translation_settings_key ON translation_settings(setting_key);

-- =====================================================
-- 3. PROVIDER CREDENTIALS TABLE
-- Secure storage of API keys and authentication data
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES ai_translation_providers(id) ON DELETE CASCADE,
  credential_key VARCHAR(100) NOT NULL, -- 'api_key', 'client_id', 'secret_key'
  credential_value_encrypted TEXT NOT NULL, -- Encrypted credential
  credential_value_plain TEXT, -- For non-sensitive config
  is_encrypted BOOLEAN DEFAULT true,
  
  -- Credential Metadata
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMP WITH TIME ZONE,
  validation_status VARCHAR(50) DEFAULT 'unknown', -- 'valid', 'invalid', 'expired', 'unknown'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(provider_id, credential_key)
);

-- =====================================================
-- 4. TRANSLATION USAGE ANALYTICS
-- Track usage and performance of different providers
-- =====================================================

CREATE TABLE IF NOT EXISTS translation_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES ai_translation_providers(id),
  
  -- Request Details
  request_type VARCHAR(50) DEFAULT 'single_translation', -- 'single_translation', 'batch_translation', 'test'
  source_language VARCHAR(10) NOT NULL,
  target_language VARCHAR(10) NOT NULL,
  
  -- Content Information
  text_length INTEGER,
  tokens_used INTEGER,
  estimated_cost DECIMAL(10,6),
  
  -- Performance Metrics
  response_time_ms INTEGER,
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  quality_score DECIMAL(3,2), -- 0.00 to 1.00 (future: AI quality assessment)
  
  -- Context
  used_for VARCHAR(100), -- 'deck_types', 'spreads', 'services', etc.
  entity_id UUID, -- ID of the entity being translated
  user_id UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_translation_logs_provider ON translation_usage_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_translation_logs_date ON translation_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_translation_logs_success ON translation_usage_logs(success);

-- =====================================================
-- 5. INSERT DEFAULT PROVIDERS
-- Pre-configured AI providers ready for use
-- =====================================================

-- OpenAI Provider
INSERT INTO ai_translation_providers (
  name, display_name_en, display_name_ar, description_en, description_ar,
  api_endpoint_url, authentication_type, supports_languages,
  max_tokens_per_request, supports_batch_translation, supports_context_preservation,
  estimated_cost_per_1k_tokens, is_active, is_default_provider, display_order,
  config_schema, default_config
) VALUES (
  'openai',
  'OpenAI GPT',
  'OpenAI GPT',
  'Industry-leading AI translation with GPT models. Excellent for natural, context-aware translations.',
  'خدمة الترجمة المتقدمة باستخدام نماذج GPT. ممتازة للترجمات الطبيعية المدركة للسياق.',
  'https://api.openai.com/v1/chat/completions',
  'bearer_token',
  '{"en", "ar", "fr", "es", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "tr", "fa", "ur"}',
  1500, false, true, 0.0020,
  true, true, 1,
  '{
    "api_key": {"type": "string", "required": true, "encrypted": true, "description": "OpenAI API Key"},
    "model": {"type": "select", "options": ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"], "default": "gpt-3.5-turbo"},
    "temperature": {"type": "number", "min": 0, "max": 2, "default": 0.2, "description": "Creativity level"},
    "max_tokens": {"type": "integer", "min": 10, "max": 4000, "default": 1500}
  }',
  '{
    "model": "gpt-3.5-turbo",
    "temperature": 0.2,
    "max_tokens": 1500
  }'
) ON CONFLICT (name) DO UPDATE SET
  display_name_en = EXCLUDED.display_name_en,
  display_name_ar = EXCLUDED.display_name_ar,
  description_en = EXCLUDED.description_en,
  description_ar = EXCLUDED.description_ar,
  updated_at = NOW();

-- Google Translate Provider
INSERT INTO ai_translation_providers (
  name, display_name_en, display_name_ar, description_en, description_ar,
  api_endpoint_url, authentication_type, supports_languages,
  max_tokens_per_request, supports_batch_translation, supports_context_preservation,
  estimated_cost_per_1k_tokens, is_active, is_default_provider, display_order,
  config_schema, default_config
) VALUES (
  'google',
  'Google Translate',
  'مترجم جوجل',
  'Fast and reliable translation service by Google. Supports 100+ languages with high accuracy.',
  'خدمة ترجمة سريعة وموثوقة من جوجل. تدعم أكثر من 100 لغة بدقة عالية.',
  'https://translation.googleapis.com/language/translate/v2',
  'api_key',
  '{"en", "ar", "fr", "es", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "tr", "fa", "ur", "id", "th", "vi", "pl", "nl", "sv", "da", "no", "fi"}',
  2000, true, false, 0.0010,
  true, false, 2,
  '{
    "api_key": {"type": "string", "required": true, "encrypted": true, "description": "Google Cloud API Key"},
    "project_id": {"type": "string", "required": false, "description": "Google Cloud Project ID"},
    "format": {"type": "select", "options": ["text", "html"], "default": "text"}
  }',
  '{
    "format": "text"
  }'
) ON CONFLICT (name) DO UPDATE SET
  display_name_en = EXCLUDED.display_name_en,
  display_name_ar = EXCLUDED.display_name_ar,
  description_en = EXCLUDED.description_en,
  description_ar = EXCLUDED.description_ar,
  updated_at = NOW();

-- Claude Provider (Future)
INSERT INTO ai_translation_providers (
  name, display_name_en, display_name_ar, description_en, description_ar,
  api_endpoint_url, authentication_type, supports_languages,
  max_tokens_per_request, supports_batch_translation, supports_context_preservation,
  estimated_cost_per_1k_tokens, is_active, is_default_provider, display_order,
  config_schema, default_config
) VALUES (
  'claude',
  'Anthropic Claude',
  'Anthropic Claude',
  'Advanced AI model by Anthropic. Excellent at understanding context and cultural nuances.',
  'نموذج ذكاء اصطناعي متقدم من Anthropic. ممتاز في فهم السياق والفروق الثقافية.',
  'https://api.anthropic.com/v1/messages',
  'bearer_token',
  '{"en", "ar", "fr", "es", "de", "it", "pt", "ru", "ja", "ko", "zh"}',
  1800, false, true, 0.0025,
  false, false, 3,
  '{
    "api_key": {"type": "string", "required": true, "encrypted": true, "description": "Anthropic API Key"},
    "model": {"type": "select", "options": ["claude-3-haiku", "claude-3-sonnet", "claude-3-opus"], "default": "claude-3-haiku"},
    "max_tokens": {"type": "integer", "min": 10, "max": 4000, "default": 1800}
  }',
  '{
    "model": "claude-3-haiku",
    "max_tokens": 1800
  }'
) ON CONFLICT (name) DO UPDATE SET
  display_name_en = EXCLUDED.display_name_en,
  display_name_ar = EXCLUDED.display_name_ar,
  description_en = EXCLUDED.description_en,
  description_ar = EXCLUDED.description_ar,
  updated_at = NOW();

-- =====================================================
-- 6. INSERT DEFAULT TRANSLATION SETTINGS
-- Global configuration for the translation system
-- =====================================================

-- Main translation mode
INSERT INTO translation_settings (setting_key, setting_value, description_en, description_ar, category, is_system_setting) VALUES
('global_translation_mode', '"auto-translate"', 'Global translation mode for all bilingual fields', 'نمط الترجمة العام لجميع الحقول ثنائية اللغة', 'general', false),
('default_provider', '"openai"', 'Default AI provider for translations', 'مقدم الذكاء الاصطناعي الافتراضي للترجمة', 'providers', false),
('fallback_mode', '"auto-copy"', 'Fallback mode when translation fails', 'النمط الاحتياطي عند فشل الترجمة', 'general', false),
('enable_provider_fallback', 'true', 'Enable automatic fallback to secondary providers', 'تفعيل التراجع التلقائي إلى مقدمي الخدمة الثانويين', 'providers', false),
('translation_quality_threshold', '0.7', 'Minimum quality score to accept translations', 'الحد الأدنى لدرجة الجودة لقبول الترجمات', 'general', false),
('cache_translations', 'true', 'Enable caching of translations for performance', 'تفعيل حفظ الترجمات مؤقتاً لتحسين الأداء', 'general', false),
('enable_usage_analytics', 'true', 'Track translation usage and performance', 'تتبع استخدام الترجمة والأداء', 'general', false)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = NOW();

-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- Secure access control for all tables
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE ai_translation_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_provider_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_usage_logs ENABLE ROW LEVEL SECURITY;

-- AI Translation Providers - Super Admin only for management
CREATE POLICY "ai_providers_super_admin_all" ON ai_translation_providers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
      AND users.is_active = true
    )
  );

-- Allow read access for admin users to view providers
CREATE POLICY "ai_providers_admin_read" ON ai_translation_providers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
      AND users.is_active = true
    )
  );

-- Translation Settings - Super Admin only
CREATE POLICY "translation_settings_super_admin" ON translation_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
      AND users.is_active = true
    )
  );

-- Provider Credentials - Super Admin only (highly sensitive)
CREATE POLICY "provider_credentials_super_admin" ON ai_provider_credentials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
      AND users.is_active = true
    )
  );

-- Translation Usage Logs - Admin+ can read, system can insert
CREATE POLICY "translation_logs_admin_read" ON translation_usage_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
      AND users.is_active = true
    )
  );

CREATE POLICY "translation_logs_system_insert" ON translation_usage_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 8. HELPER FUNCTIONS
-- Utility functions for translation system management
-- =====================================================

-- Get active translation provider
CREATE OR REPLACE FUNCTION get_active_translation_provider()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  provider_name TEXT;
BEGIN
  -- Get the default provider from settings
  SELECT setting_value::text INTO provider_name
  FROM translation_settings
  WHERE setting_key = 'default_provider';
  
  -- Remove quotes from JSON string
  provider_name := TRIM(BOTH '"' FROM provider_name);
  
  -- Verify provider is active
  IF EXISTS (
    SELECT 1 FROM ai_translation_providers 
    WHERE name = provider_name AND is_active = true
  ) THEN
    RETURN provider_name;
  END IF;
  
  -- Fallback to first active provider
  SELECT name INTO provider_name
  FROM ai_translation_providers
  WHERE is_active = true
  ORDER BY display_order, created_at
  LIMIT 1;
  
  RETURN COALESCE(provider_name, 'none');
END;
$$;

-- Get translation mode setting
CREATE OR REPLACE FUNCTION get_translation_mode()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  mode_value TEXT;
BEGIN
  SELECT setting_value::text INTO mode_value
  FROM translation_settings
  WHERE setting_key = 'global_translation_mode';
  
  -- Remove quotes from JSON string and return
  RETURN TRIM(BOTH '"' FROM COALESCE(mode_value, '"auto-copy"'));
END;
$$;

-- Log translation usage
CREATE OR REPLACE FUNCTION log_translation_usage(
  p_provider_id UUID,
  p_source_lang TEXT,
  p_target_lang TEXT,
  p_text_length INTEGER,
  p_tokens_used INTEGER,
  p_response_time_ms INTEGER,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL,
  p_used_for TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO translation_usage_logs (
    provider_id, source_language, target_language,
    text_length, tokens_used, response_time_ms,
    success, error_message, used_for, entity_id, user_id
  ) VALUES (
    p_provider_id, p_source_lang, p_target_lang,
    p_text_length, p_tokens_used, p_response_time_ms,
    p_success, p_error_message, p_used_for, p_entity_id, auth.uid()
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

COMMIT;

-- =====================================================
-- SCHEMA COMPLETION SUMMARY
-- =====================================================
-- ✅ ai_translation_providers: Extensible provider management
-- ✅ translation_settings: Global configuration system  
-- ✅ ai_provider_credentials: Secure credential storage
-- ✅ translation_usage_logs: Usage analytics and monitoring
-- ✅ RLS Policies: Super Admin security controls
-- ✅ Helper Functions: Utility functions for system operations
-- ✅ Default Data: OpenAI, Google, Claude providers pre-configured
-- ✅ Settings: Global translation modes and configurations
-- 
-- Next Steps:
-- 1. Run this schema in Supabase SQL Editor
-- 2. Update BilingualSettingsTab for dynamic provider management
-- 3. Remove hardcoded mappings from deckTypesRoutes.js
-- 4. Integrate with enhanced translation service
-- ===================================================== 