-- =====================================================
-- PHASE 2: TAROT & AI READINGS SYSTEM
-- =====================================================

-- =====================================================
-- TAROT CARDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tarot_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  suit TEXT CHECK (suit IN ('major_arcana', 'cups', 'wands', 'swords', 'pentacles')),
  number INTEGER, -- NULL for major arcana with names, 1-14 for minor arcana
  arcana_type TEXT CHECK (arcana_type IN ('major', 'minor')) NOT NULL,
  image_url TEXT,
  image_reversed_url TEXT,
  keywords TEXT[], -- Array of keywords
  keywords_ar TEXT[], -- Arabic keywords
  upright_meaning TEXT,
  upright_meaning_ar TEXT,
  reversed_meaning TEXT,
  reversed_meaning_ar TEXT,
  element TEXT CHECK (element IN ('fire', 'water', 'air', 'earth')), -- For minor arcana
  astrological_sign TEXT,
  numerology_value INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TAROT SPREADS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tarot_spreads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  card_count INTEGER NOT NULL,
  positions JSONB NOT NULL, -- Array of position objects with name, meaning, coordinates
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
  category TEXT CHECK (category IN ('love', 'career', 'general', 'spiritual', 'health', 'finance')),
  image_url TEXT, -- Layout diagram
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TAROT READINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tarot_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) NOT NULL,
  reader_id UUID REFERENCES profiles(id),
  client_id UUID REFERENCES profiles(id) NOT NULL,
  spread_id UUID REFERENCES tarot_spreads(id) NOT NULL,
  question TEXT,
  question_category TEXT CHECK (question_category IN ('love', 'career', 'general', 'spiritual', 'health', 'finance')),
  cards_drawn JSONB NOT NULL, -- Array of {position, card_id, is_reversed, interpretation}
  overall_interpretation TEXT,
  overall_interpretation_ar TEXT,
  ai_insights JSONB, -- AI-generated insights and patterns
  energy_reading TEXT, -- Overall energy assessment
  advice TEXT,
  advice_ar TEXT,
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
  reading_type TEXT CHECK (reading_type IN ('human', 'ai', 'hybrid')) DEFAULT 'human',
  confidence_score DECIMAL(3,2), -- AI confidence level (0.00-1.00)
  session_duration INTEGER, -- Duration in minutes
  is_public BOOLEAN DEFAULT false, -- For testimonials/examples
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- AI READING TEMPLATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_reading_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('love', 'career', 'general', 'spiritual', 'health', 'finance')),
  prompt_template TEXT NOT NULL, -- AI prompt with placeholders
  response_format JSONB, -- Expected response structure
  min_confidence DECIMAL(3,2) DEFAULT 0.70,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CARD INTERPRETATIONS TABLE (for personalized meanings)
