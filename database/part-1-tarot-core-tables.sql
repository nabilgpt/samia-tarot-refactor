-- ============================================================
-- PART 1: TAROT CORE TABLES ONLY
-- Safe creation of tarot system tables
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TAROT CARDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS tarot_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Card identification
    name VARCHAR(100) NOT NULL,
    card_number INTEGER NOT NULL,
    suit VARCHAR(20), -- major_arcana, cups, wands, swords, pentacles
    
    -- Card details
    keywords TEXT[],
    upright_meaning TEXT,
    reversed_meaning TEXT,
    
    -- Card imagery
    image_url TEXT,
    image_path TEXT,
    description TEXT,
    
    -- Symbolism and interpretation
    symbolism TEXT,
    astrological_association VARCHAR(100),
    numerological_significance INTEGER,
    
    -- System fields
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    
    -- Constraints
    UNIQUE(card_number, suit)
);

-- ============================================================
-- TAROT READINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS tarot_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Session details
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    
    -- Reading configuration
    spread_type VARCHAR(100) NOT NULL,
    question TEXT,
    reading_type VARCHAR(50) DEFAULT 'general', -- general, love, career, health, spiritual
    
    -- Reading data
    cards_drawn JSONB NOT NULL, -- Array of card IDs and positions
    interpretation TEXT,
    summary TEXT,
    advice TEXT,
    
    -- AI enhancement
    ai_enhanced BOOLEAN DEFAULT false,
    ai_confidence DECIMAL(3,2) DEFAULT 0,
    
    -- Status and completion
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- User feedback
    user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
    user_feedback TEXT,
    
    -- System fields
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- SPREAD POSITIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS spread_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Spread identification
    spread_name VARCHAR(100) NOT NULL,
    position_number INTEGER NOT NULL,
    position_name VARCHAR(100) NOT NULL,
    
    -- Position details
    position_meaning TEXT,
    interpretation_guidelines TEXT,
    
    -- Visual positioning
    x_coordinate DECIMAL(5,2) DEFAULT 0,
    y_coordinate DECIMAL(5,2) DEFAULT 0,
    rotation_angle DECIMAL(5,2) DEFAULT 0,
    
    -- System fields
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    
    -- Constraints
    UNIQUE(spread_name, position_number)
);

-- ============================================================
-- INDEXES FOR TAROT TABLES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tarot_cards_suit ON tarot_cards(suit);
CREATE INDEX IF NOT EXISTS idx_tarot_cards_active ON tarot_cards(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tarot_readings_user_id ON tarot_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_tarot_readings_reader_id ON tarot_readings(reader_id);
CREATE INDEX IF NOT EXISTS idx_tarot_readings_status ON tarot_readings(status);
CREATE INDEX IF NOT EXISTS idx_tarot_readings_created_at ON tarot_readings(created_at);
CREATE INDEX IF NOT EXISTS idx_spread_positions_spread_name ON spread_positions(spread_name);

-- ============================================================
-- RLS POLICIES FOR TAROT TABLES
-- ============================================================

-- Enable RLS
ALTER TABLE tarot_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarot_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE spread_positions ENABLE ROW LEVEL SECURITY;

-- Tarot cards (public read)
DROP POLICY IF EXISTS "Anyone can view active tarot cards" ON tarot_cards;
CREATE POLICY "Anyone can view active tarot cards" ON tarot_cards
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage tarot cards" ON tarot_cards;
CREATE POLICY "Admins can manage tarot cards" ON tarot_cards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Tarot readings (user privacy)
DROP POLICY IF EXISTS "Users can view their own readings" ON tarot_readings;
CREATE POLICY "Users can view their own readings" ON tarot_readings
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() = reader_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Users can create readings" ON tarot_readings;
CREATE POLICY "Users can create readings" ON tarot_readings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Spread positions (public read, admin write)
DROP POLICY IF EXISTS "Anyone can view spread positions" ON spread_positions;
CREATE POLICY "Anyone can view spread positions" ON spread_positions
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage spread positions" ON spread_positions;
CREATE POLICY "Admins can manage spread positions" ON spread_positions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
SELECT 
    '✅ PART 1 COMPLETED: Tarot Core Tables' as status,
    'Created: tarot_cards, tarot_readings, spread_positions' as tables_created,
    timezone('utc'::text, now()) as completed_at; 