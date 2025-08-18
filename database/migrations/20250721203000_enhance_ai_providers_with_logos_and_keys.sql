-- Add logo_url and configuration_key to ai_providers table
ALTER TABLE public.ai_providers
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS configuration_key TEXT;

-- Add comments to the new columns
COMMENT ON COLUMN public.ai_providers.logo_url IS 'URL for the provider logo image, to be displayed in the UI.';
COMMENT ON COLUMN public.ai_providers.configuration_key IS 'The specific key used to look up the provider''s API key in the system_secrets table (e.g., OPENAI_API_KEY).';

-- Create an index on configuration_key for faster lookups, as it will be used for joining/linking.
CREATE INDEX IF NOT EXISTS idx_ai_providers_configuration_key ON public.ai_providers(configuration_key);

-- Populate the new columns for existing, known providers.
-- This makes the system immediately functional for the most common services.
UPDATE public.ai_providers
SET 
    configuration_key = 'OPENAI_API_KEY',
    logo_url = '/assets/providers/openai.png'
WHERE provider_type = 'openai' AND configuration_key IS NULL;

UPDATE public.ai_providers
SET 
    configuration_key = 'ANTHROPIC_API_KEY',
    logo_url = '/assets/providers/anthropic.png'
WHERE provider_type = 'anthropic' AND configuration_key IS NULL;

UPDATE public.ai_providers
SET 
    configuration_key = 'GOOGLE_AI_API_KEY',
    logo_url = '/assets/providers/google.png'
WHERE provider_type = 'google' AND configuration_key IS NULL;

UPDATE public.ai_providers
SET 
    configuration_key = 'ELEVENLABS_API_KEY',
    logo_url = '/assets/providers/elevenlabs.png'
WHERE provider_type = 'elevenlabs' AND configuration_key IS NULL;

UPDATE public.ai_providers
SET 
    configuration_key = 'STRIPE_API_KEY',
    logo_url = '/assets/providers/stripe.png'
WHERE provider_type = 'stripe' AND configuration_key IS NULL;

-- Log that the migration has been applied
INSERT INTO public.migrations (name) VALUES ('enhance_ai_providers_with_logos_and_keys');

-- Final check to confirm the update
SELECT id, name, provider_type, logo_url, configuration_key from public.ai_providers; 