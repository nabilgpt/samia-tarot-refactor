-- Phase 2: AI & Learning System (Fixed Version)
-- SAMIA TAROT Platform Database Schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- AI MODELS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ai_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name VARCHAR(100) NOT NULL UNIQUE,
    model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('tarot_interpretation', 'reading_analysis', 'recommendation', 'conversation')),
    version VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    configuration JSONB,
    performance_metrics JSONB,
    training_data_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- AI PROMPTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ai_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ai_model_id UUID NOT NULL REFERENCES ai_models(id) ON DELETE CASCADE,
    prompt_name VARCHAR(100) NOT NULL,
    prompt_template TEXT NOT NULL,
    prompt_type VARCHAR(50) NOT NULL CHECK (prompt_type IN ('system', 'user', 'assistant', 'function')),
    variables JSONB, -- Dynamic variables for the prompt
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- AI SESSIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ai_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    session_id UUID REFERENCES reading_sessions(id) ON DELETE SET NULL, -- Use reading_sessions instead of bookings
    ai_model_id UUID NOT NULL REFERENCES ai_models(id),
    session_type VARCHAR(50) NOT NULL CHECK (session_type IN ('tarot_reading', 'interpretation', 'guidance', 'learning')),
    input_data JSONB NOT NULL,
    output_data JSONB,
    confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
    processing_time INTEGER, -- in milliseconds
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- AI FEEDBACK TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ai_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ai_session_id UUID NOT NULL REFERENCES ai_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    feedback_type VARCHAR(30) NOT NULL CHECK (feedback_type IN ('accuracy', 'relevance', 'helpfulness', 'overall')),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comments TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- LEARNING PATHS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS learning_paths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    path_name VARCHAR(100) NOT NULL,
    description TEXT,
    difficulty_level VARCHAR(20) NOT NULL CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    estimated_duration INTEGER, -- in hours
    prerequisites JSONB, -- Array of prerequisite path IDs
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- COURSE CONTENT TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS course_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    learning_path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
    content_title VARCHAR(200) NOT NULL,
    content_type VARCHAR(30) NOT NULL CHECK (content_type IN ('lesson', 'quiz', 'practice', 'assessment', 'video', 'reading')),
    content_order INTEGER NOT NULL,
    content_data JSONB NOT NULL,
    duration_minutes INTEGER,
    is_required BOOLEAN DEFAULT TRUE,
    passing_score INTEGER, -- For quizzes/assessments
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(learning_path_id, content_order)
);

-- =============================================
-- COURSE ENROLLMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS course_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    learning_path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completion_date TIMESTAMP WITH TIME ZONE,
    current_content_id UUID REFERENCES course_content(id),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'dropped')),
    total_time_spent INTEGER DEFAULT 0, -- in minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, learning_path_id)
);

-- =============================================
-- USER CONTENT PROGRESS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS user_content_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
    content_id UUID NOT NULL REFERENCES course_content(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    time_spent INTEGER DEFAULT 0, -- in minutes
    score INTEGER, -- For quizzes/assessments
    attempts INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'failed')),
    notes TEXT,
    UNIQUE(enrollment_id, content_id)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
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
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update enrollment progress
CREATE OR REPLACE FUNCTION update_enrollment_progress()
RETURNS TRIGGER AS $$
DECLARE
    total_content INTEGER;
    completed_content INTEGER;
    new_progress INTEGER;
BEGIN
    -- Get total content for this learning path
    SELECT COUNT(*) INTO total_content
    FROM course_content 
    WHERE learning_path_id = (
        SELECT learning_path_id 
        FROM course_enrollments 
        WHERE id = NEW.enrollment_id
    );
    
    -- Get completed content count
    SELECT COUNT(*) INTO completed_content
    FROM user_content_progress 
    WHERE enrollment_id = NEW.enrollment_id 
    AND status = 'completed';
    
    -- Calculate progress percentage
    IF total_content > 0 THEN
        new_progress := (completed_content * 100) / total_content;
    ELSE
        new_progress := 0;
    END IF;
    
    -- Update enrollment progress
    UPDATE course_enrollments 
    SET 
        progress_percentage = new_progress,
        updated_at = NOW(),
        completion_date = CASE 
            WHEN new_progress = 100 THEN NOW() 
            ELSE NULL 
        END,
        status = CASE 
            WHEN new_progress = 100 THEN 'completed' 
            ELSE status 
        END
    WHERE id = NEW.enrollment_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for progress updates
CREATE TRIGGER trigger_update_enrollment_progress
    AFTER UPDATE ON user_content_progress
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_enrollment_progress();

-- Function to calculate AI session metrics
CREATE OR REPLACE FUNCTION calculate_ai_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update processing time if completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
        NEW.processing_time = EXTRACT(EPOCH FROM (NOW() - NEW.created_at)) * 1000;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for AI session metrics
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

-- Separate policies for different operations on learning paths
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

-- Separate policies for different operations on course content
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

-- Function to enroll user in learning path (fixed parameters)
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
-- NOTIFICATION: COMPLETION STATUS
-- =============================================

-- Insert completion notification
DO $$
BEGIN
    RAISE NOTICE '✅ AI & LEARNING SYSTEM TABLES CREATED SUCCESSFULLY!';
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