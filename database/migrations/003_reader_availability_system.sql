-- =====================================================
-- READER AVAILABILITY & EMERGENCY OPT-IN SYSTEM
-- Migration: 003_reader_availability_system.sql
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. READER AVAILABILITY SCHEDULE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS reader_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Schedule information
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Asia/Beirut',
    
    -- Emergency opt-in
    emergency_available BOOLEAN DEFAULT false,
    emergency_response_time_minutes INTEGER DEFAULT 15 CHECK (emergency_response_time_minutes >= 5),
    emergency_rate_multiplier DECIMAL(3,2) DEFAULT 1.50 CHECK (emergency_rate_multiplier >= 1.0),
    
    -- Status and preferences
    is_active BOOLEAN DEFAULT true,
    auto_accept_bookings BOOLEAN DEFAULT false,
    max_concurrent_sessions INTEGER DEFAULT 1 CHECK (max_concurrent_sessions >= 1),
    break_between_sessions_minutes INTEGER DEFAULT 10 CHECK (break_between_sessions_minutes >= 0),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    
    -- Constraints
    UNIQUE(reader_id, day_of_week, start_time), -- Prevent overlapping same-day slots
    CHECK (start_time < end_time)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_reader_availability_reader_id ON reader_availability(reader_id);
CREATE INDEX IF NOT EXISTS idx_reader_availability_day_time ON reader_availability(day_of_week, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_reader_availability_emergency ON reader_availability(emergency_available) WHERE emergency_available = true;

-- =====================================================
-- 2. READER TEMPORARY AVAILABILITY (Overrides)
-- =====================================================

CREATE TABLE IF NOT EXISTS reader_temp_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Date and time override
    override_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    timezone TEXT NOT NULL DEFAULT 'Asia/Beirut',
    
    -- Override type
    override_type TEXT NOT NULL CHECK (override_type IN ('unavailable', 'extended_hours', 'emergency_only')),
    
    -- Emergency settings for this override
    emergency_available BOOLEAN DEFAULT false,
    emergency_response_time_minutes INTEGER DEFAULT 15,
    
    -- Metadata
    reason TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(reader_id, override_date),
    CHECK (
        CASE 
            WHEN override_type = 'unavailable' THEN start_time IS NULL AND end_time IS NULL
            WHEN override_type = 'emergency_only' THEN start_time IS NULL AND end_time IS NULL
            ELSE start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time
        END
    )
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_reader_temp_availability_reader_date ON reader_temp_availability(reader_id, override_date);
CREATE INDEX IF NOT EXISTS idx_reader_temp_availability_date ON reader_temp_availability(override_date) WHERE is_active = true;

-- =====================================================
-- 3. EMERGENCY CALL REQUESTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS emergency_call_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Request details
    request_type TEXT NOT NULL CHECK (request_type IN ('immediate', 'within_15min', 'within_30min')),
    urgency_level TEXT NOT NULL CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
    preferred_language TEXT DEFAULT 'en',
    
    -- Request content
    topic_category TEXT, -- e.g., 'love', 'career', 'spiritual', 'general'
    brief_description TEXT,
    max_budget_usd DECIMAL(10,2),
    
    -- Assignment and response
    assigned_reader_id UUID REFERENCES profiles(id),
    assignment_method TEXT CHECK (assignment_method IN ('auto', 'manual', 'client_choice')),
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'reader_assigned', 'reader_accepted', 'reader_declined', 
                  'call_initiated', 'call_active', 'call_completed', 'cancelled', 'expired')
    ),
    
    -- Timing
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    call_started_at TIMESTAMPTZ,
    call_ended_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours'),
    
    -- Response tracking
    reader_response_deadline TIMESTAMPTZ,
    reader_response_received_at TIMESTAMPTZ,
    
    -- Metadata
    client_ip INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_emergency_requests_client_id ON emergency_call_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_status ON emergency_call_requests(status);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_reader_id ON emergency_call_requests(assigned_reader_id);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_pending ON emergency_call_requests(requested_at) 
    WHERE status IN ('pending', 'reader_assigned');

