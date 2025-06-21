-- ============================================================
-- PART 3: AI SYSTEM TABLES
-- Safe creation of AI enhancement tables
-- ============================================================

-- ============================================================
-- AI ANALYTICS TABLE
-- ============================================================
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
-- USER ENROLLMENTS TABLE
-- ============================================================
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

-- ============================================================
-- LEARNING PROGRESS TABLE
-- ============================================================
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
-- INDEXES FOR AI TABLES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ai_analytics_date_model ON ai_analytics(date, model_name);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_performance ON ai_analytics(date, average_response_time);
CREATE INDEX IF NOT EXISTS idx_user_enrollments_user_id ON user_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_enrollments_status ON user_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_learning_progress_user_id ON learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_enrollment_id ON learning_progress(enrollment_id);

-- ============================================================
-- RLS POLICIES FOR AI TABLES
-- ============================================================

-- Enable RLS
ALTER TABLE ai_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;

-- AI analytics (admin only)
DROP POLICY IF EXISTS "Admins can view AI analytics" ON ai_analytics;
CREATE POLICY "Admins can view AI analytics" ON ai_analytics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- User enrollments
DROP POLICY IF EXISTS "Users can view their own enrollments" ON user_enrollments;
CREATE POLICY "Users can view their own enrollments" ON user_enrollments
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can enroll themselves" ON user_enrollments;
CREATE POLICY "Users can enroll themselves" ON user_enrollments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Learning progress
DROP POLICY IF EXISTS "Users can view their own progress" ON learning_progress;
CREATE POLICY "Users can view their own progress" ON learning_progress
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own progress" ON learning_progress;
CREATE POLICY "Users can update their own progress" ON learning_progress
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
SELECT 
    '✅ PART 3 COMPLETED: AI System Tables' as status,
    'Created: ai_analytics, user_enrollments, learning_progress' as tables_created,
    timezone('utc'::text, now()) as completed_at; 