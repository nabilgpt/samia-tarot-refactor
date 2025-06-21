-- =====================================================
-- MOROCCAN TAROT DECK SYSTEM - الكارطة المغربية
-- Complete 48-card Moroccan deck with traditional spreads
-- =====================================================

-- =====================================================
-- UPDATE TAROT DECKS FOR MOROCCAN SYSTEM
-- =====================================================

-- Update the Moroccan deck to have 48 cards
UPDATE tarot_decks 
SET total_cards = 48, 
    description = 'Traditional Moroccan tarot deck with 48 cards and cultural symbolism',
    description_ar = 'مجموعة التاروت المغربية التقليدية مع 48 ورقة والرمزية الثقافية'
WHERE deck_type = 'moroccan';

-- =====================================================
-- MOROCCAN TAROT CARDS - 48 CARDS TOTAL
-- =====================================================

-- Create table for Moroccan tarot cards
CREATE TABLE IF NOT EXISTS moroccan_tarot_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  suit TEXT CHECK (suit IN ('swords', 'cups', 'coins', 'clubs')) NOT NULL,
  value INTEGER NOT NULL, -- 1-12 for each suit
  description TEXT,
  description_ar TEXT,
  upright_meaning TEXT,
  upright_meaning_ar TEXT,
  reversed_meaning TEXT,
  reversed_meaning_ar TEXT,
  image_url TEXT,
  deck_id UUID REFERENCES tarot_decks(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INSERT 48 MOROCCAN CARDS
-- =====================================================

DO $$
DECLARE
  moroccan_deck_id UUID;
BEGIN
  -- Get Moroccan deck ID
  SELECT id INTO moroccan_deck_id FROM tarot_decks WHERE deck_type = 'moroccan' LIMIT 1;
  
  -- SWORDS (السيوف) - 12 cards
  INSERT INTO moroccan_tarot_cards (card_number, name, name_ar, suit, value, upright_meaning, upright_meaning_ar, reversed_meaning, reversed_meaning_ar, deck_id) VALUES
  (1, 'Ace of Swords', 'آس السيوف', 'swords', 1, 'New ideas, mental clarity, breakthrough', 'أفكار جديدة، وضوح ذهني، اختراق', 'Confusion, miscommunication, lack of clarity', 'ارتباك، سوء تفاهم، نقص في الوضوح', moroccan_deck_id),
  (2, 'Two of Swords', 'اثنان من السيوف', 'swords', 2, 'Difficult decisions, weighing options', 'قرارات صعبة، وزن الخيارات', 'Indecision, confusion, information overload', 'تردد، ارتباك، زيادة في المعلومات', moroccan_deck_id),
  (3, 'Three of Swords', 'ثلاثة من السيوف', 'swords', 3, 'Heartbreak, sorrow, grief', 'كسر القلب، حزن، حداد', 'Recovery, forgiveness, moving on', 'تعافي، مسامحة، المضي قدماً', moroccan_deck_id),
  (4, 'Four of Swords', 'أربعة من السيوف', 'swords', 4, 'Rest, meditation, peace', 'راحة، تأمل، سلام', 'Restlessness, burnout, lack of progress', 'قلق، إرهاق، نقص في التقدم', moroccan_deck_id),
  (5, 'Five of Swords', 'خمسة من السيوف', 'swords', 5, 'Conflict, defeat, winning at all costs', 'صراع، هزيمة، الفوز بأي ثمن', 'Reconciliation, making amends', 'مصالحة، تصحيح الأخطاء', moroccan_deck_id),
  (6, 'Six of Swords', 'ستة من السيوف', 'swords', 6, 'Transition, moving forward, travel', 'انتقال، المضي قدماً، سفر', 'Stuck in the past, resistance to change', 'عالق في الماضي، مقاومة التغيير', moroccan_deck_id),
  (7, 'Seven of Swords', 'سبعة من السيوف', 'swords', 7, 'Deception, strategy, getting away with something', 'خداع، استراتيجية، الإفلات من شيء', 'Confession, coming clean, taking responsibility', 'اعتراف، الصراحة، تحمل المسؤولية', moroccan_deck_id),
  (8, 'Eight of Swords', 'ثمانية من السيوف', 'swords', 8, 'Restriction, imprisonment, victim mentality', 'قيود، سجن، عقلية الضحية', 'Freedom, release, self-empowerment', 'حرية، تحرر، تمكين الذات', moroccan_deck_id),
  (9, 'Nine of Swords', 'تسعة من السيوف', 'swords', 9, 'Anxiety, worry, nightmares', 'قلق، قلق، كوابيس', 'Recovery, hope, healing', 'تعافي، أمل، شفاء', moroccan_deck_id),
  (10, 'Ten of Swords', 'عشرة من السيوف', 'swords', 10, 'Painful endings, betrayal, rock bottom', 'نهايات مؤلمة، خيانة، القاع', 'Recovery, regeneration, new beginnings', 'تعافي، تجديد، بدايات جديدة', moroccan_deck_id),
  (11, 'Knight of Swords', 'فارس السيوف', 'swords', 11, 'Action, impulsiveness, rushing into battle', 'عمل، اندفاع، الاندفاع للمعركة', 'Recklessness, impatience, lack of direction', 'تهور، نفاد صبر، نقص في الاتجاه', moroccan_deck_id),
  (12, 'King of Swords', 'ملك السيوف', 'swords', 12, 'Authority, intellectual power, truth', 'سلطة، قوة فكرية، حقيقة', 'Abuse of power, manipulation, tyranny', 'إساءة استخدام السلطة، تلاعب، طغيان', moroccan_deck_id),

  -- CUPS (الكؤوس) - 12 cards  
  (13, 'Ace of Cups', 'آس الكؤوس', 'cups', 1, 'New love, emotional fulfillment, spiritual awakening', 'حب جديد، إشباع عاطفي، صحوة روحية', 'Emotional loss, blocked creativity, emptiness', 'خسارة عاطفية، إبداع محجوب، فراغ', moroccan_deck_id),
  (14, 'Two of Cups', 'اثنان من الكؤوس', 'cups', 2, 'Partnership, unity, mutual attraction', 'شراكة، وحدة، جذب متبادل', 'Imbalance, broken relationship, disharmony', 'عدم توازن، علاقة مكسورة، عدم انسجام', moroccan_deck_id),
  (15, 'Three of Cups', 'ثلاثة من الكؤوس', 'cups', 3, 'Celebration, friendship, community', 'احتفال، صداقة، مجتمع', 'Overindulgence, gossip, isolation', 'إفراط، نميمة، عزلة', moroccan_deck_id),
  (16, 'Four of Cups', 'أربعة من الكؤوس', 'cups', 4, 'Apathy, contemplation, disconnection', 'لامبالاة، تأمل، انقطاع', 'Motivation, re-engagement, new possibilities', 'دافع، إعادة مشاركة، إمكانيات جديدة', moroccan_deck_id),
  (17, 'Five of Cups', 'خمسة من الكؤوس', 'cups', 5, 'Loss, grief, disappointment', 'خسارة، حزن، خيبة أمل', 'Acceptance, moving on, finding peace', 'قبول، المضي قدماً، العثور على السلام', moroccan_deck_id),
  (18, 'Six of Cups', 'ستة من الكؤوس', 'cups', 6, 'Nostalgia, childhood memories, innocence', 'حنين، ذكريات الطفولة، براءة', 'Living in the past, naivety, lack of progress', 'العيش في الماضي، سذاجة، نقص في التقدم', moroccan_deck_id),
  (19, 'Seven of Cups', 'سبعة من الكؤوس', 'cups', 7, 'Illusion, choices, wishful thinking', 'وهم، خيارات، تفكير بالأماني', 'Clarity, determination, making decisions', 'وضوح، تصميم، اتخاذ قرارات', moroccan_deck_id),
  (20, 'Eight of Cups', 'ثمانية من الكؤوس', 'cups', 8, 'Walking away, seeking deeper meaning', 'الابتعاد، البحث عن معنى أعمق', 'Stagnation, fear of change, staying in comfort zone', 'ركود، خوف من التغيير، البقاء في منطقة الراحة', moroccan_deck_id),
  (21, 'Nine of Cups', 'تسعة من الكؤوس', 'cups', 9, 'Satisfaction, emotional fulfillment, luxury', 'رضا، إشباع عاطفي، رفاهية', 'Greed, dissatisfaction, materialism', 'جشع، عدم رضا، مادية', moroccan_deck_id),
  (22, 'Ten of Cups', 'عشرة من الكؤوس', 'cups', 10, 'Happiness, family harmony, emotional fulfillment', 'سعادة، انسجام عائلي، إشباع عاطفي', 'Family conflict, broken relationships, disharmony', 'صراع عائلي، علاقات مكسورة، عدم انسجام', moroccan_deck_id),
  (23, 'Knight of Cups', 'فارس الكؤوس', 'cups', 11, 'Romance, charm, following your heart', 'رومانسية، سحر، اتباع قلبك', 'Moodiness, unrealistic expectations, jealousy', 'تقلبات مزاجية، توقعات غير واقعية، غيرة', moroccan_deck_id),
  (24, 'King of Cups', 'ملك الكؤوس', 'cups', 12, 'Emotional maturity, compassion, diplomacy', 'نضج عاطفي، تعاطف، دبلوماسية', 'Emotional manipulation, moodiness, lack of compassion', 'تلاعب عاطفي، تقلبات مزاجية، نقص في التعاطف', moroccan_deck_id),

  -- COINS (النقود) - 12 cards
  (25, 'Ace of Coins', 'آس النقود', 'coins', 1, 'New financial opportunity, manifestation', 'فرصة مالية جديدة، تجسيد', 'Lost opportunity, lack of planning, poor investment', 'فرصة ضائعة، نقص في التخطيط، استثمار سيء', moroccan_deck_id),
  (26, 'Two of Coins', 'اثنان من النقود', 'coins', 2, 'Balance, adaptability, time management', 'توازن، قدرة على التكيف، إدارة الوقت', 'Imbalance, disorganization, overwhelmed', 'عدم توازن، عدم تنظيم، مرهق', moroccan_deck_id),
  (27, 'Three of Coins', 'ثلاثة من النقود', 'coins', 3, 'Teamwork, collaboration, building', 'عمل جماعي، تعاون، بناء', 'Lack of teamwork, disharmony, poor planning', 'نقص في العمل الجماعي، عدم انسجام، تخطيط سيء', moroccan_deck_id),
  (28, 'Four of Coins', 'أربعة من النقود', 'coins', 4, 'Security, conservation, control', 'أمان، حفظ، سيطرة', 'Greed, materialism, financial insecurity', 'جشع، مادية، عدم أمان مالي', moroccan_deck_id),
  (29, 'Five of Coins', 'خمسة من النقود', 'coins', 5, 'Financial loss, poverty, isolation', 'خسارة مالية، فقر، عزلة', 'Recovery, charity, spiritual wealth', 'تعافي، خيرية، ثروة روحية', moroccan_deck_id),
  (30, 'Six of Coins', 'ستة من النقود', 'coins', 6, 'Generosity, charity, sharing wealth', 'كرم، خيرية، مشاركة الثروة', 'Selfishness, debt, one-sided charity', 'أنانية، دين، خيرية من جانب واحد', moroccan_deck_id),
  (31, 'Seven of Coins', 'سبعة من النقود', 'coins', 7, 'Assessment, long-term view, perseverance', 'تقييم، نظرة طويلة المدى، مثابرة', 'Lack of growth, impatience, poor investment', 'نقص في النمو، نفاد صبر، استثمار سيء', moroccan_deck_id),
  (32, 'Eight of Coins', 'ثمانية من النقود', 'coins', 8, 'Skill development, craftsmanship, hard work', 'تطوير المهارات، حرفية، عمل شاق', 'Lack of focus, poor quality, shortcuts', 'نقص في التركيز، جودة سيئة، طرق مختصرة', moroccan_deck_id),
  (33, 'Nine of Coins', 'تسعة من النقود', 'coins', 9, 'Independence, luxury, self-sufficiency', 'استقلالية، رفاهية، اكتفاء ذاتي', 'Financial dependence, lack of self-worth, isolation', 'اعتماد مالي، نقص في قيمة الذات، عزلة', moroccan_deck_id),
  (34, 'Ten of Coins', 'عشرة من النقود', 'coins', 10, 'Wealth, family legacy, long-term success', 'ثروة، إرث عائلي، نجاح طويل المدى', 'Financial failure, lack of stability, family conflict', 'فشل مالي، نقص في الاستقرار، صراع عائلي', moroccan_deck_id),
  (35, 'Knight of Coins', 'فارس النقود', 'coins', 11, 'Hard work, productivity, routine', 'عمل شاق، إنتاجية، روتين', 'Laziness, obsessiveness, work without reward', 'كسل، هوس، عمل بدون مكافأة', moroccan_deck_id),
  (36, 'King of Coins', 'ملك النقود', 'coins', 12, 'Financial success, security, leadership', 'نجاح مالي، أمان، قيادة', 'Greed, materialistic, financially reckless', 'جشع، مادي، متهور مالياً', moroccan_deck_id),

  -- CLUBS (العصي) - 12 cards
  (37, 'Ace of Clubs', 'آس العصي', 'clubs', 1, 'Creative energy, inspiration, new ventures', 'طاقة إبداعية، إلهام، مشاريع جديدة', 'Lack of energy, creative blocks, delays', 'نقص في الطاقة، عوائق إبداعية، تأخير', moroccan_deck_id),
  (38, 'Two of Clubs', 'اثنان من العصي', 'clubs', 2, 'Planning, making decisions, personal power', 'تخطيط، اتخاذ قرارات، قوة شخصية', 'Fear of unknown, lack of planning, bad decisions', 'خوف من المجهول، نقص في التخطيط، قرارات سيئة', moroccan_deck_id),
  (39, 'Three of Clubs', 'ثلاثة من العصي', 'clubs', 3, 'Expansion, foresight, overseas opportunities', 'توسع، بصيرة، فرص خارجية', 'Lack of foresight, unexpected delays, obstacles', 'نقص في البصيرة، تأخير غير متوقع، عوائق', moroccan_deck_id),
  (40, 'Four of Clubs', 'أربعة من العصي', 'clubs', 4, 'Celebration, harmony, homecoming', 'احتفال، انسجام، عودة للوطن', 'Lack of support, instability, discord', 'نقص في الدعم، عدم استقرار، خلاف', moroccan_deck_id),
  (41, 'Five of Clubs', 'خمسة من العصي', 'clubs', 5, 'Competition, conflict, disagreements', 'منافسة، صراع، خلافات', 'Avoiding conflict, seeking compromise', 'تجنب الصراع، البحث عن تسوية', moroccan_deck_id),
  (42, 'Six of Clubs', 'ستة من العصي', 'clubs', 6, 'Victory, success, public recognition', 'انتصار، نجاح، اعتراف عام', 'Private achievement, lack of recognition, delays', 'إنجاز خاص، نقص في الاعتراف، تأخير', moroccan_deck_id),
  (43, 'Seven of Clubs', 'سبعة من العصي', 'clubs', 7, 'Challenge, perseverance, defensive', 'تحدي، مثابرة، دفاعي', 'Giving up, lack of courage, overwhelmed', 'الاستسلام، نقص في الشجاعة، مرهق', moroccan_deck_id),
  (44, 'Eight of Clubs', 'ثمانية من العصي', 'clubs', 8, 'Speed, rapid action, movement', 'سرعة، عمل سريع، حركة', 'Delays, frustration, lack of energy', 'تأخير، إحباط، نقص في الطاقة', moroccan_deck_id),
  (45, 'Nine of Clubs', 'تسعة من العصي', 'clubs', 9, 'Resilience, persistence, last stand', 'مرونة، إصرار، موقف أخير', 'Exhaustion, giving up, lack of fight', 'إرهاق، الاستسلام، نقص في القتال', moroccan_deck_id),
  (46, 'Ten of Clubs', 'عشرة من العصي', 'clubs', 10, 'Burden, responsibility, hard work', 'عبء، مسؤولية، عمل شاق', 'Delegation, release of burdens, breakdown', 'تفويض، تحرر من الأعباء، انهيار', moroccan_deck_id),
  (47, 'Knight of Clubs', 'فارس العصي', 'clubs', 11, 'Adventure, impulsiveness, passion', 'مغامرة، اندفاع، شغف', 'Recklessness, impatience, lack of direction', 'تهور، نفاد صبر، نقص في الاتجاه', moroccan_deck_id),
  (48, 'King of Clubs', 'ملك العصي', 'clubs', 12, 'Leadership, vision, entrepreneur', 'قيادة، رؤية، ريادي', 'Impulsiveness, overbearing, lack of long-term vision', 'اندفاع، متسلط، نقص في الرؤية طويلة المدى', moroccan_deck_id);

END $$;

-- =====================================================
-- TRADITIONAL MOROCCAN SPREADS
-- =====================================================

DO $$
DECLARE
  moroccan_deck_id UUID;
  system_user_id UUID;
BEGIN
  -- Get Moroccan deck ID
  SELECT id INTO moroccan_deck_id FROM tarot_decks WHERE deck_type = 'moroccan' LIMIT 1;
  
  -- Get or create system user
  SELECT id INTO system_user_id FROM profiles WHERE role = 'super_admin' LIMIT 1;
  IF system_user_id IS NULL THEN
    INSERT INTO profiles (id, email, role, first_name, last_name) 
    VALUES (gen_random_uuid(), 'system@samia-tarot.com', 'super_admin', 'System', 'Admin')
    RETURNING id INTO system_user_id;
  END IF;

  -- Insert traditional Moroccan spreads
  INSERT INTO tarot_spreads (
    name, name_ar, description, description_ar, card_count, positions, 
    difficulty_level, category, deck_id, is_custom, approval_status, 
    created_by, approved_by, approved_at
  ) VALUES 

  -- الانتشار الثلاثي - Three Card Spread
  (
    'Three Card Spread', 'الانتشار الثلاثي',
    'Traditional Moroccan three-card reading for past, present, and future insights', 
    'قراءة مغربية تقليدية بثلاث أوراق للماضي والحاضر والمستقبل',
    3,
    '[
      {"position": 1, "name": "Past", "name_ar": "الماضي", "meaning": "Past influences and foundations", "meaning_ar": "تأثيرات الماضي والأسس", "x": 20, "y": 50},
      {"position": 2, "name": "Present", "name_ar": "الحاضر", "meaning": "Current situation and energy", "meaning_ar": "الوضع الحالي والطاقة", "x": 50, "y": 50},
      {"position": 3, "name": "Future", "name_ar": "المستقبل", "meaning": "Future potential and guidance", "meaning_ar": "الإمكانات المستقبلية والإرشاد", "x": 80, "y": 50}
    ]'::jsonb,
    'beginner', 'general', moroccan_deck_id, false, 'approved', system_user_id, system_user_id, NOW()
  ),

  -- انتشار الحب المغربي - Moroccan Love Spread
  (
    'Moroccan Love Spread', 'انتشار الحب المغربي',
    'Five-card spread focusing on love and relationships in Moroccan tradition',
    'انتشار خمس أوراق يركز على الحب والعلاقات في التقليد المغربي',
    5,
    '[
      {"position": 1, "name": "Your Heart", "name_ar": "قلبك", "meaning": "Your emotional state and desires", "meaning_ar": "حالتك العاطفية ورغباتك", "x": 30, "y": 70},
      {"position": 2, "name": "Their Heart", "name_ar": "قلبهم", "meaning": "Their emotional state and feelings", "meaning_ar": "حالتهم العاطفية ومشاعرهم", "x": 70, "y": 70},
      {"position": 3, "name": "Connection", "name_ar": "الاتصال", "meaning": "The bond between you", "meaning_ar": "الرابط بينكما", "x": 50, "y": 40},
      {"position": 4, "name": "Challenges", "name_ar": "التحديات", "meaning": "Obstacles in your path", "meaning_ar": "العوائق في طريقكما", "x": 20, "y": 20},
      {"position": 5, "name": "Outcome", "name_ar": "النتيجة", "meaning": "Where this relationship leads", "meaning_ar": "إلى أين تقود هذه العلاقة", "x": 80, "y": 20}
    ]'::jsonb,
    'intermediate', 'love', moroccan_deck_id, false, 'approved', system_user_id, system_user_id, NOW()
  ),

  -- الصليب المغربي - Moroccan Cross
  (
    'Moroccan Cross', 'الصليب المغربي',
    'Seven-card traditional Moroccan spread for comprehensive guidance',
    'انتشار مغربي تقليدي بسبع أوراق للإرشاد الشامل',
    7,
    '[
      {"position": 1, "name": "Center", "name_ar": "المركز", "meaning": "Core issue or situation", "meaning_ar": "القضية الأساسية أو الوضع", "x": 50, "y": 50},
      {"position": 2, "name": "Above", "name_ar": "فوق", "meaning": "Higher influences, spiritual guidance", "meaning_ar": "التأثيرات العليا، الإرشاد الروحي", "x": 50, "y": 20},
      {"position": 3, "name": "Below", "name_ar": "تحت", "meaning": "Foundation, subconscious influences", "meaning_ar": "الأساس، التأثيرات اللاواعية", "x": 50, "y": 80},
      {"position": 4, "name": "Left", "name_ar": "يسار", "meaning": "Past influences", "meaning_ar": "تأثيرات الماضي", "x": 20, "y": 50},
      {"position": 5, "name": "Right", "name_ar": "يمين", "meaning": "Future possibilities", "meaning_ar": "الإمكانات المستقبلية", "x": 80, "y": 50},
      {"position": 6, "name": "Inner Circle", "name_ar": "الدائرة الداخلية", "meaning": "Your inner wisdom", "meaning_ar": "حكمتك الداخلية", "x": 35, "y": 35},
      {"position": 7, "name": "Outer Circle", "name_ar": "الدائرة الخارجية", "meaning": "External influences and advice", "meaning_ar": "التأثيرات الخارجية والنصيحة", "x": 65, "y": 35}
    ]'::jsonb,
    'advanced', 'spiritual', moroccan_deck_id, false, 'approved', system_user_id, system_user_id, NOW()
  ),

  -- انتشار المال والعمل - Money and Work Spread
  (
    'Money and Work Spread', 'انتشار المال والعمل',
    'Six-card spread for career and financial guidance',
    'انتشار ست أوراق للإرشاد المهني والمالي',
    6,
    '[
      {"position": 1, "name": "Current Work", "name_ar": "العمل الحالي", "meaning": "Your current career situation", "meaning_ar": "وضعك المهني الحالي", "x": 25, "y": 60},
      {"position": 2, "name": "Financial State", "name_ar": "الحالة المالية", "meaning": "Your current financial situation", "meaning_ar": "وضعك المالي الحالي", "x": 75, "y": 60},
      {"position": 3, "name": "Opportunities", "name_ar": "الفرص", "meaning": "New opportunities coming", "meaning_ar": "الفرص الجديدة القادمة", "x": 50, "y": 30},
      {"position": 4, "name": "Challenges", "name_ar": "التحديات", "meaning": "Obstacles to overcome", "meaning_ar": "العوائق التي يجب التغلب عليها", "x": 25, "y": 80},
      {"position": 5, "name": "Action Needed", "name_ar": "العمل المطلوب", "meaning": "What you need to do", "meaning_ar": "ما تحتاج إلى فعله", "x": 75, "y": 80},
      {"position": 6, "name": "Outcome", "name_ar": "النتيجة", "meaning": "Future financial and career success", "meaning_ar": "النجاح المالي والمهني المستقبلي", "x": 50, "y": 10}
    ]'::jsonb,
    'intermediate', 'career', moroccan_deck_id, false, 'approved', system_user_id, system_user_id, NOW()
  ),

  -- الانتشار الروحي - Spiritual Spread
  (
    'Spiritual Journey Spread', 'انتشار الرحلة الروحية',
    'Eight-card spread for spiritual guidance and inner wisdom',
    'انتشار ثماني أوراق للإرشاد الروحي والحكمة الداخلية',
    8,
    '[
      {"position": 1, "name": "Soul Purpose", "name_ar": "هدف الروح", "meaning": "Your souls purpose in this life", "meaning_ar": "هدف روحك في هذه الحياة", "x": 50, "y": 15},
      {"position": 2, "name": "Spiritual Gifts", "name_ar": "الهدايا الروحية", "meaning": "Your natural spiritual abilities", "meaning_ar": "قدراتك الروحية الطبيعية", "x": 25, "y": 30},
      {"position": 3, "name": "Current Path", "name_ar": "المسار الحالي", "meaning": "Where you are now spiritually", "meaning_ar": "أين أنت الآن روحياً", "x": 75, "y": 30},
      {"position": 4, "name": "Past Lessons", "name_ar": "دروس الماضي", "meaning": "Spiritual lessons learned", "meaning_ar": "الدروس الروحية المتعلمة", "x": 15, "y": 50},
      {"position": 5, "name": "Present Challenge", "name_ar": "التحدي الحالي", "meaning": "Current spiritual challenge", "meaning_ar": "التحدي الروحي الحالي", "x": 50, "y": 50},
      {"position": 6, "name": "Future Growth", "name_ar": "النمو المستقبلي", "meaning": "Spiritual growth ahead", "meaning_ar": "النمو الروحي القادم", "x": 85, "y": 50},
      {"position": 7, "name": "Inner Wisdom", "name_ar": "الحكمة الداخلية", "meaning": "Guidance from within", "meaning_ar": "الإرشاد من الداخل", "x": 25, "y": 75},
      {"position": 8, "name": "Divine Message", "name_ar": "الرسالة الإلهية", "meaning": "Message from the divine", "meaning_ar": "رسالة من الإلهي", "x": 75, "y": 75}
    ]'::jsonb,
    'advanced', 'spiritual', moroccan_deck_id, false, 'approved', system_user_id, system_user_id, NOW()
  ),

  -- انتشار الصحة - Health Spread
  (
    'Health and Wellness Spread', 'انتشار الصحة والعافية',
    'Four-card spread for health and wellness guidance',
    'انتشار أربع أوراق للإرشاد الصحي والعافية',
    4,
    '[
      {"position": 1, "name": "Physical Health", "name_ar": "الصحة الجسدية", "meaning": "Your physical body and health", "meaning_ar": "جسدك وصحتك الجسدية", "x": 25, "y": 40},
      {"position": 2, "name": "Mental Health", "name_ar": "الصحة النفسية", "meaning": "Your mental and emotional state", "meaning_ar": "حالتك النفسية والعاطفية", "x": 75, "y": 40},
      {"position": 3, "name": "What to Avoid", "name_ar": "ما يجب تجنبه", "meaning": "What is harming your health", "meaning_ar": "ما يضر بصحتك", "x": 25, "y": 70},
      {"position": 4, "name": "Path to Healing", "name_ar": "طريق الشفاء", "meaning": "How to improve your health", "meaning_ar": "كيفية تحسين صحتك", "x": 75, "y": 70}
    ]'::jsonb,
    'beginner', 'health', moroccan_deck_id, false, 'approved', system_user_id, system_user_id, NOW()
  ),

  -- الانتشار السريع - Quick Guidance
  (
    'Quick Guidance', 'الإرشاد السريع',
    'Single card for immediate guidance and insight',
    'ورقة واحدة للإرشاد والبصيرة الفورية',
    1,
    '[
      {"position": 1, "name": "Guidance", "name_ar": "الإرشاد", "meaning": "Your guidance for today", "meaning_ar": "إرشادك لهذا اليوم", "x": 50, "y": 50}
    ]'::jsonb,
    'beginner', 'general', moroccan_deck_id, false, 'approved', system_user_id, system_user_id, NOW()
  ),

  -- انتشار القرار - Decision Making
  (
    'Decision Making Spread', 'انتشار اتخاذ القرار',
    'Five-card spread to help with important decisions',
    'انتشار خمس أوراق للمساعدة في القرارات المهمة',
    5,
    '[
      {"position": 1, "name": "The Decision", "name_ar": "القرار", "meaning": "The decision you need to make", "meaning_ar": "القرار الذي تحتاج لاتخاذه", "x": 50, "y": 20},
      {"position": 2, "name": "Option A", "name_ar": "الخيار أ", "meaning": "First option and its consequences", "meaning_ar": "الخيار الأول وعواقبه", "x": 25, "y": 50},
      {"position": 3, "name": "Option B", "name_ar": "الخيار ب", "meaning": "Second option and its consequences", "meaning_ar": "الخيار الثاني وعواقبه", "x": 75, "y": 50},
      {"position": 4, "name": "Hidden Factors", "name_ar": "العوامل الخفية", "meaning": "What you might not be considering", "meaning_ar": "ما قد لا تأخذه في الاعتبار", "x": 30, "y": 80},
      {"position": 5, "name": "Best Path", "name_ar": "أفضل طريق", "meaning": "The best decision for you", "meaning_ar": "أفضل قرار بالنسبة لك", "x": 70, "y": 80}
    ]'::jsonb,
    'intermediate', 'general', moroccan_deck_id, false, 'approved', system_user_id, system_user_id, NOW()
  );

END $$;

-- =====================================================
-- INDEXES AND CONSTRAINTS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_moroccan_cards_suit ON moroccan_tarot_cards(suit);
CREATE INDEX IF NOT EXISTS idx_moroccan_cards_value ON moroccan_tarot_cards(value);
CREATE INDEX IF NOT EXISTS idx_moroccan_cards_deck ON moroccan_tarot_cards(deck_id);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE moroccan_tarot_cards IS 'Complete 48-card Moroccan tarot deck with traditional meanings';
COMMENT ON COLUMN moroccan_tarot_cards.suit IS 'Four suits: swords, cups, coins, clubs (السيوف، الكؤوس، النقود، العصي)';
COMMENT ON COLUMN moroccan_tarot_cards.value IS 'Card value 1-12 for each suit (no court cards, simplified structure)';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ MOROCCAN TAROT SYSTEM COMPLETE!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '🔮 48 Moroccan cards created';
  RAISE NOTICE '📋 8 traditional spreads added';
  RAISE NOTICE '🎯 All spreads use 1-8 cards (not full deck)';
  RAISE NOTICE '🌟 System ready for custom spreads';
  RAISE NOTICE '================================================';
END $$; 