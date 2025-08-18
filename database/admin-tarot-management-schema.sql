-- =====================================================
-- SAMIA TAROT - ADMIN TAROT MANAGEMENT SCHEMA
-- Enhanced Spread Management with Visibility Controls
-- Deck Management with Image Upload System
-- =====================================================

-- =====================================================
-- 1. ENHANCED SPREADS TABLE - Add Admin Controls
-- =====================================================

-- Add visibility and assignment columns to tarot_spreads
ALTER TABLE tarot_spreads 
ADD COLUMN IF NOT EXISTS visibility_type TEXT CHECK (visibility_type IN ('public', 'private', 'assigned')) DEFAULT 'public',
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS admin_tags TEXT[],
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS featured_order INTEGER,
ADD COLUMN IF NOT EXISTS admin_created_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS admin_approved_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS admin_approved_at TIMESTAMPTZ;

-- =====================================================
-- 2. SPREAD READER ASSIGNMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tarot_spread_reader_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spread_id UUID NOT NULL REFERENCES tarot_spreads(id) ON DELETE CASCADE,
    reader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES profiles(id), -- Admin who made the assignment
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(spread_id, reader_id)
);

-- =====================================================
-- 3. ENHANCED DECK MANAGEMENT - Add Image Support
-- =====================================================

-- Add deck image management columns
ALTER TABLE tarot_decks 
ADD COLUMN IF NOT EXISTS admin_created_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS upload_status TEXT CHECK (upload_status IN ('pending', 'uploading', 'complete', 'failed')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS total_images_required INTEGER,
ADD COLUMN IF NOT EXISTS total_images_uploaded INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS card_back_uploaded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_admin_managed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS visibility_type TEXT CHECK (visibility_type IN ('public', 'private', 'assigned')) DEFAULT 'public';

-- =====================================================
-- 4. DECK CARD IMAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tarot_deck_card_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES tarot_decks(id) ON DELETE CASCADE,
    card_id UUID REFERENCES tarot_cards(id) ON DELETE CASCADE, -- NULL for card back
    image_type TEXT CHECK (image_type IN ('card_front', 'card_back')) NOT NULL,
    image_url TEXT NOT NULL,
    image_filename TEXT NOT NULL,
    image_size_bytes INTEGER,
    upload_order INTEGER, -- For card ordering
    uploaded_by UUID NOT NULL REFERENCES profiles(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(deck_id, card_id, image_type),
    UNIQUE(deck_id, upload_order) -- Ensure unique ordering per deck
);

-- =====================================================
-- 5. DECK READER ASSIGNMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tarot_deck_reader_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES tarot_decks(id) ON DELETE CASCADE,
    reader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES profiles(id), -- Admin who made the assignment
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(deck_id, reader_id)
);

-- =====================================================
-- 6. ADMIN ACTIVITY LOG FOR TAROT MANAGEMENT
-- =====================================================
CREATE TABLE IF NOT EXISTS tarot_admin_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES profiles(id),
    action_type TEXT NOT NULL, -- 'spread_created', 'spread_assigned', 'deck_created', 'deck_image_uploaded', etc.
    target_type TEXT NOT NULL, -- 'spread', 'deck', 'assignment'
    target_id UUID NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. INDEXES FOR PERFORMANCE
-- =====================================================

-- Spread assignments indexes
CREATE INDEX IF NOT EXISTS idx_spread_assignments_spread ON tarot_spread_reader_assignments(spread_id);
CREATE INDEX IF NOT EXISTS idx_spread_assignments_reader ON tarot_spread_reader_assignments(reader_id);
CREATE INDEX IF NOT EXISTS idx_spread_assignments_active ON tarot_spread_reader_assignments(is_active);

