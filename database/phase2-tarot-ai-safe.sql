-- =============================================
-- PHASE 2: AI & LEARNING SYSTEM (SAFE VERSION)
-- =============================================
-- Safe execution version that handles existing objects

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_enrollment_progress ON user_content_progress;
DROP TRIGGER IF EXISTS trigger_calculate_ai_metrics ON ai_sessions;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS update_enrollment_progress();
DROP FUNCTION IF EXISTS calculate_ai_metrics();
DROP FUNCTION IF EXISTS enroll_user_in_path(UUID, UUID);
DROP FUNCTION IF EXISTS get_learning_recommendations(UUID);

-- =============================================
-- AI MODELS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(100) NOT NULL,
    model_type VARCHAR(50) NOT NULL, -- 'gpt', 'claude', 'palm', 'custom'
    version VARCHAR(20) NOT NULL,
    description TEXT,
    api_endpoint TEXT,
    max_tokens INTEGER DEFAULT 2000,
    temperature DECIMAL(3,2) DEFAULT 0.7,
    is_active BOOLEAN DEFAULT true,
    capabilities JSONB DEFAULT '{}',
    pricing_info JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- AI PROMPTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ai_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ai_model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
    prompt_name VARCHAR(100) NOT NULL,
    prompt_type VARCHAR(50) NOT NULL, -- 'tarot_reading', 'guidance', 'spiritual_advice'
    prompt_template TEXT NOT NULL,
    variables JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- AI SESSIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ai_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    reader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    ai_model_id UUID REFERENCES ai_models(id) ON DELETE SET NULL,
    session_type VARCHAR(50) NOT NULL, -- 'auto_reading', 'guided_reading', 'learning'
    input_data JSONB NOT NULL DEFAULT '{}',
    ai_response JSONB NOT NULL DEFAULT '{}',
    confidence_score DECIMAL(5,2) DEFAULT 0.00,
    processing_time_ms INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    status VARCHAR(30) DEFAULT 'completed', -- 'processing', 'completed', 'failed'
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- AI FEEDBACK TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ai_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ai_session_id UUID REFERENCES ai_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    accuracy_rating INTEGER CHECK (accuracy_rating >= 1 AND accuracy_rating <= 5),
    helpfulness_rating INTEGER CHECK (helpfulness_rating >= 1 AND helpfulness_rating <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- LEARNING PATHS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS learning_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path_name VARCHAR(200) NOT NULL,
    description TEXT,
    difficulty_level VARCHAR(20) DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
    estimated_duration_hours INTEGER DEFAULT 0,
    path_order INTEGER DEFAULT 0,
    prerequisites JSONB DEFAULT '[]',
    learning_outcomes JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- COURSE CONTENT TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS course_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learning_path_id UUID REFERENCES learning_paths(id) ON DELETE CASCADE,
    content_title VARCHAR(200) NOT NULL,
    content_type VARCHAR(50) NOT NULL, -- 'lesson', 'video', 'quiz', 'practice'
    content_data JSONB NOT NULL DEFAULT '{}',
    content_order INTEGER NOT NULL,
    estimated_time_minutes INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT true,
    prerequisites JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- COURSE ENROLLMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    learning_path_id UUID REFERENCES learning_paths(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMPTZ DEFAULT NOW(),
    completion_date TIMESTAMPTZ,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'paused', 'cancelled'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, learning_path_id)
);