-- =====================================================
CREATE TABLE IF NOT EXISTS card_interpretations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES tarot_cards(id) NOT NULL,
  reader_id UUID REFERENCES profiles(id),
  context TEXT, -- love, career, etc.
  position_in_spread TEXT, -- past, present, future, etc.
  interpretation TEXT NOT NULL,
  interpretation_ar TEXT,
  is_reversed BOOLEAN DEFAULT false,
  tags TEXT[], -- Additional context tags
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- READING SESSIONS TABLE (for live readings)
-- =====================================================
CREATE TABLE IF NOT EXISTS reading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) NOT NULL UNIQUE,
  reader_id UUID REFERENCES profiles(id),
  client_id UUID REFERENCES profiles(id) NOT NULL,
  session_type TEXT CHECK (session_type IN ('tarot', 'coffee', 'palm', 'dream', 'numerology')) NOT NULL,
  status TEXT CHECK (status IN ('scheduled', 'active', 'paused', 'completed', 'cancelled')) DEFAULT 'scheduled',
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  notes TEXT, -- Reader's private notes
  client_feedback TEXT,
  client_rating INTEGER CHECK (client_rating >= 1 AND client_rating <= 5),
  recording_url TEXT, -- If session was recorded
  transcript TEXT, -- AI-generated transcript
  key_insights JSONB, -- Extracted insights
  follow_up_recommendations TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- AI READING QUEUE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_reading_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) NOT NULL,
  client_id UUID REFERENCES profiles(id) NOT NULL,
  reading_type TEXT CHECK (reading_type IN ('tarot', 'numerology', 'astrology')) NOT NULL,
  input_data JSONB NOT NULL, -- Question, birth date, etc.
  priority INTEGER DEFAULT 1, -- 1=low, 5=high
  status TEXT CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')) DEFAULT 'queued',
  ai_model TEXT DEFAULT 'gpt-4',
  processing_started_at TIMESTAMP WITH TIME ZONE,
  processing_completed_at TIMESTAMP WITH TIME ZONE,
  result JSONB, -- AI response
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_tarot_cards_suit ON tarot_cards(suit);
CREATE INDEX IF NOT EXISTS idx_tarot_cards_arcana ON tarot_cards(arcana_type);
CREATE INDEX IF NOT EXISTS idx_tarot_spreads_category ON tarot_spreads(category);
CREATE INDEX IF NOT EXISTS idx_tarot_spreads_difficulty ON tarot_spreads(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_tarot_readings_booking ON tarot_readings(booking_id);
CREATE INDEX IF NOT EXISTS idx_tarot_readings_reader ON tarot_readings(reader_id);
CREATE INDEX IF NOT EXISTS idx_tarot_readings_client ON tarot_readings(client_id);
CREATE INDEX IF NOT EXISTS idx_tarot_readings_status ON tarot_readings(status);
CREATE INDEX IF NOT EXISTS idx_tarot_readings_type ON tarot_readings(reading_type);
CREATE INDEX IF NOT EXISTS idx_card_interpretations_card ON card_interpretations(card_id);
CREATE INDEX IF NOT EXISTS idx_card_interpretations_reader ON card_interpretations(reader_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_booking ON reading_sessions(booking_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_status ON reading_sessions(status);
CREATE INDEX IF NOT EXISTS idx_ai_queue_status ON ai_reading_queue(status);
CREATE INDEX IF NOT EXISTS idx_ai_queue_priority ON ai_reading_queue(priority);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to create reading session when booking is confirmed
CREATE OR REPLACE FUNCTION create_reading_session()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create reading session for confirmed bookings
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    INSERT INTO reading_sessions (
      booking_id,
      client_id,
      reader_id,
      session_type
    )
    SELECT 
      NEW.id,
      NEW.user_id,
      NEW.reader_id,
      NEW.service_type
    FROM services s 
    WHERE s.id = NEW.service_id
    ON CONFLICT (booking_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create reading session
CREATE TRIGGER create_reading_session_trigger
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_reading_session();

-- Function to update reading session duration
CREATE OR REPLACE FUNCTION update_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
    NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at)) / 60;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session duration
CREATE TRIGGER update_session_duration_trigger
  BEFORE UPDATE ON reading_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_duration();

-- Function to queue AI reading
CREATE OR REPLACE FUNCTION queue_ai_reading(
  p_booking_id UUID,
  p_client_id UUID,
  p_reading_type TEXT,
  p_input_data JSONB,
  p_priority INTEGER DEFAULT 1
)
RETURNS UUID AS $$
DECLARE
  queue_id UUID;
BEGIN
  INSERT INTO ai_reading_queue (
    booking_id,
    client_id,
    reading_type,
    input_data,
    priority
  ) VALUES (
    p_booking_id,
    p_client_id,
    p_reading_type,
    p_input_data,
    p_priority
  ) RETURNING id INTO queue_id;
  
  RETURN queue_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get next AI reading from queue
CREATE OR REPLACE FUNCTION get_next_ai_reading()
RETURNS TABLE (
  id UUID,
  booking_id UUID,
  client_id UUID,
  reading_type TEXT,
  input_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  UPDATE ai_reading_queue 
  SET 
    status = 'processing',
    processing_started_at = NOW()
  WHERE ai_reading_queue.id = (
    SELECT ai_reading_queue.id 
    FROM ai_reading_queue 
    WHERE status = 'queued' 
    ORDER BY priority DESC, created_at ASC 
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING 
    ai_reading_queue.id,
    ai_reading_queue.booking_id,
    ai_reading_queue.client_id,
    ai_reading_queue.reading_type,
    ai_reading_queue.input_data;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE tarot_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarot_spreads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarot_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reading_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_interpretations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reading_queue ENABLE ROW LEVEL SECURITY;

-- Tarot cards policies (public read)
CREATE POLICY "Anyone can view tarot cards" ON tarot_cards
  FOR SELECT USING (true);

CREATE POLICY "Only admins can modify tarot cards" ON tarot_cards
  FOR ALL USING (
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'monitor'))
  );

-- Tarot spreads policies (public read)
CREATE POLICY "Anyone can view active spreads" ON tarot_spreads
  FOR SELECT USING (is_active = true);

CREATE POLICY "Readers and admins can modify spreads" ON tarot_spreads
  FOR ALL USING (
    created_by = auth.uid() OR
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'monitor', 'reader'))
  );

