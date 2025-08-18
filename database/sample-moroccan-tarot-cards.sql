-- =====================================================
-- MOROCCAN TAROT DECK - 48 CARDS SAMPLE DATA
-- Traditional Moroccan tarot with cultural symbolism
-- =====================================================

-- First, ensure the Moroccan deck exists
INSERT INTO tarot_decks (
  id,
  name, 
  name_ar, 
  description, 
  description_ar, 
  deck_type, 
  total_cards, 
  is_default, 
  is_active, 
  supports_reversals,
  cultural_origin,
  metaphysical_system
) VALUES (
  gen_random_uuid(),
  'Traditional Moroccan Tarot',
  'الكارطة المغربية التقليدية',
  '48-card traditional Moroccan deck with rich cultural symbolism and deep spiritual meanings rooted in North African mysticism',
  'مجموعة مغربية تقليدية من 48 ورقة مع رمزية ثقافية غنية ومعاني روحية عميقة متجذرة في التصوف المغاربي',
  'moroccan',
  48,
  true,
  true,
  true,
  'Moroccan',
  'Traditional Moroccan'
) ON CONFLICT (id) DO NOTHING;

-- Get the deck ID for reference
-- Note: In production, you would use the actual UUID generated above

-- =====================================================
-- MOROCCAN TAROT CARDS - 48 CARDS
-- =====================================================

-- Major Arcana (22 cards) - الأركانا الكبرى
INSERT INTO tarot_cards (
  deck_id,
  card_key,
  name,
  name_ar,
  card_number,
  arcana_type,
  image_url,
  upright_meaning,
  reversed_meaning,
  upright_keywords,
  reversed_keywords,
  upright_meaning_ar,
  reversed_meaning_ar,
  upright_keywords_ar,
  reversed_keywords_ar,
  love_upright,
  love_reversed,
  love_upright_ar,
  love_reversed_ar,
  career_upright,
  career_reversed,
  career_upright_ar,
  career_reversed_ar,
  symbolism,
  symbolism_ar,
  cultural_significance,
  cultural_significance_ar
) VALUES
-- Card 0: The Fool - المجنون
((SELECT id FROM tarot_decks WHERE deck_type = 'moroccan' AND is_default = true LIMIT 1),
'the-fool', 'The Fool', 'المجنون', 0, 'major', '/images/moroccan/major/00-fool.jpg',
'New beginnings, innocence, spontaneity, free spirit, adventure',
'Recklessness, taken advantage of, inconsideration, foolishness',
'{"new beginnings", "innocence", "adventure", "potential", "freedom"}',
'{"recklessness", "foolishness", "naivety", "poor judgment", "lack of direction"}',
'البدايات الجديدة، البراءة، التلقائية، الروح الحرة، المغامرة',
'التهور، الاستغلال، عدم المراعاة، الحماقة',
'{"بدايات جديدة", "براءة", "مغامرة", "إمكانات", "حرية"}',
'{"تهور", "حماقة", "سذاجة", "سوء تقدير", "فقدان الاتجاه"}',
'A new love beginning with pure intentions and open heart',
'Rushing into love without thinking, being naive about relationships',
'حب جديد يبدأ بنوايا صافية وقلب مفتوح',
'التسرع في الحب دون تفكير، السذاجة في العلاقات',
'Starting a new career path, taking calculated risks in work',
'Making poor career decisions, lack of planning in professional life',
'بدء مسار مهني جديد، المخاطرة المحسوبة في العمل',
'اتخاذ قرارات مهنية سيئة، نقص التخطيط في الحياة المهنية',
'A young traveler at the edge of a cliff, representing life journey',
'شاب مسافر على حافة جرف، يمثل رحلة الحياة',
'Represents the innocent soul beginning spiritual journey in Moroccan Sufi tradition',
'يمثل الروح البريئة التي تبدأ الرحلة الروحية في التقليد الصوفي المغربي'),

