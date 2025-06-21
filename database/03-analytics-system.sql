-- ============================================================
-- PART 3: ANALYTICS SYSTEM TABLES - SAMIA TAROT
-- This script handles only analytics-related tables
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. DAILY ANALYTICS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    
    -- User metrics
    total_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    
    -- Booking metrics
    total_bookings INTEGER DEFAULT 0,
    completed_bookings INTEGER DEFAULT 0,
    cancelled_bookings INTEGER DEFAULT 0,
    
    -- Revenue metrics
    total_revenue DECIMAL(10,2) DEFAULT 0,
    stripe_revenue DECIMAL(10,2) DEFAULT 0,
    wallet_revenue DECIMAL(10,2) DEFAULT 0,
    
    -- Reader metrics
    active_readers INTEGER DEFAULT 0,
    total_reading_minutes INTEGER DEFAULT 0,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 2. READER ANALYTICS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS reader_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reader_id UUID NOT NULL, -- Will add foreign key constraint later
    date DATE NOT NULL,
    
    -- Performance metrics
    total_bookings INTEGER DEFAULT 0,
    completed_bookings INTEGER DEFAULT 0,
    cancelled_bookings INTEGER DEFAULT 0,
    
    -- Time metrics
    total_reading_minutes INTEGER DEFAULT 0,
    average_session_duration DECIMAL(10,2) DEFAULT 0,
    
    -- Rating metrics
    average_rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    
    -- Revenue metrics
    total_earnings DECIMAL(10,2) DEFAULT 0,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(reader_id, date)
);

-- ============================================================
-- 3. AI READING RESULTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_reading_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Will add foreign key constraint later
    
    reading_type VARCHAR(50) NOT NULL,
    cards_drawn JSONB NOT NULL,
    interpretation JSONB NOT NULL,
    
    -- AI model information
    model_version VARCHAR(50),
    confidence_score DECIMAL(3,2),
    
    -- User interaction
    user_feedback JSONB,
    is_saved BOOLEAN DEFAULT false,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 4. USER ACTIVITY LOGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Will add foreign key constraint later
    
    activity_type VARCHAR(100) NOT NULL,
    activity_description TEXT,
    
    -- Context information
    page_url TEXT,
    user_agent TEXT,
    ip_address INET,
    
    -- Session information
    session_id VARCHAR(255),
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 5. INDEXES FOR PERFORMANCE
-- ============================================================

-- Daily analytics indexes
CREATE INDEX IF NOT EXISTS idx_daily_analytics_date ON daily_analytics(date);

-- Reader analytics indexes
CREATE INDEX IF NOT EXISTS idx_reader_analytics_reader_date ON reader_analytics(reader_id, date);
CREATE INDEX IF NOT EXISTS idx_reader_analytics_date ON reader_analytics(date);

-- AI reading results indexes
CREATE INDEX IF NOT EXISTS idx_ai_reading_results_user_id ON ai_reading_results(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_reading_results_created_at ON ai_reading_results(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_reading_results_type ON ai_reading_results(reading_type);

-- User activity logs indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity_type ON user_activity_logs(activity_type);

-- ============================================================
-- 6. ENABLE RLS (BASIC POLICIES)
-- ============================================================

ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reading_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create basic policies (permissive for now)
CREATE POLICY "daily_analytics_access" ON daily_analytics FOR ALL USING (true);
CREATE POLICY "reader_analytics_access" ON reader_analytics FOR ALL USING (true);
CREATE POLICY "ai_reading_results_access" ON ai_reading_results FOR ALL USING (true);
CREATE POLICY "user_activity_logs_access" ON user_activity_logs FOR ALL USING (true);

-- ============================================================
-- 7. UPDATE TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_daily_analytics_updated_at
    BEFORE UPDATE ON daily_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reader_analytics_updated_at
    BEFORE UPDATE ON reader_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_reading_results_updated_at
    BEFORE UPDATE ON ai_reading_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Analytics system tables created successfully!';
    RAISE NOTICE '📋 Tables: daily_analytics, reader_analytics, ai_reading_results, user_activity_logs';
    RAISE NOTICE '🔒 RLS enabled with permissive policies';
    RAISE NOTICE '📊 Indexes created for performance';
END $$; 