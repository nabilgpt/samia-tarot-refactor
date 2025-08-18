-- ============================================================================
-- EMERGENCY CALLS SYSTEM DATABASE SCHEMA
-- SAMIA TAROT Platform - Call & Video System with Emergency Logic
-- ============================================================================

-- Emergency Calls Table
CREATE TABLE IF NOT EXISTS emergency_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    call_type VARCHAR(20) DEFAULT 'emergency' CHECK (call_type IN ('emergency', 'escalated', 'admin_override')),
    status VARCHAR(20) DEFAULT 'initiated' CHECK (status IN ('initiated', 'ringing', 'answered', 'ended', 'missed', 'escalated')),
    
    -- Call timing
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    answered_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER DEFAULT 0,
    
    -- Emergency escalation
    escalation_level INTEGER DEFAULT 1 CHECK (escalation_level BETWEEN 1 AND 5),
    escalated_at TIMESTAMP WITH TIME ZONE,
    escalated_to UUID REFERENCES profiles(id),
    escalation_reason TEXT,
    
    -- Recording and monitoring
    recording_url TEXT,
    recording_started_at TIMESTAMP WITH TIME ZONE,
    recording_ended_at TIMESTAMP WITH TIME ZONE,
    recording_duration_seconds INTEGER DEFAULT 0,
    
    -- AI Monitoring flags
    is_flagged BOOLEAN DEFAULT FALSE,
    flagged_at TIMESTAMP WITH TIME ZONE,
    flagged_by VARCHAR(50), -- 'ai_system', 'admin', 'monitor'
    flagged_reasons TEXT[], -- Array of reasons: ['harassment', 'payment_request', 'abuse', etc.]
    ai_confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    
    -- WebRTC session data
    session_id VARCHAR(255) UNIQUE,
    ice_candidates JSONB,
    sdp_offer TEXT,
    sdp_answer TEXT,
    
    -- Metadata
    client_ip INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Call Participants Table (for group calls or monitoring)
CREATE TABLE IF NOT EXISTS call_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES emergency_calls(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('client', 'reader', 'monitor', 'admin')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    is_recording BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Transcription and Monitoring
CREATE TABLE IF NOT EXISTS call_transcriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES emergency_calls(id) ON DELETE CASCADE,
    transcript_text TEXT NOT NULL,
    confidence_score DECIMAL(3,2),
    language_code VARCHAR(10) DEFAULT 'en',
    speaker_id VARCHAR(50), -- 'client', 'reader', 'unknown'
    timestamp_start DECIMAL(10,3), -- Seconds from call start
    timestamp_end DECIMAL(10,3),
    flagged_keywords TEXT[],
    sentiment_score DECIMAL(3,2), -- -1.00 to 1.00
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emergency Escalation Rules
CREATE TABLE IF NOT EXISTS emergency_escalation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name VARCHAR(100) NOT NULL,
    trigger_condition VARCHAR(50) NOT NULL CHECK (trigger_condition IN ('unanswered_timeout', 'keyword_detected', 'manual_escalation', 'reader_offline')),
    timeout_seconds INTEGER DEFAULT 30,
    escalate_to_role VARCHAR(20) NOT NULL CHECK (escalate_to_role IN ('monitor', 'admin', 'super_admin')),
    priority_level INTEGER DEFAULT 1 CHECK (priority_level BETWEEN 1 AND 5),
    notification_sound VARCHAR(100) DEFAULT 'emergency_siren',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Call Logs for Admin/Monitor Dashboard
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES emergency_calls(id) ON DELETE CASCADE,
    log_type VARCHAR(30) NOT NULL CHECK (log_type IN ('call_initiated', 'call_answered', 'call_ended', 'recording_started', 'recording_stopped', 'flag_raised', 'escalated', 'admin_note')),
    message TEXT NOT NULL,
    metadata JSONB,
    logged_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reader Availability Status
CREATE TABLE IF NOT EXISTS reader_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_online BOOLEAN DEFAULT FALSE,
    is_available_for_emergency BOOLEAN DEFAULT TRUE,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status_message VARCHAR(200),
    max_concurrent_calls INTEGER DEFAULT 1,
    current_call_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(reader_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_emergency_calls_client_id ON emergency_calls(client_id);
CREATE INDEX IF NOT EXISTS idx_emergency_calls_reader_id ON emergency_calls(reader_id);
CREATE INDEX IF NOT EXISTS idx_emergency_calls_status ON emergency_calls(status);
CREATE INDEX IF NOT EXISTS idx_emergency_calls_initiated_at ON emergency_calls(initiated_at);
CREATE INDEX IF NOT EXISTS idx_emergency_calls_flagged ON emergency_calls(is_flagged);
CREATE INDEX IF NOT EXISTS idx_emergency_calls_session_id ON emergency_calls(session_id);

CREATE INDEX IF NOT EXISTS idx_call_participants_call_id ON call_participants(call_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_participant_id ON call_participants(participant_id);

CREATE INDEX IF NOT EXISTS idx_call_transcriptions_call_id ON call_transcriptions(call_id);
CREATE INDEX IF NOT EXISTS idx_call_transcriptions_flagged_keywords ON call_transcriptions USING GIN(flagged_keywords);

CREATE INDEX IF NOT EXISTS idx_reader_availability_reader_id ON reader_availability(reader_id);
CREATE INDEX IF NOT EXISTS idx_reader_availability_online ON reader_availability(is_online);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE emergency_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_availability ENABLE ROW LEVEL SECURITY;

-- Emergency Calls Policies
CREATE POLICY "Clients can view their own emergency calls" ON emergency_calls
    FOR SELECT USING (client_id = auth.uid() OR reader_id = auth.uid());

CREATE POLICY "Readers can view their assigned emergency calls" ON emergency_calls
    FOR SELECT USING (reader_id = auth.uid());

CREATE POLICY "Admins and monitors can view all emergency calls" ON emergency_calls
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'monitor')
        )
    );