-- Card 1: The Magician - الساحر  
((SELECT id FROM tarot_decks WHERE deck_type = 'moroccan' AND is_default = true LIMIT 1),
'the-magician', 'The Magician', 'الساحر', 1, 'major', '/images/moroccan/major/01-magician.jpg',
'Manifestation, resourcefulness, power, inspired action, creation',
'Manipulation, poor planning, untapped talents, deception',
'{"manifestation", "willpower", "creation", "resourcefulness", "power"}',
'{"manipulation", "deception", "illusion", "lack of energy", "confusion"}',
'الإظهار، الحيلة، القوة، العمل الملهم، الخلق',
'التلاعب، سوء التخطيط، المواهب غير المستغلة، الخداع',
'{"إظهار", "قوة الإرادة", "خلق", "حيلة", "قوة"}',
'{"تلاعب", "خداع", "وهم", "نقص الطاقة", "ارتباك"}',
'Using your charm and skills to attract love, manifesting romance',
'Being manipulative in relationships, using love for personal gain',
'استخدام سحرك ومهاراتك لجذب الحب، إظهار الرومانسية',
'التلاعب في العلاقات، استخدام الحب للمنفعة الشخصية',
'Using skills and resources to achieve career goals, leadership',
'Misusing power at work, being deceptive in professional dealings',
'استخدام المهارات والموارد لتحقيق الأهداف المهنية، القيادة',
'سوء استخدام السلطة في العمل، الخداع في التعاملات المهنية',
'A wise man with tools of the four elements, symbolizing mastery',
'رجل حكيم مع أدوات العناصر الأربعة، يرمز للإتقان',
'Connected to Moroccan tradition of wise healers and spiritual guides',
'مرتبط بالتقليد المغربي للمعالجين الحكماء والمرشدين الروحيين'),

-- Card 2: The High Priestess - الكاهنة العليا
((SELECT id FROM tarot_decks WHERE deck_type = 'moroccan' AND is_default = true LIMIT 1),
'the-high-priestess', 'The High Priestess', 'الكاهنة العليا', 2, 'major', '/images/moroccan/major/02-high-priestess.jpg',
'Intuition, sacred knowledge, divine feminine, the subconscious',
'Secrets, disconnected from intuition, withdrawal, silence',
'{"intuition", "mystery", "subconscious", "inner voice", "sacred feminine"}',
'{"secrets", "withdrawal", "repressed feelings", "lack of center", "lost inner voice"}',
'الحدس، المعرفة المقدسة، الأنثوية الإلهية، اللاوعي',
'الأسرار، الانقطاع عن الحدس، الانسحاب، الصمت',
'{"حدس", "غموض", "لا وعي", "صوت داخلي", "أنوثة مقدسة"}',
'{"أسرار", "انسحاب", "مشاعر مكبوتة", "فقدان المركز", "فقدان الصوت الداخلي"}',
'Deep emotional connection, intuitive understanding of partner',
'Hidden emotions, secrets in relationship, emotional withdrawal',
'اتصال عاطفي عميق، فهم حدسي للشريك',
'مشاعر مخفية، أسرار في العلاقة، انسحاب عاطفي',
'Trusting intuition in career decisions, inner wisdom guiding work',
'Ignoring gut feelings about work, being secretive at workplace',
'الثقة في الحدس في القرارات المهنية، الحكمة الداخلية توجه العمل',
'تجاهل المشاعر الغريزية حول العمل، السرية في مكان العمل',
'Veiled woman between two pillars, guardian of sacred mysteries',
'امرأة محجبة بين عمودين، حارسة الأسرار المقدسة',
'Reflects the honored position of wise women in Moroccan culture',
'يعكس المكانة المحترمة للنساء الحكيمات في الثقافة المغربية'),

