-- Phase 3: Call & Video System with Emergency Logic
-- SAMIA TAROT Platform Database Schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CALL SESSIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS call_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
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
-- CALL RECORDINGS TABLE
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
-- EMERGENCY CALL LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS emergency_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) NOT NULL,
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
-- CALL PARTICIPANTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS call_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
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
-- CALL ESCALATIONS TABLE
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
-- CALL QUALITY METRICS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS call_quality_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id),
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
-- READER AVAILABILITY TABLE
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
-- CALL NOTIFICATIONS TABLE
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
CREATE INDEX IF NOT EXISTS idx_call_sessions_user_id ON call_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_reader_id ON call_sessions(reader_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_booking_id ON call_sessions(booking_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_status ON call_sessions(status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_is_emergency ON call_sessions(is_emergency);
CREATE INDEX IF NOT EXISTS idx_call_sessions_created_at ON call_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_emergency_call_logs_user_id ON emergency_call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_call_logs_reader_id ON emergency_call_logs(reader_id);
CREATE INDEX IF NOT EXISTS idx_emergency_call_logs_status ON emergency_call_logs(status);
CREATE INDEX IF NOT EXISTS idx_emergency_call_logs_timestamp ON emergency_call_logs(timestamp);

CREATE INDEX IF NOT EXISTS idx_call_participants_call_session_id ON call_participants(call_session_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_user_id ON call_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_reader_availability_reader_id ON reader_availability(reader_id);
CREATE INDEX IF NOT EXISTS idx_reader_availability_is_available ON reader_availability(is_available);
CREATE INDEX IF NOT EXISTS idx_reader_availability_emergency_available ON reader_availability(emergency_available);

CREATE INDEX IF NOT EXISTS idx_call_notifications_recipient_id ON call_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_call_notifications_is_read ON call_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_call_notifications_is_emergency ON call_notifications(is_emergency);

-- =============================================
-- FUNCTIONS AND TRIGGERS
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
BEGIN
    -- Only process emergency calls that are still ringing after 300 seconds (5 minutes)
    INSERT INTO call_escalations (
        call_session_id,
        escalated_from,
        escalated_to,
        escalation_reason,
        escalation_type,
        auto_escalation
    )
    SELECT 
        cs.id,
        cs.reader_id,
        (SELECT id FROM profiles WHERE role = 'admin' AND is_active = TRUE LIMIT 1),
        'Emergency call not answered within 5 minutes',
        'no_answer',
        TRUE
    FROM call_sessions cs
    WHERE cs.is_emergency = TRUE
        AND cs.status = 'ringing'
        AND cs.created_at < NOW() - INTERVAL '300 seconds'
        AND NOT EXISTS (
            SELECT 1 FROM call_escalations ce 
            WHERE ce.call_session_id = cs.id
        );

    -- Update call status to escalated
    UPDATE call_sessions 
    SET status = 'escalated'
    WHERE is_emergency = TRUE
        AND status = 'ringing'
        AND created_at < NOW() - INTERVAL '300 seconds';

    -- Insert emergency call logs
    INSERT INTO emergency_call_logs (
        user_id,
        reader_id,
        call_session_id,
        emergency_type,
        priority_level,
        status,
        escalation_reason,
        escalated_to
    )
    SELECT 
        cs.user_id,
        cs.reader_id,
        cs.id,
        'emergency_call',
        5,
        'escalated',
        'Auto-escalated due to no answer within 5 minutes',
        (SELECT id FROM profiles WHERE role = 'admin' AND is_active = TRUE LIMIT 1)
    FROM call_sessions cs
    WHERE cs.is_emergency = TRUE
        AND cs.status = 'escalated'
        AND NOT EXISTS (
            SELECT 1 FROM emergency_call_logs ecl 
            WHERE ecl.call_session_id = cs.id
        );
END;
$$ LANGUAGE plpgsql;

-- Function to update reader availability
CREATE OR REPLACE FUNCTION update_reader_availability()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' THEN
        -- Reader is now on call
        UPDATE reader_availability 
        SET is_on_call = TRUE, 
            current_call_count = current_call_count + 1,
            updated_at = NOW()
        WHERE reader_id = NEW.reader_id;
    ELSIF OLD.status = 'active' AND NEW.status IN ('ended', 'failed') THEN
        -- Reader call ended
        UPDATE reader_availability 
        SET is_on_call = CASE 
                WHEN current_call_count <= 1 THEN FALSE 
                ELSE TRUE 
            END,
            current_call_count = GREATEST(0, current_call_count - 1),
            updated_at = NOW()
        WHERE reader_id = NEW.reader_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS trigger_auto_escalate_emergency ON call_sessions;
CREATE TRIGGER trigger_auto_escalate_emergency
    BEFORE UPDATE ON call_sessions
    FOR EACH ROW
    EXECUTE FUNCTION auto_escalate_emergency();

DROP TRIGGER IF EXISTS trigger_update_reader_availability ON call_sessions;
CREATE TRIGGER trigger_update_reader_availability
    AFTER UPDATE ON call_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_reader_availability();

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_notifications ENABLE ROW LEVEL SECURITY;

-- Call Sessions Policies
CREATE POLICY "Users can view their own call sessions" ON call_sessions
    FOR SELECT USING (user_id = auth.uid() OR reader_id = auth.uid());

CREATE POLICY "Admins and monitors can view all call sessions" ON call_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'monitor')
        )
    );

CREATE POLICY "Users can create call sessions" ON call_sessions
    FOR INSERT WITH CHECK (user_id = auth.uid() OR reader_id = auth.uid());

CREATE POLICY "Participants can update call sessions" ON call_sessions
    FOR UPDATE USING (user_id = auth.uid() OR reader_id = auth.uid());

-- Call Recordings Policies
CREATE POLICY "Admins and monitors can view all recordings" ON call_recordings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'monitor')
        )
    );

