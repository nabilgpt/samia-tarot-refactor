-- Phase 3: Call & Video System with Emergency Logic (Fixed Version)
-- SAMIA TAROT Platform Database Schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CALL SESSIONS TABLE (Updated)
-- =============================================
CREATE TABLE IF NOT EXISTS call_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  -- Use client_id instead of user_id
    reader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    room_id VARCHAR(255) NOT NULL UNIQUE,
    call_type VARCHAR(20) NOT NULL CHECK (call_type IN ('voice', 'video')),
    is_emergency BOOLEAN DEFAULT FALSE,
    scheduled_duration INTEGER, -- in minutes
    actual_duration INTEGER, -- in minutes
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ringing', 'active', 'ended', 'failed', 'escalated')),
    connection_quality JSONB, -- Store connection metrics
    metadata JSONB, -- Additional call metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- CALL RECORDINGS TABLE (Updated)
-- =============================================
CREATE TABLE IF NOT EXISTS call_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
    recording_url TEXT NOT NULL,
    recording_type VARCHAR(20) NOT NULL CHECK (recording_type IN ('audio', 'video', 'screen')),
    file_size BIGINT,
    duration INTEGER, -- in seconds
    quality VARCHAR(20) DEFAULT 'standard',
    created_by UUID REFERENCES profiles(id),
    is_processed BOOLEAN DEFAULT FALSE,
    storage_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- EMERGENCY CALL LOGS TABLE (Updated)
-- =============================================
CREATE TABLE IF NOT EXISTS emergency_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES profiles(id) NOT NULL,  -- Use client_id instead of user_id
    reader_id UUID REFERENCES profiles(id),
    call_session_id UUID REFERENCES call_sessions(id),
    timestamp TIMESTAMPTZ DEFAULT now(),
    emergency_type TEXT NOT NULL DEFAULT 'general',
    priority_level INTEGER DEFAULT 3 CHECK (priority_level BETWEEN 1 AND 5),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'escalated', 'resolved', 'cancelled')),
    response_time INTEGER, -- in seconds
    answered BOOLEAN DEFAULT false,
    escalated_to UUID REFERENCES profiles(id),
    escalation_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- CALL PARTICIPANTS TABLE (Updated)
-- =============================================
CREATE TABLE IF NOT EXISTS call_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  -- Use participant_id instead of user_id
    role VARCHAR(20) NOT NULL CHECK (role IN ('client', 'reader', 'admin', 'monitor')),
    join_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    leave_time TIMESTAMP WITH TIME ZONE,
    is_silent BOOLEAN DEFAULT FALSE, -- For admin/monitor stealth mode
    connection_status VARCHAR(20) DEFAULT 'connecting',
    audio_enabled BOOLEAN DEFAULT TRUE,
    video_enabled BOOLEAN DEFAULT FALSE,
    screen_sharing BOOLEAN DEFAULT FALSE
);

-- =============================================
-- CALL ESCALATIONS TABLE (Updated)
-- =============================================
CREATE TABLE IF NOT EXISTS call_escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_session_id UUID REFERENCES call_sessions(id) NOT NULL,
    emergency_call_log_id UUID REFERENCES emergency_call_logs(id),
    escalated_from UUID REFERENCES profiles(id) NOT NULL,
    escalated_to UUID REFERENCES profiles(id),
    escalation_reason TEXT NOT NULL,
    escalation_type TEXT DEFAULT 'manual' CHECK (escalation_type IN ('manual', 'auto', 'timeout', 'no_answer')),
    auto_escalation BOOLEAN DEFAULT false,
    escalation_time TIMESTAMPTZ DEFAULT now(),
    resolution_time TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'resolved', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- CALL QUALITY METRICS TABLE (Updated)
-- =============================================
CREATE TABLE IF NOT EXISTS call_quality_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES profiles(id),  -- Use participant_id instead of user_id
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    audio_quality INTEGER CHECK (audio_quality BETWEEN 1 AND 5),
    video_quality INTEGER CHECK (video_quality BETWEEN 1 AND 5),
    connection_strength INTEGER CHECK (connection_strength BETWEEN 1 AND 5),
    latency INTEGER, -- in milliseconds
    packet_loss DECIMAL(5,2), -- percentage
    bandwidth_usage INTEGER, -- in kbps
    device_info JSONB,
    network_info JSONB
);

-- =============================================
-- READER AVAILABILITY TABLE (Updated)
-- =============================================
CREATE TABLE IF NOT EXISTS reader_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_available BOOLEAN DEFAULT TRUE,
    is_on_call BOOLEAN DEFAULT FALSE,
    emergency_available BOOLEAN DEFAULT TRUE,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status_message TEXT,
    auto_accept_emergency BOOLEAN DEFAULT FALSE,
    max_concurrent_calls INTEGER DEFAULT 1,
    current_call_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- CALL NOTIFICATIONS TABLE (Updated)
