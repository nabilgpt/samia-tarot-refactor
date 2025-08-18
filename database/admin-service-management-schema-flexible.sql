-- ============================================================================
-- ADMIN SERVICE MANAGEMENT SCHEMA (FLEXIBLE VERSION)
-- Complete database schema for VIP/Regular services with reader assignment
-- This version handles existing data gracefully
-- ============================================================================

-- Ensure we have the profiles table for readers
-- This should already exist, but adding for completeness
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(200),
    role VARCHAR(50) NOT NULL DEFAULT 'client',
    is_active BOOLEAN DEFAULT true,
    phone VARCHAR(20),
    country_code VARCHAR(10),
    avatar_url TEXT,
    bio TEXT,
    specializations TEXT[],
    languages TEXT[] DEFAULT ARRAY['en'],
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- First, let's add missing columns to existing services table if they don't exist
-- Add bilingual columns if they don't exist
DO $$
BEGIN
    -- Add name_ar if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'name_ar') THEN
        ALTER TABLE services ADD COLUMN name_ar VARCHAR(255);
    END IF;
    
    -- Add name_en if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'name_en') THEN
        ALTER TABLE services ADD COLUMN name_en VARCHAR(255);
    END IF;
    
    -- Add description_ar if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'description_ar') THEN
        ALTER TABLE services ADD COLUMN description_ar TEXT;
    END IF;
    
    -- Add description_en if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'description_en') THEN
        ALTER TABLE services ADD COLUMN description_en TEXT;
    END IF;
    
    -- Add is_vip if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'is_vip') THEN
        ALTER TABLE services ADD COLUMN is_vip BOOLEAN DEFAULT false;
    END IF;
    
    -- Add reader_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'reader_id') THEN
        ALTER TABLE services ADD COLUMN reader_id UUID;
    END IF;
    
    -- Add duration_minutes if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'duration_minutes') THEN
        ALTER TABLE services ADD COLUMN duration_minutes INTEGER;
    END IF;
    
    -- Add created_by if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'created_by') THEN
        ALTER TABLE services ADD COLUMN created_by UUID;
    END IF;
    
    -- Add updated_by if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'updated_by') THEN
        ALTER TABLE services ADD COLUMN updated_by UUID;
    END IF;
END $$;

-- Update existing data to have default values where needed
UPDATE services SET 
    name_ar = COALESCE(name_ar, name, 'خدمة غير محددة'),
    name_en = COALESCE(name_en, name, 'Unnamed Service'),
    description_ar = COALESCE(description_ar, description, 'وصف غير متوفر'),
    description_en = COALESCE(description_en, description, 'No description available'),
    is_vip = COALESCE(is_vip, false),
    duration_minutes = COALESCE(duration_minutes, 30)
WHERE name_ar IS NULL OR name_en IS NULL OR description_ar IS NULL OR description_en IS NULL;

-- Create a default reader if none exists
INSERT INTO profiles (id, email, first_name, last_name, display_name, role, is_active, specializations, languages)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'default@samia-tarot.com', 'Default', 'Reader', 'Default Reader', 'reader', true, ARRAY['general_reading'], ARRAY['ar', 'en'])
ON CONFLICT (email) DO NOTHING;

-- Assign default reader to services without reader_id
UPDATE services 
SET reader_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE reader_id IS NULL;

-- Now apply constraints gradually

-- Price constraint (only if price exists and is valid)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'price') THEN
        -- Update any invalid prices
        UPDATE services SET price = 10.00 WHERE price IS NULL OR price <= 0;
        -- Add constraint
        ALTER TABLE services DROP CONSTRAINT IF EXISTS services_price_check;
        ALTER TABLE services ADD CONSTRAINT services_price_check CHECK (price > 0);
    END IF;
END $$;

-- Duration constraint
DO $$
BEGIN
    -- Update any invalid durations
    UPDATE services SET duration_minutes = 30 WHERE duration_minutes IS NULL OR duration_minutes <= 0;
    -- Add constraint
    ALTER TABLE services DROP CONSTRAINT IF EXISTS services_duration_check;
    ALTER TABLE services ADD CONSTRAINT services_duration_check CHECK (duration_minutes > 0);
END $$;

