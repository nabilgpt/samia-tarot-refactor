-- SAMIA TAROT System Configuration Tables
-- Run these SQL commands in your Supabase SQL Editor

-- 1. AI Providers Table
CREATE TABLE IF NOT EXISTS ai_providers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  provider_type VARCHAR(100) NOT NULL, -- 'openai', 'gemini', 'anthropic', 'custom'
  host_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  models JSONB DEFAULT '[]'::jsonb, -- Array of available models
  active_model VARCHAR(255), -- Currently selected model
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_provider_name UNIQUE(name),
  CONSTRAINT valid_provider_type CHECK (provider_type IN ('openai', 'gemini', 'anthropic', 'custom'))
);

-- 2. System Configurations Table
CREATE TABLE IF NOT EXISTS system_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_type VARCHAR(100) NOT NULL UNIQUE, -- 'supabase', 'backblaze_b2', etc.
  config_data JSONB NOT NULL, -- JSON configuration data
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_config_type CHECK (config_type IN ('supabase', 'backblaze_b2', 'smtp', 'payment_gateway'))
);

-- 3. Notification Logs Table (for tracking broadcast notifications)
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  target_audience VARCHAR(100) NOT NULL, -- 'clients', 'readers', 'monitors', 'all'
  priority VARCHAR(50) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  delivery_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_target_audience CHECK (target_audience IN ('clients', 'readers', 'monitors', 'all')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  CONSTRAINT valid_delivery_status CHECK (delivery_status IN ('pending', 'sent', 'failed', 'partial'))
);

-- 4. Individual Notification Deliveries Table
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_log_id UUID REFERENCES notification_logs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  delivery_status VARCHAR(50) DEFAULT 'pending',
  delivered_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_individual_delivery_status CHECK (delivery_status IN ('pending', 'delivered', 'failed')),
  CONSTRAINT unique_notification_user UNIQUE(notification_log_id, user_id)
);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_providers_active ON ai_providers(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_providers_type ON ai_providers(provider_type);
CREATE INDEX IF NOT EXISTS idx_system_configurations_type ON system_configurations(config_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_audience ON notification_logs(target_audience);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status ON notification_deliveries(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user ON notification_deliveries(user_id);

-- 6. Row Level Security (RLS) Policies
ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;

-- Admin-only access to AI providers
CREATE POLICY "Admin can manage AI providers" ON ai_providers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Admin-only access to system configurations
CREATE POLICY "Admin can manage system configurations" ON system_configurations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Admin-only access to notification logs
CREATE POLICY "Admin can manage notification logs" ON notification_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Users can view their own notification deliveries
CREATE POLICY "Users can view their notification deliveries" ON notification_deliveries
  FOR SELECT USING (user_id = auth.uid());

-- Admin can manage all notification deliveries
CREATE POLICY "Admin can manage notification deliveries" ON notification_deliveries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 7. Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_ai_providers_updated_at 
  BEFORE UPDATE ON ai_providers 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_configurations_updated_at 
  BEFORE UPDATE ON system_configurations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Insert default AI provider configurations (optional)
INSERT INTO ai_providers (name, provider_type, host_url, api_key, models, active_model, is_active)
VALUES 
  ('OpenAI', 'openai', 'https://api.openai.com/v1', 'your-openai-api-key-here', 
   '["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"]'::jsonb, 
   'gpt-4o', true)
ON CONFLICT (name) DO NOTHING;

-- 9. Insert default system configurations (optional)
INSERT INTO system_configurations (config_type, config_data, is_active)
VALUES 
  ('supabase', '{
    "project_url": "https://your-project.supabase.co",
    "anon_key": "your-anon-key-here",
    "service_key": "your-service-key-here",
    "is_active": true
  }'::jsonb, true),
  ('backblaze_b2', '{
    "bucket_name": "",
    "access_key": "",
    "secret_key": "",
    "region": "",
    "endpoint": "",
    "is_active": false
  }'::jsonb, false)
ON CONFLICT (config_type) DO NOTHING;

-- 10. Grant necessary permissions
GRANT ALL ON ai_providers TO authenticated;
GRANT ALL ON system_configurations TO authenticated;
GRANT ALL ON notification_logs TO authenticated;
GRANT ALL ON notification_deliveries TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated; 