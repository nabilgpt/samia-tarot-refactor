-- ===============================================
-- FINAL SCHEMA FIX - ALL MISSING COLUMNS
-- Copy and paste this in Supabase SQL Editor
-- ===============================================

-- Add missing columns to services table
DO $$
BEGIN
  -- Add features column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='features') THEN
    ALTER TABLE services ADD COLUMN features TEXT[];
  END IF;
  
  -- Add min_price column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='min_price') THEN
    ALTER TABLE services ADD COLUMN min_price DECIMAL(10,2);
  END IF;
  
  -- Add max_price column  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='max_price') THEN
    ALTER TABLE services ADD COLUMN max_price DECIMAL(10,2);
  END IF;
  
  -- Add status column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='status') THEN
    ALTER TABLE services ADD COLUMN status VARCHAR(20) DEFAULT 'active';
  END IF;
  
  -- Add category column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='category') THEN
    ALTER TABLE services ADD COLUMN category VARCHAR(50);
  END IF;
END $$;

-- Add missing columns to ai_models table  
DO $$
BEGIN
  -- Add description column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_models' AND column_name='description') THEN
    ALTER TABLE ai_models ADD COLUMN description TEXT;
  END IF;
  
  -- Add model_type column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_models' AND column_name='model_type') THEN
    ALTER TABLE ai_models ADD COLUMN model_type VARCHAR(50);
  END IF;
  
  -- Add provider column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_models' AND column_name='provider') THEN
    ALTER TABLE ai_models ADD COLUMN provider VARCHAR(50);
  END IF;
  
  -- Add model_version column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_models' AND column_name='model_version') THEN
    ALTER TABLE ai_models ADD COLUMN model_version VARCHAR(50);
  END IF;
  
  -- Add accuracy_score column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_models' AND column_name='accuracy_score') THEN
    ALTER TABLE ai_models ADD COLUMN accuracy_score DECIMAL(3,2) DEFAULT 0.95;
  END IF;
  
  -- Add status column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_models' AND column_name='status') THEN
    ALTER TABLE ai_models ADD COLUMN status VARCHAR(20) DEFAULT 'active';
  END IF;
  
  -- Add response_time column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_models' AND column_name='response_time') THEN
    ALTER TABLE ai_models ADD COLUMN response_time DECIMAL(5,2);
  END IF;
  
  -- Add cost_per_request column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_models' AND column_name='cost_per_request') THEN
    ALTER TABLE ai_models ADD COLUMN cost_per_request DECIMAL(6,4);
  END IF;
  
  -- Add max_tokens column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_models' AND column_name='max_tokens') THEN
    ALTER TABLE ai_models ADD COLUMN max_tokens INTEGER DEFAULT 1000;
  END IF;
  
  -- Add temperature column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_models' AND column_name='temperature') THEN
    ALTER TABLE ai_models ADD COLUMN temperature DECIMAL(3,2) DEFAULT 0.7;
  END IF;
END $$;

-- Add missing columns to profiles table
DO $$
BEGIN
  -- Add is_verified column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_verified') THEN
    ALTER TABLE profiles ADD COLUMN is_verified BOOLEAN DEFAULT false;
  END IF;
  
  -- Add is_active column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_active') THEN
    ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
  
  -- Add password_hash column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='password_hash') THEN
    ALTER TABLE profiles ADD COLUMN password_hash VARCHAR(255);
  END IF;
END $$;

-- Create ai_prompts table with all required columns
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

-- Update existing data with default values
UPDATE services SET status = 'active' WHERE status IS NULL;
UPDATE ai_models SET status = 'active' WHERE status IS NULL;
UPDATE ai_models SET accuracy_score = 0.95 WHERE accuracy_score IS NULL;
UPDATE profiles SET is_verified = false WHERE is_verified IS NULL;
UPDATE profiles SET is_active = true WHERE is_active IS NULL;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_ai_models_provider ON ai_models(provider);
CREATE INDEX IF NOT EXISTS idx_ai_models_status ON ai_models(status);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON profiles(is_verified);

-- Success message
SELECT 'All database columns have been added successfully! Ready for seed data.' as result; 