-- Continue with remaining Major Arcana cards...
-- Card 3: The Empress - الإمبراطورة
((SELECT id FROM tarot_decks WHERE deck_type = 'moroccan' AND is_default = true LIMIT 1),
'the-empress', 'The Empress', 'الإمبراطورة', 3, 'major', '/images/moroccan/major/03-empress.jpg',
'Femininity, beauty, nature, nurturing, abundance, creativity',
'Creative block, dependence on others, smothering, lack of growth',
'{"femininity", "beauty", "nature", "nurturing", "abundance"}',
'{"creative block", "dependence", "smothering", "lack of growth", "emptiness"}',
'الأنوثة، الجمال، الطبيعة، الرعاية، الوفرة، الإبداع',
'الحصار الإبداعي، الاعتماد على الآخرين، الإفراط في الحماية، نقص النمو',
'{"أنوثة", "جمال", "طبيعة", "رعاية", "وفرة"}',
'{"حصار إبداعي", "اعتماد", "إفراط في الحماية", "نقص النمو", "فراغ"}',
'Nurturing love, fertility, pregnancy, abundant affection',
'Smothering partner, over-dependence, lack of self-love',
'حب راعي، خصوبة، حمل، عاطفة وفيرة',
'خنق الشريك، فرط الاعتماد، نقص حب الذات',
'Creative career flourishing, nurturing work environment, abundance',
'Lack of creativity at work, depending too much on others professionally',
'ازدهار المهنة الإبداعية، بيئة عمل راعية، وفرة',
'نقص الإبداع في العمل، الاعتماد المفرط على الآخرين مهنياً',
'Pregnant woman surrounded by nature, symbolizing fertility and creation',
'امرأة حامل محاطة بالطبيعة، ترمز للخصوبة والخلق',
'Represents the fertility goddesses honored in pre-Islamic Morocco',
'تمثل آلهة الخصوبة المكرمة في المغرب ما قبل الإسلام');

-- Minor Arcana - الأركانا الصغرى (26 cards total)
-- Suit of Cups - كؤوس (6 cards in Moroccan deck)
INSERT INTO tarot_cards (
  deck_id, card_key, name, name_ar, card_number, arcana_type, suit, suit_ar, element,
  image_url, upright_meaning, reversed_meaning, upright_keywords, reversed_keywords,
  upright_meaning_ar, reversed_meaning_ar, upright_keywords_ar, reversed_keywords_ar,
  love_upright, love_reversed, love_upright_ar, love_reversed_ar,
  career_upright, career_reversed, career_upright_ar, career_reversed_ar,
  symbolism, symbolism_ar, cultural_significance, cultural_significance_ar
) VALUES
-- Ace of Cups - آس الكؤوس
((SELECT id FROM tarot_decks WHERE deck_type = 'moroccan' AND is_default = true LIMIT 1),
'ace-of-cups', 'Ace of Cups', 'آس الكؤوس', 1, 'minor', 'cups', 'كؤوس', 'water',
'/images/moroccan/cups/ace-cups.jpg',
'New emotional beginning, love, compassion, creativity, spirituality',
'Emotional loss, blocked creativity, emptiness, spiritual disconnect',
'{"new love", "emotional beginning", "creativity", "intuition", "spirituality"}',
'{"emotional loss", "blocked creativity", "emptiness", "sadness", "spiritual void"}',
'بداية عاطفية جديدة، حب، رحمة، إبداع، روحانية',
'فقدان عاطفي، إبداع محجوب، فراغ، انقطاع روحي',
'{"حب جديد", "بداية عاطفية", "إبداع", "حدس", "روحانية"}',
'{"فقدان عاطفي", "إبداع محجوب", "فراغ", "حزن", "فراغ روحي"}',
'New love entering your life, emotional fulfillment, pure love',
'Missed love opportunity, emotional emptiness, heartbreak',
'حب جديد يدخل حياتك، إشباع عاطفي، حب صافي',
'فرصة حب ضائعة، فراغ عاطفي، كسر القلب',
'Creative career opportunity, work that fulfills emotionally',
'Lack of passion in work, creative block in career',
'فرصة مهنية إبداعية، عمل يحقق الإشباع العاطفي',
'نقص الشغف في العمل، حصار إبداعي في المهنة',
'Overflowing cup representing divine love and blessing',
'كأس فائض يمثل الحب الإلهي والبركة',
'Sacred tea ceremony significance in Moroccan hospitality culture',
'أهمية حفل الشاي المقدس في ثقافة الضيافة المغربية'),

