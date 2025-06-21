-- ===============================================
-- ADD MISSING COLUMNS TO EXISTING TABLES
-- ===============================================

-- Add missing columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_verified') THEN
    ALTER TABLE profiles ADD COLUMN is_verified BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_active') THEN
    ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Add missing columns to services table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='category') THEN
    ALTER TABLE services ADD COLUMN category VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='features') THEN
    ALTER TABLE services ADD COLUMN features TEXT[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='min_price') THEN
    ALTER TABLE services ADD COLUMN min_price DECIMAL(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='max_price') THEN
    ALTER TABLE services ADD COLUMN max_price DECIMAL(10,2);
  END IF;
END $$;

-- Add missing columns to ai_models table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_models' AND column_name='model_type') THEN
    ALTER TABLE ai_models ADD COLUMN model_type VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_models' AND column_name='provider') THEN
    ALTER TABLE ai_models ADD COLUMN provider VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_models' AND column_name='model_version') THEN
    ALTER TABLE ai_models ADD COLUMN model_version VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_models' AND column_name='accuracy_score') THEN
    ALTER TABLE ai_models ADD COLUMN accuracy_score DECIMAL(3,2) DEFAULT 0.95;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_models' AND column_name='response_time') THEN
    ALTER TABLE ai_models ADD COLUMN response_time DECIMAL(5,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_models' AND column_name='cost_per_request') THEN
    ALTER TABLE ai_models ADD COLUMN cost_per_request DECIMAL(6,4);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_models' AND column_name='max_tokens') THEN
    ALTER TABLE ai_models ADD COLUMN max_tokens INTEGER DEFAULT 1000;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_models' AND column_name='temperature') THEN
    ALTER TABLE ai_models ADD COLUMN temperature DECIMAL(3,2) DEFAULT 0.7;
  END IF;
END $$;

-- Update ai_prompts table if it exists, or create it if missing
CREATE TABLE IF NOT EXISTS ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
  prompt_type VARCHAR(30) NOT NULL,
  category VARCHAR(20),
  title VARCHAR(100) NOT NULL,
  prompt_text TEXT NOT NULL,
  variables TEXT[],
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(3,2) DEFAULT 0.95,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to ai_prompts table if they don't exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='ai_prompts') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_prompts' AND column_name='category') THEN
      ALTER TABLE ai_prompts ADD COLUMN category VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_prompts' AND column_name='variables') THEN
      ALTER TABLE ai_prompts ADD COLUMN variables TEXT[];
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_prompts' AND column_name='is_active') THEN
      ALTER TABLE ai_prompts ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
  END IF;
END $$;

-- Add missing columns to bookings table for better functionality
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='service_id') THEN
    ALTER TABLE bookings ADD COLUMN service_id UUID REFERENCES services(id);
  END IF;
END $$;

-- Add missing columns to call_sessions table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='call_sessions' AND column_name='room_id') THEN
    ALTER TABLE call_sessions ADD COLUMN room_id VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='call_sessions' AND column_name='call_type') THEN
    ALTER TABLE call_sessions ADD COLUMN call_type VARCHAR(20) DEFAULT 'voice';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='call_sessions' AND column_name='is_emergency') THEN
    ALTER TABLE call_sessions ADD COLUMN is_emergency BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='call_sessions' AND column_name='scheduled_duration') THEN
    ALTER TABLE call_sessions ADD COLUMN scheduled_duration INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='call_sessions' AND column_name='booking_id') THEN
    ALTER TABLE call_sessions ADD COLUMN booking_id UUID REFERENCES bookings(id);
  END IF;
END $$;

-- Add useful indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON profiles(is_verified);

CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);

CREATE INDEX IF NOT EXISTS idx_ai_models_provider ON ai_models(provider);
CREATE INDEX IF NOT EXISTS idx_ai_models_model_type ON ai_models(model_type);
CREATE INDEX IF NOT EXISTS idx_ai_models_status ON ai_models(status);

CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);

CREATE INDEX IF NOT EXISTS idx_call_sessions_call_type ON call_sessions(call_type);
CREATE INDEX IF NOT EXISTS idx_call_sessions_is_emergency ON call_sessions(is_emergency);
CREATE INDEX IF NOT EXISTS idx_call_sessions_status ON call_sessions(status);

-- Update existing data to set default values
UPDATE profiles SET is_verified = false WHERE is_verified IS NULL;
UPDATE profiles SET is_active = true WHERE is_active IS NULL;
UPDATE services SET status = 'active' WHERE status IS NULL;
UPDATE ai_models SET status = 'active' WHERE status IS NULL;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Missing columns have been added successfully!';
  RAISE NOTICE 'Database schema is now complete and ready for seeding.';
END $$; 