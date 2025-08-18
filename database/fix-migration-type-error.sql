-- Fixed Enhanced Providers & Secrets Management System Migration
-- SAMIA TAROT - Dashboard Enhancement
-- Created: 2025-01-15
-- Fixed: Column reference errors

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist to start fresh
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
CREATE INDEX idx_providers_type ON providers(provider_type);
CREATE INDEX idx_providers_active ON providers(active);
CREATE INDEX idx_provider_services_provider_id ON provider_services(provider_id);
CREATE INDEX idx_provider_services_active ON provider_services(active);
CREATE INDEX idx_provider_models_provider_id ON provider_models(provider_id);
CREATE INDEX idx_provider_models_active ON provider_models(active);
CREATE INDEX idx_provider_secrets_provider_id ON provider_secrets(provider_id);
CREATE INDEX idx_provider_secrets_model_id ON provider_secrets(model_id);
CREATE INDEX idx_provider_secrets_active ON provider_secrets(active);
CREATE INDEX idx_provider_secrets_usage_scope ON provider_secrets USING GIN(usage_scope);
CREATE INDEX idx_provider_secrets_services ON provider_secrets USING GIN(services);
CREATE INDEX idx_provider_secrets_tags ON provider_secrets USING GIN(tags);

-- SAMPLE DATA
INSERT INTO providers (name, provider_type, description, logo_url) VALUES
('OpenAI', 'AI', 'Advanced AI language models and services', 'https://openai.com/favicon.ico'),
('Anthropic', 'AI', 'Claude AI assistant and language models', 'https://anthropic.com/favicon.ico'),
('Google Cloud', 'AI', 'Google Cloud AI and machine learning services', 'https://cloud.google.com/favicon.ico'),
('Microsoft Azure', 'AI', 'Azure AI and cognitive services', 'https://azure.microsoft.com/favicon.ico'),
('Stripe', 'payments', 'Online payment processing platform', 'https://stripe.com/favicon.ico'),
('PayPal', 'payments', 'Digital payment and money transfer service', 'https://paypal.com/favicon.ico'),
('ElevenLabs', 'tts', 'AI voice synthesis and text-to-speech', 'https://elevenlabs.io/favicon.ico'),
('Amazon S3', 'storage', 'Cloud storage and content delivery', 'https://aws.amazon.com/favicon.ico');

INSERT INTO provider_services (provider_id, name, description) VALUES
((SELECT id FROM providers WHERE name = 'OpenAI'), 'chat', 'Chat completion API'),
((SELECT id FROM providers WHERE name = 'OpenAI'), 'completion', 'Text completion API'),
((SELECT id FROM providers WHERE name = 'OpenAI'), 'embedding', 'Text embedding API'),
((SELECT id FROM providers WHERE name = 'OpenAI'), 'image', 'Image generation API'),
((SELECT id FROM providers WHERE name = 'Anthropic'), 'chat', 'Claude chat API'),
((SELECT id FROM providers WHERE name = 'Anthropic'), 'completion', 'Claude completion API'),
((SELECT id FROM providers WHERE name = 'Google Cloud'), 'translation', 'Google Translate API'),
((SELECT id FROM providers WHERE name = 'Google Cloud'), 'vision', 'Google Vision API'),
((SELECT id FROM providers WHERE name = 'Stripe'), 'payment', 'Payment processing'),
((SELECT id FROM providers WHERE name = 'PayPal'), 'payment', 'PayPal payment processing'),
((SELECT id FROM providers WHERE name = 'ElevenLabs'), 'tts', 'Text-to-speech conversion'),
((SELECT id FROM providers WHERE name = 'Amazon S3'), 'storage', 'File storage and retrieval');

INSERT INTO provider_models (provider_id, name, description) VALUES
((SELECT id FROM providers WHERE name = 'OpenAI'), 'gpt-4', 'Most capable GPT-4 model'),
((SELECT id FROM providers WHERE name = 'OpenAI'), 'gpt-3.5-turbo', 'Fast and efficient GPT-3.5 model'),
((SELECT id FROM providers WHERE name = 'OpenAI'), 'text-embedding-ada-002', 'Text embedding model'),
((SELECT id FROM providers WHERE name = 'OpenAI'), 'dall-e-3', 'Image generation model'),
((SELECT id FROM providers WHERE name = 'Anthropic'), 'claude-3-opus', 'Most capable Claude model'),
((SELECT id FROM providers WHERE name = 'Anthropic'), 'claude-3-sonnet', 'Balanced Claude model'),
((SELECT id FROM providers WHERE name = 'Anthropic'), 'claude-3-haiku', 'Fastest Claude model'),
((SELECT id FROM providers WHERE name = 'Google Cloud'), 'translate-v3', 'Google Translate v3 API'),
((SELECT id FROM providers WHERE name = 'ElevenLabs'), 'eleven-multilingual-v2', 'Multilingual voice model'),
((SELECT id FROM providers WHERE name = 'ElevenLabs'), 'eleven-turbo-v2', 'Fast voice synthesis model');

-- Success message
SELECT 'Enhanced Providers System migration completed successfully!' as status; 