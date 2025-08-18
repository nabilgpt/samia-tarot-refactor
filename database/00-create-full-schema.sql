-- =====================================================
-- SAMIA TAROT - COMPREHENSIVE SCHEMA MIGRATION
-- Run this FIRST to add all missing columns before running data scripts
-- =====================================================

-- Step 1: Update tarot_decks table with all missing columns
ALTER TABLE tarot_decks 
ADD COLUMN IF NOT EXISTS name_ar TEXT,
ADD COLUMN IF NOT EXISTS description_ar TEXT,
ADD COLUMN IF NOT EXISTS supports_reversals BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS cultural_origin TEXT DEFAULT 'international',
ADD COLUMN IF NOT EXISTS metaphysical_system TEXT DEFAULT 'western',
ADD COLUMN IF NOT EXISTS card_back_image_url TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS card_count INTEGER;

-- Update card_count to match total_cards for existing records
UPDATE tarot_decks 
SET card_count = total_cards 
WHERE card_count IS NULL;

-- Step 2: Update tarot_cards table with all missing columns
ALTER TABLE tarot_cards 
ADD COLUMN IF NOT EXISTS deck_id UUID,
ADD COLUMN IF NOT EXISTS name_ar TEXT,
ADD COLUMN IF NOT EXISTS card_key TEXT,
ADD COLUMN IF NOT EXISTS card_number INTEGER,
ADD COLUMN IF NOT EXISTS arcana_type TEXT DEFAULT 'major',
ADD COLUMN IF NOT EXISTS suit TEXT,
ADD COLUMN IF NOT EXISTS upright_meaning TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS reversed_meaning TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS upright_meaning_ar TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS reversed_meaning_ar TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS keywords TEXT[],
ADD COLUMN IF NOT EXISTS keywords_ar TEXT[],
ADD COLUMN IF NOT EXISTS astrological_association TEXT,
ADD COLUMN IF NOT EXISTS numerological_value INTEGER,
ADD COLUMN IF NOT EXISTS elemental_association TEXT,
ADD COLUMN IF NOT EXISTS chakra_association TEXT,
ADD COLUMN IF NOT EXISTS color_associations TEXT[],
ADD COLUMN IF NOT EXISTS gemstone_associations TEXT[],
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 3: Create missing tables if they don't exist
CREATE TABLE IF NOT EXISTS tarot_spreads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_ar TEXT,
    description TEXT NOT NULL,
    description_ar TEXT,
    card_count INTEGER NOT NULL,
    min_cards INTEGER,
    max_cards INTEGER,
    positions JSONB NOT NULL,
    layout_type TEXT DEFAULT 'fixed',
    difficulty_level TEXT DEFAULT 'beginner',
    category TEXT,
    reading_time_minutes INTEGER DEFAULT 30,
    compatible_deck_types TEXT[],
    preferred_deck_id UUID REFERENCES tarot_decks(id),
    background_theme TEXT DEFAULT 'cosmic',
    position_shape TEXT DEFAULT 'circle',
    layout_image_url TEXT,
    is_public BOOLEAN DEFAULT true,
    is_custom BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    approval_status TEXT DEFAULT 'pending',
    usage_count INTEGER DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tarot_reading_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reader_id UUID NOT NULL,
    client_id UUID,
    spread_id UUID REFERENCES tarot_spreads(id),
    deck_id UUID REFERENCES tarot_decks(id),
    question TEXT,
    question_category TEXT DEFAULT 'general',
    is_live_call BOOLEAN DEFAULT false,
    booking_id UUID,
    total_cards_to_draw INTEGER NOT NULL,
    cards_remaining INTEGER,
    status TEXT DEFAULT 'preparing',
    current_step TEXT DEFAULT 'setup',
    payment_status TEXT DEFAULT 'pending',
    session_notes TEXT,
    expires_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tarot_spread_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES tarot_reading_sessions(id) ON DELETE CASCADE,
    card_id UUID REFERENCES tarot_cards(id),
    position INTEGER NOT NULL,
    position_name TEXT,
    position_meaning TEXT,
    position_meaning_ar TEXT,
    is_reversed BOOLEAN DEFAULT false,
    is_revealed BOOLEAN DEFAULT false,
    is_burned BOOLEAN DEFAULT false,
    custom_interpretation TEXT,
    reader_notes TEXT,
    revealed_at TIMESTAMPTZ,
    burned_at TIMESTAMPTZ,
    burned_by_user_id UUID,
    burn_reason TEXT,
    added_by_role TEXT DEFAULT 'reader',
    added_by_user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tarot_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL,
    permission_name TEXT NOT NULL,
    can_perform BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role, permission_name)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tarot_cards_deck_id ON tarot_cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_tarot_cards_arcana_type ON tarot_cards(arcana_type);
CREATE INDEX IF NOT EXISTS idx_tarot_decks_type ON tarot_decks(deck_type);
CREATE INDEX IF NOT EXISTS idx_tarot_decks_default ON tarot_decks(is_default);

-- Insert basic role permissions
INSERT INTO tarot_role_permissions (role, permission_name, can_perform, description)
VALUES 
    ('reader', 'create_sessions', true, 'Can create reading sessions'),
    ('reader', 'draw_cards', true, 'Can draw cards for sessions'),
    ('reader', 'burn_cards', true, 'Can burn/discard cards'),
    ('reader', 'create_custom_spreads', true, 'Can create custom spreads'),
    ('admin', 'manage_decks', true, 'Can manage tarot decks'),
    ('admin', 'approve_spreads', true, 'Can approve custom spreads'),
    ('super_admin', 'full_access', true, 'Has full system access'),
    ('client', 'book_readings', true, 'Can book reading sessions'),
    ('client', 'view_own_sessions', true, 'Can view own reading sessions')
ON CONFLICT (role, permission_name) DO NOTHING;

-- Verification
SELECT 'Schema Migration Complete - All columns added' as status; 