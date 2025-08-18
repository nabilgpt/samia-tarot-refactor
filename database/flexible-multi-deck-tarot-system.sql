-- =====================================================
-- SAMIA TAROT - FLEXIBLE MULTI-DECK TAROT SPREAD SYSTEM
-- Complete database schema supporting all major tarot decks
-- =====================================================

-- =====================================================
-- 1. ENHANCED TAROT DECKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tarot_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  total_cards INTEGER DEFAULT 78,
  deck_type TEXT CHECK (deck_type IN ('moroccan', 'rider_waite', 'marseille', 'thoth', 'wild_unknown', 'moonchild', 'starchild', 'custom')) DEFAULT 'moroccan',
  preview_image_url TEXT,
  card_back_image_url TEXT,
  card_front_template_url TEXT, -- Template for custom cards
  artist_name TEXT,
  publisher TEXT,
  publication_year INTEGER,
  isbn TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  supports_reversals BOOLEAN DEFAULT true,
  cultural_origin TEXT,
  metaphysical_system TEXT, -- Golden Dawn, Kabbalistic, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert comprehensive deck collection
INSERT INTO tarot_decks (name, name_ar, description, description_ar, deck_type, total_cards, is_default, supports_reversals, cultural_origin, metaphysical_system) VALUES 
('Traditional Moroccan Tarot', 'الكارطة المغربية التقليدية', '48-card traditional Moroccan deck with rich cultural symbolism', 'مجموعة مغربية تقليدية من 48 ورقة مع رمزية ثقافية غنية', 'moroccan', 48, true, true, 'Moroccan', 'Traditional Moroccan'),
('Rider-Waite Tarot', 'تاروت رايدر-وايت', 'Classic 78-card deck, most popular worldwide', 'المجموعة الكلاسيكية من 78 ورقة، الأكثر شعبية عالمياً', 'rider_waite', 78, false, true, 'Western', 'Golden Dawn'),
('Marseille Tarot', 'تاروت مارسيليا', 'Traditional French 78-card deck with historical significance', 'المجموعة الفرنسية التقليدية من 78 ورقة ذات الأهمية التاريخية', 'marseille', 78, false, true, 'French', 'Traditional European'),
('Thoth Tarot', 'تاروت توت', 'Aleister Crowleys esoteric 78-card deck', 'مجموعة أليستر كراولي الباطنية من 78 ورقة', 'thoth', 78, false, true, 'Western', 'Thelemic'),
('Wild Unknown Tarot', 'تاروت الغير معروف البري', 'Modern artistic 78-card deck with nature themes', 'مجموعة فنية حديثة من 78 ورقة بمواضيع طبيعية', 'wild_unknown', 78, false, true, 'Modern Western', 'Nature-based'),
('Moonchild Tarot', 'تاروت طفل القمر', 'Dreamy feminine 78-card deck', 'مجموعة أنثوية حالمة من 78 ورقة', 'moonchild', 78, false, true, 'Modern Western', 'Lunar Feminine'),
('Starchild Tarot', 'تاروت طفل النجوم', 'Cosmic 78-card deck with space themes', 'مجموعة كونية من 78 ورقة بمواضيع فضائية', 'starchild', 78, false, true, 'Modern Western', 'Cosmic');

