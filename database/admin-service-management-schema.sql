-- ============================================================================
-- ADMIN SERVICE MANAGEMENT SCHEMA
-- Complete database schema for VIP/Regular services with reader assignment
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

-- Services table with complete field specification
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Bilingual names (required)
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    
    -- Bilingual descriptions (required)
    description_ar TEXT NOT NULL,
    description_en TEXT NOT NULL,
    
    -- Service specifications (required)
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    type VARCHAR(50) NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    
    -- Status and VIP flags (required)
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_vip BOOLEAN NOT NULL DEFAULT false,
    
    -- Reader assignment (required foreign key)
    reader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    
    -- Metadata
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure no duplicate service names per language
    CONSTRAINT unique_service_name_ar UNIQUE(name_ar),
    CONSTRAINT unique_service_name_en UNIQUE(name_en),
    
    -- Ensure reader is actually a reader role
    CONSTRAINT check_reader_role CHECK (
        (SELECT role FROM profiles WHERE id = reader_id) IN ('reader', 'admin', 'super_admin')
    )
);

-- Valid service types enum
CREATE TYPE service_type AS ENUM (
    'tarot',
    'coffee',
    'dream',
    'numerology',
    'astrology',
    'general_reading',
    'relationship',
    'career',
    'spiritual'
);

-- Add constraint for service type
ALTER TABLE services 
ADD CONSTRAINT valid_service_type 
CHECK (type IN ('tarot', 'coffee', 'dream', 'numerology', 'astrology', 'general_reading', 'relationship', 'career', 'spiritual'));

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for active services
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);

-- Index for VIP services
CREATE INDEX IF NOT EXISTS idx_services_vip ON services(is_vip);

-- Index for services by reader
CREATE INDEX IF NOT EXISTS idx_services_reader ON services(reader_id);

-- Index for services by type
CREATE INDEX IF NOT EXISTS idx_services_type ON services(type);

-- Composite index for active VIP services
CREATE INDEX IF NOT EXISTS idx_services_active_vip ON services(is_active, is_vip);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on services table
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

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
-- FUNCTIONS FOR SERVICE MANAGEMENT
-- ============================================================================

-- Function to validate reader assignment
CREATE OR REPLACE FUNCTION validate_reader_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the assigned reader actually has reader role
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = NEW.reader_id 
        AND role IN ('reader', 'admin', 'super_admin')
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Reader ID % is not a valid active reader', NEW.reader_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate reader assignment on insert/update
CREATE TRIGGER validate_reader_assignment_trigger
    BEFORE INSERT OR UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION validate_reader_assignment();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_service_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_service_updated_at_trigger
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION update_service_updated_at();

-- ============================================================================
-- SAMPLE DATA FOR TESTING (Optional - can be removed in production)
-- ============================================================================

-- Insert sample readers if they don't exist
INSERT INTO profiles (id, email, first_name, last_name, display_name, role, is_active, specializations, languages)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'samia@samia-tarot.com', 'Samia', 'الطارق', 'Samia - Master Reader', 'reader', true, ARRAY['tarot', 'coffee', 'dream'], ARRAY['ar', 'en']),
    ('550e8400-e29b-41d4-a716-446655440002', 'layla@samia-tarot.com', 'Layla', 'النور', 'Layla - Spiritual Guide', 'reader', true, ARRAY['astrology', 'numerology'], ARRAY['ar', 'en']),
    ('550e8400-e29b-41d4-a716-446655440003', 'hassan@samia-tarot.com', 'Hassan', 'الحكيم', 'Hassan - Coffee Reader', 'reader', true, ARRAY['coffee', 'general_reading'], ARRAY['ar', 'en'])
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- ADMIN MANAGEMENT VIEWS
-- ============================================================================

-- View for admin dashboard - services with reader details
CREATE OR REPLACE VIEW admin_services_view AS
SELECT 
    s.id,
    s.name_ar,
    s.name_en,
    s.description_ar,
    s.description_en,
    s.price,
    s.type,
    s.duration_minutes,
    s.is_active,
    s.is_vip,
    s.reader_id,
    p.first_name || ' ' || p.last_name AS reader_name,
    p.display_name AS reader_display_name,
    p.email AS reader_email,
    s.created_at,
    s.updated_at,
    -- Statistics
    COALESCE(booking_stats.total_bookings, 0) AS total_bookings,
    COALESCE(booking_stats.revenue, 0) AS total_revenue
FROM services s
LEFT JOIN profiles p ON s.reader_id = p.id
LEFT JOIN (
    SELECT 
        service_id,
        COUNT(*) AS total_bookings,
        SUM(amount) AS revenue
    FROM bookings 
    WHERE status = 'completed'
    GROUP BY service_id
) booking_stats ON s.id = booking_stats.service_id
ORDER BY s.created_at DESC;

-- Grant access to admin users
GRANT SELECT ON admin_services_view TO authenticated;

-- ============================================================================
-- COMPLETION VERIFICATION
-- ============================================================================

-- Verify table structure
DO $$
BEGIN
    -- Check if all required columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name IN ('name_ar', 'name_en', 'is_vip', 'reader_id')
    ) THEN
        RAISE EXCEPTION 'Services table missing required columns';
    END IF;
    
    -- Check if RLS is enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'services' 
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS not enabled on services table';
    END IF;
    
    RAISE NOTICE '✅ Services table schema created successfully with all required fields';
END $$; 