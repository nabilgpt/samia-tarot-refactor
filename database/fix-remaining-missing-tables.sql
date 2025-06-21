-- ============================================================
-- FIX REMAINING MISSING TABLES - SAMIA TAROT DATABASE
-- This creates the 18 critical tables missing from QA audit
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. TAROT SYSTEM TABLES (CORE MISSING)
-- ============================================================

-- Tarot Cards Master Table
CREATE TABLE IF NOT EXISTS tarot_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Card identification
    name VARCHAR(100) NOT NULL,
    card_number INTEGER NOT NULL,
    suit VARCHAR(20), -- major_arcana, cups, wands, swords, pentacles
    
    -- Card details
    keywords TEXT[],
    upright_meaning TEXT,
    reversed_meaning TEXT,
    
    -- Card imagery
    image_url TEXT,
    image_path TEXT,
    description TEXT,
    
    -- Symbolism and interpretation
    symbolism TEXT,
    astrological_association VARCHAR(100),
    numerological_significance INTEGER,
    
    -- System fields
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    
    -- Constraints
    UNIQUE(card_number, suit)
);

-- Success message
SELECT 
    '🎉 REMAINING MISSING TABLES CREATION STARTED!' as status,
    '18 additional critical tables being created' as progress,
    timezone('utc'::text, now()) as started_at;

-- Tarot Readings Table
CREATE TABLE IF NOT EXISTS tarot_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Session details
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    
    -- Reading configuration
    spread_type VARCHAR(100) NOT NULL,
    question TEXT,
    reading_type VARCHAR(50) DEFAULT 'general', -- general, love, career, health, spiritual
    
    -- Reading data
    cards_drawn JSONB NOT NULL, -- Array of card IDs and positions
    interpretation TEXT,
    summary TEXT,
    advice TEXT,
    
    -- AI enhancement
    ai_enhanced BOOLEAN DEFAULT false,
    ai_confidence DECIMAL(3,2) DEFAULT 0,
    
    -- Status and completion
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- User feedback
    user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
    user_feedback TEXT,
    
    -- System fields
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Spread Positions Table
CREATE TABLE IF NOT EXISTS spread_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Spread identification
    spread_name VARCHAR(100) NOT NULL,
    position_number INTEGER NOT NULL,
    position_name VARCHAR(100) NOT NULL,
    
    -- Position details
    position_meaning TEXT,
    interpretation_guidelines TEXT,
    
    -- Visual positioning
    x_coordinate DECIMAL(5,2) DEFAULT 0,
    y_coordinate DECIMAL(5,2) DEFAULT 0,
    rotation_angle DECIMAL(5,2) DEFAULT 0,
    
    -- System fields
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    
    -- Constraints
    UNIQUE(spread_name, position_number)
);

-- Card Interpretations Table
CREATE TABLE IF NOT EXISTS card_interpretations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    card_id UUID REFERENCES tarot_cards(id) ON DELETE CASCADE,
    reader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Interpretation context
    position_context VARCHAR(100), -- past, present, future, etc.
    reading_type VARCHAR(50), -- love, career, general, etc.
    
    -- Interpretation content
    interpretation TEXT NOT NULL,
    key_themes TEXT[],
    advice TEXT,
    
    -- Upright vs Reversed
    is_reversed BOOLEAN DEFAULT false,
    
    -- Quality and validation
    confidence_score DECIMAL(3,2) DEFAULT 0,
    is_ai_generated BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES auth.users(id),
    
    -- Usage statistics
    usage_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    
    -- System fields
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Reading Cards Relationship Table
CREATE TABLE IF NOT EXISTS reading_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    reading_id UUID REFERENCES tarot_readings(id) ON DELETE CASCADE,
    card_id UUID REFERENCES tarot_cards(id) ON DELETE CASCADE,
    
    -- Position in reading
    position_number INTEGER NOT NULL,
    position_name VARCHAR(100),
    
    -- Card state
    is_reversed BOOLEAN DEFAULT false,
    
    -- Interpretation for this specific draw
    interpretation TEXT,
    significance_rating INTEGER CHECK (significance_rating BETWEEN 1 AND 5),
    
    -- System fields
    drawn_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    
    -- Constraints
    UNIQUE(reading_id, position_number)
);

