-- 🔧 SAMIA TAROT - SIMPLE EMERGENCY CALL FIX
-- Execute this FIRST in Supabase SQL Editor

-- Remove any broken tables
DROP TABLE IF EXISTS call_logs CASCADE;
DROP TABLE IF EXISTS call_participants CASCADE;

-- Create emergency_calls table FIRST (this must exist before others)
CREATE TABLE IF NOT EXISTS emergency_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reader_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'initiated',
    call_type VARCHAR(20) DEFAULT 'emergency',
    session_id VARCHAR(255) UNIQUE,
    recording_url TEXT,
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Now create dependent tables (these reference emergency_calls.id)
CREATE TABLE IF NOT EXISTS call_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL REFERENCES emergency_calls(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL REFERENCES emergency_calls(id) ON DELETE CASCADE,
    log_type VARCHAR(30) NOT NULL,
    message TEXT NOT NULL,
    logged_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Simple verification
DO $$
DECLARE
    emergency_calls_exists INTEGER := 0;
    call_participants_exists INTEGER := 0;
    call_logs_exists INTEGER := 0;
BEGIN
    SELECT COUNT(*) INTO emergency_calls_exists FROM information_schema.tables WHERE table_name = 'emergency_calls';
    SELECT COUNT(*) INTO call_participants_exists FROM information_schema.tables WHERE table_name = 'call_participants';
    SELECT COUNT(*) INTO call_logs_exists FROM information_schema.tables WHERE table_name = 'call_logs';
    
    RAISE NOTICE 'Emergency Tables Status:';
    RAISE NOTICE '✅ emergency_calls: %', CASE WHEN emergency_calls_exists > 0 THEN 'EXISTS' ELSE 'MISSING' END;
    RAISE NOTICE '✅ call_participants: %', CASE WHEN call_participants_exists > 0 THEN 'EXISTS' ELSE 'MISSING' END;
    RAISE NOTICE '✅ call_logs: %', CASE WHEN call_logs_exists > 0 THEN 'EXISTS' ELSE 'MISSING' END;
    
    IF emergency_calls_exists > 0 AND call_participants_exists > 0 AND call_logs_exists > 0 THEN
        RAISE NOTICE '🎉 SUCCESS: All emergency tables created! call_id error FIXED!';
    END IF;
END $$; 