-- Deck assignments indexes
CREATE INDEX IF NOT EXISTS idx_deck_assignments_deck ON tarot_deck_reader_assignments(deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_assignments_reader ON tarot_deck_reader_assignments(reader_id);
CREATE INDEX IF NOT EXISTS idx_deck_assignments_active ON tarot_deck_reader_assignments(is_active);

-- Deck images indexes
CREATE INDEX IF NOT EXISTS idx_deck_images_deck ON tarot_deck_card_images(deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_images_type ON tarot_deck_card_images(image_type);
CREATE INDEX IF NOT EXISTS idx_deck_images_active ON tarot_deck_card_images(is_active);
CREATE INDEX IF NOT EXISTS idx_deck_images_order ON tarot_deck_card_images(deck_id, upload_order);

-- Enhanced spread indexes
CREATE INDEX IF NOT EXISTS idx_spreads_visibility ON tarot_spreads(visibility_type);
CREATE INDEX IF NOT EXISTS idx_spreads_featured ON tarot_spreads(is_featured);
CREATE INDEX IF NOT EXISTS idx_spreads_admin_created ON tarot_spreads(admin_created_by);

-- Enhanced deck indexes
CREATE INDEX IF NOT EXISTS idx_decks_admin_managed ON tarot_decks(is_admin_managed);
CREATE INDEX IF NOT EXISTS idx_decks_upload_status ON tarot_decks(upload_status);
CREATE INDEX IF NOT EXISTS idx_decks_visibility ON tarot_decks(visibility_type);

-- Activity log indexes
CREATE INDEX IF NOT EXISTS idx_admin_activity_admin ON tarot_admin_activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_type ON tarot_admin_activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_activity_target ON tarot_admin_activity_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created ON tarot_admin_activity_log(created_at);

-- =====================================================
-- 8. HELPER FUNCTIONS FOR ADMIN MANAGEMENT
-- =====================================================

-- Function to get spreads available to a reader
CREATE OR REPLACE FUNCTION get_available_spreads_for_reader(reader_profile_id UUID)
RETURNS TABLE (
    spread_id UUID,
    name TEXT,
    name_ar TEXT,
    description TEXT,
    description_ar TEXT,
    card_count INTEGER,
    difficulty_level TEXT,
    category TEXT,
    visibility_type TEXT,
    is_assigned BOOLEAN
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.name_ar,
        s.description,
        s.description_ar,
        s.card_count,
        s.difficulty_level,
        s.category,
        s.visibility_type,
        CASE 
            WHEN s.visibility_type = 'assigned' AND a.reader_id IS NOT NULL THEN true
            WHEN s.visibility_type = 'public' THEN false
            ELSE false
        END as is_assigned
    FROM tarot_spreads s
    LEFT JOIN tarot_spread_reader_assignments a ON s.id = a.spread_id 
        AND a.reader_id = reader_profile_id 
        AND a.is_active = true
    WHERE s.is_active = true 
        AND s.approval_status = 'approved'
        AND (
            s.visibility_type = 'public' 
            OR (s.visibility_type = 'assigned' AND a.reader_id IS NOT NULL)
        )
    ORDER BY s.name;
END;
$$;

-- Function to get decks available to a reader
CREATE OR REPLACE FUNCTION get_available_decks_for_reader(reader_profile_id UUID)
RETURNS TABLE (
    deck_id UUID,
    name TEXT,
    name_ar TEXT,
    description TEXT,
    description_ar TEXT,
    total_cards INTEGER,
    deck_type TEXT,
    visibility_type TEXT,
    is_assigned BOOLEAN
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.name,
        d.name_ar,
        d.description,
        d.description_ar,
        d.total_cards,
        d.deck_type,
        d.visibility_type,
        CASE 
            WHEN d.visibility_type = 'assigned' AND a.reader_id IS NOT NULL THEN true
            WHEN d.visibility_type = 'public' THEN false
            ELSE false
        END as is_assigned
    FROM tarot_decks d
    LEFT JOIN tarot_deck_reader_assignments a ON d.id = a.deck_id 
        AND a.reader_id = reader_profile_id 
        AND a.is_active = true
    WHERE d.is_active = true 
        AND d.upload_status = 'complete'
        AND (
            d.visibility_type = 'public' 
            OR (d.visibility_type = 'assigned' AND a.reader_id IS NOT NULL)
        )
    ORDER BY d.name;
END;
$$;

-- Function to log admin activity
CREATE OR REPLACE FUNCTION log_admin_tarot_activity(
    p_admin_id UUID,
    p_action_type TEXT,
    p_target_type TEXT,
    p_target_id UUID,
    p_details JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    activity_id UUID;
BEGIN
    INSERT INTO tarot_admin_activity_log 
    (admin_id, action_type, target_type, target_id, details, ip_address, user_agent)
    VALUES 
    (p_admin_id, p_action_type, p_target_type, p_target_id, p_details, p_ip_address, p_user_agent)
    RETURNING id INTO activity_id;
    
    RETURN activity_id;
END;
$$;

-- Function to update deck upload status based on images
CREATE OR REPLACE FUNCTION update_deck_upload_status(p_deck_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    required_count INTEGER;
    uploaded_count INTEGER;
    back_uploaded BOOLEAN;
BEGIN
    -- Get required count and current upload status
    SELECT total_cards INTO required_count FROM tarot_decks WHERE id = p_deck_id;
    
    -- Count uploaded card images
    SELECT COUNT(*) INTO uploaded_count 
    FROM tarot_deck_card_images 
    WHERE deck_id = p_deck_id AND image_type = 'card_front' AND is_active = true;
    
    -- Check if card back is uploaded
    SELECT EXISTS(
        SELECT 1 FROM tarot_deck_card_images 
        WHERE deck_id = p_deck_id AND image_type = 'card_back' AND is_active = true
    ) INTO back_uploaded;
    
    -- Update deck status
    UPDATE tarot_decks 
    SET 
        total_images_uploaded = uploaded_count,
        card_back_uploaded = back_uploaded,
        upload_status = CASE 
            WHEN uploaded_count = required_count AND back_uploaded THEN 'complete'
            WHEN uploaded_count > 0 OR back_uploaded THEN 'uploading'
            ELSE 'pending'
        END,
        updated_at = NOW()
    WHERE id = p_deck_id;
END;
$$;

-- =====================================================
-- 9. TRIGGERS
-- =====================================================

-- Trigger to update deck upload status when images are added/removed
CREATE OR REPLACE FUNCTION trigger_update_deck_upload_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM update_deck_upload_status(NEW.deck_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM update_deck_upload_status(OLD.deck_id);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM update_deck_upload_status(NEW.deck_id);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS update_deck_upload_status_trigger ON tarot_deck_card_images;
CREATE TRIGGER update_deck_upload_status_trigger
    AFTER INSERT OR UPDATE OR DELETE ON tarot_deck_card_images
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_deck_upload_status();

-- Trigger to set required images count when deck is created
CREATE OR REPLACE FUNCTION trigger_set_deck_requirements()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.total_images_required := NEW.total_cards + 1; -- +1 for card back
    RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS set_deck_requirements_trigger ON tarot_decks;
CREATE TRIGGER set_deck_requirements_trigger
    BEFORE INSERT OR UPDATE ON tarot_decks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_deck_requirements();

-- Verification
SELECT 'Admin Tarot Management Schema Created Successfully' as status; 