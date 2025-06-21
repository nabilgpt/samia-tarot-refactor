-- SAMIA TAROT - Create Main Readers Table
-- This creates the core readers table that serves as the main reference for all reader-related operations

DO $$ 
BEGIN
    RAISE NOTICE '🔮 Creating SAMIA TAROT Readers Table...';
    RAISE NOTICE '================================================';
END $$;

-- Create the main readers table
CREATE TABLE IF NOT EXISTS readers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core Identity
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(30),
    avatar_url TEXT,
    
    -- Professional Info
    bio TEXT,
    specialty VARCHAR(100) DEFAULT 'general',
    specialties TEXT[] DEFAULT ARRAY[]::TEXT[], -- Multiple specialties
    languages VARCHAR(100)[] DEFAULT ARRAY['en']::VARCHAR[],
    experience_years INTEGER DEFAULT 0,
    
    -- Ratings & Reviews
    rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
    reviews_count INTEGER DEFAULT 0 CHECK (reviews_count >= 0),
    total_readings INTEGER DEFAULT 0 CHECK (total_readings >= 0),
    
    -- Status & Verification
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'suspended', 'banned')),
    verified BOOLEAN DEFAULT false,
    verification_date TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT,
    
    -- Availability
    is_online BOOLEAN DEFAULT false,
    is_available BOOLEAN DEFAULT true,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Pricing
    base_price DECIMAL(10,2) DEFAULT 0.00 CHECK (base_price >= 0),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Platform Settings
    auto_accept_bookings BOOLEAN DEFAULT false,
    max_daily_readings INTEGER DEFAULT 10,
    min_session_duration INTEGER DEFAULT 15, -- minutes
    max_session_duration INTEGER DEFAULT 120, -- minutes
    
    -- Soft Delete & Multi-tenancy
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES profiles(id),
    tenant_id UUID,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_readers_profile_id ON readers(profile_id);
CREATE INDEX IF NOT EXISTS idx_readers_email ON readers(email);
CREATE INDEX IF NOT EXISTS idx_readers_username ON readers(username);
CREATE INDEX IF NOT EXISTS idx_readers_status ON readers(status);
CREATE INDEX IF NOT EXISTS idx_readers_verified ON readers(verified);
CREATE INDEX IF NOT EXISTS idx_readers_is_online ON readers(is_online);
CREATE INDEX IF NOT EXISTS idx_readers_is_available ON readers(is_available);
CREATE INDEX IF NOT EXISTS idx_readers_rating ON readers(rating);
CREATE INDEX IF NOT EXISTS idx_readers_specialty ON readers(specialty);
CREATE INDEX IF NOT EXISTS idx_readers_tenant_id ON readers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_readers_deleted_at ON readers(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_readers_created_at ON readers(created_at);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_readers_status_available ON readers(status, is_available) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_readers_online_available ON readers(is_online, is_available, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_readers_rating_reviews ON readers(rating DESC, reviews_count DESC) WHERE deleted_at IS NULL;

-- Add RLS (Row Level Security)
ALTER TABLE readers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$ 
BEGIN
    -- Policy for public read access (for client browsing)
    DROP POLICY IF EXISTS "Public readers read access" ON readers;
    CREATE POLICY "Public readers read access" ON readers
        FOR SELECT USING (
            deleted_at IS NULL 
            AND status = 'active' 
            AND verified = true
        );
    
    -- Policy for readers to manage their own data
    DROP POLICY IF EXISTS "Readers can manage own data" ON readers;
    CREATE POLICY "Readers can manage own data" ON readers
        FOR ALL USING (
            profile_id = auth.uid()
            OR id = auth.uid()
        );
    
    -- Policy for admin access
    DROP POLICY IF EXISTS "Admin full access to readers" ON readers;
    CREATE POLICY "Admin full access to readers" ON readers
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid()
                AND r.name IN ('super_admin', 'admin', 'moderator')
            )
        );

    RAISE NOTICE '✅ RLS policies created successfully';
END $$;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_readers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_readers_updated_at ON readers;
CREATE TRIGGER trigger_readers_updated_at
    BEFORE UPDATE ON readers
    FOR EACH ROW
    EXECUTE FUNCTION update_readers_updated_at();

-- Insert some sample data for testing
DO $$
BEGIN
    -- Only insert if table is empty
    IF NOT EXISTS (SELECT 1 FROM readers LIMIT 1) THEN
        INSERT INTO readers (
            full_name, username, email, bio, specialty, specialties, 
            languages, rating, reviews_count, total_readings, 
            status, verified, is_available, base_price
        ) VALUES 
        (
            'Samia Al-Nour', 'samia_tarot', 'samia@samia-tarot.com',
            'Master Tarot Reader with 15+ years of experience in spiritual guidance and cosmic insights.',
            'love_relationships', 
            ARRAY['love_relationships', 'career_guidance', 'spiritual_growth'],
            ARRAY['en', 'ar'],
            4.9, 1247, 2156, 'active', true, true, 25.00
        ),
        (
            'Luna Mystica', 'luna_mystic', 'luna@samia-tarot.com',
            'Intuitive reader specializing in crystal ball readings and dream interpretation.',
            'spiritual_growth',
            ARRAY['spiritual_growth', 'dream_interpretation', 'crystal_healing'],
            ARRAY['en', 'fr'],
            4.7, 892, 1543, 'active', true, true, 20.00
        ),
        (
            'Omar Al-Hakim', 'omar_wisdom', 'omar@samia-tarot.com',
            'Traditional Arabic card reader with deep knowledge of ancient wisdom.',
            'career_guidance',
            ARRAY['career_guidance', 'business_decisions', 'life_path'],
            ARRAY['ar', 'en'],
            4.8, 654, 1089, 'active', true, true, 30.00
        );
        
        RAISE NOTICE '✅ Sample readers data inserted successfully';
    ELSE
        RAISE NOTICE '📄 Readers table already has data, skipping sample insert';
    END IF;
END $$;

-- Verify the table creation
DO $$
DECLARE
    reader_count INTEGER;
    column_count INTEGER;
    index_count INTEGER;
BEGIN
    -- Count readers
    SELECT COUNT(*) INTO reader_count FROM readers;
    
    -- Count columns
    SELECT COUNT(*) INTO column_count 
    FROM information_schema.columns 
    WHERE table_name = 'readers' AND table_schema = 'public';
    
    -- Count indexes
    SELECT COUNT(*) INTO index_count 
    FROM pg_indexes 
    WHERE tablename = 'readers' AND schemaname = 'public';
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 READERS TABLE CREATION COMPLETE!';
    RAISE NOTICE '=====================================';
    RAISE NOTICE '📊 Table: readers';
    RAISE NOTICE '📝 Columns: %', column_count;
    RAISE NOTICE '🔍 Indexes: %', index_count;
    RAISE NOTICE '👥 Sample Records: %', reader_count;
    RAISE NOTICE '🔐 RLS: Enabled with 3 policies';
    RAISE NOTICE '⚡ Triggers: updated_at trigger active';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Main readers table is now ready!';
    RAISE NOTICE '🔗 Ready to link with existing reader_* tables';
    RAISE NOTICE '';
END $$; 