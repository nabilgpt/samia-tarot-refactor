-- =============================================================================
-- SAMIA TAROT - APP CONFIGURATION TABLE
-- =============================================================================
-- This table stores all dynamic configuration values for external integrations
-- =============================================================================

-- Create app_config table
CREATE TABLE IF NOT EXISTS app_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  section VARCHAR(50) NOT NULL CHECK (section IN ('ai', 'database', 'storage', 'notifications', 'general')),
  editable BOOLEAN DEFAULT true,
  encrypted BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_app_config_section ON app_config(section);
CREATE INDEX IF NOT EXISTS idx_app_config_key ON app_config(key);
CREATE INDEX IF NOT EXISTS idx_app_config_editable ON app_config(editable);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_app_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_app_config_updated_at
  BEFORE UPDATE ON app_config
  FOR EACH ROW
  EXECUTE FUNCTION update_app_config_updated_at();

-- Insert default configuration values
INSERT INTO app_config (key, value, section, editable, description) VALUES
-- AI Configuration
('ai_providers', '[]', 'ai', true, 'List of available AI providers'),
('ai_default_provider', '"openai"', 'ai', true, 'Default AI provider to use'),
('ai_default_model', '"gpt-4"', 'ai', true, 'Default AI model to use'),

-- Database Configuration
('database_type', '"supabase"', 'database', true, 'Primary database type'),
('supabase_url', '""', 'database', true, 'Supabase project URL'),
('supabase_anon_key', '""', 'database', true, 'Supabase anonymous key'),
('supabase_service_key', '""', 'database', true, 'Supabase service role key'),
('supabase_storage_bucket', '"samia-tarot-uploads"', 'database', true, 'Supabase storage bucket name'),

-- Storage Configuration
('storage_provider', '"supabase"', 'storage', true, 'Default storage provider'),
('b2_bucket_name', '""', 'storage', true, 'Backblaze B2 bucket name'),
('b2_endpoint_url', '""', 'storage', true, 'Backblaze B2 endpoint URL'),
('b2_access_key_id', '""', 'storage', true, 'Backblaze B2 access key ID'),
('b2_secret_access_key', '""', 'storage', true, 'Backblaze B2 secret access key'),

-- Notification Configuration
('notifications_enabled', 'true', 'notifications', true, 'Enable/disable notifications'),
('email_provider', '"sendgrid"', 'notifications', true, 'Email service provider'),
('push_notifications_enabled', 'true', 'notifications', true, 'Enable push notifications'),

-- General Configuration
('app_name', '"Samia Tarot"', 'general', true, 'Application name'),
('app_version', '"1.0.0"', 'general', false, 'Application version'),
('maintenance_mode', 'false', 'general', true, 'Maintenance mode toggle')

ON CONFLICT (key) DO NOTHING;

-- Enable RLS (Row Level Security)
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access only
CREATE POLICY "Admin can manage app config" ON app_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Grant permissions
GRANT ALL ON app_config TO authenticated;
GRANT USAGE ON SEQUENCE app_config_id_seq TO authenticated; 