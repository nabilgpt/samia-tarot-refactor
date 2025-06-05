-- Phase 3: Advanced Business Management & Analytics System
-- Database Schema for Analytics, Business Intelligence, and Management Tools

-- =====================================================
-- ANALYTICS & METRICS TABLES
-- =====================================================

-- Reader Performance Analytics
CREATE TABLE reader_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Session Metrics
    total_sessions INTEGER DEFAULT 0,
    completed_sessions INTEGER DEFAULT 0,
    cancelled_sessions INTEGER DEFAULT 0,
    emergency_sessions INTEGER DEFAULT 0,
    
    -- Time Metrics
    total_session_duration INTEGER DEFAULT 0, -- in minutes
    average_session_duration DECIMAL(10,2) DEFAULT 0,
    peak_hour INTEGER, -- 0-23 representing hour of day
    
    -- Revenue Metrics
    total_revenue DECIMAL(12,2) DEFAULT 0,
    average_session_value DECIMAL(10,2) DEFAULT 0,
    tips_received DECIMAL(10,2) DEFAULT 0,
    
    -- Client Metrics
    new_clients INTEGER DEFAULT 0,
    returning_clients INTEGER DEFAULT 0,
    total_unique_clients INTEGER DEFAULT 0,
    
    -- Quality Metrics
    average_rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    response_time_avg INTEGER DEFAULT 0, -- in seconds
    
    -- AI Usage Metrics
    ai_readings_generated INTEGER DEFAULT 0,
    ai_audio_generated INTEGER DEFAULT 0,
    ai_confidence_avg DECIMAL(3,2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Platform Analytics
CREATE TABLE platform_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    
    -- User Metrics
    total_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    returning_users INTEGER DEFAULT 0,
    
    -- Reader Metrics
    total_readers INTEGER DEFAULT 0,
    active_readers INTEGER DEFAULT 0,
    new_readers INTEGER DEFAULT 0,
    
    -- Session Metrics
    total_sessions INTEGER DEFAULT 0,
    successful_sessions INTEGER DEFAULT 0,
    platform_session_duration INTEGER DEFAULT 0,
    
    -- Revenue Metrics
    total_platform_revenue DECIMAL(12,2) DEFAULT 0,
    commission_earned DECIMAL(12,2) DEFAULT 0,
    payment_processing_fees DECIMAL(10,2) DEFAULT 0,
    
    -- Geographic Data
    top_countries JSONB DEFAULT '[]',
    top_cities JSONB DEFAULT '[]',
    
    -- Service Metrics
    tarot_sessions INTEGER DEFAULT 0,
    chat_sessions INTEGER DEFAULT 0,
    voice_sessions INTEGER DEFAULT 0,
    emergency_sessions INTEGER DEFAULT 0,
    
    -- Conversion Metrics
    signup_to_booking_rate DECIMAL(5,2) DEFAULT 0,
    booking_completion_rate DECIMAL(5,2) DEFAULT 0,
    client_retention_rate DECIMAL(5,2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Real-time Session Tracking
CREATE TABLE session_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES reading_sessions(id) ON DELETE CASCADE,
    reader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Session Details
    session_type VARCHAR(50) NOT NULL, -- 'tarot', 'chat', 'voice', 'emergency'
    status VARCHAR(50) NOT NULL, -- 'active', 'completed', 'cancelled', 'error'
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    
    -- Quality Metrics
    connection_quality INTEGER, -- 1-5 scale
    audio_quality INTEGER, -- 1-5 scale
    video_quality INTEGER, -- 1-5 scale
    
    -- Technical Metrics
    device_type VARCHAR(50),
    browser VARCHAR(100),
    ip_address INET,
    location_country VARCHAR(100),
    location_city VARCHAR(100),
    
    -- Engagement Metrics
    messages_sent INTEGER DEFAULT 0,
    cards_drawn INTEGER DEFAULT 0,
    ai_interactions INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- BUSINESS MANAGEMENT TABLES
-- =====================================================

-- Reader Business Profiles
CREATE TABLE reader_business_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- Business Information
    business_name VARCHAR(255),
    business_type VARCHAR(100), -- 'individual', 'llc', 'corporation'
    tax_id VARCHAR(100),
    business_address JSONB,
    
    -- Financial Settings
    commission_rate DECIMAL(5,2) DEFAULT 20.00, -- Platform commission percentage
    payment_schedule VARCHAR(50) DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly'
    minimum_payout DECIMAL(10,2) DEFAULT 50.00,
    preferred_currency VARCHAR(3) DEFAULT 'USD',
    
    -- Banking Information (encrypted)
    bank_account_encrypted TEXT,
    paypal_email_encrypted TEXT,
    stripe_account_id VARCHAR(255),
    
    -- Business Settings
    auto_accept_bookings BOOLEAN DEFAULT false,
    booking_buffer_minutes INTEGER DEFAULT 15,
    max_daily_sessions INTEGER DEFAULT 10,
    working_hours JSONB DEFAULT '{}',
    time_zone VARCHAR(100),
    
    -- Customization
    custom_branding JSONB DEFAULT '{}',
    custom_booking_page_url VARCHAR(255),
    custom_domain VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Financial Transactions
CREATE TABLE financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES reading_sessions(id) ON DELETE SET NULL,
    
    -- Transaction Details
    transaction_type VARCHAR(50) NOT NULL, -- 'earning', 'commission', 'tip', 'refund', 'payout', 'fee'
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Payment Information
    payment_method VARCHAR(100),
    payment_processor VARCHAR(100), -- 'stripe', 'paypal', 'bank_transfer'
    processor_transaction_id VARCHAR(255),
    processor_fee DECIMAL(10,2) DEFAULT 0,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Client Relationship Management
CREATE TABLE client_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Relationship Metrics
    first_session_date DATE,
    last_session_date DATE,
    total_sessions INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    
    -- Client Preferences
    preferred_session_type VARCHAR(50),
    preferred_time_slots JSONB DEFAULT '[]',
    communication_preferences JSONB DEFAULT '{}',
    
    -- Notes and Tags
    reader_notes TEXT,
    client_tags JSONB DEFAULT '[]',
    
    -- Status
    relationship_status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'blocked'
    last_contact_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(reader_id, client_id)
);

-- Service Packages and Bundles
CREATE TABLE service_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Package Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    package_type VARCHAR(50) NOT NULL, -- 'bundle', 'subscription', 'course'
    
    -- Pricing
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Package Contents
    included_services JSONB NOT NULL DEFAULT '[]',
    session_count INTEGER,
    validity_days INTEGER, -- How long the package is valid
    
    -- Subscription Details (if applicable)
    billing_cycle VARCHAR(50), -- 'weekly', 'monthly', 'yearly'
    auto_renewal BOOLEAN DEFAULT false,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Client Package Purchases
CREATE TABLE client_package_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    package_id UUID REFERENCES service_packages(id) ON DELETE CASCADE,
    reader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Purchase Details
    purchase_price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_transaction_id UUID REFERENCES financial_transactions(id),
    
    -- Usage Tracking
    sessions_used INTEGER DEFAULT 0,
    sessions_remaining INTEGER,
    
    -- Validity
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'expired', 'cancelled', 'refunded'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CUSTOMIZATION & BRANDING TABLES
-- =====================================================

-- Custom Tarot Spreads
CREATE TABLE custom_tarot_spreads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Spread Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    card_count INTEGER NOT NULL,
    
    -- Spread Configuration
    positions JSONB NOT NULL, -- Array of position objects with name, meaning, coordinates
    layout_type VARCHAR(50) DEFAULT 'custom', -- 'linear', 'circular', 'cross', 'custom'
    
    -- Metadata
    difficulty_level VARCHAR(50) DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
    reading_time_minutes INTEGER DEFAULT 30,
    categories JSONB DEFAULT '[]', -- ['love', 'career', 'spiritual', etc.]
    
    -- Sharing
    is_public BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reader Customization Settings
CREATE TABLE reader_customizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- Branding
    brand_colors JSONB DEFAULT '{}', -- primary, secondary, accent colors
    logo_url VARCHAR(500),
    background_image_url VARCHAR(500),
    custom_css TEXT,
    
    -- Booking Page Customization
    booking_page_title VARCHAR(255),
    booking_page_description TEXT,
    welcome_message TEXT,
    booking_confirmation_message TEXT,
    
    -- Email Templates
    email_templates JSONB DEFAULT '{}',
    
    -- Social Media Links
    social_media_links JSONB DEFAULT '{}',
    
    -- Advanced Settings
    custom_domain VARCHAR(255),
    google_analytics_id VARCHAR(100),
    facebook_pixel_id VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INTEGRATION TABLES
-- =====================================================

-- Third-party Integrations
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Integration Details
    integration_type VARCHAR(100) NOT NULL, -- 'google_calendar', 'zoom', 'mailchimp', etc.
    integration_name VARCHAR(255) NOT NULL,
    
    -- Configuration
    config JSONB NOT NULL DEFAULT '{}',
    credentials_encrypted TEXT, -- Encrypted API keys/tokens
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'success', 'error'
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook Events
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
    
    -- Event Details
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    
    -- Processing
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processed', 'failed'
    processed_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- LEARNING MANAGEMENT SYSTEM TABLES
-- =====================================================

-- Courses
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Course Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    
    -- Content
    course_content JSONB NOT NULL DEFAULT '[]', -- Array of modules/lessons
    total_duration_minutes INTEGER DEFAULT 0,
    
    -- Pricing
    price DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Metadata
    difficulty_level VARCHAR(50) DEFAULT 'beginner',
    category VARCHAR(100),
    tags JSONB DEFAULT '[]',
    
    -- Media
    thumbnail_url VARCHAR(500),
    preview_video_url VARCHAR(500),
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'published', 'archived'
    is_featured BOOLEAN DEFAULT false,
    
    -- Stats
    enrollment_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Course Enrollments
CREATE TABLE course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Enrollment Details
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    price_paid DECIMAL(10,2) DEFAULT 0,
    payment_transaction_id UUID REFERENCES financial_transactions(id),
    
    -- Progress Tracking
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    completed_lessons JSONB DEFAULT '[]',
    current_lesson_id VARCHAR(100),
    
    -- Completion
    completed_at TIMESTAMP WITH TIME ZONE,
    certificate_issued BOOLEAN DEFAULT false,
    certificate_url VARCHAR(500),
    
    -- Status
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'cancelled', 'refunded'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(course_id, student_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Analytics Indexes
CREATE INDEX idx_reader_analytics_reader_date ON reader_analytics(reader_id, date);
CREATE INDEX idx_platform_analytics_date ON platform_analytics(date);
CREATE INDEX idx_session_tracking_session_id ON session_tracking(session_id);
CREATE INDEX idx_session_tracking_reader_id ON session_tracking(reader_id);

-- Business Management Indexes
CREATE INDEX idx_financial_transactions_reader_id ON financial_transactions(reader_id);
CREATE INDEX idx_financial_transactions_session_id ON financial_transactions(session_id);
CREATE INDEX idx_client_relationships_reader_id ON client_relationships(reader_id);
CREATE INDEX idx_client_relationships_client_id ON client_relationships(client_id);

-- Integration Indexes
CREATE INDEX idx_integrations_reader_id ON integrations(reader_id);
CREATE INDEX idx_webhook_events_integration_id ON webhook_events(integration_id);

-- Course Indexes
CREATE INDEX idx_courses_instructor_id ON courses(instructor_id);
CREATE INDEX idx_course_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX idx_course_enrollments_student_id ON course_enrollments(student_id);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update reader analytics
CREATE OR REPLACE FUNCTION update_reader_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update analytics when a session is completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        INSERT INTO reader_analytics (
            reader_id, 
            date, 
            total_sessions, 
            completed_sessions,
            total_session_duration
        ) VALUES (
            NEW.reader_id,
            CURRENT_DATE,
            1,
            1,
            EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))/60
        )
        ON CONFLICT (reader_id, date) 
        DO UPDATE SET
            total_sessions = reader_analytics.total_sessions + 1,
            completed_sessions = reader_analytics.completed_sessions + 1,
            total_session_duration = reader_analytics.total_session_duration + EXCLUDED.total_session_duration,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for reader analytics