-- Two of Cups - ثنائي الكؤوس
((SELECT id FROM tarot_decks WHERE deck_type = 'moroccan' AND is_default = true LIMIT 1),
'two-of-cups', 'Two of Cups', 'ثنائي الكؤوس', 2, 'minor', 'cups', 'كؤوس', 'water',
'/images/moroccan/cups/two-cups.jpg',
'Partnership, unity, mutual attraction, relationships, connection',
'Broken relationship, imbalance, lack of harmony, separation',
'{"partnership", "love", "unity", "attraction", "harmony"}',
'{"broken relationship", "imbalance", "disharmony", "separation", "arguments"}',
'شراكة، وحدة، جاذبية متبادلة، علاقات، ارتباط',
'علاقة مكسورة، عدم توازن، نقص الانسجام، انفصال',
'{"شراكة", "حب", "وحدة", "جاذبية", "انسجام"}',
'{"علاقة مكسورة", "عدم توازن", "عدم انسجام", "انفصال", "مجادلات"}',
'Perfect partnership, mutual love, engagement, wedding',
'Relationship problems, breakup, incompatibility, arguments',
'شراكة مثالية، حب متبادل، خطوبة، زواج',
'مشاكل في العلاقة، انفصال، عدم توافق، مجادلات',
'Good business partnership, teamwork, collaborative success',
'Partnership conflicts, team disagreements, broken alliances',
'شراكة تجارية جيدة، عمل جماعي، نجاح تعاوني',
'صراعات الشراكة، خلافات الفريق، تحالفات مكسورة',
'Two figures sharing cups in unity and love',
'شخصان يتشاركان الكؤوس في وحدة وحب',
'Reflects the importance of partnership in Moroccan family structure',
'يعكس أهمية الشراكة في البنية العائلية المغربية');

-- Continue with more cards...
-- [Additional cards would be inserted here following the same pattern]

-- Sample Spread Layouts for Moroccan Deck
INSERT INTO tarot_spreads (
  name, name_ar, description, description_ar, card_count, positions,
  layout_type, difficulty_level, category, reading_time_minutes,
  compatible_deck_types, is_active, is_public, approval_status
) VALUES
-- Traditional Moroccan 3-Card Spread
('Traditional Moroccan Past-Present-Future', 'الماضي والحاضر والمستقبل المغربي التقليدي',
'A simple yet powerful 3-card spread rooted in Moroccan divination traditions',
'سبريد بسيط لكن قوي من 3 كروت متجذر في تقاليد العرافة المغربية',
3, '[
  {"position": 1, "name": "Past", "name_ar": "الماضي", "meaning": "What influences from the past", "meaning_ar": "التأثيرات من الماضي", "x": 25, "y": 50},
  {"position": 2, "name": "Present", "name_ar": "الحاضر", "meaning": "Current situation", "meaning_ar": "الوضع الحالي", "x": 50, "y": 50},
  {"position": 3, "name": "Future", "name_ar": "المستقبل", "meaning": "What is to come", "meaning_ar": "ما سيأتي", "x": 75, "y": 50}
]', 'fixed', 'beginner', 'general', 15, '{"moroccan", "rider_waite", "marseille"}', true, true, 'approved'),

-- Moroccan Cross Spread
('Moroccan Cross of Wisdom', 'صليب الحكمة المغربي',
'A 5-card cross spread representing the four directions and center wisdom',
'سبريد صليب من 5 كروت يمثل الاتجاهات الأربعة والحكمة المركزية',
5, '[
  {"position": 1, "name": "Center - Heart", "name_ar": "المركز - القلب", "meaning": "Core of the matter", "meaning_ar": "جوهر الأمر", "x": 50, "y": 50},
  {"position": 2, "name": "North - Mind", "name_ar": "الشمال - العقل", "meaning": "What you think", "meaning_ar": "ما تفكر فيه", "x": 50, "y": 25},
  {"position": 3, "name": "South - Body", "name_ar": "الجنوب - الجسد", "meaning": "What you feel", "meaning_ar": "ما تشعر به", "x": 50, "y": 75},
  {"position": 4, "name": "East - Spirit", "name_ar": "الشرق - الروح", "meaning": "Spiritual guidance", "meaning_ar": "الإرشاد الروحي", "x": 75, "y": 50},
  {"position": 5, "name": "West - Soul", "name_ar": "الغرب - النفس", "meaning": "Inner wisdom", "meaning_ar": "الحكمة الداخلية", "x": 25, "y": 50}
]', 'fixed', 'intermediate', 'spiritual', 25, '{"moroccan"}', true, true, 'approved'),

