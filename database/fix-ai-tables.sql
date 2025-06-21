-- ===============================================
-- FIX AI TABLES - Add Missing Columns
-- ===============================================

-- Add missing columns to ai_models table
DO $$
BEGIN
  -- Add name column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_models' AND column_name='name') THEN
    ALTER TABLE ai_models ADD COLUMN name VARCHAR(100) NOT NULL DEFAULT 'Unnamed Model';
  END IF;
END $$;

-- Ensure ai_prompts table exists with all required columns
CREATE TABLE IF NOT EXISTS ai_prompts (
  id VARCHAR(50) PRIMARY KEY,
  model_id VARCHAR(50) REFERENCES ai_models(id) ON DELETE CASCADE,
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

-- Update ai_models table to use VARCHAR(50) for id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_models' AND column_name='id' AND data_type='uuid') THEN
    -- Drop foreign key constraints first
    ALTER TABLE ai_prompts DROP CONSTRAINT IF EXISTS ai_prompts_model_id_fkey;
    
    -- Change id type
    ALTER TABLE ai_models ALTER COLUMN id TYPE VARCHAR(50);
    
    -- Re-add foreign key constraint
    ALTER TABLE ai_prompts ADD CONSTRAINT ai_prompts_model_id_fkey 
      FOREIGN KEY (model_id) REFERENCES ai_models(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Success message
SELECT 'AI tables fixed and ready for seeding.' as message; 