-- Tarot readings policies
CREATE POLICY "Users can view their own readings" ON tarot_readings
  FOR SELECT USING (
    client_id = auth.uid() OR 
    reader_id = auth.uid() OR
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'monitor'))
  );

CREATE POLICY "Readers can create and update readings" ON tarot_readings
  FOR ALL USING (
    reader_id = auth.uid() OR
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'monitor'))
  );

-- AI reading templates policies
CREATE POLICY "Readers can view templates" ON ai_reading_templates
  FOR SELECT USING (
    is_active = true AND (
      EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('reader', 'admin', 'monitor'))
    )
  );

CREATE POLICY "Only admins can modify templates" ON ai_reading_templates
  FOR ALL USING (
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'monitor'))
  );

-- Card interpretations policies
CREATE POLICY "Users can view approved interpretations" ON card_interpretations
  FOR SELECT USING (
    is_approved = true OR
    reader_id = auth.uid() OR
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'monitor'))
  );

CREATE POLICY "Readers can create interpretations" ON card_interpretations
  FOR INSERT WITH CHECK (
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('reader', 'admin', 'monitor'))
  );

CREATE POLICY "Readers can update their interpretations" ON card_interpretations
  FOR UPDATE USING (
    reader_id = auth.uid() OR
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'monitor'))
  );

-- Reading sessions policies
CREATE POLICY "Users can view their own sessions" ON reading_sessions
  FOR SELECT USING (
    client_id = auth.uid() OR 
    reader_id = auth.uid() OR
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'monitor'))
  );

CREATE POLICY "Readers can update their sessions" ON reading_sessions
  FOR UPDATE USING (
    reader_id = auth.uid() OR
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'monitor'))
  );

-- AI reading queue policies
CREATE POLICY "Users can view their own AI readings" ON ai_reading_queue
  FOR SELECT USING (
    client_id = auth.uid() OR
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'monitor'))
  );

CREATE POLICY "Only system can modify AI queue" ON ai_reading_queue
  FOR ALL USING (
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'monitor'))
  );

-- =====================================================
-- SAMPLE TAROT CARDS DATA
-- =====================================================

-- Major Arcana
INSERT INTO tarot_cards (name, name_ar, suit, arcana_type, number, keywords, keywords_ar, upright_meaning, upright_meaning_ar, reversed_meaning, reversed_meaning_ar, astrological_sign, numerology_value) VALUES
('The Fool', 'المجنون', 'major_arcana', 'major', 0, ARRAY['new beginnings', 'innocence', 'spontaneity', 'free spirit'], ARRAY['بدايات جديدة', 'براءة', 'عفوية', 'روح حرة'], 'New beginnings, innocence, spontaneity, a free spirit', 'بدايات جديدة، براءة، عفوية، روح حرة', 'Holding back, recklessness, risk-taking', 'التردد، التهور، المخاطرة', 'Uranus', 0),
('The Magician', 'الساحر', 'major_arcana', 'major', 1, ARRAY['manifestation', 'resourcefulness', 'power', 'inspired action'], ARRAY['التجسيد', 'الحيلة', 'القوة', 'العمل الملهم'], 'Manifestation, resourcefulness, power, inspired action', 'التجسيد، الحيلة، القوة، العمل الملهم', 'Manipulation, poor planning, untapped talents', 'التلاعب، سوء التخطيط، المواهب غير المستغلة', 'Mercury', 1),
('The High Priestess', 'الكاهنة العليا', 'major_arcana', 'major', 2, ARRAY['intuition', 'sacred knowledge', 'divine feminine', 'subconscious mind'], ARRAY['الحدس', 'المعرفة المقدسة', 'الأنوثة الإلهية', 'العقل الباطن'], 'Intuition, sacred knowledge, divine feminine, the subconscious mind', 'الحدس، المعرفة المقدسة، الأنوثة الإلهية، العقل الباطن', 'Secrets, disconnected from intuition, withdrawal and silence', 'الأسرار، الانقطاع عن الحدس، الانسحاب والصمت', 'Moon', 2),
('The Empress', 'الإمبراطورة', 'major_arcana', 'major', 3, ARRAY['femininity', 'beauty', 'nature', 'nurturing', 'abundance'], ARRAY['الأنوثة', 'الجمال', 'الطبيعة', 'الرعاية', 'الوفرة'], 'Femininity, beauty, nature, nurturing, abundance', 'الأنوثة، الجمال، الطبيعة، الرعاية، الوفرة', 'Creative block, dependence on others', 'انسداد إبداعي، الاعتماد على الآخرين', 'Venus', 3),
('The Emperor', 'الإمبراطور', 'major_arcana', 'major', 4, ARRAY['authority', 'establishment', 'structure', 'father figure'], ARRAY['السلطة', 'التأسيس', 'البنية', 'شخصية الأب'], 'Authority, establishment, structure, a father figure', 'السلطة، التأسيس، البنية، شخصية الأب', 'Domination, excessive control, lack of discipline', 'الهيمنة، السيطرة المفرطة، نقص الانضباط', 'Aries', 4);

