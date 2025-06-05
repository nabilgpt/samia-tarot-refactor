-- =====================================================
-- SAMPLE TAROT SPREADS
-- Inserts sample spreads for the enhanced spread system
-- =====================================================

-- Get the default deck ID
DO $$
DECLARE
    default_deck_id UUID;
BEGIN
    SELECT id INTO default_deck_id FROM tarot_decks WHERE is_default = true LIMIT 1;
    
    -- Insert sample spreads
    INSERT INTO tarot_spreads (
        name, 
        name_ar, 
        description, 
        description_ar, 
        card_count, 
        positions, 
        difficulty_level, 
        category, 
        deck_id,
        is_custom,
        approval_status,
        is_active
    ) VALUES 
    
    -- Three Card Spread
    (
        'Three Card Reading',
        'قراءة الأوراق الثلاث',
        'A simple yet powerful spread exploring past, present, and future',
        'انتشار بسيط لكنه قوي يستكشف الماضي والحاضر والمستقبل',
        3,
        '[
            {"position": 1, "name": "Past", "name_ar": "الماضي", "meaning": "Past influences affecting your situation", "meaning_ar": "تأثيرات الماضي المؤثرة على وضعك", "x": 20, "y": 50},
            {"position": 2, "name": "Present", "name_ar": "الحاضر", "meaning": "Your current situation and energy", "meaning_ar": "وضعك الحالي وطاقتك", "x": 50, "y": 50},
            {"position": 3, "name": "Future", "name_ar": "المستقبل", "meaning": "Potential outcome and guidance", "meaning_ar": "النتيجة المحتملة والإرشاد", "x": 80, "y": 50}
        ]',
        'beginner',
        'general',
        default_deck_id,
        false,
        'approved',
        true
    ),
    
    -- Celtic Cross Spread
    (
        'Celtic Cross',
        'الصليب السلتي',
        'The most famous tarot spread providing comprehensive insight into your situation',
        'أشهر انتشار للتاروت يوفر نظرة شاملة على وضعك',
        10,
        '[
            {"position": 1, "name": "Present Situation", "name_ar": "الوضع الحالي", "meaning": "The heart of the matter", "meaning_ar": "جوهر المسألة", "x": 50, "y": 50},
            {"position": 2, "name": "Challenge", "name_ar": "التحدي", "meaning": "What crosses you or challenges you", "meaning_ar": "ما يعارضك أو يتحداك", "x": 50, "y": 40},
            {"position": 3, "name": "Distant Past", "name_ar": "الماضي البعيد", "meaning": "Foundation of the situation", "meaning_ar": "أساس الوضع", "x": 30, "y": 50},
            {"position": 4, "name": "Recent Past", "name_ar": "الماضي القريب", "meaning": "Recent influences", "meaning_ar": "التأثيرات الحديثة", "x": 50, "y": 70},
            {"position": 5, "name": "Possible Outcome", "name_ar": "النتيجة المحتملة", "meaning": "What may come to pass", "meaning_ar": "ما قد يحدث", "x": 50, "y": 20},
            {"position": 6, "name": "Immediate Future", "name_ar": "المستقبل القريب", "meaning": "What will happen next", "meaning_ar": "ما سيحدث بعد ذلك", "x": 70, "y": 50},
            {"position": 7, "name": "Your Approach", "name_ar": "نهجك", "meaning": "How you approach the situation", "meaning_ar": "كيف تتعامل مع الوضع", "x": 85, "y": 70},
            {"position": 8, "name": "External Influences", "name_ar": "التأثيرات الخارجية", "meaning": "How others see you", "meaning_ar": "كيف يراك الآخرون", "x": 85, "y": 50},
            {"position": 9, "name": "Hopes and Fears", "name_ar": "الآمال والمخاوف", "meaning": "Your inner emotions", "meaning_ar": "مشاعرك الداخلية", "x": 85, "y": 30},
            {"position": 10, "name": "Final Outcome", "name_ar": "النتيجة النهائية", "meaning": "The ultimate resolution", "meaning_ar": "الحل النهائي", "x": 85, "y": 10}
        ]',
        'advanced',
        'general',
        default_deck_id,
        false,
        'approved',
        true
    ),
    
    -- Love Relationship Spread
    (
        'Love Connection',
        'رابطة الحب',
        'Explore the dynamics of your romantic relationship',
        'استكشف ديناميكيات علاقتك العاطفية',
        7,
        '[
            {"position": 1, "name": "You", "name_ar": "أنت", "meaning": "Your feelings and energy in the relationship", "meaning_ar": "مشاعرك وطاقتك في العلاقة", "x": 20, "y": 60},
            {"position": 2, "name": "Your Partner", "name_ar": "شريكك", "meaning": "Their feelings and energy", "meaning_ar": "مشاعرهم وطاقتهم", "x": 80, "y": 60},
            {"position": 3, "name": "Connection", "name_ar": "الرابطة", "meaning": "The bond between you", "meaning_ar": "الرابطة بينكما", "x": 50, "y": 40},
            {"position": 4, "name": "Challenges", "name_ar": "التحديات", "meaning": "What needs attention", "meaning_ar": "ما يحتاج إلى انتباه", "x": 50, "y": 70},
            {"position": 5, "name": "Strengths", "name_ar": "نقاط القوة", "meaning": "What supports your relationship", "meaning_ar": "ما يدعم علاقتكما", "x": 50, "y": 20},
            {"position": 6, "name": "Guidance", "name_ar": "الإرشاد", "meaning": "Advice for moving forward", "meaning_ar": "نصائح للمضي قدماً", "x": 35, "y": 30},
            {"position": 7, "name": "Outcome", "name_ar": "النتيجة", "meaning": "Where the relationship is heading", "meaning_ar": "إلى أين تتجه العلاقة", "x": 65, "y": 30}
        ]',
        'intermediate',
        'love',
        default_deck_id,
        false,
        'approved',
        true
    ),
    
    -- Career Path Spread
    (
        'Career Guidance',
        'إرشاد المهنة',
        'Discover insights about your professional path and opportunities',
        'اكتشف رؤى حول مسارك المهني والفرص',
        5,
        '[
            {"position": 1, "name": "Current Situation", "name_ar": "الوضع الحالي", "meaning": "Your current professional state", "meaning_ar": "حالتك المهنية الحالية", "x": 50, "y": 70},
            {"position": 2, "name": "Skills & Talents", "name_ar": "المهارات والمواهب", "meaning": "Your natural abilities", "meaning_ar": "قدراتك الطبيعية", "x": 20, "y": 50},
            {"position": 3, "name": "Opportunities", "name_ar": "الفرص", "meaning": "Available paths and chances", "meaning_ar": "المسارات والفرص المتاحة", "x": 80, "y": 50},
            {"position": 4, "name": "Action Steps", "name_ar": "خطوات العمل", "meaning": "What you should do next", "meaning_ar": "ما يجب أن تفعله بعد ذلك", "x": 35, "y": 25},
            {"position": 5, "name": "Potential Outcome", "name_ar": "النتيجة المحتملة", "meaning": "Where your career is heading", "meaning_ar": "إلى أين تتجه مهنتك", "x": 65, "y": 25}
        ]',
        'intermediate',
        'career',
        default_deck_id,
        false,
        'approved',
        true
    ),
    
    -- Spiritual Growth Spread
    (
        'Spiritual Journey',
        'الرحلة الروحية',
        'Explore your spiritual path and inner development',
        'استكشف مسارك الروحي وتطورك الداخلي',
        6,
        '[
            {"position": 1, "name": "Current State", "name_ar": "الحالة الحالية", "meaning": "Your current spiritual state", "meaning_ar": "حالتك الروحية الحالية", "x": 50, "y": 75},
            {"position": 2, "name": "Soul Purpose", "name_ar": "غرض الروح", "meaning": "Your deeper calling", "meaning_ar": "دعوتك الأعمق", "x": 50, "y": 50},
            {"position": 3, "name": "Blocks", "name_ar": "العوائق", "meaning": "What holds you back spiritually", "meaning_ar": "ما يعيقك روحياً", "x": 25, "y": 60},
            {"position": 4, "name": "Gifts", "name_ar": "الهدايا", "meaning": "Your spiritual gifts", "meaning_ar": "هداياك الروحية", "x": 75, "y": 60},
            {"position": 5, "name": "Next Steps", "name_ar": "الخطوات التالية", "meaning": "How to advance spiritually", "meaning_ar": "كيفية التقدم روحياً", "x": 35, "y": 25},
            {"position": 6, "name": "Higher Guidance", "name_ar": "الإرشاد الأعلى", "meaning": "Divine message for you", "meaning_ar": "رسالة إلهية لك", "x": 65, "y": 25}
        ]',
        'intermediate',
        'spiritual',
        default_deck_id,
        false,
        'approved',
        true
    ),
    
    -- Decision Making Spread
    (
        'Choice Crossroads',
        'مفترق القرارات',
        'Get clarity when facing an important decision',
        'احصل على وضوح عند مواجهة قرار مهم',
        5,
        '[
            {"position": 1, "name": "The Decision", "name_ar": "القرار", "meaning": "The choice you face", "meaning_ar": "الخيار الذي تواجهه", "x": 50, "y": 80},
            {"position": 2, "name": "Option A", "name_ar": "الخيار أ", "meaning": "First path and its consequences", "meaning_ar": "المسار الأول وعواقبه", "x": 25, "y": 40},
            {"position": 3, "name": "Option B", "name_ar": "الخيار ب", "meaning": "Second path and its consequences", "meaning_ar": "المسار الثاني وعواقبه", "x": 75, "y": 40},
            {"position": 4, "name": "Hidden Influences", "name_ar": "التأثيرات الخفية", "meaning": "Unseen factors affecting your choice", "meaning_ar": "العوامل غير المرئية المؤثرة على اختيارك", "x": 50, "y": 55},
            {"position": 5, "name": "Best Path Forward", "name_ar": "أفضل مسار للمضي قدماً", "meaning": "Recommended direction", "meaning_ar": "الاتجاه الموصى به", "x": 50, "y": 20}
        ]',
        'beginner',
        'general',
        default_deck_id,
        false,
        'approved',
        true
    ),
    
    -- Monthly Forecast Spread
    (
        'Monthly Outlook',
        'نظرة الشهر',
        'Preview the energies and themes for the upcoming month',
        'معاينة الطاقات والموضوعات للشهر القادم',
        4,
        '[
            {"position": 1, "name": "Overall Theme", "name_ar": "الموضوع العام", "meaning": "The main energy of the month", "meaning_ar": "الطاقة الرئيسية للشهر", "x": 50, "y": 25},
            {"position": 2, "name": "Opportunities", "name_ar": "الفرص", "meaning": "What to embrace this month", "meaning_ar": "ما يجب احتضانه هذا الشهر", "x": 20, "y": 60},
            {"position": 3, "name": "Challenges", "name_ar": "التحديات", "meaning": "What to be mindful of", "meaning_ar": "ما يجب أن تكون حذراً منه", "x": 80, "y": 60},
            {"position": 4, "name": "Advice", "name_ar": "النصيحة", "meaning": "How to make the most of this month", "meaning_ar": "كيفية الاستفادة القصوى من هذا الشهر", "x": 50, "y": 85}
        ]',
        'beginner',
        'general',
        default_deck_id,
        false,
        'approved',
        true
    );
    
END $$; 