CREATE TRIGGER trigger_update_reader_analytics
    AFTER UPDATE ON reading_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_reader_analytics();

-- Function to update platform analytics
CREATE OR REPLACE FUNCTION update_platform_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update platform analytics daily
    INSERT INTO platform_analytics (
        date,
        total_sessions,
        successful_sessions
    ) VALUES (
        CURRENT_DATE,
        1,
        CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END
    )
    ON CONFLICT (date)
    DO UPDATE SET
        total_sessions = platform_analytics.total_sessions + 1,
        successful_sessions = platform_analytics.successful_sessions + 
            CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for platform analytics
CREATE TRIGGER trigger_update_platform_analytics
    AFTER INSERT ON reading_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_platform_analytics();

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE reader_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_package_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_tarot_spreads ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_customizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

-- Reader Analytics Policies
CREATE POLICY "Readers can view their own analytics" ON reader_analytics
    FOR SELECT USING (auth.uid() = reader_id);

CREATE POLICY "Admins can view all analytics" ON reader_analytics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Platform Analytics Policies (Admin only)
CREATE POLICY "Admins can view platform analytics" ON platform_analytics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Business Profiles Policies
CREATE POLICY "Readers can manage their business profile" ON reader_business_profiles
    FOR ALL USING (auth.uid() = reader_id);