CREATE POLICY "Clients can create emergency calls" ON emergency_calls
    FOR INSERT WITH CHECK (client_id = auth.uid());

CREATE POLICY "Participants can update call status" ON emergency_calls
    FOR UPDATE USING (client_id = auth.uid() OR reader_id = auth.uid() OR escalated_to = auth.uid());

-- Reader Availability Policies
CREATE POLICY "Readers can manage their own availability" ON reader_availability
    FOR ALL USING (reader_id = auth.uid());

CREATE POLICY "Everyone can view reader availability" ON reader_availability
    FOR SELECT USING (true);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update call duration
CREATE OR REPLACE FUNCTION update_call_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
        NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.initiated_at))::INTEGER;
    END IF;
    
    IF NEW.recording_ended_at IS NOT NULL AND OLD.recording_ended_at IS NULL THEN
        NEW.recording_duration_seconds = EXTRACT(EPOCH FROM (NEW.recording_ended_at - NEW.recording_started_at))::INTEGER;
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for call duration updates
CREATE TRIGGER trigger_update_call_duration
    BEFORE UPDATE ON emergency_calls
    FOR EACH ROW
    EXECUTE FUNCTION update_call_duration();

-- Function to auto-escalate unanswered calls
CREATE OR REPLACE FUNCTION auto_escalate_unanswered_calls()
RETURNS void AS $$
DECLARE
    call_record RECORD;
    escalation_rule RECORD;
BEGIN
    -- Get escalation rule for unanswered timeout
    SELECT * INTO escalation_rule 
    FROM emergency_escalation_rules 
    WHERE trigger_condition = 'unanswered_timeout' 
    AND is_active = TRUE 
    LIMIT 1;
    
    IF escalation_rule IS NULL THEN
        RETURN;
    END IF;
    
    -- Find calls that need escalation
    FOR call_record IN 
        SELECT * FROM emergency_calls 
        WHERE status = 'ringing' 
        AND initiated_at < NOW() - INTERVAL '1 second' * escalation_rule.timeout_seconds
        AND escalation_level < 3
    LOOP
        -- Update call status to escalated
        UPDATE emergency_calls 
        SET 
            status = 'escalated',
            escalation_level = escalation_level + 1,
            escalated_at = NOW(),
            escalation_reason = 'Unanswered timeout after ' || escalation_rule.timeout_seconds || ' seconds'
        WHERE id = call_record.id;
        
        -- Log the escalation
        INSERT INTO call_logs (call_id, log_type, message, metadata)
        VALUES (
            call_record.id,
            'escalated',
            'Call auto-escalated due to timeout',
            jsonb_build_object(
                'escalation_level', call_record.escalation_level + 1,
                'timeout_seconds', escalation_rule.timeout_seconds,
                'rule_id', escalation_rule.id
            )
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default escalation rules
INSERT INTO emergency_escalation_rules (rule_name, trigger_condition, timeout_seconds, escalate_to_role, priority_level, notification_sound) VALUES
('Unanswered Emergency Call', 'unanswered_timeout', 30, 'monitor', 5, 'emergency_siren'),
('Reader Offline', 'reader_offline', 10, 'admin', 4, 'urgent_alert'),
('Harassment Detected', 'keyword_detected', 0, 'admin', 5, 'critical_alert'),
('Payment Request Detected', 'keyword_detected', 0, 'monitor', 3, 'warning_alert'),
('Manual Escalation', 'manual_escalation', 0, 'admin', 4, 'escalation_alert')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE emergency_calls IS 'Core table for emergency call system with WebRTC support';
COMMENT ON TABLE call_participants IS 'Tracks all participants in emergency calls';
COMMENT ON TABLE call_transcriptions IS 'AI-generated transcriptions with keyword flagging';
COMMENT ON TABLE emergency_escalation_rules IS 'Configurable rules for call escalation';
COMMENT ON TABLE call_logs IS 'Audit trail for all call-related events';
COMMENT ON TABLE reader_availability IS 'Real-time reader availability status';

COMMENT ON COLUMN emergency_calls.escalation_level IS '1=Initial, 2=Monitor, 3=Admin, 4=Super Admin, 5=Emergency Services';
COMMENT ON COLUMN emergency_calls.flagged_reasons IS 'Array of AI-detected issues: harassment, payment, abuse, threats, etc.';
COMMENT ON COLUMN emergency_calls.ai_confidence_score IS 'AI confidence in flagging decision (0.0-1.0)';
COMMENT ON COLUMN call_transcriptions.sentiment_score IS 'Sentiment analysis: -1.0 (negative) to 1.0 (positive)'; 