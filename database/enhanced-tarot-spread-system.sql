-- =====================================================
-- ENHANCED TAROT SPREAD SYSTEM
-- Supports custom reader spreads, deck management, approval workflow
-- =====================================================

-- =====================================================
-- TAROT DECKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tarot_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  total_cards INTEGER DEFAULT 78,
  deck_type TEXT CHECK (deck_type IN ('moroccan', 'rider_waite', 'marseille', 'modern', 'custom')) DEFAULT 'moroccan',
  preview_image_url TEXT,
  card_back_image_url TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default decks
INSERT INTO tarot_decks (name, name_ar, description, description_ar, deck_type, is_default, is_active) VALUES 
('Moroccan Tarot', 'الكارطة المغربية', 'Traditional Moroccan tarot deck with cultural symbolism', 'مجموعة التاروت المغربية التقليدية مع الرمزية الثقافية', 'moroccan', true, true),
('Rider Waite', 'رايدر وايت', 'Classic Rider Waite tarot deck', 'مجموعة رايدر وايت الكلاسيكية', 'rider_waite', false, true),
('Marseille Tarot', 'تاروت مارسيليا', 'Traditional French Marseille tarot', 'التاروت الفرنسي التقليدي مارسيليا', 'marseille', false, true);

-- =====================================================
-- ENHANCED TAROT SPREADS TABLE
-- =====================================================
-- Drop existing table if needed and recreate with new structure
DROP TABLE IF EXISTS tarot_spreads CASCADE;

CREATE TABLE tarot_spreads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  card_count INTEGER NOT NULL,
  positions JSONB NOT NULL, -- Array of position objects with name, meaning, coordinates
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
  category TEXT CHECK (category IN ('love', 'career', 'general', 'spiritual', 'health', 'finance')),
  deck_id UUID REFERENCES tarot_decks(id) DEFAULT (SELECT id FROM tarot_decks WHERE is_default = true LIMIT 1),
  image_url TEXT, -- Layout diagram
  is_active BOOLEAN DEFAULT true,
  is_custom BOOLEAN DEFAULT false, -- True for reader-created spreads
  created_by UUID REFERENCES profiles(id),
  -- Approval workflow fields
  approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SPREAD SERVICE ASSIGNMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS spread_service_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spread_id UUID REFERENCES tarot_spreads(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  reader_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_gift BOOLEAN DEFAULT false, -- True if spread is assigned as gift with another service
  assignment_order INTEGER DEFAULT 1, -- Order of spread when multiple assigned
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(spread_id, service_id, reader_id)
);

-- =====================================================
-- SPREAD APPROVAL LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS spread_approval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spread_id UUID REFERENCES tarot_spreads(id) ON DELETE CASCADE,
  action TEXT CHECK (action IN ('created', 'submitted', 'approved', 'rejected', 'modified')) NOT NULL,
  performed_by UUID REFERENCES profiles(id) NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  notes TEXT,
  metadata JSONB, -- Store additional context like what was changed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CLIENT SPREAD SELECTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS client_spread_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  client_id UUID REFERENCES profiles(id) NOT NULL,
  spread_id UUID REFERENCES tarot_spreads(id) NOT NULL,
  selected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cards_drawn JSONB, -- Store drawn cards with positions
  is_completed BOOLEAN DEFAULT false,
  session_data JSONB, -- Store session state for resuming
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(booking_id, spread_id)
);

-- =====================================================
-- READER SPREAD NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS reader_spread_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spread_id UUID REFERENCES tarot_spreads(id) ON DELETE CASCADE,
  reader_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES profiles(id), -- Who should be notified
  notification_type TEXT CHECK (notification_type IN ('approval_needed', 'approved', 'rejected')) NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_tarot_decks_type ON tarot_decks(deck_type);
CREATE INDEX IF NOT EXISTS idx_tarot_decks_active ON tarot_decks(is_active);
CREATE INDEX IF NOT EXISTS idx_tarot_decks_default ON tarot_decks(is_default);

