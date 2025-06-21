# 🗄️ Database Schema Fixes - Application Guide

## Step 1: Access Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your SAMIA TAROT project
3. Navigate to **SQL Editor** from the left sidebar

## Step 2: Apply Missing Columns Fix

Copy and paste the following SQL script in the SQL Editor:

```sql
-- ===============================================
-- APPLY MISSING COLUMNS - COPY AND PASTE THIS
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
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='password_hash') THEN
    ALTER TABLE profiles ADD COLUMN password_hash VARCHAR(255);
  END IF;
END $$;

-- Add missing columns to services table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='category') THEN
    ALTER TABLE services ADD COLUMN category VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='status') THEN
    ALTER TABLE services ADD COLUMN status VARCHAR(20) DEFAULT 'active';
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
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_models' AND column_name='status') THEN
    ALTER TABLE ai_models ADD COLUMN status VARCHAR(20) DEFAULT 'active';
  END IF;
END $$;

-- Create ai_prompts table if missing
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

-- Update existing data
UPDATE profiles SET is_verified = false WHERE is_verified IS NULL;
UPDATE profiles SET is_active = true WHERE is_active IS NULL;
UPDATE services SET status = 'active' WHERE status IS NULL;
UPDATE ai_models SET status = 'active' WHERE status IS NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_ai_models_provider ON ai_models(provider);

-- Success message
SELECT 'Database schema has been updated successfully!' as message;
```

## Step 3: Execute the Script

1. Click **"Run"** or press Ctrl+Enter
2. Check for any errors in the output
3. You should see "Database schema has been updated successfully!" at the end

## Step 4: Verify the Changes

Run this verification query:

```sql
-- Verify new columns exist
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name IN ('profiles', 'services', 'ai_models', 'ai_prompts')
  AND column_name IN ('is_verified', 'is_active', 'category', 'status', 'accuracy_score')
ORDER BY table_name, column_name;
```

## Expected Result

You should see all the new columns listed. If any are missing, re-run the main script.

## Next Steps

After successful completion:
1. Return to terminal
2. Run `npm run db:seed` to populate initial data
3. Run `npm run deploy:check` for final verification 