-- Minor Arcana - Cups (sample)
INSERT INTO tarot_cards (name, name_ar, suit, arcana_type, number, element, keywords, keywords_ar, upright_meaning, upright_meaning_ar, reversed_meaning, reversed_meaning_ar, numerology_value) VALUES
('Ace of Cups', 'آس الكؤوس', 'cups', 'minor', 1, 'water', ARRAY['love', 'new relationships', 'compassion', 'creativity'], ARRAY['الحب', 'علاقات جديدة', 'الرحمة', 'الإبداع'], 'Love, new relationships, compassion, creativity', 'الحب، علاقات جديدة، الرحمة، الإبداع', 'Self-love, intuition, repressed emotions', 'حب الذات، الحدس، المشاعر المكبوتة', 1),
('Two of Cups', 'اثنان من الكؤوس', 'cups', 'minor', 2, 'water', ARRAY['unified love', 'partnership', 'mutual attraction'], ARRAY['الحب الموحد', 'الشراكة', 'الجذب المتبادل'], 'Unified love, partnership, mutual attraction', 'الحب الموحد، الشراكة، الجذب المتبادل', 'Break-up, imbalance, lack of harmony', 'الانفصال، عدم التوازن، نقص الانسجام', 2),
('Three of Cups', 'ثلاثة من الكؤوس', 'cups', 'minor', 3, 'water', ARRAY['celebration', 'friendship', 'creativity', 'community'], ARRAY['الاحتفال', 'الصداقة', 'الإبداع', 'المجتمع'], 'Celebration, friendship, creativity, community', 'الاحتفال، الصداقة، الإبداع، المجتمع', 'Independence, alone time, hardcore partying', 'الاستقلالية، الوقت وحيداً، الحفلات المفرطة', 3);

-- =====================================================
-- SAMPLE TAROT SPREADS
-- =====================================================

INSERT INTO tarot_spreads (name, name_ar, description, description_ar, card_count, positions, difficulty_level, category) VALUES
('Three Card Spread', 'انتشار الثلاث بطاقات', 'Simple past, present, future reading', 'قراءة بسيطة للماضي والحاضر والمستقبل', 3, 
'[
  {"position": 1, "name": "Past", "name_ar": "الماضي", "meaning": "Past influences", "x": 10, "y": 50},
  {"position": 2, "name": "Present", "name_ar": "الحاضر", "meaning": "Current situation", "x": 50, "y": 50},
  {"position": 3, "name": "Future", "name_ar": "المستقبل", "meaning": "Future outcome", "x": 90, "y": 50}
]'::jsonb, 'beginner', 'general'),