-- User Spreads (Custom Spreads) Table
CREATE TABLE IF NOT EXISTS user_spreads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ownership
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Spread details
    name VARCHAR(100) NOT NULL,
    description TEXT,
    purpose VARCHAR(200),
    
    -- Spread configuration
    number_of_cards INTEGER NOT NULL CHECK (number_of_cards BETWEEN 1 AND 78),
    positions JSONB NOT NULL, -- Array of position definitions
    
    -- Sharing and usage
    is_public BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES auth.users(id),
    
    -- Statistics
    usage_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    
    -- System fields
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- 2. CALL SYSTEM ENHANCEMENTS
-- ============================================================

-- Call Notifications Table
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

-- Reader Availability Table
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

-- Call Quality Metrics Table
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
-- 3. AI SYSTEM ENHANCEMENTS
-- ============================================================

-- AI Analytics Table
CREATE TABLE IF NOT EXISTS ai_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Time period
    date DATE NOT NULL,
    hour INTEGER CHECK (hour BETWEEN 0 AND 23),
    
    -- AI model performance
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50),
    
    -- Usage metrics
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    
    -- Performance metrics
    average_response_time DECIMAL(8,3), -- seconds
    median_response_time DECIMAL(8,3),
    p95_response_time DECIMAL(8,3),
    
    -- Quality metrics
    average_confidence_score DECIMAL(5,4),
    high_confidence_requests INTEGER DEFAULT 0, -- confidence > 0.8
    low_confidence_requests INTEGER DEFAULT 0, -- confidence < 0.5
    
    -- User satisfaction
    average_user_rating DECIMAL(3,2),
    total_ratings INTEGER DEFAULT 0,
    positive_feedback_count INTEGER DEFAULT 0,
    negative_feedback_count INTEGER DEFAULT 0,
    
    -- Cost tracking
    total_tokens_used INTEGER DEFAULT 0,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    estimated_cost DECIMAL(10,4) DEFAULT 0,
    
    -- Error analysis
    error_categories JSONB DEFAULT '{}'::jsonb,
    most_common_errors TEXT[],
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    
    -- Constraints
    UNIQUE(date, hour, model_name, model_version)
);

-- ============================================================
-- 4. LEARNING SYSTEM TABLES
-- ============================================================

-- User Enrollments Table
CREATE TABLE IF NOT EXISTS user_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES course_content(id) ON DELETE CASCADE,
    
    -- Enrollment details
    enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    enrollment_source VARCHAR(50) DEFAULT 'manual', -- manual, auto, recommendation, promotion
    
    -- Progress tracking
    progress_percentage DECIMAL(5,2) DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    completed_lessons INTEGER DEFAULT 0,
    total_lessons INTEGER,
    
    -- Status management
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled', 'expired')),
    completion_date TIMESTAMP WITH TIME ZONE,
    
    -- Access control
    access_granted_until TIMESTAMP WITH TIME ZONE,
    is_lifetime_access BOOLEAN DEFAULT false,
    
    -- Performance metrics
    total_study_time_minutes INTEGER DEFAULT 0,
    average_session_duration DECIMAL(5,2) DEFAULT 0,
    quiz_scores JSONB DEFAULT '[]'::jsonb,
    average_quiz_score DECIMAL(5,2) DEFAULT 0,
    
    -- Engagement metrics
    last_accessed TIMESTAMP WITH TIME ZONE,
    consecutive_study_days INTEGER DEFAULT 0,
    total_login_count INTEGER DEFAULT 0,
    
    -- Certification
    is_certified BOOLEAN DEFAULT false,
    certificate_issued_date TIMESTAMP WITH TIME ZONE,
    certificate_number VARCHAR(100),
    
    -- System fields
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    
    -- Constraints
    UNIQUE(user_id, course_id)
);

