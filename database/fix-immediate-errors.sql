-- ============================================================================
-- IMMEDIATE ERROR FIXES for SAMIA TAROT DATABASE
-- Fixes: reading_sessions table, user_id column issues
-- ============================================================================

-- Fix 1: Create missing reading_sessions table
CREATE TABLE IF NOT EXISTS reading_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL UNIQUE,
    reader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tarot_spread_id UUID REFERENCES tarot_spreads(id),
    session_type VARCHAR(50) NOT NULL DEFAULT 'tarot_reading',
    session_status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    reading_data JSONB DEFAULT '{}'::jsonb,
    cards_drawn JSONB DEFAULT '[]'::jsonb,
    interpretation_notes TEXT,
    client_feedback TEXT,
    reader_notes TEXT,
    session_recording_url TEXT,
    payment_amount DECIMAL(10,2),
    payment_status VARCHAR(50) DEFAULT 'pending',
    payment_transaction_id TEXT,
    is_emergency BOOLEAN DEFAULT FALSE,
    emergency_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_reading_sessions_reader_id ON reading_sessions(reader_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_client_id ON reading_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_session_status ON reading_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_scheduled_at ON reading_sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_created_at ON reading_sessions(created_at);

-- Fix 2: Add user_id column to profiles table if it doesn't exist
DO $$ 
BEGIN
    -- Check if user_id column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN user_id UUID;
        
        -- Update existing records to have user_id = id for backward compatibility
        UPDATE profiles SET user_id = id WHERE user_id IS NULL;
        
        -- Make user_id unique after populating
        ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
        
        -- Add index
        CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
    END IF;
END $$;

-- Fix 3: Create missing tarot_spread_positions table (referenced by reading_sessions)
CREATE TABLE IF NOT EXISTS tarot_spread_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spread_id UUID NOT NULL REFERENCES tarot_spreads(id) ON DELETE CASCADE,
    position_number INTEGER NOT NULL,
    position_name VARCHAR(100) NOT NULL,
    position_description TEXT,
    position_meaning TEXT,
    x_coordinate DECIMAL(5,2),
    y_coordinate DECIMAL(5,2),
    rotation_angle DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_spread_position UNIQUE(spread_id, position_number)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_tarot_spread_positions_spread_id ON tarot_spread_positions(spread_id);
CREATE INDEX IF NOT EXISTS idx_tarot_spread_positions_position_number ON tarot_spread_positions(position_number);

-- Fix 4: Create reader_spreads table (for reader-specific spread configurations)
CREATE TABLE IF NOT EXISTS reader_spreads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    spread_id UUID NOT NULL REFERENCES tarot_spreads(id) ON DELETE CASCADE,
    custom_name VARCHAR(200),
    custom_description TEXT,
    personal_notes TEXT,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    is_favorite BOOLEAN DEFAULT FALSE,
    custom_positions JSONB DEFAULT '[]'::jsonb,
    pricing_override DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_reader_spread UNIQUE(reader_id, spread_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_reader_spreads_reader_id ON reader_spreads(reader_id);
CREATE INDEX IF NOT EXISTS idx_reader_spreads_spread_id ON reader_spreads(spread_id);
CREATE INDEX IF NOT EXISTS idx_reader_spreads_is_favorite ON reader_spreads(is_favorite);

-- Fix 5: Create client_tarot_sessions table (for client session history)
CREATE TABLE IF NOT EXISTS client_tarot_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reading_session_id UUID NOT NULL REFERENCES reading_sessions(id) ON DELETE CASCADE,
    session_rating INTEGER CHECK (session_rating >= 1 AND session_rating <= 5),
    session_review TEXT,
    favorite_cards JSONB DEFAULT '[]'::jsonb,
    session_insights TEXT,
    follow_up_notes TEXT,
    next_reading_suggestions TEXT,
    is_session_saved BOOLEAN DEFAULT FALSE,
    session_tags TEXT[],
    personal_interpretation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_client_session UNIQUE(client_id, reading_session_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_client_tarot_sessions_client_id ON client_tarot_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_tarot_sessions_reading_session_id ON client_tarot_sessions(reading_session_id);
CREATE INDEX IF NOT EXISTS idx_client_tarot_sessions_session_rating ON client_tarot_sessions(session_rating);

-- Fix 6: Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to all tables
CREATE TRIGGER update_reading_sessions_updated_at BEFORE UPDATE ON reading_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tarot_spread_positions_updated_at BEFORE UPDATE ON tarot_spread_positions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reader_spreads_updated_at BEFORE UPDATE ON reader_spreads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_tarot_sessions_updated_at BEFORE UPDATE ON client_tarot_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fix 7: Enable Row Level Security (RLS) on new tables
ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarot_spread_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_spreads ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_tarot_sessions ENABLE ROW LEVEL SECURITY;

-- Fix 8: Create RLS policies for reading_sessions
CREATE POLICY "Users can view their own reading sessions" ON reading_sessions
    FOR SELECT USING (
        auth.uid() = reader_id OR 
        auth.uid() = client_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Readers can create reading sessions" ON reading_sessions
    FOR INSERT WITH CHECK (
        auth.uid() = reader_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Participants can update their reading sessions" ON reading_sessions
    FOR UPDATE USING (
        auth.uid() = reader_id OR 
        auth.uid() = client_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Fix 9: Create RLS policies for tarot_spread_positions
CREATE POLICY "Everyone can view tarot spread positions" ON tarot_spread_positions
    FOR SELECT USING (true);

CREATE POLICY "Only admins can modify tarot spread positions" ON tarot_spread_positions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Fix 10: Create RLS policies for reader_spreads
CREATE POLICY "Readers can view their own spreads" ON reader_spreads
    FOR SELECT USING (
        auth.uid() = reader_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Readers can manage their own spreads" ON reader_spreads
    FOR ALL USING (
        auth.uid() = reader_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Fix 11: Create RLS policies for client_tarot_sessions
CREATE POLICY "Clients can view their own tarot sessions" ON client_tarot_sessions
    FOR SELECT USING (
        auth.uid() = client_id OR
        EXISTS (
            SELECT 1 FROM reading_sessions rs 
            WHERE rs.id = reading_session_id 
            AND rs.reader_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Clients can manage their own tarot sessions" ON client_tarot_sessions
    FOR ALL USING (
        auth.uid() = client_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Fix 12: Insert some default tarot spread positions for the Celtic Cross spread
DO $$
DECLARE
    celtic_cross_id UUID;
BEGIN
    -- Get the Celtic Cross spread ID (assuming it exists)
    SELECT id INTO celtic_cross_id FROM tarot_spreads WHERE name ILIKE '%celtic%' OR name ILIKE '%cross%' LIMIT 1;
    
    IF celtic_cross_id IS NOT NULL THEN
        -- Insert positions for Celtic Cross spread
        INSERT INTO tarot_spread_positions (spread_id, position_number, position_name, position_description, position_meaning, x_coordinate, y_coordinate) VALUES
        (celtic_cross_id, 1, 'Present Situation', 'The current state of affairs', 'What is happening now', 50.0, 50.0),
        (celtic_cross_id, 2, 'Challenge/Cross', 'The challenge or what crosses you', 'Obstacles or influences', 50.0, 35.0),
        (celtic_cross_id, 3, 'Distant Past', 'Foundation of the situation', 'Past influences', 30.0, 50.0),
        (celtic_cross_id, 4, 'Possible Outcome', 'Potential future outcome', 'Where things are heading', 70.0, 50.0),
        (celtic_cross_id, 5, 'Recent Past', 'Recent events', 'What has just passed', 50.0, 65.0),
        (celtic_cross_id, 6, 'Near Future', 'Immediate future', 'What is approaching', 50.0, 20.0),
        (celtic_cross_id, 7, 'Your Approach', 'Your approach to the situation', 'How you are handling it', 85.0, 80.0),
        (celtic_cross_id, 8, 'External Influences', 'Outside influences', 'Others perspectives', 85.0, 65.0),
        (celtic_cross_id, 9, 'Hopes and Fears', 'Your hopes and fears', 'Inner thoughts', 85.0, 50.0),
        (celtic_cross_id, 10, 'Final Outcome', 'The final outcome', 'The resolution', 85.0, 35.0)
        ON CONFLICT (spread_id, position_number) DO NOTHING;
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tables were created
SELECT 'reading_sessions' as table_name, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reading_sessions') 
            THEN '✅ Created' 
            ELSE '❌ Failed' 
       END as status
UNION ALL
SELECT 'tarot_spread_positions' as table_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tarot_spread_positions') 
            THEN '✅ Created' 
            ELSE '❌ Failed' 
       END as status
UNION ALL
SELECT 'reader_spreads' as table_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reader_spreads') 
            THEN '✅ Created' 
            ELSE '❌ Failed' 
       END as status
UNION ALL
SELECT 'client_tarot_sessions' as table_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_tarot_sessions') 
            THEN '✅ Created' 
            ELSE '❌ Failed' 
       END as status;

-- Verify user_id column was added to profiles
SELECT 'profiles.user_id column' as check_name,
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.columns 
           WHERE table_name = 'profiles' AND column_name = 'user_id'
       ) THEN '✅ Added' 
         ELSE '❌ Missing' 
       END as status; 