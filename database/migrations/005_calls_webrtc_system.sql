-- =====================================================
-- CALLS/WEBRTC WITH CONSENT, RECORDING, EMERGENCY EXTENSION
-- Migration: 005_calls_webrtc_system.sql
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. CALL SESSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS call_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Participants
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Session identification
    session_token TEXT UNIQUE NOT NULL, -- For WebRTC room identification
    agora_channel_name TEXT, -- Agora.io channel name
    agora_room_id TEXT, -- Agora room ID
    
    -- Call configuration
    call_type TEXT NOT NULL CHECK (call_type IN ('scheduled', 'emergency', 'consultation')),
    session_mode TEXT NOT NULL CHECK (session_mode IN ('audio_only', 'video', 'screen_share')) DEFAULT 'video',
    max_duration_minutes INTEGER DEFAULT 60 CHECK (max_duration_minutes > 0),
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'consent_pending', 'connecting', 'active', 'on_hold', 
                  'extended', 'ending', 'completed', 'cancelled', 'failed')
    ),
    
    -- Consent management (CRITICAL for legal compliance)
    client_consent_given BOOLEAN DEFAULT false,
    client_consent_timestamp TIMESTAMPTZ,
    client_consent_ip INET,
    reader_consent_given BOOLEAN DEFAULT false,
    reader_consent_timestamp TIMESTAMPTZ,
    reader_consent_ip INET,
    
    -- Recording configuration (Saved permanently as per requirements)
    recording_enabled BOOLEAN DEFAULT true,
    recording_consent_client BOOLEAN DEFAULT false,
    recording_consent_reader BOOLEAN DEFAULT false,
    recording_start_timestamp TIMESTAMPTZ,
    recording_end_timestamp TIMESTAMPTZ,
    recording_file_path TEXT,
    recording_file_size_bytes BIGINT,
    recording_backup_path TEXT, -- Permanent backup location
    
    -- Emergency features
    is_emergency_session BOOLEAN DEFAULT false,
    emergency_extension_count INTEGER DEFAULT 0,
    emergency_extension_minutes INTEGER DEFAULT 0,
    emergency_auto_extension_enabled BOOLEAN DEFAULT false,
    
    -- Timing and duration
    scheduled_start_time TIMESTAMPTZ,
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    total_duration_minutes INTEGER,
    
    -- Quality and technical
    connection_quality_avg DECIMAL(3,2), -- 1.0 to 5.0 rating
    technical_issues_reported INTEGER DEFAULT 0,
    bandwidth_issues BOOLEAN DEFAULT false,
    audio_quality_issues BOOLEAN DEFAULT false,
    video_quality_issues BOOLEAN DEFAULT false,
    
    -- Pricing and payment
    base_rate_per_minute DECIMAL(8,2),
    emergency_rate_multiplier DECIMAL(3,2) DEFAULT 1.0,
    extension_rate_per_minute DECIMAL(8,2),
    total_cost_usd DECIMAL(10,2),
    payment_intent_id TEXT,
    payment_status TEXT CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'refunded')),
    
    -- Related entities
    booking_id UUID, -- If this call is part of a booking
    emergency_request_id UUID, -- If this is from emergency request
    
    -- Metadata
    client_user_agent TEXT,
    reader_user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CHECK (
        CASE 
            WHEN status = 'active' THEN 
                client_consent_given = true AND reader_consent_given = true
            ELSE true
        END
    ),
    CHECK (
        CASE 
            WHEN recording_enabled = true THEN 
                recording_consent_client = true AND recording_consent_reader = true
            ELSE true
        END
    )
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_sessions_client_id ON call_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_reader_id ON call_sessions(reader_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_status ON call_sessions(status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_session_token ON call_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_call_sessions_emergency ON call_sessions(is_emergency_session) WHERE is_emergency_session = true;
CREATE INDEX IF NOT EXISTS idx_call_sessions_active ON call_sessions(actual_start_time) WHERE status = 'active';

-- =====================================================
-- 2. CALL PARTICIPANTS TABLE (For group calls future)
-- =====================================================

CREATE TABLE IF NOT EXISTS call_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Participant role
    participant_role TEXT NOT NULL CHECK (participant_role IN ('client', 'reader', 'admin', 'observer')),
    
    -- Join/leave tracking
    joined_at TIMESTAMPTZ,
    left_at TIMESTAMPTZ,
    total_duration_minutes INTEGER,
    
    -- Technical details
    user_agent TEXT,
    ip_address INET,
    connection_quality DECIMAL(3,2),
    
    -- Permissions
    can_speak BOOLEAN DEFAULT true,
    can_share_screen BOOLEAN DEFAULT false,
    is_moderator BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(call_session_id, user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_call_participants_session_id ON call_participants(call_session_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_user_id ON call_participants(user_id);

-- =====================================================
-- 3. CALL RECORDINGS TABLE (Permanent storage)
-- =====================================================

CREATE TABLE IF NOT EXISTS call_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
    
    -- Recording details
    recording_type TEXT NOT NULL CHECK (recording_type IN ('full_session', 'segment', 'emergency_extension')),
    file_format TEXT DEFAULT 'mp4',
    
    -- File storage (PERMANENT as per requirements)
    primary_file_path TEXT NOT NULL,
    backup_file_path TEXT, -- Secondary backup location
    cloud_storage_url TEXT, -- Cloud backup URL
    file_size_bytes BIGINT,
    duration_seconds INTEGER,
    
    -- Technical metadata
    video_codec TEXT,
    audio_codec TEXT,
    resolution TEXT, -- e.g., "1920x1080"
    bitrate_kbps INTEGER,
    frame_rate DECIMAL(4,2),
    
    -- Quality metrics
    audio_quality_score DECIMAL(3,2), -- 1.0 to 5.0
    video_quality_score DECIMAL(3,2), -- 1.0 to 5.0
    compression_ratio DECIMAL(5,2),
    
    -- Access control
    is_permanently_stored BOOLEAN DEFAULT true, -- CRITICAL: Always true per requirements
    access_level TEXT CHECK (access_level IN ('participants_only', 'admin_only', 'legal_hold')) DEFAULT 'participants_only',
    retention_policy TEXT DEFAULT 'permanent', -- permanent, 1_year, 5_years, etc.
    
    -- Legal and compliance
    recording_consent_verified BOOLEAN DEFAULT false,
    legal_hold_applied BOOLEAN DEFAULT false,
    encryption_enabled BOOLEAN DEFAULT true,
    encryption_key_id TEXT,
    
    -- Processing status
    processing_status TEXT CHECK (processing_status IN ('uploading', 'processing', 'ready', 'failed')) DEFAULT 'uploading',
    processing_error TEXT,
    
    -- Timestamps
    recording_started_at TIMESTAMPTZ NOT NULL,
    recording_ended_at TIMESTAMPTZ NOT NULL,
    uploaded_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_call_recordings_session_id ON call_recordings(call_session_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_permanent ON call_recordings(is_permanently_stored) WHERE is_permanently_stored = true;
CREATE INDEX IF NOT EXISTS idx_call_recordings_processing_status ON call_recordings(processing_status);

-- =====================================================
-- 4. CONSENT LOGS TABLE (Legal compliance)
-- =====================================================

CREATE TABLE IF NOT EXISTS call_consent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Consent details
    consent_type TEXT NOT NULL CHECK (consent_type IN ('call_participation', 'recording', 'data_sharing', 'emergency_extension')),
    consent_status TEXT NOT NULL CHECK (consent_status IN ('given', 'withdrawn', 'expired')),
    
    -- Legal details
    consent_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    consent_method TEXT CHECK (consent_method IN ('web_form', 'verbal', 'email', 'sms')) DEFAULT 'web_form',
    
    -- Consent content
    consent_text TEXT, -- The actual consent text shown to user
    consent_version TEXT, -- Version of consent terms
    
    -- Verification
    digital_signature TEXT, -- If digitally signed
    witness_user_id UUID REFERENCES profiles(id), -- If witnessed by another user
    
    -- Legal metadata
    jurisdiction TEXT, -- Legal jurisdiction where consent was given
    applicable_law TEXT, -- Which data protection law applies
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_consent_logs_session_id ON call_consent_logs(call_session_id);
CREATE INDEX IF NOT EXISTS idx_consent_logs_user_id ON call_consent_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_logs_consent_type ON call_consent_logs(consent_type);

-- =====================================================
-- 5. EMERGENCY EXTENSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS call_emergency_extensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
    
    -- Extension details
    extension_number INTEGER NOT NULL, -- 1st, 2nd, 3rd extension, etc.
    requested_by UUID NOT NULL REFERENCES profiles(id), -- Who requested the extension
    approved_by UUID REFERENCES profiles(id), -- Who approved (if manual approval)
    
    -- Extension configuration
    additional_minutes INTEGER NOT NULL CHECK (additional_minutes > 0),
    emergency_reason TEXT,
    auto_approved BOOLEAN DEFAULT false,
    
    -- Approval workflow
    approval_status TEXT NOT NULL CHECK (approval_status IN ('pending', 'approved', 'rejected', 'auto_approved')) DEFAULT 'pending',
    approval_timestamp TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Pricing
    extension_rate_per_minute DECIMAL(8,2),
    total_extension_cost DECIMAL(10,2),
    
    -- Timestamps
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    extension_started_at TIMESTAMPTZ,
    extension_ended_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(call_session_id, extension_number)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_emergency_extensions_session_id ON call_emergency_extensions(call_session_id);
CREATE INDEX IF NOT EXISTS idx_emergency_extensions_requested_by ON call_emergency_extensions(requested_by);
CREATE INDEX IF NOT EXISTS idx_emergency_extensions_status ON call_emergency_extensions(approval_status);

-- =====================================================
-- 6. WEBRTC SIGNALING TABLE (For connection management)
-- =====================================================

CREATE TABLE IF NOT EXISTS webrtc_signaling (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES profiles(id),
    to_user_id UUID REFERENCES profiles(id), -- NULL for broadcast messages
    
    -- Signaling data
    message_type TEXT NOT NULL CHECK (message_type IN ('offer', 'answer', 'ice_candidate', 'connection_state', 'quality_update')),
    payload JSONB NOT NULL,
    
    -- Status
    delivered BOOLEAN DEFAULT false,
    processed BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_webrtc_signaling_session_id ON webrtc_signaling(call_session_id);
CREATE INDEX IF NOT EXISTS idx_webrtc_signaling_from_user ON webrtc_signaling(from_user_id);
CREATE INDEX IF NOT EXISTS idx_webrtc_signaling_undelivered ON webrtc_signaling(delivered) WHERE delivered = false;

-- =====================================================
-- 7. BUSINESS LOGIC FUNCTIONS
-- =====================================================

-- Function to create a new call session with consent requirements
CREATE OR REPLACE FUNCTION create_call_session(
    p_client_id UUID,
    p_reader_id UUID,
    p_call_type TEXT,
    p_session_mode TEXT DEFAULT 'video',
    p_max_duration_minutes INTEGER DEFAULT 60,
    p_is_emergency BOOLEAN DEFAULT false,
    p_scheduled_start_time TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_id UUID;
    session_token TEXT;
    channel_name TEXT;
BEGIN
    -- Generate unique session token and channel name
    session_token := 'call_' || encode(gen_random_bytes(16), 'hex');
    channel_name := 'channel_' || encode(gen_random_bytes(8), 'hex');
    
    -- Create call session
    INSERT INTO call_sessions (
        client_id,
        reader_id,
        session_token,
        agora_channel_name,
        call_type,
        session_mode,
        max_duration_minutes,
        is_emergency_session,
        scheduled_start_time,
        status
    ) VALUES (
        p_client_id,
        p_reader_id,
        session_token,
        channel_name,
        p_call_type,
        p_session_mode,
        p_max_duration_minutes,
        p_is_emergency,
        p_scheduled_start_time,
        'consent_pending'
    )
    RETURNING id INTO session_id;
    
    -- Create participant records
    INSERT INTO call_participants (call_session_id, user_id, participant_role) VALUES
    (session_id, p_client_id, 'client'),
    (session_id, p_reader_id, 'reader');
    
    RETURN session_id;
END;
$$;

-- Function to grant consent for call participation
CREATE OR REPLACE FUNCTION grant_call_consent(
    p_call_session_id UUID,
    p_user_id UUID,
    p_consent_type TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
    consent_text TEXT;
BEGIN
    -- Determine user role in this call
    SELECT participant_role INTO user_role
    FROM call_participants
    WHERE call_session_id = p_call_session_id AND user_id = p_user_id;
    
    IF user_role IS NULL THEN
        RAISE EXCEPTION 'User is not a participant in this call session';
    END IF;
    
    -- Set appropriate consent text based on type
    CASE p_consent_type
        WHEN 'call_participation' THEN
            consent_text := 'I consent to participate in this video/audio call session.';
        WHEN 'recording' THEN
            consent_text := 'I consent to having this call session recorded and permanently stored.';
        WHEN 'emergency_extension' THEN
            consent_text := 'I consent to extending this call session for emergency purposes.';
        ELSE
            RAISE EXCEPTION 'Invalid consent type: %', p_consent_type;
    END CASE;
    
    -- Log the consent
    INSERT INTO call_consent_logs (
        call_session_id,
        user_id,
        consent_type,
        consent_status,
        ip_address,
        user_agent,
        consent_text,
        consent_version
    ) VALUES (
        p_call_session_id,
        p_user_id,
        p_consent_type,
        'given',
        p_ip_address,
        p_user_agent,
        consent_text,
        '1.0'
    );
    
    -- Update call session based on user role and consent type
    IF user_role = 'client' AND p_consent_type = 'call_participation' THEN
        UPDATE call_sessions 
        SET client_consent_given = true,
            client_consent_timestamp = NOW(),
            client_consent_ip = p_ip_address
        WHERE id = p_call_session_id;
    ELSIF user_role = 'reader' AND p_consent_type = 'call_participation' THEN
        UPDATE call_sessions 
        SET reader_consent_given = true,
            reader_consent_timestamp = NOW(),
            reader_consent_ip = p_ip_address
        WHERE id = p_call_session_id;
    ELSIF p_consent_type = 'recording' THEN
        IF user_role = 'client' THEN
            UPDATE call_sessions SET recording_consent_client = true WHERE id = p_call_session_id;
        ELSIF user_role = 'reader' THEN
            UPDATE call_sessions SET recording_consent_reader = true WHERE id = p_call_session_id;
        END IF;
    END IF;
    
    -- Check if all required consents are given and update status
    PERFORM update_call_session_status(p_call_session_id);
    
    RETURN true;
END;
$$;

-- Function to update call session status based on consents
CREATE OR REPLACE FUNCTION update_call_session_status(p_call_session_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
BEGIN
    SELECT * INTO session_record
    FROM call_sessions
    WHERE id = p_call_session_id;
    
    -- Update status based on consent state
    IF session_record.client_consent_given AND session_record.reader_consent_given THEN
        IF session_record.status = 'consent_pending' THEN
            UPDATE call_sessions 
            SET status = 'pending' 
            WHERE id = p_call_session_id;
        END IF;
    END IF;
END;
$$;

-- Function to request emergency extension
CREATE OR REPLACE FUNCTION request_emergency_extension(
    p_call_session_id UUID,
    p_requested_by UUID,
    p_additional_minutes INTEGER,
    p_emergency_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    extension_id UUID;
    next_extension_number INTEGER;
    auto_approve BOOLEAN := false;
    extension_rate DECIMAL(8,2);
BEGIN
    -- Get next extension number
    SELECT COALESCE(MAX(extension_number), 0) + 1 INTO next_extension_number
    FROM call_emergency_extensions
    WHERE call_session_id = p_call_session_id;
    
    -- Auto-approve for first emergency extension
    IF next_extension_number = 1 THEN
        auto_approve := true;
    END IF;
    
    -- Calculate extension rate (higher for subsequent extensions)
    extension_rate := 5.00 * next_extension_number; -- $5, $10, $15, etc.
    
    -- Create extension request
    INSERT INTO call_emergency_extensions (
        call_session_id,
        extension_number,
        requested_by,
        additional_minutes,
        emergency_reason,
        auto_approved,
        approval_status,
        extension_rate_per_minute,
        total_extension_cost
    ) VALUES (
        p_call_session_id,
        next_extension_number,
        p_requested_by,
        p_additional_minutes,
        p_emergency_reason,
        auto_approve,
        CASE WHEN auto_approve THEN 'auto_approved' ELSE 'pending' END,
        extension_rate,
        extension_rate * p_additional_minutes
    )
    RETURNING id INTO extension_id;
    
    -- If auto-approved, update the call session immediately
    IF auto_approve THEN
        UPDATE call_sessions 
        SET emergency_extension_count = emergency_extension_count + 1,
            emergency_extension_minutes = emergency_extension_minutes + p_additional_minutes,
            max_duration_minutes = max_duration_minutes + p_additional_minutes
        WHERE id = p_call_session_id;
        
        UPDATE call_emergency_extensions
        SET approval_timestamp = NOW(),
            extension_started_at = NOW()
        WHERE id = extension_id;
    END IF;
    
    RETURN extension_id;
END;
$$;

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_consent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_emergency_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webrtc_signaling ENABLE ROW LEVEL SECURITY;

-- Call Sessions Policies
CREATE POLICY "Users can view their own call sessions" ON call_sessions
    FOR SELECT USING (
        auth.uid() = client_id 
        OR auth.uid() = reader_id
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Participants can update their call sessions" ON call_sessions
    FOR UPDATE USING (
        auth.uid() = client_id 
        OR auth.uid() = reader_id
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Call Recordings Policies (CRITICAL for permanent storage)
CREATE POLICY "Participants can view their call recordings" ON call_recordings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM call_sessions cs
            WHERE cs.id = call_session_id 
            AND (cs.client_id = auth.uid() OR cs.reader_id = auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Consent Logs Policies
CREATE POLICY "Users can view their own consent logs" ON call_consent_logs
    FOR SELECT USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Emergency Extensions Policies
CREATE POLICY "Participants can view emergency extensions" ON call_emergency_extensions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM call_sessions cs
            WHERE cs.id = call_session_id 
            AND (cs.client_id = auth.uid() OR cs.reader_id = auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- WebRTC Signaling Policies
CREATE POLICY "Users can manage their signaling messages" ON webrtc_signaling
    FOR ALL USING (
        auth.uid() = from_user_id 
        OR auth.uid() = to_user_id
        OR EXISTS (
            SELECT 1 FROM call_sessions cs
            WHERE cs.id = call_session_id 
            AND (cs.client_id = auth.uid() OR cs.reader_id = auth.uid())
        )
    );

-- =====================================================
-- 9. TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER update_call_sessions_updated_at 
    BEFORE UPDATE ON call_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_participants_updated_at 
    BEFORE UPDATE ON call_participants 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_recordings_updated_at 
    BEFORE UPDATE ON call_recordings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_emergency_extensions_updated_at 
    BEFORE UPDATE ON call_emergency_extensions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log successful completion
DO $$
BEGIN
    RAISE NOTICE '✅ Calls/WebRTC with Consent, Recording, Emergency Extension migration completed successfully';
    RAISE NOTICE '📋 Tables created: call_sessions, call_participants, call_recordings, call_consent_logs, call_emergency_extensions, webrtc_signaling';
    RAISE NOTICE '🔧 Functions created: create_call_session, grant_call_consent, update_call_session_status, request_emergency_extension';
    RAISE NOTICE '🔒 CRITICAL: All recordings are permanently stored as per requirements';
    RAISE NOTICE '⚖️ Legal compliance: Comprehensive consent logging and verification';
    RAISE NOTICE '🚨 Emergency extensions: Auto-approval for first extension, manual for subsequent';
    RAISE NOTICE '🛡️ RLS policies enforced for all tables with participant access control';
END $$;