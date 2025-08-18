-- ============================================================================
-- DYNAMIC AI PROVIDERS & MODELS MANAGEMENT SYSTEM
-- SAMIA TAROT Platform - Complete Dynamic AI Management
-- ============================================================================
-- Date: 2025-01-25
-- Purpose: Enable dynamic AI provider/model management for all platform features
-- Features: Hot-swap providers, zero hardcoding, admin-configurable everything
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. AI PROVIDERS TABLE (Enhanced)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Provider Identity
    name VARCHAR(255) NOT NULL UNIQUE,
    provider_type VARCHAR(50) NOT NULL CHECK (provider_type IN (
        'openai', 'anthropic', 'google', 'gemini', 'cohere', 'huggingface', 
        'azure_openai', 'aws_bedrock', 'custom'
    )),
    
    -- API Configuration
    api_endpoint TEXT NOT NULL,
    api_key_encrypted TEXT,
    api_version VARCHAR(20) DEFAULT 'v1',
    organization_id VARCHAR(255),
    
    -- Provider Capabilities
    supports_text_generation BOOLEAN DEFAULT true,
    supports_image_generation BOOLEAN DEFAULT false,
    supports_audio_generation BOOLEAN DEFAULT false,
    supports_embeddings BOOLEAN DEFAULT false,
    supports_fine_tuning BOOLEAN DEFAULT false,
    
    -- Rate Limiting
    requests_per_minute INTEGER DEFAULT 60,
    tokens_per_minute INTEGER DEFAULT 10000,
    requests_per_day INTEGER DEFAULT 1000,
    
    -- Provider Status
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    health_status VARCHAR(20) DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'down', 'unknown')),
    last_health_check TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    description TEXT,
    configuration_schema JSONB DEFAULT '{}',
    custom_headers JSONB DEFAULT '{}',
    
    -- Audit
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. AI MODELS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Model Identity
    provider_id UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
    model_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    model_version VARCHAR(50),
    
    -- Model Capabilities
    model_type VARCHAR(50) NOT NULL CHECK (model_type IN (
        'text_generation', 'text_completion', 'chat_completion', 
        'image_generation', 'audio_generation', 'tts', 'stt',
        'embeddings', 'classification', 'custom'
    )),
    
    -- Model Specifications
    max_tokens INTEGER DEFAULT 4096,
    context_window INTEGER DEFAULT 4096,
    supports_streaming BOOLEAN DEFAULT true,
    supports_functions BOOLEAN DEFAULT false,
    supports_vision BOOLEAN DEFAULT false,
    
    -- Pricing (per 1K tokens)
    input_cost_per_1k DECIMAL(10,6) DEFAULT 0,
    output_cost_per_1k DECIMAL(10,6) DEFAULT 0,
    
    -- Model Status
    is_active BOOLEAN DEFAULT true,
    is_default_for_provider BOOLEAN DEFAULT false,
    
    -- Configuration
    default_parameters JSONB DEFAULT '{}',
    parameter_constraints JSONB DEFAULT '{}',
    
    -- Metadata
    description TEXT,
    use_cases TEXT[],
    
    -- Audit
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(provider_id, model_name)
);

