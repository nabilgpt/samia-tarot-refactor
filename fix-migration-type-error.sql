-- Enhanced Providers System Migration - Fixed Version
-- Addresses the "column type does not exist" error
-- SAMIA TAROT - 2025-01-15

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (to avoid conflicts)
DROP TABLE IF EXISTS provider_audit_log CASCADE;
DROP TABLE IF EXISTS provider_secrets CASCADE;
DROP TABLE IF EXISTS provider_models CASCADE;
DROP TABLE IF EXISTS provider_services CASCADE;
DROP TABLE IF EXISTS providers CASCADE;

-- 1. PROVIDERS TABLE
CREATE TABLE providers (
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
CREATE TABLE provider_services (
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
CREATE TABLE provider_models (
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
CREATE TABLE provider_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    model_id UUID REFERENCES provider_models(id) ON DELETE SET NULL,
    secret_key VARCHAR(128) NOT NULL,
    secret_value_encrypted TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    UNIQUE(provider_id, secret_key)
);

-- INDEXES for performance
CREATE INDEX idx_providers_type ON providers(provider_type);
CREATE INDEX idx_providers_active ON providers(active);
CREATE INDEX idx_provider_services_provider_id ON provider_services(provider_id);
CREATE INDEX idx_provider_services_active ON provider_services(active);
CREATE INDEX idx_provider_models_provider_id ON provider_models(provider_id);
CREATE INDEX idx_provider_models_active ON provider_models(active);
CREATE INDEX idx_provider_secrets_provider_id ON provider_secrets(provider_id);
CREATE INDEX idx_provider_secrets_model_id ON provider_secrets(model_id);
CREATE INDEX idx_provider_secrets_active ON provider_secrets(active);

-- UPDATED_AT TRIGGER FUNCTION
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

-- SEED DATA - Default Providers (using provider_type instead of type)
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

-- COMMENTS
COMMENT ON TABLE providers IS 'Enhanced providers system - main providers table';
COMMENT ON TABLE provider_services IS 'Services offered by each provider';
COMMENT ON TABLE provider_models IS 'Models available from each provider';
COMMENT ON TABLE provider_secrets IS 'Encrypted secrets/API keys for providers';

-- Verify the tables were created
SELECT 'providers' as table_name, count(*) as record_count FROM providers
UNION ALL
SELECT 'provider_services' as table_name, count(*) as record_count FROM provider_services
UNION ALL
SELECT 'provider_models' as table_name, count(*) as record_count FROM provider_models
UNION ALL
SELECT 'provider_secrets' as table_name, count(*) as record_count FROM provider_secrets; 