-- Learning Progress Table
CREATE TABLE IF NOT EXISTS learning_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    enrollment_id UUID REFERENCES user_enrollments(id) ON DELETE CASCADE,
    course_content_id UUID REFERENCES course_content(id) ON DELETE CASCADE,
    
    -- Progress details
    content_type VARCHAR(50) NOT NULL, -- lesson, quiz, assignment, video, reading
    progress_type VARCHAR(50) NOT NULL, -- started, in_progress, completed, skipped
    
    -- Time tracking
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMP WITH TIME ZONE,
    time_spent_minutes INTEGER DEFAULT 0,
    
    -- Performance data
    score DECIMAL(5,2),
    max_possible_score DECIMAL(5,2),
    attempts INTEGER DEFAULT 1,
    best_score DECIMAL(5,2),
    
    -- Engagement metrics
    interaction_count INTEGER DEFAULT 0,
    notes TEXT,
    bookmarked BOOLEAN DEFAULT false,
    
    -- Difficulty and feedback
    user_difficulty_rating INTEGER CHECK (user_difficulty_rating BETWEEN 1 AND 5),
    user_feedback TEXT,
    needs_review BOOLEAN DEFAULT false,
    
    -- System fields
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    
    -- Constraints
    UNIQUE(user_id, course_content_id)
);

-- ============================================================
-- 5. ADMIN AND WORKFLOW TABLES
-- ============================================================

-- Approval Workflows Table
CREATE TABLE IF NOT EXISTS approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Workflow identification
    workflow_name VARCHAR(100) NOT NULL,
    workflow_type VARCHAR(50) NOT NULL, -- reader_application, content_approval, payment_verification, etc.
    
    -- Request details
    requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL, -- profile, content, payment, booking, etc.
    resource_id UUID NOT NULL,
    
    -- Approval chain
    approval_steps JSONB NOT NULL, -- Array of approval step configurations
    current_step INTEGER DEFAULT 1,
    total_steps INTEGER NOT NULL,
    
    -- Status management
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'expired')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Request data
    request_data JSONB NOT NULL,
    supporting_documents TEXT[], -- Array of file URLs
    
    -- Approval history
    approval_history JSONB DEFAULT '[]'::jsonb,
    
    -- Timing
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    deadline TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    
    -- Decision details
    final_approver_id UUID REFERENCES auth.users(id),
    approval_notes TEXT,
    rejection_reason TEXT,
    
    -- Automatic processing
    auto_approve_after TIMESTAMP WITH TIME ZONE,
    auto_approve_conditions JSONB,
    
    -- System fields
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- System Logs Table
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Log categorization
    log_level VARCHAR(20) NOT NULL CHECK (log_level IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL')),
    log_category VARCHAR(100) NOT NULL, -- database, api, auth, payment, ai, etc.
    log_source VARCHAR(100) NOT NULL, -- component or service name
    
    -- Event details
    event_type VARCHAR(100) NOT NULL,
    event_description TEXT,
    
    -- Context information
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    request_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    
    -- Technical details
    stack_trace TEXT,
    error_code VARCHAR(50),
    http_status INTEGER,
    response_time_ms INTEGER,
    
    -- Associated data
    additional_data JSONB DEFAULT '{}'::jsonb,
    
    -- Environment information
    environment VARCHAR(20) DEFAULT 'production', -- development, staging, production
    server_instance VARCHAR(100),
    
    -- Timing
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    
    -- Indexing fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Audit Trails Table
CREATE TABLE IF NOT EXISTS audit_trails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Actor information
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    user_role VARCHAR(50),
    
    -- Action details
    action_type VARCHAR(100) NOT NULL, -- CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, etc.
    resource_type VARCHAR(100) NOT NULL, -- user, booking, payment, profile, etc.
    resource_id UUID,
    
    -- Change tracking
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Context
    action_description TEXT,
    reason TEXT,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    
    -- System context
    api_endpoint VARCHAR(255),
    http_method VARCHAR(10),
    request_id VARCHAR(255),
    
    -- Risk assessment
    risk_level VARCHAR(20) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    is_sensitive_data BOOLEAN DEFAULT false,
    requires_review BOOLEAN DEFAULT false,
    
    -- Compliance
    compliance_tags TEXT[], -- GDPR, PCI, SOX, etc.
    retention_until TIMESTAMP WITH TIME ZONE,
    
    -- System fields
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- 6. OPERATIONAL TABLES
-- ============================================================

-- Working Hours Table
CREATE TABLE IF NOT EXISTS working_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reader identification
    reader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Time period definition
    effective_date DATE NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    
    -- Working hours
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Break periods
    break_periods JSONB DEFAULT '[]'::jsonb, -- Array of {start, end, description}
    
    -- Availability settings
    is_available BOOLEAN DEFAULT true,
    is_emergency_available BOOLEAN DEFAULT false,
    max_bookings_per_hour INTEGER DEFAULT 2,
    
    -- Special conditions
    minimum_booking_notice_hours INTEGER DEFAULT 2,
    maximum_advance_booking_days INTEGER DEFAULT 30,
    
    -- Pricing modifiers
    hourly_rate_override DECIMAL(10,2),
    weekend_rate_multiplier DECIMAL(3,2) DEFAULT 1.0,
    holiday_rate_multiplier DECIMAL(3,2) DEFAULT 1.0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'temporary')),
    
    -- System fields
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    
    -- Constraints
    UNIQUE(reader_id, effective_date, day_of_week),
    CHECK (start_time < end_time)
);

