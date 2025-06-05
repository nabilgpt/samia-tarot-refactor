-- ============================================================
-- CREATE MISSING SUPABASE TABLES - SAMIA TAROT
-- Creates call_sessions, call_recordings, and emergency_call_logs tables
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. CALL SESSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS call_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Session identification
    session_id VARCHAR(255) UNIQUE NOT NULL,
    channel_id VARCHAR(255),
    
    -- Participants
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Session details
    service_type VARCHAR(50) DEFAULT 'tarot_reading',
    session_type VARCHAR(50) DEFAULT 'video' CHECK (session_type IN ('video', 'voice', 'chat')),
    
    -- Status and timing
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled', 'failed')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER DEFAULT 0,
    
    -- Technical details
    connection_quality VARCHAR(20) DEFAULT 'unknown',
    platform VARCHAR(50) DEFAULT 'web',
    ip_address INET,
    user_agent TEXT,
    
    -- Session metadata
    notes TEXT,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT,
    
    -- Financial
    cost DECIMAL(10,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_sessions_client_id ON call_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_reader_id ON call_sessions(reader_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_status ON call_sessions(status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_created_at ON call_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_call_sessions_session_id ON call_sessions(session_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_call_sessions_updated_at 
    BEFORE UPDATE ON call_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. CALL RECORDINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS call_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to session
    session_id UUID REFERENCES call_sessions(id) ON DELETE CASCADE,
    
    -- Participants (denormalized for easier queries)
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Recording details
    recording_type VARCHAR(50) DEFAULT 'video' CHECK (recording_type IN ('video', 'audio', 'screen', 'chat_log')),
    file_url TEXT,
    file_size BIGINT DEFAULT 0,
    file_format VARCHAR(20) DEFAULT 'mp4',
    duration_seconds INTEGER DEFAULT 0,
    
    -- Storage details
    storage_provider VARCHAR(50) DEFAULT 'supabase',
    storage_path TEXT,
    bucket_name VARCHAR(100) DEFAULT 'recordings',
    
    -- Processing status
    processing_status VARCHAR(50) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    transcription_status VARCHAR(50) DEFAULT 'none' CHECK (transcription_status IN ('none', 'pending', 'processing', 'completed', 'failed')),
    
    -- Content analysis
    transcript TEXT,
    transcript_confidence DECIMAL(3,2),
    content_flags JSONB DEFAULT '[]'::jsonb,
    sentiment_score DECIMAL(3,2),
    keywords TEXT[],
    
    -- Quality metrics
    video_quality VARCHAR(20),
    audio_quality VARCHAR(20),
    bitrate INTEGER,
    fps INTEGER,
    resolution VARCHAR(20),
    
    -- Access control
    is_public BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    retention_until TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    tags TEXT[],
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_recordings_session_id ON call_recordings(session_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_client_id ON call_recordings(client_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_reader_id ON call_recordings(reader_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_created_at ON call_recordings(created_at);
CREATE INDEX IF NOT EXISTS idx_call_recordings_processing_status ON call_recordings(processing_status);
CREATE INDEX IF NOT EXISTS idx_call_recordings_content_flags ON call_recordings USING GIN(content_flags);

-- Add updated_at trigger
CREATE TRIGGER update_call_recordings_updated_at 
    BEFORE UPDATE ON call_recordings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. EMERGENCY CALL LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS emergency_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User identification
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES call_sessions(id) ON DELETE SET NULL,
    
    -- Emergency details
    emergency_type VARCHAR(100) NOT NULL DEFAULT 'general',
    action VARCHAR(255) NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    -- Context
    trigger_reason TEXT,
    trigger_source VARCHAR(100), -- 'user_button', 'ai_detection', 'manual_admin', etc.
    page_url TEXT,
    user_agent TEXT,
    
    -- Response details
    response_status VARCHAR(50) DEFAULT 'pending' CHECK (response_status IN ('pending', 'acknowledged', 'in_progress', 'resolved', 'false_alarm')),
    response_time_seconds INTEGER,
    responder_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    response_notes TEXT,
    
    -- Location data
    ip_address INET,
    location_data JSONB,
    country_code VARCHAR(2),
    
    -- Contact attempts
    contact_methods_tried TEXT[],
    contact_success BOOLEAN DEFAULT false,
    emergency_contacts_notified TEXT[],
    
    -- Resolution
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_summary TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_notes TEXT,
    
    -- Metadata and audit
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_emergency_call_logs_user_id ON emergency_call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_call_logs_session_id ON emergency_call_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_emergency_call_logs_severity ON emergency_call_logs(severity);
CREATE INDEX IF NOT EXISTS idx_emergency_call_logs_response_status ON emergency_call_logs(response_status);
CREATE INDEX IF NOT EXISTS idx_emergency_call_logs_created_at ON emergency_call_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_emergency_call_logs_emergency_type ON emergency_call_logs(emergency_type);

-- Add updated_at trigger
CREATE TRIGGER update_emergency_call_logs_updated_at 
    BEFORE UPDATE ON emergency_call_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_call_logs ENABLE ROW LEVEL SECURITY;

-- CALL SESSIONS POLICIES
CREATE POLICY "Users can view their own sessions" ON call_sessions
    FOR SELECT USING (auth.uid() = client_id OR auth.uid() = reader_id);

CREATE POLICY "Users can insert their own sessions" ON call_sessions
    FOR INSERT WITH CHECK (auth.uid() = client_id OR auth.uid() = reader_id);

CREATE POLICY "Users can update their own sessions" ON call_sessions
    FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = reader_id);

CREATE POLICY "Admins can view all sessions" ON call_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- CALL RECORDINGS POLICIES
CREATE POLICY "Users can view their own recordings" ON call_recordings
    FOR SELECT USING (auth.uid() = client_id OR auth.uid() = reader_id);

CREATE POLICY "Users can insert their own recordings" ON call_recordings
    FOR INSERT WITH CHECK (auth.uid() = client_id OR auth.uid() = reader_id);

CREATE POLICY "Admins can view all recordings" ON call_recordings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'monitor')
        )
    );

-- EMERGENCY CALL LOGS POLICIES  
CREATE POLICY "Users can view their own emergency logs" ON emergency_call_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own emergency logs" ON emergency_call_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all emergency logs" ON emergency_call_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'monitor')
        )
    );

