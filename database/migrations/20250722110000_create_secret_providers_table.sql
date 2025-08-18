-- Migration to create the secret_providers table
-- This table allows for dynamic management of secret providers for the System Secrets tab.

CREATE TABLE IF NOT EXISTS public.secret_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    default_key TEXT, -- e.g., GOOGLE_TRANSLATE_API_KEY
    category TEXT NOT NULL DEFAULT 'API Keys',
    icon_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments to the table and columns
COMMENT ON TABLE public.secret_providers IS 'Stores provider information for secrets, allowing dynamic population of the "Add New Secret" modal.';
COMMENT ON COLUMN public.secret_providers.name IS 'The user-friendly name of the provider (e.g., "Google Translate").';
COMMENT ON COLUMN public.secret_providers.default_key IS 'The suggested default key name to be used (e.g., "GOOGLE_TRANSLATE_API_KEY").';
COMMENT ON COLUMN public.secret_providers.category IS 'The default category this secret provider belongs to.';
COMMENT ON COLUMN public.secret_providers.icon_url IS 'URL for the provider''s logo, for future UI enhancements.';

-- Create the trigger function for updated_at
CREATE OR REPLACE FUNCTION set_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at trigger to the new table
CREATE TRIGGER set_updated_at_on_secret_providers
    BEFORE UPDATE ON public.secret_providers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.secret_providers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- 1. Allow authenticated users to read all providers (for UI dropdowns)
CREATE POLICY "Allow authenticated users to read secret providers"
ON public.secret_providers FOR SELECT
TO authenticated
USING (true);

-- 2. Allow only super_admins to insert, update, or delete
CREATE POLICY "Allow super_admins to manage secret providers"
ON public.secret_providers FOR ALL
TO authenticated
USING (public.get_user_role(auth.uid()) = 'super_admin')
WITH CHECK (public.get_user_role(auth.uid()) = 'super_admin');

-- Add this table to the audit trail
-- This assumes the existence of the audit.log_changes() trigger function
-- SELECT audit.watch_table('public.secret_providers');

-- Insert some default providers to get started
INSERT INTO public.secret_providers (name, default_key, category, icon_url) VALUES
('Google Translate', 'GOOGLE_TRANSLATE_API_KEY', 'AI & Machine Learning', 'https://www.gstatic.com/images/branding/product/1x/translate_24dp.png'),
('OpenAI', 'OPENAI_API_KEY', 'AI & Machine Learning', 'https://openai.com/favicon.ico'),
('Anthropic', 'ANTHROPIC_API_KEY', 'AI & Machine Learning', 'https://www.anthropic.com/favicon.ico'),
('ElevenLabs', 'ELEVENLABS_API_KEY', 'AI & Machine Learning', 'https://elevenlabs.io/favicon.ico'),
('Stripe', 'STRIPE_SECRET_KEY', 'Payments', 'https://stripe.com/favicon.ico'),
('SendGrid', 'SENDGRID_API_KEY', 'Communication', 'https://sendgrid.com/brand/sg-twilio/favicon.ico')
ON CONFLICT (name) DO NOTHING;

-- Grant usage permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.secret_providers TO supabase_admin;
GRANT SELECT ON public.secret_providers TO authenticated;

-- Grant usage on the sequence if necessary (UUIDs don't use sequences by default)
-- No sequence to grant for UUIDs

-- Log migration completion
-- You would typically have a migrations table for this
-- INSERT INTO public.migrations (name) VALUES ('20250722110000_create_secret_providers_table');

-- --- END OF MIGRATION --- 