-- ============================================================
-- PART 2: CALL SYSTEM ENHANCEMENTS
-- Safe creation of call enhancement tables
-- ============================================================

-- ============================================================
-- CALL NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS call_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    call_session_id UUID REFERENCES call_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Notification details
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('incoming_call', 'missed_call', 'call_ended', 'emergency_escalation', 'quality_issue')),
    title VARCHAR(200) NOT NULL,
    message TEXT,
    
    -- Delivery tracking
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Priority and urgency
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent', 'emergency')),
    requires_action BOOLEAN DEFAULT false,
    
    -- Channels
    send_email BOOLEAN DEFAULT true,
    send_sms BOOLEAN DEFAULT false,
    send_push BOOLEAN DEFAULT true,
    send_in_app BOOLEAN DEFAULT true,
    
    -- System fields
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- READER AVAILABILITY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS reader_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reader identification
    reader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Availability schedule
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday, 6 = Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Timezone handling
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Availability status
    is_available BOOLEAN DEFAULT true,
    is_emergency_available BOOLEAN DEFAULT false,
    
    -- Break and unavailable periods
    break_start_time TIME,
    break_end_time TIME,
    unavailable_from TIMESTAMP WITH TIME ZONE,
    unavailable_until TIMESTAMP WITH TIME ZONE,
    unavailable_reason TEXT,
    
    -- Capacity management
    max_concurrent_sessions INTEGER DEFAULT 1,
    current_session_count INTEGER DEFAULT 0,
    
    -- Booking preferences
    min_session_duration INTEGER DEFAULT 15, -- minutes
    max_session_duration INTEGER DEFAULT 120, -- minutes
    booking_buffer_minutes INTEGER DEFAULT 5,
    
    -- Automatic scheduling
    auto_accept_bookings BOOLEAN DEFAULT false,
    requires_approval BOOLEAN DEFAULT true,
    
    -- System fields
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_until DATE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    
    -- Constraints
    UNIQUE(reader_id, day_of_week, effective_from),
    CHECK (start_time < end_time),
    CHECK (break_start_time IS NULL OR break_end_time IS NOT NULL),
    CHECK (break_start_time IS NULL OR (break_start_time >= start_time AND break_end_time <= end_time))
);

-- ============================================================
-- CALL QUALITY METRICS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS call_quality_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    call_session_id UUID REFERENCES call_sessions(id) ON DELETE CASCADE,
    
    -- Technical metrics
    average_bitrate INTEGER,
    packet_loss_percentage DECIMAL(5,2),
    latency_ms INTEGER,
    jitter_ms INTEGER,
    
    -- Connection stability
    connection_drops INTEGER DEFAULT 0,
    reconnection_attempts INTEGER DEFAULT 0,
    total_disconnection_time INTEGER DEFAULT 0, -- seconds
    
    -- Audio/Video quality
    audio_quality_score DECIMAL(3,2),
    video_quality_score DECIMAL(3,2),
    overall_quality_score DECIMAL(3,2),
    
    -- User experience metrics
    user_reported_issues JSONB DEFAULT '[]'::jsonb,
    automatic_quality_adjustments INTEGER DEFAULT 0,
    
    -- Network information
    client_ip INET,
    reader_ip INET,
    client_connection_type VARCHAR(50),
    reader_connection_type VARCHAR(50),
    
    -- Timestamps
    measurement_start TIMESTAMP WITH TIME ZONE,
    measurement_end TIMESTAMP WITH TIME ZONE,
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- INDEXES FOR CALL TABLES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_call_notifications_user_id ON call_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_call_notifications_unread ON call_notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_reader_availability_reader_id ON reader_availability(reader_id);
CREATE INDEX IF NOT EXISTS idx_reader_availability_day ON reader_availability(day_of_week, is_available);
CREATE INDEX IF NOT EXISTS idx_call_quality_metrics_session_id ON call_quality_metrics(call_session_id);

-- ============================================================
-- RLS POLICIES FOR CALL TABLES
-- ============================================================

-- Enable RLS
ALTER TABLE call_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_quality_metrics ENABLE ROW LEVEL SECURITY;

-- Call notifications (user privacy)
DROP POLICY IF EXISTS "Users can view their own notifications" ON call_notifications;
CREATE POLICY "Users can view their own notifications" ON call_notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create notifications" ON call_notifications;
CREATE POLICY "System can create notifications" ON call_notifications
    FOR INSERT WITH CHECK (true);

-- Reader availability
DROP POLICY IF EXISTS "Readers can manage their availability" ON reader_availability;
CREATE POLICY "Readers can manage their availability" ON reader_availability
    FOR ALL USING (auth.uid() = reader_id);

DROP POLICY IF EXISTS "Anyone can view reader availability" ON reader_availability;
CREATE POLICY "Anyone can view reader availability" ON reader_availability
    FOR SELECT USING (is_available = true);

-- Call quality metrics (admin only)
DROP POLICY IF EXISTS "Admins can view quality metrics" ON call_quality_metrics;
CREATE POLICY "Admins can view quality metrics" ON call_quality_metrics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'monitor')
        )
    );

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
SELECT 
    '✅ PART 2 COMPLETED: Call System Enhancements' as status,
    'Created: call_notifications, reader_availability, call_quality_metrics' as tables_created,
    timezone('utc'::text, now()) as completed_at; 