-- =====================================================
-- 2. COMPREHENSIVE TAROT CARDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tarot_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID REFERENCES tarot_decks(id) ON DELETE CASCADE,
  card_key TEXT NOT NULL, -- 'the-fool', 'ace-of-cups'
  name TEXT NOT NULL,
  name_ar TEXT,
  card_number INTEGER, -- 0-21 for Major Arcana, 1-14 for Minor
  arcana_type TEXT CHECK (arcana_type IN ('major', 'minor', 'court')) NOT NULL,
  suit TEXT CHECK (suit IN ('cups', 'wands', 'swords', 'pentacles', 'coins', 'staves', 'disks', NULL)),
  suit_ar TEXT,
  element TEXT CHECK (element IN ('fire', 'water', 'air', 'earth', NULL)),
  
  -- Card Images
  image_url TEXT NOT NULL,
  reversed_image_url TEXT,
  thumbnail_url TEXT,
  
  -- Meanings and Keywords
  upright_meaning TEXT NOT NULL,
  reversed_meaning TEXT NOT NULL,
  upright_keywords TEXT[] DEFAULT '{}',
  reversed_keywords TEXT[] DEFAULT '{}',
  
  -- Contextual Meanings (Arabic support)
  upright_meaning_ar TEXT,
  reversed_meaning_ar TEXT,
  upright_keywords_ar TEXT[] DEFAULT '{}',
  reversed_keywords_ar TEXT[] DEFAULT '{}',
  
  -- Category-specific meanings
  love_upright TEXT,
  love_reversed TEXT,
  love_upright_ar TEXT,
  love_reversed_ar TEXT,
  
  career_upright TEXT,
  career_reversed TEXT,
  career_upright_ar TEXT,
  career_reversed_ar TEXT,
  
  finance_upright TEXT,
  finance_reversed TEXT,
  finance_upright_ar TEXT,
  finance_reversed_ar TEXT,
  
  health_upright TEXT,
  health_reversed TEXT,
  health_upright_ar TEXT,
  health_reversed_ar TEXT,
  
  spiritual_upright TEXT,
  spiritual_reversed TEXT,
  spiritual_upright_ar TEXT,
  spiritual_reversed_ar TEXT,
  
  -- Metadata and Symbolism
  symbolism TEXT,
  symbolism_ar TEXT,
  planet TEXT,
  zodiac_sign TEXT,
  hebrew_letter TEXT,
  numerology INTEGER,
  chakra TEXT,
  color_associations TEXT[],
  
  -- Deck-specific data
  deck_specific_meaning JSONB, -- Store deck-specific interpretations
  cultural_significance TEXT,
  cultural_significance_ar TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(deck_id, card_key)
);