-- Desert Star Spread
('Desert Star Guidance', 'إرشاد نجمة الصحراء',
'A 7-card star pattern inspired by desert navigation and Moroccan astronomy',
'نمط نجمة من 7 كروت مستوحى من ملاحة الصحراء وعلم الفلك المغربي',
7, '[
  {"position": 1, "name": "North Star", "name_ar": "النجم الشمالي", "meaning": "Your guiding light", "meaning_ar": "نورك المرشد", "x": 50, "y": 15},
  {"position": 2, "name": "Northeast", "name_ar": "الشمال الشرقي", "meaning": "New opportunities", "meaning_ar": "فرص جديدة", "x": 70, "y": 30},
  {"position": 3, "name": "Southeast", "name_ar": "الجنوب الشرقي", "meaning": "Hidden challenges", "meaning_ar": "تحديات مخفية", "x": 70, "y": 70},
  {"position": 4, "name": "South Star", "name_ar": "النجم الجنوبي", "meaning": "What grounds you", "meaning_ar": "ما يثبتك", "x": 50, "y": 85},
  {"position": 5, "name": "Southwest", "name_ar": "الجنوب الغربي", "meaning": "What you must release", "meaning_ar": "ما يجب أن تتركه", "x": 30, "y": 70},
  {"position": 6, "name": "Northwest", "name_ar": "الشمال الغربي", "meaning": "What supports you", "meaning_ar": "ما يدعمك", "x": 30, "y": 30},
  {"position": 7, "name": "Center", "name_ar": "المركز", "meaning": "Your inner truth", "meaning_ar": "حقيقتك الداخلية", "x": 50, "y": 50}
]', 'fixed', 'advanced', 'decision', 35, '{"moroccan", "wild_unknown", "starchild"}', true, true, 'approved');

-- =====================================================
-- INITIAL PERMISSIONS DATA
-- =====================================================

-- Ensure role permissions are set
INSERT INTO tarot_role_permissions (role, permission_name, permission_description, can_perform) VALUES
-- Additional Moroccan-specific permissions
('reader', 'use_moroccan_deck', 'Can perform readings with Moroccan deck', true),
('reader', 'create_moroccan_spreads', 'Can create custom Moroccan-inspired spreads', true),
('client', 'request_moroccan_reading', 'Can request readings with Moroccan deck', true),
('admin', 'manage_moroccan_content', 'Can manage Moroccan deck content', true),
('super_admin', 'modify_moroccan_deck', 'Can modify Moroccan deck structure', true)
ON CONFLICT (role, permission_name) DO NOTHING;

-- =====================================================
-- INDEXES FOR MOROCCAN DECK OPTIMIZATION
-- =====================================================

-- Optimize queries for Moroccan deck
CREATE INDEX IF NOT EXISTS idx_moroccan_cards_deck_suit ON tarot_cards(deck_id, suit) 
WHERE deck_id IN (SELECT id FROM tarot_decks WHERE deck_type = 'moroccan');

CREATE INDEX IF NOT EXISTS idx_moroccan_spreads_compatibility ON tarot_spreads USING GIN(compatible_deck_types)
WHERE 'moroccan' = ANY(compatible_deck_types);

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$ 
BEGIN 
  RAISE NOTICE 'Moroccan Tarot Deck sample data inserted successfully';
  RAISE NOTICE 'Total cards in Moroccan deck: %', (
    SELECT COUNT(*) FROM tarot_cards tc 
    JOIN tarot_decks td ON tc.deck_id = td.id 
    WHERE td.deck_type = 'moroccan'
  );
  RAISE NOTICE 'Available spreads for Moroccan deck: %', (
    SELECT COUNT(*) FROM tarot_spreads 
    WHERE 'moroccan' = ANY(compatible_deck_types)
  );
END $$; 