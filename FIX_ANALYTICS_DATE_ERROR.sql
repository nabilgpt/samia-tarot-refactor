-- ============================================================
-- FIX ANALYTICS DATE ERROR - SAMIA TAROT
-- حل مشكلة: ERROR: 42703: column "date" does not exist
-- ============================================================

-- Step 1: Drop existing analytics tables if they exist (to avoid conflicts)
DROP TABLE IF EXISTS daily_analytics CASCADE;
DROP TABLE IF EXISTS reader_analytics CASCADE;
DROP TABLE IF EXISTS service_usage_analytics CASCADE;
DROP TABLE IF EXISTS ai_model_performance CASCADE;

-- ============================================================
-- Step 2: Create DAILY_ANALYTICS table with correct structure
-- ============================================================
CREATE TABLE daily_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    
    -- User metrics
    total_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    new_registrations INTEGER DEFAULT 0,
    
    -- Booking metrics
    total_bookings INTEGER DEFAULT 0,
    completed_bookings INTEGER DEFAULT 0,
    cancelled_bookings INTEGER DEFAULT 0,
    
    -- Revenue metrics
    total_revenue DECIMAL(10,2) DEFAULT 0,
    revenue_by_service JSONB DEFAULT '{}'::jsonb,
    revenue_by_payment_method JSONB DEFAULT '{}'::jsonb,
    
    -- Reader metrics
    active_readers INTEGER DEFAULT 0,
    total_reading_hours DECIMAL(5,2) DEFAULT 0,
    average_session_duration DECIMAL(5,2) DEFAULT 0,
    
    -- Chat metrics
    total_messages INTEGER DEFAULT 0,
    active_chat_sessions INTEGER DEFAULT 0,
    
    -- System metrics
    avg_response_time DECIMAL(5,2) DEFAULT 0,
    error_rate DECIMAL(5,4) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(date)
);

-- ============================================================
-- Step 3: Create READER_ANALYTICS table with correct structure
-- ============================================================
CREATE TABLE reader_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reader_id UUID NOT NULL, -- Will add foreign key constraint later
    date DATE NOT NULL,
    
    -- Performance metrics
    total_sessions INTEGER DEFAULT 0,
    completed_sessions INTEGER DEFAULT 0,
    cancelled_sessions INTEGER DEFAULT 0,
    
    -- Time metrics
    total_minutes INTEGER DEFAULT 0,
    available_minutes INTEGER DEFAULT 0,
    utilization_rate DECIMAL(5,4) DEFAULT 0,
    
    -- Quality metrics
    average_rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    
    -- Revenue metrics
    total_earnings DECIMAL(10,2) DEFAULT 0,
    earnings_by_service JSONB DEFAULT '{}'::jsonb,
    
    -- Client metrics
    unique_clients INTEGER DEFAULT 0,
    repeat_clients INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(reader_id, date)
);

-- ============================================================
-- Step 4: Create SERVICE_USAGE_ANALYTICS table with correct structure
-- ============================================================
CREATE TABLE service_usage_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL, -- Will add foreign key constraint later
    date DATE NOT NULL,
    
    -- Usage metrics
    total_bookings INTEGER DEFAULT 0,
    completed_bookings INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    
    -- Performance metrics
    average_duration DECIMAL(5,2) DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    completion_rate DECIMAL(5,4) DEFAULT 0,
    
    -- Demand metrics
    peak_hour INTEGER,
    demand_by_hour JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(service_id, date)
);

-- ============================================================
-- Step 5: Create AI_MODEL_PERFORMANCE table with correct structure
-- ============================================================
CREATE TABLE ai_model_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    evaluation_date DATE NOT NULL,
    
    -- Performance metrics
    accuracy DECIMAL(5,4),
    precision_score DECIMAL(5,4),
    recall DECIMAL(5,4),
    f1_score DECIMAL(5,4),
    
    -- User satisfaction
    average_user_rating DECIMAL(3,2),
    total_evaluations INTEGER DEFAULT 0,
    
    -- Performance by category
    performance_by_category JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(model_name, model_version, evaluation_date)
);