-- =====================================================
-- 3. ENHANCED TAROT SPREADS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tarot_spreads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  card_count INTEGER NOT NULL,
  min_cards INTEGER DEFAULT NULL, -- Minimum cards for flexible spreads
  max_cards INTEGER DEFAULT NULL, -- Maximum cards for flexible spreads
  
  -- Position Configuration
  positions JSONB NOT NULL, -- Array of position objects with coordinates and meanings
  layout_type TEXT CHECK (layout_type IN ('fixed', 'flexible', 'custom')) DEFAULT 'fixed',
  
  -- Spread Metadata
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
  category TEXT CHECK (category IN ('love', 'career', 'general', 'spiritual', 'health', 'finance', 'decision')),
  reading_time_minutes INTEGER DEFAULT 30,
  
  -- Deck Compatibility
  compatible_deck_types TEXT[] DEFAULT '{}', -- Which deck types work with this spread
  preferred_deck_id UUID REFERENCES tarot_decks(id),
  
  -- Visual and Layout
  layout_image_url TEXT,
  background_theme TEXT DEFAULT 'cosmic',
  position_shape TEXT CHECK (position_shape IN ('circle', 'rectangle', 'diamond', 'star')) DEFAULT 'circle',
  
  -- Approval and Management
  is_active BOOLEAN DEFAULT true,
  is_custom BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'approved',
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  -- Usage and Analytics
  usage_count INTEGER DEFAULT 0,
  rating_average DECIMAL(3,2) DEFAULT 0.00,
  rating_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. TAROT READING SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tarot_reading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key TEXT UNIQUE NOT NULL, -- For easy identification
  
  -- Participants
  reader_id UUID REFERENCES profiles(id),
  client_id UUID NOT NULL REFERENCES profiles(id),
  booking_id UUID REFERENCES bookings(id),
  
  -- Reading Configuration
  spread_id UUID NOT NULL REFERENCES tarot_spreads(id),
  deck_id UUID NOT NULL REFERENCES tarot_decks(id),
  question TEXT,
  question_category TEXT,
  
  -- Session State
  status TEXT CHECK (status IN ('preparing', 'active', 'card_selection', 'interpretation', 'completed', 'cancelled', 'expired')) DEFAULT 'preparing',
  current_step TEXT DEFAULT 'question',
  
  -- Card Management
  total_cards_to_draw INTEGER,
  cards_drawn_count INTEGER DEFAULT 0,
  burned_cards_count INTEGER DEFAULT 0,
  cards_remaining INTEGER,
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  estimated_duration_minutes INTEGER DEFAULT 30,
  
  -- Live Session Features
  is_live_call BOOLEAN DEFAULT false,
  video_call_url TEXT,
  is_payment_required BOOLEAN DEFAULT true,
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')) DEFAULT 'pending',
  payment_id UUID REFERENCES payments(id),
  
  -- AI and Interpretation
  ai_interpretation_enabled BOOLEAN DEFAULT false,
  interpretation_language TEXT DEFAULT 'ar',
  reader_notes TEXT,
  ai_confidence_score DECIMAL(3,2),
  
  -- Session Data Storage
  session_data JSONB DEFAULT '{}', -- Store dynamic session state
  preferences JSONB DEFAULT '{}', -- User preferences for this session
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. TAROT SPREAD CARDS TABLE (Individual Cards in Readings)
-- =====================================================
CREATE TABLE IF NOT EXISTS tarot_spread_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES tarot_reading_sessions(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES tarot_cards(id),
  
  -- Position and State
  position INTEGER NOT NULL, -- 1, 2, 3... based on spread
  position_name TEXT NOT NULL,
  position_meaning TEXT,
  position_meaning_ar TEXT,
  
  -- Card State
  is_revealed BOOLEAN DEFAULT false,
  is_reversed BOOLEAN DEFAULT false,
  is_burned BOOLEAN DEFAULT false, -- Card discarded/burned by reader
  
  -- Timing
  drawn_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revealed_at TIMESTAMP WITH TIME ZONE,
  burned_at TIMESTAMP WITH TIME ZONE,
  
  -- Management
  added_by_role TEXT CHECK (added_by_role IN ('reader', 'client', 'system')) DEFAULT 'system',
  added_by_user_id UUID REFERENCES profiles(id),
  burned_by_user_id UUID REFERENCES profiles(id),
  burn_reason TEXT,
  
  -- Custom Interpretation
  custom_interpretation TEXT,
  custom_interpretation_ar TEXT,
  reader_notes TEXT,
  
  -- Position coordinates for flexible spreads
  position_x DECIMAL(5,2), -- Percentage from left
  position_y DECIMAL(5,2), -- Percentage from top
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. SPREAD SERVICE ASSIGNMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS spread_service_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spread_id UUID REFERENCES tarot_spreads(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  reader_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Assignment Details
  is_gift BOOLEAN DEFAULT false,
  assignment_order INTEGER DEFAULT 1,
  price_override DECIMAL(10,2), -- Override service price for this spread
  
  -- Availability
  is_active BOOLEAN DEFAULT true,
  available_from TIME,
  available_to TIME,
  available_days INTEGER[] DEFAULT '{1,2,3,4,5,6,7}', -- 1=Monday, 7=Sunday
  
  -- Limits
  max_daily_sessions INTEGER DEFAULT 10,
  max_concurrent_sessions INTEGER DEFAULT 3,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(spread_id, service_id, reader_id)
);

-- =====================================================
-- 7. USER ROLE PERMISSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tarot_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT CHECK (role IN ('client', 'reader', 'monitor', 'admin', 'super_admin')) NOT NULL,
  permission_name TEXT NOT NULL,
  permission_description TEXT,
  can_perform BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, permission_name)
);

