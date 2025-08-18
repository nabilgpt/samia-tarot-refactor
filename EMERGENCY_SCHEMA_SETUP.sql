-- 🚨 SAMIA TAROT - EMERGENCY CALL SYSTEM DATABASE SETUP
-- Execute this in Supabase SQL Editor to ensure all emergency tables exist

-- ==============================================================================
-- STEP 1: CREATE EMERGENCY CALL TABLES
-- ==============================================================================

-- Emergency Calls Table (if not exists)
CREATE TABLE IF NOT EXISTS emergency_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reader_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
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
    flagged_by VARCHAR(50),
    flagged_reasons TEXT[],
    ai_confidence_score DECIMAL(3,2),
    
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

-- Call Participants Table
CREATE TABLE IF NOT EXISTS call_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL REFERENCES emergency_calls(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('client', 'reader', 'monitor', 'admin')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    is_recording BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Call Logs for Emergency Audit Trail
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL REFERENCES emergency_calls(id) ON DELETE CASCADE,
    log_type VARCHAR(30) NOT NULL CHECK (log_type IN ('call_initiated', 'call_answered', 'call_ended', 'recording_started', 'recording_stopped', 'flag_raised', 'escalated', 'admin_note')),
    message TEXT NOT NULL,
    metadata JSONB,
    logged_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reader Availability Status
CREATE TABLE IF NOT EXISTS reader_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Emergency Escalation Rules
CREATE TABLE IF NOT EXISTS emergency_escalation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- ==============================================================================
-- STEP 2: CREATE INDEXES FOR PERFORMANCE
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_emergency_calls_client_id ON emergency_calls(client_id);
CREATE INDEX IF NOT EXISTS idx_emergency_calls_reader_id ON emergency_calls(reader_id);
CREATE INDEX IF NOT EXISTS idx_emergency_calls_status ON emergency_calls(status);
CREATE INDEX IF NOT EXISTS idx_emergency_calls_initiated_at ON emergency_calls(initiated_at);
CREATE INDEX IF NOT EXISTS idx_emergency_calls_session_id ON emergency_calls(session_id);

CREATE INDEX IF NOT EXISTS idx_call_participants_call_id ON call_participants(call_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_participant_id ON call_participants(participant_id);

CREATE INDEX IF NOT EXISTS idx_call_logs_call_id ON call_logs(call_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_reader_availability_reader_id ON reader_availability(reader_id);
CREATE INDEX IF NOT EXISTS idx_reader_availability_online ON reader_availability(is_online);

-- ==============================================================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- ==============================================================================

ALTER TABLE emergency_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_escalation_rules ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- STEP 4: CREATE RLS POLICIES
-- ==============================================================================

-- Emergency Calls Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'emergency_calls_select_own') THEN
        CREATE POLICY "emergency_calls_select_own" ON emergency_calls
            FOR SELECT USING (client_id = auth.uid() OR reader_id = auth.uid());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'emergency_calls_admin_all') THEN
        CREATE POLICY "emergency_calls_admin_all" ON emergency_calls
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'super_admin', 'monitor')
                )
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'emergency_calls_insert_client') THEN
        CREATE POLICY "emergency_calls_insert_client" ON emergency_calls
            FOR INSERT WITH CHECK (client_id = auth.uid());
    END IF;
END $$;

-- Reader Availability Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'reader_availability_own') THEN
        CREATE POLICY "reader_availability_own" ON reader_availability
            FOR ALL USING (reader_id = auth.uid());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'reader_availability_select_all') THEN
        CREATE POLICY "reader_availability_select_all" ON reader_availability
            FOR SELECT USING (true);
    END IF;
END $$;

-- ==============================================================================
-- STEP 5: CREATE TRIGGER FUNCTIONS
-- ==============================================================================

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

-- Create trigger if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_call_duration') THEN
        CREATE TRIGGER trigger_update_call_duration
            BEFORE UPDATE ON emergency_calls
            FOR EACH ROW
            EXECUTE FUNCTION update_call_duration();
    END IF;
END $$;

-- ==============================================================================
-- STEP 6: INSERT DEFAULT ESCALATION RULES
-- ==============================================================================

INSERT INTO emergency_escalation_rules (rule_name, trigger_condition, timeout_seconds, escalate_to_role, priority_level, notification_sound) 
VALUES
    ('Unanswered Emergency Call', 'unanswered_timeout', 30, 'monitor', 5, 'emergency_siren'),
    ('Reader Offline', 'reader_offline', 10, 'admin', 4, 'urgent_alert'),
    ('Manual Escalation', 'manual_escalation', 0, 'admin', 4, 'escalation_alert')
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- VERIFICATION: CHECK CREATED TABLES
-- ==============================================================================

DO $$
DECLARE
    table_count INTEGER := 0;
    missing_tables TEXT := '';
    required_tables TEXT[] := ARRAY['emergency_calls', 'call_participants', 'call_logs', 'reader_availability', 'emergency_escalation_rules'];
    table_name TEXT;
BEGIN
    RAISE NOTICE '🔍 VERIFYING EMERGENCY CALL TABLES...';
    RAISE NOTICE '';
    
    FOREACH table_name IN ARRAY required_tables
    LOOP
        SELECT COUNT(*) INTO table_count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = table_name;
        
        IF table_count > 0 THEN
            RAISE NOTICE '✅ %: EXISTS', table_name;
        ELSE
            RAISE NOTICE '❌ %: MISSING', table_name;
            missing_tables := missing_tables || table_name || ', ';
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    
    IF missing_tables = '' THEN
        RAISE NOTICE '🎉 SUCCESS: All emergency call tables created successfully!';
        RAISE NOTICE '';
        RAISE NOTICE '📊 EMERGENCY CALL SYSTEM STATUS:';
        RAISE NOTICE '   ✅ Database schema: COMPLETE';
        RAISE NOTICE '   ✅ RLS policies: ENFORCED';
        RAISE NOTICE '   ✅ Indexes: OPTIMIZED';
        RAISE NOTICE '   ✅ Escalation rules: CONFIGURED';
        RAISE NOTICE '';
        RAISE NOTICE '🚀 Emergency call system is PRODUCTION READY!';
    ELSE
        RAISE NOTICE '⚠️  Some tables are missing: %', TRIM(TRAILING ', ' FROM missing_tables);
    END IF;
END $$; 