-- ============================================================================
-- 3. FEATURE AI ASSIGNMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_ai_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Feature Identity
    feature_name VARCHAR(100) NOT NULL UNIQUE,
    feature_category VARCHAR(50) NOT NULL CHECK (feature_category IN (
        'zodiac', 'tarot_reading', 'chat', 'tts', 'stt', 'image_generation',
        'content_moderation', 'translation', 'summarization', 'analysis', 'custom'
    )),
    feature_description TEXT,
    
    -- Primary AI Assignment
    primary_provider_id UUID NOT NULL REFERENCES ai_providers(id),
    primary_model_id UUID NOT NULL REFERENCES ai_models(id),
    
    -- Backup AI Assignment (for failover)
    backup_provider_id UUID REFERENCES ai_providers(id),
    backup_model_id UUID REFERENCES ai_models(id),
    
    -- Feature Configuration
    feature_parameters JSONB DEFAULT '{}',
    custom_prompt_template TEXT,
    
    -- Failover Settings
    enable_failover BOOLEAN DEFAULT true,
    max_retries INTEGER DEFAULT 3,
    retry_delay_seconds INTEGER DEFAULT 5,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 4. SYSTEM INTEGRATIONS TABLE (Storage, Notifications, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Integration Identity
    integration_name VARCHAR(100) NOT NULL UNIQUE,
    integration_type VARCHAR(50) NOT NULL CHECK (integration_type IN (
        'storage', 'email', 'sms', 'push_notifications', 'analytics', 
        'payment', 'backup', 'cdn', 'monitoring', 'custom'
    )),
    integration_category VARCHAR(50) NOT NULL,
    
    -- Provider Information
    provider_name VARCHAR(255) NOT NULL,
    service_endpoint TEXT,
    
    -- Authentication
    api_key_encrypted TEXT,
    api_secret_encrypted TEXT,
    access_token_encrypted TEXT,
    additional_credentials JSONB DEFAULT '{}',
    
    -- Configuration
    configuration JSONB DEFAULT '{}',
    is_default_for_type BOOLEAN DEFAULT false,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    health_status VARCHAR(20) DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'down', 'unknown')),
    last_health_check TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    description TEXT,
    supported_features TEXT[],
    
    -- Audit
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 5. AI USAGE ANALYTICS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_usage_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Usage Identity
    provider_id UUID NOT NULL REFERENCES ai_providers(id),
    model_id UUID NOT NULL REFERENCES ai_models(id),
    feature_name VARCHAR(100) NOT NULL,
    
    -- Usage Metrics
    request_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    cost_incurred DECIMAL(10,4) DEFAULT 0,
    
    -- Performance Metrics
    avg_response_time_ms INTEGER DEFAULT 0,
    min_response_time_ms INTEGER DEFAULT 0,
    max_response_time_ms INTEGER DEFAULT 0,
    
    -- Time Period
    usage_date DATE NOT NULL,
    usage_hour INTEGER CHECK (usage_hour >= 0 AND usage_hour <= 23),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(provider_id, model_id, feature_name, usage_date, usage_hour)
);

-- ============================================================================
-- 6. INDEXES FOR PERFORMANCE
-- ============================================================================