-- Insert permission matrix
INSERT INTO tarot_role_permissions (role, permission_name, permission_description, can_perform) VALUES
-- Client permissions
('client', 'open_cards_after_payment', 'Can open cards after payment confirmation', true),
('client', 'view_own_readings', 'Can view their own reading history', true),
('client', 'rate_readings', 'Can rate and review readings', true),
('client', 'save_readings', 'Can save readings to profile', true),

-- Reader permissions  
('reader', 'create_custom_spreads', 'Can create custom spread layouts', true),
('reader', 'burn_cards', 'Can burn/discard cards from spreads', true),
('reader', 'add_cards_to_spread', 'Can add additional cards to spreads', true),
('reader', 'edit_card_positions', 'Can modify card positions in spreads', true),
('reader', 'provide_interpretations', 'Can provide card interpretations', true),
('reader', 'manage_live_sessions', 'Can manage live call sessions', true),
('reader', 'view_client_readings', 'Can view readings for their clients', true),

-- Monitor permissions
('monitor', 'view_all_readings', 'Can view all reading sessions for monitoring', true),
('monitor', 'moderate_content', 'Can moderate reading content', true),
('monitor', 'generate_reports', 'Can generate analytics reports', true),

-- Admin permissions
('admin', 'view_users', 'Can view user accounts', true),
('admin', 'edit_users', 'Can edit user accounts', true),
('admin', 'manage_services', 'Can manage service offerings', true),
('admin', 'approve_custom_spreads', 'Can approve reader-created spreads', true),
('admin', 'view_analytics', 'Can view platform analytics', true),
('admin', 'manage_payments', 'Can manage payment settings', true),
-- EXPLICITLY DENY dangerous permissions for admin
('admin', 'delete_users', 'Can delete user accounts', false),
('admin', 'create_super_admin', 'Can create super admin accounts', false),
('admin', 'modify_super_admin', 'Can modify super admin accounts', false),

-- Super Admin permissions (all permissions)
('super_admin', 'delete_users', 'Can permanently delete user accounts', true),
('super_admin', 'create_super_admin', 'Can create super admin accounts', true),
('super_admin', 'modify_super_admin', 'Can modify super admin accounts', true),
('super_admin', 'manage_system_settings', 'Can modify system-wide settings', true),
('super_admin', 'manage_database', 'Can perform database operations', true),
('super_admin', 'emergency_access', 'Can access emergency controls', true);

-- =====================================================
-- 8. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_tarot_decks_type ON tarot_decks(deck_type);
CREATE INDEX IF NOT EXISTS idx_tarot_decks_active ON tarot_decks(is_active);
CREATE INDEX IF NOT EXISTS idx_tarot_decks_default ON tarot_decks(is_default);

CREATE INDEX IF NOT EXISTS idx_tarot_cards_deck ON tarot_cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_tarot_cards_key ON tarot_cards(card_key);
CREATE INDEX IF NOT EXISTS idx_tarot_cards_arcana ON tarot_cards(arcana_type);
CREATE INDEX IF NOT EXISTS idx_tarot_cards_suit ON tarot_cards(suit);

CREATE INDEX IF NOT EXISTS idx_spreads_category ON tarot_spreads(category);
CREATE INDEX IF NOT EXISTS idx_spreads_difficulty ON tarot_spreads(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_spreads_active ON tarot_spreads(is_active);
CREATE INDEX IF NOT EXISTS idx_spreads_public ON tarot_spreads(is_public);
CREATE INDEX IF NOT EXISTS idx_spreads_approval ON tarot_spreads(approval_status);

CREATE INDEX IF NOT EXISTS idx_sessions_status ON tarot_reading_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_reader ON tarot_reading_sessions(reader_id);
CREATE INDEX IF NOT EXISTS idx_sessions_client ON tarot_reading_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON tarot_reading_sessions(status) WHERE status IN ('active', 'card_selection', 'interpretation');

CREATE INDEX IF NOT EXISTS idx_spread_cards_session ON tarot_spread_cards(session_id);
CREATE INDEX IF NOT EXISTS idx_spread_cards_revealed ON tarot_spread_cards(is_revealed);
CREATE INDEX IF NOT EXISTS idx_spread_cards_burned ON tarot_spread_cards(is_burned);

CREATE INDEX IF NOT EXISTS idx_assignments_reader ON spread_service_assignments(reader_id);
CREATE INDEX IF NOT EXISTS idx_assignments_service ON spread_service_assignments(service_id);
CREATE INDEX IF NOT EXISTS idx_assignments_active ON spread_service_assignments(is_active);

-- =====================================================
-- 9. FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to generate unique session keys
CREATE OR REPLACE FUNCTION generate_session_key()
RETURNS TEXT AS $$
BEGIN
  RETURN 'TAROT_' || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8));
