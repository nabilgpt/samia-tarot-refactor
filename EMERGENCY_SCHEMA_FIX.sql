-- 🔧 SAMIA TAROT - EMERGENCY SCHEMA FIX (Step-by-Step)
-- Execute this FIRST to fix the call_id error

-- ==============================================================================
-- STEP 1: CLEAN SLATE - Remove any conflicting tables
-- ==============================================================================

DROP TABLE IF EXISTS call_logs CASCADE;
DROP TABLE IF EXISTS call_participants CASCADE;
DROP TABLE IF EXISTS emergency_escalation_rules CASCADE;
DROP TABLE IF EXISTS reader_availability CASCADE;
DROP TABLE IF EXISTS emergency_calls CASCADE;

-- ==============================================================================
-- STEP 2: CREATE CORE EMERGENCY_CALLS TABLE FIRST
-- ==============================================================================

CREATE TABLE emergency_calls (
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

-- Enable RLS on emergency_calls
ALTER TABLE emergency_calls ENABLE ROW LEVEL SECURITY;

-- Create index on emergency_calls
CREATE INDEX idx_emergency_calls_client_id ON emergency_calls(client_id);
CREATE INDEX idx_emergency_calls_reader_id ON emergency_calls(reader_id);
CREATE INDEX idx_emergency_calls_status ON emergency_calls(status);
CREATE INDEX idx_emergency_calls_initiated_at ON emergency_calls(initiated_at);
CREATE INDEX idx_emergency_calls_session_id ON emergency_calls(session_id);

-- ==============================================================================
-- VERIFICATION: Check emergency_calls table exists
-- ==============================================================================

DO $$
DECLARE
    table_exists INTEGER := 0;
BEGIN
    SELECT COUNT(*) INTO table_exists 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'emergency_calls';
    
    IF table_exists > 0 THEN
        RAISE NOTICE '✅ SUCCESS: emergency_calls table created!';
        RAISE NOTICE '📋 Columns: id, client_id, reader_id, call_type, status, session_id, recording_url';
        RAISE NOTICE '🔗 Ready for dependent tables (call_participants, call_logs)';
    ELSE
        RAISE NOTICE '❌ ERROR: emergency_calls table not created!';
    END IF;
END $$; 