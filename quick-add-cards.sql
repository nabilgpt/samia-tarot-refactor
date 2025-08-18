-- Add sample tarot cards using only existing columns
-- Fixed version without description_ar column

INSERT INTO tarot_cards (
  id, 
  deck_id, 
  card_number, 
  name, 
  name_ar, 
  arcana_type, 
  upright_keywords, 
  reversed_keywords,
  card_key
) VALUES 
(
  '11111111-1111-1111-1111-111111111111',
  '3c9361a2-80d4-4c73-ae9c-d1c37fd25d0a',
  0,
  'The Fool',
  'المجنون',
  'major',
  ARRAY['new beginnings', 'innocence', 'adventure', 'freedom'],
  ARRAY['recklessness', 'risk-taking', 'foolishness'],
  'fool'
),
(
  '22222222-2222-2222-2222-222222222222',
  '3c9361a2-80d4-4c73-ae9c-d1c37fd25d0a',
  1,
  'The Magician',
  'الساحر',
  'major',
  ARRAY['manifestation', 'willpower', 'desire', 'creation'],
  ARRAY['manipulation', 'poor planning', 'untapped talents'],
  'magician'
),
(
  '33333333-3333-3333-3333-333333333333',
  '3c9361a2-80d4-4c73-ae9c-d1c37fd25d0a',
  2,
  'The High Priestess',
  'الكاهنة العليا',
  'major',
  ARRAY['intuition', 'sacred knowledge', 'divine feminine', 'subconscious'],
  ARRAY['secrets', 'disconnected from intuition', 'repressed feelings'],
  'high_priestess'
);

-- Verify the cards were added
SELECT 'Cards added successfully' as status, COUNT(*) as total_cards 
FROM tarot_cards 
WHERE deck_id = '3c9361a2-80d4-4c73-ae9c-d1c37fd25d0a'; 