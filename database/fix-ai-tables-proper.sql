-- ===============================================
-- FIX AI TABLES PROPERLY - Handle Foreign Keys
-- ===============================================

-- First, let's check and fix the ai_models table structure
DO $$
BEGIN
  -- Add name column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_models' AND column_name='name') THEN
    ALTER TABLE ai_models ADD COLUMN name VARCHAR(100) NOT NULL DEFAULT 'Unnamed Model';
  END IF;
END $$;

-- Drop ai_prompts table if it exists to recreate it properly
DROP TABLE IF EXISTS ai_prompts CASCADE;

-- Create system_configs table if missing
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

-- Now recreate ai_prompts table with proper foreign key to ai_models
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_prompts_model_id ON ai_prompts(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_category ON ai_prompts(category);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_type ON ai_prompts(prompt_type);
CREATE INDEX IF NOT EXISTS idx_system_configs_key ON system_configs(key);

-- Success message
SELECT 'AI tables fixed properly and ready for seeding.' as message; 