-- Financial Transactions Policies
CREATE POLICY "Readers can view their transactions" ON financial_transactions
    FOR SELECT USING (auth.uid() = reader_id);

-- Client Relationships Policies
CREATE POLICY "Readers can manage their client relationships" ON client_relationships
    FOR ALL USING (auth.uid() = reader_id);

-- Service Packages Policies
CREATE POLICY "Readers can manage their packages" ON service_packages
    FOR ALL USING (auth.uid() = reader_id);

CREATE POLICY "Users can view active packages" ON service_packages
    FOR SELECT USING (is_active = true);

-- Custom Spreads Policies
CREATE POLICY "Readers can manage their spreads" ON custom_tarot_spreads
    FOR ALL USING (auth.uid() = reader_id);

CREATE POLICY "Users can view public spreads" ON custom_tarot_spreads
    FOR SELECT USING (is_public = true);

-- Courses Policies
CREATE POLICY "Instructors can manage their courses" ON courses
    FOR ALL USING (auth.uid() = instructor_id);

CREATE POLICY "Users can view published courses" ON courses
    FOR SELECT USING (status = 'published');

-- Course Enrollments Policies
CREATE POLICY "Students can view their enrollments" ON course_enrollments
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Instructors can view enrollments for their courses" ON course_enrollments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = course_enrollments.course_id 
            AND courses.instructor_id = auth.uid()
        )
    ); 