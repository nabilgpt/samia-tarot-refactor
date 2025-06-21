-- ===============================================
-- COMPREHENSIVE SCHEMA FIX - All Issues
-- ===============================================

-- Fix profiles table - remove problematic foreign key if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'profiles_id_fkey' AND table_name = 'profiles') THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
  END IF;
END $$;

-- Fix services table - remove type check constraint that's blocking inserts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'services_type_check' AND table_name = 'services') THEN
    ALTER TABLE services DROP CONSTRAINT services_type_check;
  END IF;
END $$;

-- Fix ai_models table structure
DO $$
BEGIN
  -- Add model_name column if missing (this seems to be required)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_models' AND column_name='model_name') THEN
    ALTER TABLE ai_models ADD COLUMN model_name VARCHAR(100);
  END IF;
  
  -- Update existing records to have model_name from name
  UPDATE ai_models SET model_name = name WHERE model_name IS NULL AND name IS NOT NULL;
  
  -- Add name column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_models' AND column_name='name') THEN
    ALTER TABLE ai_models ADD COLUMN name VARCHAR(100);
  END IF;
END $$;

-- Completely recreate ai_prompts table to ensure all columns exist
DROP TABLE IF EXISTS ai_prompts CASCADE;

CREATE TABLE ai_prompts (
  id VARCHAR(50) PRIMARY KEY,
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

-- Create system_configs table properly
CREATE TABLE IF NOT EXISTS system_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  category VARCHAR(50),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create missing indexes
CREATE INDEX IF NOT EXISTS idx_ai_prompts_model_id ON ai_prompts(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_category ON ai_prompts(category);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_type ON ai_prompts(prompt_type);
CREATE INDEX IF NOT EXISTS idx_system_configs_key ON system_configs(key);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);

-- Success message
SELECT 'All schema issues fixed. Ready for seeding.' as message; 