-- =============================================
CREATE TABLE IF NOT EXISTS call_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    notification_type VARCHAR(30) NOT NULL CHECK (notification_type IN ('incoming_call', 'emergency_call', 'call_ended', 'escalation', 'recording_ready')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_emergency BOOLEAN DEFAULT FALSE,
    is_read BOOLEAN DEFAULT FALSE,
    is_siren BOOLEAN DEFAULT FALSE, -- For emergency siren notifications
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_call_sessions_client_id ON call_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_reader_id ON call_sessions(reader_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_booking_id ON call_sessions(booking_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_status ON call_sessions(status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_is_emergency ON call_sessions(is_emergency);
CREATE INDEX IF NOT EXISTS idx_call_sessions_created_at ON call_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_emergency_call_logs_client_id ON emergency_call_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_emergency_call_logs_reader_id ON emergency_call_logs(reader_id);
CREATE INDEX IF NOT EXISTS idx_emergency_call_logs_status ON emergency_call_logs(status);
CREATE INDEX IF NOT EXISTS idx_emergency_call_logs_timestamp ON emergency_call_logs(timestamp);

CREATE INDEX IF NOT EXISTS idx_call_participants_call_session_id ON call_participants(call_session_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_participant_id ON call_participants(participant_id);

CREATE INDEX IF NOT EXISTS idx_reader_availability_reader_id ON reader_availability(reader_id);
CREATE INDEX IF NOT EXISTS idx_reader_availability_is_available ON reader_availability(is_available);
CREATE INDEX IF NOT EXISTS idx_reader_availability_emergency_available ON reader_availability(emergency_available);

CREATE INDEX IF NOT EXISTS idx_call_notifications_recipient_id ON call_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_call_notifications_is_read ON call_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_call_notifications_is_emergency ON call_notifications(is_emergency);

-- =============================================
-- FUNCTIONS AND TRIGGERS (Updated)
-- =============================================

-- Function to update call session duration
CREATE OR REPLACE FUNCTION update_call_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
        NEW.actual_duration = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for call duration calculation
DROP TRIGGER IF EXISTS trigger_update_call_duration ON call_sessions;
CREATE TRIGGER trigger_update_call_duration
    BEFORE UPDATE ON call_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_call_duration();

-- Function to auto-escalate emergency calls
CREATE OR REPLACE FUNCTION auto_escalate_emergency()
RETURNS void AS $$
DECLARE
    emergency_call RECORD;
    available_reader UUID;
BEGIN
    -- Find unanswered emergency calls older than 30 seconds
    FOR emergency_call IN 
        SELECT ecl.*, cs.id as call_id
        FROM emergency_call_logs ecl
        LEFT JOIN call_sessions cs ON cs.id = ecl.call_session_id
        WHERE ecl.status = 'pending' 
        AND ecl.timestamp < NOW() - INTERVAL '30 seconds'
        AND NOT ecl.escalated
    LOOP
        -- Find next available emergency reader
        SELECT ra.reader_id INTO available_reader
        FROM reader_availability ra
        JOIN profiles p ON p.id = ra.reader_id
        WHERE ra.emergency_available = true
        AND ra.is_available = true
        AND ra.current_call_count < ra.max_concurrent_calls
        AND p.role = 'reader'
        AND ra.reader_id != emergency_call.reader_id -- Don't assign to same reader
        ORDER BY ra.last_seen DESC
        LIMIT 1;
        
        IF available_reader IS NOT NULL THEN
            -- Create escalation record
            INSERT INTO call_escalations (
                call_session_id,
                emergency_call_log_id,
                escalated_from,
                escalated_to,
                escalation_reason,
                escalation_type
            ) VALUES (
                emergency_call.call_id,
                emergency_call.id,
                emergency_call.reader_id,
                available_reader,
                'Auto-escalation: No response within 30 seconds',
                'auto'
            );
            
            -- Update emergency call log
            UPDATE emergency_call_logs 
            SET 
                status = 'escalated',
                escalated_to = available_reader,
                escalation_reason = 'Auto-escalation: No response within 30 seconds',
                updated_at = NOW()
            WHERE id = emergency_call.id;
            
            -- Send notification to new reader
            INSERT INTO call_notifications (
                call_session_id,
                recipient_id,
                notification_type,
                title,
                message,
                is_emergency,
                is_siren
            ) VALUES (
                emergency_call.call_id,
                available_reader,
                'emergency_call',
                'EMERGENCY CALL - ESCALATED',
                'An emergency call has been escalated to you. Please respond immediately.',
                true,
                true
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update reader availability
CREATE OR REPLACE FUNCTION update_reader_availability()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' AND OLD.status != 'active' THEN
        -- Reader joined call
        UPDATE reader_availability 
        SET 
            is_on_call = true,
            current_call_count = current_call_count + 1,
            updated_at = NOW()
        WHERE reader_id = NEW.reader_id;
    ELSIF NEW.status = 'ended' AND OLD.status = 'active' THEN
        -- Reader left call
        UPDATE reader_availability 
        SET 
            is_on_call = CASE 
                WHEN current_call_count <= 1 THEN false 
                ELSE true 
            END,
            current_call_count = GREATEST(current_call_count - 1, 0),
            updated_at = NOW()
        WHERE reader_id = NEW.reader_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER trigger_update_reader_availability
    AFTER UPDATE ON call_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_reader_availability();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on tables
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own calls" ON call_sessions
    FOR ALL USING (auth.uid() = client_id OR auth.uid() = reader_id);

CREATE POLICY "Users can view own recordings" ON call_recordings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM call_sessions 
            WHERE id = call_session_id 
            AND (client_id = auth.uid() OR reader_id = auth.uid())
        )
    );

CREATE POLICY "Users can view own emergency logs" ON emergency_call_logs
    FOR ALL USING (auth.uid() = client_id OR auth.uid() = reader_id);

CREATE POLICY "Users can view own call participants" ON call_participants
    FOR ALL USING (auth.uid() = participant_id);

CREATE POLICY "Readers can view own availability" ON reader_availability
    FOR ALL USING (auth.uid() = reader_id);

CREATE POLICY "Users can view own notifications" ON call_notifications
    FOR ALL USING (auth.uid() = recipient_id);

-- Admin policies
CREATE POLICY "Admins can view all call data" ON call_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- =============================================
-- HELPER FUNCTIONS (Updated)
-- =============================================

-- Function to get available emergency readers
CREATE OR REPLACE FUNCTION get_available_emergency_readers()
RETURNS TABLE (
    reader_id UUID,
    reader_name TEXT,
    last_seen TIMESTAMP WITH TIME ZONE,
    current_calls INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ra.reader_id,
        CONCAT(p.first_name, ' ', p.last_name) as reader_name,
        ra.last_seen,
        ra.current_call_count
    FROM reader_availability ra
    JOIN profiles p ON p.id = ra.reader_id
    WHERE ra.emergency_available = true
    AND ra.is_available = true
    AND ra.current_call_count < ra.max_concurrent_calls
    AND p.role = 'reader'
    ORDER BY ra.current_call_count ASC, ra.last_seen DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to create emergency call
CREATE OR REPLACE FUNCTION create_emergency_call(
    p_client_id UUID,
    p_emergency_type TEXT DEFAULT 'general',
    p_priority_level INTEGER DEFAULT 3
)
RETURNS UUID AS $$
DECLARE
    emergency_log_id UUID;
    available_reader UUID;
    call_session_id UUID;
BEGIN
    -- Find available emergency reader
    SELECT reader_id INTO available_reader
    FROM get_available_emergency_readers()
    LIMIT 1;
    
    IF available_reader IS NULL THEN
        RAISE EXCEPTION 'No emergency readers available';
    END IF;
    
    -- Create call session
    INSERT INTO call_sessions (
        client_id,
        reader_id,
        room_id,
        call_type,
        is_emergency,
        status
    ) VALUES (
        p_client_id,
        available_reader,
        'emergency_' || gen_random_uuid()::text,
        'voice',
        true,
        'pending'
    ) RETURNING id INTO call_session_id;
    
    -- Create emergency log
    INSERT INTO emergency_call_logs (
        client_id,
        reader_id,
        call_session_id,
        emergency_type,
        priority_level
    ) VALUES (
        p_client_id,
        available_reader,
        call_session_id,
        p_emergency_type,
        p_priority_level
    ) RETURNING id INTO emergency_log_id;
    
    -- Send notification to reader
    INSERT INTO call_notifications (
        call_session_id,
        recipient_id,
        notification_type,
        title,
        message,
        is_emergency,
        is_siren
    ) VALUES (
        call_session_id,
        available_reader,
        'emergency_call',
        'EMERGENCY CALL',
        'You have an incoming emergency call. Please respond immediately.',
        true,
        true
    );
    
    RETURN emergency_log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to end call session
CREATE OR REPLACE FUNCTION end_call_session(p_call_session_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE call_sessions 
    SET 
        status = 'ended',
        end_time = NOW(),
        updated_at = NOW()
    WHERE id = p_call_session_id;
    
    -- Update any related emergency logs
    UPDATE emergency_call_logs 
    SET 
        status = 'resolved',
        updated_at = NOW()
    WHERE call_session_id = p_call_session_id
    AND status IN ('pending', 'answered', 'escalated');
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- NOTIFICATION: COMPLETION STATUS
-- =============================================

-- Insert completion notification
DO $$
BEGIN
    RAISE NOTICE '✅ CALL & VIDEO SYSTEM TABLES CREATED SUCCESSFULLY!';
    RAISE NOTICE '📊 CREATED TABLES:';
    RAISE NOTICE '   ✅ call_sessions (updated structure)';
    RAISE NOTICE '   ✅ call_recordings';
    RAISE NOTICE '   ✅ emergency_call_logs (updated structure)';
    RAISE NOTICE '   ✅ call_participants (updated structure)';
    RAISE NOTICE '   ✅ call_escalations';
    RAISE NOTICE '   ✅ call_quality_metrics (updated structure)';
    RAISE NOTICE '   ✅ reader_availability';
    RAISE NOTICE '   ✅ call_notifications';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 CALL SYSTEM READY FOR USE!';
    RAISE NOTICE '⚠️  Note: Uses client_id/participant_id instead of user_id';
END $$; 