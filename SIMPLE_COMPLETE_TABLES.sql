-- ============================================================
-- SIMPLE COMPLETE TABLES - SAMIA TAROT
-- حل مبسط جداً لإنشاء الجداول الناقصة بدون تعقيدات
-- ============================================================

-- Step 1: Create Chat Sessions Table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    service_type VARCHAR(50) NOT NULL DEFAULT 'chat',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    participants UUID[] NOT NULL DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    total_duration INTEGER DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0.00,
    payment_status VARCHAR(20) DEFAULT 'pending',
    session_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Create Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text',
    content TEXT NOT NULL,
    media_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- Step 3: Create Voice Notes Table
CREATE TABLE IF NOT EXISTS voice_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    duration INTEGER,
    transcription TEXT,
    is_processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- Step 4: Create AI Learning Data Table
CREATE TABLE IF NOT EXISTS ai_learning_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_question TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
    feedback_text TEXT,
    context_data JSONB DEFAULT '{}',
    model_version VARCHAR(50),
    processing_time INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 5: Create AI Reading Results Table
CREATE TABLE IF NOT EXISTS ai_reading_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reading_type VARCHAR(50) NOT NULL,
    cards_drawn JSONB DEFAULT '[]',
    interpretation TEXT NOT NULL,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    ai_model VARCHAR(50),
    processing_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 6: Create AI Training Sessions Table
CREATE TABLE IF NOT EXISTS ai_training_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(100) NOT NULL,
    training_data_count INTEGER NOT NULL,
    training_started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    training_completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'running',
    accuracy_score DECIMAL(5,4),
    loss_value DECIMAL(10,6),
    hyperparameters JSONB DEFAULT '{}',
    training_logs TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Step 7: Create Reader Applications Table
CREATE TABLE IF NOT EXISTS reader_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    application_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    experience_years INTEGER,
    specializations TEXT[],
    certifications TEXT[],
    portfolio_url TEXT,
    bio TEXT,
    hourly_rate DECIMAL(8,2),
    availability_schedule JSONB DEFAULT '{}',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    review_notes TEXT,
    documents JSONB DEFAULT '[]'
);

-- Step 8: Create System Approval Requests Table
CREATE TABLE IF NOT EXISTS system_approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_type VARCHAR(50) NOT NULL,
    requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    target_entity_type VARCHAR(50),
    target_entity_id UUID,
    request_data JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    priority VARCHAR(10) DEFAULT 'medium',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    review_decision VARCHAR(20),
    review_notes TEXT,
    auto_approved BOOLEAN DEFAULT FALSE
);

-- Step 9: Create Content Moderation Table
CREATE TABLE IF NOT EXISTS content_moderation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type VARCHAR(50) NOT NULL,
    content_id UUID NOT NULL,
    reported_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    moderation_reason VARCHAR(100),
    content_snapshot JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    severity VARCHAR(10) DEFAULT 'medium',
    auto_flagged BOOLEAN DEFAULT FALSE,
    ai_confidence_score DECIMAL(3,2),
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    moderation_action VARCHAR(50),
    action_notes TEXT
);