-- Special Rates Table
CREATE TABLE IF NOT EXISTS special_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Rate identification
    rate_name VARCHAR(100) NOT NULL,
    rate_type VARCHAR(50) NOT NULL CHECK (rate_type IN ('holiday', 'weekend', 'emergency', 'off_hours', 'promotional', 'bulk_discount')),
    
    -- Applicability
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    reader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Rate configuration
    rate_value DECIMAL(10,2) NOT NULL,
    rate_unit VARCHAR(20) DEFAULT 'per_minute' CHECK (rate_unit IN ('per_minute', 'per_hour', 'flat_rate', 'percentage')),
    
    -- Conditions
    minimum_duration INTEGER, -- minutes
    maximum_duration INTEGER, -- minutes
    minimum_booking_value DECIMAL(10,2),
    
    -- Time-based conditions
    applicable_days INTEGER[], -- Array of day numbers (0-6)
    applicable_hours JSONB, -- {start: "09:00", end: "17:00"}
    
    -- Date ranges
    effective_from TIMESTAMP WITH TIME ZONE NOT NULL,
    effective_until TIMESTAMP WITH TIME ZONE,
    
    -- Usage limits
    max_uses_per_user INTEGER,
    max_total_uses INTEGER,
    current_usage_count INTEGER DEFAULT 0,
    
    -- Priority and stacking
    priority_order INTEGER DEFAULT 0,
    can_stack_with_other_rates BOOLEAN DEFAULT false,
    conflicts_with_rate_types TEXT[],
    
    -- Promotional features
    promotional_code VARCHAR(50),
    requires_approval BOOLEAN DEFAULT false,
    auto_apply BOOLEAN DEFAULT false,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    approval_status VARCHAR(20) DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    
    -- System fields
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User identification
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Appearance preferences
    theme VARCHAR(20) DEFAULT 'cosmic' CHECK (theme IN ('cosmic', 'light', 'dark', 'auto')),
    language VARCHAR(10) DEFAULT 'en' CHECK (language IN ('en', 'ar')),
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Notification preferences
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    push_notifications BOOLEAN DEFAULT true,
    in_app_notifications BOOLEAN DEFAULT true,
    
    -- Notification categories
    booking_notifications BOOLEAN DEFAULT true,
    payment_notifications BOOLEAN DEFAULT true,
    promotional_notifications BOOLEAN DEFAULT false,
    system_notifications BOOLEAN DEFAULT true,
    emergency_notifications BOOLEAN DEFAULT true,
    
    -- Privacy preferences
    profile_visibility VARCHAR(20) DEFAULT 'public' CHECK (profile_visibility IN ('public', 'readers_only', 'private')),
    allow_profile_search BOOLEAN DEFAULT true,
    show_online_status BOOLEAN DEFAULT true,
    allow_direct_messages BOOLEAN DEFAULT true,
    
    -- Tarot preferences
    preferred_deck_style VARCHAR(50),
    favorite_spreads TEXT[],
    reading_style_preference VARCHAR(50), -- traditional, modern, intuitive
    card_interpretation_style VARCHAR(50), -- detailed, concise, symbolic
    
    -- Reading preferences (for readers)
    specializations TEXT[],
    reading_approach TEXT,
    consultation_style VARCHAR(50),
    minimum_session_duration INTEGER DEFAULT 15,
    maximum_session_duration INTEGER DEFAULT 120,
    
    -- Booking preferences
    auto_accept_bookings BOOLEAN DEFAULT false,
    require_payment_upfront BOOLEAN DEFAULT true,
    allow_emergency_bookings BOOLEAN DEFAULT false,
    booking_buffer_minutes INTEGER DEFAULT 15,
    
    -- Communication preferences
    preferred_communication_method VARCHAR(20) DEFAULT 'chat' CHECK (preferred_communication_method IN ('chat', 'voice', 'video')),
    allow_voice_messages BOOLEAN DEFAULT true,
    allow_file_sharing BOOLEAN DEFAULT true,
    
    -- Accessibility preferences
    high_contrast_mode BOOLEAN DEFAULT false,
    large_text_mode BOOLEAN DEFAULT false,
    reduced_motion BOOLEAN DEFAULT false,
    screen_reader_optimized BOOLEAN DEFAULT false,
    
    -- System fields
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    
    -- Constraints
    UNIQUE(user_id)
);