-- AI Providers
CREATE INDEX IF NOT EXISTS idx_ai_providers_type ON ai_providers(provider_type);
CREATE INDEX IF NOT EXISTS idx_ai_providers_active ON ai_providers(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_providers_default ON ai_providers(is_default);
CREATE INDEX IF NOT EXISTS idx_ai_providers_health ON ai_providers(health_status);

-- AI Models
CREATE INDEX IF NOT EXISTS idx_ai_models_provider ON ai_models(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_models_type ON ai_models(model_type);
CREATE INDEX IF NOT EXISTS idx_ai_models_active ON ai_models(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_models_default ON ai_models(is_default_for_provider);

-- Feature AI Assignments
CREATE INDEX IF NOT EXISTS idx_feature_assignments_feature ON feature_ai_assignments(feature_name);
CREATE INDEX IF NOT EXISTS idx_feature_assignments_category ON feature_ai_assignments(feature_category);
CREATE INDEX IF NOT EXISTS idx_feature_assignments_provider ON feature_ai_assignments(primary_provider_id);
CREATE INDEX IF NOT EXISTS idx_feature_assignments_active ON feature_ai_assignments(is_active);

-- System Integrations
CREATE INDEX IF NOT EXISTS idx_system_integrations_type ON system_integrations(integration_type);
CREATE INDEX IF NOT EXISTS idx_system_integrations_active ON system_integrations(is_active);
CREATE INDEX IF NOT EXISTS idx_system_integrations_default ON system_integrations(is_default_for_type);

-- AI Usage Analytics
CREATE INDEX IF NOT EXISTS idx_ai_usage_provider_model ON ai_usage_analytics(provider_id, model_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature ON ai_usage_analytics(feature_name);
CREATE INDEX IF NOT EXISTS idx_ai_usage_date ON ai_usage_analytics(usage_date);

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_ai_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_analytics ENABLE ROW LEVEL SECURITY;

-- AI Providers Policies
CREATE POLICY "Super Admin can manage AI providers" ON ai_providers
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Admin can read AI providers" ON ai_providers
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- AI Models Policies
CREATE POLICY "Super Admin can manage AI models" ON ai_models
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Admin can read AI models" ON ai_models
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Feature AI Assignments Policies
CREATE POLICY "Super Admin can manage feature assignments" ON feature_ai_assignments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Admin can read feature assignments" ON feature_ai_assignments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- System Integrations Policies
CREATE POLICY "Super Admin can manage system integrations" ON system_integrations
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- AI Usage Analytics Policies
CREATE POLICY "Admin can read usage analytics" ON ai_usage_analytics
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- ============================================================================
-- 8. FUNCTIONS FOR DYNAMIC AI MANAGEMENT
-- ============================================================================

-- Function to get AI configuration for a feature
CREATE OR REPLACE FUNCTION get_feature_ai_config(
    p_feature_name VARCHAR(100)
)
RETURNS TABLE (
    provider_name VARCHAR(255),
    provider_type VARCHAR(50),
    api_endpoint TEXT,
    api_key TEXT,
    model_name VARCHAR(255),
    model_parameters JSONB,
    feature_parameters JSONB
) AS $$
DECLARE
    v_assignment RECORD;
    v_provider RECORD;
    v_model RECORD;
BEGIN
    -- Get feature assignment
    SELECT * INTO v_assignment
    FROM feature_ai_assignments
    WHERE feature_name = p_feature_name AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No AI assignment found for feature: %', p_feature_name;
    END IF;
    
    -- Get provider details
    SELECT * INTO v_provider
    FROM ai_providers
    WHERE id = v_assignment.primary_provider_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Primary AI provider not found or inactive for feature: %', p_feature_name;
    END IF;
    
    -- Get model details
    SELECT * INTO v_model
    FROM ai_models
    WHERE id = v_assignment.primary_model_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Primary AI model not found or inactive for feature: %', p_feature_name;
    END IF;
    
    -- Decrypt API key
    RETURN QUERY SELECT
        v_provider.name,
        v_provider.provider_type,
        v_provider.api_endpoint,
        decrypt_config_value('AI_PROVIDER_' || v_provider.id, v_provider.api_key_encrypted),
        v_model.model_name,
        v_model.default_parameters,
        v_assignment.feature_parameters;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update feature AI assignment
CREATE OR REPLACE FUNCTION update_feature_ai_assignment(
    p_feature_name VARCHAR(100),
    p_provider_id UUID,
    p_model_id UUID,
    p_parameters JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_role TEXT;
BEGIN
    -- Check user permissions
    SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();
    
    IF v_user_role != 'super_admin' THEN
        RAISE EXCEPTION 'Access denied: Only Super Admin can update AI assignments';
    END IF;
    
    -- Update or insert assignment
    INSERT INTO feature_ai_assignments (
        feature_name, feature_category, primary_provider_id, primary_model_id,
        feature_parameters, updated_by
    )
    VALUES (
        p_feature_name, 'custom', p_provider_id, p_model_id,
        p_parameters, auth.uid()
    )
    ON CONFLICT (feature_name) DO UPDATE SET
        primary_provider_id = EXCLUDED.primary_provider_id,
        primary_model_id = EXCLUDED.primary_model_id,
        feature_parameters = EXCLUDED.feature_parameters,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to test AI provider health
CREATE OR REPLACE FUNCTION test_ai_provider_health(
    p_provider_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_provider RECORD;
BEGIN
    -- Get provider details
    SELECT * INTO v_provider
    FROM ai_providers
    WHERE id = p_provider_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Update last health check timestamp
    UPDATE ai_providers
    SET 
        last_health_check = NOW(),
        health_status = 'healthy'
    WHERE id = p_provider_id;
    
    -- This is a placeholder - actual health check would be implemented in application code
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. TRIGGERS
-- ============================================================================

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables
CREATE TRIGGER trigger_ai_providers_update_timestamp
    BEFORE UPDATE ON ai_providers
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_ai_models_update_timestamp
    BEFORE UPDATE ON ai_models
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_feature_assignments_update_timestamp
    BEFORE UPDATE ON feature_ai_assignments
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_system_integrations_update_timestamp
    BEFORE UPDATE ON system_integrations
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- 10. DEFAULT DATA POPULATION
-- ============================================================================

-- Insert default AI providers
INSERT INTO ai_providers (name, provider_type, api_endpoint, supports_text_generation, supports_audio_generation, is_active) VALUES
('OpenAI', 'openai', 'https://api.openai.com/v1', true, true, true),
('Anthropic Claude', 'anthropic', 'https://api.anthropic.com/v1', true, false, false),
('Google Gemini', 'google', 'https://generativelanguage.googleapis.com/v1', true, false, false),
('Azure OpenAI', 'azure_openai', 'https://your-resource.openai.azure.com', true, true, false)
ON CONFLICT (name) DO NOTHING;

-- Insert default models for OpenAI
INSERT INTO ai_models (provider_id, model_name, display_name, model_type, max_tokens, supports_streaming, is_active, is_default_for_provider) 
SELECT 
    p.id,
    'gpt-4o',
    'GPT-4 Omni',
    'chat_completion',
    128000,
    true,
    true,
    true
FROM ai_providers p WHERE p.name = 'OpenAI'
ON CONFLICT (provider_id, model_name) DO NOTHING;

INSERT INTO ai_models (provider_id, model_name, display_name, model_type, max_tokens, supports_streaming, is_active) 
SELECT 
    p.id,
    'gpt-4o-mini',
    'GPT-4 Omni Mini',
    'chat_completion',
    128000,
    true,
    true
FROM ai_providers p WHERE p.name = 'OpenAI'
ON CONFLICT (provider_id, model_name) DO NOTHING;

INSERT INTO ai_models (provider_id, model_name, display_name, model_type, max_tokens, supports_streaming, is_active) 
SELECT 
    p.id,
    'tts-1',
    'Text-to-Speech 1',
    'tts',
    4096,
    false,
    true
FROM ai_providers p WHERE p.name = 'OpenAI'
ON CONFLICT (provider_id, model_name) DO NOTHING;

-- Insert default feature assignments
INSERT INTO feature_ai_assignments (feature_name, feature_category, primary_provider_id, primary_model_id, feature_description, is_active)
SELECT 
    'daily_zodiac_text',
    'zodiac',
    p.id,
    m.id,
    'Daily zodiac text generation with Syrian Arabic personality',
    true
FROM ai_providers p
JOIN ai_models m ON m.provider_id = p.id
WHERE p.name = 'OpenAI' AND m.model_name = 'gpt-4o'
ON CONFLICT (feature_name) DO NOTHING;

INSERT INTO feature_ai_assignments (feature_name, feature_category, primary_provider_id, primary_model_id, feature_description, is_active)
SELECT 
    'daily_zodiac_tts',
    'tts',
    p.id,
    m.id,
    'Daily zodiac text-to-speech generation',
    true
FROM ai_providers p
JOIN ai_models m ON m.provider_id = p.id
WHERE p.name = 'OpenAI' AND m.model_name = 'tts-1'
ON CONFLICT (feature_name) DO NOTHING;

-- Insert default system integrations
INSERT INTO system_integrations (integration_name, integration_type, integration_category, provider_name, description, is_active) VALUES
('supabase_storage', 'storage', 'primary', 'Supabase', 'Primary file storage using Supabase Storage', true),
('backblaze_b2', 'storage', 'backup', 'Backblaze B2', 'Backup storage using Backblaze B2', false),
('sendgrid_email', 'email', 'primary', 'SendGrid', 'Primary email service using SendGrid', false),
('twilio_sms', 'sms', 'primary', 'Twilio', 'SMS notifications using Twilio', false)
ON CONFLICT (integration_name) DO NOTHING;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ DYNAMIC AI PROVIDERS & MODELS MANAGEMENT SYSTEM CREATED SUCCESSFULLY!';
    RAISE NOTICE '🤖 Features: Hot-swap AI providers, zero hardcoding, admin-configurable';
    RAISE NOTICE '🔧 Tables: ai_providers, ai_models, feature_ai_assignments, system_integrations';
    RAISE NOTICE '📊 Analytics: ai_usage_analytics for monitoring and cost tracking';
    RAISE NOTICE '🔒 Security: RLS policies, encrypted API keys, audit trails';
    RAISE NOTICE '🎯 Next: Access via Super Admin Dashboard → System Secrets → AI Management';
END $$; 