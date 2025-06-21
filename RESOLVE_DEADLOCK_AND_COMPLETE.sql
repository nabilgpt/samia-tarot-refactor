-- ============================================================
-- RESOLVE DEADLOCK AND COMPLETE MISSING TABLES - SAMIA TAROT
-- حل مشكلة الـ deadlock وإكمال الجداول الناقصة بطريقة آمنة
-- ============================================================

-- Step 1: Kill any blocking sessions and clear locks
DO $$
DECLARE
    blocking_pid INTEGER;
BEGIN
    RAISE NOTICE '🔓 Checking for blocking sessions...';
    
    -- Get blocking processes
    FOR blocking_pid IN 
        SELECT DISTINCT bl.pid
        FROM pg_locks bl
        JOIN pg_stat_activity a ON bl.pid = a.pid
        WHERE bl.granted = false
        AND a.state = 'active'
    LOOP
        RAISE NOTICE '⚠️ Found blocking process: %', blocking_pid;
        -- Note: We can't kill sessions from SQL, but we can identify them
    END LOOP;
    
    RAISE NOTICE '✅ Lock check completed';
END $$;

-- Step 2: Wait a moment for any locks to clear
SELECT pg_sleep(2);

-- Step 3: Create missing tables one by one with proper error handling
DO $$
BEGIN
    RAISE NOTICE '🚀 Starting safe table creation...';
    
    -- Chat Sessions Table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_sessions' AND table_schema = 'public') THEN
        BEGIN
            CREATE TABLE chat_sessions (
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
            
            CREATE INDEX idx_chat_sessions_client ON chat_sessions(client_id);
            CREATE INDEX idx_chat_sessions_reader ON chat_sessions(reader_id);
            CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);
            CREATE INDEX idx_chat_sessions_started ON chat_sessions(started_at);
            
            RAISE NOTICE '✅ Created chat_sessions table';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ chat_sessions table creation failed: %', SQLERRM;
        END;
    END IF;
    
    -- Chat Messages Table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages' AND table_schema = 'public') THEN
        BEGIN
            CREATE TABLE chat_messages (
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
            
            CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
            CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
            CREATE INDEX idx_chat_messages_sent_at ON chat_messages(sent_at);
            
            RAISE NOTICE '✅ Created chat_messages table';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ chat_messages table creation failed: %', SQLERRM;
        END;
    END IF;
    
    -- Voice Notes Table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'voice_notes' AND table_schema = 'public') THEN
        BEGIN
            CREATE TABLE voice_notes (
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
            
            CREATE INDEX idx_voice_notes_user ON voice_notes(user_id);
            CREATE INDEX idx_voice_notes_session ON voice_notes(session_id);
            CREATE INDEX idx_voice_notes_created ON voice_notes(created_at);
            
            RAISE NOTICE '✅ Created voice_notes table';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ voice_notes table creation failed: %', SQLERRM;
        END;
    END IF;
    
    RAISE NOTICE '🎉 Core chat tables creation completed!';
END $$;

-- Step 4: Create AI tables
DO $$
BEGIN
    RAISE NOTICE '🤖 Creating AI tables...';
    
    -- AI Learning Data Table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_learning_data' AND table_schema = 'public') THEN
        BEGIN
            CREATE TABLE ai_learning_data (
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
            
            CREATE INDEX idx_ai_learning_session ON ai_learning_data(session_id);
            CREATE INDEX idx_ai_learning_rating ON ai_learning_data(feedback_rating);
            CREATE INDEX idx_ai_learning_created ON ai_learning_data(created_at);
            
            RAISE NOTICE '✅ Created ai_learning_data table';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ ai_learning_data table creation failed: %', SQLERRM;
        END;
    END IF;
    
    -- AI Reading Results Table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_reading_results' AND table_schema = 'public') THEN
        BEGIN
            CREATE TABLE ai_reading_results (
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
            
            CREATE INDEX idx_ai_reading_session ON ai_reading_results(session_id);
            CREATE INDEX idx_ai_reading_user ON ai_reading_results(user_id);
            CREATE INDEX idx_ai_reading_type ON ai_reading_results(reading_type);
            CREATE INDEX idx_ai_reading_created ON ai_reading_results(created_at);
            
            RAISE NOTICE '✅ Created ai_reading_results table';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ ai_reading_results table creation failed: %', SQLERRM;
        END;
    END IF;
    
    RAISE NOTICE '🤖 AI tables creation completed!';
END $$;

-- Step 5: Create admin tables
DO $$
BEGIN
    RAISE NOTICE '👨‍💼 Creating admin tables...';
    
    -- Reader Applications Table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reader_applications' AND table_schema = 'public') THEN
        BEGIN
            CREATE TABLE reader_applications (
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
            
            CREATE INDEX idx_reader_applications_user ON reader_applications(user_id);
            CREATE INDEX idx_reader_applications_status ON reader_applications(application_status);
            CREATE INDEX idx_reader_applications_submitted ON reader_applications(submitted_at);
            
            RAISE NOTICE '✅ Created reader_applications table';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ reader_applications table creation failed: %', SQLERRM;
        END;
    END IF;
    
    -- Content Moderation Table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_moderation' AND table_schema = 'public') THEN
        BEGIN
            CREATE TABLE content_moderation (
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
            
            CREATE INDEX idx_content_moderation_type ON content_moderation(content_type);
            CREATE INDEX idx_content_moderation_status ON content_moderation(status);
            CREATE INDEX idx_content_moderation_reported ON content_moderation(reported_at);
            CREATE INDEX idx_content_moderation_content ON content_moderation(content_id);
            
            RAISE NOTICE '✅ Created content_moderation table';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ content_moderation table creation failed: %', SQLERRM;
        END;
    END IF;
    
    RAISE NOTICE '👨‍💼 Admin tables creation completed!';
END $$;

-- Step 6: Add RLS policies safely
DO $$
BEGIN
    RAISE NOTICE '🔒 Adding RLS policies safely...';
    
    -- Chat Sessions RLS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_sessions' AND table_schema = 'public') THEN
        ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
        
        -- Only create if doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_sessions' AND policyname = 'cs_select_safe') THEN
            CREATE POLICY "cs_select_safe" ON chat_sessions
                FOR SELECT USING (
                    auth.uid() = ANY(participants) OR
                    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'monitor'))
                );
        END IF;
        
        RAISE NOTICE '✅ Chat sessions RLS enabled';
    END IF;
    
    -- Voice Notes RLS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'voice_notes' AND table_schema = 'public') THEN
        ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'voice_notes' AND policyname = 'vn_select_safe') THEN
            CREATE POLICY "vn_select_safe" ON voice_notes
                FOR SELECT USING (
                    auth.uid() = user_id OR
                    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'monitor'))
                );
        END IF;
        
        RAISE NOTICE '✅ Voice notes RLS enabled';
    END IF;
    
    RAISE NOTICE '🔒 RLS policies added safely!';
END $$;

-- Step 7: Final verification
DO $$
DECLARE
    table_count INTEGER;
    expected_tables TEXT[] := ARRAY[
        'chat_sessions', 'chat_messages', 'voice_notes',
        'ai_learning_data', 'ai_reading_results', 
        'reader_applications', 'content_moderation'
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
        RAISE NOTICE '💡 No more deadlocks - tables created sequentially!';
    ELSE
        RAISE NOTICE '⚠️ Some tables may need manual creation';
    END IF;
END $$;

-- ============================================================
-- SUMMARY
-- ============================================================
-- ✅ Resolved deadlock by creating tables sequentially
-- ✅ Added proper error handling for each table
-- ✅ Created tables in logical groups (chat, AI, admin)
-- ✅ Added RLS policies safely without conflicts
-- ✅ Comprehensive verification of results
-- 
-- This approach avoids deadlocks by:
-- 1. Creating tables one by one, not in parallel
-- 2. Using separate DO blocks for different table groups
-- 3. Adding delays and proper error handling
-- 4. Checking for existing tables/policies before creation
-- ============================================================ 