END;
$$ LANGUAGE plpgsql;

-- Function to automatically set session key
CREATE OR REPLACE FUNCTION set_session_key()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_key IS NULL THEN
    NEW.session_key := generate_session_key();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set session key
CREATE TRIGGER set_session_key_trigger
  BEFORE INSERT ON tarot_reading_sessions
  FOR EACH ROW
  EXECUTE FUNCTION set_session_key();

-- Function to update cards remaining count
CREATE OR REPLACE FUNCTION update_cards_remaining()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tarot_reading_sessions 
  SET 
    cards_drawn_count = (
      SELECT COUNT(*) 
      FROM tarot_spread_cards 
      WHERE session_id = NEW.session_id AND is_burned = false
    ),
    burned_cards_count = (
      SELECT COUNT(*) 
      FROM tarot_spread_cards 
      WHERE session_id = NEW.session_id AND is_burned = true
    ),
    cards_remaining = total_cards_to_draw - (
      SELECT COUNT(*) 
      FROM tarot_spread_cards 
      WHERE session_id = NEW.session_id AND is_burned = false
    )
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update card counts
CREATE TRIGGER update_cards_remaining_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tarot_spread_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_cards_remaining();

-- Function to check user permissions
CREATE OR REPLACE FUNCTION check_user_permission(
  user_role TEXT,
  permission_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  can_perform BOOLEAN := false;
BEGIN
  SELECT trp.can_perform INTO can_perform
  FROM tarot_role_permissions trp
  WHERE trp.role = user_role AND trp.permission_name = permission_name;
  
  RETURN COALESCE(can_perform, false);
END;
$$ LANGUAGE plpgsql;

-- Function to get available decks for a user role
CREATE OR REPLACE FUNCTION get_available_decks_for_role(user_role TEXT)
RETURNS TABLE (
  deck_id UUID,
  deck_name TEXT,
  deck_name_ar TEXT,
  deck_type TEXT,
  total_cards INTEGER,
  is_default BOOLEAN
) AS $$
BEGIN
  -- All roles can access active decks, but filtering may apply based on role
  RETURN QUERY
  SELECT 
    td.id,
    td.name,
    td.name_ar,
    td.deck_type,
    td.total_cards,
    td.is_default
  FROM tarot_decks td
  WHERE td.is_active = true
  ORDER BY td.is_default DESC, td.name ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. SAMPLE DATA POPULATION
-- =====================================================

-- This will be populated by separate scripts for each deck type
-- to maintain organization and allow for easy updates

COMMENT ON TABLE tarot_decks IS 'Master table for all supported tarot deck types';
COMMENT ON TABLE tarot_cards IS 'Individual cards with full multilingual support and deck-specific meanings';
COMMENT ON TABLE tarot_spreads IS 'Flexible spread layouts supporting fixed and dynamic card arrangements';
COMMENT ON TABLE tarot_reading_sessions IS 'Active reading sessions with real-time state management';
COMMENT ON TABLE tarot_spread_cards IS 'Individual cards drawn in reading sessions with position and state tracking';
COMMENT ON TABLE spread_service_assignments IS 'Links spreads to specific reader services with pricing and availability';
COMMENT ON TABLE tarot_role_permissions IS 'Comprehensive permission matrix for role-based access control'; 