-- =============================================
-- USER CONTENT PROGRESS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS user_content_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID REFERENCES course_enrollments(id) ON DELETE CASCADE,
    content_id UUID REFERENCES course_content(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed'
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    time_spent_minutes INTEGER DEFAULT 0,
    completion_date TIMESTAMPTZ,
    attempts_count INTEGER DEFAULT 0,
    best_score DECIMAL(5,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(enrollment_id, content_id)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_ai_models_model_type ON ai_models(model_type);
CREATE INDEX IF NOT EXISTS idx_ai_models_is_active ON ai_models(is_active);

CREATE INDEX IF NOT EXISTS idx_ai_prompts_ai_model_id ON ai_prompts(ai_model_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_prompt_type ON ai_prompts(prompt_type);

CREATE INDEX IF NOT EXISTS idx_ai_sessions_user_id ON ai_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_reader_id ON ai_sessions(reader_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_ai_model_id ON ai_sessions(ai_model_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_session_type ON ai_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_status ON ai_sessions(status);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_ai_session_id ON ai_feedback(ai_session_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_id ON ai_feedback(user_id);

CREATE INDEX IF NOT EXISTS idx_learning_paths_difficulty_level ON learning_paths(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_learning_paths_is_active ON learning_paths(is_active);

CREATE INDEX IF NOT EXISTS idx_course_content_learning_path_id ON course_content(learning_path_id);
CREATE INDEX IF NOT EXISTS idx_course_content_content_order ON course_content(content_order);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_id ON course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_learning_path_id ON course_enrollments(learning_path_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_status ON course_enrollments(status);

CREATE INDEX IF NOT EXISTS idx_user_content_progress_enrollment_id ON user_content_progress(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_user_content_progress_content_id ON user_content_progress(content_id);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to update enrollment progress
CREATE OR REPLACE FUNCTION update_enrollment_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Update enrollment progress when content progress changes
    UPDATE course_enrollments 
    SET 
        progress_percentage = (
            SELECT ROUND(
                (COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / COUNT(*)) * 100
            )::INTEGER
            FROM user_content_progress 
            WHERE enrollment_id = NEW.enrollment_id
        ),
        completion_date = CASE 
            WHEN (
                SELECT COUNT(*) FILTER (WHERE status != 'completed')
                FROM user_content_progress 
                WHERE enrollment_id = NEW.enrollment_id
            ) = 0 THEN NOW()
            ELSE NULL
        END,
        status = CASE 
            WHEN (
                SELECT COUNT(*) FILTER (WHERE status != 'completed')
                FROM user_content_progress 
                WHERE enrollment_id = NEW.enrollment_id
            ) = 0 THEN 'completed'
            ELSE 'active'
        END,
        updated_at = NOW()
    WHERE id = NEW.enrollment_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for AI session metrics
CREATE OR REPLACE FUNCTION calculate_ai_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update AI model usage statistics
    UPDATE ai_models 
    SET updated_at = NOW()
    WHERE id = NEW.ai_model_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_enrollment_progress
    AFTER UPDATE ON user_content_progress
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_enrollment_progress();

CREATE TRIGGER trigger_calculate_ai_metrics
    BEFORE UPDATE ON ai_sessions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_ai_metrics();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on tables
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_content_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Only admins can manage AI models" ON ai_models;
DROP POLICY IF EXISTS "Only admins can manage AI prompts" ON ai_prompts;
DROP POLICY IF EXISTS "Users can view own AI sessions" ON ai_sessions;
DROP POLICY IF EXISTS "Readers can view client AI sessions" ON ai_sessions;
DROP POLICY IF EXISTS "Users can manage own AI feedback" ON ai_feedback;
DROP POLICY IF EXISTS "Learning paths are publicly readable" ON learning_paths;
DROP POLICY IF EXISTS "Only admins can insert learning paths" ON learning_paths;
DROP POLICY IF EXISTS "Only admins can update learning paths" ON learning_paths;
DROP POLICY IF EXISTS "Only admins can delete learning paths" ON learning_paths;
DROP POLICY IF EXISTS "Course content is publicly readable" ON course_content;
DROP POLICY IF EXISTS "Only admins can insert course content" ON course_content;
DROP POLICY IF EXISTS "Only admins can update course content" ON course_content;
DROP POLICY IF EXISTS "Only admins can delete course content" ON course_content;
DROP POLICY IF EXISTS "Users can manage own enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Users can manage own progress" ON user_content_progress;

-- AI models and prompts - admin only
CREATE POLICY "Only admins can manage AI models" ON ai_models
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Only admins can manage AI prompts" ON ai_prompts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- AI sessions - users can view their own
CREATE POLICY "Users can view own AI sessions" ON ai_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Readers can view client AI sessions" ON ai_sessions
    FOR SELECT USING (auth.uid() = reader_id);

-- AI feedback - users can view/create their own
CREATE POLICY "Users can manage own AI feedback" ON ai_feedback
    FOR ALL USING (auth.uid() = user_id);

-- Learning paths - public read, admin write
CREATE POLICY "Learning paths are publicly readable" ON learning_paths
    FOR SELECT USING (is_active = true);

CREATE POLICY "Only admins can insert learning paths" ON learning_paths
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Only admins can update learning paths" ON learning_paths
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Only admins can delete learning paths" ON learning_paths
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- Course content - public read, admin write
CREATE POLICY "Course content is publicly readable" ON course_content
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM learning_paths 
            WHERE id = learning_path_id AND is_active = true
        )
    );

CREATE POLICY "Only admins can insert course content" ON course_content
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Only admins can update course content" ON course_content
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Only admins can delete course content" ON course_content
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- Course enrollments - users can view/manage their own
CREATE POLICY "Users can manage own enrollments" ON course_enrollments
    FOR ALL USING (auth.uid() = user_id);

-- User progress - users can view/update their own
CREATE POLICY "Users can manage own progress" ON user_content_progress
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM course_enrollments 
            WHERE id = enrollment_id AND user_id = auth.uid()
        )
    );

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to enroll user in learning path
CREATE OR REPLACE FUNCTION enroll_user_in_path(
    p_user_id UUID,
    p_learning_path_id UUID
)
RETURNS UUID AS $$
DECLARE
    enrollment_id UUID;
BEGIN
    -- Create enrollment
    INSERT INTO course_enrollments (user_id, learning_path_id)
    VALUES (p_user_id, p_learning_path_id)
    RETURNING id INTO enrollment_id;
    
    -- Create progress records for all content
    INSERT INTO user_content_progress (enrollment_id, content_id)
    SELECT enrollment_id, cc.id
    FROM course_content cc
    WHERE cc.learning_path_id = p_learning_path_id;
    
    RETURN enrollment_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's learning recommendations
CREATE OR REPLACE FUNCTION get_learning_recommendations(p_user_id UUID)
RETURNS TABLE (
    path_id UUID,
    path_name VARCHAR,
    difficulty_level VARCHAR,
    completion_percentage INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lp.id,
        lp.path_name,
        lp.difficulty_level,
        COALESCE(ce.progress_percentage, 0) as completion_percentage
    FROM learning_paths lp
    LEFT JOIN course_enrollments ce ON ce.learning_path_id = lp.id AND ce.user_id = p_user_id
    WHERE lp.is_active = true
    ORDER BY 
        CASE WHEN ce.id IS NULL THEN 0 ELSE 1 END,
        ce.progress_percentage DESC,
        lp.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMPLETION NOTIFICATION
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '✅ AI & LEARNING SYSTEM TABLES CREATED SUCCESSFULLY (SAFE VERSION)!';
    RAISE NOTICE '📊 CREATED TABLES:';
    RAISE NOTICE '   ✅ ai_models';
    RAISE NOTICE '   ✅ ai_prompts';
    RAISE NOTICE '   ✅ ai_sessions';
    RAISE NOTICE '   ✅ ai_feedback';
    RAISE NOTICE '   ✅ learning_paths';
    RAISE NOTICE '   ✅ course_content';
    RAISE NOTICE '   ✅ course_enrollments';
    RAISE NOTICE '   ✅ user_content_progress';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 AI SYSTEM READY FOR USE!';
END $$; 