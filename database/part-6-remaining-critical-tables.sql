-- ============================================================
-- PART 6: REMAINING CRITICAL TABLES
-- Creating the 9 missing tables identified by QA report
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CARD INTERPRETATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS card_interpretations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    card_id UUID REFERENCES tarot_cards(id) ON DELETE CASCADE,
    reading_id UUID REFERENCES tarot_readings(id) ON DELETE CASCADE,
    
    -- Position context
    position_name VARCHAR(100),
    position_number INTEGER,
    is_reversed BOOLEAN DEFAULT false,
    
    -- Interpretation details
    interpretation_text TEXT NOT NULL,
    keywords TEXT[],
    advice TEXT,
    
    -- AI enhancement
    ai_generated BOOLEAN DEFAULT false,
    ai_model VARCHAR(100),
    confidence_score DECIMAL(3,2),
    
    -- Reader customization
    reader_notes TEXT,
    custom_meaning TEXT,
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- READING CARDS TABLE (Junction table)
-- ============================================================
CREATE TABLE IF NOT EXISTS reading_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    reading_id UUID REFERENCES tarot_readings(id) ON DELETE CASCADE,
    card_id UUID REFERENCES tarot_cards(id) ON DELETE CASCADE,
    
    -- Card position in spread
    position_number INTEGER NOT NULL,
    position_name VARCHAR(100),
    
    -- Card state
    is_reversed BOOLEAN DEFAULT false,
    drawn_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    
    -- Visual positioning
    x_coordinate DECIMAL(5,2) DEFAULT 0,
    y_coordinate DECIMAL(5,2) DEFAULT 0,
    rotation_angle DECIMAL(5,2) DEFAULT 0,
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    
    -- Constraints
    UNIQUE(reading_id, position_number)
);

-- ============================================================
-- USER SPREADS TABLE (Custom spreads by users)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_spreads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ownership
    creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Spread details
    name VARCHAR(200) NOT NULL,
    description TEXT,
    instructions TEXT,
    
    -- Spread configuration
    total_cards INTEGER NOT NULL CHECK (total_cards BETWEEN 1 AND 78),
    spread_layout JSONB NOT NULL, -- Array of position objects
    
    -- Categories and tags
    category VARCHAR(100) DEFAULT 'custom',
    tags TEXT[],
    difficulty_level VARCHAR(20) DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    
    -- Sharing and visibility
    is_public BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Usage statistics
    usage_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    total_ratings INTEGER DEFAULT 0,
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- APPROVAL WORKFLOWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Workflow identification
    workflow_name VARCHAR(100) NOT NULL,
    workflow_type VARCHAR(50) NOT NULL, -- reader_approval, content_approval, payout_approval
    
    -- Target resource
    resource_type VARCHAR(50) NOT NULL, -- user, service, content, transaction
    resource_id UUID NOT NULL,
    
    -- Requestor information
    requested_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    request_reason TEXT,
    request_data JSONB DEFAULT '{}'::jsonb,
    
    -- Approval process
    current_step INTEGER DEFAULT 1,
    total_steps INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    
    -- Approver information
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    review_notes TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Priority and deadlines
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    deadline TIMESTAMP WITH TIME ZONE,
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- SYSTEM LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Log identification
    log_level VARCHAR(20) NOT NULL CHECK (log_level IN ('debug', 'info', 'warn', 'error', 'fatal')),
    log_category VARCHAR(50) NOT NULL, -- auth, payment, api, database, security
    
    -- Event details
    event_type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    
    -- Context information
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    
    -- Request information
    request_method VARCHAR(10),
    request_url TEXT,
    request_headers JSONB,
    response_status INTEGER,
    response_time INTEGER, -- milliseconds
    
    -- System information
    server_instance VARCHAR(50),
    environment VARCHAR(20) DEFAULT 'production',
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- AUDIT TRAILS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_trails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Action details
    action_type VARCHAR(50) NOT NULL, -- create, update, delete, view, login, logout
    table_name VARCHAR(100),
    record_id UUID,
    
    -- User information
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_role VARCHAR(50),
    user_email VARCHAR(255),
    
    -- Change tracking
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Context
    action_reason TEXT,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    
    -- System information
    environment VARCHAR(20) DEFAULT 'production',
    application_version VARCHAR(20),
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- WORKING HOURS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS working_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reader identification
    reader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Schedule details
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Timezone handling
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Break periods
    break_start_time TIME,
    break_end_time TIME,
    break_duration_minutes INTEGER DEFAULT 0,
    
    -- Availability status
    is_available BOOLEAN DEFAULT true,
    is_emergency_available BOOLEAN DEFAULT false,
    
    -- Capacity management
    max_concurrent_sessions INTEGER DEFAULT 1,
    booking_buffer_minutes INTEGER DEFAULT 15,
    
    -- Override periods
    override_start TIMESTAMP WITH TIME ZONE,
    override_end TIMESTAMP WITH TIME ZONE,
    override_reason TEXT,
    
    -- System fields
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    
    -- Constraints
    UNIQUE(reader_id, day_of_week, effective_from),
    CHECK (start_time < end_time),
    CHECK (break_start_time IS NULL OR (break_start_time >= start_time AND break_end_time <= end_time))
);