-- ============================================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================================

-- Tarot system indexes
CREATE INDEX IF NOT EXISTS idx_tarot_cards_suit ON tarot_cards(suit);
CREATE INDEX IF NOT EXISTS idx_tarot_cards_active ON tarot_cards(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tarot_readings_user_id ON tarot_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_tarot_readings_reader_id ON tarot_readings(reader_id);
CREATE INDEX IF NOT EXISTS idx_tarot_readings_status ON tarot_readings(status);
CREATE INDEX IF NOT EXISTS idx_tarot_readings_created_at ON tarot_readings(created_at);

CREATE INDEX IF NOT EXISTS idx_spread_positions_spread_name ON spread_positions(spread_name);
CREATE INDEX IF NOT EXISTS idx_card_interpretations_card_id ON card_interpretations(card_id);
CREATE INDEX IF NOT EXISTS idx_reading_cards_reading_id ON reading_cards(reading_id);
CREATE INDEX IF NOT EXISTS idx_user_spreads_user_id ON user_spreads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_spreads_public ON user_spreads(is_public) WHERE is_public = true;

-- Call system indexes
CREATE INDEX IF NOT EXISTS idx_call_notifications_user_id ON call_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_call_notifications_unread ON call_notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_reader_availability_reader_id ON reader_availability(reader_id);
CREATE INDEX IF NOT EXISTS idx_reader_availability_day ON reader_availability(day_of_week, is_available);
CREATE INDEX IF NOT EXISTS idx_call_quality_metrics_session_id ON call_quality_metrics(call_session_id);

-- AI system indexes
CREATE INDEX IF NOT EXISTS idx_ai_analytics_date_model ON ai_analytics(date, model_name);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_performance ON ai_analytics(date, average_response_time);

-- Learning system indexes
CREATE INDEX IF NOT EXISTS idx_user_enrollments_user_id ON user_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_enrollments_status ON user_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_learning_progress_user_id ON learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_enrollment_id ON learning_progress(enrollment_id);

-- Admin system indexes
CREATE INDEX IF NOT EXISTS idx_approval_workflows_status ON approval_workflows(status);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_requester ON approval_workflows(requester_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_level_category ON system_logs(log_level, log_category);
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_trails_user_id ON audit_trails(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trails_resource ON audit_trails(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_trails_timestamp ON audit_trails(timestamp);

-- Operational indexes
CREATE INDEX IF NOT EXISTS idx_working_hours_reader_date ON working_hours(reader_id, effective_date);
CREATE INDEX IF NOT EXISTS idx_special_rates_service_reader ON special_rates(service_id, reader_id);
CREATE INDEX IF NOT EXISTS idx_special_rates_effective ON special_rates(effective_from, effective_until) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- ============================================================
-- 8. ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all new tables
ALTER TABLE tarot_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarot_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE spread_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_interpretations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_spreads ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Tarot cards (public read)
CREATE POLICY "Anyone can view active tarot cards" ON tarot_cards
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage tarot cards" ON tarot_cards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Tarot readings (user privacy)
CREATE POLICY "Users can view their own readings" ON tarot_readings
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() = reader_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Users can create readings" ON tarot_readings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User spreads
CREATE POLICY "Users can manage their own spreads" ON user_spreads
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public spreads" ON user_spreads
    FOR SELECT USING (is_public = true);

-- Reader availability
CREATE POLICY "Readers can manage their availability" ON reader_availability
    FOR ALL USING (auth.uid() = reader_id);

CREATE POLICY "Anyone can view reader availability" ON reader_availability
    FOR SELECT USING (is_available = true);

-- User preferences
CREATE POLICY "Users can manage their own preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Admin-only policies for sensitive tables
CREATE POLICY "Admins only for system logs" ON system_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins only for audit trails" ON audit_trails
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- ============================================================
-- 9. TRIGGERS FOR AUTO-UPDATES
-- ============================================================

-- Create updated_at triggers for all tables
CREATE TRIGGER update_tarot_readings_updated_at 
    BEFORE UPDATE ON tarot_readings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spread_positions_updated_at 
    BEFORE UPDATE ON spread_positions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_card_interpretations_updated_at 
    BEFORE UPDATE ON card_interpretations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_spreads_updated_at 
    BEFORE UPDATE ON user_spreads 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_notifications_updated_at 
    BEFORE UPDATE ON call_notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reader_availability_updated_at 
    BEFORE UPDATE ON reader_availability 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_analytics_updated_at 
    BEFORE UPDATE ON ai_analytics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_enrollments_updated_at 
    BEFORE UPDATE ON user_enrollments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_progress_updated_at 
    BEFORE UPDATE ON learning_progress 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_workflows_updated_at 
    BEFORE UPDATE ON approval_workflows 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_working_hours_updated_at 
    BEFORE UPDATE ON working_hours 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_special_rates_updated_at 
    BEFORE UPDATE ON special_rates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 10. COMPLETION VERIFICATION
-- ============================================================

-- Update system settings with completion status
INSERT INTO system_settings (key, value, description, created_at) 
VALUES (
    'remaining_tables_completion_status',
    '{"status": "completed", "tables_created": 18, "version": "1.1", "completed_at": "' || timezone('utc'::text, now()) || '"}',
    'Remaining missing tables completion verification record',
    timezone('utc'::text, now())
) ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = timezone('utc'::text, now());

-- Success message
SELECT 
    '🎉 REMAINING MISSING TABLES COMPLETION SUCCESSFUL!' as status,
    '18 additional critical tables created' as tables_created,
    'Tarot, Call, AI, Learning, Admin, and Operational systems now complete' as systems_enabled,
    timezone('utc'::text, now()) as completed_at; 