('Celtic Cross', 'الصليب السلتي', 'Comprehensive 10-card spread for deep insights', 'انتشار شامل من 10 بطاقات للحصول على رؤى عميقة', 10,
'[
  {"position": 1, "name": "Present", "name_ar": "الحاضر", "meaning": "Current situation", "x": 50, "y": 50},
  {"position": 2, "name": "Challenge", "name_ar": "التحدي", "meaning": "Cross/Challenge", "x": 50, "y": 30},
  {"position": 3, "name": "Distant Past", "name_ar": "الماضي البعيد", "meaning": "Distant past/Foundation", "x": 30, "y": 50},
  {"position": 4, "name": "Recent Past", "name_ar": "الماضي القريب", "meaning": "Recent past", "x": 50, "y": 70},
  {"position": 5, "name": "Possible Outcome", "name_ar": "النتيجة المحتملة", "meaning": "Possible outcome", "x": 70, "y": 50},
  {"position": 6, "name": "Near Future", "name_ar": "المستقبل القريب", "meaning": "Near future", "x": 50, "y": 10},
  {"position": 7, "name": "Your Approach", "name_ar": "نهجك", "meaning": "Your approach", "x": 85, "y": 80},
  {"position": 8, "name": "External Influences", "name_ar": "التأثيرات الخارجية", "meaning": "External influences", "x": 85, "y": 60},
  {"position": 9, "name": "Hopes and Fears", "name_ar": "الآمال والمخاوف", "meaning": "Hopes and fears", "x": 85, "y": 40},
  {"position": 10, "name": "Final Outcome", "name_ar": "النتيجة النهائية", "meaning": "Final outcome", "x": 85, "y": 20}
]'::jsonb, 'advanced', 'general'),

('Love Spread', 'انتشار الحب', 'Five-card spread focused on love and relationships', 'انتشار من خمس بطاقات يركز على الحب والعلاقات', 5,
'[
  {"position": 1, "name": "You", "name_ar": "أنت", "meaning": "Your current state in love", "x": 20, "y": 50},
  {"position": 2, "name": "Partner", "name_ar": "الشريك", "meaning": "Your partner/potential partner", "x": 80, "y": 50},
  {"position": 3, "name": "Relationship", "name_ar": "العلاقة", "meaning": "The relationship dynamic", "x": 50, "y": 30},
  {"position": 4, "name": "Challenge", "name_ar": "التحدي", "meaning": "What challenges you", "x": 50, "y": 70},
  {"position": 5, "name": "Outcome", "name_ar": "النتيجة", "meaning": "Potential outcome", "x": 50, "y": 10}
]'::jsonb, 'intermediate', 'love');

-- =====================================================
-- SAMPLE AI READING TEMPLATES
-- =====================================================

INSERT INTO ai_reading_templates (name, category, prompt_template, response_format) VALUES
('General Tarot Reading', 'general', 
'You are an expert tarot reader. The client has drawn the following cards in a {spread_name} spread: {cards_with_positions}. The client''s question is: "{question}". 

Please provide a comprehensive reading that includes:
1. Individual card meanings in context
2. How the cards relate to each other
3. Overall message and guidance
4. Practical advice

Be empathetic, insightful, and positive while being honest about any challenges shown.',
'{"individual_cards": [], "relationships": "", "overall_message": "", "advice": "", "confidence": 0.0}'::jsonb),

('Love and Relationships', 'love',
'You are a compassionate tarot reader specializing in love and relationships. The client has drawn: {cards_with_positions} for the question: "{question}".

Focus on:
1. Current relationship dynamics
2. Emotional patterns and blocks
3. Potential for growth and healing
4. Guidance for moving forward in love

Be supportive and encouraging while providing honest insights.',
'{"current_dynamics": "", "emotional_patterns": "", "growth_potential": "", "guidance": "", "confidence": 0.0}'::jsonb),

('Career and Finance', 'career',
'You are a practical tarot reader focused on career and financial matters. The cards drawn are: {cards_with_positions} for: "{question}".

Address:
1. Current professional situation
2. Opportunities and challenges ahead
3. Skills and resources to leverage
4. Practical steps to take

Provide actionable guidance while acknowledging spiritual insights.',
'{"current_situation": "", "opportunities": "", "resources": "", "action_steps": "", "confidence": 0.0}'::jsonb);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE tarot_cards IS 'Complete tarot deck with meanings and interpretations';
COMMENT ON TABLE tarot_spreads IS 'Different tarot spread layouts and their positions';
COMMENT ON TABLE tarot_readings IS 'Individual tarot reading sessions and results';
COMMENT ON TABLE ai_reading_templates IS 'AI prompt templates for different reading types';
COMMENT ON TABLE card_interpretations IS 'Custom card interpretations by readers';
COMMENT ON TABLE reading_sessions IS 'Live reading session management';
COMMENT ON TABLE ai_reading_queue IS 'Queue system for AI-generated readings'; 