-- ============================================================
-- SPECIAL RATES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS special_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Rate identification
    reader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    
    -- Rate details
    rate_name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Pricing
    special_price DECIMAL(10,2) NOT NULL CHECK (special_price >= 0),
    original_price DECIMAL(10,2),
    discount_percentage DECIMAL(5,2),
    
    -- Validity
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    valid_until TIMESTAMP WITH TIME ZONE,
    
    -- Conditions
    minimum_duration INTEGER, -- minutes
    maximum_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    
    -- Eligibility
    client_tier VARCHAR(50), -- new, regular, premium, vip
    requires_approval BOOLEAN DEFAULT false,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- USER PREFERENCES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User identification
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- Communication preferences
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    push_notifications BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    
    -- Reading preferences
    preferred_reading_types TEXT[] DEFAULT ARRAY['general'],
    preferred_spread_types TEXT[] DEFAULT ARRAY['three_card'],
    ai_enhancement_enabled BOOLEAN DEFAULT true,
    
    -- Privacy settings
    profile_visibility VARCHAR(20) DEFAULT 'public' CHECK (profile_visibility IN ('public', 'limited', 'private')),
    show_online_status BOOLEAN DEFAULT true,
    allow_direct_messages BOOLEAN DEFAULT true,
    
    -- Language and locale
    preferred_language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
    time_format VARCHAR(20) DEFAULT '24h',
    
    -- Accessibility
    high_contrast_mode BOOLEAN DEFAULT false,
    large_text_mode BOOLEAN DEFAULT false,
    screen_reader_support BOOLEAN DEFAULT false,
    
    -- Booking preferences
    auto_accept_bookings BOOLEAN DEFAULT false,
    require_advance_booking_hours INTEGER DEFAULT 1,
    default_session_duration INTEGER DEFAULT 30, -- minutes
    
    -- Payment preferences
    preferred_payment_methods TEXT[] DEFAULT ARRAY['stripe'],
    auto_charge_enabled BOOLEAN DEFAULT false,
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================
-- INDEXES FOR ALL NEW TABLES
-- ============================================================

-- Card interpretations indexes
CREATE INDEX IF NOT EXISTS idx_card_interpretations_card_id ON card_interpretations(card_id);
CREATE INDEX IF NOT EXISTS idx_card_interpretations_reading_id ON card_interpretations(reading_id);

-- Reading cards indexes
CREATE INDEX IF NOT EXISTS idx_reading_cards_reading_id ON reading_cards(reading_id);
CREATE INDEX IF NOT EXISTS idx_reading_cards_card_id ON reading_cards(card_id);

-- User spreads indexes
CREATE INDEX IF NOT EXISTS idx_user_spreads_creator_id ON user_spreads(creator_id);
CREATE INDEX IF NOT EXISTS idx_user_spreads_public ON user_spreads(is_public) WHERE is_public = true;

-- Approval workflows indexes
CREATE INDEX IF NOT EXISTS idx_approval_workflows_status ON approval_workflows(status);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_assigned_to ON approval_workflows(assigned_to);