-- Service type mapping and constraint
DO $$
BEGIN
    -- First, map existing types to our standard types
    UPDATE services SET type = 'tarot' 
    WHERE type IN ('tarot_reading', 'tarot-reading', 'Tarot', 'TAROT');
    
    UPDATE services SET type = 'coffee' 
    WHERE type IN ('coffee_reading', 'coffee-reading', 'Coffee', 'COFFEE', 'coffee_cup');
    
    UPDATE services SET type = 'dream' 
    WHERE type IN ('dream_interpretation', 'dream-interpretation', 'Dream', 'DREAM');
    
    UPDATE services SET type = 'numerology' 
    WHERE type IN ('numerology_reading', 'numerology-reading', 'Numerology', 'NUMEROLOGY');
    
    UPDATE services SET type = 'astrology' 
    WHERE type IN ('astrology_reading', 'astrology-reading', 'Astrology', 'ASTROLOGY', 'horoscope');
    
    UPDATE services SET type = 'general_reading' 
    WHERE type IN ('general', 'General', 'GENERAL', 'general-reading', 'psychic', 'psychic_reading');
    
    UPDATE services SET type = 'relationship' 
    WHERE type IN ('love', 'Love', 'LOVE', 'relationship_reading', 'relationship-reading');
    
    UPDATE services SET type = 'career' 
    WHERE type IN ('career_reading', 'career-reading', 'Career', 'CAREER', 'work', 'job');
    
    UPDATE services SET type = 'spiritual' 
    WHERE type IN ('spiritual_guidance', 'spiritual-guidance', 'Spiritual', 'SPIRITUAL', 'meditation');
    
    -- Set any remaining unmapped types to general_reading as a fallback
    UPDATE services SET type = 'general_reading' 
    WHERE type IS NULL OR type NOT IN (
        'tarot', 'coffee', 'dream', 'numerology', 'astrology', 
        'general_reading', 'relationship', 'career', 'spiritual'
    );
    
    -- Now add the constraint
    ALTER TABLE services DROP CONSTRAINT IF EXISTS valid_service_type;
    ALTER TABLE services ADD CONSTRAINT valid_service_type 
    CHECK (type IN ('tarot', 'coffee', 'dream', 'numerology', 'astrology', 'general_reading', 'relationship', 'career', 'spiritual'));
END $$;

-- Add foreign key constraints with error handling
DO $$
BEGIN
    -- Reader ID foreign key
    BEGIN
        ALTER TABLE services DROP CONSTRAINT IF EXISTS services_reader_id_fkey;
        ALTER TABLE services ADD CONSTRAINT services_reader_id_fkey 
        FOREIGN KEY (reader_id) REFERENCES profiles(id) ON DELETE RESTRICT;
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'Could not add reader_id foreign key constraint: %', SQLERRM;
    END;
    
    -- Created by foreign key
    BEGIN
        ALTER TABLE services DROP CONSTRAINT IF EXISTS services_created_by_fkey;
        ALTER TABLE services ADD CONSTRAINT services_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES profiles(id);
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'Could not add created_by foreign key constraint: %', SQLERRM;
    END;
    
    -- Updated by foreign key
    BEGIN
        ALTER TABLE services DROP CONSTRAINT IF EXISTS services_updated_by_fkey;
        ALTER TABLE services ADD CONSTRAINT services_updated_by_fkey 
        FOREIGN KEY (updated_by) REFERENCES profiles(id);
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'Could not add updated_by foreign key constraint: %', SQLERRM;
    END;
END $$;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_vip ON services(is_vip);
CREATE INDEX IF NOT EXISTS idx_services_reader ON services(reader_id);
CREATE INDEX IF NOT EXISTS idx_services_type ON services(type);
CREATE INDEX IF NOT EXISTS idx_services_active_vip ON services(is_active, is_vip);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admin can manage all services" ON services;
DROP POLICY IF EXISTS "Readers can view their services" ON services;
DROP POLICY IF EXISTS "Public can view active services" ON services;

-- Policy: Admin and Super Admin can manage all services
CREATE POLICY "Admin can manage all services" ON services
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Policy: Readers can view their own services
CREATE POLICY "Readers can view their services" ON services
    FOR SELECT USING (
        reader_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'monitor')
        )
    );

-- Policy: Public can view active services for booking
CREATE POLICY "Public can view active services" ON services
    FOR SELECT USING (is_active = true);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_service_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger to avoid conflicts
DROP TRIGGER IF EXISTS update_service_updated_at_trigger ON services;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_service_updated_at_trigger
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION update_service_updated_at();

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

DO $$
DECLARE
    service_count INTEGER;
    invalid_services INTEGER;
BEGIN
    SELECT COUNT(*) INTO service_count FROM services;
    
    SELECT COUNT(*) INTO invalid_services FROM services 
    WHERE type NOT IN ('tarot', 'coffee', 'dream', 'numerology', 'astrology', 'general_reading', 'relationship', 'career', 'spiritual')
       OR price IS NULL OR price <= 0
       OR duration_minutes IS NULL OR duration_minutes <= 0
       OR name_ar IS NULL OR name_en IS NULL;
    
    RAISE NOTICE 'Total services: %, Invalid services: %', service_count, invalid_services;
    
    IF invalid_services = 0 THEN
        RAISE NOTICE 'All services are now valid and conform to the new schema!';
    ELSE
        RAISE NOTICE 'Warning: Still have % invalid services that need manual review', invalid_services;
    END IF;
END $$; 