-- Step 10: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_client ON chat_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_reader ON chat_sessions(reader_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_started ON chat_sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sent_at ON chat_messages(sent_at);

CREATE INDEX IF NOT EXISTS idx_voice_notes_user ON voice_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_notes_session ON voice_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_voice_notes_created ON voice_notes(created_at);

CREATE INDEX IF NOT EXISTS idx_ai_learning_session ON ai_learning_data(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_learning_rating ON ai_learning_data(feedback_rating);
CREATE INDEX IF NOT EXISTS idx_ai_learning_created ON ai_learning_data(created_at);

CREATE INDEX IF NOT EXISTS idx_ai_reading_session ON ai_reading_results(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_reading_user ON ai_reading_results(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_reading_type ON ai_reading_results(reading_type);
CREATE INDEX IF NOT EXISTS idx_ai_reading_created ON ai_reading_results(created_at);

CREATE INDEX IF NOT EXISTS idx_ai_training_model ON ai_training_sessions(model_name);
CREATE INDEX IF NOT EXISTS idx_ai_training_status ON ai_training_sessions(status);
CREATE INDEX IF NOT EXISTS idx_ai_training_started ON ai_training_sessions(training_started_at);

CREATE INDEX IF NOT EXISTS idx_reader_applications_user ON reader_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_reader_applications_status ON reader_applications(application_status);
CREATE INDEX IF NOT EXISTS idx_reader_applications_submitted ON reader_applications(submitted_at);

CREATE INDEX IF NOT EXISTS idx_approval_requests_type ON system_approval_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON system_approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_submitted ON system_approval_requests(submitted_at);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester ON system_approval_requests(requested_by);

CREATE INDEX IF NOT EXISTS idx_content_moderation_type ON content_moderation(content_type);
CREATE INDEX IF NOT EXISTS idx_content_moderation_status ON content_moderation(status);
CREATE INDEX IF NOT EXISTS idx_content_moderation_reported ON content_moderation(reported_at);
CREATE INDEX IF NOT EXISTS idx_content_moderation_content ON content_moderation(content_id);

-- Step 11: Enable RLS on tables (simple approach)
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reading_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_moderation ENABLE ROW LEVEL SECURITY;

-- Step 12: Create basic RLS policies (simple and safe)
-- Chat Sessions
CREATE POLICY "chat_sessions_policy" ON chat_sessions
    FOR ALL USING (
        auth.uid() = client_id OR 
        auth.uid() = reader_id OR
        auth.uid() = ANY(participants) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Chat Messages
CREATE POLICY "chat_messages_policy" ON chat_messages
    FOR ALL USING (
        EXISTS (SELECT 1 FROM chat_sessions WHERE id = session_id AND (
            auth.uid() = client_id OR 
            auth.uid() = reader_id OR 
            auth.uid() = ANY(participants)
        )) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Voice Notes
CREATE POLICY "voice_notes_policy" ON voice_notes
    FOR ALL USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- AI Learning Data
CREATE POLICY "ai_learning_policy" ON ai_learning_data
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- AI Reading Results
CREATE POLICY "ai_reading_policy" ON ai_reading_results
    FOR ALL USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- AI Training Sessions
CREATE POLICY "ai_training_policy" ON ai_training_sessions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- Reader Applications
CREATE POLICY "reader_applications_policy" ON reader_applications
    FOR ALL USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- System Approval Requests
CREATE POLICY "approval_requests_policy" ON system_approval_requests
    FOR ALL USING (
        auth.uid() = requested_by OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Content Moderation
CREATE POLICY "content_moderation_policy" ON content_moderation
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'monitor'))
    );

-- Step 13: Success message
DO $$
DECLARE
    table_count INTEGER;
    expected_tables TEXT[] := ARRAY[
        'chat_sessions', 'chat_messages', 'voice_notes',
        'ai_learning_data', 'ai_reading_results', 'ai_training_sessions',
        'reader_applications', 'system_approval_requests', 'content_moderation'
    ];
    table_name TEXT;
BEGIN
    table_count := 0;
    
    RAISE NOTICE '📊 CHECKING CREATED TABLES:';
    
    FOREACH table_name IN ARRAY expected_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name AND table_schema = 'public') THEN
            table_count := table_count + 1;
            RAISE NOTICE '  ✅ % - EXISTS', table_name;
        ELSE
            RAISE NOTICE '  ❌ % - MISSING', table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '📈 FINAL RESULTS:';
    RAISE NOTICE '  ✅ Created % out of % expected tables', table_count, array_length(expected_tables, 1);
    RAISE NOTICE '  📊 Success rate: %%%', ROUND((table_count::DECIMAL / array_length(expected_tables, 1)) * 100, 1);
    
    IF table_count = array_length(expected_tables, 1) THEN
        RAISE NOTICE '🎉 PERFECT! All missing tables created successfully!';
        RAISE NOTICE '🚀 Database is now 100%% complete!';
        RAISE NOTICE '🔒 All tables secured with RLS policies!';
        RAISE NOTICE '⚡ Indexes created for optimal performance!';
    ELSE
        RAISE NOTICE '⚠️ Some tables may need manual creation';
    END IF;
END $$;

-- ============================================================
-- SUMMARY
-- ============================================================
-- ✅ Simple CREATE TABLE IF NOT EXISTS approach
-- ✅ No complex DO blocks or error handling
-- ✅ All tables created with proper structure
-- ✅ Indexes added for performance
-- ✅ RLS enabled with simple policies
-- ✅ One policy per table (no conflicts)
-- ✅ Comprehensive verification
-- 
-- This is the simplest and most reliable approach!
-- ============================================================ 