-- System logs indexes
CREATE INDEX IF NOT EXISTS idx_system_logs_level_category ON system_logs(log_level, log_category);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);

-- Audit trails indexes
CREATE INDEX IF NOT EXISTS idx_audit_trails_user_id ON audit_trails(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trails_table_record ON audit_trails(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_trails_created_at ON audit_trails(created_at);

-- Working hours indexes
CREATE INDEX IF NOT EXISTS idx_working_hours_reader_id ON working_hours(reader_id);
CREATE INDEX IF NOT EXISTS idx_working_hours_day ON working_hours(day_of_week, is_available);

-- Special rates indexes
CREATE INDEX IF NOT EXISTS idx_special_rates_reader_service ON special_rates(reader_id, service_id);
CREATE INDEX IF NOT EXISTS idx_special_rates_active ON special_rates(is_active) WHERE is_active = true;

-- User preferences indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- ============================================================
-- RLS POLICIES FOR ALL NEW TABLES
-- ============================================================

-- Enable RLS
ALTER TABLE card_interpretations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_spreads ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Card interpretations policies
DROP POLICY IF EXISTS "Users can view interpretations for their readings" ON card_interpretations;
CREATE POLICY "Users can view interpretations for their readings" ON card_interpretations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tarot_readings tr
            WHERE tr.id = reading_id 
            AND (tr.user_id = auth.uid() OR tr.reader_id = auth.uid())
        )
    );

-- Reading cards policies
DROP POLICY IF EXISTS "Users can view cards for their readings" ON reading_cards;
CREATE POLICY "Users can view cards for their readings" ON reading_cards
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tarot_readings tr
            WHERE tr.id = reading_id 
            AND (tr.user_id = auth.uid() OR tr.reader_id = auth.uid())
        )
    );

-- User spreads policies
DROP POLICY IF EXISTS "Users can manage their own spreads" ON user_spreads;
CREATE POLICY "Users can manage their own spreads" ON user_spreads
    FOR ALL USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Anyone can view public spreads" ON user_spreads;
CREATE POLICY "Anyone can view public spreads" ON user_spreads
    FOR SELECT USING (is_public = true AND is_approved = true);

-- Approval workflows policies (admin only)
DROP POLICY IF EXISTS "Admins can manage approval workflows" ON approval_workflows;
CREATE POLICY "Admins can manage approval workflows" ON approval_workflows
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- System logs policies (admin only)
DROP POLICY IF EXISTS "Admins can view system logs" ON system_logs;
CREATE POLICY "Admins can view system logs" ON system_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Audit trails policies (admin only)
DROP POLICY IF EXISTS "Admins can view audit trails" ON audit_trails;
CREATE POLICY "Admins can view audit trails" ON audit_trails
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Working hours policies
DROP POLICY IF EXISTS "Readers can manage their working hours" ON working_hours;
CREATE POLICY "Readers can manage their working hours" ON working_hours
    FOR ALL USING (auth.uid() = reader_id);

DROP POLICY IF EXISTS "Anyone can view available working hours" ON working_hours;
CREATE POLICY "Anyone can view available working hours" ON working_hours
    FOR SELECT USING (is_available = true);

-- Special rates policies
DROP POLICY IF EXISTS "Readers can manage their special rates" ON special_rates;
CREATE POLICY "Readers can manage their special rates" ON special_rates
    FOR ALL USING (auth.uid() = reader_id);

DROP POLICY IF EXISTS "Anyone can view active special rates" ON special_rates;
CREATE POLICY "Anyone can view active special rates" ON special_rates
    FOR SELECT USING (is_active = true);

-- User preferences policies
DROP POLICY IF EXISTS "Users can manage their own preferences" ON user_preferences;
CREATE POLICY "Users can manage their own preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
SELECT 
    '✅ PART 6 COMPLETED: Remaining Critical Tables' as status,
    'Created: 9 critical tables (card_interpretations, reading_cards, user_spreads, approval_workflows, system_logs, audit_trails, working_hours, special_rates, user_preferences)' as tables_created,
    timezone('utc'::text, now()) as completed_at; 