-- ============================================================
-- Step 6: Add foreign key constraints (if possible)
-- ============================================================
DO $$
BEGIN
    -- Add foreign key for reader_analytics
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        ALTER TABLE reader_analytics 
        ADD CONSTRAINT fk_reader_analytics_reader_id 
        FOREIGN KEY (reader_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Foreign key constraint added to reader_analytics -> auth.users';
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        ALTER TABLE reader_analytics 
        ADD CONSTRAINT fk_reader_analytics_reader_id 
        FOREIGN KEY (reader_id) REFERENCES profiles(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Foreign key constraint added to reader_analytics -> profiles';
    ELSE
        RAISE NOTICE '⚠️ No auth.users or profiles table found for reader_analytics';
    END IF;
    
    -- Add foreign key for service_usage_analytics
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'services') THEN
        ALTER TABLE service_usage_analytics 
        ADD CONSTRAINT fk_service_usage_analytics_service_id 
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Foreign key constraint added to service_usage_analytics -> services';
    ELSE
        RAISE NOTICE '⚠️ No services table found for service_usage_analytics';
    END IF;
END $$;

-- ============================================================
-- Step 7: Create indexes for performance
-- ============================================================

-- Daily Analytics indexes
CREATE INDEX IF NOT EXISTS idx_daily_analytics_date ON daily_analytics(date);
CREATE INDEX IF NOT EXISTS idx_daily_analytics_created_at ON daily_analytics(created_at);

-- Reader Analytics indexes
CREATE INDEX IF NOT EXISTS idx_reader_analytics_reader_id ON reader_analytics(reader_id);
CREATE INDEX IF NOT EXISTS idx_reader_analytics_date ON reader_analytics(date);
CREATE INDEX IF NOT EXISTS idx_reader_analytics_reader_date ON reader_analytics(reader_id, date);

-- Service Usage Analytics indexes
CREATE INDEX IF NOT EXISTS idx_service_usage_analytics_service_id ON service_usage_analytics(service_id);
CREATE INDEX IF NOT EXISTS idx_service_usage_analytics_date ON service_usage_analytics(date);
CREATE INDEX IF NOT EXISTS idx_service_usage_analytics_service_date ON service_usage_analytics(service_id, date);

-- AI Model Performance indexes
CREATE INDEX IF NOT EXISTS idx_ai_model_performance_model_name ON ai_model_performance(model_name);
CREATE INDEX IF NOT EXISTS idx_ai_model_performance_evaluation_date ON ai_model_performance(evaluation_date);
CREATE INDEX IF NOT EXISTS idx_ai_model_performance_model_version ON ai_model_performance(model_name, model_version);

-- ============================================================
-- Step 8: Enable Row Level Security
-- ============================================================
ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_performance ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 9: Create RLS policies
-- ============================================================

-- Daily Analytics policies (Admin/Super Admin only)
CREATE POLICY "Only admins can view daily analytics" ON daily_analytics
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'monitor'))
    );

CREATE POLICY "Only super admins can manage daily analytics" ON daily_analytics
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- Reader Analytics policies
CREATE POLICY "Readers can view their own analytics" ON reader_analytics
    FOR SELECT USING (
        auth.uid() = reader_id OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'monitor'))
    );

CREATE POLICY "Only admins can manage reader analytics" ON reader_analytics
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Service Usage Analytics policies
CREATE POLICY "Admins can view service usage analytics" ON service_usage_analytics
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'monitor'))
    );

CREATE POLICY "Only super admins can manage service usage analytics" ON service_usage_analytics
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- AI Model Performance policies
CREATE POLICY "Admins can view AI model performance" ON ai_model_performance
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'monitor'))
    );

CREATE POLICY "Only super admins can manage AI model performance" ON ai_model_performance
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- ============================================================
-- Step 10: Create triggers for updated_at (where applicable)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Note: These tables don't have updated_at columns, so no triggers needed
-- They are append-only analytics tables

-- ============================================================
-- Step 11: Insert sample data for testing (optional)
-- ============================================================
-- Uncomment if you want to test with sample data
/*
INSERT INTO daily_analytics (date, total_users, active_users, new_registrations, total_bookings) VALUES
(CURRENT_DATE, 100, 75, 5, 25),
(CURRENT_DATE - INTERVAL '1 day', 95, 70, 3, 22),
(CURRENT_DATE - INTERVAL '2 days', 90, 65, 8, 28);

INSERT INTO reader_analytics (reader_id, date, total_sessions, completed_sessions, total_minutes) VALUES
(gen_random_uuid(), CURRENT_DATE, 5, 4, 240),
(gen_random_uuid(), CURRENT_DATE, 3, 3, 180);
*/

-- ============================================================
-- Step 12: Verify table creation
-- ============================================================
DO $$
BEGIN
    -- Check if all tables exist with date columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_analytics' AND column_name = 'date') AND
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reader_analytics' AND column_name = 'date') AND
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_usage_analytics' AND column_name = 'date') AND
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_model_performance' AND column_name = 'evaluation_date') THEN
        RAISE NOTICE '✅ All analytics tables created successfully with date columns';
    ELSE
        RAISE NOTICE '❌ Some analytics tables creation failed';
    END IF;
    
    -- Show created tables
    RAISE NOTICE 'Analytics tables created:';
    RAISE NOTICE '- daily_analytics (date column)';
    RAISE NOTICE '- reader_analytics (date column)';
    RAISE NOTICE '- service_usage_analytics (date column)';
    RAISE NOTICE '- ai_model_performance (evaluation_date column)';
END $$;

-- ============================================================
-- SUMMARY
-- ============================================================
-- ✅ All analytics tables created with correct date columns
-- ✅ Foreign key constraints added (if possible)
-- ✅ Indexes created for performance
-- ✅ Row Level Security enabled with proper policies
-- ✅ Verification completed
-- 
-- The "column date does not exist" error should now be resolved!
-- ============================================================ 