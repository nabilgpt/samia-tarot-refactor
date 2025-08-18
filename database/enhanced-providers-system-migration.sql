-- Enhanced Providers & Secrets Management System Migration
-- SAMIA TAROT - Dashboard Enhancement
-- Created: 2025-01-15

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROVIDERS TABLE
CREATE TABLE IF NOT EXISTS providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(64) UNIQUE NOT NULL,
    provider_type VARCHAR(32) NOT NULL CHECK (provider_type IN ('AI', 'payments', 'tts', 'storage', 'analytics', 'communication', 'security', 'other')),
    logo_url VARCHAR(256),
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- 2. PROVIDER SERVICES TABLE
CREATE TABLE IF NOT EXISTS provider_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    UNIQUE(provider_id, name)
);

-- 3. PROVIDER MODELS TABLE
CREATE TABLE IF NOT EXISTS provider_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    UNIQUE(provider_id, name)
);

-- 4. PROVIDER SECRETS TABLE
CREATE TABLE IF NOT EXISTS provider_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    model_id UUID REFERENCES provider_models(id) ON DELETE SET NULL,
    secret_key VARCHAR(128) NOT NULL,
    secret_value_encrypted TEXT NOT NULL,
    usage_scope VARCHAR(32)[] DEFAULT ARRAY['backend'],
    services UUID[] DEFAULT ARRAY[]::UUID[],
    region VARCHAR(32),
    expiration_date TIMESTAMP,
    tags VARCHAR(64)[] DEFAULT ARRAY[]::VARCHAR[],
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    CONSTRAINT unique_secret_per_provider_key UNIQUE(provider_id, secret_key, region)
);

-- INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_providers_type ON providers(provider_type);
CREATE INDEX IF NOT EXISTS idx_providers_active ON providers(active);
CREATE INDEX IF NOT EXISTS idx_provider_services_provider_id ON provider_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_active ON provider_services(active);
CREATE INDEX IF NOT EXISTS idx_provider_models_provider_id ON provider_models(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_models_active ON provider_models(active);
CREATE INDEX IF NOT EXISTS idx_provider_secrets_provider_id ON provider_secrets(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_secrets_model_id ON provider_secrets(model_id);
CREATE INDEX IF NOT EXISTS idx_provider_secrets_active ON provider_secrets(active);
CREATE INDEX IF NOT EXISTS idx_provider_secrets_usage_scope ON provider_secrets USING GIN(usage_scope);
CREATE INDEX IF NOT EXISTS idx_provider_secrets_services ON provider_secrets USING GIN(services);
CREATE INDEX IF NOT EXISTS idx_provider_secrets_tags ON provider_secrets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_provider_secrets_expiration ON provider_secrets(expiration_date);

-- TRIGGER FUNCTIONS for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- TRIGGERS for updated_at
CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_provider_services_updated_at BEFORE UPDATE ON provider_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_provider_models_updated_at BEFORE UPDATE ON provider_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_provider_secrets_updated_at BEFORE UPDATE ON provider_secrets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS POLICIES (Row Level Security)
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_secrets ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users with proper roles
CREATE POLICY "Users can view providers" ON providers FOR SELECT USING (auth.role() IN ('authenticated'));
CREATE POLICY "Admins can manage providers" ON providers FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

CREATE POLICY "Users can view services" ON provider_services FOR SELECT USING (auth.role() IN ('authenticated'));
CREATE POLICY "Admins can manage services" ON provider_services FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

CREATE POLICY "Users can view models" ON provider_models FOR SELECT USING (auth.role() IN ('authenticated'));
CREATE POLICY "Admins can manage models" ON provider_models FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

CREATE POLICY "Super admins can view secrets" ON provider_secrets FOR SELECT USING (auth.jwt() ->> 'role' = 'super_admin');
CREATE POLICY "Super admins can manage secrets" ON provider_secrets FOR ALL USING (auth.jwt() ->> 'role' = 'super_admin');

-- SEED DATA - Default Providers
INSERT INTO providers (name, provider_type, description, logo_url) VALUES
    ('OpenAI', 'AI', 'OpenAI GPT models and services', 'https://openai.com/favicon.ico'),
    ('Anthropic', 'AI', 'Claude AI models and services', 'https://anthropic.com/favicon.ico'),
    ('Google', 'AI', 'Google AI services and models', 'https://google.com/favicon.ico'),
    ('Stripe', 'payments', 'Payment processing platform', 'https://stripe.com/favicon.ico'),
    ('ElevenLabs', 'tts', 'Text-to-speech AI services', 'https://elevenlabs.io/favicon.ico'),
    ('Twilio', 'communication', 'Communication APIs and services', 'https://twilio.com/favicon.ico'),
    ('AWS', 'storage', 'Amazon Web Services cloud platform', 'https://aws.amazon.com/favicon.ico'),
    ('Supabase', 'storage', 'Open source Firebase alternative', 'https://supabase.com/favicon.ico')
ON CONFLICT (name) DO NOTHING;

-- SEED DATA - Default Services
INSERT INTO provider_services (provider_id, name, description) VALUES
    ((SELECT id FROM providers WHERE name = 'OpenAI'), 'Chat Completions', 'GPT chat completion API'),
    ((SELECT id FROM providers WHERE name = 'OpenAI'), 'Embeddings', 'Text embedding generation'),
    ((SELECT id FROM providers WHERE name = 'OpenAI'), 'Image Generation', 'DALL-E image generation'),
    ((SELECT id FROM providers WHERE name = 'Anthropic'), 'Messages', 'Claude chat messages API'),
    ((SELECT id FROM providers WHERE name = 'Google'), 'Translate', 'Google Translate API'),
    ((SELECT id FROM providers WHERE name = 'Stripe'), 'Payments', 'Payment processing'),
    ((SELECT id FROM providers WHERE name = 'Stripe'), 'Subscriptions', 'Subscription management'),
    ((SELECT id FROM providers WHERE name = 'ElevenLabs'), 'Text to Speech', 'Voice synthesis'),
    ((SELECT id FROM providers WHERE name = 'Twilio'), 'SMS', 'SMS messaging service'),
    ((SELECT id FROM providers WHERE name = 'AWS'), 'S3', 'Object storage service'),
    ((SELECT id FROM providers WHERE name = 'Supabase'), 'Database', 'PostgreSQL database'),
    ((SELECT id FROM providers WHERE name = 'Supabase'), 'Storage', 'File storage service')
ON CONFLICT (provider_id, name) DO NOTHING;

-- SEED DATA - Default Models
INSERT INTO provider_models (provider_id, name, description) VALUES
    ((SELECT id FROM providers WHERE name = 'OpenAI'), 'gpt-4', 'GPT-4 model'),
    ((SELECT id FROM providers WHERE name = 'OpenAI'), 'gpt-4-turbo', 'GPT-4 Turbo model'),
    ((SELECT id FROM providers WHERE name = 'OpenAI'), 'gpt-3.5-turbo', 'GPT-3.5 Turbo model'),
    ((SELECT id FROM providers WHERE name = 'OpenAI'), 'text-embedding-3-large', 'Large embedding model'),
    ((SELECT id FROM providers WHERE name = 'OpenAI'), 'dall-e-3', 'DALL-E 3 image generation'),
    ((SELECT id FROM providers WHERE name = 'Anthropic'), 'claude-3-opus', 'Claude 3 Opus model'),
    ((SELECT id FROM providers WHERE name = 'Anthropic'), 'claude-3-sonnet', 'Claude 3 Sonnet model'),
    ((SELECT id FROM providers WHERE name = 'Anthropic'), 'claude-3-haiku', 'Claude 3 Haiku model'),
    ((SELECT id FROM providers WHERE name = 'ElevenLabs'), 'eleven_multilingual_v2', 'Multilingual voice model'),
    ((SELECT id FROM providers WHERE name = 'ElevenLabs'), 'eleven_turbo_v2', 'Fast voice synthesis model')
ON CONFLICT (provider_id, name) DO NOTHING;

-- HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION get_provider_stats(provider_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'services_count', (SELECT COUNT(*) FROM provider_services WHERE provider_id = provider_uuid AND active = true),
        'models_count', (SELECT COUNT(*) FROM provider_models WHERE provider_id = provider_uuid AND active = true),
        'secrets_count', (SELECT COUNT(*) FROM provider_secrets WHERE provider_id = provider_uuid AND active = true)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_secret_with_details(secret_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'id', ps.id,
        'provider', json_build_object('id', p.id, 'name', p.name, 'type', p.provider_type),
        'model', CASE WHEN pm.id IS NOT NULL THEN json_build_object('id', pm.id, 'name', pm.name) ELSE NULL END,
        'services', (
            SELECT json_agg(json_build_object('id', srv.id, 'name', srv.name))
            FROM provider_services srv
            WHERE srv.id = ANY(ps.services)
        ),
        'secret_key', ps.secret_key,
        'usage_scope', ps.usage_scope,
        'region', ps.region,
        'expiration_date', ps.expiration_date,
        'tags', ps.tags,
        'description', ps.description,
        'active', ps.active,
        'created_at', ps.created_at,
        'updated_at', ps.updated_at
    ) INTO result
    FROM provider_secrets ps
    JOIN providers p ON ps.provider_id = p.id
    LEFT JOIN provider_models pm ON ps.model_id = pm.id
    WHERE ps.id = secret_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- AUDIT LOG TABLE (for tracking changes)
CREATE TABLE IF NOT EXISTS provider_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(64) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(32) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_by VARCHAR(255),
    changed_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_audit_log_table_record ON provider_audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_provider_audit_log_changed_at ON provider_audit_log(changed_at);

-- AUDIT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION provider_audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO provider_audit_log (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        changed_by
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
        current_setting('request.jwt.claims', true)::json ->> 'email'
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- AUDIT TRIGGERS
CREATE TRIGGER providers_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON providers FOR EACH ROW EXECUTE FUNCTION provider_audit_trigger_function();
CREATE TRIGGER provider_services_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON provider_services FOR EACH ROW EXECUTE FUNCTION provider_audit_trigger_function();
CREATE TRIGGER provider_models_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON provider_models FOR EACH ROW EXECUTE FUNCTION provider_audit_trigger_function();
CREATE TRIGGER provider_secrets_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON provider_secrets FOR EACH ROW EXECUTE FUNCTION provider_audit_trigger_function();

-- COMMENTS
COMMENT ON TABLE providers IS 'Enhanced providers system - main providers table';
COMMENT ON TABLE provider_services IS 'Services offered by each provider';
COMMENT ON TABLE provider_models IS 'Models available from each provider';
COMMENT ON TABLE provider_secrets IS 'Encrypted secrets/API keys for providers with dynamic linking';
COMMENT ON TABLE provider_audit_log IS 'Audit log for all provider system changes'; 