CREATE INDEX IF NOT EXISTS idx_spreads_category ON tarot_spreads(category);
CREATE INDEX IF NOT EXISTS idx_spreads_difficulty ON tarot_spreads(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_spreads_deck ON tarot_spreads(deck_id);
CREATE INDEX IF NOT EXISTS idx_spreads_creator ON tarot_spreads(created_by);
CREATE INDEX IF NOT EXISTS idx_spreads_approval_status ON tarot_spreads(approval_status);
CREATE INDEX IF NOT EXISTS idx_spreads_custom ON tarot_spreads(is_custom);

CREATE INDEX IF NOT EXISTS idx_spread_assignments_spread ON spread_service_assignments(spread_id);
CREATE INDEX IF NOT EXISTS idx_spread_assignments_service ON spread_service_assignments(service_id);
CREATE INDEX IF NOT EXISTS idx_spread_assignments_reader ON spread_service_assignments(reader_id);
CREATE INDEX IF NOT EXISTS idx_spread_assignments_active ON spread_service_assignments(is_active);

CREATE INDEX IF NOT EXISTS idx_approval_logs_spread ON spread_approval_logs(spread_id);
CREATE INDEX IF NOT EXISTS idx_approval_logs_performer ON spread_approval_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_approval_logs_action ON spread_approval_logs(action);

CREATE INDEX IF NOT EXISTS idx_client_selections_booking ON client_spread_selections(booking_id);
CREATE INDEX IF NOT EXISTS idx_client_selections_client ON client_spread_selections(client_id);
CREATE INDEX IF NOT EXISTS idx_client_selections_spread ON client_spread_selections(spread_id);

CREATE INDEX IF NOT EXISTS idx_spread_notifications_reader ON reader_spread_notifications(reader_id);
CREATE INDEX IF NOT EXISTS idx_spread_notifications_admin ON reader_spread_notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_spread_notifications_unread ON reader_spread_notifications(is_read);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to automatically approve system spreads
CREATE OR REPLACE FUNCTION auto_approve_system_spreads()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-approve spreads created by admins or super_admins
  IF NEW.is_custom = false OR 
     (SELECT role FROM profiles WHERE id = NEW.created_by) IN ('admin', 'super_admin') THEN
    NEW.approval_status = 'approved';
    NEW.approved_by = NEW.created_by;
    NEW.approved_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-approval
CREATE TRIGGER auto_approve_system_spreads_trigger
  BEFORE INSERT ON tarot_spreads
  FOR EACH ROW
  EXECUTE FUNCTION auto_approve_system_spreads();

-- Function to log spread approval actions
CREATE OR REPLACE FUNCTION log_spread_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status changes
  IF TG_OP = 'UPDATE' AND OLD.approval_status != NEW.approval_status THEN
    INSERT INTO spread_approval_logs (
      spread_id,
      action,
      performed_by,
      previous_status,
      new_status,
      notes
    ) VALUES (
      NEW.id,
      CASE 
        WHEN NEW.approval_status = 'approved' THEN 'approved'
        WHEN NEW.approval_status = 'rejected' THEN 'rejected'
        ELSE 'modified'
      END,
      COALESCE(NEW.approved_by, NEW.created_by),
      OLD.approval_status,
      NEW.approval_status,
      CASE 
        WHEN NEW.approval_status = 'rejected' THEN NEW.rejection_reason
        ELSE NULL
      END
    );
    
    -- Create notification for reader
    INSERT INTO reader_spread_notifications (
      spread_id,
      reader_id,
      notification_type,
      message
    ) VALUES (
      NEW.id,
      NEW.created_by,
      NEW.approval_status::TEXT,
      CASE 
        WHEN NEW.approval_status = 'approved' THEN 'Your spread "' || NEW.name || '" has been approved'
        WHEN NEW.approval_status = 'rejected' THEN 'Your spread "' || NEW.name || '" was rejected: ' || COALESCE(NEW.rejection_reason, 'No reason provided')
        ELSE 'Your spread "' || NEW.name || '" status was updated'
      END
    );
  END IF;
  
  -- Log creation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO spread_approval_logs (
      spread_id,
      action,
      performed_by,
      new_status
    ) VALUES (
      NEW.id,
      'created',
      NEW.created_by,
      NEW.approval_status
    );
    
    -- Notify admins if approval is needed
    IF NEW.approval_status = 'pending' THEN
      INSERT INTO reader_spread_notifications (
        spread_id,
        admin_id,
        notification_type,
        message
      )
      SELECT 
        NEW.id,
        p.id,
        'approval_needed',
        'New custom spread "' || NEW.name || '" by ' || COALESCE(creator.first_name, creator.email) || ' needs approval'
      FROM profiles p
      JOIN profiles creator ON creator.id = NEW.created_by
      WHERE p.role IN ('admin', 'super_admin') AND p.is_active = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for logging and notifications
CREATE TRIGGER log_spread_approval_trigger
  AFTER INSERT OR UPDATE ON tarot_spreads
  FOR EACH ROW
  EXECUTE FUNCTION log_spread_approval();

-- Function to get available spreads for service booking
CREATE OR REPLACE FUNCTION get_available_spreads_for_service(
  p_service_id UUID,
  p_reader_id UUID DEFAULT NULL
)
RETURNS TABLE (
  spread_id UUID,
  spread_name TEXT,
  spread_name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  card_count INTEGER,
  difficulty_level TEXT,
  category TEXT,
  deck_name TEXT,
  deck_name_ar TEXT,
  is_gift BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ts.id,
    ts.name,
    ts.name_ar,
    ts.description,
    ts.description_ar,
    ts.card_count,
    ts.difficulty_level,
    ts.category,
    td.name as deck_name,
    td.name_ar as deck_name_ar,
    ssa.is_gift
  FROM tarot_spreads ts
  JOIN tarot_decks td ON ts.deck_id = td.id
  LEFT JOIN spread_service_assignments ssa ON ts.id = ssa.spread_id 
    AND ssa.service_id = p_service_id 
    AND (p_reader_id IS NULL OR ssa.reader_id = p_reader_id)
    AND ssa.is_active = true
  WHERE ts.approval_status = 'approved'
    AND ts.is_active = true
    AND td.is_active = true
    AND (
      -- System spreads available to all
      ts.is_custom = false 
      OR 
      -- Custom spreads assigned to this service
      ssa.id IS NOT NULL
    )
  ORDER BY ssa.assignment_order ASC, ts.difficulty_level ASC, ts.name ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to check if reader can use spread
CREATE OR REPLACE FUNCTION can_reader_use_spread(
  p_reader_id UUID,
  p_spread_id UUID,
  p_service_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  spread_record RECORD;
  assignment_exists BOOLEAN := false;
BEGIN
  -- Get spread details
  SELECT * INTO spread_record 
  FROM tarot_spreads 
  WHERE id = p_spread_id AND approval_status = 'approved' AND is_active = true;
  
  -- Spread doesn't exist or not approved
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- System spreads are available to all readers
  IF spread_record.is_custom = false THEN
    RETURN true;
  END IF;
  
  -- For custom spreads, check if reader created it or has assignment
  IF spread_record.created_by = p_reader_id THEN
    RETURN true;
  END IF;
  
  -- Check service assignment if service specified
  IF p_service_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM spread_service_assignments 
      WHERE spread_id = p_spread_id 
        AND service_id = p_service_id 
        AND reader_id = p_reader_id 
        AND is_active = true
    ) INTO assignment_exists;
    
    RETURN assignment_exists;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Create some default system spreads
INSERT INTO tarot_spreads (
  name, name_ar, description, description_ar, card_count, 
  positions, difficulty_level, category, is_custom, approval_status,
  approved_by, approved_at
) VALUES 
(
  'Three Card Spread', 'انتشار الثلاث ورق', 
  'Simple past, present, future reading', 'قراءة بسيطة للماضي والحاضر والمستقبل',
  3,
  '[
    {"position": 1, "name": "Past", "name_ar": "الماضي", "meaning": "What influences from the past", "x": 20, "y": 50},
    {"position": 2, "name": "Present", "name_ar": "الحاضر", "meaning": "Current situation", "x": 50, "y": 50},
    {"position": 3, "name": "Future", "name_ar": "المستقبل", "meaning": "What is to come", "x": 80, "y": 50}
  ]'::jsonb,
  'beginner', 'general', false, 'approved', 
  (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1), NOW()
),
(
  'Celtic Cross', 'الصليب السلتي',
  'Comprehensive 10-card spread for detailed insights', 'انتشار شامل من 10 ورق للحصول على رؤى مفصلة',
  10,
  '[
    {"position": 1, "name": "Present Situation", "name_ar": "الوضع الحالي", "meaning": "The heart of the matter", "x": 50, "y": 50},
    {"position": 2, "name": "Challenge", "name_ar": "التحدي", "meaning": "What crosses you", "x": 50, "y": 30},
    {"position": 3, "name": "Distant Past", "name_ar": "الماضي البعيد", "meaning": "Foundational influences", "x": 30, "y": 50},
    {"position": 4, "name": "Recent Past", "name_ar": "الماضي القريب", "meaning": "Recent influences", "x": 50, "y": 70},
    {"position": 5, "name": "Possible Outcome", "name_ar": "النتيجة المحتملة", "meaning": "What may come to pass", "x": 70, "y": 50},
    {"position": 6, "name": "Near Future", "name_ar": "المستقبل القريب", "meaning": "Immediate future", "x": 50, "y": 10},
    {"position": 7, "name": "Your Approach", "name_ar": "نهجك", "meaning": "How you approach the situation", "x": 85, "y": 70},
    {"position": 8, "name": "External Influences", "name_ar": "التأثيرات الخارجية", "meaning": "Outside influences", "x": 85, "y": 50},
    {"position": 9, "name": "Hopes and Fears", "name_ar": "الآمال والمخاوف", "meaning": "Your inner feelings", "x": 85, "y": 30},
    {"position": 10, "name": "Final Outcome", "name_ar": "النتيجة النهائية", "meaning": "The final outcome", "x": 85, "y": 10}
  ]'::jsonb,
  'advanced', 'general', false, 'approved',
  (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1), NOW()
),
(
  'Love Spread', 'انتشار الحب',
  'Five-card spread focused on love and relationships', 'انتشار خمس ورق يركز على الحب والعلاقات',
  5,
  '[
    {"position": 1, "name": "You", "name_ar": "أنت", "meaning": "Your current state in love", "x": 25, "y": 60},
    {"position": 2, "name": "Your Partner", "name_ar": "شريكك", "meaning": "Your partners state", "x": 75, "y": 60},
    {"position": 3, "name": "The Relationship", "name_ar": "العلاقة", "meaning": "The relationship dynamic", "x": 50, "y": 30},
    {"position": 4, "name": "Challenges", "name_ar": "التحديات", "meaning": "What challenges you face", "x": 25, "y": 80},
    {"position": 5, "name": "Outcome", "name_ar": "النتيجة", "meaning": "Where the relationship is heading", "x": 75, "y": 80}
  ]'::jsonb,
  'intermediate', 'love', false, 'approved',
  (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1), NOW()
);

COMMENT ON TABLE tarot_decks IS 'Available tarot deck types for spreads';
COMMENT ON TABLE tarot_spreads IS 'Enhanced tarot spreads with approval workflow and deck assignments';
COMMENT ON TABLE spread_service_assignments IS 'Links spreads to specific services and readers';
COMMENT ON TABLE spread_approval_logs IS 'Audit trail for spread approval actions';
COMMENT ON TABLE client_spread_selections IS 'Tracks client spread selections during booking';
COMMENT ON TABLE reader_spread_notifications IS 'Notifications for spread approval workflow'; 