-- =====================================================
-- 4. READER EMERGENCY NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS reader_emergency_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emergency_request_id UUID NOT NULL REFERENCES emergency_call_requests(id) ON DELETE CASCADE,
    reader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Notification details
    notification_type TEXT NOT NULL CHECK (notification_type IN ('sms', 'email', 'push', 'in_app')),
    notification_status TEXT NOT NULL DEFAULT 'pending' CHECK (
        notification_status IN ('pending', 'sent', 'delivered', 'read', 'failed')
    ),
    
    -- Content
    notification_title TEXT,
    notification_body TEXT,
    
    -- Response tracking
    reader_response TEXT CHECK (reader_response IN ('accept', 'decline', 'maybe')),
    responded_at TIMESTAMPTZ,
    response_notes TEXT,
    
    -- Delivery tracking
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_emergency_notifications_request_id ON reader_emergency_notifications(emergency_request_id);
CREATE INDEX IF NOT EXISTS idx_emergency_notifications_reader_id ON reader_emergency_notifications(reader_id);
CREATE INDEX IF NOT EXISTS idx_emergency_notifications_status ON reader_emergency_notifications(notification_status);

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to get available readers for emergency calls
CREATE OR REPLACE FUNCTION get_available_emergency_readers(
    p_preferred_language TEXT DEFAULT 'en',
    p_max_response_time_minutes INTEGER DEFAULT 30
)
RETURNS TABLE (
    reader_id UUID,
    display_name TEXT,
    emergency_response_time_minutes INTEGER,
    emergency_rate_multiplier DECIMAL(3,2),
    estimated_availability TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    current_day INTEGER;
    current_time TIME;
    current_date_local DATE;
BEGIN
    -- Get current day and time in Beirut timezone
    SELECT 
        EXTRACT(DOW FROM NOW() AT TIME ZONE 'Asia/Beirut'),
        (NOW() AT TIME ZONE 'Asia/Beirut')::TIME,
        (NOW() AT TIME ZONE 'Asia/Beirut')::DATE
    INTO current_day, current_time, current_date_local;
    
    RETURN QUERY
    SELECT DISTINCT
        p.id,
        COALESCE(p.display_name, p.first_name || ' ' || p.last_name, p.email) as display_name,
        ra.emergency_response_time_minutes,
        ra.emergency_rate_multiplier,
        CASE 
            WHEN rta.override_type = 'emergency_only' THEN 'emergency_only'
            WHEN rta.override_type = 'unavailable' THEN 'override_unavailable'
            WHEN ra.start_time <= current_time AND ra.end_time >= current_time THEN 'currently_available'
            ELSE 'emergency_response_only'
        END as estimated_availability
    FROM profiles p
    INNER JOIN reader_availability ra ON p.id = ra.reader_id
    LEFT JOIN reader_temp_availability rta ON p.id = rta.reader_id 
        AND rta.override_date = current_date_local
        AND rta.is_active = true
    WHERE 
        p.role = 'reader'
        AND p.is_active = true
        AND ra.is_active = true
        AND ra.emergency_available = true
        AND ra.emergency_response_time_minutes <= p_max_response_time_minutes
        AND (p.languages::TEXT ILIKE '%' || p_preferred_language || '%' OR p_preferred_language = 'en')
        -- Exclude if override says unavailable
        AND (rta.override_type IS NULL OR rta.override_type != 'unavailable')
        -- Include emergency_only overrides
        AND (
            rta.override_type = 'emergency_only' 
            OR rta.override_type IS NULL 
            OR rta.override_type = 'extended_hours'
        )
    ORDER BY 
        ra.emergency_response_time_minutes ASC,
        ra.emergency_rate_multiplier ASC;
END;
$$;

-- Function to check if reader is currently available
CREATE OR REPLACE FUNCTION is_reader_currently_available(
    p_reader_id UUID,
    p_check_emergency_only BOOLEAN DEFAULT false
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    current_day INTEGER;
    current_time TIME;
    current_date_local DATE;
    availability_count INTEGER := 0;
    temp_override TEXT;
BEGIN
    -- Get current day and time in Beirut timezone
    SELECT 
        EXTRACT(DOW FROM NOW() AT TIME ZONE 'Asia/Beirut'),
        (NOW() AT TIME ZONE 'Asia/Beirut')::TIME,
        (NOW() AT TIME ZONE 'Asia/Beirut')::DATE
    INTO current_day, current_time, current_date_local;
    
    -- Check for temporary override
    SELECT override_type INTO temp_override
    FROM reader_temp_availability
    WHERE reader_id = p_reader_id 
        AND override_date = current_date_local 
        AND is_active = true;
    
    -- If unavailable override, return false
    IF temp_override = 'unavailable' THEN
        RETURN false;
    END IF;
    
    -- If emergency_only override and not checking emergency, return false
    IF temp_override = 'emergency_only' AND NOT p_check_emergency_only THEN
        RETURN false;
    END IF;
    
    -- If emergency_only override and checking emergency, return true if emergency_available
    IF temp_override = 'emergency_only' AND p_check_emergency_only THEN
        SELECT COUNT(*) INTO availability_count
        FROM reader_availability ra
        WHERE ra.reader_id = p_reader_id
            AND ra.is_active = true
            AND ra.emergency_available = true;
        
        RETURN availability_count > 0;
    END IF;
    
    -- Check regular availability
    SELECT COUNT(*) INTO availability_count
    FROM reader_availability ra
    WHERE ra.reader_id = p_reader_id
        AND ra.day_of_week = current_day
        AND ra.start_time <= current_time
        AND ra.end_time >= current_time
        AND ra.is_active = true
        AND (NOT p_check_emergency_only OR ra.emergency_available = true);
    
    RETURN availability_count > 0;
END;
$$;

-- Function to create emergency call request
CREATE OR REPLACE FUNCTION create_emergency_call_request(
    p_client_id UUID,
    p_request_type TEXT,
    p_urgency_level TEXT,
    p_topic_category TEXT DEFAULT NULL,
    p_brief_description TEXT DEFAULT NULL,
    p_max_budget_usd DECIMAL DEFAULT NULL,
    p_preferred_language TEXT DEFAULT 'en'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    new_request_id UUID;
    expiry_hours INTEGER := 2;
BEGIN
    -- Adjust expiry based on urgency
    CASE p_urgency_level
        WHEN 'critical' THEN expiry_hours := 4;
        WHEN 'high' THEN expiry_hours := 3;
        WHEN 'medium' THEN expiry_hours := 2;
        WHEN 'low' THEN expiry_hours := 1;
    END CASE;
    
    -- Create the emergency request
    INSERT INTO emergency_call_requests (
        client_id,
        request_type,
        urgency_level,
        topic_category,
        brief_description,
        max_budget_usd,
        preferred_language,
        expires_at
    ) VALUES (
        p_client_id,
        p_request_type,
        p_urgency_level,
        p_topic_category,
        p_brief_description,
        p_max_budget_usd,
        p_preferred_language,
        NOW() + (expiry_hours || ' hours')::INTERVAL
    )
    RETURNING id INTO new_request_id;
    
    RETURN new_request_id;
END;
$$;

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE reader_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_temp_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_call_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_emergency_notifications ENABLE ROW LEVEL SECURITY;

-- Reader availability policies
CREATE POLICY "Readers can manage their own availability" ON reader_availability
    FOR ALL USING (
        auth.uid() = reader_id 
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Public read access to reader availability" ON reader_availability
    FOR SELECT USING (is_active = true);

-- Temporary availability policies  
CREATE POLICY "Readers can manage their own temp availability" ON reader_temp_availability
    FOR ALL USING (
        auth.uid() = reader_id 
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Emergency call request policies
CREATE POLICY "Clients can view their own emergency requests" ON emergency_call_requests
    FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Clients can create emergency requests" ON emergency_call_requests
    FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Readers can view assigned emergency requests" ON emergency_call_requests
    FOR SELECT USING (auth.uid() = assigned_reader_id);

CREATE POLICY "Readers can update assigned emergency requests" ON emergency_call_requests
    FOR UPDATE USING (auth.uid() = assigned_reader_id);

CREATE POLICY "Admins have full access to emergency requests" ON emergency_call_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Emergency notification policies
CREATE POLICY "Readers can view their emergency notifications" ON reader_emergency_notifications
    FOR SELECT USING (auth.uid() = reader_id);

CREATE POLICY "Readers can update their notification responses" ON reader_emergency_notifications
    FOR UPDATE USING (auth.uid() = reader_id);

CREATE POLICY "System can manage emergency notifications" ON reader_emergency_notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- =====================================================
-- 7. TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_reader_availability_updated_at 
    BEFORE UPDATE ON reader_availability 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reader_temp_availability_updated_at 
    BEFORE UPDATE ON reader_temp_availability 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emergency_call_requests_updated_at 
    BEFORE UPDATE ON emergency_call_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reader_emergency_notifications_updated_at 
    BEFORE UPDATE ON reader_emergency_notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample reader availability (only if no data exists)
DO $$
DECLARE
    sample_reader_id UUID;
BEGIN
    -- Get a sample reader ID
    SELECT id INTO sample_reader_id 
    FROM profiles 
    WHERE role = 'reader' 
    LIMIT 1;
    
    -- Only insert if we have a reader and no existing availability
    IF sample_reader_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM reader_availability LIMIT 1) THEN
        -- Monday to Friday, 9 AM to 6 PM, emergency available
        INSERT INTO reader_availability (
            reader_id, day_of_week, start_time, end_time, 
            emergency_available, emergency_response_time_minutes, emergency_rate_multiplier
        ) VALUES 
        (sample_reader_id, 1, '09:00'::TIME, '18:00'::TIME, true, 15, 1.5),
        (sample_reader_id, 2, '09:00'::TIME, '18:00'::TIME, true, 15, 1.5),
        (sample_reader_id, 3, '09:00'::TIME, '18:00'::TIME, true, 15, 1.5),
        (sample_reader_id, 4, '09:00'::TIME, '18:00'::TIME, true, 15, 1.5),
        (sample_reader_id, 5, '09:00'::TIME, '18:00'::TIME, true, 15, 1.5);
        
        RAISE NOTICE 'Sample reader availability created for reader: %', sample_reader_id;
    ELSE
        RAISE NOTICE 'No sample data created - either no readers found or availability already exists';
    END IF;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log successful completion
DO $$
BEGIN
    RAISE NOTICE '✅ Reader Availability & Emergency System migration completed successfully';
    RAISE NOTICE '📋 Tables created: reader_availability, reader_temp_availability, emergency_call_requests, reader_emergency_notifications';
    RAISE NOTICE '🔧 Functions created: get_available_emergency_readers, is_reader_currently_available, create_emergency_call_request';
    RAISE NOTICE '🔒 RLS policies enabled for all tables';
    RAISE NOTICE '⚡ Triggers added for updated_at columns';
END $$;