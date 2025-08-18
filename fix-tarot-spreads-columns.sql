-- Fix for missing tarot_spreads columns
-- Run this in your Supabase SQL Editor

-- Add missing columns to tarot_spreads table
ALTER TABLE tarot_spreads ADD COLUMN IF NOT EXISTS is_temporary BOOLEAN DEFAULT false;
ALTER TABLE tarot_spreads ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
ALTER TABLE tarot_spreads ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE tarot_spreads ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE tarot_spreads ADD COLUMN IF NOT EXISTS layout_type TEXT DEFAULT 'grid';
ALTER TABLE tarot_spreads ADD COLUMN IF NOT EXISTS max_cards INTEGER DEFAULT 78;

-- Update existing spreads with proper defaults
UPDATE tarot_spreads 
SET 
  is_temporary = COALESCE(is_temporary, false),
  is_public = COALESCE(is_public, true),
  layout_type = COALESCE(layout_type, 'grid'),
  max_cards = COALESCE(max_cards, 78)
WHERE is_temporary IS NULL OR is_public IS NULL OR layout_type IS NULL OR max_cards IS NULL;

-- Verify the columns were added successfully
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'tarot_spreads' 
AND column_name IN ('is_temporary', 'is_public', 'description', 'description_ar', 'layout_type', 'max_cards')
ORDER BY column_name; 