-- ============================================================
-- GRANTS AND PERMISSIONS
-- ============================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON call_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON call_recordings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON emergency_call_logs TO authenticated;

-- Grant additional permissions to service role
GRANT ALL ON call_sessions TO service_role;
GRANT ALL ON call_recordings TO service_role;
GRANT ALL ON emergency_call_logs TO service_role;

-- ============================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================

COMMENT ON TABLE call_sessions IS 'Stores video/voice call session information for tarot readings';
COMMENT ON TABLE call_recordings IS 'Stores recorded content from call sessions with content analysis';
COMMENT ON TABLE emergency_call_logs IS 'Logs emergency button activations and admin responses';

COMMENT ON COLUMN call_sessions.session_id IS 'Unique session identifier from video call provider';
COMMENT ON COLUMN call_recordings.content_flags IS 'AI-detected content flags as JSON array';
COMMENT ON COLUMN emergency_call_logs.trigger_source IS 'What triggered the emergency log (user_button, ai_detection, etc.)';

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Verify tables exist
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE tablename IN ('call_sessions', 'call_recordings', 'emergency_call_logs')
ORDER BY tablename;

-- Verify RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('call_sessions', 'call_recordings', 'emergency_call_logs')
ORDER BY tablename;

-- Count policies
SELECT 
    schemaname,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename IN ('call_sessions', 'call_recordings', 'emergency_call_logs')
GROUP BY schemaname, tablename
ORDER BY tablename; 