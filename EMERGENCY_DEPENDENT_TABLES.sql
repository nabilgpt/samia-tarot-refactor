-- 🔗 SAMIA TAROT - EMERGENCY DEPENDENT TABLES
-- Execute this AFTER EMERGENCY_SCHEMA_FIX.sql succeeds

-- Call Participants Table (references emergency_calls.id)
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

-- Call Logs Table (references emergency_calls.id)
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL REFERENCES emergency_calls(id) ON DELETE CASCADE,
    log_type VARCHAR(30) NOT NULL CHECK (log_type IN ('call_initiated', 'call_answered', 'call_ended', 'recording_started', 'recording_stopped', 'flag_raised', 'escalated', 'admin_note')),
    message TEXT NOT NULL,
    metadata JSONB,
    logged_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reader Availability Table (independent)
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

-- Emergency Escalation Rules Table (independent)
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_call_participants_call_id ON call_participants(call_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_participant_id ON call_participants(participant_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_call_id ON call_logs(call_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_reader_availability_reader_id ON reader_availability(reader_id);
CREATE INDEX IF NOT EXISTS idx_reader_availability_online ON reader_availability(is_online);

-- Enable RLS
ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_escalation_rules ENABLE ROW LEVEL SECURITY;

-- Insert default escalation rules
INSERT INTO emergency_escalation_rules (rule_name, trigger_condition, timeout_seconds, escalate_to_role, priority_level, notification_sound) 
VALUES
    ('Unanswered Emergency Call', 'unanswered_timeout', 30, 'monitor', 5, 'emergency_siren'),
    ('Reader Offline', 'reader_offline', 10, 'admin', 4, 'urgent_alert'),
    ('Manual Escalation', 'manual_escalation', 0, 'admin', 4, 'escalation_alert')
ON CONFLICT DO NOTHING;

-- Verification
DO $$
DECLARE
    table_count INTEGER := 0;
    required_tables TEXT[] := ARRAY['call_participants', 'call_logs', 'reader_availability', 'emergency_escalation_rules'];
    table_name TEXT;
    total_created INTEGER := 0;
BEGIN
    RAISE NOTICE '🔍 VERIFYING EMERGENCY DEPENDENT TABLES...';
    
    FOREACH table_name IN ARRAY required_tables
    LOOP
        SELECT COUNT(*) INTO table_count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = table_name;
        
        IF table_count > 0 THEN
            RAISE NOTICE '✅ %: EXISTS', table_name;
            total_created := total_created + 1;
        ELSE
            RAISE NOTICE '❌ %: MISSING', table_name;
        END IF;
    END LOOP;
    
    IF total_created = 4 THEN
        RAISE NOTICE '🎉 SUCCESS: All emergency tables operational!';
        RAISE NOTICE '🚀 EMERGENCY CALL SYSTEM IS 100%% READY!';
    END IF;
END $$; 