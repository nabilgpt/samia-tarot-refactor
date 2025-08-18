#!/usr/bin/env node

/**
 * 🔧 Simple migration to fix the deck_id column issue
 */

console.log('🔧 Running simple migration to fix deck_id column...');

// Simple SQL to add the deck_id column
const sql = `
-- Add deck_id column if it doesn't exist
ALTER TABLE tarot_cards 
ADD COLUMN IF NOT EXISTS deck_id UUID;

-- Create a default deck if none exists
INSERT INTO tarot_decks (id, name, name_ar, description, description_ar, deck_type, total_cards, is_default, is_active)
SELECT 
  gen_random_uuid(),
  'Traditional Moroccan Tarot',
  'الكارطة المغربية التقليدية',
  '48-card traditional Moroccan deck with rich cultural symbolism',
  'مجموعة مغربية تقليدية من 48 ورقة مع رمزية ثقافية غنية',
  'moroccan',
  48,
  true,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM tarot_decks WHERE deck_type = 'moroccan' AND is_default = true
);

-- Update existing cards to use the default deck
UPDATE tarot_cards 
SET deck_id = (
  SELECT id FROM tarot_decks 
  WHERE deck_type = 'moroccan' AND is_default = true 
  LIMIT 1
)
WHERE deck_id IS NULL;
`;

console.log('📄 SQL to execute:');
console.log(sql);
console.log('🔧 Execute this SQL in your Supabase dashboard or use the backend migration endpoint.'); 