CREATE POLICY "Call participants can view their recordings" ON call_recordings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM call_sessions cs
            WHERE cs.id = call_recordings.call_session_id
            AND (cs.user_id = auth.uid() OR cs.reader_id = auth.uid())
        )
    );

-- Emergency Call Logs Policies
CREATE POLICY "Users can view their emergency call logs" ON emergency_call_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins and monitors can view all emergency call logs" ON emergency_call_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'monitor')
        )
    );

-- Reader Availability Policies
CREATE POLICY "Readers can manage their availability" ON reader_availability
    FOR ALL USING (reader_id = auth.uid());

CREATE POLICY "All users can view reader availability" ON reader_availability
    FOR SELECT USING (TRUE);

-- Call Notifications Policies
CREATE POLICY "Users can view their notifications" ON call_notifications
    FOR SELECT USING (recipient_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON call_notifications
    FOR UPDATE USING (recipient_id = auth.uid());

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert default reader availability for existing readers
INSERT INTO reader_availability (reader_id, is_available, emergency_available)
SELECT id, TRUE, TRUE
FROM profiles 
WHERE role = 'reader'
ON CONFLICT (reader_id) DO NOTHING;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get available readers for emergency calls
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
    WHERE ra.is_available = TRUE 
    AND ra.emergency_available = TRUE
    AND ra.current_call_count < ra.max_concurrent_calls
    AND p.role = 'reader'
    AND p.is_active = TRUE
    ORDER BY ra.current_call_count ASC, ra.last_seen DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to create emergency call session
CREATE OR REPLACE FUNCTION create_emergency_call(
    p_user_id UUID,
    p_call_type VARCHAR DEFAULT 'voice'
)
RETURNS UUID AS $$
DECLARE
    v_reader_id UUID;
    v_call_session_id UUID;
    v_room_id VARCHAR;
BEGIN
    -- Find available reader
    SELECT reader_id INTO v_reader_id
    FROM get_available_emergency_readers()
    LIMIT 1;
    
    IF v_reader_id IS NULL THEN
        RAISE EXCEPTION 'No available readers for emergency call';
    END IF;
    
    -- Generate unique room ID
    v_room_id := 'emergency_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8);
    
    -- Create call session
    INSERT INTO call_sessions (
        user_id,
        reader_id,
        room_id,
        call_type,
        is_emergency,
        scheduled_duration,
        status
    ) VALUES (
        p_user_id,
        v_reader_id,
        v_room_id,
        p_call_type,
        TRUE,
        30, -- 30 minutes for emergency calls
        'ringing'
    ) RETURNING id INTO v_call_session_id;
    
    -- Create emergency call log
    INSERT INTO emergency_call_logs (
        user_id,
        reader_id,
        call_session_id,
        emergency_type,
        priority_level,
        status
    ) VALUES (
        p_user_id,
        v_reader_id,
        v_call_session_id,
        'emergency_call',
        5,
        'triggered'
    );
    
    -- Create notification for reader
    INSERT INTO call_notifications (
        call_session_id,
        recipient_id,
        notification_type,
        title,
        message,
        is_emergency,
        is_siren
    ) VALUES (
        v_call_session_id,
        v_reader_id,
        'emergency_call',
        'EMERGENCY CALL',
        'You have an incoming emergency call. Please answer immediately.',
        TRUE,
        TRUE
    );
    
    RETURN v_call_session_id;
END;
$$ LANGUAGE plpgsql;

-- Function to end call session
CREATE OR REPLACE FUNCTION end_call_session(p_call_session_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE call_sessions 
    SET status = 'ended',
        end_time = NOW()
    WHERE id = p_call_session_id
    AND status = 'active';
    
    -- Update participant leave times
    UPDATE call_participants
    SET leave_time = NOW()
    WHERE call_session_id = p_call_session_id
    AND leave_time IS NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE call_sessions IS 'Stores all voice and video call sessions';
COMMENT ON TABLE call_recordings IS 'Stores call recording metadata and file references';
COMMENT ON TABLE emergency_call_logs IS 'Logs all emergency call events and escalations';
COMMENT ON TABLE call_participants IS 'Tracks who joins/leaves calls and their permissions';
COMMENT ON TABLE call_escalations IS 'Manages call escalation workflow';
COMMENT ON TABLE reader_availability IS 'Tracks reader availability for calls';
COMMENT ON TABLE call_notifications IS 'Manages call-related notifications including emergency sirens'; 